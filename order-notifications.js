(function(){
 const badges=[...document.querySelectorAll('[data-new-order-count]')],button=document.querySelector('#enableAdminNotifications');
 let known=new Set(cRead('panora-orders',[]).map(order=>order.id));
 function update(){const current=cRead('panora-orders',[]),count=current.filter(order=>order.status==='submitted').length;badges.forEach(badge=>{badge.textContent=count;badge.hidden=!count});return current}
 function announce(){const current=update(),fresh=current.filter(order=>order.status==='submitted'&&!known.has(order.id));fresh.forEach(order=>{known.add(order.id);if('Notification'in window&&Notification.permission==='granted'){const client=restaurant(order.restaurantId);new Notification('Panora · Новый заказ',{body:`${client?.name||'Ресторан'} · PN-${String(order.number).padStart(4,'0')}`,icon:'icon.svg',tag:`panora-order-${order.id}`})}});current.forEach(order=>known.add(order.id))}
 if(button){if(!('Notification'in window)){button.hidden=true}else{const label=()=>button.textContent=Notification.permission==='granted'?'Уведомления включены':'Включить уведомления';label();button.onclick=async()=>{const result=await Notification.requestPermission();label();if(result==='granted')new Notification('Panora',{body:'Уведомления о новых заказах включены.',icon:'icon.svg'})}}}
 window.addEventListener('storage',event=>{if(event.key==='panora-orders')announce()});
 if('BroadcastChannel'in window){const channel=new BroadcastChannel('panora-order-alerts');channel.onmessage=announce}
 const rows=document.querySelector('#orderRows');if(rows)new MutationObserver(update).observe(rows,{childList:true,subtree:true});
 update();
})();
