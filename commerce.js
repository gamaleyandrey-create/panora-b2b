const cRead = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
};
let restaurants = cRead("panora-restaurants", []),
  orders = cRead("panora-orders", []),
  payments = cRead("panora-payments", []),
  deliveryNotes = cRead("panora-delivery-notes", []);
let bakerySettings = cRead("panora-bakery-settings", {
  legalName: "Panora",
  taxId: "",
  address: "",
  email: "gamaley1@gmail.com",
  phone: "+34611187640",
  taxRate: 0,
});
let reminderLog = cRead("panora-reminder-log", {});
const cSave = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
  if (key === "panora-restaurants") window.panoraCloud?.queueRestaurants();
  if (key === "panora-orders") window.panoraCloud?.queueOrders();
  if (key === "panora-production-plans") window.panoraCloud?.queuePlans();
  if (key === "panora-delivery-notes" || key === "panora-payments")
    window.panoraCloud?.queueFinance();
};
const commerceDateTimeValue = (date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
const orderDateLabel = (value, weekday = false) => {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`),
    locale = lang === "es" ? "es-ES" : lang === "en" ? "en-GB" : "ru-RU";
  return new Intl.DateTimeFormat(locale, {
    weekday: weekday ? "long" : undefined,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};
const euro = (n) => {
  const value = new Intl.NumberFormat(
    lang === "ru" ? "ru-RU" : lang === "es" ? "es-ES" : "en-GB",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  ).format(Number(n) || 0);
  return lang === "ru" ? `${value} €` : `€ ${value}`;
};
const restaurant = (id) => restaurants.find((r) => r.id === id);
const activeRestaurants = () => restaurants.filter((r) => !r.deletedAt);
const commerceProducts = () => {
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem("panora-products") || "[]"); } catch {}
  const registry = typeof productRegistry !== "undefined" && Array.isArray(productRegistry)
    ? productRegistry
    : saved;
  return registry.filter((product) => product && product.active !== false && !product.deletedAt);
};
const commerceProductLabel = (id) => {
  const product = commerceProducts().find((entry) => entry.id === id);
  return product?.names?.[lang] || product?.names?.ru || product?.name ||
    (id === "plain" ? "Льняной бездрожжевой хлеб с семенами" :
      id === "pumpkin" ? "Тыквенный бездрожжевой хлеб с семенами" : id);
};
const orderSubtotal = (o) =>
  o.items.reduce(
    (sum, i) =>
      sum +
      i.quantity *
        Number((o.prices || restaurant(o.restaurantId).prices)[i.product]),
    0,
  );
const taxEnabled = (o) =>
  o.taxEnabled !== undefined
    ? Boolean(o.taxEnabled)
    : Number(o.taxRate ?? bakerySettings.taxRate) > 0;
const orderTotal = (o) =>
  orderSubtotal(o) *
  (1 + (taxEnabled(o) ? Number(o.taxRate ?? bakerySettings.taxRate) : 0) / 100);
const shippedFor = (id) =>
  deliveryNotes
    .filter((n) => n.restaurantId === id)
    .reduce((s, n) => s + n.total, 0);
const paymentConfirmed = (payment) => payment.confirmed !== false;
const paidFor = (id) =>
  payments
    .filter((p) => p.restaurantId === id && paymentConfirmed(p))
    .reduce((s, p) => s + p.amount, 0);
function syncPlansFromOrders() {
  const current = cRead("panora-production-plans", []),
    grouped = {};
  orders
    .filter((o) => o.status !== "cancelled")
    .forEach((o) =>
      o.items.forEach((i) => {
        const key = `${o.date}:${i.product}`;
        grouped[key] ??= {
          bakeDate: o.date,
          deliveryDate: o.deliveryDate || o.date,
          product: i.product,
          ordered: 0,
        };
        grouped[key].ordered += Number(i.quantity || 0);
      }),
    );
  Object.values(grouped).forEach((g) => {
    let p = current.find(
      (x) => x.bakeDate === g.bakeDate && x.product === g.product,
    );
    if (!p) {
      const cutoff = new Date(`${g.bakeDate}T09:00:00`);
      cutoff.setHours(cutoff.getHours() - 48);
      p = {
        id: crypto.randomUUID(),
        bakeDate: g.bakeDate,
        deliveryDate: g.deliveryDate,
        product: g.product,
        planned: g.ordered,
        ordered: g.ordered,
        cutoff: commerceDateTimeValue(cutoff),
        open: cutoff > new Date(),
      };
      current.push(p);
    } else {
      p.ordered = g.ordered;
      // Planned quantity is controlled by the bakery. Order polling updates only
      // the ordered quantity; otherwise local plan and cloud plan can fight every 2 seconds.
      p.planned = Number(p.planned || 0);
      p.deliveryDate = p.deliveryDate || g.deliveryDate;
    }
  });
  current.forEach((p) => {
    const key = `${p.bakeDate}:${p.product}`;
    if (!grouped[key]) p.ordered = 0;
  });
  cSave("panora-production-plans", current);
  plans = current;
  return current;
}
const commerceEscape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const normalizePartnerType=value=>{
  const raw=String(value??'').trim().toLowerCase();
  const aliases={restaurant:'restaurant','ресторан':'restaurant',restaurante:'restaurant',shop:'shop','магазин':'shop',tienda:'shop',hotel:'hotel','отель':'hotel',cafe:'cafe','кафе':'cafe','café':'cafe',catering:'catering','кейтеринг':'catering',cátering:'catering',other:'other','другое':'other',otro:'other'};
  return aliases[raw]||'restaurant';
};
const partnerTypeLabel=type=>({restaurant:'Ресторан',shop:'Магазин',hotel:'Отель',cafe:'Кафе',catering:'Кейтеринг',other:'Другое'}[normalizePartnerType(type)]||'Ресторан');
const orderCompactDate=value=>{
  if(!value)return '—';
  try{
    return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${String(value).slice(0,10)}T12:00:00`)).replace(' г.','');
  }catch{return orderDateLabel(value)}
};
let orderPartnerTypeFilter='all',orderPartnerNameFilter='all',orderDateFromFilter='',orderDateToFilter='',orderFilterOpen=false,orderStatusFilter='all';
const orderPartnerHtml=partner=>partner
  ? `<div class="order-partner"><strong class="order-partner-name">${commerceEscape(partner.name)}</strong><span class="partner-type partner-type-${normalizePartnerType(partner.partnerType)}">${partnerTypeLabel(partner.partnerType)}</span></div>`
  : '<span>—</span>';
