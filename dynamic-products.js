(()=>{
 const builtInFallbacks=new Map(PRODUCTS.filter(p=>['plain','pumpkin'].includes(p.id)).map(p=>[p.id,{...p}]));
 function readManaged(){try{return JSON.parse(localStorage.getItem('panora-products')||'[]')}catch{return[]}}
 function toCatalogProduct(p){
  const fallback=builtInFallbacks.get(p.id)||{};
  const ru=p.names?.ru||fallback.text?.ru?.[0]||p.id;
  const en=p.names?.en||ru,es=p.names?.es||ru;
  return{id:p.id,category:fallback.category||'yeastfree',price:Number(account&&account.prices?.[p.id]!=null?account.prices[p.id]:p.basePrice??fallback.price??0),pieces:12,weight:Number(p.weight||fallback.weight||600),image:p.image||fallback.image||'icon.svg',bg:fallback.bg||'#e9dfca',text:{ru:[ru,p.descriptions?.ru||fallback.text?.ru?.[1]||'',ru],en:[en,p.descriptions?.en||fallback.text?.en?.[1]||'',en],es:[es,p.descriptions?.es||fallback.text?.es?.[1]||'',es]}};
 }
 function refreshRestaurantProducts(){
  const managed=readManaged();
  if(!managed.length)return;
  const next=managed.filter(p=>p.active!==false).map(toCatalogProduct);
  PRODUCTS.splice(0,PRODUCTS.length,...next);
  Object.keys(cart).forEach(id=>{if(!PRODUCTS.some(p=>p.id===id))delete cart[id]});
  localStorage.setItem('panora-cart',JSON.stringify(cart));
  renderCategories();renderProducts();renderCart();
 }
 window.refreshRestaurantProducts=refreshRestaurantProducts;
 window.addEventListener('panora:products-changed',refreshRestaurantProducts);
 window.addEventListener('storage',event=>{
  if(event.key==='panora-products'||event.key==='panora-restaurants'){
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
