(function(){
 const PRICE_KEY='panora-ingredient-costs';
 const STOCK_KEY='panora-ingredient-stock';
 const HISTORY_KEY='panora-ingredient-price-history';
 const RECORDS_KEY='panora-purchase-records';
 const VAT_KEY='panora-ingredient-vat-rates';
 const selectionKey='panora-purchase-selected-dates';

 const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
 const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
 const costs=()=>read(PRICE_KEY,{});
 const saveCosts=value=>write(PRICE_KEY,value);
 const stockMap=()=>read(STOCK_KEY,{});
 const saveStock=value=>write(STOCK_KEY,value);
 const historyMap=()=>read(HISTORY_KEY,{});
 const saveHistory=value=>write(HISTORY_KEY,value);
 const vatMap=()=>read(VAT_KEY,{});
 const saveVat=value=>write(VAT_KEY,value);
 const euroCost=value=>new Intl.NumberFormat(lang==='ru'?'ru-RU':lang==='es'?'es-ES':'en-GB',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0)+' €';
 const pct=value=>new Intl.NumberFormat('ru-RU',{minimumFractionDigits:0,maximumFractionDigits:1}).format(Number(value)||0)+'%';
 const factor=unit=>unit==='g'||unit==='ml'?1000:1;
 const filter=$('#costBakeFilter');if(!filter)return;

 let selected='all',purchaseView='active',records=read(RECORDS_KEY,[]),lastRenderState=null;
 const cfg=window.PANORA_SUPABASE||{};

 const uuid=()=>crypto?.randomUUID?.()||`00000000-0000-4000-8000-${Date.now().toString(16).padStart(12,'0').slice(-12)}`;
 const sharedDates=()=>{try{return (window.panoraPurchaseSelection||read(selectionKey,[])).filter(Boolean)}catch{return[]}};
 const activeOrders=()=>Array.isArray(window.orders||orders)?(window.orders||orders).filter(order=>order&&order.status!=='cancelled'):[];
 const dateOfOrder=order=>String(order?.date||'').slice(0,10);
 const normalizeUnit=unit=>String(unit||'').trim().toLowerCase();
 const normalizeName=name=>String(name||'').trim().toLocaleLowerCase('ru-RU').replace(/ё/g,'е').replace(/[‐‑‒–—]/g,'-').replace(/\s+/g,' ');
 const ingredientKey=item=>`${normalizeName(item?.name)}|${normalizeUnit(item?.unit)}`;
 const selectionSignature=dates=>(dates||[]).slice().filter(Boolean).sort().join('|');
 const recordDateLabel=dates=>(dates||[]).map(date=>fmt(date,{day:'numeric',month:'short'})).join(', ');
 const statusLabel=status=>status==='received'?'Получено':status==='ordered'?'Заказано':'Зафиксировано';
 const localToday=()=>{const d=new Date(),pad=value=>String(value).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
 const purchaseUnit=unit=>unit==='g'?'кг':unit==='ml'?'л':'шт.';
 const displayQtyNumber=(value,unit)=>Number(value||0)/factor(unit);

 function currentRecipes(){
  try{
   const latest=read('panora-recipes',null);
   return latest&&typeof latest==='object'?latest:recipes;
  }catch{return recipes}
 }

 function allAvailableDates(){
  const fromOrders=activeOrders().map(dateOfOrder).filter(Boolean);
  const fromPlans=(Array.isArray(plans)?plans:[]).map(plan=>plan?.bakeDate).filter(Boolean);
  return [...new Set([...fromOrders,...fromPlans])].sort();
 }
 function activeDates(){
  const today=localToday();
  return allAvailableDates().filter(date=>date>=today);
 }
 function archiveRecords(){
  return records.slice().sort((a,b)=>String(b.receivedAt||b.orderedAt||b.fixedAt||b.updatedAt||'').localeCompare(String(a.receivedAt||a.orderedAt||a.fixedAt||a.updatedAt||'')));
 }
 function selectedRecord(){
  if(purchaseView!=='archive'||!String(selected).startsWith('record:'))return null;
  return records.find(record=>String(record.id)===String(selected).slice(7))||null;
 }
 function selectedDates(){
  if(purchaseView==='archive')return new Set(selectedRecord()?.dates||[]);
  const dates=activeDates();
  if(selected==='all')return new Set(dates);
  if(selected==='selected')return new Set(sharedDates().filter(date=>dates.includes(date)));
  return new Set(dates.includes(selected)?[selected]:[]);
 }
 function currentSelectionRecord(){
  if(purchaseView==='archive')return selectedRecord();
  const sig=selectionSignature([...selectedDates()]);
  return records.find(record=>record.selectionKey===sig)||null;
 }

 function renderModeTabs(){
  const root=document.querySelector('#purchaseModeTabs');if(!root)return;
  const activeCount=activeDates().length,archiveCount=archiveRecords().length;
  root.innerHTML=`
    <button type="button" class="${purchaseView==='active'?'active':''}" data-purchase-view="active"><span>Активные</span><b>${activeCount}</b></button>
    <button type="button" class="${purchaseView==='archive'?'active':''}" data-purchase-view="archive"><span>Архив</span><b>${archiveCount}</b></button>`;
  root.querySelectorAll('[data-purchase-view]').forEach(button=>button.onclick=()=>{
    const next=button.dataset.purchaseView;if(next===purchaseView)return;
    purchaseView=next;
    if(next==='archive'){
      const list=archiveRecords();
      selected=list.length?`record:${list[0].id}`:'archive-empty';
    }else selected='all';
    renderPurchase();
    if(next==='archive')loadCloudRecords();
  });
 }

 function fillFilter(){
  if(purchaseView==='archive'){
    const list=archiveRecords();
    if(!list.length){
      filter.innerHTML='<option value="archive-empty">Архив пока пуст</option>';
      selected='archive-empty';filter.value=selected;return;
    }
    if(!String(selected).startsWith('record:')||!records.some(record=>`record:${record.id}`===selected))selected=`record:${list[0].id}`;
    filter.innerHTML=list.map(record=>{
      const fact=record.actual?.netTotal;
      const suffix=record.status==='received'&&Number.isFinite(Number(fact))?` · факт ${euroCost(fact)}`:` · план ${euroCost(record.snapshot?.purchaseTotal||0)}`;
      return `<option value="record:${record.id}">${statusLabel(record.status)} · ${recordDateLabel(record.dates)}${suffix}</option>`;
    }).join('');
    filter.value=selected;return;
  }

  const dates=activeDates(),chosen=sharedDates().filter(date=>dates.includes(date));
  if(chosen.length&&selected==='all')selected='selected';
  if(selected!=='all'&&selected!=='selected'&&!dates.includes(selected))selected='all';
  if(selected==='selected'&&!chosen.length)selected='all';
  filter.innerHTML=
    `<option value="all">Все активные даты вместе</option>`+
    (chosen.length?`<option value="selected">Выбранные даты (${chosen.length}) — ${chosen.map(date=>fmt(date,{day:'numeric',month:'short'})).join(', ')}</option>`:'')+
    dates.map((date,index)=>`<option value="${date}">${index===0?'Ближайшая выпечка':`Выпечка ${index+1}`} — ${fmt(date,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</option>`).join('');
  if(!dates.length)filter.innerHTML='<option value="all">Нет активных дат выпечки</option>';
  filter.value=selected;
 }

 function periodDemand(){
  const dates=selectedDates(),demand=new Map();
  const ordersForDates=activeOrders().filter(order=>dates.has(dateOfOrder(order)));
  ordersForDates.forEach(order=>(Array.isArray(order.items)?order.items:[]).forEach(item=>{
    const qty=Math.max(0,Number(item?.quantity||0)),product=String(item.product||'');
    if(product&&qty)demand.set(product,(demand.get(product)||0)+qty);
  }));
  if(!demand.size){
    (Array.isArray(plans)?plans:[]).filter(plan=>dates.has(String(plan?.bakeDate||''))).forEach(plan=>{
      const product=String(plan?.product||''),qty=Math.max(0,Number(plan?.ordered||plan?.planned||0));
      if(product&&qty)demand.set(product,(demand.get(product)||0)+qty);
    });
  }
  return [...demand.entries()].map(([product,quantity])=>({product,quantity})).sort((a,b)=>String(productName(a.product)).localeCompare(String(productName(b.product)),'ru'));
 }

 function ingredientPrice(priceMap,name,unit){
  const normalized=`${normalizeName(name)}|${normalizeUnit(unit)}`;
  return Number(priceMap[normalized]??priceMap[`${name}|${unit}`]??0);
 }
 function fallbackRecipeStock(key,seed=0){
  let value=Math.max(0,Number(seed||0));
  const latest=currentRecipes();
  Object.values(latest||{}).flat().forEach(item=>{if(ingredientKey(item)===key)value=Math.max(value,Number(item.stock||0))});
  return value;
 }
 function currentIngredientStock(key,seed=0){
  const map=stockMap();
  return Object.prototype.hasOwnProperty.call(map,key)?Math.max(0,Number(map[key]||0)):fallbackRecipeStock(key,seed);
 }

 function buildTotals(){
  const demand=periodDemand(),latest=currentRecipes(),priceMap=costs(),baseRows=new Map();
  const ensureRow=(name,unit,seed={})=>{
    const key=`${normalizeName(name)}|${normalizeUnit(unit)}`;
    if(!baseRows.has(key))baseRows.set(key,{
      key,name:String(name||'').trim(),unit:normalizeUnit(unit)||'g',required:0,
      stock:currentIngredientStock(key,seed.stock),margin:Number(seed.margin??5),
      price:ingredientPrice(priceMap,name,unit),sources:new Map(),semi:false,
      sourceName:'',sourceUnit:'g',yieldPct:0,derivedFrom:[]
    });
    return baseRows.get(key);
  };

  demand.forEach(({product,quantity})=>{
    const recipe=Array.isArray(latest?.[product])?latest[product]:[];
    recipe.forEach(item=>{
      const perBread=Math.max(0,Number(item?.qty||0));
      if(!perBread||!normalizeName(item?.name))return;
      const row=ensureRow(item.name,item.unit,item),contribution=quantity*perBread;
      row.required+=contribution;
      row.margin=Math.max(row.margin,Number(item.margin??5));
      const source=row.sources.get(product)||{product,pieces:quantity,required:0};
      source.required+=contribution;row.sources.set(product,source);
      if(item.sourceIngredientName&&Number(item.sourceYieldPct)>0){
        row.semi=true;row.sourceName=String(item.sourceIngredientName).trim();row.sourceUnit=item.sourceUnit||item.unit||'g';row.yieldPct=Number(item.sourceYieldPct);
      }
    });
  });

  [...baseRows.values()].filter(row=>row.semi&&row.sourceName&&row.yieldPct>0).forEach(row=>{
    const needToMake=Math.max(0,row.required-row.stock),sourceNeed=needToMake/(row.yieldPct/100);
    if(sourceNeed<=0)return;
    const sourceRow=ensureRow(row.sourceName,row.sourceUnit,{stock:0,margin:row.margin});
    sourceRow.required+=sourceNeed;sourceRow.margin=Math.max(sourceRow.margin,row.margin);
    sourceRow.derivedFrom.push({name:row.name,required:needToMake,yieldPct:row.yieldPct,sourceRequired:sourceNeed});
  });

  const rows=[...baseRows.values()].sort((a,b)=>a.semi!==b.semi?(a.semi?1:-1):a.name.localeCompare(b.name,'ru'));
  const breadCosts=demand.map(({product,quantity})=>{
    let unitCost=0,priced=true;const details=[];
    (Array.isArray(latest?.[product])?latest[product]:[]).forEach(item=>{
      const qty=Math.max(0,Number(item.qty||0));if(!qty)return;
      if(item.sourceIngredientName&&Number(item.sourceYieldPct)>0){
        const sourceUnit=item.sourceUnit||item.unit||'g',sourcePrice=ingredientPrice(priceMap,item.sourceIngredientName,sourceUnit);
        const rawQty=qty/(Number(item.sourceYieldPct)/100),cost=rawQty/factor(sourceUnit)*sourcePrice;
        if(sourcePrice<=0)priced=false;unitCost+=cost;details.push({name:item.name,cost,source:item.sourceIngredientName});
      }else{
        const price=ingredientPrice(priceMap,item.name,item.unit),cost=qty/factor(item.unit)*price;
        if(price<=0)priced=false;unitCost+=cost;details.push({name:item.name,cost});
      }
    });
    return {product,quantity,unitCost,totalCost:unitCost*quantity,priced,details};
  });
  return {demand,rows,breadCosts};
 }

 function rowNumbers(row){
  const isSemi=row.semi&&row.sourceName&&row.yieldPct>0;
  const needToMake=isSemi?Math.max(0,row.required-row.stock):0;
  const buy=isSemi?0:Math.max(0,row.required*(1+row.margin/100)-row.stock);
  const usedCost=isSemi
    ? row.required/factor(row.unit)*(ingredientPrice(costs(),row.sourceName,row.sourceUnit)/(row.yieldPct/100))
    : row.required/factor(row.unit)*row.price;
  const buyCost=isSemi?0:buy/factor(row.unit)*row.price;
  return {isSemi,needToMake,buy,usedCost,buyCost};
 }

 function serializeCurrent(data){
  const pieces=data.demand.reduce((sum,row)=>sum+Number(row.quantity||0),0);
  const consumption=data.breadCosts.reduce((sum,row)=>sum+Number(row.totalCost||0),0);
  let purchaseTotal=0;
  const rows=data.rows.map(row=>{
    const n=rowNumbers(row);purchaseTotal+=n.buyCost;
    return {...row,sources:[...row.sources.values()],buy:n.buy,needToMake:n.needToMake,usedCost:n.usedCost,buyCost:n.buyCost};
  });
  return {
    demand:data.demand.map(row=>({...row})),
    breadCosts:data.breadCosts.map(row=>({...row,details:(row.details||[]).map(x=>({...x}))})),
    rows,pieces,consumption,purchaseTotal
  };
 }
 function dataFromRecord(record){
  const snap=record?.snapshot;
  if(!snap)return {demand:[],rows:[],breadCosts:[],pieces:0,consumption:0,purchaseTotal:0};
  return {
    demand:snap.demand||[],rows:(snap.rows||[]).map(row=>({...row,sources:Array.isArray(row.sources)?row.sources:[]})),
    breadCosts:snap.breadCosts||[],pieces:Number(snap.pieces||0),consumption:Number(snap.consumption||0),purchaseTotal:Number(snap.purchaseTotal||0)
  };
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
  const sources=row.sources instanceof Map?[...row.sources.values()]:(Array.isArray(row.sources)?row.sources:[]);
  const sourceRows=sources.map(source=>`<p><span>${productName(source.product)} · ${source.pieces} шт.</span><strong>${niceQty(source.required,row.unit)}</strong></p>`);
  const derived=(row.derivedFrom||[]).map(item=>`<p><span>${item.name} → ${row.name} · выход ${item.yieldPct}%</span><strong>${niceQty(item.sourceRequired,row.unit)}</strong></p>`);
  if(!sourceRows.length&&!derived.length)return '';
  return `<details class="purchase-ingredient-sources"><summary>Из чего рассчитано</summary><div>${sourceRows.join('')}${derived.join('')}<p class="purchase-source-total"><span>Всего нужно</span><strong>${niceQty(row.required,row.unit)}</strong></p></div></details>`;
 }

 function recordPriceHistory(key,name,unit,price,source='manual',at=new Date().toISOString()){
  price=Number(price||0);if(price<=0)return;
  const map=historyMap(),list=Array.isArray(map[key])?map[key]:[];
  const last=list[list.length-1];
  if(last&&Math.abs(Number(last.price||0)-price)<0.0001&&String(last.source||'')===source)return;
  list.push({at,price,source,name,unit});
  map[key]=list.slice(-20);saveHistory(map);
 }
 function mergedPriceHistory(row){
  const local=(historyMap()[row.key]||[]).slice();
  records.forEach(record=>{
    const snapRow=(record.snapshot?.rows||[]).find(item=>item.key===row.key);
    if(snapRow?.price>0)local.push({at:record.fixedAt||record.createdAt,price:snapRow.price,source:'фиксация'});
    const actualRow=(record.actual?.rows||[]).find(item=>item.key===row.key);
    if(actualRow?.priceNet>0)local.push({at:record.receivedAt,price:actualRow.priceNet,source:'факт'});
  });
  const seen=new Set();
  return local.filter(item=>item?.at&&item?.price>0).sort((a,b)=>String(b.at).localeCompare(String(a.at))).filter(item=>{
    const k=`${item.at}|${Number(item.price).toFixed(4)}|${item.source}`;if(seen.has(k))return false;seen.add(k);return true;
  }).slice(0,8);
 }
 function priceHistoryHtml(row){
  const list=mergedPriceHistory(row);if(!list.length)return '';
  return `<details class="purchase-price-history"><summary>История цены</summary><div>${list.map(item=>`<p><span>${new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',year:'2-digit'}).format(new Date(item.at))} · ${item.source}</span><strong>${Number(item.price).toFixed(2)} € / ${purchaseUnit(row.unit)}</strong></p>`).join('')}</div></details>`;
 }

 function missingPriceRows(rows){
  return rows.filter(row=>!row.semi&&Number(row.required||0)>0&&Number(row.price||0)<=0);
 }
 function renderWarning(rows,isArchive){
  const node=document.querySelector('#purchasePriceWarning');if(!node)return;
  if(isArchive){node.hidden=true;return}
  const missing=missingPriceRows(rows);
  node.hidden=!missing.length;
  if(missing.length)node.innerHTML=`<strong>Не заполнены цены: ${missing.length}</strong><span>${missing.map(row=>row.name).join(', ')}. Себестоимость и сумма закупки будут неполными.</span>`;
 }

 function renderStatus(record,isArchive){
  const steps=document.querySelector('#purchaseStatusSteps'),caption=document.querySelector('#purchaseWorkflowCaption');
  const freeze=document.querySelector('#purchaseFreeze'),ordered=document.querySelector('#purchaseMarkOrdered'),receive=document.querySelector('#purchaseReceive'),copy=document.querySelector('#purchaseCopyList');
  const status=record?.status||'calculation';
  const order=['calculation','fixed','ordered','received'],current=Math.max(0,order.indexOf(status));
  steps.innerHTML=order.map((key,index)=>`<span class="${index<current?'done':index===current?'active':''}">${index+1}. ${key==='calculation'?'Расчёт':key==='fixed'?'Зафиксировано':key==='ordered'?'Заказано':'Получено'}</span>`).join('');
  caption.textContent=isArchive
    ? record?`${statusLabel(record.status)} · снимок от ${new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(record.fixedAt||record.createdAt))}`:'Архив пока пуст'
    : status==='calculation'?'Текущий расчёт ещё не зафиксирован'
      : status==='fixed'?'Расчёт зафиксирован — можно отправлять поставщику'
      : status==='ordered'?'Заказ поставщику зафиксирован — ожидается получение'
      :'Закупка получена и передана в остатки и финансы';
  freeze.hidden=isArchive;ordered.hidden=isArchive;receive.hidden=isArchive;
  freeze.disabled=!lastRenderState?.pieces||status==='ordered'||status==='received';
  freeze.textContent=status==='fixed'?'Обновить фиксацию':'Зафиксировать закупку';
  ordered.disabled=status!=='fixed';
  ordered.textContent=status==='ordered'||status==='received'?'Заказано ✓':'Заказано поставщику';
  receive.disabled=status!=='ordered';
  receive.textContent=status==='received'?'Получено ✓':'Закупка выполнена';
  copy.disabled=!lastRenderState?.rows?.length;
 }
 function renderPlanFact(record){
  const node=document.querySelector('#purchasePlanFact');if(!node)return;
  if(!record){node.hidden=true;node.innerHTML='';return}
  const plan=Number(record.snapshot?.purchaseTotal||0);
  if(record.status!=='received'||!record.actual){
    node.hidden=false;
    node.innerHTML=`<article><span>План закупки</span><strong>${euroCost(plan)}</strong><small>${statusLabel(record.status)}</small></article>`;
    return;
  }
  const fact=Number(record.actual.netTotal||0),vat=Number(record.actual.vatTotal||0),gross=Number(record.actual.grossTotal||0),delta=fact-plan,deltaPct=plan?delta/plan*100:0;
  node.hidden=false;
  node.innerHTML=`
    <article><span>План</span><strong>${euroCost(plan)}</strong><small>Зафиксированная сумма без НДС</small></article>
    <article><span>Факт без НДС</span><strong>${euroCost(fact)}</strong><small>По полученной закупке</small></article>
    <article><span>НДС</span><strong>${euroCost(vat)}</strong><small>Факт с НДС: ${euroCost(gross)}</small></article>
    <article class="${delta>0.005?'over':delta<-0.005?'under':''}"><span>Отклонение</span><strong>${delta>=0?'+':''}${euroCost(delta)}</strong><small>${delta>=0?'+':''}${pct(deltaPct)}</small></article>`;
 }

 function renderRows(rows,isArchive){
  const body=$('#purchaseRows');
  body.innerHTML=rows.length?rows.map((row,index)=>{
   const n=row.buy!==undefined
     ? {isSemi:Boolean(row.semi&&row.sourceName&&row.yieldPct>0),needToMake:Number(row.needToMake||0),buy:Number(row.buy||0),usedCost:Number(row.usedCost||0),buyCost:Number(row.buyCost||0)}
     : rowNumbers(row);
   return `<tr class="${n.isSemi?'purchase-semi-row':''} ${isArchive?'purchase-archive-row':''}">
    <td><strong>${row.name}</strong><small>${n.isSemi?`Полуфабрикат · производится из «${row.sourceName}» · выход ${row.yieldPct}%`:`Цена за 1 ${purchaseUnit(row.unit)}`}</small>${ingredientSourcesHtml(row)}${!n.isSemi?priceHistoryHtml(row):''}</td>
    <td>${niceQty(row.required,row.unit)}</td>
    <td>${isArchive?`<span class="purchase-readonly-value">${niceQty(row.stock,row.unit)}</span>`:`<input data-cost-stock="${index}" type="number" min="0" step="0.01" value="${row.stock}"> ${row.unit}`}</td>
    <td>${isArchive?`<span class="purchase-readonly-value">${n.isSemi?'по сырью':`${row.margin}%`}</span>`:n.isSemi?'<span class="purchase-auto-mark">по сырью</span>':`<input data-cost-margin="${index}" type="number" min="0" step="0.1" value="${row.margin}">%`}</td>
    <td><strong>${n.isSemi?`${isArchive?'Нужно было приготовить':'Приготовить'} ${niceQty(n.needToMake,row.unit)}`:niceQty(n.buy,row.unit)}</strong></td>
    <td>${n.isSemi?`<span class="purchase-auto-mark">авто</span>`:isArchive?`<span class="purchase-readonly-value">${Number(row.price||0).toFixed(2)} €</span>`:`<input class="ingredient-price" data-ingredient-price="${row.key}" data-row-index="${index}" type="text" inputmode="decimal" autocomplete="off" value="${Number(row.price||0).toFixed(2)}">`}</td>
    <td><strong>${euroCost(n.isSemi?n.usedCost:n.buyCost)}</strong><small>${n.isSemi?'себестоимость полуфабриката':isArchive?'зафиксированная сумма':`использовано ${euroCost(n.usedCost)}`}</small></td>
   </tr>`;
  }).join(''):'<tr><td colspan="7">В выбранном периоде нет хлеба к выпечке.</td></tr>';
 }

 function persistLocalRecords(){write(RECORDS_KEY,records)}
 async function cloudRequest(path,options={}){
  const session=window.panoraSupabaseSession;
  if(!cfg.url||!cfg.publishableKey||!session?.access_token)throw new Error('no-session');
  const response=await fetch(`${cfg.url}/rest/v1/${path}`,{
    cache:'no-store',...options,
    headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json',...(options.headers||{})}
  });
  const text=await response.text();
  if(!response.ok)throw new Error(text||`HTTP ${response.status}`);
  return text?JSON.parse(text):null;
 }
 function rowToCloud(record){
  return {id:record.id,selection_key:record.selectionKey,bake_dates:record.dates,status:record.status,record_data:record,updated_at:new Date().toISOString()};
 }
 async function saveRecordCloud(record){
  try{await cloudRequest('purchase_records?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rowToCloud(record))})}catch{}
 }
 async function loadCloudRecords(){
  try{
    const rows=await cloudRequest('purchase_records?select=id,selection_key,bake_dates,status,record_data,updated_at&order=updated_at.desc');
    if(!Array.isArray(rows))return;
    const byId=new Map(records.map(record=>[String(record.id),record]));
    rows.forEach(row=>{
      const record=row.record_data&&typeof row.record_data==='object'?row.record_data:{id:row.id,selectionKey:row.selection_key,dates:row.bake_dates||[],status:row.status};
      if(!record?.id)return;
      const local=byId.get(String(record.id));
      const localAt=String(local?.updatedAt||local?.receivedAt||local?.orderedAt||local?.fixedAt||'');
      const remoteAt=String(record.updatedAt||record.receivedAt||record.orderedAt||record.fixedAt||row.updated_at||'');
      if(!local||remoteAt>=localAt)byId.set(String(record.id),record);
    });
    records=[...byId.values()];persistLocalRecords();
    if(purchaseView==='archive')renderPurchase();
    else renderModeTabs();
  }catch{}
 }
 function saveRecord(record){
  record.updatedAt=new Date().toISOString();
  const i=records.findIndex(item=>item.id===record.id);
  if(i>=0)records[i]=record;else records.push(record);
  persistLocalRecords();saveRecordCloud(record);return record;
 }

 function freezeCurrent(){
  if(purchaseView!=='active'||!lastRenderState?.pieces)return;
  const missing=missingPriceRows(lastRenderState.rows);
  if(missing.length&&!confirm(`Не заполнены цены: ${missing.map(row=>row.name).join(', ')}. Зафиксировать закупку всё равно?`))return;
  const dates=[...selectedDates()].sort(),sig=selectionSignature(dates);
  if(!sig)return;
  let record=records.find(item=>item.selectionKey===sig);
  if(record&&['ordered','received'].includes(record.status))return;
  const now=new Date().toISOString();
  const snapshot=serializeCurrent({demand:lastRenderState.demand,rows:lastRenderState.rows,breadCosts:lastRenderState.breadCosts});
  record=record||{id:uuid(),selectionKey:sig,dates,status:'fixed',createdAt:now};
  record.dates=dates;record.status='fixed';record.fixedAt=now;record.snapshot=snapshot;
  saveRecord(record);renderPurchase();
 }

 function markOrdered(){
  const record=currentSelectionRecord();if(!record||record.status!=='fixed')return;
  record.status='ordered';record.orderedAt=new Date().toISOString();saveRecord(record);renderPurchase();
 }

 function copyCurrentList(){
  const record=purchaseView==='archive'?selectedRecord():currentSelectionRecord();
  const source=record?.snapshot||lastRenderState;
  const rows=(source?.rows||[]).filter(row=>!row.semi&&Number(row.buy||rowNumbers(row).buy||0)>0.0005);
  if(!rows.length)return alert('В списке нет ингредиентов к покупке.');
  const dates=record?.dates||[...selectedDates()];
  const lines=[`Panora · закупка · ${recordDateLabel(dates)}`,...rows.map(row=>{
    const buy=Number(row.buy!==undefined?row.buy:rowNumbers(row).buy);
    return `${row.name} — ${niceQty(buy,row.unit)}`;
  })];
  const text=lines.join('\n');
  const done=()=>{const button=document.querySelector('#purchaseCopyList'),old=button.textContent;button.textContent='Скопировано ✓';setTimeout(()=>button.textContent=old,1300)};
  if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(done).catch(()=>fallbackCopy(text,done));
  else fallbackCopy(text,done);
 }
 function fallbackCopy(text,done){
  const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();
  try{document.execCommand('copy');done()}catch{}finally{area.remove()}
 }

 const receiveDialog=document.querySelector('#purchaseReceiveDialog');
 const receiveForm=document.querySelector('#purchaseReceiveForm');
 const receiveRows=document.querySelector('#purchaseReceiveRows');
 const receiveTotals=document.querySelector('#purchaseReceiveTotals');
 const receiveDate=document.querySelector('#purchaseReceivedDate');

 function receiveSourceRows(record){
  return (record?.snapshot?.rows||[]).filter(row=>!row.semi&&Number(row.buy||0)>0.0005);
 }
 function renderReceiveTotals(){
  let net=0,vat=0;
  receiveRows.querySelectorAll('tr[data-key]').forEach(tr=>{
    const unit=tr.dataset.unit,qty=Math.max(0,Number(String(tr.querySelector('[data-actual-qty]').value).replace(',','.'))||0);
    const price=Math.max(0,Number(String(tr.querySelector('[data-actual-price]').value).replace(',','.'))||0);
    const rate=Math.max(0,Number(String(tr.querySelector('[data-actual-vat]').value).replace(',','.'))||0);
    const line=qty*price;net+=line;vat+=line*rate/100;
    tr.querySelector('[data-actual-line]').textContent=euroCost(line);
  });
  receiveTotals.innerHTML=`<span>Без НДС <strong>${euroCost(net)}</strong></span><span>НДС <strong>${euroCost(vat)}</strong></span><span>С НДС <strong>${euroCost(net+vat)}</strong></span>`;
 }
 function openReceive(){
  const record=currentSelectionRecord();if(!record||record.status!=='ordered')return;
  const rows=receiveSourceRows(record);if(!rows.length)return alert('Нет ингредиентов к получению.');
  receiveDate.value=localToday();
  const vats=vatMap();
  receiveRows.innerHTML=rows.map(row=>{
    const planDisplay=displayQtyNumber(row.buy,row.unit),rate=Number(vats[row.key]??21);
    return `<tr data-key="${row.key}" data-name="${String(row.name).replace(/"/g,'&quot;')}" data-unit="${row.unit}">
      <td><strong>${row.name}</strong><small>${purchaseUnit(row.unit)}</small></td>
      <td>${new Intl.NumberFormat('ru-RU',{maximumFractionDigits:3}).format(planDisplay)} ${purchaseUnit(row.unit)}</td>
      <td><input data-actual-qty type="text" inputmode="decimal" value="${String(Number(planDisplay.toFixed(3))).replace('.',',')}"> ${purchaseUnit(row.unit)}</td>
      <td><input data-actual-price type="text" inputmode="decimal" value="${String(Number(row.price||0).toFixed(2)).replace('.',',')}"> € / ${purchaseUnit(row.unit)}</td>
      <td><input data-actual-vat type="text" inputmode="decimal" value="${String(rate).replace('.',',')}"></td>
      <td data-actual-line>0,00 €</td>
    </tr>`;
  }).join('');
  receiveRows.querySelectorAll('input').forEach(input=>input.addEventListener('input',renderReceiveTotals));
  document.querySelector('#purchaseReceiveSummary').innerHTML=`<strong>${recordDateLabel(record.dates)}</strong><span>План закупки без НДС: ${euroCost(record.snapshot.purchaseTotal||0)}</span>`;
  renderReceiveTotals();receiveDialog.showModal();
 }
 async function financeExpense(row){
  if(typeof window.panoraFinanceAddExpense==='function'){
    try{return await window.panoraFinanceAddExpense(row)}catch{}
  }
  const key='panora-finance-expenses',list=read(key,[]);
  const i=list.findIndex(item=>item.id===row.id);if(i>=0)list[i]=row;else list.push(row);
  write(key,list);window.dispatchEvent(new CustomEvent('panora:finance-expenses-changed'));return row;
 }
 async function submitReceive(event){
  event.preventDefault();
  const record=currentSelectionRecord();if(!record||record.status!=='ordered')return receiveDialog.close();
  const stock=stockMap(),prices=costs(),vats=vatMap(),actualRows=[];
  let netTotal=0,vatTotal=0,grossTotal=0;
  const grouped=new Map();

  for(const tr of receiveRows.querySelectorAll('tr[data-key]')){
    const key=tr.dataset.key,name=tr.dataset.name,unit=tr.dataset.unit;
    const qtyDisplay=Math.max(0,Number(String(tr.querySelector('[data-actual-qty]').value).replace(',','.'))||0);
    const priceNet=Math.max(0,Number(String(tr.querySelector('[data-actual-price]').value).replace(',','.'))||0);
    const vatRate=Math.max(0,Number(String(tr.querySelector('[data-actual-vat]').value).replace(',','.'))||0);
    if(qtyDisplay>0&&priceNet<=0)return alert(`Укажите фактическую цену для «${name}».`);
    const qtyBase=qtyDisplay*factor(unit),lineNet=qtyDisplay*priceNet,lineVat=lineNet*vatRate/100,lineGross=lineNet+lineVat;
    actualRows.push({key,name,unit,quantity:qtyBase,quantityDisplay:qtyDisplay,priceNet,vatRate,net:lineNet,vat:lineVat,gross:lineGross});
    netTotal+=lineNet;vatTotal+=lineVat;grossTotal+=lineGross;
    if(qtyBase>0)stock[key]=currentIngredientStock(key,0)+qtyBase;
    if(priceNet>0){prices[key]=priceNet;recordPriceHistory(key,name,unit,priceNet,'факт закупки')}
    vats[key]=vatRate;
    const group=grouped.get(vatRate)||{net:0,vat:0,gross:0};group.net+=lineNet;group.vat+=lineVat;group.gross+=lineGross;grouped.set(vatRate,group);
  }

  saveStock(stock);saveCosts(prices);saveVat(vats);
  const receivedAt=new Date().toISOString();
  record.status='received';record.receivedAt=receivedAt;
  record.actual={receivedDate:receiveDate.value||localToday(),rows:actualRows,netTotal,vatTotal,grossTotal};
  record.financeExpenseIds=record.financeExpenseIds||[];

  for(const [vatRate,group] of grouped){
    if(group.gross<=0.005)continue;
    let expenseId=record.financeExpenseIds.find(item=>Number(item.vatRate)===Number(vatRate))?.id;
    if(!expenseId){expenseId=uuid();record.financeExpenseIds.push({vatRate:Number(vatRate),id:expenseId})}
    await financeExpense({
      id:expenseId,date:record.actual.receivedDate,category:'Сырьё',
      description:`Закупка сырья · ${recordDateLabel(record.dates)}`,
      expenseType:'variable',grossAmount:group.gross,vatRate:Number(vatRate),vatDeductible:true
    });
  }

  saveRecord(record);
  window.dispatchEvent(new CustomEvent('panora:ingredient-costs-changed'));
  window.dispatchEvent(new CustomEvent('panora:purchase-received',{detail:{recordId:record.id}}));
  receiveDialog.close();renderPurchase();
 }

 renderPurchase=function(){
  if(window.panoraMoneyEditing?.active&&purchaseView==='active'){
    const active=window.panoraMoneyEditing.element;if(active&&active.matches('[data-ingredient-price]'))return;
  }
  renderModeTabs();fillFilter();
  const isArchive=purchaseView==='archive',record=currentSelectionRecord();
  document.querySelector('#purchaseArchiveNote').hidden=!isArchive;
  document.querySelector('#costBakeFilterLabel').textContent=isArchive?'Архив закупки':'Рассчитать закупку для';
  document.querySelector('#costPiecesLabel').textContent=isArchive?'Хлеба в зафиксированной выпечке':'Хлеба к выпечке';
  document.querySelector('#costConsumptionLabel').textContent=isArchive?'Зафиксированная стоимость сырья':'Стоимость сырья';
  document.querySelector('#costPurchaseLabel').textContent=isArchive?'План закупки':'Нужно закупить';
  document.querySelector('#purchaseBuyHeader').textContent=isArchive?'Зафиксировано':'Купить';
  document.querySelector('#purchaseModeHint').textContent=isArchive
    ? 'Показан зафиксированный снимок: количества, цены, остатки и сумма не пересчитываются по сегодняшним данным.'
    : 'Выберите отдельную дату выпечки или общий расчёт по активным датам. После проверки цен зафиксируйте закупку.';

  let data;
  if(isArchive&&record){
    data=dataFromRecord(record);
  }else if(isArchive){
    data={demand:[],rows:[],breadCosts:[],pieces:0,consumption:0,purchaseTotal:0};
  }else{
    const built=buildTotals(),snap=serializeCurrent(built);
    data={...built,...snap};
  }

  const pieces=Number(data.pieces??data.demand.reduce((sum,row)=>sum+Number(row.quantity||0),0));
  const consumption=Number(data.consumption??data.breadCosts.reduce((sum,row)=>sum+Number(row.totalCost||0),0));
  let purchaseTotal=Number(data.purchaseTotal||0);
  if(!isArchive&&!purchaseTotal)purchaseTotal=data.rows.reduce((sum,row)=>sum+rowNumbers(row).buyCost,0);

  lastRenderState={...data,pieces,consumption,purchaseTotal,record,isArchive};
  breadBreakdownHtml(data.breadCosts);renderRows(data.rows,isArchive);renderWarning(data.rows,isArchive);

  $('#costPeriodPieces').textContent=`${pieces} шт.`;
  $('#costConsumptionTotal').textContent=euroCost(consumption);
  $('#costPurchaseTotal').textContent=euroCost(purchaseTotal);
  $('#costPerBread').textContent=`${euroCost(pieces?consumption/pieces:0)} / шт.`;
  renderPlanFact(record);renderStatus(record,isArchive);

  if(!isArchive)$$('[data-ingredient-price]').forEach(input=>{
    const commit=()=>{
      const value=window.panoraParseDecimal?.(input.value);
      const row=data.rows[Number(input.dataset.rowIndex)];
      if(value===null){input.value=Number(costs()[input.dataset.ingredientPrice]||0).toFixed(2);return}
      const priceMap=costs();priceMap[input.dataset.ingredientPrice]=value;saveCosts(priceMap);
      if(row)recordPriceHistory(row.key,row.name,row.unit,value,'ручная цена');
      input.value=value.toFixed(2);window.dispatchEvent(new CustomEvent('panora:ingredient-costs-changed'));
      setTimeout(()=>{if(!window.panoraMoneyEditing?.active)renderPurchase()},0);
    };
    input.onblur=commit;input.onchange=null;input.onfocus=()=>requestAnimationFrame(()=>input.select());
  });

  if(!isArchive)$$('[data-cost-stock],[data-cost-margin]').forEach(input=>input.onchange=()=>{
    const row=data.rows[Number(input.dataset.costStock??input.dataset.costMargin)];if(!row)return;
    const latest=currentRecipes();
    if(input.dataset.costStock!==undefined){
      const map=stockMap();map[row.key]=Math.max(0,Number(input.value||0));saveStock(map);
      Object.values(latest).flat().forEach(item=>{if(ingredientKey(item)===row.key)item.stock=Math.max(0,Number(input.value||0))});
    }else{
      Object.values(latest).flat().forEach(item=>{if(ingredientKey(item)===row.key)item.margin=Math.max(0,Number(input.value||0))});
    }
    if(typeof recipes!=='undefined')recipes=latest;store('panora-recipes',latest);renderPurchase();
  });
 };

 filter.onchange=()=>{selected=filter.value;renderPurchase()};
 document.querySelector('#purchaseFreeze').onclick=freezeCurrent;
 document.querySelector('#purchaseMarkOrdered').onclick=markOrdered;
 document.querySelector('#purchaseReceive').onclick=openReceive;
 document.querySelector('#purchaseCopyList').onclick=copyCurrentList;
 document.querySelector('#purchaseReceiveClose').onclick=document.querySelector('#purchaseReceiveCancel').onclick=()=>receiveDialog.close();
 receiveForm.onsubmit=submitReceive;

 window.panoraSetPurchaseDates=dates=>{
  window.panoraPurchaseSelection=dates;write(selectionKey,dates);
  purchaseView='active';selected='selected';renderPurchase();
 };
 window.addEventListener('panora:recipes-changed',()=>{if(!window.panoraMoneyEditing?.active)renderPurchase()});
 window.addEventListener('panora:order-cycle-updated',()=>{if(!window.panoraMoneyEditing?.active)renderPurchase()});
 document.addEventListener('click',event=>{if(event.target.closest('.admin-nav [data-view="purchase"],[data-mobile-view="purchase"]'))setTimeout(loadCloudRecords,150)},true);

 renderPurchase();
 setTimeout(loadCloudRecords,2200);
})();
