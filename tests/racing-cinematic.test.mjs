import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createOvertakeSequence,advanceOvertakeSequence} from '../dist/racing-cinematic-state.mjs';
test('secuencia solo al pasar de primero a segundo, una vez por carrera',()=>{
 const s=createOvertakeSequence();assert.equal(advanceOvertakeSequence(s,4,'running',.1),false);assert.equal(advanceOvertakeSequence(s,2,'running',.1),false);assert.equal(advanceOvertakeSequence(s,1,'running',.1),false);assert.equal(advanceOvertakeSequence(s,2,'running',.1),true);assert.equal(s.elapsed,0);advanceOvertakeSequence(s,2,'running',2);assert.equal(s.elapsed,2);advanceOvertakeSequence(s,2,'paused',10);assert.equal(s.elapsed,2);advanceOvertakeSequence(s,2,'running',5);assert.equal(s.active,false);advanceOvertakeSequence(s,1,'running',.1);assert.equal(advanceOvertakeSequence(s,2,'running',.1),false);
 const reset=createOvertakeSequence();advanceOvertakeSequence(reset,1,'running',.1);assert.equal(advanceOvertakeSequence(reset,2,'running',.1),true);
});
