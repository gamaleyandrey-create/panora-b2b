/* Keep restaurant order, bakery confirmation and shipment screens in sync across tabs. */
(function(){
 const sharedKeys=new Set(['panora-restaurants','panora-orders','panora-payments','panora-delivery-notes','panora-production-plans','panora-stock-movements','panora-bakery-settings']);
 let refreshing=false,lastRefresh=0,cloudRefreshTimer=0;

 function cloudOrdersReady(){
  return Boolean(window.panoraCloud?.ready);
 }

 function requestCloudOrdersRefresh(){
  if(!cloudOrdersReady()||typeof window.panoraCloud?.refreshOrders!=='function')return;
  clearTimeout(cloudRefreshTimer);
  cloudRefreshTimer=setTimeout(()=>{
   window.panoraCloud.refreshOrders().catch(error=>{
    // Keep the last successful cloud snapshot visible on transient errors.
    console.warn('Panora order refresh',error);
   });
  },80);
 }

 function refresh(){
  if(window.panoraRecipeEditing||document.activeElement?.closest?.('#recipeList'))return;
  if(refreshing||Date.now()-lastRefresh<120)return;
  refreshing=true;lastRefresh=Date.now();
  try{
   restaurants=cRead('panora-restaurants',[]);
   // Supabase is the source of truth once cloud mode is ready.
   // Never replace the current cloud snapshot with the bounded/empty local fallback.
   if(!cloudOrdersReady())orders=cRead('panora-orders',[]);
   payments=cRead('panora-payments',[]);
   deliveryNotes=cRead('panora-delivery-notes',[]);
   bakerySettings=cRead('panora-bakery-settings',bakerySettings);
   plans=read('panora-production-plans',[]);
   movements=read('panora-stock-movements',[]);
   renderCommerce();
   renderAll();
   const state=document.querySelector('#saveState');
   if(state&&state.dataset.syncState!=='syncing'&&state.dataset.syncState!=='local'&&state.dataset.syncState!=='error'){
    state.textContent='Сохранено';
    state.dataset.syncState='synced';
   }
  }finally{
   refreshing=false;
  }
 }

 window.addEventListener('storage',event=>{
  if(!sharedKeys.has(event.key))return;
  // A local order-cache write from cloud-sync must not feed back into live cloud orders.
  refresh();
 });
 window.addEventListener('focus',()=>{
  refresh();
  requestCloudOrdersRefresh();
 });
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden)return;
  refresh();
  requestCloudOrdersRefresh();
 });
 window.addEventListener('pageshow',()=>{
  refresh();
  requestCloudOrdersRefresh();
 });
 if('BroadcastChannel' in window){
  const channel=new BroadcastChannel('panora-data');
  channel.onmessage=refresh;
  window.panoraDataChannel=channel;
 }
 window.panoraRefreshAdmin=refresh;
})();
