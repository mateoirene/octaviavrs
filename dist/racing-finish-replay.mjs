import {drawOriginalOctavia} from './racing-photo-views.mjs?v=20261027';
import {drawSideWheels} from './racing-wheels.mjs?v=20261024-ruedas2';
import {drawSideContactShadow} from './racing-contact-shadows.mjs?v=20261028-grounded-tesla';
export function raceWinner(race,pilot){
 if(race.phase!=='finished')throw new Error('La carrera todavía no ha terminado.');
 const candidates=[{player:true,index:-1,pilot:String(pilot),model:'octavia',time:race.elapsed}];
 race.rivals.forEach((car,index)=>{const time=Number.isFinite(car.finishTime)?car.finishTime:car.distance>=race.trackLength*3?race.elapsed-Math.max(0,car.distance-race.trackLength*3)/Math.max(1,car.speed):Infinity;candidates.push({player:false,index,pilot:car.model==='tesla-model-3'?'ALBERTO':'Octavia '+(index+1),model:car.model||'octavia',time});});
 return candidates.reduce((a,b)=>b.time<a.time?b:a);
}
export function finishReplayFrame(elapsed){
 // Both shots cover exactly the same 40 metres at 72 km/h reference speed.
 if(elapsed<0||elapsed>=10)return null;
 const fast=elapsed>=8,progress=fast?Math.min(1,(elapsed-8)/1):elapsed/8;
 return {pass:fast?2:1,rate:fast?2:.25,mode:fast?'CÁMARA RÁPIDA · ×2':'CÁMARA LENTA · ×0,25',distance:-8+40*progress,hold:elapsed>=9};
}
export function createFinishReplay(stage){
 const panel=document.createElement('div');panel.className='race-finish-caption';panel.hidden=true;const title=document.createElement('strong'),mode=document.createElement('span'),skip=document.createElement('button');skip.type='button';skip.textContent='Ver resumen';panel.append(title,mode,skip);stage.append(panel);let active=false,elapsed=0,winner;
 const stop=()=>{active=false;panel.hidden=true;stage.classList.remove('is-finish-replay');stage.dataset.finishReplay='complete';};skip.addEventListener('click',stop);
 return {get active(){return active;},get winner(){return winner;},start(race,pilot){winner=raceWinner(race,pilot);elapsed=0;active=true;title.textContent='GANADOR · '+winner.pilot;panel.hidden=false;stage.classList.add('is-finish-replay');stage.dataset.finishReplay='playing';stage.dataset.replayWinner=winner.pilot;},stop,
 advance(dt){if(!active)return null;if(!document.hidden)elapsed+=Math.max(0,dt);const shot=finishReplayFrame(elapsed);if(!shot){stop();return null;}mode.textContent='Pasada '+shot.pass+'/2 · '+shot.mode;stage.dataset.replayPass=String(shot.pass);stage.dataset.replayRate=String(shot.rate);return {...shot,winner};}};
}
export function drawCompatibleFinish(ctx,width,height,shot,photos){
 ctx.fillStyle='#9faeb6';ctx.fillRect(0,0,width,height);if(photos.stadium)ctx.drawImage(photos.stadium,0,0,width,height);ctx.fillStyle='#35393d';ctx.beginPath();ctx.moveTo(width*.3,height*.28);ctx.lineTo(width*.7,height*.28);ctx.lineTo(width,height);ctx.lineTo(0,height);ctx.fill();const stripeY=height*(.55+(shot.distance-2.5)/80),groundY=height*.78,shadowWidth=Math.min(width*.58,height*.8);for(let i=0;i<16;i++){ctx.fillStyle=i%2?'#f3f3ed':'#15191c';ctx.fillRect(i*width/16,stripeY,width/16,height*.035);}drawSideContactShadow(ctx,width/2,groundY,shadowWidth);if(photos.photoCars&&shot.winner.model!=='tesla-model-3'&&drawOriginalOctavia(ctx,photos.originalOctavia,'rear-right',width/2,groundY,Math.min(height*.46,width*.35),shot.distance))return;const image=shot.winner.model==='tesla-model-3'?(photos.teslaSide||photos.tesla):(shot.winner.player?(photos.playerSide||photos.octaviaSide||photos.rival):(photos.octaviaSide||photos.rival));if(image){const w=shadowWidth,h=w*image.height/image.width;const left=(width-w)/2,top=groundY-h;ctx.drawImage(image,left,top,w,h);if(image===photos.teslaSide||image===photos.octaviaSide||image===photos.playerSide)drawSideWheels(ctx,image,shot.winner.model,left,top,w,shot.distance);}}
