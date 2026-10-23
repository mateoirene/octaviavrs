// Aviso breve de cierre centralizado: mecanismo y dos pitidos suaves.
export function createCarNotificationSound(host=globalThis){
 let audio,last=-Infinity;
 function unlock(){try{const Context=host.AudioContext||host.webkitAudioContext;if(!Context)return;if(!audio)audio=new Context();if(audio.state==='suspended')void audio.resume().catch(()=>{});}catch{}}
 function play(){if(!audio||audio.state!=='running'||audio.currentTime-last<1)return false;last=audio.currentTime;const time=last+.015;
  function tone(hz,at,duration,type,volume,end=hz){const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(hz,at);oscillator.frequency.exponentialRampToValueAtTime(end,at+duration);gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(volume,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);oscillator.connect(gain);gain.connect(audio.destination);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};oscillator.start(at);oscillator.stop(at+duration+.01);}
  tone(210,time,.065,'sawtooth',.045,75);tone(330,time+.075,.085,'triangle',.06,110);tone(1900,time+.19,.055,'sine',.035,1700);tone(1900,time+.32,.055,'sine',.035,1700);return true;
 }
 return {unlock,play};
}
