// This worker intentionally has NO access to D1, authentication, secrets or production APIs.
export default {
 async fetch(request,env){
  const url=new URL(request.url);let path;try{path=decodeURIComponent(url.pathname);}catch{return new Response('Ruta no válida',{status:400});}
  if(path.startsWith('/api/')){
   if(path==='/api/analytics/config'&&request.method==='GET')return Response.json({ga4:'',clarity:'',cloudflare:'',version:1});
   return Response.json({error:'Vista previa aislada: administración, guardado y datos del club desconectados.',preview:true},{status:503,headers:{'Cache-Control':'no-store'}});
  }
  if(!['GET','HEAD'].includes(request.method))return new Response('Vista previa de solo lectura',{status:405});
  if(/(?:^\/(?:admin|estadisticas|noticias-admin)|-admin(?:\.html)?$)/i.test(path))return new Response('Administración no disponible en la vista previa',{status:404});
  if(path==='/')return Response.redirect(url.origin+'/simulador.html?experience=highway',302);
  const response=await env.ASSETS.fetch(request),headers=new Headers(response.headers);headers.set('X-Octavia-Preview','isolated-no-d1');headers.set('X-Robots-Tag','noindex, nofollow');headers.set('Cache-Control','no-store');
  return new Response(response.body,{status:response.status,headers});
 }
};
