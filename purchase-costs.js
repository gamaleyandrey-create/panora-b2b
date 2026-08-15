(function(){
 const costs=()=>{try{return JSON.parse(localStorage.getItem('panora-ingredient-costs'))||{}}catch{return{}}};
 const saveCosts=value=>localStorage.setItem('panora-ingredient-costs',JSON.stringify(value));
 const euroCost=value=>new Intl.NumberFormat(lang==='ru'?'ru-RU':lang==='es'?'es-ES':'en-GB',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0)+' €';
 const factor=unit=>unit==='g'||unit==='ml'?1000:1;
 const filter=$('#costBakeFilter');if(!filter)return;
 const selectionKey='panora-purchase-selected-dates';
 let selected='all';

 const sharedDates=()=>{try{return (window.panoraPurchaseSelection||JSON.parse(localStorage.getItem(selectionKey)||'[]')).filter(Boolean)}catch{return[]}};
 const activeOrders=()=>Array.isArray(window.orders||orders)?(window.orders||orders).filter(order=>order&&order.status!=='cancelled'):[];
 const dateOfOrder=order=>String(order?.date||'').slice(0,10);

 function availableDates(){
  const fromOrders=activeOrders().map(dateOfOrder).filter(Boolean);
  const fromPlans=(Array.isArray(plans)?plans:[]).map(plan=>plan?.bakeDate).filter(Boolean);
  return [...new Set([...fromOrders,...fromPlans])].sort();
 }

 function fillFilter(){
  const dates=availableDates(),chosen=sharedDates().filter(date=>dates.includes(date));
  if(chosen.length&&selected==='all')selected='selected';
  if(selected!=='all'&&selected!=='selected'&&!dates.includes(selected))selected='all';
  if(selected==='selected'&&!chosen.length)selected='all';
  filter.innerHTML=
    `<option value="all">Все даты вместе</option>`+
    (chosen.length?`<option value="selected">Выбранные даты (${chosen.length}) — ${chosen.map(date=>fmt(date,{day:'numeric',month:'short'})).join(', ')}</option>`:'')+
    dates.map((date,index)=>`<option value="${date}">${index===0?'Ближайшая выпечка':`Выпечка ${index+1}`} — ${fmt(date,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</option>`).join('');
  filter.value=selected;
 }

 function selectedDates(){
  if(selected==='all')return new Set(availableDates());
  if(selected==='selected')return new Set(sharedDates());
  return new Set([selected]);
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

 function buildTotals(){
  const demand=periodDemand();
  const latest=currentRecipes();
  const priceMap=costs();
  const rows=new Map();

  demand.forEach(({product,quantity})=>{
   const recipe=Array.isArray(latest?.[product])?latest[product]:[];
   recipe.forEach(item=>{
    const perBread=Math.max(0,Number(item?.qty||0));
    if(!perBread)return;
    const key=ingredientKey(item);
    if(!normalizeName(item?.name)||!normalizeUnit(item?.unit))return;

    let row=rows.get(key);
    if(!row){
     const legacyKey=`${item.name}|${item.unit}`;
     const price=Number(priceMap[key]??priceMap[legacyKey]??0);
     row={
      key,
      legacyKey,
      name:String(item.name||'').trim(),
      unit:normalizeUnit(item.unit),
      required:0,
      stock:Number(item.stock||0),
      margin:Number(item.margin??5),
      price:Number.isFinite(price)?price:0,
      sources:new Map()
     };
     rows.set(key,row);
    }

    const contribution=quantity*perBread;
    row.required+=contribution;

    const source=row.sources.get(product)||{product,pieces:quantity,required:0,perBread:0};
    source.required+=contribution;
    source.perBread+=perBread;
    row.sources.set(product,source);

    // One physical ingredient has one stock and one safety margin.
    // If old recipes contain different values, keep the safest values.
    row.stock=Math.max(row.stock,Number(item.stock||0));
    row.margin=Math.max(row.margin,Number(item.margin??5));
   });
  });

  return {demand,rows:[...rows.values()].sort((a,b)=>a.name.localeCompare(b.name,'ru'))};
 }

 function breadBreakdownHtml(demand){
  const root=document.querySelector('#costBreadBreakdown');
  if(!root)return;
  if(!demand.length){root.innerHTML='';root.hidden=true;return}
  root.hidden=false;
  root.innerHTML=`<div class="purchase-bread-breakdown-head"><strong>Хлеб по видам</strong><span>Расчёт ингредиентов начинается с этих количеств</span></div>
   <div class="purchase-bread-breakdown-list">${demand.map(row=>`<div><span>${productName(row.product)}</span><strong>${row.quantity} шт.</strong></div>`).join('')}</div>`;
 }

 function ingredientSourcesHtml(row){
  const sources=[...row.sources.values()];
  if(!sources.length)return '';
  return `<details class="purchase-ingredient-sources">
    <summary>Из каких видов хлеба</summary>
    <div>${sources.map(source=>`<p><span>${productName(source.product)} · ${source.pieces} шт.</span><strong>${niceQty(source.required,row.unit)}</strong></p>`).join('')}
    <p class="purchase-source-total"><span>Всего нужно</span><strong>${niceQty(row.required,row.unit)}</strong></p></div>
  </details>`;
 }

 renderPurchase=function(){
  if(window.panoraMoneyEditing?.active){
   const active=window.panoraMoneyEditing.element;
   if(active&&active.matches('[data-ingredient-price]'))return;
  }

  fillFilter();
  const {demand,rows}=buildTotals();
  const priceMap=costs();
  const pieces=demand.reduce((sum,row)=>sum+Number(row.quantity||0),0);
  let consumption=0,purchaseTotal=0;

  breadBreakdownHtml(demand);

  const body=$('#purchaseRows');
  body.innerHTML=rows.length?rows.map((row,index)=>{
   const buy=Math.max(0,row.required*(1+row.margin/100)-row.stock);
   const usedCost=row.required/factor(row.unit)*row.price;
   const buyCost=buy/factor(row.unit)*row.price;
   consumption+=usedCost;
   purchaseTotal+=buyCost;
   return `<tr>
    <td><strong>${row.name}</strong><small>Цена за ${row.unit==='g'?'1 кг':row.unit==='ml'?'1 л':'1 шт.'}</small>${ingredientSourcesHtml(row)}</td>
    <td>${niceQty(row.required,row.unit)}</td>
    <td><input data-cost-stock="${index}" type="number" min="0" step="0.01" value="${row.stock}"> ${row.unit}</td>
    <td><input data-cost-margin="${index}" type="number" min="0" step="0.1" value="${row.margin}">%</td>
    <td><strong>${niceQty(buy,row.unit)}</strong></td>
    <td><input class="ingredient-price" data-ingredient-price="${row.key}" type="text" inputmode="decimal" autocomplete="off" value="${row.price.toFixed(2)}"></td>
    <td><strong>${euroCost(buyCost)}</strong><small>использовано ${euroCost(usedCost)}</small></td>
   </tr>`;
  }).join(''):'<tr><td colspan="7">В выбранном периоде нет хлеба к выпечке.</td></tr>';

  $('#costPeriodPieces').textContent=`${pieces} шт.`;
  $('#costConsumptionTotal').textContent=euroCost(consumption);
  $('#costPurchaseTotal').textContent=euroCost(purchaseTotal);
  $('#costPerBread').textContent=`${euroCost(pieces?consumption/pieces:0)} / шт.`;

  $$('[data-ingredient-price]').forEach(input=>{
   const commit=()=>{
    const value=window.panoraParseDecimal?.(input.value);
    if(value===null){
     input.value=Number(priceMap[input.dataset.ingredientPrice]||0).toFixed(2);
     return;
    }
    priceMap[input.dataset.ingredientPrice]=value;
    input.value=value.toFixed(2);
    saveCosts(priceMap);
    window.dispatchEvent(new CustomEvent('panora:ingredient-costs-changed'));
    setTimeout(()=>{if(!window.panoraMoneyEditing?.active)renderPurchase()},0);
   };
   input.onblur=commit;
   input.onchange=null;
   input.onfocus=()=>requestAnimationFrame(()=>input.select());
  });

  $$('[data-cost-stock],[data-cost-margin]').forEach(input=>input.onchange=()=>{
   const row=rows[Number(input.dataset.costStock??input.dataset.costMargin)];
   if(!row)return;
   const latest=currentRecipes();
   Object.values(latest).flat().forEach(item=>{
    if(ingredientKey(item)!==row.key)return;
    if(input.dataset.costStock!==undefined)item.stock=Math.max(0,Number(input.value||0));
    else item.margin=Math.max(0,Number(input.value||0));
   });
   if(typeof recipes!=='undefined')recipes=latest;
   store('panora-recipes',latest);
   renderPurchase();
  });
 };

 filter.onchange=()=>{selected=filter.value;renderPurchase()};
 window.panoraSetPurchaseDates=dates=>{
  window.panoraPurchaseSelection=dates;
  localStorage.setItem(selectionKey,JSON.stringify(dates));
  selected='selected';
  renderPurchase();
 };
 window.addEventListener('panora:recipes-changed',()=>{if(!window.panoraMoneyEditing?.active)renderPurchase()});
 window.addEventListener('panora:order-cycle-updated',()=>{if(!window.panoraMoneyEditing?.active)renderPurchase()});
 renderPurchase();
})();
