import {createOvertakeSequence,advanceOvertakeSequence,igniteTesla} from './racing-cinematic-state.mjs?v=20261024-teslafuego';
export function createOvertakeCinematic(stage){
 let sequence=createOvertakeSequence(),mirror,world,ready=false;
 const panel=document.createElement('div');panel.className='race-mirror-cinematic';panel.hidden=true;
 Object.assign(panel.style,{position:'absolute',left:'22%',top:'3%',width:'56%',height:'25%',zIndex:6,border:'5px solid #24282c',borderRadius:'35% / 25%',overflow:'hidden',background:'#64717c',boxShadow:'0 5px 18px #0009',pointerEvents:'none'});
 panel.setAttribute('aria-label','Retrovisor del líder: Tesla Model 3 ALBERTO ardiendo se aleja');
 const label=document.createElement('span');label.textContent='TESLA MODEL 3 FUERA DE CARRERA';Object.assign(label.style,{position:'absolute',bottom:'4px',left:0,width:'100%',textAlign:'center',color:'#ff3434',font:'bold clamp(8px,1.2vw,15px) Arial',textShadow:'0 1px 3px #000'});panel.append(label);stage.append(panel);
 const blink=label.animate([{opacity:1},{opacity:.25},{opacity:1}],{duration:1400,iterations:Infinity});if(matchMedia('(prefers-reduced-motion: reduce)').matches)blink.pause();
 import('./racing-mirror3d.mjs?v=20261024-teslafuego').then(m=>m.createBurningMirror(panel)).then(value=>{world=value;ready=true;stage.dataset.mirror3d='ready';}).catch(()=>{const c=document.createElement('canvas');c.width=480;c.height=160;panel.prepend(c);Object.assign(c.style,{width:'100%',height:'100%'});const x=c.getContext('2d'),teslaImage=new Image();teslaImage.src='assets/tesla-model3-alberto.png';world={render(t){x.fillStyle='#a9bbc6';x.fillRect(0,0,480,160);x.fillStyle='#393d40';x.beginPath();x.moveTo(190,60);x.lineTo(290,60);x.lineTo(480,160);x.lineTo(0,160);x.fill();const size=70/(1+t*.6);x.save();x.translate(240,95);if(teslaImage.complete&&teslaImage.naturalWidth){const h=size*teslaImage.height/teslaImage.width;x.drawImage(teslaImage,-size/2,-h,size,h);}else{x.fillStyle='#ffffff';x.fillRect(-size/2,-size*.5,size,size*.5);}for(let i=0;i<8;i++){x.fillStyle='rgba(45,40,37,.28)';x.beginPath();x.arc(Math.sin(i+t)*size*.2,-size*.6-i*size*.2,size*(.2+i*.03),0,Math.PI*2);x.fill();}x.fillStyle='#ff9e22';for(let i=0;i<7;i++){x.beginPath();x.moveTo((i/7-.5)*size,-size*.1);x.lineTo((i/7-.4)*size,-size*(.6+.35*Math.sin(i+t*12)));x.lineTo((i/7-.3)*size,-size*.1);x.fill();}x.restore();panel.style.opacity=String(Math.min(1,t*5)*Math.min(1,(5.75-t)*2));},dispose(){c.remove();}};ready=true;stage.dataset.mirror3d='2d-compatible';});

 return {
  reset(){sequence=createOvertakeSequence();panel.hidden=true;stage.dataset.overtakeCinematic='idle';},
  update(race,dt){if(race.phase==='finished'){sequence.active=false;panel.hidden=true;return false;}const triggered=advanceOvertakeSequence(sequence,race.position,race.phase,dt);if(triggered){igniteTesla(race);stage.dataset.burningVehicle='tesla-model-3';stage.dataset.overtakeCinematic='fire';stage.dispatchEvent(new CustomEvent('race-overtake-cinematic'));}if(!sequence.active){panel.hidden=true;if(sequence.played)stage.dataset.overtakeCinematic='complete';return triggered;}stage.dataset.overtakeCinematic=sequence.elapsed<1.25?'fire':'mirror';panel.hidden=sequence.elapsed<1.25||!ready;if(!panel.hidden)world.render(sequence.elapsed-1.25);return triggered;},
  draw(){},
  dispose(){blink.cancel();world?.dispose();panel.remove();}
 };
}
