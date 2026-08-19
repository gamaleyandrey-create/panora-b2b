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
  if (key === "panora-orders" && typeof window.panoraSaveOrdersCache === "function") {
    window.panoraSaveOrdersCache(value);
  } else if (key === "panora-delivery-notes" && typeof window.panoraSaveDeliveryNotesCache === "function") {
    window.panoraSaveDeliveryNotesCache(value);
  } else if (key === "panora-payments" && typeof window.panoraSavePaymentsCache === "function") {
    window.panoraSavePaymentsCache(value);
  } else if (typeof setLocalStorageSafely === "function") {
    setLocalStorageSafely(key, JSON.stringify(value));
  } else {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { console.warn("Panora local cache write skipped", key, error); }
  }
  if (key === "panora-restaurants") window.panoraCloud?.queueRestaurants();
  if (key === "panora-orders") window.panoraCloud?.queueOrders();
  if (key === "panora-production-plans") window.panoraCloud?.queuePlans();
  if (key === "panora-delivery-notes" || key === "panora-payments")
    window.panoraCloud?.queueFinance();
};
const commerceDateTimeValue = (date) => {
  const parsed=new Date(date);
  return Number.isFinite(parsed.getTime())?parsed.toISOString():'';
};
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
const reloadRestaurantsFromStorage=()=>{
  try{
    const fresh=JSON.parse(localStorage.getItem("panora-restaurants")||"[]");
    if(Array.isArray(fresh)) restaurants=fresh;
  }catch{}
};

const adminRestaurantPriceMap=()=>{
  try{return JSON.parse(localStorage.getItem("panora-admin-restaurant-prices-v420")||"{}")||{}}
  catch{return{}}
};
const adminPartnerPrice=(restaurantId,productId,fallback=0)=>{
  // The restaurant object is refreshed from public.restaurant_prices by cloud-sync.
  // The separate admin price map is cache only and must never override a fresher
  // restaurant value in the bakery UI.
  const current=restaurant(restaurantId)?.prices?.[productId];
  if(current!=null&&Number.isFinite(Number(current)))return Number(current);
  const map=adminRestaurantPriceMap();
  const cached=map?.[String(restaurantId)]?.[productId];
  return cached==null?Number(fallback||0):Number(cached);
};

const activeRestaurants = () => restaurants.filter((r) => !r.deletedAt);
const commerceProducts = () => {
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem("panora-products") || "[]"); } catch {}
  const registry = typeof productRegistry !== "undefined" && Array.isArray(productRegistry)
    ? productRegistry
    : saved;
  return registry.filter((product) => product && product.active !== false && !product.deletedAt);
};
const manualOrderUnitPrice=(r,productId,quantity)=>{
  const product=commerceProducts().find(item=>String(item.id)===String(productId));
  const retail=Math.max(0,Number(product?.basePrice||0));
  const threshold=Math.max(1,Number(product?.wholesaleMinQty||8));
  const wholesale=Math.max(0,Number(adminPartnerPrice(r?.id,productId,r?.prices?.[productId]??retail)));
  return Number(quantity||0)>=threshold?(wholesale||retail):retail;
};
const manualOrderPriceMap=(r,items)=>Object.fromEntries(
  (items||[]).map(item=>[item.product,manualOrderUnitPrice(r,item.product,item.quantity)])
);

const commerceOrderNumber = (order) => Number(order?.number)>0 ? `PN-${String(Number(order.number)).padStart(4,"0")}` : "PN-…";
const commerceProductLabel = (id) => {
  const product = commerceProducts().find((entry) => entry.id === id);
  return product?.names?.[lang] || product?.names?.ru || product?.name ||
    (id === "plain" ? "Льняной бездрожжевой хлеб с семенами" :
      id === "pumpkin" ? "Тыквенный бездрожжевой хлеб с семенами" : id);
};
const orderPricingState = (o) => {
  const items = Array.isArray(o?.items) ? o.items : [];
  if (!items.length) {
    return {valid:false, reason:"empty", subtotal:null, total:null, invalidItems:[]};
  }
  const restaurantPrices = restaurant(o.restaurantId)?.prices || {};
  const snapshotPrices = o.prices && typeof o.prices === "object" ? o.prices : {};
  const invalidItems = [];
  let subtotal = 0;

  items.forEach((item) => {
    const qty = Number(item?.quantity);
    const saved = Number(snapshotPrices[item?.product]);
    const fallback = Number(restaurantPrices[item?.product]);
    const price = Number.isFinite(saved) && saved > 0 ? saved : (Number.isFinite(fallback) && fallback > 0 ? fallback : NaN);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) {
      invalidItems.push({
        product:item?.product,
        quantity:qty,
        price,
        reason:!Number.isFinite(qty)||qty<=0?"quantity":"price"
      });
      return;
    }
    subtotal += qty * price;
  });

  if (invalidItems.length) {
    return {valid:false, reason:"pricing", subtotal:null, total:null, invalidItems};
  }
  const taxRate = taxEnabled(o) ? Number(o.taxRate ?? bakerySettings.taxRate) : 0;
  const total = subtotal * (1 + taxRate / 100);
  return {valid:Number.isFinite(total) && total > 0, reason:"ok", subtotal, total, invalidItems:[]};
};
const orderSubtotal = (o) => orderPricingState(o).subtotal ?? 0;
const taxEnabled = (o) =>
  o.taxEnabled !== undefined
    ? Boolean(o.taxEnabled)
    : Number(o.taxRate ?? bakerySettings.taxRate) > 0;
const orderTotal = (o) => orderPricingState(o).total ?? 0;
const orderTotalHtml = (o) => {
  const pricing = orderPricingState(o);
  if (pricing.valid) return `<strong>${euro(pricing.total)}</strong>`;
  if (pricing.reason === "empty") return `<strong class="order-total-error">Нет позиций</strong><small class="order-total-error-hint">Отгрузка заблокирована</small>`;
  return `<strong class="order-total-error">Цена не рассчитана</strong><small class="order-total-error-hint">Проверьте состав и цены</small>`;
};
const shippedFor = (id) =>
  deliveryNotes
    .filter((n) => n.restaurantId === id)
    .reduce((s, n) => s + n.total, 0);
const paymentConfirmed = (payment) => payment?.confirmed !== false && (!payment?.status || payment.status === "confirmed") && payment?.disputeStatus !== "open";
const paymentIsReturnCredit = payment => /\[panora:b2b-return-credit:[^\]]+\]/.test(String(payment?.note||""));
const paidFor = (id) =>
  payments
    .filter((p) => p.restaurantId === id && paymentConfirmed(p) && !paymentIsReturnCredit(p))
    .reduce((s, p) => s + p.amount, 0);
const financeNetFor = (id) => {
  const allocation=typeof window.panoraFinanceAllocation==='function'?window.panoraFinanceAllocation(id):null;
  return allocation?Number(allocation.net??(Number(allocation.debt||0)-Number(allocation.credit||0))):shippedFor(id)-paidFor(id);
};
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
let orderPartnerTypeFilter='all',orderPartnerNameFilter='all',orderDateFromFilter='',orderDateToFilter='',orderFilterOpen=false,orderStatusFilter='all',orderArchiveView='active';
const orderPartnerHtml=partner=>partner
  ? `<div class="order-partner"><strong class="order-partner-name">${commerceEscape(partner.name)}</strong><span class="partner-type partner-type-${normalizePartnerType(partner.partnerType)}">${partnerTypeLabel(partner.partnerType)}</span></div>`
  : '<span>—</span>';
