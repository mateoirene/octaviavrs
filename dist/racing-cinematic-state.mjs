export const OVERTAKE_SEQUENCE_SECONDS=7;
export function createOvertakeSequence(){return {elapsed:0,active:false,played:false,previousPosition:null};}
export function advanceOvertakeSequence(sequence,position,phase,dt,overtaken){
 if(phase!=='running')return false;
 const trigger=!sequence.played&&(overtaken===undefined?sequence.previousPosition===1&&position===2:overtaken);
 sequence.previousPosition=position;
 if(trigger){sequence.active=true;sequence.played=true;sequence.elapsed=0;}
 else if(sequence.active){sequence.elapsed=Math.min(OVERTAKE_SEQUENCE_SECONDS,sequence.elapsed+Math.max(0,dt));if(sequence.elapsed>=OVERTAKE_SEQUENCE_SECONDS)sequence.active=false;}
 return trigger;
}
export function igniteTesla(race){const car=race.rivals?.find(item=>item.model==='tesla-model-3');if(!car)return null;if(!Number.isFinite(race.teslaFireStartedAt))race.teslaFireStartedAt=race.elapsed;car.retired=true;car.speed=0;return car;}
export function teslaFireTime(race){return Number.isFinite(race.teslaFireStartedAt)?Math.max(0,race.elapsed-race.teslaFireStartedAt):null;}

// Compara distancias reales sin módulo: también detecta el adelantamiento de un rival IA.
export function teslaLeaderOvertake(sequence,race){
 if(race.phase!=='running')return false;
 const tesla=race.rivals?.find(c=>c.model==='tesla-model-3');if(!tesla||tesla.retired)return false;
 const leader=Math.max(race.distance,...race.rivals.filter(c=>c!==tesla&&!c.retired).map(c=>c.distance));
 const gap=leader-tesla.distance,trigger=Number.isFinite(sequence.previousTeslaGap)&&sequence.previousTeslaGap<0&&gap>=0;
 sequence.previousTeslaGap=gap;return trigger;
}
