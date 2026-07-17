const CACHE='panora-v40';
const ASSETS=['./','index.html','styles.css','portal.css','quantity.css','account-state.css','account-documents.css','cart-date.css','app.js','portal.js','admin.html','admin.css','admin.js','commerce.css','settings.css','export.css','recipe-actions.css','purchase-filter.css','date-jump.css','commerce.js','invoice-settings.js','manifest.webmanifest','icon.svg','bread-plain.jpg','bread-pumpkin.jpg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(e.request,copy));return response}).catch(()=>caches.match(e.request)))});
