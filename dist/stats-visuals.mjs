
export const labels={
 '/':'Inicio','/index.html':'Inicio','/garaje.html':'Garaje','/galeria.html':'Galería','/mercadillo.html':'Mercadillo','/simulador.html':'Simulador','/colaboradores.html':'Colaboradores','/redes-sociales.html':'Redes sociales','/normas-carretera.html':'Normas','/evento-calcotada-2027.html':'Calçotada','/bricos.html':'Bricos','/sugerencias.html':'Buzón de sugerencias','/asistentes-evento.html':'Asistentes',
 club:'El club',inicio:'Inicio',noticias:'Noticias',garaje:'Garaje',galeria:'Galería',mercadillo:'Mercadillo',simulador:'Simulador',calendario:'Calendario',colaboradores:'Colaboradores',redes:'Redes sociales',contacto:'Contacto',comunidad:'Comunidad',bricos:'Bricos',sugerencias:'Buzón de sugerencias',asistentes:'Asistentes',
 direct:'Acceso directo',internal:'Desde la propia web',google:'Google',bing:'Bing',instagram:'Instagram',facebook:'Facebook',youtube:'YouTube',telegram:'Telegram',external:'Otras webs',mobile:'Móvil',desktop:'Ordenador',tablet:'Tableta',email:'Correo',whatsapp:'WhatsApp',phone:'Teléfono',other:'Otros',
 discover_club:'Descubre el club',news_next:'Noticia siguiente',news_previous:'Noticia anterior',news_play:'Pausar / reanudar noticias',news_return:'Volver a novedades',news_open:'Abrir noticia',calendar_save:'Guardar evento',calendar_location:'Ubicación del evento',event_details:'Información del evento',calendar_next:'Mes siguiente',calendar_previous:'Mes anterior',calendar_today:'Calendario: hoy',calendar_next_event:'Próxima quedada',gallery_open:'Entrar en galería',notifications:'Abrir campana',notifications_read_all:'Marcar avisos leídos',
 page_view:'Página vista',user_engagement:'Tiempo de interacción',section_view:'Sección vista',scroll_depth:'Profundidad de lectura',interaction_click:'Clic o toque',ui_button_click:'Toque en un control',club_button_click:'Botón de navegación',garage_view:'Visita al garaje',member_car_view:'Ficha de un coche',member_instagram_click:'Instagram de un miembro',gallery_open:'Entrada en galería',gallery_image_view:'Foto vista',gallery_album_view:'Álbum consultado',event_view:'Evento consultado',event_calendar_click:'Consulta del calendario',event_save_calendar:'Guardar evento',event_location_click:'Ver ubicación',marketplace_view:'Visita al mercadillo',marketplace_listing_view:'Anuncio consultado',seller_contact_click:'Contactar con vendedor',simulator_start:'Carrera iniciada',simulator_engagement:'Uso activo del simulador',simulator_session_end:'Fin de sesión de simulador',simulator_lap_complete:'Vuelta completada',simulator_best_lap:'Mejor vuelta',video_start:'Vídeo iniciado',video_progress:'Avance de un vídeo',video_complete:'Vídeo completado',site_search:'Búsqueda interna',contact_click:'Contacto con el club',social_link_click:'Enlace a redes sociales',news_link_click:'Abrir una noticia',page_performance:'Medición de carga',resource_error:'Error detectado',script:'Código de la página',image:'Imágenes',stylesheet:'Estilos',video:'Vídeos'
};
export const label=value=>labels[value]||String(value??'Sin categoría');
export const number=value=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:1}).format(Number(value)||0);
export function node(tag,text,doc=document){const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;return e;}
export function dailySeries(rows,from,to,field='views',group='day'){
 const values=new Map((rows||[]).map(r=>[String(r.label).replace(/^(\d{4})(\d{2})(\d{2})$/,'$1-$2-$3'),Number(r[field])||0])),groups=new Map();
 for(let d=new Date(from+'T12:00:00Z'),end=new Date(to+'T12:00:00Z');d<=end;d.setUTCDate(d.getUTCDate()+1)){
  let key=d.toISOString().slice(0,10),value=values.get(key)||0;
  if(group==='week'){const w=new Date(d);w.setUTCDate(w.getUTCDate()-((w.getUTCDay()+6)%7));key=w.toISOString().slice(0,10);}
  if(group==='month')key=key.slice(0,7);groups.set(key,(groups.get(key)||0)+value);
 }return [...groups].map(([date,value])=>({date,value}));
}

