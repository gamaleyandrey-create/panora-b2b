/* Panora 4.4 — live retail/wholesale price propagation. */
(function(){
 'use strict';

 const parse=(key,fallback=[])=>{
   try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}
 };

 function currentAccountId(){
   return localStorage.getItem('panora-account-id')||localStorage.getItem('panora-account')||'';
 }

 function refreshClientPrices(){
   /* app client functions live in global script scope; events are the safe public bridge */
   window.dispatchEvent(new CustomEvent('panora:pricing-refresh',{
     detail:{accountId:currentAccountId()}
   }));
 }

 window.panoraPricing={
   refresh:refreshClientPrices,
   notifyRetail(productId,price){
     window.dispatchEvent(new CustomEvent('panora:retail-price-changed',{detail:{productId,price}}));
     refreshClientPrices();
   },
   notifyWholesale(restaurantId,productId,price){
     window.dispatchEvent(new CustomEvent('panora:wholesale-price-changed',{detail:{restaurantId,productId,price}}));
     refreshClientPrices();
   }
 };

 window.addEventListener('storage',event=>{
   if(event.key==='panora-products'||event.key==='panora-public-products'||event.key==='panora-partner-products'||event.key==='panora-restaurants')refreshClientPrices();
 });
})();

/* Panora 5.72 — explicit cart item removal.
   Works even when a product has no upcoming bake and the quantity selector is hidden. */
(function(){
 'use strict';

 const t={
   ru:{remove:'Удалить',removed:'Товар удалён из корзины'},
   en:{remove:'Remove',removed:'Item removed from basket'},
   es:{remove:'Eliminar',removed:'Producto eliminado de la cesta'}
 };

 const currentLang=()=>{
   const value=String(window.lang||document.documentElement.lang||'ru').toLowerCase();
   return value.startsWith('es')?'es':value.startsWith('en')?'en':'ru';
 };

 function readCart(){
   try{return JSON.parse(localStorage.getItem('panora-cart')||'{}')||{}}catch{return{}}
 }

 function removeItem(id){
   const key=String(id||'');
   if(!key)return;
   try{
     if(typeof setQty==='function'){
       setQty(key,0);
     }else{
       const saved=readCart();
       delete saved[key];
       localStorage.setItem('panora-cart',JSON.stringify(saved));
       try{ if(typeof cart==='object'&&cart) delete cart[key]; }catch(_){}
       try{ if(typeof renderProducts==='function') renderProducts(); }catch(_){}
       try{ if(typeof renderCart==='function') renderCart(); }catch(_){}
     }
     try{ if(typeof showToast==='function') showToast(t[currentLang()].removed); }catch(_){}
   }catch(error){
     console.warn('Panora cart remove',error);
   }
 }

 function identifyProduct(item,index){
   const select=item.querySelector('[data-qty-select]');
   if(select?.dataset?.qtySelect)return String(select.dataset.qtySelect);

   const saved=readCart();
   const activeKeys=Object.keys(saved).filter(key=>Number(saved[key])>0);
   if(activeKeys[index])return String(activeKeys[index]);

   const name=String(item.querySelector('.cart-item-name')?.textContent||'').trim();
   try{
     if(Array.isArray(PRODUCTS)&&typeof pText==='function'){
       const found=PRODUCTS.find(product=>String(pText(product)?.[0]||'').trim()===name);
       if(found?.id!=null)return String(found.id);
     }
   }catch(_){}
   return '';
 }

 function enhanceCart(){
   const root=document.getElementById('cartItems');
   if(!root)return;
   const items=[...root.querySelectorAll('.cart-item')];

   items.forEach((item,index)=>{
     if(item.querySelector('[data-cart-remove]'))return;
     const id=identifyProduct(item,index);
     if(!id)return;

     const button=document.createElement('button');
     button.type='button';
     button.className='cart-remove-button';
     button.dataset.cartRemove=id;
     button.setAttribute('aria-label',t[currentLang()].remove);
     button.innerHTML='<span aria-hidden="true">×</span><em>'+t[currentLang()].remove+'</em>';
     button.addEventListener('click',()=>removeItem(id));

     const content=item.querySelector('.cart-item-name')?.parentElement||item;
     content.appendChild(button);
   });
 }

 function install(){
   if(!document.getElementById('panora-cart-remove-style')){
     const style=document.createElement('style');
     style.id='panora-cart-remove-style';
     style.textContent=`
       .cart-remove-button{
         margin-top:10px;padding:7px 12px;border:1px solid #b34b3f;border-radius:10px;
         background:transparent;color:#a94337;font:inherit;font-size:14px;font-weight:700;
         cursor:pointer;display:inline-flex;align-items:center;gap:6px
       }
       .cart-remove-button span{font-size:20px;line-height:1}
       .cart-remove-button em{font-style:normal}
       .cart-remove-button:hover{background:#fff3f0}
       @media(max-width:700px){
         .cart-remove-button{min-height:40px;padding:8px 12px;font-size:15px}
       }
     `;
     document.head.appendChild(style);
   }

   enhanceCart();

   const root=document.getElementById('cartItems');
   if(root){
     const observer=new MutationObserver(()=>enhanceCart());
     observer.observe(root,{childList:true,subtree:true});
   }

   window.addEventListener('panora:language-changed',()=>setTimeout(enhanceCart,0));
 }

 if(document.readyState==='loading'){
   document.addEventListener('DOMContentLoaded',install,{once:true});
 }else{
   install();
 }
})();
