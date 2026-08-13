(()=>{
  const oldRender=window.renderRestaurants;
  if(typeof oldRender==='function'){
    window.renderRestaurants=function(){
      if(document.querySelector('#view-restaurants')?.classList.contains('active')&&window.panoraDirectPartnerPrices?.renderCurrent){
        window.panoraDirectPartnerPrices.renderCurrent();
        return;
      }
      return oldRender.apply(this,arguments);
    };
  }
})();