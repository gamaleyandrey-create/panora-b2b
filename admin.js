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
function applyLanguage(){$('#adminLanguage').value=lang;$$('[data-t]').forEach(e=>e.textContent=t(e.dataset.t));renderAll()}
function renderAll(){renderPlan();renderRecipes();renderPurchase();renderStock()}
function renderPlan(){const end=new Date(weekStart);end.setDate(end.getDate()+6);$('#periodLabel').textContent=`${fmt(iso(weekStart))} — ${fmt(iso(end),{day:'numeric',month:'short',year:'numeric'})}`;const visible=plans.filter(p=>p.bakeDate>=iso(weekStart)&&p.bakeDate<=iso(end)).sort((a,b)=>a.bakeDate.localeCompare(b.bakeDate));const planned=visible.reduce((s,p)=>s+Number(p.planned),0),ordered=visible.reduce((s,p)=>s+Number(p.ordered||0),0);$('#plannedPieces').textContent=`${planned} ${t('pcs')}`;$('#orderedPieces').textContent=`${ordered} ${t('pcs')}`;$('#freePieces').textContent=`${Math.max(0,planned-ordered)} ${t('pcs')}`;$('#planList').innerHTML=visible.length?visible.map(p=>{const percent=p.planned?Math.min(100,Math.round((p.ordered||0)/p.planned*100)):0;return `<article class="plan-card"><div class="date"><strong>${fmt(p.bakeDate,{weekday:'short',day:'numeric',month:'short'})}</strong><small>${t('delivery')}: ${fmt(p.deliveryDate)}</small></div><div class="product"><strong>${productName(p.product)}</strong><small>${t('cutoffShort')}: ${new Date(p.cutoff).toLocaleString()}</small></div><div><strong>${p.planned} ${t('pcs')}</strong><small>${p.ordered||0} ${t('orderedShort')}</small><div class="progress"><i style="width:${percent}%"></i></div></div><div><input class="ordered-input" data-order="${p.id}" type="number" min="0" value="${p.ordered||0}" aria-label="${t('ordered')}"></div><span class="status ${p.open?'':'closed'}">${p.open?t('open'):t('closed')}</span><button class="icon-delete" data-cancel-plan-date="${p.bakeDate}" title="Отменить весь день выпечки" aria-label="Отменить весь день выпечки">×</button></article>`}).join(''):`<article class="plan-card"><div>${t('empty')}</div></article>`;$$('[data-cancel-plan-date]').forEach(b=>b.onclick=()=>{const date=b.dataset.cancelPlanDate,reason=prompt(`Укажите причину отмены выпечки ${date}:`);if(reason===null)return;if(!reason.trim()){alert('Причина отмены обязательна.');return}if(confirm(`Отменить весь день выпечки ${date}, включая все виды хлеба и неотгруженные заказы?`))performCancelBake(date,reason.trim())});$$('[data-order]').forEach(i=>i.onchange=()=>{const p=plans.find(x=>x.id===i.dataset.order);p.ordered=Math.max(0,Number(i.value));store('panora-production-plans',plans);renderAll()})}
function recipeProduct(pid){try{return (typeof productRegistry!=='undefined'&&productRegistry.find(p=>p.id===pid))||JSON.parse(localStorage.getItem('panora-products')||'[]').find(p=>p.id===pid)}catch{return null}}
function recipeWeightLabel(){return lang==='ru'?'Вес готового изделия':lang==='es'?'Peso del producto terminado':'Finished product weight'}
function renderRecipes(){$('#recipeList').innerHTML=Object.keys(PRODUCTS).map(pid=>{const product=recipeProduct(pid);return `<article class="recipe-card"><h3>${adminEscape(productName(pid))}</h3><label class="recipe-product-weight"><span>${recipeWeightLabel()}</span><span><input data-recipe-weight="${pid}" type="number" min="1" step="1" value="${Number(product?.weight||750)}"> g</span></label><div>${(recipes[pid]||[]).map((r,i)=>`<div class="recipe-row"><input data-recipe-name="${pid}:${i}" value="${adminEscape(r.name)}"><input data-recipe-qty="${pid}:${i}" type="number" min="0" step="0.01" value="${r.qty}"><select data-recipe-unit="${pid}:${i}"><option ${r.unit==='g'?'selected':''}>g</option><option ${r.unit==='ml'?'selected':''}>ml</option><option ${r.unit==='pcs'?'selected':''}>pcs</option></select><button class="recipe-delete" data-delete-ingredient="${pid}:${i}" type="button">×</button></div>`).join('')}</div><button class="secondary" data-add-ingredient="${pid}">+ ${t('ingredient')}</button></article>`}).join('');$$('[data-recipe-weight]').forEach(e=>e.onchange=()=>{const product=recipeProduct(e.dataset.recipeWeight);if(!product)return;e.value=String(Math.max(1,Math.round(Number(e.value)||1)));product.weight=Number(e.value);if(typeof saveProducts==='function')saveProducts();else{const all=JSON.parse(localStorage.getItem('panora-products')||'[]'),saved=all.find(p=>p.id===product.id);if(saved){saved.weight=product.weight;localStorage.setItem('panora-products',JSON.stringify(all));window.panoraCloud?.queueProducts()}}});$$('[data-recipe-name],[data-recipe-qty],[data-recipe-unit]').forEach(e=>e.onchange=()=>{const [pid,i]=(e.dataset.recipeName||e.dataset.recipeQty||e.dataset.recipeUnit).split(':');if(e.dataset.recipeName)recipes[pid][i].name=e.value;if(e.dataset.recipeQty)recipes[pid][i].qty=Number(e.value);if(e.dataset.recipeUnit)recipes[pid][i].unit=e.value;store('panora-recipes',recipes);renderPurchase()});$$('[data-add-ingredient]').forEach(b=>b.onclick=()=>{recipes[b.dataset.addIngredient].push({name:t('ingredient'),qty:0,unit:'g',stock:0,margin:5});store('panora-recipes',recipes);renderAll()});$$('[data-delete-ingredient]').forEach(b=>b.onclick=()=>{const [pid,index]=b.dataset.deleteIngredient.split(':'),item=recipes[pid][Number(index)],question=lang==='ru'?`Удалить ингредиент «${item.name||'без названия'}»?`:lang==='es'?`¿Eliminar «${item.name||'sin nombre'}»?`:`Delete “${item.name||'unnamed'}”?`;if(!confirm(question))return;recipes[pid].splice(Number(index),1);store('panora-recipes',recipes);renderAll()})}
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
 const today=stockLocalDate(),grouped=new Map();
 stockOrders().filter(o=>o&&o.status!=='cancelled'&&String(o.date||'')&&String(o.date)<=today).forEach(order=>{
  (order.items||[]).forEach(item=>{
   const qty=Math.max(0,Number(item.quantity||item.quantityPieces||0)),product=String(item.product||'');
   if(!product||!qty)return;
   const key=`${order.date}|${product}`;
   grouped.set(key,(grouped.get(key)||0)+qty);
  });
 });
 return [...grouped.entries()].flatMap(([key,ordered])=>{
  const [date,product]=key.split('|'),manual=stockManualProduced(date,product),auto=Math.max(0,ordered-manual);
  if(auto<=0)return[];
  return [{id:`auto-bake:${date}:${product}`,date,product,type:'baked',quantity:auto,note:'Автоприход по заказам на дату выпечки',bakeDate:date,virtual:true}];
 });
}
function stockShipmentMovements(){
 return stockNotes().flatMap(note=>(note.items||[]).map((item,index)=>({
  id:`auto-ship:${note.id}:${item.product}:${index}`,
  date:String(note.date||''),
  product:String(item.product||''),
  type:'shipped',
  quantity:Math.max(0,Number(item.quantity||0)),
  note:`Накладная DN-${String(note.number||'').padStart(4,'0')}`,
  noteId:String(note.id||''),
  orderId:String(note.orderId||''),
  virtual:true
 }))).filter(m=>m.product&&m.quantity>0);
}
function stockEffectiveMovements(){
 const notes=stockNotes(),noteOrders=new Set(notes.map(n=>String(n.orderId||'')).filter(Boolean));
 const manual=movements.filter(m=>!(m.type==='shipped'&&m.orderId&&noteOrders.has(String(m.orderId))));
 return [...manual,...stockAutoBakeMovements(),...stockShipmentMovements()];
}
function stockRawBalance(product){
 return stockEffectiveMovements().filter(m=>String(m.product)===String(product)).reduce((sum,m)=>sum+signed(m),0);
}
function stockReserved(product){
 const today=stockLocalDate();
 return stockOrders()
  .filter(o=>o&&!['shipped','cancelled'].includes(o.status)&&String(o.date||'')&&String(o.date)<=today)
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
 select.innerHTML=stockProductIds().map(pid=>`<option value="${adminEscape(pid)}">${adminEscape(stockProductName(pid))}</option>`).join('');
 if(current&&[...select.options].some(o=>o.value===current))select.value=current;
}
function updateStockAdjustPreview(){
 const form=$('#movementForm'),product=form.product.value,type=form.type.value,qty=Math.max(0,Number(form.quantity.value||0)),current=Math.max(0,stockRawBalance(product));
 const label=$('#movementQuantityLabel'),preview=$('#stockAdjustPreview');
 label.textContent=type==='inventory_set'?'Фактический остаток, шт.':'Количество, шт.';
 if(type==='inventory_set'){
  const delta=qty-current;
  preview.innerHTML=`Сейчас по расчёту: <strong>${current} шт.</strong>${form.quantity.value!==''?` · после инвентаризации: <strong>${qty} шт.</strong> · корректировка ${delta>=0?'+':''}${delta} шт.`:''}`;
 }else preview.innerHTML=`Сейчас по расчёту: <strong>${current} шт.</strong>`;
}
$$('.admin-nav button').forEach(b=>b.onclick=()=>{$$('.admin-nav button,.view').forEach(e=>e.classList.remove('active'));b.classList.add('active');$('#view-'+b.dataset.view).classList.add('active')});
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
function performCancelBake(date,reason){const stats=cancelBakeStats(date),cancelledAt=new Date().toISOString();if(!stats.dayPlans.length){alert('Эта дата уже отменена или отсутствует в плане.');return false}stats.affected.forEach(o=>{o.status='cancelled';o.cancellationReason=reason;o.cancelledAt=cancelledAt});plans=plans.filter(p=>p.bakeDate!==date);const log=read('panora-cancelled-bake-dates',[]);log.push({date,reason,cancelledAt,orders:stats.affected.map(o=>o.id),pieces:stats.pieces});store('panora-production-plans',plans);localStorage.setItem('panora-orders',JSON.stringify(stats.orders));localStorage.setItem('panora-cancelled-bake-dates',JSON.stringify(log));renderAll();if(typeof renderCommerce==='function')renderCommerce();alert(`Выпечка ${date} отменена. Отменено заказов: ${stats.affected.length}.`);return true}
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
$('#movementProduct').onchange=updateStockAdjustPreview;
$('#movementType').onchange=updateStockAdjustPreview;
$('#movementForm').quantity.oninput=updateStockAdjustPreview;
$('#saveMovement').onclick=e=>{
 e.preventDefault();
 const form=$('#movementForm');if(!form.reportValidity())return;
 const f=new FormData(form),product=String(f.get('product')||''),requested=Math.max(0,Number(f.get('quantity')||0)),requestedType=String(f.get('type')||''),note=String(f.get('note')||'').trim();
 let type=requestedType,quantity=requested;
 if(requestedType==='inventory_set'){
  const current=stockRawBalance(product),delta=requested-current;
  if(Math.abs(delta)<0.0001){$('#movementDialog').close();form.reset();return}
  type=delta>0?'correction_plus':'correction_minus';quantity=Math.abs(delta);
 }
 if(quantity<=0)return alert('Количество должно быть больше нуля.');
 movements.push({
  id:crypto.randomUUID(),date:iso(new Date()),product,type,quantity,
  note:requestedType==='inventory_set'?`Инвентаризация: установлен остаток ${requested} шт.${note?` · ${note}`:''}`:note
 });
 store('panora-stock-movements',movements);
 window.dispatchEvent(new CustomEvent('panora:stock-movements-changed'));
 $('#movementDialog').close();form.reset();renderStock()
};
window.addEventListener('panora:order-cycle-updated',()=>renderStock());
window.addEventListener('panora:products-changed',()=>renderStock());
window.addEventListener('panora:stock-movements-changed',()=>renderStock());
$('#printPurchase').onclick=()=>window.print();applyLanguage();
