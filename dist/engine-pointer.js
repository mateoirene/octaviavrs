// Puntero decorativo: conserva el clic, el desplazamiento y los controles nativos.
(() => {
  const controls = 'a[href],button,input:not([type="hidden"]),select,summary,[role="button"]';
  const editable = 'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]),textarea,[contenteditable]:not([contenteditable="false"]),iframe';
  const fine = window.matchMedia('(any-hover: hover) and (any-pointer: fine)');
  const cursor = document.createElement('span');
  cursor.className = 'engine-pointer'; cursor.hidden = true; cursor.setAttribute('aria-hidden', 'true');
  document.body.append(cursor);
  let ready = false, frame = 0, x = 0, y = 0, litTimer;
  const markers = new Set();
  const preload = new Image();
  preload.onload = () => { ready = true; };
  preload.onerror = () => { ready = false; hide(); };
  preload.src = new URL('assets/puntero-start-engine.jpg', document.baseURI).href;
  if (preload.complete && preload.naturalWidth) ready = true;
  function hostFor(target) { return target?.closest?.('dialog[open]') || document.body; }
  function place(node, target) { const host = hostFor(target); if (node.parentNode !== host) host.append(node); }
  function hide() {
    cursor.hidden = true; document.documentElement.classList.remove('engine-cursor-active');
  }
  function move(event) {
    if (!ready || !fine.matches || event.pointerType !== 'mouse' || event.target?.closest?.(editable)) { hide(); return; }
    x = event.clientX; y = event.clientY;
    place(cursor, event.target); cursor.hidden = false;
    document.documentElement.classList.add('engine-cursor-active');
    if (!frame) frame = requestAnimationFrame(() => { cursor.style.transform = `translate3d(${x - 24}px,${y - 24}px,0)`; frame = 0; });
  }
  function illuminate(event, node) {
    if (!ready) return;
    if (event.pointerType === 'mouse' && fine.matches && !node.closest(editable)) {
      move(event); clearTimeout(litTimer); cursor.classList.add('engine-pointer-lit');
      litTimer = setTimeout(() => cursor.classList.remove('engine-pointer-lit'), 650);
    } else {
      hide();
      const bounds = node.getBoundingClientRect();
      const keyboard = event.type === 'click' && event.detail === 0;
      const marker = document.createElement('span'); marker.className = 'engine-pointer engine-pointer-tap engine-pointer-lit';
      marker.setAttribute('aria-hidden', 'true');
      const px = keyboard ? bounds.left + bounds.width / 2 : event.clientX;
      const py = keyboard ? bounds.top + bounds.height / 2 : event.clientY;
      marker.style.transform = `translate3d(${px - 24}px,${py - 24}px,0)`;
      place(marker, node); markers.add(marker);
      setTimeout(() => { marker.remove(); markers.delete(marker); }, 550);
    }
  }
  function control(event) {
    const node = event.target?.closest?.(controls);
    return node && !node.disabled && node.getAttribute('aria-disabled') !== 'true' && !node.closest('[inert]') ? node : null;
  }
  document.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerdown', event => {
    if (event.button !== undefined && event.button !== 0) return;
    const node = control(event); if (node) illuminate(event, node);
  }, { capture: true, passive: true });
  document.addEventListener('click', event => {
    if (event.detail !== 0) return;
    const node = control(event); if (node) illuminate(event, node);
  }, { capture: true, passive: true });
  document.addEventListener('pointerout', event => { if (!event.relatedTarget) hide(); }, { passive: true });
  document.addEventListener('keydown', hide, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hide(); for (const marker of markers) marker.remove(); markers.clear(); }
  });
  window.addEventListener('blur', hide);
  fine.addEventListener?.('change', hide);
})();
