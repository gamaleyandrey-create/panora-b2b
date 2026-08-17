const PRODUCTS={plain:{ru:'Льняной бездрожжевой хлеб с семенами',en:'Yeast-free flaxseed bread with seeds',es:'Pan de lino sin levadura con semillas'},pumpkin:{ru:'Тыквенный бездрожжевой хлеб с семенами',en:'Yeast-free pumpkin bread with seeds',es:'Pan de calabaza sin levadura con semillas'}};
const TEXT={
ru:{bakery:'Пекарня',plan:'План выпечки',recipes:'Рецептуры',purchase:'Закупка',stock:'Склад хлеба',planTitle:'План выпечки и доставки',planText:'Добавляйте даты и планируйте каждый хлеб в штуках.',addBake:'+ Добавить выпечку',today:'Сегодня',planned:'Запланировано',ordered:'Заказано',reserve:'Свободно',recipeTitle:'Рецептуры хлеба',recipeText:'Для каждого хлеба укажите вес готового остывшего изделия и закладку ингредиентов на 1 штуку.',purchaseTitle:'Список закупки',purchaseText:'Расчёт по плану выпечки с учётом остатков и страхового запаса.',print:'Печать',ingredient:'Ингредиент',required:'Нужно',ingredientStock:'Остаток',margin:'Запас',buy:'Купить',stockTitle:'Склад готового хлеба',stockText:'Готовый хлеб приходуется только после подтверждения «Выпечка завершена»; выдача рознице и отгрузка партнёру уменьшают остаток.',movement:'+ Корректировка',date:'Дата',product:'Хлеб',operation:'Операция',quantity:'Количество',note:'Примечание',newBake:'Новая выпечка',bakeDate:'Дата выпечки',deliveryDate:'Дата доставки',plannedPiecesLabel:'План, шт.',cutoff:'Приём заказов до',accepting:'Принимать заказы',cancel:'Отмена',save:'Сохранить',newMovement:'Корректировка склада',open:'Заказы открыты',closed:'Закрыто',delivery:'Доставка',cutoffShort:'Заказ до',empty:'На этой неделе выпечек нет',pcs:'шт.',orderedShort:'заказано'},
en:{bakery:'Bakery',plan:'Bake plan',recipes:'Recipes',purchase:'Purchasing',stock:'Bread stock',planTitle:'Bake and delivery plan',planText:'Add dates and plan each bread in pieces.',addBake:'+ Add bake',today:'Today',planned:'Planned',ordered:'Ordered',reserve:'Available',recipeTitle:'Bread recipes',recipeText:'For each bread, enter the finished cooled product weight and ingredients per piece.',purchaseTitle:'Purchase list',purchaseText:'Calculated from the bake plan, stock and safety margin.',print:'Print',ingredient:'Ingredient',required:'Required',ingredientStock:'Stock',margin:'Margin',buy:'Buy',stockTitle:'Finished bread stock',stockText:'Finished bread is added only after confirming “Bake completed”; retail pickup and partner shipment reduce stock.',movement:'+ Adjustment',date:'Date',product:'Bread',operation:'Operation',quantity:'Quantity',note:'Note',newBake:'New bake',bakeDate:'Bake date',deliveryDate:'Delivery date',plannedPiecesLabel:'Plan, pcs',cutoff:'Order cutoff',accepting:'Accept orders',cancel:'Cancel',save:'Save',newMovement:'Stock adjustment',open:'Orders open',closed:'Closed',delivery:'Delivery',cutoffShort:'Cutoff',empty:'No bakes this week',pcs:'pcs',orderedShort:'ordered'},
es:{bakery:'Panadería',plan:'Plan de horneado',recipes:'Recetas',purchase:'Compras',stock:'Stock de pan',planTitle:'Plan de horneado y entrega',planText:'Añade fechas y planifica cada pan por unidades.',addBake:'+ Añadir horneado',today:'Hoy',planned:'Planificado',ordered:'Pedido',reserve:'Disponible',recipeTitle:'Recetas de pan',recipeText:'Indique para cada pan el peso del producto frío terminado y los ingredientes por unidad.',purchaseTitle:'Lista de compras',purchaseText:'Cálculo según el plan, existencias y margen de seguridad.',print:'Imprimir',ingredient:'Ingrediente',required:'Necesario',ingredientStock:'Existencias',margin:'Margen',buy:'Comprar',stockTitle:'Stock de pan terminado',stockText:'El pan terminado entra solo tras confirmar «Horneado finalizado»; la entrega minorista y el envío a socios reducen el stock.',movement:'+ Ajuste',date:'Fecha',product:'Pan',operation:'Operación',quantity:'Cantidad',note:'Nota',newBake:'Nuevo horneado',bakeDate:'Fecha de horneado',deliveryDate:'Fecha de entrega',plannedPiecesLabel:'Plan, uds.',cutoff:'Cierre de pedidos',accepting:'Aceptar pedidos',cancel:'Cancelar',save:'Guardar',newMovement:'Ajuste de stock',open:'Pedidos abiertos',closed:'Cerrado',delivery:'Entrega',cutoffShort:'Cierre',empty:'No hay horneados esta semana',pcs:'uds.',orderedShort:'pedido'}
};
Object.assign(TEXT.ru,{plan:'Календарь выпечки',planTitle:'Календарь выпечки',planText:'Назначайте дни выпечки и указывайте количество каждого хлеба.'});
Object.assign(TEXT.en,{plan:'Bake calendar',planTitle:'Bake calendar',planText:'Schedule bake days and enter the quantity of each bread.'});
Object.assign(TEXT.es,{plan:'Calendario de horneado',planTitle:'Calendario de horneado',planText:'Programa los días de horneado e indica la cantidad de cada pan.'});
const DEFAULT_RECIPES={
 plain:[{name:'Мука пшеничная',qty:450,unit:'g',stock:0,margin:5},{name:'Кефир / пахта',qty:330,unit:'ml',stock:0,margin:5},{name:'Семена льна',qty:45,unit:'g',stock:0,margin:5},{name:'Соль',qty:8,unit:'g',stock:0,margin:5},{name:'Сода пищевая',qty:6,unit:'g',stock:0,margin:5},{name:'Масло растительное',qty:15,unit:'ml',stock:0,margin:5}],
 pumpkin:[{name:'Мука пшеничная',qty:410,unit:'g',stock:0,margin:5},{name:'Пюре тыквенное',qty:190,unit:'g',stock:0,margin:10},{name:'Кефир / пахта',qty:220,unit:'ml',stock:0,margin:5},{name:'Семена тыквы',qty:40,unit:'g',stock:0,margin:5},{name:'Соль',qty:8,unit:'g',stock:0,margin:5},{name:'Сода пищевая',qty:6,unit:'g',stock:0,margin:5},{name:'Масло растительное',qty:18,unit:'ml',stock:0,margin:5}]
};
let lang=localStorage.getItem('panora-admin-lang')||(['ru','en','es'].includes(navigator.language.slice(0,2).toLowerCase())?navigator.language.slice(0,2).toLowerCase():'en');
let weekStart=startOfWeek(new Date());
let plans=read('panora-production-plans',[]);
let recipes=read('panora-recipes',DEFAULT_RECIPES);
let purchaseDateFilter='all';
if(!localStorage.getItem('panora-recipes')){
 recipes=structuredClone(DEFAULT_RECIPES);
 localStorage.setItem('panora-recipes',JSON.stringify(recipes));
}
localStorage.setItem('panora-recipes-version','cloud-2');
let movements=read('panora-stock-movements',[]);
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], t=k=>TEXT[lang][k]||k;
const adminEscape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))||structuredClone(fallback)}catch{return structuredClone(fallback)}}
const PANORA_STORAGE_BACKUP_KEY='panora-cloud-backups-v286';
function isStorageQuotaError(error){return error?.name==='QuotaExceededError'||error?.code===22||/quota/i.test(String(error?.message||error||''))}
function releaseNonCriticalStorage(){
 try{
  const backups=JSON.parse(localStorage.getItem(PANORA_STORAGE_BACKUP_KEY)||'[]');
  if(Array.isArray(backups)&&backups.length>1)localStorage.setItem(PANORA_STORAGE_BACKUP_KEY,JSON.stringify(backups.slice(0,1)));
  else if(Array.isArray(backups)&&backups.length===1){const raw=JSON.stringify(backups[0]);if(raw.length>250000)localStorage.removeItem(PANORA_STORAGE_BACKUP_KEY)}
 }catch{try{localStorage.removeItem(PANORA_STORAGE_BACKUP_KEY)}catch{}}
}
function setLocalStorageSafely(key,payload){
 try{localStorage.setItem(key,payload);return true}catch(error){
  if(!isStorageQuotaError(error))throw error;
  releaseNonCriticalStorage();
  try{localStorage.setItem(key,payload);return true}catch(retryError){
   if(!isStorageQuotaError(retryError))throw retryError;
   console.warn('Panora local cache quota · write skipped',key,retryError);
   window.dispatchEvent(new CustomEvent('panora:storage-quota',{detail:{key}}));
   return false;
  }
 }
}
const PANORA_ORDERS_CACHE_ARCHIVE_LIMIT=20;
function isArchivedAdminOrder(row){
 const status=String(row?.status||'').toLowerCase();
 return Boolean(
  row?.archived ||
  row?.isArchived ||
  row?.archive ||
  ['delivered','cancelled','canceled','closed','archived'].includes(status)
 );
}
function compactAdminOrderForCache(row){
 const copy={...(row||{})};
 if(Array.isArray(copy.items)){
  copy.items=copy.items.map(item=>({
   product:item?.product,
   quantity:Number(item?.quantity||item?.quantityPieces||0),
   nameSnapshot:item?.nameSnapshot||null,
   imageSnapshot:item?.imageSnapshot||''
  }));
 }
 delete copy.statusHistory;
 delete copy.messages;
 delete copy.notificationEvents;
 delete copy.rawPayload;
 return copy;
}
function saveAdminOrdersCache(rows){
 const source=Array.isArray(rows)?rows:[];
 const working=[],archived=[];
 for(const row of source){
  const compact=compactAdminOrderForCache(row);
  (isArchivedAdminOrder(row)?archived:working).push(compact);
 }
 archived.sort((a,b)=>String(b?.createdAt||b?.created_at||b?.date||'').localeCompare(String(a?.createdAt||a?.created_at||a?.date||'')));
 const bounded=[...working,...archived.slice(0,PANORA_ORDERS_CACHE_ARCHIVE_LIMIT)];
 try{
  localStorage.setItem('panora-orders',JSON.stringify(bounded));
  return true;
 }catch(error){
  if(!isStorageQuotaError(error))throw error;
  releaseNonCriticalStorage();
  try{
   localStorage.removeItem('panora-orders');
   localStorage.setItem('panora-orders',JSON.stringify(working));
   return true;
  }catch(retryError){
   if(!isStorageQuotaError(retryError))throw retryError;
   try{localStorage.removeItem('panora-orders')}catch(_){}
   console.warn('Panora local orders cache full · cloud remains authoritative',retryError);
   window.dispatchEvent(new CustomEvent('panora:storage-quota',{detail:{key:'panora-orders'}}));
   return false;
  }
 }
}
window.panoraSaveOrdersCache=saveAdminOrdersCache;
const PANORA_DELIVERY_NOTES_FULL_CACHE_LIMIT=24;
const PANORA_DELIVERY_NOTES_TOTAL_CACHE_LIMIT=140;
function compactDeliveryNoteForCache(note,{full=false}={}){
 const copy={...(note||{})};
 if(!full){
  delete copy.items;
  delete copy.orderedItems;
  delete copy.prices;
  delete copy.bakery;
  delete copy.statusHistory;
  delete copy.messages;
  delete copy.rawPayload;
 }
 return copy;
}
function saveDeliveryNotesCache(rows){
 const source=Array.isArray(rows)?rows:[];
 const sorted=source.slice().sort((a,b)=>{
  const av=Number(a?.number||0)||Date.parse(a?.date||0)||0;
  const bv=Number(b?.number||0)||Date.parse(b?.date||0)||0;
  return bv-av;
 });
 const recent=sorted.slice(0,PANORA_DELIVERY_NOTES_FULL_CACHE_LIMIT).map(note=>compactDeliveryNoteForCache(note,{full:true}));
 const history=sorted.slice(PANORA_DELIVERY_NOTES_FULL_CACHE_LIMIT,PANORA_DELIVERY_NOTES_TOTAL_CACHE_LIMIT).map(note=>compactDeliveryNoteForCache(note));
 const bounded=[...recent,...history];
 let ok=setLocalStorageSafely('panora-delivery-notes',JSON.stringify(bounded));
 if(ok)return true;
 try{localStorage.removeItem('panora-delivery-notes')}catch(_){}
 ok=setLocalStorageSafely('panora-delivery-notes',JSON.stringify(recent.slice(0,10)));
 return Boolean(ok);
}
function savePaymentsCache(rows){
 const source=Array.isArray(rows)?rows:[];
 const sorted=source.slice().sort((a,b)=>String(b?.receivedAt||b?.date||b?.confirmedAt||'').localeCompare(String(a?.receivedAt||a?.date||a?.confirmedAt||'')));
 let ok=setLocalStorageSafely('panora-payments',JSON.stringify(sorted.slice(0,250)));
 if(ok)return true;
 try{localStorage.removeItem('panora-payments')}catch(_){}
 ok=setLocalStorageSafely('panora-payments',JSON.stringify(sorted.slice(0,80)));
 return Boolean(ok);
}
window.panoraSaveDeliveryNotesCache=saveDeliveryNotesCache;
window.panoraSavePaymentsCache=savePaymentsCache;
function store(key,value){const cached=key==='panora-orders'?saveAdminOrdersCache(value):setLocalStorageSafely(key,JSON.stringify(value));const saveState=$('#saveState');if(saveState){const online=navigator.onLine&&window.panoraCloud?.ready;if(!cached&&key==='panora-production-plans'){saveState.textContent=online?(lang==='ru'?'Локальный кэш заполнен · сохраняем в облако':lang==='es'?'Caché local llena · guardando en la nube':'Local cache full · saving to cloud'):(lang==='ru'?'Локальный кэш заполнен · подключитесь для сохранения в облако':lang==='es'?'Caché local llena · conéctese para guardar en la nube':'Local cache full · connect to save to cloud');saveState.dataset.syncState=online?'syncing':'local'}else{saveState.textContent=online?(lang==='ru'?'Сохраняем…':lang==='es'?'Guardando…':'Saving…'):(lang==='ru'?'Сохранено на устройстве · отправим при подключении':lang==='es'?'Guardado en el dispositivo · se enviará al conectar':'Saved on device · will send when online');saveState.dataset.syncState=online?'syncing':'local'}}if(key==='panora-production-plans')window.panoraCloud?.queuePlans();if(key==='panora-recipes'){setLocalStorageSafely('panora-recipes-version','cloud-2');window.panoraCloud?.queueRecipes();window.dispatchEvent(new CustomEvent('panora:recipes-changed'))}}
function startOfWeek(date){const d=new Date(date);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d}
function iso(d){const date=new Date(d),year=date.getFullYear(),month=String(date.getMonth()+1).padStart(2,'0'),day=String(date.getDate()).padStart(2,'0');return `${year}-${month}-${day}`}
function fmt(d,opts={day:'numeric',month:'short'}){return new Intl.DateTimeFormat(lang==='ru'?'ru-RU':lang==='es'?'es-ES':'en-GB',opts).format(new Date(d+'T12:00:00'))}
function productName(id){return PRODUCTS[id]?.[lang]||id}

