import assert from 'node:assert/strict';
const account='71fb53fce0685a83a5b15712414cfc25',oldEmail='mozos.raul@gmail.com',newEmail='cluboctaviavrscat@gmail.com';
const token=process.env.CLOUDFLARE_API_TOKEN;if(!token)throw Error('Falta la conexión autorizada de Cloudflare.');
const base='https://api.cloudflare.com/client/v4/accounts/'+account;
async function api(path,body){const response=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});const value=await response.json();if(!response.ok||!value.success)throw Error('Cloudflare rechazó la operación: HTTP '+response.status);return value.result;}
const databases=await api('/d1/database?name=octavia-club-mercadillo');const database=databases.find(d=>d.name==='octavia-club-mercadillo');assert.ok(database?.uuid,'No se localizó D1.');
const project=await api('/pages/projects/octaviaap');assert.equal(project.subdomain,'octaviaap.pages.dev');assert.equal(project.deployment_configs?.production?.d1_databases?.MARKET_DB?.id,database.uuid,'Vínculo D1 inesperado. No se cambia nada.');
async function query(sql,params=[]){const result=await api('/d1/database/'+database.uuid+'/query',{sql,params});assert.ok(result.every(r=>r.success),'Falló D1.');return result[0];}
const rows=(await query('SELECT id,email,created_at FROM market_admins WHERE lower(email) IN (?,?)',[oldEmail,newEmail])).results;
const old=rows.filter(r=>r.email.toLowerCase()===oldEmail),destination=rows.filter(r=>r.email.toLowerCase()===newEmail);
console.log('AUDITORIA_IDENTIDAD '+JSON.stringify({origen:old.length,destino:destination.length}));
if(!old.length&&destination.length===1){console.log('IDENTIDAD_YA_ACTUALIZADA: no se modifican datos.');}
else{
 assert.equal(old.length,1,'Debe existir una única cuenta de origen.');assert.equal(destination.length,0,'El destino ya existe: no se fusionan cuentas.');
 const original=old[0];
 const update=await query('UPDATE market_admins SET email=? WHERE id=? AND email=? AND NOT EXISTS (SELECT 1 FROM market_admins WHERE lower(email)=?) RETURNING id,email,created_at',[newEmail,original.id,original.email,newEmail]);
 assert.equal(update.results.length,1,'No se actualizó exactamente una cuenta.');
 assert.equal(update.results[0].id,original.id);assert.equal(update.results[0].created_at,original.created_at);assert.equal(update.results[0].email,newEmail);
 const check=(await query('SELECT id,email,created_at FROM market_admins WHERE id=? OR lower(email)=?',[original.id,oldEmail])).results;
 assert.equal(check.length,1);assert.equal(check[0].id,original.id);assert.equal(check[0].email,newEmail);
 console.log('IDENTIDAD_ACTUALIZADA: mismo ID y fecha de creación; UPDATE exclusivo de email. Contraseña, sesiones y suscripciones sin modificar.');
}
const vars=project.deployment_configs?.production?.env_vars||{};
console.log('CORREO_CONFIGURACION '+JSON.stringify({resendConfigurado:Boolean(vars.RESEND_API_KEY),remitenteConfigurado:Boolean(vars.MARKET_FROM_EMAIL)}));
console.log('No se han cambiado cuentas externas, DNS, variables, contraseña ni alojamiento.');
