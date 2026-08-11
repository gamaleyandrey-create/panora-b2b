/* Panora 3.1 — compact mobile notification wording only. */
(function(){
  'use strict';
  function mobile(){ return window.matchMedia && window.matchMedia('(max-width: 720px)').matches; }
  function normalize(){
    if(!mobile()) return;
    const view=document.getElementById('view-orders');
    if(!view) return;
    const candidates=view.querySelectorAll('button, [role="button"]');
    candidates.forEach(function(el){
      const t=(el.textContent||'').trim();
      if(/Уведомления\s+включены/i.test(t)){
        el.classList.add('notifications-toggle');
        const bell=el.querySelector('svg, .icon');
        if(!el.querySelector('.notification-state-dot')){
          const dot=document.createElement('span');
          dot.className='notification-state-dot';
          el.insertBefore(dot,el.firstChild);
        }
        Array.from(el.childNodes).forEach(function(n){
          if(n.nodeType===3 && /Уведомления\s+включены/i.test(n.nodeValue||'')){
            n.nodeValue=(n.nodeValue||'').replace(/Уведомления\s+включены/ig,'Уведомления');
          }
        });
      }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',normalize,{once:true});
  else normalize();
  new MutationObserver(normalize).observe(document.documentElement,{subtree:true,childList:true});
})();
