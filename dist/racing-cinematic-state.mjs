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
