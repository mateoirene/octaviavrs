import * as THREE from './vendor/three.module.js';
import {TESLA_IMAGE_ATLASES,teslaImageView,teslaImageWidth} from './racing-tesla-views.mjs?v=20261105-photos';
const rimPositions=[[],[[.10,.70,.036,.12],[.40,.78,.046,.13]],[[.17,.79,.058,.15],[.81,.79,.058,.15]],[[.52,.81,.048,.13],[.91,.67,.026,.10]],[],[[.48,.81,.048,.13],[.09,.67,.026,.10]],[[.19,.79,.058,.15],[.83,.79,.058,.15]],[[.60,.78,.046,.13],[.90,.70,.036,.12]]];
export async function loadTeslaImages(loader){
 const result={};
 try{for(const [level,path]of Object.entries(TESLA_IMAGE_ATLASES)){
  const source=await loader.loadAsync(path);source.colorSpace=THREE.SRGBColorSpace;source.minFilter=THREE.LinearMipmapLinearFilter;source.magFilter=THREE.LinearFilter;source.anisotropy=2;
  const image=source.image,w=image.width,h=image.height,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,w,h).data;
  result[level]=[];
  for(let index=0;index<8;index++){
   const cell={x:Math.round(index%4*w/4),y:Math.round(Math.floor(index/4)*h/2),right:Math.round((index%4+1)*w/4),bottom:Math.round((Math.floor(index/4)+1)*h/2)};
   let left=cell.right,right=cell.x,top=cell.bottom,bottom=cell.y;
   for(let y=cell.y;y<cell.bottom;y++)for(let x=cell.x;x<cell.right;x++)if(data[(y*w+x)*4+3]>120){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
   if(right<=left||bottom<=top)throw Error('Empty Tesla image '+level+':'+index);
   left=Math.max(cell.x,left-2);right=Math.min(cell.right,right+3);top=Math.max(cell.y,top-2);bottom=Math.min(cell.bottom,bottom+3);
   const texture=source.clone();texture.offset.set(left/w,1-bottom/h);texture.repeat.set((right-left)/w,(bottom-top)/h);texture.needsUpdate=true;
   result[level].push({texture,aspect:(right-left)/(bottom-top),rims:level==='low'?rimPositions[index]:[],bounds:{left,right,top,bottom,w,h}});
  }
  source.dispose();
 }return result;}catch(error){disposeTeslaImages(result);throw error;}
}
export function disposeTeslaImages(atlas){for(const views of Object.values(atlas||{}))for(const view of views)view.texture.dispose();}
function photoSprite(){
 const material=new THREE.SpriteMaterial({transparent:true,depthWrite:false,alphaTest:.025,toneMapped:false});
 const uniforms={spin:{value:0},rimA:{value:new THREE.Vector4()},rimB:{value:new THREE.Vector4()}};
 material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.fragmentShader='uniform float spin;uniform vec4 rimA;uniform vec4 rimB;vec2 spinRim(vec2 uv,vec4 r){if(r.z<=0.0)return uv;vec2 p=(uv-r.xy)/r.zw;if(dot(p,p)>.8)return uv;float c=cos(spin),s=sin(spin);return r.xy+mat2(c,-s,s,c)*p*r.zw;}\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#ifdef USE_MAP\nvec2 photoUV=spinRim(spinRim(vMapUv,rimA),rimB);diffuseColor*=texture2D(map,photoUV);\n#endif');};material.customProgramCacheKey=()=>'tesla-photographic-rims-v1';
 const sprite=new THREE.Sprite(material);sprite.name='Tesla blanco · imagen por ángulo · ALBERTO';sprite.center.set(.5,0);sprite.position.y=.002;sprite.userData.uniforms=uniforms;return sprite;
}
export function attachTeslaImages(group,atlas){
 const body=[...group.children].filter(child=>!child.userData.groundContactShadow),sprites=[photoSprite(),photoSprite()],local=new THREE.Vector3();for(const s of sprites){s.visible=false;group.add(s);}
 let selected=null,front=0,transition=0,lastTime=null,old=null;
 function assign(sprite,view){const frame=atlas[view.level][view.index],width=teslaImageWidth(view.index);sprite.material.map=frame.texture;sprite.material.needsUpdate=true;sprite.scale.set(width,width/frame.aspect,1);const b=frame.bounds;for(const [i,name]of ['rimA','rimB'].entries()){const r=frame.rims[i];sprite.userData.uniforms[name].value.set(...(r?[(b.left+r[0]*(b.right-b.left))/b.w,1-(b.top+r[1]*(b.bottom-b.top))/b.h,r[2]*(b.right-b.left)/b.w,r[3]*(b.bottom-b.top)/b.h]:[0,0,0,0]));}}
 const controller={update(camera,time=0){
  group.updateWorldMatrix(true,false);camera.getWorldPosition(local);group.worldToLocal(local);const next=teslaImageView(local.x,local.y,local.z,selected),dt=lastTime===null?1:Math.max(0,Math.min(.1,time-lastTime));lastTime=time;
  if(!selected||next.key!==selected.key){old=selected;front=1-front;assign(sprites[front],next);selected=next;transition=old?0:1;}
  transition=Math.min(1,transition+dt/.14);for(const child of body)child.visible=false;
  for(let i=0;i<2;i++){const s=sprites[i];s.visible=i===front||!!old&&transition<1;s.material.opacity=i===front?transition:1-transition;const distance=Math.max(.001,Math.hypot(local.x,local.z)),nearOffset=s.scale.y*.5*Math.sin(Math.max(0,next.elevation));s.position.set(local.x/distance*nearOffset,.002,local.z/distance*nearOffset);s.userData.uniforms.spin.value=-(group.userData.photoDistance||0)/.335;}
  group.userData.photoBillboards=transition<1?2:1;group.userData.teslaPhotoView=selected.key;return selected.key;
 },dispose(){for(const s of sprites){s.material.dispose();group.remove(s);}}};
 group.userData.teslaPhoto=controller;group.userData.vehicleSource='photographic-recreation-atlas';return controller;
}
