import {mkdir,writeFile,access,readFile} from 'node:fs/promises';
const vendor=new URL('../dist/vendor/',import.meta.url),assets=new URL('../dist/assets/track3d/',import.meta.url);
await mkdir(vendor,{recursive:true});await mkdir(assets,{recursive:true});
async function get(url){let error;for(let i=0;i<3;i++){try{const r=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error('HTTP '+r.status);return r;}catch(e){error=e;await new Promise(r=>setTimeout(r,1000*(i+1)));}}throw error;}
for(const name of ['three.module.js','three.core.js']){const path=new URL(name,vendor);try{await access(path);}catch{await writeFile(path,await(await get('https://cdn.jsdelivr.net/npm/three@0.180.0/build/'+name)).text());}}
const rgbePath=new URL('HDRLoader.js',vendor);try{await access(rgbePath);}catch{let code=await(await get('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/HDRLoader.js')).text();code=code.replaceAll("from 'three'","from './three.module.js'");await writeFile(rgbePath,code);}
const bufferUtilsPath=new URL('BufferGeometryUtils.js',vendor);try{await access(bufferUtilsPath);}catch{let code=await(await get('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/BufferGeometryUtils.js')).text();code=code.replaceAll("from 'three'","from './three.module.js'");await writeFile(bufferUtilsPath,code);}
const gltfPath=new URL('GLTFLoader.js',vendor);try{await access(gltfPath);}catch{let code=await(await get('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js')).text();code=code.replaceAll("from 'three'","from './three.module.js'").replace("from '../utils/BufferGeometryUtils.js'","from './BufferGeometryUtils.js'");await writeFile(gltfPath,code);}
const skyPath=new URL('sky.hdr',assets);try{await access(skyPath);}catch{const bytes=new Uint8Array(await(await get('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloppenheim_06_puresky_1k.hdr')).arrayBuffer());if(bytes.length<100000||bytes.length>6000000)throw Error('HDR de cielo no válido');await writeFile(skyPath,bytes);}
await writeFile(new URL('THREE-LICENSE.txt',vendor),await(await get('https://cdn.jsdelivr.net/npm/three@0.180.0/LICENSE')).text());
const metadata=await(await get('https://api.polyhaven.com/files/asphalt_02')).json();
console.log('PBR_MAP_KEYS '+JSON.stringify(Object.keys(metadata)));
for(const [key,name] of [['Diffuse','asphalt-color.jpg'],['nor_gl','asphalt-normal.jpg'],['Rough','asphalt-rough.jpg']]){
 const path=new URL(name,assets);try{await access(path);continue;}catch{}
 const map=metadata[key]?.['1k']?.jpg;if(!map?.url)throw Error('Mapa PBR no disponible: '+key);const bytes=new Uint8Array(await(await get(map.url)).arrayBuffer());if(bytes.length>6000000||bytes[0]!==255||bytes[1]!==216)throw Error('Mapa PBR inválido');await writeFile(path,bytes);
}
await writeFile(new URL('credits.json',assets),JSON.stringify({engine:'Three.js 0.180.0 · MIT',loaders:'GLTFLoader y HDRLoader · Three.js MIT',texture:'Asphalt 02',author:'Rob Tuytel',sky:'Kloppenheim 06 Pure Sky · Poly Haven · CC0',license:'CC0',source:'https://polyhaven.com/a/asphalt_02'},null,2));
console.log('RECURSOS_3D_OK: Three.js local y mapas fotográficos PBR CC0 de Poly Haven.');
