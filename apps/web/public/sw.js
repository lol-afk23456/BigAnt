/* global self,caches,fetch,URL */
const CACHE='bigant-shell-v1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/offline','/icons/icon-192.png','/icons/icon-512.png'])));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('bigant-shell-')&&key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim();});
// Nessuna risposta API, pagina staff o dato ospite entra nella cache.
self.addEventListener('fetch',event=>{if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>caches.match('/offline')));});
function panelUrl(value){try{const url=new URL(value,self.location.origin);if(url.origin===self.location.origin&&/^\/r\/[a-z0-9-]+\/staff$/.test(url.pathname))return url.href;}catch{/* Payload non valido. */}return self.location.origin;}
self.addEventListener('push',event=>{if(!event.data)return;let data;try{data=event.data.json();}catch{return;}if(typeof data.title!=='string'||typeof data.body!=='string')return;event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:'/icons/icon-192.png',data:{url:panelUrl(data.url)}}));});
self.addEventListener('notificationclick',event=>{event.notification.close();const url=panelUrl(event.notification.data?.url);event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{const current=clients.find(client=>new URL(client.url).pathname===new URL(url).pathname);if(current){await current.navigate(url);return current.focus();}return self.clients.openWindow(url);}));});
