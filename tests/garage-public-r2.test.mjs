import test from 'node:test';
import assert from 'node:assert/strict';
import {isGarageSnapshotRead, readGarageSnapshot, publishGarageMutation} from '../server/garage-public-r2.mjs';

class Bucket {
  records = new Map();
  reads = 0;
  version = 0;

  async get(key) {
    this.reads++;
    const record = this.records.get(key);
    return record ? {...record, body:record.bytes, json:async()=>JSON.parse(new TextDecoder().decode(record.bytes))} : null;
  }

  async put(key, value, options = {}) {
    const previous = this.records.get(key);
    const condition = options.onlyIf;
    if (condition instanceof Headers && condition.get('If-None-Match') === '*' && previous) return null;
    if (condition?.etagMatches && previous?.etag !== condition.etagMatches) return null;
    const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(await new Response(value).arrayBuffer());
    const record = {bytes, etag:String(++this.version), httpMetadata:options.httpMetadata};
    this.records.set(key,record);
    return record;
  }

  async delete(keys) {
    for (const key of keys) this.records.delete(key);
  }
}

const req = (path, options) => new Request('https://club.example'+path,options);
const folders = '/api/garage/folders';
const listing = '/api/garage/members?folder=socios';
const oldPhoto = '/api/garage/photos/original';
const newPhoto = '/api/garage/photos/nueva';
const avatar = '/api/garage/profiles/uno/photo';

test('una visita pública obtiene el listado y fotos sin acceder al origen', async () => {
  const bucket = new Bucket();
  let databaseCalls = 0;
  let name = 'Original', image = oldPhoto, visible = false, failImage = false;
  const source = async path => {
    databaseCalls++;
    if (path === folders) return Response.json([{id:'socios',members:visible?1:0,cover:visible?image:null}]);
    if (path === listing) return Response.json(visible ? [{pilot:name,images:[image],profileImage:avatar}] : []);
    if (failImage) return new Response(null,{status:503});
    return new Response(path,{headers:{'Content-Type':'image/webp'}});
  };
  const save = change => publishGarageMutation(bucket,async () => {
    change();
    return Response.json({ok:true});
  },source);
  const view = path => readGarageSnapshot(req(path),bucket);
  assert.equal((await view(folders)).status,503);
  await save(() => { visible=true; });
  const before = databaseCalls;
  assert.equal((await (await view(listing)).json())[0].pilot,'Original');
  assert.equal((await (await view(oldPhoto)).text()),oldPhoto);
  assert.equal((await (await view(avatar)).text()),avatar);
  assert.equal(databaseCalls,before);
  await save(() => { name='Editado';image=newPhoto; });
  assert.equal((await (await view(listing)).json())[0].pilot,'Editado');
  assert.equal((await view(oldPhoto)).status,404);
  assert.equal((await view(newPhoto)).status,200);
  await save(() => { visible=false; });
  assert.deepEqual(await (await view(listing)).json(),[]);
  assert.equal((await view(newPhoto)).status,404);
  assert.equal((await view(avatar)).status,404);
  await save(() => { visible=true; });
  failImage=true;
  const pending=await save(() => { name='Guardado en el panel'; });
  assert.equal((await pending.json()).garagePublicPending,true);
  assert.equal((await view(listing)).status,503);
  assert.equal((await view(newPhoto)).status,503);
  failImage=false;
  await save(() => {});
  assert.equal((await (await view(listing)).json())[0].pilot,'Guardado en el panel');
  await save(() => {visible=false;});
  assert.equal((await view(newPhoto)).status,404);
  assert.equal((await view(avatar)).status,404);
});

test('las rutas de revisión y las sesiones privadas quedan fuera de la copia', () => {
  assert.equal(isGarageSnapshotRead(req(folders)),true);
  assert.equal(isGarageSnapshotRead(req(listing)),true);
  assert.equal(isGarageSnapshotRead(req(oldPhoto)),true);
  assert.equal(isGarageSnapshotRead(req('/api/garage/members?review=pending')),false);
  assert.equal(isGarageSnapshotRead(req(listing,{headers:{cookie:'club_session=privada'}})),false);
  assert.equal(isGarageSnapshotRead(req(folders,{method:'POST'})),false);
});

test('dos cambios simultáneos no publican versiones desordenadas', async () => {
  const bucket = new Bucket();
  let release, entered;
  const pending = new Promise(resolve=>{release=resolve});
  const started = new Promise(resolve=>{entered=resolve});
  const first=publishGarageMutation(bucket,async()=>{entered();await pending;return Response.json({ok:true});},async()=>Response.json([]));
  await started;
  const second=await publishGarageMutation(bucket,async()=>{throw Error('No se debe ejecutar');},async()=>Response.json([]));
  assert.equal(second.status,409);
  assert.equal((await readGarageSnapshot(req(folders),bucket)).status,503);
  release();
  assert.equal((await first).status,200);
  assert.equal((await readGarageSnapshot(req(folders),bucket)).status,200);
});
