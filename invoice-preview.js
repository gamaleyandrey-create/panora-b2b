(()=>{
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const productName=id=>{
    const lang=document.querySelector('#adminLanguage')?.value||'ru';
    const product=typeof productRegistry!=='undefined'&&productRegistry.find(item=>item.id===id);
    return product?.names?.[lang]||product?.names?.ru||(id==='plain'?'Льняной бездрожжевой хлеб с семенами':'Тыквенный бездрожжевой хлеб с семенами');
  };
  window.printNote=function(orderId){
    const note=deliveryNotes.find(item=>item.orderId===orderId),order=orders.find(item=>item.id===orderId);
    if(!note){alert('Накладная для этого заказа не найдена.');return}
    const client=restaurant(note.restaurantId)||{},bakery={...(typeof invoiceDefaults!=='undefined'?invoiceDefaults:{}),...bakerySettings,...(note.bakery||{})};
    const prefix=bakery.notePrefix||'DN-',number=`${prefix}${String(note.number).padStart(4,'0')}`;
    const history=deliveryNotes.filter(item=>item.restaurantId===note.restaurantId).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))||Number(a.number)-Number(b.number));
    const index=history.findIndex(item=>item.id===note.id),included=index<0?history:history.slice(0,index+1);
    const charged=included.reduce((sum,item)=>sum+Number(item.total||0),0);
    const paidTotal=payments.filter(item=>item.restaurantId===note.restaurantId&&item.confirmed!==false&&String(item.date)<=String(note.date)).reduce((sum,item)=>sum+Number(item.amount||0),0);
    const paidHere=payments.filter(item=>item.deliveryNoteId===note.id&&item.confirmed!==false).reduce((sum,item)=>sum+Number(item.amount||0),0);
    const balance=Math.max(0,charged-paidTotal),before=Math.max(0,balance-Number(note.total||0)+paidHere);
    document.querySelector('#invoicePreviewDialog')?.remove();
    const dialog=document.createElement('dialog');dialog.id='invoicePreviewDialog';dialog.className='invoice-preview-dialog';
    dialog.innerHTML=`<div class="invoice-preview-toolbar"><strong>Накладная ${esc(number)}</strong><button type="button" class="invoice-preview-x" aria-label="Закрыть">×</button></div><article class="invoice-sheet"><header><div><h1>Panora</h1><p><strong>${esc(bakery.legalName||'Panora')}</strong><br>${esc(bakery.taxId||'')}<br>${esc(bakery.address||'')}<br>${esc(bakery.email||'')} ${esc(bakery.phone||'')}</p></div><div class="invoice-document"><h2>${esc(bakery.noteTitle||'Накладная')}</h2><strong>${esc(number)}</strong><span>${esc(note.date)}</span></div></header><section class="invoice-meta"><p><span>Ресторан</span><strong>${esc(client.name||'—')}</strong><br>${esc(client.address||'—')}</p><p><span>Выпечка</span><strong>${esc(order?.date||note.date)}</strong><br><span>Доставка</span> <strong>${esc(order?.deliveryDate||order?.date||note.date)}</strong></p></section><div class="invoice-lines"><div class="invoice-line invoice-line-head"><span>Товар</span><span>Количество</span><span>Цена</span><span>Сумма</span></div>${note.items.map(item=>`<div class="invoice-line"><strong>${esc(productName(item.product))}</strong><span>${esc(item.quantity)} шт.</span><span>${esc(euro(note.prices[item.product]))}</span><strong>${esc(euro(item.quantity*note.prices[item.product]))}</strong></div>`).join('')}</div><section class="invoice-totals"><p><span>Итого</span><strong>${esc(euro(note.total))}</strong></p><p><span>Задолженность до поставки</span><strong>${esc(euro(before))}</strong></p><p><span>Оплачено при отгрузке</span><strong>${esc(euro(paidHere))}</strong></p><p class="invoice-balance"><span>Задолженность после операции</span><strong>${esc(euro(balance))}</strong></p></section>${bakery.paymentTerms?`<p class="invoice-note"><strong>Условия оплаты:</strong> ${esc(bakery.paymentTerms)}</p>`:''}${bakery.noteFooter?`<p class="invoice-note">${esc(bakery.noteFooter)}</p>`:''}<footer><span>${esc(bakery.bakerySignature||'Panora')} __________________</span><span>${esc(bakery.customerSignature||'Ресторан')} __________________</span></footer></article><div class="invoice-preview-actions"><button type="button" class="secondary invoice-preview-close">Закрыть</button><button type="button" class="primary invoice-preview-print">Печать / PDF</button></div>`;
    document.body.appendChild(dialog);
    const close=()=>dialog.close();dialog.querySelector('.invoice-preview-x').onclick=close;dialog.querySelector('.invoice-preview-close').onclick=close;dialog.querySelector('.invoice-preview-print').onclick=()=>window.print();dialog.onclick=event=>{if(event.target===dialog)close()};dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
  };
})();
