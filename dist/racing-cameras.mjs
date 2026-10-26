import {createCircuitLayout} from './circuit-layout.mjs?v=20261024-tour1';
export const RACE_VIEWS=['cockpit','chase','aerial'];
const norm=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function drivingCamera(race,view='chase',aspect=1.6){
 const layout=createCircuitLayout(race.difficulty,race.trackLength,race.circuit),f=layout.frame(race.distance),offset=race.x*race.settings.roadHalf,car=[f.p[0]+f.r[0]*offset,f.p[1],f.p[2]+f.r[2]*offset];
 const aerial=view==='aerial',back=aerial?11:Math.max(7.8,5.3/Math.max(.55,aspect)),lift=aerial?20:2.5,ahead=aerial?5:5;
 const position=[car[0]-f.t[0]*back,car[1]+lift,car[2]-f.t[2]*back],target=[car[0]+f.t[0]*ahead,car[1]+(aerial?0:.9),car[2]+f.t[2]*ahead];
 const forward=norm(target.map((v,i)=>v-position[i])),right=norm(cross(forward,[0,1,0])),up=norm(cross(right,forward));
 return {layout,car,position,target,forward,right,up,fov:aerial?48:54,view:aerial?'aerial':'chase'};
}
export function cameraProject(p,pose,width,height){const v=p.map((x,i)=>x-pose.position[i]),depth=dot(v,pose.forward);if(depth<.15)return null;const focal=height/(2*Math.tan(pose.fov*Math.PI/360));return {x:width/2+dot(v,pose.right)*focal/depth,y:height/2-dot(v,pose.up)*focal/depth,depth,scale:focal/depth};}
