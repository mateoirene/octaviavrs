import * as T from './vendor/three.module.js';
import {createOctavia} from './racing-vehicles3d.mjs?v=20261028-grounded-tesla';
// Reuse the project's authored Octavia geometry, with an original cabin.
// No downloaded vehicle, extracted game asset or third-party trademark artwork.
export function createHighwayOctavia(){
 const car=createOctavia({paint:'blue'});
 const shadow=car.userData.contactShadow;car.remove(shadow);shadow.geometry.dispose();shadow.material.dispose();
 car.traverse(n=>{if(!n.isMesh)return;const m=n.material;
  if(m.metalness===.48)m.name='Paint 1';
  if(m.metalness===.28){m.name='Glass';m.transparent=true;m.opacity=.23;m.depthWrite=false;}
  // Bring the legacy spoiler down onto the sloping hatch, without changing
  // the circuit's authored asset or its photographic presentation.
  const positions=n.geometry.attributes.position;
  if(m.color?.getHexString()==='111419'||m.emissive?.getHexString()==='dc1426'){
   for(let i=0;i<positions.count;i++)if(positions.getZ(i)>1.65&&positions.getY(i)>1.34)positions.setY(i,positions.getY(i)-.34);
   positions.needsUpdate=true;n.geometry.computeVertexNormals();
  }
 });
 const cabin=new T.Group();cabin.name='Cabin';car.add(cabin);
 const dark=new T.MeshStandardMaterial({name:'Cabin trim',color:'#171c23',roughness:.78});
 const upholstery=new T.MeshStandardMaterial({name:'Cabin seats',color:'#20252a',roughness:.95});
 const display=new T.MeshStandardMaterial({name:'Dashboard',color:'#10232c',roughness:.25});
 function box(name,x,y,z,w,h,d,material=dark){const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);m.name='Cabin '+name;m.position.set(x,y,z);cabin.add(m);return m;}
 box('dashboard',0,.92,-.91,1.42,.18,.38);box('console',0,.56,-.05,.25,.33,1.1);
 box('display',0,1.09,-.86,.35,.19,.035,display);
 for(const x of [-.43,.43]){box('seat',x,.46,.36,.49,.16,.52,upholstery);box('back',x,.85,.64,.49,.66,.13,upholstery);box('headrest',x,1.24,.65,.28,.22,.12,upholstery);}
 box('rear bench',0,.48,1.28,1.36,.18,.52,upholstery);box('rear back',0,.78,1.53,1.36,.48,.14,upholstery);
 const wheel=new T.Mesh(new T.TorusGeometry(.16,.018,8,32),dark);wheel.name='Cabin steering';wheel.position.set(-.39,1.0,-.63);wheel.rotation.x=-.25;cabin.add(wheel);
 const lens=new T.MeshStandardMaterial({name:'Brakelight',color:'#a91626',emissive:'#ff2011',emissiveIntensity:.6,roughness:.24});
 const bodyDetail=new T.Group();car.add(bodyDetail);
 function rearBar(x,y,z,w,h,angle=0){const m=new T.Mesh(new T.BoxGeometry(w,h,.025),lens);m.position.set(x,y,z);m.rotation.z=angle;bodyDetail.add(m);}
 for(const side of [-1,1]){rearBar(side*.61,.85,2.35,.39,.037);rearBar(side*.78,.79,2.34,.038,.16);rearBar(side*.69,.72,2.35,.18,.028);}
 const plateCanvas=document.createElement('canvas');plateCanvas.width=512;plateCanvas.height=256;const ctx=plateCanvas.getContext('2d');
 ctx.fillStyle='#152029';ctx.fillRect(0,0,512,256);ctx.fillStyle='#d8e4e7';ctx.textAlign='center';ctx.font='26px sans-serif';ctx.fillText('Š K O D A',256,54);ctx.font='bold 25px sans-serif';ctx.fillText('OCTAVIA   vRS',256,106);ctx.fillStyle='#e4e8e7';ctx.fillRect(130,158,252,49);ctx.fillStyle='#182830';ctx.font='bold 29px sans-serif';ctx.fillText('CLUB VRS',256,193);
 const plateMap=new T.CanvasTexture(plateCanvas);plateMap.colorSpace=T.SRGBColorSpace;
 const plate=new T.Mesh(new T.PlaneGeometry(1.05,.52),new T.MeshStandardMaterial({name:'Rear hatch detail',map:plateMap,roughness:.38,metalness:.4}));plate.position.set(0,.64,2.357);bodyDetail.add(plate);
 return car;
}
