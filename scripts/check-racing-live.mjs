import assert from 'node:assert/strict';
const base='https://octaviaap.pages.dev';
async function verify(){
 const index=await(await fetch(base+'/?check='+Date.now(),{cache:'no-store'})).text();
 assert.ok(index.includes('href="galeria.html"'),'Acceso a álbumes publicado');assert.ok(!index.includes('data-image='),'Fotos decorativas sin ampliación');const gallery=await fetch(base+'/galeria.html');assert.equal(gallery.status,200);const folders=await fetch(base+'/api/gallery/folders');assert.equal(folders.status,200);assert.ok(Array.isArray(await folders.json()));
 assert.ok(index.indexOf('id="simulador"')>index.indexOf('id="mercadillo"'),'Orden mercadillo y simulador');
 const game=await(await fetch(base+'/simulador.html?check='+Date.now(),{cache:'no-store'})).text();assert.ok(game.includes('data-race-level'),'Selector de niveles publicado');
 for(const id of ['cockpit','rival','circuit']){const response=await fetch(base+'/assets/race/'+id+'.jpg');assert.equal(response.status,200,'Fotografía '+id);assert.ok(response.headers.get('content-type')?.startsWith('image/jpeg'));}
 const rival=await fetch(base+'/assets/rival-octavia-azul.png');assert.equal(rival.status,200,'Rival azul publicado');assert.ok(rival.headers.get('content-type')?.startsWith('image/png'));
 const stadium=await fetch(base+'/assets/circuito-estadio.jpg');assert.equal(stadium.status,200,'Referencia del estadio publicada');assert.ok(stadium.headers.get('content-type')?.startsWith('image/jpeg'));
 for(const path of ['racing-world3d.mjs','circuit-layout.mjs','vendor/three.module.js','vendor/three.core.js','vendor/HDRLoader.js','assets/track3d/asphalt-color.jpg','assets/track3d/asphalt-normal.jpg','assets/track3d/asphalt-rough.jpg','assets/track3d/sky.hdr']){const resource=await fetch(base+'/'+path);assert.equal(resource.status,200,'Recurso 3D '+path);assert.ok((await resource.arrayBuffer()).byteLength>500,'Recurso completo '+path);}
 const radio=await fetch(base+'/assets/audio/radio-club.mp3');assert.equal(radio.status,200,'Audio del club publicado');assert.ok((await radio.arrayBuffer()).byteLength>100000,'MP3 completo');
 const cursor=await fetch(base+'/assets/puntero-flecha.svg');assert.equal(cursor.status,200);assert.ok((await cursor.text()).includes('stroke="#934954"'));
 const championship=await fetch(base+'/api/racing/championship?level=easy');assert.equal(championship.status,200);const tour=await championship.json();assert.equal(tour.rounds,25);assert.ok(Array.isArray(tour.standings));assert.ok(game.includes('data-race-circuit'));assert.ok(game.includes('data-race-mode'));console.log('CAMPEONATO_PUBLICADO_OK: 25 pistas y clasificación compartida disponibles.');
 const notice=await fetch(base+'/api/club/notifications');assert.equal(notice.status,200);assert.ok(Array.isArray(await notice.json()));const garagePage=await(await fetch(base+'/garaje.html')).text();assert.ok(garagePage.includes('data-garage-review-list'));assert.ok(garagePage.includes('Enviar para revisión'));for(const path of ['contact.mjs','push-client.mjs','sw.js','manifest.webmanifest'])assert.equal((await fetch(base+'/'+path)).status,200);console.log('GARAJE_AVISOS_PUBLICADOS_OK: envío para revisión, avisos y WhatsApp disponibles.');
 console.log('CIRCUITO_PUBLICADO_OK: fotos locales, tres niveles, orden de portada y puntero negro/rojo.');
}
for(let attempt=0;attempt<5;attempt++){try{await verify();break;}catch(error){if(attempt===4)throw error;await new Promise(resolve=>setTimeout(resolve,4000));}}
