// Static local preview. No Cloudflare credentials, no D1 connection or writes.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('dist'),types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.mp3':'audio/mpeg','.hdr':'application/octet-stream','.glb':'model/gltf-binary'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Vista previa local: sin conexión con los datos de producción.'}));return;}
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/simulador.html':url.pathname));if(!path.startsWith(root+sep))throw Error('path');
  const bytes=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:bytes);
 }catch{res.writeHead(404);res.end('Archivo no disponible');}
});
server.listen(8790,'127.0.0.1',()=>console.log('Simulador local: http://127.0.0.1:8790/simulador.html · selecciona Autovía 3D. Las APIs de producción están desconectadas.'));
