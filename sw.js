const CACHE='panora-v21';
const ASSETS=['./','index.html','styles.css','portal.css','quantity.css','account-state.css','cart-date.css','app.js','portal.js','admin.html','admin.css','admin.js','commerce.css','settings.css','export.css','commerce.js','manifest.webmanifest','icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
