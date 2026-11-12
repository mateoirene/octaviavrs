import {cp,mkdtemp,writeFile,readFile,appendFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN,project='octaviaap',branch=process.env.GITHUB_REF_NAME==='codex/octavia-realismo-20261112'?'octavia-realismo':process.env.GITHUB_REF_NAME==='codex/simulador-multiplataforma'?'simulador-multiplataforma':'autovia-pr23',sha=process.env.GITHUB_SHA;
if(!token||!/^[a-f0-9]{32}$/i.test(account||'')||!sha)throw Error('Falta la configuración existente de Cloudflare/GitHub.');
async function api(path){const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/${project}${path}`,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Consulta Pages: HTTP '+r.status);const d=await r.json();if(!d.success)throw Error('Cloudflare no confirma la consulta de Pages.');return d.result;}
const before=await api('');
if(before.name!==project||before.subdomain!=='octaviaap.pages.dev'||!before.production_branch||before.production_branch===branch)throw Error('No se confirmó un destino de vista previa distinto de producción.');
const productionId=before.canonical_deployment?.id;if(!productionId)throw Error('No se pudo identificar la versión de producción para comprobar su conservación.');
const staging=await mkdtemp(join(process.env.RUNNER_TEMP||tmpdir(),'octavia-isolated-preview-'));await cp(resolve('dist'),staging,{recursive:true});
await writeFile(join(staging,'_worker.js'),await readFile('scripts/highway-preview-worker.mjs'));
await writeFile(join(staging,'_routes.json'),JSON.stringify({version:1,include:['/*'],exclude:[]}));
await writeFile(join(staging,'_headers'),'/*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store\n');
// Run outside the checkout so Wrangler cannot discover the club's functions/ folder.
await new Promise((resolve,reject)=>{const child=spawn('npx',['--yes','wrangler@4','pages','deploy',staging,'--project-name='+project,'--branch='+branch,'--commit-hash='+sha,'--commit-dirty=true'],{cwd:staging,env:process.env,stdio:'inherit',windowsHide:true});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('No se publicó la vista previa: código '+code)));});
const deployments=await api('/deployments'),deployment=deployments.find(d=>d.environment==='preview'&&d.deployment_trigger?.metadata?.branch===branch&&d.deployment_trigger?.metadata?.commit_hash===sha);
if(!deployment?.url||deployment.url==='https://octaviaap.pages.dev'||new URL(deployment.url).hostname==='octaviaap.pages.dev')throw Error('Cloudflare no confirmó una URL de vista previa aislada.');
const after=await api('');if(after.canonical_deployment?.id!==productionId)throw Error('La versión de producción cambió durante la operación. Revisar antes de continuar.');
const url=deployment.url;
for(const path of ['/simulador.html?experience=highway','/highway-octavia.mjs','/highway-world.mjs']){const r=await fetch(url+path);if(!r.ok||r.headers.get('X-Octavia-Preview')!=='isolated-no-d1')throw Error('No se pudo verificar '+path);if(path.includes('.glb')){const b=new Uint8Array(await r.arrayBuffer());if(String.fromCharCode(...b.slice(0,4))!=='glTF')throw Error('Modelo GLB no disponible');}}
if((await fetch(url+'/admin.html')).status!==404||(await fetch(url+'/api/garage/members')).status!==503||(await fetch(url+'/api/market/submissions',{method:'POST',body:'{}'})).status!==503)throw Error('Falló el aislamiento de administración/datos.');
const report={url:url+'/simulador.html?experience=highway',deploymentId:deployment.id,environment:deployment.environment,branch,commit:sha,productionBefore:productionId,productionAfter:after.canonical_deployment.id,isolated:true};
await writeFile(resolve(process.env.GITHUB_WORKSPACE,'artifacts','autovia-preview.json'),JSON.stringify(report,null,2));
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`\n## Vista previa Android\n[ABRIR AUTOVÍA](${report.url})\n\nProducción conservada. Administración y APIs desconectadas.\n`);
console.log('OCTAVIA_PREVIEW_VERIFIED '+JSON.stringify(report));
