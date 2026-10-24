// Centres measured on the actual lateral photographs, in source pixels.
export const SIDE_WHEELS={
 'tesla-model-3':[{x:352.73,y:579.51,radius:155.87},{x:1576.63,y:587.38,radius:154.67}],
 octavia:[{x:439.05,y:578.04,radius:159.69},{x:1610.95,y:580.64,radius:159.57}],
};
export function rollingAngle(distance,radius){return -(distance+8)/radius;}
export function photoWheelPose(wheel,trim,carLength){const scale=carLength/(trim.right-trim.left);return {x:(wheel.x-trim.left)/(trim.right-trim.left)-.5,y:.5-(wheel.y-trim.top)/(trim.bottom-trim.top),radius:wheel.radius*.84*scale,rollingRadius:wheel.radius*scale};}
export function drawSideWheels(ctx,image,model,left,top,width,distance){const config=SIDE_WHEELS[model]||SIDE_WHEELS.octavia;const scale=width/image.width,carLength=model==='tesla-model-3'?4.694:4.69;for(const wheel of config){const crop=wheel.radius*.84,r=crop*scale;ctx.save();ctx.translate(left+wheel.x*scale,top+wheel.y*scale);ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.clip();ctx.rotate(rollingAngle(distance,wheel.radius*carLength/(image.width*.97)));ctx.drawImage(image,wheel.x-crop,wheel.y-crop,crop*2,crop*2,-r,-r,r*2,r*2);ctx.restore();}}
