import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
const directory=new URL('../dist/assets/race/',import.meta.url);
const photos=[
 {id:'cockpit',name:'Skoda Octavia IV Combi RS Auto Zuerich 2021 IMG 0574.jpg',width:1280},
 {id:'rival',name:'Skoda Octavia IV Combi RS Auto Zuerich 2021 IMG 0190.jpg',width:768},
 {id:'circuit',name:'Silverstone Pit Straight Panorama (14421352709).jpg',width:1920},
];
await mkdir(directory,{recursive:true});
let cached=false;try{const credits=JSON.parse(await readFile(new URL('credits.json',directory),'utf8'));if(credits.length===photos.length){await Promise.all(photos.map(photo=>access(new URL(photo.id+'.jpg',directory))));cached=true;}}catch{}
if(cached){console.log('Fotografías del circuito recuperadas de la caché.');}else{
 async function get(url){let response;for(let attempt=0;attempt<3;attempt++){try{response=await fetch(url,{headers:{'User-Agent':'ClubOctaviaRacing/1.0 (independent fan website)'},signal:AbortSignal.timeout(30000)});if(response.ok)return response;if(response.status!==429&&response.status<500)break;}catch{}await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));}throw new Error('No se pudo recuperar una fotografía del circuito (HTTP '+(response?.status||'sin respuesta')+').');}
 const credits=[];
 for(const photo of photos){
  const url=new URL('https://commons.wikimedia.org/w/api.php');Object.entries({action:'query',format:'json',prop:'imageinfo',titles:'File:'+photo.name,iiprop:'url|extmetadata',iiurlwidth:photo.width}).forEach(([key,value])=>url.searchParams.set(key,value));
  const body=await(await get(url)).json();const info=Object.values(body.query.pages)[0].imageinfo?.[0];
  if(!info||!/^CC BY(?:-SA)? [234]\.0$/.test(info.extmetadata.LicenseShortName?.value||''))throw new Error('La fotografía no tiene la licencia reutilizable prevista.');
  const imageUrl=new URL(info.thumburl||info.url);if(!imageUrl.hostname.endsWith('.wikimedia.org'))throw new Error('Origen de fotografía no permitido.');
  const response=await get(imageUrl);if(!response.headers.get('content-type')?.startsWith('image/jpeg'))throw new Error('Formato de fotografía no válido.');const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>6000000||bytes[0]!==255||bytes[1]!==216)throw new Error('Fotografía no válida.');await writeFile(new URL(photo.id+'.jpg',directory),bytes);
  credits.push({id:photo.id,title:photo.name,author:(info.extmetadata.Artist?.value||'Autor en Wikimedia Commons').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&'),source:'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(photo.name.replaceAll(' ','_')),license:info.extmetadata.LicenseShortName.value,licenseUrl:info.extmetadata.LicenseUrl.value,changes:'Recorte de presentación y superposición de elementos del juego. Imagen y adaptación visual bajo su licencia original.'});
 }
 await writeFile(new URL('credits.json',directory),JSON.stringify(credits,null,2));console.log('Fotografías reales del Octavia IV RS y Silverstone preparadas con sus atribuciones.');
}
