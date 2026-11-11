import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../dist/assets/highway/',import.meta.url);
await mkdir(root,{recursive:true});
const revision='7d4ba189827916452eeadc82d4b712dbc6280a6f';
const resources=[
 ['car-concept.glb',`https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/${revision}/Models/CarConcept/glTF-Binary/CarConcept.glb`,'c272098089d78c5cd9fd9f24ff50ee8acf8d932c55f2d55fc10adb6c8998966b'],
 ['sedan.glb','https://files.innerscene.com/library/sedan-car-42109739/75c64c1b3c8b03734314/sedan-original.glb','187c9935c40f952837fe2d98200b390415e695196d7b1280c9ec3ebb1bf4961b'],
];
for(const [name,url,expectedHash] of resources){
 let bytes;try{bytes=await readFile(new URL(name,root));}catch{const r=await fetch(url,{signal:AbortSignal.timeout(90000)});if(!r.ok)throw Error(`${name}: HTTP ${r.status}`);bytes=Buffer.from(await r.arrayBuffer());}
 if(bytes.length<10000||bytes.toString('ascii',0,4)!=='glTF')throw Error('GLB inválido: '+name);
 if(createHash('sha256').update(bytes).digest('hex')!==expectedHash)throw Error('El recurso no coincide con la versión verificada: '+name);
 await writeFile(new URL(name,root),bytes);console.log(name,bytes.length,createHash('sha256').update(bytes).digest('hex'));
}
await writeFile(new URL('credits.json',root),JSON.stringify({
 player:{title:'Car Concept',author:'Eric Chadwick / Darmstadt Graphics Group GmbH',year:2024,license:'CC-BY-4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',source:`https://github.com/KhronosGroup/glTF-Sample-Assets/tree/${revision}/Models/CarConcept`,changes:'Normalización a metros, materiales adaptados a móvil, pintura azul, luces y animación de ruedas. Deportivo conceptual provisional; NO representa un Škoda Octavia. No se atribuye patrocinio a Khronos.'},
 traffic:{title:'Sedan car',author:'Innerscene',license:'CC0-1.0',source:'https://www.innerscene.com/tools/library/3d-parts/sedan-car-42109739',changes:'Instancias de tráfico, pintura y animación de ruedas'},
 surfaces:{title:'Asphalt 02 y Kloppenheim 06 Pure Sky',author:'Poly Haven; asfalto de Rob Tuytel',license:'CC0',source:'https://polyhaven.com/a/asphalt_02'},
},null,2));
