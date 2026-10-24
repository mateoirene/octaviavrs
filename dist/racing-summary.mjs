import {lapTime,LEVELS} from './racing-physics.mjs';
export function finalRaceSummary(race,pilot){
 if(race.phase!=='finished'||race.completedLaps!==3||race.lapTimes.length!==3)throw new Error('Termina la carrera para ver el resumen.');
 return {pilot:String(pilot),level:LEVELS[race.difficulty].name,position:race.position,participants:race.rivals.length+1,total:race.elapsed,best:Math.min(...race.lapTimes),laps:[...race.lapTimes]};
}
export function createRaceSummary(panel){
 const image=panel.querySelector('[data-summary-image]');
 return {
  hide(){panel.hidden=true;image.removeAttribute('src');},
  show(race,pilot,hudCanvas,worldCanvas){
   const summary=finalRaceSummary(race,pilot);
   panel.querySelector('[data-summary-title]').textContent='Resumen final · '+summary.pilot;
   panel.querySelector('[data-summary-position]').textContent=summary.position+'.º de '+summary.participants;
   panel.querySelector('[data-summary-level]').textContent=summary.level;
   panel.querySelector('[data-summary-total]').textContent=lapTime(summary.total);
   panel.querySelector('[data-summary-best]').textContent=lapTime(summary.best);
   const list=panel.querySelector('[data-summary-laps]');list.replaceChildren();summary.laps.forEach((time,i)=>{const li=document.createElement('li');li.textContent='Vuelta '+(i+1)+' · '+lapTime(time);list.append(li);});
   // Capture synchronously after the aerial render, before WebGL's drawing buffer is discarded.
   try{const snapshot=document.createElement('canvas');snapshot.width=Math.min(1200,hudCanvas.width);snapshot.height=Math.round(snapshot.width*hudCanvas.height/hudCanvas.width);const context=snapshot.getContext('2d');if(worldCanvas)context.drawImage(worldCanvas,0,0,snapshot.width,snapshot.height);context.drawImage(hudCanvas,0,0,snapshot.width,snapshot.height);image.src=snapshot.toDataURL('image/jpeg',.88);image.hidden=false;image.alt='Vista aérea al terminar la carrera de '+summary.pilot+', circuito '+summary.level+'.';}catch{image.hidden=true;}
   panel.hidden=false;return summary;
  }
 };
}
