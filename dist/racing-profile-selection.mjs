// Remember IDs only. The authoritative profiles are always fetched again.
const key='club-circuit-pilot-selection-v1';
const id=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(value)?value:'';
export function readPilotSelection(storage){try{const row=JSON.parse(storage.getItem(key));return {player:id(row?.player),rivals:Array.from({length:3},(_,i)=>id(row?.rivals?.[i]))};}catch{return {player:'',rivals:['','','']};}}
export function savePilotSelection(storage,selection){try{storage.setItem(key,JSON.stringify({player:id(selection.player),rivals:Array.from({length:3},(_,i)=>id(selection.rivals?.[i]))}));return true;}catch{return false;}}
