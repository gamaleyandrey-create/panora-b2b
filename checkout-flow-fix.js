/* Panora v250: the basket always opens checkout before customer validation. */
(()=>{
  'use strict';
  const oldButton=document.querySelector('#checkoutButton');
  const form=document.querySelector('#checkoutForm');
  const checkout=document.querySelector('#checkoutModal');
  if(!oldButton||!form||!checkout)return;

  /*
   * Replace the node after all older scripts have loaded. This removes stale
   * onclick/capture listeners which validated phone/address while the basket
   * was still open (most visible in iOS standalone mode).
   */
  const button=oldButton.cloneNode(true);
  button.type='button';
  button.setAttribute('type','button');
  oldButton.replaceWith(button);

  const message=(ru,en,es)=>lang==='en'?en:lang==='es'?es:ru;
  const openDetails=()=>{
    if(typeof restoreCheckoutProfile==='function')restoreCheckoutProfile();
    form.restaurant.value=String(form.restaurant.value||account?.name||'').trim();
    form.contact.value=String(form.contact.value||account?.name||'').trim();
    form.email.value=String(form.email.value||account?.email||'').trim();
    form.phone.value=String(form.phone.value||(typeof checkoutContactValue==='function'?checkoutContactValue('phone',account?.phone):account?.phone)||'').trim();
    form.address.value=String(form.address.value||(typeof checkoutContactValue==='function'?checkoutContactValue('address',account?.address):account?.address)||'').trim();
    if(form.date)form.date.value=selectedBakeDate||document.querySelector('#cartDeliveryDate')?.value||'';
    if(form.fulfillment&&!['delivery','pickup'].includes(String(form.fulfillment.value||''))){
      form.fulfillment.value='delivery';
      if(!form.fulfillment.value&&form.fulfillment.options.length)form.fulfillment.selectedIndex=0;
    }
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
    openPanel(checkout);
  };

  const startCheckout=event=>{
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    const count=cartData().count;
    const bakeSelect=document.querySelector('#cartDeliveryDate');
    const dateReady=Boolean(bakeSelect?.value&&!bakeSelect?.disabled);
    if(!dateReady){
      showToast(message('Выберите день выпечки','Choose the bake day','Elige el día de horneado'));
      bakeSelect?.closest('label')?.scrollIntoView({behavior:'smooth',block:'center'});
      bakeSelect?.focus();
      return;
    }
    if(!account){
      if(typeof checkoutAfterLogin!=='undefined')checkoutAfterLogin=true;
      closePanels();
      window.setTimeout(()=>openPanel(document.querySelector('#profileModal')),120);
      return;
    }
    openDetails();
  };

  /*
   * iOS standalone mode can restore an older form association for a button
   * after a cached page is revived. Catch the click before any legacy handler
   * can turn it into a checkoutForm submit.
   */
  document.addEventListener('click',event=>{
    if(!event.target.closest?.('#checkoutButton'))return;
    startCheckout(event);
  },true);
})();
