const CACHE='panora-v10260';
const CORE=[
  './partner/index.html',
  './partner/manifest.webmanifest',
  './bakery/index.html',
  './bakery/manifest.webmanifest',
  './retail/index.html',
  './retail/manifest.webmanifest','./','index.html','retail.html','retail-order.html','admin.html','confirm.html','confirm.js','confirm.css','confirm-close.css','manifest-bakery-998.webmanifest','manifest-partner-998.webmanifest','manifest-retail-998.webmanifest','icon.svg','icon-192.png','icon-512.png','apple-touch-icon.png','bread-plain.jpg','bread-pumpkin.jpg','styles.css','portal.css','admin.css','app.js','portal.js','admin.js','supabase-config.js','audit-log.js','cloud-sync.js','admin-auth.js','admin-localization.js','admin-mobile-tabs.js','admin-status-sync.js','account-detail.js','accounting-invoice.js','spanish-documents.js','calendar-plan.js','checkout-flow-fix.js','commerce.js','daily-order-summary.js','delivery-offline.js','delivery-followup.js','delivery-qr.js','document-library.js','dynamic-products.js','input-stability.js','install-guide.js','invoice-close.js','invoice-preview.js','invoice-settings.js','invoice-tax-display.js','mobile-admin-nav.js','order-communication.js','order-notifications.js','portal-cloud.js','product-admin.js','purchase-costs.js','qrcode-browser.js','recipe-percent.js','restaurant-workspace.js','account-detail.css','account-documents.css','account-state.css','accounting-invoice.css','admin-auth.css','admin-mobile-tabs.css','admin-order-polish.css','desktop-orders-v22.css','desktop-orders-v23.css','desktop-orders-v24.css','desktop-orders-v25.css','desktop-orders-v27.css','admin-v247.css','bake-info.css','calendar-bake-highlight.css','calendar-calm.css','calendar-fun.css','calendar-labels.css','calendar-plan.css','calendar-text-restore.css','calendar-weekend.css','cart-date.css','checkout-feedback.css','commerce.css','daily-order-summary.css','daily-selection.css','date-jump.css','delivery-offline.css','delivery-followup.css','delivery-qr.css','document-library.css','easy-plan.css','export.css','first-order.css','install-guide.css','invoice-preview.css','mobile-admin-all.css','mobile-admin-menu.css','mobile-admin-nav-fix.css','mobile-admin-orders.css','mobile-buttons.css','mobile-cart-button.css','mobile-cart-flex.css','mobile-cart-layout.css','mobile-catalog.css','mobile-checkout-stable.css','mobile-checkout.css','mobile-nav-icons.css','order-notifications.css','order-prices.css','product-admin.css','product-close.css','purchase-costs.css','purchase-filter-simple.css','purchase-filter.css','quantity.css','recipe-actions.css','recipe-percent.css','reminder-hours.css','responsive.css','restaurant-workspace.css','settings.css','unified-controls.css','desktop-orders-v28.css','desktop-order-date-filter-v28.js','desktop-orders-v29-final.css','mobile-orders-v30.css','mobile-orders-toolbar-v34-hotfix.css','mobile-orders-v35.css','mobile-orders-v36.css','mobile-orders-v37.css','mobile-orders-v38.css','notifications-v39.css','pricing-v40.css','stable-price-inputs-v42.js','price-inputs-v42.css','money-edit-lock-v43.js','pricing-sync-v44.js','public-catalog-cloud-v48.js','retail-account.js','retail-account.css','mobile-partner-prices-v49.css','mobile-partner-profile-v411.css','mobile-partner-workspace-v412.css','mobile-partner-profile-v415.css','mobile-partner-profile-v416.css','partner-no-bottom-bar-v422.css','admin-price-diagnostic-v424.js','admin-price-diagnostic-v424.css','admin-price-authority-v425.js','admin-partner-prices-direct-v426.js','admin-partner-prices-guard-v426.js','pwa-stable.js','connection-status.js','order-messages-v565.js','order-messages-v565.css','admin-partner-theme.css','audit-trail.css','audit-trail.js','connection-status.css','event-notifications.css','event-notifications.js','finance-dashboard.css','finance-dashboard.js','light-pro.css','mobile-header.css','mobile-partner-v20.css','pwa-stable.css','recovery-guard.js','stable-health.js'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await Promise.allSettled(CORE.map(url=>cache.add(new Request(url,{cache:'reload'}))));await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET'||new URL(request.url).origin!==location.origin)return;
 event.respondWith((async()=>{try{const response=await fetch(request,{cache:'no-store'});if(response.ok){const cache=await caches.open(CACHE);cache.put(request,response.clone())}return response}catch{const cached=await caches.match(request,{ignoreSearch:true});if(cached)return cached;if(request.mode==='navigate'){const url=request.url;if(url.includes('admin.html'))return caches.match('admin.html');if(url.includes('retail-order.html'))return caches.match('retail-order.html');if(url.includes('retail.html'))return caches.match('retail.html');if(url.includes('confirm.html'))return caches.match('confirm.html');return caches.match('index.html');}throw new Error('offline')}})());
});

