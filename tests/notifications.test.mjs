import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildNotifications,unreadNotifications} from '../dist/notifications.mjs';
test('avisos públicos y pendientes privados se combinan sin duplicados',()=>{
 const items=buildNotifications([{id:'news',title:'Quedada',href:'index.html#calendario'},{id:'news',title:'Repetida'}],[{id:'piece',title:'Llantas'}],[{id:'pending',title:'Motor'}]);
 assert.deepEqual(items.map(x=>x.id),['pending:pending','listing:piece','news']);
 assert.equal(items[0].href,'admin.html');assert.equal(items[1].href,'mercadillo.html');
 assert.deepEqual(unreadNotifications(items,['news','listing:piece']).map(x=>x.id),['pending:pending']);
 assert.equal(unreadNotifications(items,items.map(x=>x.id)).length,0);
 assert.deepEqual(buildNotifications([],[],[]),[]);
});
