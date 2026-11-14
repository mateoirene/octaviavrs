import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleMarketRequest} from '../server/market.mjs';
import {OWNER_ADMIN_ID,OWNER_ADMIN_EMAIL} from '../server/config.mjs';
import {hashAccess,passwordAccess,delegatedRouteAllowed,scopes} from '../server/delegated-admins.mjs';
const origin='https://octaviaap.pages.dev';
async function fixture(){
 const raw=new DatabaseSync(':memory:');raw.exec(readFileSync(new URL('../server/schema.sql',import.meta.url),'utf8'));
 const db={prepare(sql){const s=raw.prepare(sql);let args=[];const q={bind(...a){args=a;return q;},async first(){return s.get(...args)||null;},async all(){return {results:s.all(...args)};},async run(){return {meta:{changes:Number(s.run(...args).changes)}};}};return q;},async batch(qs){raw.exec('BEGIN');try{const out=[];for(const q of qs)out.push(await q.run());raw.exec('COMMIT');return out;}catch(e){raw.exec('ROLLBACK');throw e;}}};
 const at=Math.floor(Date.now()/1000);
 raw.prepare('INSERT INTO market_admins VALUES(?,?,?,?,?)').run(OWNER_ADMIN_ID,OWNER_ADMIN_EMAIL,await passwordAccess('Owner-password-2026','owner-salt'),'owner-salt',at);
 raw.prepare('INSERT INTO market_sessions VALUES(?,?,?)').run(await hashAccess('owner-session'),OWNER_ADMIN_ID,at+3600);
 raw.exec("INSERT INTO garage_folders VALUES('club','Miembros',1);INSERT INTO garage_members VALUES('member-cuesta','club','Cuesta','','Octavia VRS','','','','','',1,1,'test')");
 const req=(path,{body,token='owner-session',method=body?'POST':'GET',source=origin}={})=>handleMarketRequest(new Request(origin+path,{method,headers:{origin:source,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.42',...(token?{cookie:'club_session='+token}:{})},...(body?{body:JSON.stringify(body)}:{})}),{MARKET_DB:db});
 const invite=async()=>{const r=await req('/api/admin/delegates',{body:{action:'invite',memberId:'member-cuesta',permissions:['market','news']}});assert.equal(r.status,200);const data=await r.json();return new URLSearchParams(new URL(data.activationPath,origin).hash.slice(1)).get('invitacion');};
 return {raw,db,req,invite};
}
test('invitación privada de un uso, mismo correo con identidades separadas y revocación efectiva',async()=>{
 const f=await fixture();try{
 const invitation=await f.invite();
 assert.equal((await f.req('/api/admin/login',{token:'',body:{email:OWNER_ADMIN_EMAIL,password:'Cuesta-password-2026'}})).status,401);
 let r=await f.req('/api/admin/delegates/activate',{token:'',body:{token:invitation,password:'Owner-password-2026'}});assert.equal(r.status,400);
 r=await f.req('/api/admin/delegates/activate',{token:'',body:{token:invitation,password:'Cuesta-password-2026'}});assert.equal(r.status,200);
 assert.equal((await f.req('/api/admin/delegates/activate',{token:'',body:{token:invitation,password:'Another-password-2026'}})).status,410);
 r=await f.req('/api/admin/login',{token:'',body:{email:OWNER_ADMIN_EMAIL,password:'Cuesta-password-2026'}});assert.equal(r.status,200);const cuesta=await r.json(),session=r.headers.get('Set-Cookie').match(/club_session=([^;]+)/)[1];assert.equal(cuesta.alias,'Cuesta');assert.equal(cuesta.role,'administrator');assert.notEqual(cuesta.id,OWNER_ADMIN_ID);
 assert.equal((await f.req('/api/admin/listings',{token:session})).status,200);
 for(const path of ['/api/admin/delegates','/api/cms/admin/settings','/api/cms/admin/backup','/api/cms/admin/audit','/api/garage/export'])assert.equal((await f.req(path,{token:session})).status,403,path);
 assert.equal((await f.req('/api/admin/delegates',{token:session,body:{action:'enable',memberId:'member-cuesta',permissions:scopes}})).status,403);
 assert.equal((await f.req('/api/admin/users',{token:session,body:{email:'someone@example.com'}})).status,403);
 assert.equal((await f.req('/api/admin/listings',{token:session,source:'https://other.invalid',method:'POST',body:{}})).status,403);
 const audit=f.raw.prepare("SELECT admin_id FROM admin_audit_log WHERE route='/api/admin/listings' AND status=200 ORDER BY rowid DESC LIMIT 1").get();assert.equal(audit.admin_id,cuesta.id);
 const listing=await (await f.req('/api/admin/delegates')).json();assert.equal(listing.accounts[0].alias,'Cuesta');const serial=JSON.stringify(listing);for(const word of ['password_hash','invite_hash','owner-salt','Cuesta-password'])assert.ok(!serial.includes(word));
 r=await f.req('/api/admin/delegates',{body:{action:'disable',memberId:'member-cuesta',permissions:['market']}});assert.equal(r.status,200);
 assert.equal((await f.req('/api/admin/session',{token:session})).status,401);assert.equal((await f.req('/api/admin/listings',{token:session})).status,401);
 assert.equal((await f.req('/api/admin/session')).status,200);
 assert.equal((await f.req('/api/admin/login',{token:'',body:{email:OWNER_ADMIN_EMAIL,password:'Owner-password-2026'}})).status,200);
 }finally{f.raw.close();}
});
test('caducidad, renovación de invitaciones y cambios de permisos invalidan sesiones previas',async()=>{
 const f=await fixture();try{
 const first=await f.invite(),second=await f.invite();
 assert.equal((await f.req('/api/admin/delegates/activate',{token:'',body:{token:first,password:'Cuesta-password-2026'}})).status,410);
 f.raw.exec('UPDATE club_delegated_admins SET invite_expires=1');
 assert.equal((await f.req('/api/admin/delegates/activate',{token:'',body:{token:second,password:'Cuesta-password-2026'}})).status,410);
 const current=await f.invite();await f.req('/api/admin/delegates/activate',{token:'',body:{token:current,password:'Cuesta-password-2026'}});
 const r=await f.req('/api/admin/login',{token:'',body:{email:OWNER_ADMIN_EMAIL,password:'Cuesta-password-2026'}});const session=r.headers.get('Set-Cookie').match(/club_session=([^;]+)/)[1];
 await f.req('/api/admin/delegates',{body:{action:'permissions',memberId:'member-cuesta',permissions:['news']}});
 assert.equal((await f.req('/api/admin/session',{token:session})).status,401);
 const next=await f.req('/api/admin/login',{token:'',body:{email:OWNER_ADMIN_EMAIL,password:'Cuesta-password-2026'}});const fresh=next.headers.get('Set-Cookie').match(/club_session=([^;]+)/)[1];
 assert.equal((await f.req('/api/admin/listings',{token:fresh})).status,403);
 assert.equal((await f.req('/api/club/posts?manage=1',{token:fresh})).status,200);
 }finally{f.raw.close();}
});
test('los permisos no admiten escaladas por rutas alternativas del servidor',()=>{
 const user={role:'administrator',permissions:['social','news']};
 for(const [path,expected]of [['/api/club/social/links',true],['/api/club/directory/links',false],['/api/cms/admin/news',true],['/api/cms/admin/settings-versions/abc/restore',false],['/api/cms/admin/backup',false],['/api/racing/finish',false],['/api/admin/delegates',false]])assert.equal(delegatedRouteAllowed(user,new Request(origin+path,{method:'POST'})),expected,path);
});
