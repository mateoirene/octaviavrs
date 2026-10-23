export const SEGMENT_LENGTH = 18;
export const MAX_SPEED = 69;
export function buildTrack() {
  const sections = [[20,0],[24,.8],[12,0],[20,-.65],[14,0],[28,1.05],[12,0],[24,-.95],[14,0],[12,0]];
  const track = [];
  for (const [count, curve] of sections) for (let i=0;i<count;i++) {
    const blend = Math.min(1, i/6, (count-1-i)/6);
    track.push({ index:track.length, curve:curve*Math.max(0,blend), length:SEGMENT_LENGTH });
  }
  return track;
}
export const TRACK = buildTrack();
export const TRACK_LENGTH = TRACK.length * SEGMENT_LENGTH;
export function createRace(bestLap = null) {
  return { phase:'ready',distance:0,speed:0,x:0,elapsed:0,lapStarted:0,completedLaps:0,lapTimes:[],bestLap,steering:0,collisionCooldown:0,hit:0,position:3,rivals:[{distance:32,speed:57,x:-.38,color:'#2389dc'},{distance:70,speed:61,x:.38,color:'#e6e8ec'}] };
}
export function stepRace(state,input,delta) {
  if (state.phase !== 'running') return {lap:false,finished:false};
  const dt = Math.max(0,Math.min(.05,delta));
  if (!dt) return {lap:false,finished:false};
  const segment = TRACK[Math.floor((state.distance % TRACK_LENGTH)/SEGMENT_LENGTH)];
  const steering = (input.right?1:0)-(input.left?1:0);
  state.steering += (steering-state.steering)*Math.min(1,dt*10);
  const acceleration = input.accelerate ? 7.5*(1-state.speed/MAX_SPEED*.55) : -2.4;
  state.speed = Math.max(0,Math.min(MAX_SPEED,state.speed+(acceleration-(input.brake?27:0))*dt));
  const speedRatio = state.speed/MAX_SPEED;
  state.x += (steering*(.8+1.35*speedRatio)*speedRatio-segment.curve*speedRatio*speedRatio*.85)*dt;
  if (Math.abs(state.x)>1 && state.speed>12) state.speed = Math.max(12, state.speed-18*dt);
  state.x = Math.max(-2.2,Math.min(2.2,state.x));
  state.distance += state.speed*dt; state.elapsed += dt;
  state.collisionCooldown = Math.max(0,state.collisionCooldown-dt); state.hit = Math.max(0,state.hit-dt);
  for (const rival of state.rivals) {
    rival.distance += rival.speed*dt;
    if (state.collisionCooldown===0 && Math.abs(rival.distance-state.distance)<7 && Math.abs(rival.x-state.x)<.3 && state.speed>10) { state.speed*=.62; state.collisionCooldown=1.4; state.hit=.3; }
  }
  state.position = 1 + state.rivals.filter(rival=>rival.distance>state.distance).length;
  let lap = false;
  if (state.distance >= (state.completedLaps+1)*TRACK_LENGTH) {
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
