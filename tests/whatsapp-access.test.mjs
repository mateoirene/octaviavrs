import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {handleMarketRequest} from '../server/market.mjs';

const INVITE='https://chat.whatsapp.com/AAAAAAAAAAAAAAAAAAAAAA?s=cl&p=a&iam=2';

function fixture(){
 const raw=new DatabaseSync(':memory:');
 raw.exec(readFileSync(new URL('../server/schema.sql',import.meta.url),'utf8'));
 raw.prepare('INSERT INTO market_admins VALUES(?,?,?,?,?)').run('c15706ae-7b72-4779-9785-8c2f5c1e50ea','admin@example.com','unused','salt',1);
 raw.prepare('INSERT INTO market_sessions VALUES(?,?,?)').run(createHash('sha256').update('whatsapp-admin').digest('hex'),'c15706ae-7b72-4779-9785-8c2f5c1e50ea',Math.floor(Date.now()/1000)+3600);
 const prepare=sql=>{const statement=raw.prepare(sql);let args=[];const values=()=>args.map(value=>value instanceof ArrayBuffer?Buffer.from(value):value);const query={bind(...parameters){args=parameters;return query;},async first(){return statement.get(...values())||null;},async all(){return {results:statement.all(...values())};},async run(){return {meta:{changes:Number(statement.run(...values()).changes)}};}};return query;};
 const db={prepare,async batch(items){raw.exec('BEGIN');try{const results=[];for(const item of items)results.push(await item.run());raw.exec('COMMIT');return results;}catch(error){raw.exec('ROLLBACK');throw error;}}};
 const request=(path,{method='GET',body,auth=false,origin='https://club.example'}={})=>handleMarketRequest(new Request('https://club.example/api/'+path,{method,headers:{Origin:origin,...(auth?{Cookie:'club_session=whatsapp-admin'}:{}),...(body&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{})},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})}),{MARKET_DB:db});
 return {raw,request};
}

function member(folder,phone,pilot='Piloto autorizado'){
 const form=new FormData();
 for(const [key,value] of Object.entries({folderId:folder,pilot,birthDate:'1990-05-20',phone,instagram:'',model:'Octavia VRS',engine:'2.0 TSI',power:'245 CV',year:'2022',gearbox:'DSG',notes:'Miembro del club',consent:'yes'}))form.set(key,value);
 form.append('photos',new Blob([new Uint8Array([255,216,255,224,0,0,0,0,0,0,0,0,0])],{type:'image/jpeg'}),'coche.jpg');
 return form;
}

test('solo administración configura el grupo y el estado nunca revela el enlace',async()=>{const {raw,request}=fixture();try{
 let response=await request('club/whatsapp-settings');assert.equal(response.status,401);
 response=await request('club/whatsapp-settings',{auth:true});assert.equal(response.status,200);assert.deepEqual(await response.json(),{configured:false});
 assert.equal((await request('club/whatsapp-settings',{method:'POST',body:{inviteUrl:INVITE}})).status,401);
 assert.equal((await request('club/whatsapp-settings',{method:'POST',body:{inviteUrl:INVITE},auth:true,origin:'https://evil.example'})).status,403);
 for(const inviteUrl of ['https://example.com/grupo','javascript:alert(1)','https://chat.whatsapp.com/short'])assert.equal((await request('club/whatsapp-settings',{method:'POST',body:{inviteUrl},auth:true})).status,400);
 response=await request('club/whatsapp-settings',{method:'POST',body:{inviteUrl:INVITE},auth:true});assert.equal(response.status,200);assert.deepEqual(await response.json(),{configured:true});
 assert.equal(raw.prepare('SELECT COUNT(*) total FROM market_settings WHERE value=?').get(INVITE).total,1);
 response=await request('club/whatsapp-settings',{auth:true});assert.equal(response.status,200);const state=await response.json();assert.deepEqual(state,{configured:true});assert.ok(!JSON.stringify(state).includes('chat.whatsapp.com'));
 }finally{raw.close();}});

test('solo un teléfono obligatorio de una ficha aprobada recibe el enlace',async()=>{const {raw,request}=fixture();try{
 await request('club/whatsapp-settings',{method:'POST',body:{inviteUrl:INVITE},auth:true});
 const folder=(await(await request('garage/folders',{method:'POST',body:{name:'Miembros'},auth:true})).json()).id;
 assert.equal((await request('garage/members',{method:'POST',body:member(folder,'+34 600 123 456'),auth:true})).status,201);
 for(const phone of ['', '123', '+34/600123456', '+34 699 999 999']){const response=await request('club/whatsapp-access',{method:'POST',body:{phone}});assert.equal(response.status,403);assert.ok(!(await response.text()).includes(INVITE));}
 const response=await request('club/whatsapp-access',{method:'POST',body:{phone:'0034 600 123 456'}});assert.equal(response.status,200);assert.deepEqual(await response.json(),{inviteUrl:INVITE});assert.equal(response.headers.get('cache-control'),'no-store');
 }finally{raw.close();}});

