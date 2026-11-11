import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {HIGHWAY_MODELS} from './highway-models.mjs';
import {createHighwayOctavia} from './highway-octavia.mjs';
import {createTrafficDistanceTemplate} from './highway-traffic-lod.mjs';

const palette=['#163d65','#d5d8d6','#7c2830','#373c42','#bdab8a','#1d655f'];
function cleanGeometry(mesh,matrix){
 const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(matrix);
 for(const name of Object.keys(g.attributes))if(!['position','normal','uv','uv1'].includes(name))g.deleteAttribute(name);
 if(!g.attributes.normal)g.computeVertexNormals();
 for(const name of ['uv','uv1'])if(!g.attributes[name])g.setAttribute(name,new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
 return g;
}
function joinGroups(items){
 const groups=new Map();for(const {geometry,material}of items){const key=material.uuid;if(!groups.has(key))groups.set(key,{material,geometries:[]});groups.get(key).geometries.push(geometry);}
 return [...groups.values()].map(({material,geometries})=>{const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());return {geometry,material};});
}
function fitImage(texture,limit){const im=texture?.image;if(!im||Math.max(im.width,im.height)<=limit)return;const c=document.createElement('canvas'),k=limit/Math.max(im.width,im.height);c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);texture.image=c;texture.needsUpdate=true;}

