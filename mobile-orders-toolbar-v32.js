/* Panora 3.2 — mobile notification label and sound button placement helper. */
(function(){
  'use strict';
  const desktopText='Уведомления включены';
  function isMobile(){ return window.matchMedia && window.matchMedia('(max-width: 720px)').matches; }
  function apply(){
    const btn=document.getElementById('enableAdminNotifications');
    if(!btn) return;
    if(isMobile()){
      if(!btn.dataset.panoraDesktopLabel) btn.dataset.panoraDesktopLabel=(btn.textContent||desktopText).trim()||desktopText;
      // Keep any nested icon out of the visible label, but force short mobile text.
      Array.from(btn.childNodes).forEach(function(n){
        if(n.nodeType===3) n.nodeValue='';
      });
      let label=btn.querySelector('[data-panora-mobile-notification-label]');
      if(!label){
        label=document.createElement('span');
        label.setAttribute('data-panora-mobile-notification-label','1');
        btn.appendChild(label);
      }
      label.textContent='Уведомления';
    }else{
      const label=btn.querySelector('[data-panora-mobile-notification-label]');
      if(label) label.remove();
      const text=btn.dataset.panoraDesktopLabel||desktopText;
      const hasText=Array.from(btn.childNodes).some(n=>n.nodeType===3 && (n.nodeValue||'').trim());
      if(!hasText) btn.insertBefore(document.createTextNode(text),btn.firstChild);
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
  window.addEventListener('resize',apply);
  new MutationObserver(apply).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
})();
