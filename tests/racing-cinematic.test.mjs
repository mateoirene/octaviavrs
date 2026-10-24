import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createOvertakeSequence,advanceOvertakeSequence} from '../dist/racing-cinematic-state.mjs';
test('secuencia solo al pasar de primero a segundo, una vez por carrera',()=>{
 const s=createOvertakeSequence();assert.equal(advanceOvertakeSequence(s,4,'running',.1),false);assert.equal(advanceOvertakeSequence(s,2,'running',.1),false);assert.equal(advanceOvertakeSequence(s,1,'running',.1),false);assert.equal(advanceOvertakeSequence(s,2,'running',.1),true);assert.equal(s.elapsed,0);advanceOvertakeSequence(s,2,'running',2);assert.equal(s.elapsed,2);advanceOvertakeSequence(s,2,'paused',10);assert.equal(s.elapsed,2);advanceOvertakeSequence(s,2,'running',5);assert.equal(s.active,false);advanceOvertakeSequence(s,1,'running',.1);assert.equal(advanceOvertakeSequence(s,2,'running',.1),false);
 const reset=createOvertakeSequence();advanceOvertakeSequence(reset,1,'running',.1);assert.equal(advanceOvertakeSequence(reset,2,'running',.1),true);
});

test('el incendio pertenece al Tesla blanco, se retira y no modifica el Octavia del piloto',async()=>{
 const {createRace,stepRace}=await import('../dist/racing-physics.mjs');const {igniteTesla,teslaFireTime}=await import('../dist/racing-cinematic-state.mjs');
 const race=createRace();race.phase='running';race.elapsed=10;race.speed=40;const octavia=race.rivals[0],tesla=igniteTesla(race),distance=tesla.distance;
 assert.equal(tesla.model,'tesla-model-3');assert.equal(tesla.color,'#ffffff');assert.equal(tesla.name,'ALBERTO');assert.equal(tesla.retired,true);assert.equal(tesla.speed,0);assert.equal(race.speed,40);assert.equal(octavia.retired,undefined);assert.equal(teslaFireTime(race),0);
 stepRace(race,{accelerate:true},.05);assert.equal(tesla.distance,distance);assert.ok(octavia.distance>32);assert.ok(teslaFireTime(race)>0);const fireTime=teslaFireTime(race);race.phase='paused';stepRace(race,{},.05);assert.equal(teslaFireTime(race),fireTime);assert.equal(teslaFireTime(createRace()),null);
});
