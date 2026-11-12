
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
export function trend(host,report,metric='views',group='day'){
 host.replaceChildren();const ga=report.source==='ga4',field=ga?({views:'screenPageViews',users:'totalUsers',sessions:'sessions'})[metric]:metric;
 const current=dailySeries(report.current.daily,report.from,report.to,field,group),previous=dailySeries(report.previous.daily,report.previousFrom,report.previousTo,field,group),max=Math.max(1,...current.map(r=>r.value),...previous.map(r=>r.value)),doc=host.ownerDocument,ns='http://www.w3.org/2000/svg';
 const svg=doc.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 760 230');svg.setAttribute('role','img');svg.setAttribute('aria-label','Evolución: periodo actual en verde y anterior en gris. Los valores se pueden consultar en la tabla.');
 const make=(tag,attrs,text)=>{const e=doc.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;svg.append(e);return e;};
 for(let i=0;i<=4;i++){const y=190-i*40;make('line',{x1:48,x2:740,y1:y,y2:y,stroke:'#ffffff16'});make('text',{x:40,y:y+4,'text-anchor':'end',fill:'#aebbb4','font-size':11},number(max*i/4));}
 const len=Math.max(current.length,previous.length),x=i=>len<=1?394:48+i/(len-1)*692,y=v=>190-v/max*160;
 for(const [rows,color,dash]of [[previous,'#91a5af','5 5'],[current,'#8ce5ac','']]){
  make('polyline',{points:rows.map((r,i)=>x(i)+','+y(r.value)).join(' '),fill:'none',stroke:color,'stroke-width':3,'stroke-dasharray':dash,'stroke-linejoin':'round'});
  rows.forEach((r,i)=>{const dot=make('circle',{cx:x(i),cy:y(r.value),r:rows.length>35?2:4,fill:color});const t=doc.createElementNS(ns,'title');t.textContent=r.date+': '+number(r.value)+(dash?' · periodo anterior':' · periodo actual');dot.append(t);});
 }
 const steps=[...new Set([0,Math.floor((current.length-1)/2),current.length-1])].filter(i=>i>=0);
 for(const i of steps)make('text',{x:x(i),y:216,fill:'#aebbb4','font-size':11,'text-anchor':i===0?'start':i===current.length-1?'end':'middle'},current[i]?.date||'');
 host.append(svg);const details=node('details',undefined,doc);details.className='stats-data-table';details.append(node('summary','Ver valores del gráfico',doc));const table=node('table',undefined,doc);
 const head=node('tr',undefined,doc);for(const t of ['Fecha actual','Actual','Fecha anterior','Anterior'])head.append(node('th',t,doc));table.append(head);
 for(let i=0;i<len;i++){const row=node('tr',undefined,doc);for(const t of [current[i]?.date||'—',number(current[i]?.value),previous[i]?.date||'—',number(previous[i]?.value)])row.append(node('td',t,doc));table.append(row);}details.append(table);host.append(details);
}
export function ranking(host,rows,field='count',suffix=''){
 host.replaceChildren();const doc=host.ownerDocument;
 if(!rows?.length){host.append(node('p','Todavía no hay datos en este periodo.',doc));return;}
 const total=rows.reduce((s,r)=>s+(Number(r[field])||0),0),max=Math.max(1,...rows.map(r=>Number(r[field])||0));
 for(const row of rows){const item=node('div',undefined,doc);item.className='stats-rank';const line=node('div',undefined,doc),title=node('span',label(row.label),doc),value=node('strong',number(row[field])+suffix,doc);line.append(title,value);const bar=node('i',undefined,doc);bar.style.setProperty('--rank',Math.max(0,Number(row[field])||0)/max*100+'%');item.append(line,bar);if(total>0)item.title=number((Number(row[field])||0)/total*100)+' % dentro de este listado';if(row.kind)item.append(node('small',label(row.kind),doc));if(row.active_ms)item.append(node('small',number(row.active_ms/1000)+' s activos',doc));host.append(item);}
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
