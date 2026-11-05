// Comprobación aislada del comunicado y la lista privada, sin datos de producción.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {tmpdir} from 'node:os';
import {handleMarketRequest} from '../server/market.mjs';

const root=resolve('dist'),raw=new DatabaseSync(':memory:');raw.exec(await readFile('server/schema.sql','utf8'));
raw.prepare('INSERT INTO market_admins VALUES(?,?,?,?,?)').run('event-admin','event-admin@example.com','unused','salt',1);
const token=crypto.randomUUID();raw.prepare('INSERT INTO market_sessions VALUES(?,?,?)').run(createHash('sha256').update(token).digest('hex'),'event-admin',Math.floor(Date.now()/1000)+3600);
const prepare=sql=>{const statement=raw.prepare(sql);let args=[];const query={bind(...values){args=values;return query;},async first(){return statement.get(...args)||null;},async all(){return {results:statement.all(...args)};},async run(){return {meta:{changes:Number(statement.run(...args).changes)}};}};return query;};
const db={prepare,async batch(items){const results=[];for(const item of items)results.push(await item.run());return results;}};
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
let base='';
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1');if(url.pathname.startsWith('/api/')){const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks),response=await handleMarketRequest(new Request(base+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})}),{MARKET_DB:db});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;}const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!path.startsWith(root+'/'))throw Error('Ruta no permitida');const content=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(content);}catch{res.writeHead(404);res.end('No disponible');}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));base='http://127.0.0.1:'+server.address().port;
const chromePath=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);if(!chromePath)throw Error('Chrome no está instalado.');
const profile=await mkdtemp(resolve(tmpdir(),'octavia-event-pages-')),chrome=spawn(chromePath,['--headless','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=9224','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
const wait=ms=>new Promise(done=>setTimeout(done,ms));let socket;
try{
 for(let attempt=0;attempt<200;attempt++){try{if((await fetch('http://127.0.0.1:9224/json/version')).ok)break;}catch{}if(attempt===199)throw Error('Chrome no arrancó.');await wait(100);}
 const target=await(await fetch('http://127.0.0.1:9224/json/new?about:blank',{method:'PUT'})).json();socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((done,fail)=>{socket.addEventListener('open',done,{once:true});socket.addEventListener('error',fail,{once:true});});
 let callId=0;const pending=new Map();socket.addEventListener('message',message=>{const data=JSON.parse(message.data),task=pending.get(data.id);if(!task)return;pending.delete(data.id);data.error?task.reject(Error(data.error.message)):task.resolve(data.result);});
 const call=(method,params={})=>new Promise((resolveCall,reject)=>{const id=++callId;pending.set(id,{resolve:resolveCall,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||'Error del navegador');return result.result.value;};
 const until=async expression=>{for(let attempt=0;attempt<200;attempt++){try{if(await evaluate(expression))return;}catch{}await wait(100);}throw Error('No se cumplió: '+expression);};
 await call('Page.enable');await call('Runtime.enable');await call('Network.enable');
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await call('Page.navigate',{url:base+'/evento-calcotada-2027.html'});await until("document.body?.textContent.includes('Fecha límite del resto del pago')");
 assert.ok(await evaluate("document.body.textContent.includes('23/01/2027')&&document.body.textContent.includes('17/01/2027')&&document.body.textContent.includes('Como último recurso')"));assert.equal(await evaluate("document.querySelectorAll('.event-menu-card').length"),3);assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth"),false);
 await call('Page.navigate',{url:base+'/asistentes-evento.html?evento=calcotada-vrs-2027'});await until("document.querySelector('[data-login-panel]')?.hidden===false");assert.equal(await evaluate("document.querySelector('[data-attendees-root]').hidden"),true);
 await call('Network.setCookie',{name:'club_session',value:token,url:base,path:'/',sameSite:'Strict'});await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
 await call('Page.navigate',{url:base+'/index.html'});await until("document.querySelector('[data-club-calendar]')?.dataset.calendarLoaded==='true'&&document.querySelector('.event-attendees-open[href*=\"calcotada-vrs-2027\"]')");assert.equal(await evaluate("document.querySelector('[data-event-attendees]')"),null);
 await call('Page.navigate',{url:base+'/asistentes-evento.html?evento=calcotada-vrs-2027'});await until("document.querySelector('[data-event-attendees] .event-attendees-status')?.textContent.includes('Todavía')");assert.equal(await evaluate("document.querySelectorAll('.event-attendees-table th').length"),10);assert.equal(await evaluate("document.querySelector('.event-attendees-badge').textContent"),'Abierta');assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth"),false);
 await evaluate("(()=>{const d=document.querySelector('[data-event-attendees]');d.querySelector('.event-attendees-add').click();const f=d.querySelector('form');f.elements.pilotName.value='Piloto de lista';f.elements.attendees.value='3';f.elements.plate.value='1234 VRS';f.elements.calcotada.value='2';f.elements.vegetarian.value='1';f.elements.depositEuros.value='60.50';f.elements.balanceEuros.value='45';f.requestSubmit()})()");await until("document.querySelector('[data-event-attendees] tbody')?.textContent.includes('Piloto de lista')");assert.equal(raw.prepare('SELECT deposit_cents FROM club_event_attendees').get().deposit_cents,6050);
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth"),false);assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-event-attendees] thead')).display"),'none');
 await call('Network.deleteCookies',{name:'club_session',url:base});await call('Page.reload');await until("document.querySelector('[data-login-panel]')?.hidden===false");assert.equal(await evaluate("document.querySelector('[data-attendees-root]').hidden"),true);assert.equal(await evaluate("document.body.textContent.includes('Piloto de lista')"),false);
 console.log('EVENTO_ASISTENTES_NAVEGADOR_OK: comunicado móvil, acceso privado, tabla completa, alta persistente y cierre anónimo.');
}finally{socket?.close();if(chrome.exitCode===null){chrome.kill('SIGTERM');await Promise.race([new Promise(done=>chrome.once('exit',done)),wait(3000)]);}server.close();raw.close();await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
