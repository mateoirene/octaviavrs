// Centres measured on the actual lateral photographs, in source pixels.
export const SIDE_WHEELS={
 'tesla-model-3':[{x:351,y:593,radius:145},{x:1578,y:597,radius:144}],
 octavia:[{x:437,y:597,radius:143},{x:1617,y:600,radius:142}],
};
export function rollingAngle(distance,radius){return -(distance+8)/radius;}
export function photoWheelPose(wheel,trim,carLength){const scale=carLength/(trim.right-trim.left);return {x:(wheel.x-trim.left)/(trim.right-trim.left)-.5,y:.5-(wheel.y-trim.top)/(trim.bottom-trim.top),radius:wheel.radius*.84*scale,rollingRadius:wheel.radius*scale};}
export function drawSideWheels(ctx,image,model,left,top,width,distance){const config=SIDE_WHEELS[model]||SIDE_WHEELS.octavia;const scale=width/image.width,carLength=model==='tesla-model-3'?4.694:4.69;for(const wheel of config){const crop=wheel.radius*.84,r=crop*scale;ctx.save();ctx.translate(left+wheel.x*scale,top+wheel.y*scale);ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.clip();ctx.rotate(rollingAngle(distance,wheel.radius*carLength/(image.width*.97)));ctx.drawImage(image,wheel.x-crop,wheel.y-crop,crop*2,crop*2,-r,-r,r*2,r*2);ctx.restore();}}