const partnerContactHtml=r=>{
  const rows=[r.phone&&['Телефон',r.phone],r.whatsapp&&['WhatsApp',r.whatsapp],r.telegram&&['Telegram',r.telegram],...(Array.isArray(r.extraMessengers)?r.extraMessengers:[]).map(item=>[item.name,item.contact])].filter(Boolean);
  return rows.length?`<div class="partner-contacts">${rows.map(([name,value])=>`<span><b>${commerceEscape(name)}</b><small>${commerceEscape(value)}</small></span>`).join('')}</div>`:'<p class="partner-empty">Контакты не указаны</p>';
};
function fillRestaurants() {
  const options = activeRestaurants()
    .map((r) => `<option value="${commerceEscape(r.id)}">${commerceEscape(r.name)}</option>`)
    .join("");
  document.querySelector("#orderRestaurant").innerHTML = options;
  document.querySelector("#paymentRestaurant").innerHTML = options;
}
function renderRestaurants() {
  const root = document.querySelector("#restaurantCards"),
    active = activeRestaurants(),
    removed = restaurants.filter((r) => r.deletedAt);
  root.innerHTML =
    (active.length
      ? active
          .map(
            (r) =>
              `<article class="restaurant-card"><div class="restaurant-card-head"><span class="tag">${partnerTypeLabel(r.partnerType)}</span><button class="restaurant-delete" data-delete-restaurant="${r.id}" type="button">Удалить</button></div><h3>${commerceEscape(r.name)}</h3><p>${commerceEscape(r.email)}<br>${commerceEscape(r.address || "Адрес доставки не указан")}</p>${partnerContactHtml(r)}${(r.legalName||r.taxId||r.billingAddress)?`<details class="partner-requisites"><summary>Реквизиты</summary><p><strong>${commerceEscape(r.legalName||r.name)}</strong>${r.taxId?`<br>NIF / CIF: ${commerceEscape(r.taxId)}`:''}${r.billingAddress?`<br>${commerceEscape(r.billingAddress)}`:''}</p></details>`:''}${commerceProducts().map((product) => `<label class="price-row"><span>${commerceProductLabel(product.id)}</span><span><input data-price="${r.id}:${product.id}" type="number" min="0" step="0.01" value="${Number(r.prices?.[product.id] ?? product.basePrice ?? product.price ?? 0).toFixed(2)}"> €</span></label>`).join("")}<div class="debt-row"><span>Задолженность</span><strong>${euro(shippedFor(r.id) - paidFor(r.id))}</strong></div></article>`,
          )
          .join("")
      : '<div class="empty-row">Добавьте первого партнёра и назначьте ему индивидуальные цены.</div>') +
    (removed.length
      ? `<section class="removed-restaurants"><h3>Удалённые партнёры</h3>${removed.map((r) => `<div><span><strong>${commerceEscape(r.name)}</strong><small>${commerceEscape(r.email)}</small></span><button data-restore-restaurant="${r.id}" type="button">Восстановить</button></div>`).join("")}</section>`
      : "");
  document.querySelectorAll("[data-price]").forEach(
    (i) =>
      (i.onchange = () => {
        const [id, pid] = i.dataset.price.split(":");
        restaurant(id).prices[pid] = Number(i.value);
        cSave("panora-restaurants", restaurants);
        renderCommerce();
      }),
  );
  document
    .querySelectorAll("[data-delete-restaurant]")
    .forEach(
      (b) => (b.onclick = () => deleteRestaurant(b.dataset.deleteRestaurant)),
    );
  document
    .querySelectorAll("[data-restore-restaurant]")
    .forEach(
      (b) => (b.onclick = () => restoreRestaurant(b.dataset.restoreRestaurant)),
    );
  fillRestaurants();
}
function deleteRestaurant(id) {
  const r = restaurant(id);
  if (
    !r ||
    !confirm(
      `Удалить партнёра «${r.name}» из активных клиентов? Заказы, накладные и задолженность сохранятся.`,
    )
  )
    return;
  r.deletedAt = new Date().toISOString();
  cSave("panora-restaurants", restaurants);
  renderCommerce();
}
function restoreRestaurant(id) {
  const r = restaurant(id);
  if (!r) return;
  delete r.deletedAt;
  cSave("panora-restaurants", restaurants);
  renderCommerce();
}
function orderStatus(o) {
  return (
    {
      submitted: "Новый заказ",
      confirmed: "Подтверждён",
      shipped: "Отгружен",
      cancelled: "Отменён",
    }[o.status] || o.status
  );
}
function customerConfirmationHtml(order) {
  const note = deliveryNotes.find((item) => item.orderId === order.id);
  const confirmedAt = note?.customerConfirmedAt || note?.offlineProof?.receivedAt;
  if (!confirmedAt) return "";
  const safe = (value) =>
    String(value || "").replace(
      /[&<>"']/g,
      (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
    );
  const receiver = note.customerReceiver || note.offlineProof?.receiver || "";
  let date = confirmedAt;
  try {
    date = new Date(confirmedAt).toLocaleString("ru-RU", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch (_) {}
  const trayInfo = note.customerTraysReceived == null
    ? ""
    : `<br>Лотки: принято ${Number(note.customerTraysReceived)} · возвращено ${Number(note.customerTraysReturned || 0)} · осталось ${Number(note.trayBalanceAfter || 0)}`;
  return `<small class="customer-confirmed">✓ Получено партнёром${receiver ? ` · ${safe(receiver)}` : ""}<br>${safe(date)}${trayInfo}</small>`;
}
function orderActions(o) {
  const step=(n,label,state)=>`<span class="order-flow-step ${state}" aria-label="Этап ${n}: ${label}"><b>${state==='done'?'✓':n}</b><span>${label}</span></span>`;
  if (o.status === "cancelled")
    return `<div class="order-flow order-flow-cancelled"><span>Заказ отменён</span></div>`;
  if (o.status === "shipped")
    return `<div class="order-flow">${step(1,'Подтвердить','done')}${step(2,'Отгрузить','done')}${step(3,'Накладная','current')}</div><div class="order-flow-actions"><button class="action-small primary-flow" data-note="${o.id}">Открыть накладную</button><button class="action-small" data-delivery-qr="${o.id}">QR-код</button></div>`;
  if (o.status === "submitted")
    return `<div class="order-flow">${step(1,'Подтвердить','current')}${step(2,'Отгрузить','next')}${step(3,'Накладная','next')}</div><div class="order-flow-actions"><button class="action-small primary-flow" data-confirm="${o.id}">Подтвердить заказ</button><button class="action-small danger-quiet" data-cancel-order="${o.id}">Отменить</button></div>`;
  return `<div class="order-flow">${step(1,'Подтвердить','done')}${step(2,'Отгрузить','current')}${step(3,'Накладная','next')}</div><div class="order-flow-actions"><button class="action-small ship primary-flow" data-ship="${o.id}" title="После отгрузки будет создана накладная">Отгрузить заказ</button><button class="action-small danger-quiet" data-cancel-order="${o.id}">Отменить</button></div>`;
}
function renderOrders() {
  const body = document.querySelector("#orderRows");
  if(!body)return;
  const table=body.closest('table');
  if(table&&!document.querySelector('#orderPartnerTypeFilter')){
    const filter=document.createElement('div');
    filter.className='order-partner-filter';
    filter.innerHTML='<label><span>Тип партнёра</span><select id="orderPartnerTypeFilter"><option value="all">Все типы</option><option value="restaurant">Ресторан</option><option value="shop">Магазин</option><option value="hotel">Отель</option><option value="cafe">Кафе</option><option value="catering">Кейтеринг</option><option value="other">Другое</option></select></label><label><span>Партнёр</span><select id="orderPartnerNameFilter"><option value="all">Все партнёры</option></select></label><label><span>Поставка с даты</span><input id="orderDateFromFilter" type="date"></label><label><span>по дату поставки</span><input id="orderDateToFilter" type="date"></label><button type="button" class="secondary order-filter-reset" id="orderFiltersReset">Сбросить</button><strong id="orderPartnerFilterSummary">Все заказы</strong>';
    table.before(filter);
  }
  const ordersView=document.querySelector('#view-orders');
  let statusBar=document.querySelector('#orderStatusBar');
  if(ordersView&&!statusBar){
    statusBar=document.createElement('div');statusBar.id='orderStatusBar';statusBar.className='order-status-bar';
    const tableWrap=body.closest('.table-wrap');if(tableWrap)tableWrap.before(statusBar);
  }
  const statusGroups={
    all:()=>true,
    new:o=>o.status==='submitted',
    confirmed:o=>!['submitted','shipped','cancelled'].includes(o.status),
    shipped:o=>o.status==='shipped',
    completed:o=>['shipped','cancelled'].includes(o.status)
  };
  if(statusBar){
    const defs=[['all','Все'],['new','Новые'],['confirmed','Подтверждённые'],['shipped','Отгруженные'],['completed','Завершённые']];
    statusBar.innerHTML=defs.map(([key,label])=>`<button type="button" class="${orderStatusFilter===key?'active':''}" data-order-status="${key}"><span>${label}</span><b>${orders.filter(statusGroups[key]).length}</b></button>`).join('');
    statusBar.querySelectorAll('[data-order-status]').forEach(button=>button.onclick=()=>{orderStatusFilter=button.dataset.orderStatus;renderOrders()});
  }
  const filterPanel=document.querySelector('#orderFilterPanel');
  const filterToggle=document.querySelector('#orderFilterToggle');
  const filterClose=document.querySelector('#orderFilterClose');
  const filterCount=document.querySelector('#orderFilterCount');
  const activeFilterCount=(orderPartnerTypeFilter!=='all'?1:0)+(orderPartnerNameFilter!=='all'?1:0)+(orderDateFromFilter?1:0)+(orderDateToFilter?1:0);
  if(filterPanel)filterPanel.hidden=!orderFilterOpen;
  if(filterToggle){
    filterToggle.setAttribute('aria-expanded',orderFilterOpen?'true':'false');
    filterToggle.classList.toggle('has-filters',activeFilterCount>0);
    filterToggle.onclick=()=>{orderFilterOpen=!orderFilterOpen;renderOrders()};
  }
  if(filterClose)filterClose.onclick=()=>{orderFilterOpen=false;renderOrders()};
  if(filterCount){filterCount.textContent=String(activeFilterCount);filterCount.hidden=!activeFilterCount}
  const select=document.querySelector('#orderPartnerTypeFilter');
  if(select){
    select.value=orderPartnerTypeFilter;
    select.onchange=()=>{orderPartnerTypeFilter=select.value;renderOrders()};
  }
  const partnerSelect=document.querySelector('#orderPartnerNameFilter');
  if(partnerSelect){
    const partnerOptions=restaurants.slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ru'))
      .map(r=>`<option value="${commerceEscape(r.id)}">${commerceEscape(r.name||'Без названия')}</option>`).join('');
    partnerSelect.innerHTML=`<option value="all">Все партнёры</option>${partnerOptions}`;
    partnerSelect.value=restaurants.some(r=>r.id===orderPartnerNameFilter)?orderPartnerNameFilter:'all';
    orderPartnerNameFilter=partnerSelect.value;
    partnerSelect.onchange=()=>{orderPartnerNameFilter=partnerSelect.value;renderOrders()};
  }
  const dateFrom=document.querySelector('#orderDateFromFilter');
  const dateTo=document.querySelector('#orderDateToFilter');
  if(dateFrom){dateFrom.value=orderDateFromFilter;dateFrom.onchange=()=>{orderDateFromFilter=dateFrom.value;renderOrders()}}
  if(dateTo){dateTo.value=orderDateToFilter;dateTo.onchange=()=>{orderDateToFilter=dateTo.value;renderOrders()}}
  const reset=document.querySelector('#orderFiltersReset');
  if(reset)reset.onclick=()=>{orderPartnerTypeFilter='all';orderPartnerNameFilter='all';orderDateFromFilter='';orderDateToFilter='';orderFilterOpen=false;renderOrders()};

  const visibleOrders=orders.filter(order=>{
    const partner=restaurant(order.restaurantId);
    const typeMatches=orderPartnerTypeFilter==='all'||normalizePartnerType(partner?.partnerType||order.partnerType)===orderPartnerTypeFilter;
    const partnerMatches=orderPartnerNameFilter==='all'||order.restaurantId===orderPartnerNameFilter;
    const orderDay=String(order.deliveryDate||order.date||'').slice(0,10);
    const fromMatches=!orderDateFromFilter||orderDay>=orderDateFromFilter;
    const toMatches=!orderDateToFilter||orderDay<=orderDateToFilter;
    const statusMatches=(statusGroups[orderStatusFilter]||statusGroups.all)(order);
    return typeMatches&&partnerMatches&&fromMatches&&toMatches&&statusMatches;
  });
  const summary=document.querySelector('#orderPartnerFilterSummary');
  if(summary){
    const selectedPartner=orderPartnerNameFilter==='all'?null:restaurant(orderPartnerNameFilter);
    const bits=[];
    if(selectedPartner)bits.push(selectedPartner.name||'Партнёр');
    if(orderDateFromFilter||orderDateToFilter)bits.push(`поставка ${orderDateFromFilter||'…'} — ${orderDateToFilter||'…'}`);
    summary.textContent=bits.length?`${bits.join(' · ')} · найдено ${visibleOrders.length}`:`Найдено заказов: ${visibleOrders.length}`;
  }
  body.innerHTML = visibleOrders.length
    ? visibleOrders
        .slice()
        .reverse()
        .map((o) => {
          const note = deliveryNotes.find((n) => n.orderId === o.id);
          const partner=restaurant(o.restaurantId);
          const itemHtml=o.items.map((i)=>typeof orderLine==='function'
            ? orderLine(o,i)
            : `<div class="order-item"><strong>${commerceProductLabel(i.product)}</strong><span>${i.quantity} шт.</span></div>`).join("");
          return `<tr class="order-row order-row-${o.status}${o.status==='submitted'?' order-row-new':''}">
            <td class="order-mobile-number" data-label="Заказ"><strong>PN-${String(o.number).padStart(4, "0")}</strong></td>
            <td class="order-mobile-dates" data-label="Даты"><div class="order-dates">
              <span class="order-date-line"><em>Выпечка</em><strong class="date-desktop">${orderDateLabel(o.date, true)}</strong><strong class="date-mobile">${orderCompactDate(o.date)}</strong></span>
              <span class="order-date-line"><em>Доставка</em><strong class="date-desktop">${orderDateLabel(o.deliveryDate || o.date)}</strong><strong class="date-mobile">${orderCompactDate(o.deliveryDate || o.date)}</strong></span>
              ${note?.paymentDueDate ? `<span class="payment-due-date"><em>Оплата до</em><strong>${orderCompactDate(note.paymentDueDate)}</strong></span>` : ""}
            </div></td>
            <td class="order-mobile-partner" data-label="Партнёр">${orderPartnerHtml(partner||{name:o.partnerName||'—',partnerType:o.partnerType})}</td>
            <td class="order-mobile-items" data-label="Состав"><div class="order-items">${itemHtml}</div></td>
            <td class="order-mobile-total" data-label="Сумма"><strong>${euro(orderTotal(o))}</strong></td>
            <td class="order-mobile-status" data-label="Статус"><span class="tag order-status-${o.status}">${orderStatus(o)}</span>${customerConfirmationHtml(o)}</td>
            <td class="order-action-cell" data-label="Действие">${orderActions(o)}</td>
          </tr>`;
        })
        .join("")
    : `<tr><td class="empty-row" colspan="7">${orders.length?'По выбранному типу заказов нет.':'Заказов пока нет.'}</td></tr>`;
  document
    .querySelectorAll("[data-ship]")
    .forEach((b) => (b.onclick = () => openShipment(b.dataset.ship)));
  document
    .querySelectorAll("[data-note]")
    .forEach((b) => (b.onclick = () => printNote(b.dataset.note)));
  document
    .querySelectorAll("[data-delivery-qr]")
    .forEach(
      (b) => (b.onclick = () => window.showDeliveryQr?.(b.dataset.deliveryQr)),
    );
  document
    .querySelectorAll("[data-confirm]")
    .forEach((b) => (b.onclick = () => confirmOrder(b.dataset.confirm)));
  document
    .querySelectorAll("[data-cancel-order]")
    .forEach((b) => (b.onclick = () => cancelOrder(b.dataset.cancelOrder)));
}
async function confirmOrder(id) {
  const o = orders.find((x) => x.id === id);
  if (!o || o.status !== "submitted") return;
  const button=document.querySelector(`[data-confirm="${CSS.escape(id)}"]`);
  if(button?.disabled)return;
  if(button){button.disabled=true;button.dataset.originalText=button.textContent;button.textContent="Подтверждаем…"}
  try {
    if (window.panoraCloud?.ready) {
      await window.panoraCloud.updateOrderStatus(id, "confirmed");
    } else {
      o.status = "confirmed";
      cSave("panora-orders", orders);
    }
    window.panoraDataChannel?.postMessage({ type: "order-confirmed", id });
    window.dispatchEvent(new CustomEvent('panora:order-cycle-updated',{detail:{id,status:'confirmed'}}));
    renderCommerce();
  } catch (error) {
    if(button){button.disabled=false;button.textContent=button.dataset.originalText||"Подтвердить заказ"}
    alert(`Не удалось подтвердить заказ: ${error.message}`);
  }
}
async function cancelOrder(id) {
  const o = orders.find((x) => x.id === id);
  if (!o || o.status === "shipped" || o.status === "cancelled") return;
  if (!confirm("Отменить заказ и вернуть количество в свободный план?")) return;
  try {
    if (window.panoraCloud?.ready) {
      await window.panoraCloud.updateOrderStatus(
        id,
        "cancelled",
        "Cancelled by bakery",
      );
    } else {
      o.status = "cancelled";
      cSave("panora-orders", orders);
    }
    syncPlansFromOrders();
    renderCommerce();
    renderAll();
  } catch (error) {
    alert(`Не удалось отменить заказ: ${error.message}`);
  }
}
function renderAccounting() {
  let shipped = 0,
    paid = 0;
  document.querySelector("#accountRows").innerHTML = restaurants.length
    ? restaurants
        .map((r) => {
          const s = shippedFor(r.id),
            p = paidFor(r.id),
            last =
              [
                ...deliveryNotes
                  .filter((n) => n.restaurantId === r.id)
                  .map((n) => n.date),
                ...payments
                  .filter((x) => x.restaurantId === r.id)
                  .map((x) => x.date),
              ]
                .sort()
                .pop() || "—";
          shipped += s;
          paid += p;
          return `<tr><td><strong>${commerceEscape(r.name)}</strong></td><td class="${s - p > 0 ? "negative" : ""}"><strong>${euro(s - p)}</strong></td><td>${euro(s)}</td><td>${euro(p)}</td><td>${last}</td></tr>`;
        })
        .join("")
    : '<tr><td class="empty-row" colspan="5">Партнёров пока нет.</td></tr>';
  document.querySelector("#totalShipped").textContent = euro(shipped);
  document.querySelector("#totalPaid").textContent = euro(paid);
  document.querySelector("#totalDebt").textContent = euro(shipped - paid);
}
const reminderCopy = {
  ru: (r, p) =>
    `Здравствуйте, ${r.name}! Напоминаем: заказ Panora на выпечку ${p.bakeDate} можно оформить до ${new Date(p.cutoff).toLocaleString("ru-RU")}. Минимальный заказ — 12 шт.`,
  en: (r, p) =>
    `Hello, ${r.name}! A reminder that your Panora order for the ${p.bakeDate} bake must be placed by ${new Date(p.cutoff).toLocaleString("en-GB")}. Minimum order: 12 pcs.`,
  es: (r, p) =>
    `¡Hola, ${r.name}! Te recordamos que el pedido Panora para el horneado del ${p.bakeDate} debe realizarse antes del ${new Date(p.cutoff).toLocaleString("es-ES")}. Pedido mínimo: 12 uds.`,
};
const cleanPhone = (value) => String(value || "").replace(/\D/g, "");
const reminderSendWindow = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      hour12: false,
    }).formatToParts(new Date()),
    hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  return { allowed: hour >= 12 && hour < 20, hour };
};
function reminderRows() {
  const now = new Date(),
    upcoming = cRead("panora-production-plans", [])
      .filter((p) => {
        const hours = (new Date(p.cutoff) - now) / 3600000;
        return p.open && hours > 0 && hours <= 72;
      })
      .sort((a, b) => new Date(a.cutoff) - new Date(b.cutoff));
  const dates = [...new Set(upcoming.map((p) => p.bakeDate))];
  return dates.flatMap((date) => {
    const plan = upcoming.find((p) => p.bakeDate === date),
      hours = Math.round((new Date(plan.cutoff) - now) / 3600000),
      stage = hours <= 54 ? "repeat" : "first";
    return activeRestaurants().map((r) => {
      const ordered = orders.some(
          (o) =>
            o.restaurantId === r.id &&
            o.date === date &&
            !["cancelled"].includes(o.status),
        ),
        key = `${r.id}:${date}:${stage}`,
        sent = reminderLog[key];
      return { r, plan, key, ordered, sent, hours, stage };
    });
  });
}
const paymentReminderCopy = {
  ru: (row) =>
    `Здравствуйте, ${row.r.name}! Напоминаем об оплате ${euro(row.balance)} по накладной DN-${String(row.note.number).padStart(4, "0")}. Плановая дата оплаты: ${row.note.paymentDueDate}.`,
  en: (row) =>
    `Hello, ${row.r.name}! This is a reminder to pay ${euro(row.balance)} for delivery note DN-${String(row.note.number).padStart(4, "0")}. Expected payment date: ${row.note.paymentDueDate}.`,
  es: (row) =>
    `¡Hola, ${row.r.name}! Te recordamos el pago de ${euro(row.balance)} del albarán DN-${String(row.note.number).padStart(4, "0")}. Fecha prevista de pago: ${row.note.paymentDueDate}.`,
};
function paymentReminderRows() {
  const today = iso(new Date());
  return deliveryNotes
    .filter((note) => note.paymentDueDate)
    .map((note) => {
      const r = restaurant(note.restaurantId);
      if (!r) return null;
      const paid = payments
        .filter(
          (payment) =>
            payment.deliveryNoteId === note.id &&
            payment.confirmed !== false &&
            payment.status !== "cancelled",
        )
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      const balance = Math.max(0, Number(note.total || 0) - paid);
      if (balance <= 0) return null;
      const days = Math.round(
        (new Date(`${note.paymentDueDate}T12:00:00`) -
          new Date(`${today}T12:00:00`)) /
          86400000,
      );
      const key = `payment-${note.id}-${note.paymentDueDate}`;
      return { note, r, balance, days, key, sent: reminderLog[key] };
    })
    .filter(Boolean)
    .sort((a, b) =>
      String(a.note.paymentDueDate).localeCompare(
        String(b.note.paymentDueDate),
      ),
    );
}
function markReminder(key, channel) {
  reminderLog[key] = { sentAt: new Date().toISOString(), channel };
  cSave("panora-reminder-log", reminderLog);
  renderReminders();
}
function renderReminders() {
  const root = document.querySelector("#reminderList");
  if (!root) return;
  const rows = reminderRows(),
    paymentRows = paymentReminderRows(),
    windowState = reminderSendWindow(),
    due = rows.filter((x) => !x.ordered && !x.sent),
    ordered = rows.filter((x) => x.ordered),
    sent = rows.filter((x) => x.sent);
  document.querySelector("#reminderDue").textContent =
    due.length + paymentRows.filter((x) => !x.sent).length;
  document.querySelector("#reminderOrdered").textContent = ordered.length;
  document.querySelector("#reminderSent").textContent =
    sent.length + paymentRows.filter((x) => x.sent).length;
  const paymentCards = paymentRows
    .map((x) => {
      const message = paymentReminderCopy[x.r.language || "ru"](x),
        subject = encodeURIComponent(
          `Panora · оплата DN-${String(x.note.number).padStart(4, "0")}`,
        ),
        body = encodeURIComponent(message),
        phone = cleanPhone(x.r.whatsapp || x.r.phone),
        waiting = !windowState.allowed && !x.sent,
        status = x.sent
          ? `Отправлено ${new Date(x.sent.sentAt).toLocaleString("ru-RU")}`
          : x.days < 0
            ? `Просрочено на ${Math.abs(x.days)} дн.`
            : x.days === 0
              ? "Оплата сегодня"
              : `До оплаты ${x.days} дн.`,
        disabled = waiting
          ? ' reminder-disabled aria-disabled="true" tabindex="-1"'
          : "";
      return `<article class="reminder-card payment-reminder ${x.days < 0 ? "overdue" : ""} ${waiting ? "waiting" : ""}"><div><span class="tag">${status}</span><h3>${x.r.name}</h3><p>Накладная: <strong>DN-${String(x.note.number).padStart(4, "0")}</strong> · оплатить до <strong>${x.note.paymentDueDate}</strong> · ${euro(x.balance)}</p></div><p class="reminder-message">${message}</p><div class="reminder-actions">${x.r.email ? `<a class="${waiting ? "reminder-disabled" : ""}" data-payment-reminder="${x.key}:email" ${disabled} target="_blank" rel="noopener" href="https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(x.r.email)}&su=${subject}&body=${body}">Email</a>` : ""}${phone ? `<a class="${waiting ? "reminder-disabled" : ""}" data-payment-reminder="${x.key}:whatsapp" ${disabled} target="_blank" rel="noopener" href="https://wa.me/${phone}?text=${body}">WhatsApp</a>` : ""}<a class="${waiting ? "reminder-disabled" : ""}" data-payment-reminder="${x.key}:telegram" ${disabled} target="_blank" rel="noopener" href="https://t.me/share/url?url=&text=${body}">Telegram</a><button class="${waiting ? "reminder-disabled" : ""}" data-copy-payment-reminder="${x.key}" ${waiting ? "disabled" : ""}>Копировать</button></div></article>`;
    })
    .join("");
  root.innerHTML = paymentCards + (rows.length
    ? rows
        .map((x) => {
          const message = reminderCopy[x.r.language || "ru"](x.r, x.plan),
            subject = encodeURIComponent(`Panora · ${x.plan.bakeDate}`),
            body = encodeURIComponent(message),
            phone = cleanPhone(x.r.whatsapp || x.r.phone),
            waiting = !windowState.allowed && !x.ordered && !x.sent,
            status = x.ordered
              ? "Заказ получен"
              : x.sent
                ? `Отправлено ${new Date(x.sent.sentAt).toLocaleString("ru-RU")}`
                : waiting
                  ? windowState.hour < 12
                    ? "Отправка доступна после 12:00"
                    : "Отложено до завтра, 12:00"
                  : x.hours <= 6
                    ? "Срочно"
                    : `До закрытия ${x.hours} ч.`,
            disabled = waiting
              ? ' reminder-disabled aria-disabled="true" tabindex="-1"'
              : "";
          return `<article class="reminder-card ${x.ordered ? "complete" : ""} ${waiting ? "waiting" : ""}"><div><span class="tag">${x.stage === "repeat" ? "Повторное · " : ""}${status}</span><h3>${x.r.name}</h3><p>Выпечка: <strong>${x.plan.bakeDate}</strong> · заказ до ${new Date(x.plan.cutoff).toLocaleString("ru-RU")}</p></div><p class="reminder-message">${message}</p><div class="reminder-actions">${x.r.email ? `<a class="${waiting ? "reminder-disabled" : ""}" data-reminder="${x.key}:email" ${disabled} target="_blank" rel="noopener" href="https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(x.r.email)}&su=${subject}&body=${body}">Email</a>` : ""}${phone ? `<a class="${waiting ? "reminder-disabled" : ""}" data-reminder="${x.key}:whatsapp" ${disabled} target="_blank" rel="noopener" href="https://wa.me/${phone}?text=${body}">WhatsApp</a>` : ""}<a class="${waiting ? "reminder-disabled" : ""}" data-reminder="${x.key}:telegram" ${disabled} target="_blank" rel="noopener" href="https://t.me/share/url?url=&text=${body}">Telegram</a><button class="${waiting ? "reminder-disabled" : ""}" data-copy-reminder="${x.key}" ${waiting ? "disabled" : ""}>Копировать</button></div></article>`;
        })
        .join("")
    : paymentRows.length
      ? ""
      : '<div class="empty-row">Нет напоминаний: они появятся перед закрытием заказов или при наступлении срока оплаты.</div>');
  document.querySelectorAll("[data-reminder]").forEach(
    (a) =>
      (a.onclick = (event) => {
        if (a.classList.contains("reminder-disabled")) {
          event.preventDefault();
          return;
        }
        const parts = a.dataset.reminder.split(":");
        markReminder(parts.slice(0, -1).join(":"), parts.at(-1));
      }),
  );
  document.querySelectorAll("[data-copy-reminder]").forEach(
    (b) =>
      (b.onclick = () => {
        if (b.disabled) return;
        const x = rows.find((row) => row.key === b.dataset.copyReminder);
        copyText(reminderCopy[x.r.language || "ru"](x.r, x.plan)).then(() =>
          markReminder(x.key, "copy"),
        );
      }),
  );
  document.querySelectorAll("[data-payment-reminder]").forEach(
    (link) =>
      (link.onclick = (event) => {
        if (link.classList.contains("reminder-disabled")) {
          event.preventDefault();
          return;
        }
        const parts = link.dataset.paymentReminder.split(":");
        markReminder(parts.slice(0, -1).join(":"), parts.at(-1));
      }),
  );
  document.querySelectorAll("[data-copy-payment-reminder]").forEach(
    (button) =>
      (button.onclick = () => {
        const row = paymentRows.find(
          (item) => item.key === button.dataset.copyPaymentReminder,
        );
        if (!row || button.disabled) return;
        copyText(paymentReminderCopy[row.r.language || "ru"](row)).then(() =>
          markReminder(row.key, "copy"),
        );
      }),
  );
}
function renderCommerce() {
  renderRestaurants();
  renderOrders();
  renderAccounting();
  renderReminders();
}
document.querySelector("#addRestaurant").onclick = () =>
  document.querySelector("#restaurantDialog").showModal();
document.querySelector("#saveRestaurant").onclick = (e) => {
  e.preventDefault();
  const form = document.querySelector("#restaurantForm");
  if (!form.reportValidity()) return;
  const f = new FormData(form);
  restaurants.push({
    id: crypto.randomUUID(),
    name: f.get("name"),
    email: f.get("email"),
    accessCode: f.get("accessCode"),
    phone: f.get("phone"),
    whatsapp: String(f.get("whatsapp") || "").trim(),
    telegram: String(f.get("telegram") || "").trim(),
    extraMessengers: [],
    partnerType: f.get("partnerType") || "other",
    language: f.get("language") || "ru",
    address: f.get("address"),
    legalName: String(f.get("legalName") || "").trim(),
    taxId: String(f.get("taxId") || "").trim().toUpperCase(),
    billingAddress: String(f.get("billingAddress") || "").trim(),
    prices: {
      plain: Number(f.get("plainPrice")),
      pumpkin: Number(f.get("pumpkinPrice")),
    },
  });
  cSave("panora-restaurants", restaurants);
  document.querySelector("#restaurantDialog").close();
  document.querySelector("#restaurantForm").reset();
  renderCommerce();
};
document.querySelector("#refreshReminders").onclick = renderReminders;
document
  .querySelector("#adminLanguage")
  .addEventListener("change", () => setTimeout(renderCommerce));
document.querySelector("#addOrder").onclick = () => {
  if (!activeRestaurants().length) {
    alert("Сначала добавьте активного партнёра.");
    return;
  }
  const f = document.querySelector("#orderForm");
  f.reset();
  const d = new Date();
  d.setDate(d.getDate() + 3);
  f.date.value = iso(d);
  document.querySelector("#orderDialog").showModal();
};
document.querySelector("#saveOrder").onclick = (e) => {
  e.preventDefault();
  const f = new FormData(document.querySelector("#orderForm")),
    plain = Number(f.get("plain")),
    pumpkin = Number(f.get("pumpkin"));
  if (plain + pumpkin < 12) {
    alert("Минимальный заказ — 12 шт.");
    return;
  }
  const items = [];
  if (plain) items.push({ product: "plain", quantity: plain });
  if (pumpkin) items.push({ product: "pumpkin", quantity: pumpkin });
  const r = restaurant(f.get("restaurant"));
  orders.push({
    id: crypto.randomUUID(),
    number: (orders.at(-1)?.number || 0) + 1,
    restaurantId: r.id,
    date: f.get("date"),
    deliveryDate: f.get("date"),
    items,
    prices: structuredClone(r.prices),
    taxRate: Number(bakerySettings.taxRate),
    status: "confirmed",
  });
  cSave("panora-orders", orders);
  syncPlansFromOrders();
  document.querySelector("#orderDialog").close();
  document.querySelector("#orderForm").reset();
  renderCommerce();
  renderAll();
};
function traysAtRestaurant(restaurantId) {
  const notes = deliveryNotes
    .filter((note) => note.restaurantId === restaurantId)
    .sort((a, b) =>
      String(a.date || "").localeCompare(String(b.date || "")) ||
      Number(a.number || 0) - Number(b.number || 0),
    );
  const latest = notes.at(-1);
  if (latest && Number.isFinite(Number(latest.trayBalanceAfter))) {
    return Math.max(0, Number(latest.trayBalanceAfter));
  }
  return notes.reduce(
      (sum, note) =>
        sum +
        Number(note.traysDelivered || 0) -
        Number(note.traysReturned || 0),
      0,
    );
}
function openShipment(id) {
  const o = orders.find((x) => x.id === id),
    r = restaurant(o.restaurantId),
    prices = o.prices || r.prices,
    form = document.querySelector("#shipmentForm"),
    summary = document.querySelector("#shipmentSummary"),
    previousTrays = traysAtRestaurant(r.id);
  form.orderId.value = id;
  form.paymentDueDate.value = "";
  form.traysDelivered.value = "";
  form.traysReturned.value = "";
  summary.innerHTML = `<strong>PN-${String(o.number).padStart(4, "0")} · ${commerceEscape(r.name)}</strong><p class="shipment-help">При необходимости уменьшите фактическое количество. Увеличить выше заказа нельзя.</p><div class="shipment-items">${o.items.map((i) => `<label class="shipment-item"><span><strong>${commerceProductLabel(i.product)}</strong><small>Заказано: ${i.quantity} шт. · ${euro(prices[i.product])}/шт.</small></span><input data-shipment-quantity data-product="${i.product}" data-max="${i.quantity}" type="number" inputmode="numeric" min="0" max="${i.quantity}" step="1" value="${i.quantity}"></label>`).join("")}</div><div class="shipment-total"><span>Фактическая сумма</span><strong id="shipmentActualTotal"></strong></div><div class="shipment-debt-preview"><span>Задолженность после поставки</span><strong id="shipmentDebtAfter"></strong></div>`;
  const update = () => {
    let subtotal = 0;
    summary.querySelectorAll("[data-shipment-quantity]").forEach((input) => {
      const qty = Math.min(
        Number(input.dataset.max),
        Math.max(0, Number(input.value) || 0),
      );
      subtotal += qty * Number(prices[input.dataset.product] || 0);
    });
    const total =
        subtotal * (1 + Number(o.taxRate ?? bakerySettings.taxRate) / 100),
      paid = Math.min(total, Math.max(0, Number(form.paid.value) || 0)),
      traysDelivered = Math.max(
        0,
        Math.trunc(Number(form.traysDelivered.value) || 0),
      ),
      traysReturned = Math.max(
        0,
        Math.trunc(Number(form.traysReturned.value) || 0),
      );
    document.querySelector("#shipmentActualTotal").textContent = euro(total);
    document.querySelector("#shipmentDebtAfter").textContent = euro(
      Math.max(0, shippedFor(r.id) - paidFor(r.id) + total - paid),
    );
    document.querySelector("#shipmentTrayBalance").textContent =
      `${Math.max(0, previousTrays + traysDelivered - traysReturned)} шт.`;
  };
  summary
    .querySelectorAll("[data-shipment-quantity]")
    .forEach((input) => input.addEventListener("input", update));
  form.paid.value = "";
  form.paid.oninput = update;
  form.traysDelivered.oninput = update;
  form.traysReturned.oninput = update;
  update();
  document.querySelector("#shipmentDialog").showModal();
}
document.querySelector("#confirmShipment").onclick = async (e) => {
  e.preventDefault();
  const form = document.querySelector("#shipmentForm"),
    button = document.querySelector("#confirmShipment"),
    f = new FormData(form),
    o = orders.find((x) => x.id === f.get("orderId"));
  if (!o) return false;
  const orderedItems = structuredClone(o.items),
    actualItems = orderedItems
      .map((i) => ({
        ...i,
        quantity: Number(
          form.querySelector(
            `[data-shipment-quantity][data-product="${i.product}"]`,
          )?.value,
        ),
      }))
      .filter((i) => Number.isFinite(i.quantity) && i.quantity > 0);
  if (!actualItems.length) {
    alert("Укажите количество хотя бы одного хлеба.");
    return false;
  }
  if (
    actualItems.some(
      (i) =>
        !Number.isInteger(i.quantity) ||
        i.quantity >
          Number(
            orderedItems.find((x) => x.product === i.product)?.quantity || 0,
          ),
    )
  ) {
    alert("Количество должно быть целым и не больше заказанного.");
    return false;
  }
  const changed =
    actualItems.length !== orderedItems.length ||
    actualItems.some(
      (i) =>
        i.quantity !==
        orderedItems.find((x) => x.product === i.product)?.quantity,
    );
  if (
    changed &&
    !confirm(
      "Фактическая поставка меньше заказа. Создать накладную по указанному количеству?",
    )
  )
    return false;
  const prices = structuredClone(
      o.prices || restaurant(o.restaurantId).prices,
    ),
    subtotal = actualItems.reduce(
      (sum, item) =>
        sum + item.quantity * Number(prices[item.product] || 0),
      0,
    ),
    taxRate = Number(o.taxRate ?? bakerySettings.taxRate),
    tax = (subtotal * taxRate) / 100,
    total = subtotal + tax,
    paid = Math.min(total, Math.max(0, Number(f.get("paid")))),
    traysDelivered = Math.max(
      0,
      Math.trunc(Number(f.get("traysDelivered")) || 0),
    ),
    traysReturned = Math.max(
      0,
      Math.trunc(Number(f.get("traysReturned")) || 0),
    ),
    previousTrayBalance = traysAtRestaurant(o.restaurantId),
    availableTrays = previousTrayBalance + traysDelivered,
    trayBalanceAfter = availableTrays - traysReturned;
  if (traysReturned > availableTrays) {
    alert(
      "Нельзя вернуть больше лотков, чем числится у партнёра с учётом этой поставки.",
    );
    return false;
  }
  button.disabled = true;
  button.textContent = "Сохраняем накладную…";
  const shipmentDialog = document.querySelector("#shipmentDialog");
  try {
    const cloudConfigured = Boolean(
      window.PANORA_SUPABASE?.url &&
        window.PANORA_SUPABASE?.publishableKey,
    );
    let note;
    if (cloudConfigured) {
      if (
        !window.panoraCloud?.ready ||
        !window.panoraCloud?.shipOrderAtomic
      )
        throw new Error(
          "Нет соединения с Supabase. Отгрузка не была проведена.",
        );
      note = await window.panoraCloud.shipOrderAtomic({
        orderId: o.id,
        items: actualItems,
        paymentAmount: paid,
        paymentMethod: f.get("method") || "Наличные",
        paymentDueDate: f.get("paymentDueDate") || null,
        traysDelivered,
        traysReturned,
        trayBalanceAfter,
      });
    } else {
      o.orderedItems = o.orderedItems || orderedItems;
      o.items = actualItems;
      o.status = "shipped";
      note = {
        id: crypto.randomUUID(),
        number: deliveryNotes.length + 1,
        orderId: o.id,
        restaurantId: o.restaurantId,
        date: iso(new Date()),
        paymentDueDate: f.get("paymentDueDate") || "",
        items: structuredClone(actualItems),
        orderedItems: structuredClone(orderedItems),
        prices,
        bakery: structuredClone(bakerySettings),
        subtotal,
        taxRate,
        tax,
        total,
        paid,
        traysDelivered,
        traysReturned,
        trayBalanceAfter,
        balanceAfter:
          shippedFor(o.restaurantId) + total - paidFor(o.restaurantId) - paid,
      };
      deliveryNotes.push(note);
      if (paid)
        payments.push({
          id: crypto.randomUUID(),
          restaurantId: o.restaurantId,
          deliveryNoteId: note.id,
          date: note.date,
          amount: paid,
          method: f.get("method") || "Наличные",
          note: `Оплата по накладной DN-${note.number}`,
          confirmed: true,
          confirmedAt: new Date().toISOString(),
        });
      cSave("panora-orders", orders);
      cSave("panora-delivery-notes", deliveryNotes);
      cSave("panora-payments", payments);
    }
    if (
      !movements.some(
        (movement) =>
          movement.type === "shipped" && movement.orderId === o.id,
      )
    )
      actualItems.forEach((item) =>
        movements.push({
          id: crypto.randomUUID(),
          orderId: o.id,
          date: note.date,
          product: item.product,
          type: "shipped",
          quantity: item.quantity,
          note: `Накладная DN-${note.number}`,
        }),
      );
    store("panora-stock-movements", movements);
    window.panoraDataChannel?.postMessage({
      type: "order-shipped",
      id: o.id,
    });
    shipmentDialog.close();
    renderCommerce();
    renderStock();
    window.dispatchEvent(new CustomEvent('panora:order-cycle-updated',{detail:{id:o.id,status:'shipped'}}));
    printNote(o.id);
    return true;
  } catch (error) {
    alert(
      `Отгрузка не выполнена. Заказ остался подтверждённым.\n\n${error.message}`,
    );
    return false;
  } finally {
    button.disabled = false;
    button.textContent = "Отгрузить и создать накладную";
  }
};
document.querySelector("#addPayment").onclick = () => {
  if (!restaurants.length) {
    alert("Сначала добавьте партнёра.");
    return;
  }
  document.querySelector("#paymentDialog").showModal();
};
document.querySelector("#savePayment").onclick = async (e) => {
  e.preventDefault();
  const button = e.currentTarget,
    form = document.querySelector("#paymentForm"),
    f = new FormData(form),
    amount = Number(f.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0)
    return alert("Введите сумму оплаты больше нуля.");
  if (
    !window.panoraCloud?.ready ||
    typeof window.panoraCloud.recordPaymentAtomic !== "function"
  )
    return alert(
      "Облако ещё загружается. Подождите несколько секунд и повторите.",
    );
  button.disabled = true;
  button.textContent = "Сохраняем…";
  try {
    await window.panoraCloud.recordPaymentAtomic({
      restaurantId: f.get("restaurant"),
      amount,
      method: f.get("method") || "Наличные",
      note: f.get("note") || "",
      receivedAt: new Date().toISOString(),
    });
    document.querySelector("#paymentDialog").close();
    form.reset();
    renderCommerce();
    alert(
      "Оплата сохранена в облаке и ожидает подтверждения получения средств.",
    );
  } catch (error) {
    alert(`Оплата не сохранена: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = "Записать на подтверждение";
  }
};
function printNote(orderId) {
  const n = deliveryNotes.find((x) => x.orderId === orderId),
    o = orders.find((x) => x.id === orderId),
    r = restaurant(n.restaurantId),
    b = n.bakery || bakerySettings,
    w = window.open("", "_blank"),
    taxSummary =
      Number(n.taxRate) > 0
        ? `Сумма без НДС: ${euro(n.subtotal ?? n.total)}<br>НДС ${n.taxRate}%: ${euro(n.tax || 0)}<br>`
        : "",
    paymentDueLine = n.paymentDueDate
      ? `<br><strong>Плановая дата оплаты: ${n.paymentDueDate}</strong>`
      : "",
    trayLine = `<p><strong>Возвратные лотки</strong><br>Пекарня выдала: ${Number(n.traysDelivered || 0)} шт.<br>${n.customerTraysReceived == null ? `Плановый возврат пустых: ${Number(n.traysReturned || 0)} шт.` : `Партнёр подтвердил: принято ${Number(n.customerTraysReceived)} шт., возвращено ${Number(n.customerTraysReturned || 0)} шт.<br>Осталось у партнёра: ${Number(n.trayBalanceAfter || 0)} шт.`}</p>`;
  w.document.write(
    `<title>Накладная DN-${n.number}</title><style>body{font:15px Arial;max-width:800px;margin:40px auto}h1{font:36px Georgia}table{width:100%;border-collapse:collapse}td,th{padding:10px;border-bottom:1px solid #ccc;text-align:left}.total{text-align:right;font-size:18px}.sign{margin-top:70px;display:flex;justify-content:space-between}</style><h1>Panora</h1><p><strong>${b.legalName || "Panora"}</strong><br>${b.taxId || ""}<br>${b.address || ""}<br>${b.email || ""} ${b.phone || ""}</p><h2>Накладная DN-${String(n.number).padStart(4, "0")}</h2><p>Дата накладной: ${n.date}<br>Дата выпечки: ${o?.date || n.date}<br>Дата доставки: ${o?.deliveryDate || o?.date || n.date}${paymentDueLine}<br>Партнёр: <strong>${commerceEscape(r.name)}</strong><br>Адрес: ${r.address || "—"}</p><table><tr><th>Товар</th><th>Количество</th><th>Цена</th><th>Сумма</th></tr>${n.items.map((i) => `<tr><td>${commerceProductLabel(i.product)}</td><td>${i.quantity} шт.</td><td>${euro(n.prices[i.product])}</td><td>${euro(i.quantity * n.prices[i.product])}</td></tr>`).join("")}</table>${trayLine}<p class="total">${taxSummary}Итого: <strong>${euro(n.total)}</strong><br>Оплачено: ${euro(n.paid)}<br>Остаток задолженности: ${euro(n.balanceAfter)}</p><div class="sign"><span>Panora __________________</span><span>Партнёр __________________</span></div>`,
  );
  w.document.close();
  w.print();
}
const settingsForm = document.querySelector("#bakerySettingsForm");
Object.entries(bakerySettings).forEach(([key, value]) => {
  const field = settingsForm.elements[key];
  if (!field) return;
  if (field.type === "checkbox") field.checked = Boolean(value);
  else field.value = value;
});
settingsForm.onsubmit = (e) => {
  e.preventDefault();
  const f = new FormData(settingsForm),
    useTax = f.get("useTax") === "on";
  bakerySettings = {
    ...bakerySettings,
    legalName: f.get("legalName") || "Panora",
    taxId: f.get("taxId"),
    address: f.get("address"),
    email: f.get("email"),
    phone: f.get("phone"),
    useTax,
    taxRate: useTax ? Number(f.get("taxRate") || 0) : 0,
  };
  cSave("panora-bakery-settings", bakerySettings);
  renderCommerce();
  alert(
    useTax
      ? "Настройки сохранены. НДС включён."
      : "Настройки сохранены. НДС отключён.",
  );
};
function downloadFile(name, content, type = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
function csv(rows) {
  return "\ufeff" + rows.map((row) => row.map(csvCell).join(";")).join("\n");
}
document.querySelector("#exportBackup").onclick = () => {
  const keys = [
      "panora-restaurants",
      "panora-orders",
      "panora-payments",
      "panora-delivery-notes",
      "panora-production-plans",
      "panora-recipes",
      "panora-stock-movements",
      "panora-bakery-settings",
      "panora-reminder-log",
      "panora-ingredient-costs",
    ],
    data = { exportedAt: new Date().toISOString(), version: 1 };
  keys.forEach((k) => (data[k] = cRead(k, [])));
  downloadFile(
    `panora-backup-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(data, null, 2),
    "application/json",
  );
};
const restoreInput = document.querySelector("#restoreBackupFile"),
  restoreStatus = document.querySelector("#restoreStatus");
document.querySelector("#restoreBackup").onclick = () => restoreInput.click();
restoreInput.onchange = async () => {
  restoreStatus.className = "restore-status";
  restoreStatus.textContent = "";
  const file = restoreInput.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text()),
      keys = [
        "panora-restaurants",
        "panora-orders",
        "panora-payments",
        "panora-delivery-notes",
        "panora-production-plans",
        "panora-recipes",
        "panora-stock-movements",
        "panora-bakery-settings",
      ];
    if (data.version !== 1 || !keys.every((k) => Object.hasOwn(data, k)))
      throw new Error("Неверный формат резервной копии");
    if (
      !Array.isArray(data["panora-restaurants"]) ||
      !Array.isArray(data["panora-orders"]) ||
      !Array.isArray(data["panora-payments"]) ||
      !Array.isArray(data["panora-delivery-notes"]) ||
      !Array.isArray(data["panora-production-plans"]) ||
      !Array.isArray(data["panora-stock-movements"])
    )
      throw new Error("Повреждённые данные");
    if (
      !confirm(
        `Восстановить копию от ${data.exportedAt || "неизвестной даты"}? Текущие данные будут заменены.`,
      )
    ) {
      restoreInput.value = "";
      return;
    }
    keys.forEach((k) => localStorage.setItem(k, JSON.stringify(data[k])));
    restoreStatus.classList.add("success");
    restoreStatus.textContent = "Данные восстановлены. Перезагрузка…";
    setTimeout(() => location.reload(), 700);
  } catch (error) {
    restoreStatus.classList.add("error");
    restoreStatus.textContent = `Не удалось восстановить: ${error.message}`;
    restoreInput.value = "";
  }
};
document.querySelector("#exportOrders").onclick = () => {
  const productIds = [...new Set([
    ...commerceProducts().map((product) => product.id),
    ...orders.flatMap((order) => order.items.map((item) => item.product)),
  ])];
  downloadFile(
    "panora-orders.csv",
    csv([
      [
        "Номер",
        "Выпечка",
        "Доставка",
        "Партнёр",
        "Статус",
        ...productIds.map((id) => `${commerceProductLabel(id)}, шт.`),
        "Без налога, EUR",
        "Налог, %",
        "Итого, EUR",
      ],
      ...orders.map((o) => [
        o.number,
        o.date,
        o.deliveryDate || o.date,
        restaurant(o.restaurantId)?.name,
        orderStatus(o),
        ...productIds.map((id) => o.items.find((i) => i.product === id)?.quantity || 0),
        orderSubtotal(o).toFixed(2),
        o.taxRate ?? bakerySettings.taxRate,
        orderTotal(o).toFixed(2),
      ]),
    ]),
  );
};
document.querySelector("#exportPayments").onclick = () => {
  const rows = [
    ...deliveryNotes.map((n) => [
      restaurant(n.restaurantId)?.name,
      n.date,
      "Отгрузка",
      n.total.toFixed(2),
      "",
      `DN-${n.number}`,
      "Проведено",
    ]),
    ...payments.map((p) => [
      restaurant(p.restaurantId)?.name,
      p.date,
      "Оплата",
      (-p.amount).toFixed(2),
      p.method,
      p.note,
      paymentConfirmed(p) ? "Подтверждена" : "Ожидает подтверждения",
    ]),
  ].sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  downloadFile(
    "panora-payments-debts.csv",
    csv([
      [
        "Партнёр",
        "Дата",
        "Тип",
        "Сумма, EUR",
        "Способ",
        "Примечание",
        "Статус",
      ],
      ...rows,
    ]),
  );
};
document.querySelector("#exportStock").onclick = () =>
  downloadFile(
    "panora-stock.csv",
    csv([
      ["Дата", "Хлеб", "Операция", "Количество, шт.", "Примечание"],
      ...movements.map((m) => [
        m.date,
        commerceProductLabel(m.product),
        m.type,
        signed(m),
        m.note,
      ]),
    ]),
  );
document.querySelector("#exportPlan").onclick = () =>
  downloadFile(
    "panora-production-plan.csv",
    csv([
      [
        "Дата выпечки",
        "Дата доставки",
        "Хлеб",
        "План, шт.",
        "Заказано, шт.",
        "Свободно, шт.",
        "Приём заказов до",
        "Открыто",
      ],
      ...plans.map((p) => [
        p.bakeDate,
        p.deliveryDate,
        commerceProductLabel(p.product),
        p.planned,
        p.ordered || 0,
        Math.max(0, p.planned - (p.ordered || 0)),
        p.cutoff,
        p.open ? "Да" : "Нет",
      ]),
    ]),
  );
syncPlansFromOrders();
renderCommerce();
renderAll();