test('una ficha pendiente o rechazada no autoriza; la aprobación sí',async()=>{const {raw,request}=fixture();try{
 await request('club/whatsapp-settings',{method:'POST',body:{inviteUrl:INVITE},auth:true});
 const folder=(await(await request('garage/folders',{method:'POST',body:{name:'Solicitudes'},auth:true})).json()).id;
 let response=await request('garage/submit',{method:'POST',body:member(folder,'+34 611 222 333','Piloto pendiente')});assert.equal(response.status,201);const pending=(await response.json()).id;
 response=await request('club/whatsapp-access',{method:'POST',body:{phone:'+34 611 222 333'}});assert.equal(response.status,403);assert.ok(!(await response.text()).includes(INVITE));
 assert.equal((await request('garage/reviews/'+pending,{method:'POST',body:{action:'reject'},auth:true})).status,200);
 assert.equal((await request('club/whatsapp-access',{method:'POST',body:{phone:'+34 611 222 333'}})).status,403);
 response=await request('garage/submit',{method:'POST',body:member(folder,'+34 622 333 444','Piloto aprobado')});const approved=(await response.json()).id;
 assert.equal((await request('garage/reviews/'+approved,{method:'POST',body:{action:'approve'},auth:true})).status,200);
 response=await request('club/whatsapp-access',{method:'POST',body:{phone:'+34 622 333 444'}});assert.equal(response.status,200);assert.deepEqual(await response.json(),{inviteUrl:INVITE});
 }finally{raw.close();}});

test('un teléfono no puede quedar aprobado en dos fichas diferentes',async()=>{const {raw,request}=fixture();try{
 await request('club/whatsapp-settings',{method:'POST',body:{inviteUrl:INVITE},auth:true});
 const folder=(await(await request('garage/folders',{method:'POST',body:{name:'Teléfonos únicos'},auth:true})).json()).id;
 assert.equal((await request('garage/members',{method:'POST',body:member(folder,'+34 644 555 666','Primera ficha'),auth:true})).status,201);
 assert.equal((await request('garage/members',{method:'POST',body:member(folder,'644 555 666','Duplicado directo'),auth:true})).status,409);
 const pendingResponse=await request('garage/submit',{method:'POST',body:member(folder,'0034 644 555 666','Duplicado pendiente')});
 assert.equal(pendingResponse.status,201);const pending=(await pendingResponse.json()).id;
 assert.equal((await request('garage/reviews/'+pending,{method:'POST',body:{action:'approve'},auth:true})).status,409);
 const access=await request('club/whatsapp-access',{method:'POST',body:{phone:'644 555 666'}});
 assert.equal(access.status,200);assert.deepEqual(await access.json(),{inviteUrl:INVITE});
 }finally{raw.close();}});

test('sin configuración no filtra enlaces y el acceso limita los intentos',async()=>{const {raw,request}=fixture();try{
 const folder=(await(await request('garage/folders',{method:'POST',body:{name:'Acceso'},auth:true})).json()).id;
 await request('garage/members',{method:'POST',body:member(folder,'+34 633 444 555'),auth:true});
 let response=await request('club/whatsapp-access',{method:'POST',body:{phone:'+34 633 444 555'}});assert.equal(response.status,503);assert.ok(!(await response.text()).includes('chat.whatsapp.com'));
 for(let attempt=0;attempt<5;attempt++){response=await request('club/whatsapp-access',{method:'POST',body:{phone:'+34 699 000 000'}});assert.equal(response.status,403);}
 response=await request('club/whatsapp-access',{method:'POST',body:{phone:'+34 699 000 000'}});assert.equal(response.status,429);assert.ok(!(await response.text()).includes(INVITE));
 }finally{raw.close();}});

test('el enlace de invitación no forma parte del JavaScript descargado por visitantes',()=>{
 const source=readFileSync(new URL('../dist/contact.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/https:\/\/chat\.whatsapp\.com\//);
 const admin=readFileSync(new URL('../dist/admin.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(admin,/saveWhatsAppInvite\(pending\)/);
 assert.match(admin,/pulsa «Guardar enlace privado»/);
});
