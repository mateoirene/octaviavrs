import {test} from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/sitemap.xml.js';

test('sitemap includes public static and published CMS pages, and never draft pages',async()=>{let query='';const db={prepare(sql){query=sql;return{bind(){return this;},async all(){return{results:[{slug:'historia-club',updated_at:123},{slug:'scheduled-live',updated_at:456}]};}};}};const response=await onRequestGet({request:new Request('https://club.example/sitemap.xml'),env:{MARKET_DB:db}}),xml=await response.text();assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/application\/xml/);assert.match(xml,/https:\/\/club\.example\/index\.html/);assert.match(xml,/pagina\.html\?slug=historia-club/);assert.match(xml,/pagina\.html\?slug=scheduled-live/);assert.doesNotMatch(query,/draft_title/);assert.match(query,/published_title/);assert.doesNotMatch(xml,/draft/);});
