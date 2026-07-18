(function(){
 const original=orderActions;
 orderActions=function(order){const contact=`<button class="action-small order-contact-button" data-notify-order="${order.id}">Сообщить клиенту</button>`;if(order.status==='cancelled')return contact;if(order.status==='confirmed')return `${original(order)} ${contact}`;return original(order)};
 function message(order){const client=restaurant(order.restaurantId),number=`PN-${String(order.number).padStart(4,'0')}`;if(order.status==='cancelled')return `Panora: заказ ${number} на ${order.deliveryDate||order.date} отменён. Свяжитесь с нами для уточнения.`;return `Panora: заказ ${number} принят. Выпечка и доставка: ${order.deliveryDate||order.date}. Состав: ${order.items.map(item=>`${productLabel(item.product)} — ${item.quantity} шт.`).join(', ')}.`}
 function notify(id){const order=orders.find(item=>item.id===id),client=restaurant(order?.restaurantId);if(!order||!client)return;const text=message(order),phone=String(client.phone||'').replace(/\D/g,'');if(phone)window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`,'_blank','noopener');else if(client.email)location.href=`mailto:${encodeURIComponent(client.email)}?subject=${encodeURIComponent('Panora · статус заказа')}&body=${encodeURIComponent(text)}`;else navigator.clipboard?.writeText(text).then(()=>alert('Сообщение скопировано. У ресторана не указан телефон или email.'))}
 document.querySelector('#orderRows').addEventListener('click',event=>{const button=event.target.closest('[data-notify-order]');if(button)notify(button.dataset.notifyOrder)});
 renderOrders();
})();
