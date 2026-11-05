// Generated photographic recreations, not original photographs or factory CAD.
export const TESLA_IMAGE_ATLASES={low:'assets/tesla-photo/angles-low.png',high:'assets/tesla-photo/angles-high.png'};
export const TESLA_VIEW_NAMES=['rear','rear-left','left','front-left','front','front-right','right','rear-right'];
const TAU=Math.PI*2,STEP=TAU/8;
export const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function teslaImageView(x,y,z,previous=null){
 const distance=Math.max(.001,Math.hypot(x,z)),angle=(Math.atan2(-x,z)+TAU)%TAU,elevation=Math.atan2(y-.72,distance);
 let index=Math.round(angle/STEP)%8;
 if(previous&&Math.abs(wrapAngle(angle-previous.index*STEP))<STEP/2+.065)index=previous.index;
 const threshold=previous?.level==='high'?.48:.67,level=elevation>threshold?'high':'low';
 return {index,level,key:level+':'+TESLA_VIEW_NAMES[index],angle,elevation};
}
export function teslaImageWidth(index){const angle=index*STEP;return 4.72*Math.abs(Math.sin(angle))+2.089*Math.abs(Math.cos(angle));}
// Derive heading from the path INCLUDING lateral lane changes. No changes to physics.
export function vehicleMotionFrame(layout,distance,lane,roadHalf,previous=null){
 const current=layout.frame(distance),sample=layout.frame(distance-1.2),offset=lane*roadHalf;
 const p=current.p.map((v,i)=>v+(current.r[i]||0)*offset);
 let t=[...current.t];
 if(previous){const travelled=distance-previous.distance;if(travelled>.002&&travelled<12){const dx=p[0]-previous.p[0],dz=p[2]-previous.p[2],raw=Math.atan2(dx,dz),base=Math.atan2(current.t[0],current.t[2]);const heading=base+Math.max(-.16,Math.min(.16,wrapAngle(raw-base)));const a=1-Math.exp(-travelled/1.8),yaw=previous.yaw+wrapAngle(heading-previous.yaw)*a;t=[Math.sin(yaw),current.t[1],Math.cos(yaw)];}}
 const n=Math.hypot(...t)||1;t=t.map(v=>v/n);const r=[-t[2],0,t[0]],rn=Math.hypot(...r)||1;for(let i=0;i<3;i++)r[i]/=rn;
 const yaw=Math.atan2(t[0],t[2]),curve=wrapAngle(Math.atan2(current.t[0],current.t[2])-Math.atan2(sample.t[0],sample.t[2]))/1.2;
 return {p,t,r,yaw,curve,distance};
}
