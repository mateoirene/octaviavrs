const width = 1280;
const height = 840;

function rounded(ctx, x, y, w, h, radius, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function metal(ctx, top, bottom, colors) {
  const fill = ctx.createLinearGradient(0, top, 0, bottom);
  colors.forEach((color, index) => fill.addColorStop(index / (colors.length - 1), color));
  return fill;
}

function lettering(ctx, value, x, y, size, color, maxWidth) {
  ctx.font = 'bold ' + size + 'px Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#08090b';
  ctx.fillText(value, x + 2, y + 4, maxWidth);
  ctx.fillStyle = color;
  ctx.fillText(value, x, y, maxWidth);
}

async function render(pilot, number) {
  const flag = new Image();
  flag.src = new URL('assets/bandera-club-octavia-transparente.png', import.meta.url).href;
  await flag.decode();

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Lienzo no disponible');

  ctx.fillStyle = metal(ctx, 0, height, ['#35363a', '#15161a']);
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.shadowColor = '#000d';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 17;
  rounded(ctx, 47, 77, 1186, 685, 45, '#16181b');
  ctx.restore();
  rounded(ctx, 49, 76, 1182, 670, 45, metal(ctx, 76, 746, ['#f4f5f7', '#85898e', '#3b3d42', '#ced0d2', '#64686e']));
  rounded(ctx, 58, 83, 1164, 653, 39, metal(ctx, 83, 736, ['#34363a', '#202125', '#151619']));
  rounded(ctx, 68, 92, 1144, 635, 34, metal(ctx, 92, 727, ['#303236', '#1b1c20', '#151619']), '#9f2432');

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(70, 94, 1140, 631, 32);
  ctx.clip();
  for (let y = 96; y < 725; y += 3) {
    ctx.fillStyle = y % 2 ? '#ffffff05' : '#00000012';
    ctx.fillRect(70, y, 1140, 1);
  }
  ctx.restore();

  ctx.fillStyle = '#ef4052';
  ctx.fillRect(119, 309, 1041, 3);
  lettering(ctx, 'CLUB OCTAVIA VRS', 119, 185, 63, '#f6f7f8', 1030);
  lettering(ctx, 'CATALUNYA', 121, 249, 34, '#ff8896', 1040);
  lettering(ctx, 'CARNET DE SOCIO', 121, 378, 28, '#ff8896', 566);
  lettering(ctx, pilot, 119, 451, 60, '#f6f7f8', 588);

  const scale = Math.min(445 / flag.naturalWidth, 330 / flag.naturalHeight);
  const flagWidth = flag.naturalWidth * scale;
  const flagHeight = flag.naturalHeight * scale;
  ctx.drawImage(flag, 728 + (445 - flagWidth) / 2, 340 + (330 - flagHeight) / 2, flagWidth, flagHeight);

  ctx.save();
  ctx.shadowColor = '#000c';
  ctx.shadowBlur = 9;
  ctx.shadowOffsetY = 7;
  rounded(ctx, 119, 546, 348, 110, 16, '#72777f');
  ctx.restore();
  rounded(ctx, 119, 543, 348, 108, 16, metal(ctx, 543, 651, ['#f3f4f5', '#a5aab0', '#d6d8da']), '#eff0f1');
  ctx.font = 'bold 54px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1a1b1e';
  ctx.fillText(number, 293, 599, 310);
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
  link.download = 'Carnet-' + filename + '.png';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
