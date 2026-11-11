// Synthesized sound only; the optional club radio uses its existing licensed file.
export function createHighwayAudio(){
 let context,master,engine,engine2,engineGain,filter,noiseBuffer,tyre,tyreGain,traffic,trafficGain,enabled=false,lastHit=0;
 async function enable(){
  if(!context){const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)throw Error('Audio no disponible');context=new Audio();master=context.createGain();master.gain.value=0;master.connect(context.destination);
   engineGain=context.createGain();engineGain.gain.value=.018;filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;engineGain.connect(filter);filter.connect(master);
   engine=context.createOscillator();engine.type='sawtooth';engine.frequency.value=45;engine.connect(engineGain);engine.start();engine2=context.createOscillator();engine2.type='triangle';engine2.frequency.value=91;engine2.connect(engineGain);engine2.start();
   noiseBuffer=context.createBuffer(1,context.sampleRate,context.sampleRate);const data=noiseBuffer.getChannelData(0);let seed=17;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=seed/2147483647*2-1;}
   tyre=context.createBufferSource();tyre.buffer=noiseBuffer;tyre.loop=true;const tf=context.createBiquadFilter();tf.type='bandpass';tf.frequency.value=1100;tyreGain=context.createGain();tyreGain.gain.value=0;tyre.connect(tf);tf.connect(tyreGain);tyreGain.connect(master);tyre.start();
   traffic=context.createOscillator();traffic.type='triangle';traffic.frequency.value=100;trafficGain=context.createGain();trafficGain.gain.value=0;traffic.connect(trafficGain);trafficGain.connect(master);traffic.start();
  }
  await context.resume();enabled=true;
 }
 function update(state){if(!context)return;const t=context.currentTime,running=enabled&&state.phase==='running';master.gain.setTargetAtTime(running?.75:0,t,.05);if(!running)return;const rpm=42+state.speed*3.1+(state.acceleration>0?10:0);engine.frequency.setTargetAtTime(rpm,t,.08);engine2.frequency.setTargetAtTime(rpm*2.02,t,.08);filter.frequency.setTargetAtTime(430+state.speed*13,t,.1);tyreGain.gain.setTargetAtTime((state.braking&&state.speed>5?.045:0)+Math.min(.025,Math.abs(state.lateralAccel)*.002),t,.06);const near=state.traffic.reduce((min,c)=>Math.min(min,Math.abs(c.distance-state.distance)),100);trafficGain.gain.setTargetAtTime(Math.max(0,1-near/35)*.018,t,.09);traffic.frequency.setTargetAtTime(85+state.speed,t,.1);
  if(state.collisions>lastHit){const hit=context.createBufferSource(),gain=context.createGain(),low=context.createBiquadFilter();hit.buffer=noiseBuffer;low.type='lowpass';low.frequency.value=350;gain.gain.setValueAtTime(.18,t);gain.gain.exponentialRampToValueAtTime(.001,t+.28);hit.connect(low);low.connect(gain);gain.connect(master);hit.start(t);hit.stop(t+.3);hit.onended=()=>{hit.disconnect();low.disconnect();gain.disconnect();};}lastHit=state.collisions;
 }
 return {get enabled(){return enabled;},async toggle(){if(enabled){enabled=false;master.gain.setTargetAtTime(0,context.currentTime,.04);}else await enable();return enabled;},update,mute(){if(context)master.gain.setTargetAtTime(0,context.currentTime,.04);},dispose(){enabled=false;void context?.close();}};
}
