import {roadFrame} from './highway-physics.mjs';

export function terrainHeight(s,x){const f=roadFrame(s);return f.y+(f.bank||0)*Math.max(-20,Math.min(20,x))-.8+Math.max(0,Math.abs(x)-24)*(.09+.055*Math.sin(s/89+x/50))+Math.max(0,Math.abs(x)-24)/12*Math.sin(s/34+x/18);}
export function roadPoint(s,x=0,lift=0,origin=roadFrame(0)){const f=roadFrame(s);return [f.x-origin.x+x*f.right[0],f.y+lift+(f.bank||0)*x,-(s-origin.s)+x*f.right[1]];}
export function bridgeColumn(bridgeDistance,s,x,origin){const ground=terrainHeight(s,x),top=roadFrame(bridgeDistance).y+5.65,p=roadPoint(s,x,0,origin);p[1]=(ground+top)/2;return {position:p,height:top-ground,ground,top};}
export function insideTunnel(s){const d=(s%1600+1600)%1600;return d>=890&&d<=1054;}

// One continuous shell, including inner/outer faces and portal end caps: no overlapping cylinder seams.
export function tunnelShell(start,origin){
 const rings=37,arcSteps=24,profile=arcSteps+3,stride=profile*2,positions=new Float32Array(rings*stride*3),uv=new Float32Array(rings*stride*2),indices=[];
 for(let i=0;i<rings;i++)for(let side=0;side<2;side++)for(let j=0;j<profile;j++){
  const radius=side?9.1:8.5,angle=Math.max(0,Math.min(arcSteps,j-1))/arcSteps*Math.PI,x=radius*Math.cos(angle),lift=j===0||j===profile-1?-.9:radius*Math.sin(angle)+.1,k=i*stride+side*profile+j;
  positions.set(roadPoint(start+i*4,x,lift,origin),k*3);uv.set([j/4,i/2],k*2);
  if(i<rings-1&&j<profile-1){const a=k,b=k+1,c=k+stride,d=c+1;indices.push(a,b,c,b,d,c);}
 }
 for(const ring of [0,rings-1])for(let j=0;j<profile-1;j++){const a=ring*stride+j,b=a+1,c=a+profile,d=c+1;indices.push(a,c,b,b,c,d);}
 return {positions,uv,indices:new Uint16Array(indices),rings,stride};
}
