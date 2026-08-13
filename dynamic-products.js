(()=>{
 const builtInFallbacks=new Map(PRODUCTS.filter(p=>['plain','pumpkin'].includes(p.id)).map(p=>[p.id,{...p}]));
 function readManaged(){try{return JSON.parse(localStorage.getItem('panora-public-products')||localStorage.getItem('panora-partner-products')||localStorage.getItem('panora-products')||'[]')}catch{return[]}}
 function toCatalogProduct(p){
  const fallback=builtInFallbacks.get(p.id)||{};
  const ru=p.names?.ru||fallback.text?.ru?.[0]||p.id;
  const en=p.names?.en||ru,es=p.names?.es||ru;
  const retailPrice=Number(p.basePrice??fallback.retailPrice??fallback.price??0),wholesalePrice=Number(account&&account.prices?.[p.id]!=null?account.prices[p.id]:retailPrice),wholesaleMinQty=Math.max(1,Number(p.wholesaleMinQty||fallback.wholesaleMinQty||12));return{id:p.id,category:fallback.category||'yeastfree',price:wholesalePrice,retailPrice,wholesalePrice,wholesaleMinQty,pieces:wholesaleMinQty,weight:Number(p.weight||fallback.weight||600),image:p.image||fallback.image||'icon.svg',bg:fallback.bg||'#e9dfca',text:{ru:[ru,p.descriptions?.ru||fallback.text?.ru?.[1]||'',ru],en:[en,p.descriptions?.en||fallback.text?.en?.[1]||'',en],es:[es,p.descriptions?.es||fallback.text?.es?.[1]||'',es]}};
 }
 function refreshRestaurantProducts(){
  try{
   const managed=readManaged().filter(p=>p&&p.active!==false);
   const accountId=localStorage.getItem('panora-account-id');
   const restaurantKey=localStorage.getItem('panora-portal-restaurants')?'panora-portal-restaurants':'panora-restaurants';
   const restaurants=JSON.parse(localStorage.getItem(restaurantKey)||'[]');
   if(accountId){
    const fresh=restaurants.find(r=>String(r.id)===String(accountId));
    if(fresh)account=fresh;
   }

   const rebuilt=managed.map(toCatalogProduct);
   if(rebuilt.length){
    PRODUCTS.splice(0,PRODUCTS.length,...rebuilt);
   }else{
    PRODUCTS.forEach(product=>{
     if(account?.prices?.[product.id]!=null)product.price=Number(account.prices[product.id]);
    });
   }

   renderProducts?.();
   renderCart?.();
   try{renderAccountModal?.()}catch(_){}
  }catch(error){console.warn('Panora pricing refresh failed',error)}
 }
 window.refreshRestaurantProducts=refreshRestaurantProducts;
 window.addEventListener('panora:products-changed',refreshRestaurantProducts);
 window.addEventListener('panora:public-products-changed',refreshRestaurantProducts);
 window.addEventListener('panora:pricing-refresh',refreshRestaurantProducts);
 window.addEventListener('panora:retail-price-changed',refreshRestaurantProducts);
 window.addEventListener('panora:wholesale-price-changed',refreshRestaurantProducts);

 window.addEventListener('storage',event=>{
  if(event.key==='panora-products'||event.key==='panora-public-products'||event.key==='panora-partner-products'||event.key==='panora-restaurants'){
   if(event.key==='panora-restaurants'&&typeof restoreAccount==='function')restoreAccount();
   refreshRestaurantProducts();
  }
 });
 const baseApply=applyAccount;
 applyAccount=function(){baseApply();refreshRestaurantProducts()};
 function fixNames(){if(!account)return;const orders=portalOrders().filter(o=>o.restaurantId===account.id).slice().reverse(),rows=[...document.querySelectorAll('.account-order')];rows.forEach((row,oi)=>row.querySelectorAll('li').forEach((li,ii)=>{const item=orders[oi]?.items[ii],product=PRODUCTS.find(p=>p.id===item?.product),name=product?pText(product)[0]:'';if(name&&li.firstElementChild&&li.firstElementChild.textContent!==name)li.firstElementChild.textContent=name}))}
 new MutationObserver(()=>requestAnimationFrame(fixNames)).observe(document.querySelector('#profileModal'),{childList:true,subtree:true});
 refreshRestaurantProducts();renderAccountModal();fixNames();
})();
