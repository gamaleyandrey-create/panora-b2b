(()=>{
  const oldRender=window.renderRestaurants;
  if(typeof oldRender==='function'){
    window.renderRestaurants=function(){
      if(document.querySelector('#view-restaurants')?.classList.contains('active')&&window.panoraDirectPartnerPrices)return;
      return oldRender.apply(this,arguments);
    };
  }
})();