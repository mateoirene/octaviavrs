const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const denied=()=>json({error:'No se ha podido verificar este teléfono como miembro autorizado del club.'},403);
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};

export function normalizeClubPhone(value){
 const raw=String(value||'').trim();
 if(!raw||raw.length>30||!/^(?:\+|00)?[0-9 ()-]+$/.test(raw))fail('Introduce un teléfono válido con prefijo internacional.');
 let phone=raw.replace(/[^0-9]/g,'');
 if(raw.startsWith('00'))phone=phone.slice(2);
 // Las fichas del club son españolas: también se admite el formato nacional
 // de nueve cifras y se almacena siempre con el prefijo 34.
 if(/^[6789][0-9]{8}$/.test(phone))phone='34'+phone;
 if(!/^[1-9][0-9]{6,14}$/.test(phone))fail('Introduce el teléfono con prefijo internacional, por ejemplo +34 600 123 456.');
 return phone;
}

export function safeWhatsAppInvite(value){
 let url;
 try{url=new URL(String(value||'').trim());}catch{fail('Introduce el enlace completo de invitación de WhatsApp.');}
 if(url.origin!=='https://chat.whatsapp.com'||url.username||url.password||url.hash||!/^\/[A-Za-z0-9_-]{10,100}$/.test(url.pathname))fail('Utiliza un enlace válido de invitación de chat.whatsapp.com.');
 return url.href;
}

export async function handleWhatsAppRequest(request,db,admin){
 const path=new URL(request.url).pathname,method=request.method;
 if(path==='/api/club/whatsapp-settings'){
  if(!admin)return json({error:'Solo los administradores pueden configurar el grupo.'},401);
  if(method==='GET')return json({configured:!!await db.prepare("SELECT 1 configured FROM market_settings WHERE key='club-whatsapp-invite-url' AND value<>''").first()});
  if(method==='POST'){
   const body=await request.json(),inviteUrl=safeWhatsAppInvite(body?.inviteUrl);
   await db.prepare("INSERT INTO market_settings(key,value) VALUES('club-whatsapp-invite-url',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(inviteUrl).run();
   return json({configured:true});
  }
  return json({error:'Método no permitido.'},405);
 }
 if(path!=='/api/club/whatsapp-access')return null;
 if(method!=='POST')return json({error:'Método no permitido.'},405);
 let phone;
 try{phone=normalizeClubPhone((await request.json())?.phone);}catch{return denied();}
 const legacy=phone.startsWith('34')&&phone.length===11?phone.slice(2):phone;
 const members=await db.prepare("SELECT COUNT(DISTINCT p.member_id) total FROM garage_profiles p LEFT JOIN garage_moderation g ON g.member_id=p.member_id WHERE p.phone IN (?,?) AND COALESCE(g.status,'approved')='approved'").bind(phone,legacy).first();
 if(Number(members?.total)!==1)return denied();
 const setting=await db.prepare("SELECT value FROM market_settings WHERE key='club-whatsapp-invite-url'").first();
 if(!setting?.value)return json({error:'El acceso al grupo todavía no está configurado por la administración.'},503);
 let inviteUrl;try{inviteUrl=safeWhatsAppInvite(setting.value);}catch{return json({error:'La configuración del grupo necesita revisión administrativa.'},503);}
 return json({inviteUrl});
}
