import {NITRO_SPEED} from '../dist/racing-nitro.mjs';
import {buildTrack,SEGMENT_LENGTH,MAX_SPEED,LEVELS} from '../dist/racing-physics.mjs';
import {CIRCUITS,CIRCUIT_BY_ID,POINTS,SKODA_PAINTS} from '../dist/racing-circuits.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const invalid=message=>{throw Object.assign(new Error(message),{status:400});};
function validCircuit(id){return id==='club'||Object.hasOwn(CIRCUIT_BY_ID,id);}
export function validateRaceResult(body){
 const pilot=typeof body.pilot==='string'?body.pilot.trim().replace(/\s+/g,' '):'';
 if(!/^[\p{L}\p{N} ._'’\-]{2,32}$/u.test(pilot))invalid('Escribe un nombre o alias de 2 a 32 letras o números.');
 if(!Object.hasOwn(LEVELS,body.level))invalid('El nivel no es válido.');
 const circuit=body.circuit??'club';if(!validCircuit(circuit))invalid('El circuito no es válido.');
 if(!/^[0-9a-f-]{36}$/i.test(String(body.id||'')))invalid('La carrera no es válida.');
 const laps=body.laps;if(!Array.isArray(laps)||laps.length!==3)invalid('Termina las tres vueltas para guardar el tiempo.');
 const minimum=buildTrack(body.level,circuit).length*SEGMENT_LENGTH/MAX_SPEED*1000;
 const boostedMinimum=buildTrack(body.level,circuit).length*SEGMENT_LENGTH/NITRO_SPEED*1000;
 if(laps.some((t,i)=>!Number.isInteger(t)||t<boostedMinimum-250||t>86400000))invalid('Los tiempos de vuelta no son válidos.');
 if(!Number.isInteger(body.total)||Math.abs(laps.reduce((sum,t)=>sum+t,0)-body.total)>2||body.total>86400000)invalid('El tiempo total no coincide con las vueltas.');
 if(!Number.isInteger(body.position)||body.position<1||body.position>4)invalid('La posición no es válida.');
 const car=body.car??'Octavia VRS MK4',paint=body.paint??'blue',mode=body.mode??'free',racer=body.racer??('legacy:'+pilot.toLowerCase());
 if(typeof car!=='string'||!/^[\p{L}\p{N} ._'’\-]{2,48}$/u.test(car)||!Object.hasOwn(SKODA_PAINTS,paint))invalid('El nombre o color del Škoda no es válido.');
 if(!['free','championship'].includes(mode))invalid('El modo de carrera no es válido.');
 if(body.racer!==undefined&&!/^[0-9a-f-]{36}$/i.test(String(racer)))invalid('El piloto no es válido.');
 if(mode==='championship'&&(circuit==='club'||!body.racer))invalid('Selecciona una prueba del campeonato.');
 return {id:body.id,pilot,level:body.level,circuit,car,paint,mode,racer,total:body.total,laps,best:Math.min(...laps),position:body.position};
}
export async function handleRacingRequest(request,db,limit){
 const url=new URL(request.url),level=url.searchParams.get('level')||'easy';
 if(request.method==='GET'&&!Object.hasOwn(LEVELS,level))invalid('El nivel no es válido.');
 if(url.pathname==='/api/racing/results'&&request.method==='GET'){
  const circuit=url.searchParams.get('circuit')||'club';if(!validCircuit(circuit))invalid('El circuito no es válido.');
  const rows=(await db.prepare("SELECT r.id,r.pilot,r.level,r.total_ms,r.best_ms,r.position,r.created_at,COALESCE(e.car,'Octavia VRS MK4') car,COALESCE(e.paint,'blue') paint FROM racing_results r LEFT JOIN racing_entries e ON e.result_id=r.id WHERE r.level=? AND COALESCE(e.circuit,'club')=? ORDER BY r.total_ms ASC,r.created_at ASC LIMIT 30").bind(level,circuit).all()).results;
  return json(rows);
 }
 if(url.pathname==='/api/racing/championship'&&request.method==='GET'){
  const standings=(await db.prepare(`WITH ranked AS (SELECT r.*,e.*,ROW_NUMBER() OVER(PARTITION BY e.racer_id,e.circuit ORDER BY r.position ASC,r.total_ms ASC,r.created_at ASC) choice FROM racing_results r JOIN racing_entries e ON e.result_id=r.id WHERE r.level=? AND e.mode='championship') SELECT racer_id,MAX(pilot) pilot,MAX(car) car,SUM(CASE position WHEN 1 THEN 25 WHEN 2 THEN 18 WHEN 3 THEN 15 ELSE 12 END) points,SUM(CASE WHEN position=1 THEN 1 ELSE 0 END) wins,COUNT(*) rounds,SUM(total_ms) total_ms FROM ranked WHERE choice=1 GROUP BY racer_id ORDER BY points DESC,wins DESC,total_ms ASC,racer_id ASC LIMIT 100`).bind(level).all()).results;
  const racer=url.searchParams.get('racer')||'';if(racer&&!/^[0-9a-f-]{36}$/i.test(racer))invalid('El piloto no es válido.');
  const progress=racer?(await db.prepare("SELECT e.circuit,MIN(r.position) position FROM racing_results r JOIN racing_entries e ON e.result_id=r.id WHERE r.level=? AND e.racer_id=? AND e.mode='championship' GROUP BY e.circuit").bind(level,racer).all()).results:[];
  return json({standings,progress,rounds:CIRCUITS.length});
 }
 if(url.pathname==='/api/racing/results'&&request.method==='POST'){
  const result=validateRaceResult(await request.json());
  const existing=await db.prepare("SELECT r.id,r.pilot,r.level,r.total_ms,COALESCE(e.circuit,'club') circuit,COALESCE(e.car,'Octavia VRS MK4') car,COALESCE(e.paint,'blue') paint,COALESCE(e.mode,'free') mode,e.racer_id FROM racing_results r LEFT JOIN racing_entries e ON e.result_id=r.id WHERE r.id=?").bind(result.id).first();
  if(existing){if(existing.pilot!==result.pilot||existing.level!==result.level||existing.total_ms!==result.total||existing.circuit!==result.circuit||existing.car!==result.car||existing.paint!==result.paint||existing.mode!==result.mode||existing.racer_id&&existing.racer_id!==result.racer)invalid('El identificador ya pertenece a otra carrera.');return json({id:result.id,saved:true});}
  if(result.mode==='championship'){
   const index=CIRCUITS.findIndex(c=>c.id===result.circuit);
   const won=(await db.prepare("SELECT DISTINCT e.circuit FROM racing_results r JOIN racing_entries e ON e.result_id=r.id WHERE e.racer_id=? AND r.level=? AND e.mode='championship' AND r.position=1").bind(result.racer,result.level).all()).results;
   const victories=new Set(won.map(row=>row.circuit));if(CIRCUITS.slice(0,index).some(c=>!victories.has(c.id)))invalid('Gana las pruebas anteriores antes de pasar a este circuito.');
  }
  await limit('race-result',15);
  const statements=[db.prepare('INSERT INTO racing_results(id,pilot,level,total_ms,best_ms,laps_json,position,created_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(result.id,result.pilot,result.level,result.total,result.best,JSON.stringify(result.laps),result.position,Math.floor(Date.now()/1000)),db.prepare('INSERT INTO racing_entries(result_id,racer_id,circuit,car,paint,mode) VALUES(?,?,?,?,?,?) ON CONFLICT(result_id) DO NOTHING').bind(result.id,result.racer,result.circuit,result.car,result.paint,result.mode)];
  if(db.batch)await db.batch(statements);else for(const statement of statements)await statement.run();
  return json({id:result.id,saved:true,points:result.mode==='championship'?POINTS[result.position]:0},201);
 }
 return json({error:'Ruta no encontrada.'},404);
}
