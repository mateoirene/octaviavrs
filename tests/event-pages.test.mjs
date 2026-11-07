import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {eventInformationUrl} from '../dist/calendar.mjs';
import {publicPage} from '../dist/analytics-contract.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('la Calçotada abre un comunicado completo, enlazado desde el calendario',()=>{
 const page=read('dist/evento-calcotada-2027.html'),calendar=read('dist/calendar.mjs');
 for(const text of ['@todos','23/01/2027','17/01/2027','Masia Embolic by moon','Menú calçotada','Menú vegetariano','Menú infantil','52 €','44 €','22 €','refresco, agua, cava','Como último recurso ⬇️⬇️⬇️','605 245 856','620 424 823'])assert.ok(page.includes(text),text);
 for(const href of ['https://share.google/6sUHkJMr4c7q9yzHy','https://maps.app.goo.gl/46KDuY7ivsEHSf8M9'])assert.ok(page.includes('href="'+href+'"'));
 assert.equal(eventInformationUrl({id:'calcotada-vrs-2027',url:'https://instagram.com/anterior'}),'evento-calcotada-2027.html');
 assert.equal(eventInformationUrl({id:'otro',url:'https://example.com'}),'https://example.com');
 assert.ok(calendar.includes('Consultar cómo apuntarse ↗'));
 assert.equal(publicPage('/evento-calcotada-2027.html'),'/evento-calcotada-2027.html');
});

test('la pantalla completa de asistentes conserva los datos tras la sesión administrativa',()=>{
 const html=read('dist/asistentes-evento.html'),script=read('dist/asistentes-evento.mjs'),calendar=read('dist/calendar.mjs');
 assert.ok(html.includes('noindex,nofollow,noarchive'));
 assert.ok(!html.includes('analytics.js'));
 assert.ok(script.indexOf("json('/api/admin/session')")<script.indexOf("attendeeApi('events')"));
 assert.ok(script.includes('createEventAttendeeManager({event,api:attendeeApi,expanded:true,readOnly:!user})'));
 assert.ok(script.includes('admin.html?volver=asistentes&evento='));
 assert.ok(calendar.includes('asistentes-evento.html?evento='));
 assert.ok(calendar.includes("target='_blank'"));
 assert.ok(!calendar.includes('createEventAttendeeManager'));
});
