
import {label,number,node,trend,ranking,csvReport} from './stats-visuals.mjs?v=20261112-dashboard';
const $=s=>document.querySelector(s),root=$('[data-stats-panel]'),note=$('[data-stats-status]');
let report,sequence=0;
if(new URLSearchParams(location.search).has('embed'))document.body.classList.add('stats-embedded');
async function api(path,body){
 const r=await fetch('/api/analytics/'+path,{cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})}),data=await r.json();
 if(!r.ok){if(r.status===401||r.status===403){root.hidden=true;$('[data-stats-login]').hidden=false;}throw Error(data.error||'No se pudo obtener el informe.');}return data;
}
function seconds(ms){const s=Math.round((Number(ms)||0)/1000);return s>=60?Math.floor(s/60)+' min '+s%60+' s':s+' s';}
function card(host,title,value,detail=''){const item=node('article');item.append(node('span',title),node('strong',value),node('small',detail));host.append(item);}
function chart(){const metric=$('[name=metric]').value,group=$('[name=group]');group.disabled=metric!=='views';if(group.disabled)group.value='day';if(report)trend($('[data-stats-chart]'),report,metric,group.value);}
function render(data){
 report=data;const ga=data.source==='ga4',s=ga?data.current.summary?.[0]||{}:data.current.summary||{},old=ga?data.previous.summary?.[0]||{}:data.previous.summary||{},host=$('[data-stats-kpis]');
 host.replaceChildren();
 const fields=ga?[['Visitantes','totalUsers'],['Sesiones','sessions'],['Páginas vistas','screenPageViews'],['Tiempo activo total','userEngagementDuration']]:[['Visitantes únicos','users'],['Sesiones','sessions'],['Páginas vistas','views'],['Clics y toques','clicks']];
 for(const [title,key]of fields){const v=Number(s[key])||0,p=Number(old[key])||0;card(host,title,key==='userEngagementDuration'?seconds(v*1000):number(v),p?(v>=p?'+':'')+number((v-p)/p*100)+' % frente al periodo anterior':'Sin base de comparación anterior');}
 const sessions=Number(s.sessions)||0,active=ga?Number(s.userEngagementDuration)*1000:Number(s.active_ms),engaged=Number(ga?s.engagedSessions:s.engaged)||0;
 card(host,'Tiempo activo / sesión',sessions?seconds(active/sessions):'—','Tiempo de interacción, no duración de conexión');
 card(host,'Sesiones con interacción',number(engaged),sessions?number(engaged/sessions*100)+' % de las sesiones':'Sin sesiones en el periodo');
 card(host,'Páginas / sesión',sessions?number((Number(ga?s.screenPageViews:s.views)||0)/sessions):'—');
 card(host,'Eventos registrados',ga?'—':number(s.events),ga?'Consulta el desglose de eventos':'Vistas, clics y otras mediciones; no equivale a visitas');
 const keys={pages:ga?'screenPageViews':'count',sources:ga?'sessions':'count',devices:ga?'sessions':'count',events:ga?'eventCount':'count'};
 for(const [key,field]of Object.entries(keys)){data.current[key]=(data.current[key]||[]).slice().sort((a,b)=>(Number(b[field])||0)-(Number(a[field])||0));ranking($('[data-stats-'+key+']'),data.current[key],field);}
 for(const key of ['sections','buttons','simulator','content','errors'])ranking($('[data-stats-'+key+']'),data.current[key]||[]);
 ranking($('[data-stats-scroll]'),(data.current.scroll||[]).map(r=>({...r,label:r.label+' % de la página'})));
 if(ga)for(const key of ['sections','buttons','simulator','content','errors','scroll'])$('[data-stats-'+key+']').textContent='Disponible en la fuente Medición propia.';
 const insights=$('[data-stats-insights]');insights.replaceChildren();
 if(data.current.pages?.length)card(insights,'Lo más visitado',label(data.current.pages[0].label),number(data.current.pages[0][keys.pages])+' páginas vistas');
 if(data.current.buttons?.length)card(insights,'El botón más usado',label(data.current.buttons[0].label),number(data.current.buttons[0].count)+' clics');
 const health=$('[data-stats-health]');health.replaceChildren();
 card(health,'Consulta de estadísticas','Correcta','Acceso privado y base de datos disponibles en esta consulta');
 const measurement=data.measurement;
 card(health,'Actividad en 5 minutos',measurement?number(measurement.active_now):'—','Visitantes consentidos con algún evento reciente; no es presencia en directo');
 const stamp=Number(measurement?.latest_at);
 card(health,'Último dato recibido',stamp?new Intl.DateTimeFormat('es-ES',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Madrid'}).format(new Date(stamp*1000)):'Sin datos','Último evento consentido recibido en la web');
 for(const [key,title]of [['load','Carga completa media'],['lcp','Contenido principal (LCP) medio']]){
  const sample=data.current.performance?.find(r=>r.label===key);card(health,title,sample?number(sample.average_ms/1000)+' s':'Sin muestras',sample?number(sample.count)+' muestras en el periodo':'Se irá completando con nuevas visitas');
 }
 chart();$('[data-stats-export]').disabled=false;
 $('[data-stats-updated]').textContent='Actualizado a las '+new Intl.DateTimeFormat('es-ES',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid'}).format(new Date());
 note.textContent=(ga?'Fuente: Google Analytics 4. ':'Fuente: medición propia consentida. ')+'Comparación: '+data.previousFrom+' — '+data.previousTo+'. '+(data.notice||'No se suman cifras de proveedores distintos.');
 const oldest=new Date();oldest.setUTCDate(oldest.getUTCDate()-90);if(!ga&&data.previousFrom<oldest.toISOString().slice(0,10))note.textContent+=' Parte del periodo anterior puede quedar fuera de los 90 días de conservación.';
}
async function load(){
 const current=++sequence;note.textContent='Cargando estadísticas…';$('[data-stats-export]').disabled=true;root.setAttribute('aria-busy','true');
 try{const f=$('[data-stats-filters]'),data=await api('report?'+new URLSearchParams({from:f.elements.from.value,to:f.elements.to.value,source:f.elements.source.value}));if(current===sequence)render(data);}
 catch(e){if(current===sequence){report=null;for(const name of ['kpis','chart','pages','sections','events','sources','devices','buttons','simulator','scroll','content','errors','health','insights'])$('[data-stats-'+name+']')?.replaceChildren();note.textContent=e.message;}}
 finally{if(current===sequence)root.setAttribute('aria-busy','false');}
}
$('[data-stats-filters]').onsubmit=e=>{e.preventDefault();void load();};
$('[name=group]').onchange=chart;$('[name=metric]').onchange=chart;
function period(days){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),end=new Date(today+'T12:00:00Z'),start=new Date(end);start.setUTCDate(start.getUTCDate()-days+1);
 $('[name=from]').value=start.toISOString().slice(0,10);$('[name=to]').value=today;
 document.querySelectorAll('[data-stats-period]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.statsPeriod)===days)));void load();
}
document.querySelectorAll('[data-stats-period]').forEach(b=>b.onclick=()=>period(Number(b.dataset.statsPeriod)));
$('[data-stats-export]').onclick=()=>{
 if(!report)return;const url=URL.createObjectURL(new Blob([csvReport(report)],{type:'text/csv;charset=utf-8'})),a=node('a');a.href=url;a.download='estadisticas-'+report.from+'_'+report.to+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('[data-stats-settings]').onsubmit=async e=>{e.preventDefault();const form=e.target,body=Object.fromEntries(new FormData(form));for(const key of ['GA4_PRIVACY_VERIFIED','CLARITY_MASKING_VERIFIED'])body[key]=form.elements[key].checked;try{await api('settings',body);$('[data-stats-config-status]').textContent='Identificadores guardados. Las herramientas externas requieren validar su recepción de datos.';await status();}catch(e){$('[data-stats-config-status]').textContent=e.message;}};
async function status(){
 const s=await api('status'),host=$('[data-stats-providers]');host.replaceChildren();host.append(node('li','Medición propia: disponible con consentimiento'));
 for(const [key,title]of [['ga4','Google Analytics · etiqueta'],['ga4Reports','Google Analytics · informes'],['clarity','Clarity'],['cloudflare','Cloudflare Web Analytics']])host.append(node('li',title+': '+(s.providers[key]?'Configurado · recepción externa por verificar':'Sin configurar · opcional')));
 for(const [key,value]of Object.entries(s.settings||{})){const input=$('[data-stats-settings]').elements[key];if(input){if(input.type==='checkbox')input.checked=value==='1';else input.value=value;}}
}
try{await status();root.hidden=false;$('[data-stats-login]').hidden=true;period(30);}catch(e){note.textContent=e.message;}
