import * as THREE from './vendor/three.module.js';
import {roofDecalFootprint} from './racing-body-shapes.mjs';
// Values come from the garage membership number, never the grid position.
export function roofNumberText(value){const text=String(value??'');return /^\d{1,3}$/.test(text)&&Number(text)<=900?String(Number(text)):null;}
export function attachRoofNumber(group,value,model=group.userData.visualModel||group.userData.model,{textureSize=512}={}){
 const number=roofNumberText(value),footprint=roofDecalFootprint(model);if(!number||!footprint)return null;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=textureSize;const ctx=canvas.getContext('2d'),center=textureSize/2;
 ctx.clearRect(0,0,textureSize,textureSize);ctx.fillStyle='#fffdf5';ctx.beginPath();ctx.arc(center,center,center-3,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#192128';ctx.lineWidth=textureSize*.018;ctx.beginPath();ctx.arc(center,center,center-textureSize*.035,0,Math.PI*2);ctx.stroke();
 let fontSize=textureSize*.70;ctx.textAlign='center';ctx.textBaseline='middle';for(;;){ctx.font=`800 ${fontSize}px Arial, sans-serif`;if(ctx.measureText(number).width<=textureSize*.76)break;fontSize-=4;}ctx.fillStyle='#111820';ctx.fillText(number,center,center+textureSize*.025);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.anisotropy=4;
 const targets=[];group.traverse(item=>{if(!item.isMesh||item.userData.groundContactShadow||item.userData.roofNumber)return;let node=item;while(node&&node!==group){if(!node.visible)return;node=node.parent;}targets.push(item);});group.updateWorldMatrix(true,true);
 const ray=new THREE.Raycaster(),origin=new THREE.Vector3(),direction=new THREE.Vector3(0,-1,0).transformDirection(group.matrixWorld),inverse=group.matrixWorld.clone().invert(),normalMatrix=new THREE.Matrix3(),vertices=[],uv=[],indices=[],radial=4,segments=64;
 const sample=(x,z)=>{origin.set(x,5,z).applyMatrix4(group.matrixWorld);ray.set(origin,direction);const hit=ray.intersectObjects(targets,false).find(h=>h.face&&h.face.normal.clone().applyMatrix3(normalMatrix.getNormalMatrix(h.object.matrixWorld)).normalize().dot(direction)<-.3);if(!hit)throw Error('No se puede adherir el dorsal al techo real de '+model);const point=hit.point.clone(),normal=hit.face.normal.clone().applyMatrix3(normalMatrix.getNormalMatrix(hit.object.matrixWorld)).normalize();point.addScaledVector(normal,.0008).applyMatrix4(inverse);return point;};
 const add=(x,z,u,v)=>{const p=sample(x,z);vertices.push(p.x,p.y,p.z);uv.push(u,v);};
 add(footprint.x,footprint.z,.5,.5);
 for(let ring=1;ring<=radial;ring++)for(let i=0;i<segments;i++){const angle=i/segments*Math.PI*2,r=footprint.radius*ring/radial,x=Math.cos(angle)*r,z=Math.sin(angle)*r;add(footprint.x+x,footprint.z+z,.5+x/(2*footprint.radius),.5-z/(2*footprint.radius));}
 for(let i=0;i<segments;i++)indices.push(0,1+(i+1)%segments,1+i);
 for(let ring=1;ring<radial;ring++)for(let i=0;i<segments;i++){const a=1+(ring-1)*segments+i,b=1+(ring-1)*segments+(i+1)%segments,c=a+segments,d=b+segments;indices.push(a,b,c,b,d,c);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({map:texture,transparent:true,alphaTest:.02,alphaToCoverage:true,roughness:.55,metalness:.02,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,depthWrite:false,side:THREE.DoubleSide});
 const badge=new THREE.Mesh(geometry,material);badge.name='Dorsal real '+number+' adherido al techo';badge.castShadow=false;badge.receiveShadow=true;badge.renderOrder=3;badge.userData={roofNumber:true,number,model,footprint,surfaceGap:.0008};group.add(badge);group.userData.roofNumber=badge;
 const oldDispose=group.userData.disposeMaterials;group.userData.disposeMaterials=()=>{oldDispose?.();texture.dispose();material.dispose();};
 return badge;
}
