import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const bytes=readFileSync(new URL('../dist/assets/highway/octavia-mk4.glb',import.meta.url));
const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
test('GLB Mk4: cuatro raíces de ruedas independientes, habitáculo y ópticas identificables',()=>{
 assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const names=json.nodes.map(n=>n.name||'');assert.equal(names.filter(n=>/^Wheel_[FR][LR]$/.test(n)).length,4);
 for(const pattern of [/Body sculpted/,/Cabin dashboard/,/Cabin steering/,/Headlight/,/Brakelight/,/Fixed brake caliper/])assert.ok(names.some(n=>pattern.test(n)),String(pattern));
 assert.ok(json.buffers.every(b=>!b.uri),'Ninguna carga externa oculta');
});
test('GLB contenido para web: presupuesto de triángulos y descarga sin texturas enormes',()=>{
 let triangles=0;for(const mesh of json.meshes)for(const p of mesh.primitives){assert.ok(p.attributes.POSITION!==undefined);triangles+=(p.indices!==undefined?json.accessors[p.indices].count:json.accessors[p.attributes.POSITION].count)/3;}
 assert.ok(triangles>5000&&triangles<65000,`${triangles} triángulos`);assert.ok(bytes.length<2*1024*1024);assert.equal(json.images?.length||0,0);
});
