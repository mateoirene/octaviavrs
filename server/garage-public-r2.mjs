const pointer = 'garage-public/current.json';
const privateSession = /(?:^|;\s*)(?:club_session|club_member_session)=/;
const photoRoute = /^\/api\/garage\/(?:photos\/[^/]+|profiles\/[^/]+\/photo)$/;

function response(body, status = 200) {
  return Response.json(body, {status, headers:{'Cache-Control':'no-store'}});
}

export function isGarageSnapshotRead(request) {
  if (request.method !== 'GET' || request.headers.has('authorization') ||
      privateSession.test(request.headers.get('cookie') || '')) return false;
  const {pathname, searchParams} = new URL(request.url);
  return pathname === '/api/garage/folders' ||
    (pathname === '/api/garage/members' && !searchParams.has('review') && !searchParams.has('member')) ||
    photoRoute.test(pathname);
}

export async function readGarageSnapshot(request, bucket) {
  const object = await bucket?.get(pointer);
  const snapshot = object && await object.json();
  if (snapshot?.status !== 'ready') return response({error:'El garaje público se está actualizando.'},503);
  const {pathname, searchParams} = new URL(request.url);
  if (pathname === '/api/garage/folders') return response(snapshot.folders);
  if (pathname === '/api/garage/members') {
    const folderId = searchParams.get('folder') || '';
    return response(Object.hasOwn(snapshot.members, folderId) ? snapshot.members[folderId] : []);
  }
  const asset = Object.hasOwn(snapshot.media, pathname) ? snapshot.media[pathname] : null;
  if (!asset) return response({error:'Foto no disponible.'},404);
  const file = await bucket.get(asset);
  if (!file) return response({error:'Foto no disponible.'},404);
  return new Response(file.body,{headers:{
    'Content-Type':file.httpMetadata?.contentType || 'application/octet-stream',
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'
  }});
}

async function snapshotFromGarage(bucket, revision, read, previous, written) {
  const folderResponse = await read('/api/garage/folders');
  if (!folderResponse.ok) throw Error('No se pudieron leer las carpetas.');
  const folders = await folderResponse.json();
  const members = Object.create(null);
  const paths = new Set();
  for (const folder of folders) {
    if (folder.cover) paths.add(folder.cover);
    const listing = await read('/api/garage/members?folder=' + encodeURIComponent(folder.id));
    if (!listing.ok) throw Error('No se pudo leer la carpeta.');
    members[folder.id] = await listing.json();
    for (const member of members[folder.id]) {
      if (member.profileImage) paths.add(member.profileImage);
      for (const path of member.images) paths.add(path);
    }
  }
  const media = Object.create(null);
  for (const path of paths) {
    if (!photoRoute.test(path)) throw Error('Ruta de imagen inesperada.');
    // Car photo IDs change on replacement. Avatar URLs are stable and must be refreshed.
    if (path.startsWith('/api/garage/photos/') && previous && Object.hasOwn(previous.media || {},path)) {
      media[path] = previous.media[path];
      continue;
    }
    const photo = await read(path);
    if (!photo.ok || !photo.body) throw Error('No se pudo copiar una imagen pública.');
    const key = 'garage-public/' + revision + path;
    await bucket.put(key,photo.body,{httpMetadata:{contentType:photo.headers.get('content-type')}});
    written.push(key);
    media[path] = key;
  }
  return {status:'ready',revision,folders,members,media};
}

export async function publishGarageMutation(bucket, mutate, read) {
  const current = await bucket.get(pointer);
  const previous = current && await current.json();
  if (previous?.status === 'updating') {
    return response({error:'Hay otra actualización del garaje en curso. Vuelve a intentarlo.'},409);
  }
  const revision = crypto.randomUUID();
  const lock = await bucket.put(pointer,JSON.stringify({status:'updating',revision}),{
    onlyIf:current ? {etagMatches:current.etag} : new Headers({'If-None-Match':'*'})
  });
  if (!lock) return response({error:'El garaje se está actualizando. Vuelve a intentarlo.'},409);
  const condition = {onlyIf:{etagMatches:lock.etag}};
  const written = [];
  let changed;
  try {
    changed = await mutate();
    if (!changed.ok && previous?.status === 'ready') {
      if (!await bucket.put(pointer,JSON.stringify(previous),condition)) throw Error('Se perdió el control de publicación.');
      return changed;
    }
    const next = await snapshotFromGarage(bucket,revision,read,previous,written);
    if (!await bucket.put(pointer,JSON.stringify(next),condition)) throw Error('Se perdió el control de publicación.');
    const live = new Set(Object.values(next.media));
    const retired = Object.values(previous?.media || {}).filter(key => !live.has(key));
    if (retired.length) { try { await bucket.delete(retired); } catch {} }
  } catch (error) {
    // Never re-expose a snapshot that might contain a now-hidden profile.
    try { await bucket.put(pointer,JSON.stringify({status:'failed',revision,media:previous?.media || {}}),condition); } catch {}
    if (written.length) { try { await bucket.delete(written); } catch {} }
    if (changed?.ok) {
      const payload = await changed.json();
      return response({...payload,garagePublicPending:true},changed.status);
    }
    throw error;
  }
  return changed;
}
