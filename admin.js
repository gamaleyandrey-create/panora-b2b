const PRODUCTS={plain:{ru:'Льняной бездрожжевой хлеб с семенами',en:'Yeast-free flaxseed bread with seeds',es:'Pan de lino sin levadura con semillas'},pumpkin:{ru:'Тыквенный бездрожжевой хлеб с семенами',en:'Yeast-free pumpkin bread with seeds',es:'Pan de calabaza sin levadura con semillas'}};
const TEXT={
ru:{bakery:'Пекарня',plan:'План выпечки',recipes:'Рецептуры',purchase:'Закупка',stock:'Склад хлеба',planTitle:'План выпечки и доставки',planText:'Добавляйте даты и планируйте каждый хлеб в штуках.',addBake:'+ Добавить выпечку',today:'Сегодня',planned:'Запланировано',ordered:'Заказано',reserve:'Свободно',recipeTitle:'Рецептуры хлеба',recipeText:'Для каждого хлеба укажите вес готового остывшего изделия и закладку ингредиентов на 1 штуку.',purchaseTitle:'Список закупки',purchaseText:'Расчёт по плану выпечки с учётом остатков и страхового запаса.',print:'Печать',ingredient:'Ингредиент',required:'Нужно',ingredientStock:'Остаток',margin:'Запас',buy:'Купить',stockTitle:'Склад готового хлеба',stockText:'Выпечка приходуется автоматически в день производства, отгрузка списывается по накладной.',movement:'+ Корректировка',date:'Дата',product:'Хлеб',operation:'Операция',quantity:'Количество',note:'Примечание',newBake:'Новая выпечка',bakeDate:'Дата выпечки',deliveryDate:'Дата доставки',plannedPiecesLabel:'План, шт.',cutoff:'Приём заказов до',accepting:'Принимать заказы',cancel:'Отмена',save:'Сохранить',newMovement:'Корректировка склада',open:'Заказы открыты',closed:'Закрыто',delivery:'Доставка',cutoffShort:'Заказ до',empty:'На этой неделе выпечек нет',pcs:'шт.',orderedShort:'заказано'},
en:{bakery:'Bakery',plan:'Bake plan',recipes:'Recipes',purchase:'Purchasing',stock:'Bread stock',planTitle:'Bake and delivery plan',planText:'Add dates and plan each bread in pieces.',addBake:'+ Add bake',today:'Today',planned:'Planned',ordered:'Ordered',reserve:'Available',recipeTitle:'Bread recipes',recipeText:'For each bread, enter the finished cooled product weight and ingredients per piece.',purchaseTitle:'Purchase list',purchaseText:'Calculated from the bake plan, stock and safety margin.',print:'Print',ingredient:'Ingredient',required:'Required',ingredientStock:'Stock',margin:'Margin',buy:'Buy',stockTitle:'Finished bread stock',stockText:'Bakes are added automatically on the production day; shipments are deducted from delivery notes.',movement:'+ Adjustment',date:'Date',product:'Bread',operation:'Operation',quantity:'Quantity',note:'Note',newBake:'New bake',bakeDate:'Bake date',deliveryDate:'Delivery date',plannedPiecesLabel:'Plan, pcs',cutoff:'Order cutoff',accepting:'Accept orders',cancel:'Cancel',save:'Save',newMovement:'Stock adjustment',open:'Orders open',closed:'Closed',delivery:'Delivery',cutoffShort:'Cutoff',empty:'No bakes this week',pcs:'pcs',orderedShort:'ordered'},
es:{bakery:'Panadería',plan:'Plan de horneado',recipes:'Recetas',purchase:'Compras',stock:'Stock de pan',planTitle:'Plan de horneado y entrega',planText:'Añade fechas y planifica cada pan por unidades.',addBake:'+ Añadir horneado',today:'Hoy',planned:'Planificado',ordered:'Pedido',reserve:'Disponible',recipeTitle:'Recetas de pan',recipeText:'Indique para cada pan el peso del producto frío terminado y los ingredientes por unidad.',purchaseTitle:'Lista de compras',purchaseText:'Cálculo según el plan, existencias y margen de seguridad.',print:'Imprimir',ingredient:'Ingrediente',required:'Necesario',ingredientStock:'Existencias',margin:'Margen',buy:'Comprar',stockTitle:'Stock de pan terminado',stockText:'El horneado entra automáticamente el día de producción y los envíos se descuentan por albarán.',movement:'+ Ajuste',date:'Fecha',product:'Pan',operation:'Operación',quantity:'Cantidad',note:'Nota',newBake:'Nuevo horneado',bakeDate:'Fecha de horneado',deliveryDate:'Fecha de entrega',plannedPiecesLabel:'Plan, uds.',cutoff:'Cierre de pedidos',accepting:'Aceptar pedidos',cancel:'Cancelar',save:'Guardar',newMovement:'Ajuste de stock',open:'Pedidos abiertos',closed:'Cerrado',delivery:'Entrega',cutoffShort:'Cierre',empty:'No hay horneados esta semana',pcs:'uds.',orderedShort:'pedido'}
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
function store(key,value){localStorage.setItem(key,JSON.stringify(value));const saveState=$('#saveState');if(saveState){const online=navigator.onLine&&window.panoraCloud?.ready;saveState.textContent=online?(lang==='ru'?'Сохраняем…':lang==='es'?'Guardando…':'Saving…'):(lang==='ru'?'Сохранено на устройстве · отправим при подключении':lang==='es'?'Guardado en el dispositivo · se enviará al conectar':'Saved on device · will send when online');saveState.dataset.syncState=online?'syncing':'local'}if(key==='panora-production-plans')window.panoraCloud?.queuePlans();if(key==='panora-recipes'){localStorage.setItem('panora-recipes-version','cloud-2');window.panoraCloud?.queueRecipes();window.dispatchEvent(new CustomEvent('panora:recipes-changed'))}}
function startOfWeek(date){const d=new Date(date);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d}
function iso(d){const date=new Date(d),year=date.getFullYear(),month=String(date.getMonth()+1).padStart(2,'0'),day=String(date.getDate()).padStart(2,'0');return `${year}-${month}-${day}`}
function fmt(d,opts={day:'numeric',month:'short'}){return new Intl.DateTimeFormat(lang==='ru'?'ru-RU':lang==='es'?'es-ES':'en-GB',opts).format(new Date(d+'T12:00:00'))}
function productName(id){return PRODUCTS[id]?.[lang]||id}

/* Panora 6.19 — retail foundation. One and only location: bakery. */
const RETAIL_SETTINGS_KEY='panora-retail-settings-v619';
const RETAIL_ORDERS_KEY='panora-retail-orders';
const RETAIL_DEFAULT_SETTINGS={
 enabled:false,
 location:'bakery',
 locationName:'Пекарня',
 stockSales:true,
 preorders:true,
 pickup:true,
 delivery:false,
 onlinePayment:true,
 reservationMinutes:15,
 preorderCutoffHours:24,
 pickupSlots:['09:00–11:00','11:00–13:00','13:00–15:00']
};
function readRetailSettings(){
 let saved={};try{saved=JSON.parse(localStorage.getItem(RETAIL_SETTINGS_KEY)||'{}')||{}}catch{}
 return {...RETAIL_DEFAULT_SETTINGS,...saved,enabled:false,location:'bakery',locationName:'Пекарня',pickupSlots:Array.isArray(saved.pickupSlots)?saved.pickupSlots:RETAIL_DEFAULT_SETTINGS.pickupSlots};
}
function readRetailOrders(){try{const list=JSON.parse(localStorage.getItem(RETAIL_ORDERS_KEY)||'[]');return Array.isArray(list)?list:[]}catch{return[]}}
function retailOrderStatus(order){return String(order?.status||'new')}
function retailStatusLabel(status){return({new:'Новый',awaiting_payment:'Ожидает оплаты',confirmed:'Подтверждён',production:'К выпечке',reserved:'Зарезервирован',ready:'Готов',completed:'Выдан',delivered:'Доставлен',cancelled:'Отменён'}[status]||status||'—')}
function retailPaymentLabel(order){const value=String(order?.paymentStatus||'pending');return({pending:'Не оплачено',paid:'Оплачен',refunded:'Возврат',failed:'Ошибка'}[value]||value)}
function retailFulfillmentLabel(order){return String(order?.fulfillment||'pickup')==='delivery'?'Доставка':'Самовывоз'}
function retailSourceLabel(order){return String(order?.source||'stock')==='bake_preorder'?'К выпечке':'Из наличия'}
function retailItemsLabel(order){
 const items=Array.isArray(order?.items)?order.items:[];
 if(!items.length)return '—';
 return items.map(item=>`${productName(String(item?.product||''))} × ${Math.max(0,Number(item?.quantity||0))}`).join(', ');
}
function renderRetailFoundation(){
 const settings=readRetailSettings(),orders=readRetailOrders().filter(order=>order&&retailOrderStatus(order)!=='cancelled');
 const active=orders.filter(order=>!['completed','delivered'].includes(retailOrderStatus(order)));
 const set=(id,value)=>{const el=$(id);if(el)el.textContent=value};
 set('#retailNewCount',active.filter(o=>['new','awaiting_payment','confirmed'].includes(retailOrderStatus(o))).length);
 set('#retailPreorderCount',active.filter(o=>String(o.source)==='bake_preorder').length);
 set('#retailStockCount',active.filter(o=>String(o.source||'stock')==='stock').length);
 set('#retailReadyCount',active.filter(o=>retailOrderStatus(o)==='ready').length);
 set('#retailOrderTotal',`${orders.length} ${orders.length===1?'заказ':'заказов'}`);
 const rows=$('#retailOrderRows');
 if(rows){
  rows.innerHTML=orders.map(order=>`<tr><td><strong>${adminEscape(order.number||order.id||'—')}</strong></td><td>${adminEscape(retailSourceLabel(order))}</td><td>${adminEscape(retailFulfillmentLabel(order))}${order.slot?`<small class="retail-order-sub">${adminEscape(order.slot)}</small>`:''}</td><td>${adminEscape(retailItemsLabel(order))}</td><td>${Number(order.total||0).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2})} €</td><td>${adminEscape(retailPaymentLabel(order))}</td><td><span class="retail-order-status">${adminEscape(retailStatusLabel(retailOrderStatus(order)))}</span></td></tr>`).join('');
 }
 const empty=$('#retailEmptyState');if(empty)empty.hidden=orders.length>0;
 const form=$('#retailSettingsForm');
 if(form&&!form.dataset.loaded){
  form.elements.stockSales.checked=!!settings.stockSales;
  form.elements.preorders.checked=!!settings.preorders;
  form.elements.pickup.checked=!!settings.pickup;
  form.elements.delivery.checked=!!settings.delivery;
  form.elements.onlinePayment.checked=!!settings.onlinePayment;
  form.elements.reservationMinutes.value=String(settings.reservationMinutes||15);
  form.elements.preorderCutoffHours.value=String(settings.preorderCutoffHours||24);
  form.elements.pickupSlots.value=(settings.pickupSlots||[]).join('\n');
  form.dataset.loaded='1';
 }
}
function openRetailView(view){
 const toggle=$('#retailNavToggle'),menu=$('#retailNavItems');
 if(toggle&&menu){toggle.setAttribute('aria-expanded','true');menu.hidden=false}
 const button=$(`.admin-nav [data-view="${view}"]`);if(button)button.click();
}
function bindRetailFoundation(){
 const toggle=$('#retailNavToggle'),menu=$('#retailNavItems');
 if(toggle&&menu)toggle.onclick=()=>{const open=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!open));menu.hidden=open};
 $$('#retailNavItems [data-view]').forEach(button=>button.addEventListener('click',()=>{if(toggle&&menu){toggle.setAttribute('aria-expanded','true');menu.hidden=false}}));
 const openSettings=$('#retailOpenSettings');if(openSettings)openSettings.onclick=()=>openRetailView('retail-settings');
 const form=$('#retailSettingsForm');
 if(form)form.onsubmit=event=>{
  event.preventDefault();
  const slots=String(form.elements.pickupSlots.value||'').split(/\n+/).map(v=>v.trim()).filter(Boolean).slice(0,12);
  const value={
   ...readRetailSettings(),enabled:false,location:'bakery',locationName:'Пекарня',
   stockSales:!!form.elements.stockSales.checked,preorders:!!form.elements.preorders.checked,
   pickup:!!form.elements.pickup.checked,delivery:!!form.elements.delivery.checked,
   onlinePayment:!!form.elements.onlinePayment.checked,
   reservationMinutes:Math.min(60,Math.max(5,Number(form.elements.reservationMinutes.value||15))),
   preorderCutoffHours:Math.min(168,Math.max(1,Number(form.elements.preorderCutoffHours.value||24))),
   pickupSlots:slots.length?slots:RETAIL_DEFAULT_SETTINGS.pickupSlots
  };
  localStorage.setItem(RETAIL_SETTINGS_KEY,JSON.stringify(value));
  const saved=$('#retailSettingsSaved');if(saved)saved.textContent='Подготовка сохранена на этом устройстве';
  renderRetailFoundation();
 };
 renderRetailFoundation();
 window.panoraRetailFoundation={settings:readRetailSettings,orders:readRetailOrders,render:renderRetailFoundation,location:'bakery'};
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
 const orderMap=new Map(),planMap=new Map();
 bakeOrdersForDate(date).forEach(order=>(order.items||[]).forEach(item=>{const product=String(item?.product||''),qty=Math.max(0,Number(item?.quantity||item?.quantityPieces||0));if(product&&qty)orderMap.set(product,(orderMap.get(product)||0)+qty)}));
 plans.filter(plan=>String(plan?.bakeDate||'')===String(date)).forEach(plan=>{const product=String(plan?.product||'');if(!product)return;const current=planMap.get(product)||{planned:0,planOrdered:0};current.planned+=Math.max(0,Number(plan?.planned||0));current.planOrdered+=Math.max(0,Number(plan?.ordered||0));planMap.set(product,current)});
 const existingMap=new Map((existing?.items||[]).map(item=>[String(item.product),item])),ids=new Set([...orderMap.keys(),...planMap.keys(),...existingMap.keys()]);
 return [...ids].map(product=>{const orderQty=Math.max(0,Number(orderMap.get(product)||0)),plan=planMap.get(product)||{planned:0,planOrdered:0},prior=existingMap.get(product),suggested=Math.max(0,orderQty||Number(plan.planOrdered||0)||Number(plan.planned||0)),produced=prior?Math.max(0,Number(prior.produced||0)):suggested,waste=prior?Math.max(0,Math.min(produced,Number(prior.waste||0))):0;return{product,ordered:orderQty,planned:Math.max(0,Number(plan.planned||0)),produced,waste,good:Math.max(0,produced-waste),rawQuantity:prior?.rawQuantity===undefined?undefined:Math.max(0,Number(prior.rawQuantity||0)),recipeSnapshot:Array.isArray(prior?.recipeSnapshot)&&prior.recipeSnapshot.length?prior.recipeSnapshot:bakeRecipeSnapshot(product)}}).sort((a,b)=>stockProductName(a.product).localeCompare(stockProductName(b.product),'ru'));
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
function bakeWeekDates(){const end=new Date(weekStart);end.setDate(end.getDate()+6);const from=iso(weekStart),to=iso(end),dates=new Set();plans.filter(plan=>String(plan?.bakeDate||'')>=from&&String(plan?.bakeDate||'')<=to).forEach(plan=>dates.add(String(plan.bakeDate)));stockRead('panora-orders',[]).filter(order=>order&&order.status!=='cancelled'&&String(order.date||'')>=from&&String(order.date||'')<=to).forEach(order=>dates.add(String(order.date).slice(0,10)));readBakeCompletions().filter(item=>!item.deletedAt&&String(item.date||'')>=from&&String(item.date||'')<=to).forEach(item=>dates.add(String(item.date)));return[...dates].sort()}
function renderBakeCompletionBoard(){
 const root=$('#bakeCompletionBoard');if(!root)return;const today=stockLocalDate(),dates=bakeWeekDates();
 root.innerHTML=dates.length?`<div class="bake-completion-board-head"><div><h3>Факт выпечки</h3><p>После завершения сюда записывается реальный выпуск. Он списывает сырьё и приходует готовый хлеб.</p></div></div><div class="bake-completion-day-list">${dates.map(date=>{const completion=bakeCompletionFor(date),rows=bakeSnapshot(date,completion),ordered=rows.reduce((sum,row)=>sum+Number(row.ordered||0),0),planned=rows.reduce((sum,row)=>sum+Number(row.planned||0),0),future=date>today;if(completion){const good=(completion.items||[]).reduce((sum,item)=>sum+Math.max(0,Number(item.good??(Number(item.produced||0)-Number(item.waste||0)))),0),waste=(completion.items||[]).reduce((sum,item)=>sum+Math.max(0,Number(item.waste||0)),0),legacy=completion.source==='legacy_inferred';return `<article class="bake-completion-day completed ${legacy?'legacy':''}"><div><strong>${fmt(date,{weekday:'long',day:'numeric',month:'long'})}</strong><span>${legacy?'Перенесено из старого учёта':'Выпечка завершена'}</span></div><div class="bake-completion-day-metrics"><span>Заказано <b>${ordered}</b></span><span>На склад <b>${good}</b></span><span>Брак <b>${waste}</b></span></div><button type="button" class="secondary" data-bake-complete="${date}">${legacy?'Уточнить факт':'Изменить факт'}</button></article>`}return `<article class="bake-completion-day ${future?'future':''}"><div><strong>${fmt(date,{weekday:'long',day:'numeric',month:'long'})}</strong><span>${future?'Ещё не наступила':'Ожидает завершения'}</span></div><div class="bake-completion-day-metrics"><span>Заказано <b>${ordered}</b></span><span>План <b>${planned}</b></span></div><button type="button" class="primary" data-bake-complete="${date}" ${future?'disabled':''}>${future?'Завершить после выпечки':'Выпечка завершена'}</button></article>`}).join('')}</div>`:'';
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
 const visible=plans.filter(p=>p.bakeDate>=iso(weekStart)&&p.bakeDate<=iso(end)).sort((a,b)=>a.bakeDate.localeCompare(b.bakeDate)),planned=visible.reduce((sum,p)=>sum+Number(p.planned||0),0),ordered=visible.reduce((sum,p)=>sum+Number(p.ordered||0),0);$('#plannedPieces').textContent=`${planned} ${t('pcs')}`;$('#orderedPieces').textContent=`${ordered} ${t('pcs')}`;$('#freePieces').textContent=`${Math.max(0,planned-ordered)} ${t('pcs')}`;
 $('#planList').innerHTML=visible.length?visible.map(p=>{const percent=p.planned?Math.min(100,Math.round((p.ordered||0)/p.planned*100)):0,completion=bakeCompletionFor(p.bakeDate);return `<article class="plan-card ${completion?'bake-is-completed':''}"><div class="date"><strong>${fmt(p.bakeDate,{weekday:'short',day:'numeric',month:'short'})}</strong><small>${t('delivery')}: ${fmt(p.deliveryDate)}</small></div><div class="product"><strong>${productName(p.product)}</strong><small>${t('cutoffShort')}: ${new Date(p.cutoff).toLocaleString()}</small></div><div><strong>${p.planned} ${t('pcs')}</strong><small>${p.ordered||0} ${t('orderedShort')}</small><div class="progress"><i style="width:${percent}%"></i></div></div><div><input class="ordered-input" data-order="${p.id}" type="number" min="0" value="${p.ordered||0}" aria-label="${t('ordered')}" ${completion?'disabled title="Выпечка уже завершена"':''}></div><span class="status ${completion?'completed':p.open?'':'closed'}">${completion?'Завершена':p.open?t('open'):t('closed')}</span><button class="icon-delete" data-cancel-plan-date="${p.bakeDate}" title="Отменить весь день выпечки" aria-label="Отменить весь день выпечки" ${completion?'disabled':''}>×</button></article>`}).join(''):`<article class="plan-card"><div>${t('empty')}</div></article>`;
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
 return ['shipped','written_off','correction_minus'].includes(type)?-qty:qty;
}
function stockOperationLabel(type){
 return ({
  baked:'Выпечка',
  produced:'Ручной приход',
  shipped:'Отгрузка',
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
function stockEffectiveMovements(){
 const notes=stockCanonicalNotes(),noteOrders=new Set(notes.map(n=>String(n.orderId||'')).filter(Boolean));
 const manual=movements.filter(m=>!(m.type==='shipped'&&m.orderId&&noteOrders.has(String(m.orderId))));
 return [...manual,...stockAutoBakeMovements(),...stockShipmentMovements()];
}
function stockRawBalance(product){
 return stockEffectiveMovements().filter(m=>String(m.product)===String(product)).reduce((sum,m)=>sum+signed(m),0);
}
function stockReserved(product){
 const today=stockLocalDate(),shippedOrders=new Set(stockCanonicalNotes().map(note=>String(note.orderId||'')).filter(Boolean));
 return stockOrders()
  .filter(o=>o&&!['shipped','cancelled'].includes(o.status)&&!shippedOrders.has(String(o.id||''))&&String(o.date||'')&&String(o.date)<=today)
  .flatMap(o=>o.items||[])
  .filter(item=>String(item.product)===String(product))
  .reduce((sum,item)=>sum+Math.max(0,Number(item.quantity||item.quantityPieces||0)),0);
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
 cards.filter(x=>x.shortage>0).forEach(x=>warnings.push(`<p><strong>${adminEscape(stockProductName(x.pid))}</strong>: на текущую выпечку не хватает ${x.shortage} шт.</p>`));
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
function performCancelBake(date,reason){if(bakeCompletionFor(date)){alert('Выпечка уже завершена. Отмена завершённого дня недоступна; при необходимости измените факт выпечки.');return false}const stats=cancelBakeStats(date),cancelledAt=new Date().toISOString();if(!stats.dayPlans.length){alert('Эта дата уже отменена или отсутствует в плане.');return false}stats.affected.forEach(o=>{o.status='cancelled';o.cancellationReason=reason;o.cancelledAt=cancelledAt});plans=plans.filter(p=>p.bakeDate!==date);const log=read('panora-cancelled-bake-dates',[]);log.push({date,reason,cancelledAt,orders:stats.affected.map(o=>o.id),pieces:stats.pieces});store('panora-production-plans',plans);localStorage.setItem('panora-orders',JSON.stringify(stats.orders));localStorage.setItem('panora-cancelled-bake-dates',JSON.stringify(log));renderAll();if(typeof renderCommerce==='function')renderCommerce();alert(`Выпечка ${date} отменена. Отменено заказов: ${stats.affected.length}.`);return true}
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
