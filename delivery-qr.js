/* QR contains only an opaque token. Delivery data always comes from Supabase after RLS verification. */
(function(){
  const name=p=>typeof commerceProductLabel==='function'?commerceProductLabel(p):(p==='plain'?'Льняной бездрожжевой хлеб с семенами':p==='pumpkin'?'Тыквенный бездрожжевой хлеб с семенами':p);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function token(note){
    note.qrToken ||= crypto.randomUUID();
    localStorage.setItem('panora-delivery-notes',JSON.stringify(deliveryNotes));
    window.panoraCloud?.queueFinance?.();
    return note.qrToken;
  }
  function url(note){const value=new URL('confirm.html',location.href);value.searchParams.set('t',token(note));return value.href}
  async function qr(note){
    const link=url(note);
    if(!window.PanoraQRCode?.toDataURL)throw new Error('QR module is not loaded');
    return{link,image:await window.PanoraQRCode.toDataURL(link,{width:420,margin:2,errorCorrectionLevel:'M'})}
  }
  window.panoraDeliveryQr={url,qr};
  const close=()=>document.querySelector('#deliveryQrDialog')?.remove();
  window.showDeliveryQr=async orderId=>{
    const note=deliveryNotes.find(n=>n.orderId===orderId),order=orders.find(o=>o.id===orderId);if(!note)return alert('Поставка не найдена.');
    let code;try{code=await qr(note)}catch(error){console.error(error);alert('Не удалось сформировать QR-код. Обновите страницу и попробуйте ещё раз.');return}
    const client=restaurant(note.restaurantId);close();
    const deliveryDate=order?.deliveryDate||order?.date||note.date;
    const deliveryLabel=typeof orderDateLabel==='function'?orderDateLabel(deliveryDate,true):deliveryDate;
    document.body.insertAdjacentHTML('beforeend',`<dialog id="deliveryQrDialog" class="modal delivery-qr-modal"><form method="dialog" class="dialog-card"><button class="modal-close" type="button" aria-label="Закрыть">×</button><p class="eyebrow">PANORA · ПОСТАВКА</p><h2>Подтверждение получения</h2><p><strong>${esc(client?.name)}</strong> · PN-${String(order?.number||'—').padStart(4,'0')}</p><img class="delivery-qr-image" src="${code.image}" alt="QR-код"><p class="delivery-qr-help"><strong>Дата поставки: ${esc(deliveryLabel)}</strong></p><div class="delivery-qr-items">${note.items.map(i=>`<span>${esc(name(i.product))}</span><strong>${i.quantity} шт.</strong>`).join('')}</div><div class="delivery-qr-actions"><button class="primary qr-close" type="button">Готово</button><button class="secondary qr-invoice" type="button">Открыть накладную</button></div></form></dialog>`);
    const d=document.querySelector('#deliveryQrDialog');d.querySelector('.modal-close').onclick=close;d.querySelector('.qr-close').onclick=close;d.querySelector('.qr-invoice').onclick=()=>{close();printNote(orderId)};d.onclick=e=>{if(e.target===d)close()};d.showModal();
  };
  /* Orders are repeatedly redrawn after cloud synchronization. Delegation keeps
     the QR action alive even when the original button node is replaced. */
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-delivery-qr]');
    if(!button)return;
    event.preventDefault();
    event.stopPropagation();
    window.showDeliveryQr(button.dataset.deliveryQr);
  },true);
  const oldPrint=window.printNote,shipmentButton=document.querySelector('#confirmShipment');let openingShipmentQr=false;
  if(shipmentButton?.onclick){const oldShipment=shipmentButton.onclick;shipmentButton.onclick=function(event){openingShipmentQr=true;try{return oldShipment.call(this,event)}finally{setTimeout(()=>{openingShipmentQr=false},1000)}}}
  window.printNote=async function(orderId){
    if(openingShipmentQr){openingShipmentQr=false;return window.showDeliveryQr(orderId)}
    const result=oldPrint(orderId),note=deliveryNotes.find(n=>n.orderId===orderId);
    if(!note)return result;
    try{
      const code=await qr(note),sheet=document.querySelector('#invoicePreviewDialog .invoice-sheet');
      if(sheet&&!sheet.querySelector('.invoice-qr')){
        const footer=sheet.querySelector('footer');
        footer?.insertAdjacentHTML('beforebegin',`<section class="invoice-qr" aria-label="QR-код подтверждения поставки"><img src="${code.image}" alt="QR-код подтверждения поставки"></section>`);
      }
    }catch(error){console.error('Invoice QR:',error)}
    return result;
  };
  const oldOpen=window.openShipment;
  window.openShipment=function(id){oldOpen(id);const s=document.querySelector('#shipmentSummary');if(s&&!s.querySelector('.qr-hint'))s.insertAdjacentHTML('beforeend','<p class="qr-hint">После отгрузки откроется защищённый QR-код. Накладная останется отдельной кнопкой.</p>')};
})();
