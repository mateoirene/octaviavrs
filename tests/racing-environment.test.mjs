import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCircuitLayout} from '../dist/circuit-layout.mjs';
import {createCircuitEnvironment} from '../dist/racing-environment.mjs';
import {createRace} from '../dist/racing-physics.mjs';
import {CIRCUIT_BY_ID} from '../dist/racing-circuits.mjs';
test('escenario reproducible y fuera de la calzada en todos los trazados',()=>{
 for(const circuit of Object.keys(CIRCUIT_BY_ID)){
  const race=createRace(null,'easy',circuit),layout=createCircuitLayout(race.difficulty,race.trackLength,circuit),half=race.settings.roadHalf,environment=createCircuitEnvironment(layout,half,circuit);
  assert.deepEqual(createCircuitEnvironment(layout,half,circuit),environment);
  const points=[];for(let s=0;s<layout.length;s+=4)points.push(layout.position(s));
  assert.ok(environment.trees.length>20,circuit+' tiene vegetación');
  for(const object of [...environment.trees,...environment.buildings,...environment.parking]){
   const radius=object.radius||Math.hypot(object.size[0],object.size[2])/2;
   const distance=Math.min(...points.map(p=>Math.hypot(p[0]-object.p[0],p[2]-object.p[2])));
   assert.ok(distance>half+radius+2,circuit+' mantiene el volumen completo fuera de pista');
   assert.ok(object.p.every(Number.isFinite));
  }
 }
});
