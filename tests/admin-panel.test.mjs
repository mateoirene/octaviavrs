import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('el panel muestra pendientes, conserva notas al actualizar y permite aprobar o rechazar', async () => {
  const original = Object.fromEntries(['document','window','location','fetch','setInterval'].map(key => [key, globalThis[key]]));
  const selectors = new Map(), intervals = [];
  class Element {
    constructor(tag = 'div') { this.tagName = tag.toUpperCase(); this.children = []; this.listeners = new Map(); this.textContent = ''; this.value = ''; this.hidden = false; this.className = ''; }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    setAttribute(name, value) { this[name] = value; }
    addEventListener(name, fn) { this.listeners.set(name, fn); }
    focus() { globalThis.document.activeElement = this; }
    scrollIntoView() {}
    querySelector(selector) { return this.children.find(child => child.tagName === selector.toUpperCase()); }
    reset() {}
  }
  const html = readFileSync(new URL('../dist/admin.html', import.meta.url), 'utf8');
  for (const attr of ['status','login','panel','filter','admin-category','pending-summary','show-pending','list','mail-status','mail-retry','user','refresh','logout','add-user']) {
    assert.ok(html.includes('data-' + attr), 'Control presente: ' + attr);
    selectors.set('[data-' + attr + ']', new Element());
  }
  selectors.get('[data-panel]').hidden = true;
  selectors.get('[data-filter]').value = 'pending';
  globalThis.document = { hidden: false, activeElement: null, querySelector: selector => selectors.get(selector), createElement: tag => new Element(tag), createTextNode: text => Object.assign(new Element('text'), { textContent: text }), addEventListener() {}, getElementById() { return null; } };
  globalThis.window = { dispatchEvent() {} };
  globalThis.location = { search: '', hash: '', pathname: '/admin.html' };
  globalThis.setInterval = callback => { intervals.push(callback); return 1; };
  const listing = (id, category) => ({ id, category, title: 'Pieza VRS ' + id, price: 100, description: 'Una pieza para el coche', condition: 'Usado', compatibility: 'Octavia', location: 'Girona', seller: 'Socio', images: [], status: 'pending', contactUrl: 'mailto:test@example.com' });
  let items = [listing('one','Motor'), listing('two','Interior'), listing('three','Exterior')];
  const actions = [];
  globalThis.fetch = async (url, options) => {
    let body;
    if (url.endsWith('/session')) body = { email: 'admin@example.com' };
    else if (url.endsWith('/review-mail')) body = { configured: false, queued: items.length, failed: 0 };
    else if (url.includes('/listings?')) body = items.filter(item => item.status === new URL(url, 'https://club.example').searchParams.get('status'));
    else if (options.method === 'POST' && url.includes('/listings/')) {
      const action = JSON.parse(options.body); actions.push(action);
      items = items.filter(item => item.id !== url.split('/').pop()); body = { ok: true };
    } else throw new Error('Ruta inesperada ' + url);
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
  };
  const descendants = element => [element, ...element.children.flatMap(descendants)];
  try {
    await import('../dist/admin.mjs?panel-test');
    assert.equal(selectors.get('[data-panel]').hidden, false);
    assert.match(selectors.get('[data-pending-summary]').textContent, /3 anuncios pendientes/);
    assert.equal(selectors.get('[data-list]').children.length, 3);
    const first = selectors.get('[data-list]').children[0];
    const approve = descendants(first).find(el => el.tagName === 'BUTTON' && el.textContent === 'Aprobar y publicar');
    await approve.listeners.get('click')();
    assert.equal(actions[0].action, 'approve');
    assert.match(selectors.get('[data-pending-summary]').textContent, /2 anuncios pendientes/);
    const list = selectors.get('[data-list]');
    const note = descendants(list).find(el => el.tagName === 'TEXTAREA');
    note.value = 'Mi nota sin enviar'; note.listeners.get('input')();
    items.push(listing('four','Motor'));
    intervals[0](); await new Promise(setImmediate);
    assert.match(selectors.get('[data-pending-summary]').textContent, /3 anuncios pendientes/);
    assert.ok(descendants(list).some(el => el.tagName === 'TEXTAREA' && el.value === 'Mi nota sin enviar'));
    const reject = descendants(list).find(el => el.tagName === 'BUTTON' && el.textContent === 'Rechazar');
    await reject.listeners.get('click')(); assert.equal(actions[1].action, 'reject');
    items = [
      { ...listing('ready', 'Motor'), status: 'sold', canDelete: true, deleteAvailableAt: Math.floor(Date.now()/1000)-1 },
      { ...listing('wait', 'Exterior'), status: 'sold', canDelete: false, deleteAvailableAt: Math.floor(Date.now()/1000)+3600 },
    ];
    selectors.get('[data-filter]').value = 'sold';
    await selectors.get('[data-filter]').listeners.get('change')();
    const ready = descendants(list).find(el => el.id === 'anuncio-ready');
    const waiting = descendants(list).find(el => el.id === 'anuncio-wait');
    const readyButton = descendants(ready).find(el => el.tagName === 'BUTTON' && el.textContent === 'Eliminar definitivamente');
    const waitButton = descendants(waiting).find(el => el.tagName === 'BUTTON' && el.textContent === 'Eliminar definitivamente');
    assert.equal(waitButton.disabled, true);
    globalThis.window.confirm = () => false;
    await readyButton.listeners.get('click')(); assert.equal(actions.length, 2, 'Cancelar no borra');
    globalThis.window.confirm = () => true;
    await readyButton.listeners.get('click')();
    assert.equal(actions[2].action, 'delete'); assert.equal(actions[2].confirm, true);
    assert.ok(!descendants(list).some(el => el.id === 'anuncio-ready'));
    assert.ok(descendants(list).some(el => el.id === 'anuncio-wait'));
  } finally {
    for (const [key, value] of Object.entries(original)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; }
  }
});
