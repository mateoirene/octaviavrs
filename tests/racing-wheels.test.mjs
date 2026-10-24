import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SIDE_WHEELS,rollingAngle,photoWheelPose} from '../dist/racing-wheels.mjs';
import {finishReplayFrame} from '../dist/racing-finish-replay.mjs';
test('ruedas dan una vuelta por cada circunferencia recorrida y se paran con el coche',()=>{const radius=.35;assert.ok(Math.abs(rollingAngle(-8,radius))<1e-9);assert.ok(Math.abs(rollingAngle(-8+2*Math.PI*radius,radius)+2*Math.PI)<1e-9);assert.equal(rollingAngle(32,radius),rollingAngle(finishReplayFrame(9.8).distance,radius));});
test('giro ocho veces más rápido entre cámara lenta y rápida a igual desplazamiento',()=>{const r=.36,slow=(rollingAngle(finishReplayFrame(2.1).distance,r)-rollingAngle(finishReplayFrame(2).distance,r))/.1,fast=(rollingAngle(finishReplayFrame(8.3).distance,r)-rollingAngle(finishReplayFrame(8.2).distance,r))/.1;assert.ok(Math.abs(fast/slow-8)<1e-9);});
test('dos ruedas por modelo colocadas dentro de la fotografía con radios coherentes',()=>{for(const [model,wheels]of Object.entries(SIDE_WHEELS)){assert.equal(wheels.length,2);for(const wheel of wheels){const pose=photoWheelPose(wheel,{left:10,right:1918,top:25,bottom:790},model==='tesla-model-3'?4.694:4.69);assert.ok(pose.x>-.5&&pose.x<.5);assert.ok(pose.y>-.5&&pose.y<.5);assert.ok(pose.radius>.25&&pose.radius<.38);assert.ok(pose.rollingRadius>pose.radius);}}});
