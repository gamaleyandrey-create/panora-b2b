(()=>{
  const MAP_KEY='panora-admin-restaurant-prices-v420';
  const readMap=()=>{try{return JSON.parse(localStorage.getItem(MAP_KEY)||'{}')||{}}catch{return{}}};
  const moneyActive=()=>Boolean(window.panoraMoneyEditing?.active);
  const syncVisible=()=>{
    if(moneyActive())return;
    const map=readMap();
    document.querySelectorAll('#restaurantCards input[data-price]').forEach(input=>{
      const [rid,pid]=String(input.dataset.price||'').split(':');
      if(!rid||!pid)return;
      const value=map?.[rid]?.[pid];
      if(value==null||!Number.isFinite(Number(value)))return;
      const next=Number(value).toFixed(2);
      if(input.value!==next)input.value=next;
    });
  };
  window.addEventListener('panora:admin-prices-updated',()=>requestAnimationFrame(syncVisible));
  window.addEventListener('panora:restaurants-ui-refresh',()=>requestAnimationFrame(syncVisible));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(syncVisible,50)});
  window.addEventListener('focus',()=>setTimeout(syncVisible,50));
  setInterval(syncVisible,1000);
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(syncVisible,100)):setTimeout(syncVisible,100);
})();