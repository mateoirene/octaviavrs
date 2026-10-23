import { setVrsText } from './branding.mjs';
import { groupByCategory } from './market-categories.mjs';
const $ = selector => document.querySelector(selector);
const status = $('[data-status]'), login = $('[data-login]'), panel = $('[data-panel]');
const selectedId = new URLSearchParams(location.search).get('anuncio');
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
  const note = node('textarea'); note.placeholder = 'Nota privada de revisión (opcional)'; note.maxLength = 500; note.setAttribute('aria-label', 'Nota privada de revisión'); note.value = item.reviewNote || ''; card.append(note);
  const actions = item.status === 'pending' ? [['approve', 'Aprobar y publicar'], ['reject', 'Rechazar']] : item.status === 'approved' ? [['sold', 'Marcar vendido'], ['withdraw', 'Retirar anuncio']] : [];
  for (const [action, label] of actions) {
    const button = node('button', label);
    button.addEventListener('click', async () => {
      button.disabled = true;
      try { await api('admin/listings/' + item.id, { action, note: note.value }); await refresh(); window.dispatchEvent(new Event('club-session-change')); status.textContent = action === 'approve' ? 'Anuncio publicado en el mercadillo.' : 'Anuncio actualizado.'; }
      catch (error) { status.textContent = error.message; button.disabled = false; }
    });
    card.append(button);
  }
  return card;
}
async function refresh() {
  const list = $('[data-list]'); status.textContent = 'Cargando anuncios…';
  try {
    const items = await api('admin/listings?status=' + $('[data-filter]').value);
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
try { await enter(await api('admin/session')); } catch { if (!key) status.textContent = 'Acceso privado para Alberto y Raúl.'; }
