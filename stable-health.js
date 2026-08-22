/* Panora 9.72 — runtime health + auth-safe CLEAN START local cache reset */
(function(){
 const CLEAN_MARK='panora-clean-start-local-v970';
 const CLEAN_KEYS=[
  'panora-account','panora-account-id','panora-orders','panora-payments','panora-delivery-notes','panora-restaurants',
  'panora-portal-orders','panora-portal-payments','panora-portal-delivery-notes','panora-portal-restaurants',
  'panora-partner-products','panora-production-plans','panora-bake-completions','panora-stock-movements','panora-raw-stock-movements',
  'panora-retail-orders','panora-admin-orders-watermark-v936','panora-admin-payments-watermark-v936',
  'panora-bake-completion-cloud-watermark-v934','panora-finished-stock-watermark-v934','panora-raw-stock-cloud-watermark-v934',
  'panora-retail-orders-watermark-v934','panora-cloud-restaurants-baseline-v415','panora-cloud-revisions-v285',
  'panora-delivery-confirmation-queue','panora-event-orders-v332'
 ];
 function cleanStartLocalCacheOnce(force=false){
  try{
   // Bakery/admin cleanup must happen only after successful authentication.
   // Running it on DOMContentLoaded could race the mobile session restore.
   if(!force && document.body?.classList?.contains('admin-page'))return false;
   if(localStorage.getItem(CLEAN_MARK)==='1')return false;
   CLEAN_KEYS.forEach(key=>localStorage.removeItem(key));
   localStorage.setItem(CLEAN_MARK,'1');
   window.dispatchEvent(new CustomEvent('panora:clean-start-local-cache'));
   return true;
  }catch{return false}
 }
 async function run(){
   const cleaned=cleanStartLocalCacheOnce();
   const out={build:'9720',online:navigator.onLine,serviceWorker:'serviceWorker' in navigator,fetch:typeof fetch==='function',storage:false,cleanStartCacheReset:cleaned};
   try{const k='panora-health-v9720';localStorage.setItem(k,'1');out.storage=localStorage.getItem(k)==='1';localStorage.removeItem(k)}catch{}
   window.panoraStableHealth=out;
   window.dispatchEvent(new CustomEvent('panora:stable-health',{detail:out}));
   return out;
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
 window.panoraCleanStartLocalCacheOnce=()=>cleanStartLocalCacheOnce(true);
 window.panoraRunHealthCheck=run;
})();
