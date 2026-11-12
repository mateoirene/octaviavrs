
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleAnalyticsRequest} from '../server/analytics.mjs';
import {safeParams,publicPage} from '../dist/analytics-contract.mjs';
import {dailySeries,csvCell,csvReport} from '../dist/stats-visuals.mjs';
function fixture(){
 const raw=new DatabaseSync(':memory:');raw.exec(readFileSync(new URL('../server/schema.sql',import.meta.url),'utf8'));
 const db={prepare(sql){const st=raw.prepare(sql);let args=[];return{bind(...v){args=v;return this;},async all(){return {results:st.all(...args)};},async first(){return st.get(...args)||null;},async run(){return {meta:{changes:st.run(...args).changes}};}};},async batch(items){return Promise.all(items.map(i=>i.run()));}};
 return {raw,db};
}
test('el informe privado agrega clics únicos, secciones, lectura, rendimiento y errores sin duplicar eventos especializados',async()=>{
 const {raw,db}=fixture();try{
 const now=Math.floor(Date.now()/1000),day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),visitor=crypto.randomUUID(),session=crypto.randomUUID();
 const album=crypto.randomUUID();raw.prepare('INSERT INTO gallery_folders VALUES(?,?,?,?,?)').run(album,'Álbum de la ruta','Rutas','',1);
 const events=[['gallery_album_view',{album_id:album}],['page_view',{}],['interaction_click',{button:'galeria'}],['club_button_click',{button:'galeria'}],['social_link_click',{button:'instagram'}],['section_view',{section:'noticias'}],['scroll_depth',{progress:50}],['page_performance',{metric:'load',duration_ms:1200}],['page_performance',{metric:'load',duration_ms:1800}],['resource_error',{error_kind:'image'}],['user_engagement',{active_ms:20000}]];
 const response=await handleAnalyticsRequest(new Request('https://club.example/api/analytics/collect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:1,visitor,session,source:'instagram',device:'mobile',events:events.map(([name,params])=>({id:crypto.randomUUID(),name,page:'/',params}))})}),{},db,null,async()=>{});
 assert.equal(response.status,202);
 const url='https://club.example/api/analytics/report?from='+day+'&to='+day;
 assert.equal((await handleAnalyticsRequest(new Request(url),{},db,null,async()=>{})).status,401);
 const report=await(await handleAnalyticsRequest(new Request(url),{},db,{id:'owner'},async()=>{})).json();
 assert.equal(report.current.summary.views,1);assert.equal(report.current.summary.clicks,1);
 assert.deepEqual(report.current.buttons,[{label:'galeria',count:1}]);
 assert.equal(report.current.sections[0].count,1);assert.equal(report.current.scroll[0].label,50);
 assert.equal(report.current.performance[0].average_ms,1500);assert.equal(report.current.performance[0].count,2);
 assert.equal(report.current.content[0].label,'Álbum de la ruta');assert.equal(report.current.content[0].count,1);
 assert.equal(report.current.errors[0].label,'image');assert.equal(report.measurement.active_now,1);
 assert.ok(report.measurement.latest_at>=now);assert.equal(report.current.summary.active_ms,20000);
 assert.ok(!JSON.stringify(report).includes(visitor));assert.ok(!JSON.stringify(report).includes(session));
 }finally{raw.close();}
});
test('los indicadores nuevos solo admiten categorías cerradas y cifras limitadas',()=>{
 assert.deepEqual(safeParams({metric:'load',duration_ms:1500,error_kind:'image',message:'secreto',url:'https://private.example',button:'galeria',text:'nombre'}),{button:'galeria',metric:'load',error_kind:'image',duration_ms:1500});
 assert.deepEqual(safeParams({metric:'secret',duration_ms:-1,error_kind:'secret',button:'secret'}),{});
 assert.equal(publicPage('/bricos.html?email=private@example.com'),'/bricos.html');assert.equal(publicPage('/admin.html'),null);
});
test('los gráficos incluyen días sin eventos y el CSV neutraliza fórmulas',()=>{
 const rows=[{label:'2026-11-01',views:2},{label:'2026-11-03',views:4}];
 assert.deepEqual(dailySeries(rows,'2026-11-01','2026-11-03').map(r=>r.value),[2,0,4]);
 assert.equal(dailySeries(rows,'2026-11-01','2026-11-03','views','month')[0].value,6);
 assert.equal(dailySeries([{label:'20261101',screenPageViews:3}],'2026-11-01','2026-11-01','screenPageViews')[0].value,3);
 assert.equal(csvCell('=1+1'),'"\'=1+1"');
 const csv=csvReport({from:'2026-11-01',to:'2026-11-03',source:'first-party',current:{summary:{views:6},daily:rows,content:[{label:'=HYPERLINK("bad")',count:1}]}});
 assert.ok(csv.includes("Fórmula")===false);assert.ok(csv.includes("'=HYPERLINK"));assert.ok(csv.includes('Diario'));
});
