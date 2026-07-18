/* QR confirmation prototype. The URL payload can later be replaced by a backend token. */
(function(){
  const base64url=value=>{
    const bytes=new TextEncoder().encode(JSON.stringify(value));
    let binary='';
    bytes.forEach(byte=>binary+=String.fromCharCode(byte));
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  };
  const breadName=product=>product==='plain'?'Льняной бездрожжевой хлеб с семенами':product==='pumpkin'?'Тыквенный бездрожжевой хлеб с семенами':product;
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function confirmationData(note,order,client){
    return {
      v:1,noteId:note.id,noteNumber:note.number,orderId:order?.id,
      orderNumber:order?.number,date:note.date,bakeDate:order?.date||note.date,
      deliveryDate:order?.deliveryDate||order?.date||note.date,
      restaurant:{id:client?.id,name:client?.name,address:client?.address||''},
      bakery:note.bakery||bakerySettings,
      items:note.items.map(item=>({product:item.product,name:breadName(item.product),quantity:item.quantity,price:note.prices[item.product]})),
      subtotal:note.subtotal??note.total,taxRate:note.taxRate||0,tax:note.tax||0,
      total:note.total,paid:note.paid||0,balanceAfter:note.balanceAfter
    };
  }
  function confirmationUrl(note,order,client){
    const base=new URL('confirm.html',location.href);
    base.searchParams.set('d',base64url(confirmationData(note,order,client)));
    return base.href;
  }
  window.printNote=async function(orderId){
    const note=deliveryNotes.find(item=>item.orderId===orderId),order=orders.find(item=>item.id===orderId);
    if(!note){alert('Накладная не найдена.');return}
    const client=restaurant(note.restaurantId),bakery=note.bakery||bakerySettings,url=confirmationUrl(note,order,client),taxSummary=Number(note.taxRate)>0?`Сумма без НДС: ${euro(note.subtotal??note.total)}<br>НДС ${note.taxRate}%: ${euro(note.tax||0)}<br>`:'';
    let qr;try{qr=await window.PanoraQRCode.toDataURL(url,{width:260,margin:2,errorCorrectionLevel:'M',color:{dark:'#17231c',light:'#ffffff'}})}catch{qr=`https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(url)}`}
    const w=window.open('','_blank');
    if(!w){alert('Разрешите всплывающие окна, чтобы открыть накладную.');return}
    w.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Накладная DN-${note.number}</title><style>
      body{font:15px Arial;max-width:850px;margin:32px auto;padding:0 18px;color:#17231c}h1{font:38px Georgia;margin-bottom:8px}h2{margin-top:30px}table{width:100%;border-collapse:collapse}td,th{padding:10px;border-bottom:1px solid #ccc;text-align:left}.total{text-align:right;font-size:17px;line-height:1.6}.confirmation{margin-top:30px;padding:22px;border:2px solid #31543e;border-radius:18px;display:flex;gap:24px;align-items:center}.confirmation img{width:170px;height:170px}.confirmation a{color:#31543e;word-break:break-all}.sign{margin-top:55px;display:flex;justify-content:space-between}@media(max-width:600px){.confirmation{display:block}.confirmation img{display:block;margin:auto}.sign{gap:30px}}@media print{body{margin:0}.confirmation{break-inside:avoid}}
    </style></head><body><h1>Panora</h1><p><strong>${escapeHtml(bakery.legalName||'Panora')}</strong><br>${escapeHtml(bakery.taxId||'')}<br>${escapeHtml(bakery.address||'')}<br>${escapeHtml(bakery.email||'')} ${escapeHtml(bakery.phone||'')}</p><h2>Накладная DN-${String(note.number).padStart(4,'0')}</h2><p>Дата накладной: ${escapeHtml(note.date)}<br>Дата выпечки: ${escapeHtml(order?.date||note.date)}<br>Дата доставки: ${escapeHtml(order?.deliveryDate||order?.date||note.date)}<br>Ресторан: <strong>${escapeHtml(client?.name||'—')}</strong><br>Адрес: ${escapeHtml(client?.address||'—')}</p><table><tr><th>Товар</th><th>Количество</th><th>Цена</th><th>Сумма</th></tr>${note.items.map(item=>`<tr><td>${escapeHtml(breadName(item.product))}</td><td>${item.quantity} шт.</td><td>${euro(note.prices[item.product])}</td><td>${euro(item.quantity*note.prices[item.product])}</td></tr>`).join('')}</table><p class="total">${taxSummary}Итого: <strong>${euro(note.total)}</strong><br>Оплачено: ${euro(note.paid)}<br>Задолженность после операции: ${euro(note.balanceAfter)}</p><section class="confirmation"><img src="${qr}" alt="QR-код подтверждения поставки"><div><h2>Подтверждение поставки</h2><p>Получатель сканирует QR-код, проверяет поставку и подтверждает получение. После подтверждения накладную можно сохранить или распечатать.</p><a href="${escapeHtml(url)}">Открыть подтверждение без камеры</a></div></section><div class="sign"><span>Panora __________________</span><span>Ресторан __________________</span></div><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),700));<\/script></body></html>`);
    w.document.close();
  };
  const originalOpen=window.openShipment;
  window.openShipment=function(id){
    originalOpen(id);
    const summary=document.querySelector('#shipmentSummary');
    if(summary&&!summary.querySelector('.qr-hint'))summary.insertAdjacentHTML('beforeend','<p class="qr-hint">После отгрузки в накладной появится QR-код для подтверждения рестораном.</p>');
  };
})();
