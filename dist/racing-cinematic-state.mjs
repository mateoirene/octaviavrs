// Compatibilidad con versiones antiguas del simulador. La secuencia de fuego y
// retrovisor se ha retirado: el Tesla ya no abandona al ser adelantado.
export const OVERTAKE_SEQUENCE_SECONDS=0;
export function createOvertakeSequence(){return {elapsed:0,active:false,played:false,disabled:true};}
export function advanceOvertakeSequence(){return false;}
export function igniteTesla(race){return race.rivals?.find(item=>item.model==='tesla-model-3')||null;}
export function teslaFireTime(){return null;}
export function teslaLeaderOvertake(){return false;}
