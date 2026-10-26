import {marketFields,marketPhoto} from './market-fields.mjs';
import {editMarketListing} from './market-edit.mjs';
import {handleClubRequest} from './club.mjs';
import {handlePushRequest,recordClubEvent} from './push.mjs';
import {handleRacingRequest} from './racing.mjs';
import { handleGalleryRequest } from './gallery.mjs';
import { handleGarageRequest } from './garage.mjs';
import { dispatchReviewMail, reviewMailStatus } from './review-mail.mjs';
import { ACTIVATION_HASH, ADMIN_EMAIL_HASHES } from './config.mjs';
const enc = new TextEncoder();
const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value))), x => x.toString(16).padStart(2,'0')).join('');
const random = () => crypto.randomUUID()+crypto.randomUUID();
const json = (body,status=200,extra={}) => new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
const fail = (message,status=400) => {throw Object.assign(new Error(message),{status});};
const cookie = token => `club_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${token?28800:0}`;
async function password(value,salt){const key=await crypto.subtle.importKey('raw',enc.encode(value),'PBKDF2',false,['deriveBits']);return Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256)),x=>x.toString(16).padStart(2,'0')).join('');}
const now = () => Math.floor(Date.now()/1000);
async function session(db,request){const token=request.headers.get('cookie')?.match(/(?:^|;\s*)club_session=([^;]+)/)?.[1];if(!token)return null;return db.prepare('SELECT a.id,a.email FROM market_sessions s JOIN market_admins a ON a.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await hash(token),now()).first();}
async function newSession(db,id){await db.prepare('DELETE FROM market_sessions WHERE expires_at<?').bind(now()).run();const token=random();await db.prepare('INSERT INTO market_sessions VALUES(?,?,?)').bind(await hash(token),id,now()+28800).run();return token;}
async function limit(db,request,purpose,max){const bucket=Math.floor(now()/900);const key=await hash(`${purpose}:${request.headers.get('CF-Connecting-IP')||'unknown'}:${bucket}`);const row=await db.prepare('INSERT INTO market_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,now()+1800).first();if(row.count>max)fail('Demasiados intentos. Espera 15 minutos.',429);await db.prepare('DELETE FROM market_limits WHERE expires_at<?').bind(now()).run();}
function text(form,key,min,max){const value=String(form.get(key)||'').trim();if(value.length<min||value.length>max)fail(`Revisa el campo ${key}.`);return value;}
async function credentials(body){const email=String(body.email||'').trim().toLowerCase();if(!ADMIN_EMAIL_HASHES.includes(await hash(email)))fail('Esta cuenta no está autorizada.',403);if(typeof body.password!=='string'||body.password.length<12||body.password.length>128)fail('La contraseña debe tener entre 12 y 128 caracteres.');const salt=random();return {id:crypto.randomUUID(),email,salt,digest:await password(body.password,salt)};}
async function listings(db,status,privateView=false){
const rows=(await db.prepare("SELECT l.*,COALESCE(v.token,'') edit_version FROM market_listings l LEFT JOIN market_edit_versions v ON v.listing_id=l.id WHERE l.status=? ORDER BY l.created_at DESC LIMIT 200").bind(status).all()).results;
const photos=(await db.prepare('SELECT id,listing_id FROM market_photos WHERE listing_id IN (SELECT id FROM market_listings WHERE status=? ORDER BY created_at DESC LIMIT 200) ORDER BY position').bind(status).all()).results;
return rows.map(row=>{const images=photos.filter(p=>p.listing_id===row.id).map(p=>`/api/market/photos/${p.id}`);const item={id:row.id,title:row.title,category:row.category,description:row.description,price:row.price,condition:row.condition,compatibility:row.compatibility,location:row.location,seller:row.seller,contactUrl:row.contact_url,status:row.status,images,image:images[0]};return privateView?{...item,reviewNote:row.review_note,contactType:row.contact_type,contactValue:row.contact_value,editVersion:row.edit_version,photoIds:photos.filter(p=>p.listing_id===row.id).map(p=>p.id),...(row.status==='sold'?{soldAt:row.updated_at,deleteAvailableAt:row.updated_at+86400,deleteWaitSeconds:Math.max(0,row.updated_at+86400-now()),canDelete:now()>=row.updated_at+86400}:{})}:item;});}

async function announceMutation(request,response,db,context){
 if(!response.ok||request.method==='GET')return response;
 try{const path=new URL(request.url).pathname,data=await response.clone().json();let event;
 if(path.startsWith('/api/garage/')){
  if(path==='/api/garage/submit')event={id:'garage-pending:'+data.id,title:'Ficha del garaje pendiente de revisión',href:'garaje.html#revisiones',audience:'admin',kind:'pending-garage'};
  else if(path.startsWith('/api/garage/reviews/'))event={id:'garage-review:'+data.id+':'+data.status,title:data.status==='approved'?'Nueva ficha publicada en el garaje':'Ficha del garaje revisada',href:data.status==='approved'?'garaje.html':'garaje.html#revisiones',audience:data.status==='approved'?'public':'admin'};
  else event={id:crypto.randomUUID(),title:data.status==='pending'?'Ficha en revisión actualizada':'Garaje actualizado',href:data.status==='pending'?'garaje.html#revisiones':'garaje.html',audience:data.status==='pending'?'admin':'public'};
 }else if(path.startsWith('/api/gallery/'))event={id:crypto.randomUUID(),title:'Novedades en la galería del club',href:'galeria.html'};
 if(event)await recordClubEvent(db,event,context);
 }catch{}return response;
}
export async function handleMarketRequest(request,env,context){try{
 const db=env.MARKET_DB;if(!db)return json({error:'El mercadillo todavía no tiene el almacenamiento activado.'},503);
 const path=new URL(request.url).pathname;const method=request.method;
 if(method!=='GET'&&request.headers.get('origin')!==new URL(request.url).origin)fail('Origen no permitido.',403);
 const requestLimit=(path==='/api/market/submissions'||/^\/api\/admin\/listings\/[^/]+\/edit$/.test(path))?12*1024*1024:4*1024*1024;
 if(Number(request.headers.get('content-length')||0)>requestLimit)fail('Las fotos ocupan demasiado.',413);
 if(method!=='GET'&&request.body){const reader=request.body.getReader();let size=0;const chunks=[];while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>requestLimit){await reader.cancel();fail('El envío ocupa demasiado.',413);}chunks.push(value);}request=new Request(request.url,{method,headers:request.headers,body:new Blob(chunks)});}
 if(path.startsWith('/api/club/')&&path!=='/api/club/notifications'){if(method!=='GET')await limit(db,request,'club-management',60);return await handleClubRequest(request,db,await session(db,request),context);}
 if(path.startsWith('/api/racing/'))return await handleRacingRequest(request,db,(purpose,max)=>limit(db,request,purpose,max));
 if(path.startsWith('/api/push/')||path==='/api/club/notifications'){if(method!=='GET')await limit(db,request,'push-settings',20);return await handlePushRequest(request,db,await session(db,request));}
 if(path.startsWith('/api/gallery/'))return await announceMutation(request,await handleGalleryRequest(request,db,await session(db,request)),db,context);
 if(path.startsWith('/api/garage/')){if(path==='/api/garage/submit'&&method==='POST')await limit(db,request,'garage-submission',4);return await announceMutation(request,await handleGarageRequest(request,db,await session(db,request)),db,context);}
 if(path==='/api/market/status'&&method==='GET')return json({ready:true,initialized:!!await db.prepare('SELECT id FROM market_admins LIMIT 1').first()});
 if(path==='/api/market/listings'&&method==='GET')return json(await listings(db,'approved'));
 if(path.startsWith('/api/market/photos/')&&method==='GET'){
 const photo=await db.prepare('SELECT p.data,p.content_type,l.status FROM market_photos p JOIN market_listings l ON l.id=p.listing_id WHERE p.id=?').bind(path.split('/').pop()).first();
 if(!photo||(photo.status!=='approved'&&!await session(db,request)))fail('Foto no disponible.',404);
 return new Response(new Uint8Array(photo.data),{headers:{'Content-Type':photo.content_type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
 if(path==='/api/market/submissions'&&method==='POST'){
 await limit(db,request,'submit',5);const form=await request.formData();if(form.get('website')||form.get('consent')!=='yes')fail('Confirma que aceptas publicar los datos de contacto.');
 const {title,description,category,condition,compatibility,location,seller,price,type,value,contact}=marketFields(form);
 const photos=form.getAll('photos');if(photos.length<1||photos.length>10)fail('Añade entre 1 y 10 fotos.');
 const id=crypto.randomUUID(),stamp=now();const statements=[db.prepare('INSERT INTO market_listings(id,title,category,description,price,condition,compatibility,location,seller,contact_type,contact_value,contact_url,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,title,category,description,price,condition,compatibility,location,seller,type,value,contact,stamp,stamp)];
 for(let position=0;position<photos.length;position++){const photo=await marketPhoto(photos[position]);statements.push(db.prepare('INSERT INTO market_photos VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),id,photo.mime,photo.data,position));}
 statements.push(db.prepare('INSERT INTO market_review_mail(listing_id,created_at) VALUES(?,?)').bind(id,stamp));
 await db.batch(statements);
 const delivery=dispatchReviewMail(db,env,id).catch(()=>({sent:false}));
 if(context?.waitUntil)context.waitUntil(delivery);else await delivery;
 await recordClubEvent(db,{id:'pending:'+id,title:'Nuevo anuncio pendiente',href:'admin.html',audience:'admin',kind:'pending-market'},context).catch(()=>{});
 return json({id,status:'pending'},201);
 }
 if(path==='/api/admin/setup'&&method==='POST'){
 await limit(db,request,'setup',5);const body=await request.json();if(await db.prepare('SELECT id FROM market_admins LIMIT 1').first())fail('El acceso ya está activado. Inicia sesión.',409);if(await hash(String(body.key||''))!==ACTIVATION_HASH)fail('Enlace de activación no válido.',403);const user=await credentials(body);
 try{await db.batch([db.prepare("INSERT INTO market_settings VALUES('initialized','yes')"),db.prepare('INSERT INTO market_admins VALUES(?,?,?,?,?)').bind(user.id,user.email,user.digest,user.salt,now())]);}catch{fail('El acceso ya está activado.',409);}
 return json({email:user.email},201,{'Set-Cookie':cookie(await newSession(db,user.id))});
 }
 if(path==='/api/admin/login'&&method==='POST'){
 await limit(db,request,'login',5);const body=await request.json();const user=await db.prepare('SELECT * FROM market_admins WHERE email=?').bind(String(body.email||'').trim().toLowerCase()).first();if(!user||typeof body.password!=='string'||await password(body.password,user.salt)!==user.password_hash)fail('Correo o contraseña incorrectos.',401);return json({email:user.email},200,{'Set-Cookie':cookie(await newSession(db,user.id))});
 }
 if(path.startsWith('/api/admin/')){
 const user=await session(db,request);if(!user)fail('Inicia sesión para continuar.',401);
 if(path==='/api/admin/review-mail'&&method==='GET')return json(await reviewMailStatus(db,env));
 if(path==='/api/admin/review-mail/retry'&&method==='POST'){await limit(db,request,'mail-retry',10);const pending=(await db.prepare("SELECT m.listing_id FROM market_review_mail m JOIN market_listings l ON l.id=m.listing_id WHERE l.status='pending' AND m.status IN ('queued','failed') ORDER BY m.created_at LIMIT 5").all()).results;const delivery=Promise.all(pending.map(row=>dispatchReviewMail(db,env,row.listing_id))).catch(()=>[]);if(context?.waitUntil)context.waitUntil(delivery);else await delivery;return json(await reviewMailStatus(db,env));}
 if(path==='/api/admin/session'&&method==='GET')return json(user);
 if(path==='/api/admin/logout'&&method==='POST'){const token=request.headers.get('cookie').match(/club_session=([^;]+)/)?.[1];await db.prepare('DELETE FROM market_sessions WHERE token_hash=?').bind(await hash(token||'')).run();return json({ok:true},200,{'Set-Cookie':cookie('')});}
 if(path==='/api/admin/users'&&method==='POST'){const next=await credentials(await request.json());if(await db.prepare('SELECT id FROM market_admins WHERE email=?').bind(next.email).first())fail('Esta cuenta ya tiene acceso.',409);await db.prepare('INSERT INTO market_admins VALUES(?,?,?,?,?)').bind(next.id,next.email,next.digest,next.salt,now()).run();return json({email:next.email},201);}
 if(path==='/api/admin/listings'&&method==='GET'){const status=new URL(request.url).searchParams.get('status')||'pending';if(!['pending','approved','rejected','sold'].includes(status))fail('Estado no válido.');return json(await listings(db,status,true));}
 if(/^\/api\/admin\/listings\/[^/]+\/edit$/.test(path)&&method==='POST'){await limit(db,request,'market-edit',40);const result=await editMarketListing(request,db,user,path.split('/')[4]);await recordClubEvent(db,{id:crypto.randomUUID(),title:'Anuncio del mercadillo actualizado',href:result.status==='approved'?'mercadillo.html':'admin.html',audience:result.status==='approved'?'public':'admin'},context).catch(()=>{});return json(result);}
 if(path.startsWith('/api/admin/listings/')&&method==='POST'){const body=await request.json();
 if(body.action==='delete'){
 if(body.confirm!==true)fail('Confirma que quieres eliminar definitivamente este anuncio.');
 const id=path.split('/').pop();
 const listing=await db.prepare('SELECT status,updated_at FROM market_listings WHERE id=?').bind(id).first();
 if(!listing)fail('El anuncio ya no existe.',404);
 if(listing.status!=='sold')fail('Solo se pueden eliminar definitivamente artículos vendidos.',409);
 if(now()<listing.updated_at+86400)fail('Deben pasar 24 horas desde que se marcó como vendido.',409);
 const removed=await db.prepare("DELETE FROM market_listings WHERE id=? AND status='sold' AND updated_at<=?").bind(id,now()-86400).run();
 if(!removed.meta.changes)fail('El anuncio ha cambiado. Actualiza la lista.',409);
 return json({ok:true,deleted:true});
 }
 const transitions={approve:['pending','approved'],reject:['pending','rejected'],sold:['approved','sold'],withdraw:['approved','rejected']};const pair=transitions[body.action];if(!pair)fail('Acción no válida.');const result=await db.prepare('UPDATE market_listings SET status=?,reviewed_by=?,review_note=?,updated_at=? WHERE id=? AND status=?').bind(pair[1],user.id,String(body.note||'').slice(0,500),now(),path.split('/').pop(),pair[0]).run();if(!result.meta.changes)fail('El anuncio ya cambió. Actualiza la lista.',409);await recordClubEvent(db,{id:body.action==='approve'?'listing:'+path.split('/').pop():crypto.randomUUID(),title:body.action==='approve'?'Nueva pieza publicada en el mercadillo':'Anuncio del mercadillo revisado',href:body.action==='approve'?'mercadillo.html':'admin.html',audience:body.action==='approve'?'public':'admin'},context).catch(()=>{});return json({ok:true});}
 }
 return json({error:'Ruta no encontrada.'},404);
 }catch(error){if(error instanceof SyntaxError||error instanceof TypeError)return json({error:'El envío no tiene un formato válido.'},400);return json({error:error.status?error.message:'No se ha podido completar la operación.'},error.status||500);}}
