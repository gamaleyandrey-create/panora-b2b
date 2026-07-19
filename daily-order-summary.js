/* Consolidated production demand by bake day and restaurant. */
(()=>{
  const root=document.querySelector('#dailyOrderSummary');if(!root)return;
  const text=()=>({
    ru:{title:'Сводный план по дням выпечки',subtitle:'Общее количество по всем ресторанам. Новые заказы включены в итог и выделены отдельно.',restaurants:'ресторанов',new:'Новые',confirmed:'Подтверждено',total:'Всего к выпечке',details:'Заказчики и состав',empty:'Нет предстоящих заказов',ingredients:'Рассчитать ингредиенты',pcs:'шт.',cancelled:'Отменён',shipped:'Отгружен'},
    en:{title:'Consolidated bake plan',subtitle:'Total demand from all restaurants. New orders are included and shown separately.',restaurants:'restaurants',new:'New',confirmed:'Confirmed',total:'Total to bake',details:'Customers and items',empty:'No upcoming orders',ingredients:'Calculate ingredients',pcs:'pcs',cancelled:'Cancelled',shipped:'Shipped'},
    es:{title:'Plan consolidado de horneado',subtitle:'Demanda total de todos los restaurantes. Los pedidos nuevos están incluidos y separados.',restaurants:'restaurantes',new:'Nuevos',confirmed:'Confirmados',total:'Total a hornear',details:'Clientes y productos',empty:'No hay pedidos próximos',ingredients:'Calcular ingredientes',pcs:'uds.',cancelled:'Cancelado',shipped:'Enviado'}
  })[typeof lang==='string'?lang:'ru'];
  const name=id=>typeof productName==='function'?productName(id):id;
  const client=id=>typeof restaurant==='function'?(restaurant(id)?.name||'—'):'—';
  function groups(){
    const dates=[...new Set((typeof plans!=='undefined'?plans:[]).map(p=>p.bakeDate))].sort();
    return dates.map(date=>{
      const dayOrders=(typeof orders!=='undefined'?orders:[]).filter(o=>o.date===date&&o.status!=='cancelled');
      const products=[...new Set([...(typeof plans!=='undefined'?plans:[]).filter(p=>p.bakeDate===date).map(p=>p.product),...dayOrders.flatMap(o=>o.items||[]).map(i=>i.product)])];
      const totals=products.map(product=>{const quantity=(status)=>dayOrders.filter(o=>status(o.status)).flatMap(o=>o.items||[]).filter(i=>i.product===product).reduce((s,i)=>s+Number(i.quantity||0),0);return{product,pending:quantity(s=>s==='submitted'),confirmed:quantity(s=>s==='confirmed'||s==='shipped'),total:quantity(()=>true)}});
      return{date,orders:dayOrders,restaurants:new Set(dayOrders.map(o=>o.restaurantId)).size,totals,total:totals.reduce((s,p)=>s+p.total,0)};
    }).filter(day=>day.orders.length);
  }
  function render(){
    const tx=text(),days=groups();
    root.innerHTML=`<header><div><span class="kicker">PANORA</span><h3>${tx.title}</h3><p>${tx.subtitle}</p></div></header>${days.length?`<div class="daily-summary-list">${days.map(day=>`<article class="daily-summary-card"><div class="daily-summary-head"><div><strong>${new Intl.DateTimeFormat(typeof lang==='string'?lang:'ru',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(day.date+'T12:00:00'))}</strong><span>${day.restaurants} ${tx.restaurants}</span></div><b>${day.total} ${tx.pcs}</b></div><div class="daily-product-grid"><div class="daily-product-labels"><span></span><span>${tx.new}</span><span>${tx.confirmed}</span><span>${tx.total}</span></div>${day.totals.map(p=>`<div class="daily-product-row"><strong>${name(p.product)}</strong><span class="pending">${p.pending}</span><span>${p.confirmed}</span><b>${p.total} ${tx.pcs}</b></div>`).join('')}</div><details><summary>${tx.details}</summary><div class="daily-restaurant-list">${day.orders.map(o=>`<div><span><strong>${client(o.restaurantId)}</strong><small>PN-${String(o.number).padStart(4,'0')}</small></span><span>${(o.items||[]).map(i=>`${name(i.product)} — ${i.quantity} ${tx.pcs}`).join('<br>')}</span><em class="${o.status}">${o.status==='submitted'?tx.new:o.status==='shipped'?tx.shipped:tx.confirmed}</em></div>`).join('')}</div></details><button type="button" class="daily-ingredients" data-daily-purchase="${day.date}">${tx.ingredients}</button></article>`).join('')}</div>`:`<p class="daily-summary-empty">${tx.empty}</p>`}`;
    root.querySelectorAll('[data-daily-purchase]').forEach(button=>button.onclick=()=>{purchaseDateFilter=button.dataset.dailyPurchase;document.querySelector('[data-view="purchase"]')?.click();if(typeof renderPurchase==='function')renderPurchase()});
  }
  const oldAll=window.renderAll;window.renderAll=function(){oldAll?.();render()};
  const oldCommerce=window.renderCommerce;window.renderCommerce=function(){oldCommerce?.();render()};
  document.querySelector('#adminLanguage')?.addEventListener('change',render);render();
})();
