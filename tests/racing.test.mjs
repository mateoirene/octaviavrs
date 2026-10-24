import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRace,stepRace,TRACK,TRACK_LENGTH,MAX_SPEED,lapTime} from '../dist/racing-physics.mjs';
test('circuito cerrado, controles, freno, pausa y velocidad máxima',()=>{assert.ok(TRACK.length>100);assert.equal(TRACK_LENGTH,TRACK.length*18);assert.equal(TRACK[0].curve,0);assert.equal(TRACK.at(-1).curve,0);const race=createRace();stepRace(race,{accelerate:true},1);assert.equal(race.distance,0);race.phase='running';for(let i=0;i<240;i++)stepRace(race,{accelerate:true},1/60);assert.ok(race.speed>20);assert.ok(race.speed<=MAX_SPEED);const speed=race.speed;stepRace(race,{brake:true},.05);assert.ok(race.speed<speed);race.phase='paused';const distance=race.distance;stepRace(race,{accelerate:true},.05);assert.equal(race.distance,distance);race.phase='running';race.x=1.5;race.speed=0;stepRace(race,{},.05);assert.equal(race.speed,0,'No acelera solo fuera de pista');});
test('salirse de pista penaliza y el giro permite volver al asfalto',()=>{const road=createRace(),grass=createRace();road.phase=grass.phase='running';road.speed=grass.speed=50;grass.x=1.7;stepRace(road,{accelerate:true},.05);stepRace(grass,{accelerate:true,left:true},.05);assert.ok(grass.speed<road.speed);assert.ok(grass.x<1.7);});
test('cuenta tres vueltas, registra tiempos y finaliza sin seguir avanzando',()=>{const race=createRace(999);race.phase='running';for(let lap=0;lap<3;lap++){race.distance=TRACK_LENGTH*(lap+1)-.1;race.speed=50;race.elapsed=65*(lap+1);const event=stepRace(race,{},.05);assert.equal(event.lap,true);assert.equal(race.completedLaps,lap+1);}assert.equal(race.phase,'finished');assert.equal(race.lapTimes.length,3);assert.ok(race.bestLap<999);const distance=race.distance;stepRace(race,{accelerate:true},.05);assert.equal(race.distance,distance);assert.equal(lapTime(65.123),'01:05.123');assert.equal(lapTime(null),'—');});
test('los rivales avanzan y los contactos reducen la velocidad',()=>{const race=createRace();race.phase='running';race.speed=50;race.x=0;race.rivals=[{distance:1,speed:48,x:0}];stepRace(race,{accelerate:true},.05);assert.ok(race.speed<40);assert.ok(race.hit>0);assert.ok(race.rivals[0].distance>1);});

test('tres niveles con trazados, anchuras y rivales diferentes',()=>{
 const easy=createRace(null,'easy'),middle=createRace(null,'intermediate'),expert=createRace(null,'expert');
 assert.equal(easy.difficulty,'easy');assert.equal(middle.difficulty,'intermediate');assert.equal(expert.difficulty,'expert');
 assert.ok(easy.settings.roadHalf>middle.settings.roadHalf&&middle.settings.roadHalf>expert.settings.roadHalf);
 assert.ok(easy.rivals[0].speed<middle.rivals[0].speed&&middle.rivals[0].speed<expert.rivals[0].speed);
 assert.notDeepEqual(easy.track.map(s=>s.curve),expert.track.map(s=>s.curve));
 for(const race of [easy,middle,expert]){race.phase='running';race.distance=race.trackLength-.1;race.speed=50;assert.equal(stepRace(race,{},.05).lap,true);assert.equal(race.completedLaps,1);}
 assert.equal(createRace(null,'unknown').difficulty,'easy');
});

test('Tesla blanco ALBERTO acompaña a los dos Octavia y participa en clasificación',()=>{
 for(const level of ['easy','intermediate','expert']){
  const race=createRace(null,level);assert.equal(race.rivals.length,3);assert.equal(race.position,4);
  assert.equal(race.rivals.filter(car=>car.model==='octavia').length,2);
  const tesla=race.rivals.find(car=>car.model==='tesla-model-3');assert.equal(tesla.name,'ALBERTO');assert.equal(tesla.color,'#ffffff');
  race.phase='running';stepRace(race,{},.05);assert.ok(tesla.distance>50);assert.equal(race.position,4);
  race.distance=500;stepRace(race,{},.05);assert.equal(race.position,1);
  assert.equal(createRace(null,level).rivals.find(car=>car.model==='tesla-model-3').distance,110);
 }
});
