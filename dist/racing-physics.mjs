import {TESLA_PERFORMANCE,advanceTesla,teslaTargetSpeed} from './racing-performance.mjs?v=20261028-grounded-tesla';
import {createNitro,playerNitro,beforeNitroStep,prepareNitroRival,resolveNitro,stopNitro,nitroActiveFor,NITRO_SPEED} from './racing-nitro.mjs?v=20261028-grounded-tesla';
import {CIRCUIT_BY_ID} from './racing-circuits.mjs?v=20261024-tour1';
import { createCircuitLayout } from './circuit-layout.mjs?v=20261024-tour1';
export const SEGMENT_LENGTH = 18;
export const MAX_SPEED = 69;
export const LEVELS = {
 easy: { name:'Fácil', description:'Curvas amplias, pista ancha y rivales más tranquilos.', roadHalf:7, grip:.6, offroad:16, rivals:[50,54], sections:[[24,0],[24,.48],[24,0],[22,-.45],[24,0],[24,.5],[24,0],[22,-.48],[12,0]] },
 intermediate: { name:'Intermedio', description:'Enlazadas, frenadas más exigentes y rivales rápidos.', roadHalf:6, grip:.85, offroad:22, rivals:[58,62], sections:[[20,0],[24,.8],[12,0],[20,-.65],[14,0],[28,1.05],[12,0],[24,-.95],[14,0],[12,0]] },
 expert: { name:'Experto', description:'Chicanes cerradas, pista estrecha y rivales al límite.', roadHalf:4.8, grip:1.18, offroad:30, rivals:[64,67], sections:[[12,0],[18,1.5],[8,-1.4],[10,0],[20,-1.55],[8,1.6],[14,0],[24,1.35],[12,-1.65],[12,0],[20,-1.35],[12,1.5],[12,0]] },
};
export function buildTrack(level='easy',circuit='club') {
  const sections = (LEVELS[level]||LEVELS.easy).sections;
  const track = [];
  for (const [count, curve] of sections) for (let i=0;i<count;i++) {
    const blend = Math.min(1, i/6, (count-1-i)/6);
    track.push({ index:track.length, curve:curve*Math.max(0,blend), length:SEGMENT_LENGTH });
  }
  if(CIRCUIT_BY_ID[circuit]){track.length=0;for(let i=0;i<CIRCUIT_BY_ID[circuit].length/SEGMENT_LENGTH;i++)track.push({index:i,curve:0,length:SEGMENT_LENGTH});}
  const layout=createCircuitLayout(level,track.length*SEGMENT_LENGTH,circuit);
  for(let i=0;i<track.length;i++)track[i].curve=(i===0||i===track.length-1)?0:Math.max(-1.8,Math.min(1.8,layout.curvature(i*SEGMENT_LENGTH)*220));
  return track;
}
export const TRACK = buildTrack();
export const TRACK_LENGTH = TRACK.length * SEGMENT_LENGTH;
export function createRace(bestLap = null, level = 'easy', circuit = 'club') {
  const difficulty = LEVELS[level] ? level : 'easy';
  const settings = LEVELS[difficulty], track = buildTrack(difficulty,circuit);
  return { nitro:createNitro(difficulty,track.length*SEGMENT_LENGTH,CIRCUIT_BY_ID[circuit]?circuit:'club'),circuit:CIRCUIT_BY_ID[circuit]?circuit:'club',difficulty,settings,track,trackLength:track.length*SEGMENT_LENGTH,phase:'ready',distance:0,speed:0,x:0,elapsed:0,lapStarted:0,completedLaps:0,lapTimes:[],bestLap,steering:0,collisionCooldown:0,hit:0,position:4,rivals:[{distance:32,speed:Math.min(230/3.6,settings.rivals[0]),cruiseSpeed:230/3.6,x:-.38,model:'octavia',color:'#2389dc'},{distance:70,speed:Math.min(230/3.6,settings.rivals[1]),cruiseSpeed:230/3.6,x:.38,model:'octavia',color:'#2389dc'},{distance:42,speed:0,cruiseSpeed:TESLA_PERFORMANCE.topKmh/3.6,powerCV:TESLA_PERFORMANCE.powerCV,x:0,model:'tesla-model-3',name:'ALBERTO',color:'#ffffff',competitive:true}] };
}
export function stepRace(state,input,delta) {
  if (state.phase !== 'running') return {lap:false,finished:false};
  const dt = Math.max(0,Math.min(.05,delta));
  if (!dt) return {lap:false,finished:false};
  const before=[state,...state.rivals].map(car=>({distance:car.distance,x:car.x}));beforeNitroStep(state,input);
  const segment = state.track[Math.floor((state.distance % state.trackLength)/SEGMENT_LENGTH)];
  const steering = (input.right?1:0)-(input.left?1:0);
  state.steering += (steering-state.steering)*Math.min(1,dt*10);
  const boosted=playerNitro(state);const acceleration = input.accelerate ? 7.5*(1-state.speed/MAX_SPEED*.55) : -2.4;
  state.speed = boosted?NITRO_SPEED:Math.max(0,Math.min(MAX_SPEED,state.speed+(acceleration-(input.brake?27:0))*dt));
  const speedRatio = state.speed/MAX_SPEED;
  state.x += (steering*(.8+1.35*speedRatio)*speedRatio-segment.curve*speedRatio*speedRatio*state.settings.grip)*dt;
  if(Math.abs(state.x)>1)stopNitro(state,'offroad','player');
  if (!playerNitro(state)&&Math.abs(state.x)>1 && state.speed>12) state.speed = Math.max(12, state.speed-state.settings.offroad*dt);
  state.x = Math.max(-2.2,Math.min(2.2,state.x));
  state.distance += state.speed*dt; state.elapsed += dt;
  state.collisionCooldown = Math.max(0,state.collisionCooldown-dt); state.hit = Math.max(0,state.hit-dt);
  for (const rival of state.rivals) {
    prepareNitroRival(state,rival,dt);const rivalIndex=state.rivals.indexOf(rival),rivalBoost=nitroActiveFor(state,'rival:'+rivalIndex);
    if(!rival.retired&&rival.model==='tesla-model-3'&&!rivalBoost)advanceTesla(state,rival,dt);
    if(!rival.retired){rival.cruiseSpeed??=rival.speed;const bend=state.track[Math.floor(((rival.distance+30)%state.trackLength)/SEGMENT_LENGTH)].curve,target=rival.cruiseSpeed*(1-Math.min(.55,Math.abs(bend)*.25));rival.nitroBraking=rival.model==='tesla-model-3'?teslaTargetSpeed(state,rival)<(230/3.6)*.95:Math.abs(bend)>.6;if(rivalBoost&&rival.nitroBraking)stopNitro(state,'rival-brake','rival:'+rivalIndex);if(nitroActiveFor(state,'rival:'+rivalIndex))rival.speed=rival.model==='tesla-model-3'?Math.min(NITRO_SPEED,TESLA_PERFORMANCE.topKmh/3.6):NITRO_SPEED;else if(rival.model!=='tesla-model-3')rival.speed+=(target-rival.speed)*Math.min(1,dt*2);}
    if(rival.model==='tesla-model-3')rival.speed=Math.min(rival.speed,TESLA_PERFORMANCE.topKmh/3.6);
    rival.distance += rival.speed*dt;
    if(!Number.isFinite(rival.finishTime)&&rival.distance>=state.trackLength*3&&rival.speed>0)rival.finishTime=state.elapsed-(rival.distance-state.trackLength*3)/rival.speed;
    if (!rival.retired&&state.collisionCooldown===0 && Math.abs(rival.distance-state.distance)<7 && Math.abs(rival.x-state.x)<.42 && state.speed>10) { const side=state.x>=rival.x?1:-1;state.x=Math.max(-2.2,Math.min(2.2,state.x+side*.16));rival.x=Math.max(-1.2,Math.min(1.2,rival.x-side*.055));if(!playerNitro(state))state.speed*=.62;state.collisionCooldown=1.4;state.hit=.4;if(Math.abs(state.x)>1)stopNitro(state,'offroad','player');if(Math.abs(rival.x)>1)stopNitro(state,'offroad','rival:'+rivalIndex); }
  }
  resolveNitro(state,input,before,dt);
  state.position = 1 + state.rivals.filter(rival=>rival.distance>state.distance).length;
  let lap = false;
  if (state.distance >= (state.completedLaps+1)*state.trackLength) {
    const time = state.elapsed-state.lapStarted; state.lapTimes.push(time); state.lapStarted=state.elapsed;
    state.bestLap = state.bestLap===null ? time : Math.min(state.bestLap,time); state.completedLaps++; lap=true;
    if(state.completedLaps>=3){stopNitro(state,'finish');state.phase='finished';state.speed=0;state.position=1+state.rivals.filter(car=>Number.isFinite(car.finishTime)&&car.finishTime<state.elapsed-1e-6).length;}
  }
  return {lap,finished:state.phase==='finished'};
}
export function lapTime(seconds) {
  if(seconds===null||!Number.isFinite(seconds))return '—';
  const ms=Math.max(0,Math.round(seconds*1000));
  return `${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;
}
