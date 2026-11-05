import {test} from 'node:test';
import assert from 'node:assert/strict';
import {teslaImageView,teslaImageWidth,vehicleMotionFrame,wrapAngle} from '../dist/racing-tesla-views.mjs';
import {createCircuitLayout} from '../dist/circuit-layout.mjs';
test('eight azimuths, elevated views, and no mirrored camera side',()=>{
 for(let i=0;i<8;i++){const a=i*Math.PI/4,x=-10*Math.sin(a),z=10*Math.cos(a);assert.equal(teslaImageView(x,1,z).index,i);assert.equal(teslaImageView(x,20,z).level,'high');assert.equal(teslaImageView(x,1,z).level,'low');assert.ok(teslaImageWidth(i)>=2.08);}
 assert.equal(teslaImageView(-10,1,0).index,2);assert.equal(teslaImageView(10,1,0).index,6);
});
test('view boundaries have hysteresis and angle wrapping is continuous',()=>{
 const a=Math.PI/8+.02,previous=teslaImageView(0,1,10);assert.equal(teslaImageView(-10*Math.sin(a),1,10*Math.cos(a),previous).index,0);
 assert.ok(Math.abs(wrapAngle(2*Math.PI-.01)+.01)<1e-9);
 const high=teslaImageView(0,20,10);assert.equal(teslaImageView(0,6.5,10,high).level,'high');
});
test('heading follows a curved path and lane changes without changing the layout',()=>{
 const layout=createCircuitLayout('expert',3024),before=layout.frame(800);let previous=null;
 for(let d=800;d<850;d+=.5){const pose=vehicleMotionFrame(layout,d,.2*Math.sin(d/20),6,previous);for(const value of [...pose.p,...pose.r,...pose.t,pose.yaw])assert.ok(Number.isFinite(value));assert.ok(Math.abs(pose.t[0]*pose.r[0]+pose.t[2]*pose.r[2])<1e-9);const f=layout.frame(d);assert.ok(pose.r[0]*f.r[0]+pose.r[2]*f.r[2]>.9);if(previous)assert.ok(Math.abs(wrapAngle(pose.yaw-previous.yaw))<.2);previous=pose;}
 assert.deepEqual(layout.frame(800),before);const reset=vehicleMotionFrame(layout,0,0,6,previous);assert.ok(Math.abs(wrapAngle(reset.yaw-Math.atan2(layout.frame(0).t[0],layout.frame(0).t[2])))<1e-9);
});
