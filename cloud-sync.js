(()=>{
  const cfg=window.PANORA_SUPABASE;
  const pendingKey='panora-cloud-pending-v283';
  const revisionKey='panora-cloud-revisions-v285',conflictKey='panora-cloud-conflicts-v285',backupKey='panora-cloud-backups-v286';
  const readPending=()=>{try{return JSON.parse(localStorage.getItem(pendingKey)||'{}')||{}}catch{return{}}};
  const readObject=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{return{}}};
  let pending=readPending();
  let revisions=readObject(revisionKey),conflicts=readObject(conflictKey);
  const sectionKeys={products:'panora-products',recipes:'panora-recipes',restaurants:'panora-restaurants',plans:'panora-production-plans'};
  const readBackups=()=>{try{const value=JSON.parse(localStorage.getItem(backupKey)||'[]');return Array.isArray(value)?value:[]}catch{return[]}};
  const backupSectionNames={products:'Товары',recipes:'Рецептуры',restaurants:'Партнёры',plans:'План производства'};
  const backupReasonNames={'conflict-cloud':'Перед применением облачной версии',sync:'Перед синхронизацией','before-restore':'Перед восстановлением снимка',imported:'Импортировано с другого устройства'};
  const parseBackupSection=raw=>{try{return JSON.parse(raw)}catch{return null}};
  const backupEntities=(section,value)=>{
    if(section==='recipes'&&value&&typeof value==='object'&&!Array.isArray(value))return Object.entries(value).flatMap(([product,items])=>(Array.isArray(items)?items:[]).map((item,index)=>({id:`${product}:${index}`,value:item})));
    if(Array.isArray(value))return value.map((item,index)=>({id:String(item?.id??item?.date??item?.bakeDate??index),value:item}));
    if(value&&typeof value==='object')return Object.entries(value).map(([id,item])=>({id,value:item}));
    return[];
  };
  const compareBackupSection=(section,raw)=>{
    const target=backupEntities(section,parseBackupSection(raw)),current=backupEntities(section,parseBackupSection(localStorage.getItem(sectionKeys[section])||'null'));
    const before=new Map(current.map(item=>[item.id,JSON.stringify(item.value)])),after=new Map(target.map(item=>[item.id,JSON.stringify(item.value)]));
    let added=0,changed=0,removed=0,same=0;
    after.forEach((value,id)=>{if(!before.has(id))added++;else if(before.get(id)!==value)changed++;else same++});
    before.forEach((value,id)=>{if(!after.has(id))removed++});
    return{section,added,changed,removed,same,total:target.length};
  };
  const backupDiff=(snapshot)=>Object.entries(snapshot?.data||{}).map(([section,raw])=>compareBackupSection(section,raw));
  const backupDiffText=diff=>diff.map(row=>`${backupSectionNames[row.section]||row.section}: +${row.added} добавлено, ${row.changed} изменено, −${row.removed} удалено, ${row.same} без изменений`).join('\n');
  const saveBackup=(sections,reason='sync')=>{
    const data={};
    sections.forEach(section=>{const key=sectionKeys[section];if(key&&localStorage.getItem(key)!=null)data[section]=localStorage.getItem(key)});
    if(!Object.keys(data).length)return null;
    const snapshot={id:`${Date.now()}-${Math.random().toString(36).slice(2)}`,at:new Date().toISOString(),reason,source:'automatic',integrity:'local',data};
    const backups=[snapshot,...readBackups()].slice(0,10);localStorage.setItem(backupKey,JSON.stringify(backups));
    audit('sync.backup_created',`Резерв: ${Object.keys(data).join(', ')}`);return snapshot;
  };
  const forceSections=new Set();
  const pendingCount=()=>Object.keys(pending).length;
  const markPending=section=>{pending[section]=true;localStorage.setItem(pendingKey,JSON.stringify(pending));showPending()};
  const clearPending=section=>{delete pending[section];Object.keys(pending).length?localStorage.setItem(pendingKey,JSON.stringify(pending)):localStorage.removeItem(pendingKey)};
  let session=null,ready=false,planTimer=0,productTimer=0,recipeTimer=0,restaurantTimer=0,orderTimer=0,financeTimer=0,orderPoll=0,productPoll=0,refreshing=null,loadingOrders=null,savingOrders=null,savingProducts=null,productDirty=Boolean(pending.products),savingRecipes=null,recipeDirty=Boolean(pending.recipes),recipeRevision=0,financeLoaded=false,repairingFinance=null,retrying=null,shippingLocks=new Set();
  const audit=(action,details='',level='info')=>window.panoraAudit?.record(action,details,level);
  const status=(text,error=false,detail='')=>{
    const el=document.querySelector('#saveState');if(!el)return;
    el.textContent=text;el.style.color='';el.title=detail||'';
    const syncing=/загруз|синх|повтор|loading|sync|retry|cargando|sincron/i.test(text);
    const local=/устройств|офлайн|offline|device|dispositivo/i.test(text);
    el.dataset.syncState=error?'error':syncing?'syncing':local?'local':'synced';
    el.style.cursor=error?'pointer':'';
    el.onclick=error?()=>retrySync():null;
  };
  const showPending=()=>{const count=pendingCount();if(!count)return false;status(navigator.onLine?`Ожидает отправки: ${count}`:`Офлайн · ожидает: ${count}`,false,'Нажмите после восстановления сети для повторной отправки');const el=document.querySelector('#saveState');if(el){el.style.cursor='pointer';el.onclick=()=>retrySync()}return true};
  const rememberRevision=(section,rows=[])=>{const latest=(rows||[]).reduce((value,row)=>String(row.updated_at||'')>value?String(row.updated_at):value,'');if(latest){revisions[section]=latest;localStorage.setItem(revisionKey,JSON.stringify(revisions))}return latest};
  const conflictCount=()=>Object.keys(conflicts).length;
  const saveConflicts=()=>Object.keys(conflicts).length?localStorage.setItem(conflictKey,JSON.stringify(conflicts)):localStorage.removeItem(conflictKey);
  const showConflicts=()=>{const count=conflictCount();if(!count)return false;status(`Есть изменения на другом устройстве: ${count}`,true,'Нажмите, чтобы выбрать актуальную версию');const el=document.querySelector('#saveState');if(el)el.onclick=resolveConflicts;return true};
  function chooseConflictVersion(names){
    return new Promise(resolve=>{
      document.querySelector('#panoraConflictChoice')?.remove();
      const modal=document.createElement('div');modal.id='panoraConflictChoice';modal.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(16,27,20,.58);display:grid;place-items:center;padding:20px';
      modal.innerHTML=`<section role="dialog" aria-modal="true" aria-labelledby="panoraConflictTitle" style="width:min(520px,100%);background:#fff;color:#17251d;border-radius:18px;padding:24px;box-shadow:0 20px 70px #0005"><h2 id="panoraConflictTitle" style="margin:0 0 12px">Есть изменения на другом устройстве</h2><p>В облаке сохранена другая версия раздела: <strong>${String(names).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</strong>. Выберите, какую версию использовать.</p><button type="button" data-choice="cloud" style="width:100%;margin-top:10px;padding:12px">Загрузить обновления из облака</button><p style="margin:6px 0 14px;color:#607066">Текущие поля будут заменены последней версией из облака.</p><button type="button" data-choice="local" style="width:100%;padding:12px">Сохранить версию этого устройства в облако</button><p style="margin:6px 0 14px;color:#607066">Данные с этого устройства заменят облачную версию.</p><button type="button" data-choice="later" style="width:100%;padding:10px;background:transparent;border:0;text-decoration:underline">Решить позже</button><p style="margin:14px 0 0;color:#42684d">Ваши данные не пропадут: перед заменой Panora сохранит резервную копию.</p></section>`;
      modal.addEventListener('click',event=>{const choice=event.target.closest('[data-choice]')?.dataset.choice;if(!choice)return;modal.remove();resolve(choice)});document.body.append(modal);modal.querySelector('[data-choice="cloud"]')?.focus();
    })
  }
  async function guardSection(section,path){
    if(forceSections.has(section)||!pending[section]||!revisions[section])return;
    const rows=await request(`${path}${path.includes('?')?'&':'?'}select=updated_at&order=updated_at.desc&limit=1`),remoteAt=rows?.[0]?.updated_at||'';
    if(remoteAt&&remoteAt>revisions[section]){conflicts[section]={remoteAt,localAt:new Date().toISOString()};saveConflicts();audit('sync.conflict',`${section}: облако ${remoteAt}, устройство ${revisions[section]}`,'warning');showConflicts();const error=new Error(`На другом устройстве изменён раздел «${section}»`);error.panoraConflict=true;throw error}
  }
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
  const productRow=p=>({id:p.id,name_ru:p.names?.ru||p.id,name_en:p.names?.en||p.names?.ru||p.id,name_es:p.names?.es||p.names?.ru||p.id,description_ru:p.descriptions?.ru||'',description_en:p.descriptions?.en||'',description_es:p.descriptions?.es||'',weight_g:Number(p.weight||750),base_price:Number(p.basePrice||0),image_url:p.image||null,active:p.active!==false,tech_card:p.techCard||{},updated_at:new Date().toISOString()});
  const rowProduct=(row,local)=>({id:row.id,builtIn:['plain','pumpkin'].includes(row.id),active:row.active,weight:Number(row.weight_g),basePrice:Number(row.base_price),image:row.image_url||local?.image||'icon.svg',techCard:row.tech_card||local?.techCard||{},names:{ru:row.name_ru,en:row.name_en,es:row.name_es},descriptions:{ru:row.description_ru||'',en:row.description_en||'',es:row.description_es||''}});
  async function loadProducts(){
    if(productDirty||savingProducts){await flushProducts();return}
    const rows=await request('products?select=*&order=created_at.asc');
    rememberRevision('products',rows);
    if(!rows?.length)return;
    const local=JSON.parse(localStorage.getItem('panora-products')||'[]');
    const mapped=rows.map(row=>rowProduct(row,local.find(p=>p.id===row.id)));
    localStorage.setItem('panora-products',JSON.stringify(mapped));
    if(typeof productRegistry!=='undefined')productRegistry=mapped;
    if(typeof syncAdminProductRegistry==='function')syncAdminProductRegistry();
    if(typeof renderProductCards==='function')renderProductCards();
    if(typeof buildPlanProductFields==='function')buildPlanProductFields();
    if(typeof syncProductSelects==='function')syncProductSelects();
    if(typeof renderAll==='function')renderAll();
  }
  async function refreshProductsIfChanged(){
    if(!ready||productDirty||savingProducts||document.activeElement?.closest?.('#recipeList')||window.panoraRecipeEditing)return false;
    const rows=await request('products?select=updated_at&order=updated_at.desc&limit=1'),remoteAt=rows?.[0]?.updated_at||'',localAt=revisions.products||'';
    if(remoteAt&&remoteAt>localAt){await loadProducts();window.dispatchEvent(new CustomEvent('panora:products-changed'));return true}
    return false
  }
  async function saveProducts(){
    if(!ready||typeof productRegistry==='undefined')return false;
    if(savingProducts)return savingProducts;
    const snapshot=JSON.parse(JSON.stringify(productRegistry));
    savingProducts=(async()=>{
      status('Сохранение товара…');
      await guardSection('products','products');
      await request('products?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(snapshot.map(productRow))});
      revisions.products=new Date().toISOString();localStorage.setItem(revisionKey,JSON.stringify(revisions));forceSections.delete('products');delete conflicts.products;saveConflicts();
      productDirty=false;clearPending('products');status('Товар сохранён ✓');return true;
    })().finally(()=>savingProducts=null);
    return savingProducts;
  }
  async function flushProducts(){
    clearTimeout(productTimer);productTimer=0;
    if(!ready)return false;
    if(savingProducts)await savingProducts;
    if(productDirty)return saveProducts();
    return true;
  }
  async function saveProductConfirmed(product){
    if(!product?.id)throw new Error('Не удалось определить новый товар');
    if(!ready)throw new Error('Облако ещё загружается. Подождите несколько секунд и повторите сохранение.');
    if(!session?.access_token)throw new Error('Сессия пекарни истекла. Войдите повторно.');
    status('Сохранение товара…');
    const rows=await request('products?on_conflict=id',{
      method:'POST',
      headers:{Prefer:'resolution=merge-duplicates,return=representation'},
      body:JSON.stringify(productRow(product))
    });
    const saved=rows?.find(row=>row.id===product.id);
    if(!saved)throw new Error('Supabase не подтвердил создание товара');
    productDirty=false;clearPending('products');
    status('Товар сохранён ✓');
    return rowProduct(saved,product);
  }
  async function saveProductTechCardConfirmed(productId,techCard){
    if(!productId)throw new Error('Не удалось определить хлеб');
    if(!ready)throw new Error('Облако ещё загружается. Подождите несколько секунд и повторите.');
    if(!session?.access_token)throw new Error('Сессия пекарни истекла. Войдите повторно.');
    const normalized={mix:String(techCard?.mix||''),fermentation:Number(techCard?.fermentation||0),proof:Number(techCard?.proof||0),bakeTemp:Number(techCard?.bakeTemp||0),bakeTime:Number(techCard?.bakeTime||0),steps:String(techCard?.steps||''),notes:String(techCard?.notes||'')};
    status('Сохранение технологической карты…');
    const rows=await request(`products?id=eq.${encodeURIComponent(productId)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({tech_card:normalized,updated_at:new Date().toISOString()})});
    if(!rows?.some(row=>row.id===productId))throw new Error('Supabase не подтвердил запись технологической карты');
    const verified=await request(`products?id=eq.${encodeURIComponent(productId)}&select=id,tech_card,updated_at&limit=1`),saved=verified?.[0];
    if(!saved||JSON.stringify(saved.tech_card||{})!==JSON.stringify(normalized))throw new Error('Проверка технологической карты после записи не пройдена');
    const local=typeof productRegistry!=='undefined'?productRegistry.find(item=>item.id===productId):null;
    if(local)local.techCard=normalized;
    productDirty=false;clearPending('products');rememberRevision('products',verified);status('Технологическая карта сохранена ✓');
    return normalized;
  }
  async function deleteProductConfirmed(productId){
    if(!productId)throw new Error('Не удалось определить товар');
    if(!ready)throw new Error('Облако ещё загружается. Подождите несколько секунд и повторите.');
    if(!session?.access_token)throw new Error('Сессия пекарни истекла. Войдите повторно.');
    status('Удаление товара…');
    await request(`products?id=eq.${encodeURIComponent(productId)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});
    const rows=await request(`products?id=eq.${encodeURIComponent(productId)}&select=id`);
    if(rows?.length)throw new Error('Supabase не подтвердил удаление товара');
    productDirty=false;status('Товар удалён ✓');return true;
  }
  async function loadRecipes(){
    const rows=await request('recipe_items?select=*&order=product_id.asc,position.asc');
    const local=JSON.parse(localStorage.getItem('panora-recipes')||'{}');
    if(recipeDirty||savingRecipes){await flushRecipes();return}
    rememberRevision('recipes',rows);
    if(rows?.length){
      const remote={};
      rows.forEach(row=>{(remote[row.product_id]??=[]).push({name:row.ingredient_name,qty:Number(row.quantity),unit:row.unit,stock:Number(row.stock||0),margin:Number(row.margin||0)})});
      recipes=remote;if(typeof syncAdminProductRegistry==='function')syncAdminProductRegistry();localStorage.setItem('panora-recipes',JSON.stringify(recipes));localStorage.setItem('panora-recipes-version','cloud-2');window.dispatchEvent(new CustomEvent('panora:recipes-changed'));
      if(typeof renderAll==='function')renderAll();
    }else if(Object.keys(local).length){recipes=local;ready=true;recipeDirty=true;recipeRevision++;await flushRecipes()}
  }
  async function saveRecipesNow(){
    if(!ready||typeof recipes==='undefined')return false;
    if(savingRecipes)return savingRecipes;
    const revision=recipeRevision,snapshot=JSON.parse(JSON.stringify(recipes));
    savingRecipes=(async()=>{
      status('Синхронизация рецептур…');
      await guardSection('recipes','recipe_items');
      await request('recipe_items?id=not.is.null',{method:'DELETE'});
      const payload=Object.entries(snapshot).flatMap(([productId,items])=>(items||[]).map((item,position)=>({product_id:productId,position,ingredient_name:String(item.name||''),quantity:Number(item.qty||0),unit:item.unit||'g',stock:Number(item.stock||0),margin:Number(item.margin||0),updated_at:new Date().toISOString()})));
      if(payload.length)await request('recipe_items?on_conflict=product_id,position',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(payload)});
      revisions.recipes=new Date().toISOString();localStorage.setItem(revisionKey,JSON.stringify(revisions));forceSections.delete('recipes');delete conflicts.recipes;saveConflicts();
      if(recipeRevision===revision){recipeDirty=false;clearPending('recipes')}
      status('Облако ✓');return true;
    })().finally(()=>savingRecipes=null);
    const result=await savingRecipes;
    if(recipeDirty)return saveRecipesNow();
    return result;
  }
  async function flushRecipes(){
    clearTimeout(recipeTimer);recipeTimer=0;
    if(!ready)return false;
    while(recipeDirty||savingRecipes){if(savingRecipes)await savingRecipes;else await saveRecipesNow()}
    return true;
  }
  const safeMessengerRows=value=>Array.isArray(value)?value.filter(item=>item&&item.name&&item.contact).slice(0,10).map(item=>({name:String(item.name).slice(0,40),contact:String(item.contact).slice(0,120)})):[];
  const normalizeCloudPartnerType=value=>{const raw=String(value??'').trim().toLowerCase(),aliases={restaurant:'restaurant','ресторан':'restaurant',restaurante:'restaurant',shop:'shop','магазин':'shop',tienda:'shop',hotel:'hotel','отель':'hotel',cafe:'cafe','кафе':'cafe','café':'cafe',catering:'catering','кейтеринг':'catering',cátering:'catering',other:'other','другое':'other',otro:'other'};return aliases[raw]||'restaurant'};
  const restaurantRow=r=>({id:r.id,name:r.name,email:r.email,phone:r.phone||null,whatsapp:r.whatsapp||null,telegram:r.telegram||null,extra_messengers:safeMessengerRows(r.extraMessengers),address:r.address||null,legal_name:r.legalName||null,tax_id:r.taxId||null,billing_address:r.billingAddress||null,language:r.language||'ru',partner_type:normalizeCloudPartnerType(r.partnerType),active:!r.deletedAt,updated_at:new Date().toISOString()});
  const rowRestaurant=(row,local)=>({id:row.id,name:row.name,email:row.email,phone:row.phone||'',whatsapp:row.whatsapp||'',telegram:row.telegram||'',extraMessengers:safeMessengerRows(row.extra_messengers),address:row.address||'',legalName:row.legal_name||'',taxId:row.tax_id||'',billingAddress:row.billing_address||'',language:row.language||'ru',partnerType:normalizeCloudPartnerType(row.partner_type||local?.partnerType),accessCode:local?.accessCode||'',prices:Object.fromEntries((row.restaurant_prices||[]).map(item=>[item.product_id,Number(item.price)])),...(row.active?{}:{deletedAt:local?.deletedAt||row.updated_at})});
  async function loadRestaurants(){
    if(pending.restaurants){await saveRestaurantsNow();return}
    const rows=await request('restaurants?select=*,restaurant_prices(product_id,price)&order=created_at.asc');
    rememberRevision('restaurants',rows);
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
    await guardSection('restaurants','restaurants');
    if(restaurants.length)await request('restaurants?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(restaurants.map(restaurantRow))});
    const prices=restaurants.flatMap(r=>Object.entries(r.prices||{}).map(([product_id,price])=>({restaurant_id:r.id,product_id,price:Number(price),updated_at:new Date().toISOString()})));
    if(prices.length)await request('restaurant_prices?on_conflict=restaurant_id,product_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(prices)});
    revisions.restaurants=new Date().toISOString();localStorage.setItem(revisionKey,JSON.stringify(revisions));forceSections.delete('restaurants');delete conflicts.restaurants;saveConflicts();
    clearPending('restaurants');
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
    if(pending.orders){await saveOrdersNow();clearPending('orders')}
    loadingOrders=(async()=>{const rows=await request('orders?select=id,order_number,restaurant_id,status,comment,cancelled_reason,created_at,bake_days(bake_date,delivery_date),order_items(product_id,quantity,unit_price)&order=order_number.asc');orders=(rows||[]).map(rowOrder);localStorage.setItem('panora-orders',JSON.stringify(orders));syncPlansFromOrders();if(financeLoaded)await repairMissingDeliveryNotes();if(typeof renderCommerce==='function')renderCommerce();if(typeof renderAll==='function')renderAll();status(`Облако ✓ · ${rows?.length||0} заказов`)})().finally(()=>loadingOrders=null);return loadingOrders
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
  async function shipOrderAtomic({orderId,items,paymentAmount=0,paymentMethod='Наличные',paymentDueDate=null,traysDelivered=0,traysReturned=0,trayBalanceAfter=0}){
    if(!ready)throw new Error('Нет соединения с облаком');
    if(shippingLocks.has(orderId)){audit('shipment.duplicate_prevented',`Заказ ${orderId}: повторное нажатие заблокировано`,'warning');throw new Error('Отгрузка уже выполняется')}
    const localNote=deliveryNotes.find(entry=>entry.orderId===orderId);
    if(localNote){audit('shipment.duplicate_prevented',`Заказ ${orderId}: накладная уже существует`,'warning');return localNote}
    shippingLocks.add(orderId);
    try{
      if(loadingOrders)await loadingOrders;
      clearTimeout(orderTimer);orderTimer=0;
      const existing=await request(`delivery_notes?order_id=eq.${encodeURIComponent(orderId)}&select=id,note_number&limit=1`);
      if(existing?.length){
        await loadDeliveryNotes();
        const found=deliveryNotes.find(entry=>entry.orderId===orderId);
        audit('shipment.duplicate_prevented',`Заказ ${orderId}: найдена существующая накладная ${existing[0].note_number}`,'warning');
        if(found)return found;
      }
    await request('rpc/panora_ship_order',{
        method:'POST',
        headers:{Prefer:'return=representation'},
        body:JSON.stringify({
          p_order_id:orderId,
          p_items:(items||[]).map(item=>({product_id:item.product,quantity:Number(item.quantity||0)})),
          p_payment_amount:Number(paymentAmount||0),
          p_payment_method:paymentMethod||'Наличные',
          p_payment_due_date:paymentDueDate||null
        })
      });
    await request(`delivery_notes?order_id=eq.${encodeURIComponent(orderId)}`,{
      method:'PATCH',
      headers:{Prefer:'return=minimal'},
      body:JSON.stringify({
        trays_delivered:Number(traysDelivered||0),
        trays_returned:Number(traysReturned||0),
        tray_balance_after:Number(trayBalanceAfter||0)
      })
    });
    await loadOrders();await loadPayments();await loadDeliveryNotes();
      const note=deliveryNotes.find(entry=>entry.orderId===orderId);
      if(!note)throw new Error('Supabase не вернул созданную накладную');
      const order=orders.find(entry=>entry.id===orderId);
      audit('shipment.completed',`${order?.number||orderId} · накладная ${note.number||note.noteNumber||''}`);
      return note;
    }catch(error){
      try{
        const existing=await request(`delivery_notes?order_id=eq.${encodeURIComponent(orderId)}&select=id,note_number&limit=1`);
        if(existing?.length){
          await loadOrders();await loadPayments();await loadDeliveryNotes();
          const recovered=deliveryNotes.find(entry=>entry.orderId===orderId);
          if(recovered){
            const order=orders.find(entry=>entry.id===orderId);
            audit('shipment.recovered',`${order?.number||orderId} · накладная ${recovered.number||existing[0].note_number}`,'warning');
            status('Облако ✓');
            return recovered;
          }
        }
      }catch(recoveryError){console.warn('Panora shipment recovery failed',recoveryError)}
      audit('shipment.failed',`Заказ ${orderId}: ${error?.message||error}`,'error');
      throw error;
    }finally{shippingLocks.delete(orderId)}
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
  const rowNote=row=>{const order=orders.find(item=>item.id===row.order_id),paid=payments.filter(p=>p.deliveryNoteId===row.id&&p.confirmed!==false).reduce((sum,p)=>sum+Number(p.amount||0),0);return{id:row.id,number:Number(row.note_number),orderId:row.order_id,restaurantId:row.restaurant_id,date:localDate(row.delivered_at),paymentDueDate:row.payment_due_date||'',items:structuredClone(order?.items||[]),prices:structuredClone(order?.prices||{}),bakery:structuredClone(typeof bakerySettings!=='undefined'?bakerySettings:{}),subtotal:Number(row.total),taxRate:Number(order?.taxRate||0),tax:0,total:Number(row.total),paid,balanceAfter:0,traysDelivered:Number(row.trays_delivered||0),traysReturned:Number(row.trays_returned||0),trayBalanceAfter:Number(row.tray_balance_after||0),customerTraysReceived:row.customer_trays_received==null?null:Number(row.customer_trays_received),customerTraysReturned:row.customer_trays_returned==null?null:Number(row.customer_trays_returned),qrToken:row.qr_token,customerConfirmedAt:row.customer_confirmed_at||null,customerReceiver:row.customer_receiver||'',offlineProof:row.offline_received_at?{receivedAt:row.offline_received_at,receiver:row.offline_receiver||'',signature:row.offline_signature||'',pending:false}:null}};
  const recoveredNote=order=>{const items=structuredClone(order.items||[]),prices=structuredClone(order.prices||{}),subtotal=items.reduce((sum,item)=>sum+Number(item.quantity||0)*Number(prices[item.product]||0),0),taxRate=Number(order.taxRate||0),tax=subtotal*taxRate/100;return{id:order.id,number:null,orderId:order.id,restaurantId:order.restaurantId,date:localDate(order.deliveryDate||order.date||new Date().toISOString()),items,prices,bakery:structuredClone(typeof bakerySettings!=='undefined'?bakerySettings:{}),subtotal,taxRate,tax,total:subtotal+tax,paid:0,balanceAfter:0,recovered:true}};
  const deliveryNoteRow=(note,{includeId=true}={})=>{note.qrToken ||= crypto.randomUUID();const row={order_id:note.orderId,restaurant_id:note.restaurantId,delivered_at:`${localDate(note.date)}T12:00:00Z`,payment_due_date:note.paymentDueDate||null,total:Number(note.total||0),trays_delivered:Number(note.traysDelivered||0),trays_returned:Number(note.traysReturned||0),tray_balance_after:Number(note.trayBalanceAfter||0),customer_trays_received:note.customerTraysReceived==null?null:Number(note.customerTraysReceived),customer_trays_returned:note.customerTraysReturned==null?null:Number(note.customerTraysReturned),qr_token:note.qrToken,customer_confirmed_at:note.customerConfirmedAt||null,customer_receiver:note.customerReceiver||null,offline_received_at:note.offlineProof?.receivedAt||null,offline_receiver:note.offlineProof?.receiver||null,offline_signature:note.offlineProof?.signature||null};if(includeId&&note.id)row.id=note.id;if(Number(note.number)>0)row.note_number=Number(note.number);return row};
  async function repairMissingDeliveryNotes(){
    if(repairingFinance)return repairingFinance;
    repairingFinance=(async()=>{
      const remoteRows=await request('delivery_notes?select=*');
      const remoteOrders=new Set((remoteRows||[]).map(row=>row.order_id));
      const missing=(orders||[]).filter(order=>order.status==='shipped'&&order.restaurantId&&!remoteOrders.has(order.id));
      for(const order of missing){
        const local=deliveryNotes.find(note=>note.orderId===order.id)||recoveredNote(order);
        const rows=await request('delivery_notes?on_conflict=order_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(deliveryNoteRow(local,{includeId:false}))});
        const saved=rows?.[0];if(!saved)throw new Error(`Не удалось восстановить накладную заказа PN-${String(order.number||'—').padStart(4,'0')}`);
        const restored=rowNote(saved),index=deliveryNotes.findIndex(note=>note.orderId===order.id);
        if(index>=0)deliveryNotes[index]=restored;else deliveryNotes.push(restored);
      }
      for(const row of remoteRows||[]){if(!deliveryNotes.some(note=>note.orderId===row.order_id))deliveryNotes.push(rowNote(row))}
      recalculateBalances();localStorage.setItem('panora-delivery-notes',JSON.stringify(deliveryNotes));
      if(typeof renderCommerce==='function')renderCommerce();
      return missing.length;
    })().finally(()=>repairingFinance=null);
    return repairingFinance;
  }
  async function loadDeliveryNotes(){
    const rows=await request('delivery_notes?select=*&order=note_number.asc');
    const local=JSON.parse(localStorage.getItem('panora-delivery-notes')||'[]');
    const remote=(rows||[]).map(rowNote),remoteIds=new Set(remote.map(note=>note.id)),remoteOrders=new Set(remote.map(note=>note.orderId)),pending=local.filter(note=>!remoteIds.has(note.id)&&!remoteOrders.has(note.orderId));
    deliveryNotes=[...remote,...pending];
    financeLoaded=true;localStorage.setItem('panora-delivery-notes',JSON.stringify(deliveryNotes));
    if(pending.length){ready=true;try{await saveDeliveryNotesNow()}catch(error){console.warn('Pending delivery notes were not uploaded; repair will retry by order.',error)}}
    ready=true;await repairMissingDeliveryNotes();
    if(typeof renderCommerce==='function')renderCommerce()
  }
  async function saveDeliveryNotesNow(){
    if(!ready||typeof deliveryNotes==='undefined')return;
    const valid=deliveryNotes.filter(note=>orders.some(order=>order.id===note.orderId)&&restaurants.some(r=>r.id===note.restaurantId));
    if(!valid.length)return;
    status('Синхронизация…');
    const payload=valid.map(note=>deliveryNoteRow(note));
    const rows=await request('delivery_notes?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(payload)});
    (rows||[]).forEach(row=>{const note=deliveryNotes.find(item=>item.id===row.id);if(note){note.number=Number(row.note_number);note.qrToken=row.qr_token}});
    localStorage.setItem('panora-delivery-notes',JSON.stringify(deliveryNotes));status('Облако ✓');
  }
  const rowPayment=row=>({id:row.id,restaurantId:row.restaurant_id,deliveryNoteId:row.delivery_note_id||null,date:localDate(row.received_at),amount:Number(row.amount),method:row.method,note:row.note||'',confirmed:row.status==='confirmed',confirmedAt:row.confirmed_at||null,status:row.status});
  function cachePayment(row){
    const payment=rowPayment(row);
    const index=payments.findIndex(item=>item.id===payment.id);
    if(index>=0)payments[index]=payment;
    else payments.push(payment);
    localStorage.setItem('panora-payments',JSON.stringify(payments));
    recalculateBalances();
    if(typeof renderCommerce==='function')renderCommerce();
    return payment;
  }
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
  async function recordPaymentAtomic(input){
    if(!ready)throw new Error('Облако ещё загружается.');
    const rows=await request('rpc/panora_record_payment',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({
      p_restaurant_id:input.restaurantId,
      p_amount:Number(input.amount),
      p_method:input.method||'Наличные',
      p_note:input.note||null,
      p_delivery_note_id:input.deliveryNoteId||null,
      p_received_at:input.receivedAt||new Date().toISOString()
    })});
    const row=Array.isArray(rows)?rows[0]:rows;
    if(!row?.id)throw new Error('Сервер не вернул сохранённую оплату.');
    status('Облако ✓');
    return cachePayment(row);
  }
  async function confirmPaymentAtomic(paymentId){
    if(!ready)throw new Error('Облако ещё загружается.');
    const rows=await request('rpc/panora_confirm_payment',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_payment_id:paymentId})});
    const row=Array.isArray(rows)?rows[0]:rows;
    if(!row?.id)throw new Error('Сервер не подтвердил оплату.');
    status('Облако ✓');
    return cachePayment(row);
  }
function financeTimeline(restaurantId){
  if(typeof deliveryNotes==='undefined'||typeof payments==='undefined')return[];
  const notes=deliveryNotes.filter(note=>note.restaurantId===restaurantId);
  const noteById=new Map(notes.map(note=>[note.id,note]));
  const events=[
    ...notes.map(note=>({
      id:`delivery:${note.id}`,
      date:String(note.date||''),
      kind:'delivery',
      sequence:Number(note.number||0)*2,
      note,
      amount:Number(note.total||0)
    })),
    ...payments.filter(payment=>payment.restaurantId===restaurantId&&payment.status!=='cancelled').map(payment=>{
      const linkedNote=noteById.get(payment.deliveryNoteId);
      const paidAtShipment=linkedNote&&String(linkedNote.date||'')===String(payment.date||'');
      return{
        id:`payment:${payment.id}`,
        date:String(payment.date||''),
        kind:'payment',
        sequence:paidAtShipment?Number(linkedNote.number||0)*2+1:1000000,
        payment,
        amount:Number(payment.amount||0),
        linkedNote:linkedNote||null
      };
    })
  ].sort((a,b)=>a.date.localeCompare(b.date)||a.sequence-b.sequence||a.id.localeCompare(b.id));

  let running=0;
  events.forEach(event=>{
    if(event.kind==='delivery'){
      event.note.balanceBefore=running;
      running+=event.amount;
      event.note.balanceAfter=running;
    }else if(event.payment.confirmed!==false){
      running=Math.max(0,running-event.amount);
      if(event.linkedNote&&event.date===String(event.linkedNote.date||'')){
        event.linkedNote.balanceAfter=running;
      }
    }
    event.balanceAfter=running;
  });

  notes.forEach(note=>{
    const linked=payments.filter(payment=>
      payment.deliveryNoteId===note.id&&
      payment.confirmed!==false&&
      payment.status!=='cancelled'
    );
    note.paid=linked.reduce((sum,payment)=>sum+Number(payment.amount||0),0);
    note.paidAtShipment=linked
      .filter(payment=>String(payment.date||'')===String(note.date||''))
      .reduce((sum,payment)=>sum+Number(payment.amount||0),0);
  });
  return events;
}
function recalculateBalances(){
  if(typeof deliveryNotes==='undefined'||typeof payments==='undefined')return;
  new Set([
    ...deliveryNotes.map(note=>note.restaurantId),
    ...payments.map(payment=>payment.restaurantId)
  ].filter(Boolean)).forEach(financeTimeline);
  localStorage.setItem('panora-delivery-notes',JSON.stringify(deliveryNotes));
}
window.panoraFinanceTimeline=financeTimeline;
window.panoraRecalculateBalances=recalculateBalances;
  const remotePlan=p=>({id:`${p.id}:${p.product_id}`,bakeDate:p.bake_date,deliveryDate:p.delivery_date,product:p.product_id,planned:Number(p.planned_quantity),ordered:0,cutoff:p.cutoff_at,open:p.accepting_orders});
  async function getRemotePlans(){
    const days=await request('bake_days?select=id,bake_date,delivery_date,cutoff_at,accepting_orders,updated_at,bake_items(product_id,planned_quantity)&order=bake_date.asc');
    rememberRevision('plans',days);
    return (days||[]).flatMap(day=>(day.bake_items||[]).map(item=>remotePlan({...day,...item})));
  }
  async function loadPlans(){
    if(pending.plans){await savePlansNow();return}
    const remote=await getRemotePlans();
    const local=JSON.parse(localStorage.getItem('panora-production-plans')||'[]');
    if(remote.length){plans=remote;localStorage.setItem('panora-production-plans',JSON.stringify(plans));if(typeof renderAll==='function')renderAll()}
    else if(local.length){plans=local;ready=true;await savePlansNow()}
  }
  async function savePlansNow(){
    if(!ready||typeof plans==='undefined')return;
    status('Синхронизация…');
    await guardSection('plans','bake_days');
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
    revisions.plans=new Date().toISOString();localStorage.setItem(revisionKey,JSON.stringify(revisions));forceSections.delete('plans');delete conflicts.plans;saveConflicts();
    clearPending('plans');
    status('Облако ✓');
  }
  const fail=(section,error)=>{console.error(`Panora cloud sync · ${section}`,error);if(error?.panoraConflict){showConflicts();return}audit('sync.failed',`${section}: ${error?.message||error}`,'error');status(`Ошибка: ${section}`,true,error?.message||String(error))};
  function queuePlans(){markPending('plans');clearTimeout(planTimer);planTimer=setTimeout(()=>savePlansNow().catch(error=>fail('план',error)),350)}
  function queueProducts(){productDirty=true;markPending('products');clearTimeout(productTimer);productTimer=setTimeout(()=>flushProducts().catch(error=>fail('товары',error)),350)}
  function queueRecipes(){recipeDirty=true;recipeRevision++;markPending('recipes');clearTimeout(recipeTimer);recipeTimer=setTimeout(()=>flushRecipes().catch(error=>fail('рецептуры',error)),400)}
  function queueRestaurants(){markPending('restaurants');clearTimeout(restaurantTimer);restaurantTimer=setTimeout(()=>saveRestaurantsNow().catch(error=>fail('партнёры',error)),350)}
  function queueOrders(){markPending('orders');clearTimeout(orderTimer);orderTimer=setTimeout(()=>saveOrdersNow().then(()=>clearPending('orders')).catch(error=>fail('заказы',error)),500)}
  async function syncFinanceNow(){
    clearTimeout(financeTimer);
    if(savingOrders)await savingOrders;
    else if(typeof orders!=='undefined')await saveOrdersNow();
    await saveDeliveryNotesNow();
    await savePaymentsNow();
    const remote=await request('delivery_notes?select=id,order_id,qr_token');
    const remoteByOrder=new Map((remote||[]).map(row=>[row.order_id,row]));
    for(const note of deliveryNotes||[]){
      const saved=remoteByOrder.get(note.orderId);
      if(!saved)throw new Error(`Накладная по заказу PN-${String(orders.find(order=>order.id===note.orderId)?.number||'—').padStart(4,'0')} не подтверждена облаком`);
      note.qrToken=saved.qr_token||note.qrToken;
    }
    localStorage.setItem('panora-delivery-notes',JSON.stringify(deliveryNotes));
    recalculateBalances();
    if(typeof renderCommerce==='function')renderCommerce();
    return true;
  }
  function queueFinance(){
    markPending('finance');
    clearTimeout(financeTimer);
    financeTimer=setTimeout(()=>syncFinanceNow().then(()=>clearPending('finance')).catch(error=>fail('накладные и оплаты',error)),120);
  }
  async function loadOperationEvents(){
    try{
      const rows=await request('operation_events?select=id,event_type,entity_type,entity_id,restaurant_id,payload,created_at&order=created_at.desc&limit=200');
      window.panoraAudit?.mergeCloud(rows||[]);
      return rows||[];
    }catch(error){
      const message=String(error?.message||error);
      if(!/operation_events|42P01|PGRST205/i.test(message))console.warn('Panora operation journal',error);
      return [];
    }
  }
  async function loadCloudSection(section,acceptedRemoteAt=''){
    const previous=pending[section];delete pending[section];
    if(section==='products')productDirty=false;
    if(section==='recipes')recipeDirty=false;
    try{
      if(section==='products')await loadProducts();else if(section==='recipes')await loadRecipes();else if(section==='restaurants')await loadRestaurants();else if(section==='plans')await loadPlans();
      if(acceptedRemoteAt&&String(acceptedRemoteAt)>String(revisions[section]||''))revisions[section]=String(acceptedRemoteAt);
      localStorage.setItem(revisionKey,JSON.stringify(revisions));
      forceSections.delete(section);clearPending(section);delete conflicts[section];saveConflicts();
    }
    catch(error){if(previous)pending[section]=previous;if(section==='products')productDirty=Boolean(previous);if(section==='recipes')recipeDirty=Boolean(previous);throw error}
  }
  async function resolveConflicts(){
    const sections=Object.keys(conflicts);if(!sections.length)return retrySync();
    const sectionNames={products:'Товары и технологические карты',recipes:'Рецептуры',restaurants:'Партнёры',plans:'План производства'},names=sections.map(section=>sectionNames[section]||section).join(', '),choice=await chooseConflictVersion(names);
    if(choice==='later'){showConflicts();return false}
    if(choice==='local'){sections.forEach(section=>forceSections.add(section));audit('sync.conflict_local',`Выбрана локальная версия: ${names}`,'warning');return retrySync()}
    try{const backup=saveBackup(sections,'conflict-cloud'),accepted=Object.fromEntries(sections.map(section=>[section,conflicts[section]?.remoteAt||'']));for(const section of sections)await loadCloudSection(section,accepted[section]);audit('sync.conflict_cloud',`Выбрана облачная версия: ${names}`,'warning');status(backup?'Облако загружено · есть резерв':'Облачная версия загружена ✓',false,backup?'Нажмите, чтобы восстановить прежнюю локальную версию':'');const el=document.querySelector('#saveState');if(el&&backup){el.style.cursor='pointer';el.onclick=restoreLatestBackup}return true}catch(error){fail('разрешение конфликта',error);return false}
  }
  async function restoreBackup(snapshot){
    if(!snapshot)return false;
    const sections=Object.keys(snapshot.data||{});if(!sections.length)return false;
    const diff=backupDiff(snapshot),hasChanges=diff.some(row=>row.added||row.changed||row.removed);
    if(!hasChanges){alert('Этот снимок полностью совпадает с текущими данными. Восстановление не требуется.');return false}
    const preview=`Сравнение с текущими данными\n\n${backupDiffText(diff)}\n\nПосле подтверждения текущие данные будут сохранены отдельным резервом, а выбранный снимок отправлен в облако. Продолжить?`;
    if(!confirm(preview)){audit('sync.backup_restore_cancelled','Восстановление отменено после сравнения');return false}
    try{
      saveBackup(sections,'before-restore');
      sections.forEach(section=>{const key=sectionKeys[section];if(!key)return;localStorage.setItem(key,snapshot.data[section]);markPending(section);forceSections.add(section)});
      if(snapshot.data.products&&typeof productRegistry!=='undefined')productRegistry=JSON.parse(snapshot.data.products);
      if(snapshot.data.recipes&&typeof recipes!=='undefined'){recipes=JSON.parse(snapshot.data.recipes);recipeDirty=true;recipeRevision++}
      if(snapshot.data.restaurants&&typeof restaurants!=='undefined')restaurants=JSON.parse(snapshot.data.restaurants);
      if(snapshot.data.plans&&typeof plans!=='undefined')plans=JSON.parse(snapshot.data.plans);
      if(snapshot.data.products)productDirty=true;
      audit('sync.backup_restored',`Восстановлен резерв: ${backupDiffText(diff).replaceAll('\n','; ')}`,'warning');
      closeBackupHistory();
      if(typeof syncAdminProductRegistry==='function')syncAdminProductRegistry();if(typeof renderAll==='function')renderAll();
      return retrySync();
    }catch(error){fail('восстановление резерва',error);return false}
  }
  async function restoreLatestBackup(){return restoreBackup(readBackups()[0])}
  function closeBackupHistory(){const modal=document.querySelector('#syncBackupModal');if(modal)modal.hidden=true}
  const checksumText=async text=>{
    if(!window.crypto?.subtle)throw new Error('Проверка целостности не поддерживается этим браузером');
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
    return Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
  };
  async function downloadBackup(snapshot){
    if(!snapshot)return;
    const snapshotText=JSON.stringify(snapshot),checksum=await checksumText(snapshotText);
    const payload={type:'panora-sync-backup',version:2,exportedAt:new Date().toISOString(),integrity:{algorithm:'SHA-256',checksum},snapshot};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`panora-reserve-${String(snapshot.at||'').slice(0,10)||'backup'}.json`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    audit('sync.backup_exported','Экспортирован резерв с контрольной суммой SHA-256');
  }
  function validateImportedBackup(value){
    const snapshot=value?.type==='panora-sync-backup'?value.snapshot:value?.snapshot||value;
    if(!snapshot||typeof snapshot!=='object'||!snapshot.data||typeof snapshot.data!=='object')throw new Error('Файл не содержит резерв Panora');
    const data={};
    for(const [section,raw] of Object.entries(snapshot.data)){
      if(!sectionKeys[section]||typeof raw!=='string')continue;
      const parsed=JSON.parse(raw),valid=section==='recipes'?Boolean(parsed&&typeof parsed==='object'&&!Array.isArray(parsed)):Array.isArray(parsed);
      if(!valid)throw new Error(`Неверная структура раздела «${backupSectionNames[section]}»`);
      data[section]=raw;
    }
    if(!Object.keys(data).length)throw new Error('В резерве нет поддерживаемых разделов');
    const at=new Date(snapshot.at);return{id:`${Date.now()}-import-${Math.random().toString(36).slice(2)}`,at:Number.isNaN(at.getTime())?new Date().toISOString():at.toISOString(),reason:'imported',source:'imported',integrity:value?.integrity?'sha256':'legacy',data};
  }
  async function importBackupFile(file){
    if(!file)return;
    try{
      if(file.size>5*1024*1024)throw new Error('Размер файла превышает 5 МБ');
      const value=JSON.parse(await file.text()),source=value?.type==='panora-sync-backup'?value.snapshot:value?.snapshot||value;
      let integrity='Старый формат без контрольной суммы';
      if(value?.integrity){
        if(value.integrity.algorithm!=='SHA-256'||!value.integrity.checksum)throw new Error('Неизвестный формат контрольной суммы');
        const actual=await checksumText(JSON.stringify(source));
        if(actual!==String(value.integrity.checksum).toLowerCase()){audit('sync.backup_integrity_failed',file.name||'Импорт резервной копии','warning');throw new Error('Контрольная сумма не совпадает: файл изменён или повреждён')}
        integrity='Целостность подтверждена SHA-256';
      }
      const snapshot=validateImportedBackup(value),sections=Object.keys(snapshot.data).map(section=>backupSectionNames[section]||section).join(', ');
      const size=Object.values(snapshot.data).reduce((total,raw)=>total+new Blob([raw]).size,0);
      const preview=`Проверка завершена.\n\nДата снимка: ${new Date(snapshot.at).toLocaleString('ru-RU')}\nРазделы: ${sections}\nОбъём данных: ${(size/1024).toFixed(1)} КБ\n${integrity}\n\nДобавить снимок в историю?`;
      if(!confirm(preview)){audit('sync.backup_import_cancelled','Импорт отменён после предварительного просмотра');return}
      const backups=[snapshot,...readBackups()].slice(0,10);
      localStorage.setItem(backupKey,JSON.stringify(backups));audit('sync.backup_imported',`Импортирован резерв: ${Object.keys(snapshot.data).join(', ')}`);renderBackupHistory();
      if(confirm('Резерв проверен и добавлен в историю. Восстановить его сейчас?'))await restoreBackup(snapshot);
    }catch(error){alert(`Не удалось импортировать резерв. ${error.message||'Проверьте выбранный файл.'}`);audit('sync.backup_import_failed',String(error.message||error),'warning')}
  }
  function renderBackupHistory(){
    const root=document.querySelector('#syncBackupList');if(!root)return;
    const backups=readBackups();
    root.innerHTML=backups.length?backups.map((snapshot,index)=>{const sectionList=Object.keys(snapshot.data||{}),sections=sectionList.map(section=>backupSectionNames[section]||section).join(', '),bytes=Object.values(snapshot.data||{}).reduce((total,raw)=>total+new Blob([String(raw)]).size,0),source=snapshot.source==='imported'||snapshot.reason==='imported'?'Импортирован':'Автоматический',integrity=snapshot.integrity==='sha256'?'SHA-256 проверен':snapshot.integrity==='legacy'?'Старый формат':'Локальный снимок';return `<article class="sync-backup-item"><div class="sync-backup-title"><div><strong>${new Date(snapshot.at).toLocaleString('ru-RU')}</strong><div class="sync-backup-meta">${backupReasonNames[snapshot.reason]||'Автоматический резерв'}</div></div>${index===0?'<span class="sync-backup-latest">Последний</span>':''}</div><div class="sync-backup-badges"><span>${source}</span><span>${integrity}</span></div><div class="sync-backup-sections">${sections||'Нет доступных разделов'} · ${sectionList.length} разд. · ${(bytes/1024).toFixed(1)} КБ</div><div class="sync-backup-actions"><button type="button" class="secondary" data-backup-restore="${snapshot.id}">Сравнить и восстановить</button><button type="button" class="secondary" data-backup-export="${snapshot.id}">Экспорт</button><button type="button" class="secondary sync-backup-delete" data-backup-delete="${snapshot.id}" ${backups.length===1?'disabled title="Последний резерв защищён"':''}>Удалить</button></div></article>`}).join(''):'<p class="sync-backup-empty">Резервных снимков пока нет.</p>';
  }
  function openBackupHistory(){renderBackupHistory();const modal=document.querySelector('#syncBackupModal');if(modal)modal.hidden=false}
  function deleteBackup(id){
    const backups=readBackups(),snapshot=backups.find(item=>item.id===id);if(!snapshot)return;
    if(backups.length<=1){alert('Нельзя удалить последний резервный снимок. Сначала создайте или импортируйте другой резерв.');return}
    if(!confirm(`Удалить резерв от ${new Date(snapshot.at).toLocaleString('ru-RU')}? Это действие нельзя отменить.`))return;
    localStorage.setItem(backupKey,JSON.stringify(backups.filter(item=>item.id!==id)));audit('sync.backup_deleted','Удалён резерв данных','warning');renderBackupHistory();
  }
  function cleanupBackups(){
    const backups=readBackups();if(backups.length<=1){alert(backups.length?'Оставлен единственный защищённый резерв.':'Резервных снимков пока нет.');return}
    if(!confirm(`Удалить ${backups.length-1} старых резервов и оставить самый новый? Последний рабочий снимок будет сохранён.`))return;
    localStorage.setItem(backupKey,JSON.stringify([backups[0]]));audit('sync.backups_cleaned',`Удалено старых резервов: ${backups.length-1}`,'warning');renderBackupHistory();
  }
  function initBackupHistory(){
    document.querySelector('#syncBackupHistory')?.addEventListener('click',openBackupHistory);document.querySelector('#syncBackupClose')?.addEventListener('click',closeBackupHistory);document.querySelector('#syncBackupCleanup')?.addEventListener('click',cleanupBackups);document.querySelector('#syncBackupImport')?.addEventListener('click',()=>document.querySelector('#syncBackupImportFile')?.click());document.querySelector('#syncBackupImportFile')?.addEventListener('change',event=>{const file=event.target.files?.[0];event.target.value='';importBackupFile(file)});
    document.querySelector('#syncBackupModal')?.addEventListener('click',event=>{if(event.target.id==='syncBackupModal')closeBackupHistory()});
    document.querySelector('#syncBackupList')?.addEventListener('click',event=>{const restore=event.target.closest('[data-backup-restore]'),download=event.target.closest('[data-backup-export]'),remove=event.target.closest('[data-backup-delete]');if(restore)restoreBackup(readBackups().find(item=>item.id===restore.dataset.backupRestore));if(download)downloadBackup(readBackups().find(item=>item.id===download.dataset.backupExport));if(remove)deleteBackup(remove.dataset.backupDelete)});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeBackupHistory()});
  }
  async function retrySync(){
    if(retrying)return retrying;
    if(!navigator.onLine){status('Сохранено на устройстве');return false}
    if(!ready){status('Облако не подключено',true,'Сначала войдите в приложение');return false}
    retrying=(async()=>{status(`Синхронизация${pendingCount()?` · ${pendingCount()}`:''}…`);
    try{
      if(pending.products)await flushProducts();
      if(pending.recipes)await flushRecipes();
      if(pending.restaurants)await saveRestaurantsNow();
      if(pending.plans)await savePlansNow();
      if(pending.orders){await saveOrdersNow();clearPending('orders')}
      if(pending.finance){await syncFinanceNow();clearPending('finance')}
      await loadRestaurants();await loadProducts();await loadPlans();await loadRecipes();await loadOrders();await loadPayments();await loadDeliveryNotes();await loadOperationEvents();
      audit('sync.restored','Облачная синхронизация восстановлена');
      status('Облако ✓');return true;
    }catch(error){fail('повтор',error);return false}
    })().finally(()=>retrying=null);
    return retrying;
  }
  async function start(authSession){
    if(!authSession?.access_token||session?.access_token===authSession.access_token&&ready)return;
    session=authSession;ready=true;status('Загрузка облака…');
    const steps=[['товары',loadProducts],['рецептуры',loadRecipes],['план',loadPlans],['партнёры',loadRestaurants],['заказы',loadOrders],['накладные',loadDeliveryNotes],['оплаты',loadPayments],['журнал',loadOperationEvents]],errors=[];
    for(const [name,run] of steps){status(`Загрузка: ${name}…`);try{await run()}catch(error){errors.push([name,error]);console.error(`Panora cloud sync · ${name}`,error)}}
    if(productDirty)try{await flushProducts()}catch(error){errors.push(['товары',error])}
    if(recipeDirty)try{await flushRecipes()}catch(error){errors.push(['рецептуры',error])}
    clearInterval(orderPoll);orderPoll=setInterval(async()=>{try{await loadOrders();await loadDeliveryNotes()}catch(error){fail('заказы и накладные',error)}},4000);
    clearInterval(productPoll);productPoll=setInterval(()=>refreshProductsIfChanged().catch(error=>console.warn('Panora product refresh',error)),5000);
    if(conflictCount())showConflicts();else if(errors.length){const [name,error]=errors[0];fail(name,error)}else status('Облако ✓');
  }
  window.panoraCloud={start,queuePlans,queueProducts,flushProducts,saveProductConfirmed,saveProductTechCardConfirmed,deleteProductConfirmed,queueRecipes,flushRecipes,queueRestaurants,queueOrders,queueFinance,syncFinance:syncFinanceNow,retrySync,resolveConflicts,restoreLatestBackup,openBackupHistory,refreshAudit:loadOperationEvents,repairFinance:repairMissingDeliveryNotes,updateOrderStatus,shipOrderAtomic,recordPaymentAtomic,confirmPaymentAtomic,get ready(){return ready},get pendingCount(){return pendingCount()},get conflictCount(){return conflictCount()},get backupCount(){return readBackups().length}};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',initBackupHistory):initBackupHistory();
  window.addEventListener('panora:authenticated',event=>start(event.detail));
  window.addEventListener('online',()=>{if(ready)retrySync()});
  window.addEventListener('offline',()=>showPending()||status('Сохранено на устройстве'));
  if(window.panoraSupabaseSession)start(window.panoraSupabaseSession);
})();