const partnerExtraMessengers=r=>Array.isArray(r?.extraMessengers)?r.extraMessengers:[];
const partnerMessengerValue=(r,name)=>{
  const target=String(name||'').toLowerCase();
  return String(partnerExtraMessengers(r).find(item=>String(item?.name||'').toLowerCase()===target)?.contact||'').trim();
};
const partnerPreferredChannel=r=>{
  const stored=partnerMessengerValue(r,'__preferred__').toLowerCase();
  return ['whatsapp','email','telegram','signal','viber','messenger','copy'].includes(stored)?stored:'';
};
const partnerContactHtml=r=>{
  const extras=partnerExtraMessengers(r).filter(item=>item&&item.name&&item.contact&&String(item.name)!=='__preferred__');
  const rows=[r.phone&&['Телефон',r.phone],r.whatsapp&&['WhatsApp',r.whatsapp],r.telegram&&['Telegram',r.telegram],...extras.map(item=>[item.name,item.contact])].filter(Boolean);
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
  // Panora 5.32: the Partners screen is owned by the direct Supabase price editor.
  // Never allow the legacy restaurant-card renderer to overwrite it after it appears.
  if (
    document.querySelector("#view-restaurants")?.classList.contains("active") &&
    window.panoraDirectPartnerPrices?.renderCurrent
  ) {
    window.panoraDirectPartnerPrices.renderCurrent();
    return;
  }
  reloadRestaurantsFromStorage();
  const root = document.querySelector("#restaurantCards"),
    active = activeRestaurants(),
    removed = restaurants.filter((r) => r.deletedAt);
  root.innerHTML =
    (active.length
      ? active
          .map(
            (r) =>
              `<article class="restaurant-card"><div class="restaurant-card-head"><span class="tag">${partnerTypeLabel(r.partnerType)}</span><button class="restaurant-delete" data-delete-restaurant="${r.id}" type="button">Удалить</button></div><h3>${commerceEscape(r.name)}</h3><p>${commerceEscape(r.email)}<br>${commerceEscape(r.address || "Адрес доставки не указан")}</p>${partnerContactHtml(r)}${(r.legalName||r.taxId||r.billingAddress)?`<details class="partner-requisites"><summary>Реквизиты</summary><p><strong>${commerceEscape(r.legalName||r.name)}</strong>${r.taxId?`<br>NIF / CIF: ${commerceEscape(r.taxId)}`:''}${r.billingAddress?`<br>${commerceEscape(r.billingAddress)}`:''}</p></details>`:''}${commerceProducts().map((product) => `<label class="price-row"><span>${commerceProductLabel(product.id)}<small>Оптовая цена</small></span><span><input data-price="${r.id}:${product.id}" type="text" inputmode="decimal" autocomplete="off" value="${adminPartnerPrice(r.id,product.id,r.prices?.[product.id] ?? product.basePrice ?? product.price ?? 0).toFixed(2)}"> €</span></label>`).join("")}<div class="debt-row"><span>Задолженность</span><strong>${euro(financeNetFor(r.id))}</strong></div></article>`,
          )
          .join("")
      : '<div class="empty-row">Добавьте первого партнёра и назначьте ему индивидуальные цены.</div>') +
    (removed.length
      ? `<section class="removed-restaurants"><h3>Удалённые партнёры</h3>${removed.map((r) => `<div><span><strong>${commerceEscape(r.name)}</strong><small>${commerceEscape(r.email)}</small></span><button data-restore-restaurant="${r.id}" type="button">Восстановить</button></div>`).join("")}</section>`
      : "");
  document.querySelectorAll("[data-price]").forEach((i) => {
    let saving=false;
    let lastSaved=i.value;
    const setState=(state)=>{
      i.dataset.saveState=state||"";
      const row=i.closest(".price-row");
      if(row)row.dataset.saveState=state||"";
    };
    const commit = async () => {
      if(saving)return;
      const parsed=window.panoraParseDecimal?.(i.value);
      const [id,pid]=String(i.dataset.price||"").split(":");
      if(!id||!pid)return;
      if(parsed===null){
        i.value=adminPartnerPrice(id,pid,restaurant(id)?.prices?.[pid]||0).toFixed(2);
        setState("error");
        return;
      }
      const value=Number(parsed);
      const shown=value.toFixed(2);
      if(shown===lastSaved&&Number(restaurant(id)?.prices?.[pid])===value){
        i.value=shown;setState("saved");return;
      }

      // Update both bakery caches immediately, before waiting for the network.
      const r=restaurant(id);
      if(r){
        r.prices??={};
        r.prices[pid]=value;
      }
      try{
        const map=adminRestaurantPriceMap();
        map[String(id)]??={};
        map[String(id)][pid]=value;
        localStorage.setItem("panora-admin-restaurant-prices-v420",JSON.stringify(map));
      }catch{}
      localStorage.setItem("panora-restaurants",JSON.stringify(restaurants));
      i.value=shown;
      lastSaved=shown;
      saving=true;
      setState("saving");

      try{
        if(!window.panoraCloud?.saveRestaurantPriceConfirmed)throw new Error("Модуль облачных цен ещё не готов");
        const confirmed=await window.panoraCloud.saveRestaurantPriceConfirmed(id,pid,value);

        // Update the currently mounted node, because cloud events are allowed to
        // rerender the bakery partner cards during/after confirmation.
        reloadRestaurantsFromStorage();
        const live=document.querySelector(`#restaurantCards input[data-price="${CSS.escape(id+":"+pid)}"]`);
        const finalValue=Number(confirmed).toFixed(2);
        if(live){
          live.value=finalValue;
          live.dataset.saveState="saved";
          live.closest(".price-row")?.setAttribute("data-save-state","saved");
        }
        window.dispatchEvent(new CustomEvent("panora:partner-prices-changed",{detail:{restaurantId:id,productId:pid,price:Number(confirmed)}}));
        window.panoraPricing?.notifyWholesale(id,pid,Number(confirmed));
      }catch(error){
        console.warn("Panora wholesale cloud save",error);
        setState("error");
        // Pull back the authoritative cloud price instead of leaving a silent stale value.
        try{await window.panoraCloud?.refreshRestaurantPrices?.()}catch{}
        reloadRestaurantsFromStorage();
        const actual=adminPartnerPrice(id,pid,restaurant(id)?.prices?.[pid]||0);
        const live=document.querySelector(`#restaurantCards input[data-price="${CSS.escape(id+":"+pid)}"]`);
        if(live)live.value=Number(actual).toFixed(2);
        alert(`Не удалось сохранить оптовую цену в облаке: ${error.message||error}`);
      }finally{
        saving=false;
      }
    };
    i.oninput=()=>setState("editing");
    i.onblur=commit;
    i.onchange=commit;
    i.onkeydown=(event)=>{
      if(event.key==="Enter"){
        event.preventDefault();
        commit().then(()=>i.blur());
      }
    };
    i.onfocus=()=>{setState("editing");requestAnimationFrame(()=>i.select())};
  });
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
  const pricing=orderPricingState(o);
  if (o.status === "cancelled")
    return `<div class="order-flow order-flow-cancelled"><span>Заказ отменён</span></div>`;
  if (o.status === "shipped")
    return `<div class="order-flow">${step(1,'Подтвердить','done')}${step(2,'Отгрузить','done')}${step(3,'Накладная','current')}</div><div class="order-flow-actions"><button class="action-small primary-flow" data-note="${o.id}">Открыть накладную</button><button class="action-small" data-delivery-qr="${o.id}">QR-код</button></div>`;
  if (o.status === "submitted")
    return `<div class="order-flow">${step(1,'Подтвердить','current')}${step(2,'Отгрузить','next')}${step(3,'Накладная','next')}</div><div class="order-flow-actions"><button class="action-small primary-flow" data-confirm="${o.id}">Подтвердить заказ</button><button class="action-small danger-quiet" data-cancel-order="${o.id}"><span class="cancel-label-desktop">Отменить</span><span class="cancel-label-mobile">Отменить заказ</span></button></div>`;
  return `<div class="order-flow">${step(1,'Подтвердить','done')}${step(2,'Отгрузить','current')}${step(3,'Накладная','next')}</div><div class="order-flow-actions">${pricing.valid
    ? `<button class="action-small ship primary-flow" data-ship="${o.id}" title="После отгрузки будет создана накладная">Отгрузить заказ</button>`
    : `<button class="action-small ship primary-flow order-ship-disabled" type="button" disabled title="${pricing.reason==='empty'?'В заказе нет позиций':'Не рассчитана цена одной или нескольких позиций'}">Отгрузка недоступна</button>`}<button class="action-small danger-quiet" data-cancel-order="${o.id}"><span class="cancel-label-desktop">Отменить</span><span class="cancel-label-mobile">Отменить заказ</span></button></div>`;
}

const orderIsArchived=o=>['shipped','cancelled'].includes(String(o?.status||''));
const orderArchiveMatches=o=>orderArchiveView==='archive'?orderIsArchived(o):!orderIsArchived(o);


