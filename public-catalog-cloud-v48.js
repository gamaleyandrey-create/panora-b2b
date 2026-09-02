/* Panora 4.8 — public retail catalogue cloud.
   Source of truth for guest retail prices: Supabase panora_public_catalog(). */
(()=>{
 'use strict';
 const cfg=window.PANORA_SUPABASE;
 if(!cfg?.url||!cfg?.publishableKey)return;
 const retailLoadState=(state,text='')=>window.dispatchEvent(new CustomEvent('panora:retail-load-state',{detail:{state,text}}));
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
   retailLoadState('loading','Обновляем наличие…');
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
   retailLoadState('synced','✓ Наличие актуально');
   return next;
  })().catch(error=>{retailLoadState(navigator.onLine?'error':'offline',navigator.onLine?'Не удалось обновить наличие':'Нет сети · показаны сохранённые данные');throw error}).finally(()=>loading=null);
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


/* Panora 10.30 — retail loading reminder refined after mobile field test. Presentation only; no network requests. */
(()=>{
 let hideTimer=0;
 const style=document.createElement('style');style.textContent=`
 .retail-load-reminder{position:sticky;top:0;z-index:1500;padding:12px 16px;border-bottom:1px solid #d7e3d9;background:rgba(247,251,247,.98);color:#29513a;box-shadow:0 6px 18px rgba(28,54,38,.08);font-family:Manrope,Arial,sans-serif}.retail-load-reminder[hidden]{display:none!important}.retail-load-main{display:flex;gap:11px;align-items:flex-start;max-width:900px;margin:auto}.retail-load-main i{width:17px;height:17px;flex:0 0 17px;margin-top:1px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%}.retail-load-reminder[data-state=loading] .retail-load-main i{animation:retail-load-spin .8s linear infinite}.retail-load-reminder strong{display:block;font-size:14px;line-height:1.25}.retail-load-reminder small{display:block;margin-top:3px;color:#6c7b71;font-size:11px;line-height:1.4}.retail-load-skeleton{display:none;max-width:900px;margin:10px auto 0;grid-template-columns:1fr .75fr .5fr;gap:8px}.retail-load-reminder[data-state=loading] .retail-load-skeleton{display:grid}.retail-load-skeleton span{height:7px;border-radius:999px;background:linear-gradient(90deg,#e1eae3 25%,#f8faf7 50%,#e1eae3 75%);background-size:200% 100%;animation:retail-shimmer 1.15s linear infinite}.retail-load-reminder[data-state=synced]{padding-top:8px;padding-bottom:8px;background:#f5faf6}.retail-load-reminder[data-state=synced] small{display:none}.retail-load-reminder[data-state=synced] .retail-load-main i{border-right-color:currentColor;width:13px;height:13px;flex-basis:13px}.retail-load-reminder[data-state=error]{background:#fff5f2;color:#9b443d}.retail-load-reminder[data-state=offline]{background:#fff9ed;color:#85601e}@keyframes retail-load-spin{to{transform:rotate(360deg)}}@keyframes retail-shimmer{to{background-position:-200% 0}}@media(min-width:721px){.retail-load-reminder{padding:9px 20px}.retail-load-reminder strong{font-size:12px}.retail-load-reminder small{font-size:10px}.retail-load-skeleton span{height:5px}}
 `;document.head.append(style);
 const ensure=()=>{let el=document.querySelector('#retailLoadReminder');if(el)return el;el=document.createElement('div');el.id='retailLoadReminder';el.className='retail-load-reminder';el.hidden=true;el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.innerHTML='<div class="retail-load-main"><i aria-hidden="true"></i><div><strong></strong><small></small></div></div><div class="retail-load-skeleton" aria-hidden="true"><span></span><span></span><span></span></div>';const anchor=document.querySelector('header,.topbar');anchor?.insertAdjacentElement('afterend',el)||document.body.prepend(el);return el};
 window.addEventListener('panora:retail-load-state',event=>{const d=event.detail||{},el=ensure();clearTimeout(hideTimer);el.hidden=false;el.dataset.state=d.state||'loading';el.querySelector('strong').textContent=d.text||(d.state==='synced'?'✓ Актуально':'Обновляем данные…');el.querySelector('small').textContent=d.state==='loading'?'Проверяем актуальный ассортимент и наличие.':d.state==='offline'?'После восстановления сети Panora проверит актуальные данные.':d.state==='error'?'Проверьте соединение и повторите обновление.':'Обновление завершено.';if(d.state==='synced')hideTimer=setTimeout(()=>el.hidden=true,2600)});
 window.addEventListener('offline',()=>retailLoadState('offline','Нет сети · показаны сохранённые данные'));
 window.addEventListener('online',()=>retailLoadState('loading','Восстанавливаем актуальные данные…'));
})();
