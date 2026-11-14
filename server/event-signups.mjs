import {eventRegistrationInfo} from './event-registration-mode.mjs';
import {approvedEventMembers,approvedEventMember,memberEventSession} from './member-event-access.mjs';
import {OWNER_ADMIN_ID} from './config.mjs';
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const manager=user=>user?.id===OWNER_ADMIN_ID||(user?.role==='administrator'&&user.permissions.includes('events'));
const madridToday=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export async function handleEventSignups(request,db,admin){
 const match=new URL(request.url).pathname.match(/^\/api\/club\/events\/([^/]+)\/signups(?:\/([^/]+))?$/);if(!match)return null;
 let id,target;try{id=decodeURIComponent(match[1]);target=match[2]?decodeURIComponent(match[2]):'';}catch{fail('Ruta no válida.');}
 const event=await eventRegistrationInfo(db,id);if(!event)fail('El evento no existe.',404);
 if(event.mode==='calcotada'){if(request.method!=='GET')fail('Las listas de calçotada solo las gestiona Raúl.',403);return reply({mode:'calcotada',rows:[],member:null,canManage:false});}
 const canManage=manager(admin),member=await memberEventSession(db,request),open=event.event_date>=madridToday()&&event.event_status!=='completed';
 if(request.method==='GET'){
  const rows=(await db.prepare('SELECT member_id memberId,pilot_name pilot,people_count people,created_at createdAt FROM club_event_signups WHERE event_id=? ORDER BY created_at,pilot_name').bind(id).all()).results;
  return reply({mode:'simple',rows,totalPeople:rows.reduce((n,r)=>n+r.people,0),member,canManage,open,members:canManage?await approvedEventMembers(db):[]});
 }
 if(!canManage&&!member)fail('Activa tu acceso personal de socio para apuntarte.',401);
 if(!canManage&&!open)fail('Este evento ya no admite inscripciones ni bajas.',409);
 if(request.method==='POST'&&!target){
  const b=await request.json(),memberId=canManage?String(b.memberId||member?.id||''):member.id;if(!canManage&&b.memberId&&b.memberId!==member.id)fail('Solo puedes gestionar tu propia inscripción.',403);
  const approved=await approvedEventMember(db,memberId);if(!approved)fail('La ficha debe estar aprobada y visible.',403);
  const people=Number(b.people??1);if(!Number.isInteger(people)||people<1||people>20)fail('Indica entre 1 y 20 personas, incluyéndote.');
  const at=Math.floor(Date.now()/1000);await db.prepare('INSERT INTO club_event_signups VALUES(?,?,?,?,?,?,?) ON CONFLICT(event_id,member_id) DO UPDATE SET pilot_name=excluded.pilot_name,people_count=excluded.people_count,updated_at=excluded.updated_at,updated_by=excluded.updated_by').bind(id,memberId,approved.pilot,people,at,at,canManage?admin.id:member.id).run();
  return reply({ok:true,memberId});
 }
 if(request.method==='DELETE'&&target){
  if(!canManage&&target!==member.id)fail('Solo puedes cancelar tu propia inscripción.',403);
  const result=await db.prepare('DELETE FROM club_event_signups WHERE event_id=? AND member_id=?').bind(id,target).run();if(!result.meta.changes)fail('La inscripción ya no existe.',404);return reply({ok:true});
 }
 return reply({error:'Método no permitido.'},405);
}
