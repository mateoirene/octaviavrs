import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {handleMarketRequest} from '../server/market.mjs';
import {OWNER_ADMIN_ID,OWNER_ADMIN_EMAIL} from '../server/config.mjs';
const origin='https://club.example';
async function fixture(){
 const raw=new DatabaseSync(':memory:');raw.exec(readFileSync(new URL('../server/schema.sql',import.meta.url),'utf8'));
 const db={prepare(sql){const s=raw.prepare(sql);let a=[];const q={bind(...v){a=v;return q;},async first(){return s.get(...a)||null;},async all(){return {results:s.all(...a)};},async run(){return {meta:{changes:Number(s.run(...a).changes)}};}};return q;},async batch(qs){raw.exec('BEGIN');try{const out=[];for(const q of qs)out.push(await q.run());raw.exec('COMMIT');return out;}catch(e){raw.exec('ROLLBACK');throw e;}}};
 const hash=v=>createHash('sha256').update(v).digest('hex'),at=Math.floor(Date.now()/1000);
 raw.prepare('INSERT INTO market_admins VALUES(?,?,?,?,?)').run(OWNER_ADMIN_ID,OWNER_ADMIN_EMAIL,'unused','salt',at);
 raw.prepare('INSERT INTO market_sessions VALUES(?,?,?)').run(hash('owner-test'),OWNER_ADMIN_ID,at+3600);
 raw.exec("INSERT INTO garage_folders VALUES('rsvp-club','Miembros',1)");
 const m=raw.prepare('INSERT INTO garage_members VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)');
 for(const [id,name]of [['member-one','Socio Uno'],['member-two','Cuesta'],['pending-member','Pendiente']])m.run(id,'rsvp-club',name,'','Octavia','','','','','',at,at,OWNER_ADMIN_ID);
 raw.prepare("INSERT INTO garage_moderation(member_id,status,submitted_at) VALUES('pending-member','pending',?)").run(at);
 raw.prepare("INSERT INTO club_delegated_admins(id,member_id,alias,permissions_json,enabled,created_at,updated_at) VALUES('rsvp-admin','member-two','Cuesta',?,1,?,?)").run(JSON.stringify(['events','members']),at,at);
 raw.prepare('INSERT INTO club_delegated_sessions VALUES(?,?,?)').run(hash('cuesta-test'),'rsvp-admin',at+3600);
 const event=raw.prepare('INSERT INTO club_events VALUES(?,?,?,?,?,?,?,?,?,?,?,?)');for(const [id,title]of [['normal-event','Ruta de socios'],['calcotada-event','Calçotada anual']])event.run(id,'2099-05-10',title,'','Tarragona','','','','',at,at,OWNER_ADMIN_ID);
 const request=(path,{method='GET',body,admin='',member='',source=origin}={})=>handleMarketRequest(new Request(origin+'/api/club/'+path,{method,headers:{origin:source,'CF-Connecting-IP':'192.0.2.77',...(body?{'Content-Type':'application/json'}:{}),cookie:(admin?'club_session='+admin+'; ':'')+(member?'club_member_session='+member:'')},...(body?{body:JSON.stringify(body)}:{})}),{MARKET_DB:db});
 const activate=async(memberId)=>{const r=await request('member-access',{method:'POST',admin:'owner-test',body:{action:'invite',memberId}});assert.equal(r.status,200);const value=await r.json(),key=new URLSearchParams(new URL(value.activationPath,origin).hash.slice(1)).get('clave');const active=await request('member-access/activate',{method:'POST',body:{token:key}});assert.equal(active.status,200);return {token:active.headers.get('set-cookie').match(/club_member_session=([^;]+)/)[1],key};};
 return {raw,request,activate};
}
test('cada socio aprobado se apunta y se da de baja solo con su ficha, sin duplicados',async()=>{
 const f=await fixture();try{
 const {token,key}=await f.activate('member-one');
 assert.equal((await f.request('member-access/activate',{method:'POST',body:{token:key}})).status,410);
 assert.equal((await f.request('events/normal-event/signups',{method:'POST',body:{people:1}})).status,401);
 assert.equal((await f.request('events/normal-event/signups',{method:'POST',member:token,body:{memberId:'member-two',people:1}})).status,403);
 assert.equal((await f.request('events/normal-event/signups',{method:'POST',member:token,body:{people:2}})).status,200);
 assert.equal((await f.request('events/normal-event/signups',{method:'POST',member:token,body:{people:3}})).status,200);
 const data=await(await f.request('events/normal-event/signups',{member:token})).json();assert.equal(data.rows.length,1);assert.equal(data.totalPeople,3);assert.equal(data.rows[0].pilot,'Socio Uno');assert.ok(!JSON.stringify(data).includes('phone'));assert.equal(data.member.id,'member-one');assert.equal(data.canManage,false);
 assert.equal((await f.request('events/normal-event/signups',{method:'POST',member:token,body:{people:0}})).status,400);
 assert.equal((await f.request('events/normal-event/signups/member-two',{method:'DELETE',member:token})).status,403);
 assert.equal((await f.request('events/normal-event/signups/member-one',{method:'DELETE',member:token})).status,200);
 assert.equal(f.raw.prepare("SELECT COUNT(*) n FROM club_event_signups").get().n,0);
 assert.equal((await f.request('member-access',{method:'POST',admin:'owner-test',body:{action:'invite',memberId:'pending-member'}})).status,404);
 }finally{f.raw.close();}
});
test('Raúl y Cuesta corrigen eventos normales; las listas de calçotada quedan reservadas al propietario',async()=>{
 const f=await fixture();try{
 const {token}=await f.activate('member-one');
 assert.equal((await f.request('events/normal-event/signups',{method:'POST',admin:'cuesta-test',body:{memberId:'member-one',people:4}})).status,200);
 assert.equal((await f.request('events/normal-event/signups',{method:'POST',admin:'owner-test',body:{memberId:'member-two',people:2}})).status,200);
 assert.equal((await f.request('events/normal-event/signups/member-one',{method:'DELETE',admin:'cuesta-test'})).status,200);
 for(const auth of [{member:token},{admin:'cuesta-test'},{admin:'owner-test'}])assert.equal((await f.request('events/calcotada-event/signups',{method:'POST',...auth,body:{memberId:'member-one',people:1}})).status,403);
 const row={pilotName:'Socio Uno',attendees:2,calcotada:2,vegetarian:0,childMenu:0,depositEuros:'40',balanceEuros:'50'};
 assert.equal((await f.request('events/calcotada-event/attendees',{method:'POST',admin:'cuesta-test',body:row})).status,403);
 assert.equal((await f.request('events/calcotada-event/attendees',{method:'POST',member:token,body:row})).status,401);
 assert.equal((await f.request('events/calcotada-event/attendees',{method:'POST',admin:'owner-test',body:row})).status,201);
 assert.equal((await f.request('events/calcotada-event/attendees')).status,200);
 assert.equal((await f.request('events/calcotada-event',{method:'POST',admin:'cuesta-test',body:{date:'2099-05-10',title:'Nombre nuevo',type:'ruta'}})).status,200);
 const events=await(await f.request('events')).json();assert.equal(events.find(e=>e.id==='calcotada-event').registrationMode,'calcotada');
 assert.equal((await f.request('events/calcotada-event',{method:'DELETE',admin:'cuesta-test'})).status,403);
 assert.equal((await f.request('events/calcotada-event/signups',{method:'POST',admin:'cuesta-test',body:{memberId:'member-two'}})).status,403);
 }finally{f.raw.close();}
});
test('acceso personal revocable y fichas no aprobadas quedan bloqueadas en peticiones posteriores',async()=>{
 const f=await fixture();try{
 const {token}=await f.activate('member-one');await f.request('member-access',{method:'POST',admin:'owner-test',body:{action:'revoke',memberId:'member-one'}});
 assert.equal((await f.request('events/normal-event/signups',{method:'POST',member:token,body:{people:1}})).status,401);
 const next=await f.activate('member-one');f.raw.exec("INSERT INTO garage_member_blocks VALUES('member-one',1,'Prueba',1,1,'owner')");
 assert.equal((await f.request('events/normal-event/signups',{method:'POST',member:next.token,body:{people:1}})).status,401);
 assert.equal((await f.request('member-access',{method:'POST',member:next.token,body:{action:'invite',memberId:'member-two'}})).status,401);
 }finally{f.raw.close();}
});
