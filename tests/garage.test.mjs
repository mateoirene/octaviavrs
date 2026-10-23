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
 const call=(path,method='GET',body,auth=false,origin='https://club.example')=>handleMarketRequest(new Request('https://club.example/api/garage/'+path,{method,headers:{Origin:origin,...(auth?{Cookie:'club_session=garage-test'}:{}),...(body&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined}),{MARKET_DB:db});
 return {raw,call};
}
function member(folder,overrides={},photo=true){const form=new FormData();for(const [key,value]of Object.entries({folderId:folder,pilot:'Piloto del club',instagram:'@piloto.vrs',model:'Octavia VRS MK4',engine:'2.0 TSI',power:'245 CV',year:'2022',gearbox:'DSG',notes:'Preparación del coche',consent:'yes',...overrides}))form.set(key,value);if(photo)form.append('photos',new Blob([new Uint8Array([255,216,255,224,0,0,0,0,0,0,0,0,0])],{type:'image/jpeg'}),'coche.jpg');return form;}
test('carpetas personalizadas y fichas públicas solo gestionadas por administradores',async()=>{const {raw,call}=fixture();try{
 assert.equal((await call('folders','POST',{name:'Octavia MK4'})).status,401);
 assert.equal((await call('folders','POST',{name:'Octavia MK4'},true,'https://other.example')).status,403);
 let response=await call('folders','POST',{name:'Octavia MK4'},true);assert.equal(response.status,201);const folder=(await response.json()).id;
 assert.equal((await call('folders','POST',{name:'octavia mk4'},true)).status,409);
 assert.equal((await call('members','POST',member(folder))).status,401);
 response=await call('members','POST',member(folder),true);assert.equal(response.status,201);const id=(await response.json()).id;
 let members=await(await call('members?folder='+folder)).json();assert.equal(members.length,1);assert.equal(members[0].pilot,'Piloto del club');assert.equal(members[0].instagramUrl,'https://www.instagram.com/piloto.vrs/');assert.equal(members[0].images.length,1);
 const photoPath=members[0].images[0].replace('/api/garage/','');assert.equal((await call(photoPath)).status,200);
 let folders=await(await call('folders')).json();assert.equal(folders[0].members,1);assert.equal(folders[0].cover,members[0].images[0]);
 assert.equal((await call('folders/'+folder,'DELETE',undefined,true)).status,409);
 assert.equal((await call('members/'+id,'POST',member(folder,{pilot:'Otro nombre'},false),true)).status,200);
 members=await(await call('members?folder='+folder)).json();assert.equal(members[0].pilot,'Otro nombre');assert.equal(members[0].images.length,1,'Conserva las fotos al editar texto');
 const second=(await(await call('folders','POST',{name:'Preparados'},true)).json()).id;
 assert.equal((await call('members/'+id,'POST',member(second,{model:'Octavia VRS preparado'}),true)).status,200);
 assert.equal((await call(photoPath)).status,404,'Retira las fotos sustituidas');
 assert.deepEqual(await(await call('members?folder='+folder)).json(),[]);
 assert.equal((await call('folders/'+folder,'POST',{name:'Octavia del club'},true)).status,200);
 assert.equal((await call('members/'+id,'DELETE',undefined,true)).status,200);assert.equal(raw.prepare('SELECT COUNT(*) n FROM garage_photos').get().n,0);
 assert.equal((await call('folders/'+folder,'DELETE',undefined,true)).status,200);
 }finally{raw.close();}});
test('valida fotos, consentimiento, carpeta e Instagram antes de publicar',async()=>{const {raw,call}=fixture();try{const folder=(await(await call('folders','POST',{name:'Club'},true)).json()).id;
 for(const overrides of [{consent:'no'},{instagram:'https://instagram.com/wrong'},{year:'abc'},{folderId:'missing'}])assert.equal((await call('members','POST',member(folder,overrides),true)).status,400);
 assert.equal((await call('members','POST',member(folder,{},false),true)).status,400);
 const svg=member(folder);svg.set('photos',new Blob(['<svg>bad photo</svg>'],{type:'image/svg+xml'}),'bad.svg');assert.equal((await call('members','POST',svg,true)).status,400);
 assert.equal(raw.prepare('SELECT COUNT(*) n FROM garage_members').get().n,0);
 }finally{raw.close();}});
test('perfil del piloto: WhatsApp, foto independiente, edición y borrado',async()=>{const {raw,call}=fixture();try{
 const folder=(await(await call('folders','POST',{name:'Pilotos'},true)).json()).id;
 const form=member(folder,{phone:'+34 600 123 456'});form.set('profilePhoto',new Blob([new Uint8Array([255,216,255,224,0,0,0,0,0,0,0,0,0])],{type:'image/jpeg'}),'piloto.jpg');
 const created=await call('members','POST',form,true);assert.equal(created.status,201);const id=(await created.json()).id;
 let profile=(await(await call('members?folder='+folder)).json())[0];assert.equal(profile.phone,'34600123456');assert.equal(profile.whatsappUrl,'https://wa.me/34600123456');assert.equal(profile.profileImage,'/api/garage/profiles/'+id+'/photo');
 const path=profile.profileImage.replace('/api/garage/','');assert.equal((await call(path)).status,200);
 const edit=member(folder,{phone:'0034 611 222 333'},false);assert.equal((await call('members/'+id,'POST',edit,true)).status,200);
 profile=(await(await call('members?folder='+folder)).json())[0];assert.equal(profile.whatsappUrl,'https://wa.me/34611222333');assert.ok(profile.profileImage);assert.equal(profile.images.length,1);
 for(const phone of ['javascript:alert(1)','123','+34/600123456'])assert.equal((await call('members/'+id,'POST',member(folder,{phone},false),true)).status,400);
 const remove=member(folder,{phone:'',removeProfile:'yes'},false);assert.equal((await call('members/'+id,'POST',remove,true)).status,200);
 profile=(await(await call('members?folder='+folder)).json())[0];assert.equal(profile.whatsappUrl,null);assert.equal(profile.profileImage,null);assert.equal((await call(path)).status,404);
 assert.equal((await call('members/'+id,'DELETE',undefined,true)).status,200);assert.equal(raw.prepare('SELECT COUNT(*) n FROM garage_profiles').get().n,0);
 }finally{raw.close();}});