export function chartScale(value){
 const max=Math.max(0,Number(value)||0);if(max<=4)return {max:4,step:1};
 const raw=max/4,power=10**Math.floor(Math.log10(raw)),fraction=raw/power;
 const step=Math.max(1,[1,2,2.5,5,10].find(n=>n>=fraction)*power);
 const integerStep=Math.ceil(step);return {max:Math.ceil(max/integerStep)*integerStep,step:integerStep};
}
function shortDate(date){
 if(!date)return '—';return new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(date.length===7?date+'-01T12:00:00Z':date+'T12:00:00Z'));
}
let chartId=0;
export function trend(host,report,metric='views',group='day'){
 host.__proChartObserver?.disconnect();host.replaceChildren();host.classList.add('pro-trend');
 const ga=report.source==='ga4',field=ga?({views:'screenPageViews',users:'totalUsers',sessions:'sessions'})[metric]:metric;
 const current=dailySeries(report.current.daily,report.from,report.to,field,group),previous=dailySeries(report.previous.daily,report.previousFrom,report.previousTo,field,group);
 const scale=chartScale(Math.max(0,...current.map(r=>r.value),...previous.map(r=>r.value))),doc=host.ownerDocument,ns='http://www.w3.org/2000/svg',id='pro-area-'+(++chartId),compact=host.clientWidth<600,chartWidth=compact?480:900,chartHeight=compact?340:320;
 const title=({views:'Páginas vistas',users:'Visitantes por día',sessions:'Sesiones por día'})[metric]||'Actividad';
 const summary=node('div',undefined,doc);summary.className='pro-chart-summary';
 const total=current.reduce((sum,r)=>sum+r.value,0),old=previous.reduce((sum,r)=>sum+r.value,0);
 const big=node('div',undefined,doc);big.append(node('span',metric==='views'?title:'Mayor registro diario',doc),node('strong',number(metric==='views'?total:Math.max(0,...current.map(r=>r.value))),doc));summary.append(big);
 const limited=!ga&&Date.parse(report.previousFrom)<Date.now()-90*86400000;
 const compare=node('span',limited?'Comparación limitada por el histórico disponible':metric==='views'&&old?((total>=old?'+':'')+number((total-old)/old*100)+' % frente al periodo anterior'):metric==='views'?'Sin base anterior para comparar':'Registros diarios; no se suman visitantes ni sesiones',doc);compare.className='pro-comparison';summary.append(compare);host.append(summary);
 const legend=node('div',undefined,doc);legend.className='pro-chart-legend';for(const [name,color]of [['Periodo actual','#ff6175'],['Periodo anterior','#a8b5ca']]){const item=node('span',name,doc);item.style.setProperty('--series',color);legend.append(item);}host.append(legend);
 const svg=doc.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 '+chartWidth+' '+chartHeight);svg.setAttribute('role','img');svg.setAttribute('aria-label',title+'. Periodo actual y anterior. Usa el control bajo el gráfico para consultar fechas y valores.');svg.classList.add('pro-chart-svg');
 const make=(tag,attrs={},text,parent=svg)=>{const e=doc.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;parent.append(e);return e;};
 const defs=make('defs'),gradient=make('linearGradient',{id,x1:'0',x2:'0',y1:'0',y2:'1'},undefined,defs);
 make('stop',{offset:'0%','stop-color':'#ff6175','stop-opacity':'.26'},undefined,gradient);make('stop',{offset:'100%','stop-color':'#ff6175','stop-opacity':'.01'},undefined,gradient);
 const left=58,right=chartWidth-22,top=20,bottom=chartHeight-50,len=Math.max(current.length,previous.length),x=i=>len<=1?(left+right)/2:left+i/(len-1)*(right-left),y=v=>bottom-v/scale.max*(bottom-top);
 for(let value=0;value<=scale.max;value+=scale.step){make('line',{x1:left,x2:right,y1:y(value),y2:y(value),stroke:'#b8c7df1c','stroke-dasharray':value?'3 6':'none'});make('text',{x:left-14,y:y(value)+4,'text-anchor':'end',fill:'#aab8ce','font-size':12},new Intl.NumberFormat('es-ES',{notation:value>=10000?'compact':'standard',maximumFractionDigits:1}).format(value));}
 if(current.length){const area='M '+x(0)+' '+bottom+' L '+current.map((r,i)=>x(i)+' '+y(r.value)).join(' L ')+' L '+x(current.length-1)+' '+bottom+' Z';make('path',{d:area,fill:'url(#'+id+')'});}
 for(const [rows,color,dash]of [[previous,'#a8b5ca','6 6'],[current,'#ff6175','']])make('polyline',{points:rows.map((r,i)=>x(i)+','+y(r.value)).join(' '),fill:'none',stroke:color,'stroke-width':dash?2:3,'stroke-dasharray':dash,'stroke-linejoin':'round','stroke-linecap':'round'});
 const ticks=[...new Set(Array.from({length:Math.min(compact?3:6,current.length)},(_,i)=>Math.round(i*(current.length-1)/Math.max(1,Math.min(compact?3:6,current.length)-1))))];
 for(const i of ticks)make('text',{x:x(i),y:chartHeight-19,fill:'#aab8ce','font-size':12,'text-anchor':i===0?'start':i===current.length-1?'end':'middle'},shortDate(current[i]?.date));
 const guide=make('line',{x1:left,x2:left,y1:top,y2:bottom,stroke:'#e4ebf870','stroke-dasharray':'4 4'}),dot=make('circle',{r:5,fill:'#ff6175',stroke:'#151b26','stroke-width':3}),oldDot=make('circle',{r:4,fill:'#a8b5ca',stroke:'#151b26','stroke-width':2});
 host.append(svg);
 const inspector=node('div',undefined,doc);inspector.className='pro-chart-inspector';inspector.setAttribute('aria-live','off');
 const date=node('strong',undefined,doc),now=node('span',undefined,doc),before=node('span',undefined,doc);inspector.append(date,now,before);host.append(inspector);
 const control=node('label',undefined,doc);control.className='pro-chart-control';const caption=node('span','Consultar fecha',doc),range=node('input',undefined,doc);range.type='range';range.min='0';range.max=String(Math.max(0,len-1));range.step='1';range.setAttribute('aria-label','Fecha que se consulta en el gráfico');control.append(caption,range);host.append(control);
 function select(index){
  index=Math.max(0,Math.min(len-1,index));range.value=String(index);
  const a=current[index],b=previous[index];guide.setAttribute('x1',x(index));guide.setAttribute('x2',x(index));
  for(const [element,row]of [[dot,a],[oldDot,b]]){element.setAttribute('cx',x(index));element.setAttribute('cy',y(row?.value||0));element.setAttribute('visibility',row?'visible':'hidden');}
  date.textContent=a?.date||'Sin fecha actual';now.textContent='Actual: '+(a?number(a.value):'—');before.textContent='Anterior: '+(b?number(b.value)+' · '+b.date:'—');
  range.setAttribute('aria-valuetext',(a?.date||'Sin fecha')+', actual '+(a?.value??'sin dato')+', anterior '+(b?.value??'sin dato'));
 }
 range.addEventListener('input',()=>select(Number(range.value)));
 svg.addEventListener('pointermove',event=>{const bounds=svg.getBoundingClientRect(),position=(event.clientX-bounds.left)/bounds.width*chartWidth;select(Math.round((position-left)/(right-left)*Math.max(0,len-1)));});
 svg.addEventListener('pointerdown',event=>{const bounds=svg.getBoundingClientRect();select(Math.round(((event.clientX-bounds.left)/bounds.width*chartWidth-left)/(right-left)*Math.max(0,len-1)));});
 select(Math.max(0,current.length-1));
 if(typeof ResizeObserver==='function'){const observer=new ResizeObserver(()=>{if(!host.querySelector('svg.pro-chart-svg')){observer.disconnect();return;}if((host.clientWidth<600)!==compact){observer.disconnect();trend(host,report,metric,group);}});observer.observe(host);host.__proChartObserver=observer;}
 const details=node('details',undefined,doc);details.className='stats-data-table';details.append(node('summary','Consultar tabla de datos',doc));const table=node('table',undefined,doc),head=node('tr',undefined,doc);for(const text of ['Fecha actual','Actual','Fecha anterior','Anterior'])head.append(node('th',text,doc));table.append(head);
 for(let i=0;i<len;i++){const row=node('tr',undefined,doc);for(const text of [current[i]?.date||'—',current[i]?number(current[i].value):'—',previous[i]?.date||'—',previous[i]?number(previous[i].value):'—'])row.append(node('td',text,doc));table.append(row);}details.append(table);host.append(details);
}
export function ranking(host,rows,field='count',suffix=''){
 host.replaceChildren();host.classList.add('pro-ranking');const doc=host.ownerDocument;
 if(!rows?.length){const empty=node('div',undefined,doc);empty.className='pro-chart-empty';empty.append(node('strong','Aún no hay datos',doc),node('p','Este gráfico se completará cuando se registre actividad en el periodo seleccionado.',doc));host.append(empty);return;}
 const total=rows.reduce((sum,row)=>sum+Math.max(0,Number(row[field])||0),0),max=Math.max(1,...rows.map(r=>Number(r[field])||0));
 const meta=node('div',undefined,doc);meta.className='pro-ranking-meta';meta.append(node('span',rows.length+' categorías',doc),node('span',number(total)+' registros en este listado',doc));host.append(meta);
 rows.forEach((row,index)=>{
  const value=Math.max(0,Number(row[field])||0),share=total?value/total*100:0,item=node('div',undefined,doc);item.className='pro-rank-row';
  const pos=node('span',String(index+1).padStart(2,'0'),doc);pos.className='pro-rank-position';
  const body=node('div',undefined,doc);body.className='pro-rank-body';const line=node('div',undefined,doc);line.className='pro-rank-line';
  const title=node('span',label(row.label),doc),numbers=node('span',undefined,doc);numbers.className='pro-rank-numbers';numbers.append(node('strong',number(value)+suffix,doc),node('small',number(share)+' %',doc));line.append(title,numbers);
  const track=node('div',undefined,doc);track.className='pro-rank-track';const bar=node('i',undefined,doc);bar.style.setProperty('--rank',value/max*100+'%');track.append(bar);body.append(line,track);
  if(row.kind)body.append(node('small',label(row.kind),doc));if(row.active_ms)body.append(node('small',number(row.active_ms/1000)+' s activos',doc));if(row.best_lap_ms)body.append(node('small',(row.best_lap_ms/1000).toFixed(3)+' s · mejor vuelta',doc));
  item.append(pos,body);item.title=number(share)+' % de los registros de este listado';host.append(item);
 });
 const foot=node('p','Los porcentajes corresponden a los registros de este listado, no al total de visitantes.',doc);foot.className='pro-ranking-footnote';host.append(foot);
}
export function csvCell(value){const text=String(value??'');return '"'+(/^[=+@\-\t\r\n]/.test(text)?"'":'')+text.replace(/"/g,'""')+'"';}
export function csvReport(report){
 const lines=[['Informe de la web',report.from,report.to],['Fuente',report.source],['Solo datos consentidos'],[],['Grupo','Elemento','Valor']];
 const ga=report.source==='ga4',s=ga?report.current.summary?.[0]||{}:report.current.summary||{};
 for(const [key,value]of Object.entries(s))lines.push(['Resumen',key,value]);
 for(const r of report.current.daily||[])lines.push(['Diario',r.label,r.views??r.screenPageViews??0]);
 for(const key of ['pages','sections','buttons','events','sources','devices','scroll','content'])for(const r of report.current[key]||[])lines.push([key,label(r.label),r.count??r.screenPageViews??r.sessions??r.eventCount??0]);
 return '\ufeff'+lines.map(row=>row.map(csvCell).join(';')).join('\r\n');
}