export async function loadVehicleTemplates(profile){
 const loader=new GLTFLoader(),files=await Promise.all(HIGHWAY_MODELS.map(n=>n.asset?loader.loadAsync(n.asset):{scene:createHighwayOctavia()}));
 const resources={geometries:new Set(),materials:new Set(),textures:new Set()},templates=[];
 for(let type=0;type<files.length;type++){
  const config=HIGHWAY_MODELS[type],source=files[type].scene,holder=new T.Group();holder.add(source);
  // Car Concept's documented forward axis is +Z; the sedan is checked from its lamp positions below.
  holder.rotation.y=config.rotationY;
  holder.updateMatrixWorld(true);let bounds=new T.Box3().setFromObject(holder),size=bounds.getSize(new T.Vector3());
  if(type===1&&size.x>size.z){holder.rotation.y=Math.PI/2;holder.updateMatrixWorld(true);bounds.setFromObject(holder);size=bounds.getSize(size);}
  const scale=config.length/size.z;holder.scale.setScalar(scale);holder.updateMatrixWorld(true);bounds.setFromObject(holder);const center=bounds.getCenter(new T.Vector3());holder.position.set(-center.x,-bounds.min.y,-center.z);holder.updateMatrixWorld(true);
  const materialCache=new Map();
  function adapt(original){
   if(materialCache.has(original.uuid))return materialCache.get(original.uuid);
   // Transmission would add an expensive scene render for every windshield. Standard transparent glass keeps the interior visible.
   const glass=/glass/i.test(original.name),paint=/Paint 1|^blue$/i.test(original.name);
   const mat=new T.MeshStandardMaterial({name:original.name,color:original.color,metalness:original.metalness||0,roughness:Math.max(.18,original.roughness??.6),map:original.map,normalMap:original.normalMap,roughnessMap:original.roughnessMap,metalnessMap:original.metalnessMap,aoMap:original.aoMap,aoMapIntensity:original.aoMapIntensity,emissive:original.emissive,emissiveMap:original.emissiveMap,emissiveIntensity:original.emissiveIntensity||0,side:original.side});
   mat.normalScale.copy(original.normalScale||new T.Vector2(1,1));
   if(paint){mat.color.set('#ffffff');mat.metalness=.72;mat.roughness=.24;mat.userData.paint=true;}
   if(glass){mat.color.set('#96c2d4');mat.metalness=.12;mat.roughness=.13;mat.transparent=true;mat.opacity=type===0?.19:.72;mat.depthWrite=false;}
   if(/Brakelight|^tail$/i.test(mat.name)){mat.emissive.set('#ff2011');mat.emissiveIntensity=.6;mat.userData.brake=true;}
   if(/Headlight|^lamp$/i.test(mat.name)){mat.emissive.set('#fff0d0');mat.emissiveIntensity=.65;}
   if(mat.name==='Dashboard'){mat.emissiveIntensity=0;mat.emissiveMap=null;mat.map=null;mat.color.set('#10151a');}
   for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap'])if(mat[key]){fitImage(mat[key],profile.mobile?1024:2048);resources.textures.add(mat[key]);}
   resources.materials.add(mat);materialCache.set(original.uuid,mat);return mat;
  }
  const wheelRoots=type===0?source.userData.wheels.map(w=>w.pivot):[];
  const wheelCenters=type===0?wheelRoots.map(n=>n.getWorldPosition(new T.Vector3())):[];
  if(type===1){
   const tyres=[];source.traverse(n=>{if(n.isMesh&&/tire/i.test(n.name))tyres.push(new T.Box3().setFromObject(n).getCenter(new T.Vector3()));});
   tyres.sort((a,b)=>a.z-b.z||a.x-b.x);wheelCenters.push(...tyres);
  }
  if(wheelCenters.length!==4)throw Error('El modelo debe tener cuatro ruedas identificables');
  const body=[],interior=[],wheels=[[],[],[],[]];
  source.traverse(mesh=>{
   if(!mesh.isMesh)return;
   resources.geometries.add(mesh.geometry);
   // Thin wiper stacks create severe moiré at the mobile driver-eye angle; omit these small decorative meshes.
   if(type===0&&/BodyWindshieldWipers/.test(mesh.name))return;
   let wheel=-1;
   if(type===0){let parent=mesh;while(parent&&parent!==holder){const i=wheelRoots.indexOf(parent);if(i>=0){wheel=i;break;}parent=parent.parent;}}
   else if(/(?:Front|Rear)_(?:tire|rim|hub|spoke|brake)/i.test(mesh.name)){const c=new T.Box3().setFromObject(mesh).getCenter(new T.Vector3());wheel=wheelCenters.reduce((a,b,i)=>c.distanceToSquared(b)<c.distanceToSquared(wheelCenters[a])?i:a,0);}
   const parts=Array.isArray(mesh.material)?mesh.material:[mesh.material];
   // GLTFLoader material primitives are separate meshes in these assets.
   const material=adapt(parts[0]),g=cleanGeometry(mesh,mesh.matrixWorld);
   if(wheel>=0){g.translate(-wheelCenters[wheel].x,-wheelCenters[wheel].y,-wheelCenters[wheel].z);wheels[wheel].push({geometry:g,material});}
   else if(type===0&&/Interior|Engine|Axles|Cabin/i.test(mesh.name))interior.push({geometry:g,material});
   else body.push({geometry:g,material});
  });
  const template={body:joinGroups(body),interior:joinGroups(interior),wheels:wheels.map(joinGroups),wheelCenters,type,source: type===0?'Octavia · geometría original del proyecto':'Sedan Innerscene · CC0'};
  for(const part of [...template.body,...template.interior,...template.wheels.flat()])resources.geometries.add(part.geometry);
  templates.push(template);
  // The fleet owns the converted materials. Release source materials and maps
  // that were deliberately omitted (including the old contact shadow).
  const originals=new Set();source.traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material])originals.add(m);});
  for(const m of originals){for(const v of Object.values(m))if(v?.isTexture&&!resources.textures.has(v))v.dispose();m.dispose();}
  for(const t of source.userData.ownedTextures||[])if(!resources.textures.has(t))t.dispose();
 }
 const distant=createTrafficDistanceTemplate();templates.push(distant);
 for(const p of [...distant.body,...distant.wheels.flat()]){resources.geometries.add(p.geometry);resources.materials.add(p.material);}
 return {templates,resources};
}

