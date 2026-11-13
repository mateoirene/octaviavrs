import {initClubContact} from './contact.mjs?v=20261104-miembros';
import {initPushControls} from './push-client.mjs?v=20261024';
import { createCarNotificationSound } from './notification-chime.mjs';
import { setVrsText } from './branding.mjs';
const STORAGE_KEY = 'club-notifications-read-v1';
export function unreadNotifications(items, read) {
  const seen = new Set(read);
  return items.filter(item => !seen.has(item.id));
}
export function buildNotifications(news, listings = [], pending = []) {
  return [
    ...pending.map(item => ({ id: `pending:${item.id}`, title: 'Anuncio pendiente de revisión', message: `${item.category || 'Otros'} · ${item.title}`, href: `admin.html?anuncio=${encodeURIComponent(item.id)}` })),
    ...listings.map(item => ({ id: `listing:${item.id}`, title: 'Nueva pieza en el mercadillo', message: item.title, href: 'mercadillo.html' })),
    ...news.filter(item=>!String(item.href||'').includes('simulador')&&!/^(record|champion|racing|simulator):/.test(item.id||'')),
  ].filter((item, index, all) => item && typeof item.id === 'string' && typeof item.title === 'string' && all.findIndex(other => other.id === item.id) === index);
}
function readIds(storage) {
  try { const value = JSON.parse(storage.getItem(STORAGE_KEY) || '[]'); return new Set(Array.isArray(value) ? value.filter(id => typeof id === 'string') : []); }
  catch { return new Set(); }
}
export async function initNotifications(doc = document) {
  initClubContact(doc);
  const masthead = doc.querySelector('.masthead');
  if (!masthead) return;
  let storage;
  try { storage = window.localStorage; } catch { storage = null; }
  let read = readIds(storage), items = [], busy = false, initialized = false, timer;
  let known = new Set();
  const chime=createCarNotificationSound(window);let soundEnabled=true;try{soundEnabled=storage?.getItem('club-notification-sound-v1')!=='off';}catch{}
  doc.addEventListener('pointerdown',()=>{if(soundEnabled)chime.unlock();},{passive:true});doc.addEventListener('keydown',()=>{if(soundEnabled)chime.unlock();});
  const area = doc.createElement('div');
  area.className = 'club-notifications';
  const button = doc.createElement('button');
  button.type = 'button'; button.className = 'notification-bell';
  button.setAttribute('aria-label', 'Notificaciones');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'club-notification-panel');
  button.innerHTML = '<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M9 21h6M12 2V1"/></svg><span class="notification-count" hidden></span>';
  const badge = button.querySelector('span');
  const panel = doc.createElement('section'); panel.id = 'club-notification-panel'; panel.className = 'notification-panel'; panel.hidden = true; panel.setAttribute('aria-labelledby', 'notification-heading');
  const top = doc.createElement('div'); top.className = 'notification-panel-top';
  const heading = doc.createElement('h2'); heading.id = 'notification-heading'; heading.textContent = 'Notificaciones';
  const close = doc.createElement('button'); close.type = 'button'; close.textContent = '✕'; close.setAttribute('aria-label', 'Cerrar notificaciones');
  top.append(heading, close);
  const mark = doc.createElement('button'); mark.type = 'button'; mark.className = 'notification-mark-read'; mark.textContent = 'Marcar todas como leídas';
  const status = doc.createElement('p'); status.className = 'notification-status'; status.setAttribute('role', 'status'); status.textContent = 'Buscando novedades…';
  const list = doc.createElement('ul'); list.className = 'notification-list';
  const reviewAccess = doc.createElement('a'); reviewAccess.className = 'notification-review-access'; reviewAccess.href = 'admin.html'; reviewAccess.textContent = 'Entrar para revisar y autorizar anuncios →';
  const soundControl=doc.createElement('button');soundControl.type='button';soundControl.className='notification-mark-read';
  function soundLabel(){soundControl.textContent=soundEnabled?'Sonido de avisos: activado':'Sonido de avisos: apagado';soundControl.setAttribute('aria-pressed',String(soundEnabled));}soundLabel();soundControl.addEventListener('click',()=>{soundEnabled=!soundEnabled;try{storage?.setItem('club-notification-sound-v1',soundEnabled?'on':'off');}catch{}if(soundEnabled){chime.unlock();}soundLabel();});
  const garageReviewAccess=doc.createElement('a');garageReviewAccess.className='notification-review-access';garageReviewAccess.href='garaje.html#revisiones';garageReviewAccess.textContent='Revisar fichas del garaje →';garageReviewAccess.hidden=true;panel.append(top, mark, soundControl, status, reviewAccess,garageReviewAccess, list);initPushControls(panel,doc); area.append(button, panel); masthead.append(area);
  const toast = doc.createElement('div'); toast.className = 'notification-toast'; toast.setAttribute('role', 'status'); toast.hidden = true; doc.body.append(toast);
  const birthdayStyle=doc.createElement('link');birthdayStyle.rel='stylesheet';birthdayStyle.href=new URL('./birthdays.css?v=20261113-celebracion',import.meta.url).href;doc.head.append(birthdayStyle);
  const birthdayBanner=doc.createElement('aside');birthdayBanner.className='club-birthday-banner';birthdayBanner.dataset.birthdayBanner='';birthdayBanner.hidden=true;birthdayBanner.setAttribute('role','status');masthead.closest('header').after(birthdayBanner);
  function persist() { try { storage?.setItem(STORAGE_KEY, JSON.stringify([...read].slice(-1000))); } catch {} }
  let celebratedDate='';
  function celebrateBirthday(birthdays){
    if(!birthdays.length||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    const date=birthdays[0].date||new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    if(celebratedDate===date)return;
    try{if(window.sessionStorage.getItem('club-birthday-confetti-v1')===date){celebratedDate=date;return;}window.sessionStorage.setItem('club-birthday-confetti-v1',date);}catch{}
    celebratedDate=date;
    const canvas=doc.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)return;
    canvas.className='birthday-confetti-canvas';canvas.setAttribute('aria-hidden','true');doc.body.append(canvas);
    const colors=['#ef3340','#ffd166','#ffffff','#3aa779','#ef8290','#66c9e8'];let width=0,height=0,dpr=1;
    const resize=()=>{dpr=Math.min(window.devicePixelRatio||1,1.5);width=window.innerWidth;height=window.innerHeight;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);};resize();window.addEventListener('resize',resize,{passive:true});
    const count=Math.min(150,Math.max(70,Math.round(width/7))),pieces=Array.from({length:count},()=>({x:Math.random()*width,y:-Math.random()*height*.55,w:4+Math.random()*7,h:7+Math.random()*10,vy:2.2+Math.random()*4.4,vx:(Math.random()-.5)*2.5,angle:Math.random()*Math.PI*2,spin:(Math.random()-.5)*.16,color:colors[Math.floor(Math.random()*colors.length)],round:Math.random()<.22}));
    const started=performance.now();let frame=0;
    const draw=now=>{ctx.clearRect(0,0,width,height);const elapsed=now-started,fade=elapsed>2350?Math.max(0,1-(elapsed-2350)/650):1;ctx.globalAlpha=fade;for(const piece of pieces){piece.x+=piece.vx;piece.y+=piece.vy;piece.angle+=piece.spin;if(piece.y>height+20){piece.y=-20-Math.random()*80;piece.x=Math.random()*width;}ctx.save();ctx.translate(piece.x,piece.y);ctx.rotate(piece.angle);ctx.fillStyle=piece.color;if(piece.round){ctx.beginPath();ctx.arc(0,0,piece.w*.45,0,Math.PI*2);ctx.fill();}else ctx.fillRect(-piece.w/2,-piece.h/2,piece.w,piece.h);ctx.restore();}ctx.globalAlpha=1;if(elapsed<3000)frame=requestAnimationFrame(draw);else{cancelAnimationFrame(frame);window.removeEventListener('resize',resize);canvas.remove();}};frame=requestAnimationFrame(draw);
  }
  function render() {
    const birthdays=items.filter(item=>item.birthday);birthdayBanner.hidden=!birthdays.length;birthdayBanner.replaceChildren();if(birthdays.length){const icon=doc.createElement('img');icon.className='club-birthday-mark';icon.src='assets/birthday-popper.svg';icon.alt='';icon.setAttribute('aria-hidden','true');const message=doc.createElement('span');setVrsText(message,'Hoy celebramos a '+birthdays.map(item=>item.title.replace(/^Cumpleaños de /,'')).join(' · ')+'. ¡Felicidades de parte del club!');const link=doc.createElement('a');link.href='index.html#calendario';link.textContent='Ver calendario ↗';link.addEventListener('click',()=>doc.querySelector('[data-calendar-today]')?.click());birthdayBanner.append(icon,message,link);celebrateBirthday(birthdays);}
    const pendingCount = items.filter(item => item.id.startsWith('pending:')).length;
    for (const indicator of doc.querySelectorAll('[data-review-count]')) {
      indicator.hidden = pendingCount === 0; indicator.textContent = `(${pendingCount} pendientes)`;
    }
    const unread = unreadNotifications(items, read);
    const count = unread.length;
    badge.hidden = count === 0; badge.textContent = count > 99 ? '99+' : String(count);
    button.setAttribute('aria-label', count ? `Notificaciones: ${count} sin leer` : 'Notificaciones: todo leído');
    mark.disabled = count === 0;
    list.replaceChildren();
    if (count === 0) status.textContent = 'No tienes notificaciones sin leer.';
    for (const item of unread) {
      const li = doc.createElement('li'); if (!read.has(item.id)) li.className = 'notification-unread';
      const link = doc.createElement('a');
      try { const url = new URL(item.href, doc.baseURI); if (url.origin !== location.origin || !['http:', 'https:'].includes(url.protocol)) continue; link.href = url.href; } catch { continue; }
      const title = doc.createElement('strong'); setVrsText(title, item.title);
      const message = doc.createElement('span'); setVrsText(message, item.message || '');
      link.append(title, message);
      if (!read.has(item.id)) { const label = doc.createElement('small'); label.textContent = 'Nuevo'; link.append(label); }
      link.addEventListener('click', () => { if(item.birthday)doc.querySelector('[data-calendar-today]')?.click();read.add(item.id); persist(); render(); setOpen(false); });
      li.append(link); list.append(li);
    }
  }
  function setOpen(open) { panel.hidden = !open; button.setAttribute('aria-expanded', String(open)); if (!open) return; void refresh(); }
  button.addEventListener('click', () => setOpen(panel.hidden));
  close.addEventListener('click', () => { setOpen(false); button.focus(); });
  mark.addEventListener('click', () => { items.forEach(item => read.add(item.id)); persist(); render(); status.textContent = 'Todas las notificaciones están leídas.'; });
  doc.addEventListener('click', event => { if (!area.contains(event.target)) setOpen(false); });
  doc.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) { setOpen(false); button.focus(); } });
  window.addEventListener('storage', event => { if (event.key === STORAGE_KEY) { read = readIds(storage); render(); } });
  async function load(url) { const response = await fetch(url, { cache: 'no-store' }); if (!response.ok) throw new Error('No disponible'); return response.json(); }
  async function refresh() {
    if (busy) return; busy = true;
    try {
      const results = await Promise.allSettled([load('data/notificaciones.json'), load('/api/market/listings'), load('/api/admin/listings?status=pending'),load('/api/club/notifications'),load('/api/garage/members?review=pending')]);
      if (results[0].status === 'rejected' && results[1].status === 'rejected') throw new Error('Sin conexión');
      const values = results.map(result => result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : []);
      const garagePending=values[4].map(item=>({id:'garage-pending:'+item.id,title:'Ficha del garaje pendiente de revisión',message:item.pilot+' · '+item.model,href:'garaje.html#revisiones'}));items = buildNotifications([...garagePending,...values[3],...values[0]],values[1],values[2]);garageReviewAccess.hidden=results[4].status!=='fulfilled';garageReviewAccess.textContent=values[4].length?'Revisar '+values[4].length+' fichas del garaje pendientes →':'Abrir revisión de fichas del garaje →';
      const fresh = items.filter(item => !known.has(item.id) && !read.has(item.id));
      if (initialized && fresh.length) { if(soundEnabled&&chime.play())window.dispatchEvent(new Event('club-notification-sound'));toast.textContent = `${fresh.length === 1 ? 'Hay una nueva notificación' : `Hay ${fresh.length} notificaciones nuevas`}. Pulsa la campana para verlas.`; toast.hidden = false; clearTimeout(timer); timer = setTimeout(() => { toast.hidden = true; }, 6500); }
      reviewAccess.textContent = values[2].length ? `Revisar ${values[2].length} anuncios pendientes →` : results[2].status === 'fulfilled' ? 'Abrir panel de revisión →' : 'Iniciar sesión para ver los anuncios pendientes →';
      items.forEach(item=>known.add(item.id)); initialized = true;
      render(); status.textContent = unreadNotifications(items, read).length ? 'Novedades del club y del mercadillo.' : 'No tienes notificaciones sin leer.';
      if (results[0].status === 'rejected' || results[1].status === 'rejected') status.textContent = 'Algunas novedades no se han podido actualizar. Volveremos a intentarlo.';
    } catch { status.textContent = 'No se han podido actualizar las notificaciones. Vuelve a abrir la campana para reintentar.'; }
    finally { busy = false; }
  }
  window.addEventListener('club-session-change', () => { items = items.filter(item => !item.id.startsWith('pending:')&&!item.id.startsWith('garage-pending:')&&item.audience!=='admin'); render(); void refresh(); });
  doc.addEventListener('visibilitychange', () => { if (!doc.hidden) void refresh(); });
  setInterval(() => { if (!doc.hidden) void refresh(); }, 180000);
  await refresh();if(new URLSearchParams(location.search).get('avisos')==='1')setOpen(true);
}
if (typeof document !== 'undefined') void initNotifications();
