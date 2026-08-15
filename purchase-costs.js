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

 function allAvailableDates(){
  const fromOrders=activeOrders().map(dateOfOrder).filter(Boolean);
  const fromPlans=(Array.isArray(plans)?plans:[]).map(plan=>plan?.bakeDate).filter(Boolean);
  return [...new Set([...fromOrders,...fromPlans])].sort();
 }

 function availableDates(view=purchaseView){
  const today=localToday();
  return allAvailableDates().filter(date=>view==='archive'?date<today:date>=today);
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
  const demand=periodDemand(),latest=currentRecipes(),priceMap=costs();
  const baseRows=new Map();

  const ensureRow=(name,unit,seed={})=>{
    const key=`${normalizeName(name)}|${normalizeUnit(unit)}`;
    if(!baseRows.has(key))baseRows.set(key,{
      key,name:String(name||'').trim(),unit:normalizeUnit(unit)||'g',required:0,stock:Number(seed.stock||0),
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
      row.stock=Math.max(row.stock,Number(item.stock||0));
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
   const latest=currentRecipes();
   Object.values(latest).flat().forEach(item=>{
    if(ingredientKey(item)!==row.key)return;
    if(input.dataset.costStock!==undefined)item.stock=Math.max(0,Number(input.value||0));
    else item.margin=Math.max(0,Number(input.value||0));
   });
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
 window.addEventListener('panora:recipes-changed',()=>{if(!window.panoraMoneyEditing?.active)renderPurchase()});
 window.addEventListener('panora:order-cycle-updated',()=>{if(!window.panoraMoneyEditing?.active)renderPurchase()});
 renderPurchase();
})();
