// Cache only explicitly public anonymous GETs. Administration always reaches D1.
const routes = new Set(['/api/garage/folders','/api/garage/members','/api/market/listings','/api/club/notifications','/api/club/events','/api/club/news','/api/gallery/folders','/api/analytics/config']);
export async function withPublicCache(request, cache, next) {
 const url=new URL(request.url);
 if(request.method!=='GET'||!cache||request.headers.has('authorization')||/(?:^|;\s*)club_session=/.test(request.headers.get('cookie')||'')||!routes.has(url.pathname))return next();
 // Only the folder selector is accepted: never cache manage/review/preview views.
 if([...url.searchParams.keys()].some(key=>url.pathname!=='/api/garage/members'||key!=='folder'))return next();
 const key=new Request(url.href,{method:'GET'});
 try{const hit=await cache.match(key);if(hit){const headers=new Headers(hit.headers);headers.set('Cache-Control','no-store');return new Response(hit.body,{status:hit.status,headers});}}catch{}
 const response=await next();
 if(response.status===200&&!response.headers.has('Set-Cookie')){
  const headers=new Headers(response.headers);headers.set('Cache-Control','public, max-age=30');
  try{await cache.put(key,new Response(response.clone().body,{status:200,headers}));}catch{}
 }
 return response;
}
