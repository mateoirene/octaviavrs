import {test} from 'node:test';
import assert from 'node:assert/strict';
import {paintedImage} from '../dist/racing-paint.mjs';
import {SKODA_PAINTS} from '../dist/racing-circuits.mjs';
test('negro conserva reflejos y protege pilotos rojos, cromados y transparencia',()=>{
 const original=globalThis.document,pixels=new Uint8ClampedArray([20,100,240,255,30,110,170,255,210,210,210,255,220,15,20,255,0,50,240,0]);let result;
 globalThis.document={createElement(){return {getContext(){return {drawImage(){},getImageData(){return {data:pixels}},putImageData(frame){result=frame.data}}}}}};
 try{assert.equal(SKODA_PAINTS.black,'Negro');paintedImage({width:5,height:1},'black');assert.deepEqual(Array.from(result.slice(0,3)),[39,39,39]);assert.ok(result[4]<result[0]);assert.deepEqual(Array.from(result.slice(8)),[210,210,210,255,220,15,20,255,0,50,240,0]);}finally{globalThis.document=original;}
});

import {validateRaceResult} from '../server/racing.mjs';
test('el servidor admite y conserva negro al guardar la carrera',()=>{
 const result=validateRaceResult({id:crypto.randomUUID(),pilot:'Piloto Negro',level:'easy',circuit:'club',car:'Octavia negro',paint:'black',mode:'free',total:360000,laps:[120000,120000,120000],position:1});
 assert.equal(result.paint,'black');
});
