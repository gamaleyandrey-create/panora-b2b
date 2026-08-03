const CACHE='panora-v287';
const CORE=['./','index.html','admin.html','manifest.webmanifest','icon.svg','styles.css','portal.css','admin.css','app.js','portal.js','admin.js','supabase-config.js'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await Promise.allSettled(CORE.map(url=>cache.add(new Request(url,{cache:'reload'}))));await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET'||new URL(request.url).origin!==location.origin)return;
 event.respondWith((async()=>{try{const response=await fetch(request,{cache:'no-store'});if(response.ok){const cache=await caches.open(CACHE);cache.put(request,response.clone())}return response}catch{const cached=await caches.match(request,{ignoreSearch:true});if(cached)return cached;if(request.mode==='navigate')return caches.match(request.url.includes('admin.html')?'admin.html':'index.html');throw new Error('offline')}})());
});
