const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const clean = (value, label, min, max) => { const text = String(value || '').trim(); if (text.length < min || text.length > max) fail(`Revisa ${label}.`); return text; };
async function photosFrom(form,field="photos",maximum=3) {
  const files = form.getAll(field).filter(file => file.size > 0);
  if (files.length > maximum) fail('Añade como máximo tres fotos por ficha.');
  const photos = [];
  for (const file of files) {
    if (!file.arrayBuffer || file.size > 1048576 || file.size < 12) fail('Cada foto debe ocupar menos de 1 MB.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'image/jpeg' : bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 ? 'image/png' : String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP' ? 'image/webp' : null;
    if (!mime) fail('Solo se admiten fotos JPG, PNG o WebP.');
    photos.push({ id: crypto.randomUUID(), mime, data: bytes.buffer });
  }
  return photos;
}
export async function handleGarageRequest(request, db, admin) {
  const url = new URL(request.url), path = url.pathname, method = request.method;
  if (method !== 'GET' && !admin && path!=='/api/garage/submit') return reply({ error: 'Inicia sesión como administrador para gestionar el garaje.' }, 401);
  if (path === '/api/garage/folders' && method === 'GET') {
    const rows = (await db.prepare(`SELECT f.id,f.name,COUNT(m.id) AS members,(SELECT p.id FROM garage_photos p JOIN garage_members c ON c.id=p.member_id WHERE c.folder_id=f.id AND NOT EXISTS(SELECT 1 FROM garage_moderation z WHERE z.member_id=c.id AND z.status<>'approved') ORDER BY c.created_at DESC,p.position LIMIT 1) AS cover FROM garage_folders f LEFT JOIN garage_members m ON m.folder_id=f.id AND NOT EXISTS(SELECT 1 FROM garage_moderation z WHERE z.member_id=m.id AND z.status<>'approved') GROUP BY f.id ORDER BY f.created_at DESC,f.name`).all()).results;
    return reply(rows.map(row => ({ ...row, cover: row.cover ? '/api/garage/photos/' + row.cover : null })));
  }
  if (path === '/api/garage/members' && method === 'GET') {
    const folder = url.searchParams.get('folder') || '';
    const review=url.searchParams.get('review');if(review&&!admin)return reply({error:'Inicia sesión para revisar las fichas.'},401);if(review&&!['pending','approved','rejected'].includes(review))fail('Estado no válido.');
    const predicate=review?'g.status=?':"m.folder_id=? AND COALESCE(g.status,'approved')='approved'",argument=review||folder;
    const rows=(await db.prepare(`SELECT m.*,g.status review_status,g.note review_note FROM garage_members m LEFT JOIN garage_moderation g ON g.member_id=m.id WHERE ${predicate} ORDER BY m.created_at DESC LIMIT 200`).bind(argument).all()).results;
    const photos=(await db.prepare(`SELECT p.id,p.member_id FROM garage_photos p JOIN garage_members m ON m.id=p.member_id LEFT JOIN garage_moderation g ON g.member_id=m.id WHERE ${predicate} ORDER BY p.position`).bind(argument).all()).results;
    const profiles=(await db.prepare(`SELECT p.member_id,p.phone,CASE WHEN p.data IS NOT NULL THEN 1 ELSE 0 END has_avatar FROM garage_profiles p JOIN garage_members m ON m.id=p.member_id LEFT JOIN garage_moderation g ON g.member_id=m.id WHERE ${predicate}`).bind(argument).all()).results;
    return reply(rows.map(row => {const profile=profiles.find(p=>p.member_id===row.id);return ({ id: row.id,...(review?{reviewStatus:row.review_status,reviewNote:row.review_note}:{}), phone:profile?.phone||'', whatsappUrl:profile?.phone?'https://wa.me/'+profile.phone:null,profileImage:profile?.has_avatar?'/api/garage/profiles/'+row.id+'/photo':null, folderId: row.folder_id, pilot: row.pilot, instagram: row.instagram, instagramUrl: row.instagram ? `https://www.instagram.com/${row.instagram}/` : null, model: row.model, engine: row.engine, power: row.power, year: row.year, gearbox: row.gearbox, notes: row.notes, images: photos.filter(photo => photo.member_id === row.id).map(photo => '/api/garage/photos/' + photo.id) });}));
  }
  if(path.startsWith('/api/garage/profiles/')&&path.endsWith('/photo')&&method==='GET'){const photo=await db.prepare(`SELECT p.content_type,p.data FROM garage_profiles p LEFT JOIN garage_moderation g ON g.member_id=p.member_id WHERE p.member_id=? AND p.data IS NOT NULL AND (COALESCE(g.status,'approved')='approved' OR ?=1)`).bind(path.split('/')[4],admin?1:0).first();if(!photo)return reply({error:'Foto no disponible.'},404);return new Response(new Uint8Array(photo.data),{headers:{'Content-Type':photo.content_type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
  if (path.startsWith('/api/garage/photos/') && method === 'GET') {
    const photo = await db.prepare(`SELECT p.content_type,p.data FROM garage_photos p LEFT JOIN garage_moderation g ON g.member_id=p.member_id WHERE p.id=? AND (COALESCE(g.status,'approved')='approved' OR ?=1)`).bind(path.split('/').pop(),admin?1:0).first();
    if (!photo) return reply({ error: 'Foto no disponible.' }, 404);
    return new Response(new Uint8Array(photo.data), { headers: { 'Content-Type': photo.content_type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
  if(path.startsWith('/api/garage/reviews/')&&method==='POST'){
    const id=path.split('/').pop(),body=await request.json();if(!['approve','reject'].includes(body.action))fail('Acción no válida.');
    const current=await db.prepare('SELECT status FROM garage_moderation WHERE member_id=?').bind(id).first();if(!current)fail('La ficha no está en revisión.',404);
    const folder=body.folderId;if(body.action==='approve'&&folder&&!await db.prepare('SELECT id FROM garage_folders WHERE id=?').bind(folder).first())fail('Selecciona una carpeta existente.');
    const status=body.action==='approve'?'approved':'rejected';
    const actions=[];if(status==='approved'&&folder)actions.push(db.prepare("UPDATE garage_members SET folder_id=? WHERE id=? AND EXISTS(SELECT 1 FROM garage_moderation WHERE member_id=? AND status='pending')").bind(folder,id,id));
    actions.push(db.prepare("UPDATE garage_moderation SET status=?,note=?,reviewed_by=?,reviewed_at=? WHERE member_id=? AND status='pending'").bind(status,String(body.note||'').trim().slice(0,500),admin.id,Math.floor(Date.now()/1000),id));
    const changed=await db.batch(actions);if(!changed?.at(-1)?.meta.changes)fail('La ficha ya ha sido revisada. Actualiza la lista.',409);
    return reply({id,status});
  }
  if ((path === '/api/garage/folders' || path.startsWith('/api/garage/folders/')) && method === 'POST') {
    const body = await request.json(); const name = clean(body.name, 'el nombre de la carpeta', 2, 80); const id = path === '/api/garage/folders' ? crypto.randomUUID() : path.split('/').pop();
    const duplicate = await db.prepare('SELECT id FROM garage_folders WHERE name=? COLLATE NOCASE AND id<>?').bind(name,id).first();
    if (duplicate) fail('Ya existe una carpeta con ese nombre.', 409);
    if (path === '/api/garage/folders') await db.prepare('INSERT INTO garage_folders VALUES(?,?,?)').bind(id,name,Math.floor(Date.now()/1000)).run();
    else { const result = await db.prepare('UPDATE garage_folders SET name=? WHERE id=?').bind(name,id).run(); if (!result.meta.changes) fail('La carpeta ya no existe.',404); }
    return reply({ id, name }, path === '/api/garage/folders' ? 201 : 200);
  }
  if (path.startsWith('/api/garage/folders/') && method === 'DELETE') {
    const id = path.split('/').pop();
    if (await db.prepare('SELECT id FROM garage_members WHERE folder_id=? LIMIT 1').bind(id).first()) fail('Esta carpeta contiene fichas. Muévelas o elimínalas antes de borrar la carpeta.',409);
    const result = await db.prepare('DELETE FROM garage_folders WHERE id=?').bind(id).run();
    if (!result.meta.changes) fail('La carpeta ya no existe.',404);
    return reply({ ok: true });
  }
  if ((path === '/api/garage/submit' || path === '/api/garage/members' || path.startsWith('/api/garage/members/')) && method === 'POST') {
    const form = await request.formData(); const submitted=path==='/api/garage/submit';const creating=submitted||path==='/api/garage/members'; const id = creating ? crypto.randomUUID() : path.split('/').pop();
    if (!creating && !await db.prepare('SELECT id FROM garage_members WHERE id=?').bind(id).first()) fail('La ficha ya no existe.',404);
    let folder=String(form.get('folderId')||'').trim();if(submitted&&!folder){const first=await db.prepare('SELECT id FROM garage_folders ORDER BY created_at LIMIT 1').first();if(first)folder=first.id;else{folder='club-members';await db.prepare('INSERT INTO garage_folders VALUES(?,?,?) ON CONFLICT(id) DO NOTHING').bind(folder,'Miembros del club',Math.floor(Date.now()/1000)).run();}}folder=clean(folder,'la carpeta',1,80);
    if(submitted&&form.get('website'))fail('No se pudo enviar la ficha.');
    if (!await db.prepare('SELECT id FROM garage_folders WHERE id=?').bind(folder).first()) fail('Selecciona una carpeta existente.');
    if (form.get('consent') !== 'yes') fail('Confirma que tienes permiso para publicar las fotos y los datos del miembro.');
    const pilot = clean(form.get('pilot'), 'el nombre del piloto', 2, 80), model = clean(form.get('model'), 'el modelo', 2, 100);
    const instagram = clean(form.get('instagram'), 'Instagram', 0, 40).replace(/^@/, '');
    if (instagram && !/^[A-Za-z0-9_.]{1,30}$/.test(instagram)) fail('Introduce solo el usuario de Instagram, sin la dirección web.');
    const engine = clean(form.get('engine'), 'el motor', 0, 100), power = clean(form.get('power'), 'la potencia', 0, 40), year = clean(form.get('year'), 'el año', 0, 4), gearbox = clean(form.get('gearbox'), 'el cambio', 0, 60), notes = clean(form.get('notes'), 'los detalles', 0, 2000);
    if (year && !/^\d{4}$/.test(year)) fail('El año debe tener cuatro cifras.');
    const rawPhone=clean(form.get('phone'),'el teléfono',0,30);if(rawPhone&&!/^(?:\+|00)?[0-9 ()-]+$/.test(rawPhone))fail('Introduce un teléfono válido con prefijo internacional.');let phone=rawPhone.replace(/[^0-9]/g,'');if(rawPhone.startsWith('00'))phone=phone.slice(2);if(phone&&(!/^[1-9][0-9]{6,14}$/.test(phone)))fail('Introduce el teléfono con prefijo internacional, por ejemplo +34 600 123 456.');
    const avatar=await photosFrom(form,'profilePhoto',1);if(avatar[0]?.data.byteLength>262144)fail('La foto de perfil debe ocupar menos de 256 KB.');
    const photos = await photosFrom(form); if (creating && !photos.length) fail('Añade al menos una foto del coche.');
    const stamp = Math.floor(Date.now()/1000);
    const statements = [creating ? db.prepare('INSERT INTO garage_members VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,folder,pilot,instagram,model,engine,power,year,gearbox,notes,stamp,stamp,submitted?'member-submission':admin.id) : db.prepare('UPDATE garage_members SET folder_id=?,pilot=?,instagram=?,model=?,engine=?,power=?,year=?,gearbox=?,notes=?,updated_at=?,updated_by=? WHERE id=?').bind(folder,pilot,instagram,model,engine,power,year,gearbox,notes,stamp,admin.id,id)];
    if (photos.length) {
      if (!creating) statements.push(db.prepare('DELETE FROM garage_photos WHERE member_id=?').bind(id));
      photos.forEach((photo,index) => statements.push(db.prepare('INSERT INTO garage_photos VALUES(?,?,?,?,?)').bind(photo.id,id,photo.mime,photo.data,index)));
    }
    if(avatar.length)statements.push(db.prepare('INSERT INTO garage_profiles(member_id,phone,content_type,data) VALUES(?,?,?,?) ON CONFLICT(member_id) DO UPDATE SET phone=excluded.phone,content_type=excluded.content_type,data=excluded.data').bind(id,phone,avatar[0].mime,avatar[0].data));
    else if(form.get('removeProfile')==='yes')statements.push(db.prepare('INSERT INTO garage_profiles(member_id,phone) VALUES(?,?) ON CONFLICT(member_id) DO UPDATE SET phone=excluded.phone,content_type=NULL,data=NULL').bind(id,phone));
    else statements.push(db.prepare('INSERT INTO garage_profiles(member_id,phone) VALUES(?,?) ON CONFLICT(member_id) DO UPDATE SET phone=excluded.phone').bind(id,phone));
    if(submitted)statements.push(db.prepare('INSERT INTO garage_moderation(member_id,status,submitted_at) VALUES(?,?,?)').bind(id,'pending',stamp));
    await db.batch(statements);const moderation=await db.prepare('SELECT status FROM garage_moderation WHERE member_id=?').bind(id).first();return reply({id,status:moderation?.status||'approved'},creating?201:200);
  }
  if (path.startsWith('/api/garage/members/') && method === 'DELETE') {
    const result = await db.prepare('DELETE FROM garage_members WHERE id=?').bind(path.split('/').pop()).run();
    if (!result.meta.changes) fail('La ficha ya no existe.',404);
    return reply({ ok: true });
  }
  return reply({ error: 'Ruta no encontrada.' },404);
}
