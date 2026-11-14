import {hashAccess} from './delegated-admins.mjs';
import {OWNER_ADMIN_ID} from './config.mjs';
const now=()=>Math.floor(Date.now()/1000),random=()=>crypto.randomUUID()+crypto.randomUUID();
const reply=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const approved="COALESCE(g.status,'approved')='approved' AND NOT EXISTS(SELECT 1 FROM garage_member_blocks b WHERE b.member_id=m.id AND b.is_blocked=1)";
export const memberAccessManager=user=>user?.id===OWNER_ADMIN_ID||(user?.role==='administrator'&&(user.permissions.includes('members')||user.permissions.includes('events')));
export async function approvedEventMembers(db){return (await db.prepare("SELECT m.id,m.pilot FROM garage_members m LEFT JOIN garage_moderation g ON g.member_id=m.id WHERE "+approved+" ORDER BY m.pilot LIMIT 1000").all()).results;}
export async function approvedEventMember(db,id){return db.prepare("SELECT m.id,m.pilot FROM garage_members m LEFT JOIN garage_moderation g ON g.member_id=m.id WHERE m.id=? AND "+approved).bind(id).first();}
export async function memberEventSession(db,request){
 const token=request.headers.get('cookie')?.match(/(?:^|;\s*)club_member_session=([^;]+)/)?.[1];if(!token)return null;
 return db.prepare("SELECT m.id,m.pilot FROM club_member_event_sessions s JOIN garage_members m ON m.id=s.member_id LEFT JOIN garage_moderation g ON g.member_id=m.id WHERE s.token_hash=? AND s.expires_at>? AND "+approved).bind(await hashAccess(token),now()).first();
}
export async function handleMemberEventAccess(request,db,admin){
 const path=new URL(request.url).pathname,method=request.method;if(!path.startsWith('/api/club/member-access'))return null;
 if(path==='/api/club/member-access/session'&&method==='GET')return reply({member:await memberEventSession(db,request)});
 if(path==='/api/club/member-access/activate'&&method==='POST'){
  const body=await request.json();if(typeof body.token!=='string'||body.token.length>200)fail('Enlace de socio no válido.');
  const digest=await hashAccess(body.token),row=await db.prepare("SELECT m.id,m.pilot FROM club_member_event_access a JOIN garage_members m ON m.id=a.member_id LEFT JOIN garage_moderation g ON g.member_id=m.id WHERE a.invite_hash=? AND a.invite_expires>? AND "+approved).bind(digest,now()).first();if(!row)fail('El enlace ha caducado, ya se utilizó o la ficha no está aprobada.',410);
  const raw=random(),sessionHash=await hashAccess(raw),at=now();
  const results=await db.batch([db.prepare("INSERT INTO club_member_event_sessions(token_hash,member_id,expires_at) SELECT ?,member_id,? FROM club_member_event_access WHERE member_id=? AND invite_hash=? AND invite_expires>?").bind(sessionHash,at+180*86400,row.id,digest,at),db.prepare("UPDATE club_member_event_access SET invite_hash='',invite_expires=0 WHERE member_id=? AND invite_hash=?").bind(row.id,digest)]);
  if(!results[0]?.meta.changes)fail('El enlace ya no está disponible.',410);
  return reply({member:row},200,{'Set-Cookie':'club_member_session='+raw+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age='+180*86400});
 }
 if(path==='/api/club/member-access/logout'&&method==='POST'){const token=request.headers.get('cookie')?.match(/(?:^|;\s*)club_member_session=([^;]+)/)?.[1]||'';await db.prepare('DELETE FROM club_member_event_sessions WHERE token_hash=?').bind(await hashAccess(token)).run();return reply({ok:true},200,{'Set-Cookie':'club_member_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'});}
 if(path==='/api/club/member-access'&&method==='POST'){
  if(!memberAccessManager(admin))fail('Solo la administración puede preparar accesos personales.',admin?403:401);
  const b=await request.json(),member=await approvedEventMember(db,String(b.memberId||''));if(!member)fail('Selecciona una ficha aprobada y visible.',404);
  if(b.action==='revoke'){await db.batch([db.prepare("UPDATE club_member_event_access SET invite_hash='',invite_expires=0,updated_at=? WHERE member_id=?").bind(now(),member.id),db.prepare('DELETE FROM club_member_event_sessions WHERE member_id=?').bind(member.id)]);return reply({ok:true});}
  if(b.action!=='invite')fail('Acción no válida.');
  const raw=random();await db.prepare('INSERT INTO club_member_event_access VALUES(?,?,?,?) ON CONFLICT(member_id) DO UPDATE SET invite_hash=excluded.invite_hash,invite_expires=excluded.invite_expires,updated_at=excluded.updated_at').bind(member.id,await hashAccess(raw),now()+7*86400,now()).run();
  return reply({activationPath:'acceso-socio.html#clave='+encodeURIComponent(raw),pilot:member.pilot,expiresIn:7*86400});
 }
 return reply({error:'Ruta no encontrada.'},404);
}
