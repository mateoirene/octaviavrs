// Respuesta visual compartida; no cambia ni retrasa la acción de los controles.
(() => {
  const selector = 'a[href],button,input:not([type="hidden"]),select,summary,[role="button"]';
  const motion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const flashTimers = new WeakMap();
  let pressed = null;

  function control(event) {
    const origin = event.target;
    const node = origin && origin.closest ? origin.closest(selector) : null;
    if (!node || node.disabled || node.getAttribute('aria-disabled') === 'true' || node.closest('[inert]')) return null;
    return node;
  }
  function release() {
    if (pressed) pressed.classList.remove('action-pressed');
    pressed = null;
  }
  function flash(node, className = 'action-flash', duration = 400) {
    const previous = flashTimers.get(node);
    if (previous) clearTimeout(previous);
    node.classList.add(className);
    flashTimers.set(node, setTimeout(() => {
      node.classList.remove(className);
      flashTimers.delete(node);
    }, duration));
  }
  function feedback(node, event) {
    flash(node);
    if (motion.matches) return;
    const bounds = node.getBoundingClientRect();
    const keyboard = (event.type === 'click' && event.detail === 0) || typeof event.clientX !== 'number';
    const pulse = document.createElement('span');
    pulse.className = 'action-ripple';
    pulse.setAttribute('aria-hidden', 'true');
    pulse.style.left = (keyboard ? bounds.left + bounds.width / 2 : event.clientX) + 'px';
    pulse.style.top = (keyboard ? bounds.top + bounds.height / 2 : event.clientY) + 'px';
    const layer = node.closest('dialog[open]') || document.body;
    layer.append(pulse);
    pulse.addEventListener('animationend', () => pulse.remove(), { once: true });
    setTimeout(() => pulse.remove(), 600);
  }

  document.addEventListener('pointerdown', event => {
    if (event.button !== undefined && event.button !== 0) return;
    release();
    const node = control(event);
    if (!node) return;
    pressed = node;
    node.classList.add('action-pressed');
    feedback(node, event);
  }, { capture: true, passive: true });
  document.addEventListener('click', event => {
    const node = control(event);
    if (node) {
      if (event.detail === 0 || !window.PointerEvent) feedback(node, event);
      const href = node.getAttribute('href');
      if (href && href.startsWith('#') && href.length > 1) {
        let destination;
        try { destination = document.getElementById(decodeURIComponent(href.slice(1))); } catch { destination = null; }
        if (destination) flash(destination, 'section-arrival', 900);
      }
    }
    release();
  }, { capture: true });
  document.addEventListener('change', event => {
    const node = control(event);
    if (node && node.tagName === 'SELECT') feedback(node, event);
  }, { capture: true });
  document.addEventListener('pointerup', release, { capture: true, passive: true });
  document.addEventListener('pointercancel', release, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') release(); });
  window.addEventListener('blur', release);
})();
