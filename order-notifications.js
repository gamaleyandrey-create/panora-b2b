(function(){
 const badges=[...document.querySelectorAll('[data-new-order-count]')],button=document.querySelector('#enableAdminNotifications');
 const PREF_KEY='panora-admin-notifications-enabled',SOUND_KEY='panora-event-sound-v332';
 const pref=()=>localStorage.getItem(PREF_KEY)!=='0';
 let known=new Set(cRead('panora-orders',[]).map(order=>order.id));
 function update(){const current=cRead('panora-orders',[]),count=current.filter(order=>order.status==='submitted').length;badges.forEach(badge=>{badge.textContent=count;badge.hidden=!count});return current}
 function announce(){const current=update(),fresh=current.filter(order=>order.status==='submitted'&&!known.has(order.id));fresh.forEach(order=>{known.add(order.id);if(pref()&&'Notification'in window&&Notification.permission==='granted'){const client=restaurant(order.restaurantId);new Notification('Panora · Новый заказ',{body:`${client?.name||'Партнёр'} · PN-${String(order.number).padStart(4,'0')}`,icon:'icon.svg',tag:`panora-order-${order.id}`})}});current.forEach(order=>known.add(order.id))}
 if(button){if(!('Notification'in window)){button.hidden=true}else{
   const syncSound=enabled=>{
     localStorage.setItem(SOUND_KEY,enabled?'1':'0');
     window.dispatchEvent(new CustomEvent('panora:notification-preference',{detail:{enabled}}));
   };
   const label=()=>{
     const permission=Notification.permission;
     const active=permission==='granted'&&pref();
     button.textContent=active?'● Уведомления включены':permission==='granted'?'Уведомления выключены':'Включить уведомления';
     button.classList.toggle('notifications-active',active);
     button.classList.toggle('notifications-off',permission==='granted'&&!active);
     button.setAttribute('aria-pressed',active?'true':'false');
     button.title=active?'Нажмите, чтобы выключить уведомления':'Нажмите, чтобы включить уведомления';
   };
   label();
   button.onclick=async()=>{
     if(Notification.permission!=='granted'){
       const result=await Notification.requestPermission();
       if(result==='granted'){
         localStorage.setItem(PREF_KEY,'1');
         syncSound(true);
         new Notification('Panora',{body:'Уведомления о новых заказах включены.',icon:'icon.svg'});
       }
       label();return;
     }
     const enabled=!pref();
     localStorage.setItem(PREF_KEY,enabled?'1':'0');
     syncSound(enabled);
     label();
   };
 }}
 window.addEventListener('storage',event=>{if(event.key==='panora-orders')announce()});
 if('BroadcastChannel'in window){const channel=new BroadcastChannel('panora-order-alerts');channel.onmessage=announce}
 const rows=document.querySelector('#orderRows');if(rows)new MutationObserver(update).observe(rows,{childList:true,subtree:true});
 update();
})();
