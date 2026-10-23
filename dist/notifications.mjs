import { setVrsText } from './branding.mjs';
const STORAGE_KEY = 'club-notifications-read-v1';
export function unreadNotifications(items, read) {
  const seen = new Set(read);
  return items.filter(item => !seen.has(item.id));
}
export function buildNotifications(news, listings = [], pending = []) {
  return [
    ...pending.map(item => ({ id: `pending:${item.id}`, title: 'Anuncio pendiente de revisión', message: item.title, href: 'admin.html' })),
    ...listings.map(item => ({ id: `listing:${item.id}`, title: 'Nueva pieza en el mercadillo', message: item.title, href: 'mercadillo.html' })),
    ...news,
  ].filter((item, index, all) => item && typeof item.id === 'string' && typeof item.title === 'string' && all.findIndex(other => other.id === item.id) === index);
}
function readIds(storage) {
  try { const value = JSON.parse(storage.getItem(STORAGE_KEY) || '[]'); return new Set(Array.isArray(value) ? value.filter(id => typeof id === 'string') : []); }
  catch { return new Set(); }
}
export async function initNotifications(doc = document) {
  const masthead = doc.querySelector('.masthead');
  if (!masthead) return;
  let storage;
  try { storage = window.localStorage; } catch { storage = null; }
  let read = readIds(storage), items = [], busy = false, initialized = false, timer;
  let known = new Set();
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
  panel.append(top, mark, status, list); area.append(button, panel); masthead.append(area);
  const toast = doc.createElement('div'); toast.className = 'notification-toast'; toast.setAttribute('role', 'status'); toast.hidden = true; doc.body.append(toast);
  function persist() { try { storage?.setItem(STORAGE_KEY, JSON.stringify([...read].slice(-1000))); } catch {} }
  function render() {
    const count = unreadNotifications(items, read).length;
    badge.hidden = count === 0; badge.textContent = count > 99 ? '99+' : String(count);
    button.setAttribute('aria-label', count ? `Notificaciones: ${count} sin leer` : 'Notificaciones: todo leído');
    mark.disabled = count === 0;
    list.replaceChildren();
    for (const item of items) {
      const li = doc.createElement('li'); if (!read.has(item.id)) li.className = 'notification-unread';
      const link = doc.createElement('a');
      try { const url = new URL(item.href, doc.baseURI); if (url.origin !== location.origin || !['http:', 'https:'].includes(url.protocol)) continue; link.href = url.href; } catch { continue; }
      const title = doc.createElement('strong'); setVrsText(title, item.title);
      const message = doc.createElement('span'); setVrsText(message, item.message || '');
      link.append(title, message);
      if (!read.has(item.id)) { const label = doc.createElement('small'); label.textContent = 'Nuevo'; link.append(label); }
      link.addEventListener('click', () => { read.add(item.id); persist(); render(); setOpen(false); });
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
      const results = await Promise.allSettled([load('data/notificaciones.json'), load('/api/market/listings'), load('/api/admin/listings?status=pending')]);
      if (results[0].status === 'rejected' && results[1].status === 'rejected') throw new Error('Sin conexión');
      const values = results.map(result => result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : []);
      items = buildNotifications(...values);
      const fresh = items.filter(item => !known.has(item.id) && !read.has(item.id));
      if (initialized && fresh.length) { toast.textContent = `${fresh.length === 1 ? 'Hay una nueva notificación' : `Hay ${fresh.length} notificaciones nuevas`}. Pulsa la campana para verlas.`; toast.hidden = false; clearTimeout(timer); timer = setTimeout(() => { toast.hidden = true; }, 6500); }
      known = new Set(items.map(item => item.id)); initialized = true;
      render(); status.textContent = items.length ? 'Novedades del club y del mercadillo.' : 'No hay novedades por ahora.';
      if (results[0].status === 'rejected' || results[1].status === 'rejected') status.textContent = 'Algunas novedades no se han podido actualizar. Volveremos a intentarlo.';
    } catch { status.textContent = 'No se han podido actualizar las notificaciones. Vuelve a abrir la campana para reintentar.'; }
    finally { busy = false; }
  }
  window.addEventListener('club-session-change', () => { items = items.filter(item => !item.id.startsWith('pending:')); render(); void refresh(); });
  doc.addEventListener('visibilitychange', () => { if (!doc.hidden) void refresh(); });
  setInterval(() => { if (!doc.hidden) void refresh(); }, 60000);
  await refresh();
}
if (typeof document !== 'undefined') void initNotifications();
