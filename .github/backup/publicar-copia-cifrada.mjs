// Publica únicamente el cifrado ya creado. La rama no contiene SQL ni datos
// personales legibles y puede descargarse aun si el artefacto de Actions caduca.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const repository=process.env.GITHUB_REPOSITORY,token=process.env.GITHUB_TOKEN,run=process.env.GITHUB_RUN_ID;
if(!repository||!token||!run)throw Error('Falta la autorización temporal de GitHub Actions.');
const root='/tmp/octavia-security/entrega',encrypted=await readFile(root+'/archivo-seguridad-octavia-web.cifrado.bin'),envelope=JSON.parse(await readFile(root+'/manifest.json','utf8'));
async function gh(path,body){let response,data;for(let i=0;i<6;i++){response=await fetch('https://api.github.com/repos/'+repository+path,{method:'POST',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});if(response.ok){data=await response.json();return data;}if(response.status===429||response.status===403||response.status>=500){await new Promise(resolve=>setTimeout(resolve,3000*(i+1)));continue;}break;}throw Error('No se pudo conservar la copia cifrada (HTTP '+response?.status+').');}
const encoded=encrypted.toString('base64'),tree=[],chunkSize=12_000_000;envelope.chunks=[];
for(let start=0;start<encoded.length;start+=chunkSize){const index=Math.floor(start/chunkSize),name='part-'+String(index).padStart(3,'0')+'.b64',content=encoded.slice(start,start+chunkSize),blob=await gh('/git/blobs',{content,encoding:'utf-8'});tree.push({path:name,mode:'100644',type:'blob',sha:blob.sha});envelope.chunks.push({path:name,length:content.length,sha256:createHash('sha256').update(content).digest('hex')});}
const manifest=await gh('/git/blobs',{content:JSON.stringify(envelope,null,2),encoding:'utf-8'});tree.push({path:'manifest.json',mode:'100644',type:'blob',sha:manifest.sha});const newTree=await gh('/git/trees',{tree}),commit=await gh('/git/commits',{message:'Copia cifrada actual de OCTAVIA WEB',tree:newTree.sha,parents:[]}),branch='seguridad-octavia-web-'+run;await gh('/git/refs',{ref:'refs/heads/'+branch,sha:commit.sha});
console.log('RAMA_CIFRADA_OK '+JSON.stringify({branch,commit:commit.sha,parts:envelope.chunks.length,ciphertextBytes:encrypted.length,ciphertextSha256:envelope.ciphertextSha256}));
