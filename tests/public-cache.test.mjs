import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withPublicCache} from '../server/public-cache.mjs';
const origin='https://club.example',url=origin+'/api/club/events';
function fixture(){const values=new Map();return {values,async match(k){return values.get(k.url)?.clone();},async put(k,r){values.set(k.url,r.clone());},async delete(k){return values.delete(k.url);}};}
const response=items=>new Response(JSON.stringify(items),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
test('los socios y administradores no reciben el calendario público anterior al guardado',async()=>{
 const cache=fixture();await withPublicCache(new Request(url),cache,async()=>response([]));let reads=0;
 for(const cookie of ['club_member_session=member-test','other=1; club_member_session=member-test; extra=2','club_session=admin-test']){
  const r=await withPublicCache(new Request(url,{headers:{cookie}}),cache,async()=>{reads++;return response([{id:'nuevo',date:'2099-07-16'}]);});
  assert.equal((await r.json())[0].id,'nuevo');assert.equal(r.headers.get('Cache-Control'),'no-store');
 }
 assert.equal(reads,3);
});
test('el calendario anónimo conserva su caché breve sin multiplicar lecturas D1',async()=>{
 const cache=fixture();let reads=0;const next=async()=>{reads++;return response([{id:'existente'}]);};
 await withPublicCache(new Request(url),cache,next);const r=await withPublicCache(new Request(url),cache,next);
 assert.equal(reads,1);assert.equal((await r.json())[0].id,'existente');assert.equal(r.headers.get('Cache-Control'),'no-store');
});
test('guardar, editar y borrar un evento invalida la copia pública solo si tiene éxito',async()=>{
 for(const [method,path]of [['POST',''],['POST','/event-one'],['DELETE','/event-one']]){
  const cache=fixture();await withPublicCache(new Request(url),cache,async()=>response([]));
  await withPublicCache(new Request(url+path,{method}),cache,async()=>new Response('{}',{status:403}));assert.equal(cache.values.has(url),true);
  await withPublicCache(new Request(url+path,{method}),cache,async()=>response({ok:true}));assert.equal(cache.values.has(url),false);
  const fresh=await withPublicCache(new Request(url),cache,async()=>response([{id:'actualizado'}]));assert.equal((await fresh.json())[0].id,'actualizado');
 }
});
test('los accesos personales y las inscripciones no se almacenan en caché pública',async()=>{
 const cache=fixture();for(const path of ['/api/club/events/access','/api/club/member-access/session','/api/club/events/one/signups']){
  let reads=0;for(let i=0;i<2;i++)await withPublicCache(new Request(origin+path),cache,async()=>{reads++;return response({member:{id:'test'}});});assert.equal(reads,2);
 }
 assert.equal(cache.values.size,0);
});
