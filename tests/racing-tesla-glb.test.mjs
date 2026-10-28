import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';

const asset=new URL('../dist/assets/Tesla_Model3.glb',import.meta.url);

async function glbJson(){
 const bytes=await readFile(asset),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 assert.equal(view.getUint32(0,true),0x46546c67,'cabecera glTF');
 assert.equal(view.getUint32(4,true),2,'GLB versión 2');
 assert.equal(view.getUint32(8,true),bytes.byteLength,'longitud declarada');
 assert.equal(view.getUint32(16,true),0x4e4f534a,'primer bloque JSON');
 return JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+view.getUint32(12,true))).trim());
}

test('Tesla_Model3.glb es un modelo binario local con geometría',async()=>{
 const info=await stat(asset),json=await glbJson();
 assert.ok(info.size>10_000,'el modelo no puede ser un marcador vacío');
 assert.ok(info.size<5_000_000,'presupuesto razonable para móvil');
 assert.ok(Array.isArray(json.meshes)&&json.meshes.length>0);
 assert.ok(Array.isArray(json.nodes)&&json.nodes.length>0);
 assert.equal(json.nodes.filter(node=>/^Rueda (delantera|trasera)/i.test(node.name||'')).length,4,'cuatro ruedas separadas');
 assert.ok(json.buffers.every(buffer=>!buffer.uri),'geometría integrada en el GLB');
 assert.ok((json.images||[]).every(image=>!image.uri),'sin texturas externas perdidas');
 const triangles=json.meshes.flatMap(mesh=>mesh.primitives).reduce((total,primitive)=>{const accessor=json.accessors[primitive.indices??primitive.attributes.POSITION];return total+((primitive.mode??4)===4?accessor.count/3:0);},0);
 assert.ok(triangles>1_000&&triangles<100_000,'presupuesto de triángulos apto para web');
});

test('el mismo GLB se usa durante la carrera y la repetición',async()=>{
 const [world,vehicles]=await Promise.all([
  readFile(new URL('../dist/racing-world3d.mjs',import.meta.url),'utf8'),
  readFile(new URL('../dist/racing-vehicles3d.mjs',import.meta.url),'utf8')
 ]);
 assert.match(world,/GLTFLoader/);
 assert.match(world,/assets\/Tesla_Model3\.glb/);
 assert.match(world,/tesla-glb-side/);
 assert.match(vehicles,/attachTeslaGlb/);
 assert.match(vehicles,/Matrícula ALBERTO/);
 assert.match(vehicles,/groundContactShadow/);
});
