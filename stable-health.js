/* Panora 9.75 — runtime health + one-time CLEAN START partner data reset */
(function(){
 const CLEAN_MARK='panora-clean-start-local-v975';
 const CLEAN_KEYS=[
  // Partner identity and B2B operational data from the training period.
  'panora-account','panora-account-id','panora-current-user','panora-partner-authenticated','panora-restaurant-cloud-session',
  'panora-orders','panora-payments','panora-delivery-notes','panora-restaurants','panora-shipments','panora-invoices','panora-last-order',
  'panora-portal-orders','panora-portal-payments','panora-portal-delivery-notes','panora-portal-restaurants',
  'panora-admin-restaurant-prices-v420','panora-partner-products',
  // B2B notifications, communication and delivery queues.
  'panora-delivery-confirmation-queue','panora-event-orders-v332','panora-order-alerts','panora-admin-pending-order-alerts-v25',
  'panora-order-counts-cache','panora-order-message-cache-v1','panora-order-message-unread-v1','panora-reminder-log','panora-48h-note',
  // B2B sync baselines/watermarks that must not re-introduce the training state.
  'panora-admin-orders-watermark-v936','panora-admin-payments-watermark-v936',
  // Production training history must also start empty: it feeds Purchasing archive and finished bread stock.
  'panora-production-plans','panora-bake-completions','panora-bake-completion-cloud-watermark-v934','panora-cancelled-bake-dates','panora-purchase-selected-dates',
  // Warehouse clean slate: raw materials + finished bread and their cloud watermarks.
  'panora-raw-stock-movements','panora-stock-movements','panora-raw-stock-cloud-watermark-v934','panora-finished-stock-watermark-v934',
  'panora-cloud-restaurants-baseline-v415','panora-cloud-revisions-v285','panora-cloud-baselines-v323','panora-cloud-backups-v286',
  'panora-cloud-conflicts-v285','panora-cloud-pending-v283','panora-cloud-accepted-v317','panora-sync-backup','panora-recovery-snapshots-v331'
 ];
 const CLEAN_PREFIXES=[
  'panora-order-attempt-',
  'panora-form-draft-v3258:',
  'panora-cloud-pending-',
  'panora-cloud-conflicts-',
  'panora-document-meta-'
 ];
 function cleanStartLocalCacheOnce(){
  try{
   if(localStorage.getItem(CLEAN_MARK)==='1')return false;
   CLEAN_KEYS.forEach(key=>localStorage.removeItem(key));
   const remove=[];
   for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i)||'';
    if(CLEAN_PREFIXES.some(prefix=>key.startsWith(prefix)))remove.push(key);
   }
   remove.forEach(key=>localStorage.removeItem(key));
   localStorage.setItem(CLEAN_MARK,'1');
   window.dispatchEvent(new CustomEvent('panora:clean-start-local-cache',{detail:{removed:CLEAN_KEYS.length+remove.length}}));
   return true;
  }catch{return false}
 }
 async function run(){
   const cleaned=cleanStartLocalCacheOnce();
   const out={build:'9750',online:navigator.onLine,serviceWorker:'serviceWorker' in navigator,fetch:typeof fetch==='function',storage:false,cleanStartCacheReset:cleaned};
   try{const k='panora-health-v9750';localStorage.setItem(k,'1');out.storage=localStorage.getItem(k)==='1';localStorage.removeItem(k)}catch{}
   window.panoraStableHealth=out;
   window.dispatchEvent(new CustomEvent('panora:stable-health',{detail:out}));
   return out;
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
 window.panoraRunHealthCheck=run;
})();