/* Panora 6.30 — retail stabilization audit for the single-Bakery retail pipeline. */
/* Panora 6.32 — retail finance/stock audit: canonical orders + consistency checks. */
/* Panora 6.33 — retail order event journal and notification preferences. */
/* Panora 6.36 — in-app retail messages + fallback messenger contacts. */
/* Panora 6.36 — notification center + Web Push subscription foundation. */
/* Panora 6.38 — server Web Push sender integration. */
const RETAIL_SETTINGS_KEY='panora-retail-settings-v623';
const RETAIL_SETTINGS_LEGACY_KEYS=['panora-retail-settings-v622','panora-retail-settings-v619'];
const RETAIL_PRODUCT_SETTINGS_KEY='panora-retail-product-settings-v623';
const RETAIL_ORDERS_KEY='panora-retail-orders';
const RETAIL_DEFAULT_SETTINGS={
 enabled:true,location:'bakery',locationName:'Пекарня',stockSales:true,preorders:true,pickup:true,delivery:false,
 onlinePayment:true,payOnPickup:true,reservationMinutes:15,preorderCutoffHours:24,preorderHorizonDays:7,
 pickupLeadMinutes:60,maxOrdersPerSlot:12,pickupSlots:['09:00–11:00','11:00–13:00','13:00–15:00'],
 deliveryMinTotal:20,deliveryFee:5,deliveryFreeFrom:50,maxDeliveriesPerSlot:8,deliverySlots:['11:00–13:00','13:00–15:00','15:00–17:00'],
 contactPhone:'',contactEmail:'',pickupNote:'',paymentProvider:'none',
 notifyOrderReceived:true,notifyReady:true,notifyDelivery:true,notifyCancelled:true,
 contactWhatsApp:'',contactTelegram:'',fallbackWhatsApp:true,fallbackTelegram:true,fallbackSms:true,fallbackEmail:true,
 pushCustomerEnabled:true,pushAdminEnabled:true,pushNewOrder:true,pushNewMessage:true,pushQuietFrom:'22:00',pushQuietTo:'08:00',pushVapidPublicKey:'',pushTimeZone:(Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC')
};
let retailOrderFilter='active';
let retailUnreadMessages=new Map();
let retailAnalyticsPeriod='30';
function retailSettingsSavedValue(){
 try{
  const current=JSON.parse(localStorage.getItem(RETAIL_SETTINGS_KEY)||'null');if(current&&typeof current==='object')return {saved:current,isCurrent:true};
  for(const key of RETAIL_SETTINGS_LEGACY_KEYS){const legacy=JSON.parse(localStorage.getItem(key)||'null');if(legacy&&typeof legacy==='object')return {saved:{...legacy,enabled:legacy.enabled!==false},isCurrent:false}}
 }catch{}
 return {saved:{},isCurrent:false};
}
function normalizeRetailSettings(saved={}){
 const slots=Array.isArray(saved.pickupSlots)&&saved.pickupSlots.length?saved.pickupSlots:RETAIL_DEFAULT_SETTINGS.pickupSlots;
 return {...RETAIL_DEFAULT_SETTINGS,...saved,enabled:saved.enabled!==false,location:'bakery',locationName:'Пекарня',
  stockSales:saved.stockSales!==false,preorders:saved.preorders!==false,pickup:saved.pickup!==false,delivery:!!saved.delivery,
  onlinePayment:saved.onlinePayment!==false,payOnPickup:saved.payOnPickup!==false,
  reservationMinutes:Math.min(60,Math.max(5,Number(saved.reservationMinutes||15))),preorderCutoffHours:Math.min(168,Math.max(1,Number(saved.preorderCutoffHours||24))),
  preorderHorizonDays:Math.min(30,Math.max(1,Number(saved.preorderHorizonDays||7))),pickupLeadMinutes:Math.min(1440,Math.max(0,Number(saved.pickupLeadMinutes??60))),
  maxOrdersPerSlot:Math.min(100,Math.max(1,Number(saved.maxOrdersPerSlot||12))),pickupSlots:slots.map(v=>String(v||'').trim()).filter(Boolean).slice(0,20),
  deliveryMinTotal:Math.max(0,Number(saved.deliveryMinTotal??20)),deliveryFee:Math.max(0,Number(saved.deliveryFee??5)),deliveryFreeFrom:Math.max(0,Number(saved.deliveryFreeFrom??50)),maxDeliveriesPerSlot:Math.min(100,Math.max(1,Number(saved.maxDeliveriesPerSlot||8))),deliverySlots:(Array.isArray(saved.deliverySlots)&&saved.deliverySlots.length?saved.deliverySlots:['11:00–13:00','13:00–15:00','15:00–17:00']).map(v=>String(v||'').trim()).filter(Boolean).slice(0,20),
  contactPhone:String(saved.contactPhone||'').trim().slice(0,80),contactEmail:String(saved.contactEmail||'').trim().slice(0,160),pickupNote:String(saved.pickupNote||'').trim().slice(0,500),paymentProvider:['none'].includes(String(saved.paymentProvider||'none'))?String(saved.paymentProvider||'none'):'none',
  notifyOrderReceived:saved.notifyOrderReceived!==false,notifyReady:saved.notifyReady!==false,notifyDelivery:saved.notifyDelivery!==false,notifyCancelled:saved.notifyCancelled!==false,contactWhatsApp:String(saved.contactWhatsApp||''),contactTelegram:String(saved.contactTelegram||''),fallbackWhatsApp:saved.fallbackWhatsApp!==false,fallbackTelegram:saved.fallbackTelegram!==false,fallbackSms:saved.fallbackSms!==false,fallbackEmail:saved.fallbackEmail!==false,pushCustomerEnabled:saved.pushCustomerEnabled!==false,pushAdminEnabled:saved.pushAdminEnabled!==false,pushNewOrder:saved.pushNewOrder!==false,pushNewMessage:saved.pushNewMessage!==false,pushQuietFrom:String(saved.pushQuietFrom||'22:00'),pushQuietTo:String(saved.pushQuietTo||'08:00'),pushVapidPublicKey:String(saved.pushVapidPublicKey||'').trim(),pushTimeZone:String(saved.pushTimeZone||Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC')};
}
function readRetailSettings(){return normalizeRetailSettings(retailSettingsSavedValue().saved)}
function saveRetailSettingsLocal(value){const normalized=normalizeRetailSettings(value);localStorage.setItem(RETAIL_SETTINGS_KEY,JSON.stringify(normalized));return normalized}
function canonicalRetailOrders(list){const map=new Map();(Array.isArray(list)?list:[]).filter(Boolean).forEach(order=>{const key=String(order.id||order.publicToken||order.number||'').trim();if(!key)return;const prev=map.get(key),stamp=o=>String(o?.updatedAt||o?.completedAt||o?.cancelledAt||o?.createdAt||'');if(!prev||stamp(order)>=stamp(prev))map.set(key,order)});return [...map.values()]}
function readRetailOrders(){try{const list=JSON.parse(localStorage.getItem(RETAIL_ORDERS_KEY)||'[]');return canonicalRetailOrders(list)}catch{return[]}}
function saveRetailOrdersLocal(value){const list=Array.isArray(value)?value:[];localStorage.setItem(RETAIL_ORDERS_KEY,JSON.stringify(list));return list}
function readRetailProductSettings(){try{const value=JSON.parse(localStorage.getItem(RETAIL_PRODUCT_SETTINGS_KEY)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch{return{}}}
function saveRetailProductSettingsLocal(value){const next=value&&typeof value==='object'?value:{};localStorage.setItem(RETAIL_PRODUCT_SETTINGS_KEY,JSON.stringify(next));return next}
function retailAdminProducts(){
 let list=[];try{list=JSON.parse(localStorage.getItem('panora-products')||'[]')}catch{}
 if(!Array.isArray(list)||!list.length)list=[
  {id:'plain',active:true,basePrice:4.5,image:'bread-plain.jpg',names:{ru:'Льняной бездрожжевой хлеб с семенами'}},
  {id:'pumpkin',active:true,basePrice:5,image:'bread-pumpkin.jpg',names:{ru:'Тыквенный бездрожжевой хлеб с семенами'}}
 ];
 return list.filter(product=>product&&product.id&&!product.deletedAt);
}
function retailProductLabel(product){return String(product?.names?.ru||product?.nameRu||product?.name_ru||product?.name||PRODUCTS[String(product?.id)]?.ru||product?.id||'Хлеб')}
function normalizeRetailProductSetting(product,saved={}){
 const basePrice=Number(product?.basePrice??product?.retailPrice??product?.retail_price??product?.price??0);
 return {productId:String(product?.id||saved.productId||''),enabled:saved.enabled!==undefined?!!saved.enabled:product?.active!==false,stockSales:saved.stockSales!==false,preorders:saved.preorders!==false,
  retailPrice:Number.isFinite(Number(saved.retailPrice))?Math.max(0,Number(saved.retailPrice)):Math.max(0,Number.isFinite(basePrice)?basePrice:0),sortOrder:Number.isFinite(Number(saved.sortOrder))?Number(saved.sortOrder):0};
}
function retailProductSetting(product,map=readRetailProductSettings()){return normalizeRetailProductSetting(product,map[String(product?.id)]||{})}
function retailOrderStatus(order){return String(order?.status||'new')}
function retailPreorderOrdersForDate(date){return readRetailOrders().filter(order=>order&&String(order.source||'')==='bake_preorder'&&retailOrderStatus(order)!=='cancelled'&&String(order.bakeDate||order.pickupDate||'').slice(0,10)===String(date))}
function retailPreorderQuantity(date,product){return retailPreorderOrdersForDate(date).reduce((sum,order)=>sum+(order.items||[]).filter(item=>String(item?.product||'')===String(product)).reduce((n,item)=>n+Math.max(0,Number(item?.quantity||0)),0),0)}
function retailPreorderMapForDate(date){const map=new Map();retailPreorderOrdersForDate(date).forEach(order=>(order.items||[]).forEach(item=>{const product=String(item?.product||''),qty=Math.max(0,Number(item?.quantity||0));if(product&&qty)map.set(product,(map.get(product)||0)+qty)}));return map}
function retailBakeCoverage(date){const completion=bakeCompletionFor(date),retailDemand=retailPreorderMapForDate(date),partnerDemand=new Map(),good=new Map((completion?.items||[]).map(item=>[String(item.product||''),Math.max(0,Number(item.good??(Number(item.produced||0)-Number(item.waste||0))))]));bakeOrdersForDate(date).forEach(order=>(order.items||[]).forEach(item=>{const product=String(item?.product||''),qty=Math.max(0,Number(item?.quantity||item?.quantityPieces||0));if(product&&qty)partnerDemand.set(product,(partnerDemand.get(product)||0)+qty)}));let required=0,shortage=0;retailDemand.forEach((qty,product)=>{required+=qty;const partner=Math.max(0,Number(partnerDemand.get(product)||0)),baked=Math.max(0,Number(good.get(product)||0));shortage+=Math.min(qty,Math.max(0,partner+qty-baked))});return{completion,required,shortage,covered:!!completion&&shortage<=0}}
function retailStatusLabel(status,order){if(status==='completed'&&String(order?.fulfillment||'pickup')==='delivery')return 'Доставлен';return({new:'Новый',confirmed:'Подтверждён',preparing:'Готовится',ready:'Готов',delivering:'В доставке',completed:'Выдан',cancelled:'Отменён'}[status]||status||'—')}
function retailPaymentLabel(order){const value=String(order?.paymentStatus||'pending'),method=String(order?.paymentMethod||'pickup');if(value==='paid')return 'Оплачен';if(value==='refunded')return 'Возврат';if(value==='failed')return 'Ошибка оплаты';return method==='online'?'Ожидает онлайн-оплаты':'При получении'}
function retailFulfillmentLabel(order){return String(order?.fulfillment||'pickup')==='delivery'?'Доставка':'Самовывоз'}
function retailSourceLabel(order){if(String(order?.source||'stock')!=='bake_preorder')return 'Из наличия';const date=String(order?.bakeDate||order?.pickupDate||'');const coverage=retailBakeCoverage(date);if(coverage.completion&&coverage.shortage>0)return `К выпечке · дефицит ${coverage.shortage} шт.`;if(coverage.completion)return 'К выпечке · можно собирать';return 'К выпечке'}
function retailOrderNumber(order){const n=Number(order?.number||0);return n>0?`R-${String(n).padStart(4,'0')}`:String(order?.id||'—')}
function retailItemName(productId){const product=retailAdminProducts().find(p=>String(p.id)===String(productId));return product?retailProductLabel(product):(PRODUCTS[String(productId)]?.ru||String(productId||'Хлеб'))}
function retailItemsLabel(order){const items=Array.isArray(order?.items)?order.items:[];if(!items.length)return '—';return items.map(item=>`${retailItemName(String(item?.product||''))} × ${Math.max(0,Number(item?.quantity||0))}`).join(', ')}
function retailCloudRow(settings,{legacy=false}={}){
 const row={id:1,enabled:!!settings.enabled,stock_sales:!!settings.stockSales,preorders:!!settings.preorders,pickup:!!settings.pickup,delivery:!!settings.delivery,online_payment:!!settings.onlinePayment,
  reservation_minutes:settings.reservationMinutes,preorder_cutoff_hours:settings.preorderCutoffHours,pickup_slots:Array.isArray(settings.pickupSlots)?settings.pickupSlots:RETAIL_DEFAULT_SETTINGS.pickupSlots,
  updated_at:new Date().toISOString(),updated_by:window.panoraSupabaseSession?.user?.id||null};
 if(!legacy)Object.assign(row,{pay_on_pickup:!!settings.payOnPickup,preorder_horizon_days:settings.preorderHorizonDays,pickup_lead_minutes:settings.pickupLeadMinutes,max_orders_per_slot:settings.maxOrdersPerSlot,
  contact_phone:settings.contactPhone||null,contact_email:settings.contactEmail||null,pickup_note:settings.pickupNote||null,payment_provider:settings.paymentProvider||'none',delivery_min_total:settings.deliveryMinTotal,delivery_fee:settings.deliveryFee,delivery_free_from:settings.deliveryFreeFrom,max_deliveries_per_slot:settings.maxDeliveriesPerSlot,delivery_slots:settings.deliverySlots,notify_order_received:!!settings.notifyOrderReceived,notify_ready:!!settings.notifyReady,notify_delivery:!!settings.notifyDelivery,notify_cancelled:!!settings.notifyCancelled,contact_whatsapp:settings.contactWhatsApp||null,contact_telegram:settings.contactTelegram||null,fallback_whatsapp:!!settings.fallbackWhatsApp,fallback_telegram:!!settings.fallbackTelegram,fallback_sms:!!settings.fallbackSms,fallback_email:!!settings.fallbackEmail,push_customer_enabled:!!settings.pushCustomerEnabled,push_admin_enabled:!!settings.pushAdminEnabled,push_new_order:!!settings.pushNewOrder,push_new_message:!!settings.pushNewMessage,push_quiet_from:settings.pushQuietFrom||null,push_quiet_to:settings.pushQuietTo||null,push_vapid_public_key:settings.pushVapidPublicKey||null,push_timezone:settings.pushTimeZone||Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'});
 return row;
}
function retailSettingsFromCloud(row){if(!row)return null;return normalizeRetailSettings({enabled:row.enabled,stockSales:row.stock_sales,preorders:row.preorders,pickup:row.pickup,delivery:row.delivery,onlinePayment:row.online_payment,payOnPickup:row.pay_on_pickup,
 reservationMinutes:row.reservation_minutes,preorderCutoffHours:row.preorder_cutoff_hours,preorderHorizonDays:row.preorder_horizon_days,pickupLeadMinutes:row.pickup_lead_minutes,maxOrdersPerSlot:row.max_orders_per_slot,
 pickupSlots:Array.isArray(row.pickup_slots)?row.pickup_slots:RETAIL_DEFAULT_SETTINGS.pickupSlots,deliveryMinTotal:row.delivery_min_total,deliveryFee:row.delivery_fee,deliveryFreeFrom:row.delivery_free_from,maxDeliveriesPerSlot:row.max_deliveries_per_slot,deliverySlots:Array.isArray(row.delivery_slots)?row.delivery_slots:RETAIL_DEFAULT_SETTINGS.deliverySlots,contactPhone:row.contact_phone,contactEmail:row.contact_email,pickupNote:row.pickup_note,paymentProvider:row.payment_provider,notifyOrderReceived:row.notify_order_received,notifyReady:row.notify_ready,notifyDelivery:row.notify_delivery,notifyCancelled:row.notify_cancelled,contactWhatsApp:row.contact_whatsapp,contactTelegram:row.contact_telegram,fallbackWhatsApp:row.fallback_whatsapp,fallbackTelegram:row.fallback_telegram,fallbackSms:row.fallback_sms,fallbackEmail:row.fallback_email,pushCustomerEnabled:row.push_customer_enabled,pushAdminEnabled:row.push_admin_enabled,pushNewOrder:row.push_new_order,pushNewMessage:row.push_new_message,pushQuietFrom:row.push_quiet_from,pushQuietTo:row.push_quiet_to,pushVapidPublicKey:row.push_vapid_public_key,pushTimeZone:row.push_timezone||Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'})}
async function retailAdminApi(path,options={}){
 const cfg=window.PANORA_SUPABASE,session=window.panoraSupabaseSession;if(!cfg?.url||!cfg?.publishableKey)throw new Error('Supabase не настроен');if(!session?.access_token)throw new Error('Нет активной сессии пекарни');
 const response=await fetch(`${cfg.url}/rest/v1/${path}`,{cache:'no-store',...options,headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json','Cache-Control':'no-cache',...(options.headers||{})}});
 if(!response.ok){let detail='';try{const data=await response.json();detail=data?.message||data?.details||data?.hint||''}catch{}const error=new Error(detail||`HTTP ${response.status}`);error.status=response.status;throw error}
 if(response.status===204)return null;const text=await response.text();return text?JSON.parse(text):null;
}
async function loadRetailSettingsCloud(){
 let rows=null,level='635';
 try{rows=await retailAdminApi('retail_settings?id=eq.1&select=id,enabled,stock_sales,preorders,pickup,delivery,online_payment,pay_on_pickup,reservation_minutes,preorder_cutoff_hours,preorder_horizon_days,pickup_lead_minutes,max_orders_per_slot,pickup_slots,contact_phone,contact_email,contact_whatsapp,contact_telegram,fallback_whatsapp,fallback_telegram,fallback_sms,fallback_email,pickup_note,payment_provider,delivery_min_total,delivery_fee,delivery_free_from,max_deliveries_per_slot,delivery_slots,notify_order_received,notify_ready,notify_delivery,notify_cancelled,push_customer_enabled,push_admin_enabled,push_new_order,push_new_message,push_quiet_from,push_quiet_to,push_vapid_public_key,push_timezone,updated_at&limit=1')}
 catch(error){
  level='633';
  try{rows=await retailAdminApi('retail_settings?id=eq.1&select=id,enabled,stock_sales,preorders,pickup,delivery,online_payment,pay_on_pickup,reservation_minutes,preorder_cutoff_hours,preorder_horizon_days,pickup_lead_minutes,max_orders_per_slot,pickup_slots,contact_phone,contact_email,pickup_note,payment_provider,delivery_min_total,delivery_fee,delivery_free_from,max_deliveries_per_slot,delivery_slots,notify_order_received,notify_ready,notify_delivery,notify_cancelled,updated_at&limit=1')}
  catch(error633){level='628';
  try{rows=await retailAdminApi('retail_settings?id=eq.1&select=id,enabled,stock_sales,preorders,pickup,delivery,online_payment,pay_on_pickup,reservation_minutes,preorder_cutoff_hours,preorder_horizon_days,pickup_lead_minutes,max_orders_per_slot,pickup_slots,contact_phone,contact_email,pickup_note,payment_provider,delivery_min_total,delivery_fee,delivery_free_from,max_deliveries_per_slot,delivery_slots,updated_at&limit=1')}
  catch(second){level='legacy';try{rows=await retailAdminApi('retail_settings?id=eq.1&select=id,enabled,stock_sales,preorders,pickup,delivery,online_payment,reservation_minutes,preorder_cutoff_hours,pickup_slots,updated_at&limit=1')}catch(third){const saved=$('#retailSettingsSaved');if(saved)saved.textContent='Локальные настройки · проверьте SQL розницы';return false}}
  }
 }
 if(rows?.[0])saveRetailSettingsLocal(retailSettingsFromCloud(rows[0]));renderRetailFoundation();const saved=$('#retailSettingsSaved');if(saved&&rows?.[0])saved.textContent=level==='635'?'Настройки, каналы и Push загружены из облака':level==='633'?'Настройки загружены · выполните SQL 6.34 для сообщений':level==='628'?'Настройки загружены · выполните SQL 6.33–6.35':'Обновите SQL розницы';return !!rows?.[0];
}
async function saveRetailSettingsCloud(settings){
 try{const rows=await retailAdminApi('retail_settings?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(retailCloudRow(settings))});return {row:rows?.[0]||null,extended:true}}
 catch(error){const rows=await retailAdminApi('retail_settings?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(retailCloudRow(settings,{legacy:true}))});return {row:rows?.[0]||null,extended:false}}
}
async function loadRetailProductSettingsCloud(){
 try{const rows=await retailAdminApi('retail_product_settings?select=product_id,enabled,stock_sales,preorders,retail_price,sort_order,updated_at&order=sort_order.asc,product_id.asc');const map={};(Array.isArray(rows)?rows:[]).forEach(row=>{map[String(row.product_id)]={productId:String(row.product_id),enabled:row.enabled!==false,stockSales:row.stock_sales!==false,preorders:row.preorders!==false,retailPrice:Number(row.retail_price||0),sortOrder:Number(row.sort_order||0)}});saveRetailProductSettingsLocal(map);renderRetailCatalogSettings();const status=$('#retailCatalogSaved');if(status)status.textContent='Ассортимент загружен из облака';return true}
 catch(error){const status=$('#retailCatalogSaved');if(status)status.textContent='Локальный ассортимент · выполните SQL 6.28';return false}
}
async function saveRetailProductSettingsCloud(map){const products=retailAdminProducts();const rows=products.map((product,index)=>{const item=retailProductSetting(product,map);return {product_id:item.productId,enabled:!!item.enabled,stock_sales:!!item.stockSales,preorders:!!item.preorders,retail_price:Number(item.retailPrice||0),sort_order:index,updated_at:new Date().toISOString(),updated_by:window.panoraSupabaseSession?.user?.id||null}});if(!rows.length)return [];return retailAdminApi('retail_product_settings?on_conflict=product_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(rows)})}
function retailOrderFromCloud(row){return{id:String(row.id||''),number:Number(row.order_number||0),publicToken:String(row.public_token||''),source:String(row.source||'stock'),fulfillment:String(row.fulfillment||'pickup'),bakeDate:row.bake_date||'',pickupDate:row.pickup_date||'',slot:row.pickup_slot||'',customerName:row.customer_name||'',customerPhone:row.customer_phone||'',customerEmail:row.customer_email||'',comment:row.comment||'',deliveryAddress:row.delivery_address||'',deliveryNote:row.delivery_note||'',deliveryFee:Number(row.delivery_fee||0),status:String(row.status||'new'),paymentStatus:String(row.payment_status||'pending'),paymentMethod:String(row.payment_method||'pickup'),paymentProvider:String(row.payment_provider||'none'),total:Number(row.total||0),createdAt:row.created_at||'',updatedAt:row.updated_at||'',completedAt:row.completed_at||'',cancelledAt:row.cancelled_at||'',items:(row.retail_order_items||[]).map(item=>({product:String(item.product_id||''),quantity:Math.max(0,Number(item.quantity||0)),unitPrice:Number(item.unit_price||0)}))}}
async function loadRetailUnreadMessagesCloud(){try{const rows=await retailAdminApi('retail_order_messages?sender_role=eq.customer&read_by_bakery_at=is.null&select=order_id');const map=new Map();(rows||[]).forEach(row=>{const id=String(row.order_id||'');if(id)map.set(id,(map.get(id)||0)+1)});retailUnreadMessages=map;return true}catch{return false}}
async function loadRetailOrdersCloud(){
 const status=$('#retailOrdersCloudStatus');
 try{const rows=await retailAdminApi('retail_orders?select=id,order_number,public_token,source,fulfillment,bake_date,pickup_date,pickup_slot,customer_name,customer_phone,customer_email,comment,delivery_address,delivery_note,delivery_fee,status,payment_status,payment_method,payment_provider,total,created_at,updated_at,completed_at,cancelled_at,retail_order_items(product_id,quantity,unit_price)&order=created_at.desc');saveRetailOrdersLocal((rows||[]).map(retailOrderFromCloud));await loadRetailUnreadMessagesCloud();if(status)status.textContent='Облако ✓';renderRetailOrderQueue();renderStock();renderPlan();window.panoraRawStock?.render?.();if(typeof renderPurchase==='function')renderPurchase();return true}
 catch(error){if(status)status.textContent='Выполните SQL 6.28';return false}
}
async function updateRetailOrderStatusCloud(id,nextStatus){
 const payload={status:nextStatus,updated_at:new Date().toISOString()};await retailAdminApi(`retail_orders?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});await loadRetailOrdersCloud();renderPlan();window.panoraRawStock?.render?.();if(typeof renderPurchase==='function')renderPurchase();window.dispatchEvent(new CustomEvent('panora:retail-orders-updated'))
}
async function updateRetailPaymentStatusCloud(id,nextStatus){
 const payload={payment_status:nextStatus,updated_at:new Date().toISOString()};await retailAdminApi(`retail_orders?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});await loadRetailOrdersCloud();window.dispatchEvent(new CustomEvent('panora:retail-payments-updated'))
}
async function syncFinishedStockMovementsCloud(){
 const allowed=new Set(['produced','returned','written_off','correction_plus','correction_minus','initial_balance']),rows=(Array.isArray(movements)?movements:[]).filter(m=>m&&!m.virtual&&allowed.has(String(m.type||''))&&m.id&&m.product&&Number(m.quantity)>0).map(m=>({id:String(m.id),movement_date:String(m.date||iso(new Date())),product_id:String(m.product),movement_type:String(m.type),quantity:Math.abs(Number(m.quantity||0)),note:m.note||null,created_at:m.createdAt||new Date().toISOString(),updated_at:new Date().toISOString(),updated_by:window.panoraSupabaseSession?.user?.id||null}));if(!rows.length)return true;try{await retailAdminApi('finished_stock_movements?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows)});return true}catch{return false}
}
async function loadFinishedStockMovementsCloud(){
 try{
  const rows=await retailAdminApi('finished_stock_movements?select=id,movement_date,product_id,movement_type,quantity,note,created_at,updated_at&order=movement_date.asc,created_at.asc'),allowed=new Set(['produced','returned','written_off','correction_plus','correction_minus','initial_balance']),byId=new Map((Array.isArray(movements)?movements:[]).map(item=>[String(item?.id||''),item]));
  (Array.isArray(rows)?rows:[]).forEach(row=>{if(!row?.id||!row?.product_id||!allowed.has(String(row.movement_type||'')))return;byId.set(String(row.id),{id:String(row.id),date:String(row.movement_date||''),product:String(row.product_id),type:String(row.movement_type),quantity:Math.abs(Number(row.quantity||0)),note:row.note||'',createdAt:row.created_at||row.updated_at||''})});
  movements=[...byId.values()].filter(Boolean);localStorage.setItem('panora-stock-movements',JSON.stringify(movements));renderStock();return true;
 }catch{return false}
}
async function syncAndLoadFinishedStockMovementsCloud(){const synced=await syncFinishedStockMovementsCloud();if(!synced)return false;return loadFinishedStockMovementsCloud()}
function syncRetailSettingsForm(settings){const form=$('#retailSettingsForm');if(!form)return;['enabled','stockSales','preorders','pickup','delivery','onlinePayment','payOnPickup','notifyOrderReceived','notifyReady','notifyDelivery','notifyCancelled','pushCustomerEnabled','pushAdminEnabled','pushNewOrder','pushNewMessage','fallbackWhatsApp','fallbackTelegram','fallbackSms','fallbackEmail'].forEach(name=>{if(form.elements[name])form.elements[name].checked=!!settings[name]});['reservationMinutes','preorderCutoffHours','preorderHorizonDays','pickupLeadMinutes','maxOrdersPerSlot','deliveryMinTotal','deliveryFee','deliveryFreeFrom','maxDeliveriesPerSlot','contactPhone','contactEmail','contactWhatsApp','contactTelegram','pickupNote','paymentProvider','pushQuietFrom','pushQuietTo','pushVapidPublicKey'].forEach(name=>{if(form.elements[name])form.elements[name].value=String(settings[name]??'')});if(form.elements.pickupSlots)form.elements.pickupSlots.value=(settings.pickupSlots||[]).join('\n');if(form.elements.deliverySlots)form.elements.deliverySlots.value=(settings.deliverySlots||[]).join('\n');const label=$('#retailEnabledLabel');if(label)label.textContent=settings.enabled?'Включена':'Выключена'}
function renderRetailCatalogSettings(){
 const grid=$('#retailCatalogGrid');if(!grid)return;const products=retailAdminProducts(),map=readRetailProductSettings();if(!products.length){grid.innerHTML='<div class="retail-catalog-empty">Нет активных карточек продукции.</div>';return}
 grid.innerHTML=products.map(product=>{const item=retailProductSetting(product,map),inactive=product.active===false;return `<article class="retail-catalog-card ${inactive?'is-inactive':''}" data-retail-product="${adminEscape(item.productId)}"><img src="${adminEscape(product.image||product.imageUrl||product.image_url||'icon.svg')}" alt="${adminEscape(retailProductLabel(product))}" onerror="this.src='icon.svg'"><div class="retail-catalog-card-body"><div class="retail-catalog-title"><div><strong>${adminEscape(retailProductLabel(product))}</strong><small>${inactive?'Товар выключен в карточках продукции':'Товар активен'}</small></div><label class="retail-switch"><input type="checkbox" data-retail-field="enabled" ${item.enabled&&!inactive?'checked':''} ${inactive?'disabled':''}><span></span><em>${item.enabled&&!inactive?'вкл.':'выкл.'}</em></label></div><div class="retail-catalog-controls"><label><span>Розничная цена, €</span><input type="number" min="0" step="0.01" data-retail-field="retailPrice" value="${Number(item.retailPrice||0).toFixed(2)}" ${inactive?'disabled':''}></label><label class="retail-option compact"><input type="checkbox" data-retail-field="stockSales" ${item.stockSales?'checked':''} ${inactive?'disabled':''}><span><strong>Из наличия</strong><small>Можно купить свободный остаток</small></span></label><label class="retail-option compact"><input type="checkbox" data-retail-field="preorders" ${item.preorders?'checked':''} ${inactive?'disabled':''}><span><strong>К выпечке</strong><small>Можно заказать на будущий день</small></span></label></div></div></article>`}).join('');
 grid.querySelectorAll('[data-retail-field="enabled"]').forEach(input=>input.addEventListener('change',()=>{const em=input.closest('.retail-switch')?.querySelector('em');if(em)em.textContent=input.checked?'вкл.':'выкл.'}));
}
function collectRetailCatalogForm(){const current=readRetailProductSettings(),next={...current};$$('#retailCatalogGrid [data-retail-product]').forEach((card,index)=>{const product=retailAdminProducts().find(p=>String(p.id)===String(card.dataset.retailProduct));if(!product)return;const get=name=>card.querySelector(`[data-retail-field="${name}"]`);next[String(product.id)]=normalizeRetailProductSetting(product,{productId:String(product.id),enabled:!!get('enabled')?.checked,stockSales:!!get('stockSales')?.checked,preorders:!!get('preorders')?.checked,retailPrice:Math.max(0,Number(get('retailPrice')?.value||0)),sortOrder:index})});return next}
function retailTomorrow(){const d=new Date();d.setDate(d.getDate()+1);return iso(d)}
function retailFilteredOrders(orders){const today=iso(new Date()),tomorrow=retailTomorrow();if(retailOrderFilter==='today')return orders.filter(o=>String(o.pickupDate)===today&&!['completed','cancelled'].includes(retailOrderStatus(o)));if(retailOrderFilter==='tomorrow')return orders.filter(o=>String(o.pickupDate)===tomorrow&&!['completed','cancelled'].includes(retailOrderStatus(o)));if(retailOrderFilter==='future')return orders.filter(o=>String(o.pickupDate)>tomorrow&&!['completed','cancelled'].includes(retailOrderStatus(o)));if(retailOrderFilter==='finished')return orders.filter(o=>['completed','cancelled'].includes(retailOrderStatus(o)));return orders.filter(o=>!['completed','cancelled'].includes(retailOrderStatus(o)))}
function retailNextAction(order){const status=retailOrderStatus(order),delivery=String(order?.fulfillment||'pickup')==='delivery';if(status==='ready'&&delivery)return{status:'delivering',label:'Передать в доставку'};if(status==='delivering')return{status:'completed',label:'Доставлен'};return({new:{status:'confirmed',label:'Подтвердить'},confirmed:{status:'preparing',label:'Готовить'},preparing:{status:'ready',label:'Готов'},ready:{status:'completed',label:'Выдать'}}[status]||null)}
function retailOrderPickupLabel(order){const date=String(order?.pickupDate||''),day=date?fmt(date,{weekday:'short',day:'numeric',month:'short'}):'—',method=retailFulfillmentLabel(order);return `${method} · ${day}${order?.slot?` · ${order.slot}`:''}`}
function retailOrderCustomer(order){const parts=[order?.customerName,order?.customerPhone,order?.customerEmail].filter(Boolean);return parts.join(' · ')||'—'}

function retailEventLabel(event){
 const type=String(event?.event_type||event?.eventType||'');
 const map={created:'Заказ создан',bake_completed:'Выпечка завершена',payment_paid:'Оплата получена',payment_failed:'Ошибка оплаты',payment_refunded:'Возврат оплаты',
  status_confirmed:'Заказ подтверждён',status_preparing:'Начата подготовка',status_ready:'Готов к выдаче',status_delivering:'Передан в доставку',status_completed:'Заказ завершён',status_cancelled:'Заказ отменён'};
 return map[type]||type.replace(/^status_/,'Статус: ').replaceAll('_',' ')||'Событие';
}
function retailEventTime(value){if(!value)return'—';try{return new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch{return String(value)}}
async function loadRetailOrderEventsCloud(orderId){
 return retailAdminApi(`retail_order_events?order_id=eq.${encodeURIComponent(orderId)}&select=id,event_type,from_status,to_status,payment_status,public_note,created_at,source&order=created_at.asc`);
}
async function openRetailOrderEvents(orderId){
 const dialog=$('#retailOrderEventsDialog'),title=$('#retailOrderEventsTitle'),meta=$('#retailOrderEventsMeta'),list=$('#retailOrderEventsList');
 if(!dialog||!list)return;
 const order=readRetailOrders().find(o=>String(o.id)===String(orderId));
 if(title)title.textContent=`История ${retailOrderNumber(order)}`;
 if(meta)meta.textContent=[order?.customerName,retailOrderPickupLabel(order)].filter(Boolean).join(' · ');
 list.innerHTML='<div class="retail-event-loading">Загружаем события…</div>';
 dialog.showModal();
 try{
  const events=await loadRetailOrderEventsCloud(orderId);
  list.innerHTML=events?.length?events.map(event=>`<article class="retail-event-row"><i></i><div><strong>${adminEscape(retailEventLabel(event))}</strong>${event.public_note?`<p>${adminEscape(event.public_note)}</p>`:''}<small>${adminEscape(retailEventTime(event.created_at))}</small></div></article>`).join(''):'<div class="retail-event-loading">Событий пока нет. Выполните SQL 6.33 — существующие заказы будут добавлены в журнал автоматически.</div>';
 }catch(error){list.innerHTML=`<div class="retail-event-loading">История недоступна · ${adminEscape(error.message||'выполните SQL 6.33')}</div>`}
}

let retailMessageOrderId='';
function retailFallbackLinks(order){const settings=readRetailSettings(),links=[],phone=String(order?.customerPhone||'').replace(/[^0-9+]/g,''),email=String(order?.customerEmail||'').trim(),text=encodeURIComponent(`Panora · ${retailOrderNumber(order)}`);if(settings.fallbackWhatsApp&&phone){const wa=phone.replace(/[^0-9]/g,'');if(wa)links.push(`<a class="secondary" target="_blank" rel="noopener" href="https://wa.me/${wa}?text=${text}">WhatsApp</a>`)}if(settings.fallbackSms&&phone)links.push(`<a class="secondary" href="sms:${adminEscape(phone)}?body=${text}">SMS</a>`);if(settings.fallbackEmail&&email)links.push(`<a class="secondary" href="mailto:${adminEscape(email)}?subject=${text}">Email</a>`);return links.join('')}
async function loadRetailOrderMessagesCloud(orderId){return retailAdminApi(`retail_order_messages?order_id=eq.${encodeURIComponent(orderId)}&select=id,sender_role,body,created_at,read_by_bakery_at,read_by_customer_at&order=created_at.asc`)}
async function markRetailOrderMessagesRead(orderId){try{await retailAdminApi('rpc/panora_retail_mark_bakery_messages_read',{method:'POST',body:JSON.stringify({p_order_id:orderId})})}catch{}}
async function sendRetailBakeryMessage(orderId,body){const text=String(body||'').trim();if(!text)return;await retailAdminApi('rpc/panora_retail_send_bakery_message',{method:'POST',body:JSON.stringify({p_order_id:orderId,p_body:text})})}
function retailMessageTime(value){try{return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value))}catch{return String(value||'')}}
async function openRetailOrderMessages(orderId){const order=readRetailOrders().find(item=>String(item.id)===String(orderId)),dialog=$('#retailOrderMessagesDialog'),title=$('#retailOrderMessagesTitle'),meta=$('#retailOrderMessagesMeta'),list=$('#retailOrderMessagesList'),fallback=$('#retailOrderFallbackActions');if(!dialog||!order)return;retailMessageOrderId=String(orderId);title.textContent=`Сообщения · ${retailOrderNumber(order)}`;meta.textContent=[order.customerName,order.customerPhone,order.customerEmail].filter(Boolean).join(' · ');list.innerHTML='<div class="retail-event-loading">Загружаем сообщения…</div>';if(fallback)fallback.innerHTML=retailFallbackLinks(order);if(!dialog.open)dialog.showModal();try{const messages=await loadRetailOrderMessagesCloud(orderId);list.innerHTML=messages?.length?messages.map(m=>`<article class="retail-chat-message ${m.sender_role==='bakery'?'is-bakery':'is-customer'}"><span>${m.sender_role==='bakery'?'Пекарня':'Покупатель'}</span><p>${adminEscape(m.body)}</p><small>${adminEscape(retailMessageTime(m.created_at))}</small></article>`).join(''):'<div class="retail-event-loading">Сообщений пока нет. Напишите покупателю первым.</div>';list.scrollTop=list.scrollHeight;await markRetailOrderMessagesRead(orderId);retailUnreadMessages.delete(String(orderId));renderRetailOrderQueue()}catch(error){list.innerHTML=`<div class="retail-event-loading">Сообщения недоступны · ${adminEscape(error.message||'выполните SQL 6.36')}</div>`}}
function retailOrderRow(order){const action=retailNextAction(order),cancel=!['completed','cancelled'].includes(retailOrderStatus(order));return `<tr><td><strong>${adminEscape(retailOrderNumber(order))}</strong><small class="retail-order-sub">${adminEscape(retailSourceLabel(order))}</small></td><td>${adminEscape(retailOrderPickupLabel(order))}${order.fulfillment==='delivery'&&order.deliveryAddress?`<small class="retail-order-sub">${adminEscape(order.deliveryAddress)}</small>`:''}</td><td><strong>${adminEscape(order.customerName||'—')}</strong><small class="retail-order-sub">${adminEscape(order.customerPhone||'')}</small></td><td>${adminEscape(retailItemsLabel(order))}</td><td>${Number(order.total||0).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2})} €</td><td>${adminEscape(retailPaymentLabel(order))}</td><td><span class="retail-order-status retail-status-${adminEscape(retailOrderStatus(order))}">${adminEscape(retailStatusLabel(retailOrderStatus(order),order))}</span></td><td><div class="retail-order-actions">${action?`<button type="button" class="primary" data-retail-order-next="${adminEscape(order.id)}" data-next-status="${action.status}">${action.label}</button>`:''}${order.paymentStatus==='pending'?`<button type="button" class="secondary" data-retail-payment="${adminEscape(order.id)}" data-payment-status="paid">Оплачено</button>`:order.paymentStatus==='paid'?`<button type="button" class="secondary" data-retail-payment="${adminEscape(order.id)}" data-payment-status="refunded">Возврат</button>`:''}<button type="button" class="secondary" data-retail-order-messages="${adminEscape(order.id)}">Сообщения${retailUnreadMessages.get(String(order.id))?` (${retailUnreadMessages.get(String(order.id))})`:``}</button><button type="button" class="secondary" data-retail-order-events="${adminEscape(order.id)}">История</button>${order.publicToken?`<button type="button" class="secondary" data-retail-order-link="${adminEscape(order.publicToken)}">Ссылка</button>`:''}${cancel?`<button type="button" class="secondary" data-retail-order-cancel="${adminEscape(order.id)}">Отменить</button>`:''}</div></td></tr>`}
function retailOrderCard(order){const action=retailNextAction(order),cancel=!['completed','cancelled'].includes(retailOrderStatus(order));return `<article class="retail-mobile-order-card"><div class="retail-mobile-order-head"><div><strong>${adminEscape(retailOrderNumber(order))}</strong><span>${adminEscape(retailSourceLabel(order))}</span></div><span class="retail-order-status retail-status-${adminEscape(retailOrderStatus(order))}">${adminEscape(retailStatusLabel(retailOrderStatus(order),order))}</span></div><div class="retail-mobile-order-time">${adminEscape(retailOrderPickupLabel(order))}${order.fulfillment==='delivery'&&order.deliveryAddress?`<small>${adminEscape(order.deliveryAddress)}</small>`:''}</div><div class="retail-mobile-order-customer"><strong>${adminEscape(order.customerName||'—')}</strong><span>${adminEscape([order.customerPhone,order.customerEmail].filter(Boolean).join(' · '))}</span></div><p>${adminEscape(retailItemsLabel(order))}</p><div class="retail-mobile-order-total"><strong>${Number(order.total||0).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2})} €</strong><span>${adminEscape(retailPaymentLabel(order))}</span></div><div class="retail-mobile-order-actions">${action?`<button type="button" class="primary" data-retail-order-next="${adminEscape(order.id)}" data-next-status="${action.status}">${action.label}</button>`:''}${order.paymentStatus==='pending'?`<button type="button" class="secondary" data-retail-payment="${adminEscape(order.id)}" data-payment-status="paid">Оплачено</button>`:order.paymentStatus==='paid'?`<button type="button" class="secondary" data-retail-payment="${adminEscape(order.id)}" data-payment-status="refunded">Возврат</button>`:''}<button type="button" class="secondary" data-retail-order-messages="${adminEscape(order.id)}">Сообщения${retailUnreadMessages.get(String(order.id))?` (${retailUnreadMessages.get(String(order.id))})`:``}</button><button type="button" class="secondary" data-retail-order-events="${adminEscape(order.id)}">История</button>${order.publicToken?`<button type="button" class="secondary" data-retail-order-link="${adminEscape(order.publicToken)}">Ссылка покупателя</button>`:''}${cancel?`<button type="button" class="secondary" data-retail-order-cancel="${adminEscape(order.id)}">Отменить</button>`:''}</div></article>`}
function bindRetailOrderActions(root){if(!root)return;root.querySelectorAll('[data-retail-order-next]').forEach(button=>button.onclick=async()=>{button.disabled=true;try{await updateRetailOrderStatusCloud(button.dataset.retailOrderNext,button.dataset.nextStatus)}catch(error){alert(`Не удалось изменить заказ: ${error.message||error}`)}finally{button.disabled=false}});root.querySelectorAll('[data-retail-payment]').forEach(button=>button.onclick=async()=>{const next=button.dataset.paymentStatus;if(next==='refunded'&&!confirm('Отметить оплату как возвращённую?'))return;button.disabled=true;try{await updateRetailPaymentStatusCloud(button.dataset.retailPayment,next)}catch(error){alert(`Не удалось изменить оплату: ${error.message||error}`)}finally{button.disabled=false}});root.querySelectorAll('[data-retail-order-messages]').forEach(button=>button.onclick=()=>openRetailOrderMessages(button.dataset.retailOrderMessages));root.querySelectorAll('[data-retail-order-events]').forEach(button=>button.onclick=()=>openRetailOrderEvents(button.dataset.retailOrderEvents));root.querySelectorAll('[data-retail-order-link]').forEach(button=>button.onclick=()=>{const url=new URL('retail-order.html',location.href);url.searchParams.set('t',button.dataset.retailOrderLink);window.open(url.toString(),'_blank','noopener')});root.querySelectorAll('[data-retail-order-cancel]').forEach(button=>button.onclick=async()=>{const order=readRetailOrders().find(o=>String(o.id)===String(button.dataset.retailOrderCancel));if(!confirm(`Отменить ${retailOrderNumber(order)}? Резерв хлеба будет освобождён.`))return;button.disabled=true;try{await updateRetailOrderStatusCloud(button.dataset.retailOrderCancel,'cancelled')}catch(error){alert(`Не удалось отменить заказ: ${error.message||error}`)}finally{button.disabled=false}})}
function renderRetailOrderFilters(orders){const root=$('#retailOrderFilters');if(!root)return;const today=iso(new Date()),tomorrow=retailTomorrow(),active=o=>!['completed','cancelled'].includes(retailOrderStatus(o)),counts={active:orders.filter(active).length,today:orders.filter(o=>active(o)&&String(o.pickupDate)===today).length,tomorrow:orders.filter(o=>active(o)&&String(o.pickupDate)===tomorrow).length,future:orders.filter(o=>active(o)&&String(o.pickupDate)>tomorrow).length,finished:orders.filter(o=>!active(o)).length},labels={active:'Активные',today:'Сегодня',tomorrow:'Завтра',future:'Будущие',finished:'Завершённые'};root.innerHTML=Object.keys(labels).map(key=>`<button type="button" class="${retailOrderFilter===key?'active':''}" data-retail-order-filter="${key}">${labels[key]} <b>${counts[key]}</b></button>`).join('');root.querySelectorAll('[data-retail-order-filter]').forEach(button=>button.onclick=()=>{retailOrderFilter=button.dataset.retailOrderFilter;renderRetailFoundation()})}
function renderRetailOrderQueue(){
 const settings=readRetailSettings(),all=readRetailOrders().filter(Boolean).sort((a,b)=>String(a.pickupDate||'').localeCompare(String(b.pickupDate||''))||String(a.slot||'').localeCompare(String(b.slot||''))||Number(a.number||0)-Number(b.number||0)),active=all.filter(order=>!['completed','cancelled'].includes(retailOrderStatus(order))),set=(id,value)=>{const el=$(id);if(el)el.textContent=value};
 set('#retailNewCount',active.filter(o=>retailOrderStatus(o)==='new').length);set('#retailPreorderCount',active.filter(o=>String(o.source)==='bake_preorder').length);set('#retailStockCount',active.filter(o=>String(o.source||'stock')==='stock').length);set('#retailReadyCount',active.filter(o=>retailOrderStatus(o)==='ready').length);
 const banner=$('#retailStateBanner');if(banner)banner.dataset.state=settings.enabled?'on':'off';set('#retailStateTitle',settings.enabled?'Розничная витрина и приём заказов включены':'Розничная витрина выключена');set('#retailStateText',settings.enabled?'Покупатели могут создавать реальные заказы. «Из наличия» резервирует свободный хлеб, а предзаказы «К выпечке» входят в реальный спрос производства и сырья.':'Экран покупателя закрыт. Настройки, ассортимент и история заказов сохраняются.');
 const badge=$('#retailNavBadge');if(badge){badge.textContent=settings.enabled?'вкл.':'выкл.';badge.classList.toggle('is-on',!!settings.enabled)}
 renderRetailOrderFilters(all);const visible=retailFilteredOrders(all);set('#retailOrderTotal',`${visible.length} ${visible.length===1?'заказ':'заказов'}`);const rows=$('#retailOrderRows');if(rows){rows.innerHTML=visible.map(retailOrderRow).join('');bindRetailOrderActions(rows)}const cards=$('#retailOrderCards');if(cards){cards.innerHTML=visible.map(retailOrderCard).join('');bindRetailOrderActions(cards)}
 const empty=$('#retailEmptyState');if(empty)empty.hidden=visible.length>0;set('#retailEmptyText',settings.enabled?'Новых заказов в этой выборке нет. Откройте экран покупателя и оформите тестовый заказ.':'Витрина выключена. Уже созданные заказы остаются в истории.');
}
function retailAnalyticsPeriodOrders(orders){
 const now=new Date(),today=iso(now);if(retailAnalyticsPeriod==='all')return orders;
 if(retailAnalyticsPeriod==='today')return orders.filter(order=>String(order.pickupDate||'')===today);
 const days=Math.max(1,Number(retailAnalyticsPeriod||30)),from=new Date(now);from.setHours(0,0,0,0);from.setDate(from.getDate()-(days-1));const fromIso=iso(from);
 return orders.filter(order=>{const date=String(order.pickupDate||order.createdAt||'').slice(0,10);return date>=fromIso&&date<=today});
}
function retailAnalyticsMoney(value){return `${Number(value||0).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2})} €`}
function retailAnalyticsBreakdown(rootId,rows,total){const root=$(rootId);if(!root)return;const max=Math.max(1,...rows.map(row=>Number(row.value||0)));root.innerHTML=rows.map(row=>{const value=Number(row.value||0),pct=Math.max(0,Math.min(100,value/max*100)),share=total>0?Math.round(value/total*100):0;return `<div class="retail-analytics-breakdown-row"><span>${adminEscape(row.label)}</span><strong>${adminEscape(row.display??String(value))}</strong><i><b style="width:${pct}%"></b></i><small>${row.note?adminEscape(row.note):`${share}% выборки`}</small></div>`}).join('')||'<div class="retail-analytics-empty">Пока нет данных</div>'}
function retailConsistencyAudit(){
 const raw=(()=>{try{const x=JSON.parse(localStorage.getItem(RETAIL_ORDERS_KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}})(),orders=readRetailOrders(),issues=[];
 const dup=raw.length-orders.length;if(dup>0)issues.push(`Удалены дубли заказов в локальном кеше: ${dup}`);
 orders.forEach(order=>{
  const status=retailOrderStatus(order),items=Array.isArray(order.items)?order.items:[],qty=items.reduce((sum,item)=>sum+Math.max(0,Number(item.quantity||0)),0),total=Math.max(0,Number(order.total||0));
  if(!items.length||qty<=0)issues.push(`${retailOrderNumber(order)}: нет позиций`);
  if(status==='completed'&&!order.completedAt)issues.push(`${retailOrderNumber(order)}: завершён без времени завершения`);
  if(status==='cancelled'&&String(order.paymentStatus)==='paid')issues.push(`${retailOrderNumber(order)}: отменён, но остаётся оплаченным`);
  if(status==='completed'&&total<=0)issues.push(`${retailOrderNumber(order)}: завершён с нулевой суммой`);
 });
 const stockIssues=[];stockProductIds().forEach(pid=>{const rawBalance=stockRawBalance(pid),reserved=stockReserved(pid),onHand=Math.max(0,rawBalance);if(rawBalance>=0&&reserved>onHand)stockIssues.push(`${stockProductName(pid)}: резерв ${reserved} > остатка ${onHand}`)});
 issues.push(...stockIssues);
 return {ok:issues.length===0,issues,orders:orders.length,raw:raw.length};
}
function renderRetailConsistencyAudit(){const root=$('#retailConsistencyAudit');if(!root)return;const audit=retailConsistencyAudit();root.classList.toggle('is-warning',!audit.ok);root.innerHTML=audit.ok?`<div><strong>Контур согласован</strong><p>Заказы, резервы и склад не содержат обнаруженных дублей или конфликтов.</p></div><span class="retail-audit-ok">✓</span>`:`<div><strong>Нужно проверить</strong><p>${audit.issues.slice(0,5).map(adminEscape).join(' · ')}${audit.issues.length>5?` · ещё ${audit.issues.length-5}`:''}</p></div><span class="retail-audit-warn">${audit.issues.length}</span>`}
function renderRetailAnalytics(){
 renderRetailConsistencyAudit();
 const all=readRetailOrders().filter(Boolean),period=retailAnalyticsPeriodOrders(all),completed=period.filter(o=>retailOrderStatus(o)==='completed'&&String(o.paymentStatus||'')==='paid'),cancelled=period.filter(o=>retailOrderStatus(o)==='cancelled'),revenue=completed.reduce((sum,o)=>sum+Math.max(0,Number(o.total||0)),0),pieces=completed.reduce((sum,o)=>sum+(o.items||[]).reduce((n,item)=>n+Math.max(0,Number(item.quantity||0)),0),0),avg=completed.length?revenue/completed.length:0,set=(id,value)=>{const el=$(id);if(el)el.textContent=value};
 const periods=$('#retailAnalyticsPeriods'),labels={today:'Сегодня','7':'7 дней','30':'30 дней',all:'Всё время'};if(periods){periods.innerHTML=Object.entries(labels).map(([key,label])=>`<button type="button" class="${retailAnalyticsPeriod===key?'active':''}" data-retail-analytics-period="${key}">${label}</button>`).join('');periods.querySelectorAll('[data-retail-analytics-period]').forEach(button=>button.onclick=()=>{retailAnalyticsPeriod=button.dataset.retailAnalyticsPeriod;renderRetailAnalytics()})}
 set('#retailAnalyticsOrders',String(completed.length));set('#retailAnalyticsRevenue',retailAnalyticsMoney(revenue));set('#retailAnalyticsAvg',retailAnalyticsMoney(avg));set('#retailAnalyticsPieces',String(Math.round(pieces)));set('#retailAnalyticsOrdersSub',`${period.length} всего · ${cancelled.length} отменено`);
 const today=iso(new Date()),todayOrders=all.filter(o=>String(o.pickupDate||'')===today&&!['completed','cancelled'].includes(retailOrderStatus(o)));set('#retailAnalyticsTodayDate',fmt(today,{weekday:'long',day:'numeric',month:'long'}));set('#retailTodayNew',todayOrders.filter(o=>['new','confirmed'].includes(retailOrderStatus(o))).length);set('#retailTodayPreparing',todayOrders.filter(o=>retailOrderStatus(o)==='preparing').length);set('#retailTodayReady',todayOrders.filter(o=>retailOrderStatus(o)==='ready').length);set('#retailTodayDelivering',todayOrders.filter(o=>retailOrderStatus(o)==='delivering').length);
 retailAnalyticsBreakdown('#retailFulfillmentAnalytics',[{label:'Самовывоз',value:completed.filter(o=>String(o.fulfillment||'pickup')==='pickup').length},{label:'Доставка',value:completed.filter(o=>String(o.fulfillment)==='delivery').length}],completed.length);
 retailAnalyticsBreakdown('#retailSourceAnalytics',[{label:'Из наличия',value:completed.filter(o=>String(o.source||'stock')==='stock').length},{label:'К выпечке',value:completed.filter(o=>String(o.source)==='bake_preorder').length}],completed.length);
 retailAnalyticsBreakdown('#retailPaymentAnalytics',[{label:'Оплачено',value:period.filter(o=>String(o.paymentStatus)==='paid'&&retailOrderStatus(o)!=='cancelled').length},{label:'При получении / ожидает',value:period.filter(o=>String(o.paymentStatus)==='pending'&&retailOrderStatus(o)!=='cancelled').length},{label:'Возврат',value:period.filter(o=>String(o.paymentStatus)==='refunded').length}],Math.max(1,period.filter(o=>retailOrderStatus(o)!=='cancelled').length));
 const preorderDates=[...new Set(period.filter(o=>String(o.source)==='bake_preorder'&&retailOrderStatus(o)!=='cancelled').map(o=>String(o.bakeDate||'').slice(0,10)).filter(Boolean))],shortageRows=preorderDates.map(date=>retailBakeCoverage(date)).filter(Boolean),shortagePieces=shortageRows.reduce((sum,row)=>sum+Math.max(0,Number(row.shortage||0)),0),shortageDays=shortageRows.filter(row=>Number(row.shortage||0)>0).length;
 retailAnalyticsBreakdown('#retailQualityAnalytics',[{label:'Завершено',value:completed.length,note:'Выдано или доставлено'},{label:'Отменено',value:cancelled.length,note:period.length?`${Math.round(cancelled.length/period.length*100)}% всех заказов`:'0%'},{label:'Дни с дефицитом после выпечки',value:shortageDays,note:`Не обеспечено ${shortagePieces} шт.`}],Math.max(1,period.length));
 const productMap=new Map();completed.forEach(order=>(order.items||[]).forEach(item=>{const id=String(item.product||''),qty=Math.max(0,Number(item.quantity||0));if(id&&qty)productMap.set(id,(productMap.get(id)||0)+qty)}));const popular=[...productMap.entries()].sort((a,b)=>b[1]-a[1]),maxPopular=Math.max(1,...popular.map(([,qty])=>qty)),root=$('#retailPopularProducts');if(root)root.innerHTML=popular.length?popular.map(([id,qty])=>`<div class="retail-popular-row"><strong>${adminEscape(retailItemName(id))}</strong><span>${qty} шт.</span><i><b style="width:${Math.round(qty/maxPopular*100)}%"></b></i></div>`).join(''):'<div class="retail-analytics-empty">Завершённых розничных продаж за этот период пока нет.</div>';
}
function renderRetailFoundation(){const settings=readRetailSettings();renderRetailOrderQueue();syncRetailSettingsForm(settings);renderRetailCatalogSettings();renderRetailAnalytics()}
function openRetailView(view){const toggle=$('#retailNavToggle'),menu=$('#retailNavItems');if(toggle&&menu){toggle.setAttribute('aria-expanded','true');menu.hidden=false}const button=$(`.admin-nav [data-view="${view}"]`);if(button)button.click()}
function bindRetailFoundation(){
 const toggle=$('#retailNavToggle'),menu=$('#retailNavItems');if(toggle&&menu)toggle.onclick=()=>{const open=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!open));menu.hidden=open};
 $$('#retailNavItems [data-view]').forEach(button=>button.addEventListener('click',()=>{if(toggle&&menu){toggle.setAttribute('aria-expanded','true');menu.hidden=false}if(button.dataset.view==='retail-catalog')renderRetailCatalogSettings();if(button.dataset.view==='retail-analytics')renderRetailAnalytics();if(button.dataset.view==='retail-orders')loadRetailOrdersCloud()}));
 const eventDialog=$('#retailOrderEventsDialog'),eventClose=$('#retailOrderEventsClose');if(eventClose&&eventDialog)eventClose.onclick=()=>eventDialog.close();
 const messageDialog=$('#retailOrderMessagesDialog'),messageClose=$('#retailOrderMessagesClose'),messageForm=$('#retailOrderMessageForm');if(messageClose&&messageDialog)messageClose.onclick=()=>messageDialog.close();if(messageForm)messageForm.onsubmit=async event=>{event.preventDefault();const field=messageForm.elements.message,button=messageForm.querySelector('button[type=submit]'),text=String(field.value||'').trim();if(!text||!retailMessageOrderId)return;button.disabled=true;try{await sendRetailBakeryMessage(retailMessageOrderId,text);field.value='';await openRetailOrderMessages(retailMessageOrderId)}catch(error){alert(`Не удалось отправить сообщение: ${error.message||error}`)}finally{button.disabled=false}};
 const openSettings=$('#retailOpenSettings');if(openSettings)openSettings.onclick=()=>openRetailView('retail-settings');const analyticsOrders=$('#retailAnalyticsOpenOrders');if(analyticsOrders)analyticsOrders.onclick=()=>openRetailView('retail-orders');
 const form=$('#retailSettingsForm');if(form){form.elements.enabled.addEventListener('change',()=>{const label=$('#retailEnabledLabel');if(label)label.textContent=form.elements.enabled.checked?'Включена':'Выключена'});form.onsubmit=async event=>{event.preventDefault();const slots=String(form.elements.pickupSlots.value||'').split(/\n+/).map(v=>v.trim()).filter(Boolean).slice(0,20),deliverySlots=String(form.elements.deliverySlots?.value||'').split(/\n+/).map(v=>v.trim()).filter(Boolean).slice(0,20);const value=saveRetailSettingsLocal({...readRetailSettings(),enabled:!!form.elements.enabled.checked,location:'bakery',locationName:'Пекарня',stockSales:!!form.elements.stockSales.checked,preorders:!!form.elements.preorders.checked,pickup:!!form.elements.pickup.checked,delivery:!!form.elements.delivery.checked,onlinePayment:!!form.elements.onlinePayment.checked,payOnPickup:!!form.elements.payOnPickup.checked,reservationMinutes:Number(form.elements.reservationMinutes.value||15),preorderCutoffHours:Number(form.elements.preorderCutoffHours.value||24),preorderHorizonDays:Number(form.elements.preorderHorizonDays.value||7),pickupLeadMinutes:Number(form.elements.pickupLeadMinutes.value||60),maxOrdersPerSlot:Number(form.elements.maxOrdersPerSlot.value||12),pickupSlots:slots.length?slots:RETAIL_DEFAULT_SETTINGS.pickupSlots,deliveryMinTotal:Number(form.elements.deliveryMinTotal?.value||0),deliveryFee:Number(form.elements.deliveryFee?.value||0),deliveryFreeFrom:Number(form.elements.deliveryFreeFrom?.value||0),maxDeliveriesPerSlot:Number(form.elements.maxDeliveriesPerSlot?.value||8),deliverySlots:deliverySlots.length?deliverySlots:RETAIL_DEFAULT_SETTINGS.deliverySlots,contactPhone:form.elements.contactPhone.value,contactEmail:form.elements.contactEmail.value,pickupNote:form.elements.pickupNote.value,paymentProvider:form.elements.paymentProvider?.value||'none',notifyOrderReceived:!!form.elements.notifyOrderReceived?.checked,notifyReady:!!form.elements.notifyReady?.checked,notifyDelivery:!!form.elements.notifyDelivery?.checked,notifyCancelled:!!form.elements.notifyCancelled?.checked,contactWhatsApp:form.elements.contactWhatsApp?.value||'',contactTelegram:form.elements.contactTelegram?.value||'',fallbackWhatsApp:!!form.elements.fallbackWhatsApp?.checked,fallbackTelegram:!!form.elements.fallbackTelegram?.checked,fallbackSms:!!form.elements.fallbackSms?.checked,fallbackEmail:!!form.elements.fallbackEmail?.checked,pushCustomerEnabled:!!form.elements.pushCustomerEnabled?.checked,pushAdminEnabled:!!form.elements.pushAdminEnabled?.checked,pushNewOrder:!!form.elements.pushNewOrder?.checked,pushNewMessage:!!form.elements.pushNewMessage?.checked,pushQuietFrom:form.elements.pushQuietFrom?.value||'22:00',pushQuietTo:form.elements.pushQuietTo?.value||'08:00',pushVapidPublicKey:form.elements.pushVapidPublicKey?.value||'',pushTimeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'});renderRetailFoundation();const saved=$('#retailSettingsSaved');if(saved)saved.textContent='Сохраняем для экрана покупателя…';try{const result=await saveRetailSettingsCloud(value);if(saved)saved.textContent=result.extended?(value.enabled?'Сохранено в облаке · приём розничных заказов включён':'Сохранено в облаке · витрина выключена'):'Основные настройки сохранены · выполните SQL 6.34 для сообщений'}catch(error){if(saved)saved.textContent=`Сохранено на этом устройстве · облако: ${error.message||'ошибка'}`}}}
 const catalogForm=$('#retailCatalogForm');if(catalogForm)catalogForm.onsubmit=async event=>{event.preventDefault();const map=saveRetailProductSettingsLocal(collectRetailCatalogForm()),saved=$('#retailCatalogSaved');if(saved)saved.textContent='Сохраняем ассортимент…';try{await saveRetailProductSettingsCloud(map);if(saved)saved.textContent='Ассортимент сохранён в облаке'}catch(error){if(saved)saved.textContent=`Сохранено на этом устройстве · облако: ${error.message||'выполните SQL 6.28'}`}renderRetailCatalogSettings()};
 renderRetailFoundation();const cloudLoad=()=>Promise.allSettled([loadRetailSettingsCloud(),loadRetailProductSettingsCloud(),syncAndLoadFinishedStockMovementsCloud(),loadRetailOrdersCloud()]);window.addEventListener('panora:authenticated',cloudLoad,{once:true});if(window.panoraSupabaseSession?.access_token)setTimeout(cloudLoad,0);['panora:products-changed','panora:public-products-changed','panora:retail-catalog-updated'].forEach(name=>window.addEventListener(name,renderRetailCatalogSettings));window.addEventListener('panora:stock-movements-changed',()=>syncAndLoadFinishedStockMovementsCloud());window.addEventListener('storage',event=>{if(['panora-products',RETAIL_PRODUCT_SETTINGS_KEY,RETAIL_SETTINGS_KEY,RETAIL_ORDERS_KEY].includes(event.key))renderRetailFoundation()});window.addEventListener('focus',()=>{if(window.panoraSupabaseSession?.access_token)loadRetailOrdersCloud()});setInterval(()=>{if(!document.hidden&&window.panoraSupabaseSession?.access_token)loadRetailOrdersCloud()},30000);window.panoraRetailFoundation={settings:readRetailSettings,productSettings:readRetailProductSettings,orders:readRetailOrders,render:renderRetailFoundation,loadCloud:cloudLoad,loadOrders:loadRetailOrdersCloud,location:'bakery'};
}

/* Panora 6.08 — фактическое завершение выпечки. */
const BAKE_COMPLETION_KEY='panora-bake-completions';
const BAKE_COMPLETION_MIGRATION='panora-bake-completion-migration-v608';
const BAKE_COMPLETION_DEVICE_KEY='panora-bake-completion-device-v608';
const bakeCompletionDeviceId=(()=>{let id=localStorage.getItem(BAKE_COMPLETION_DEVICE_KEY);if(id)return id;id=crypto.randomUUID();localStorage.setItem(BAKE_COMPLETION_DEVICE_KEY,id);return id})();
function readBakeCompletions(){try{const value=JSON.parse(localStorage.getItem(BAKE_COMPLETION_KEY)||'[]');return Array.isArray(value)?value:[]}catch{return[]}}
function bakeCompletionFor(date){return readBakeCompletions().find(item=>String(item?.date||'')===String(date)&&!item?.deletedAt)||null}
function saveBakeCompletions(list,{localChange=true}={}){localStorage.setItem(BAKE_COMPLETION_KEY,JSON.stringify(Array.isArray(list)?list:[]));window.dispatchEvent(new CustomEvent('panora:bake-completions-changed'));if(localChange)window.dispatchEvent(new CustomEvent('panora:bake-completion-local-change'))}
function bakeOrdersForDate(date){return stockRead('panora-orders',[]).filter(order=>order&&order.status!=='cancelled'&&String(order.date||'').slice(0,10)===String(date))}
function bakeRetailOrdersForDate(date){return retailPreorderOrdersForDate(date)}
function bakeRecipeSnapshot(product){
 const source=Array.isArray(recipes?.[product])?recipes[product]:[];
 return source.map(item=>({
  name:String(item?.name||'').trim(),
  qty:Math.max(0,Number(item?.qty||0)),
  unit:String(item?.unit||'g'),
  sourceIngredientName:String(item?.sourceIngredientName||'').trim(),
  sourceUnit:String(item?.sourceUnit||item?.unit||'g'),
  sourceYieldPct:Math.max(0,Number(item?.sourceYieldPct||0))
 })).filter(item=>item.name&&item.qty>0);
}
function bakeSnapshot(date,existing=bakeCompletionFor(date)){
 const partnerMap=new Map(),retailMap=retailPreorderMapForDate(date),planMap=new Map();
 bakeOrdersForDate(date).forEach(order=>(order.items||[]).forEach(item=>{const product=String(item?.product||''),qty=Math.max(0,Number(item?.quantity||item?.quantityPieces||0));if(product&&qty)partnerMap.set(product,(partnerMap.get(product)||0)+qty)}));
 plans.filter(plan=>String(plan?.bakeDate||'')===String(date)).forEach(plan=>{const product=String(plan?.product||'');if(!product)return;const current=planMap.get(product)||{planned:0,planOrdered:0};current.planned+=Math.max(0,Number(plan?.planned||0));current.planOrdered+=Math.max(0,Number(plan?.ordered||0));planMap.set(product,current)});
 const existingMap=new Map((existing?.items||[]).map(item=>[String(item.product),item])),ids=new Set([...partnerMap.keys(),...retailMap.keys(),...planMap.keys(),...existingMap.keys()]);
 return [...ids].map(product=>{const partnerOrdered=Math.max(0,Number(partnerMap.get(product)||0)),retailOrdered=Math.max(0,Number(retailMap.get(product)||0)),orderQty=partnerOrdered+retailOrdered,plan=planMap.get(product)||{planned:0,planOrdered:0},prior=existingMap.get(product),suggested=Math.max(0,orderQty||Number(plan.planOrdered||0)||Number(plan.planned||0)),produced=prior?Math.max(0,Number(prior.produced||0)):suggested,waste=prior?Math.max(0,Math.min(produced,Number(prior.waste||0))):0;return{product,ordered:orderQty,partnerOrdered,retailOrdered,planned:Math.max(0,Number(plan.planned||0)),produced,waste,good:Math.max(0,produced-waste),rawQuantity:prior?.rawQuantity===undefined?undefined:Math.max(0,Number(prior.rawQuantity||0)),recipeSnapshot:Array.isArray(prior?.recipeSnapshot)&&prior.recipeSnapshot.length?prior.recipeSnapshot:bakeRecipeSnapshot(product)}}).sort((a,b)=>stockProductName(a.product).localeCompare(stockProductName(b.product),'ru'));
}
function migrateLegacyBakeCompletions(){
 if(localStorage.getItem(BAKE_COMPLETION_MIGRATION)==='1')return;
 const today=stockLocalDate(),existing=readBakeCompletions(),byDate=new Map(existing.map(item=>[String(item.date||''),item])),dates=new Set();
 stockRead('panora-orders',[]).filter(order=>order&&order.status!=='cancelled'&&String(order.date||'')<today).forEach(order=>dates.add(String(order.date).slice(0,10)));
 plans.filter(plan=>String(plan?.bakeDate||'')<today).forEach(plan=>dates.add(String(plan.bakeDate)));
 [...dates].sort().forEach(date=>{if(byDate.has(date))return;const orderMap=new Map(),planMap=new Map();bakeOrdersForDate(date).forEach(order=>(order.items||[]).forEach(item=>{const product=String(item?.product||''),qty=Math.max(0,Number(item?.quantity||item?.quantityPieces||0));if(product&&qty)orderMap.set(product,(orderMap.get(product)||0)+qty)}));plans.filter(plan=>String(plan?.bakeDate||'')===date).forEach(plan=>{const product=String(plan?.product||'');if(product)planMap.set(product,(planMap.get(product)||0)+Math.max(0,Number(plan?.ordered||plan?.planned||0)))});const hasOrders=[...orderMap.values()].reduce((sum,value)=>sum+Number(value||0),0)>0,ids=new Set([...orderMap.keys(),...planMap.keys()]);const items=[...ids].map(product=>{const ordered=Math.max(0,Number(orderMap.get(product)||0)),rawQuantity=hasOrders?ordered:Math.max(0,Number(planMap.get(product)||0));return{product,ordered,planned:Math.max(0,Number(planMap.get(product)||0)),produced:ordered,waste:0,good:ordered,rawQuantity,recipeSnapshot:bakeRecipeSnapshot(product)}}).filter(item=>item.produced>0||item.rawQuantity>0);if(!items.length)return;const deterministicTime=`${date}T23:59:59.000Z`;existing.push({id:`bake:${date}`,date,items,note:'Перенесено из учёта Panora до 6.08',source:'legacy_inferred',createdAt:deterministicTime,updatedAt:deterministicTime,deviceId:'migration-v608',deletedAt:''})});
 localStorage.setItem(BAKE_COMPLETION_KEY,JSON.stringify(existing));localStorage.setItem(BAKE_COMPLETION_MIGRATION,'1');
}
function upgradeBakeCompletionSnapshots(){
 const list=readBakeCompletions();let changed=false;
 list.forEach(completion=>{
  if(completion?.deletedAt)return;
  (completion.items||[]).forEach(item=>{
   if(Array.isArray(item.recipeSnapshot)&&item.recipeSnapshot.length)return;
   item.recipeSnapshot=bakeRecipeSnapshot(String(item.product||''));changed=true;
  });
 });
 if(!changed)return false;
 const now=new Date().toISOString();
 list.forEach(completion=>{
  if(completion?.deletedAt)return;
  completion.snapshotVersion=1;
  completion.updatedAt=now;
  completion.deviceId=bakeCompletionDeviceId;
 });
 saveBakeCompletions(list);return true;
}
function bakeWeekDates(){const end=new Date(weekStart);end.setDate(end.getDate()+6);const from=iso(weekStart),to=iso(end),dates=new Set();plans.filter(plan=>String(plan?.bakeDate||'')>=from&&String(plan?.bakeDate||'')<=to).forEach(plan=>dates.add(String(plan.bakeDate)));stockRead('panora-orders',[]).filter(order=>order&&order.status!=='cancelled'&&String(order.date||'')>=from&&String(order.date||'')<=to).forEach(order=>dates.add(String(order.date).slice(0,10)));readRetailOrders().filter(order=>order&&String(order.source||'')==='bake_preorder'&&retailOrderStatus(order)!=='cancelled'&&String(order.bakeDate||'')>=from&&String(order.bakeDate||'')<=to).forEach(order=>dates.add(String(order.bakeDate).slice(0,10)));readBakeCompletions().filter(item=>!item.deletedAt&&String(item.date||'')>=from&&String(item.date||'')<=to).forEach(item=>dates.add(String(item.date)));return[...dates].sort()}
function renderBakeCompletionBoard(){
 const root=$('#bakeCompletionBoard');if(!root)return;const today=stockLocalDate(),dates=bakeWeekDates();
 root.innerHTML=dates.length?`<div class="bake-completion-board-head"><div><h3>Факт выпечки</h3><p>Реальный спрос = заказы партнёров + розничные предзаказы. После завершения сырьё списывается, хлеб приходуется, а розничный предзаказ резервирует готовый хлеб.</p></div></div><div class="bake-completion-day-list">${dates.map(date=>{const completion=bakeCompletionFor(date),rows=bakeSnapshot(date,completion),ordered=rows.reduce((sum,row)=>sum+Number(row.ordered||0),0),partner=rows.reduce((sum,row)=>sum+Number(row.partnerOrdered||0),0),retail=rows.reduce((sum,row)=>sum+Number(row.retailOrdered||0),0),planned=rows.reduce((sum,row)=>sum+Number(row.planned||0),0),future=date>today;if(completion){const good=(completion.items||[]).reduce((sum,item)=>sum+Math.max(0,Number(item.good??(Number(item.produced||0)-Number(item.waste||0)))),0),waste=(completion.items||[]).reduce((sum,item)=>sum+Math.max(0,Number(item.waste||0)),0),legacy=completion.source==='legacy_inferred',coverage=retailBakeCoverage(date);return `<article class="bake-completion-day completed ${legacy?'legacy':''}"><div><strong>${fmt(date,{weekday:'long',day:'numeric',month:'long'})}</strong><span>${legacy?'Перенесено из старого учёта':'Выпечка завершена'}</span></div><div class="bake-completion-day-metrics"><span>Партнёры <b>${partner}</b></span><span>Розница <b>${retail}</b></span><span>Всего <b>${ordered}</b></span><span>На склад <b>${good}</b></span><span>Брак <b>${waste}</b></span>${coverage.shortage>0?`<span class="retail-bake-shortage">Не обеспечено <b>${coverage.shortage}</b></span>`:retail>0?'<span class="retail-bake-covered">Розница обеспечена</span>':''}</div><button type="button" class="secondary" data-bake-complete="${date}">${legacy?'Уточнить факт':'Изменить факт'}</button></article>`}return `<article class="bake-completion-day ${future?'future':''}"><div><strong>${fmt(date,{weekday:'long',day:'numeric',month:'long'})}</strong><span>${future?'Ещё не наступила':'Ожидает завершения'}</span></div><div class="bake-completion-day-metrics"><span>Партнёры <b>${partner}</b></span><span>Розница <b>${retail}</b></span><span>Всего к заказам <b>${ordered}</b></span><span>План <b>${planned}</b></span></div><button type="button" class="primary" data-bake-complete="${date}" ${future?'disabled':''}>${future?'Завершить после выпечки':'Выпечка завершена'}</button></article>`}).join('')}</div>`:'';
 root.querySelectorAll('[data-bake-complete]').forEach(button=>button.onclick=()=>openBakeCompletion(button.dataset.bakeComplete));
}
function updateBakeCompletionDialog(){const form=$('#bakeCompletionForm'),body=$('#bakeCompletionRows'),summary=$('#bakeCompletionSummary'),error=$('#bakeCompletionError');if(!form||!body||!summary)return;let producedTotal=0,wasteTotal=0,goodTotal=0,orderedTotal=0;body.querySelectorAll('tr[data-product]').forEach(row=>{const produced=Math.max(0,Math.floor(Number(row.querySelector('[data-bake-produced]')?.value||0)));let waste=Math.max(0,Math.floor(Number(row.querySelector('[data-bake-waste]')?.value||0)));if(waste>produced)waste=produced;const good=produced-waste,ordered=Math.max(0,Number(row.dataset.ordered||0)),goodCell=row.querySelector('[data-bake-good]');if(goodCell)goodCell.textContent=`${good} шт.`;const difference=good-ordered,diff=row.querySelector('[data-bake-diff]');if(diff){diff.textContent=difference===0?'по заказу':difference>0?`+${difference} свободно`:`−${Math.abs(difference)} к заказу`;diff.className=`bake-completion-diff ${difference<0?'negative':difference>0?'positive':'zero'}`}producedTotal+=produced;wasteTotal+=waste;goodTotal+=good;orderedTotal+=ordered});summary.innerHTML=`<span>Заказано <strong>${orderedTotal} шт.</strong></span><span>Выпечено <strong>${producedTotal} шт.</strong></span><span>Брак <strong>${wasteTotal} шт.</strong></span><span>На склад <strong>${goodTotal} шт.</strong></span>`;if(error)error.textContent=''}
function openBakeCompletion(date){if(!date||date>stockLocalDate())return;const dialog=$('#bakeCompletionDialog'),form=$('#bakeCompletionForm'),body=$('#bakeCompletionRows');if(!dialog||!form||!body)return;const existing=bakeCompletionFor(date),rows=bakeSnapshot(date,existing);if(!rows.length){alert('На эту дату нет ни заказа, ни плана выпечки.');return}form.reset();form.bakeDate.value=date;form.note.value=existing?.note&&existing.source!=='legacy_inferred'?existing.note:'';$('#bakeCompletionDateLabel').textContent=fmt(date,{weekday:'long',day:'numeric',month:'long',year:'numeric'});body.innerHTML=rows.map(row=>`<tr data-product="${adminEscape(row.product)}" data-ordered="${row.ordered}"><td><strong>${adminEscape(stockProductName(row.product))}</strong><small>${row.planned?`План ${row.planned} шт.`:'Без отдельного плана'}</small></td><td><strong>${row.ordered} шт.</strong></td><td><input type="number" min="0" step="1" inputmode="numeric" data-bake-produced value="${Math.floor(row.produced)}" aria-label="Выпечено ${adminEscape(stockProductName(row.product))}"></td><td><input type="number" min="0" step="1" inputmode="numeric" data-bake-waste value="${Math.floor(row.waste)}" aria-label="Брак ${adminEscape(stockProductName(row.product))}"></td><td><strong data-bake-good>${Math.max(0,Math.floor(row.produced-row.waste))} шт.</strong><small data-bake-diff></small></td></tr>`).join('');body.querySelectorAll('input').forEach(input=>input.oninput=updateBakeCompletionDialog);updateBakeCompletionDialog();dialog.showModal()}
function bindBakeCompletion(){const dialog=$('#bakeCompletionDialog'),form=$('#bakeCompletionForm');if(!dialog||!form||form.dataset.bound==='1')return;form.dataset.bound='1';const close=()=>dialog.open&&dialog.close();$('#bakeCompletionClose').onclick=$('#bakeCompletionCancel').onclick=close;dialog.onclick=event=>{if(event.target===dialog)close()};form.onsubmit=event=>{event.preventDefault();if(!form.reportValidity())return;const date=String(form.bakeDate.value||'');if(!date||date>stockLocalDate())return;const items=[];let invalid=false;$('#bakeCompletionRows').querySelectorAll('tr[data-product]').forEach(row=>{const produced=Math.max(0,Math.floor(Number(row.querySelector('[data-bake-produced]')?.value||0))),waste=Math.max(0,Math.floor(Number(row.querySelector('[data-bake-waste]')?.value||0)));if(waste>produced){invalid=true;return}const ordered=Math.max(0,Number(row.dataset.ordered||0)),product=String(row.dataset.product||''),plan=plans.filter(p=>String(p?.bakeDate||'')===date&&String(p?.product||'')===product).reduce((sum,p)=>sum+Math.max(0,Number(p?.planned||0)),0);const prior=bakeCompletionFor(date)?.items?.find(item=>String(item.product)===product);items.push({product,ordered,planned:plan,produced,waste,good:produced-waste,rawQuantity:produced,recipeSnapshot:Array.isArray(prior?.recipeSnapshot)&&prior.recipeSnapshot.length?prior.recipeSnapshot:bakeRecipeSnapshot(product)})});if(invalid){$('#bakeCompletionError').textContent='Брак не может быть больше общего количества выпеченного хлеба.';return}if(!items.some(item=>item.produced>0)&&!confirm('Сохранить завершённую выпечку с нулевым выпуском?'))return;const list=readBakeCompletions(),index=list.findIndex(item=>String(item.date||'')===date),now=new Date().toISOString(),previous=index>=0?list[index]:null,record={id:previous?.id||`bake:${date}`,date,items,note:String(form.note.value||'').trim(),source:'actual',createdAt:previous?.createdAt||now,updatedAt:now,deviceId:bakeCompletionDeviceId,deletedAt:''};if(index>=0)list[index]=record;else list.push(record);saveBakeCompletions(list);close();renderPlan();renderStock();window.panoraRawStock?.render?.();window.dispatchEvent(new CustomEvent('panora:order-cycle-updated'))}}
window.panoraBakeCompletion={read:readBakeCompletions,get:bakeCompletionFor,open:openBakeCompletion,render:renderBakeCompletionBoard,deviceId:bakeCompletionDeviceId,storageKey:BAKE_COMPLETION_KEY};
function applyLanguage(){$('#adminLanguage').value=lang;$$('[data-t]').forEach(e=>e.textContent=t(e.dataset.t));renderAll()}
function renderAll(){renderPlan();renderRecipes();renderPurchase();renderStock()}
function renderPlan(){
 const end=new Date(weekStart);end.setDate(end.getDate()+6);$('#periodLabel').textContent=`${fmt(iso(weekStart))} — ${fmt(iso(end),{day:'numeric',month:'short',year:'numeric'})}`;
 const visible=plans.filter(p=>p.bakeDate>=iso(weekStart)&&p.bakeDate<=iso(end)).sort((a,b)=>a.bakeDate.localeCompare(b.bakeDate)),planned=visible.reduce((sum,p)=>sum+Number(p.planned||0),0),partnerOrdered=visible.reduce((sum,p)=>sum+Number(p.ordered||0),0),retailOrdered=visible.reduce((sum,p)=>sum+retailPreorderQuantity(p.bakeDate,p.product),0),ordered=partnerOrdered+retailOrdered;$('#plannedPieces').textContent=`${planned} ${t('pcs')}`;$('#orderedPieces').textContent=`${ordered} ${t('pcs')}`;$('#freePieces').textContent=`${Math.max(0,planned-ordered)} ${t('pcs')}`;
 $('#planList').innerHTML=visible.length?visible.map(p=>{const partner=Math.max(0,Number(p.ordered||0)),retail=retailPreorderQuantity(p.bakeDate,p.product),real=partner+retail,percent=p.planned?Math.min(100,Math.round(real/p.planned*100)):0,completion=bakeCompletionFor(p.bakeDate);return `<article class="plan-card ${completion?'bake-is-completed':''}"><div class="date"><strong>${fmt(p.bakeDate,{weekday:'short',day:'numeric',month:'short'})}</strong><small>${t('delivery')}: ${fmt(p.deliveryDate)}</small></div><div class="product"><strong>${productName(p.product)}</strong><small>${t('cutoffShort')}: ${new Date(p.cutoff).toLocaleString()}</small></div><div><strong>${p.planned} ${t('pcs')}</strong><small class="plan-demand-sources">Партнёры ${partner} · Розница ${retail} · Всего ${real}</small><div class="progress"><i style="width:${percent}%"></i></div></div><div><input class="ordered-input" data-order="${p.id}" type="number" min="0" value="${partner}" aria-label="${t('ordered')}" ${completion?'disabled title="Выпечка уже завершена"':''}></div><span class="status ${completion?'completed':p.open?'':'closed'}">${completion?'Завершена':p.open?t('open'):t('closed')}</span><button class="icon-delete" data-cancel-plan-date="${p.bakeDate}" title="Отменить весь день выпечки" aria-label="Отменить весь день выпечки" ${completion?'disabled':''}>×</button></article>`}).join(''):`<article class="plan-card"><div>${t('empty')}</div></article>`;
 $$('[data-cancel-plan-date]').forEach(button=>button.onclick=()=>{if(button.disabled)return;const date=button.dataset.cancelPlanDate,reason=prompt(`Укажите причину отмены выпечки ${date}:`);if(reason===null)return;if(!reason.trim()){alert('Причина отмены обязательна.');return}if(confirm(`Отменить весь день выпечки ${date}, включая все виды хлеба и неотгруженные заказы?`))performCancelBake(date,reason.trim())});
 $$('[data-order]').forEach(input=>input.onchange=()=>{const p=plans.find(x=>x.id===input.dataset.order);if(!p||bakeCompletionFor(p.bakeDate))return;p.ordered=Math.max(0,Number(input.value));store('panora-production-plans',plans);renderAll()});renderBakeCompletionBoard();
}
function recipeProduct(pid){try{return (typeof productRegistry!=='undefined'&&productRegistry.find(p=>p.id===pid))||JSON.parse(localStorage.getItem('panora-products')||'[]').find(p=>p.id===pid)}catch{return null}}
function recipeWeightLabel(){return lang==='ru'?'Вес готового изделия':lang==='es'?'Peso del producto terminado':'Finished product weight'}
function renderRecipes(){$('#recipeList').innerHTML=Object.keys(PRODUCTS).map(pid=>{const product=recipeProduct(pid);return `<article class="recipe-card"><h3>${adminEscape(productName(pid))}</h3><label class="recipe-product-weight"><span>${recipeWeightLabel()}</span><span><input data-recipe-weight="${pid}" type="number" min="1" step="1" value="${Number(product?.weight||750)}"> g</span></label><div>${(recipes[pid]||[]).map((r,i)=>`<div class="recipe-row"><input data-recipe-name="${pid}:${i}" value="${adminEscape(r.name)}"><input data-recipe-qty="${pid}:${i}" type="number" min="0" step="0.01" value="${r.qty}"><select data-recipe-unit="${pid}:${i}"><option ${r.unit==='g'?'selected':''}>g</option><option ${r.unit==='ml'?'selected':''}>ml</option><option ${r.unit==='pcs'?'selected':''}>pcs</option></select><button class="recipe-delete" data-delete-ingredient="${pid}:${i}" type="button">×</button></div>`).join('')}</div><button class="secondary" data-add-ingredient="${pid}">+ ${t('ingredient')}</button></article>`}).join('');$$('[data-recipe-weight]').forEach(e=>e.onchange=()=>{const product=recipeProduct(e.dataset.recipeWeight);if(!product)return;e.value=String(Math.max(1,Math.round(Number(e.value)||1)));product.weight=Number(e.value);if(typeof saveProducts==='function')saveProducts();else{const all=JSON.parse(localStorage.getItem('panora-products')||'[]'),saved=all.find(p=>p.id===product.id);if(saved){saved.weight=product.weight;if(window.panoraPersistProductsCache)window.panoraPersistProductsCache(all);else localStorage.setItem('panora-products',JSON.stringify(all));window.panoraCloud?.queueProducts()}}});$$('[data-recipe-name],[data-recipe-qty],[data-recipe-unit]').forEach(e=>e.onchange=()=>{const [pid,i]=(e.dataset.recipeName||e.dataset.recipeQty||e.dataset.recipeUnit).split(':');if(e.dataset.recipeName)recipes[pid][i].name=e.value;if(e.dataset.recipeQty)recipes[pid][i].qty=Number(e.value);if(e.dataset.recipeUnit)recipes[pid][i].unit=e.value;store('panora-recipes',recipes);renderPurchase()});$$('[data-add-ingredient]').forEach(b=>b.onclick=()=>{recipes[b.dataset.addIngredient].push({name:t('ingredient'),qty:0,unit:'g',stock:0,margin:5});store('panora-recipes',recipes);renderAll()});$$('[data-delete-ingredient]').forEach(b=>b.onclick=()=>{const [pid,index]=b.dataset.deleteIngredient.split(':'),item=recipes[pid][Number(index)],question=lang==='ru'?`Удалить ингредиент «${item.name||'без названия'}»?`:lang==='es'?`¿Eliminar «${item.name||'sin nombre'}»?`:`Delete “${item.name||'unnamed'}”?`;if(!confirm(question))return;recipes[pid].splice(Number(index),1);store('panora-recipes',recipes);renderAll()})}
function purchaseDates(){return [...new Set(plans.filter(p=>p.bakeDate>=iso(new Date())).map(p=>p.bakeDate))].sort()}
function renderPurchaseFilter(){const select=$('#purchaseDateFilter');if(!select)return;const dates=purchaseDates();if(purchaseDateFilter!=='all'&&!dates.includes(purchaseDateFilter))purchaseDateFilter='all';const allLabel=lang==='ru'?'Все даты вместе':lang==='es'?'Todas las fechas juntas':'All dates together';select.innerHTML=`<option value="all">${allLabel}</option>`+dates.map((date,index)=>`<option value="${date}">${index===0?(lang==='ru'?'Первая выпечка':lang==='es'?'Primer horneado':'First bake'):index===1?(lang==='ru'?'Вторая выпечка':lang==='es'?'Segundo horneado':'Second bake'):(lang==='ru'?`Выпечка ${index+1}`:lang==='es'?`Horneado ${index+1}`:`Bake ${index+1}`)} — ${fmt(date,{weekday:'short',day:'numeric',month:'short'})}</option>`).join('');select.value=purchaseDateFilter;select.onchange=()=>{purchaseDateFilter=select.value;renderPurchase()};$('#purchaseFilterSummary').textContent=purchaseDateFilter==='all'?`${dates.length} ${lang==='ru'?'дат':lang==='es'?'fechas':'dates'}`:fmt(purchaseDateFilter,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
function ingredientTotals(){const totals={};plans.filter(p=>p.bakeDate>=iso(new Date())&&(purchaseDateFilter==='all'||p.bakeDate===purchaseDateFilter)).forEach(p=>(recipes[p.product]||[]).forEach(r=>{const key=`${r.name}|${r.unit}`;totals[key]??={name:r.name,unit:r.unit,required:0,stock:Number(r.stock||0),margin:Number(r.margin||5)};totals[key].required+=Math.max(Number(p.planned)||0,Number(p.ordered)||0)*Number(r.qty)}));return Object.values(totals)}
function niceQty(n,unit){if(unit==='g'&&n>=1000)return `${(n/1000).toFixed(2)} kg`;if(unit==='ml'&&n>=1000)return `${(n/1000).toFixed(2)} l`;return `${Math.ceil(n*100)/100} ${unit}`}
function renderPurchase(){renderPurchaseFilter();const rows=ingredientTotals();$('#purchaseRows').innerHTML=rows.length?rows.map((r,i)=>{const buy=Math.max(0,r.required*(1+r.margin/100)-r.stock);return `<tr><td><strong>${adminEscape(r.name)}</strong></td><td>${niceQty(r.required,r.unit)}</td><td><input data-stock="${i}" type="number" min="0" value="${r.stock}"> ${r.unit}</td><td><input data-margin="${i}" type="number" min="0" value="${r.margin}">%</td><td><strong>${niceQty(buy,r.unit)}</strong></td></tr>`}).join(''):`<tr><td colspan="5">${t('empty')}</td></tr>`;$$('[data-stock],[data-margin]').forEach(e=>e.onchange=()=>{const row=rows[Number(e.dataset.stock??e.dataset.margin)];Object.values(recipes).flat().filter(r=>r.name===row.name&&r.unit===row.unit).forEach(r=>{if(e.dataset.stock!==undefined)r.stock=Number(e.value);else r.margin=Number(e.value)});store('panora-recipes',recipes);renderPurchase()})}
let stockMovementView='active';
function stockRead(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??structuredClone(fallback)}catch{return structuredClone(fallback)}}
function stockLocalDate(){return iso(new Date())}
function stockCutoffDate(days=30){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-days);return iso(d)}
function stockProductIds(){
 const ids=new Set(Object.keys(PRODUCTS));
 try{(JSON.parse(localStorage.getItem('panora-products')||'[]')||[]).forEach(p=>{if(p?.id&&!p.deletedAt)ids.add(String(p.id))})}catch{}
 stockRead('panora-orders',[]).forEach(o=>(o.items||[]).forEach(i=>i?.product&&ids.add(String(i.product))));
 stockRead('panora-delivery-notes',[]).forEach(n=>(n.items||[]).forEach(i=>i?.product&&ids.add(String(i.product))));
 readRetailOrders().forEach(o=>(o.items||[]).forEach(i=>i?.product&&ids.add(String(i.product))));
 readBakeCompletions().filter(item=>!item.deletedAt).forEach(c=>(c.items||[]).forEach(i=>i?.product&&ids.add(String(i.product))));
 movements.forEach(m=>m?.product&&ids.add(String(m.product)));
 return [...ids];
}
function stockProductName(pid){
 try{
  const product=(JSON.parse(localStorage.getItem('panora-products')||'[]')||[]).find(p=>String(p.id)===String(pid));
  if(product)return product.names?.[lang]||product.names?.ru||product.name||String(pid);
 }catch{}
 return productName(pid);
}
function signed(m){
 const type=String(m?.type||'');
 const qty=Math.abs(Number(m?.quantity||0));
 return ['shipped','retail_sold','written_off','correction_minus'].includes(type)?-qty:qty;
}
function stockOperationLabel(type){
 return ({
  baked:'Выпечка',
  produced:'Ручной приход',
  shipped:'Отгрузка партнёру',
  retail_sold:'Розничная выдача',
  returned:'Возврат',
  written_off:'Списание / брак',
  correction_plus:'Корректировка +',
  correction_minus:'Корректировка −',
  initial_balance:'Начальный остаток'
 })[type]||type;
}
function stockOrders(){return stockRead('panora-orders',[])}
function stockNotes(){return stockRead('panora-delivery-notes',[])}
function stockManualProduced(date,product){
 return movements.filter(m=>m.type==='produced'&&String(m.date||'')===String(date)&&String(m.product)===String(product)).reduce((sum,m)=>sum+Math.abs(Number(m.quantity||0)),0);
}
function stockAutoBakeMovements(){
 const today=stockLocalDate();
 return readBakeCompletions().filter(completion=>completion&&!completion.deletedAt&&String(completion.date||'')<=today).flatMap(completion=>(completion.items||[]).flatMap((item,index)=>{const product=String(item.product||''),good=Math.max(0,Number(item.good??(Number(item.produced||0)-Number(item.waste||0))));if(!product||good<=0)return[];const legacyManual=completion.source==='legacy_inferred'?stockManualProduced(completion.date,product):0,auto=Math.max(0,good-legacyManual);if(auto<=0)return[];return[{id:`auto-bake:${completion.date}:${product}:${index}`,date:completion.date,product,type:'baked',quantity:auto,note:completion.source==='legacy_inferred'?'Перенесённый факт выпечки':'Фактическая выпечка завершена',bakeDate:completion.date,virtual:true,bakeCompletionId:completion.id,occurredAt:completion.createdAt||`${completion.date}T12:00:00`}]}));
}
function stockCanonicalNotes(){
 const seen=new Set(),rows=[];
 stockNotes().slice().sort((a,b)=>String(a.createdAt||a.date||'').localeCompare(String(b.createdAt||b.date||''))).forEach(note=>{
  const key=note.orderId?`order:${String(note.orderId)}`:`note:${String(note.id||'')}`;
  if(seen.has(key))return;
  seen.add(key);rows.push(note);
 });
 return rows;
}
function stockShipmentMovements(){
 return stockCanonicalNotes().flatMap(note=>(note.items||[]).map((item,index)=>({
  id:`auto-ship:${note.id}:${item.product}:${index}`,
  date:String(note.date||''),
  product:String(item.product||''),
  type:'shipped',
  quantity:Math.max(0,Number(item.quantity||0)),
  note:`Накладная DN-${String(note.number||'').padStart(4,'0')}`,
  noteId:String(note.id||''),
  orderId:String(note.orderId||''),
  occurredAt:note.createdAt||note.customerConfirmedAt||`${String(note.date||'')}T12:00:00`,
  virtual:true
 }))).filter(m=>m.product&&m.quantity>0);
}
function stockRetailCompletedMovements(){
 return readRetailOrders().filter(order=>order&&retailOrderStatus(order)==='completed').flatMap(order=>(order.items||[]).map((item,index)=>({
  id:`retail-sold:${order.id}:${item.product}:${index}`,
  date:String(order.pickupDate||order.completedAt||order.updatedAt||'').slice(0,10)||stockLocalDate(),
  product:String(item.product||''),
  type:'retail_sold',
  quantity:Math.max(0,Number(item.quantity||0)),
  note:`Розничный заказ ${retailOrderNumber(order)}`,
  retailOrderId:String(order.id||''),
  occurredAt:order.completedAt||order.updatedAt||order.createdAt||'',
  virtual:true
 }))).filter(m=>m.product&&m.quantity>0);
}
function stockEffectiveMovements(){
 const notes=stockCanonicalNotes(),noteOrders=new Set(notes.map(n=>String(n.orderId||'')).filter(Boolean));
 const manual=movements.filter(m=>!(m.type==='shipped'&&m.orderId&&noteOrders.has(String(m.orderId))));
 return [...manual,...stockAutoBakeMovements(),...stockShipmentMovements(),...stockRetailCompletedMovements()];
}
function stockRawBalance(product){
 return stockEffectiveMovements().filter(m=>String(m.product)===String(product)).reduce((sum,m)=>sum+signed(m),0);
}
function stockReserved(product){
 const today=stockLocalDate(),shippedOrders=new Set(stockCanonicalNotes().map(note=>String(note.orderId||'')).filter(Boolean));
 const partner=stockOrders()
  .filter(o=>o&&!['shipped','cancelled'].includes(o.status)&&!shippedOrders.has(String(o.id||''))&&String(o.date||'')&&String(o.date)<=today)
  .flatMap(o=>o.items||[])
  .filter(item=>String(item.product)===String(product))
  .reduce((sum,item)=>sum+Math.max(0,Number(item.quantity||item.quantityPieces||0)),0);
 // 6.30: keep the admin stock view aligned with panora_retail_stock_snapshot().
 // Stock orders reserve immediately. Bake preorders start reserving finished bread
 // only after a factual bake completion exists for their bake date. Delivery orders
 // remain reserved while they are physically "delivering" and are released only
 // when completed/cancelled.
 const retail=readRetailOrders()
  .filter(o=>{
   if(!o||['completed','cancelled'].includes(retailOrderStatus(o)))return false;
   const source=String(o.source||'stock');
   if(source==='stock')return true;
   if(source!=='bake_preorder')return false;
   const bakeDate=String(o.bakeDate||o.pickupDate||'').slice(0,10);
   return !!(bakeDate&&bakeCompletionFor(bakeDate));
  })
  .flatMap(o=>o.items||[])
  .filter(item=>String(item.product)===String(product))
  .reduce((sum,item)=>sum+Math.max(0,Number(item.quantity||0)),0);
 return partner+retail;
}
function stockOpenNote(noteId,orderId){
 if(noteId&&typeof window.panoraOpenDeliveryNote==='function'){window.panoraOpenDeliveryNote(noteId);return}
 if(orderId&&typeof window.printNote==='function'){window.printNote(orderId);return}
 if(orderId&&typeof printNote==='function'){printNote(orderId)}
}
function stockOpenBake(date){
 const button=document.querySelector('.admin-nav [data-view="plan"]');
 if(button)button.click();
 if(date&&typeof startOfWeek==='function'){weekStart=startOfWeek(new Date(`${date}T12:00:00`));if(typeof renderPlan==='function')renderPlan()}
 const jump=$('#planDateJump');if(jump)jump.value=date;
}
function stockMovementNote(m){
 if(m.type==='shipped'&&m.noteId)return `<button type="button" class="stock-doc-link" data-stock-note="${adminEscape(m.noteId)}" data-stock-order="${adminEscape(m.orderId||'')}">${adminEscape(m.note||'Накладная')}</button>`;
 if(m.type==='baked'&&m.bakeDate)return `<button type="button" class="stock-doc-link" data-stock-bake="${adminEscape(m.bakeDate)}">${adminEscape(m.note||'Выпечка')}</button>`;
 return adminEscape(m.note||'—');
}
function renderStock(){
 const ids=stockProductIds(),effective=stockEffectiveMovements(),today=stockLocalDate(),cutoff=stockCutoffDate(30);
 const cards=ids.map(pid=>{
  const raw=effective.filter(m=>String(m.product)===String(pid)).reduce((sum,m)=>sum+signed(m),0);
  const onHand=Math.max(0,raw),reserved=stockReserved(pid),free=Math.max(0,onHand-reserved),shortage=Math.max(0,reserved-onHand);
  return {pid,raw,onHand,reserved,free,shortage};
 }).sort((x,y)=>stockProductName(x.pid).localeCompare(stockProductName(y.pid),'ru'));
 const totalOnHand=cards.reduce((s,x)=>s+x.onHand,0),totalReserved=cards.reduce((s,x)=>s+x.reserved,0),totalFree=cards.reduce((s,x)=>s+x.free,0);
 const writtenOff30=effective.filter(m=>String(m.date||'')>=cutoff&&m.type==='written_off').reduce((s,m)=>s+Math.abs(Number(m.quantity||0)),0);
 $('#stockTotalOnHand').textContent=`${totalOnHand} ${t('pcs')}`;
 $('#stockTotalReserved').textContent=`${totalReserved} ${t('pcs')}`;
 $('#stockTotalFree').textContent=`${totalFree} ${t('pcs')}`;
 $('#stockWrittenOff30').textContent=`${writtenOff30} ${t('pcs')}`;
 $('#stockCards').innerHTML=cards.map(x=>`<article class="stock-product-card ${x.shortage?'has-shortage':''} ${x.raw<0?'has-discrepancy':''}">
   <div class="stock-product-card-head"><strong>${adminEscape(stockProductName(x.pid))}</strong>${x.shortage?`<span>Не хватает ${x.shortage} шт.</span>`:''}</div>
   <div class="stock-product-main"><small>На складе</small><b>${x.onHand} ${t('pcs')}</b></div>
   <dl><div><dt>Зарезервировано</dt><dd>${x.reserved} ${t('pcs')}</dd></div><div><dt>Свободно</dt><dd>${x.free} ${t('pcs')}</dd></div></dl>
   ${x.raw<0?`<p class="stock-discrepancy">Нужна инвентаризация: старые движения дают расчётный остаток ${x.raw} шт.</p>`:''}
  </article>`).join('');
 const warnings=[];
 cards.filter(x=>x.raw<0).forEach(x=>warnings.push(`<p><strong>${adminEscape(stockProductName(x.pid))}</strong>: требуется инвентаризация, исторический расчёт ${x.raw} шт.</p>`));
 cards.filter(x=>x.shortage>0).forEach(x=>warnings.push(`<p><strong>${adminEscape(stockProductName(x.pid))}</strong>: не хватает для активных резервов ${x.shortage} шт.</p>`));
 const warningRoot=$('#stockWarnings');warningRoot.hidden=!warnings.length;warningRoot.innerHTML=warnings.join('');
 const sorted=effective.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.id||'').localeCompare(String(a.id||'')));
 const recent=sorted.filter(m=>String(m.date||'')>=cutoff),archive=sorted.filter(m=>String(m.date||'')<cutoff);
 const tabs=$('#stockMovementTabs');
 tabs.innerHTML=`<button type="button" class="${stockMovementView==='active'?'active':''}" data-stock-view="active"><span>Активные</span><b>${recent.length}</b></button><button type="button" class="${stockMovementView==='archive'?'active':''}" data-stock-view="archive"><span>Архив</span><b>${archive.length}</b></button>`;
 tabs.querySelectorAll('[data-stock-view]').forEach(button=>button.onclick=()=>{stockMovementView=button.dataset.stockView;renderStock()});
 const rows=stockMovementView==='archive'?archive:recent;
 $('#movementRows').innerHTML=rows.length?rows.map(m=>{const value=signed(m);return `<tr class="${m.virtual?'stock-auto-row':''}"><td>${fmt(m.date)}</td><td>${adminEscape(stockProductName(m.product))}</td><td><span class="stock-operation stock-operation-${adminEscape(m.type)}">${stockOperationLabel(m.type)}</span></td><td class="${value<0?'stock-qty-minus':'stock-qty-plus'}">${value>0?'+':''}${value} ${t('pcs')}</td><td>${stockMovementNote(m)}</td></tr>`}).join(''):`<tr><td colspan="5">Движений пока нет.</td></tr>`;
 $$('[data-stock-note]').forEach(b=>b.onclick=()=>stockOpenNote(b.dataset.stockNote,b.dataset.stockOrder));
 $$('[data-stock-bake]').forEach(b=>b.onclick=()=>stockOpenBake(b.dataset.stockBake));
}
function fillMovementProducts(){
 const select=$('#movementProduct');if(!select)return;
 const current=select.value;
 select.innerHTML=stockProductIds().map(pid=>{
  const raw=stockRawBalance(pid),stockText=raw<0?`расчёт ${raw} шт.`:`${Math.max(0,raw)} шт.`;
  return `<option value="${adminEscape(pid)}">${adminEscape(stockProductName(pid))} — ${adminEscape(stockText)}</option>`;
 }).join('');
 if(current&&[...select.options].some(o=>o.value===current))select.value=current;
}
function updateStockAdjustCurrent(){
 const form=$('#movementForm'),root=$('#stockAdjustCurrent');if(!form||!root)return;
 const product=form.product.value,raw=stockRawBalance(product),onHand=Math.max(0,raw),reserved=stockReserved(product),free=Math.max(0,onHand-reserved);
 if(raw<0){
  root.classList.add('is-warning');
  root.innerHTML=`<span><small>Расчётный остаток</small><strong>${raw} шт.</strong></span><em>Требуется инвентаризация</em>`;
  return;
 }
 root.classList.remove('is-warning');
 root.innerHTML=`<span><small>На складе</small><strong>${onHand} шт.</strong></span><span><small>Зарезервировано</small><strong>${reserved} шт.</strong></span><span><small>Свободно</small><strong>${free} шт.</strong></span>`;
}
function updateStockAdjustPreview(){
 const form=$('#movementForm'),product=form.product.value,type=form.type.value,qty=Math.max(0,Number(form.quantity.value||0)),raw=stockRawBalance(product);
 const label=$('#movementQuantityLabel'),preview=$('#stockAdjustPreview');
 updateStockAdjustCurrent();
 label.textContent=type==='inventory_set'?'Фактический остаток, шт.':'Количество, шт.';
 if(type==='inventory_set'){
  if(form.quantity.value===''){preview.innerHTML='Введите фактический остаток — Panora сразу покажет изменение.';return}
  const delta=qty-raw;
  preview.innerHTML=`После операции: <strong>${qty} шт.</strong> · изменение ${delta>=0?'+':''}${delta} шт.`;
  return;
 }
 if(form.quantity.value===''){preview.innerHTML=`Текущий расчётный остаток: <strong>${raw} шт.</strong>`;return}
 const direction=['written_off','correction_minus'].includes(type)?-1:1,after=raw+direction*qty,delta=direction*qty;
 preview.innerHTML=`Было: <strong>${raw} шт.</strong> → будет: <strong>${after} шт.</strong> · изменение ${delta>=0?'+':''}${delta} шт.`;
}
$$('.admin-nav button[data-view]').forEach(b=>b.onclick=()=>{$$('.admin-nav button[data-view],.view').forEach(e=>e.classList.remove('active'));b.classList.add('active');const view=$('#view-'+b.dataset.view);if(view)view.classList.add('active')});
$('#adminLanguage').onchange=e=>{lang=e.target.value;localStorage.setItem('panora-admin-lang',lang);applyLanguage()};
$('#prevWeek').onclick=()=>{weekStart.setDate(weekStart.getDate()-7);renderPlan()};$('#nextWeek').onclick=()=>{weekStart.setDate(weekStart.getDate()+7);renderPlan()};$('#today').onclick=()=>{weekStart=startOfWeek(new Date());renderPlan()};
const planDateJump=$('#planDateJump');
if(planDateJump){
  planDateJump.value=iso(new Date());
  $('#goToPlanDate').onclick=()=>{if(!planDateJump.value)return;weekStart=startOfWeek(new Date(`${planDateJump.value}T12:00:00`));renderPlan()};
  const label=$('#planDateJumpLabel');
  if(label)label.textContent=lang==='ru'?'Выбрать дату':lang==='es'?'Elegir fecha':'Choose date';
  $('#goToPlanDate').textContent=lang==='ru'?'Показать неделю':lang==='es'?'Mostrar semana':'Show week';
  $('#prevWeek').textContent=lang==='ru'?'← Предыдущая неделя':lang==='es'?'← Semana anterior':'← Previous week';
  $('#nextWeek').textContent=lang==='ru'?'Следующая неделя →':lang==='es'?'Semana siguiente →':'Next week →';
  $('#today').textContent=lang==='ru'?'Текущая неделя':lang==='es'?'Semana actual':'Current week';
}
function setDefaultPlanDates(form,date){form.deliveryDate.value=date;const cutoff=new Date(`${date}T09:00:00`);cutoff.setHours(cutoff.getHours()-48);form.cutoff.value=new Date(cutoff.getTime()-cutoff.getTimezoneOffset()*60000).toISOString().slice(0,16)}
$('#addPlan').onclick=()=>{const f=$('#planForm'),b=new Date();b.setDate(b.getDate()+3);f.reset();$('#planError').textContent='';f.bakeDate.value=iso(b);setDefaultPlanDates(f,iso(b));f.open.checked=true;f.bakeDate.onchange=()=>setDefaultPlanDates(f,f.bakeDate.value);$('#planDialog').showModal()};
$('#closePlan').onclick=$('#cancelPlan').onclick=()=>$('#planDialog').close();
$('#planDialog').onclick=e=>{if(e.target===$('#planDialog'))$('#planDialog').close()};
$('#planForm').onsubmit=e=>{e.preventDefault();const form=$('#planForm'),f=new FormData(form),amounts={plain:Number(f.get('plainPlanned')||0),pumpkin:Number(f.get('pumpkinPlanned')||0)},error=$('#planError');error.textContent='';if(!form.reportValidity())return;if(!amounts.plain&&!amounts.pumpkin){error.textContent='Укажите количество обычного или тыквенного хлеба.';form.plainPlanned.focus();return}Object.entries(amounts).forEach(([product,planned])=>{if(!planned)return;const existing=plans.find(p=>p.bakeDate===f.get('bakeDate')&&p.product===product);if(existing)Object.assign(existing,{deliveryDate:f.get('deliveryDate'),planned,cutoff:f.get('cutoff'),open:f.get('open')==='on'});else plans.push({id:crypto.randomUUID(),bakeDate:f.get('bakeDate'),deliveryDate:f.get('deliveryDate'),product,planned,ordered:0,cutoff:f.get('cutoff'),open:f.get('open')==='on'})});store('panora-production-plans',plans);$('#planDialog').close();renderAll()};
function cancelBakeStats(date){const dayPlans=plans.filter(p=>p.bakeDate===date),orders=read('panora-orders',[]),affected=orders.filter(o=>o.date===date&&!['cancelled','shipped'].includes(o.status));return{dayPlans,orders,affected,pieces:affected.reduce((sum,o)=>sum+(o.items||[]).reduce((s,i)=>s+Number(i.quantity||i.quantityPieces||0),0),0)}}
function performCancelBake(date,reason){if(bakeCompletionFor(date)){alert('Выпечка уже завершена. Отмена завершённого дня недоступна; при необходимости измените факт выпечки.');return false}const stats=cancelBakeStats(date),cancelledAt=new Date().toISOString();if(!stats.dayPlans.length){alert('Эта дата уже отменена или отсутствует в плане.');return false}stats.affected.forEach(o=>{o.status='cancelled';o.cancellationReason=reason;o.cancelledAt=cancelledAt});plans=plans.filter(p=>p.bakeDate!==date);const log=read('panora-cancelled-bake-dates',[]);log.push({date,reason,cancelledAt,orders:stats.affected.map(o=>o.id),pieces:stats.pieces});store('panora-production-plans',plans);saveAdminOrdersCache(stats.orders);localStorage.setItem('panora-cancelled-bake-dates',JSON.stringify(log));renderAll();if(typeof renderCommerce==='function')renderCommerce();alert(`Выпечка ${date} отменена. Отменено заказов: ${stats.affected.length}.`);return true}
function renderCancelBakeSummary(){const date=$('#cancelBakeDate').value,{dayPlans,affected,pieces}=cancelBakeStats(date);$('#cancelBakeSummary').innerHTML=`<strong>${date?fmt(date,{weekday:'long',day:'numeric',month:'long',year:'numeric'}):'—'}</strong><span>${dayPlans.length} ${dayPlans.length===1?'вид хлеба':'вида хлеба'} в плане</span><span>${affected.length} заказов · ${pieces} шт. нужно отменить</span>`}
$('#cancelBakeDay').onclick=()=>{const dates=[...new Set(plans.map(p=>p.bakeDate))].sort();if(!dates.length){alert('Нет запланированных дней для отмены.');return}$('#cancelBakeDate').innerHTML=dates.map(date=>`<option value="${date}">${fmt(date,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</option>`).join('');$('#cancelBakeForm').reset();$('#cancelBakeDate').value=dates[0];renderCancelBakeSummary();$('#cancelBakeDialog').showModal()};
$('#cancelBakeDate').onchange=renderCancelBakeSummary;
$('#closeCancelBake').onclick=$('#keepBakeDay').onclick=()=>$('#cancelBakeDialog').close();
$('#cancelBakeDialog').onclick=e=>{if(e.target===$('#cancelBakeDialog'))$('#cancelBakeDialog').close()};
$('#cancelBakeForm').onsubmit=e=>{e.preventDefault();const form=$('#cancelBakeForm');if(!form.reportValidity())return;const f=new FormData(form),date=f.get('bakeDate'),reason=f.get('reason');if(performCancelBake(date,reason))$('#cancelBakeDialog').close()};
$('#addMovement').onclick=()=>{
 fillMovementProducts();
 const form=$('#movementForm');form.reset();form.type.value='inventory_set';updateStockAdjustPreview();$('#movementDialog').showModal()
};
const closeMovementDialog=()=>{
 const dialog=$('#movementDialog'),form=$('#movementForm');
 if(dialog?.open)dialog.close();
 form?.reset();
};
$('#cancelMovementDialog').onclick=closeMovementDialog;
$('#closeMovementDialog').onclick=closeMovementDialog;
$('#movementDialog').onclick=e=>{if(e.target===$('#movementDialog'))closeMovementDialog()};
$('#movementProduct').onchange=updateStockAdjustPreview;
$('#movementType').onchange=updateStockAdjustPreview;
$('#movementForm').quantity.oninput=updateStockAdjustPreview;
$('#movementForm').onsubmit=e=>{
 e.preventDefault();
 const form=$('#movementForm');if(!form.reportValidity())return;
 const f=new FormData(form),product=String(f.get('product')||''),requested=Math.max(0,Number(f.get('quantity')||0)),requestedType=String(f.get('type')||''),note=String(f.get('note')||'').trim();
 let type=requestedType,quantity=requested;
 if(requestedType==='inventory_set'){
  const current=stockRawBalance(product),delta=requested-current;
  if(Math.abs(delta)<0.0001){closeMovementDialog();return}
  type=delta>0?'correction_plus':'correction_minus';quantity=Math.abs(delta);
 }
 if(quantity<=0)return alert('Количество должно быть больше нуля.');
 movements.push({
  id:crypto.randomUUID(),date:iso(new Date()),product,type,quantity,createdAt:new Date().toISOString(),
  note:requestedType==='inventory_set'?`Инвентаризация: установлен остаток ${requested} шт.${note?` · ${note}`:''}`:note
 });
 store('panora-stock-movements',movements);
 window.dispatchEvent(new CustomEvent('panora:stock-movements-changed'));
 closeMovementDialog();renderStock()
};
window.addEventListener('panora:order-cycle-updated',()=>{renderStock();renderBakeCompletionBoard()});
window.addEventListener('panora:products-changed',()=>{renderStock();renderBakeCompletionBoard()});
window.addEventListener('panora:stock-movements-changed',()=>renderStock());
window.addEventListener('panora:bake-completions-cloud-updated',()=>{upgradeBakeCompletionSnapshots();renderPlan();renderStock();window.panoraRawStock?.render?.()});
window.addEventListener('panora:bake-completions-changed',()=>{renderPlan();renderStock();window.panoraRawStock?.render?.()});
migrateLegacyBakeCompletions();
upgradeBakeCompletionSnapshots();
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',bindBakeCompletion,{once:true}):bindBakeCompletion();
bindRetailFoundation();
$('#printPurchase').onclick=()=>window.print();applyLanguage();


/* Panora 6.38 — retail notification center and browser Push subscription. */
let retailNotificationLastSeen=Number(localStorage.getItem('panora-retail-notification-last-seen')||0);
function retailPushB64ToBytes(value){const pad='='.repeat((4-value.length%4)%4),base=(value+pad).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(base);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))}
async function retailLoadNotificationsCloud(){try{return await retailAdminApi('retail_notifications?audience=eq.admin&select=id,order_id,kind,title,body,href,created_at,read_at&order=created_at.desc&limit=100')}catch{return[]}}
function retailNotificationTime(value){try{return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value))}catch{return String(value||'')}}
async function retailRenderNotificationCenter({showBrowser=false}={}){const rows=await retailLoadNotificationsCloud(),badge=$('#retailNotificationBadge'),list=$('#retailNotificationsList'),unread=rows.filter(x=>!x.read_at).length;if(badge){badge.hidden=unread<1;badge.textContent=String(unread)}if(list)list.innerHTML=rows.length?rows.map(n=>`<article class="retail-notification ${n.read_at?'':'is-unread'}"><i></i><div><strong>${adminEscape(n.title||'Panora')}</strong><p>${adminEscape(n.body||'')}</p><small>${adminEscape(retailNotificationTime(n.created_at))}</small></div></article>`).join(''):'<p class="retail-event-loading">Новых уведомлений пока нет.</p>';if(showBrowser&&Notification.permission==='granted'&&navigator.serviceWorker?.controller){const fresh=rows.filter(n=>!n.read_at&&Number(new Date(n.created_at))>retailNotificationLastSeen);for(const n of fresh.slice().reverse())navigator.serviceWorker.controller.postMessage({type:'PANORA_SHOW_NOTIFICATION',payload:{title:n.title||'Panora',body:n.body||'',url:n.href||'admin.html#retail-orders',tag:`retail-${n.id}`}});if(fresh.length){retailNotificationLastSeen=Math.max(...fresh.map(n=>Number(new Date(n.created_at))));localStorage.setItem('panora-retail-notification-last-seen',String(retailNotificationLastSeen))}}return rows}
async function retailMarkAdminNotificationsRead(){try{await retailAdminApi('retail_notifications?audience=eq.admin&read_at=is.null',{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({read_at:new Date().toISOString()})})}catch{}await retailRenderNotificationCenter()}
async function retailEnableAdminPush(){const state=$('#retailAdminPushState'),settings=readRetailSettings();if(!('Notification'in window)||!('serviceWorker'in navigator)||!('PushManager'in window)){if(state)state.textContent='Этот браузер не поддерживает Web Push';return}if(!settings.pushAdminEnabled){if(state)state.textContent='Push для пекарни выключен в настройках';return}if(!settings.pushVapidPublicKey){if(state)state.textContent='Добавьте VAPID public key в настройках';return}try{const permission=await Notification.requestPermission();if(permission!=='granted'){if(state)state.textContent='Разрешение на уведомления не предоставлено';return}const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:retailPushB64ToBytes(settings.pushVapidPublicKey)});const json=sub.toJSON();await retailAdminApi('retail_push_subscriptions?on_conflict=endpoint',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({audience:'admin',endpoint:json.endpoint,p256dh:json.keys?.p256dh||'',auth_key:json.keys?.auth||'',user_agent:navigator.userAgent,active:true,updated_at:new Date().toISOString()})});if(state)state.textContent='Push включён на этом устройстве ✓'}catch(error){if(state)state.textContent=`Push: ${error.message||'ошибка подключения'}`}}

async function retailSendTestPush(){
 const state=$('#retailAdminPushState'),button=$('#retailTestPush');
 if(button)button.disabled=true;
 try{
  const rows=await retailAdminApi('rpc/panora_retail_test_push',{method:'POST',body:JSON.stringify({})});
  if(state)state.textContent='Тестовое уведомление создано · ожидаем Push';
  setTimeout(()=>retailRenderNotificationCenter({showBrowser:false}),800);
 }catch(error){if(state)state.textContent=`Тест Push: ${error.message||'ошибка · выполните SQL 6.38'}`}
 finally{if(button)button.disabled=false}
}
function initRetailNotificationCenter(){const open=$('#retailNotificationCenter'),dialog=$('#retailNotificationsDialog'),close=$('#retailNotificationsClose'),enable=$('#retailEnableAdminPush');if(open)open.addEventListener('click',async()=>{if(dialog&&!dialog.open)dialog.showModal();await retailRenderNotificationCenter();await retailMarkAdminNotificationsRead()});if(close)close.addEventListener('click',()=>dialog?.close());if(enable)enable.addEventListener('click',retailEnableAdminPush);const test=$('#retailTestPush');if(test)test.addEventListener('click',retailSendTestPush);const run=()=>retailRenderNotificationCenter({showBrowser:true});window.addEventListener('panora:authenticated',run);setTimeout(run,1200);setInterval(()=>{if(!document.hidden&&window.panoraSupabaseSession?.access_token)run()},20000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initRetailNotificationCenter);else initRetailNotificationCenter();
