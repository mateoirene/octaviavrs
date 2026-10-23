import {readFile} from 'node:fs/promises';
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
if(!account||!token)throw new Error('Falta la configuración de publicación.');
const root=`https://api.cloudflare.com/client/v4/accounts/${account}`;
async function api(path,method='GET',body){const response=await fetch(root+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});if(response.status===401||response.status===403)throw new Error('Falta el permiso Cuenta > D1 > Editar en el token existente, limitado a esta cuenta. No compartas ni cambies la clave guardada en GitHub.');const result=await response.json();if(!response.ok||!result.success)throw new Error(`Cloudflare no pudo preparar el mercadillo (HTTP ${response.status}).`);return result.result;}
const databases=await api('/d1/database?name=octavia-club-mercadillo&per_page=100');let database=databases.find(db=>db.name==='octavia-club-mercadillo');
if(!database)database=await api('/d1/database','POST',{name:'octavia-club-mercadillo'});
if(!database.uuid)throw new Error('Cloudflare no confirmó la base de datos.');
const schema=await readFile(new URL('../server/schema.sql',import.meta.url),'utf8');
const migration=await api(`/d1/database/${database.uuid}/query`,'POST',{sql:schema});
if(!Array.isArray(migration)||migration.some(item=>!item.success))throw new Error('No se pudo preparar la estructura del mercadillo.');
const project=await api('/pages/projects/octaviaap');if(project.name!=='octaviaap'||project.subdomain!=='octaviaap.pages.dev')throw new Error('El proyecto de destino no coincide.');
const production=project.deployment_configs?.production||{};
if(production.d1_databases?.MARKET_DB?.id!==database.uuid){await api('/pages/projects/octaviaap','PATCH',{deployment_configs:{production:{d1_databases:{...production.d1_databases,MARKET_DB:{id:database.uuid}}}}});}
console.log('Almacenamiento y vínculo de producción del mercadillo preparados.');
