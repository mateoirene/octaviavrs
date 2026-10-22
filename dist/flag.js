// La bandera arranca sin depender de módulos, de la galería ni de otras secciones.
(() => {
  const art = document.querySelector('.hero-art');
  if (!art) return;
  const picture = art.querySelector('img');
  const canvas = art.querySelector('canvas');
  if (!picture || !canvas) return;
  let context;
  try { context = canvas.getContext('2d'); } catch { return; }
  if (!context) return;
  const motion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  let ready = false;
  let failed = false;
  let inView = true;
  let frame = 0;
  let lastPaint = -Infinity;
  let width = 0;
  let height = 0;

  function fallback() {
    failed = true;
    art.classList.remove('flag-ready');
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  function paint(seconds) {
    if (!width || !height || !picture.naturalWidth || !picture.naturalHeight) return;
    try {
      const scale = Math.min(width / picture.naturalWidth, height / picture.naturalHeight) * 0.96;
      const imageWidth = picture.naturalWidth * scale;
      const imageHeight = picture.naturalHeight * scale;
      const left = (width - imageWidth) / 2;
      const top = (height - imageHeight) / 2;
      const strips = 80;
      const sourceStrip = picture.naturalWidth / strips;
      const strip = imageWidth / strips;
      context.clearRect(0, 0, width, height);
      for (let i = 0; i < strips; i++) {
        const position = i / (strips - 1);
        const phase = position * Math.PI * 3.4 - seconds * 2.2;
        const strength = position * position;
        const wave = Math.sin(phase) + 0.22 * Math.sin(phase * 1.9 - seconds * 0.7);
        const offset = wave * Math.min(15, imageHeight * 0.024) * strength;
        const stretched = imageHeight * (1 + Math.cos(phase) * 0.016 * strength);
        const x = left + i * strip;
        const y = top + offset - (stretched - imageHeight) / 2;
        context.drawImage(picture, i * sourceStrip, 0, sourceStrip, picture.naturalHeight, x, y, strip + 0.6, stretched);
        context.fillStyle = 'rgba(0,0,0,' + ((Math.cos(phase) + 1) * 0.065 * strength) + ')';
        context.fillRect(x, y, strip + 0.6, stretched);
      }
      art.classList.add('flag-ready');
    } catch { fallback(); }
  }

  function allowed() {
    return ready && !failed && width > 0 && height > 0 && inView && !motion.matches && document.visibilityState !== 'hidden';
  }
  function tick(now) {
    frame = 0;
    if (!allowed()) return;
    if (now - lastPaint >= 1000 / 30) {
      paint(now / 1000);
      lastPaint = now;
    }
    if (allowed()) frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (motion.matches) art.classList.remove('flag-ready');
    if (!allowed()) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    } else if (!frame) frame = requestAnimationFrame(tick);
  }
  function resize() {
    const bounds = art.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    if (!width || !height) {
      art.classList.remove('flag-ready');
      sync();
      return;
    }
    try {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (ready && !failed && !motion.matches) paint(performance.now() / 1000);
      sync();
    } catch { fallback(); }
  }
  function start() {
    if (ready || !picture.naturalWidth || !picture.naturalHeight) return;
    ready = true;
    resize();
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(art);
  else window.addEventListener('resize', resize);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      sync();
    }).observe(art);
  }
  document.addEventListener('visibilitychange', sync);
  if (motion.addEventListener) motion.addEventListener('change', sync);
  else if (motion.addListener) motion.addListener(sync);
  canvas.addEventListener('contextlost', fallback);
  canvas.addEventListener('contextrestored', () => { failed = false; resize(); });
  picture.addEventListener('load', start, { once: true });
  if (picture.complete) start();
})();
