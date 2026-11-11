import {createHighway,stepHighway} from './highway-physics.mjs';
import {currentGraphicsProfile,createPaintGate} from './racing-render-budget.mjs?v=20261109-mobile';
import {createHighwayAudio} from './highway-audio.mjs';
import {highwayGraphicsProfile} from './highway-performance.mjs';
import {loadPreferences,savePreferences,createDriveMeasurement,makePerformanceReport} from './highway-session.mjs';

const root=document.querySelector('[data-highway]'),circuit=document.querySelector('[data-circuit-experience]'),picker=document.querySelector('[data-driving-experience]');
const stage=root.querySelector('[data-highway-stage]'),message=root.querySelector('[data-highway-message]'),start=root.querySelector('[data-highway-start]'),pause=root.querySelector('[data-highway-pause]'),speed=root.querySelector('[data-highway-speed]'),distance=root.querySelector('[data-highway-distance]'),passed=root.querySelector('[data-highway-passed]'),hits=root.querySelector('[data-highway-hits]');
const preferences=loadPreferences();
let state=createHighway(),world=null,active=false,loading=false,view=preferences.camera,last=0,raf=0,disposed=false,loadingGeneration=0;
const screen=root.querySelector('[data-highway-screen]'),menu=root.querySelector('[data-highway-menu]');
const qualityPicker=root.querySelector('[data-highway-quality]'),timePicker=root.querySelector('[data-highway-time]'),measureButton=root.querySelector('[data-highway-measure]'),saveReportButton=root.querySelector('[data-highway-save-report]'),measureStatus=root.querySelector('[data-highway-measure-status]');
qualityPicker.value=preferences.quality;timePicker.value=preferences.ambience;
const measurement=createDriveMeasurement();let lastReport=null,measurementSettings;
function settings(){return {camera:view,quality:qualityPicker.value,ambience:timePicker.value};}
function remember(){savePreferences(settings());}
function applyQuality(){const value=qualityPicker.value;world?.setQuality(value);gate=createPaintGate(value==='high'?60:value==='auto'?highwayGraphicsProfile().targetFps:30);}
function updateMeasurement(now){
 if(measurement.step(now,state.phase==='running')){lastReport=makePerformanceReport(world.performance(),{sampleSeconds:measurement.elapsedMs/1000,width:Math.round(stage.clientWidth),height:Math.round(stage.clientHeight),dpr:devicePixelRatio,browserReportsAndroid:/Android/i.test(navigator.userAgent)},measurementSettings,settings());measureStatus.textContent=lastReport.result.fps.toFixed(1)+' FPS · informe listo';saveReportButton.disabled=false;measureButton.textContent='Medir rendimiento · 30 s';}
 else if(measurement.active){const label=state.phase==='running'?'Medición · '+Math.min(30,Math.floor(measurement.elapsedMs/1000))+'/30 s':'Medición en pausa';if(measureStatus.textContent!==label)measureStatus.textContent=label;}
}
const audio=createHighwayAudio(),radio=new Audio(new URL('./assets/audio/radio-club.mp3',import.meta.url));radio.preload='none';radio.loop=true;radio.volume=.5;
function stopAudio(){audio.mute();radio.pause();root.querySelector('[data-highway-radio]').textContent='Radio: apagada';root.querySelector('[data-highway-radio]').setAttribute('aria-pressed','false');}
function expand(){screen.classList.add('is-expanded');document.body.classList.add('highway-playing');menu.open=false;world?.resize();}
function shrink(){screen.classList.remove('is-expanded');document.body.classList.remove('highway-playing');menu.open=false;world?.resize();}
const keys=new Set(),pointers=new Map(),abort=new AbortController(),options={signal:abort.signal};let gate=createPaintGate(highwayGraphicsProfile().targetFps);
stage.addEventListener('highway-frame-budget',e=>{gate=createPaintGate(e.detail.fps);},options);
const mapping={ArrowUp:'accelerate',KeyW:'accelerate',ArrowDown:'brake',KeyS:'brake',Space:'brake',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
function clear(){keys.clear();pointers.clear();root.querySelectorAll('[data-highway-drive]').forEach(b=>b.classList.remove('is-held'));}
function input(){const held=new Set([...keys].map(k=>mapping[k]).concat([...pointers.values()]));return Object.fromEntries(['accelerate','brake','left','right'].map(k=>[k,held.has(k)]));}
function ui(){speed.textContent=Math.round(state.speed*3.6);distance.textContent=(state.distance/1000).toFixed(2);passed.textContent=state.passed;hits.textContent=state.collisions;stage.dataset.phase=state.phase;stage.dataset.speed=state.speed.toFixed(3);stage.dataset.distance=state.distance.toFixed(3);stage.dataset.lateral=state.x.toFixed(3);stage.dataset.traffic=state.traffic.length;stage.dataset.camera=view;stage.dataset.collisions=state.collisions;stage.classList.toggle('has-impact',state.hit>0);pause.disabled=!['running','paused'].includes(state.phase);pause.textContent=state.phase==='paused'?'Continuar':'Pausa';start.hidden=state.phase==='running'||state.phase==='paused';start.disabled=!world;message.hidden=state.phase==='running'&&state.hit<=0&&!state.offroad;if(state.phase==='running')message.textContent=state.hit>0?'Impacto · recupera la trayectoria':state.offroad?'Arcén · vuelve a la calzada':'';}
function draw(now=performance.now()){world?.render(state,view,now);ui();root.querySelector('[data-highway-performance]').textContent=(stage.dataset.fps||'—')+' FPS · '+root.querySelector('[data-highway-quality]').selectedOptions[0].textContent;}
function tick(now){if(!active||disposed)return;const dt=last?Math.min(.25,(now-last)/1000):0;last=now;stepHighway(state,input(),dt);audio.update(state);if(state.phase==='running'&&gate.due(now))draw(now);updateMeasurement(now);raf=requestAnimationFrame(tick);}
function pauseDriving(){stopAudio();measurement.suspend();if(state.phase==='running'){state.phase='paused';clear();message.textContent='En pausa · pulsa Continuar';draw();}}
async function load(){
 if(world||loading)return;loading=true;const generation=++loadingGeneration;message.textContent='Preparando autovía 3D…';start.disabled=true;
 try{const {createHighwayWorld}=await import('./highway-world.mjs');if(!active||generation!==loadingGeneration||disposed)return;const loaded=await createHighwayWorld(stage);if(!active||generation!==loadingGeneration||disposed){loaded.dispose();return;}world=loaded;world.setTimeOfDay(timePicker.value);applyQuality();message.textContent='Listo · arranca y mantén GAS para conducir';draw();}
 catch(error){message.textContent='No se pudo iniciar WebGL. Puedes reintentar o volver al circuito compatible.';root.querySelector('[data-highway-retry]').hidden=false;menu.open=true;stage.dataset.renderer='unavailable';console.warn('Autovía no disponible:',error.message);}
 finally{loading=false;ui();if(active&&!world&&generation!==loadingGeneration)void load();}
}
picker.addEventListener('change',()=>{
 active=picker.value==='highway';root.hidden=!active;circuit.hidden=active;
 // Existing simulator pauses, stops audio and releases its GPU before loading this mode.
 window.dispatchEvent(new CustomEvent('octavia-experience-change',{detail:{highway:active}}));
 if(active){last=0;gate.reset();void load();raf=requestAnimationFrame(tick);stage.focus({preventScroll:true});}
 else{pauseDriving();measurement.cancel();measureStatus.hidden=true;measureButton.textContent='Medir rendimiento · 30 s';shrink();clear();cancelAnimationFrame(raf);loadingGeneration++;world?.dispose();world=null;}
},options);
start.addEventListener('click',()=>{if(!world?.ready)return;expand();state.phase='running';clear();last=0;message.hidden=true;draw();stage.focus({preventScroll:true});},options);
pause.addEventListener('click',()=>{if(state.phase==='running')pauseDriving();else if(state.phase==='paused'&&world?.ready){state.phase='running';last=0;draw();}},options);
root.querySelector('[data-highway-reset]').addEventListener('click',()=>{state=createHighway();measurement.cancel();measureStatus.hidden=true;measureButton.textContent='Medir rendimiento · 30 s';stopAudio();world?.resetCamera();clear();last=0;message.textContent='Reiniciado · arranca para conducir';draw();},options);
root.querySelector('[data-highway-retry]').addEventListener('click',()=>{root.querySelector('[data-highway-retry]').hidden=true;void load();},options);
function setView(value){view=['chase','driver','aerial','bonnet'].includes(value)?value:'chase';root.querySelector('[data-highway-camera]').textContent='Cámara: '+({chase:'detrás',aerial:'aérea',driver:'interior',bonnet:'capó'}[view]);remember();draw();}
function changeView(){setView(['chase','driver','aerial'][(['chase','driver','aerial'].indexOf(view)+1)%3]);}
root.querySelector('[data-highway-camera]').addEventListener('click',changeView,options);
root.querySelector('[data-highway-view]').addEventListener('click',()=>{setView('bonnet');menu.open=false;},options);
root.querySelector('[data-highway-exit]').addEventListener('click',()=>{pauseDriving();shrink();if(document.fullscreenElement)void document.exitFullscreen();},options);
timePicker.addEventListener('change',e=>{world?.setTimeOfDay(e.target.value);remember();menu.open=false;draw();},options);
qualityPicker.addEventListener('change',()=>{applyQuality();remember();menu.open=false;draw();},options);
measureButton.addEventListener('click',()=>{if(measurement.active){measurement.cancel();measureStatus.hidden=true;measureButton.textContent='Medir rendimiento · 30 s';return;}if(state.phase!=='running'||!world?.ready){message.textContent='Arranca o continúa la conducción antes de medir.';message.hidden=false;return;}lastReport=null;saveReportButton.disabled=true;measurementSettings=settings();world.resetPerformance();measurement.start();measureStatus.hidden=false;measureStatus.textContent='Medición · 0/30 s';measureButton.textContent='Cancelar medición';menu.open=false;},options);
saveReportButton.addEventListener('click',()=>{if(!lastReport)return;const url=URL.createObjectURL(new Blob([JSON.stringify(lastReport,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='octavia-rendimiento.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},options);
root.querySelector('[data-highway-sound]').addEventListener('click',async e=>{try{const on=await audio.toggle();e.target.textContent='Sonido: '+(on?'encendido':'apagado');e.target.setAttribute('aria-pressed',String(on));}catch{message.textContent='El navegador no permite activar el sonido';message.hidden=false;}},options);
root.querySelector('[data-highway-radio]').addEventListener('click',async e=>{try{if(radio.paused){await radio.play();e.target.textContent='Radio: encendida';e.target.setAttribute('aria-pressed','true');}else{radio.pause();e.target.textContent='Radio: apagada';e.target.setAttribute('aria-pressed','false');}}catch{message.textContent='La radio no está disponible';message.hidden=false;}},options);
root.querySelector('[data-highway-fullscreen]').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await root.querySelector('[data-highway-screen]').requestFullscreen();world?.resize();}catch{message.textContent='Pantalla completa no disponible en este navegador';message.hidden=false;}},options);
for(const button of root.querySelectorAll('[data-highway-drive]')){
 button.addEventListener('pointerdown',e=>{e.preventDefault();if(state.phase!=='running')return;button.setPointerCapture(e.pointerId);pointers.set(e.pointerId,button.dataset.highwayDrive);button.classList.add('is-held');},options);
 const release=e=>{pointers.delete(e.pointerId);button.classList.toggle('is-held',[...pointers.values()].includes(button.dataset.highwayDrive));};
 for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,release,options);
 button.addEventListener('contextmenu',e=>e.preventDefault(),options);
}
window.addEventListener('keydown',e=>{if(!active||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;if(mapping[e.code]){e.preventDefault();if(state.phase==='running')keys.add(e.code);}else if(e.code==='KeyP'&&!e.repeat){e.preventDefault();pause.click();}else if(e.code==='KeyC'&&!e.repeat)changeView();},options);
window.addEventListener('keyup',e=>keys.delete(e.code),options);
window.addEventListener('blur',pauseDriving,options);window.addEventListener('club-contact-open',pauseDriving,options);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseDriving();},options);
stage.addEventListener('highway-context-lost',()=>{pauseDriving();message.hidden=false;message.textContent='Gráficos interrumpidos · esperando recuperación';start.disabled=true;},options);
stage.addEventListener('highway-context-restored',()=>{message.textContent='Gráficos recuperados · pulsa Continuar';draw();},options);
window.addEventListener('pagehide',e=>{pauseDriving();if(!e.persisted){disposed=true;abort.abort();cancelAnimationFrame(raf);audio.dispose();radio.src='';world?.dispose();}},options);
// Test hooks are available only on an explicitly requested localhost test page.
if(['127.0.0.1','localhost'].includes(location.hostname)&&new URLSearchParams(location.search).has('highwayTest'))window.highwayTest={get state(){return state;},input,draw,setView,get world(){return world;},get measurement(){return measurement;},get report(){return lastReport;}};
setView(view);ui();
if(new URLSearchParams(location.search).get('experience')==='highway'){picker.value='highway';picker.dispatchEvent(new Event('change'));}
