// Envía los nuevos avisos estáticos a dispositivos suscritos, con las claves guardadas en D1.
import {readFile} from 'node:fs/promises';
import {recordClubEvent,endpointId} from '../server/push.mjs';
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
if(!account||!token)throw Error('Falta la configuración de publicación.');
const root=`https://api.cloudflare.com/client/v4/accounts/${account}`;
async function api(path,body){const response=await fetch(root+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();if(!response.ok||!data.success)throw Error('No se pudieron sincronizar los avisos del club.');return data.result;}
const databases=await api('/d1/database?name=octavia-club-mercadillo&per_page=100'),database=databases.find(d=>d.name==='octavia-club-mercadillo');if(!database)throw Error('No está preparado el almacenamiento de avisos.');
const db={prepare(sql){let params=[];const query=async()=>{const rows=await api('/d1/database/'+database.uuid+'/query',{sql,params});if(!rows[0]?.success)throw Error('No se pudieron actualizar los avisos.');return rows[0];};const q={bind(...values){params=values;return q;},async first(){return (await query()).results[0]||null;},async all(){return {results:(await query()).results};},async run(){return {meta:(await query()).meta};}};return q;}};
const news=JSON.parse(await readFile('dist/data/notificaciones.json','utf8'));
for(const event of news)await recordClubEvent(db,{...event,audience:'public'});
const html=await readFile('dist/index.html','utf8'),events=html.match(/<script type="application\/json" id="club-events">([\s\S]*?)<\/script>/);
if(events)for(const event of JSON.parse(events[1]))await recordClubEvent(db,{id:'calendar:'+await endpointId(JSON.stringify(event)),title:'Calendario del club actualizado',message:event.title+' · '+event.date,href:'index.html#calendario'});
console.log('AVISOS_PUSH_PREPARADOS: novedades sincronizadas; envío a los dispositivos que hayan activado sus avisos.');
