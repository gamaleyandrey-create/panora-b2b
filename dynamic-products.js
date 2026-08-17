(()=>{
 const builtInFallbacks=new Map(PRODUCTS.filter(p=>['plain','pumpkin'].includes(p.id)).map(p=>[p.id,{...p}]));
 function readManaged(){try{return JSON.parse(localStorage.getItem('panora-public-products')||localStorage.getItem('panora-partner-products')||localStorage.getItem('panora-products')||'[]')}catch{return[]}}
 function toCatalogProduct(p){
  const fallback=builtInFallbacks.get(p.id)||{};
  const ru=p.names?.ru||fallback.text?.ru?.[0]||p.id;
  const en=p.names?.en||ru,es=p.names?.es||ru;
  const retailPrice=Number(p.basePrice??fallback.retailPrice??fallback.price??0),wholesalePrice=Number(account&&account.prices?.[p.id]!=null?account.prices[p.id]:retailPrice),wholesaleMinQty=Math.max(1,Number(p.wholesaleMinQty||fallback.wholesaleMinQty||8));return{id:p.id,category:String(p.category||fallback.category||'Хлеб'),gallery:Array.isArray(p.gallery)?p.gallery.filter(Boolean).slice(0,6):[],price:wholesalePrice,retailPrice,wholesalePrice,wholesaleMinQty,pieces:wholesaleMinQty,weight:Number(p.weight||fallback.weight||600),image:p.image||fallback.image||'icon.svg',bg:fallback.bg||'#e9dfca',text:{ru:[ru,p.descriptions?.ru||fallback.text?.ru?.[1]||'',ru],en:[en,p.descriptions?.en||fallback.text?.en?.[1]||'',en],es:[es,p.descriptions?.es||fallback.text?.es?.[1]||'',es]}};
 }
 let lastCatalogSignature='';
 const catalogSignature=list=>JSON.stringify((list||[]).map(p=>({
  id:String(p.id),active:p.active!==false&&p.storefrontVisible!==false,price:Number(p.price||0),retailPrice:Number(p.retailPrice||0),
  wholesalePrice:Number(p.wholesalePrice||0),wholesaleMinQty:Number(p.wholesaleMinQty||0),
  weight:Number(p.weight||0),image:String(p.image||''),category:String(p.category||''),gallery:Array.isArray(p.gallery)?p.gallery:[],names:p.text||p.names||{},descriptions:p.descriptions||{}
 })));
 function refreshRestaurantProducts(){
  try{
   const managed=readManaged().filter(p=>p&&p.active!==false&&p.storefrontVisible!==false);
   const accountId=localStorage.getItem('panora-account-id');
   const restaurantKey=localStorage.getItem('panora-portal-restaurants')?'panora-portal-restaurants':'panora-restaurants';
   const restaurants=JSON.parse(localStorage.getItem(restaurantKey)||'[]');
   if(accountId){
    const fresh=restaurants.find(r=>String(r.id)===String(accountId));
    if(fresh)account=fresh;
   }

   const rebuilt=managed.map(toCatalogProduct);
   try{
    if(rebuilt.length){
    const validIds=new Set(rebuilt.map(p=>String(p.id))),savedCart=JSON.parse(localStorage.getItem('panora-cart')||'{}');
    let changed=false;
    for(const id of Object.keys(savedCart||{})){if(!validIds.has(String(id))){delete savedCart[id];changed=true}}
    if(changed){cart={...savedCart};localStorage.setItem('panora-cart',JSON.stringify(savedCart));window.dispatchEvent(new CustomEvent('panora:cart-sanitized',{detail:{source:'catalog'}}))}
    }
   }catch(error){console.warn('Panora cart sanitize',error)}
   if(rebuilt.length){
    PRODUCTS.splice(0,PRODUCTS.length,...rebuilt);
   }else{
    PRODUCTS.forEach(product=>{
     if(account?.prices?.[product.id]!=null)product.price=Number(account.prices[product.id]);
    });
   }

   const nextSignature=catalogSignature(PRODUCTS);
   if(nextSignature!==lastCatalogSignature){
    lastCatalogSignature=nextSignature;
    renderCategories?.();
    renderProducts?.();
   }
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
