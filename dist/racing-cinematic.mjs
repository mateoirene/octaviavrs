import {createOvertakeSequence,advanceOvertakeSequence} from './racing-cinematic-state.mjs';
export function createOvertakeCinematic(stage){
 let sequence=createOvertakeSequence(),mirror,world,ready=false;
 const panel=document.createElement('div');panel.className='race-mirror-cinematic';panel.hidden=true;
 Object.assign(panel.style,{position:'absolute',left:'22%',top:'3%',width:'56%',height:'25%',zIndex:6,border:'5px solid #24282c',borderRadius:'35% / 25%',overflow:'hidden',background:'#64717c',boxShadow:'0 5px 18px #0009',pointerEvents:'none'});
 panel.setAttribute('aria-label','Retrovisor del líder: tu Octavia ardiendo se aleja');
 const label=document.createElement('span');label.textContent='RETROVISOR DEL LÍDER';Object.assign(label.style,{position:'absolute',bottom:'4px',left:0,width:'100%',textAlign:'center',color:'#fff',font:'bold 9px Arial',textShadow:'0 1px 3px #000'});panel.append(label);stage.append(panel);
 import('./racing-mirror3d.mjs').then(m=>m.createBurningMirror(panel)).then(value=>{world=value;ready=true;stage.dataset.mirror3d='ready';}).catch(()=>{const c=document.createElement('canvas');c.width=480;c.height=160;panel.prepend(c);Object.assign(c.style,{width:'100%',height:'100%'});const x=c.getContext('2d');world={render(t){x.fillStyle='#a9bbc6';x.fillRect(0,0,480,160);x.fillStyle='#393d40';x.beginPath();x.moveTo(190,60);x.lineTo(290,60);x.lineTo(480,160);x.lineTo(0,160);x.fill();const size=70/(1+t*.6);x.save();x.translate(240,95);x.fillStyle='#c6c9ca';x.fillRect(-size/2,-size*.5,size,size*.5);x.fillStyle='#1b2730';x.fillRect(-size*.35,-size*.7,size*.7,size*.25);for(let i=0;i<8;i++){x.fillStyle='rgba(45,40,37,.28)';x.beginPath();x.arc(Math.sin(i+t)*size*.2,-size*.6-i*size*.2,size*(.2+i*.03),0,Math.PI*2);x.fill();}x.fillStyle='#ff9e22';for(let i=0;i<7;i++){x.beginPath();x.moveTo((i/7-.5)*size,-size*.1);x.lineTo((i/7-.4)*size,-size*(.6+.35*Math.sin(i+t*12)));x.lineTo((i/7-.3)*size,-size*.1);x.fill();}x.restore();panel.style.opacity=String(Math.min(1,t*5)*Math.min(1,(5.75-t)*2));},dispose(){c.remove();}};ready=true;stage.dataset.mirror3d='2d-compatible';});
 // Texture-driven flame tongues over the bonnet; deterministic movement, no flashing white screen.
 function flames(ctx,w,h,time){
  const fade=Math.min(1,time*4)*Math.max(0,1-(time-1.1)/.65);if(fade<=0)return;
  ctx.save();ctx.globalAlpha=fade;for(let i=0;i<19;i++){const x=w*(.15+i*.039),base=h*.55,reach=h*(.08+.11*(.5+.5*Math.sin(i*7.1+time*9))),sway=Math.sin(time*8+i)*w*.012;const gradient=ctx.createLinearGradient(x,base,x,base-reach);gradient.addColorStop(0,'#fff0a0d0');gradient.addColorStop(.3,'#ff8b20c0');gradient.addColorStop(1,'#8f190000');ctx.fillStyle=gradient;ctx.beginPath();ctx.moveTo(x-w*.035,base);ctx.quadraticCurveTo(x-w*.02+sway,base-reach*.6,x+sway,base-reach);ctx.quadraticCurveTo(x+w*.03+sway,base-reach*.5,x+w*.035,base);ctx.fill();}ctx.restore();
 }
 return {
  reset(){sequence=createOvertakeSequence();panel.hidden=true;stage.dataset.overtakeCinematic='idle';},
  update(race,dt){if(race.phase==='finished'){sequence.active=false;panel.hidden=true;return false;}const triggered=advanceOvertakeSequence(sequence,race.position,race.phase,dt);if(triggered){stage.dataset.overtakeCinematic='fire';stage.dispatchEvent(new CustomEvent('race-overtake-cinematic'));}if(!sequence.active){panel.hidden=true;if(sequence.played)stage.dataset.overtakeCinematic='complete';return triggered;}stage.dataset.overtakeCinematic=sequence.elapsed<1.25?'fire':'mirror';panel.hidden=sequence.elapsed<1.25||!ready;if(!panel.hidden)world.render(sequence.elapsed-1.25);return triggered;},
  draw(ctx,w,h){if(sequence.active&&sequence.elapsed<1.75)flames(ctx,w,h,sequence.elapsed);},
  dispose(){world?.dispose();panel.remove();}
 };
}
