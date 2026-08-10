(function(){
 const original=orderActions;
 orderActions=function(order){
   const contact=`<button class="action-small order-contact-button" data-notify-order="${order.id}"><svg class="order-contact-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.2a7.6 7.6 0 0 1-8 7.3 8.7 8.7 0 0 1-3.2-.6L4 20l1.5-4a7 7 0 0 1-1.2-3.9A7.6 7.6 0 0 1 12 4.5c4.4 0 8 3 8 6.7Z"/><path d="M9.1 11.6h.01M12 11.6h.01M14.9 11.6h.01"/></svg><span>Сообщить клиенту</span></button>`;
   const rendered=original(order);
   if(order.status==='cancelled')return contact;
   if(order.status==='confirmed'){
     return rendered.replace(/(<button class="action-small danger-quiet"[^>]*>.*?<\/button>)/,`${contact}$1`);
   }
   return rendered;
 };
 function message(order){const client=restaurant(order.restaurantId),number=`PN-${String(order.number).padStart(4,'0')}`;if(order.status==='cancelled')return `Panora: заказ ${number} на ${order.deliveryDate||order.date} отменён. Свяжитесь с нами для уточнения.`;return `Panora: заказ ${number} принят. Выпечка и доставка: ${order.deliveryDate||order.date}. Состав: ${order.items.map(item=>`${productLabel(item.product)} — ${item.quantity} шт.`).join(', ')}.`}
 function notify(id){const order=orders.find(item=>item.id===id),client=restaurant(order?.restaurantId);if(!order||!client)return;const text=message(order),phone=String(client.phone||'').replace(/\D/g,'');if(phone)window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`,'_blank','noopener');else if(client.email)location.href=`mailto:${encodeURIComponent(client.email)}?subject=${encodeURIComponent('Panora · статус заказа')}&body=${encodeURIComponent(text)}`;else navigator.clipboard?.writeText(text).then(()=>alert('Сообщение скопировано. У партнёра не указан телефон или email.'))}
 document.querySelector('#orderRows').addEventListener('click',event=>{const button=event.target.closest('[data-notify-order]');if(button)notify(button.dataset.notifyOrder)});
 renderOrders();
})();
