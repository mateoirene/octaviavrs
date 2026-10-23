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
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1');if(url.pathname.startsWith('/api/')){const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);const response=await handleMarketRequest(new Request(base+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{} )}),{MARKET_DB:db});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;}const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!path.startsWith(root+'/')){res.writeHead(403);res.end();return;}const content=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(content);}catch{res.writeHead(404);res.end('No disponible');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
const chromePath=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);if(!chromePath)throw new Error('Chrome no está instalado en el entorno de comprobación.');
const profile=await mkdtemp(resolve(tmpdir(),'octavia-ui-'));const chrome=spawn(chromePath,['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-breakpad','--disable-crash-reporter','--no-first-run','--remote-debugging-port=9222','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});let chromeErrors='';chrome.stderr.on('data',chunk=>{chromeErrors=(chromeErrors+chunk.toString()).slice(-3000);});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));let socket;
try{
 for(let i=0;i<200;i++){try{const response=await fetch('http://127.0.0.1:9222/json/version');if(response.ok)break;}catch{}if(i===199||chrome.exitCode!==null)throw new Error('Chrome no arrancó: '+chromeErrors);await wait(100);}
 const target=await(await fetch('http://127.0.0.1:9222/json/new?about:blank',{method:'PUT'})).json();socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 let id=0;const pending=new Map(),errors=[];
 socket.addEventListener('message',message=>{const data=JSON.parse(message.data);if(data.id){const request=pending.get(data.id);if(request){clearTimeout(request.timer);pending.delete(data.id);data.error?request.reject(new Error(data.error.message)):request.resolve(data.result);}}else if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.exception?.description||data.params.exceptionDetails.text);});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const next=++id;const timer=setTimeout(()=>{pending.delete(next);reject(new Error('Timeout: '+method));},15000);pending.set(next,{resolve,reject,timer});socket.send(JSON.stringify({id:next,method,params}));});
 const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||'Error de JavaScript');return result.result.value;};
 async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await wait(100);}throw new Error('No se cumplió: '+expression);}
 await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
 await call('Network.setCookie',{name:'club_session',value:token,url:base,path:'/',sameSite:'Strict'});
 await call('Page.navigate',{url:base+'/garaje.html'});await until("document.querySelector('[data-garage-management]')?.hidden===false");
 await evaluate("document.querySelector('[data-folder-form] input').value='Carpeta de prueba';document.querySelector('[data-folder-form]').requestSubmit()");
 await until("document.querySelectorAll('[data-folders] article').length===1");
 await evaluate("const f=document.querySelector('[data-member-form]');f.elements.pilot.value='Piloto de prueba';f.elements.instagram.value='club_octavia_vrs_catalunya';f.elements.model.value='Octavia VRS MK4';f.elements.engine.value='2.0 TSI';f.elements.power.value='245 CV';f.elements.consent.checked=true;");
 const documentNode=await call('DOM.getDocument');const fileInput=await call('DOM.querySelector',{nodeId:documentNode.root.nodeId,selector:'[data-member-form] input[type=file]'});
 await call('DOM.setFileInputFiles',{nodeId:fileInput.nodeId,files:[resolve('dist/assets/1-66228.jpg')]});
 await evaluate("document.querySelector('[data-member-form]').requestSubmit()");await until("document.querySelector('[data-garage-save-status]').textContent.includes('guardada')");
 assert.equal(await evaluate("document.querySelectorAll('.garage-member').length"),1);
 assert.ok(await evaluate("document.querySelector('.garage-member').textContent.includes('Piloto de prueba')"));
 assert.equal(raw.prepare('SELECT COUNT(*) n FROM garage_members').get().n,1);
 await mkdir('artifacts',{recursive:true});await evaluate("document.querySelector('[data-folder-content]').scrollIntoView()");
 let screenshot=await call('Page.captureScreenshot',{format:'jpeg',quality:70});await writeFile('artifacts/garaje-ficha.jpg',Buffer.from(screenshot.data,'base64'));
 // Visitante sin sesión: puede consultar las fichas, no gestionarlas.
 await call('Network.deleteCookies',{name:'club_session',url:base});await call('Page.navigate',{url:base+'/garaje.html'});await until("document.querySelectorAll('[data-folders] article').length===1");
 assert.equal(await evaluate("document.querySelector('[data-garage-management]').hidden"),true);
 await call('Page.navigate',{url:base+'/simulador.html'});await until("document.querySelector('[data-race-canvas]')?.width>300");
 await until("document.querySelector('canvas').dataset.cockpitReady==='true'&&document.querySelector('canvas').dataset.rivalReady==='true'&&document.querySelector('canvas').dataset.circuitReady==='true'");
 for(const level of ['expert','intermediate','easy']){await evaluate(`document.querySelector('[data-race-level]').value='${level}';document.querySelector('[data-race-level]').dispatchEvent(new Event('change'))`);assert.equal(await evaluate("document.querySelector('[data-race-level]').value"),level);}
 await evaluate("document.querySelector('[data-race-start]').click();window.__raceImage=document.querySelector('canvas').toDataURL();window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowUp',bubbles:true}));");
 await wait(1800);await evaluate("window.dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowUp',bubbles:true}))");
 assert.equal(await evaluate("document.querySelector('[data-race-start]').disabled"),true);
 const speed=await evaluate("Number(document.querySelector('canvas').dataset.speed)");assert.ok(speed>0,'El velocímetro digital sube con GAS');
 await evaluate("window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',bubbles:true}))");await wait(400);await evaluate("window.dispatchEvent(new KeyboardEvent('keyup',{code:'Space',bubbles:true}))");assert.ok(await evaluate("Number(document.querySelector('canvas').dataset.speed)")<speed,'El velocímetro baja al frenar');
 await evaluate("document.querySelector('[data-race-music]').scrollIntoView({block:'center'})");
 const musicPoint=await evaluate("(()=>{const r=document.querySelector('[data-race-music]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
 for(const type of ['mousePressed','mouseReleased'])await call('Input.dispatchMouseEvent',{type,...musicPoint,button:'left',clickCount:1});
 await until("document.querySelector('[data-race-music]').getAttribute('aria-pressed')==='true'");
 for(const type of ['mousePressed','mouseReleased'])await call('Input.dispatchMouseEvent',{type,...musicPoint,button:'left',clickCount:1});
 await until("document.querySelector('[data-race-music]').getAttribute('aria-pressed')==='false'");

 assert.ok(await evaluate("document.querySelector('canvas').toDataURL()!==window.__raceImage"),'La vista se actualiza al conducir');
 await evaluate("document.querySelector('[data-racing-stage]').scrollIntoView({block:'center'})");screenshot=await call('Page.captureScreenshot',{format:'jpeg',quality:70});await writeFile('artifacts/circuito-interior.jpg',Buffer.from(screenshot.data,'base64'));
 const clip=await evaluate("(()=>{const r=document.querySelector('[data-racing-stage]').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:Math.min(1,640/r.width)}})()");const preview=await call('Page.captureScreenshot',{format:'jpeg',quality:25,clip});console.log('RACE_VISUAL_PREVIEW '+preview.data);
 await evaluate("document.querySelector('[data-race-pause]').click()");assert.ok(await evaluate("document.querySelector('[data-race-status]').textContent.includes('pausa')"));
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 await call('Page.navigate',{url:base+'/simulador.html'});await until("document.querySelector('[data-race-canvas]')?.width>300");
 await until("document.querySelector('canvas').dataset.cockpitReady==='true'&&document.querySelector('canvas').dataset.rivalReady==='true'&&document.querySelector('canvas').dataset.circuitReady==='true'");
 await evaluate("document.querySelector('[data-race-start]').click();document.querySelector('.race-touch-controls').scrollIntoView({block:'center'});");
 const positions=await evaluate("['accelerate','left'].map(action=>{const b=document.querySelector('[data-drive='+action+']').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}})");
 await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:positions.map((point,index)=>({...point,id:index+1}))});await wait(900);await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.equal(await evaluate("document.querySelectorAll('.is-held').length"),0,'Libera los controles multitáctiles');
 await evaluate("document.querySelector('[data-racing-stage]').scrollIntoView({block:'center'})");screenshot=await call('Page.captureScreenshot',{format:'jpeg',quality:70});await writeFile('artifacts/circuito-movil.jpg',Buffer.from(screenshot.data,'base64'));
 assert.deepEqual(errors,[],'Sin errores JavaScript en garaje ni circuito');
 console.log('NAVEGADOR_OK: carpeta, foto real, ficha pública, gestión privada, circuito, pausa y controles multitáctiles.');
}finally{socket?.close();chrome.kill('SIGTERM');await new Promise(resolve=>server.close(resolve));raw.close();await rm(profile,{recursive:true,force:true}).catch(()=>{});}
