// Rango HTTP explícito para los dos MP4 públicos. Sin D1 ni servicios externos.
const movies=new Set(['/assets/cinematic/octavia-cinematica-web.mp4','/assets/cinematic/octavia-cinematica-4k.mp4']);
export async function onRequest({request,env}){
 const path=new URL(request.url).pathname;
 if(!movies.has(path))return env.ASSETS.fetch(request);
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
 const headers=new Headers(request.headers);headers.delete('Range');headers.delete('If-Range');headers.set('Accept-Encoding','identity');
 const source=await env.ASSETS.fetch(new Request(request,{headers}));
 if(source.status!==200||!source.headers.get('Content-Type')?.startsWith('video/mp4'))return source;
 const output=new Headers(source.headers);output.set('Accept-Ranges','bytes');output.set('X-Content-Type-Options','nosniff');
 const range=request.headers.get('Range'),condition=request.headers.get('If-Range');
 if(request.method==='HEAD'||!range||condition&&condition!==source.headers.get('ETag')&&condition!==source.headers.get('Last-Modified'))return new Response(request.method==='HEAD'?null:source.body,{status:200,headers:output});
 const buffer=await source.arrayBuffer(),size=buffer.byteLength,match=/^bytes=(\d*)-(\d*)$/.exec(range);
 const invalid=()=>{output.set('Content-Range','bytes */'+size);output.set('Content-Length','0');return new Response(null,{status:416,headers:output});};
 if(!match||!match[1]&&!match[2]||!size)return invalid();
 let start,end;
 if(!match[1]){const length=Number(match[2]);if(!Number.isSafeInteger(length)||length<=0)return invalid();start=Math.max(0,size-length);end=size-1;}
 else{start=Number(match[1]);end=match[2]?Number(match[2]):size-1;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||start>end)return invalid();end=Math.min(end,size-1);}
 output.set('Content-Range',`bytes ${start}-${end}/${size}`);output.set('Content-Length',String(end-start+1));
 return new Response(new Uint8Array(buffer,start,end-start+1),{status:206,headers:output});
}
