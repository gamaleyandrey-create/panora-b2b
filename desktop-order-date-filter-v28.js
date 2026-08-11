/* Panora 2.8 — desktop-only reliable date picker opening.
   Mobile behavior is intentionally left to the native browser implementation. */
(function(){
  'use strict';
  function isDesktop(){
    return window.matchMedia && window.matchMedia('(min-width: 721px)').matches;
  }
  function bindDatePicker(id){
    const input=document.getElementById(id);
    if(!input || input.dataset.panoraDesktopPicker==='1') return;
    input.dataset.panoraDesktopPicker='1';
    input.addEventListener('click', function(){
      if(!isDesktop()) return;
      if(typeof input.showPicker==='function'){
        try{ input.showPicker(); }catch(_err){}
      }
    });
    input.addEventListener('keydown', function(event){
      if(!isDesktop()) return;
      if((event.key==='Enter' || event.key===' ') && typeof input.showPicker==='function'){
        event.preventDefault();
        try{ input.showPicker(); }catch(_err){}
      }
    });
  }
  function init(){
    bindDatePicker('orderDateFromFilter');
    bindDatePicker('orderDateToFilter');
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  }else{
    init();
  }
})();
