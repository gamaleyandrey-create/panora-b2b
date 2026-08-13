/* Panora 4.8 — public retail catalogue cloud.
   Source of truth for guest retail prices: Supabase panora_public_catalog(). */
(()=>{
 'use strict';
 const cfg=window.PANORA_SUPABASE;
 if(!cfg?.url||!cfg?.publishableKey)return;
 let loading=null,timer=0;
 const endpoint=()=>`${cfg.url}/rest/v1/rpc/panora_public_catalog`;
 async function fetchCatalog(){
  if(loading)return loading;
  loading=(async()=>{
   const response=await fetch(endpoint(),{
    method:'POST',
    headers:{
     apikey:cfg.publishableKey,
     'Content-Type':'application/json',
     Accept:'application/json'
    },
    body:'{}',
    cache:'no-store'
   });
   if(!response.ok){
    const text=await response.text().catch(()=>String(response.status));
    throw new Error(`Retail catalog ${response.status}: ${text.slice(0,160)}`);
   }
   const rows=await response.json();
   if(!Array.isArray(rows)||!rows.length)return [];
   let rules=[];
   try{
    const ruleResponse=await fetch(`${cfg.url}/rest/v1/rpc/panora_public_order_rules`,{
     method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json',Accept:'application/json'},body:'{}',cache:'no-store'
    });
    if(ruleResponse.ok)rules=await ruleResponse.json();
   }catch{}
   const ruleMap=new Map((Array.isArray(rules)?rules:[]).map(row=>[String(row.id),row]));
   const next=rows.map(p=>({
    id:p.id,
    builtIn:['plain','pumpkin'].includes(p.id),
    active:p.active!==false,
    weight:Number(p.weight_g||0),
    basePrice:Number(p.retail_price||0),
    wholesaleMinQty:Math.max(1,Number(ruleMap.get(String(p.id))?.wholesale_min_qty||12)),
    image:p.image_url||'icon.svg',
    names:{ru:p.name_ru||p.id,en:p.name_en||p.name_ru||p.id,es:p.name_es||p.name_ru||p.id},
    descriptions:{ru:p.description_ru||'',en:p.description_en||'',es:p.description_es||''}
   }));
   const before=localStorage.getItem('panora-public-products')||'[]';
   const after=JSON.stringify(next);
   if(before!==after){
    localStorage.setItem('panora-public-products',after);
    window.dispatchEvent(new CustomEvent('panora:public-products-changed',{detail:{source:'public-retail-cloud'}}));
    window.dispatchEvent(new CustomEvent('panora:retail-catalog-updated',{detail:{count:next.length}}));
   }
   return next;
  })().finally(()=>loading=null);
  return loading;
 }
 function start(){
  clearInterval(timer);
  fetchCatalog().catch(error=>console.warn('Panora retail catalog refresh',error));
  timer=setInterval(()=>{if(!document.hidden)fetchCatalog().catch(()=>{})},3000);
 }
 window.panoraPublicCatalog={refresh:fetchCatalog,start};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)fetchCatalog().catch(()=>{})});
 window.addEventListener('focus',()=>fetchCatalog().catch(()=>{}));
 window.addEventListener('online',()=>fetchCatalog().catch(()=>{}));
 start();
})();
