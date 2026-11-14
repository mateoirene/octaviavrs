// Comprobación de las páginas reales en Chrome, con SQLite efímero y sin datos de producción.
import assert from 'node:assert/strict';
import {OWNER_ADMIN_EMAIL} from '../server/config.mjs';
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
raw.prepare('INSERT INTO market_admins VALUES(?,?,?,?,?)').run('c15706ae-7b72-4779-9785-8c2f5c1e50ea',OWNER_ADMIN_EMAIL,'unused','salt',1);
raw.exec("INSERT INTO garage_folders VALUES('club','Miembros',1);INSERT INTO garage_members VALUES('cuesta-browser','club','Cuesta','','Octavia VRS','','','','','',1,1,'test')");
const groupInvite='https://chat.whatsapp.com/BBBBBBBBBBBBBBBBBBBBBB?s=cl&p=a&iam=2';raw.prepare("INSERT INTO market_settings(key,value) VALUES('club-whatsapp-invite-url',?)").run(groupInvite);
const token=crypto.randomUUID();raw.prepare('INSERT INTO market_sessions VALUES(?,?,?)').run(createHash('sha256').update(token).digest('hex'),'c15706ae-7b72-4779-9785-8c2f5c1e50ea',Math.floor(Date.now()/1000)+3600);
const prepare=sql=>{const statement=raw.prepare(sql);let args=[];const values=()=>args.map(value=>value instanceof ArrayBuffer?Buffer.from(value):value);const query={bind(...values){args=values;return query;},async first(){return statement.get(...values())||null;},async all(){return {results:statement.all(...values())};},async run(){return {meta:{changes:Number(statement.run(...values()).changes)}};}};return query;};
const db={prepare,async batch(items){raw.exec('BEGIN');try{const results=[];for(const item of items)results.push(await item.run());raw.exec('COMMIT');return results;}catch(error){raw.exec('ROLLBACK');throw error;}}};
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.mp4':'video/mp4','.webmanifest':'application/manifest+json'};
let notificationNews=[];let analyticsTestConfig=null;const analyticsBodies=[];
const assetRequests=[];
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1');assetRequests.push(url.pathname);if(url.pathname==='/api/analytics/config'&&analyticsTestConfig){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(analyticsTestConfig));return;}if(url.pathname==='/data/notificaciones.json'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(notificationNews));return;}if(url.pathname==='/api/club/motor-news'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({items:[{id:'motor-test',kind:'motor',label:'Octavia vRS · Škoda España',title:'Škoda Octavia VRS de prueba',description:'Fuente oficial de prueba para validar el visor.',href:'https://www.skoda.es/modelos/octavia/octavia_rs',image:'assets/cabecera-coches-atardecer.jpg',source:'Škoda España',published:'2026-10-26T10:00:00Z'}],stale:false}));return;}if(url.pathname==='/api/club/weather'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({location:'Barcelona',temperature:19.4,code:2,observedAt:'2026-10-26T12:00'}));return;}if(url.pathname.startsWith('/api/')){const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);if(url.pathname==='/api/analytics/collect')try{analyticsBodies.push(JSON.parse(body.toString()));}catch{}const response=await handleMarketRequest(new Request(base+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{} )}),{MARKET_DB:db});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;}const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':extname(url.pathname)?url.pathname:url.pathname+'.html'));if(!path.startsWith(root+'/')){res.writeHead(403);res.end();return;}const content=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(content);}catch{res.writeHead(404);res.end('No disponible');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
const chromePath=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);if(!chromePath)throw new Error('Chrome no está instalado en el entorno de comprobación.');
const profile=await mkdtemp(resolve(tmpdir(),'octavia-ui-'));const chrome=spawn(chromePath,['--headless','--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-breakpad','--disable-crash-reporter','--no-first-run','--remote-debugging-port=9223','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});let chromeErrors='';chrome.stderr.on('data',chunk=>{chromeErrors=(chromeErrors+chunk.toString()).slice(-3000);});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));let socket;
try{
 for(let i=0;i<200;i++){try{const response=await fetch('http://127.0.0.1:9223/json/version');if(response.ok)break;}catch{}if(i===199||chrome.exitCode!==null)throw new Error('Chrome no arrancó: '+chromeErrors);await wait(100);}
 const target=await(await fetch('http://127.0.0.1:9223/json/new?about:blank',{method:'PUT'})).json();socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 let id=0;const pending=new Map(),errors=[];
 socket.addEventListener('message',message=>{const data=JSON.parse(message.data);if(data.id){const request=pending.get(data.id);if(request){clearTimeout(request.timer);pending.delete(data.id);data.error?request.reject(new Error(data.error.message)):request.resolve(data.result);}}else if(data.method==='Page.javascriptDialogOpening'){void call('Page.handleJavaScriptDialog',{accept:true});}else if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.exception?.description||data.params.exceptionDetails.text);});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const callOrigin=new Error('Origen de la comprobación');const next=++id;const timer=setTimeout(()=>{pending.delete(next);reject(new Error('Timeout: '+method));},['Page.captureScreenshot','Runtime.evaluate'].includes(method)?45000:15000);pending.set(next,{resolve,reject:error=>{error.message+=' '+callOrigin.stack.split('\n').slice(1,4).join(' ');reject(error);},timer});socket.send(JSON.stringify({id:next,method,params}));});
 const evaluate=async expression=>{const origin=new Error('Origen de la comprobación');let result;try{result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});}catch(error){error.message+=' '+origin.stack.split('\n').slice(1,5).join(' ');throw error;}if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||'Error de JavaScript');return result.result.value;};
 async function until(expression,attempts=200){for(let i=0;i<attempts;i++){try{if(await evaluate(expression))return;}catch(error){if(!/Execution context was destroyed|Cannot find context|Inspected target navigated or closed/.test(error.message))throw error;}await wait(100);}throw new Error('No se cumplió: '+expression);}
 async function pressGasAfterStart(){await until("document.querySelector('[data-race-start]').disabled===true");await evaluate("document.querySelector('[data-racing-stage]').focus({preventScroll:true});window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowUp',bubbles:true}))");}
 await call('Page.bringToFront');await call('Page.enable');await call('Page.addScriptToEvaluateOnNewDocument',{source:"if(!sessionStorage.getItem('analytics-test-run'))localStorage.setItem('club-consent-v1',JSON.stringify({version:1,at:Date.now(),analytics:false,recordings:false}));"});await call('Runtime.enable');await call('Network.enable');await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
 await call('Network.setCookie',{name:'club_session',value:token,url:base,path:'/',sameSite:'Strict'});


 await call('Network.deleteCookies',{name:'club_session',url:base});
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
 await call('Emulation.setCPUThrottlingRate',{rate:4});
 await call('Page.navigate',{url:base+'/index.html'});
 await until("document.readyState==='complete'&&document.querySelector('.hero-img')?.complete&&document.querySelector('.hero-img').naturalWidth>0&&document.querySelector('.hero-art').classList.contains('flag-ready')");
 assert.equal(await evaluate("document.querySelector('.hero-img').currentSrc.includes('bandera-club-octavia-transparente.webp')"),true,'Bandera optimizada con transparencia');
 assert.equal(assetRequests.some(url=>url.endsWith('.mp4')),false,'No se descarga el vídeo antes de verlo');
 assert.equal(await evaluate("document.querySelector('[data-deferred-video]').paused"),true);
 assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth+2"),false);
 for(const stem of ['bandera-club-octavia-transparente','vrs-emblema-cromado','garaje-de-miembros-transparente','escape-difusor-galeria']){const before=(await readFile('dist/assets/'+stem+'.png')).length,after=(await readFile('dist/assets/'+stem+'.webp')).length;assert.ok(after<before*.5,'Imagen de inicio al menos un 50% más ligera: '+stem);console.log('IMAGEN_INICIO '+stem+' '+JSON.stringify({before,after}));}
 await mkdir('artifacts',{recursive:true});const shot=await call('Page.captureScreenshot',{format:'jpeg',quality:80});await writeFile('artifacts/inicio-movil-optimizado.jpg',Buffer.from(shot.data,'base64'));
 await evaluate("document.querySelector('[data-deferred-video]').scrollIntoView({block:'center',behavior:'instant'})");
 await until("document.querySelector('[data-deferred-video]').dataset.videoLoaded==='true'&&document.querySelector('[data-deferred-video]').readyState>=2");
 assert.ok(assetRequests.some(url=>url.endsWith('.mp4')),'El vídeo se carga al llegar a su sección');
 await evaluate("document.querySelector('[data-deferred-video]').pause()");
 await until("document.querySelector('[data-deferred-video]').paused");
 await evaluate("window.scrollTo(0,0)");await evaluate("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
 await evaluate("document.querySelector('[data-deferred-video]').scrollIntoView({block:'center',behavior:'instant'})");await evaluate("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
 assert.equal(await evaluate("document.querySelector('[data-deferred-video]').paused"),true,'Se respeta la pausa del usuario');
 await evaluate("(async()=>{const {deferImage}=await import('./startup-media.mjs?v=20261114-inicio-rapido');const img=document.createElement('img');img.id='lazy-poster-test';img.width=300;img.height=200;img.style.cssText='display:block;margin-top:10000px';deferImage(img,'assets/1-66228.jpg?lazy-poster-test');document.body.append(img);})()");
 await evaluate("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
 assert.equal(await evaluate("document.querySelector('#lazy-poster-test').hasAttribute('src')"),false,'El cartel fuera de pantalla no compite con la apertura');
 await evaluate("document.querySelector('#lazy-poster-test').scrollIntoView({block:'center',behavior:'instant'})");await until("document.querySelector('#lazy-poster-test').complete&&document.querySelector('#lazy-poster-test').naturalWidth>0");
 console.log('INICIO_MOVIL_OK: portada completa, bandera visible, vídeo diferido, pausa del usuario y carteles bajo demanda.');
}finally{socket?.close();chrome.kill('SIGTERM');await new Promise(resolve=>server.close(resolve));raw.close();await rm(profile,{recursive:true,force:true}).catch(()=>{});}
