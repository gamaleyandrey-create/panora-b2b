/* Keep restaurant order, bakery confirmation and shipment screens in sync across tabs. */
(function(){
 const sharedKeys=new Set(['panora-restaurants','panora-orders','panora-payments','panora-delivery-notes','panora-production-plans','panora-stock-movements','panora-bakery-settings']);
 let refreshing=false,lastRefresh=0;
 function refresh(){
  if(refreshing||Date.now()-lastRefresh<120)return;refreshing=true;lastRefresh=Date.now();
  try{
   restaurants=cRead('panora-restaurants',[]);orders=cRead('panora-orders',[]);payments=cRead('panora-payments',[]);deliveryNotes=cRead('panora-delivery-notes',[]);
   bakerySettings=cRead('panora-bakery-settings',bakerySettings);plans=read('panora-production-plans',[]);movements=read('panora-stock-movements',[]);
   renderCommerce();renderAll();
   const state=document.querySelector('#saveState');if(state){state.textContent='Обновлено';setTimeout(()=>state.textContent='Сохранено',900)}
  }finally{refreshing=false}
 }
 window.addEventListener('storage',event=>{if(sharedKeys.has(event.key))refresh()});
 window.addEventListener('focus',refresh);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 window.addEventListener('pageshow',refresh);
 if('BroadcastChannel' in window){const channel=new BroadcastChannel('panora-data');channel.onmessage=refresh;window.panoraDataChannel=channel}
 window.panoraRefreshAdmin=refresh;
})();
