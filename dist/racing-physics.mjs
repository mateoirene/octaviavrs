export const SEGMENT_LENGTH = 18;
export const MAX_SPEED = 69;
export const LEVELS = {
 easy: { name:'Fácil', description:'Curvas amplias, pista ancha y rivales más tranquilos.', roadHalf:7, grip:.6, offroad:16, rivals:[50,54], sections:[[24,0],[24,.48],[24,0],[22,-.45],[24,0],[24,.5],[24,0],[22,-.48],[12,0]] },
 intermediate: { name:'Intermedio', description:'Enlazadas, frenadas más exigentes y rivales rápidos.', roadHalf:6, grip:.85, offroad:22, rivals:[58,62], sections:[[20,0],[24,.8],[12,0],[20,-.65],[14,0],[28,1.05],[12,0],[24,-.95],[14,0],[12,0]] },
 expert: { name:'Experto', description:'Chicanes cerradas, pista estrecha y rivales al límite.', roadHalf:4.8, grip:1.18, offroad:30, rivals:[64,67], sections:[[12,0],[18,1.5],[8,-1.4],[10,0],[20,-1.55],[8,1.6],[14,0],[24,1.35],[12,-1.65],[12,0],[20,-1.35],[12,1.5],[12,0]] },
};
export function buildTrack(level='easy') {
  const sections = (LEVELS[level]||LEVELS.easy).sections;
  const track = [];
  for (const [count, curve] of sections) for (let i=0;i<count;i++) {
    const blend = Math.min(1, i/6, (count-1-i)/6);
    track.push({ index:track.length, curve:curve*Math.max(0,blend), length:SEGMENT_LENGTH });
  }
  return track;
}
export const TRACK = buildTrack();
export const TRACK_LENGTH = TRACK.length * SEGMENT_LENGTH;
export function createRace(bestLap = null, level = 'easy') {
  const difficulty = LEVELS[level] ? level : 'easy';
  const settings = LEVELS[difficulty], track = buildTrack(difficulty);
  return { difficulty,settings,track,trackLength:track.length*SEGMENT_LENGTH,phase:'ready',distance:0,speed:0,x:0,elapsed:0,lapStarted:0,completedLaps:0,lapTimes:[],bestLap,steering:0,collisionCooldown:0,hit:0,position:3,rivals:[{distance:32,speed:settings.rivals[0],x:-.38,color:'#2389dc'},{distance:70,speed:settings.rivals[1],x:.38,color:'#e6e8ec'}] };
}
export function stepRace(state,input,delta) {
  if (state.phase !== 'running') return {lap:false,finished:false};
  const dt = Math.max(0,Math.min(.05,delta));
  if (!dt) return {lap:false,finished:false};
  const segment = state.track[Math.floor((state.distance % state.trackLength)/SEGMENT_LENGTH)];
  const steering = (input.right?1:0)-(input.left?1:0);
  state.steering += (steering-state.steering)*Math.min(1,dt*10);
  const acceleration = input.accelerate ? 7.5*(1-state.speed/MAX_SPEED*.55) : -2.4;
  state.speed = Math.max(0,Math.min(MAX_SPEED,state.speed+(acceleration-(input.brake?27:0))*dt));
  const speedRatio = state.speed/MAX_SPEED;
  state.x += (steering*(.8+1.35*speedRatio)*speedRatio-segment.curve*speedRatio*speedRatio*state.settings.grip)*dt;
  if (Math.abs(state.x)>1 && state.speed>12) state.speed = Math.max(12, state.speed-state.settings.offroad*dt);
  state.x = Math.max(-2.2,Math.min(2.2,state.x));
  state.distance += state.speed*dt; state.elapsed += dt;
  state.collisionCooldown = Math.max(0,state.collisionCooldown-dt); state.hit = Math.max(0,state.hit-dt);
  for (const rival of state.rivals) {
    rival.distance += rival.speed*dt;
    if (state.collisionCooldown===0 && Math.abs(rival.distance-state.distance)<7 && Math.abs(rival.x-state.x)<.3 && state.speed>10) { state.speed*=.62; state.collisionCooldown=1.4; state.hit=.3; }
  }
  state.position = 1 + state.rivals.filter(rival=>rival.distance>state.distance).length;
  let lap = false;
  if (state.distance >= (state.completedLaps+1)*state.trackLength) {
    const time = state.elapsed-state.lapStarted; state.lapTimes.push(time); state.lapStarted=state.elapsed;
    state.bestLap = state.bestLap===null ? time : Math.min(state.bestLap,time); state.completedLaps++; lap=true;
    if(state.completedLaps>=3){state.phase='finished';state.speed=0;}
  }
  return {lap,finished:state.phase==='finished'};
}
export function lapTime(seconds) {
  if(seconds===null||!Number.isFinite(seconds))return '—';
  const ms=Math.max(0,Math.round(seconds*1000));
  return `${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;
}
