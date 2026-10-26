import {marketFields,marketPhoto} from './market-fields.mjs';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export async function editMarketListing(request,db,user,id){
 const old=await db.prepare('SELECT * FROM market_listings WHERE id=?').bind(id).first();if(!old)fail('El anuncio ya no existe.',404);
 const form=await request.formData(),fields=marketFields(form),version=String(form.get('version')||''),current=await db.prepare('SELECT token FROM market_edit_versions WHERE listing_id=?').bind(id).first();
 if(version!==(current?.token||''))fail('Otro administrador ha editado el anuncio. Actualiza la lista antes de guardar.',409);
 let keep;try{keep=JSON.parse(form.get('keepPhotos')||'[]');}catch{fail('Revisa las fotos conservadas.');}
 if(!Array.isArray(keep)||keep.some(x=>typeof x!=='string')||new Set(keep).size!==keep.length)fail('Revisa las fotos conservadas.');
 const existing=(await db.prepare('SELECT id FROM market_photos WHERE listing_id=? ORDER BY position').bind(id).all()).results;
 if(keep.some(photo=>!existing.some(row=>row.id===photo)))fail('Una foto ya no pertenece a este anuncio. Actualiza la lista.',409);
 const files=form.getAll('photos');if(keep.length+files.length<1||keep.length+files.length>10)fail('El anuncio debe tener entre 1 y 10 fotos.');
 const additions=[];for(const file of files)additions.push({...await marketPhoto(file),id:crypto.randomUUID()});
 const token=crypto.randomUUID(),stamp=Math.floor(Date.now()/1000),guard='EXISTS(SELECT 1 FROM market_edit_versions WHERE listing_id=? AND token=?)';
 const statements=[db.prepare(`INSERT INTO market_edit_versions(listing_id,token,edited_by,edited_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM market_listings WHERE id=? AND status=? AND updated_at=?) AND COALESCE((SELECT token FROM market_edit_versions WHERE listing_id=?),'')=? ON CONFLICT(listing_id) DO UPDATE SET token=excluded.token,edited_by=excluded.edited_by,edited_at=excluded.edited_at WHERE market_edit_versions.token=?`).bind(id,token,user.id,stamp,id,old.status,old.updated_at,id,version,version),
 db.prepare(`UPDATE market_listings SET title=?,category=?,description=?,price=?,condition=?,compatibility=?,location=?,seller=?,contact_type=?,contact_value=?,contact_url=?,updated_at=CASE WHEN status='sold' THEN updated_at ELSE ? END WHERE id=? AND ${guard}`).bind(fields.title,fields.category,fields.description,fields.price,fields.condition,fields.compatibility,fields.location,fields.seller,fields.type,fields.value,fields.contact,stamp,id,id,token)];
 for(const row of existing)if(!keep.includes(row.id))statements.push(db.prepare(`DELETE FROM market_photos WHERE listing_id=? AND id=? AND ${guard}`).bind(id,row.id,id,token));
 keep.forEach((photo,position)=>statements.push(db.prepare(`UPDATE market_photos SET position=? WHERE listing_id=? AND id=? AND ${guard}`).bind(position,id,photo,id,token)));
 additions.forEach((photo,index)=>statements.push(db.prepare(`INSERT INTO market_photos SELECT ?,?,?,?,? WHERE ${guard}`).bind(photo.id,id,photo.mime,photo.data,keep.length+index,id,token)));
 await db.batch(statements);
 if((await db.prepare('SELECT token FROM market_edit_versions WHERE listing_id=?').bind(id).first())?.token!==token)fail('El anuncio ha cambiado. Actualiza la lista antes de guardar.',409);
 return {id,status:old.status,version:token};
}
