import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createOvertakeSequence,advanceOvertakeSequence,igniteTesla,teslaFireTime,teslaLeaderOvertake} from '../dist/racing-cinematic-state.mjs';
import {createRace,stepRace} from '../dist/racing-physics.mjs';
test('la antigua secuencia de fuego y retrovisor permanece desactivada',()=>{
 const sequence=createOvertakeSequence(),race=createRace();race.phase='running';race.distance=100;race.rivals[2].distance=90;
 assert.equal(sequence.disabled,true);assert.equal(advanceOvertakeSequence(sequence,2,'running',1,true),false);assert.equal(teslaLeaderOvertake(sequence,race),false);assert.equal(teslaFireTime(race),null);
});

test('adelantar al Tesla no lo retira: conserva velocidad y continúa compitiendo',()=>{
 const race=createRace();race.phase='running';race.elapsed=10;race.speed=40;const tesla=race.rivals[2];tesla.distance=100;tesla.speed=45;race.distance=101;const same=igniteTesla(race),before=tesla.distance;
 assert.equal(same,tesla);assert.equal(tesla.model,'tesla-model-3');assert.equal(tesla.color,'#ffffff');assert.equal(tesla.name,'ALBERTO');assert.equal(tesla.retired,undefined);assert.equal(teslaFireTime(race),null);
 stepRace(race,{accelerate:true},.05);assert.ok(tesla.distance>before);assert.ok(tesla.speed>0);assert.equal(race.teslaFireStartedAt,undefined);
});
