(function(){
  const root=document.querySelector('#deliveryCard');
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money=value=>`${new Intl.NumberFormat('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0)} €`;
  function decode(token){
    const normalized=token.replace(/-/g,'+').replace(/_/g,'/'),binary=atob(normalized.padEnd(Math.ceil(normalized.length/4)*4,'='));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary,char=>char.charCodeAt(0))));
  }
  let data;
  try{data=decode(new URLSearchParams(location.search).get('d')||'');if(data.v!==1||!data.noteId||!Array.isArray(data.items))throw new Error()}catch{root.innerHTML='<div class="error"><strong>Ссылка недействительна.</strong><br>Попросите пекарню открыть накладную повторно и показать новый QR-код.</div>';return}
  const key=`panora-confirmation-${data.noteId}`,saved=JSON.parse(localStorage.getItem(key)||'null');
  function invoice(status){
    root.innerHTML=`${status?`<div class="success"><strong>Поставка подтверждена</strong><br>${new Date(status.confirmedAt).toLocaleString('ru-RU')}${status.receiver?` · ${escapeHtml(status.receiver)}`:''}</div>`:''}<h2>Накладная DN-${String(data.noteNumber).padStart(4,'0')}</h2><div class="meta"><div><small>Ресторан</small><strong>${escapeHtml(data.restaurant?.name||'—')}</strong><br>${escapeHtml(data.restaurant?.address||'')}</div><div><small>Дата поставки</small><strong>${escapeHtml(data.deliveryDate)}</strong><br>Выпечка: ${escapeHtml(data.bakeDate)}</div></div><table class="items"><thead><tr><th>Товар</th><th>Кол-во</th><th>Сумма</th></tr></thead><tbody>${data.items.map(item=>`<tr><td>${escapeHtml(item.name)}</td><td>${item.quantity} шт.</td><td>${money(item.quantity*item.price)}</td></tr>`).join('')}</tbody></table><p class="total">Итого: <strong>${money(data.total)}</strong></p>${status?`<div class="actions"><button onclick="window.print()">Распечатать накладную</button><a class="button secondary" target="_blank" rel="noopener" href="https://wa.me/34611187640?text=${encodeURIComponent(`Panora: поставка DN-${data.noteNumber} получена рестораном ${data.restaurant?.name||''}. Получатель: ${status.receiver||'не указан'}.`)}">Сообщить в WhatsApp</a></div>`:`<form id="confirmForm" class="confirm-form"><label><span>Имя получателя</span><input name="receiver" type="text" autocomplete="name" required placeholder="Имя и фамилия"></label><label class="check"><input name="accepted" type="checkbox" required><span>Количество и состояние товара проверены. Подтверждаю получение поставки.</span></label><button type="submit">Подтвердить получение</button></form>`}`;
    if(!status)document.querySelector('#confirmForm').onsubmit=event=>{event.preventDefault();const form=new FormData(event.currentTarget),confirmation={confirmedAt:new Date().toISOString(),receiver:form.get('receiver')};localStorage.setItem(key,JSON.stringify(confirmation));invoice(confirmation);scrollTo({top:0,behavior:'smooth'})};
  }
  invoice(saved);
})();
