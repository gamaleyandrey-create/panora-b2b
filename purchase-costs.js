(function(){
 const costs=()=>{try{return JSON.parse(localStorage.getItem('panora-ingredient-costs'))||{}}catch{return{}}};
 const saveCosts=value=>localStorage.setItem('panora-ingredient-costs',JSON.stringify(value));
 const euroCost=value=>new Intl.NumberFormat(lang==='ru'?'ru-RU':lang==='es'?'es-ES':'en-GB',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0)+' €';
 const factor=unit=>unit==='g'||unit==='ml'?1000:1;
 const filter=$('#costBakeFilter');if(!filter)return;let selected='all';
 function availableDates(){return [...new Set(plans.map(plan=>plan.bakeDate))].sort()}
 function fillFilter(){const dates=availableDates();if(selected!=='all'&&!dates.includes(selected))selected='all';filter.innerHTML=`<option value="all">Все даты вместе</option>`+dates.map((date,index)=>`<option value="${date}">${index===0?'Ближайшая выпечка':`Выпечка ${index+1}`} — ${fmt(date,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</option>`).join('');filter.value=selected}
 function periodPlans(){return selected==='all'?plans:plans.filter(plan=>plan.bakeDate===selected)}
 function totals(){
  const rows={},priceMap=costs();periodPlans().forEach(plan=>(recipes[plan.product]||[]).forEach(item=>{const key=`${item.name}|${item.unit}`;rows[key]??={key,name:item.name,unit:item.unit,required:0,stock:Number(item.stock||0),margin:Number(item.margin||5),price:Number(priceMap[key]||0)};rows[key].required+=Number(plan.planned||0)*Number(item.qty||0)}));return Object.values(rows)
 }
 renderPurchase=function(){
  fillFilter();
  const rows=totals(),priceMap=costs(),pieces=periodPlans().reduce((sum,plan)=>sum+Number(plan.planned||0),0);let consumption=0,purchase=0;
  const body=$('#purchaseRows');body.innerHTML=rows.length?rows.map((row,index)=>{const buy=Math.max(0,row.required*(1+row.margin/100)-row.stock),usedCost=row.required/factor(row.unit)*row.price,buyCost=buy/factor(row.unit)*row.price;consumption+=usedCost;purchase+=buyCost;return `<tr><td><strong>${row.name}</strong><small>Цена за ${row.unit==='g'?'1 кг':row.unit==='ml'?'1 л':'1 шт.'}</small></td><td>${niceQty(row.required,row.unit)}</td><td><input data-cost-stock="${index}" type="number" min="0" step="0.01" value="${row.stock}"> ${row.unit}</td><td><input data-cost-margin="${index}" type="number" min="0" step="0.1" value="${row.margin}">%</td><td><strong>${niceQty(buy,row.unit)}</strong></td><td><input class="ingredient-price" data-ingredient-price="${row.key}" type="number" min="0" step="0.01" value="${row.price.toFixed(2)}"></td><td><strong>${euroCost(buyCost)}</strong><small>использовано ${euroCost(usedCost)}</small></td></tr>`}).join(''):'<tr><td colspan="7">В выбранном периоде нет запланированной выпечки.</td></tr>';
  $('#costPeriodPieces').textContent=`${pieces} шт.`;$('#costConsumptionTotal').textContent=euroCost(consumption);$('#costPurchaseTotal').textContent=euroCost(purchase);$('#costPerBread').textContent=`${euroCost(pieces?consumption/pieces:0)} / шт.`;
  $$('[data-ingredient-price]').forEach(input=>input.onchange=()=>{priceMap[input.dataset.ingredientPrice]=Math.max(0,Number(input.value||0));saveCosts(priceMap);renderPurchase()});
  $$('[data-cost-stock],[data-cost-margin]').forEach(input=>input.onchange=()=>{const row=rows[Number(input.dataset.costStock??input.dataset.costMargin)];Object.values(recipes).flat().filter(item=>item.name===row.name&&item.unit===row.unit).forEach(item=>{if(input.dataset.costStock!==undefined)item.stock=Math.max(0,Number(input.value||0));else item.margin=Math.max(0,Number(input.value||0))});store('panora-recipes',recipes);renderPurchase()})
 };
 filter.onchange=()=>{selected=filter.value;renderPurchase()};
 renderPurchase();
})();
