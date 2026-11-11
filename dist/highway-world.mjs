import * as T from './vendor/three.module.js';
import {createOctavia,rollVehicle} from './racing-vehicles3d.mjs?v=20261028-tesla-glb';
import {roadFrame,ROAD_HALF,TRAFFIC_LIMIT} from './highway-physics.mjs';
import {currentGraphicsProfile,bufferPixelRatio,createResolutionBudget} from './racing-render-budget.mjs?v=20261109-mobile';

export function createHighwayWorld(host){
 const profile=currentGraphicsProfile(),budget=createResolutionBudget(profile);
 const renderer=new T.WebGLRenderer({antialias:profile.antialias,powerPreference:'default'});
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
 renderer.setClearColor('#91b6cc');host.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','Autovía tridimensional del club');
 const scene=new T.Scene();scene.fog=new T.Fog('#91b6cc',210,560);
 scene.add(new T.HemisphereLight('#dfedff','#72704a',2.5));const sun=new T.DirectionalLight('#fff1ce',3);sun.position.set(-70,100,-80);scene.add(sun);
 const camera=new T.PerspectiveCamera(59,1,.12,800),target=new T.Vector3(),matrix=new T.Matrix4(),dummy=new T.Object3D();
 const materials=[],geometries=[],textures=[];
 const material=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.88,...extra});materials.push(m);return m;};
 const box=new T.BoxGeometry(1,1,1);geometries.push(box);
 function mesh(geo,mat){const m=new T.Mesh(geo,mat);scene.add(m);return m;}
 function instances(geo,mat,count){const m=new T.InstancedMesh(geo,mat,count);m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.frustumCulled=false;scene.add(m);return m;}
 function put(m,i,x,y,z,sx,sy,sz,angle=0){dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,angle,0);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);}
 // Original asphalt texture: a small deterministic canvas, no remote assets.
 const textureCanvas=document.createElement('canvas');textureCanvas.width=textureCanvas.height=128;const ctx=textureCanvas.getContext('2d'),pixels=ctx.createImageData(128,128);
 for(let i=0;i<pixels.data.length;i+=4){const c=48+((i*13^(i>>5))%15);pixels.data.set([c,c+2,c+3,255],i);}ctx.putImageData(pixels,0,0);
 const asphaltTexture=new T.CanvasTexture(textureCanvas);asphaltTexture.wrapS=asphaltTexture.wrapT=T.RepeatWrapping;asphaltTexture.colorSpace=T.SRGBColorSpace;textures.push(asphaltTexture);
 const strips=[];
 function strip(left,right,mat){const g=new T.BufferGeometry(),positions=new Float32Array(161*6),uv=new Float32Array(161*4),indices=[];for(let i=0;i<=160;i++){uv.set([0,i/2,1,i/2],i*4);if(i<160){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}}g.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(indices);geometries.push(g);const m=mesh(g,mat);m.frustumCulled=false;strips.push({g,left,right});}
 strip(-100,100,material('#788953'));strip(-8,8,material('#a69c86'));strip(-ROAD_HALF,ROAD_HALF,material('#aaaaaa',{map:asphaltTexture}));
 const markings=instances(box,material('#f6f2d5'),160),rails=instances(box,material('#aeb8b8',{metalness:.55}),160);
 const bodies=instances(box,material('#ffffff',{metalness:.35,roughness:.36}),TRAFFIC_LIMIT),cabins=instances(box,material('#233845',{metalness:.3,roughness:.2}),TRAFFIC_LIMIT),tails=instances(box,material('#ed3b2c',{emissive:'#8d1509'}),TRAFFIC_LIMIT*2);
 const wheelGeo=new T.CylinderGeometry(.33,.33,.22,8);wheelGeo.rotateZ(Math.PI/2);geometries.push(wheelGeo);const wheels=instances(wheelGeo,material('#171b20'),TRAFFIC_LIMIT*4);
 const shadowGeo=new T.PlaneGeometry(1,1);shadowGeo.rotateX(-Math.PI/2);geometries.push(shadowGeo);const shadows=instances(shadowGeo,new T.MeshBasicMaterial({color:'#17201c',transparent:true,opacity:.24,depthWrite:false}),TRAFFIC_LIMIT);materials.push(shadows.material);
 const treeGeo=new T.ConeGeometry(1,1,6);geometries.push(treeGeo);const trees=instances(treeGeo,material('#345c3c'),100),trunks=instances(box,material('#66513a'),100),buildings=instances(box,material('#d2c3a6'),18);
 const signs=instances(box,material('#196f65'),8),posts=instances(box,material('#acb8b5'),8);
 const signCanvas=document.createElement('canvas');signCanvas.width=512;signCanvas.height=160;const sc=signCanvas.getContext('2d');sc.fillStyle='#166c62';sc.fillRect(0,0,512,160);sc.strokeStyle='white';sc.lineWidth=6;sc.strokeRect(6,6,500,148);sc.fillStyle='white';sc.textAlign='center';sc.font='bold 32px sans-serif';sc.fillText('AUTOVÍA · CLUB VRS',256,60);sc.font='26px sans-serif';sc.fillText('↑  CONDUCCIÓN LIBRE  ↑',256,114);const signTexture=new T.CanvasTexture(signCanvas);signTexture.colorSpace=T.SRGBColorSpace;textures.push(signTexture);signs.material.map=signTexture;signs.material.needsUpdate=true;
 const player=createOctavia({paint:'blue'});scene.add(player);
 let width=1,height=1,disposed=false,lost=false,first=true,lastDistance=0,lastView='',lastTime=0,frames=0,frameStart=0;
 const onLost=e=>{e.preventDefault();lost=true;host.dataset.context='lost';host.dispatchEvent(new Event('highway-context-lost'));};
 const onRestore=()=>{lost=false;first=true;budget.reset();host.dataset.context='ready';host.dispatchEvent(new Event('highway-context-restored'));};
 renderer.domElement.addEventListener('webglcontextlost',onLost);renderer.domElement.addEventListener('webglcontextrestored',onRestore);
 function resize(){const b=host.getBoundingClientRect();width=Math.max(1,b.width);height=Math.max(1,b.height);renderer.setPixelRatio(bufferPixelRatio(profile,width,height,budget.quality,devicePixelRatio));renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
 function point(s,x=0,lift=0,origin){const f=roadFrame(s);return [f.x-origin.x+x*f.right[0],f.y+lift,-(s-origin.s)+x*f.right[1]];}
 function render(state,view='chase',now=performance.now()){
  if(disposed||lost)return;const origin=roadFrame(state.distance),base=Math.floor(state.distance/8)*8-48;
  for(const {g,left,right}of strips){const a=g.attributes.position.array;for(let i=0;i<=160;i++){const s=base+i*4;for(const [j,x]of [left,right].entries()){const p=point(s,x,left===-100?-.12:left===-8?-.045:0,origin);a.set(p,i*6+j*3);}}g.attributes.position.needsUpdate=true;g.computeVertexNormals();}
  for(let i=0;i<40;i++){const s=Math.floor(state.distance/16)*16-32+i*16,f=roadFrame(s);for(let j=0;j<4;j++){const x=[-5.2,-1.8,1.8,5.2][j],p=point(s,x,.025,origin);put(markings,i*4+j,...p,.12,.025,j===0||j===3?16:6,-f.heading);}}
  for(let i=0;i<80;i++){const s=base+i*8,f=roadFrame(s);for(let side=0;side<2;side++){const p=point(s,side?7.6:-7.6,.65,origin);put(rails,i*2+side,...p,.16,.48,8.1,-f.heading);}}
  for(let i=0;i<100;i++){const index=Math.floor(state.distance/22)-3+i,s=index*22,side=Math.abs(index%2)?1:-1,x=side*(14+Math.abs(Math.sin(index*7))*34),scale=3+Math.abs(Math.sin(index*3))*4,p=point(s,x,scale*.7,origin);put(trees,i,...p,scale,scale*1.6,scale);put(trunks,i,p[0],p[1]-scale*.7,p[2],.45,scale,.45);}
  for(let i=0;i<18;i++){const index=Math.floor(state.distance/90)-2+i,s=index*90,p=point(s,(Math.abs(index%2)?1:-1)*(65+18*Math.sin(index)),5,origin);put(buildings,i,...p,10,10+6*Math.sin(index)**2,16);}
  for(let i=0;i<8;i++){const s=(Math.floor(state.distance/160)-1+i)*160,p=point(s,9,5,origin);put(signs,i,...p,6,1.9,.15);put(posts,i,p[0],p[1]-2.5,p[2],.18,5,.18);}
  const count=state.traffic.length;bodies.count=cabins.count=shadows.count=count;tails.count=count*2;wheels.count=count*4;
  state.traffic.forEach((car,i)=>{const f=roadFrame(car.distance),p=point(car.distance,car.x,0,origin),angle=-f.heading,modelHeight=car.id%4===0?1.9:1.2;put(bodies,i,p[0],p[1]+.66,p[2],1.82,modelHeight,4.7,angle);put(cabins,i,p[0],p[1]+1.35,p[2]-.1,1.5,.65,2.4,angle);bodies.setColorAt(i,new T.Color(['#d8d6cc','#257eae','#a92e32','#c1a371','#59646c'][car.id%5]));put(shadows,i,p[0],p[1]+.015,p[2],2.1,1,5,angle);for(let j=0;j<4;j++){const side=j%2?1:-1,z=j<2?-1.45:1.45,x=p[0]+Math.cos(angle)*side*.87+Math.sin(angle)*z,zz=p[2]-Math.sin(angle)*side*.87+Math.cos(angle)*z;put(wheels,i*4+j,x,p[1]+.34,zz,1,1,1,angle);}for(let j=0;j<2;j++)put(tails,i*2+j,p[0]+(j?1:-1)*.64,p[1]+.9,p[2]+2.37,.35,.16,.06,angle);});
  if(bodies.instanceColor)bodies.instanceColor.needsUpdate=true;
  for(const m of [markings,rails,bodies,cabins,tails,wheels,trees,trunks,buildings,signs,posts,shadows])m.instanceMatrix.needsUpdate=true;
  const p=point(state.distance,state.x,0,origin);player.position.set(...p);player.rotation.y=-origin.heading-state.steering*.035;player.visible=view==='chase';rollVehicle(player,Math.max(0,state.distance-lastDistance),state.steering);lastDistance=state.distance;
  const back=view==='chase'?9:view==='bonnet'?1:-.45,lift=view==='chase'?3.5:view==='bonnet'?1.7:1.22;
  const desired=new T.Vector3(p[0]-origin.dx*back,p[1]+lift,p[2]+back),look=point(state.distance+35,state.x,.9,origin),dt=Math.min(.1,(now-lastTime)/1000||1/60);lastTime=now;
  if(first||lastView!==view){camera.position.copy(desired);target.set(...look);first=false;}else{const alpha=1-Math.exp(-dt*9);camera.position.lerp(desired,alpha);target.lerp(new T.Vector3(...look),alpha);}
  lastView=view;camera.lookAt(target);camera.fov=59+state.speed/MAX_SPEED_FOR_FOV*8;camera.updateProjectionMatrix();renderer.render(scene,camera);
  const sample=budget.sample(now,state.phase==='running');if(sample?.changed)resize();
  frames++;if(now-frameStart>1000){host.dataset.fps=String(Math.round(frames*1000/(now-frameStart)));frames=0;frameStart=now;}
  host.dataset.drawCalls=String(renderer.info.render.calls);host.dataset.triangles=String(renderer.info.render.triangles);host.dataset.quality=budget.quality.toFixed(2);host.dataset.renderer='webgl2';
 }
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 return {render,resize,get ready(){return !lost&&!disposed;},canvas:renderer.domElement,dispose(){if(disposed)return;disposed=true;observer.disconnect();renderer.domElement.removeEventListener('webglcontextlost',onLost);renderer.domElement.removeEventListener('webglcontextrestored',onRestore);const gs=new Set(geometries),ms=new Set(materials);player.traverse(m=>{if(m.geometry)gs.add(m.geometry);for(const mat of (Array.isArray(m.material)?m.material:[m.material]).filter(Boolean))ms.add(mat);});player.userData.disposeMaterials?.();for(const g of gs)g.dispose();for(const m of ms){m.map?.dispose();m.dispose();}for(const t of textures)t.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
}
const MAX_SPEED_FOR_FOV=230/3.6;
