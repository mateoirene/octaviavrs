import {test} from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/assets/cinematic/[[path]].js';
const bytes=Uint8Array.from({length:256},(_,i)=>i);
const env={ASSETS:{async fetch(request){assert.equal(request.headers.get('range'),null);return new Response(bytes,{headers:{'Content-Type':'video/mp4','Content-Length':'256',ETag:'"film-v1"'}});}}};
const send=(range,extra={})=>onRequest({request:new Request('https://club.example/assets/cinematic/octavia-cinematica-web.mp4',{headers:{...(range?{Range:range}:{}),...extra}}),env});
test('sirve fragmentos exactos, sufijos y rangos abiertos del MP4',async()=>{
 for(const [range,start,end]of [['bytes=0-31',0,31],['bytes=200-',200,255],['bytes=-12',244,255],['bytes=220-999',220,255]]){const response=await send(range);assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),`bytes ${start}-${end}/256`);assert.equal(response.headers.get('content-length'),String(end-start+1));assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes.slice(start,end+1));}
});
test('rechaza rangos fuera de archivo y no devuelve fragmentos de una versión antigua',async()=>{
 for(const range of ['bytes=256-','bytes=40-20','bytes=-0','bytes=0-1,5-8','bytes=-']){const response=await send(range);assert.equal(response.status,416);assert.equal(response.headers.get('content-range'),'bytes */256');}
 assert.equal((await send('bytes=0-5',{'If-Range':'"film-v0"'})).status,200);assert.equal((await send('bytes=0-5',{'If-Range':'"film-v1"'})).status,206);
 const whole=await send();assert.equal(whole.status,200);assert.equal((await whole.arrayBuffer()).byteLength,256);
});
