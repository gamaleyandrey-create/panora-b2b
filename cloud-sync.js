(()=>{
  const cfg=window.PANORA_SUPABASE;
  let session=null,ready=false,planTimer=0,productTimer=0,recipeTimer=0,restaurantTimer=0,orderTimer=0,financeTimer=0,orderPoll=0,refreshing=null,loadingOrders=null,savingOrders=null;
  const status=(text,error=false,detail='')=>{const el=document.querySelector('#saveState');if(el){el.textContent=text;el.style.color=error?'#a5443c':'#598060';el.title=detail||'';el.style.cursor=detail?'pointer':'';el.onclick=detail?()=>alert(`${text}\n\n${detail}`):null}};
  const refreshSession=async()=>{
    if(refreshing)return refreshing;if(!session?.refresh_token)throw new Error('Сессия администратора истекла');
    refreshing=fetch(`${cfg.url}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})}).then(async response=>{if(!response.ok)throw new Error('Войдите в экран пекарни повторно');session=await response.json();localStorage.setItem('panora-supabase-session',JSON.stringify(session));window.panoraSupabaseSession=session;return session}).finally(()=>refreshing=null);return refreshing
  };
  const request=async(path,options={},retried=false)=>{
    if(!session?.access_token)throw new Error('Нет активной сессии');
    const response=await fetch(`${cfg.url}/rest/v1/${path}`,{cache:'no-store',...options,headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json','Cache-Control':'no-cache',...(options.headers||{})}});
    if(response.status===401&&!retried){await refreshSession();return request(path,options,true)}
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
  async function loadRecipes(){
    const rows=await request('recipe_items?select=*&order=product_id.asc,position.asc');
    const local=JSON.parse(localStorage.getItem('panora-recipes')||'{}');
    if(rows?.length){
      const remote={};
      rows.forEach(row=>{(remote[row.product_id]??=[]).push({name:row.ingredient_name,qty:Number(row.quantity),unit:row.unit,stock:Number(row.stock||0),margin:Number(row.margin||0)})});
      recipes=remote;localStorage.setItem('panora-recipes',JSON.stringify(recipes));localStorage.setItem('panora-recipes-version','cloud-1');
      if(typeof renderAll==='function')renderAll();
    }else if(Object.keys(local).length){recipes=local;ready=true;await saveRecipesNow()}
  }
  async function saveRecipesNow(){
    if(!ready||typeof recipes==='undefined')return;
    status('Синхронизация рецептур…');
    await request('recipe_items?id=not.is.null',{method:'DELETE'});
    const payload=Object.entries(recipes).flatMap(([productId,items])=>(items||[]).map((item,position)=>({product_id:productId,position,ingredient_name:String(item.name||''),quantity:Number(item.qty||0),unit:item.unit||'g',stock:Number(item.stock||0),margin:Number(item.margin||0),updated_at:new Date().toISOString()})));
    if(payload.length)await request('recipe_items?on_conflict=product_id,position',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(payload)});
    status('Облако ✓');
  }
  const restaurantRow=r=>({id:r.id,name:r.name,email:r.email,phone:r.phone||null,telegram:r.telegram||null,address:r.address||null,language:r.language||'ru',active:!r.deletedAt,updated_at:new Date().toISOString()});
  const rowRestaurant=(row,local)=>({id:row.id,name:row.name,email:row.email,phone:row.phone||'',telegram:row.telegram||'',address:row.address||'',language:row.language||'ru',accessCode:local?.accessCode||'',prices:Object.fromEntries((row.restaurant_prices||[]).map(item=>[item.product_id,Number(item.price)])),...(row.active?{}:{deletedAt:local?.deletedAt||row.updated_at})});
  async function loadRestaurants(){
    const rows=await request('restaurants?select=*,restaurant_prices(product_id,price)&order=created_at.asc');
    const local=JSON.parse(localStorage.getItem('panora-restaurants')||'[]');
    if(rows?.length){
      restaurants=rows.map(row=>rowRestaurant(row,local.find(r=>r.id===row.id||String(r.email).toLowerCase()===String(row.email).toLowerCase())));
      localStorage.setItem('panora-restaurants',JSON.stringify(restaurants));
      if(typeof renderCommerce==='function')renderCommerce();
    }else if(local.length){restaurants=local;ready=true;await saveRestaurantsNow()}
  }
  async function saveRestaurantsNow(){
    if(!ready||typeof restaurants==='undefined')return;
    status('Синхронизация…');
    if(restaurants.length)await request('restaurants?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(restaurants.map(restaurantRow))});
    const prices=restaurants.flatMap(r=>Object.entries(r.prices||{}).map(([product_id,price])=>({restaurant_id:r.id,product_id,price:Number(price),updated_at:new Date().toISOString()})));
    if(prices.length)await request('restaurant_prices?on_conflict=restaurant_id,product_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(prices)});
    status('Облако ✓');
  }
  const orderMeta=order=>JSON.stringify({deliveryDate:order.deliveryDate||order.date,taxRate:Number(order.taxRate||0),comment:order.comment||''});
  const parseOrderMeta=value=>{try{return JSON.parse(value||'{}')}catch{return{comment:value||''}}};
  const rowOrder=row=>{
    const meta=parseOrderMeta(row.comment),day=row.bake_days||{},items=(row.order_items||[]).map(item=>({product:item.product_id,quantity:Number(item.quantity)}));
    return{id:row.id,number:Number(row.order_number),restaurantId:row.restaurant_id,date:day.bake_date,deliveryDate:meta.deliveryDate||day.delivery_date||day.bake_date,items,prices:Object.fromEntries((row.order_items||[]).map(item=>[item.product_id,Number(item.unit_price)])),taxRate:Number(meta.taxRate||0),status:row.status,comment:meta.comment||'',cancellationReason:row.cancelled_reason||'',createdAt:row.created_at};
  };
  async function loadOrders(){
    if(loadingOrders)return loadingOrders;if(savingOrders)await savingOrders;
    loadingOrders=(async()=>{const rows=await request('orders?select=id,order_number,restaurant_id,status,comment,cancelled_reason,created_at,bake_days(bake_date,delivery_date),order_items(product_id,quantity,unit_price)&order=order_number.asc');orders=(rows||[]).map(rowOrder);localStorage.setItem('panora-orders',JSON.stringify(orders));syncPlansFromOrders();if(typeof renderCommerce==='function')renderCommerce();if(typeof renderAll==='function')renderAll();status(`Облако ✓ · ${rows?.length||0} заказов`)})().finally(()=>loadingOrders=null);return loadingOrders
  }
  async function updateOrderStatus(id,nextStatus,cancelledReason=null){
    if(!ready)throw new Error('Облако ещё загружается');
    if(loadingOrders)await loadingOrders;
    clearTimeout(orderTimer);orderTimer=0;
    await request(`orders?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:nextStatus,cancelled_reason:cancelledReason,updated_at:new Date().toISOString()})});
    await loadOrders();
    const saved=orders.find(order=>order.id===id);
    if(!saved||saved.status!==nextStatus)throw new Error('Supabase не подтвердил изменение статуса заказа');
    return saved;
  }
  async function bakeDayMap(){const days=await request('bake_days?select=id,bake_date');return new Map((days||[]).map(day=>[day.bake_date,day.id]))}
  async function saveOrdersNow(){
    if(!ready||typeof orders==='undefined')return;if(savingOrders)return savingOrders;
    savingOrders=(async()=>{status('Синхронизация…');
    let days=await bakeDayMap();
    const missing=orders.some(order=>!days.has(order.date));
    if(missing){await savePlansNow();days=await bakeDayMap()}
    const valid=orders.filter(order=>days.has(order.date)&&restaurants.some(r=>r.id===order.restaurantId));
    if(valid.length){
      const payload=valid.map(order=>({id:order.id,order_number:Number(order.number)||undefined,restaurant_id:order.restaurantId,bake_day_id:days.get(order.date),status:order.status||'submitted',comment:orderMeta(order),cancelled_reason:order.cancellationReason||null,created_by:session.user?.id||null,updated_at:new Date().toISOString()}));
      await request('orders?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(payload)});
      for(const order of valid){
        await request(`order_items?order_id=eq.${encodeURIComponent(order.id)}`,{method:'DELETE'});
        const items=(order.items||[]).filter(item=>Number(item.quantity)>0).map(item=>({order_id:order.id,product_id:item.product,quantity:Number(item.quantity),unit_price:Number((order.prices||{})[item.product]??restaurant(order.restaurantId)?.prices?.[item.product]??0)}));
        if(items.length)await request('order_items?on_conflict=order_id,product_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(items)});
      }
    }
    status('Облако ✓');})().finally(()=>savingOrders=null);return savingOrders
  }
  const localDate=value=>String(value||'').slice(0,10);
  const rowNote=row=>{const order=orders.find(item=>item.id===row.order_id),paid=payments.filter(p=>p.deliveryNoteId===row.id&&p.confirmed!==false).reduce((sum,p)=>sum+Number(p.amount||0),0);return{id:row.id,number:Number(row.note_number),orderId:row.order_id,restaurantId:row.restaurant_id,date:localDate(row.delivered_at),items:structuredClone(order?.items||[]),prices:structuredClone(order?.prices||{}),bakery:structuredClone(typeof bakerySettings!=='undefined'?bakerySettings:{}),subtotal:Number(row.total),taxRate:Number(order?.taxRate||0),tax:0,total:Number(row.total),paid,balanceAfter:0,qrToken:row.qr_token,customerConfirmedAt:row.customer_confirmed_at||null,customerReceiver:row.customer_receiver||'',offlineProof:row.offline_received_at?{receivedAt:row.offline_received_at,receiver:row.offline_receiver||'',signature:row.offline_signature||'',pending:false}:null}};
  async function loadDeliveryNotes(){
    const rows=await request('delivery_notes?select=*&order=note_number.asc');
    const local=JSON.parse(localStorage.getItem('panora-delivery-notes')||'[]');
    if(rows?.length){deliveryNotes=rows.map(rowNote);localStorage.setItem('panora-delivery-notes',JSON.stringify(deliveryNotes));if(typeof renderCommerce==='function')renderCommerce()}
    else if(local.length){deliveryNotes=local;ready=true;await saveDeliveryNotesNow()}
  }
  async function saveDeliveryNotesNow(){
    if(!ready||typeof deliveryNotes==='undefined')return;
    const valid=deliveryNotes.filter(note=>orders.some(order=>order.id===note.orderId)&&restaurants.some(r=>r.id===note.restaurantId));
    if(!valid.length)return;
    status('Синхронизация…');
    const payload=valid.map(note=>{note.qrToken ||= crypto.randomUUID();return{id:note.id,note_number:Number(note.number)||undefined,order_id:note.orderId,restaurant_id:note.restaurantId,delivered_at:`${localDate(note.date)}T12:00:00Z`,total:Number(note.total||0),qr_token:note.qrToken,customer_confirmed_at:note.customerConfirmedAt||null,customer_receiver:note.customerReceiver||null,offline_received_at:note.offlineProof?.receivedAt||null,offline_receiver:note.offlineProof?.receiver||null,offline_signature:note.offlineProof?.signature||null}});
    const rows=await request('delivery_notes?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(payload)});
    (rows||[]).forEach(row=>{const note=deliveryNotes.find(item=>item.id===row.id);if(note){note.number=Number(row.note_number);note.qrToken=row.qr_token}});
    localStorage.setItem('panora-delivery-notes',JSON.stringify(deliveryNotes));status('Облако ✓');
  }
  const rowPayment=row=>({id:row.id,restaurantId:row.restaurant_id,deliveryNoteId:row.delivery_note_id||null,date:localDate(row.received_at),amount:Number(row.amount),method:row.method,note:row.note||'',confirmed:row.status==='confirmed',confirmedAt:row.confirmed_at||null,status:row.status});
  async function loadPayments(){
    const rows=await request('payments?select=*&order=received_at.asc');
    const local=JSON.parse(localStorage.getItem('panora-payments')||'[]');
    if(rows?.length){payments=rows.map(rowPayment);localStorage.setItem('panora-payments',JSON.stringify(payments));recalculateBalances();if(typeof renderCommerce==='function')renderCommerce()}
    else if(local.length){payments=local;ready=true;await savePaymentsNow()}
  }
  async function savePaymentsNow(){
    if(!ready||typeof payments==='undefined')return;
    const valid=payments.filter(payment=>restaurants.some(r=>r.id===payment.restaurantId)&&Number(payment.amount)>0);
    if(!valid.length)return;
    status('Синхронизация…');
    const payload=valid.map(payment=>({id:payment.id,restaurant_id:payment.restaurantId,delivery_note_id:payment.deliveryNoteId||null,amount:Number(payment.amount),method:payment.method||'Не указан',note:payment.note||null,status:payment.status==='cancelled'?'cancelled':payment.confirmed===false?'pending':'confirmed',received_at:`${localDate(payment.date)}T12:00:00Z`,confirmed_at:payment.confirmed===false?null:payment.confirmedAt||new Date().toISOString(),confirmed_by:payment.confirmed===false?null:session.user?.id||null}));
    await request('payments?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(payload)});status('Облако ✓');
  }
  function recalculateBalances(){
    if(typeof deliveryNotes==='undefined'||typeof payments==='undefined')return;
    const running={};deliveryNotes.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).forEach(note=>{running[note.restaurantId]=(running[note.restaurantId]||0)+Number(note.total||0);const paid=payments.filter(p=>p.restaurantId===note.restaurantId&&p.confirmed!==false&&String(p.date)<=String(note.date)).reduce((sum,p)=>sum+Number(p.amount||0),0);note.paid=payments.filter(p=>p.deliveryNoteId===note.id&&p.confirmed!==false).reduce((sum,p)=>sum+Number(p.amount||0),0);note.balanceAfter=running[note.restaurantId]-paid});
    localStorage.setItem('panora-delivery-notes',JSON.stringify(deliveryNotes));
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
  const fail=(section,error)=>{console.error(`Panora cloud sync · ${section}`,error);status(`Ошибка: ${section}`,true,error?.message||String(error))};
  function queuePlans(){clearTimeout(planTimer);planTimer=setTimeout(()=>savePlansNow().catch(error=>fail('план',error)),350)}
  function queueProducts(){clearTimeout(productTimer);productTimer=setTimeout(()=>saveProducts().catch(error=>fail('товары',error)),350)}
  function queueRecipes(){clearTimeout(recipeTimer);recipeTimer=setTimeout(()=>saveRecipesNow().catch(error=>fail('рецептуры',error)),400)}
  function queueRestaurants(){clearTimeout(restaurantTimer);restaurantTimer=setTimeout(()=>saveRestaurantsNow().catch(error=>fail('рестораны',error)),350)}
  function queueOrders(){clearTimeout(orderTimer);orderTimer=setTimeout(()=>saveOrdersNow().catch(error=>fail('заказы',error)),500)}
  function queueFinance(){clearTimeout(financeTimer);financeTimer=setTimeout(async()=>{try{await saveDeliveryNotesNow();await savePaymentsNow();recalculateBalances();if(typeof renderCommerce==='function')renderCommerce()}catch(error){fail('оплаты',error)}},550)}
  async function start(authSession){
    if(!authSession?.access_token||session?.access_token===authSession.access_token&&ready)return;
    session=authSession;status('Загрузка облака…');
    const steps=[['товары',loadProducts],['рецептуры',loadRecipes],['план',loadPlans],['рестораны',loadRestaurants],['заказы',loadOrders],['накладные',loadDeliveryNotes],['оплаты',loadPayments]],errors=[];
    for(const [name,run] of steps){status(`Загрузка: ${name}…`);try{await run()}catch(error){errors.push([name,error]);console.error(`Panora cloud sync · ${name}`,error)}}
    ready=true;
    clearInterval(orderPoll);orderPoll=setInterval(()=>loadOrders().catch(error=>fail('заказы',error)),4000);
    if(errors.length){const [name,error]=errors[0];fail(name,error)}else status('Облако ✓');
  }
  window.panoraCloud={start,queuePlans,queueProducts,queueRecipes,queueRestaurants,queueOrders,queueFinance,updateOrderStatus,get ready(){return ready}};
  window.addEventListener('panora:authenticated',event=>start(event.detail));
  window.addEventListener('online',()=>{if(ready)queueFinance()});
  if(window.panoraSupabaseSession)start(window.panoraSupabaseSession);
})();
