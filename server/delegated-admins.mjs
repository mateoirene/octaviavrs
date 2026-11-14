import {OWNER_ADMIN_ID,OWNER_ADMIN_EMAIL} from './config.mjs';
const enc=new TextEncoder();
export const scopes=['members','market','bricos','news','events','gallery','collaborators','social','statistics','suggestions','content'];
export const scopeLabels={members:'Miembros y garaje',market:'Mercadillo',bricos:'Bricos y comentarios',news:'Noticias',events:'Calendario y asistentes',gallery:'Galería y fotos',collaborators:'Colaboradores',social:'Redes sociales',statistics:'Estadísticas',suggestions:'Sugerencias',content:'Contenido de páginas'};
export const hashAccess=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value))),n=>n.toString(16).padStart(2,'0')).join('');
export async function passwordAccess(value,salt){const key=await crypto.subtle.importKey('raw',enc.encode(value),'PBKDF2',false,['deriveBits']);return Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256)),n=>n.toString(16).padStart(2,'0')).join('');}
const stamp=()=>Math.floor(Date.now()/1000),token=()=>crypto.randomUUID()+crypto.randomUUID();
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const permissions=row=>{try{return JSON.parse(row.permissions_json).filter(x=>scopes.includes(x));}catch{return [];}};
export const identity=row=>({id:row.id,email:OWNER_ADMIN_EMAIL,alias:row.alias,role:'administrator',permissions:permissions(row)});
export async function delegateSession(db,raw){if(!raw)return null;const row=await db.prepare('SELECT a.* FROM club_delegated_sessions s JOIN club_delegated_admins a ON a.id=s.admin_id WHERE s.token_hash=? AND s.expires_at>? AND a.enabled=1').bind(await hashAccess(raw),stamp()).first();return row?identity(row):null;}
export async function delegateLogin(db,email,value){if(email!==OWNER_ADMIN_EMAIL||typeof value!=='string'||value.length<12||value.length>128)return null;const rows=(await db.prepare("SELECT * FROM club_delegated_admins WHERE enabled=1 AND password_hash<>'' LIMIT 10").all()).results;for(const row of rows)if(await passwordAccess(value,row.salt)===row.password_hash)return identity(row);return null;}
export async function createDelegateSession(db,id){const raw=token();await db.batch([db.prepare('DELETE FROM club_delegated_sessions WHERE expires_at<?').bind(stamp()),db.prepare('INSERT INTO club_delegated_sessions VALUES(?,?,?)').bind(await hashAccess(raw),id,stamp()+14*86400)]);return raw;}
export function delegatedRouteAllowed(user,request){
 if(!user||user.role!=='administrator')return true;
 const u=new URL(request.url),p=u.pathname,m=request.method,has=s=>user.permissions.includes(s);
 if(p==='/api/admin/session'||p==='/api/admin/logout'||p==='/api/admin/login')return true;
 if(p.startsWith('/api/admin/delegates')||p==='/api/admin/users'||p==='/api/admin/setup')return false;
 if(p.startsWith('/api/admin/listings')||p.startsWith('/api/admin/review-mail'))return has('market');
 if(p.startsWith('/api/admin/'))return false;
 if(p==='/api/cms/settings'||p==='/api/cms/news'||p.startsWith('/api/cms/media/'))return m==='GET';
 if(p==='/api/cms/content'||p==='/api/cms/page')return !u.searchParams.has('preview')||has('content');
 if(p==='/api/cms/admin/dashboard')return m==='GET';
 if(p.startsWith('/api/cms/admin/news'))return has('news');
 if(p.startsWith('/api/cms/admin/media'))return has('gallery')||has('content')||has('news');
 if(/^\/api\/cms\/admin\/(content|versions|pages|page-versions)(\/|$)/.test(p))return has('content');
 if(p.startsWith('/api/cms/'))return false;
 if(p.startsWith('/api/garage/'))return has('members');
 if(p.startsWith('/api/gallery/'))return has('gallery');
 if(p.startsWith('/api/bricos'))return has('bricos');
 if(p.startsWith('/api/suggestions'))return has('suggestions');
 if(['/api/analytics/config','/api/analytics/collect'].includes(p))return true;
 if(p.startsWith('/api/analytics/'))return has('statistics')&&m==='GET';
 if(p==='/api/club/notifications'||p==='/api/push/key')return m==='GET';
 if(p.startsWith('/api/push/'))return false;
 if(['/api/club/news','/api/club/motor-news','/api/club/weather','/api/club/birthdays','/api/club/whatsapp-access'].includes(p))return true;
 if(p.startsWith('/api/club/whatsapp'))return false;
 if(/^\/api\/club\/(events|attendees|event-attendees)/.test(p))return has('events');
 if(/^\/api\/club\/(posts)/.test(p))return has('news');
 if(p.startsWith('/api/club/social/'))return has('social');
 if(p.startsWith('/api/club/directory/'))return has('collaborators');
 if(p.startsWith('/api/club/'))return m==='GET'&&!u.searchParams.has('manage');
 if(p.startsWith('/api/racing/'))return m==='GET';
 return m==='GET';
}
export async function handleDelegates(request,db,user){
 const u=new URL(request.url),p=u.pathname,m=request.method;
 if(p==='/api/admin/delegates/activate'&&m==='POST'){
  const b=await request.json();if(typeof b.token!=='string'||b.token.length>200||typeof b.password!=='string'||b.password.length<12||b.password.length>128)fail('Revisa el enlace y usa una contraseña de 12 a 128 caracteres.');
  const digest=await hashAccess(b.token),row=await db.prepare('SELECT * FROM club_delegated_admins WHERE invite_hash=? AND invite_expires>?').bind(digest,stamp()).first();if(!row)fail('El enlace ha caducado, se ha utilizado o ha sido revocado.',410);
  const owner=await db.prepare('SELECT password_hash,salt FROM market_admins WHERE id=?').bind(OWNER_ADMIN_ID).first();if(owner&&await passwordAccess(b.password,owner.salt)===owner.password_hash)fail('Elige una contraseña propia distinta de la del propietario.');
  const salt=token(),hashed=await passwordAccess(b.password,salt);
  const result=await db.prepare("UPDATE club_delegated_admins SET password_hash=?,salt=?,enabled=1,invite_hash='',invite_expires=0,updated_at=? WHERE id=? AND invite_hash=? AND invite_expires>?").bind(hashed,salt,stamp(),row.id,digest,stamp()).run();if(!result.meta.changes)fail('El enlace ya no está disponible.',410);
  return reply({ok:true,email:OWNER_ADMIN_EMAIL,alias:row.alias});
 }
 if(!user||user.id!==OWNER_ADMIN_ID)fail('Solo Raúl puede gestionar administradores y permisos.',403);
 if(p==='/api/admin/delegates'&&m==='GET'){
  const accounts=(await db.prepare('SELECT id,member_id,alias,permissions_json,enabled,password_hash,invite_expires FROM club_delegated_admins ORDER BY alias').all()).results;
  const members=(await db.prepare("SELECT m.id,m.pilot FROM garage_members m LEFT JOIN garage_moderation g ON g.member_id=m.id WHERE COALESCE(g.status,'approved')='approved' AND NOT EXISTS(SELECT 1 FROM garage_member_blocks b WHERE b.member_id=m.id AND b.is_blocked=1) ORDER BY m.pilot LIMIT 200").all()).results;
  return reply({accounts:accounts.map(r=>({id:r.id,memberId:r.member_id,alias:r.alias,permissions:permissions(r),enabled:!!r.enabled,configured:!!r.password_hash,invitationPending:r.invite_expires>stamp()})),members,scopeLabels,email:OWNER_ADMIN_EMAIL});
 }
 if(p==='/api/admin/delegates'&&m==='POST'){
  const b=await request.json(),perms=Array.isArray(b.permissions)?[...new Set(b.permissions.filter(x=>scopes.includes(x)))]:null;if(!perms)fail('Selecciona los permisos.');
  const member=await db.prepare("SELECT m.id,m.pilot FROM garage_members m LEFT JOIN garage_moderation g ON g.member_id=m.id WHERE m.id=? AND COALESCE(g.status,'approved')='approved'").bind(String(b.memberId||'')).first();if(!member)fail('Selecciona una ficha de miembro aprobada.');
  const existing=await db.prepare('SELECT id FROM club_delegated_admins WHERE member_id=?').bind(member.id).first(),id=existing?.id||crypto.randomUUID();
  if(b.action==='invite'){
   const raw=token(),digest=await hashAccess(raw),at=stamp();
   await db.batch([db.prepare("INSERT INTO club_delegated_admins(id,member_id,alias,permissions_json,enabled,invite_hash,invite_expires,created_at,updated_at) VALUES(?,?,?,?,0,?,?,?,?) ON CONFLICT(member_id) DO UPDATE SET alias=excluded.alias,permissions_json=excluded.permissions_json,enabled=0,password_hash='',salt='',invite_hash=excluded.invite_hash,invite_expires=excluded.invite_expires,updated_at=excluded.updated_at").bind(id,member.id,member.pilot,JSON.stringify(perms),digest,at+86400,at,at),db.prepare('DELETE FROM club_delegated_sessions WHERE admin_id=?').bind(id)]);
   return reply({id,activationPath:'activar-admin.html#invitacion='+encodeURIComponent(raw),expiresIn:86400});
  }
  if(!existing)fail('Primero prepara la invitación.',404);
  if(b.action==='permissions'){await db.prepare('UPDATE club_delegated_admins SET permissions_json=?,updated_at=? WHERE id=?').bind(JSON.stringify(perms),stamp(),id).run();await db.prepare('DELETE FROM club_delegated_sessions WHERE admin_id=?').bind(id).run();return reply({ok:true});}
  if(b.action==='disable'){await db.batch([db.prepare("UPDATE club_delegated_admins SET enabled=0,invite_hash='',invite_expires=0,updated_at=? WHERE id=?").bind(stamp(),id),db.prepare('DELETE FROM club_delegated_sessions WHERE admin_id=?').bind(id)]);return reply({ok:true});}
  if(b.action==='enable'){const result=await db.prepare("UPDATE club_delegated_admins SET enabled=1,updated_at=? WHERE id=? AND password_hash<>''").bind(stamp(),id).run();if(!result.meta.changes)fail('Primero debe configurar su contraseña con una invitación.');return reply({ok:true});}
  fail('Acción no válida.');
 }
 return reply({error:'Ruta no encontrada.'},404);
}
