// Read-only post-deploy verification. Never writes profiles, races or notifications.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const base='https://octaviaap.pages.dev',revision=process.env.GITHUB_SHA||Date.now();
const files=['racing.mjs','racing-world3d.mjs','racing-aerial.mjs','racing-profile-controls.mjs','racing-profile-selection.mjs','racing-pilot-profiles.mjs','racing-roof-numbers.mjs','racing-vehicles3d.mjs','racing-body-shapes.mjs'];
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function verify(){
 for(const file of files){const response=await fetch(`${base}/${file}?circuit_release=${revision}`,{cache:'no-store',signal:AbortSignal.timeout(30000)});assert.equal(response.status,200,file);assert.equal(digest(Buffer.from(await response.arrayBuffer())),digest(await readFile('dist/'+file)),'Versión desplegada exacta: '+file);}
 const page=await fetch(`${base}/simulador.html?circuit_release=${revision}`,{cache:'no-store',signal:AbortSignal.timeout(30000)});assert.equal(page.status,200);const html=await page.text();for(const marker of ['data-garage-pilot','data-garage-rival','data-race-profile-card'])assert.ok(html.includes(marker),marker);
 const roster=await fetch(base+'/api/racing/pilots?circuit_release='+revision,{cache:'no-store',signal:AbortSignal.timeout(30000)});assert.equal(roster.status,200,'Fichas del garaje');assert.ok(roster.headers.get('cache-control')?.includes('no-store'));const body=await roster.json();assert.ok(Array.isArray(body.pilots)&&body.pilots.length>0);const allowed=new Set(['id','pilot','membershipNumber','model','engine','power','year','gearbox','updatedAt']);for(const pilot of body.pilots){assert.ok(pilot.id&&pilot.pilot&&pilot.model);assert.ok(Object.keys(pilot).every(key=>allowed.has(key)),'Solo campos públicos permitidos');if(pilot.membershipNumber!==null)assert.match(pilot.membershipNumber,/^VRS-\d{1,3}$/);}
 console.log('CIRCUITO_PILOTOS_PUBLICADO_OK '+JSON.stringify({modules:files.length,pilots:body.pilots.length,sourceMatches:true,privateDataExposed:false,productionWrites:false}));
}
for(let attempt=0;attempt<12;attempt++){try{await verify();break;}catch(error){if(attempt===11)throw error;console.log('Esperando propagación del simulador ('+(attempt+1)+').');await new Promise(r=>setTimeout(r,5000));}}
