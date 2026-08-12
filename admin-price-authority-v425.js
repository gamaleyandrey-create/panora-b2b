(()=>{
  const refresh=()=>window.panoraCloud?.refreshRestaurantPrices?.().catch(error=>console.warn('Panora price refresh',error));
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('.admin-nav [data-view="restaurants"],[data-view="restaurants"]'))setTimeout(refresh,80);
  },true);
  window.addEventListener('focus',()=>setTimeout(refresh,50));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(refresh,50)});
})();