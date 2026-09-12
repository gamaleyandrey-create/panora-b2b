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
 const supportedLanguage=value=>['ru','en','es'].includes(String(value||'').toLowerCase())?String(value).toLowerCase():'ru';
 const copy={
   ru:{subject:'Panora · статус заказа',cancelled:(number,date)=>`Panora: заказ ${number} на ${date} отменён. Свяжитесь с нами для уточнения.`,accepted:(number,date,items)=>`Panora: заказ ${number} принят. Выпечка и доставка: ${date}. Состав: ${items}.`,piece:'шт.'},
   en:{subject:'Panora · order status',cancelled:(number,date)=>`Panora: order ${number} for ${date} has been cancelled. Please contact us if you need clarification.`,accepted:(number,date,items)=>`Panora: order ${number} has been accepted. Baking and delivery: ${date}. Items: ${items}.`,piece:'pcs'},
   es:{subject:'Panora · estado del pedido',cancelled:(number,date)=>`Panora: el pedido ${number} para el ${date} ha sido cancelado. Contacta con nosotros si necesitas alguna aclaración.`,accepted:(number,date,items)=>`Panora: el pedido ${number} ha sido aceptado. Horneado y entrega: ${date}. Productos: ${items}.`,piece:'ud.'}
 };
 function message(order,client){
   const language=supportedLanguage(client?.language),words=copy[language],number=`PN-${String(order.number).padStart(4,'0')}`,date=order.deliveryDate||order.date;
   if(order.status==='cancelled')return{language,text:words.cancelled(number,date),subject:words.subject};
   const items=order.items.map(item=>`${productLabel(item.product,language)} — ${item.quantity} ${words.piece}`).join(', ');
   return{language,text:words.accepted(number,date,items),subject:words.subject};
 }
 function notify(id){
   const order=orders.find(item=>item.id===id),client=restaurant(order?.restaurantId);if(!order||!client)return;
   const outgoing=message(order,client),phone=String(client.phone||'').replace(/\D/g,'');
   if(phone)window.open(`https://wa.me/${phone}?text=${encodeURIComponent(outgoing.text)}`,'_blank','noopener');
   else if(client.email)location.href=`mailto:${encodeURIComponent(client.email)}?subject=${encodeURIComponent(outgoing.subject)}&body=${encodeURIComponent(outgoing.text)}`;
   else navigator.clipboard?.writeText(outgoing.text).then(()=>alert(window.panoraAdminTranslateText?.('Сообщение скопировано. У партнёра не указан телефон или email.')||'Сообщение скопировано. У партнёра не указан телефон или email.'));
 }
 document.querySelector('#orderRows').addEventListener('click',event=>{const button=event.target.closest('[data-notify-order]');if(button)notify(button.dataset.notifyOrder)});
 renderOrders();
})();
