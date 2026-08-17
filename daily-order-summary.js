/* Consolidated production demand by bake day and restaurant. */
(()=>{
  const root=document.querySelector('#dailyOrderSummary');if(!root)return;
  const openDays=new Set(),selectionKey='panora-purchase-selected-dates';
  const readSelected=()=>{try{return new Set(JSON.parse(localStorage.getItem(selectionKey)||'[]'))}catch{return new Set()}};
  let selectedDates=readSelected(),filter='active';
  const today=()=>{const d=new Date(),pad=v=>String(v).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
  const text=()=>({
    ru:{title:'Сводный план производства',subtitle:'Общее количество по всем партнёрам. Отметьте даты для общего расчёта ингредиентов.',restaurants:'партнёров',new:'Новые',confirmed:'Подтверждено',total:'Всего к выпечке',details:'Партнёры и заказы',empty:'Нет дат в этом разделе',ingredients:'Ингредиенты за этот день',calculateSelected:'Рассчитать выбранные даты',selected:'Выбрано',days:'дн.',pcs:'шт.',cancelled:'Отменён',shipped:'Отгружен',active:'Активные',archive:'Архив',today:'Сегодня'},
    en:{title:'Consolidated bake plan',subtitle:'Total demand from all partners. Select dates for a combined ingredient calculation.',restaurants:'partners',new:'New',confirmed:'Confirmed',total:'Total to bake',details:'Partners and orders',empty:'No dates in this section',ingredients:'Ingredients for this day',calculateSelected:'Calculate selected dates',selected:'Selected',days:'days',pcs:'pcs',cancelled:'Cancelled',shipped:'Shipped',active:'Active',archive:'Archive',today:'Today'},
    es:{title:'Plan consolidado de horneado',subtitle:'Demanda total de todos los socios. Seleccione fechas para calcular juntos los ingredientes.',restaurants:'socios',new:'Nuevos',confirmed:'Confirmados',total:'Total a hornear',details:'Socios y pedidos',empty:'No hay fechas en esta sección',ingredients:'Ingredientes de este día',calculateSelected:'Calcular fechas seleccionadas',selected:'Seleccionado',days:'días',pcs:'uds.',cancelled:'Cancelado',shipped:'Enviado',active:'Activas',archive:'Archivo',today:'Hoy'}
  })[typeof lang==='string'?lang:'ru'];
  const name=id=>typeof productName==='function'?productName(id):id;
  const client=id=>typeof restaurant==='function'?(restaurant(id)?.name||'—'):'—';
  function groups(){
    const allPlans=(typeof plans!=='undefined'?plans:[]);
    const allOrders=(typeof orders!=='undefined'?orders:[]);
    const dates=[...new Set([...allPlans.map(p=>p.bakeDate),...allOrders.map(o=>o.date)].filter(Boolean))].sort();
    return dates.map(date=>{
      const dateOrders=allOrders.filter(o=>o.date===date);
      const activeOrders=dateOrders.filter(o=>!['shipped','cancelled'].includes(o.status));
      const completedOrders=dateOrders.filter(o=>['shipped','cancelled'].includes(o.status));
      const products=[...new Set([
        ...allPlans.filter(p=>p.bakeDate===date).map(p=>p.product),
        ...activeOrders.flatMap(o=>o.items||[]).map(i=>i.product)
      ])];
      const totals=products.map(product=>{
        const quantity=status=>activeOrders
          .filter(o=>status(o.status))
          .flatMap(o=>o.items||[])
          .filter(i=>i.product===product)
          .reduce((sum,i)=>sum+Number(i.quantity||0),0);
        return {
          product,
          pending:quantity(status=>status==='submitted'),
          confirmed:quantity(status=>status==='confirmed'),
          total:quantity(()=>true)
        };
      }).filter(row=>row.total>0);
      return {
        date,
        orders:activeOrders,
        completedOrders,
        restaurants:new Set(activeOrders.map(o=>o.restaurantId)).size,
        totals,
        total:totals.reduce((sum,row)=>sum+row.total,0)
      };
    }).filter(day=>day.orders.length||day.completedOrders.length);
  }
  function render(){
    root.querySelectorAll('details[data-summary-date][open]').forEach(d=>openDays.add(d.dataset.summaryDate));
    const tx=text(),allDays=groups(),now=today();
    const activeDays=allDays.filter(d=>d.date>=now&&d.orders.length>0);
    const archiveDays=allDays.filter(d=>d.date<now||(d.date>=now&&d.orders.length===0&&d.completedOrders.length>0));
    const availableActive=new Set(activeDays.map(d=>d.date));
    selectedDates=new Set([...selectedDates].filter(d=>availableActive.has(d)));
    const days=filter==='archive'?archiveDays:activeDays;
    const selectedTotal=activeDays.filter(d=>selectedDates.has(d.date)).reduce((s,d)=>s+d.total,0);
    const isArchive=filter==='archive';
    const cards=days.map(day=>{
      const displayOrders=isArchive?day.completedOrders:day.orders;
      const shippedCount=day.completedOrders.filter(order=>order.status==='shipped').length;
      const cancelledCount=day.completedOrders.filter(order=>order.status==='cancelled').length;
      return `<article class="daily-summary-card ${selectedDates.has(day.date)?'selected':''} ${day.date===now?'is-today':''} ${isArchive?'is-archive':''}">
      <div class="daily-summary-head">
        ${isArchive?'<span class="daily-archive-mark" aria-hidden="true">✓</span>':`<label class="daily-date-select"><input type="checkbox" data-daily-select="${day.date}" ${selectedDates.has(day.date)?'checked':''}><span></span></label>`}
        <div><strong>${new Intl.DateTimeFormat(typeof lang==='string'?lang:'ru',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(day.date+'T12:00:00'))}${day.date===now?` <i>${tx.today}</i>`:''}</strong><span>${day.restaurants} ${tx.restaurants}</span></div>
        <b>${isArchive?day.completedOrders.flatMap(o=>o.items||[]).reduce((sum,i)=>sum+Number(i.quantity||0),0):day.total} ${tx.pcs}</b>
      </div>
      <div class="daily-product-grid">
        <div class="daily-product-labels"><span></span><span>${isArchive?(lang==='ru'?'Отменено':lang==='es'?'Cancelado':'Cancelled'):tx.new}</span><span>${isArchive?(lang==='ru'?'Отгружено':lang==='es'?'Enviado':'Shipped'):tx.confirmed}</span><span>${isArchive?(lang==='ru'?'Всего завершено':lang==='es'?'Total completado':'Total completed'):tx.total}</span></div>
        ${(()=>{
          if(!isArchive)return day.totals.map(p=>`<div class="daily-product-row"><strong>${name(p.product)}</strong><button type="button" class="pending" data-open-orders="${day.date}">${p.pending}</button><span>${p.confirmed}</span><b>${p.total} ${tx.pcs}</b></div>`).join('');
          const completedProducts=[...new Set(day.completedOrders.flatMap(o=>o.items||[]).map(i=>i.product))];
          return completedProducts.map(product=>{
            const shipped=day.completedOrders.filter(o=>o.status==='shipped').flatMap(o=>o.items||[]).filter(i=>i.product===product).reduce((sum,i)=>sum+Number(i.quantity||0),0);
            const cancelled=day.completedOrders.filter(o=>o.status==='cancelled').flatMap(o=>o.items||[]).filter(i=>i.product===product).reduce((sum,i)=>sum+Number(i.quantity||0),0);
            const total=shipped+cancelled;
            return `<div class="daily-product-row"><strong>${name(product)}</strong><span>${cancelled}</span><span>${shipped}</span><b>${total} ${tx.pcs}</b></div>`;
          }).join('');
        })()}
      </div>
      ${!isArchive&&day.completedOrders.length?`<div class="daily-completed-summary"><span>${lang==='ru'?'Завершено сегодня':lang==='es'?'Completados hoy':'Completed today'}: <strong>${day.completedOrders.length}</strong></span>${shippedCount?`<small>${lang==='ru'?'отгружено':lang==='es'?'enviados':'shipped'} ${shippedCount}</small>`:''}${cancelledCount?`<small>${lang==='ru'?'отменено':lang==='es'?'cancelados':'cancelled'} ${cancelledCount}</small>`:''}</div>`:''}
      <details data-summary-date="${day.date}" ${openDays.has(day.date)?'open':''}>
        <summary>${isArchive?(lang==='ru'?'Архивные заказы':lang==='es'?'Pedidos archivados':'Archived orders'):tx.details}</summary>
        <div class="daily-restaurant-list">${displayOrders.map(o=>`<div><span><strong>${client(o.restaurantId)}</strong><small>PN-${String(o.number).padStart(4,'0')}</small></span><span>${(o.items||[]).map(i=>`${name(i.product)} — ${i.quantity} ${tx.pcs}`).join('<br>')||'—'}</span><em class="${o.status}">${o.status==='submitted'?tx.new:o.status==='shipped'?tx.shipped:o.status==='cancelled'?tx.cancelled:tx.confirmed}</em></div>`).join('')}</div>
      </details>
      ${isArchive?'':`<button type="button" class="daily-ingredients" data-daily-purchase="${day.date}">${tx.ingredients}</button>`}
    </article>`;
    }).join('');
    root.innerHTML=`<header><div><h3>${tx.title}</h3><p>${tx.subtitle}</p><nav class="daily-summary-tabs daily-main-tabs"><button data-summary-filter="active" class="${filter==='active'?'active':''}"><span>${tx.active}</span><b>${activeDays.length}</b></button><button data-summary-filter="archive" class="${filter==='archive'?'active':''}"><span>${tx.archive}</span><b>${archiveDays.length}</b></button></nav></div>${allDays.length&&filter==='active'?`<div class="daily-summary-selection"><strong>${tx.selected}: <span>${selectedDates.size}</span> ${tx.days}${selectedDates.size?` · ${selectedTotal} ${tx.pcs}`:''}</strong><button type="button" data-calculate-selected ${selectedDates.size?'':'disabled'}>${tx.calculateSelected}</button></div>`:''}</header>${days.length?`<div class="daily-summary-list">${cards}</div>`:`<p class="daily-summary-empty">${tx.empty}</p>`}`;
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
