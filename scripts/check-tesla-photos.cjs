const {chromium}=require('playwright');
const {readFile,mkdir}=require('node:fs/promises');
const {resolve,extname}=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const root=resolve('dist');
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{const page=await browser.newPage({viewport:{width:960,height:640}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text());});
 await page.route('https://tesla.test/**',async route=>{try{const p=resolve(root,'.'+new URL(route.request().url()).pathname);if(!p.startsWith(root+'/'))throw Error('path');await route.fulfill({status:200,contentType:({'.js':'text/javascript','.mjs':'text/javascript','.png':'image/png'})[extname(p)]||'text/plain',body:await readFile(p)});}catch{await route.fulfill({status:404,body:''});}});
 await page.goto('https://tesla.test/racing-tesla-views.mjs');
 const result=await page.evaluate(async()=>{
  document.body.replaceChildren();document.body.style.margin='0';
  const THREE=await import('./vendor/three.module.js'),{createTesla,rollVehicle}=await import('./racing-vehicles3d.mjs'),{loadTeslaImages,attachTeslaImages,disposeTeslaImages}=await import('./racing-tesla-photo3d.mjs');
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(960,640);renderer.setClearColor('#56616b');document.body.append(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1.5,.1,100),atlas=await loadTeslaImages(new THREE.TextureLoader()),car=createTesla();scene.add(car);const photo=attachTeslaImages(car,atlas);let time=0;
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshBasicMaterial({color:'#74777a'}));ground.rotation.x=-Math.PI/2;ground.position.y=-.005;scene.add(ground);
  const views=[];for(const level of ['low','high'])for(let i=0;i<8;i++){const a=i*Math.PI/4;camera.position.set(-Math.sin(a)*9,level==='high'?17:2,Math.cos(a)*9);camera.lookAt(0,.72,0);for(let j=0;j<12;j++){time+=.02;photo.update(camera,time);}rollVehicle(car,10+i);renderer.render(scene,camera);views.push(car.userData.teslaPhotoView);}
  const body=car.children.filter(c=>!c.isSprite&&!c.userData.groundContactShadow);const hidden=body.every(c=>!c.visible);camera.position.set(-7,2,-7);camera.lookAt(0,.72,0);for(let j=0;j<12;j++){time+=.02;photo.update(camera,time);}renderer.render(scene,camera);
  window.__teslaPhotoTest={renderer,camera,scene,car,photo,atlas,disposeTeslaImages};
  return {views,hidden,source:car.userData.vehicleSource,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,cells:Object.values(atlas).flat().map(f=>({aspect:f.aspect,width:f.bounds.right-f.bounds.left,height:f.bounds.bottom-f.bounds.top}))};
 });
 assert.equal(result.hidden,true);assert.equal(new Set(result.views).size,16);assert.equal(result.source,'photographic-recreation-atlas');assert.ok(result.triangles<30);assert.ok(result.cells.every(c=>c.width>100&&c.height>80));
 await mkdir('artifacts',{recursive:true});await page.screenshot({path:'artifacts/tesla-imagenes-escritorio.png'});
 await page.setViewportSize({width:390,height:640});await page.evaluate(()=>{const t=window.__teslaPhotoTest;t.renderer.setSize(390,640);t.camera.aspect=390/640;t.camera.position.set(-11,4,-11);t.camera.lookAt(0,.72,0);t.camera.updateProjectionMatrix();t.photo.update(t.camera,10);t.photo.update(t.camera,11);t.renderer.render(t.scene,t.camera);});await page.screenshot({path:'artifacts/tesla-imagenes-movil.png'});
 await page.evaluate(()=>{const t=window.__teslaPhotoTest;t.photo.dispose();t.disposeTeslaImages(t.atlas);t.renderer.dispose();});assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
