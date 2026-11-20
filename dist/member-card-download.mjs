function engrave(ctx, value, x, y, size, maxWidth, {center = false, raised = true} = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.transform(1, -0.054, 0.08, 1, 0, 0);
  ctx.textAlign = center ? 'center' : 'left';
  ctx.textBaseline = 'middle';
  do {
    ctx.font = 'bold ' + size + 'px Arial, sans-serif';
    if (ctx.measureText(value).width <= maxWidth) break;
    size -= 1;
  } while (size > 12);
  ctx.fillStyle = raised ? '#030304' : '#f1f1f0';
  ctx.fillText(value, 1, raised ? 5 : 2, maxWidth);
  if (raised) {
    ctx.fillStyle = '#787a7c';
    ctx.fillText(value, 1, 2, maxWidth);
  }
  ctx.fillStyle = raised ? '#f2f2f2' : '#141414';
  ctx.fillText(value, 0, 0, maxWidth);
  ctx.restore();
}

async function render(pilot, number) {
  const template = new Image();
  template.src = new URL('assets/member-card-template.jpg', import.meta.url).href;
  const reverse = new Image();
  reverse.src = new URL('assets/member-card-reverse.png', import.meta.url).href;
  await Promise.all([template.decode(), reverse.decode()]);

  const canvas = document.createElement('canvas');
  canvas.width = template.naturalWidth;
  const reverseHeight = Math.round(canvas.width * reverse.naturalHeight / reverse.naturalWidth);
  const gap = 38;
  canvas.height = template.naturalHeight + gap + reverseHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Lienzo no disponible');

  ctx.fillStyle = '#111216';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(template, 0, 0);
  engrave(ctx, pilot, 269, 527, 77, 464);
  engrave(ctx, number, 510, 682, 76, 334, {center: true, raised: false});
  const scale = canvas.width / reverse.naturalWidth;
  ctx.save();
  ctx.translate(0, template.naturalHeight + gap);
  ctx.scale(scale, scale);
  ctx.drawImage(reverse, 0, 0);
  ctx.font = 'bold 37px Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f5f5f6';
  ctx.fillText(pilot, 38, 198, 300);
  ctx.font = 'bold 27px Arial, sans-serif';
  ctx.fillStyle = '#17181b';
  ctx.fillText(number, 55, 286, 147);
  ctx.restore();
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG no disponible')), 'image/png');
  });
}

export async function downloadMemberCard(pilot, number) {
  const blob = await render(pilot, number);
  const url = URL.createObjectURL(blob);
  const filename = [number, pilot].join('-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-]+/g, '-').replace(/-+/g, '-');
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Carnet-' + filename + '-frontal-y-reverso.png';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
