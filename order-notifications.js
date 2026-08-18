(function(){
 const badges=[...document.querySelectorAll('[data-new-order-count]')],button=document.querySelector('#enableAdminNotifications');
 const PREF_KEY='panora-admin-notifications-enabled',SOUND_KEY='panora-event-sound-v332';
 const pref=()=>localStorage.getItem(PREF_KEY)!=='0';
 const soundPref=()=>localStorage.getItem(SOUND_KEY)==='1';
 const liveOrders=()=>{
   try{
     if(typeof orders!=='undefined'&&Array.isArray(orders))return orders;
   }catch{}
   return cRead('panora-orders',[]);
 };
 let known=new Set(liveOrders().map(order=>order.id));
 function update(){
   const current=liveOrders(),count=current.filter(order=>String(order?.status||'')==='submitted').length;
   badges.forEach(badge=>{badge.textContent=String(count);badge.hidden=!count});
   return current;
 }
 const orderNumberLabel=order=>Number(order?.number)>0?`PN-${String(Number(order.number)).padStart(4,'0')}`:'PN-…';
 function announce(){const current=update(),fresh=current.filter(order=>order.status==='submitted'&&!known.has(order.id));fresh.forEach(order=>{known.add(order.id);if(pref()&&'Notification'in window&&Notification.permission==='granted'){const client=restaurant(order.restaurantId);new Notification('Panora · Новый заказ',{body:`${client?.name||'Партнёр'} · ${orderNumberLabel(order)}`,icon:'icon.svg',tag:`panora-order-${order.id}`})}});current.forEach(order=>known.add(order.id))}
 function dispatchSound(enabled){
   localStorage.setItem(SOUND_KEY,enabled?'1':'0');
   window.dispatchEvent(new CustomEvent('panora:notification-preference',{detail:{enabled}}));
 }
 function bellSvg(enabled){
   return enabled
    ? '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M13.7 21h-3.4"/><path d="M18 8c0-1.6-.6-3-1.6-4.1M6.3 6.3A6.1 6.1 0 0 0 6 8c0 7-3 7-3 9h14"/><path d="M3 3l18 18"/></svg>';
 }
 function ensureSoundButton(){
   if(!button)return null;
   let group=button.closest('.notification-control-group');
   if(!group){
     group=document.createElement('span');group.className='notification-control-group';
     button.parentNode.insertBefore(group,button);group.appendChild(button);
   }
   let soundButton=group.querySelector('#adminNotificationSound');
   if(!soundButton){
     soundButton=document.createElement('button');
     soundButton.type='button';soundButton.id='adminNotificationSound';soundButton.className='notification-sound-toggle';
     group.appendChild(soundButton);
   }
   const render=()=>{
     const enabled=soundPref();
     soundButton.innerHTML=bellSvg(enabled);
     soundButton.classList.toggle('sound-off',!enabled);
     soundButton.setAttribute('aria-pressed',enabled?'true':'false');
     soundButton.setAttribute('aria-label',enabled?'Выключить звук уведомлений':'Включить звук уведомлений');
     soundButton.title=enabled?'Звук уведомлений включён':'Звук уведомлений выключен';
   };
   soundButton.onclick=()=>{dispatchSound(!soundPref());render()};
   render();return soundButton;
 }
 async function renderPushButton(){
   if(!button)return;
   if(!('Notification'in window)){button.hidden=true;return}
   button.hidden=false;
   let info={active:false,reason:Notification.permission};
   try{info=await window.panoraAdminWebPush?.status?.()||info}catch{}
   const active=Boolean(info.active);
   button.innerHTML=active?'<span class="native-notification-dot" aria-hidden="true"></span><span>Push подключён</span>':'<span>Включить Push</span>';
   button.classList.toggle('notifications-active',active);
   button.classList.toggle('notifications-off',!active);
   button.setAttribute('aria-pressed',active?'true':'false');
   button.title=active?'Отключить Push на этом устройстве':'Включить Push на этом устройстве';
 }
 if(button){
   ensureSoundButton();
   renderPushButton();
   button.onclick=async()=>{
     button.disabled=true;
     try{await window.panoraAdminWebPush?.toggle?.()}
     catch(error){console.warn('Panora admin Web Push',error)}
     finally{button.disabled=false;renderPushButton();ensureSoundButton()}
   };
 }
 window.addEventListener('panora:admin-webpush-state',()=>{renderPushButton();ensureSoundButton()});
 window.addEventListener('panora:orders-updated',()=>announce());
 window.addEventListener('panora:order-status-local',()=>update());
 window.addEventListener('panora:order-cycle-updated',()=>update());
 window.addEventListener('storage',event=>{
   if(event.key==='panora-orders')announce();
   if(event.key===SOUND_KEY)ensureSoundButton();
 });
 if('BroadcastChannel'in window){const channel=new BroadcastChannel('panora-order-alerts');channel.onmessage=announce}
 const rows=document.querySelector('#orderRows');if(rows)new MutationObserver(update).observe(rows,{childList:true,subtree:true});
 update();
})();
