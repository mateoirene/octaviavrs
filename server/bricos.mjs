import {readClubMedia,mediaStatements,serveClubMedia} from './media.mjs';
import {recordClubEvent} from './push.mjs';
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
const text=(s,min,max,label)=>{s=String(s||'').trim();if(s.length<min||s.length>max)fail('Revisa '+label+'.');return s;};
const stamp=()=>Math.floor(Date.now()/1000);
export async function handleBricosRequest(request,db,admin,context){
 const url=new URL(request.url),path=url.pathname,method=request.method,parts=path.split('/'),id=parts[3];
 const announce=event=>recordClubEvent(db,event,context).catch(()=>{});
 if(path==='/api/bricos'&&method==='GET'){const manage=url.searchParams.has('manage');if(manage&&!admin)fail('Solo administradores.',401);const list=(await db.prepare('SELECT id,title,author,category,vehicle,steps,status,review_note,created_at,updated_at FROM club_bricos WHERE status'+(manage?" IN ('pending','approved','rejected')":"='approved'")+' ORDER BY updated_at DESC LIMIT 200').all()).results;return reply(list.map(({review_note,...row})=>manage?{...row,review_note}:row));}
 if(path==='/api/bricos'&&method==='POST'){
  const b=await request.json();if(b.website)fail('Envío no válido.');const title=text(b.title,4,160,'el título'),author=text(b.author,2,80,'tu nombre o alias'),category=text(b.category,2,60,'la temática'),vehicle=text(b.vehicle,2,120,'el modelo del coche'),steps=text(b.steps,20,12000,'los pasos del tutorial'),key=crypto.randomUUID()+crypto.randomUUID(),newId=crypto.randomUUID(),now=stamp();
  await db.prepare('INSERT INTO club_bricos(id,title,author,category,vehicle,steps,edit_hash,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(newId,title,author,category,vehicle,steps,await hash(key),now,now).run();return reply({id:newId,uploadToken:key,status:'draft'},201);
 }
 if(parts[3]==='media'&&method==='GET'){
  const media=await db.prepare('SELECT m.id,b.status FROM club_brico_media m JOIN club_bricos b ON b.id=m.brico_id WHERE m.id=?').bind(parts[4]).first();if(!media||(media.status!=='approved'&&!admin))fail('Archivo no disponible.',404);return await serveClubMedia(request,db,media.id)||reply({error:'Archivo no disponible.'},404);
 }
 if(parts[3]==='comments'&&method==='POST'){
  if(!admin)fail('Solo administradores.',401);const b=await request.json();if(!['approved','rejected'].includes(b.status))fail('Estado no válido.');const result=await db.prepare('UPDATE club_brico_comments SET status=? WHERE id=?').bind(b.status,parts[4]).run();if(!result.meta.changes)fail('El comentario no existe.',404);return reply({ok:true});
 }
 const row=await db.prepare('SELECT * FROM club_bricos WHERE id=?').bind(id||'').first();if(!row)fail('El tutorial no existe.',404);
 if(method==='GET'&&parts.length===4){if(row.status!=='approved'&&!admin)fail('El tutorial está pendiente de revisión.',404);const media=(await db.prepare('SELECT id,content_type,caption FROM club_brico_media WHERE brico_id=? ORDER BY position').bind(id).all()).results.map(m=>({...m,url:'/api/bricos/media/'+m.id})),comments=(await db.prepare('SELECT id,author,body,status,created_at FROM club_brico_comments WHERE brico_id=?'+(admin?'':" AND status='approved'")+' ORDER BY created_at').bind(id).all()).results;const {edit_hash,review_note,...visible}=row;return reply({...visible,...(admin?{review_note}:{}),media,comments});}
 if(method==='POST'&&parts[4]==='media'){
  if(row.status!=='draft'||await hash(request.headers.get('X-Upload-Token')||'')!==row.edit_hash)fail('Este envío no permite más archivos.',403);
  const count=(await db.prepare('SELECT COUNT(*) n FROM club_brico_media WHERE brico_id=?').bind(id).first()).n;if(count>=10)fail('Máximo 10 archivos por tutorial.',409);
  const form=await request.formData(),media=await readClubMedia(form.get('file')),fileId=crypto.randomUUID();await db.batch([db.prepare('INSERT INTO club_brico_media VALUES(?,?,?,?,?)').bind(fileId,id,media.mime,text(form.get('caption')||'',0,160,'el pie de foto'),count),...mediaStatements(db,fileId,media)]);return reply({id:fileId},201);
 }
 if(method==='POST'&&parts[4]==='submit'){
  const b=await request.json();if(row.status!=='draft'||await hash(request.headers.get('X-Upload-Token')||'')!==row.edit_hash)fail('El envío ya está cerrado.',403);if(b.consent!==true)fail('Confirma los permisos de publicación.');
  const changed=await db.prepare("UPDATE club_bricos SET status='pending',edit_hash='',updated_at=? WHERE id=? AND status='draft'").bind(stamp(),id).run();if(!changed.meta.changes)fail('El envío ya está cerrado.',409);await announce({id:'brico-pending:'+id,title:'Brico pendiente de revisión',message:row.title,href:'bricos.html#revisiones',audience:'admin',kind:'pending-brico'});return reply({id,status:'pending'});
 }
 if(method==='POST'&&parts[4]==='review'){
  if(!admin)fail('Solo administradores.',401);const b=await request.json();if(!['approved','rejected'].includes(b.status))fail('Selecciona aprobar o rechazar.');if(row.status==='draft')fail('El autor todavía está preparando el envío.',409);await db.prepare('UPDATE club_bricos SET status=?,review_note=?,updated_at=? WHERE id=?').bind(b.status,text(b.note||'',0,500,'la nota'),stamp(),id).run();if(b.status==='approved')await announce({id:'brico-approved:'+id+':'+stamp(),title:'Nuevo brico del club',message:row.title,href:'bricos.html?tutorial='+id});return reply({id,status:b.status});
 }
 if(method==='DELETE'&&parts.length===4){if(!admin)fail('Solo administradores.',401);const media=(await db.prepare('SELECT id FROM club_brico_media WHERE brico_id=?').bind(id).all()).results;await db.batch([...media.map(m=>db.prepare('DELETE FROM club_media_files WHERE id=?').bind(m.id)),db.prepare('DELETE FROM club_bricos WHERE id=?').bind(id)]);return reply({deleted:true});}
 if(method==='POST'&&parts[4]==='comments'){
  if(row.status!=='approved')fail('Tutorial no publicado.',404);const b=await request.json();if(b.consent!==true||b.website)fail('Confirma los permisos de publicación.');const commentId=crypto.randomUUID();await db.prepare('INSERT INTO club_brico_comments VALUES(?,?,?,?,?,?)').bind(commentId,id,text(b.author,2,80,'tu nombre o alias'),text(b.body,2,2000,'el comentario'),'pending',stamp()).run();await announce({id:'brico-comment:'+commentId,title:'Comentario de un brico pendiente',message:row.title,href:'bricos.html?tutorial='+id,audience:'admin'});return reply({id:commentId,status:'pending'},201);
 }
 return reply({error:'Ruta no encontrada.'},404);
}
