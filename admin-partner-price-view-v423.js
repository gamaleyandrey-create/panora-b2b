(()=>{
  const MAP_KEY='panora-admin-restaurant-prices-v420';
  const readMap=()=>{try{return JSON.parse(localStorage.getItem(MAP_KEY)||'{}')||{}}catch{return{}}};
  const syncVisible=()=>{
    const map=readMap(),active=window.panoraMoneyEditing?.element||null;
    document.querySelectorAll('#restaurantCards input[data-price]').forEach(input=>{
      if(input===active)return;
      const [rid,pid]=String(input.dataset.price||'').split(':');
      const value=map?.[rid]?.[pid];
      if(value==null||!Number.isFinite(Number(value)))return;
      const next=Number(value).toFixed(2);
      if(input.value!==next)input.value=next;
    });
    document.querySelectorAll('#restaurantCards input[data-custom-price]').forEach(input=>{
      if(input===active)return;
      const [rid,pid]=String(input.dataset.customPrice||'').split(':');
      const value=map?.[rid]?.[pid];
      if(value==null||!Number.isFinite(Number(value)))return;
      const next=Number(value).toFixed(2);
      if(input.value!==next)input.value=next;
    });
  };
  const refresh=()=>{
    window.panoraCloud?.refreshRestaurantPrices?.().catch?.(()=>{});
    setTimeout(syncVisible,80);
  };
  window.addEventListener('panora:admin-prices-updated',()=>requestAnimationFrame(syncVisible));
  window.addEventListener('focus',refresh);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
  document.addEventListener('focusout',event=>{
    if(event.target?.matches?.('#restaurantCards input[data-price],#restaurantCards input[data-custom-price]'))setTimeout(refresh,160);
  },true);
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('[data-view="restaurants"]'))setTimeout(refresh,120);
  });
})();