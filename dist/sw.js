// Avisos push sin contenido privado ni caché de páginas o sesiones.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>event.waitUntil(self.registration.showNotification('Club Octavia VRS',{body:'Hay novedades en el club. Abre la campana para ver los avisos y las revisiones.',icon:'/assets/vrs-emblema-cromado.png',tag:'club-vrs-news',renotify:true,data:{url:'/index.html?avisos=1'}})));
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const existing=windows.find(client=>new URL(client.url).origin===self.location.origin);if(existing){await existing.navigate('/index.html?avisos=1');return existing.focus();}return self.clients.openWindow('/index.html?avisos=1');})());});
