import {recordClubEvent} from './push.mjs';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const text=(value,min,max,label)=>{if(typeof value!=='string')fail('Revisa '+label+'.');const v=value.trim();if(v.length<min||v.length>max)fail('Revisa '+label+'.');return v;};
export async function handleSuggestions(request,db,user,context){
 const url=new URL(request.url),path=url.pathname,method=request.method;
 if(path==='/api/suggestions'&&method==='POST'){
  const body=await request.json();if(body.website||body.consent!==true)fail('Acepta que los administradores lean tu propuesta.');
  const title=text(body.title,3,160,'el título'),idea=text(body.idea,10,4000,'la idea'),alias=text(body.alias??'',0,60,'el nombre o alias'),category=text(body.category??'General',1,40,'el apartado');
  if(!['General','Quedadas y rutas','Garaje','Galería','Mercadillo','Simulador','La web'].includes(category))fail('Apartado no válido.');
  const id=crypto.randomUUID(),stamp=Math.floor(Date.now()/1000);await db.prepare('INSERT INTO club_suggestions(id,title,idea,alias,category,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').bind(id,title,idea,alias,category,'new',stamp,stamp).run();
  await recordClubEvent(db,{id:'suggestion:'+id,title:'Nueva sugerencia para el club',href:'sugerencias.html#gestion',audience:'admin',kind:'suggestion'},context).catch(()=>{});
  return json({ok:true},201);
 }
 if(!user)fail('Inicia sesión como administrador.',401);
 if(path==='/api/suggestions'&&method==='GET')return json((await db.prepare('SELECT id,title,idea,alias,category,status,created_at,updated_at FROM club_suggestions ORDER BY created_at DESC LIMIT 200').all()).results);
 const match=path.match(/^\/api\/suggestions\/([a-f0-9-]{36})$/i);
 if(match&&method==='POST'){const body=await request.json();if(!['new','read','archived'].includes(body.status))fail('Estado no válido.');const r=await db.prepare('UPDATE club_suggestions SET status=?,updated_at=? WHERE id=?').bind(body.status,Math.floor(Date.now()/1000),match[1]).run();if(!r.meta.changes)fail('La sugerencia ya no existe.',404);return json({ok:true});}
 if(match&&method==='DELETE'){const r=await db.prepare('DELETE FROM club_suggestions WHERE id=?').bind(match[1]).run();if(!r.meta.changes)fail('La sugerencia ya no existe.',404);return json({ok:true});}
 return json({error:'Ruta no encontrada.'},404);
}
