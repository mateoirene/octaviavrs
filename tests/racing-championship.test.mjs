import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {CIRCUITS} from '../dist/racing-circuits.mjs';
import {createCircuitLayout} from '../dist/circuit-layout.mjs';
import {createRace,stepRace} from '../dist/racing-physics.mjs';
import {nextChampionshipCircuit} from '../dist/racing-championship.mjs';
import {createOvertakeSequence,teslaLeaderOvertake,advanceOvertakeSequence,igniteTesla} from '../dist/racing-cinematic-state.mjs';
import {handleMarketRequest} from '../server/market.mjs';

test('25 pistas con recorrido propio, cierre, escala y Tesla blanco en los tres niveles',()=>{
 assert.equal(CIRCUITS.length,25);const signatures=new Set();
 for(const c of CIRCUITS){const layout=createCircuitLayout('easy',c.length,c.id);assert.ok(c.length>3000&&c.length<8000);assert.deepEqual(layout.position(0),layout.position(c.length));const signature=[];for(let d=0;d<c.length;d+=37){const f=layout.frame(d);assert.ok([...f.p,...f.t,...f.r,layout.curvature(d)].every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...f.t)-1)<1e-6);signature.push(...f.p.map(n=>Math.round(n)));}signatures.add(signature.join(','));for(const level of ['easy','intermediate','expert']){const race=createRace(null,level,c.id);assert.equal(race.trackLength,c.length);assert.equal(race.circuit,c.id);assert.equal(race.rivals.length,3);const tesla=race.rivals.find(car=>car.model==='tesla-model-3');assert.equal(tesla.color,'#ffffff');assert.equal(tesla.name,'ALBERTO');race.phase='running';stepRace(race,{accelerate:true},.05);assert.ok(Number.isFinite(race.distance));}}
 assert.equal(signatures.size,25);
 const suzuka=CIRCUITS.find(c=>c.id==='suzuka');assert.ok(Math.max(...suzuka.points.map(p=>p[1]))>9,'Paso elevado de Suzuka');
 assert.equal(nextChampionshipCircuit([]).id,'melbourne');assert.equal(nextChampionshipCircuit([{circuit:'melbourne',position:2}]).id,'melbourne');assert.equal(nextChampionshipCircuit([{circuit:'melbourne',position:1}]).id,'shanghai');assert.equal(nextChampionshipCircuit(CIRCUITS.map(c=>({circuit:c.id,position:1}))),null);
});
test('adelantamiento real al Tesla por el primer Skoda, una vez y con pausa',()=>{
 const race=createRace(null,'easy','monza'),sequence=createOvertakeSequence();race.phase='running';const tesla=race.rivals[2];tesla.distance=100;race.rivals[0].distance=95;race.rivals[1].distance=90;assert.equal(teslaLeaderOvertake(sequence,race),false);race.phase='paused';race.rivals[0].distance=101;assert.equal(teslaLeaderOvertake(sequence,race),false);race.phase='running';const overtaken=teslaLeaderOvertake(sequence,race);assert.equal(overtaken,true);assert.equal(advanceOvertakeSequence(sequence,4,'running',.05,overtaken),true);igniteTesla(race);assert.equal(tesla.retired,true);assert.equal(tesla.speed,0);assert.equal(advanceOvertakeSequence(sequence,4,'running',.05,true),false);assert.equal(race.speed,0);
});
function fixture(){const raw=new DatabaseSync(':memory:');raw.exec(readFileSync(new URL('../server/schema.sql',import.meta.url),'utf8'));const db={prepare(sql){const stmt=raw.prepare(sql);let args=[];const q={bind(...v){args=v;return q;},async first(){return stmt.get(...args)||null;},async all(){return {results:stmt.all(...args)};},async run(){return {meta:{changes:Number(stmt.run(...args).changes)}};}};return q;},async batch(statements){raw.exec('BEGIN');try{for(const s of statements)await s.run();raw.exec('COMMIT');}catch(e){raw.exec('ROLLBACK');throw e;}}};const call=(path,body)=>handleMarketRequest(new Request('https://club.example/api/racing/'+path,{method:body?'POST':'GET',headers:{Origin:'https://club.example','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),{MARKET_DB:db});return {raw,call};}
const racer=crypto.randomUUID();const result=(changes={})=>({id:crypto.randomUUID(),pilot:'Piloto Club',level:'easy',circuit:'melbourne',car:'Skoda de Raúl',paint:'red',mode:'championship',racer,total:360000,laps:[120000,120000,120000],position:1,...changes});
test('puntos en SQLite compartidos, orden validado, repetir no suma, libre y dificultad separados',async()=>{
 const {raw,call}=fixture();try{
  assert.equal((await call('results',result({circuit:'shanghai'}))).status,400);
  const first=result({position:2});assert.equal((await call('results',first)).status,201);assert.equal((await call('results',first)).status,200);
  let table=await(await call('championship?level=easy&racer='+racer)).json();assert.equal(table.standings[0].points,18);assert.equal(table.progress[0].position,2);
  assert.equal((await call('results',result({circuit:'shanghai'}))).status,400);
  const win=result();assert.equal((await call('results',win)).status,201);assert.equal((await call('results',result())).status,201);
  table=await(await call('championship?level=easy&racer='+racer)).json();assert.equal(table.standings[0].points,25);assert.equal(table.standings[0].wins,1);assert.equal(table.standings[0].car,'Skoda de Raúl');
  assert.equal((await call('results',result({circuit:'shanghai'}))).status,201);
  assert.equal((await call('results',result({circuit:'suzuka'}))).status,201);
  table=await(await call('championship?level=easy&racer='+racer)).json();assert.equal(table.standings[0].points,75);assert.equal(table.progress.length,3);
  assert.equal((await(await call('championship?level=expert')).json()).standings.length,0);
  assert.equal((await call('results',result({circuit:'spa',mode:'free'}))).status,201);
  assert.equal((await(await call('results?level=easy&circuit=spa')).json()).length,1);
  assert.equal((await(await call('results?level=easy')).json()).length,0);
  assert.equal((await call('results',{...win,circuit:'monza'})).status,400);
  assert.equal((await call('results',result({car:'<script>x</script>'}))).status,400);
  assert.equal(raw.prepare('SELECT COUNT(*) n FROM racing_results').get().n,6);
 }finally{raw.close();}
});
