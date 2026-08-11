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
   if(event.key==='panora-products'||event.key==='panora-restaurants')refreshClientPrices();
 });
})();