export function createVehicleFleet(scene,templates,max=19){
 const dummy=new T.Object3D(),base=new T.Matrix4(),wheelMatrix=new T.Matrix4(),rotation=new T.Quaternion(),roll=new T.Quaternion(),axisX=new T.Vector3(1,0,0),axisY=new T.Vector3(0,1,0),color=new T.Color();
 const dashCanvas=document.createElement('canvas');dashCanvas.width=512;dashCanvas.height=128;const dashContext=dashCanvas.getContext('2d'),dashTexture=new T.CanvasTexture(dashCanvas);dashTexture.colorSpace=T.SRGBColorSpace;const dashGeometry=new T.PlaneGeometry(.32,.14),dashMaterial=new T.MeshBasicMaterial({map:dashTexture}),dashboard=new T.Mesh(dashGeometry,dashMaterial);dashboard.matrixAutoUpdate=false;scene.add(dashboard);let displayed=-1;
 const batches=templates.map(template=>{
  function batch(part,count){const m=new T.InstancedMesh(part.geometry,part.material,count);m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.frustumCulled=false;scene.add(m);return m;}
  return {template,body:template.body.map(p=>batch(p,max)),interior:template.interior.map(p=>batch(p,1)),wheels:template.wheels.map(parts=>parts.map(p=>batch(p,max)))};
 });
 function update(vehicles,view){
  for(const t of templates)for(const p of [...t.body,...t.interior])if(/glass/i.test(p.material.name))p.material.opacity=view==='driver'?.16:.9;
  for(const b of batches){const cars=vehicles.filter(c=>c.type===b.template.type);for(const m of [...b.body,...b.wheels.flat()])m.count=cars.length;
   for(let i=0;i<cars.length;i++){
    const car=cars[i];dummy.position.set(car.x,car.y+(car.bounce||0),car.z);dummy.rotation.set(car.pitch||0,car.angle,car.roll||0);dummy.scale.setScalar(car.scale||1);dummy.updateMatrix();base.copy(dummy.matrix);
    for(const m of b.body){m.setMatrixAt(i,base);if(m.material.userData.paint)m.setColorAt(i,color.set(car.player?'#1d638f':palette[car.id%palette.length]));}
    // Suspension moves the body, while wheel contact follows the actual road plane.
    dummy.position.set(car.x,car.y,car.z);dummy.rotation.set(car.groundPitch||0,car.angle,car.groundRoll||0);dummy.scale.setScalar(car.scale||1);dummy.updateMatrix();const wheelBase=dummy.matrix.clone();
    for(let j=0;j<4;j++){
     const c=b.template.wheelCenters[j];dummy.position.copy(c);dummy.scale.setScalar(1);rotation.setFromAxisAngle(axisY,c.z<0?-(car.steering||0)*.36:0);roll.setFromAxisAngle(axisX,-car.distance/.36);dummy.quaternion.copy(rotation).multiply(roll);dummy.updateMatrix();wheelMatrix.multiplyMatrices(wheelBase,dummy.matrix);for(const m of b.wheels[j])m.setMatrixAt(i,wheelMatrix);
    }
   }
   const player=cars.find(c=>c.player);for(const m of b.interior){m.visible=!!player;if(player){dummy.position.set(player.x,player.y+(player.bounce||0),player.z);dummy.rotation.set(player.pitch||0,player.angle,player.roll||0);dummy.scale.setScalar(1);dummy.updateMatrix();m.setMatrixAt(0,dummy.matrix);}}
   if(player){dashboard.visible=view==='driver';const kmh=Math.round((player.speed||0)*3.6);if(kmh!==displayed){dashContext.fillStyle='#0b1015';dashContext.fillRect(0,0,512,128);dashContext.strokeStyle='#88c8d2';dashContext.lineWidth=3;dashContext.strokeRect(3,3,506,122);dashContext.fillStyle='#d6f2f1';dashContext.font='600 83px monospace';dashContext.textAlign='center';dashContext.fillText(String(kmh),256,87);dashContext.font='16px sans-serif';dashContext.fillText('km/h  ·  AUTOVÍA VRS',256,116);dashTexture.needsUpdate=true;displayed=kmh;}base.copy(dummy.matrix);dummy.position.set(0,1.09,-.835);dummy.rotation.set(-.12,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();dashboard.matrix.multiplyMatrices(base,dummy.matrix);dashboard.matrixWorldNeedsUpdate=true;}
   for(const m of [...b.body,...b.wheels.flat(),...b.interior]){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
  }
 }
 return {update,meshes:batches.flatMap(b=>[...b.body,...b.interior,...b.wheels.flat()]),setLights(brake,night){for(const t of templates)for(const p of [...t.body,...t.interior]){if(p.material.userData.brake)p.material.emissiveIntensity=brake?4:night?1.2:.45;}},dispose(){scene.remove(dashboard);dashGeometry.dispose();dashMaterial.dispose();dashTexture.dispose();for(const b of batches)for(const m of [...b.body,...b.wheels.flat(),...b.interior]){scene.remove(m);m.dispose();}}};
}
