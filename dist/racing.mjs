import { createMusic } from './racing-music.mjs?v=20261023-radio';
import { LEVELS, SEGMENT_LENGTH, createRace, stepRace, lapTime } from './racing-physics.mjs';
const $ = selector => document.querySelector(selector);
const stage=$('[data-racing-stage]'),canvas=$('[data-race-canvas]'),ctx=canvas.getContext('2d');
const start=$('[data-race-start]'),pause=$('[data-race-pause]'),overlay=$('[data-race-overlay]'),status=$('[data-race-status]');
const levelPicker=$('[data-race-level]');
function loadBest(level){try{const saved=Number(localStorage.getItem('octavia-mk4-best-lap-v2-'+level));return saved>0&&Number.isFinite(saved)?saved:null;}catch{return null;}}
let storedBest=loadBest(levelPicker.value);
let race=createRace(storedBest,levelPicker.value),width=1000,height=620,last=0,sound=false,audio,oscillator,gain;
const music=createMusic(),musicButton=$('[data-race-music]');
const photos={};let grain;
const photoReady=Promise.all(['cockpit','rival','circuit'].map(id=>new Promise(resolve=>{const photo=new Image();photo.onload=()=>{photos[id]=photo;canvas.dataset[id+'Ready']='true';draw();resolve();};photo.onerror=()=>resolve();photo.src=id==='cockpit'?'assets/cockpit-frontal.jpg':'assets/race/'+id+'.jpg';})));
void photoReady;
const grainCanvas=document.createElement('canvas');grainCanvas.width=grainCanvas.height=96;const grainContext=grainCanvas.getContext('2d');const noise=grainContext.createImageData(96,96);let seed=17;for(let i=0;i<noise.data.length;i+=4){seed=(seed*16807)%2147483647;const value=100+seed%100;noise.data[i]=noise.data[i+1]=noise.data[i+2]=value;noise.data[i+3]=45;}grainContext.putImageData(noise,0,0);grain=ctx.createPattern(grainCanvas,'repeat');
const keys=new Set(),touches=new Map();
const mapping={ArrowUp:'accelerate',KeyW:'accelerate',ArrowDown:'brake',KeyS:'brake',Space:'brake',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
function controls(){const held=new Set([...keys].map(key=>mapping[key]).concat([...touches.values()]));return {accelerate:held.has('accelerate'),brake:held.has('brake'),left:held.has('left'),right:held.has('right')};}
function clearControls(){keys.clear();touches.clear();document.querySelectorAll('[data-drive]').forEach(button=>button.classList.remove('is-held'));}
function resize(){const bounds=stage.getBoundingClientRect();width=Math.max(300,bounds.width);height=Math.max(280,bounds.height);const ratio=Math.min(1.7,window.devicePixelRatio||1);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);draw();}
function polygon(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],index)=>index?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function text(value,x,y,size=14,color='#fff',align='left'){ctx.fillStyle=color;ctx.font=`700 ${size}px Arial,sans-serif`;ctx.textAlign=align;ctx.fillText(value,x,y);}
function road(){
 const horizon=height*.31,focal=width*.7,cameraHeight=1.3;
 const sky=ctx.createLinearGradient(0,0,0,horizon);sky.addColorStop(0,'#1e5b85');sky.addColorStop(1,'#e8d6b3');rect(0,0,width,height,sky);
 ctx.fillStyle='#7997a1';ctx.beginPath();ctx.moveTo(0,horizon);for(let x=0;x<=width+20;x+=20)ctx.lineTo(x,horizon-20-Math.sin(x/90+race.distance/800)*18-Math.sin(x/43)*13);ctx.lineTo(width,horizon+20);ctx.closePath();ctx.fill();
 if(photos.circuit){const offset=Math.sin(race.distance/650)*width*.1;ctx.drawImage(photos.circuit,-width*.15+offset,-height*.02,width*1.3,height*.37);}
 rect(0,horizon,width,height*.48,'#49624a');
 const fraction=race.distance%SEGMENT_LENGTH,base=Math.floor(race.distance/SEGMENT_LENGTH);let bend=0,slope=0;
 const segments=[];
 for(let n=0;n<105;n++){
  const index=(base+n)%race.track.length,segment=race.track[index],z1=Math.max(.35,n*SEGMENT_LENGTH-fraction),z2=(n+1)*SEGMENT_LENGTH-fraction;
  const x1=bend;bend+=slope;slope+=segment.curve*.24;const x2=bend;
  const p1={x:width/2+(x1-race.x*race.settings.roadHalf)*focal/z1,y:horizon+cameraHeight*focal/z1,w:race.settings.roadHalf*focal/z1};
  const p2={x:width/2+(x2-race.x*race.settings.roadHalf)*focal/z2,y:horizon+cameraHeight*focal/z2,w:race.settings.roadHalf*focal/z2};
  segments.push({index,p1,p2,z2});
 }
 ctx.save();ctx.beginPath();ctx.rect(0,horizon,width,height*.47);ctx.clip();
 for(let n=segments.length-1;n>=0;n--){
  const {index,p1:a,p2:b}=segments[n],stripe=Math.floor(index/3)%2;
  rect(0,b.y,width,a.y-b.y,stripe?'#527849':'#497040');
  polygon([[a.x-a.w*1.18,a.y],[a.x+a.w*1.18,a.y],[b.x+b.w*1.18,b.y],[b.x-b.w*1.18,b.y]],'#a39783');
  polygon([[a.x-a.w*1.08,a.y],[a.x+a.w*1.08,a.y],[b.x+b.w*1.08,b.y],[b.x-b.w*1.08,b.y]],stripe?'#d8273c':'#f4f0e3');
  polygon([[a.x-a.w,a.y],[a.x+a.w,a.y],[b.x+b.w,b.y],[b.x-b.w,b.y]],stripe?'#353d46':'#303842');
  if(grain){ctx.save();ctx.beginPath();ctx.moveTo(a.x-a.w,a.y);ctx.lineTo(a.x+a.w,a.y);ctx.lineTo(b.x+b.w,b.y);ctx.lineTo(b.x-b.w,b.y);ctx.closePath();ctx.clip();ctx.translate(0,(race.distance*14)%96);ctx.globalAlpha=.3;ctx.fillStyle=grain;ctx.fillRect(0,b.y-96,width,a.y-b.y+192);ctx.restore();}
  for(const side of [-1,1]){const edge=1.35;ctx.strokeStyle='#c0c6c9';ctx.lineWidth=Math.max(1,a.w*.024);ctx.beginPath();ctx.moveTo(a.x+side*a.w*edge,a.y-a.w*.10);ctx.lineTo(b.x+side*b.w*edge,b.y-b.w*.10);ctx.stroke();if(index%3===0){ctx.strokeStyle='#77818b';ctx.lineWidth=Math.max(1,b.w*.015);ctx.beginPath();ctx.moveTo(b.x+side*b.w*edge,b.y);ctx.lineTo(b.x+side*b.w*edge,b.y-b.w*.18);ctx.stroke();}}
  if(index%6<3)polygon([[a.x-a.w*.012,a.y],[a.x+a.w*.012,a.y],[b.x+b.w*.012,b.y],[b.x-b.w*.012,b.y]],'#e5e5dc');
  if(index===0&&n>0){const t=.12,c={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,w:a.w+(b.w-a.w)*t};for(let cell=0;cell<16;cell++)polygon([[a.x-a.w+cell*a.w/8,a.y],[a.x-a.w+(cell+1)*a.w/8,a.y],[c.x-c.w+(cell+1)*c.w/8,c.y],[c.x-c.w+cell*c.w/8,c.y]],cell%2?'#eee':'#101820');}
  if(index%8===0&&b.y<horizon+height*.35){
    for(const side of [-1,1]){const x=b.x+side*b.w*1.7,tree=b.w*.8;rect(x-tree*.06,b.y-tree*.5,tree*.12,tree*.5,'#5c4639');polygon([[x,b.y-tree*1.5],[x-tree*.4,b.y-tree*.4],[x+tree*.4,b.y-tree*.4]],'#193e32');}
  }
  if(index%27===12&&b.w>4){const x=b.x-b.w*2.1,w=b.w*1.1;rect(x-w/2,b.y-w*.65,w,w*.5,'#121f31');if(w>45)text('CLUB VRS',x,b.y-w*.33,Math.max(7,w*.12),'#f3f4f7','center');}
 }
 const cars=race.rivals.map(rival=>({...rival,z:((rival.distance-race.distance)%race.trackLength+race.trackLength)%race.trackLength})).filter(car=>car.z>1&&car.z<1000).sort((a,b)=>b.z-a.z);
 for(const car of cars){const segment=segments[Math.min(104,Math.floor((car.z+fraction)/SEGMENT_LENGTH))];if(!segment)continue;const scale=focal/car.z,w=2.05*scale,h=1.25*scale,y=horizon+cameraHeight*scale,x=segment.p2.x+(car.x*race.settings.roadHalf)*scale;
  ctx.fillStyle='#0007';ctx.beginPath();ctx.ellipse(x,y,w*.6,h*.15,0,0,Math.PI*2);ctx.fill();if(photos.rival){const rw=w*1.55,rh=rw*.537;ctx.save();ctx.translate(x-rw/2,y-rh);ctx.beginPath();[[.025,.42],[.065,.22],[.34,.055],[.56,.07],[.79,.27],[.96,.43],[.985,.72],[.94,.9],[.86,.96],[.77,.91],[.69,.88],[.35,.88],[.23,.99],[.12,.94],[.025,.79]].forEach(([px,py],i)=>i?ctx.lineTo(px*rw,py*rh):ctx.moveTo(px*rw,py*rh));ctx.closePath();ctx.clip();ctx.drawImage(photos.rival,0,0,rw,rh);ctx.restore();continue;}rect(x-w*.46,y-h*.7,w*.92,h*.7,car.color);polygon([[x-w*.46,y-h*.7],[x-w*.3,y-h],[x+w*.3,y-h],[x+w*.46,y-h*.7]],car.color);rect(x-w*.28,y-h*.92,w*.56,h*.3,'#172b3f');rect(x-w*.49,y-h*.31,w*.25,h*.1,'#ff3548');rect(x+w*.24,y-h*.31,w*.25,h*.1,'#ff3548');rect(x-w*.35,y-h*.09,w*.7,h*.09,'#141b23');
 }
 ctx.restore();
}
function photographicCockpit(){
 const photo=photos.cockpit,iw=Math.max(width,height*1.3),ih=iw*.5,left=(width-iw)*.3,top=height*.53-ih*.055;
 const map=([x,y])=>[left+x/980*iw,top+y/490*ih];
 // El parabrisas queda abierto al circuito; se conserva el salpicadero fotografiado.
 ctx.save();ctx.beginPath();[[0,0],[95,29],[200,30],[400,28],[650,28],[920,35],[980,10],[980,490],[0,490]].map(map).forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();ctx.drawImage(photo,left,top,iw,ih);ctx.restore();
 if(top+ih<height)rect(0,top+ih,width,height-top-ih,'#0a1018');
 const dx=left+iw*.292,dy=top+ih*.18,dw=iw*.044,dh=ih*.065;
 rect(dx,dy,dw,dh,'#16121b');text(String(Math.round(race.speed*3.6)),dx+dw*.5,dy+dh*.74,Math.max(11,iw*.021),'#fff','center');
 text('km/h',dx+dw*.5,dy+dh*1.23,Math.max(6,iw*.006),'#eee','center');
 const sx=left+iw*.47,sy=top+ih*.175,sw=iw*.18,sh=ih*.14;
 rect(sx,sy,sw,sh,'#121c29');text('CLUB VRS · MUSIC',sx+sw*.5,sy+sh*.23,Math.max(6,iw*.008),'#f7faff','center');
 stage.style.setProperty('--music-left',sx/width*100+'%');stage.style.setProperty('--music-top',(sy+sh*.32)/height*100+'%');stage.style.setProperty('--music-width',sw/width*100+'%');stage.style.setProperty('--music-height',sh*.65/height*100+'%');
}

