import {test} from 'node:test';
import assert from 'node:assert/strict';
import {graphicsProfile,bufferPixelRatio,createPaintGate,createResolutionBudget} from '../dist/racing-render-budget.mjs';
test('a high-core phone keeps a mobile budget in either orientation',()=>{
 for(const [width,height]of [[390,844],[844,390]]){const p=graphicsProfile({width,height,coarsePointer:true,cores:8,memory:4});assert.equal(p.mobile,true);assert.equal(p.targetFps,30);assert.equal(p.antialias,false);assert.equal(p.shadows,false);assert.equal(p.hdr,false);assert.ok(p.pixelRatio<=1);}
 const desktop=graphicsProfile({width:1440,height:900,cores:8});assert.equal(desktop.mobile,false);assert.equal(desktop.targetFps,60);assert.equal(desktop.hdr,true);
});
test('drawing buffers stay inside a phone budget regardless of DPR',()=>{const p=graphicsProfile({width:844,height:390,coarsePointer:true});for(const [w,h]of [[390,490],[844,390],[1920,1080]]){const r=bufferPixelRatio(p,w,h,p.pixelRatio,3);assert.ok(r<=1);assert.ok(w*h*r*r<=p.maxPixels+1);}});
test('painting at 30 FPS does not require dropping physics ticks',()=>{const g=createPaintGate(30);let paints=0,physics=0;for(let t=0;t<1000;t+=1000/60){physics++;if(g.due(t))paints++;}assert.ok(physics>=60);assert.ok(paints>=29&&paints<=31);g.reset();assert.equal(g.due(0),true);assert.equal(g.due(1),false);assert.equal(g.due(2,true),true);});
test('sustained overload lowers resolution without a terminal fallback or pause penalty',()=>{const p=graphicsProfile({coarsePointer:true,width:844,height:390}),b=createResolutionBudget(p);let result;for(let t=0;t<20000;t+=160)result=b.sample(t,true)||result;assert.equal(b.quality,p.minPixelRatio);assert.equal('available'in b,false);assert.ok(result.mean>=150);b.sample(30000,false);assert.equal(b.sample(60000,true),null);b.reset();assert.equal(b.sample(1,true),null);});
