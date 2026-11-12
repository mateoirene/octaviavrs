
import {trend,ranking,number} from './stats-visuals.mjs?v=20261112-profesional';
let generation=0;
export async function refreshAnalyticsOverview(){
 const host=document.querySelector('[data-analytics-overview]');if(!host)return;
 const note=host.querySelector('[data-overview-status]'),seq=++generation;
 note.textContent='Cargando actividad de los últimos 30 días…';
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),start=new Date(today+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-29);
 try{
  const response=await fetch('/api/analytics/report?'+new URLSearchParams({from:start.toISOString().slice(0,10),to:today,source:'first-party'}),{cache:'no-store'}),data=await response.json();
  if(seq!==generation)return;if(!response.ok)throw Error(data.error||'No se pudieron cargar las estadísticas.');
  trend(host.querySelector('[data-overview-chart]'),data);
  ranking(host.querySelector('[data-overview-pages]'),data.current.pages.slice(0,5));
  ranking(host.querySelector('[data-overview-buttons]'),data.current.buttons.slice(0,5));
  note.textContent=number(data.current.summary.views)+' páginas vistas · '+number(data.current.summary.users)+' visitantes · '+number(data.current.summary.clicks)+' clics y toques. Solo visitas consentidas; últimos 30 días.';
 }catch(error){if(seq===generation){note.textContent=error.message;for(const name of ['chart','pages','buttons'])host.querySelector('[data-overview-'+name+']').replaceChildren();}}
}
