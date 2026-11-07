import {createEventAttendeeManager} from './event-attendees.mjs?v=20261107-asistentes-movil';

const status=document.querySelector('[data-page-status]');
const loginPanel=document.querySelector('[data-login-panel]');
const loginLink=document.querySelector('[data-login-link]');
const root=document.querySelector('[data-attendees-root]');
const heading=document.querySelector('[data-event-heading]');
const eventId=new URLSearchParams(location.search).get('evento')||'';
const validEventId=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,100}$/.test(eventId);

async function json(path,options={}){
 const response=await fetch(path,{cache:'no-store',...options});
 let data={};try{data=await response.json();}catch{}
 if(!response.ok)throw Object.assign(new Error(data.error||'No se pudo completar la operación.'),{status:response.status});
 return data;
}
async function attendeeApi(path,method='GET',body){return json('/api/club/'+path,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});}
function showLogin(){loginLink.href='admin.html?volver=asistentes&evento='+encodeURIComponent(eventId);loginPanel.hidden=false;}
function dateLabel(value){return new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));}

async function start(){
 if(!validEventId){status.textContent='El evento solicitado no es válido.';return;}
 let user;
 try{user=await json('/api/admin/session');}catch(error){if(error.status===401){user=null;}else{status.textContent=error.message;return;}}
 try{
  const events=await attendeeApi('events'),event=events.find(item=>item.id===eventId&&!item.birthday&&!item.holiday);
  if(!event)throw Error('El evento ya no existe o no está disponible.');
  document.querySelector('[data-event-title]').textContent=event.title;
  document.querySelector('[data-event-date]').textContent=dateLabel(event.date)+(event.time?' · '+event.time:'');
  document.querySelector('[data-admin-email]').textContent=user?.email||'Consulta de asistentes';
  document.title='Asistentes · '+event.title+' · Club Octavia VRS';
  heading.hidden=false;root.hidden=false;status.hidden=true;if(!user)showLogin();
  root.replaceChildren(createEventAttendeeManager({event,api:attendeeApi,expanded:true,readOnly:!user}));
 }catch(error){status.hidden=false;status.textContent=error.message;}
}

void start();