function cockpit(){
 if(photos.cockpit){photographicCockpit();return;}

 // Pilares, cuadro digital, pantalla flotante y volante de dos radios.
 polygon([[0,0],[width*.055,0],[width*.16,height*.72],[width*.1,height],[0,height]],'#0c141e');
 polygon([[width,0],[width*.945,0],[width*.84,height*.72],[width*.9,height],[width,height]],'#0c141e');
 rect(0,0,width,height*.035,'#0a121b');
 rect(width*.4,height*.055,width*.2,height*.06,'#0b141e');rect(width*.41,height*.062,width*.18,height*.04,'#54707a');text('CLUB OCTAVIA',width*.5,height*.09,Math.max(8,width*.01),'#e1e8ed','center');
 const dash=ctx.createLinearGradient(0,height*.69,0,height);dash.addColorStop(0,'#293849');dash.addColorStop(.2,'#0e1824');dash.addColorStop(1,'#050b12');
 polygon([[0,height*.78],[width*.18,height*.71],[width*.53,height*.7],[width*.85,height*.72],[width,height*.8],[width,height],[0,height]],dash);
 ctx.strokeStyle='#ae2944';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(width*.1,height*.8);ctx.lineTo(width*.88,height*.82);ctx.stroke();
 const cx=width*.34,cy=height*.94,r=Math.min(width*.18,height*.16);
 rect(width*.15,height*.725,width*.35,height*.15,'#030b14');
 text(String(Math.round(race.speed*3.6)),width*.325,height*.79,Math.max(20,height*.045),'#f6faff','center');text('km/h',width*.325,height*.82,Math.max(9,height*.018),'#a8c9dd','center');
 text(race.speed<1?'N':String(Math.min(7,1+Math.floor(race.speed/11))),width*.19,height*.795,Math.max(17,height*.04),'#71dce1');
 for(let i=0;i<16;i++)rect(width*.17+i*width*.018,height*.846,width*.012,height*.007,i<race.speed/69*16?'#ff3557':'#263c50');
 const sx=width*.59,sy=height*.71,sw=width*.29,sh=height*.18;
 rect(sx-3,sy-3,sw+6,sh+6,'#060b12');rect(sx,sy,sw,sh,'#0e2135');
 text('OCTAVIA VRS · MK4',sx+sw*.5,sy+sh*.17,Math.max(8,width*.012),'#e2f1ff','center');
 ctx.save();ctx.translate(sx+sw*.5,sy+sh*.6);ctx.scale(sw*.32,sh*.27);ctx.strokeStyle='#69d3e5';ctx.lineWidth=.06;ctx.beginPath();for(let i=0;i<=80;i++){const t=i/80*Math.PI*2,x=Math.cos(t)*(1+.2*Math.sin(t*3)),y=Math.sin(t);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();const progress=(race.distance%race.trackLength)/race.trackLength*Math.PI*2;ctx.fillStyle='#ff385c';ctx.beginPath();ctx.arc(Math.cos(progress)*(1+.2*Math.sin(progress*3)),Math.sin(progress),.13,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.save();ctx.translate(cx,cy);ctx.rotate(race.steering*.6);ctx.strokeStyle='#080d15';ctx.lineWidth=r*.2;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#8495a7';ctx.lineWidth=r*.035;ctx.beginPath();ctx.arc(0,0,r*.9,.1,Math.PI*1.95);ctx.stroke();polygon([[-r*.94,-r*.04],[-r*.15,-r*.18],[r*.15,-r*.18],[r*.94,-r*.04],[r*.88,r*.1],[r*.13,r*.13],[-r*.13,r*.13],[-r*.88,r*.1]],'#68798c');ctx.fillStyle='#111c29';ctx.beginPath();ctx.ellipse(0,0,r*.38,r*.3,0,0,Math.PI*2);ctx.fill();text('V',-r*.14,r*.06,Math.max(10,r*.19),'#ff274f','center');text('RS',r*.1,r*.06,Math.max(10,r*.19),'#f0f5fa','center');ctx.restore();
 text('VRS',width*.91,height*.94,Math.max(9,width*.018),'#c1cedc','center');
}
function hud(){
 const size=Math.max(11,Math.min(18,width*.017));rect(width*.12,height*.14,width*.76,size*3.5,'#07111edb');
 text(`VUELTA ${Math.min(3,race.completedLaps+1)}/3`,width*.15,height*.14+size*1.3,size);
 text(`POS ${race.position}/3`,width*.85,height*.14+size*1.3,size,'#ff8e9e','right');
 text(`ACTUAL ${lapTime(race.elapsed-race.lapStarted)}`,width*.15,height*.14+size*2.7,size*.8,'#c8e4f2');
 text(`RÉCORD ${lapTime(race.bestLap)}`,width*.85,height*.14+size*2.7,size*.8,'#9fe3c4','right');
 if(Math.abs(race.x)>1&&race.phase==='running')text('FUERA DE PISTA',width*.5,height*.39,size,'#ffe69c','center');
 if(race.hit>0){ctx.strokeStyle='#ff335b99';ctx.lineWidth=12;ctx.strokeRect(6,6,width-12,height-12);}
}
function draw(){canvas.dataset.speed=String(Math.round(race.speed*3.6));ctx.clearRect(0,0,width,height);road();cockpit();hud();}
function setOverlay(title,copy){overlay.replaceChildren();const strong=document.createElement('strong'),span=document.createElement('span');strong.textContent=title;span.textContent=copy;overlay.append(strong,span);overlay.hidden=false;}
function updateUi(){levelPicker.disabled=['running','paused'].includes(race.phase);pause.disabled=!['running','paused'].includes(race.phase);pause.textContent=race.phase==='paused'?'Continuar':'Pausa';start.textContent=race.phase==='running'?'Motor en marcha':race.phase==='paused'?'Continuar carrera':race.phase==='finished'?'Volver a correr':'Arrancar y salir a pista';start.disabled=race.phase==='running';if(race.phase==='running')overlay.hidden=true;}
function begin(){if(race.phase==='finished')race=createRace(storedBest,levelPicker.value);race.phase='running';last=0;clearControls();updateUi();stage.focus({preventScroll:true});status.textContent='Carrera en marcha. Mantén GAS o la flecha arriba para acelerar.';if(audio&&sound)void audio.resume();}
function togglePause(){if(race.phase==='running'){race.phase='paused';clearControls();setOverlay('CARRERA EN PAUSA','Pulsa «Continuar» cuando estés listo.');status.textContent='Carrera en pausa.';}else if(race.phase==='paused')begin();updateUi();}
start.addEventListener('click',begin);pause.addEventListener('click',togglePause);
levelPicker.addEventListener('change',()=>{storedBest=loadBest(levelPicker.value);race=createRace(storedBest,levelPicker.value);$('[data-race-level-description]').textContent=race.settings.description;clearControls();setOverlay('CIRCUITO '+race.settings.name.toUpperCase(),race.settings.description);status.textContent='Circuito '+race.settings.name+' seleccionado. Récord independiente para este nivel.';updateUi();draw();});
$('[data-race-reset]').addEventListener('click',()=>{race=createRace(storedBest,levelPicker.value);clearControls();setOverlay('LISTO PARA SALIR','Arranca el motor y entra al circuito.');status.textContent='Carrera reiniciada. Tu récord se conserva.';updateUi();draw();});
window.addEventListener('keydown',event=>{if(event.ctrlKey||event.metaKey||event.altKey||event.repeat&&event.code==='KeyP')return;if(event.code==='KeyP'&&['running','paused'].includes(race.phase)){event.preventDefault();togglePause();return;}if(mapping[event.code]&&(race.phase==='running'||document.activeElement===stage)){event.preventDefault();keys.add(event.code);}});
window.addEventListener('keyup',event=>keys.delete(event.code));
for(const button of document.querySelectorAll('[data-drive]')){
 button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);touches.set(event.pointerId,button.dataset.drive);button.classList.add('is-held');});
 const release=event=>{touches.delete(event.pointerId);if(![...touches.values()].includes(button.dataset.drive))button.classList.remove('is-held');};
 button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);button.addEventListener('contextmenu',event=>event.preventDefault());
}
function leave(){music.stop();stage.dataset.music='stopped';musicButton.setAttribute('aria-pressed','false');musicButton.textContent='♫ Música';clearControls();if(race.phase==='running')togglePause();}
window.addEventListener('blur',leave);document.addEventListener('visibilitychange',()=>{if(document.hidden)leave();});
musicButton.addEventListener('click',async()=>{try{if(music.playing)music.stop();else await music.start();musicButton.setAttribute('aria-pressed',String(music.playing));musicButton.textContent=music.playing?'♫ Apagar':'♫ Música';stage.dataset.music=music.playing?'playing':'stopped';draw();}catch{status.textContent='No se puede activar la música en este navegador.';}});
$('[data-race-sound]').addEventListener('click',async()=>{try{if(!audio){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error();audio=new Audio();oscillator=audio.createOscillator();gain=audio.createGain();const filter=audio.createBiquadFilter();oscillator.type='sawtooth';filter.type='lowpass';filter.frequency.value=650;gain.gain.value=0;oscillator.connect(filter);filter.connect(gain);gain.connect(audio.destination);oscillator.start();}sound=!sound;if(sound)await audio.resume();$('[data-race-sound]').textContent=sound?'Sonido: encendido':'Sonido: apagado';$('[data-race-sound]').setAttribute('aria-pressed',String(sound));}catch{status.textContent='El sonido no está disponible en este navegador. Puedes seguir conduciendo.';}});
function frame(timestamp){const dt=last?Math.min(.05,(timestamp-last)/1000):0;last=timestamp;
 const result=stepRace(race,controls(),dt);
 if(result.lap){storedBest=race.bestLap;try{localStorage.setItem('octavia-mk4-best-lap-v2-'+race.difficulty,String(storedBest));}catch{}status.textContent=`Vuelta ${race.completedLaps}: ${lapTime(race.lapTimes.at(-1))}. Mejor vuelta: ${lapTime(race.bestLap)}.`;}
 if(result.finished){clearControls();setOverlay(`META · ${race.position}.º PUESTO`,`Tiempo total ${lapTime(race.elapsed)} · Mejor vuelta ${lapTime(race.bestLap)}`);status.textContent=`Carrera terminada. Puesto ${race.position} de 3. Tiempo total ${lapTime(race.elapsed)}. Mejor vuelta ${lapTime(race.bestLap)}.`;updateUi();}
 if(gain){gain.gain.setTargetAtTime(sound&&race.phase==='running'?.025:0,audio.currentTime,.06);oscillator.frequency.setTargetAtTime(32+race.speed*3.2,audio.currentTime,.08);}
 if(race.phase==='running'||result.finished)draw();requestAnimationFrame(frame);
}
new ResizeObserver(resize).observe(stage);resize();updateUi();requestAnimationFrame(frame);

fetch('assets/race/credits.json').then(response=>response.ok?response.json():[]).then(credits=>{const list=document.querySelector('[data-race-credits]');if(!list)return;for(const credit of credits.filter(item=>item.id!=='cockpit')){const li=document.createElement('li'),link=document.createElement('a'),license=document.createElement('a');link.href=credit.source;link.textContent=credit.title+' — '+credit.author;link.target='_blank';link.rel='noopener noreferrer';license.href=credit.licenseUrl;license.textContent=credit.license;license.target='_blank';license.rel='noopener noreferrer';li.append(link,document.createTextNode(' · '),license,document.createTextNode('. '+credit.changes));list.append(li);}}).catch(()=>{});
