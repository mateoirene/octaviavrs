// Personalización de la carrocería del Octavia; conserva cristales, cromados y ruedas.
export function paintedImage(image,paint){
 if(!image||paint==='blue')return image;
 const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const frame=ctx.getImageData(0,0,canvas.width,canvas.height),p=frame.data;
 for(let i=0;i<p.length;i+=4){const r=p[i],g=p[i+1],b=p[i+2];if(!p[i+3]||b<r*1.15||b<g*1.04)continue;const mask=Math.min(1,(b-r)/55),l=Math.max(r,g,b);let target;if(paint==='red')target=[b,Math.max(r*.65,g*.24),Math.max(r*.8,b*.10)];else{const value=paint==='white'?Math.min(255,l*1.13+15):l*.65;target=[value,value,value];}for(let k=0;k<3;k++)p[i+k]=p[i+k]*(1-mask)+target[k]*mask;}
 ctx.putImageData(frame,0,0);return canvas;
}
