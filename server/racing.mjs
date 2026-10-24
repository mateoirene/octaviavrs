import {buildTrack,SEGMENT_LENGTH,MAX_SPEED,LEVELS} from '../dist/racing-physics.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const invalid=message=>{throw Object.assign(new Error(message),{status:400});};
export function validateRaceResult(body){
 const pilot=typeof body.pilot==='string'?body.pilot.trim().replace(/\s+/g,' '):'';
 if(!/^[\p{L}\p{N} ._'’\-]{2,32}$/u.test(pilot))invalid('Escribe un nombre o alias de 2 a 32 letras o números.');
 if(!Object.hasOwn(LEVELS,body.level))invalid('El circuito no es válido.');
 if(!/^[0-9a-f-]{36}$/i.test(String(body.id||'')))invalid('La carrera no es válida.');
 const laps=body.laps;if(!Array.isArray(laps)||laps.length!==3)invalid('Termina las tres vueltas para guardar el tiempo.');
 const minimum=buildTrack(body.level).length*SEGMENT_LENGTH/MAX_SPEED*1000;
 if(laps.some(t=>!Number.isInteger(t)||t<minimum-250||t>86400000))invalid('Los tiempos de vuelta no son válidos.');
 if(!Number.isInteger(body.total)||Math.abs(laps.reduce((sum,t)=>sum+t,0)-body.total)>2||body.total>86400000)invalid('El tiempo total no coincide con las vueltas.');
 if(!Number.isInteger(body.position)||body.position<1||body.position>4)invalid('La posición no es válida.');
 return {id:body.id,pilot,level:body.level,total:body.total,laps,best:Math.min(...laps),position:body.position};
}
export async function handleRacingRequest(request,db,limit){
 const url=new URL(request.url);
 if(url.pathname==='/api/racing/results'&&request.method==='GET'){
  const level=url.searchParams.get('level')||'easy';if(!Object.hasOwn(LEVELS,level))invalid('El circuito no es válido.');
  const rows=(await db.prepare('SELECT id,pilot,level,total_ms,best_ms,position,created_at FROM racing_results WHERE level=? ORDER BY total_ms ASC,created_at ASC LIMIT 30').bind(level).all()).results;
  return json(rows);
 }
 if(url.pathname==='/api/racing/results'&&request.method==='POST'){
  const result=validateRaceResult(await request.json());
  const existing=await db.prepare('SELECT id,pilot,level,total_ms FROM racing_results WHERE id=?').bind(result.id).first();
  if(existing){if(existing.pilot!==result.pilot||existing.level!==result.level||existing.total_ms!==result.total)invalid('El identificador ya pertenece a otra carrera.');return json({id:result.id,saved:true});}
  await limit('race-result',15);
  await db.prepare('INSERT INTO racing_results(id,pilot,level,total_ms,best_ms,laps_json,position,created_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(result.id,result.pilot,result.level,result.total,result.best,JSON.stringify(result.laps),result.position,Math.floor(Date.now()/1000)).run();
  return json({id:result.id,saved:true},201);
 }
 return json({error:'Ruta no encontrada.'},404);
}
