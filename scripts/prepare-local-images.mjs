// Production assets must be prepared even when the browser test suite is skipped.
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
const stems=['galeria-volante-club','galeria-asientos-club','galeria-emblema-lluvia','galeria-vrs-lluvia','cesped-circuito'];
const profile=await mkdtemp(resolve(tmpdir(),'octavia-image-build-'));
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Preparar imágenes</title>');return;}const stem=path.slice(1).replace(/\.png$/,'');if(!stems.includes(stem))throw Error('path');res.setHeader('Content-Type','image/png');res.end(await readFile(resolve('dist/assets',stem+'.png')));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const chrome=spawn(process.env.CHROME_BIN||'google-chrome',['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
let socket;const pending=new Map();
try{
 let port;for(let i=0;i<600;i++){try{port=Number((await readFile(resolve(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);if(port>0)break;}catch{if(chrome.exitCode!==null)throw Error('Chrome no arrancó');await new Promise(r=>setTimeout(r,100));}}if(!port)throw Error('Timeout de Chrome');
 const target=await(await fetch('http://127.0.0.1:'+port+'/json/new?'+base,{method:'PUT'})).json();socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});let id=0;
 socket.addEventListener('message',e=>{const d=JSON.parse(e.data),p=pending.get(d.id);if(p){clearTimeout(p.timer);pending.delete(d.id);d.error?p.reject(Error(d.error.message)):p.resolve(d.result);}});
 const call=(method,params)=>new Promise((resolve,reject)=>{const next=++id,timer=setTimeout(()=>{pending.delete(next);reject(Error('Timeout '+method));},30000);pending.set(next,{resolve,reject,timer});socket.send(JSON.stringify({id:next,method,params}));});
 await call('Page.enable',{});await call('Page.navigate',{url:base});let ready=false;for(let i=0;i<100;i++){const r=await call('Runtime.evaluate',{expression:'location.origin==='+JSON.stringify(base)+' && document.readyState==="complete"',returnByValue:true});if(r.result.value){ready=true;break;}await new Promise(r=>setTimeout(r,50));}if(!ready)throw Error('No se abrió el origen de las imágenes');
 for(const stem of stems){
  const expression=`(async()=>{const image=new Image();image.src=${JSON.stringify(base+'/'+stem+'.png')};await image.decode();const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;c.getContext('2d').drawImage(image,0,0);return c.toDataURL('image/jpeg',.86).split(',')[1];})()`;
  const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||'No se pudo codificar '+stem);const bytes=Buffer.from(r.result.value,'base64');if(bytes.length<10000||bytes[0]!==255||bytes[1]!==216)throw Error('JPEG inválido '+stem);await writeFile(resolve('dist/assets',stem+'.jpg'),bytes);console.log('IMAGEN_LOCAL_PREPARADA '+stem+' '+bytes.length+' bytes');
 }
}finally{for(const p of pending.values())clearTimeout(p.timer);socket?.close();chrome.kill();server.close();await new Promise(r=>setTimeout(r,200));await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});}
