import {birthdayNotifications} from './birthdays.mjs';
const encode=new TextEncoder();
export const base64url=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
export async function endpointId(value){return base64url(await crypto.subtle.digest('SHA-256',encode.encode(value)));}
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export function validPushEndpoint(value){try{const url=new URL(value);return value.length<=3000&&url.protocol==='https:'&&!url.username&&!url.password&&!url.hash&&(!url.port||url.port==='443')&&(url.hostname==='fcm.googleapis.com'||url.hostname==='web.push.apple.com'||url.hostname.endsWith('.push.apple.com')||url.hostname==='updates.push.services.mozilla.com'||url.hostname.endsWith('.push.services.mozilla.com')||url.hostname.endsWith('.notify.windows.com'));}catch{return false;}}
export async function getPushKeys(db){let keys=await db.prepare("SELECT * FROM push_keys WHERE id='active'").first();if(keys)return keys;const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);const publicKey=base64url(await crypto.subtle.exportKey('raw',pair.publicKey)),jwk=JSON.stringify(await crypto.subtle.exportKey('jwk',pair.privateKey));await db.prepare("INSERT INTO push_keys(id,public_key,private_jwk) VALUES('active',?,?) ON CONFLICT(id) DO NOTHING").bind(publicKey,jwk).run();return db.prepare("SELECT * FROM push_keys WHERE id='active'").first();}
export async function vapidAuthorization(keys,endpoint,time=Math.floor(Date.now()/1000)){
 const header=base64url(encode.encode(JSON.stringify({typ:'JWT',alg:'ES256'}))),claims=base64url(encode.encode(JSON.stringify({aud:new URL(endpoint).origin,exp:time+3600*12,sub:'mailto:mozos.raul@gmail.com'}))),input=header+'.'+claims;
 const key=await crypto.subtle.importKey('jwk',JSON.parse(keys.private_jwk),{name:'ECDSA',namedCurve:'P-256'},false,['sign']);const signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,encode.encode(input));return 'vapid t='+input+'.'+base64url(signature)+', k='+keys.public_key;
}
export async function sendAdminPush(db,send=fetch){
 const subscribers=(await db.prepare('SELECT s.id,s.endpoint FROM push_subscriptions s JOIN market_admins a ON a.id=s.admin_id LIMIT 100').all()).results;if(!subscribers.length)return;
 const keys=await getPushKeys(db);
 await Promise.allSettled(subscribers.map(async subscription=>{try{const response=await send(subscription.endpoint,{method:'POST',headers:{Authorization:await vapidAuthorization(keys,subscription.endpoint),TTL:'86400',Urgency:'normal'},signal:AbortSignal.timeout(10000)});if(response.status===404||response.status===410)await db.prepare('DELETE FROM push_subscriptions WHERE id=?').bind(subscription.id).run();else await db.prepare('UPDATE push_subscriptions SET last_status=? WHERE id=?').bind(response.ok?'sent':'HTTP '+response.status,subscription.id).run();}catch{await db.prepare("UPDATE push_subscriptions SET last_status='retry-needed' WHERE id=?").bind(subscription.id).run();}}));
}
export async function recordClubEvent(db,event,context,send){
 const result=await db.prepare('INSERT INTO club_notifications(id,title,message,href,audience,kind,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(event.id,event.title,event.message||'',event.href,event.audience||'public',event.kind||'news',Math.floor(Date.now()/1000)).run();
 if(result.meta.changes){const delivery=sendAdminPush(db,send).catch(()=>{});if(context?.waitUntil)context.waitUntil(delivery);else await delivery;}
}
export async function handlePushRequest(request,db,admin){const path=new URL(request.url).pathname;
 if(path==='/api/club/notifications'&&request.method==='GET'){const rows=(await db.prepare("SELECT id,title,message,href,audience FROM club_notifications WHERE (audience='public' OR ?=1) AND kind NOT IN ('pending-market','pending-garage') ORDER BY created_at DESC,id DESC LIMIT 100").bind(admin?1:0).all()).results;return reply([...await birthdayNotifications(db),...rows]);}
 if(!admin)return reply({error:'Inicia sesión como administrador para activar los avisos del móvil.'},401);
 if(path==='/api/push/key'&&request.method==='GET'){const keys=await getPushKeys(db);return reply({publicKey:keys.public_key});}
 if(path==='/api/push/subscription'&&['POST','DELETE'].includes(request.method)){const body=await request.json(),endpoint=body.endpoint;if(typeof endpoint!=='string'||!validPushEndpoint(endpoint))fail('El navegador no ha proporcionado una suscripción compatible.');const id=await endpointId(endpoint);
 if(request.method==='DELETE'){await db.prepare('DELETE FROM push_subscriptions WHERE id=? AND admin_id=?').bind(id,admin.id).run();return reply({ok:true});}
 await db.prepare('INSERT INTO push_subscriptions(id,admin_id,endpoint,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET admin_id=excluded.admin_id,last_status=\'\'').bind(id,admin.id,endpoint,Math.floor(Date.now()/1000)).run();return reply({ok:true});}
 if(path==='/api/push/status'&&request.method==='POST'){const body=await request.json();if(typeof body.endpoint!=='string'||!validPushEndpoint(body.endpoint))fail('Suscripción no válida.');const row=await db.prepare('SELECT last_status FROM push_subscriptions WHERE id=? AND admin_id=?').bind(await endpointId(body.endpoint),admin.id).first();return reply({registered:!!row,lastStatus:row?.last_status||''});}
 if(path==='/api/push/test'&&request.method==='POST'){const rows=(await db.prepare('SELECT id FROM push_subscriptions WHERE admin_id=? LIMIT 1').bind(admin.id).all()).results;if(!rows.length)fail('Activa primero los avisos de este móvil.');await sendAdminPush(db);return reply({ok:true});}
 return reply({error:'Ruta no encontrada.'},404);
}
