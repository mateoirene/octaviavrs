import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const navigation=readFileSync(new URL('../dist/navigation-premium.css',import.meta.url),'utf8');
const gallery=readFileSync(new URL('../dist/gallery.css',import.meta.url),'utf8');

test('Noticias tiene acceso propio y el reloj forma parte de la zona superior',()=>{
 const header=html.slice(html.indexOf('<header'),html.indexOf('</header>')+9);
 const news=html.slice(html.indexOf('<section class="section club-news-section"'),html.indexOf('<section class="garage section"'));
 assert.match(header,/<a href="#noticias">Noticias<\/a>/);
 assert.match(header,/<aside class="club-speed-clock"/);
 assert.doesNotMatch(news,/club-speed-clock/);
 assert.match(navigation,/\.site-header>\.club-speed-clock/);
 assert.match(navigation,/a\[href\$="#noticias"\]/);
});

test('el acceso a la galería es compacto, rojo y conserva su destino',()=>{
 assert.match(html,/<a class="gallery-access" href="galeria\.html">/);
 assert.match(gallery,/#galeria \.gallery-access\{[^}]*width:min\(100%,560px\)/);
 assert.match(gallery,/#galeria \.gallery-access\{[^}]*background:linear-gradient\([^}]*#f0444c/);
 assert.match(gallery,/#galeria \.gallery-access strong\{font-size:18px\}/);
});
