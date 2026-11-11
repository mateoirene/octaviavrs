// Metres, seconds and m/s throughout. Rendering uses this same road frame.
export const LANES=[-3.6,0,3.6], ROAD_HALF=5.4, MAX_SPEED=230/3.6, TRAFFIC_LIMIT=18;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function roadFrame(s){
 const x=24*Math.sin(s/280)+11*Math.sin(s/630),dx=24/280*Math.cos(s/280)+11/630*Math.cos(s/630),n=Math.hypot(1,dx);
 const y=3.6*Math.sin(s/220)+1.4*Math.sin(s/95),grade=3.6/220*Math.cos(s/220)+1.4/95*Math.cos(s/95),bank=.028*Math.sin(s/170);
 return {x,y,grade,bank,s,dx,right:[1/n,dx/n],heading:Math.atan(dx)};
}
function random(state){state.seed=(Math.imul(state.seed,1664525)+1013904223)>>>0;return state.seed/4294967296;}
export function createHighway(seed=20261111){
 const traffic=Array.from({length:6},(_,i)=>({id:i+1,distance:100+i*65,x:LANES[i%3],lane:i%3,targetLane:i%3,speed:20+i*1.5,cruise:24+i*1.4,changeCooldown:4+i,passed:false}));
 return {phase:'ready',distance:0,x:0,speed:0,steering:0,yaw:0,lateralSpeed:0,lateralAccel:0,acceleration:0,braking:false,elapsed:0,traffic,seed,spawnClock:0,nextId:7,collisions:0,passed:0,hit:0,cooldown:0,offroad:false};
}
function gapAt(state,car,lane){let front=Infinity,back=Infinity,leader=null;for(const other of [...state.traffic,state]){if(other===car||(Math.abs(other.x-LANES[lane])>2.2&&other.targetLane!==lane))continue;const d=other.distance-car.distance;if(d>=0&&d<front){front=d;leader=other;}if(d<0)back=Math.min(back,-d);}return {front,back,leader};}
export function spawnTraffic(state){
 if(state.traffic.length>=TRAFFIC_LIMIT)return false;
 const lane=Math.floor(random(state)*3),distance=state.distance+430+random(state)*100;
 if(state.traffic.some(c=>Math.abs(c.x-LANES[lane])<2&&Math.abs(c.distance-distance)<65))return false;
 state.traffic.push({id:state.nextId++,distance,x:LANES[lane],lane,targetLane:lane,speed:19+random(state)*13,cruise:22+random(state)*13,changeCooldown:3+random(state)*5,passed:false});return true;
}
export function stepHighway(state,input,delta){
 if(state.phase!=='running'||!Number.isFinite(delta)||delta<=0)return;
 // Substeps prevent tunnelling even after a slow rendered frame.
 let remaining=Math.min(delta,.25);while(remaining>1e-8){const dt=Math.min(remaining,1/120);advance(state,input,dt);remaining-=dt;}
}
function advance(state,input,dt){
 const previous=state.distance,oldX=state.x,oldTraffic=state.traffic.map(c=>({distance:c.distance,x:c.x}));
 state.elapsed+=dt;state.hit=Math.max(0,state.hit-dt);state.cooldown=Math.max(0,state.cooldown-dt);
 const amount=v=>v===true?1:Number.isFinite(v)?clamp(v,0,1):0,steer=amount(input.right)-amount(input.left),gas=amount(input.accelerate),brake=amount(input.brake),previousSpeed=state.speed;
 state.steering+=(steer-state.steering)*(1-Math.exp(-9*dt));state.braking=brake>0;
 const f=roadFrame(state.distance),curve=(roadFrame(state.distance+1).heading-f.heading),targetYaw=state.steering*.17/(1+state.speed*.012);
 state.yaw+=(targetYaw-state.yaw)*(1-Math.exp(-5*dt));
 state.speed=clamp(state.speed+((gas?gas*6.8*(1-.6*state.speed/MAX_SPEED):-1.5)-.0004*state.speed**2-brake*24-f.grade*9.81)*dt,0,MAX_SPEED);
 state.lateralAccel=clamp((Math.sin(state.yaw)*state.speed-state.lateralSpeed)*(state.offroad?3:8)-curve*state.speed**2*.14,-8.5,8.5);
 state.lateralSpeed+=state.lateralAccel*dt;state.x+=state.lateralSpeed*dt;
 state.acceleration=(state.speed-previousSpeed)/dt;
 state.offroad=Math.abs(state.x)>ROAD_HALF-1.12;
 if(state.offroad)state.speed=Math.max(0,state.speed-13*dt);
 if(Math.abs(state.x)>5.95){state.x=clamp(state.x,-5.95,5.95);state.lateralSpeed*=-.25;state.yaw*=-.25;if(state.cooldown===0&&state.speed>3){state.speed*=.5;state.hit=.5;state.collisions++;state.cooldown=1.2;}}
 state.distance+=state.speed*dt;
 for(const car of state.traffic){
  car.changeCooldown-=dt;let gap=gapAt(state,car,car.targetLane);
  if(car.changeCooldown<=0&&gap.front<12+car.speed*1.4&&car.targetLane===car.lane){
   for(const lane of [car.lane-1,car.lane+1].filter(l=>l>=0&&l<3)){
    const next=gapAt(state,car,lane);
    if(next.front>Math.max(45,car.speed*2)&&next.back>65&&!state.traffic.some(c=>c!==car&&c.targetLane===lane&&Math.abs(c.distance-car.distance)<65)){car.targetLane=lane;car.changeCooldown=8;gap=next;break;}
   }
  }
  const target=gap.front<10+car.speed*1.4?Math.min(car.cruise,Math.max(0,(gap.leader?.speed||0)+(gap.front-10-car.speed*1.4)*.65)):car.cruise;
  car.speed=clamp(car.speed+clamp(target-car.speed,-8*dt,2.5*dt),0,car.cruise);
  const oldLateral=car.x;car.x+=clamp(LANES[car.targetLane]-car.x,-1.25*dt,1.25*dt);car.lateralSpeed=(car.x-oldLateral)/dt;
  if(Math.abs(car.x-LANES[car.targetLane])<.02)car.lane=car.targetLane;
  car.distance+=Math.min(car.speed*dt,Math.max(0,gap.front-5.2));
 }
 for(let i=0;i<state.traffic.length;i++){
  const car=state.traffic[i],old=oldTraffic[i],a=old.distance-previous,b=car.distance-state.distance;
  const t=a===b?0:clamp(a/(a-b),0,1),relativeX=(old.x-oldX)+((car.x-state.x)-(old.x-oldX))*t;
  const closest=a+(b-a)*t;
  if(Math.abs(closest)<4.7&&Math.abs(relativeX)<2.1&&state.cooldown===0){
   state.speed=Math.min(state.speed*.48,car.speed*.8);state.hit=.7;state.cooldown=1.4;state.collisions++;
   const side=state.x>=car.x?1:-1;state.x=clamp(car.x+side*2.25,-5.95,5.95);state.lateralSpeed=side*1.8;state.yaw=side*.08;
  }
  if(!car.passed&&car.distance<state.distance-6){car.passed=true;state.passed++;}
 }
 state.traffic=state.traffic.filter(c=>c.distance>state.distance-85&&c.distance<state.distance+850);
 state.spawnClock-=dt;if(state.spawnClock<=0){spawnTraffic(state);state.spawnClock=.85;}
}
