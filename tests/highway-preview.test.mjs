import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../scripts/highway-preview-worker.mjs';
test('la vista previa bloquea escrituras, APIs y administración sin acceder a D1',async()=>{
 let assets=0;const env=new Proxy({ASSETS:{fetch:async()=>{assets++;return new Response('<html>local</html>');}}},{get(o,k){if(k==='ASSETS')return o[k];throw Error('Acceso a un binding no autorizado: '+String(k));}});
 for(const path of ['/admin','/admin.html','/%61dmin.html','/estadisticas.html','/noticias-admin.html'])assert.equal((await worker.fetch(new Request('https://preview.example'+path),env)).status,404);
 for(const method of ['GET','POST','DELETE'])assert.equal((await worker.fetch(new Request('https://preview.example/api/garage/members',{method}),env)).status,503);
 assert.equal((await worker.fetch(new Request('https://preview.example/simulador.html',{method:'POST'}),env)).status,405);assert.equal(assets,0);
 const r=await worker.fetch(new Request('https://preview.example/simulador.html'),env);assert.equal(r.status,200);assert.equal(r.headers.get('X-Octavia-Preview'),'isolated-no-d1');assert.equal(assets,1);
 assert.equal((await worker.fetch(new Request('https://preview.example/'),env)).headers.get('location'),'https://preview.example/simulador.html?experience=highway');
});
