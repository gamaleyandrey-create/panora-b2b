(function(){
 const costs=()=>{try{return JSON.parse(localStorage.getItem('panora-ingredient-costs'))||{}}catch{return{}}};
 const saveCosts=value=>localStorage.setItem('panora-ingredient-costs',JSON.stringify(value));
 const euroCost=value=>new Intl.NumberFormat(lang==='ru'?'ru-RU':lang==='es'?'es-ES':'en-GB',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0)+' €';
 const factor=unit=>unit==='g'||unit==='ml'?1000:1;
 const filter=$('#costBakeFilter');if(!filter)return;
 const selectionKey='panora-purchase-selected-dates';
 let purchaseView='active';
 const pickedDates={active:new Set(),archive:new Set()};
 const selectionReady={active:false,archive:false};

 const sharedDates=()=>{try{return (window.panoraPurchaseSelection||JSON.parse(localStorage.getItem(selectionKey)||'[]')).filter(Boolean)}catch{return[]}};
 const activeOrders=()=>Array.isArray(window.orders||orders)?(window.orders||orders).filter(order=>order&&order.status!=='cancelled'):[];
 const dateOfOrder=order=>String(order?.date||'').slice(0,10);

 const localToday=()=>{
  const d=new Date(),pad=value=>String(value).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
 };

 const readBakeCompletions=()=>{try{const value=JSON.parse(localStorage.getItem('panora-bake-completions')||'[]');return Array.isArray(value)?value:[]}catch{return[]}};
 const completedBakeDates=()=>new Set(readBakeCompletions().filter(item=>item&&!item.deletedAt).map(item=>String(item.date||'')));

 function allAvailableDates(){
  const fromOrders=activeOrders().map(dateOfOrder).filter(Boolean);
  const fromPlans=(Array.isArray(plans)?plans:[]).map(plan=>plan?.bakeDate).filter(Boolean);
  return [...new Set([...fromOrders,...fromPlans])].sort();
 }

 function availableDates(view=purchaseView){
  const today=localToday(),completed=completedBakeDates();
  return allAvailableDates().filter(date=>view==='archive'?(date<today||completed.has(date)):(date>=today&&!completed.has(date)));
 }

 function renderModeTabs(){
  const root=document.querySelector('#purchaseModeTabs');if(!root)return;
  const activeCount=availableDates('active').length,archiveCount=availableDates('archive').length;
  root.innerHTML=`
    <button type="button" class="${purchaseView==='active'?'active':''}" data-purchase-view="active"><span>Активные</span><b>${activeCount}</b></button>
    <button type="button" class="${purchaseView==='archive'?'active':''}" data-purchase-view="archive"><span>Архив</span><b>${archiveCount}</b></button>`;
  root.querySelectorAll('[data-purchase-view]').forEach(button=>button.onclick=()=>{
    const next=button.dataset.purchaseView;if(next===purchaseView)return;
    purchaseView=next;
    renderPurchase();
  });
 }

 function initialiseDateSelection(){
  const dates=availableDates();
  if(selectionReady[purchaseView]){
   const valid=new Set(dates);
   pickedDates[purchaseView]=new Set([...pickedDates[purchaseView]].filter(date=>valid.has(date)));
   return dates;
  }

  if(purchaseView==='active'){
   const shared=sharedDates().filter(date=>dates.includes(date));
   pickedDates.active=new Set(shared.length?shared:dates);
  }else{
   pickedDates.archive=new Set(dates.length?[dates[dates.length-1]]:[]);
  }
  selectionReady[purchaseView]=true;
  return dates;
 }

 function persistActiveSelection(){
  if(purchaseView!=='active')return;
  const dates=[...pickedDates.active].sort();
  window.panoraPurchaseSelection=dates;
  localStorage.setItem(selectionKey,JSON.stringify(dates));
 }

 function fillFilter(){
  const dates=initialiseDateSelection();
  const chosen=pickedDates[purchaseView];
  const allSelected=Boolean(dates.length)&&dates.every(date=>chosen.has(date));

  filter.innerHTML=dates.length?`
   <div class="purchase-date-selector-head">
    <strong>Выбрано ${chosen.size} из ${dates.length}</strong>
    <label class="purchase-date-all">
     <input type="checkbox" data-purchase-all ${allSelected?'checked':''}>
     <span>Все даты</span>
    </label>
   </div>
   <div class="purchase-date-options">
    ${dates.map(date=>`
     <label class="purchase-date-option ${chosen.has(date)?'selected':''}">
      <input type="checkbox" data-purchase-date="${date}" ${chosen.has(date)?'checked':''}>
      <span><b>${fmt(date,{day:'numeric',month:'short'})}</b><small>${fmt(date,{weekday:'short'})}</small></span>
     </label>`).join('')}
   </div>`:`<div class="purchase-date-empty">${purchaseView==='archive'?'Архивных дат пока нет.':'Активных дат выпечки пока нет.'}</div>`;

  filter.querySelector('[data-purchase-all]')?.addEventListener('change',event=>{
   pickedDates[purchaseView]=event.currentTarget.checked?new Set(dates):new Set();
   persistActiveSelection();
   renderPurchase();
  });

  filter.querySelectorAll('[data-purchase-date]').forEach(input=>input.addEventListener('change',()=>{
   const date=input.dataset.purchaseDate;
   if(input.checked)pickedDates[purchaseView].add(date);
   else pickedDates[purchaseView].delete(date);
   persistActiveSelection();
   renderPurchase();
  }));
 }

 function selectedDates(){
  initialiseDateSelection();
  return new Set(pickedDates[purchaseView]);
 }

 function currentRecipes(){
  try{
   const latest=JSON.parse(localStorage.getItem('panora-recipes')||'null');
   return latest&&typeof latest==='object'?latest:recipes;
  }catch{return recipes}
 }

 const normalizeUnit=unit=>String(unit||'').trim().toLowerCase();
 const normalizeName=name=>String(name||'')
   .trim()
   .toLocaleLowerCase('ru-RU')
   .replace(/ё/g,'е')
   .replace(/[‐‑‒–—]/g,'-')
   .replace(/\s+/g,' ');
 const ingredientKey=item=>`${normalizeName(item?.name)}|${normalizeUnit(item?.unit)}`;

 const RAW_STOCK_KEY='panora-raw-stock-movements';
 const RAW_STOCK_MIGRATION='panora-raw-stock-migration-v606';
 const RAW_STOCK_DEVICE_KEY='panora-raw-stock-device-v607';
 let rawHistoryView='active';
 const rawStockDeviceId=(()=>{let id=localStorage.getItem(RAW_STOCK_DEVICE_KEY);if(id)return id;id=crypto.randomUUID();localStorage.setItem(RAW_STOCK_DEVICE_KEY,id);return id})();

 const readRawMovements=()=>{
  try{const value=JSON.parse(localStorage.getItem(RAW_STOCK_KEY)||'[]');return Array.isArray(value)?value:[]}catch{return[]}
 };
 const saveRawMovements=value=>{
  const rows=Array.isArray(value)?value:[],payload=JSON.stringify(rows);
  try{localStorage.setItem(RAW_STOCK_KEY,payload)}
  catch(error){
   console.error('Panora raw stock local save',error);
   throw new Error('Не удалось сохранить движение на устройстве. Освободите место в браузере и повторите.');
  }
  window.dispatchEvent(new CustomEvent('panora:raw-stock-changed'));
  window.dispatchEvent(new CustomEvent('panora:raw-stock-local-change',{detail:{count:rows.length}}));
  return true;
 };
 const rawUnitLabel=unit=>unit==='g'?'г':unit==='ml'?'мл':'шт.';
 const rawSignedType=type=>['correction_minus','written_off','bake_out_auto','semi_source_auto'].includes(type)?-1:1;

 function rawIngredientCatalog(){
  const map=new Map(),latest=currentRecipes();
  const ensure=(name,unit,seed={})=>{
   const normalizedUnit=normalizeUnit(unit)||'g',key=`${normalizeName(name)}|${normalizedUnit}`;
   if(!normalizeName(name))return null;
   if(!map.has(key))map.set(key,{
    key,name:String(name||'').trim(),unit:normalizedUnit,margin:Number(seed.margin??5)||0,
    semi:false,sourceName:'',sourceUnit:'g',yieldPct:0,legacyStock:Math.max(0,Number(seed.stock||0))
   });
   const row=map.get(key);
   row.margin=Math.max(Number(row.margin||0),Number(seed.margin??5)||0);
   row.legacyStock=Math.max(Number(row.legacyStock||0),Math.max(0,Number(seed.stock||0)));
   return row;
  };
  Object.values(latest||{}).flat().forEach(item=>{
   const row=ensure(item?.name,item?.unit,item);
   if(!row)return;
   const source=String(item?.sourceIngredientName||'').trim(),yieldPct=Number(item?.sourceYieldPct||0);
   if(source&&yieldPct>0){
    row.semi=true;row.sourceName=source;row.sourceUnit=normalizeUnit(item?.sourceUnit||item?.unit)||'g';row.yieldPct=yieldPct;
    ensure(source,row.sourceUnit,{margin:item?.margin??5,stock:0});
   }
  });
  return map;
 }

 function migrateRawStock(){
  if(localStorage.getItem(RAW_STOCK_MIGRATION)==='1')return;
  const existing=readRawMovements(),catalog=rawIngredientCatalog();
  if(!existing.length){
   catalog.forEach(row=>{
    if(row.legacyStock<=0)return;
    existing.push({
     id:`opening:${row.key}`,date:'2000-01-01',key:row.key,name:row.name,unit:row.unit,
     type:'opening',quantity:row.legacyStock,note:'Начальный остаток из Закупки',
     createdAt:'2000-01-01T00:00:00.000Z',updatedAt:'2000-01-01T00:00:00.000Z',deviceId:rawStockDeviceId,system:true
    });
   });
  }
  try{
   localStorage.setItem(RAW_STOCK_KEY,JSON.stringify(existing));
   localStorage.setItem(RAW_STOCK_MIGRATION,'1');
  }catch(error){console.warn('Panora raw stock migration',error)}
 }

 function rawDemandByDate(dateSet){
  const rows=[];
  [...dateSet].sort().forEach(date=>{
   const ordersForDate=activeOrders().filter(order=>dateOfOrder(order)===date);
   const products=new Map();
   ordersForDate.forEach(order=>(Array.isArray(order.items)?order.items:[]).forEach(item=>{
    const product=String(item?.product||''),qty=Math.max(0,Number(item?.quantity||0));
    if(product&&qty)products.set(product,(products.get(product)||0)+qty);
   }));
   let source='orders';
   if(!products.size){
    source='plan';
    (Array.isArray(plans)?plans:[]).filter(plan=>String(plan?.bakeDate||'')===date).forEach(plan=>{
     const product=String(plan?.product||''),qty=Math.max(0,Number(plan?.ordered||plan?.planned||0));
     if(product&&qty)products.set(product,(products.get(product)||0)+qty);
    });
   }
   if(products.size)rows.push({date,source,products});
  });
  return rows;
 }

 function demandForDates(dateSet){
  const demand=new Map();
  rawDemandByDate(dateSet).forEach(day=>day.products.forEach((qty,product)=>demand.set(product,(demand.get(product)||0)+qty)));
  return demand;
 }
 function rawManualApply(balance,movement){
  const key=String(movement?.key||'');if(!key)return 0;
  const before=Number(balance.get(key)||0),qty=Math.max(0,Number(movement?.quantity||0));
  let after=before;
  if(movement.type==='inventory_set')after=qty;
  else after=before+rawSignedType(movement.type)*qty;
  balance.set(key,after);
  return after-before;
 }

 function rawAutoConsumptionFor(completion,balance,catalog){
  const date=String(completion?.date||''),latest=currentRecipes(),events=[],productDemand=new Map();
  (completion?.items||[]).forEach(item=>{const product=String(item?.product||''),qty=Math.max(0,Number(item?.rawQuantity ?? item?.produced ?? 0));if(product&&qty)productDemand.set(product,(productDemand.get(product)||0)+qty)});
  const push=(row,type,quantity,note,product='')=>{const qty=Math.max(0,Number(quantity||0));if(!row||qty<=0.0005)return;const before=Number(balance.get(row.key)||0),delta=-qty;balance.set(row.key,before+delta);events.push({id:`auto:${completion?.id||date}:${type}:${row.key}:${product}:${events.length}`,date,key:row.key,name:row.name,unit:row.unit,type,quantity:qty,delta,note,product,virtual:true,system:true,bakeCompletionId:completion?.id||''})};
  [...productDemand.entries()].forEach(([product,pieces])=>{const completionItem=(completion?.items||[]).find(item=>String(item?.product||'')===String(product)),recipe=Array.isArray(completionItem?.recipeSnapshot)&&completionItem.recipeSnapshot.length?completionItem.recipeSnapshot:(Array.isArray(latest?.[product])?latest[product]:[]);recipe.forEach(item=>{const perBread=Math.max(0,Number(item?.qty||0));if(!perBread)return;const row=catalog.get(ingredientKey(item));if(!row)return;const required=perBread*pieces;if(item?.sourceIngredientName&&Number(item?.sourceYieldPct)>0){const available=Math.max(0,Number(balance.get(row.key)||0)),fromStock=Math.min(required,available);if(fromStock>0)push(row,'bake_out_auto',fromStock,`Факт выпечки · ${productName(product)} · ${pieces} шт.`,product);const short=Math.max(0,required-fromStock);if(short>0){const sourceKey=`${normalizeName(item.sourceIngredientName)}|${normalizeUnit(item.sourceUnit||item.unit||'g')}`,source=catalog.get(sourceKey),sourceQty=short/(Number(item.sourceYieldPct)/100);push(source,'semi_source_auto',sourceQty,`Для «${row.name}» · выход ${Number(item.sourceYieldPct)}% · факт ${productName(product)} ${pieces} шт.`,product)}}else push(row,'bake_out_auto',required,`Факт выпечки · ${productName(product)} · ${pieces} шт.`,product)})});
  return events;
 }

 function rawLedger(){
  migrateRawStock();
  const catalog=rawIngredientCatalog(),manual=readRawMovements().filter(item=>!item?.deletedAt),today=localToday(),timeline=[];
  manual.filter(m=>String(m?.date||'')<=today).forEach(m=>{
   const date=String(m.date||today).slice(0,10);
   timeline.push({date,time:String(m.createdAt||m.updatedAt||`${date}T08:00:00`),kind:'manual',value:m});
  });
  readBakeCompletions().filter(item=>item&&!item.deletedAt&&String(item.date||'')<=today).forEach(completion=>{
   const date=String(completion.date||today).slice(0,10);
   timeline.push({date,time:String(completion.createdAt||`${date}T18:00:00`),kind:'bake',value:completion});
  });
  timeline.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)||(a.kind==='manual'?-1:1));
  const balances=new Map(),events=[];
  timeline.forEach(entry=>{
   if(entry.kind==='manual'){
    const movement=entry.value,delta=rawManualApply(balances,movement);
    events.push({...movement,delta,virtual:false});
   }else events.push(...rawAutoConsumptionFor(entry.value,balances,catalog));
  });
  manual.filter(m=>String(m?.date||'')>today).forEach(m=>events.push({...m,delta:0,virtual:false,future:true}));
  return {catalog,balances,events};
 }
 const rawBalance=key=>Number(rawLedger().balances.get(key)||0);

 function setRawInventory(row,quantity,note='Инвентаризация'){
  if(!row)return;
  const movements=readRawMovements();
  const now=new Date().toISOString();
  movements.push({
   id:crypto.randomUUID(),date:localToday(),key:row.key,name:row.name,unit:row.unit,type:'inventory_set',
   quantity:Math.max(0,Number(quantity||0)),note,createdAt:now,updatedAt:now,deviceId:rawStockDeviceId,deletedAt:''
  });
  saveRawMovements(movements);
 }

 function rawForwardNeeds(ledger){
  const dates=new Set(availableDates('active')),days=rawDemandByDate(dates),latest=currentRecipes();
  const needs=new Map(),semiNeeds=new Map(),details=new Map();

  const addDetail=(key,entry)=>{
   if(!details.has(key))details.set(key,[]);
   details.get(key).push(entry);
  };

  days.forEach(day=>day.products.forEach((pieces,product)=>{
   (Array.isArray(latest?.[product])?latest[product]:[]).forEach(item=>{
    const perBread=Math.max(0,Number(item?.qty||0)),qty=perBread*pieces;if(!qty)return;
    const key=ingredientKey(item);
    const base={date:day.date,source:day.source,product,pieces,perBread,qty,kind:'direct'};
    if(item?.sourceIngredientName&&Number(item?.sourceYieldPct)>0){
     semiNeeds.set(key,(semiNeeds.get(key)||0)+qty);
     needs.set(key,(needs.get(key)||0)+qty);
     addDetail(key,{...base,kind:'semi',yieldPct:Number(item.sourceYieldPct),sourceIngredientName:String(item.sourceIngredientName||''),sourceUnit:normalizeUnit(item.sourceUnit||item.unit||'g')});
    }else{
     needs.set(key,(needs.get(key)||0)+qty);
     addDetail(key,base);
    }
   });
  }));

  // Allocate physical semi-finished stock chronologically. Only the uncovered
  // part becomes demand for its source ingredient, so the breakdown exactly
  // matches the number shown in the warehouse.
  semiNeeds.forEach((required,key)=>{
   const row=ledger.catalog.get(key);if(!row)return;
   let available=Math.max(0,Number(ledger.balances.get(key)||0));
   const entries=(details.get(key)||[]).filter(entry=>entry.kind==='semi').slice().sort((a,b)=>a.date.localeCompare(b.date)||String(a.product).localeCompare(String(b.product)));
   entries.forEach(entry=>{
    const fromStock=Math.min(available,entry.qty);available-=fromStock;
    const toMake=Math.max(0,entry.qty-fromStock);
    entry.fromSemiStock=fromStock;entry.toMake=toMake;
    if(toMake<=0||!row.sourceName||row.yieldPct<=0)return;
    const sourceKey=`${normalizeName(row.sourceName)}|${normalizeUnit(row.sourceUnit)}`,sourceQty=toMake/(row.yieldPct/100);
    needs.set(sourceKey,(needs.get(sourceKey)||0)+sourceQty);
    addDetail(sourceKey,{
     date:entry.date,source:entry.source,product:entry.product,pieces:entry.pieces,
     perBread:entry.perBread,qty:sourceQty,kind:'semi_source',
     via:row.name,semiQty:toMake,yieldPct:row.yieldPct
    });
   });
  });

  details.forEach(list=>list.sort((a,b)=>a.date.localeCompare(b.date)||String(productName(a.product)).localeCompare(String(productName(b.product)),'ru')));
  return {needs,semiNeeds,details,days};
 }
 const rawMovementLabel=type=>({
  opening:'Начальный остаток',purchase_in:'Приход закупки',inventory_set:'Инвентаризация',
  correction_plus:'Корректировка +',correction_minus:'Корректировка −',written_off:'Списание / брак',
  bake_out_auto:'Фактическая выпечка',semi_source_auto:'Приготовление полуфабриката'
 })[type]||type;

 function renderRawStock(){
  const root=document.querySelector('#view-rawstock');if(!root)return;
  const ledger=rawLedger(),forward=rawForwardNeeds(ledger),{needs}=forward,priceMap=costs();
  let stockValue=0,shortages=0;
  const rows=[...ledger.catalog.values()].sort((a,b)=>a.semi!==b.semi?(a.semi?1:-1):a.name.localeCompare(b.name,'ru'));
  document.querySelector('#rawStockRows').innerHTML=rows.length?rows.map(row=>{
   const stock=Number(ledger.balances.get(row.key)||0),required=Math.max(0,Number(needs.get(row.key)||0));
   const price=ingredientPrice(priceMap,row.name,row.unit);
   const unitValue=row.semi&&row.sourceName&&row.yieldPct>0?ingredientPrice(priceMap,row.sourceName,row.sourceUnit)/(row.yieldPct/100):price;
   const value=Math.max(0,stock)/factor(row.unit)*unitValue;stockValue+=value;
   const shortage=Math.max(0,required-Math.max(0,stock));if(!row.semi&&shortage>0.0005)shortages++;
   const after=stock-required;
   const status=row.semi
    ? (shortage>0.0005?`<span class="raw-stock-status prepare">Приготовить ${niceQty(shortage,row.unit)}</span>`:`<span class="raw-stock-status ok">Хватает</span>`)
    : (stock<0
      ?`<button type="button" class="raw-stock-status danger action" data-raw-fix="${row.key}" title="Установить фактический остаток">Отрицательный остаток · исправить</button>`
      :shortage>0.0005
        ?`<button type="button" class="raw-stock-status warning action" data-raw-receive="${row.key}" title="Добавить приход этого сырья">Не хватает ${niceQty(shortage,row.unit)} · приход</button>`
        :'<span class="raw-stock-status ok">Хватает</span>');
   const priceText=row.semi?'по сырью':price>0?`${price.toFixed(2)} € / ${row.unit==='g'?'кг':row.unit==='ml'?'л':'шт.'}`:'—';
   const needLabel=row.semi?`${niceQty(required,row.unit)} <small>полуфабрикат</small>`:niceQty(required,row.unit);
   const needText=required>0.0005?`<button type="button" class="raw-stock-need-link" data-raw-need="${row.key}" title="Показать, откуда взялась потребность">${needLabel}<small>Расшифровка</small></button>`:'—';
   const afterText=row.semi?(shortage>0.0005?`приготовить ${niceQty(shortage,row.unit)}`:niceQty(Math.max(0,after),row.unit)):niceQty(after,row.unit);
   return `<tr class="${stock<0?'raw-stock-negative-row':''} ${row.semi?'raw-stock-semi-row':''}">
    <td><strong>${row.name}</strong><small>${row.semi?`Полуфабрикат из «${row.sourceName}» · выход ${row.yieldPct}%`:rawUnitLabel(row.unit)}</small></td>
    <td><strong>${niceQty(stock,row.unit)}</strong></td><td>${needText}</td>
    <td class="${after<0&&!row.semi?'raw-stock-negative':''}">${afterText}</td><td>${priceText}</td>
    <td>${euroCost(value)}</td><td>${status}</td></tr>`;
  }).join(''):'<tr><td colspan="7">В рецептурах пока нет ингредиентов.</td></tr>';

  document.querySelector('#rawStockIngredientCount').textContent=String(rows.length);
  document.querySelector('#rawStockValue').textContent=euroCost(stockValue);
  document.querySelector('#rawStockShortages').textContent=String(shortages);
  const autoEvents=ledger.events.filter(event=>event.virtual);
  document.querySelector('#rawStockAutoCount').textContent=String(autoEvents.length);

  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-30);
  const cutoffDate=`${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,'0')}-${String(cutoff.getDate()).padStart(2,'0')}`;
  const activeEvents=ledger.events.filter(event=>String(event.date||'')>=cutoffDate),archiveEvents=ledger.events.filter(event=>String(event.date||'')<cutoffDate);
  const tabs=document.querySelector('#rawStockHistoryTabs');
  tabs.innerHTML=`<button type="button" class="${rawHistoryView==='active'?'active':''}" data-raw-history="active"><span>Последние 30 дней</span><b>${activeEvents.length}</b></button><button type="button" class="${rawHistoryView==='archive'?'active':''}" data-raw-history="archive"><span>Архив</span><b>${archiveEvents.length}</b></button>`;
  tabs.querySelectorAll('[data-raw-history]').forEach(button=>button.onclick=()=>{rawHistoryView=button.dataset.rawHistory;renderRawStock()});

  const shown=(rawHistoryView==='active'?activeEvents:archiveEvents).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  document.querySelector('#rawStockMovementRows').innerHTML=shown.length?shown.map(event=>{
   const delta=Number(event.delta??(event.type==='inventory_set'?0:rawSignedType(event.type)*Number(event.quantity||0)));
   const quantity=event.type==='inventory_set'?`= ${niceQty(event.quantity,event.unit)}`:`${delta>0?'+':''}${niceQty(delta,event.unit)}`;
   const action=event.virtual||event.system?'':`<button type="button" class="finance-row-action danger" data-raw-delete="${event.id}">Удалить</button>`;
   return `<tr class="${event.virtual?'raw-stock-auto-row':''}"><td>${fmt(event.date,{day:'numeric',month:'short',year:'numeric'})}${event.future?' <small>будущее</small>':''}</td><td><strong>${event.name}</strong></td><td><span class="raw-stock-operation ${event.virtual?'auto':''}">${rawMovementLabel(event.type)}</span></td><td class="${delta<0?'raw-stock-negative':'raw-stock-positive'}"><strong>${quantity}</strong></td><td>${event.note||'—'}</td><td>${action}</td></tr>`;
  }).join(''):'<tr><td colspan="6">Движений в этом разделе пока нет.</td></tr>';

  root.querySelectorAll('[data-raw-delete]').forEach(button=>button.onclick=()=>{
   if(!confirm('Удалить это движение сырья?'))return;
   const now=new Date().toISOString(),id=String(button.dataset.rawDelete);
   const next=readRawMovements().map(item=>String(item.id)===id?{...item,deletedAt:now,updatedAt:now,deviceId:item.deviceId||rawStockDeviceId}:item);
   try{saveRawMovements(next);rawStockFeedback('Движение удалено на устройстве.')}
   catch(error){rawStockFeedback(error.message||String(error),'error')}
   renderRawStock();renderPurchase();
  });
  root.querySelectorAll('[data-raw-fix]').forEach(button=>button.onclick=()=>openRawStockMovement({key:button.dataset.rawFix,type:'inventory_set',reason:'negative'}));
  root.querySelectorAll('[data-raw-receive]').forEach(button=>button.onclick=()=>openRawStockMovement({key:button.dataset.rawReceive,type:'purchase_in',reason:'shortage'}));
  root.querySelectorAll('[data-raw-need]').forEach(button=>button.onclick=()=>openRawNeedBreakdown(button.dataset.rawNeed));
 }

 function rawNeedSourceLabel(source){
  return source==='orders'?'Заказы партнёров':'План выпечки · заказов на эту дату нет';
 }

 function rawNeedEntryQty(entry,row){
  if(entry.kind==='semi_source')return `${niceQty(entry.qty,row.unit)} <small>из-за приготовления ${niceQty(entry.semiQty,normalizeUnit(row.unit))} «${entry.via}»</small>`;
  return niceQty(entry.qty,row.unit);
 }

 function openRawNeedBreakdown(key){
  const dialog=document.querySelector('#rawStockNeedDialog');if(!dialog)return;
  const ledger=rawLedger(),forward=rawForwardNeeds(ledger),row=ledger.catalog.get(String(key));
  if(!row)return rawStockFeedback('Ингредиент не найден.','error');
  const required=Math.max(0,Number(forward.needs.get(row.key)||0)),stock=Number(ledger.balances.get(row.key)||0),shortage=Math.max(0,required-Math.max(0,stock));
  const entries=(forward.details.get(row.key)||[]).slice();
  document.querySelector('#rawStockNeedTitle').textContent=`Откуда нужно: ${row.name}`;
  document.querySelector('#rawStockNeedSubtitle').textContent=`Активные даты выпечки: ${forward.days.length}. Потребность считается отдельно по каждой дате.`;
  document.querySelector('#rawStockNeedSummary').innerHTML=`
   <article><span>Нужно всего</span><strong>${niceQty(required,row.unit)}</strong></article>
   <article><span>Сейчас на складе</span><strong>${niceQty(stock,row.unit)}</strong></article>
   <article class="${shortage>0.0005?'warning':''}"><span>Не хватает</span><strong>${niceQty(shortage,row.unit)}</strong></article>`;
  const planUsed=entries.some(entry=>entry.source==='plan');
  document.querySelector('#rawStockNeedSourceNote').innerHTML=planUsed
   ?'<strong>Важно:</strong> для дат без заказов партнёров Panora использовала количество из Календаря выпечки. Такие строки отмечены «План».'
   :'<strong>Источник:</strong> вся показанная потребность сформирована реальными заказами партнёров на активные даты.';

  const grouped=new Map();
  entries.forEach(entry=>{
   if(!grouped.has(entry.date))grouped.set(entry.date,[]);
   grouped.get(entry.date).push(entry);
  });
  document.querySelector('#rawStockNeedList').innerHTML=entries.length?[...grouped.entries()].map(([date,list])=>{
   const source=list.some(entry=>entry.source==='orders')?'orders':'plan';
   const total=list.reduce((sum,entry)=>sum+Number(entry.qty||0),0);
   return `<section class="raw-stock-need-day">
    <div class="raw-stock-need-day-head">
     <div><strong>${fmt(date,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</strong><span class="raw-need-source ${source}">${rawNeedSourceLabel(source)}</span></div>
     <b>${niceQty(total,row.unit)}</b>
    </div>
    <div class="raw-stock-need-lines">${list.map(entry=>{
     const product=productName(entry.product),via=entry.kind==='semi_source'?`<small>через «${entry.via}», выход ${entry.yieldPct}%</small>`:entry.kind==='semi'?`<small>полуфабрикат · выход ${entry.yieldPct}%</small>`:'';
     return `<div class="raw-stock-need-line">
      <div><strong>${product}</strong><span>${entry.pieces} шт. хлеба</span>${via}</div>
      <b>${rawNeedEntryQty(entry,row)}</b>
     </div>`;
    }).join('')}</div>
   </section>`;
  }).join(''):'<div class="raw-stock-need-empty">Для активных дат потребность по этому ингредиенту не найдена.</div>';

  const receipt=document.querySelector('#rawStockNeedAddReceipt');
  receipt.onclick=()=>{dialog.close();openRawStockMovement({key:row.key,type:'purchase_in',reason:'shortage'})};
  document.querySelector('#rawStockNeedOpenPurchase').onclick=()=>{dialog.close();document.querySelector('.admin-nav button[data-view="purchase"]')?.click()};
  dialog.showModal();
 }

 function rawStockFeedback(text,state='success'){
  let el=document.querySelector('#panoraRawStockFeedback');
  if(!el){
   el=document.createElement('div');el.id='panoraRawStockFeedback';el.className='raw-stock-feedback';el.hidden=true;document.body.append(el);
  }
  el.dataset.state=state;el.textContent=String(text||'');el.hidden=false;
  clearTimeout(rawStockFeedback.timer);rawStockFeedback.timer=setTimeout(()=>{el.hidden=true},2800);
 }

 function openRawStockMovement(options={}){
  const dialog=document.querySelector('#rawStockMovementDialog'),form=document.querySelector('#rawStockMovementForm');
  if(!dialog||!form){rawStockFeedback('Форма движения склада не загрузилась. Обновите Panora.','error');return false}
  const ledger=rawLedger(),rows=[...ledger.catalog.values()].sort((a,b)=>a.name.localeCompare(b.name,'ru'));
  form.reset();form.date.value=localToday();form.date.max=localToday();
  form.ingredient.innerHTML=rows.map(row=>`<option value="${row.key}">${row.name} · ${rawUnitLabel(row.unit)}</option>`).join('');
  if(options.key&&rows.some(row=>row.key===options.key))form.ingredient.value=options.key;
  form.type.value=options.type||'purchase_in';form.quantity.value='';
  if(options.reason==='negative')form.note.value='Исправление отрицательного остатка';
  else if(options.reason==='shortage')form.note.value='Приход для покрытия дефицита';
  updateRawMovementPreview();dialog.showModal();setTimeout(()=>form.quantity?.focus(),30);return true;
 }
 function updateRawMovementPreview(){
  const form=document.querySelector('#rawStockMovementForm'),preview=document.querySelector('#rawStockMovementPreview'),label=document.querySelector('#rawStockQuantityLabel');
  if(!form||!preview)return;
  const ledger=rawLedger(),row=ledger.catalog.get(form.ingredient.value),current=row?Number(ledger.balances.get(row.key)||0):0,qty=Math.max(0,Number(form.quantity.value||0)),type=form.type.value;
  if(label)label.textContent=type==='inventory_set'?'Фактический остаток':'Количество';
  let after=current;if(form.quantity.value!=='')after=type==='inventory_set'?qty:current+rawSignedType(type)*qty;
  const guidance=row&&current<0&&type==='inventory_set'
   ?'<small>Отрицательный расчёт будет заменён указанным фактическим остатком.</small>'
   :row&&current<0&&type==='purchase_in'
    ?'<small>Приход прибавится к отрицательному расчёту. Чтобы начать с реального остатка, выберите «Инвентаризация».</small>'
    :'';
  preview.innerHTML=`Сейчас: <strong>${row?niceQty(current,row.unit):'—'}</strong>${form.quantity.value!==''&&row?` · после операции: <strong>${niceQty(after,row.unit)}</strong>`:''}${guidance}`;
 }

 function bindRawStock(){
  const add=document.querySelector('#rawStockAddMovement'),dialog=document.querySelector('#rawStockMovementDialog'),form=document.querySelector('#rawStockMovementForm');
  if(!add||!dialog||!form)return false;
  if(form.dataset.rawStockBound==='1')return true;
  form.dataset.rawStockBound='1';

  add.addEventListener('click',event=>{event.preventDefault();openRawStockMovement({type:'purchase_in'})});
  document.querySelector('#rawStockOpenPurchase')?.addEventListener('click',()=>document.querySelector('.admin-nav button[data-view="purchase"]')?.click());
  document.querySelector('#rawStockMovementClose')?.addEventListener('click',()=>dialog.close());
  document.querySelector('#rawStockMovementCancel')?.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
  const needDialog=document.querySelector('#rawStockNeedDialog');
  document.querySelector('#rawStockNeedClose')?.addEventListener('click',()=>needDialog?.close());
  needDialog?.addEventListener('click',event=>{if(event.target===needDialog)needDialog.close()});
  form.ingredient.addEventListener('change',updateRawMovementPreview);
  form.type.addEventListener('change',updateRawMovementPreview);
  form.quantity.addEventListener('input',updateRawMovementPreview);

  form.addEventListener('submit',event=>{
   event.preventDefault();if(!form.reportValidity())return;
   const data=Object.fromEntries(new FormData(form)),ledger=rawLedger(),row=ledger.catalog.get(data.ingredient);
   if(!row){rawStockFeedback('Ингредиент не найден в рецептурах.','error');return}
   const movements=readRawMovements(),now=new Date().toISOString();
   movements.push({id:crypto.randomUUID(),date:data.date||localToday(),key:row.key,name:row.name,unit:row.unit,type:data.type,quantity:Math.max(0,Number(data.quantity||0)),note:String(data.note||'').trim(),createdAt:now,updatedAt:now,deviceId:rawStockDeviceId,deletedAt:''});
   try{saveRawMovements(movements)}
   catch(error){rawStockFeedback(error.message||String(error),'error');return}
   dialog.close();renderRawStock();renderPurchase();
   const state=document.querySelector('#rawStockCloudState')?.dataset.state;
   rawStockFeedback(state==='error'?'Сохранено на устройстве. Облако повторит синхронизацию.':'Остаток сохранён.');
  });

  document.querySelector('.admin-nav button[data-view="rawstock"]')?.addEventListener('click',()=>setTimeout(renderRawStock,0));
  const cloud=document.querySelector('#rawStockCloudState');
  cloud?.addEventListener('click',async()=>{
   cloud.disabled=true;
   try{
    if(!window.panoraCloud?.syncRawStock)throw new Error('Облачная синхронизация ещё загружается.');
    const ok=await window.panoraCloud.syncRawStock();
    rawStockFeedback(ok?'Склад сырья синхронизирован.':'Движения сохранены на устройстве.');
   }catch(error){rawStockFeedback('Облако пока недоступно. Локальные изменения сохранены.','error')}
   finally{cloud.disabled=false}
  });
  return true;
 }
 window.panoraRawStock={ledger:rawLedger,balance:rawBalance,render:renderRawStock,openMovement:openRawStockMovement,openNeed:openRawNeedBreakdown,forwardNeeds:rawForwardNeeds,readMovements:readRawMovements,deviceId:rawStockDeviceId,storageKey:RAW_STOCK_KEY};

 function periodDemand(){
  const dates=selectedDates();
  const demand=new Map();
  const ordersForDates=activeOrders().filter(order=>dates.has(dateOfOrder(order)));

  // The consolidated production screen is based on real partner orders.
  // Purchase calculation uses the same source, so its total must match exactly.
  ordersForDates.forEach(order=>{
   (Array.isArray(order.items)?order.items:[]).forEach(item=>{
    const qty=Math.max(0,Number(item?.quantity||0));
    if(!qty)return;
    const product=String(item.product||'');
    if(!product)return;
    demand.set(product,(demand.get(product)||0)+qty);
   });
  });

  // Fallback only when the selected period has no partner orders at all.
  // This keeps manually planned bake days useful without allowing stale plan
  // quantities to inflate a date that already has actual orders.
  if(!demand.size){
   (Array.isArray(plans)?plans:[])
    .filter(plan=>dates.has(String(plan?.bakeDate||'')))
    .forEach(plan=>{
     const product=String(plan?.product||'');
     const qty=Math.max(0,Number(plan?.ordered||plan?.planned||0));
     if(product&&qty)demand.set(product,(demand.get(product)||0)+qty);
    });
  }

  return [...demand.entries()]
   .map(([product,quantity])=>({product,quantity}))
   .sort((a,b)=>String(productName(a.product)).localeCompare(String(productName(b.product)),'ru'));
 }

 function ingredientPrice(priceMap,name,unit){
  const normalized=`${normalizeName(name)}|${normalizeUnit(unit)}`;
  return Number(priceMap[normalized] ?? priceMap[`${name}|${unit}`] ?? 0);
 }

 function buildTotals(){
  const demand=periodDemand(),latest=currentRecipes(),priceMap=costs(),rawBalances=rawLedger().balances;
  const baseRows=new Map();

  const ensureRow=(name,unit,seed={})=>{
    const key=`${normalizeName(name)}|${normalizeUnit(unit)}`;
    if(!baseRows.has(key))baseRows.set(key,{
      key,name:String(name||'').trim(),unit:normalizeUnit(unit)||'g',required:0,stock:Number(rawBalances.get(key)||0),
      margin:Number(seed.margin??5),price:ingredientPrice(priceMap,name,unit),sources:new Map(),semi:false,
      sourceName:'',sourceUnit:'g',yieldPct:0,derivedFrom:[]
    });
    return baseRows.get(key);
  };

  demand.forEach(({product,quantity})=>{
    const recipe=Array.isArray(latest?.[product])?latest[product]:[];
    recipe.forEach(item=>{
      const perBread=Math.max(0,Number(item?.qty||0));
      if(!perBread||!normalizeName(item?.name))return;
      const row=ensureRow(item.name,item.unit,item);
      const contribution=quantity*perBread;
      row.required+=contribution;
      row.margin=Math.max(row.margin,Number(item.margin??5));
      const source=row.sources.get(product)||{product,pieces:quantity,required:0};
      source.required+=contribution;row.sources.set(product,source);
      if(item.sourceIngredientName&&Number(item.sourceYieldPct)>0){
        row.semi=true;row.sourceName=String(item.sourceIngredientName).trim();row.sourceUnit=item.sourceUnit||item.unit||'g';row.yieldPct=Number(item.sourceYieldPct);
      }
    });
  });

  // Convert the amount of semi-finished product that must actually be made into raw-material demand.
  [...baseRows.values()].filter(row=>row.semi&&row.sourceName&&row.yieldPct>0).forEach(row=>{
    const needToMake=Math.max(0,row.required-row.stock);
    const sourceNeed=needToMake/(row.yieldPct/100);
    if(sourceNeed<=0)return;
    const sourceRow=ensureRow(row.sourceName,row.sourceUnit,{stock:0,margin:row.margin});
    sourceRow.required+=sourceNeed;
    sourceRow.margin=Math.max(sourceRow.margin,row.margin);
    sourceRow.derivedFrom.push({name:row.name,required:needToMake,yieldPct:row.yieldPct,sourceRequired:sourceNeed});
  });

  const rows=[...baseRows.values()].sort((a,b)=>{
    if(a.semi!==b.semi)return a.semi?1:-1;
    return a.name.localeCompare(b.name,'ru');
  });

  const breadCosts=demand.map(({product,quantity})=>{
    let unitCost=0,priced=true;
    const details=[];
    (Array.isArray(latest?.[product])?latest[product]:[]).forEach(item=>{
      const qty=Math.max(0,Number(item.qty||0));if(!qty)return;
      if(item.sourceIngredientName&&Number(item.sourceYieldPct)>0){
        const sourceUnit=item.sourceUnit||item.unit||'g',sourcePrice=ingredientPrice(priceMap,item.sourceIngredientName,sourceUnit);
        const rawQty=qty/(Number(item.sourceYieldPct)/100),cost=rawQty/factor(sourceUnit)*sourcePrice;
        if(sourcePrice<=0)priced=false;
        unitCost+=cost;details.push({name:item.name,cost,source:item.sourceIngredientName});
      }else{
        const price=ingredientPrice(priceMap,item.name,item.unit),cost=qty/factor(item.unit)*price;
        if(price<=0)priced=false;
        unitCost+=cost;details.push({name:item.name,cost});
      }
    });
    return {product,quantity,unitCost,totalCost:unitCost*quantity,priced,details};
  });

  return {demand,rows,breadCosts};
 }

 function breadBreakdownHtml(breadCosts){
  const root=document.querySelector('#costBreadBreakdown');if(!root)return;
  if(!breadCosts.length){root.innerHTML='';root.hidden=true;return}
  root.hidden=false;
  root.innerHTML=`<div class="purchase-bread-breakdown-head"><strong>Себестоимость по видам хлеба</strong><span>Сырьё на 1 хлеб и на всю выбранную выпечку</span></div>
   <div class="purchase-bread-cost-list">${breadCosts.map(row=>`<article>
    <div><strong>${productName(row.product)}</strong><span>${row.quantity} шт.</span></div>
    <div><small>1 хлеб</small><strong>${row.priced?euroCost(row.unitCost):'Нужны цены'}</strong></div>
    <div><small>Всего</small><strong>${row.priced?euroCost(row.totalCost):'—'}</strong></div>
   </article>`).join('')}</div>`;
 }

 function ingredientSourcesHtml(row){
  const sources=[...row.sources.values()];
  const sourceRows=sources.map(source=>`<p><span>${productName(source.product)} · ${source.pieces} шт.</span><strong>${niceQty(source.required,row.unit)}</strong></p>`);
  const derived=(row.derivedFrom||[]).map(item=>`<p><span>${item.name} → ${row.name} · выход ${item.yieldPct}%</span><strong>${niceQty(item.sourceRequired,row.unit)}</strong></p>`);
  if(!sourceRows.length&&!derived.length)return '';
  return `<details class="purchase-ingredient-sources"><summary>Из чего рассчитано</summary><div>${sourceRows.join('')}${derived.join('')}<p class="purchase-source-total"><span>Всего нужно</span><strong>${niceQty(row.required,row.unit)}</strong></p></div></details>`;
 }

 renderPurchase=function(){
  if(window.panoraMoneyEditing?.active&&purchaseView==='active'){
   const active=window.panoraMoneyEditing.element;if(active&&active.matches('[data-ingredient-price]'))return;
  }
  renderModeTabs();
  fillFilter();
  const isArchive=purchaseView==='archive';
  document.querySelector('#purchaseArchiveNote').hidden=!isArchive;
  document.querySelector('#costBakeFilterLabel').textContent=isArchive?'Архив закупки за':'Рассчитать закупку для';
  document.querySelector('#costPiecesLabel').textContent=isArchive?'Хлеба было в выпечке':'Хлеба к выпечке';
  document.querySelector('#costConsumptionLabel').textContent=isArchive?'Расчётная стоимость сырья':'Стоимость сырья';
  document.querySelector('#costPurchaseLabel').textContent=isArchive?'Расчётная закупка':'Нужно закупить';
  document.querySelector('#purchaseBuyHeader').textContent=isArchive?'Требовалось':'Купить';
  document.querySelector('#purchaseModeHint').textContent=isArchive
    ? 'Архив предназначен только для просмотра прошлых дат. Расчёт показывается по сохранённым заказам и текущим рецептурам/ценам; данные закупки здесь не редактируются.'
    : 'Отметьте одну или несколько дат выпечки. Все количества и суммы ниже считаются только по выбранным датам. Введите цену за 1 кг, 1 литр или 1 штуку.';
  const {demand,rows,breadCosts}=buildTotals(),priceMap=costs();
  const pieces=demand.reduce((sum,row)=>sum+Number(row.quantity||0),0);
  const consumption=breadCosts.reduce((sum,row)=>sum+row.totalCost,0);
  let purchaseTotal=0;
  breadBreakdownHtml(breadCosts);

  const body=$('#purchaseRows');
  body.innerHTML=rows.length?rows.map((row,index)=>{
   const isSemi=row.semi&&row.sourceName&&row.yieldPct>0;
   const needToMake=isSemi?Math.max(0,row.required-row.stock):0;
   const buy=isSemi?0:Math.max(0,row.required*(1+row.margin/100)-row.stock);
   const usedCost=isSemi
      ? (row.required/factor(row.unit))*(ingredientPrice(priceMap,row.sourceName,row.sourceUnit)/(row.yieldPct/100))
      : row.required/factor(row.unit)*row.price;
   const buyCost=isSemi?0:buy/factor(row.unit)*row.price;
   purchaseTotal+=buyCost;
   return `<tr class="${isSemi?'purchase-semi-row':''} ${isArchive?'purchase-archive-row':''}">
    <td><strong>${row.name}</strong><small>${isSemi?`Полуфабрикат · производится из «${row.sourceName}» · выход ${row.yieldPct}%`:`Цена за ${row.unit==='g'?'1 кг':row.unit==='ml'?'1 л':'1 шт.'}`}</small>${ingredientSourcesHtml(row)}</td>
    <td>${niceQty(row.required,row.unit)}</td>
    <td>${isArchive?`<span class="purchase-readonly-value">${niceQty(row.stock,row.unit)}</span>`:`<input data-cost-stock="${index}" type="number" min="0" step="0.01" value="${row.stock}"> ${row.unit}`}</td>
    <td>${isArchive?`<span class="purchase-readonly-value">${isSemi?'по сырью':`${row.margin}%`}</span>`:isSemi?'<span class="purchase-auto-mark">по сырью</span>':`<input data-cost-margin="${index}" type="number" min="0" step="0.1" value="${row.margin}">%`}</td>
    <td><strong>${isSemi?`${isArchive?'Нужно было приготовить':'Приготовить'} ${niceQty(needToMake,row.unit)}`:niceQty(buy,row.unit)}</strong></td>
    <td>${isSemi?`<span class="purchase-auto-mark">авто</span>`:isArchive?`<span class="purchase-readonly-value">${row.price.toFixed(2)} €</span>`:`<input class="ingredient-price" data-ingredient-price="${row.key}" type="text" inputmode="decimal" autocomplete="off" value="${row.price.toFixed(2)}">`}</td>
    <td><strong>${isSemi?euroCost(usedCost):euroCost(buyCost)}</strong><small>${isSemi?'себестоимость полуфабриката':isArchive?'расчётная сумма':`использовано ${euroCost(usedCost)}`}</small></td>
   </tr>`;
  }).join(''):'<tr><td colspan="7">В выбранном периоде нет хлеба к выпечке.</td></tr>';

  $('#costPeriodPieces').textContent=`${pieces} шт.`;
  $('#costConsumptionTotal').textContent=euroCost(consumption);
  $('#costPurchaseTotal').textContent=euroCost(purchaseTotal);
  $('#costPerBread').textContent=`${euroCost(pieces?consumption/pieces:0)} / шт.`;
  const chosenDates=[...selectedDates()].sort();
  const selectionSummary=document.querySelector('#purchaseSelectionSummary');
  if(selectionSummary){
   selectionSummary.innerHTML=chosenDates.length
    ? `<span>Выбрано <strong>${chosenDates.length}</strong> ${chosenDates.length===1?'дата':'дат'}</span><span>·</span><span><strong>${pieces}</strong> хлебов</span><span>·</span><span>Закупить <strong>${euroCost(purchaseTotal)}</strong></span>`
    : '<span>Выберите хотя бы одну дату выпечки.</span>';
  }

  if(!isArchive)$$('[data-ingredient-price]').forEach(input=>{
   const commit=()=>{
    const value=window.panoraParseDecimal?.(input.value);
    if(value===null){input.value=Number(priceMap[input.dataset.ingredientPrice]||0).toFixed(2);return}
    priceMap[input.dataset.ingredientPrice]=value;input.value=value.toFixed(2);saveCosts(priceMap);
    window.dispatchEvent(new CustomEvent('panora:ingredient-costs-changed'));
    setTimeout(()=>{if(!window.panoraMoneyEditing?.active)renderPurchase()},0);
   };
   input.onblur=commit;input.onchange=null;input.onfocus=()=>requestAnimationFrame(()=>input.select());
  });

  if(!isArchive)$$('[data-cost-stock],[data-cost-margin]').forEach(input=>input.onchange=()=>{
   const row=rows[Number(input.dataset.costStock??input.dataset.costMargin)];if(!row)return;
   if(input.dataset.costStock!==undefined){
    setRawInventory(row,Math.max(0,Number(input.value||0)),'Инвентаризация из раздела «Закупка»');
    renderRawStock();renderPurchase();return;
   }
   const latest=currentRecipes();
   Object.values(latest).flat().forEach(item=>{if(ingredientKey(item)===row.key)item.margin=Math.max(0,Number(input.value||0))});
   if(typeof recipes!=='undefined')recipes=latest;store('panora-recipes',latest);renderPurchase();
  });
 };

 function purchaseListData(){
  const {demand,rows,breadCosts}=buildTotals();
  const items=rows
   .filter(row=>!row.semi)
   .map(row=>{
    const buy=Math.max(0,Number(row.required||0)*(1+Number(row.margin||0)/100)-Number(row.stock||0));
    const price=Number(row.price||0);
    const total=buy/factor(row.unit)*price;
    return {name:row.name,unit:row.unit,buy,price,total};
   })
   .filter(row=>row.buy>0.0005);
  const dates=[...selectedDates()].sort();
  const pieces=demand.reduce((sum,row)=>sum+Number(row.quantity||0),0);
  const consumption=breadCosts.reduce((sum,row)=>sum+Number(row.totalCost||0),0);
  const purchaseTotal=items.reduce((sum,row)=>sum+Number(row.total||0),0);
  return {dates,items,pieces,consumption,purchaseTotal};
 }

 function copyPurchaseList(){
  const {dates,items,purchaseTotal}=purchaseListData();
  if(!dates.length){
   alert('Сначала выберите хотя бы одну дату выпечки.');
   return;
  }
  if(!items.length){
   alert('В выбранной закупке нет ингредиентов к покупке.');
   return;
  }

  const dateText=dates.map(date=>fmt(date,{day:'numeric',month:'short'})).join(', ');
  const text=[
   `Panora · список закупки · ${dateText}`,
   ...items.map(row=>`${row.name} — ${niceQty(row.buy,row.unit)}`),
   '',
   `Итого к закупке: ${euroCost(purchaseTotal)}`
  ].join('\n');

  const button=document.querySelector('#copyPurchaseList');
  const done=()=>{
   if(!button)return;
   const old=button.textContent;
   button.textContent='Скопировано ✓';
   setTimeout(()=>button.textContent=old,1400);
  };
  const fallback=()=>{
   const area=document.createElement('textarea');
   area.value=text;
   area.style.position='fixed';
   area.style.opacity='0';
   document.body.append(area);
   area.select();
   try{document.execCommand('copy');done()}finally{area.remove()}
  };

  if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(done).catch(fallback);
  else fallback();
 }

 function printPurchaseSheet(){
  const {dates,items,pieces,consumption,purchaseTotal}=purchaseListData();
  if(!dates.length){
   alert('Сначала выберите хотя бы одну дату выпечки.');
   return;
  }

  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const dateText=dates.map(date=>fmt(date,{day:'numeric',month:'long',year:'numeric'})).join(', ');
  const priceUnit=unit=>unit==='g'?'1 кг':unit==='ml'?'1 л':'1 шт.';
  const rowsHtml=items.length
   ? items.map(row=>`<tr>
      <td><strong>${escapeHtml(row.name)}</strong></td>
      <td>${escapeHtml(niceQty(row.buy,row.unit))}</td>
      <td>${row.price>0?`${row.price.toFixed(2)} € / ${priceUnit(row.unit)}`:'—'}</td>
      <td><strong>${euroCost(row.total)}</strong></td>
     </tr>`).join('')
   : '<tr><td colspan="4">По выбранным датам закупка не требуется.</td></tr>';

  const printWindow=window.open('','_blank');
  if(!printWindow){
   alert('Браузер заблокировал окно печати. Разрешите всплывающие окна для Panora и повторите.');
   return;
  }

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Panora — Список закупки</title>
<style>
 @page{size:A4 portrait;margin:14mm}
 *{box-sizing:border-box}
 body{margin:0;color:#1d2820;font:12px/1.45 Arial,sans-serif;background:#fff}
 .brand{display:flex;align-items:center;gap:10px;margin-bottom:22px}
 .mark{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#2f4937;color:#fff;font:bold 18px Georgia}
 .brand strong{font:24px Georgia,serif;color:#22362a}
 h1{margin:0 0 6px;font:30px/1.05 Georgia,serif;color:#22362a}
 .dates{margin:0 0 18px;color:#657168}
 .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:0 0 18px}
 .summary div{padding:11px 12px;border:1px solid #dce3dc;border-radius:9px}
 .summary span{display:block;color:#6d776f;font-size:10px}
 .summary strong{display:block;margin-top:4px;font-size:17px;color:#2f4937}
 table{width:100%;border-collapse:collapse;border:1px solid #dce3dc}
 th{padding:9px 10px;text-align:left;background:#eef2ed;color:#536159;font-size:10px}
 td{padding:10px;border-top:1px solid #e1e7e1;vertical-align:top}
 th:last-child,td:last-child{text-align:right}
 .footer{display:flex;justify-content:space-between;gap:20px;margin-top:14px;padding-top:11px;border-top:1px solid #dce3dc;color:#69756d}
 .total{color:#2f4937;font-size:16px}
</style>
</head>
<body>
 <div class="brand"><span class="mark">P</span><strong>Panora</strong></div>
 <h1>Список закупки</h1>
 <p class="dates"><strong>Даты выпечки:</strong> ${escapeHtml(dateText)}</p>
 <section class="summary">
  <div><span>Выбрано дат</span><strong>${dates.length}</strong></div>
  <div><span>Хлеба к выпечке</span><strong>${pieces} шт.</strong></div>
  <div><span>Нужно закупить</span><strong>${euroCost(purchaseTotal)}</strong></div>
 </section>
 <table>
  <thead><tr><th>Ингредиент</th><th>Купить</th><th>Цена</th><th>Сумма</th></tr></thead>
  <tbody>${rowsHtml}</tbody>
 </table>
 <div class="footer"><span>Расчётная стоимость сырья: <strong>${euroCost(consumption)}</strong></span><strong class="total">Итого: ${euroCost(purchaseTotal)}</strong></div>
</body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onafterprint=()=>printWindow.close();
  setTimeout(()=>printWindow.print(),250);
 }

 document.querySelector('#copyPurchaseList')?.addEventListener('click',copyPurchaseList);
 const printButton=document.querySelector('#printPurchase');
 if(printButton)printButton.onclick=printPurchaseSheet;

 window.panoraSetPurchaseDates=dates=>{
  const available=new Set(availableDates('active'));
  const next=(Array.isArray(dates)?dates:[]).filter(date=>available.has(date));
  window.panoraPurchaseSelection=next;
  localStorage.setItem(selectionKey,JSON.stringify(next));
  pickedDates.active=new Set(next);
  selectionReady.active=true;
  purchaseView='active';
  renderPurchase();
 };
 window.addEventListener('panora:recipes-changed',()=>{if(!window.panoraMoneyEditing?.active){renderPurchase();renderRawStock()}});
 window.addEventListener('panora:order-cycle-updated',()=>{if(!window.panoraMoneyEditing?.active){renderPurchase();renderRawStock()}});
 window.addEventListener('panora:raw-stock-changed',()=>{if(!window.panoraMoneyEditing?.active){renderPurchase();renderRawStock()}});
 window.addEventListener('panora:raw-stock-cloud-updated',()=>{if(!window.panoraMoneyEditing?.active){renderPurchase();renderRawStock()}});
 window.addEventListener('panora:bake-completions-changed',()=>{if(!window.panoraMoneyEditing?.active){renderPurchase();renderRawStock()}});
 window.addEventListener('panora:bake-completions-cloud-updated',()=>{if(!window.panoraMoneyEditing?.active){renderPurchase();renderRawStock()}});
 window.addEventListener('panora:raw-stock-cloud-state',event=>{const el=document.querySelector('#rawStockCloudState');if(!el)return;const detail=event.detail||{},state=detail.state||'synced';el.textContent=state==='error'?'Ошибка облака · сохранено':detail.text||'Облако ✓';el.dataset.state=state;el.title=detail.detail||'Нажмите, чтобы повторить синхронизацию'});
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',bindRawStock,{once:true}):bindRawStock();
 renderPurchase();
 renderRawStock();
})();
