/* Panora v235: the basket always opens customer details before validating them. */
(()=>{
  'use strict';
  const button=document.querySelector('#checkoutButton');
  const form=document.querySelector('#checkoutForm');
  const checkout=document.querySelector('#checkoutModal');
  if(!button||!form||!checkout)return;

  const message=(ru,en,es)=>lang==='en'?en:lang==='es'?es:ru;
  const openDetails=()=>{
    if(typeof restoreCheckoutProfile==='function')restoreCheckoutProfile();
    form.restaurant.value=String(form.restaurant.value||account?.name||'').trim();
    form.contact.value=String(form.contact.value||account?.name||'').trim();
    form.email.value=String(form.email.value||account?.email||'').trim();
    form.phone.value=String(form.phone.value||account?.phone||'').trim();
    form.address.value=String(form.address.value||account?.address||'').trim();
    if(form.date)form.date.value=selectedBakeDate||document.querySelector('#cartDeliveryDate')?.value||'';
    if(typeof toggleFulfillment==='function')toggleFulfillment();
    if(typeof updateMobileCheckoutSummary==='function')updateMobileCheckoutSummary();
    const needsPhone=!String(form.phone.value||'').trim();
    const needsAddress=(form.fulfillment?.value||'delivery')==='delivery'&&!String(form.address.value||'').trim();
    if(needsPhone||needsAddress){
      form.classList.remove('returning-checkout');
      const savedSummary=document.querySelector('#savedCustomerSummary');
      if(savedSummary)savedSummary.hidden=true;
    }
    closePanels();
    window.setTimeout(()=>{
      openPanel(checkout);
      const firstMissing=[form.contact,form.phone,form.address].find(field=>field&&field.required&&!String(field.value||'').trim());
      if(firstMissing){
        firstMissing.closest('label')?.scrollIntoView({behavior:'smooth',block:'center'});
        firstMissing.focus({preventScroll:true});
      }
    },120);
  };

  button.addEventListener('click',event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    const count=cartData().count;
    if(count<MIN_PIECES){
      showToast(message(`Минимальный заказ — ${MIN_PIECES} шт.`,`Minimum order is ${MIN_PIECES} pcs.`,`Pedido mínimo: ${MIN_PIECES} uds.`));
      return;
    }
    const confirmed=document.querySelector('#confirmDeliveryDate');
    if(confirmed&&!confirmed.checked){
      showToast(message('Сначала подтвердите выбранную дату поставки','First confirm the selected delivery date','Primero confirma la fecha de entrega'));
      confirmed.closest('label')?.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }
    if(!account){
      if(typeof checkoutAfterLogin!=='undefined')checkoutAfterLogin=true;
      closePanels();
      window.setTimeout(()=>openPanel(document.querySelector('#profileModal')),120);
      return;
    }
    openDetails();
  },true);
})();
