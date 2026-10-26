import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { handleMarketRequest } from '../server/market.mjs';
function fixture() {
 const raw=new DatabaseSync(':memory:');raw.exec(readFileSync(new URL('../server/schema.sql',import.meta.url),'utf8'));
 raw.prepare('INSERT INTO market_admins VALUES(?,?,?,?,?)').run('admin','admin@example.com','unused','salt',1);
 raw.prepare('INSERT INTO market_sessions VALUES(?,?,?)').run(createHash('sha256').update('garage-test').digest('hex'),'admin',Math.floor(Date.now()/1000)+3600);
 const prepare=sql=>{const stmt=raw.prepare(sql);let args=[];const values=()=>args.map(value=>value instanceof ArrayBuffer?Buffer.from(value):value);const api={bind(...parameters){args=parameters;return api;},async first(){return stmt.get(...values())||null;},async all(){return {results:stmt.all(...values())};},async run(){return {meta:{changes:Number(stmt.run(...values()).changes)}};}};return api;};
 const db={prepare,async batch(items){raw.exec('BEGIN');try{for(const item of items)await item.run();raw.exec('COMMIT');}catch(error){raw.exec('ROLLBACK');throw error;}}};
 const call=(path,method='GET',body,auth=false,origin='https://club.example')=>handleMarketRequest(new Request('https://club.example/api/gallery/'+path,{method,headers:{Origin:origin,...(auth?{Cookie:'club_session=garage-test'}:{}),...(body&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined}),{MARKET_DB:db});
 return {raw,call};
}
function photo(folder,consent='yes'){const form=new FormData();form.set('folderId',folder);form.set('consent',consent);form.set('caption','Recuerdos de la ruta');form.set('photo',new Blob([new Uint8Array([255,216,255,224,0,0,0,0,0,0,0,0,0])],{type:'image/jpeg'}),'ruta.jpg');return form;}
test('galería: carpetas separadas, fotos persistentes y gestión privada',async()=>{const {raw,call}=fixture();try{
 assert.equal((await call('folders','POST',{name:'Ruta del club'})).status,401);
 assert.equal((await call('folders','POST',{name:'Ruta del club'},true,'https://other.example')).status,403);
 const create=await call('folders','POST',{name:'Ruta del club',category:'Rutas',date:'2026-10-23'},true);assert.equal(create.status,201);const folder=(await create.json()).id;
 assert.equal((await call('folders','POST',{name:'ruta del club'},true)).status,409);
 assert.equal((await call('photos','POST',photo(folder))).status,401);
 assert.equal((await call('photos','POST',photo(folder,'no'),true)).status,400);
 assert.equal((await call('photos','POST',photo('missing'),true)).status,400);
 const invalid=photo(folder);invalid.set('photo',new Blob(['<svg>invalid</svg>']),'bad.svg');assert.equal((await call('photos','POST',invalid,true)).status,400);
 assert.equal((await call('photos','POST',photo(folder),true)).status,201);
 const photos=await(await call('photos?folder='+folder)).json();assert.equal(photos.length,1);assert.equal(photos[0].caption,'Recuerdos de la ruta');assert.equal((await call('photos/'+photos[0].id)).headers.get('content-type'),'image/jpeg');
 assert.deepEqual(await(await call('photos?folder=another')).json(),[]);
 let folders=await(await call('folders')).json();assert.equal(folders[0].photos,1);assert.equal(folders[0].category,'Rutas');assert.equal(folders[0].cover,photos[0].url);
 assert.equal((await call('folders/'+folder,'DELETE',undefined,true)).status,409);
 assert.equal((await call('folders/'+folder,'POST',{name:'Almuerzo en familia',category:'Almuerzos',date:''},true)).status,200);
 assert.equal((await call('photos/'+photos[0].id,'DELETE')).status,401);
 assert.equal((await call('photos/'+photos[0].id,'DELETE',undefined,true)).status,200);assert.equal((await call('photos/'+photos[0].id)).status,404);
 assert.equal((await call('folders/'+folder,'DELETE',undefined,true)).status,200);assert.equal(raw.prepare('SELECT COUNT(*) n FROM gallery_photos').get().n,0);
 }finally{raw.close();}});

test('cada álbum admite 100 fotos y dos cargas simultáneas no superan el límite',async()=>{const {raw,call}=fixture();try{
 const folder=(await(await call('folders','POST',{name:'Álbum de cien',category:'Rutas'},true)).json()).id;
 const insert=raw.prepare('INSERT INTO gallery_photos VALUES(?,?,?,?,?,?)');for(let i=0;i<99;i++)insert.run('seed-'+i,folder,'Ruta','image/jpeg',Buffer.from([255,216,255,224,0,0,0,0,0,0,0,0,0]),1);
 const responses=await Promise.all([call('photos','POST',photo(folder),true),call('photos','POST',photo(folder),true)]);assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);assert.equal((await(await call('photos?folder='+folder)).json()).length,100);
 const first=raw.prepare('SELECT id FROM gallery_photos WHERE folder_id=? LIMIT 1').get(folder).id;assert.equal((await call('photos/'+first,'DELETE',undefined,true)).status,200);assert.equal((await call('photos','POST',photo(folder),true)).status,201);
 const other=(await(await call('folders','POST',{name:'Otro evento',category:'Almuerzos'},true)).json()).id;assert.equal((await call('photos','POST',photo(other),true)).status,201);assert.equal(raw.prepare('SELECT COUNT(*) n FROM gallery_photos WHERE folder_id=?').get(folder).n,100);
 }finally{raw.close()}});
