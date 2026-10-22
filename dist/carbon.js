// Carbono decorativo de toda la página. El contenido permanece inmóvil.
(() => {
  const backdrop = document.querySelector('.carbon-backdrop');
  if (!backdrop) return;
  const canvas = backdrop.querySelector('canvas');
  let context;
  try { context = canvas.getContext('2d'); } catch { return; }
  if (!context) return;
  const motion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const tile = new Image();
  const texture = document.createElement('canvas');
  const cell = document.createElement('canvas');
  let textureContext;
  let cellContext;
  try { textureContext = texture.getContext('2d'); cellContext = cell.getContext('2d'); } catch { return; }
  if (!textureContext || !cellContext) return;
  let ready = false;
  let failed = false;
  let frame = 0;
  let lastPaint = -Infinity;
  let width = 0;
  let height = 0;
  const margin = 96;

  function fallback() {
    failed = true;
    backdrop.classList.remove('carbon-ready');
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }
  function allowed() {
    return ready && !failed && width > 0 && height > 0 && !motion.matches && document.visibilityState !== 'hidden';
  }
  function paint(seconds) {
    if (!width || !height) return;
    try {
      context.clearRect(0, 0, width, height);
      const strips = 48;
      const strip = width / strips;
      for (let i = 0; i < strips; i++) {
        const x = i * strip;
        const phase = i / strips * Math.PI * 3.2 - seconds * .65;
        const wave = Math.sin(phase) + .22 * Math.sin(phase * 1.7 + seconds * .2);
        const offset = wave * Math.min(24, height * .03);
        const stretch = 1 + Math.cos(phase) * .028;
        context.drawImage(texture, margin + x + Math.sin(phase * .8) * 6, 0, strip + .7, texture.height, x, -margin + offset, strip + .7, texture.height * stretch);
        const light = (Math.cos(phase) + 1) / 2;
        context.fillStyle = 'rgba(0,0,0,' + (.08 + (1 - light) * .26) + ')';
        context.fillRect(x, 0, strip + .7, height);
        if (light > .55) {
          context.fillStyle = 'rgba(215,230,245,' + ((light - .55) * .12) + ')';
          context.fillRect(x, 0, strip + .7, height);
        }
      }
      backdrop.classList.add('carbon-ready');
    } catch { fallback(); }
  }
  function tick(now) {
    frame = 0;
    if (!allowed()) return;
    if (now - lastPaint >= 1000 / 20) {
      paint(now / 1000);
      lastPaint = now;
    }
    if (allowed()) frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (motion.matches) backdrop.classList.remove('carbon-ready');
    if (!allowed()) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    } else if (!frame) frame = requestAnimationFrame(tick);
  }
  function resize() {
    const bounds = backdrop.getBoundingClientRect();
    width = Math.ceil(bounds.width);
    height = Math.ceil(bounds.height);
    if (!ready || !width || !height) {
      backdrop.classList.remove('carbon-ready');
      sync();
      return;
    }
    try {
      canvas.width = width;
      canvas.height = height;
      texture.width = width + margin * 2;
      texture.height = height + margin * 2;
      const pattern = textureContext.createPattern(cell, 'repeat');
      if (!pattern) { fallback(); return; }
      textureContext.fillStyle = pattern;
      textureContext.fillRect(0, 0, texture.width, texture.height);
      if (!motion.matches && !failed) paint(performance.now() / 1000);
      sync();
    } catch { fallback(); }
  }
  tile.addEventListener('load', () => {
    try {
      cell.width = 160;
      cell.height = 160;
      cellContext.drawImage(tile, 0, 0, 160, 160);
      ready = true;
      resize();
    } catch { fallback(); }
  }, { once: true });
  tile.addEventListener('error', fallback, { once: true });
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(backdrop);
  else window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', sync);
  if (motion.addEventListener) motion.addEventListener('change', sync);
  else if (motion.addListener) motion.addListener(sync);
  canvas.addEventListener('contextlost', fallback);
  canvas.addEventListener('contextrestored', () => { failed = false; resize(); });
  const source = getComputedStyle(document.documentElement).getPropertyValue('--carbon-tile').trim();
  if (!source.startsWith('url(')) return;
  tile.src = source.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
})();
