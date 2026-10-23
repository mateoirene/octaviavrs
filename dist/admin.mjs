import { setVrsText } from './branding.mjs';
import { groupByCategory } from './market-categories.mjs';
const $ = selector => document.querySelector(selector);
const status = $('[data-status]'), login = $('[data-login]'), panel = $('[data-panel]');
const selectedId = new URLSearchParams(location.search).get('anuncio');
const noteDrafts = new Map();
let lastSignature = '', refreshing = false, polling = false;
const signature = items => items.map(item => `${item.id}:${item.status}`).join('|');
function showPendingCount(count) { $('[data-pending-summary]').textContent = count ? `Tienes ${count} ${count === 1 ? 'anuncio pendiente' : 'anuncios pendientes'} de autorización.` : 'No hay anuncios pendientes de autorización.'; }
let key = new URLSearchParams(location.hash.slice(1)).get('activar'), focused = false;
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
async function api(path, body) {
  const response = await fetch('/api/' + path, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401) { panel.hidden = true; login.hidden = false; }
    throw new Error(result.error || 'No se ha podido completar la operación.');
  }
  return result;
}
function node(tag, text) { const el = document.createElement(tag); if (text) setVrsText(el, text); return el; }
async function refreshMail(retryQueued = false) {
  const note = $('[data-mail-status]'), retry = $('[data-mail-retry]');
  try {
    const state = await api('admin/review-mail');
    const pending = state.queued + state.failed;
    note.textContent = !state.configured ? 'Los avisos por correo aún no están configurados. Los anuncios siguen disponibles para revisar aquí y en la campana.' : pending ? `Hay ${pending} avisos por correo pendientes de enviar a ${state.recipient}.` : `Avisos por correo configurados para ${state.recipient}.`;
    retry.hidden = !state.configured || pending === 0;
    if (retryQueued && state.configured && pending) { await api('admin/review-mail/retry', {}); setTimeout(() => void refreshMail(), 5000); }
  } catch { note.textContent = 'No se ha podido comprobar el estado de los avisos por correo.'; retry.hidden = true; }
}
function cardFor(item) {
  const card = node('article'); card.className = 'admin-card'; card.id = 'anuncio-' + item.id;
  card.append(node('h3', item.title), node('p', `${item.price.toLocaleString('es-ES')} € · ${item.category}`), node('p', item.description), node('p', `Estado: ${item.condition}\nCompatibilidad: ${item.compatibility}\nLocalidad: ${item.location}\nVendedor: ${item.seller}`));
  for (const src of item.images) {
    const a = node('a'), image = node('img'); a.href = src; a.target = '_blank'; a.rel = 'noopener noreferrer'; image.src = src; image.alt = 'Foto de ' + item.title; a.append(image); card.append(a);
  }
  const contact = node('a', 'Contacto del vendedor'); contact.href = item.contactUrl; contact.rel = 'noopener noreferrer'; card.append(contact);
  const note = node('textarea'); note.placeholder = 'Nota privada de revisión (opcional)'; note.maxLength = 500; note.setAttribute('aria-label', 'Nota privada de revisión'); note.value = noteDrafts.get(item.id) ?? item.reviewNote ?? ''; note.addEventListener('input', () => noteDrafts.set(item.id, note.value)); card.append(note);
  const actionBar = node('div'); actionBar.className = 'admin-review-actions';
  if (item.status === 'sold') {
    const available = new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(new Date(item.deleteAvailableAt * 1000));
    card.append(node('p', item.canDelete ? 'Ya han pasado 24 horas. Puedes eliminar definitivamente el anuncio y sus fotos.' : `El borrado definitivo estará disponible el ${available} (hora de Madrid), al cumplirse 24 horas desde la venta.`));
  }
  const actions = item.status === 'pending' ? [['approve', 'Aprobar y publicar'], ['reject', 'Rechazar']] : item.status === 'approved' ? [['sold', 'Marcar vendido'], ['withdraw', 'Retirar anuncio']] : item.status === 'sold' ? [['delete', 'Eliminar definitivamente']] : [];
  for (const [action, label] of actions) {
    const button = node('button', label); button.className = action === 'approve' ? 'admin-approve' : ['reject', 'delete'].includes(action) ? 'admin-reject' : '';
    if (action === 'delete' && !item.canDelete) { button.disabled = true; button.title = 'Disponible 24 horas después de marcarlo como vendido.'; } 
    button.addEventListener('click', async () => {
      if (action === 'delete' && (!item.canDelete || !window.confirm(`¿Eliminar definitivamente «${item.title}» y todas sus fotos? Esta acción no se puede deshacer.`))) return;
      button.disabled = true;
      try { await api('admin/listings/' + item.id, { action, note: note.value, ...(action === 'delete' ? { confirm: true } : {}) }); noteDrafts.delete(item.id); await refresh(); window.dispatchEvent(new Event('club-session-change')); status.textContent = action === 'approve' ? 'Anuncio publicado en el mercadillo.' : action === 'delete' ? 'Anuncio y fotos eliminados definitivamente.' : 'Anuncio actualizado.'; }
      catch (error) { status.textContent = error.message; button.disabled = false; }
    });
    actionBar.append(button);
  }
  card.append(actionBar);
  return card;
}
async function refresh() {
  if (refreshing) return; refreshing = true;
  const list = $('[data-list]'); status.textContent = 'Cargando anuncios…';
  try {
    const items = await api('admin/listings?status=' + $('[data-filter]').value);
    lastSignature = signature(items);
    if ($('[data-filter]').value === 'pending') showPendingCount(items.length);
    else { const pending = await api('admin/listings?status=pending'); showPendingCount(pending.length); }
    const groups = groupByCategory(items, $('[data-admin-category]').value);
    list.replaceChildren();
    for (const group of groups) {
      const section = node('section'); section.className = 'admin-category-group';
      section.append(node('h2', `${group.category} (${group.items.length})`), ...group.items.map(cardFor)); list.append(section);
    }
    const count = groups.reduce((total, group) => total + group.items.length, 0);
    status.textContent = count ? `${count} anuncios, clasificados por temática.` : 'No hay anuncios con estos filtros.';
    if (selectedId && !focused) {
      const selected = document.getElementById('anuncio-' + selectedId);
      if (selected) { selected.tabIndex = -1; selected.focus({ preventScroll: true }); selected.scrollIntoView({ block: 'center', behavior: 'instant' }); focused = true; }
      else if (!items.some(item => item.id === selectedId)) status.textContent += ' El anuncio del enlace ya no está pendiente o ha cambiado de estado.';
    }
    await refreshMail();
  } catch (error) { status.textContent = error.message; }
  finally { refreshing = false; }
}
async function pollPending() {
  if (panel.hidden || document.hidden || refreshing || polling) return;
  polling = true;
  try {
    const pending = await api('admin/listings?status=pending');
    showPendingCount(pending.length);
    const editing = document.activeElement?.tagName === 'TEXTAREA';
    if (!editing && (($('[data-filter]').value === 'pending' && signature(pending) !== lastSignature) || $('[data-filter]').value === 'sold')) await refresh();
  } catch (error) { status.textContent = error.message; }
  finally { polling = false; }
}
async function enter(user) {
  key = null; login.hidden = true; panel.hidden = false; window.dispatchEvent(new Event('club-session-change'));
  $('[data-user]').textContent = user.email; await refresh(); await refreshMail(true);
}
if (key) { $('[data-login-title]').textContent = 'Activar acceso privado'; $('[data-setup-copy]').hidden = false; login.elements.password.autocomplete = 'new-password'; }
login.addEventListener('submit', async event => {
  event.preventDefault(); const button = login.querySelector('button'); button.disabled = true; status.textContent = 'Comprobando acceso…';
  try { const data = Object.fromEntries(new FormData(login)); if (key) data.key = key; await enter(await api(key ? 'admin/setup' : 'admin/login', data)); login.reset(); }
  catch (error) { status.textContent = error.message; } finally { button.disabled = false; }
});
setInterval(() => void pollPending(), 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) void pollPending(); });
$('[data-show-pending]').addEventListener('click', async event => { event.preventDefault(); $('[data-filter]').value = 'pending'; $('[data-admin-category]').value = ''; await refresh(); const list = $('[data-list]'); list.tabIndex = -1; list.focus({ preventScroll: true }); list.scrollIntoView({ block: 'start', behavior: 'instant' }); });
$('[data-filter]').addEventListener('change', refresh);
$('[data-admin-category]').addEventListener('change', refresh);
$('[data-refresh]').addEventListener('click', refresh);
$('[data-mail-retry]').addEventListener('click', async event => {
  const button = event.currentTarget; button.disabled = true;
  try { await api('admin/review-mail/retry', {}); $('[data-mail-status]').textContent = 'Reintentando los avisos pendientes…'; setTimeout(() => void refreshMail(), 5000); }
  catch (error) { status.textContent = error.message; } finally { button.disabled = false; }
});
$('[data-logout]').addEventListener('click', async () => {
  try { await api('admin/logout', {}); window.dispatchEvent(new Event('club-session-change')); panel.hidden = true; login.hidden = false; status.textContent = 'Sesión cerrada.'; }
  catch (error) { status.textContent = error.message; }
});
$('[data-add-user]').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget, button = form.querySelector('button'); button.disabled = true;
  try { await api('admin/users', Object.fromEntries(new FormData(form))); form.reset(); status.textContent = 'Acceso creado. El otro administrador ya puede iniciar sesión con su correo y contraseña.'; }
  catch (error) { status.textContent = error.message; } finally { button.disabled = false; }
});
try { await enter(await api('admin/session')); } catch (error) { if (!key) status.textContent = error.message === 'Inicia sesión para continuar.' ? 'Inicia sesión con la cuenta de administración del club para ver y autorizar los anuncios.' : error.message; }
