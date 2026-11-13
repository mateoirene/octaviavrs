import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isCircuitOnlyRelease} from '../scripts/circuit-release.mjs';
test('publicación del circuito evita migraciones, provisión y avisos, incluyendo su API de lectura',()=>{assert.equal(isCircuitOnlyRelease(['dist/racing.mjs','server/racing.mjs','server/racing-pilots.mjs','dist/simulador.html','.github/workflows/publicar.yml','scripts/check-circuit-profiles-live.mjs']),true);});
test('cambios de base de datos u otros servicios nunca se clasifican como circuito',()=>{for(const path of ['migrations/new.sql','server/market.mjs','scripts/push-news.mjs','dist/highway.mjs','.github/workflows/other.yml'])assert.equal(isCircuitOnlyRelease(['dist/racing.mjs',path]),false);});
test('una lista vacía o cambios solo del flujo no rebajan las salvaguardas generales',()=>{for(const files of [[],null,['.github/workflows/publicar.yml'],['docs/circuito-aereo-pilotos.md']])assert.equal(isCircuitOnlyRelease(files),false);});
