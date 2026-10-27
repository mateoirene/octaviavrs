import {readClubMedia,mediaStatements,serveClubMedia} from './media.mjs';
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const categories=['Almuerzos','Comidas','Rutas','Kdds','Calçotada','Otros'];
export async function handleGalleryRequest(request,db,admin){
 const url=new URL(request.url),path=url.pathname,method=request.method,id=path.split('/').pop();
 if(method!=='GET'&&!admin)return reply({error:'Inicia sesión como administrador para gestionar la galería.'},401);
 if(path==='/api/gallery/folders'&&method==='GET'){
  const rows=(await db.prepare('SELECT f.*,COUNT(p.id) AS photos,(SELECT id FROM gallery_photos WHERE folder_id=f.id AND content_type LIKE \'image/%\' ORDER BY created_at,id LIMIT 1) AS cover FROM gallery_folders f LEFT JOIN gallery_photos p ON p.folder_id=f.id GROUP BY f.id ORDER BY f.event_date DESC,f.created_at DESC').all()).results;
  return reply(rows.map(row=>({...row,category:row.category==='Quedadas'?'Kdds':row.category,cover:row.cover?'/api/gallery/photos/'+row.cover:null})));
 }
 if(path==='/api/gallery/photos'&&method==='GET')return reply((await db.prepare('SELECT id,caption,content_type FROM gallery_photos WHERE folder_id=? ORDER BY created_at,id').bind(url.searchParams.get('folder')||'').all()).results.map(row=>({...row,url:'/api/gallery/photos/'+row.id})));
 if(path.startsWith('/api/gallery/photos/')&&method==='GET'){
  const photo=await db.prepare('SELECT content_type,data FROM gallery_photos WHERE id=?').bind(id).first();if(!photo)fail('Foto no disponible.',404);
  const streamed=await serveClubMedia(request,db,id);if(streamed)return streamed;
  return new Response(new Uint8Array(photo.data),{headers:{'Content-Type':photo.content_type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
 if((path==='/api/gallery/folders'||path.startsWith('/api/gallery/folders/'))&&method==='POST'){
  const body=await request.json(),name=String(body.name||'').trim(),category=body.category==='Quedadas'?'Kdds':body.category||'Otros',date=body.date||'';
  if(name.length<2||name.length>100)fail('El nombre debe tener entre 2 y 100 caracteres.');if(!categories.includes(category))fail('Selecciona una temática válida.');
  if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date))fail('Revisa la fecha del evento.');
  const creating=path==='/api/gallery/folders',folderId=creating?crypto.randomUUID():id;
  if(await db.prepare('SELECT id FROM gallery_folders WHERE name=? COLLATE NOCASE AND id<>?').bind(name,folderId).first())fail('Ya existe una carpeta con ese nombre.',409);
  if(creating)await db.prepare('INSERT INTO gallery_folders VALUES(?,?,?,?,?)').bind(folderId,name,category,date,Math.floor(Date.now()/1000)).run();
  else{const result=await db.prepare('UPDATE gallery_folders SET name=?,category=?,event_date=? WHERE id=?').bind(name,category,date,id).run();if(!result.meta.changes)fail('La carpeta ya no existe.',404);}
  return reply({id:folderId},creating?201:200);
 }
 if(path.startsWith('/api/gallery/folders/')&&method==='DELETE'){
  if(await db.prepare('SELECT id FROM gallery_photos WHERE folder_id=? LIMIT 1').bind(id).first())fail('Elimina las fotos y vídeos antes de borrar esta carpeta.',409);
  const result=await db.prepare('DELETE FROM gallery_folders WHERE id=?').bind(id).run();if(!result.meta.changes)fail('La carpeta ya no existe.',404);return reply({ok:true});
 }
 if(path==='/api/gallery/photos'&&method==='POST'){
  const form=await request.formData(),folder=String(form.get('folderId')||''),caption=String(form.get('caption')||'').trim();
  if(!await db.prepare('SELECT id FROM gallery_folders WHERE id=?').bind(folder).first())fail('Selecciona una carpeta existente.');if(form.get('consent')!=='yes')fail('Confirma que tienes permiso para publicar las fotos y vídeos.');if(caption.length>160)fail('El texto de la foto es demasiado largo.');
  const media=await readClubMedia(form.get('photo')),video=media.mime.startsWith('video/'),photoId=crypto.randomUUID();
  const insert=db.prepare('INSERT INTO gallery_photos SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM gallery_photos WHERE folder_id=?)<100').bind(photoId,folder,caption,media.mime,video?new ArrayBuffer(0):media.bytes.buffer,Math.floor(Date.now()/1000),folder);
  if(video){if((await db.prepare('SELECT COUNT(*) n FROM gallery_photos WHERE folder_id=?').bind(folder).first()).n>=100)fail('El álbum ya tiene 100 fotos o vídeos.',409);await db.batch([db.prepare('INSERT INTO gallery_photos VALUES(?,?,?,?,?,?)').bind(photoId,folder,caption,media.mime,new ArrayBuffer(0),Math.floor(Date.now()/1000)),...mediaStatements(db,photoId,media)]);}else{const result=await insert.run();if(!result.meta.changes)fail('El álbum ya tiene 100 fotos o vídeos. Elimina alguno antes de añadir más.',409);}
  return reply({id:photoId},201);
 }
 if(path.startsWith('/api/gallery/photos/')&&method==='DELETE'){await db.prepare('DELETE FROM club_media_files WHERE id=?').bind(id).run();const result=await db.prepare('DELETE FROM gallery_photos WHERE id=?').bind(id).run();if(!result.meta.changes)fail('La foto ya no existe.',404);return reply({ok:true});}
 return reply({error:'Ruta no encontrada.'},404);
}