self.addEventListener('message',event=>{if(event.data?.type==='PANORA_SKIP_WAITING')self.skipWaiting()});


/* Panora 10.24 — quiet hours by audience for legacy/root Web Push. */
const PANORA_PUSH_WINDOWS={admin:{start:7,end:22},bakery:{start:7,end:22},partner:{start:8,end:21},retail:{start:9,end:21},customer:{start:9,end:21}};
const panoraPushAudience=data=>{const raw=String(data?.audience||data?.recipient_role||data?.role||'retail').toLowerCase();return raw.includes('admin')||raw.includes('bakery')?'admin':raw.includes('partner')?'partner':raw.includes('customer')?'customer':'retail'};
const panoraPushAllowed=data=>{const w=PANORA_PUSH_WINDOWS[panoraPushAudience(data)]||PANORA_PUSH_WINDOWS.retail,h=new Date().getHours();return h>=w.start&&h<w.end};
const PANORA_PUSH_DB='panora-push-quiet-v10260',PANORA_PUSH_STORE='pending';
const panoraPushDb=()=>new Promise((resolve,reject)=>{const r=indexedDB.open(PANORA_PUSH_DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(PANORA_PUSH_STORE))r.result.createObjectStore(PANORA_PUSH_STORE,{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
async function panoraQueuePush(data){try{const db=await panoraPushDb(),tx=db.transaction(PANORA_PUSH_STORE,'readwrite');tx.objectStore(PANORA_PUSH_STORE).put({id:String(data.notification_id||data.tag||crypto.randomUUID?.()||Date.now()+Math.random()),data,queuedAt:Date.now()});await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});try{await self.registration.sync?.register?.('panora-push-flush')}catch{}}catch{}}
async function panoraShowPush(data){return self.registration.showNotification(String(data.title||'Panora'),{body:String(data.body||'Новое уведомление'),icon:'icon-192.png',badge:'icon-192.png',tag:String(data.tag||data.notification_id||'panora-retail'),renotify:true,data:{url:panoraPushTarget(data)}})}
async function panoraFlushPush(){try{const db=await panoraPushDb(),tx=db.transaction(PANORA_PUSH_STORE,'readwrite'),store=tx.objectStore(PANORA_PUSH_STORE),rows=await new Promise((res,rej)=>{const r=store.getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)});for(const row of rows.sort((a,b)=>(a.queuedAt||0)-(b.queuedAt||0))){if(!panoraPushAllowed(row.data||{}))continue;await panoraShowPush(row.data||{});store.delete(row.id)}}catch{}}
const panoraPushTarget=data=>{
 const title=String(data?.title||''),body=String(data?.body||''),kind=String(data?.kind||data?.type||data?.event_type||data?.tag||'');
 const signal=`${kind} ${title} ${body}`.toLowerCase();
 const messagePush=/(message|chat|сообщ|mensaje)/i.test(signal);
 const raw=String(data?.url||data?.href||'retail.html');
 try{
  const url=new URL(raw,self.location.href);
  const orderId=String(data?.order_id||data?.orderId||data?.order?.id||url.searchParams.get('order')||url.searchParams.get('orderId')||'');
  if(messagePush&&orderId){
   url.searchParams.set('order',orderId);url.searchParams.set('chat','1');
   if(/(?:^|\/)admin\.html$/i.test(url.pathname))url.searchParams.set('panoraPush','orders');
   if(/(?:^|\/)index\.html$/i.test(url.pathname)||url.pathname.endsWith('/'))url.searchParams.set('panoraPush','orders');
  }
  return url.href;
 }catch{return raw}
};
async function panoraNotifyOpenClients(data){try{const list=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of list){try{client.postMessage({type:'PANORA_PUSH_RECEIVED',payload:data||{}})}catch{}}}catch{}}
self.addEventListener('push',event=>{
 let data={};try{data=event.data?event.data.json():{}}catch{try{data={body:event.data?.text?.()||''}}catch{}}
 event.waitUntil(Promise.allSettled([panoraNotifyOpenClients(data),panoraPushAllowed(data)?panoraShowPush(data):panoraQueuePush(data)]));
});
self.addEventListener('sync',event=>{if(event.tag==='panora-push-flush')event.waitUntil(panoraFlushPush())});
self.addEventListener('notificationclick',event=>{
 event.notification.close();const target=new URL(event.notification.data?.url||'retail.html',self.location.href).href;
 event.waitUntil((async()=>{const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of clients){if('focus' in client){try{await client.navigate(target)}catch{}const focused=await client.focus();try{focused?.postMessage?.({type:'PANORA_PUSH_OPENED',url:target})}catch{}return focused}}if(self.clients.openWindow){const opened=await self.clients.openWindow(target);try{opened?.postMessage?.({type:'PANORA_PUSH_OPENED',url:target})}catch{}return opened}})());
});
self.addEventListener('message',event=>{if(event.data?.type==='PANORA_SHOW_NOTIFICATION'){const d=event.data.payload||{};event.waitUntil(panoraPushAllowed(d)?panoraShowPush(d):panoraQueuePush(d))}else if(event.data?.type==='PANORA_FLUSH_PUSH')event.waitUntil(panoraFlushPush())});
