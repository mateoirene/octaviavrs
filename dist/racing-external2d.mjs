import {drivingCamera,cameraProject} from './racing-cameras.mjs?v=20261026-vistas';
import {createCircuitEnvironment} from './racing-environment.mjs?v=20261025-aerial';
import {teslaFireTime} from './racing-cinematic-state.mjs';
import {drawCarFire} from './racing-fire2d.mjs';
const environments=new Map(),images={};
if(typeof Image!=='undefined')for(const [key,path]of [['grass','assets/cesped-circuito.jpg'],['asphalt','assets/track3d/asphalt-color.jpg']]){const image=new Image();image.onload=()=>images[key]=image;image.src=path;}
export function drawExternalFallback(ctx,race,width,height,view,photos){
 const pose=drivingCamera(race,view,width/height),layout=pose.layout,project=p=>cameraProject(p,pose,width,height),half=race.settings.roadHalf;
 const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#8dabbc');sky.addColorStop(.43,'#dae0de');sky.addColorStop(.44,'#5d7050');sky.addColorStop(1,'#38472f');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
 const faces=[];function face(points,color,texture){const p=points.map(project);if(p.some(v=>!v))return;faces.push({p,color,texture,depth:p.reduce((a,b)=>a+b.depth,0)/p.length});}
 function ribbon(d1,d2,a,b,color,texture){const f=layout.frame(d1),g=layout.frame(d2);face([[f.p[0]+f.r[0]*a,f.p[1]+.02,f.p[2]+f.r[2]*a],[f.p[0]+f.r[0]*b,f.p[1]+.02,f.p[2]+f.r[2]*b],[g.p[0]+g.r[0]*b,g.p[1]+.02,g.p[2]+g.r[2]*b],[g.p[0]+g.r[0]*a,g.p[1]+.02,g.p[2]+g.r[2]*a]],color,texture);}
 // Nearby fragments of the same closed layout, including neighbouring bends.
 for(let d=0;d<layout.length;d+=6){const p=layout.position(d);if(Math.hypot(p[0]-pose.car[0],p[2]-pose.car[2])>420)continue;ribbon(d,d+6,-half-2,half+2,'#a59b84');ribbon(d,d+6,-half,half,'#44494a','asphalt');for(const side of [-1,1]){ribbon(d,d+6,side*half,side*(half+.65),Math.floor(d/6)%2?'#c4c5ba':'#8e3b35');ribbon(d,d+6,side*(half-.20),side*(half-.12),'#d9dbcf');}if(d%18<6)ribbon(d,d+5,-.06,.06,'#d4d6cc');}
 faces.sort((a,b)=>b.depth-a.depth);for(const f of faces){ctx.beginPath();f.p.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=f.color;ctx.fill();if(f.texture&&images[f.texture]){ctx.save();ctx.clip();ctx.globalAlpha=.18;ctx.fillStyle=ctx.createPattern(images[f.texture],'repeat');ctx.fillRect(0,0,width,height);ctx.restore();}}
 const key=race.circuit+':'+race.difficulty;let env=environments.get(key);if(!env){env=createCircuitEnvironment(layout,half,race.circuit||'club');environments.set(key,env);if(environments.size>3)environments.delete(environments.keys().next().value);}
 const objects=[];for(const tree of env.trees){const p=project(tree.p);if(p&&p.depth<300)objects.push({p,tree});}
 const cars=[{distance:race.distance,x:race.x,player:true,color:race.playerPaint},...race.rivals];for(const car of cars){const f=layout.frame(car.distance),point=[f.p[0]+f.r[0]*car.x*half,f.p[1]+.02,f.p[2]+f.r[2]*car.x*half],p=project(point);if(p&&p.depth<360)objects.push({p,car});}
 objects.sort((a,b)=>b.p.depth-a.p.depth);for(const o of objects){const {p}=o;if(o.tree){const r=o.tree.radius*p.scale,h=o.tree.height*p.scale;ctx.fillStyle='#16251c';ctx.fillRect(p.x-r*.12,p.y-h*.55,r*.24,h*.55);const g=ctx.createRadialGradient(p.x-r*.3,p.y-h,.3,p.x,p.y-h,r);g.addColorStop(0,'#7b8b60');g.addColorStop(1,'#31482c');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(p.x,p.y-h*.75,r,h*.45,0,0,Math.PI*2);ctx.fill();continue;}
 const car=o.car,w=Math.max(1,p.scale*2.0),image=car.player?photos.playerRear:car.model==='tesla-model-3'?photos.tesla:photos.rival;ctx.fillStyle='#0006';ctx.beginPath();ctx.ellipse(p.x,p.y,w*.6,w*.18,0,0,Math.PI*2);ctx.fill();if(image){const h=w*image.height/image.width;ctx.drawImage(image,p.x-w/2,p.y-h,w,h);}else{ctx.fillStyle=car.model==='tesla-model-3'?'#f3f1ec':'#1465a3';ctx.fillRect(p.x-w/2,p.y-w*.7,w,w*.7);}if(view==='aerial'){// Visible roof above the rear image in the high follow camera.
 const h=w*.55;ctx.fillStyle=car.model==='tesla-model-3'?'#e5e7e5':car.player?({red:'#a32a32',black:'#17191b',grey:'#6a6e70',white:'#e5e7e5'})[car.color]||'#2265a0':'#2265a0';ctx.beginPath();ctx.moveTo(p.x-w*.36,p.y-h*.7);ctx.lineTo(p.x-w*.29,p.y-h*1.9);ctx.lineTo(p.x+w*.29,p.y-h*1.9);ctx.lineTo(p.x+w*.36,p.y-h*.7);ctx.closePath();ctx.fill();ctx.fillStyle='#203039';ctx.fillRect(p.x-w*.24,p.y-h*1.65,w*.48,h*.35);}
 if(car.model==='tesla-model-3')drawCarFire(ctx,p.x,p.y,w,teslaFireTime(race));}
 return pose;
}
