/* Consolidated production demand by bake day and restaurant. */
(()=>{
  const root=document.querySelector('#dailyOrderSummary');if(!root)return;
  const openDays=new Set(),selectionKey='panora-purchase-selected-dates';
  const readSelected=()=>{try{return new Set(JSON.parse(localStorage.getItem(selectionKey)||'[]'))}catch{return new Set()}};
  let selectedDates=readSelected(),filter='upcoming';
  const today=()=>new Date().toISOString().slice(0,10);
  const text=()=>({
    ru:{title:'Сводный план производства',subtitle:'Общее количество по всем партнёрам. Отметьте даты для общего расчёта ингредиентов.',restaurants:'партнёров',new:'Новые',confirmed:'Подтверждено',total:'Всего к выпечке',details:'Партнёры и заказы',empty:'Нет дат в этом разделе',ingredients:'Ингредиенты за этот день',calculateSelected:'Рассчитать выбранные даты',selected:'Выбрано',days:'дн.',pcs:'шт.',cancelled:'Отменён',shipped:'Отгружен',upcoming:'Ближайшие',all:'Все даты',past:'Прошедшие',today:'Сегодня'},
    en:{title:'Consolidated bake plan',subtitle:'Total demand from all partners. Select dates for a combined ingredient calculation.',restaurants:'partners',new:'New',confirmed:'Confirmed',total:'Total to bake',details:'Partners and orders',empty:'No dates in this section',ingredients:'Ingredients for this day',calculateSelected:'Calculate selected dates',selected:'Selected',days:'days',pcs:'pcs',cancelled:'Cancelled',shipped:'Shipped',upcoming:'Upcoming',all:'All dates',past:'Past',today:'Today'},
    es:{title:'Plan consolidado de horneado',subtitle:'Demanda total de todos los socios. Seleccione fechas para calcular juntos los ingredientes.',restaurants:'socios',new:'Nuevos',confirmed:'Confirmados',total:'Total a hornear',details:'Socios y pedidos',empty:'No hay fechas en esta sección',ingredients:'Ingredientes de este día',calculateSelected:'Calcular fechas seleccionadas',selected:'Seleccionado',days:'días',pcs:'uds.',cancelled:'Cancelado',shipped:'Enviado',upcoming:'Próximas',all:'Todas',past:'Pasadas',today:'Hoy'}
  })[typeof lang==='string'?lang:'ru'];
  const name=id=>typeof productName==='function'?productName(id):id;
  const client=id=>typeof restaurant==='function'?(restaurant(id)?.name||'—'):'—';
  function groups(){
    const dates=[...new Set((typeof plans!=='undefined'?plans:[]).map(p=>p.bakeDate))].sort();
    return dates.map(date=>{
      const dayOrders=(typeof orders!=='undefined'?orders:[]).filter(o=>o.date===date&&o.status!=='cancelled');
      const products=[...new Set([...(typeof plans!=='undefined'?plans:[]).filter(p=>p.bakeDate===date).map(p=>p.product),...dayOrders.flatMap(o=>o.items||[]).map(i=>i.product)])];
      const totals=products.map(product=>{
        const quantity=status=>dayOrders.filter(o=>status(o.status)).flatMap(o=>o.items||[]).filter(i=>i.product===product).reduce((s,i)=>s+Number(i.quantity||0),0);
        return{product,pending:quantity(s=>s==='submitted'),confirmed:quantity(s=>s==='confirmed'||s==='shipped'),total:quantity(()=>true)}
      });
      return{date,orders:dayOrders,restaurants:new Set(dayOrders.map(o=>o.restaurantId)).size,totals,total:totals.reduce((s,p)=>s+p.total,0)}
    }).filter(day=>day.orders.length);
  }
  function render(){
    root.querySelectorAll('details[data-summary-date][open]').forEach(d=>openDays.add(d.dataset.summaryDate));
    const tx=text(),allDays=groups(),now=today(),available=new Set(allDays.map(d=>d.date));
    selectedDates=new Set([...selectedDates].filter(d=>available.has(d)));
    const days=allDays.filter(d=>filter==='all'||(filter==='upcoming'?d.date>=now:d.date<now));
    const selectedTotal=allDays.filter(d=>selectedDates.has(d.date)).reduce((s,d)=>s+d.total,0);
    const cards=days.map(day=>`<article class="daily-summary-card ${selectedDates.has(day.date)?'selected':''} ${day.date===now?'is-today':''}">
      <div class="daily-summary-head">
        <label class="daily-date-select"><input type="checkbox" data-daily-select="${day.date}" ${selectedDates.has(day.date)?'checked':''}><span></span></label>
        <div><strong>${new Intl.DateTimeFormat(typeof lang==='string'?lang:'ru',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(day.date+'T12:00:00'))}${day.date===now?` <i>${tx.today}</i>`:''}</strong><span>${day.restaurants} ${tx.restaurants}</span></div>
        <b>${day.total} ${tx.pcs}</b>
      </div>
      <div class="daily-product-grid">
        <div class="daily-product-labels"><span></span><span>${tx.new}</span><span>${tx.confirmed}</span><span>${tx.total}</span></div>
        ${day.totals.map(p=>`<div class="daily-product-row"><strong>${name(p.product)}</strong><button type="button" class="pending" data-open-orders="${day.date}">${p.pending}</button><span>${p.confirmed}</span><b>${p.total} ${tx.pcs}</b></div>`).join('')}
      </div>
      <details data-summary-date="${day.date}" ${openDays.has(day.date)?'open':''}>
        <summary>${tx.details}</summary>
        <div class="daily-restaurant-list">${day.orders.map(o=>`<div><span><strong>${client(o.restaurantId)}</strong><small>PN-${String(o.number).padStart(4,'0')}</small></span><span>${(o.items||[]).map(i=>`${name(i.product)} — ${i.quantity} ${tx.pcs}`).join('<br>')}</span><em class="${o.status}">${o.status==='submitted'?tx.new:o.status==='shipped'?tx.shipped:tx.confirmed}</em></div>`).join('')}</div>
      </details>
      <button type="button" class="daily-ingredients" data-daily-purchase="${day.date}">${tx.ingredients}</button>
    </article>`).join('');
    root.innerHTML=`<header><div><h3>${tx.title}</h3><p>${tx.subtitle}</p><nav class="daily-summary-tabs"><button data-summary-filter="upcoming" class="${filter==='upcoming'?'active':''}">${tx.upcoming}</button><button data-summary-filter="all" class="${filter==='all'?'active':''}">${tx.all}</button><button data-summary-filter="past" class="${filter==='past'?'active':''}">${tx.past}</button></nav></div>${allDays.length?`<div class="daily-summary-selection"><strong>${tx.selected}: <span>${selectedDates.size}</span> ${tx.days}${selectedDates.size?` · ${selectedTotal} ${tx.pcs}`:''}</strong><button type="button" data-calculate-selected ${selectedDates.size?'':'disabled'}>${tx.calculateSelected}</button></div>`:''}</header>${days.length?`<div class="daily-summary-list">${cards}</div>`:`<p class="daily-summary-empty">${tx.empty}</p>`}`;
    root.querySelectorAll('[data-summary-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.summaryFilter;render()});
    root.querySelectorAll('details[data-summary-date]').forEach(d=>d.addEventListener('toggle',()=>{d.open?openDays.add(d.dataset.summaryDate):openDays.delete(d.dataset.summaryDate)}));
    const openPurchase=dates=>{localStorage.setItem(selectionKey,JSON.stringify(dates));window.panoraPurchaseSelection=dates;document.querySelector('[data-view="purchase"]')?.click();if(typeof window.panoraSetPurchaseDates==='function')window.panoraSetPurchaseDates(dates);else if(typeof renderPurchase==='function')renderPurchase()};
    root.querySelectorAll('[data-daily-select]').forEach(input=>input.onchange=()=>{input.checked?selectedDates.add(input.dataset.dailySelect):selectedDates.delete(input.dataset.dailySelect);localStorage.setItem(selectionKey,JSON.stringify([...selectedDates]));render()});
    root.querySelector('[data-calculate-selected]')?.addEventListener('click',()=>openPurchase([...selectedDates]));
    root.querySelectorAll('[data-daily-purchase]').forEach(b=>b.onclick=()=>openPurchase([b.dataset.dailyPurchase]));
    root.querySelectorAll('[data-open-orders]').forEach(b=>b.onclick=()=>{const d=b.closest('.daily-summary-card')?.querySelector('details');if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'center'})}});
  }
  const oldAll=window.renderAll;window.renderAll=function(){oldAll?.();render()};
  const oldCommerce=window.renderCommerce;window.renderCommerce=function(){oldCommerce?.();render()};
  document.querySelector('#adminLanguage')?.addEventListener('change',render);
  render();
})();
