// Comprobación de las páginas reales en Chrome, con SQLite efímero y sin datos de producción.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { handleMarketRequest } from '../server/market.mjs';
const root=resolve('dist'),raw=new DatabaseSync(':memory:');raw.exec(await readFile('server/schema.sql','utf8'));
raw.prepare('INSERT INTO market_admins VALUES(?,?,?,?,?)').run('browser-admin','browser-admin@example.com','unused','salt',1);
const token=crypto.randomUUID();raw.prepare('INSERT INTO market_sessions VALUES(?,?,?)').run(createHash('sha256').update(token).digest('hex'),'browser-admin',Math.floor(Date.now()/1000)+3600);
const prepare=sql=>{const statement=raw.prepare(sql);let args=[];const values=()=>args.map(value=>value instanceof ArrayBuffer?Buffer.from(value):value);const query={bind(...values){args=values;return query;},async first(){return statement.get(...values())||null;},async all(){return {results:statement.all(...values())};},async run(){return {meta:{changes:Number(statement.run(...values()).changes)}};}};return query;};
const db={prepare,async batch(items){raw.exec('BEGIN');try{for(const item of items)await item.run();raw.exec('COMMIT');}catch(error){raw.exec('ROLLBACK');throw error;}}};
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
let notificationNews=[];
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1');if(url.pathname==='/data/notificaciones.json'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(notificationNews));return;}if(url.pathname.startsWith('/api/')){const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);const response=await handleMarketRequest(new Request(base+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{} )}),{MARKET_DB:db});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;}const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!path.startsWith(root+'/')){res.writeHead(403);res.end();return;}const content=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(content);}catch{res.writeHead(404);res.end('No disponible');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
const chromePath=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);if(!chromePath)throw new Error('Chrome no está instalado en el entorno de comprobación.');
const profile=await mkdtemp(resolve(tmpdir(),'octavia-ui-'));const chrome=spawn(chromePath,['--headless','--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-breakpad','--disable-crash-reporter','--no-first-run','--remote-debugging-port=9222','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});let chromeErrors='';chrome.stderr.on('data',chunk=>{chromeErrors=(chromeErrors+chunk.toString()).slice(-3000);});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));let socket;
try{
 for(let i=0;i<200;i++){try{const response=await fetch('http://127.0.0.1:9222/json/version');if(response.ok)break;}catch{}if(i===199||chrome.exitCode!==null)throw new Error('Chrome no arrancó: '+chromeErrors);await wait(100);}
 const target=await(await fetch('http://127.0.0.1:9222/json/new?about:blank',{method:'PUT'})).json();socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 let id=0;const pending=new Map(),errors=[];
 socket.addEventListener('message',message=>{const data=JSON.parse(message.data);if(data.id){const request=pending.get(data.id);if(request){clearTimeout(request.timer);pending.delete(data.id);data.error?request.reject(new Error(data.error.message)):request.resolve(data.result);}}else if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.exception?.description||data.params.exceptionDetails.text);});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const next=++id;const timer=setTimeout(()=>{pending.delete(next);reject(new Error('Timeout: '+method));},15000);pending.set(next,{resolve,reject,timer});socket.send(JSON.stringify({id:next,method,params}));});
 const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||'Error de JavaScript');return result.result.value;};
 async function until(expression){for(let i=0;i<200;i++){if(await evaluate(expression))return;await wait(100);}throw new Error('No se cumplió: '+expression);}
 await call('Page.bringToFront');await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
 await call('Network.setCookie',{name:'club_session',value:token,url:base,path:'/',sameSite:'Strict'});
 await call('Page.navigate',{url:base+'/garaje.html'});await until("document.querySelector('[data-garage-management]')?.hidden===false");
 await evaluate("document.querySelector('[data-folder-form] input').value='Carpeta de prueba';document.querySelector('[data-folder-form]').requestSubmit()");
 await until("document.querySelectorAll('[data-folders] article').length===1");
 await evaluate("const f=document.querySelector('[data-member-form]');f.elements.pilot.value='Piloto de prueba';f.elements.phone.value='+34 600 123 456';f.elements.instagram.value='club_octavia_vrs_catalunya';f.elements.model.value='Octavia VRS MK4';f.elements.engine.value='2.0 TSI';f.elements.power.value='245 CV';f.elements.consent.checked=true;");
 const documentNode=await call('DOM.getDocument');const fileInput=await call('DOM.querySelector',{nodeId:documentNode.root.nodeId,selector:'[data-member-form] input[name=photos]'});
 await call('DOM.setFileInputFiles',{nodeId:fileInput.nodeId,files:[resolve('dist/assets/1-66228.jpg')]});
 const profileInput=await call('DOM.querySelector',{nodeId:documentNode.root.nodeId,selector:'[data-member-form] input[name=profilePhoto]'});await call('DOM.setFileInputFiles',{nodeId:profileInput.nodeId,files:[resolve('dist/assets/1-66228.jpg')]});
 await evaluate("document.querySelector('[data-member-form]').requestSubmit()");await until("document.querySelector('[data-garage-save-status]').textContent.includes('guardada')");
 assert.equal(await evaluate("document.querySelectorAll('.garage-member').length"),1);
 assert.ok(await evaluate("document.querySelector('.garage-member').textContent.includes('Piloto de prueba')"));
 assert.equal(raw.prepare('SELECT COUNT(*) n FROM garage_members').get().n,1);
 assert.equal(await evaluate("document.querySelector('.garage-whatsapp').href"),'https://wa.me/34600123456');await until("document.querySelector('.garage-pilot-avatar')?.complete&&document.querySelector('.garage-pilot-avatar').naturalWidth>0");
 await mkdir('artifacts',{recursive:true});await evaluate("document.querySelector('[data-folder-content]').scrollIntoView()");
 let screenshot=await call('Page.captureScreenshot',{format:'jpeg',quality:70});await writeFile('artifacts/garaje-ficha.jpg',Buffer.from(screenshot.data,'base64'));
 // Galería de eventos: crear carpeta, publicar una fotografía y consultarla.
 await call('Page.navigate',{url:base+'/galeria.html'});await until("document.querySelector('[data-gallery-management]')?.hidden===false");
 await evaluate("document.querySelector('[data-event-form]').elements.name.value='Ruta de prueba';document.querySelector('[data-event-form]').elements.category.value='Rutas';document.querySelector('[data-event-form]').requestSubmit()");
 await until("document.querySelectorAll('[data-event-folders] article').length===1");
 await evaluate("document.querySelector('[data-event-upload]').elements.consent.checked=true");
 const galleryDoc=await call('DOM.getDocument'),galleryInput=await call('DOM.querySelector',{nodeId:galleryDoc.root.nodeId,selector:'[data-event-upload] input[type=file]'});
 await call('DOM.setFileInputFiles',{nodeId:galleryInput.nodeId,files:[resolve('dist/assets/1-66228.jpg')]});
 await evaluate("document.querySelector('[data-event-upload]').requestSubmit()");await until("document.querySelector('[data-gallery-upload-status]').textContent.includes('1 fotos publicadas')");
 assert.equal(raw.prepare('SELECT COUNT(*) n FROM gallery_photos').get().n,1);
 await evaluate("document.querySelector('[data-event-photos] button').click()");assert.equal(await evaluate("document.querySelector('[data-event-lightbox]').open"),true);await evaluate("document.querySelector('[data-event-close]').click()");
 await evaluate("document.querySelector('[data-event-content]').scrollIntoView({behavior:'instant'})");screenshot=await call('Page.captureScreenshot',{format:'jpeg',quality:70});await writeFile('artifacts/galeria-evento.jpg',Buffer.from(screenshot.data,'base64'));
 // Visitante sin sesión: puede consultar las fichas, no gestionarlas.
 await call('Network.deleteCookies',{name:'club_session',url:base});await call('Page.navigate',{url:base+'/garaje.html'});await until("document.querySelectorAll('[data-folders] article').length===1");
 assert.equal(await evaluate("document.querySelector('[data-garage-management]').hidden"),true);
 await call('Page.navigate',{url:base+'/galeria.html'});await until("document.querySelectorAll('[data-event-folders] article').length===1");assert.equal(await evaluate("document.querySelector('[data-gallery-management]').hidden"),true);
 await call('Page.navigate',{url:base+'/index.html'});await until("document.querySelectorAll('#galeria .gallery-decoration').length===4");assert.equal(await evaluate("document.querySelectorAll('#galeria button,#galeria [data-image]').length"),0);assert.equal(await evaluate("document.querySelector('.gallery-access').getAttribute('href')"),'galeria.html');
 await until("document.querySelector('.notification-status')&&document.querySelector('.notification-status').textContent!=='Buscando novedades…'");
 await evaluate("window.__notificationSounds=0;window.addEventListener('club-notification-sound',()=>window.__notificationSounds++);document.querySelector('.notification-bell').scrollIntoView({behavior:'instant',block:'center'})");
 const bellPoint=await evaluate("(()=>{const r=document.querySelector('.notification-bell').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
 for(const type of ['mousePressed','mouseReleased'])await call('Input.dispatchMouseEvent',{type,...bellPoint,button:'left',clickCount:1});await wait(250);
 notificationNews=[{id:'browser-new-notification',title:'Nueva ruta de prueba',message:'Aviso de prueba',href:'index.html#calendario'}];
 await evaluate("document.querySelector('.notification-bell').click();document.querySelector('.notification-bell').click()");await until("window.__notificationSounds===1");
 await evaluate("document.querySelector('.notification-bell').click();document.querySelector('.notification-bell').click()");await wait(250);assert.equal(await evaluate("window.__notificationSounds"),1,'No repite el sonido de una notificación conocida');
 await evaluate("document.querySelector('.notification-bell').click()");

 await call('Page.navigate',{url:base+'/simulador.html?quality=low'});await until("document.querySelector('[data-race-canvas]')?.width>300");
 await until("document.querySelector('[data-race-canvas]').dataset.sceneryReady==='true'");
 await until("document.querySelector('[data-racing-stage]').dataset.renderer==='webgl2'");
 await until("document.querySelector('[data-race-canvas]').dataset.cockpitReady==='true'&&document.querySelector('[data-race-canvas]').dataset.rivalReady==='true'&&document.querySelector('[data-race-canvas]').dataset.circuitReady==='true'");
 const transparentRival=await evaluate("new Promise((resolve,reject)=>{const image=new Image();image.onerror=()=>reject(new Error('No carga el coche azul'));image.onload=()=>{const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const x=c.getContext('2d');x.drawImage(image,0,0);resolve([[0,0],[c.width-1,0],[0,c.height-1],[c.width-1,c.height-1]].every(([a,b])=>x.getImageData(a,b,1,1).data[3]===0))};image.src='assets/rival-octavia-azul.png';})");assert.equal(transparentRival,true,'El rival azul no tiene fondo opaco');
 for(const level of ['expert','intermediate','easy']){await evaluate(`document.querySelector('[data-race-level]').value='${level}';document.querySelector('[data-race-level]').dispatchEvent(new Event('change'))`);assert.equal(await evaluate("document.querySelector('[data-race-level]').value"),level);}
 await evaluate("document.querySelector('[data-race-start]').click();window.__raceImage=document.querySelector('[data-race-canvas]').toDataURL();window.__sceneryDistance=Number(document.querySelector('[data-race-canvas]').dataset.sceneryDistance);window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowUp',bubbles:true}));");
 await until("Number(document.querySelector('[data-race-canvas]').dataset.speed)>6");await evaluate("window.dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowUp',bubbles:true}))");
 assert.equal(await evaluate("document.querySelector('[data-race-start]').disabled"),true);
 console.log('DRIVING_3D_STATE '+JSON.stringify(await evaluate("({speed:document.querySelector('[data-race-canvas]').dataset.speed,distance:document.querySelector('[data-race-canvas]').dataset.sceneryDistance,status:document.querySelector('[data-race-status]').textContent,renderer:document.querySelector('[data-racing-stage]').dataset.renderer})")));
 assert.ok(await evaluate("Number(document.querySelector('[data-race-canvas]').dataset.sceneryDistance)>window.__sceneryDistance"),'El paisaje avanza al acelerar');
 const speed=await evaluate("Number(document.querySelector('[data-race-canvas]').dataset.speed)");assert.ok(speed>0,'El velocímetro digital sube con GAS');
 await evaluate("window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',bubbles:true}))");await until("Number(document.querySelector('[data-race-canvas]').dataset.speed)<"+speed);await evaluate("window.dispatchEvent(new KeyboardEvent('keyup',{code:'Space',bubbles:true}))");assert.ok(await evaluate("Number(document.querySelector('[data-race-canvas]').dataset.speed)")<speed,'El velocímetro baja al frenar');
 await evaluate("document.querySelector('[data-race-music]').scrollIntoView({block:'center',behavior:'instant'})");
 const musicPoint=await evaluate("(()=>{const r=document.querySelector('[data-race-music]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',...musicPoint});
 for(const type of ['mousePressed','mouseReleased'])await call('Input.dispatchMouseEvent',{type,...musicPoint,button:'left',clickCount:1});
 await wait(500);console.log('MUSIC_CHECK '+JSON.stringify(await evaluate("({status:document.querySelector('[data-race-status]').textContent,pressed:document.querySelector('[data-race-music]').getAttribute('aria-pressed'),music:document.querySelector('[data-racing-stage]').dataset.music,visibility:document.visibilityState})")));
 await until("document.querySelector('[data-race-music]').getAttribute('aria-pressed')==='true'");
 await until("(()=>{const a=document.querySelector('[data-race-radio]');return a&&!a.paused&&a.currentTime>0&&a.readyState>=2})()");
 assert.ok(await evaluate("document.querySelector('[data-race-radio]').currentSrc.endsWith('/assets/audio/radio-club.mp3')"),'La radio reproduce el MP3 enviado por el club');
 for(const type of ['mousePressed','mouseReleased'])await call('Input.dispatchMouseEvent',{type,...musicPoint,button:'left',clickCount:1});
 await until("document.querySelector('[data-race-music]').getAttribute('aria-pressed')==='false'");
 assert.equal(await evaluate("document.querySelector('[data-race-radio]').paused"),true,'Apaga la reproducción de la radio');

 assert.ok(await evaluate("document.querySelector('[data-race-canvas]').toDataURL()!==window.__raceImage"),'La vista se actualiza al conducir');
 await evaluate("document.querySelector('[data-racing-stage]').scrollIntoView({block:'center'})");screenshot=await call('Page.captureScreenshot',{format:'jpeg',quality:70});await writeFile('artifacts/circuito-interior.jpg',Buffer.from(screenshot.data,'base64'));
 const clip=await evaluate("(()=>{const r=document.querySelector('[data-racing-stage]').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:Math.min(1,640/r.width)}})()");const preview=await call('Page.captureScreenshot',{format:'jpeg',quality:25,clip});console.log('RACE_VISUAL_PREVIEW '+preview.data);
 assert.equal(await evaluate("document.querySelector('[data-racing-stage]').dataset.teslaTribute"),'ALBERTO');
 assert.equal(await evaluate("document.querySelector('[data-racing-stage]').dataset.teslaColor"),'white');
 assert.equal(await evaluate("document.querySelector('[data-racing-stage]').dataset.teslaAppearance"),'detailed-transparent-rear');
 await until("document.querySelector('[data-race-canvas]').dataset.teslaReady==='true'");
 assert.equal(await evaluate("new Promise(resolve=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);resolve(i.width>=1024&&x.getImageData(0,0,1,1).data[3]===0)};i.onerror=()=>resolve(false);i.src='assets/tesla-model3-alberto.png'})"),true);

 console.log('GRAPHICS_3D_OK '+JSON.stringify(await evaluate("({...document.querySelector('[data-racing-stage]').dataset})")));
 await evaluate("document.querySelector('[data-race-pause]').click()");assert.ok(await evaluate("document.querySelector('[data-race-status]').textContent.includes('pausa')"));
 const pausedScenery=await evaluate("document.querySelector('[data-race-canvas]').dataset.sceneryDistance");await wait(300);assert.equal(await evaluate("document.querySelector('[data-race-canvas]').dataset.sceneryDistance"),pausedScenery,'El paisaje se detiene con la carrera en pausa');
 // Ejecuta la secuencia de adelantamiento sobre el renderizador real y comprueba su retirada.
 await evaluate("(async()=>{const stage=document.querySelector('[data-racing-stage]'),host=document.createElement('div');Object.assign(host.style,{position:'absolute',inset:0,zIndex:8});stage.append(host);const {createOvertakeCinematic}=await import('./racing-cinematic.mjs?v=20261024-explosion');window.__cinematicHost=host;window.__cinematic=createOvertakeCinematic(host);window.__cinematic.update({position:1,phase:'running'},0);window.__cinematic.update({position:2,phase:'running'},0);})()");
 await until("window.__cinematicHost.dataset.mirror3d==='ready'");
 await evaluate("window.__cinematic.update({position:2,phase:'running'},1.6)");
 assert.equal(await evaluate("window.__cinematicHost.querySelector('.race-mirror-cinematic').hidden"),false);assert.equal(await evaluate("window.__cinematicHost.querySelector('.race-mirror-cinematic span').textContent"),'TESLA MODEL 3 FUERA DE CARRERA');
 const fireClip=await evaluate("(()=>{const r=document.querySelector('[data-racing-stage]').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:Math.min(1,640/r.width)}})()");const firePreview=await call('Page.captureScreenshot',{format:'jpeg',quality:60,clip:fireClip});console.log('RACE_FIRE_PREVIEW '+firePreview.data);await writeFile('artifacts/circuito-incendio.jpg',Buffer.from(firePreview.data,'base64'));
 await evaluate("window.__cinematic.update({position:2,phase:'paused'},10)");assert.equal(await evaluate("window.__cinematicHost.querySelector('.race-mirror-cinematic').hidden"),false);assert.equal(await evaluate("window.__cinematicHost.querySelector('.race-mirror-cinematic span').textContent"),'TESLA MODEL 3 FUERA DE CARRERA');
 await evaluate("window.__cinematic.update({position:2,phase:'running'},6)");assert.equal(await evaluate("window.__cinematicHost.querySelector('.race-mirror-cinematic').hidden"),true);
 await evaluate("window.__cinematic.reset();window.__cinematic.dispose();window.__cinematicHost.remove()");console.log('CINEMATICA_OK: adelantamiento, retrovisor 3D, pausa, desaparición y reinicio.');
 // Revisión próxima del Tesla con el mismo mundo 3D, para comprobar silueta, escala y matrícula.
 await evaluate("(async()=>{const stage=document.querySelector('[data-racing-stage]'),host=document.createElement('div');host.className='race-stage';Object.assign(host.style,{position:'absolute',inset:0,width:'100%',height:'100%',zIndex:7,border:0});stage.append(host);const {createRacingWorld}=await import('./racing-world3d.mjs?v=20261024-realtesla'),{createRace}=await import('./racing-physics.mjs');const world=await createRacingWorld(host);world.resize(stage.clientWidth,stage.clientHeight);const race=createRace();race.rivals[0].distance=150;race.rivals[1].distance=170;const tesla=race.rivals.find(c=>c.model==='tesla-model-3');tesla.distance=11;tesla.x=0;world.render(race);window.__teslaCleanup=()=>{world.dispose();host.remove()};})()");
 const teslaClip=await evaluate("(()=>{const r=document.querySelector('[data-racing-stage]').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:Math.min(1,800/r.width)}})()");const teslaPreview=await call('Page.captureScreenshot',{format:'jpeg',quality:70,clip:teslaClip});console.log('TESLA_DETAIL_PREVIEW '+teslaPreview.data);await writeFile('artifacts/tesla-realista.jpg',Buffer.from(teslaPreview.data,'base64'));await evaluate("window.__teslaCleanup()");
 // Captura de una curva y sus desniveles con el mismo renderizador de producción.
 await evaluate("(async()=>{const stage=document.querySelector('[data-racing-stage]'),overlay=document.createElement('div');overlay.className='race-stage';Object.assign(overlay.style,{position:'absolute',inset:'0',width:'100%',height:'100%',border:'0',zIndex:'5'});stage.append(overlay);const {createRacingWorld}=await import('./racing-world3d.mjs?v=20261024-1'),{createRace}=await import('./racing-physics.mjs?v=20261024-3d');const world=await createRacingWorld(overlay);world.resize(stage.clientWidth,stage.clientHeight);const race=createRace(null,'expert');race.distance=race.trackLength*.34;world.render(race);const cockpit=new Image();cockpit.src=document.querySelector('[data-race-canvas]').toDataURL();Object.assign(cockpit.style,{position:'absolute',inset:'0',width:'100%',height:'100%',zIndex:'1'});overlay.append(cockpit);window.__curvePreviewCleanup=()=>{world.dispose();overlay.remove();};})()");
 const curveClip=await evaluate("(()=>{const r=document.querySelector('[data-racing-stage]').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:Math.min(1,640/r.width)}})()");const curvePreview=await call('Page.captureScreenshot',{format:'jpeg',quality:45,clip:curveClip});console.log('RACE_CURVE_PREVIEW '+curvePreview.data);await writeFile('artifacts/circuito-curva.jpg',Buffer.from(curvePreview.data,'base64'));await evaluate("window.__curvePreviewCleanup()");
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 await call('Page.navigate',{url:base+'/simulador.html?quality=low'});await until("document.querySelector('[data-race-canvas]')?.width>300");
 await until("document.querySelector('[data-race-canvas]').dataset.sceneryReady==='true'");
 await until("document.querySelector('[data-racing-stage]').dataset.renderer==='webgl2'");
 await until("document.querySelector('[data-race-canvas]').dataset.cockpitReady==='true'&&document.querySelector('[data-race-canvas]').dataset.rivalReady==='true'&&document.querySelector('[data-race-canvas]').dataset.circuitReady==='true'");
 await evaluate("document.querySelector('[data-race-start]').click();document.querySelector('.race-touch-controls').scrollIntoView({block:'center'});");
 const positions=await evaluate("['accelerate','left'].map(action=>{const b=document.querySelector('[data-drive='+action+']').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}})");
 await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:positions.map((point,index)=>({...point,id:index+1}))});await wait(900);await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.equal(await evaluate("document.querySelectorAll('.is-held').length"),0,'Libera los controles multitáctiles');
 await evaluate("document.querySelector('[data-racing-stage]').scrollIntoView({block:'center'})");screenshot=await call('Page.captureScreenshot',{format:'jpeg',quality:70});await writeFile('artifacts/circuito-movil.jpg',Buffer.from(screenshot.data,'base64'));
 const mobileClip=await evaluate("(()=>{const r=document.querySelector('[data-racing-stage]').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()");const mobilePreview=await call('Page.captureScreenshot',{format:'jpeg',quality:35,clip:mobileClip});console.log('RACE_MOBILE_PREVIEW '+mobilePreview.data);
 await call('Page.navigate',{url:base+'/simulador.html?render=2d'});await until("document.querySelector('[data-racing-stage]')?.dataset.renderer==='2d-fallback'");await until("document.querySelector('[data-race-canvas]').dataset.cockpitReady==='true'");
 await evaluate("document.querySelector('[data-race-start]').click();window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowUp',bubbles:true}))");await until("Number(document.querySelector('[data-race-canvas]').dataset.speed)>0");await evaluate("window.dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowUp',bubbles:true}));document.querySelector('[data-race-reset]').click()");assert.equal(await evaluate("Number(document.querySelector('[data-race-canvas]').dataset.speed)"),0);console.log('FALLBACK_2D_OK: conducción y reinicio conservados.');
 assert.deepEqual(errors,[],'Sin errores JavaScript en garaje ni circuito');
 console.log('NAVEGADOR_OK: carpeta, foto real, ficha pública, gestión privada, circuito, pausa y controles multitáctiles.');
}finally{socket?.close();chrome.kill('SIGTERM');await new Promise(resolve=>server.close(resolve));raw.close();await rm(profile,{recursive:true,force:true}).catch(()=>{});}
