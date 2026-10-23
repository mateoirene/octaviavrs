import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
test('puntero con imagen: carga segura, luz al pulsar, formularios nativos y respuesta táctil', () => {
  const docEvents = new Map(), winEvents = new Map(), timers = new Map(), frames = [];
  let lastTimer = 0, preload;
  class Element {
    constructor() { this.children = []; this.style = {}; this.hidden = false; this.attributes = {}; this.classes = new Set(); this.classList = { add: name => this.classes.add(name), remove: name => this.classes.delete(name), contains: name => this.classes.has(name) }; }
    set className(value) { this.classes = new Set(value.split(' ')); }
    get className() { return [...this.classes].join(' '); }
    setAttribute(name, value) { this.attributes[name] = value; }
    getAttribute(name) { return this.attributes[name]; }
    append(node) { node.remove(); this.children.push(node); node.parentNode = this; }
    remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this); this.parentNode = null; }
    closest(selector) {
      if (selector === 'dialog[open]') return this.dialog || null;
      if (selector === '[inert]') return null;
      if (selector.includes('contenteditable')) return this.editable ? this : null;
      if (selector.includes('a[href]')) return this.interactive ? this : null;
      return null;
    }
    getBoundingClientRect() { return { left: 100, top: 50, width: 80, height: 40 }; }
  }
  const body = new Element(), root = new Element();
  const document = { body, documentElement: root, baseURI: 'https://club.example/index.html', hidden: false, createElement: () => new Element(), addEventListener: (name, fn) => docEvents.set(name, fn) };
  const media = { matches: true, addEventListener() {} };
  const context = { document, window: { matchMedia: () => media, addEventListener: (name, fn) => winEvents.set(name, fn) }, URL,
    Image: class { constructor() { preload = this; this.complete = false; } },
    requestAnimationFrame: fn => { frames.push(fn); return frames.length; },
    setTimeout: fn => { timers.set(++lastTimer, fn); return lastTimer; }, clearTimeout: id => timers.delete(id),
  };
  runInNewContext(readFileSync(new URL('../dist/engine-pointer.js', import.meta.url), 'utf8'), context);
  const cursor = body.children[0];
  const button = new Element(); button.interactive = true;
  const event = { target: button, pointerType: 'mouse', clientX: 200, clientY: 150, button: 0 };
  docEvents.get('pointermove')(event); assert.equal(root.classList.contains('engine-cursor-active'), false, 'No oculta el cursor antes de cargar la imagen');
  assert.match(preload.src, /assets\/puntero-start-engine\.jpg$/); preload.onload();
  docEvents.get('pointermove')(event); frames.shift()();
  assert.equal(cursor.hidden, false); assert.equal(root.classList.contains('engine-cursor-active'), true);
  assert.equal(cursor.style.transform, 'translate3d(176px,126px,0)');
  docEvents.get('pointerdown')(event); assert.equal(cursor.classList.contains('engine-pointer-lit'), true);
  [...timers.values()].forEach(fn => fn()); assert.equal(cursor.classList.contains('engine-pointer-lit'), false);
  const input = new Element(); input.editable = true;
  docEvents.get('pointermove')({ ...event, target: input }); assert.equal(cursor.hidden, true); assert.equal(root.classList.contains('engine-cursor-active'), false);
  docEvents.get('pointerdown')({ ...event, pointerType: 'touch' });
  assert.equal(cursor.hidden, true); const marker = body.children.find(node => node !== cursor);
  assert.ok(marker.classList.contains('engine-pointer-lit')); assert.equal(marker.attributes['aria-hidden'], 'true');
  [...timers.values()].forEach(fn => fn()); assert.equal(body.children.length, 1);
  button.disabled = true; docEvents.get('pointerdown')({ ...event, pointerType: 'touch' }); assert.equal(body.children.length, 1);
  button.disabled = false; const dialog = new Element(); button.dialog = dialog;
  docEvents.get('pointermove')(event); assert.equal(cursor.parentNode, dialog, 'Visible también sobre la galería ampliada');
  winEvents.get('blur')(); assert.equal(cursor.hidden, true); assert.equal(root.classList.contains('engine-cursor-active'), false);
  preload.onerror(); docEvents.get('pointermove')(event); assert.equal(cursor.hidden, true, 'Si falla la imagen mantiene el cursor normal');
});
