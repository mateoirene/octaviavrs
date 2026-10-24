import * as THREE from './vendor/three.module.js';
export function createBurningMirror(panel){
 const renderer=new THREE.WebGLRenderer({alpha:false,antialias:false,powerPreference:'low-power'});renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;panel.prepend(renderer.domElement);Object.assign(renderer.domElement.style,{width:'100%',height:'100%'});
 const scene=new THREE.Scene();scene.background=new THREE.Color('#a9bbc6');scene.fog=new THREE.Fog('#a9bbc6',35,160);scene.add(new THREE.HemisphereLight('#e3f1ff','#444238',2.5));const sun=new THREE.DirectionalLight('#fff2df',3);sun.position.set(-20,30,10);scene.add(sun);
 const camera=new THREE.PerspectiveCamera(47,3,.1,200);camera.position.set(0,1.45,0);camera.lookAt(0,.9,-35);
 const materials=[],geometries=[],textures=[];
 function mat(parameters){const m=new THREE.MeshStandardMaterial(parameters);materials.push(m);return m;}
 const asphalt=mat({color:'#34383a',roughness:1}),white=mat({color:'#d8d9d9',metalness:.5,roughness:.36}),glass=mat({color:'#18232c',metalness:.4,roughness:.17}),black=mat({color:'#151719',roughness:.9}),metal=mat({color:'#92999e',metalness:.7,roughness:.4});
 function box(parent,x,y,z,w,h,d,material){const geo=new THREE.BoxGeometry(w,h,d);geometries.push(geo);const mesh=new THREE.Mesh(geo,material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
 box(scene,0,-.12,-80,14,.2,180,asphalt);for(const x of [-7,7]){box(scene,x,.5,-80,.16,.2,180,metal);box(scene,x,.8,-80,.16,.2,180,metal);}const lines=[];for(let i=0;i<25;i++)lines.push(box(scene,0,0,-i*8, .1,.015,3,white));
 const car=new THREE.Group();scene.add(car);box(car,0,.6,0,1.83,.67,4.2,white);box(car,0,1.05,-.25,1.56,.65,2.15,glass);const hood=box(car,0,.91,1.43,1.72,.12,1.25,white);hood.rotation.x=-.04;box(car,0,.52,2.13,1.5,.28,.05,black);box(car,0,.3,2.13,1.6,.09,.08,black);for(const x of [-.64,.64])box(car,x,.76,2.12,.43,.13,.08,mat({color:'#ebf4ef',emissive:'#ffe2ac',emissiveIntensity:.45}));for(const x of [-.85,.85])for(const z of [-1.36,1.36])box(car,x,.32,z,.25,.6,.62,black);
 // Preserve the detailed white Model 3 and its ALBERTO plate in the cinematic too.
 const proxyParts=[...car.children];car.name='Tesla Model 3 ALBERTO';panel.dataset.burningVehicle='tesla-model-3';
 new THREE.TextureLoader().load('assets/tesla-model3-alberto.png',texture=>{texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);proxyParts.forEach(part=>part.visible=false);const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.12});materials.push(material);const geometry=new THREE.PlaneGeometry(2.26,2.26*texture.image.height/texture.image.width);geometries.push(geometry);const rear=new THREE.Mesh(geometry,material);rear.position.set(0,.752,2.41);car.add(rear);panel.dataset.teslaImage='ready';});
 // Soft radial particle textures: fire uses additive blending, smoke alpha blending.
 function particleTexture(smoke){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,smoke?'rgba(35,33,31,.7)':'rgba(255,248,183,1)');g.addColorStop(.25,smoke?'rgba(44,40,36,.55)':'rgba(255,164,36,.9)');g.addColorStop(.6,smoke?'rgba(54,50,47,.25)':'rgba(222,47,4,.4)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;textures.push(t);return t;}
 const flameTexture=particleTexture(false),smokeTexture=particleTexture(true),particles=[];
 for(let i=0;i<58;i++){const smoke=i>=26;const material=new THREE.SpriteMaterial({map:smoke?smokeTexture:flameTexture,transparent:true,depthWrite:false,blending:smoke?THREE.NormalBlending:THREE.AdditiveBlending});materials.push(material);const sprite=new THREE.Sprite(material);car.add(sprite);particles.push({sprite,smoke,seed:i*2.39996});}
 const fireLight=new THREE.PointLight('#ff6e16',9,16,2);fireLight.position.set(0,1.4,1);car.add(fireLight);
 let previousWidth=0,previousHeight=0;
 function render(t){const w=Math.max(160,panel.clientWidth),h=Math.max(60,panel.clientHeight);if(w!==previousWidth||h!==previousHeight){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();previousWidth=w;previousHeight=h;}
  // Leader pulls away; the same burning car remains continuously in view and shrinks with distance.
  car.position.set(.4,0,-(7+t*10+t*t*1.1));car.rotation.y=.035*Math.sin(t*2);const blast=Math.exp(-(((t-.25)/.18)**2));fireLight.intensity=7+blast*45+Math.sin(t*19)*2;
  for(const {sprite,smoke,seed} of particles){const life=((t*(smoke?.25:1.4)+seed)%1+1)%1,spread=smoke?1+life*2:.7;const x=Math.sin(seed*7.2)*spread,y=smoke?1.4+life*6:.9+life*2.4,z=2.65+Math.cos(seed*3.1)*.28; sprite.position.set(x+(smoke?life*.8:0),y,z);const size=smoke?(1.3+life*3.5):(1-life)*(.8+blast*2.5)+.15;sprite.scale.set(size,size*(smoke?1:1.8),1);sprite.material.opacity=smoke?(1-life)*.65:(1-life)*.95;}
  for(let i=0;i<lines.length;i++)lines[i].position.z=-((i*8+t*27)%190);panel.style.opacity=String(Math.min(1,t*5)*Math.min(1,(5.75-t)*2));renderer.render(scene,camera);
 }
 return {render,dispose(){for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();renderer.dispose();renderer.domElement.remove();}};
}
