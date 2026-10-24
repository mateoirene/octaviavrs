export const OVERTAKE_SEQUENCE_SECONDS=7;
export function createOvertakeSequence(){return {elapsed:0,active:false,played:false,previousPosition:null};}
export function advanceOvertakeSequence(sequence,position,phase,dt){
 if(phase!=='running')return false;
 const trigger=!sequence.played&&sequence.previousPosition===1&&position===2;
 sequence.previousPosition=position;
 if(trigger){sequence.active=true;sequence.played=true;sequence.elapsed=0;}
 else if(sequence.active){sequence.elapsed=Math.min(OVERTAKE_SEQUENCE_SECONDS,sequence.elapsed+Math.max(0,dt));if(sequence.elapsed>=OVERTAKE_SEQUENCE_SECONDS)sequence.active=false;}
 return trigger;
}
export function igniteTesla(race){const car=race.rivals?.find(item=>item.model==='tesla-model-3');if(!car)return null;if(!Number.isFinite(race.teslaFireStartedAt))race.teslaFireStartedAt=race.elapsed;car.retired=true;car.speed=0;return car;}
export function teslaFireTime(race){return Number.isFinite(race.teslaFireStartedAt)?Math.max(0,race.elapsed-race.teslaFireStartedAt):null;}
