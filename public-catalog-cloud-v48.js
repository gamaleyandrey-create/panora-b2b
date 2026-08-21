/* Panora 4.8 — public retail catalogue cloud.
   Source of truth for guest retail prices: Supabase panora_public_catalog(). */
(()=>{
 'use strict';
 const cfg=window.PANORA_SUPABASE;
 if(!cfg?.url||!cfg?.publishableKey)return;
 let loading=null,timer=0,lastAutoFetchAt=0;
 const AUTO_FETCH_KEY='panora-public-catalog-auto-fetch-v934';
 const REVISION_KEY='panora-public-catalog-revision-v934';
 const endpoint=()=>`${cfg.url}/rest/v1/rpc/panora_public_catalog`;
 const revisionEndpoint=()=>`${cfg.url}/rest/v1/rpc/panora_public_catalog_revision`;
 async function fetchRevision(){
  try{
   const response=await fetch(revisionEndpoint(),{
    method:'POST',
    headers:{apikey:cfg.publishableKey,'Content-Type':'application/json',Accept:'application/json'},
    body:'{}',cache:'no-store'
   });
   if(!response.ok)return '';
   const rows=await response.json();
   const row=Array.isArray(rows)?rows[0]:rows;
   return String(row?.revision||row?.catalog_revision||'');
  }catch{return ''}
 }
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
   let media=[];
   try{
    const mediaResponse=await fetch(`${cfg.url}/rest/v1/rpc/panora_public_product_media`,{
     method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json',Accept:'application/json'},body:'{}',cache:'no-store'
    });
    if(mediaResponse.ok)media=await mediaResponse.json();
   }catch{}
   const mediaMap=new Map((Array.isArray(media)?media:[]).map(row=>[String(row.id),row]));
   const next=rows.map(p=>({
    id:p.id,
    builtIn:['plain','pumpkin'].includes(p.id),
    active:p.active!==false&&p.storefront_visible!==false,
    storefrontVisible:p.storefront_visible!==false,
    category:String(mediaMap.get(String(p.id))?.category||'Хлеб'),
    gallery:Array.isArray(mediaMap.get(String(p.id))?.gallery_urls)?mediaMap.get(String(p.id)).gallery_urls.filter(Boolean).slice(0,6):[],
    weight:Number(p.weight_g||0),
    basePrice:Number(p.retail_price||0),
    wholesaleMinQty:Math.max(1,Number(ruleMap.get(String(p.id))?.wholesale_min_qty||8)),
    image:p.image_url||'icon.svg',
    names:{ru:p.name_ru||p.id,en:p.name_en||p.name_ru||p.id,es:p.name_es||p.name_ru||p.id},
    descriptions:{ru:p.description_ru||'',en:p.description_en||'',es:p.description_es||''}
   })).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
   const before=localStorage.getItem('panora-public-products')||'[]';
   const after=JSON.stringify(next);
   const previous=(()=>{try{return JSON.parse(before)||[]}catch{return[]}})()
     .slice().sort((a,b)=>String(a?.id||'').localeCompare(String(b?.id||'')));
   const previousCanonical=JSON.stringify(previous);
   if(previousCanonical!==after){
    let cached=true;
    try{localStorage.setItem('panora-public-products',after)}catch(error){cached=false;console.warn('Panora public catalog cache',error)}
    // The live catalogue is already in memory/Supabase. Dispatch only for a
    // real semantic catalogue change; storage failure must not create a loop.
    if(previousCanonical!==after){
      window.dispatchEvent(new CustomEvent('panora:public-products-changed',{detail:{source:'public-retail-cloud',cached}}));
      window.dispatchEvent(new CustomEvent('panora:retail-catalog-updated',{detail:{count:next.length,cached}}));
    }
   }
   return next;
  })().finally(()=>loading=null);
  return loading;
 }
 async function refreshCatalogIfChanged(){
  const revision=await fetchRevision();
  if(revision){
   const cached=localStorage.getItem('panora-public-products');
   const previousRevision=localStorage.getItem(REVISION_KEY)||'';
   if(cached&&previousRevision===revision)return [];
   const rows=await fetchCatalog();
   try{localStorage.setItem(REVISION_KEY,revision)}catch{}
   return rows;
  }
  // Older Supabase installations do not have the 9.34 revision RPC yet.
  // Fall back to the full refresh so catalogue correctness is never reduced.
  return fetchCatalog();
 }
 const autoFetchCatalog=({force=false}={})=>{
  if(document.hidden||!navigator.onLine)return Promise.resolve([]);
  const now=Date.now();
  let sharedAt=0;try{sharedAt=Number(localStorage.getItem(AUTO_FETCH_KEY)||0)}catch{}
  // localStorage is shared by tabs: a second catalogue tab reuses the first tab's fresh cache.
  if(!force&&(now-lastAutoFetchAt<300000||now-sharedAt<300000))return loading||Promise.resolve([]);
  lastAutoFetchAt=now;try{localStorage.setItem(AUTO_FETCH_KEY,String(now))}catch{}
  return refreshCatalogIfChanged().catch(error=>{console.warn('Panora retail catalog refresh',error);return[]});
 };
 function start(){
  clearInterval(timer);
  autoFetchCatalog({force:true});
  // Public catalogue changes rarely. User actions elsewhere still dispatch direct refresh events.
  timer=setInterval(()=>autoFetchCatalog(),1800000);
 }
 window.panoraPublicCatalog={refresh:fetchCatalog,start};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)autoFetchCatalog()});
 window.addEventListener('focus',()=>autoFetchCatalog());
 window.addEventListener('online',()=>autoFetchCatalog({force:true}));
 start();
})();
