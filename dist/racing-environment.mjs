// Escenario compartido por las cámaras 3D y la cartografía compatible.
// Todas las posiciones se calculan en metros sobre el trazado físico elegido.
export function environmentRandom(seed=1){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function groundVariation(x,z){return Math.sin(x*.014+Math.cos(z*.009))* .045+Math.sin(z*.037+x*.011)*.025+Math.cos(x*.081-z*.065)*.012;}
export function createCircuitEnvironment(layout,half,circuit='club'){
 let seed=2166136261;for(const c of circuit)seed=Math.imul(seed^c.charCodeAt(0),16777619);const random=environmentRandom(seed),samples=[];let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
 for(let s=0;s<layout.length;s+=8){const p=layout.position(s);samples.push(p);minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);minZ=Math.min(minZ,p[2]);maxZ=Math.max(maxZ,p[2]);}
 function nearest(x,z){let distance=Infinity,point;for(const p of samples){const d=(x-p[0])**2+(z-p[2])**2;if(d<distance){distance=d;point=p;}}return {distance:Math.sqrt(distance),point};}
 function place(s,offset){const {p,r,t}=layout.frame(s),x=p[0]+r[0]*offset,z=p[2]+r[2]*offset,near=nearest(x,z),y=(circuit==='club'?near.point[1]:0)-.85-Math.min(9,Math.max(0,near.distance-half-26)*.045);return {p:[x,y,z],yaw:Math.atan2(-t[0],-t[2])};}
 const trees=[],buildings=[],parking=[],gravel=[];
 for(let i=0;i<520;i++){const x=minX-100+random()*(maxX-minX+200),z=minZ-100+random()*(maxZ-minZ+200),near=nearest(x,z),radius=3+random()*3.5;if(near.distance<half+24+radius||near.distance>190)continue;const y=circuit==='club'?near.point[1]-.85-Math.min(9,Math.max(0,near.distance-half-26)*.045):-.85-Math.min(9,Math.max(0,near.distance-half-26)*.045);trees.push({p:[x,y,z],radius,height:7+random()*6,tone:random()});}
 // Rectangular footprints are conservatively tested with their bounding radius.
 for(let s=25;s<Math.min(layout.length*.23,750);s+=68){const b=place(s,-half-63),size=[26,8+random()*5,42],radius=Math.hypot(size[0],size[2])/2;if(nearest(b.p[0],b.p[2]).distance>half+radius+7){b.size=size;buildings.push(b);const carpark={...place(s,-half-100),size:[24,.06,44]};if(nearest(carpark.p[0],carpark.p[2]).distance>half+Math.hypot(24,44)/2+7)parking.push(carpark);}}
 for(let s=0;s<layout.length;s+=50){if(Math.abs(layout.curvature(s))<.0023)continue;const side=layout.curvature(s)>0?-1:1,b=place(s,side*(half+12));let safe=nearest(b.p[0],b.p[2]).distance>half+7;for(let d=s;d<=Math.min(s+35,layout.length);d+=3){const f=layout.frame(d);for(const offset of [half+3,half+19])if(nearest(f.p[0]+f.r[0]*side*offset,f.p[2]+f.r[2]*side*offset).distance<offset-1)safe=false;}if(safe)gravel.push({from:s,to:Math.min(s+35,layout.length),side});}
 const occupied=buildings.concat(parking);const clearTrees=trees.filter(tree=>!occupied.some(b=>Math.hypot(tree.p[0]-b.p[0],tree.p[2]-b.p[2])<Math.hypot(b.size[0],b.size[2])/2+tree.radius));
 return {trees:clearTrees,buildings,parking,gravel,bounds:{minX,maxX,minZ,maxZ}};
}
