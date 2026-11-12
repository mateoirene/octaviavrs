import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleGarageRequest} from '../server/garage.mjs';
const schema=readFileSync(new URL('../server/schema.sql',import.meta.url),'utf8');
const migration=readFileSync(new URL('../migrations/2026-11-12-garage-membership.sql',import.meta.url),'utf8');
function fixture(legacy=false){
 const raw=new DatabaseSync(':memory:');raw.exec(legacy?schema.slice(0,schema.indexOf('-- Rerunnable migration:')):schema);
 raw.prepare('INSERT INTO garage_folders VALUES(?,?,?)').run('club','Club',1);
 const insert=id=>raw.prepare('INSERT INTO garage_members VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,'club','Piloto '+id,'piloto','Octavia vRS','2.0 TSI','245 CV','2022','DSG','Detalles',1,1,'owner');
 const prepare=sql=>{
  const stmt=raw.prepare(sql);let args=[];
  return {
   bind(...p){args=p;return this;},
   async first(){return stmt.get(...args)||null;},
   async all(){return {results:stmt.all(...args)};},
   async run(){return {meta:{changes:Number(stmt.run(...args).changes)}};}
  };
 };
 const db={prepare};
 const list=async(admin=null,review='')=>(await handleGarageRequest(new Request('https://club.example/api/garage/members?folder=club'+(review?'&review='+review:'')),db,admin)).json();
 return {raw,insert,list};
}
test('migración asigna carnets a miembros existentes sin modificar datos y es repetible',()=>{
 const {raw,insert}=fixture(true);try{
 for(let n=0;n<30;n++)insert('legacy-'+n);
 const before=raw.prepare('SELECT * FROM garage_members ORDER BY id').all();
 raw.exec(migration);const cards=raw.prepare('SELECT * FROM garage_memberships ORDER BY member_id').all();
 assert.equal(cards.length,30);assert.equal(new Set(cards.map(c=>c.number)).size,30);assert.ok(cards.every(c=>c.number>=0&&c.number<=900));
 assert.deepEqual(raw.prepare('SELECT * FROM garage_members ORDER BY id').all(),before);
 raw.exec(migration);assert.deepEqual(raw.prepare('SELECT * FROM garage_memberships ORDER BY member_id').all(),cards);
 }finally{raw.close();}
});
test('resuelve colisiones, no acepta duplicados y conserva el carnet al editar o mover',()=>{
 const {raw,insert}=fixture();try{
 raw.function('random',()=>42);
 for(let n=0;n<40;n++)insert('member-'+n);
 const cards=raw.prepare('SELECT * FROM garage_memberships ORDER BY member_id').all();assert.equal(cards.length,40);assert.equal(new Set(cards.map(c=>c.number)).size,40);assert.ok(cards.every(c=>c.number>=0&&c.number<=900));const originalNumber=cards.find(c=>c.member_id==='member-0').number;
 raw.prepare('INSERT INTO garage_folders VALUES(?,?,?)').run('new','Nueva',2);
 raw.prepare("UPDATE garage_members SET pilot='Nombre nuevo',folder_id='new' WHERE id='member-0'").run();
 raw.exec(migration);assert.deepEqual(raw.prepare('SELECT * FROM garage_memberships ORDER BY member_id').all(),cards);
 assert.throws(()=>raw.prepare("UPDATE garage_memberships SET number=? WHERE member_id='member-1'").run(originalNumber),/UNIQUE/);
 raw.prepare("DELETE FROM garage_members WHERE id='member-0'").run();assert.equal(raw.prepare("SELECT * FROM garage_memberships WHERE member_id='member-0'").get(),undefined);
 }finally{raw.close();}
});
test('API publica carnet real sin teléfono ni fecha privada; pendientes y rechazados no muestran número',async()=>{
 const {raw,insert,list}=fixture();try{
 insert('approved');insert('pending');insert('rejected');
 raw.prepare('INSERT INTO garage_moderation(member_id,status,submitted_at) VALUES(?,?,?)').run('pending','pending',1);
 raw.prepare('INSERT INTO garage_moderation(member_id,status,submitted_at) VALUES(?,?,?)').run('rejected','rejected',1);
 raw.prepare('INSERT INTO garage_profiles(member_id,phone) VALUES(?,?)').run('approved','34600123456');
 raw.prepare('INSERT INTO garage_birthdays VALUES(?,?)').run('approved','2000-01-02');
 let rows=await list();assert.equal(rows.length,1);const number=rows[0].membershipNumber;assert.match(number,/^VRS-\d{6}$/);assert.ok(!('phone' in rows[0]));assert.ok(!('birthDate' in rows[0]));
 assert.equal((await list({id:'owner'},'pending'))[0].membershipNumber,null);assert.equal((await list({id:'owner'},'rejected'))[0].membershipNumber,null);
 raw.prepare("UPDATE garage_moderation SET status='approved' WHERE member_id='pending'").run();rows=await list();assert.equal(rows.length,2);assert.equal(rows.find(r=>r.id==='approved').membershipNumber,number);assert.match(rows.find(r=>r.id==='pending').membershipNumber,/^VRS-\d{6}$/);
 }finally{raw.close();}
});

