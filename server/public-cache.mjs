// Only cache explicitly public anonymous GETs. Moderation and personal access
// always reach the origin.
const routes = new Set([
  '/api/garage/folders', '/api/garage/members', '/api/market/listings',
  '/api/club/notifications', '/api/club/events', '/api/club/news',
  '/api/gallery/folders', '/api/analytics/config'
]);
const fallbackRoutes = new Set(['/api/club/events', '/api/club/news']);
const freshSeconds = 60;
const fallbackSeconds = 300;
const capturedAt = 'X-Club-Cache-Captured-At';

function publicResponse(response, stale = false) {
  const headers = new Headers(response.headers);
  headers.delete(capturedAt);
  headers.set('Cache-Control', 'no-store');
  if (stale) headers.set('X-Club-Data-Stale', '1');
  return new Response(response.body, {status: response.status, headers});
}

export async function withPublicCache(request, cache, next) {
  const url = new URL(request.url);
  if (!cache) return next();

  // Invalidate this edge after successful event changes.
  if (['POST', 'DELETE'].includes(request.method) && /^\/api\/club\/events(?:\/[^/]+)?$/.test(url.pathname)) {
    const response = await next();
    if (response.ok) {
      try { await cache.delete(new Request(url.origin + '/api/club/events')); } catch {}
    }
    return response;
  }

  if (request.method !== 'GET' || request.headers.has('authorization') ||
      /(?:^|;\s*)(?:club_session|club_member_session)=/.test(request.headers.get('cookie') || '') ||
      !routes.has(url.pathname)) return next();

  // Review/manage/preview requests never share a cache entry.
  const params = [...url.searchParams.keys()];
  if (params.length && (url.pathname !== '/api/garage/members' || params.length !== 1 || params[0] !== 'folder')) return next();

  const key = new Request(url.href);
  const allowFallback = fallbackRoutes.has(url.pathname);
  let hit;
  try { hit = await cache.match(key); } catch {}
  if (hit) {
    const stamp = Number(hit.headers.get(capturedAt));
    const age = stamp ? (Date.now() - stamp) / 1000 : 0;
    if (age < freshSeconds) return publicResponse(hit);
    if (!allowFallback || age >= fallbackSeconds) hit = null;
  }

  const response = await next();
  if (hit && response.status >= 500) return publicResponse(hit, true);
  if (response.status === 200 && !response.headers.has('Set-Cookie')) {
    const headers = new Headers(response.headers);
    headers.set(capturedAt, String(Date.now()));
    headers.set('Cache-Control', 'public, max-age=' + (allowFallback ? fallbackSeconds : freshSeconds));
    try { await cache.put(key, new Response(response.clone().body, {status: 200, headers})); } catch {}
  }
  return response;
}
