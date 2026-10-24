import {CIRCUIT_BY_ID} from './racing-circuits.mjs?v=20261024-tour1';
// Trazado 3D cerrado, parametrizado en metros de recorrido. También lo usa la física.
const cache=new Map();
const controls={
 easy:[[0,0,0],[0,0,-180],[15,0,-340],[170,2,-440],[390,6,-420],[530,8,-230],[530,5,10],[400,2,220],[220,-1,300],[50,-1,275],[0,0,180]],
 intermediate:[[0,0,0],[0,0,-160],[-35,1,-270],[40,2,-390],[230,4,-450],[400,7,-360],[480,8,-190],[400,5,-60],[500,2,70],[350,0,240],[160,-2,290],[25,-1,220],[0,0,140]],
 expert:[[0,0,0],[0,0,-140],[-50,1,-240],[25,2,-330],[-25,3,-410],[140,4,-490],[330,7,-460],[470,9,-330],[380,7,-210],[490,4,-100],[410,2,30],[490,1,140],[320,-1,280],[180,-2,225],[75,-1,290],[0,0,170]],
};
const interpolate=(a,b,c,d,t)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
export function createCircuitLayout(level='easy',length=3600,circuit='club'){
 const key=level+':'+length+':'+circuit;if(cache.has(key))return cache.get(key);const points=CIRCUIT_BY_ID[circuit]?.points||controls[level]||controls.easy,n=points.length,count=2048,raw=[];let total=0;
 for(let i=0;i<=count;i++){const t=i/count*n,j=Math.floor(t)%n,f=t-Math.floor(t);const p=[0,1,2].map(k=>interpolate(points[(j+n-1)%n][k],points[j][k],points[(j+1)%n][k],points[(j+2)%n][k],f));if(i)total+=Math.hypot(...p.map((v,k)=>v-raw[i-1].p[k]));raw.push({p,s:total});}
 const scale=length/total;for(const row of raw){row.s*=scale;row.p=row.p.map(v=>v*scale);}
 function position(distance){const s=((distance%length)+length)%length;let a=0,b=count;while(b-a>1){const m=(a+b)>>1;if(raw[m].s<=s)a=m;else b=m;}const t=(s-raw[a].s)/(raw[b].s-raw[a].s||1);return raw[a].p.map((v,k)=>v+(raw[b].p[k]-v)*t);}
 function frame(distance){const p=position(distance),before=position(distance-1),after=position(distance+1),t=after.map((v,k)=>v-before[k]),size=Math.hypot(...t);for(let k=0;k<3;k++)t[k]/=size;const r=[-t[2],0,t[0]],rn=Math.hypot(r[0],r[2]);r[0]/=rn;r[2]/=rn;return {p,t,r};}
 function curvature(distance){const a=frame(distance-2).t,b=frame(distance+2).t;return Math.atan2(a[0]*b[2]-a[2]*b[0],a[0]*b[0]+a[2]*b[2])/4;}
 const result={length,position,frame,curvature};cache.set(key,result);return result;
}
