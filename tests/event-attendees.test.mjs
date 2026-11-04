import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {handleMarketRequest} from '../server/market.mjs';
import {validateEventAttendee} from '../server/event-attendees.mjs';
import {attendeeTotals} from '../dist/event-attendees.mjs';

function fixture(){
 const raw=new DatabaseSync(':memory:');raw.exec(readFileSync(new URL('../server/schema.sql',import.meta.url),'utf8'));
 raw.prepare('INSERT INTO market_admins VALUES(?,?,?,?,?)').run('admin','admin@example.com','unused','salt',1);
 raw.prepare('INSERT INTO market_sessions VALUES(?,?,?)').run(createHash('sha256').update('attendee-token').digest('hex'),'admin',Math.floor(Date.now()/1000)+3600);
 const insert=raw.prepare('INSERT INTO club_events VALUES(?,?,?,?,?,?,?,?,?,?,?,?)');insert.run('event-one','2099-01-20','Calçotada de prueba','','Barcelona','13:00','17:00','','',1,1,'admin');insert.run('event-two','2099-02-20','Ruta de prueba','','Girona','09:00','12:00','','',1,1,'admin');
 const prepare=sql=>{const statement=raw.prepare(sql);let args=[];const query={bind(...values){args=values;return query;},async first(){return statement.get(...args)||null;},async all(){return {results:statement.all(...args)};},async run(){return {meta:{changes:Number(statement.run(...args).changes)}};}};return query;};
 const db={prepare},call=(path,{method='GET',body,auth=false,origin='https://club.example'}={})=>handleMarketRequest(new Request('https://club.example/api/club/'+path,{method,headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(auth?{Cookie:'club_session=attendee-token'}:{})},...(body?{body:JSON.stringify(body)}:{})}),{MARKET_DB:db});
 return {raw,call};
}

const attendee={pilotName:'Raúl VRS',attendees:3,plate:'1234 VRS',calcotada:2,vegetarian:1,childMenu:0,depositEuros:'60.50',balanceEuros:'45',paid:false};

test('la lista de asistentes es privada, valida datos y permite CRUD sin filtrar información personal',async()=>{
 const {raw,call}=fixture();try{
  assert.equal((await call('events/event-one/attendees')).status,401);
  assert.equal((await call('events/missing/attendees',{auth:true})).status,404);
  assert.equal((await call('events/event-one/attendees',{method:'POST',body:attendee,auth:true,origin:'https://evil.example'})).status,403);
  for(const invalid of [{attendees:0},{attendees:1.5},{calcotada:-1},{attendees:2,calcotada:2,vegetarian:1},{depositEuros:'10.999'}])assert.equal((await call('events/event-one/attendees',{method:'POST',body:{...attendee,...invalid},auth:true})).status,400);
  const createdResponse=await call('events/event-one/attendees',{method:'POST',body:attendee,auth:true});assert.equal(createdResponse.status,201);const created=await createdResponse.json();
  assert.equal(created.pilotName,'Raúl VRS');assert.equal(created.depositCents,6050);assert.equal(created.balanceCents,4500);assert.ok(!('updatedBy' in created));
  const publicEvents=await(await call('events')).json();assert.ok(!JSON.stringify(publicEvents).includes('Raúl VRS'));assert.ok(!JSON.stringify(publicEvents).includes('1234 VRS'));
  assert.equal((await call('events/event-two/attendees/'+created.id,{method:'POST',body:attendee,auth:true})).status,404);
  const updated=await(await call('events/event-one/attendees/'+created.id,{method:'POST',body:{...attendee,paid:true,balanceEuros:'0'},auth:true})).json();assert.equal(updated.paid,true);assert.equal(updated.balanceCents,0);
  const rows=await(await call('events/event-one/attendees',{auth:true})).json();assert.equal(rows.length,1);assert.equal(rows[0].plate,'1234 VRS');
  assert.equal((await call('events/event-two/attendees/'+created.id,{method:'DELETE',auth:true})).status,404);
  assert.equal((await call('events/event-one',{method:'DELETE',auth:true})).status,200);assert.equal(raw.prepare('SELECT COUNT(*) n FROM club_event_attendees').get().n,0);
  const notifications=JSON.stringify(raw.prepare('SELECT title,message,href FROM club_notifications').all());assert.ok(!notifications.includes('Raúl VRS'));assert.ok(!notifications.includes('1234 VRS'));
 }finally{raw.close();}
});

test('totales e importes se calculan sin decimales binarios',()=>{
 const value=validateEventAttendee({...attendee,depositEuros:'10,25',balanceEuros:'4.75'});assert.equal(value.depositCents,1025);assert.equal(value.balanceCents,475);
 assert.deepEqual(attendeeTotals([{attendees:3,calcotada:2,vegetarian:1,childMenu:0,depositCents:1025,balanceCents:475,paid:true},{attendees:1,calcotada:1,vegetarian:0,childMenu:0,depositCents:500,balanceCents:0,paid:false}]),{pilots:2,attendees:4,calcotada:3,vegetarian:1,childMenu:0,depositCents:1525,balanceCents:475,paid:1});
});
