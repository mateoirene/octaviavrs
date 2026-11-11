import * as T from './vendor/three.module.js';
// Original distance mesh, under 600 triangles. Full vehicles remain close to
// the player; simulation and collision dimensions never depend on this LOD.
export function createTrafficDistanceTemplate(){
 const paint=new T.MeshStandardMaterial({color:'#ffffff',metalness:.55,roughness:.3});paint.userData.paint=true;
 const glass=new T.MeshStandardMaterial({color:'#27343c',metalness:.3,roughness:.2});
 const rubber=new T.MeshStandardMaterial({color:'#171a1c',roughness:.9});
 const rear=new T.MeshStandardMaterial({color:'#ad1528',emissive:'#bd1829',emissiveIntensity:.5});
 const front=new T.MeshStandardMaterial({color:'#e6e9de',emissive:'#d9e4e6',emissiveIntensity:.4});
 function loft(rings){
  const p=[],indices=[],profile=[[-.8,0],[.8,0],[1,.2],[1,.8],[.8,1],[-.8,1],[-1,.8],[-1,.2]];
  for(const [z,w,low,high]of rings)for(const [x,y]of profile)p.push(x*w,low+(high-low)*y,z);
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<8;j++){const a=i*8+j,b=i*8+(j+1)%8;indices.push(a,b,a+8,b,b+8,a+8);}
  for(let j=1;j<7;j++){indices.push(0,j+1,j);const n=(rings.length-1)*8;indices.push(n,n+j,n+j+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(indices);g.computeVertexNormals();return g;
 }
 const body=[{geometry:loft([[-2.35,.72,.25,.6],[-1.9,.9,.25,.78],[1.8,.9,.25,.82],[2.35,.72,.3,.7]]),material:paint},
 {geometry:loft([[-1.1,.74,.76,.86],[-.55,.65,.76,1.4],[.55,.65,.76,1.42],[1.4,.73,.76,.91]]),material:glass}];
 const add=(x,y,z,w,h,d,material)=>{const g=new T.BoxGeometry(w,h,d);g.translate(x,y,z);body.push({geometry:g,material});};
 add(0,1.42,0,1.31,.025,1.1,paint);
 for(const side of [-1,1]){add(side*.59,.67,2.354,.28,.055,.025,rear);add(side*.59,.57,-2.354,.3,.045,.025,front);}
 const wheel=new T.CylinderGeometry(.31,.31,.2,8);wheel.rotateZ(Math.PI/2);
 return {type:2,source:'Original distance LOD',body,interior:[],wheels:Array.from({length:4},()=>[{geometry:wheel,material:rubber}]),wheelCenters:[new T.Vector3(-.81,.31,-1.37),new T.Vector3(.81,.31,-1.37),new T.Vector3(-.81,.31,1.37),new T.Vector3(.81,.31,1.37)]};
}
