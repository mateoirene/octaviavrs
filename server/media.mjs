const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export const VIDEO_LIMIT=25*1024*1024;
export async function readClubMedia(file){
 if(!file?.arrayBuffer||file.size<12||file.size>VIDEO_LIMIT)fail('El archivo debe ocupar como máximo 25 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer()),word=(start,end)=>String.fromCharCode(...bytes.slice(start,end));
 const mime=bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':bytes[0]===137&&word(1,4)==='PNG'?'image/png':word(0,4)==='RIFF'&&word(8,12)==='WEBP'?'image/webp':word(4,8)==='ftyp'&&['isom','iso2','mp41','mp42','avc1','M4V ','MSNV','dash'].includes(word(8,12))?'video/mp4':bytes[0]===26&&bytes[1]===69&&bytes[2]===223&&bytes[3]===163&&new TextDecoder().decode(bytes.slice(0,4096)).includes('webm')?'video/webm':null;
 if(!mime)fail('Utiliza imágenes JPG, PNG o WebP, o vídeos MP4/WebM.');
 if(mime.startsWith('image/')&&bytes.length>1048576)fail('Reduce la imagen a menos de 1 MB.');
 return {bytes,mime};
}
export function mediaStatements(db,id,media){const statements=[db.prepare('INSERT INTO club_media_files VALUES(?,?,?)').bind(id,media.mime,media.bytes.length)];for(let offset=0,position=0;offset<media.bytes.length;offset+=524288,position++)statements.push(db.prepare('INSERT INTO club_media_chunks VALUES(?,?,?)').bind(id,position,media.bytes.slice(offset,offset+524288).buffer));return statements;}
export async function serveClubMedia(request,db,id){
 const media=await db.prepare('SELECT * FROM club_media_files WHERE id=?').bind(id).first();if(!media)return null;
 let start=0,end=media.size-1,status=200;const range=request.headers.get('range');
 if(range){const m=/^bytes=(\d*)-(\d*)$/.exec(range);if(!m||(!m[1]&&!m[2]))return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+media.size}});if(m[1]){start=Number(m[1]);end=m[2]?Math.min(end,Number(m[2])):end;}else start=Math.max(0,media.size-Number(m[2]));if(start>end||start>=media.size)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+media.size}});status=206;}
 const first=Math.floor(start/524288),last=Math.floor(end/524288);let position=first;
 const stream=new ReadableStream({async pull(controller){try{if(position>last){controller.close();return;}const until=Math.min(last,position+3),rows=(await db.prepare('SELECT position,data FROM club_media_chunks WHERE file_id=? AND position BETWEEN ? AND ? ORDER BY position').bind(id,position,until).all()).results;if(rows.length!==until-position+1)throw Error('Archivo incompleto');for(const row of rows){if(row.position!==position)throw Error('Archivo incompleto');const bytes=new Uint8Array(row.data),lo=position===first?start%524288:0,hi=position===last?end%524288+1:bytes.length;controller.enqueue(bytes.slice(lo,hi));position++;}}catch(error){controller.error(error);}}});
 return new Response(stream,{status,headers:{'Content-Type':media.content_type,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(status===206?{'Content-Range':'bytes '+start+'-'+end+'/'+media.size}:{})}});
}
