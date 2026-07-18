(function(){
 const button=document.querySelector('#adminMenuToggle'),navigation=document.querySelector('#adminNavigation');
 if(!button||!navigation)return;
 button.dataset.ready='1';
 const setOpen=open=>{document.body.classList.toggle('admin-menu-open',open);button.setAttribute('aria-expanded',String(open));button.querySelector('span').textContent=open?'×':'☰'};
 button.onclick=event=>{event.stopPropagation();setOpen(!document.body.classList.contains('admin-menu-open'))};
 navigation.querySelectorAll('button[data-view]').forEach(item=>item.addEventListener('click',()=>setOpen(false)));
 document.addEventListener('click',event=>{if(document.body.classList.contains('admin-menu-open')&&!navigation.contains(event.target)&&event.target!==button)setOpen(false)});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')setOpen(false)});
 window.addEventListener('resize',()=>{if(innerWidth>720)setOpen(false)});
})();
