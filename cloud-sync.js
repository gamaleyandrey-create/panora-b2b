(()=>{
  const cfg=window.PANORA_SUPABASE;
  let session=null,ready=false,planTimer=0,productTimer=0;
  const status=(text,error=false)=>{const el=document.querySelector('#saveState');if(el){el.textContent=text;el.style.color=error?'#a5443c':'#598060'}};
  const request=async(path,options={})=>{
    if(!session?.access_token)throw new Error('Нет активной сессии');
    const response=await fetch(`${cfg.url}/rest/v1/${path}`,{...options,headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json',...(options.headers||{})}});
    if(!response.ok){const detail=await response.text();throw new Error(detail||`Supabase: ${response.status}`)}
    if(response.status===204)return null;
    const text=await response.text();return text?JSON.parse(text):null;
  };
  const productRow=p=>({id:p.id,name_ru:p.names?.ru||p.id,name_en:p.names?.en||p.names?.ru||p.id,name_es:p.names?.es||p.names?.ru||p.id,description_ru:p.descriptions?.ru||'',description_en:p.descriptions?.en||'',description_es:p.descriptions?.es||'',weight_g:Number(p.weight||750),base_price:Number(p.basePrice||0),image_url:p.image||null,active:p.active!==false,updated_at:new Date().toISOString()});
  const rowProduct=(row,local)=>({id:row.id,builtIn:['plain','pumpkin'].includes(row.id),active:row.active,weight:Number(row.weight_g),basePrice:Number(row.base_price),image:row.image_url||local?.image||'icon.svg',names:{ru:row.name_ru,en:row.name_en,es:row.name_es},descriptions:{ru:row.description_ru||'',en:row.description_en||'',es:row.description_es||''}});
  async function loadProducts(){
    const rows=await request('products?select=*&order=created_at.asc');
    if(!rows?.length)return;
    const local=JSON.parse(localStorage.getItem('panora-products')||'[]');
    const mapped=rows.map(row=>rowProduct(row,local.find(p=>p.id===row.id)));
    localStorage.setItem('panora-products',JSON.stringify(mapped));
    if(typeof productRegistry!=='undefined')productRegistry=mapped;
    if(typeof renderProductCards==='function')renderProductCards();
    if(typeof buildPlanProductFields==='function')buildPlanProductFields();
    if(typeof syncProductSelects==='function')syncProductSelects();
    if(typeof renderAll==='function')renderAll();
  }
  async function saveProducts(){
    if(!ready||typeof productRegistry==='undefined')return;
    status('Синхронизация…');
    await request('products?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(productRegistry.map(productRow))});
    status('Облако ✓');
  }
  const remotePlan=p=>({id:`${p.id}:${p.product_id}`,bakeDate:p.bake_date,deliveryDate:p.delivery_date,product:p.product_id,planned:Number(p.planned_quantity),ordered:0,cutoff:p.cutoff_at,open:p.accepting_orders});
  async function getRemotePlans(){
    const days=await request('bake_days?select=id,bake_date,delivery_date,cutoff_at,accepting_orders,bake_items(product_id,planned_quantity)&order=bake_date.asc');
    return (days||[]).flatMap(day=>(day.bake_items||[]).map(item=>remotePlan({...day,...item})));
  }
  async function loadPlans(){
    const remote=await getRemotePlans();
    const local=JSON.parse(localStorage.getItem('panora-production-plans')||'[]');
    if(remote.length){plans=remote;localStorage.setItem('panora-production-plans',JSON.stringify(plans));if(typeof renderAll==='function')renderAll()}
    else if(local.length){plans=local;ready=true;await savePlansNow()}
  }
  async function savePlansNow(){
    if(!ready||typeof plans==='undefined')return;
    status('Синхронизация…');
    const byDate=new Map();
    plans.forEach(p=>{if(!byDate.has(p.bakeDate))byDate.set(p.bakeDate,[]);byDate.get(p.bakeDate).push(p)});
    const existing=await request('bake_days?select=id,bake_date');
    for(const day of existing||[]){if(!byDate.has(day.bake_date))await request(`bake_days?id=eq.${encodeURIComponent(day.id)}`,{method:'DELETE'})}
    for(const [date,items] of byDate){
      const first=items[0],payload={bake_date:date,delivery_date:first.deliveryDate||date,cutoff_at:first.cutoff,accepting_orders:first.open!==false,updated_at:new Date().toISOString()};
      const rows=await request('bake_days?on_conflict=bake_date',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(payload)});
      const day=rows?.[0];if(!day)continue;
      await request(`bake_items?bake_day_id=eq.${encodeURIComponent(day.id)}`,{method:'DELETE'});
      await request('bake_items?on_conflict=bake_day_id,product_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(items.map(p=>({bake_day_id:day.id,product_id:p.product,planned_quantity:Number(p.planned||0)})))});
    }
    status('Облако ✓');
  }
  function queuePlans(){clearTimeout(planTimer);planTimer=setTimeout(()=>savePlansNow().catch(error=>{console.error(error);status('Ошибка облака',true)}),350)}
  function queueProducts(){clearTimeout(productTimer);productTimer=setTimeout(()=>saveProducts().catch(error=>{console.error(error);status('Ошибка облака',true)}),350)}
  async function start(authSession){
    if(!authSession?.access_token||session?.access_token===authSession.access_token&&ready)return;
    session=authSession;status('Загрузка облака…');
    try{await loadProducts();await loadPlans();ready=true;status('Облако ✓')}catch(error){console.error('Panora cloud sync',error);status('Ошибка облака',true)}
  }
  window.panoraCloud={start,queuePlans,queueProducts,get ready(){return ready}};
  window.addEventListener('panora:authenticated',event=>start(event.detail));
  if(window.panoraSupabaseSession)start(window.panoraSupabaseSession);
})();
