(function(){
 const tabs=[...document.querySelectorAll('[data-mobile-view]')],more=document.querySelector('#adminMobileMore'),menuButton=document.querySelector('#adminMenuToggle');
 if(!tabs.length)return;
 function select(view){const target=document.querySelector(`.admin-nav button[data-view="${view}"]`);if(target)target.click();sync(view);scrollTo({top:0,behavior:'smooth'})}
 function sync(view){tabs.forEach(tab=>tab.classList.toggle('active',tab.dataset.mobileView===view));more?.classList.toggle('active',!['plan','orders','accounting'].includes(view))}
 tabs.forEach(tab=>tab.onclick=()=>select(tab.dataset.mobileView));
 more.onclick=()=>menuButton?.click();
 document.querySelectorAll('.admin-nav button[data-view]').forEach(button=>button.addEventListener('click',()=>sync(button.dataset.view)));
 const active=document.querySelector('.admin-nav button.active[data-view]');sync(active?.dataset.view||'plan');
})();
