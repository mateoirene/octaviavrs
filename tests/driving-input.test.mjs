import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readGamepad,mergeDrivingInput,createGamepadReader} from '../dist/driving-input.mjs';
import {createHighway,stepHighway} from '../dist/highway-physics.mjs';
import {createRace,stepRace} from '../dist/racing-physics.mjs';
const pad=(axis=0,buttons={})=>({connected:true,mapping:'standard',axes:[axis],buttons:Array.from({length:16},(_,i)=>({value:buttons[i]||0}))});
test('mando estándar: zona muerta, gatillos proporcionales y desconexión neutral',()=>{
 assert.equal(readGamepad([pad(.1)]).right,0);
 const input=readGamepad([null,pad(-.57,{7:.4,6:.2,9:1,3:1})]);
 assert.ok(Math.abs(input.left-.5)<.001);assert.equal(input.right,0);assert.equal(input.accelerate,.4);assert.equal(input.brake,.2);assert.equal(input.pause,true);assert.equal(input.camera,true);
 assert.equal(readGamepad([{...pad(),connected:false}]).connected,false);assert.equal(readGamepad([{...pad(),mapping:''}]).accelerate,0);
 assert.equal(mergeDrivingInput(new Set(['accelerate']),input).accelerate,1);
});
test('ambas físicas mantienen acelerador analógico y frenada simultánea',()=>{
 for(const [create,step]of [[createHighway,stepHighway],[createRace,stepRace]]){
  const full=create(),half=create();full.phase=half.phase='running';
  for(let i=0;i<60;i++){step(full,{accelerate:1},1/60);step(half,{accelerate:.5},1/60);}
  assert.ok(full.speed>half.speed*1.5);const before=half.speed;
  for(let i=0;i<30;i++)step(half,{accelerate:.5,brake:1},1/60);
  assert.ok(half.speed<before);
 }
});
test('Start y cámara generan una acción por pulsación y desconectar genera una pausa',()=>{
 let current=pad(0,{9:1,3:1});const reader=createGamepadReader(()=>[current]);
 assert.deepEqual(reader.poll().events,{pause:true,camera:true,disconnected:false});
 assert.deepEqual(reader.poll().events,{pause:false,camera:false,disconnected:false});
 current=null;assert.equal(reader.poll().events.disconnected,true);assert.equal(reader.poll().accelerate,0);
 current=pad(0,{9:1});assert.equal(reader.poll().events.pause,true);
 const blocked=createGamepadReader(()=>{throw Error('Gamepad API bloqueada');});assert.equal(blocked.poll().connected,false);
});
