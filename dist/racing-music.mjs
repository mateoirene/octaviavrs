// Audio facilitado por el club. La reproducción requiere pulsar la radio.
export function createMusic(){
 const track=document.createElement('audio');
 track.src=new URL('./assets/audio/radio-club.mp3',import.meta.url).href;
 track.preload='none';track.loop=true;track.volume=.65;
 track.dataset.raceRadio='';track.hidden=true;document.body.append(track);
 let generation=0;
 return {
  async start(){const attempt=++generation;await track.play();if(attempt!==generation)track.pause();},
  stop(){generation++;track.pause();},
  get playing(){return !track.paused&&!track.ended;}
 };
}
