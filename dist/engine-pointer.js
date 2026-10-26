// El navegador mueve el cursor nativo: ningún seguimiento del ratón por JavaScript.
(() => {
  const root = document.documentElement;
  const controls = 'a[href],button,input[type="button"],input[type="submit"],summary,[role="button"]';
  let timer;
  function clear() { clearTimeout(timer); root.classList.remove('engine-cursor-lit'); }
  document.addEventListener('pointerdown', event => {
    const node = event.target?.closest?.(controls);
    if (event.pointerType !== 'mouse' || event.button !== 0 || !node || node.disabled || node.getAttribute('aria-disabled') === 'true' || node.closest('[inert]')) return;
    clear(); root.classList.add('engine-cursor-lit');
    timer = setTimeout(clear, 350);
  }, { capture: true, passive: true });
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
})();
