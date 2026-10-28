// Sombras de contacto compartidas por los motores 2D y 3D. La capa suave
// representa el volumen del coche y las cuatro zonas densas fijan las ruedas
// al asfalto sin crear un halo negro separado de la carrocería.
function ellipse(ctx,x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}

export function drawRearContactShadow(ctx,x,y,width,height=width*.62){
 ctx.save();
 ellipse(ctx,x,y-height*.025,width*.62,height*.13,'rgba(0,0,0,.20)');
 ellipse(ctx,x-width*.34,y-height*.035,width*.14,height*.052,'rgba(0,0,0,.42)');
 ellipse(ctx,x+width*.34,y-height*.035,width*.14,height*.052,'rgba(0,0,0,.42)');
 ctx.restore();
}

export function drawSideContactShadow(ctx,x,y,width,height=width*.34){
 ctx.save();
 ellipse(ctx,x,y-height*.018,width*.48,height*.12,'rgba(0,0,0,.22)');
 ellipse(ctx,x-width*.31,y-height*.025,width*.115,height*.055,'rgba(0,0,0,.46)');
 ellipse(ctx,x+width*.31,y-height*.025,width*.115,height*.055,'rgba(0,0,0,.46)');
 ctx.restore();
}

export function drawAerialContactShadow(ctx,width,length){
 ctx.save();
 ellipse(ctx,0,0,width*.48,length*.47,'rgba(0,0,0,.18)');
 for(const side of [-1,1])for(const axle of [-1,1])ellipse(ctx,side*width*.36,axle*length*.29,width*.105,length*.115,'rgba(0,0,0,.36)');
 ctx.restore();
}

export function paintGroundContactTexture(canvas){
 canvas.width=256;canvas.height=512;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.translate(canvas.width/2,canvas.height/2);drawAerialContactShadow(ctx,222,470);ctx.restore();return canvas;
}
