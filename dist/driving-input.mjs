// Standard Gamepad mapping; no identifiers or input data are stored or sent.
const amount=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
export function readGamepad(pads=[]){
 const pad=Array.from(pads||[]).find(p=>p?.connected&&p.mapping==='standard');
 const result={accelerate:0,brake:0,left:0,right:0,pause:false,camera:false,connected:!!pad};
 if(!pad)return result;
 const button=i=>amount(pad.buttons?.[i]?.value),raw=pad.axes?.[0]||0;
 const axis=Math.abs(raw)<.14?0:Math.sign(raw)*Math.min(1,(Math.abs(raw)-.14)/.86);
 return {...result,accelerate:Math.max(button(7),button(0)),brake:Math.max(button(6),button(1)),left:Math.max(-axis,button(14)),right:Math.max(axis,button(15)),pause:button(9)>.5,camera:button(3)>.5};
}
export function mergeDrivingInput(held,pad){return Object.fromEntries(['accelerate','brake','left','right'].map(k=>[k,Math.max(held.has(k)?1:0,pad[k]||0)]));}
export function createGamepadReader(getPads=()=>globalThis.navigator?.getGamepads?.()||[]){
 let previous={pause:false,camera:false,connected:false};
 return {reset(){previous={pause:false,camera:false,connected:false};},poll(){
  let pads=[];try{pads=getPads();}catch{}
  const value=readGamepad(pads),events={pause:value.pause&&!previous.pause,camera:value.camera&&!previous.camera,disconnected:previous.connected&&!value.connected};
  previous=value;return {...value,events};
 }};
}
