import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildNotifications,unreadNotifications} from '../dist/notifications.mjs';
test('avisos públicos y pendientes privados se combinan sin duplicados',()=>{
 const items=buildNotifications([{id:'news',title:'Quedada',href:'index.html#calendario'},{id:'news',title:'Repetida'}],[{id:'piece',title:'Llantas'}],[{id:'pending',title:'Motor'}]);
 assert.deepEqual(items.map(x=>x.id),['pending:pending','listing:piece','news']);
 assert.equal(items[0].href,'admin.html?anuncio=pending');assert.equal(items[1].href,'mercadillo.html');
 assert.deepEqual(unreadNotifications(items,['news','listing:piece']).map(x=>x.id),['pending:pending']);
 assert.equal(unreadNotifications(items,items.map(x=>x.id)).length,0);
 assert.deepEqual(buildNotifications([],[],[]),[]);
});

test('los avisos desaparecen al leerlos, al marcar todos y al volver a entrar',async()=>{
 const {readFileSync}=await import('node:fs');
 const {runInNewContext}=await import('node:vm');
 const saved=new Map();
 const storage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};
 function documentMock(){
  const created=[];
  function element(tag){
   const e={tag,children:[],dataset:{},listeners:{},hidden:false,append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=[...nodes];},setAttribute(){},addEventListener(name,fn){this.listeners[name]=fn;},querySelector(){return this.badge??=element('span');},closest(){return {after(){}};},contains(){return true;},focus(){}};
   created.push(e);return e;
  }
  const masthead=element('div');
  return {created,baseURI:'https://club.example/',hidden:false,body:element('body'),head:element('head'),createElement:element,querySelector:s=>s==='.masthead'?masthead:null,querySelectorAll:()=>[],addEventListener(){}};
 }
 const news=[{id:'a',title:'Primera',href:'index.html'},{id:'b',title:'Segunda',href:'index.html'}];
 const source=readFileSync(new URL('../dist/notifications.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'').replace(/import\.meta\.url/g,JSON.stringify('https://club.example/notifications.mjs'));
 const context={URL,URLSearchParams,location:new URL('https://club.example/'),window:{localStorage:storage,addEventListener(){}},fetch:async url=>({ok:true,json:async()=>url==='data/notificaciones.json'?news:[]}),initClubContact(){},initPushControls(){},createCarNotificationSound:()=>({unlock(){},play(){return false;}}),setVrsText:(node,text)=>node.textContent=text,setInterval(){},setTimeout(){},clearTimeout(){}};
 runInNewContext(source,context);
 const doc=documentMock();await context.initNotifications(doc);
 const list=doc.created.find(e=>e.className==='notification-list');
 assert.equal(list.children.length,2);
 list.children[0].children[0].listeners.click();
 assert.equal(list.children.length,1);
 assert.equal(list.children[0].children[0].children[0].textContent,'Segunda');
 doc.created.find(e=>e.textContent==='Marcar todas como leídas').listeners.click();
 assert.equal(list.children.length,0);
 const again=documentMock();await context.initNotifications(again);
 assert.equal(again.created.find(e=>e.className==='notification-list').children.length,0);
});
