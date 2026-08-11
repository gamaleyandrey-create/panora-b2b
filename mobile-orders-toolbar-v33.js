/* Panora 3.3 — keep desktop notification wording on mobile. */
(function(){
  'use strict';
  function apply(){
    const btn=document.getElementById('enableAdminNotifications');
    if(!btn) return;
    const mobileLabel=btn.querySelector('[data-panora-mobile-notification-label]');
    if(mobileLabel) mobileLabel.remove();

    const wanted='Уведомления включены';
    const textNodes=Array.from(btn.childNodes).filter(n=>n.nodeType===3);
    let set=false;
    textNodes.forEach(function(n){
      if(!set){
        n.nodeValue=wanted;
        set=true;
      }else{
        n.nodeValue='';
      }
    });
    if(!set) btn.insertBefore(document.createTextNode(wanted),btn.firstChild);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();

  const observer=new MutationObserver(apply);
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
})();
