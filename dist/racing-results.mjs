import {lapTime,LEVELS} from './racing-physics.mjs';
const aliasKey='club-racing-pilot-v1',queueKey='club-racing-pending-v1';
export function normalizePilot(value){const name=String(value||'').trim().replace(/\s+/g,' ');return /^[\p{L}\p{N} ._'’\-]{2,32}$/u.test(name)?name:null;}
export function raceResult(race,pilot,id=crypto.randomUUID()){
 if(race.phase!=='finished'||race.completedLaps!==3||race.lapTimes.length!==3)throw new Error('La carrera todavía no ha terminado.');
 const name=normalizePilot(pilot);if(!name)throw new Error('Escribe tu nombre o alias.');
 return {id,pilot:name,level:race.difficulty,total:Math.round(race.elapsed*1000),laps:race.lapTimes.map(t=>Math.round(t*1000)),position:race.position};
}
export function createRaceResults(root,levelPicker){
 const input=root.querySelector('[data-pilot-name]'),message=root.querySelector('[data-results-status]'),body=root.querySelector('[data-results-body]'),retry=root.querySelector('[data-results-retry]');
 try{input.value=localStorage.getItem(aliasKey)||'';}catch{}
 let pilot='',loading=0,busy=false;
 function pending(){try{const value=JSON.parse(localStorage.getItem(queueKey)||'[]');return Array.isArray(value)?value:[];}catch{return [];}}
 let queue=pending();function keep(){try{localStorage.setItem(queueKey,JSON.stringify(queue));return true;}catch{return false;}}
 function report(text){message.textContent=text;retry.hidden=!queue.length;}
 async function refresh(){const generation=++loading;try{const response=await fetch('/api/racing/results?level='+encodeURIComponent(levelPicker.value),{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error();const rows=await response.json();if(generation!==loading)return;body.replaceChildren();if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=5;td.textContent='Todavía no hay carreras terminadas en este nivel. ¡Estrena la clasificación!';tr.append(td);body.append(tr);}for(const [index,row] of rows.entries()){const tr=document.createElement('tr');for(const value of [index+1,row.pilot,lapTime(row.total_ms/1000),lapTime(row.best_ms/1000),row.position+'.º']){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}body.append(tr);}root.querySelector('[data-results-level]').textContent=LEVELS[levelPicker.value].name;}catch{if(generation===loading){body.replaceChildren();const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=5;td.textContent='No se puede cargar la clasificación ahora. Puedes seguir jugando.';tr.append(td);body.append(tr);}}}
 async function flush(){if(busy||!queue.length)return;busy=true;report('Guardando el tiempo de carrera…');try{while(queue.length){const result=queue[0],response=await fetch('/api/racing/results',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result),signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(response.status===429?'Espera unos minutos antes de reintentar.':'No se ha podido enviar el tiempo.');queue.shift();keep();report('Tiempo de '+result.pilot+' guardado en la clasificación del club.');}await refresh();}catch(error){const local=keep();report((local?'Resultado conservado en este dispositivo. ':'Mantén esta página abierta para conservar el resultado. ')+error.message+' Pulsa Reintentar.');}finally{busy=false;retry.hidden=!queue.length;}}
 retry.addEventListener('click',()=>void flush());root.querySelector('[data-results-refresh]').addEventListener('click',()=>void refresh());window.addEventListener('online',()=>void flush());levelPicker.addEventListener('change',()=>void refresh());void refresh();if(queue.length)void flush();
 return {input,
  enter(){const name=normalizePilot(input.value);if(!name){input.setCustomValidity('Escribe un nombre o alias de 2 a 32 letras o números.');input.reportValidity();input.focus();return null;}input.setCustomValidity('');input.value=name;pilot=name;try{localStorage.setItem(aliasKey,name);}catch{}return pilot;},
  lock(locked){input.disabled=locked;},
  finish(race){try{const result=raceResult(race,pilot);queue.push(result);keep();void flush();}catch(error){report(error.message);}},
 };
}
