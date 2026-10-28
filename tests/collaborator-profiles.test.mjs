import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {collaboratorProfile,collaboratorProfiles} from '../dist/collaborator-profiles.mjs';

const expected=new Map([
 ['Forn i Pastisseria CAMATS','collaborator-camats-enhanced.webp'],
 ['AUTOWRAPPING','collaborator-autowrapping-enhanced.webp'],
 ['Gestión Motor','collaborator-gestion-motor-enhanced.webp'],
 ['Hey Tattoo','collaborator-hey-tattoo-enhanced.webp'],
 ['Factor Lambda Car Performance','collaborator-factor-lambda-enhanced.webp']
]);

test('cada fotografía se asigna solamente a su ficha de colaborador',()=>{
 assert.equal(collaboratorProfiles.length,5);
 for(const [name,file] of expected)assert.equal(collaboratorProfile(name)?.src,'assets/'+file,name);
 assert.equal(collaboratorProfile('Canal de YouTube'),null);
 assert.equal(collaboratorProfile('Gestión de grupos'),null);
});

test('las cinco imágenes optimizadas conservan un recurso web de calidad',async()=>{
 for(const file of expected.values()){
  const url=new URL('../dist/assets/'+file,import.meta.url),info=await stat(url),bytes=await readFile(url);
  assert.ok(info.size>8_000&&info.size<250_000,file+' tiene un peso web razonable');
  assert.equal(bytes.subarray(0,4).toString(),'RIFF');
  assert.equal(bytes.subarray(8,12).toString(),'WEBP');
 }
});
