import * as T from './vendor/three.module.js';
import {HDRLoader} from './vendor/HDRLoader.js';
import {roadFrame,ROAD_HALF,TRAFFIC_LIMIT} from './highway-physics.mjs';
import {loadVehicleTemplates,createVehicleFleet} from './highway-vehicles.mjs';
import {currentGraphicsProfile,bufferPixelRatio,createResolutionBudget} from './racing-render-budget.mjs?v=20261109-mobile';
import {highwayGraphicsProfile,frameStatistics} from './highway-performance.mjs';
import {HIGHWAY_MODELS} from './highway-models.mjs';

export async function createHighwayWorld(host){
 const profile=highwayGraphicsProfile(),budget=createResolutionBudget(profile),renderer=new T.WebGLRenderer({antialias:!profile.mobile,powerPreference:'high-performance'});
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 host.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','Carretera, vehículos e interior tridimensionales');
 const scene=new T.Scene(),roadScene=new T.Group();scene.add(roadScene);scene.fog=new T.Fog('#a4b5b8',180,650);
 const hemi=new T.HemisphereLight('#dcecff','#68634c',1.6),sun=new T.DirectionalLight('#ffefdb',3);sun.position.set(-130,180,-150);scene.add(hemi,sun);
 const camera=new T.PerspectiveCamera(58,1,.08,1000),dummy=new T.Object3D(),target=new T.Vector3(),desired=new T.Vector3(),look=new T.Vector3();
 const geometries=new Set(),materials=new Set(),textures=new Set(),instances=[];
 let templates,resources,sky,environment,disposed=false,lost=false,first=true,width=1,height=1,timeOfDay='day',quality='auto',lastTime=0,lastDistance=0,anchor=null,frameCount=0,fpsAt=0,lastView='',cameraTransition=1,lastMeasured=0;
 const frameTimes=[];
 try{
  const data=await loadVehicleTemplates(profile);templates=data.templates;resources=data.resources;
  sky=await new HDRLoader().loadAsync('assets/track3d/sky.hdr');sky.mapping=T.EquirectangularReflectionMapping;const pmrem=new T.PMREMGenerator(renderer);environment=pmrem.fromEquirectangular(sky);pmrem.dispose();scene.environment=environment.texture;scene.background=sky;scene.backgroundBlurriness=.025;
 }catch(error){renderer.dispose();renderer.domElement.remove();throw error;}
 const fleet=createVehicleFleet(scene,templates,TRAFFIC_LIMIT+1);
 const loader=new T.TextureLoader(),maps=await Promise.all(['asphalt-color.jpg','asphalt-normal.jpg','asphalt-rough.jpg'].map(n=>loader.loadAsync('assets/track3d/'+n)));
 for(const [i,map]of maps.entries()){map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(i===0)map.colorSpace=T.SRGBColorSpace;textures.add(map);}
 const mat=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.9,...extra});materials.add(m);return m;};
 const box=new T.BoxGeometry(1,1,1);geometries.add(box);
 function batch(geometry,material,count,parent=roadScene){geometries.add(geometry);const m=new T.InstancedMesh(geometry,material,count);m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.frustumCulled=false;parent.add(m);instances.push(m);return m;}
 function put(m,i,p,size=[1,1,1],angle=0,pitch=0,roll=0){dummy.position.set(...p);dummy.rotation.set(pitch,angle,roll);dummy.scale.set(...size);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);}
 function canvasTexture(w,h,paint){const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;textures.add(texture);return texture;}
 const leafTexture=canvasTexture(256,384,(c,w,h)=>{c.fillStyle='#715c40';c.fillRect(123,180,10,204);let seed=5;for(let i=0;i<260;i++){seed=(seed*16807)%2147483647;const a=seed/2147483647*6.283,r=Math.sqrt((i%73)/73),x=128+Math.cos(a)*r*113,y=140+Math.sin(a)*r*133;c.fillStyle=['#304d30','#48663a','#5c7741','#72854a'][i%4];c.beginPath();c.ellipse(x,y,12+i%12,10+i%8,a,0,6.283);c.fill();}});
 const leafMat=mat('#d8e4b6',{map:leafTexture,alphaTest:.45,side:T.DoubleSide,roughness:1});
 const treeGeo=new T.PlaneGeometry(1,1),trees=batch(treeGeo,leafMat,160);
 const wallTexture=canvasTexture(256,256,(c,w,h)=>{c.fillStyle='#c3b6a2';c.fillRect(0,0,w,h);for(let y=18;y<h;y+=42)for(let x=10;x<w;x+=42){c.fillStyle='#ddd3c3';c.fillRect(x-3,y-3,27,31);c.fillStyle='#48636b';c.fillRect(x,y,21,25);c.fillStyle='#a6b8b9';c.fillRect(x+10,y,2,25);}});wallTexture.wrapS=wallTexture.wrapT=T.RepeatWrapping;
 const buildings=batch(box,mat('#d0c9b9',{map:wallTexture}),24),roofs=batch(new T.ConeGeometry(1,1,4),mat('#866957'),24);
 const signTexture=canvasTexture(512,192,(c,w,h)=>{c.fillStyle='#1b655e';c.fillRect(0,0,w,h);c.strokeStyle='#eef0df';c.lineWidth=6;c.strokeRect(8,8,w-16,h-16);c.fillStyle='#fff';c.textAlign='center';c.font='bold 34px sans-serif';c.fillText('AUTOVÍA · OCTAVIA VRS',w/2,66);c.font='29px sans-serif';c.fillText('↑  Club Catalunya   2 km',w/2,120);c.font='22px sans-serif';c.fillText('Conducción libre',w/2,157);});
 const signs=batch(box,mat('#ffffff',{map:signTexture}),6),posts=batch(box,mat('#8c9695',{metalness:.65}),166);
 const railShape=new T.Shape();railShape.moveTo(-.11,0);railShape.lineTo(-.16,.1);railShape.lineTo(-.1,.2);railShape.lineTo(-.16,.3);railShape.lineTo(-.11,.4);railShape.lineTo(.03,.4);railShape.lineTo(.03,0);railShape.closePath();
 const railGeo=new T.ExtrudeGeometry(railShape,{depth:4.05,bevelEnabled:false,steps:1});railGeo.translate(0,0,-2);
 const rails=batch(railGeo,mat('#b9c4c3',{metalness:.75,roughness:.4}),320);
 const marks=batch(box,mat('#ede8d7',{roughness:.86}),320);
 const bridgeDeck=batch(box,mat('#9c9a8f',{roughness:.93}),2),bridgePillars=batch(box,mat('#92978f'),8),bridgeRails=batch(box,mat('#87928f',{metalness:.4}),8);
 const archGeo=new T.CylinderGeometry(8.5,8.5,4.0,24,1,true,0,Math.PI);archGeo.rotateX(Math.PI/2);archGeo.rotateZ(Math.PI/2);geometries.add(archGeo);
 const tunnel=batch(archGeo,mat('#a3a196',{side:T.DoubleSide,roughness:.95}),36);
 const strips=[];
 function strip(left,right,material,terrain=false){const count=161,across=terrain?33:2,positions=new Float32Array(count*across*3),uv=new Float32Array(count*across*2),ix=[];for(let i=0;i<count;i++)for(let j=0;j<across;j++){const k=i*across+j,x=left+(right-left)*j/(across-1);uv.set([terrain?x/40:x/4,i],k*2);if(i<count-1&&j<across-1)ix.push(k,k+1,k+across,k+1,k+across+1,k+across);}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(ix);const m=new T.Mesh(g,material);m.frustumCulled=false;roadScene.add(m);geometries.add(g);strips.push({g,left,right,across,terrain});}
 strip(-300,300,mat('#68785b'),true);strip(-7.3,7.3,mat('#9b9987',{map:maps[0],roughness:1}));strip(-ROAD_HALF,ROAD_HALF,mat('#cccccc',{map:maps[0],normalMap:maps[1],roughnessMap:maps[2],normalScale:new T.Vector2(.55,.55),roughness:.94}));
 const shadowTexture=canvasTexture(128,256,(c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,5,w/2,h/2,h/2);g.addColorStop(0,'#0000009a');g.addColorStop(.5,'#00000066');g.addColorStop(1,'#00000000');c.fillStyle=g;c.fillRect(0,0,w,h);});
 const shadowGeo=new T.PlaneGeometry(1,1);shadowGeo.rotateX(-Math.PI/2);const shadows=batch(shadowGeo,new T.MeshBasicMaterial({map:shadowTexture,transparent:true,opacity:.65,depthWrite:false}),TRAFFIC_LIMIT+1,scene);materials.add(shadows.material);
 const headlights=new T.SpotLight('#fff2d4',0,110,.32,.65,1.4);scene.add(headlights,headlights.target);
 function point(s,x=0,lift=0,o=anchor){const f=roadFrame(s);return [f.x-o.x+x*f.right[0],f.y+lift+(f.bank||0)*x,-(s-o.s)+x*f.right[1]];}
 function terrainHeight(s,x){const f=roadFrame(s);return f.y+(f.bank||0)*Math.max(-20,Math.min(20,x))-.8+Math.max(0,Math.abs(x)-24)*(.09+.055*Math.sin(s/89+x/50))+Math.max(0,Math.abs(x)-24)/12*Math.sin(s/34+x/18);}
 function rebuild(distance){
  anchor=roadFrame(Math.floor(distance/8)*8);const start=anchor.s-48;
  for(const {g,left,right,across,terrain}of strips){const a=g.attributes.position.array;for(let i=0;i<=160;i++){const s=start+i*4;for(let j=0;j<across;j++){const x=left+(right-left)*j/(across-1),p=point(s,x,left===-7.3?-.04:0);if(terrain)p[1]=terrainHeight(s,x);a.set(p,(i*across+j)*3);}}g.attributes.position.needsUpdate=true;g.computeVertexNormals();}
  for(let i=0;i<80;i++){const s=Math.floor(distance/8)*8-48+i*8,f=roadFrame(s);for(let j=0;j<4;j++){const x=[-5.18,-1.8,1.8,5.18][j];put(marks,i*4+j,point(s,x,.018),[.12,.016,j===0||j===3?8.04:3.5],-f.heading,Math.atan(f.grade||0));}}
  for(let i=0;i<160;i++){const s=start+i*4,f=roadFrame(s);for(let side=0;side<2;side++)put(rails,i*2+side,point(s,side?7.1:-7.1,.48),[1,1,1],-f.heading,Math.atan(f.grade||0));}
  for(let i=0;i<160;i++){const s=Math.floor(distance/8)*8-48+Math.floor(i/2)*8;put(posts,i,point(s,i%2?7.1:-7.1,.4),[.12,.8,.12]);}
  for(let i=0;i<80;i++){const index=Math.floor(distance/8)-7+i,s=index*8,side=Math.abs(index%2)?1:-1,x=side*(14+Math.abs(Math.sin(index*7))*32),h=5+Math.abs(Math.sin(index*3))*5,p=point(s,x);p[1]=terrainHeight(s,x)+h/2;put(trees,i*2,p,[h*.85,h,1],.2+index%3);put(trees,i*2+1,p,[h*.85,h,1],Math.PI/2+.2+index%3);}
  for(let i=0;i<24;i++){const n=Math.floor(distance/32)-3+i,s=n*32,x=(n%2?1:-1)*(60+Math.abs(Math.sin(n))*42),h=5+Math.abs(Math.sin(n*5))*11,p=point(s,x);p[1]=terrainHeight(s,x)+h/2;put(buildings,i,p,[12,h,15],.2);put(roofs,i,[p[0],p[1]+h/2+1,p[2]],[9,2,11],Math.PI/4+.2);}
  for(let i=0;i<6;i++){const s=(Math.floor(distance/120)-1+i)*120,f=roadFrame(s),p=point(s,9.8,5);put(signs,i,p,[6,2.25,.12],-f.heading);put(posts,160+i,[p[0],p[1]-2.5,p[2]],[.14,5,.14]);}
  for(let i=0;i<2;i++){const s=(Math.floor(distance/630)+i)*630+220,f=roadFrame(s),p=point(s,0,6);put(bridgeDeck,i,p,[42,.7,9],-f.heading);for(let j=0;j<4;j++){put(bridgePillars,i*4+j,point(s+(j%2?3:-3),j<2?-13:13,2.9),[1.3,5.8,1.3],-f.heading);put(bridgeRails,i*4+j,point(s+(j%2?4:-4),j<2?-10:10,6.7),[20,.8,.15],-f.heading);}}
  const tunnelStart=Math.floor(distance/1600)*1600+900;for(let i=0;i<36;i++){const s=tunnelStart+i*4,f=roadFrame(s);put(tunnel,i,point(s,0,.1),[1,1,1],-f.heading);}
  for(const m of instances)m.instanceMatrix.needsUpdate=true;
 }
 function resize(){const r=host.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);const ratio=quality==='auto'?budget.quality:quality==='high'?1.5:quality==='medium'?1:.7;renderer.setPixelRatio(bufferPixelRatio(profile,width,height,ratio,devicePixelRatio));renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
 function render(state,view='chase',now=performance.now()){
  if(disposed||lost)return;const origin=roadFrame(state.distance),dt=Math.min(.1,(now-lastTime)/1000||1/60);lastTime=now;
  if(!anchor||Math.abs(state.distance-anchor.s)>=8)rebuild(state.distance);roadScene.position.set(anchor.x-origin.x,0,state.distance-anchor.s);
  const p=point(state.distance,state.x,0,origin),suspension=Math.sin(state.distance*2.1)*Math.min(.016,state.speed*.0004),rollAngle=Math.atan(origin.bank||0)-(state.lateralAccel||0)*.006,pitch=(state.acceleration||0)*.003;
  const vehicles=[{player:true,id:0,type:0,x:p[0],y:p[1],z:p[2],speed:state.speed,angle:-origin.heading-(state.yaw||0),pitch:Math.atan(origin.grade||0)+pitch,groundPitch:Math.atan(origin.grade||0),groundRoll:Math.atan(origin.bank||0),roll:rollAngle,bounce:suspension,distance:state.distance,steering:state.steering}];
  for(const car of state.traffic){const gap=car.distance-state.distance;if(gap>300||gap< -35)continue;const f=roadFrame(car.distance),a=point(car.distance,car.x,0,origin);vehicles.push({id:car.id,type:car.id%3===0&&gap<80?0:1,x:a[0],y:a[1],z:a[2],angle:-f.heading-(car.lateralSpeed||0)/Math.max(8,car.speed),pitch:Math.atan(f.grade||0),groundPitch:Math.atan(f.grade||0),groundRoll:Math.atan(f.bank||0),roll:Math.atan(f.bank||0),scale:car.id%3===0?.98:1,distance:car.distance,steering:(car.lateralSpeed||0)*.3});}
  fleet.update(vehicles,view);fleet.setLights(state.braking,timeOfDay==='night');
  shadows.count=vehicles.length;vehicles.forEach((v,i)=>put(shadows,i,[v.x,v.y+.022,v.z],[2.7,1,5.5],v.angle,v.groundPitch||0,v.groundRoll||0));shadows.instanceMatrix.needsUpdate=true;
  const poses={chase:{back:7.8,lift:2.7,ahead:19,aim:.65,fov:58},aerial:{back:8.4,lift:7.3,ahead:3.2,aim:0,fov:56},driver:{...HIGHWAY_MODELS[0].driverEye,ahead:28,aim:1.04,fov:68},bonnet:{back:-1,lift:1.2,ahead:28,aim:.9,fov:64}};
  const pose=poses[view]||poses.chase;
  desired.set(p[0]-origin.dx*pose.back,p[1]+pose.lift+suspension*.25,p[2]+pose.back);const lp=point(state.distance+pose.ahead,state.x,pose.aim,origin);look.set(...lp);
  if(first||Math.abs(state.distance-lastDistance)>100){camera.position.copy(desired);target.copy(look);first=false;}else{camera.position.x-=origin.x-roadFrame(lastDistance).x;camera.position.z+=state.distance-lastDistance;target.x-=origin.x-roadFrame(lastDistance).x;target.z+=state.distance-lastDistance;const alpha=1-Math.exp(-dt*(view==='driver'?14:7));camera.position.lerp(desired,alpha);target.lerp(look,alpha);}
  if(lastView!==view){cameraTransition=0;lastView=view;}cameraTransition=Math.min(1,cameraTransition+dt*3);lastDistance=state.distance;
  camera.lookAt(target);camera.fov+=(pose.fov+state.speed/(230/3.6)*5-camera.fov)*(1-Math.exp(-dt*5));camera.updateProjectionMatrix();
  headlights.intensity=timeOfDay==='night'?8000:0;headlights.position.set(p[0],p[1]+.65,p[2]-1.6);const aim=point(state.distance+70,state.x,0,origin);headlights.target.position.set(...aim);
  renderer.render(scene,camera);const sample=budget.sample(now,state.phase==='running');if(sample?.changed)resize();
  if(state.phase==='running'){if(lastMeasured){frameTimes.push(now-lastMeasured);if(frameTimes.length>3600)frameTimes.shift();}lastMeasured=now;if(!fpsAt)fpsAt=now;frameCount++;if(now-fpsAt>=1000){host.dataset.fps=String(Math.round(frameCount*1000/(now-fpsAt)));fpsAt=now;frameCount=0;}}else{lastMeasured=0;fpsAt=0;frameCount=0;}
  Object.assign(host.dataset,{renderer:'webgl2',drawCalls:String(renderer.info.render.calls),triangles:String(renderer.info.render.triangles),quality:budget.quality.toFixed(2),vehicleSource:'licensed-gltf',visibleTraffic:String(vehicles.length-1),camera:view,modelName:'Car Concept provisional',memoryGeometries:String(renderer.info.memory.geometries),memoryTextures:String(renderer.info.memory.textures),timeOfDay});
 }
 function setTimeOfDay(value){timeOfDay=['day','sunset','night'].includes(value)?value:'day';const night=timeOfDay==='night',sunset=timeOfDay==='sunset';sun.color.set(sunset?'#ffb36c':'#fff0db');sun.intensity=night?.05:sunset?1.8:3;hemi.intensity=night?.16:sunset?.95:1.6;scene.background=night?new T.Color('#071020'):sky;scene.backgroundIntensity=sunset?.65:1;scene.environmentIntensity=night?.18:sunset?.7:1;scene.fog.color.set(night?'#0c1723':sunset?'#ae998a':'#a4b5b8');renderer.toneMappingExposure=night?.9:1.05;}
 function onLost(e){e.preventDefault();lost=true;host.dataset.context='lost';host.dispatchEvent(new Event('highway-context-lost'));}
 function onRestore(){lost=false;first=true;budget.reset();host.dataset.context='ready';host.dispatchEvent(new Event('highway-context-restored'));}
 renderer.domElement.addEventListener('webglcontextlost',onLost);renderer.domElement.addEventListener('webglcontextrestored',onRestore);
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 return {render,resize,setTimeOfDay,setQuality(value){quality=['auto','high','medium','low'].includes(value)?value:'auto';resize();},resetCamera(){first=true;},performance(){const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),gpu=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);return {...frameStatistics(frameTimes),gpu,software:/swiftshader|llvmpipe|software|microsoft basic/i.test(gpu),physicalAndroid:false,targetFps:profile.targetFps,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries};},resetPerformance(){frameTimes.length=0;lastMeasured=0;},get ready(){return !lost&&!disposed;},canvas:renderer.domElement,dispose(){if(disposed)return;disposed=true;observer.disconnect();renderer.domElement.removeEventListener('webglcontextlost',onLost);renderer.domElement.removeEventListener('webglcontextrestored',onRestore);fleet.dispose();for(const g of [...geometries,...resources.geometries])g.dispose();for(const m of [...materials,...resources.materials])m.dispose();for(const t of [...textures,...resources.textures])t.dispose();sky.dispose();environment.dispose();for(const i of instances)i.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
}