// Panora 6.75 — mobile Safari can cancel a click when the 2-second cloud poll
// replaces the order card between pointerdown and click. Freeze background
// order repaint briefly while the user is touching an order action.
(function installPanoraOrderInteractionLock(){
  if(window.panoraOrderInteractionLockInstalled)return;
  window.panoraOrderInteractionLockInstalled=true;
  const lock=event=>{
    if(!event.target?.closest?.(
      '[data-confirm],[data-ship],[data-cancel-order],[data-note],[data-delivery-qr],[data-order-messages]'
    ))return;
    window.panoraAdminOrderInteractionUntil=Date.now()+2500;
  };
  document.addEventListener('pointerdown',lock,true);
  document.addEventListener('touchstart',lock,{capture:true,passive:true});
})();

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
  const tableWrap=body.closest('.table-wrap');
  let archiveTabs=document.querySelector('#orderArchiveTabs');
  if(ordersView&&!archiveTabs){
    archiveTabs=document.createElement('div');
    archiveTabs.id='orderArchiveTabs';
    archiveTabs.className='order-archive-tabs';
    if(tableWrap)tableWrap.before(archiveTabs);
  }
  if(archiveTabs){
    const activeCount=orders.filter(order=>!orderIsArchived(order)).length;
    const archiveCount=orders.filter(order=>orderIsArchived(order)).length;
    archiveTabs.innerHTML=`
      <button type="button" class="${orderArchiveView==='active'?'active':''}" data-order-archive-view="active"><span>Активные</span><b>${activeCount}</b></button>
      <button type="button" class="${orderArchiveView==='archive'?'active':''}" data-order-archive-view="archive"><span>Архив</span><b>${archiveCount}</b></button>`;
    archiveTabs.querySelectorAll('[data-order-archive-view]').forEach(button=>button.onclick=()=>{
      const next=button.dataset.orderArchiveView;
      if(next===orderArchiveView)return;
      orderArchiveView=next;
      orderStatusFilter='all';
      orderFilterOpen=false;
      renderOrders();
    });
  }
  let statusBar=document.querySelector('#orderStatusBar');
  if(ordersView&&!statusBar){
    statusBar=document.createElement('div');statusBar.id='orderStatusBar';statusBar.className='order-status-bar';
    if(tableWrap)tableWrap.before(statusBar);
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
    const scopedOrders=orders.filter(orderArchiveMatches);
    statusBar.innerHTML=defs.map(([key,label])=>`<button type="button" class="${orderStatusFilter===key?'active':''}" data-order-status="${key}"><span>${label}</span><b>${scopedOrders.filter(statusGroups[key]).length}</b></button>`).join('');
    statusBar.querySelectorAll('[data-order-status]').forEach(button=>button.onclick=()=>{orderStatusFilter=button.dataset.orderStatus;renderOrders()});
  }
  const filterPanel=document.querySelector('#orderFilterPanel');
  const filterToggle=document.querySelector('#orderFilterToggle');
  const filterClose=document.querySelector('#orderFilterClose');
  const filterCount=document.querySelector('#orderFilterCount');
  const activeFilterCount=(orderStatusFilter!=='all'?1:0)+(orderPartnerTypeFilter!=='all'?1:0)+(orderPartnerNameFilter!=='all'?1:0)+(orderDateFromFilter?1:0)+(orderDateToFilter?1:0);
  if(filterPanel)filterPanel.hidden=!orderFilterOpen;
  if(filterToggle){
    filterToggle.setAttribute('aria-expanded',orderFilterOpen?'true':'false');
    filterToggle.classList.toggle('has-filters',activeFilterCount>0);
    filterToggle.onclick=()=>{orderFilterOpen=!orderFilterOpen;renderOrders()};
  }
  if(filterClose)filterClose.onclick=()=>{orderFilterOpen=false;renderOrders()};
  if(filterCount){filterCount.textContent=String(activeFilterCount);filterCount.hidden=!activeFilterCount}
  const statusSelect=document.querySelector('#orderStatusFilter');
  if(statusSelect){
    statusSelect.value=orderStatusFilter;
    statusSelect.onchange=()=>{orderStatusFilter=statusSelect.value;requestAnimationFrame(()=>renderOrders())};
  }
  const select=document.querySelector('#orderPartnerTypeFilter');
  if(select){
    select.value=orderPartnerTypeFilter;
    select.onchange=()=>{orderPartnerTypeFilter=select.value;requestAnimationFrame(()=>renderOrders())};
  }
  const partnerSelect=document.querySelector('#orderPartnerNameFilter');
  if(partnerSelect){
    const sortedPartners=restaurants.slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ru'));
    const optionSignature=sortedPartners.map(r=>`${r.id}:${r.name||''}`).join('|');
    /* Desktop browsers can briefly lock up when a native <select> is rebuilt
       synchronously from its own change event. Rebuild partner options only
       when the partner list itself changed, never on every filter pass. */
    if(partnerSelect.dataset.partnerOptionsSignature!==optionSignature){
      const partnerOptions=sortedPartners
        .map(r=>`<option value="${commerceEscape(r.id)}">${commerceEscape(r.name||'Без названия')}</option>`).join('');
      partnerSelect.innerHTML=`<option value="all">Все партнёры</option>${partnerOptions}`;
      partnerSelect.dataset.partnerOptionsSignature=optionSignature;
    }
    partnerSelect.value=restaurants.some(r=>r.id===orderPartnerNameFilter)?orderPartnerNameFilter:'all';
    orderPartnerNameFilter=partnerSelect.value;
    partnerSelect.onchange=()=>{
      const nextValue=partnerSelect.value;
      if(nextValue===orderPartnerNameFilter)return;
      orderPartnerNameFilter=nextValue;
      /* Let the desktop native select close before the table is repainted.
         Mobile keeps the same behaviour but also benefits from the deferred paint. */
      requestAnimationFrame(()=>renderOrders());
    };
  }
  const dateFrom=document.querySelector('#orderDateFromFilter');
  const dateTo=document.querySelector('#orderDateToFilter');
  if(dateFrom){dateFrom.value=orderDateFromFilter;dateFrom.onchange=()=>{orderDateFromFilter=dateFrom.value;requestAnimationFrame(()=>renderOrders())}}
  if(dateTo){dateTo.value=orderDateToFilter;dateTo.onchange=()=>{orderDateToFilter=dateTo.value;requestAnimationFrame(()=>renderOrders())}}
  const reset=document.querySelector('#orderFiltersReset');
  if(reset)reset.onclick=()=>{orderStatusFilter='all';orderPartnerTypeFilter='all';orderPartnerNameFilter='all';orderDateFromFilter='';orderDateToFilter='';orderFilterOpen=false;renderOrders()};

  const visibleOrders=orders.filter(order=>{
    if(!orderArchiveMatches(order))return false;
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
          return `<tr data-order-id="${commerceEscape(o.id)}" class="order-row order-row-${o.status}${o.status==='submitted'?' order-row-new':''}">
            <td class="order-mobile-number" data-label="Заказ"><strong>${commerceOrderNumber(o)}</strong></td>
            <td class="order-mobile-dates" data-label="Даты"><div class="order-dates">
              <span class="order-date-line"><em>Выпечка</em><strong class="date-desktop">${orderDateLabel(o.date, true)}</strong><strong class="date-mobile">${orderCompactDate(o.date)}</strong></span>
              <span class="order-date-line"><em>Доставка</em><strong class="date-desktop">${orderDateLabel(o.deliveryDate || o.date)}</strong><strong class="date-mobile">${orderCompactDate(o.deliveryDate || o.date)}</strong></span>
              ${note?.paymentDueDate ? `<span class="payment-due-date"><em>Оплата до</em><strong>${orderCompactDate(note.paymentDueDate)}</strong></span>` : ""}
            </div></td>
            <td class="order-mobile-partner" data-label="Партнёр">${orderPartnerHtml(partner||{name:o.partnerName||'—',partnerType:o.partnerType})}</td>
            <td class="order-mobile-items" data-label="Состав"><div class="order-items">${itemHtml}</div></td>
            <td class="order-mobile-total" data-label="Сумма">${orderTotalHtml(o)}</td>
            <td class="order-mobile-status" data-label="Статус"><span class="tag order-status-${o.status}">${orderStatus(o)}</span>${customerConfirmationHtml(o)}</td>
            <td class="order-action-cell" data-label="Действие">${orderActions(o)}<button type="button" class="admin-order-message-button" data-order-messages="${commerceEscape(o.id)}" data-order-label="${commerceOrderNumber(o)}">✉ Связь</button></td>
          </tr>`;
        })
        .join("")
    : `<tr><td class="empty-row" colspan="7">${orders.length?(orderArchiveView==='archive'?'В архиве по выбранным фильтрам заказов нет.':'Активных заказов по выбранным фильтрам нет.'):'Заказов пока нет.'}</td></tr>`;
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
  setTimeout(()=>window.panoraOrderMessages?.refreshUnread?.(),0);
}
async function confirmOrder(id) {
  window.panoraAdminOrderInteractionUntil=Date.now()+10000;
  const o = orders.find((x) => x.id === id);
  if (!o || o.status !== "submitted") return;
  const button=document.querySelector(`[data-confirm="${CSS.escape(id)}"]`);
  if(button?.disabled)return;
  if(button){button.disabled=true;button.dataset.originalText=button.textContent;button.textContent="Подтверждаем…"}
  try {
    const cloudConfigured=Boolean(window.PANORA_SUPABASE?.url&&window.PANORA_SUPABASE?.publishableKey);
    if (cloudConfigured) {
      if(!window.panoraCloud?.ready||typeof window.panoraCloud.updateOrderStatus!=="function")
        throw new Error("Облако ещё загружается или недоступно. Статус заказа не изменён — повторите после восстановления соединения.");
      await window.panoraCloud.updateOrderStatus(id, "confirmed");
    } else {
      o.status = "confirmed";
      cSave("panora-orders", orders);
    }
    window.panoraDataChannel?.postMessage({ type: "order-confirmed", id });
    window.dispatchEvent(new CustomEvent('panora:order-cycle-updated',{detail:{id,status:'confirmed'}}));
    renderCommerce();
    window.panoraRefreshNewOrderBadge?.();
  } catch (error) {
    if(button){button.disabled=false;button.textContent=button.dataset.originalText||"Подтвердить заказ"}
    const raw=String(error?.message||error||"");
    const staleProcessing=/order_status[\s\S]*processing|processing[\s\S]*order_status/i.test(raw);
    const missingRpc=/RPC статусов Panora 6\.74|panora_admin_set_order_status|PGRST202/i.test(raw);
    const message=missingRpc
      ?"Выполните SQL Panora 6.74 в Supabase и повторите действие."
      :staleProcessing
        ?"Повторно выполните SQL Panora 6.72, затем SQL 6.74."
        :raw.replace(/^\s*\{[\s\S]*?"message"\s*:\s*"([^"]+)"[\s\S]*\}\s*$/,'$1').slice(0,500);
    alert(`Не удалось подтвердить заказ:\n${message}`);
  }
}
async function cancelOrder(id) {
  window.panoraAdminOrderInteractionUntil=Date.now()+10000;
  const o = orders.find((x) => x.id === id);
  if (!o || o.status === "shipped" || o.status === "cancelled") return;
  if (!confirm("Отменить заказ и вернуть количество в свободный план?")) return;
  try {
    const cloudConfigured=Boolean(window.PANORA_SUPABASE?.url&&window.PANORA_SUPABASE?.publishableKey);
    if (cloudConfigured) {
      if(!window.panoraCloud?.ready||typeof window.panoraCloud.updateOrderStatus!=="function")
        throw new Error("Облако ещё загружается или недоступно. Заказ не отменён — повторите после восстановления соединения.");
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
function accountingDate(value) {
  if (!value || value === "—") return "—";
  try {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
      ? new Date(`${value}T12:00:00`)
      : new Date(value);
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch (_) {
    return String(value);
  }
}

function accountingAllocationFor(restaurantId) {
  const shared = typeof window.panoraFinanceAllocation === "function"
    ? window.panoraFinanceAllocation(restaurantId)
    : null;
  if (shared?.notes) return shared;

  const notes = deliveryNotes
    .filter((note) => note.restaurantId === restaurantId)
    .slice()
    .sort((a, b) =>
      String(a.date || "").localeCompare(String(b.date || "")) ||
      Number(a.number || 0) - Number(b.number || 0) ||
      String(a.id || "").localeCompare(String(b.id || ""))
    );
  const hasEffectiveReturnTotals=typeof window.panoraB2BEffectiveNoteTotal==='function';
  const confirmed = payments
    .filter((payment) =>
      payment.restaurantId === restaurantId &&
      paymentConfirmed(payment) &&
      (!hasEffectiveReturnTotals || !paymentIsReturnCredit(payment)) &&
      payment.status !== "cancelled" &&
      Number(payment.amount || 0) > 0
    )
    .slice()
    .sort((a, b) =>
      String(a.receivedAt || a.date || "").localeCompare(String(b.receivedAt || b.date || "")) ||
      String(a.id || "").localeCompare(String(b.id || ""))
    );

  const noteById = new Map(notes.map((note) => [String(note.id), note]));
  const paidByNote = new Map(notes.map((note) => [String(note.id), 0]));
  let fifoPool = 0;

  confirmed.forEach((payment) => {
    const amount = Math.max(0, Number(payment.amount || 0));
    const linked = payment.deliveryNoteId
      ? noteById.get(String(payment.deliveryNoteId))
      : null;
    if (!linked) {
      fifoPool += amount;
      return;
    }
    const key = String(linked.id);
    const already = Number(paidByNote.get(key) || 0);
    const total = typeof window.panoraB2BEffectiveNoteTotal==='function'?window.panoraB2BEffectiveNoteTotal(linked):Math.max(0, Number(linked.total || 0));
    const applied = Math.min(Math.max(0, total - already), amount);
    paidByNote.set(key, already + applied);
    fifoPool += Math.max(0, amount - applied);
  });

  notes.forEach((note) => {
    if (fifoPool <= 0) return;
    const key = String(note.id);
    const already = Number(paidByNote.get(key) || 0);
    const total = typeof window.panoraB2BEffectiveNoteTotal==='function'?window.panoraB2BEffectiveNoteTotal(note):Math.max(0, Number(note.total || 0));
    const due = Math.max(0, total - already);
    const applied = Math.min(due, fifoPool);
    if (applied > 0) {
      paidByNote.set(key, already + applied);
      fifoPool -= applied;
    }
  });

  const rows = notes.map((note) => {
    const total = typeof window.panoraB2BEffectiveNoteTotal==='function'?window.panoraB2BEffectiveNoteTotal(note):Math.max(0, Number(note.total || 0));
    const paid = Math.min(total, Math.max(0, Number(paidByNote.get(String(note.id)) || 0)));
    const due = Math.max(0, total - paid);
    return { note, total, paid, due, closed: due <= 0.005 };
  });

  return {
    notes: rows,
    debt: rows.reduce((sum, row) => sum + row.due, 0),
    credit: Math.max(0, fifoPool)
  };
}

function renderAccounting() {
  let activeInvoiceTotal = 0,
    activeAllocatedTotal = 0,
    debtTotal = 0,
    creditTotal = 0;

  document.querySelector("#accountRows").innerHTML = restaurants.length
    ? restaurants
        .map((r) => {
          const allocation = accountingAllocationFor(r.id);
          const activeNotes = (allocation.notes || []).filter((row) => Number(row.due || 0) > 0.005);
          const activeInvoices = activeNotes.reduce((sum, row) => sum + Number(row.total || 0), 0);
          const activeAllocated = activeNotes.reduce((sum, row) => sum + Number(row.paid || 0), 0);
          const debt = activeNotes.reduce((sum, row) => sum + Number(row.due || 0), 0);
          const credit = Number(allocation.credit || 0);
          const last =
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

          activeInvoiceTotal += activeInvoices;
          activeAllocatedTotal += activeAllocated;
          debtTotal += debt;
          creditTotal += credit;

          const balanceHtml = debt > 0.005
            ? `<span class="account-balance-debt"><small>Партнёр должен</small>К оплате пекарне <strong>${euro(debt)}</strong></span>`
            : credit > 0.005
              ? `<span class="account-balance-credit"><small>Пекарня получила аванс</small>Переплата партнёра <strong>${euro(credit)}</strong></span>`
              : `<span class="account-balance-zero"><small>Долга и аванса нет</small><strong>Расчёты закрыты</strong></span>`;

          return `<tr data-account-restaurant="${commerceEscape(r.id)}" tabindex="0" role="button" aria-label="Открыть расчёты партнёра ${commerceEscape(r.name)}">
            <td><button type="button" class="account-open-button" data-open-account="${commerceEscape(r.id)}"><strong>${commerceEscape(r.name)}</strong><small class="account-row-hint">Открыть расчёты</small></button></td>
            <td class="${debt > 0.005 ? "negative" : credit > 0.005 ? "positive" : ""}"><button type="button" class="account-balance-button" data-open-account="${commerceEscape(r.id)}">${balanceHtml}</button></td>
            <td><strong>${euro(activeInvoices)}</strong><small class="account-current-hint">${activeNotes.length} ${activeNotes.length===1?"накладная":"накладных"}</small></td>
            <td><strong>${euro(activeAllocated)}</strong><small class="account-current-hint">в текущие накладные</small></td>
            <td>${commerceEscape(accountingDate(last))}</td>
          </tr>`;
        })
        .join("")
    : '<tr><td class="empty-row" colspan="5">Партнёров пока нет.</td></tr>';

  document.querySelector("#totalShipped").textContent = euro(activeInvoiceTotal);
  document.querySelector("#totalPaid").textContent = euro(activeAllocatedTotal);
  document.querySelector("#totalDebt").textContent = euro(debtTotal);
  const creditNode = document.querySelector("#totalCredit");
  if (creditNode) creditNode.textContent = euro(creditTotal);
}
const reminderLocale=language=>language==='es'?'es-ES':language==='en'?'en-GB':'ru-RU';
const reminderPrettyDate=(value,language='ru',withYear=true)=>{
  if(!value)return '—';
  const raw=String(value).slice(0,10),date=new Date(`${raw}T12:00:00`);
  return new Intl.DateTimeFormat(reminderLocale(language),{day:'numeric',month:'long',year:withYear?'numeric':undefined}).format(date).replace(' г.','');
};
const reminderPrettyCutoff=(value,language='ru')=>{
  if(!value)return '—';
  const date=new Date(value);
  return new Intl.DateTimeFormat(reminderLocale(language),{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}).format(date).replace(' г.','');
};
const reminderChannelLabel=channel=>({whatsapp:'WhatsApp',email:'Email',telegram:'Telegram',signal:'Signal',viber:'Viber',messenger:'Messenger',copy:'Копировать'}[channel]||channel);
const reminderContact=(r,channel)=>{
  if(channel==='email')return String(r?.email||'').trim();
  if(channel==='whatsapp')return String(r?.whatsapp||r?.phone||'').trim();
  if(channel==='telegram')return String(r?.telegram||'').trim();
  if(channel==='signal')return partnerMessengerValue(r,'signal');
  if(channel==='viber')return partnerMessengerValue(r,'viber');
  if(channel==='messenger')return partnerMessengerValue(r,'messenger');
  if(channel==='copy')return 'copy';
  return '';
};
const reminderChannels=r=>{
  const base=['whatsapp','email','telegram','signal','viber','messenger','copy'].filter(channel=>channel==='copy'||Boolean(reminderContact(r,channel)));
  const preferred=partnerPreferredChannel(r);
  if(preferred&&base.includes(preferred))return [preferred,...base.filter(x=>x!==preferred)];
  return base;
};
const reminderUrl=(r,channel,message,subject='Panora')=>{
  const body=encodeURIComponent(message),contact=reminderContact(r,channel);
  if(channel==='whatsapp')return `https://wa.me/${cleanPhone(contact)}?text=${body}`;
  if(channel==='email')return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contact)}&su=${encodeURIComponent(subject)}&body=${body}`;
  if(channel==='telegram'){
    const username=String(contact).replace(/^https?:\/\/t\.me\//i,'').replace(/^@/,'').split(/[/?#]/)[0];
    return username?`https://t.me/${encodeURIComponent(username)}`:'';
  }
  if(channel==='signal'){
    const phone=cleanPhone(contact);return phone?`https://signal.me/#p/+${phone}`:'';
  }
  if(channel==='viber'){
    const phone=cleanPhone(contact);return phone?`viber://chat?number=%2B${phone}`:'';
  }
  if(channel==='messenger'){
    if(/^https?:\/\//i.test(contact))return contact;
    const username=contact.replace(/^@/,'').replace(/^m\.me\//i,'').trim();
    return username?`https://m.me/${encodeURIComponent(username)}`:'';
  }
  return '';
};
const reminderNeedsClipboard=channel=>['telegram','signal','viber','messenger'].includes(channel);
const reminderOpenChannel=(row,channel,message,subject,card)=>{
  if(channel==='copy'){
    copyText(message).then(()=>showReminderConfirm(card,row.key,channel));
    return;
  }
  const url=reminderUrl(row.r,channel,message,subject);
  if(!url)return;
  window.open(url,'_blank','noopener');
  if(reminderNeedsClipboard(channel))copyText(message).catch(()=>{});
  showReminderConfirm(card,row.key,channel);
};
const showReminderConfirm=(card,key,channel)=>{
  if(!card)return;
  const confirmButton=card.querySelector('[data-confirm-reminder-sent]');
  const hint=card.querySelector('[data-reminder-opened-hint]');
  if(confirmButton){
    confirmButton.hidden=false;
    confirmButton.dataset.confirmReminderSent=key;
    confirmButton.dataset.channel=channel;
    confirmButton.textContent=`Отметить как отправленное · ${reminderChannelLabel(channel)}`;
  }
  if(hint){
    hint.hidden=false;
    hint.textContent=channel==='copy'
      ? 'Текст скопирован. После отправки отметьте сообщение.'
      : reminderNeedsClipboard(channel)
        ? `Открыт ${reminderChannelLabel(channel)} · текст сообщения скопирован.`
        : `Открыт ${reminderChannelLabel(channel)}. После фактической отправки подтвердите ниже.`;
  }
};
const reminderCopy = {
  ru: (r,p)=>`Здравствуйте, ${r.name}! Напоминаем: заказ Panora на выпечку ${reminderPrettyDate(p.bakeDate,'ru',false)} можно оформить до ${reminderPrettyCutoff(p.cutoff,'ru')}. Для каждой позиции количество ниже оптового порога идёт по розничной цене, от порога — по цене партнёра.`,
  en: (r,p)=>`Hello, ${r.name}! A reminder that your Panora order for the ${reminderPrettyDate(p.bakeDate,'en',false)} bake must be placed by ${reminderPrettyCutoff(p.cutoff,'en')}. Each product below its wholesale threshold uses retail price; from the threshold the partner price applies.`,
  es: (r,p)=>`¡Hola, ${r.name}! Te recordamos que el pedido Panora para el horneado del ${reminderPrettyDate(p.bakeDate,'es',false)} debe realizarse antes del ${reminderPrettyCutoff(p.cutoff,'es')}. Cada producto por debajo de su umbral mayorista usa el precio minorista; desde el umbral se aplica el precio de socio.`,
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
  ru:(row)=>`Здравствуйте, ${row.r.name}! Напоминаем об оплате ${euro(row.balance)} по накладной DN-${String(row.note.number).padStart(4,"0")}. Плановая дата оплаты: ${reminderPrettyDate(row.note.paymentDueDate,'ru',false)}.`,
  en:(row)=>`Hello, ${row.r.name}! This is a reminder to pay ${euro(row.balance)} for delivery note DN-${String(row.note.number).padStart(4,"0")}. Expected payment date: ${reminderPrettyDate(row.note.paymentDueDate,'en',false)}.`,
  es:(row)=>`¡Hola, ${row.r.name}! Te recordamos el pago de ${euro(row.balance)} del albarán DN-${String(row.note.number).padStart(4,"0")}. Fecha prevista de pago: ${reminderPrettyDate(row.note.paymentDueDate,'es',false)}.`,
};
const paymentReminderMoment=payment=>{
  const time=value=>{const stamp=new Date(value||'').getTime();return Number.isFinite(stamp)?stamp:0};
  return Math.max(time(payment?.updatedAt),time(payment?.disputedAt),time(payment?.confirmedAt),time(payment?.receivedAt),time(payment?.date));
};
const paymentReminderAllocationSnapshot=(restaurantId,{forceActiveId=null}={})=>{
  const notes=deliveryNotes
    .filter(note=>String(note?.restaurantId||'')===String(restaurantId||''))
    .slice()
    .sort((a,b)=>
      String(a?.date||'').localeCompare(String(b?.date||''))||
      Number(a?.number||0)-Number(b?.number||0)||
      String(a?.id||'').localeCompare(String(b?.id||''))
    );
  const noteById=new Map(notes.map(note=>[String(note.id),note]));
  const paidByNote=new Map(notes.map(note=>[String(note.id),0]));
  const totalFor=note=>typeof window.panoraB2BEffectiveNoteTotal==='function'
    ? Math.max(0,Number(window.panoraB2BEffectiveNoteTotal(note)||0))
    : Math.max(0,Number(note?.total||0));
  const hasEffectiveReturnTotals=typeof window.panoraB2BEffectiveNoteTotal==='function';
  const activePayments=payments
    .filter(payment=>{
      if(String(payment?.restaurantId||'')!==String(restaurantId||''))return false;
      if(Number(payment?.amount||0)<=0)return false;
      if(hasEffectiveReturnTotals&&paymentIsReturnCredit(payment))return false;
      const id=String(payment?.id||'');
      if(forceActiveId&&id===String(forceActiveId))return true;
      return paymentConfirmed(payment)&&payment?.status!=='cancelled';
    })
    .slice()
    .sort((a,b)=>
      String(a?.receivedAt||a?.date||'').localeCompare(String(b?.receivedAt||b?.date||''))||
      String(a?.id||'').localeCompare(String(b?.id||''))
    );
  let fifoPool=0;
  activePayments.forEach(payment=>{
    const amount=Math.max(0,Number(payment?.amount||0));
    const linked=payment?.deliveryNoteId?noteById.get(String(payment.deliveryNoteId)):null;
    if(!linked){fifoPool+=amount;return}
    const id=String(linked.id),already=Math.max(0,Number(paidByNote.get(id)||0)),total=totalFor(linked);
    const applied=Math.min(Math.max(0,total-already),amount);
    paidByNote.set(id,already+applied);
    fifoPool+=Math.max(0,amount-applied);
  });
  notes.forEach(note=>{
    if(fifoPool<=0.005)return;
    const id=String(note.id),already=Math.max(0,Number(paidByNote.get(id)||0)),total=totalFor(note);
    const applied=Math.min(Math.max(0,total-already),fifoPool);
    if(applied>0){paidByNote.set(id,already+applied);fifoPool-=applied}
  });
  return new Map(notes.map(note=>{
    const total=totalFor(note),paid=Math.min(total,Math.max(0,Number(paidByNote.get(String(note.id))||0)));
    return[String(note.id),Math.max(0,total-paid)];
  }));
};
/* Panora 6.92: payment-reminder reopening is DN-specific. An unrelated disputed/cancelled
   payment must not resurrect a reminder whose delivery-note balance never changed. */
const paymentReminderStates=(restaurantId,allocation)=>{
  const currentDue=allocation?.notes
    ? new Map(allocation.notes.map(row=>[String(row?.note?.id||''),Math.max(0,Number(row?.due||0))]))
    : paymentReminderAllocationSnapshot(restaurantId);
  const own=payments.filter(payment=>String(payment?.restaurantId||'')===String(restaurantId||''));
  // Legacy reminder records had no debt snapshot, so preserve the old account-wide
  // invalidation rule for them. Modern reminders use balance + DN-specific reopen state.
  const globalVersion=own.reduce((latest,payment)=>Math.max(latest,paymentReminderMoment(payment)),0);
  const states=new Map([...currentDue.keys()].map(id=>[id,{version:globalVersion,reopenVersion:0}]));
  own.filter(payment=>
    !paymentIsReturnCredit(payment)&&
    Number(payment?.amount||0)>0&&
    (payment?.disputeStatus==='open'||payment?.status==='cancelled')
  ).forEach(payment=>{
    const id=String(payment?.id||'');if(!id)return;
    // Re-activate only this disputed/cancelled payment in a counterfactual allocation.
    // Any DN whose due changes is genuinely affected, including indirect FIFO shifts.
    const alternate=paymentReminderAllocationSnapshot(restaurantId,{forceActiveId:id});
    const moment=paymentReminderMoment(payment);
    currentDue.forEach((due,noteId)=>{
      const other=Math.max(0,Number(alternate.get(noteId)||0));
      if(Math.abs(other-due)<=0.005)return;
      const state=states.get(noteId)||{version:globalVersion,reopenVersion:0};
      state.reopenVersion=Math.max(Number(state.reopenVersion||0),moment);
      states.set(noteId,state);
    });
  });
  return states;
};
const paymentReminderSentIsCurrent=(sent,balance,state)=>{
  if(!sent?.sentAt)return false;
  const sentAt=new Date(sent.sentAt).getTime();
  if(!Number.isFinite(sentAt))return false;
  const storedBalance=Number(sent.balance);
  if(Number.isFinite(storedBalance)){
    if(Math.abs(storedBalance-Number(balance||0))>0.005)return false;
    return Number(state?.reopenVersion||0)<=sentAt;
  }
  // Legacy 6.86-and-earlier records had no debt snapshot. Keep them only when no
  // payment state changed after the reminder was marked as sent.
  return Number(state?.version||0)<=sentAt;
};
function paymentReminderRows() {
  const today = iso(new Date());
  const allocationByRestaurant = new Map();
  const stateByRestaurant = new Map();
  return deliveryNotes
    .filter((note) => note.paymentDueDate)
    .map((note) => {
      const r = restaurant(note.restaurantId);
      if (!r) return null;
      if(!allocationByRestaurant.has(r.id)){
        // Panora 6.94: reminders must be correct even before cloud-sync.js exposes
        // panoraFinanceAllocation. The local allocator already understands linked
        // payments, FIFO overflow and advances, so never fall back to stale note.paid.
        allocationByRestaurant.set(r.id,accountingAllocationFor(r.id));
      }
      const allocation=allocationByRestaurant.get(r.id);
      if(!stateByRestaurant.has(r.id))stateByRestaurant.set(r.id,paymentReminderStates(r.id,allocation));
      const row=allocation?.notes?.find(item=>String(item.note.id)===String(note.id));
      const balance=row?Number(row.due||0):0;
      if (balance <= 0.005) return null;
      const days = Math.round(
        (new Date(`${note.paymentDueDate}T12:00:00`) -
          new Date(`${today}T12:00:00`)) /
          86400000,
      );
      const key = `payment-${note.id}-${note.paymentDueDate}`;
      const reminderState=stateByRestaurant.get(r.id)?.get(String(note.id))||{version:0,reopenVersion:0},stored=reminderLog[key];
      const sent=paymentReminderSentIsCurrent(stored,balance,reminderState)?stored:null;
      return { note, r, balance, days, key, sent, reminderState };
    })
    .filter(Boolean)
    .sort((a, b) =>
      String(a.note.paymentDueDate).localeCompare(
        String(b.note.paymentDueDate),
      ),
    );
}
function markReminder(key, channel, row=null) {
  const record={ sentAt: new Date().toISOString(), channel };
  if(row?.note){
    record.balance=Number(row.balance||0);
    const allocation=accountingAllocationFor(row.r?.id);
    const state=row.reminderState||paymentReminderStates(row.r?.id,allocation).get(String(row.note.id))||{version:0,reopenVersion:0};
    record.stateVersion=Number(state?.version||0);
  }
  reminderLog[key] = record;
  cSave("panora-reminder-log", reminderLog);
  renderReminders();
}
function reminderOverdue(row){
  if(row.ordered||row.sent)return false;
  const trigger=row.stage==='repeat'?54:72;
  return Number(row.hours)<trigger-1;
}
function reminderCardActions(row,message,subject,waiting){
  if(row.sent||row.ordered)return '';
  const channels=reminderChannels(row.r);
  return `<div class="reminder-channel-line">
    <div class="reminder-actions">${channels.map((channel,index)=>{
      const label=reminderChannelLabel(channel),disabled=waiting?' disabled':'';
      return `<button type="button" class="${index===0?'preferred-channel ':''}${waiting?'reminder-disabled':''}" data-open-reminder-channel="${channel}"${disabled}>${label}</button>`;
    }).join('')}</div>
    <small data-reminder-opened-hint hidden></small>
    <button type="button" class="reminder-confirm-sent" data-confirm-reminder-sent hidden>Отметить как отправленное</button>
  </div>`;
}
function reminderOrderCard(x,windowState){
  const language=x.r.language||'ru',message=reminderCopy[language](x.r,x.plan),
    waiting=!windowState.allowed&&!x.ordered&&!x.sent,
    overdue=reminderOverdue(x),
    stageLabel=x.stage==='repeat'?'Повторное напоминание':'Первое напоминание',
    status=x.ordered?'Заказ получен':x.sent?`Отправлено ${new Date(x.sent.sentAt).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}`:
      waiting?(windowState.hour<12?'Доступно после 12:00':'Отложено до завтра, 12:00'):
      overdue?`Просрочено · до закрытия ${x.hours} ч.`:`До закрытия ${x.hours} ч.`,
    subject=`Panora · выпечка ${reminderPrettyDate(x.plan.bakeDate,language,false)}`;
  return `<article class="reminder-card ${x.ordered?'complete ':''}${x.sent?'sent ':''}${overdue?'overdue ':''}${waiting?'waiting':''}" data-reminder-card="${commerceEscape(x.key)}">
    <div class="reminder-card-top"><div><span class="tag">${stageLabel} · ${status}</span><h3>${commerceEscape(x.r.name)}</h3><p>Выпечка: <strong>${reminderPrettyDate(x.plan.bakeDate,'ru')}</strong> · заказ до <strong>${reminderPrettyCutoff(x.plan.cutoff,'ru')}</strong></p></div>${x.sent?`<span class="reminder-sent-channel">${reminderChannelLabel(x.sent.channel)}</span>`:''}</div>
    <p class="reminder-message">${commerceEscape(message)}</p>
    ${reminderCardActions(x,message,subject,waiting)}
  </article>`;
}
function paymentReminderCard(x,windowState){
  const language=x.r.language||'ru',message=paymentReminderCopy[language](x),
    waiting=!windowState.allowed&&!x.sent,
    status=x.sent?`Отправлено ${new Date(x.sent.sentAt).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}`:
      x.days<0?`Просрочено на ${Math.abs(x.days)} дн.`:x.days===0?'Оплата сегодня':`До оплаты ${x.days} дн.`,
    subject=`Panora · оплата DN-${String(x.note.number).padStart(4,'0')}`;
  return `<article class="reminder-card payment-reminder ${x.sent?'sent ':''}${x.days<0?'overdue ':''}${waiting?'waiting':''}" data-reminder-card="${commerceEscape(x.key)}">
    <div class="reminder-card-top"><div><span class="tag">Оплата · ${status}</span><h3>${commerceEscape(x.r.name)}</h3><p>Накладная <strong>DN-${String(x.note.number).padStart(4,'0')}</strong> · оплатить до <strong>${reminderPrettyDate(x.note.paymentDueDate,'ru')}</strong> · ${euro(x.balance)}</p></div>${x.sent?`<span class="reminder-sent-channel">${reminderChannelLabel(x.sent.channel)}</span>`:''}</div>
    <p class="reminder-message">${commerceEscape(message)}</p>
    ${reminderCardActions(x,message,subject,waiting)}
  </article>`;
}
function bindReminderCards(rows,paymentRows){
  const all=[...rows,...paymentRows];
  document.querySelectorAll('[data-reminder-card]').forEach(card=>{
    const key=card.dataset.reminderCard,row=all.find(item=>item.key===key);if(!row)return;
    const isPayment=Boolean(row.note),language=row.r.language||'ru',
      message=isPayment?paymentReminderCopy[language](row):reminderCopy[language](row.r,row.plan),
      subject=isPayment?`Panora · оплата DN-${String(row.note.number).padStart(4,'0')}`:`Panora · выпечка ${reminderPrettyDate(row.plan.bakeDate,language,false)}`;
    card.querySelectorAll('[data-open-reminder-channel]').forEach(button=>button.onclick=()=>{
      if(button.disabled)return;
      reminderOpenChannel(row,button.dataset.openReminderChannel,message,subject,card);
    });
  });
  document.querySelectorAll('[data-confirm-reminder-sent]').forEach(button=>button.onclick=()=>{
    const key=button.dataset.confirmReminderSent,channel=button.dataset.channel;
    if(!key||!channel)return;
    const row=all.find(item=>item.key===key)||null;
    if(confirm(`Отметить сообщение как отправленное через ${reminderChannelLabel(channel)}?`))markReminder(key,channel,row);
  });
}
function renderReminders() {
  const root=document.querySelector('#reminderList');if(!root)return;
  reloadRestaurantsFromStorage();
  const rows=reminderRows(),paymentRows=paymentReminderRows(),windowState=reminderSendWindow();
  const orderDue=rows.filter(x=>!x.ordered&&!x.sent),paymentDue=paymentRows.filter(x=>!x.sent);
  const overdue=orderDue.filter(reminderOverdue).length+paymentDue.filter(x=>x.days<0).length;
  const sent=rows.filter(x=>x.sent),paymentSent=paymentRows.filter(x=>x.sent),ordered=rows.filter(x=>x.ordered);

  document.querySelector('#reminderDue').textContent=orderDue.length+paymentDue.length;
  document.querySelector('#reminderOverdue').textContent=overdue;
  document.querySelector('#reminderSent').textContent=sent.length+paymentSent.length;
  document.querySelector('#reminderOrdered').textContent=ordered.length;

  const activeOrderRows=orderDue.slice().sort((a,b)=>Number(a.hours)-Number(b.hours));
  const activePaymentRows=paymentDue.slice().sort((a,b)=>Number(a.days)-Number(b.days));
  const sentRows=[...sent,...paymentSent].sort((a,b)=>String(b.sent?.sentAt||'').localeCompare(String(a.sent?.sentAt||'')));
  const orderedUnique=[...new Map(ordered.map(x=>[`${x.r.id}:${x.plan.bakeDate}`,x])).values()];

  const section=(title,count,content,className='')=>content?`<section class="reminder-work-section ${className}"><div class="reminder-section-head"><h3>${title}</h3><span>${count}</span></div>${content}</section>`:'';
  const activeHtml=[
    ...activeOrderRows.map(x=>reminderOrderCard(x,windowState)),
    ...activePaymentRows.map(x=>paymentReminderCard(x,windowState))
  ].join('');
  const sentHtml=sentRows.slice(0,20).map(x=>x.note?paymentReminderCard(x,windowState):reminderOrderCard(x,windowState)).join('');
  const orderedHtml=orderedUnique.map(x=>`<article class="reminder-ordered-compact"><div><strong>${commerceEscape(x.r.name)}</strong><span>Выпечка ${reminderPrettyDate(x.plan.bakeDate,'ru',false)}</span></div><b>Заказ получен ✓</b></article>`).join('');

  root.innerHTML=
    section('Нужно отправить',activeOrderRows.length+activePaymentRows.length,activeHtml,'reminder-working')+
    section('Отправлено',sentRows.length,sentHtml,'reminder-sent-section')+
    section('Уже заказали',orderedUnique.length,orderedHtml,'reminder-ordered-section')+
    (!activeHtml&&!sentHtml&&!orderedHtml?'<div class="empty-row">Сейчас напоминаний нет.</div>':'');

  bindReminderCards(rows,paymentRows);
}
function renderCommerce() {
  if(window.panoraMoneyEditing?.active){
    const active=window.panoraMoneyEditing.element;
    if(active&&(active.matches('[data-price]')||active.matches('[data-custom-price]')))return;
  }
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
    extraMessengers: [
      ["Signal",String(f.get("signal")||"").trim()],
      ["Viber",String(f.get("viber")||"").trim()],
      ["Messenger",String(f.get("messenger")||"").trim()],
      ["__preferred__",String(f.get("preferredChannel")||"whatsapp").trim()]
    ].filter(([,contact])=>contact).map(([name,contact])=>({name,contact})),
    partnerType: f.get("partnerType") || "other",
    language: f.get("language") || "ru",
    address: f.get("address"),
    legalName: String(f.get("legalName") || "").trim(),
    taxId: String(f.get("taxId") || "").trim().toUpperCase(),
    billingAddress: String(f.get("billingAddress") || "").trim(),
    prices: {
      plain: window.panoraParseDecimal?.(f.get("plainPrice")) ?? 0,
      pumpkin: window.panoraParseDecimal?.(f.get("pumpkinPrice")) ?? 0,
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
  const items = [];
  if (plain) items.push({ product: "plain", quantity: plain });
  if (pumpkin) items.push({ product: "pumpkin", quantity: pumpkin });
  if(!items.length){alert("Добавьте хотя бы одну позицию в заказ.");return}
  const r = restaurant(f.get("restaurant"));
  const prices=manualOrderPriceMap(r,items);
  orders.push({
    id: crypto.randomUUID(),
    number: null,
    restaurantId: r.id,
    date: f.get("date"),
    deliveryDate: f.get("date"),
    items,
    prices,
    taxRate: Number(bakerySettings.taxRate),
    status: "confirmed",
    _serverNumberPending:true,
    _itemSyncRequired:true,
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
  window.panoraAdminOrderInteractionUntil=Date.now()+3000;
  const o = orders.find((x) => x.id === id);
  if (!o) return;
  const pricing = orderPricingState(o);
  if (!pricing.valid) {
    alert(pricing.reason === "empty"
      ? "Отгрузка невозможна: в заказе нет позиций. Добавьте состав заказа или отмените его."
      : "Отгрузка невозможна: цена одной или нескольких позиций не рассчитана. Проверьте персональные цены партнёра и состав заказа.");
    return;
  }
  const r = restaurant(o.restaurantId),
    
    prices = o.prices || r.prices,
    form = document.querySelector("#shipmentForm"),
    summary = document.querySelector("#shipmentSummary"),
    previousTrays = traysAtRestaurant(r.id);
  form.orderId.value = id;
  form.paymentDueDate.value = "";
  form.traysDelivered.value = "";
  form.traysReturned.value = "";
  summary.innerHTML = `<strong>${commerceOrderNumber(o)} · ${commerceEscape(r.name)}</strong><p class="shipment-help">При необходимости уменьшите фактическое количество. Увеличить выше заказа нельзя.</p><div class="shipment-items">${o.items.map((i) => `<label class="shipment-item"><span><strong>${commerceProductLabel(i.product)}</strong><small>Заказано: ${i.quantity} шт. · ${euro(prices[i.product])}/шт.</small></span><input data-shipment-quantity data-product="${i.product}" data-max="${i.quantity}" type="number" inputmode="numeric" min="0" max="${i.quantity}" step="1" value="${i.quantity}"></label>`).join("")}</div><div class="shipment-total"><span>Фактическая сумма</span><strong id="shipmentActualTotal"></strong></div><div class="shipment-debt-preview"><span>Задолженность после поставки</span><strong id="shipmentDebtAfter"></strong></div>`;
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
      Math.max(0, financeNetFor(r.id) + total - paid),
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
  const pricingState = orderPricingState(o);
  if (!pricingState.valid) {
    alert(pricingState.reason === "empty"
      ? "Нельзя создать накладную: в заказе нет позиций."
      : "Нельзя создать накладную: цена одной или нескольких позиций не рассчитана.");
    return false;
  }
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
    const bad=actualItems.find(i=>!Number.isInteger(i.quantity)||i.quantity<0||i.quantity>Number(orderedItems.find(x=>x.product===i.product)?.quantity||0));
    const input=bad&&form.querySelector(`[data-shipment-quantity][data-product="${bad.product}"]`);
    form.querySelectorAll(".panora-inline-error").forEach(n=>n.remove());
    form.querySelectorAll(".panora-field-error").forEach(n=>n.classList.remove("panora-field-error"));
    if(input){const max=Number(orderedItems.find(x=>x.product===bad.product)?.quantity||0);input.classList.add("panora-field-error");input.insertAdjacentHTML("afterend",`<small class="panora-inline-error">Можно указать целое количество от 0 до ${max} шт.</small>`);input.focus();}
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
          financeNetFor(o.restaurantId) + total - paid,
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
    window.panoraRefreshNewOrderBadge?.();
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
const paymentAllocationMode=document.querySelector("#paymentAllocationMode");
const paymentDeliveryNoteLabel=document.querySelector("#paymentDeliveryNoteLabel");
const paymentDeliveryNote=document.querySelector("#paymentDeliveryNote");
const paymentRestaurantSelect=document.querySelector("#paymentRestaurant");
function refreshPaymentAllocationOptions(){
  if(!paymentAllocationMode||!paymentDeliveryNoteLabel||!paymentDeliveryNote||!paymentRestaurantSelect)return;
  const specific=paymentAllocationMode.value==="note";
  paymentDeliveryNoteLabel.hidden=!specific;
  if(!specific)return;
  const restaurantId=paymentRestaurantSelect.value;
  const allocation=window.panoraFinanceAllocation?.(restaurantId);
  const rows=(allocation?.notes||[])
    .filter(row=>Number(row.due||0)>0.005)
    .sort((a,b)=>String(a.note.date||"").localeCompare(String(b.note.date||""))||Number(a.note.number||0)-Number(b.note.number||0));
  paymentDeliveryNote.innerHTML=rows.length
    ? rows.map(row=>`<option value="${commerceEscape(row.note.id)}">DN-${String(row.note.number).padStart(4,"0")} · ${accountingDate(row.note.date)} · к оплате ${euro(row.due)}</option>`).join("")
    : `<option value="">Нет неоплаченных накладных</option>`;
  paymentDeliveryNote.disabled=!rows.length;
}
paymentAllocationMode?.addEventListener("change",refreshPaymentAllocationOptions);
paymentRestaurantSelect?.addEventListener("change",refreshPaymentAllocationOptions);

document.querySelector("#addPayment").onclick = () => {
  if (!restaurants.length) {
    alert("Сначала добавьте партнёра.");
    return;
  }
  if(paymentAllocationMode)paymentAllocationMode.value="fifo";
  refreshPaymentAllocationOptions();
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
    const allocationMode=String(f.get("allocationMode")||"fifo");
    const deliveryNoteId=allocationMode==="note"?String(f.get("deliveryNoteId")||""):null;
    if(allocationMode==="note"&&!deliveryNoteId)throw new Error("Выберите накладную для оплаты.");
    await window.panoraCloud.recordPaymentAtomic({
      restaurantId: f.get("restaurant"),
      amount,
      method: f.get("method") || "Наличные",
      note: f.get("note") || "",
      deliveryNoteId:deliveryNoteId||null,
      receivedAt: new Date().toISOString(),
    });
    document.querySelector("#paymentDialog").close();
    form.reset();
    renderCommerce();
    alert(
      allocationMode==="note"
        ? "Оплата принята и привязана к выбранной накладной."
        : "Общая оплата принята. Panora автоматически зачтёт её по самым старым неоплаченным накладным; остаток станет авансом / переплатой.",
    );
  } catch (error) {
    alert(`Оплата не сохранена: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = "Принять оплату";
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
      paymentIsReturnCredit(p) ? "Кредит возврата" : "Оплата",
      (-p.amount).toFixed(2),
      p.method,
      p.note,
      paymentIsReturnCredit(p) ? "Возврат товара" : paymentConfirmed(p) ? "Подтверждена" : "Ожидает подтверждения",
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

window.addEventListener("storage",event=>{
  if(event.key==="panora-restaurants"){
    try{reloadRestaurantsFromStorage();renderRestaurants();}catch{}
  }
});
window.addEventListener("panora:restaurants-ui-refresh",()=>{
  try{
    reloadRestaurantsFromStorage();
    renderRestaurants();
    fillRestaurants();
  }catch{}
});

window.addEventListener("panora:admin-prices-updated",()=>{
  try{reloadRestaurantsFromStorage();}catch{}
});
