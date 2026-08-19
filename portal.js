const PORTAL_ORDERS_LOCAL_CACHE_KEY="panora-portal-orders";
function savePortalOrdersFallback(rows){
  const all=Array.isArray(rows)?rows:[];
  window.panoraPortalSetRuntime?.("panora-orders",all);
  const archivedStatus=new Set(["delivered","cancelled","canceled","closed","archived"]);
  const working=[],archived=[];
  for(const row of all){
    const status=String(row?.status||"").toLowerCase();
    const isArchived=Boolean(row?.archived||row?.isArchived||row?.archive||archivedStatus.has(status));
    (isArchived?archived:working).push(row);
  }
  const compact=[...working,...archived.slice(0,20)];
  try{
    localStorage.setItem(PORTAL_ORDERS_LOCAL_CACHE_KEY,JSON.stringify(compact));
    return true;
  }catch(error){
    const quota=String(error?.name||"")==="QuotaExceededError"||/quota/i.test(String(error?.message||error||""));
    if(!quota)throw error;
    try{
      localStorage.removeItem(PORTAL_ORDERS_LOCAL_CACHE_KEY);
      localStorage.setItem(PORTAL_ORDERS_LOCAL_CACHE_KEY,JSON.stringify(working));
      return true;
    }catch(retryError){
      const retryQuota=String(retryError?.name||"")==="QuotaExceededError"||/quota/i.test(String(retryError?.message||retryError||""));
      if(!retryQuota)throw retryError;
      try{localStorage.removeItem(PORTAL_ORDERS_LOCAL_CACHE_KEY);}catch(_){}
      return false;
    }
  }
}

const portalRuntimeStore = window.panoraPortalRuntimeStore || (window.panoraPortalRuntimeStore={
  restaurants:null,
  orders:null,
  deliveryNotes:null,
  payments:null
});
const portalRuntimeSlot=key=>({
  "panora-restaurants":"restaurants",
  "panora-orders":"orders",
  "panora-delivery-notes":"deliveryNotes",
  "panora-payments":"payments"
}[key]||null);
const portalSetRuntime=(key,value)=>{
  const slot=portalRuntimeSlot(key);
  if(slot)portalRuntimeStore[slot]=Array.isArray(value)?value:[];
  return value;
};
window.panoraPortalSetRuntime=portalSetRuntime;

let account = null;
const portalOrderUnitPrice=(order,productId)=>{const saved=Number(order?.prices?.[productId]),fallback=Number(account?.prices?.[productId]);return Number.isFinite(saved)&&saved>0?saved:(Number.isFinite(fallback)&&fallback>0?fallback:0)};
const modal = $("#profileModal");
const portalPrivateKeys = new Set([
  "panora-restaurants",
  "panora-orders",
  "panora-delivery-notes",
  "panora-payments",
]);
const portalStorageKey = (key) =>
  portalPrivateKeys.has(key) ? `panora-portal-${key.slice(7)}` : key;
const portalRead = (key, fallback = []) => {
  const slot=portalRuntimeSlot(key);
  if(slot&&Array.isArray(portalRuntimeStore[slot]))return portalRuntimeStore[slot];
  try {
    const value=JSON.parse(localStorage.getItem(portalStorageKey(key)));
    if(slot&&Array.isArray(value))portalRuntimeStore[slot]=value;
    return value || fallback;
  } catch {
    return fallback;
  }
};
const portalMoney = (n) =>
  new Intl.NumberFormat(I18N[lang].locale, {
    style: "currency",
    currency: "EUR",
  }).format(Number(n) || 0);
const portalEscape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const portalOrderTotal = (o) =>
  o.items.reduce(
    (sum, i) =>
      sum +
      Number(i.quantity || 0) *
        portalOrderUnitPrice(o,i.product),
    0,
  ) *
  (1 + Number(o.taxRate || 0) / 100);
const portalPieces = () =>
  lang === "ru" ? "шт." : lang === "es" ? "uds." : "pcs";
const portalProduct = (id) =>
  PRODUCTS.find((p) => p.id === id)?.text?.[lang]?.[0] || id;
function portalRestaurants() {
  return portalRead("panora-restaurants");
}
function portalOrders() {
  return portalRead("panora-orders");
}
function portalNotes() {
  return portalRead("panora-delivery-notes");
}
function portalPayments() {
  return portalRead("panora-payments");
}
const portalPaymentFinanciallyConfirmed = (payment) =>
  payment?.confirmed !== false &&
  (!payment?.status || payment.status === "confirmed") &&
  payment?.disputeStatus !== "open";
function accountDebt() {
  const shipped = portalNotes()
      .filter((n) => n.restaurantId === account.id)
      .reduce((s, n) => s + Number(n.total || 0), 0),
    settled = portalPayments()
      .filter((p) => p.restaurantId === account.id && portalPaymentFinanciallyConfirmed(p))
      .reduce((s, p) => s + Number(p.amount || 0), 0);
  // Panora 6.98: this legacy profile card is labelled as debt, not net balance.
  // FIFO overpayment / return credit can create an advance, but must never be rendered
  // here as a negative debt. The full workspace shows the advance separately.
  return Math.max(0, shipped - settled);
}
function accountText(key) {
  const x = {
    ru: {
      cabinet: "Кабинет партнёра",
      profile: "Профиль партнёра",
      phone: "Телефон",
      address: "Адрес доставки",
      login: "Вход для партнёра",
      email: "Email",
      code: "Код доступа",
      enter: "Войти",
      error: "Неверный email или код доступа",
      debt: "Текущая задолженность",
      prices: "Ваши цены",
      orders: "Заказы",
      noOrders: "Заказов пока нет",
      logout: "Выйти",
      close: "Закрыть",
      plain: "Льняной бездрожжевой хлеб с семенами",
      pumpkin: "Тыквенный бездрожжевой хлеб с семенами",
      piece: "за 1 шт.",
      shipped: "Отгружен",
      confirmed: "Подтверждён",
      bake: "Выпечка",
      delivery: "Доставка",
    },
    en: {
      cabinet: "Partner account",
      profile: "Partner profile",
      phone: "Phone",
      address: "Delivery address",
      login: "Partner sign in",
      email: "Email",
      code: "Access code",
      enter: "Sign in",
      error: "Incorrect email or access code",
      debt: "Current balance due",
      prices: "Your prices",
      orders: "Orders",
      noOrders: "No orders yet",
      logout: "Sign out",
      close: "Close",
      plain: "Yeast-free flaxseed bread with seeds",
      pumpkin: "Yeast-free pumpkin bread with seeds",
      piece: "per piece",
      shipped: "Shipped",
      confirmed: "Confirmed",
      bake: "Bake",
      delivery: "Delivery",
    },
    es: {
      cabinet: "Área del socio",
      profile: "Perfil del socio",
      phone: "Teléfono",
      address: "Dirección de entrega",
      login: "Acceso para socios",
      email: "Email",
      code: "Código de acceso",
      enter: "Entrar",
      error: "Email o código incorrecto",
      debt: "Deuda actual",
      prices: "Tus precios",
      orders: "Pedidos",
      noOrders: "Aún no hay pedidos",
      logout: "Salir",
      close: "Cerrar",
      plain: "Pan de lino sin levadura con semillas",
      pumpkin: "Pan de calabaza sin levadura con semillas",
      piece: "por unidad",
      shipped: "Enviado",
      confirmed: "Confirmado",
      bake: "Horneado",
      delivery: "Entrega",
    },
  };
  return x[lang][key];
}
function checkoutLabel() {
  return account
    ? tr("cart.checkout")
    : lang === "ru"
      ? "Войти и оформить заказ"
      : lang === "es"
        ? "Entrar y realizar pedido"
        : "Sign in to order";
}
function updateCheckoutAccess() {
  $("#checkoutButton").textContent = checkoutLabel();
  $("#profileButton").classList.toggle("account-active", Boolean(account));
  $("#profileButton").title = account ? account.name : accountText("login");
  const label = $("#profileButton").querySelector(".account-entry-label");
  if (label) label.textContent = lang === "es" ? "Área" : lang === "en" ? "Account" : "Кабинет";
}
function restoreAccount() {
  const id = localStorage.getItem("panora-account-id");
  account =
    portalRestaurants().find((r) => r.id === id && !r.deletedAt) || null;
  if (account) applyAccount();
  else localStorage.removeItem("panora-account-id");
}
function syncAccountChrome() {
  if(!account)return;
  SHOW_PRICES = true;
  if(account?.language)window.panoraSetLanguage?.(account.language);
  const plain=PRODUCTS.find((p) => p.id === "plain");
  const pumpkin=PRODUCTS.find((p) => p.id === "pumpkin");
  if(plain&&account?.prices?.plain!=null)plain.price=Number(account.prices.plain);
  if(pumpkin&&account?.prices?.pumpkin!=null)pumpkin.price=Number(account.prices.pumpkin);
  const f = $("#checkoutForm");
  if(f){
    f.restaurant.value = account.name;
    f.restaurant.readOnly = true;
    f.email.value = account.email;
    f.email.readOnly = true;
    const checkoutIsBeingEdited = f.contains(document.activeElement);
    if (!checkoutIsBeingEdited && !String(f.phone.value || "").trim())
      f.phone.value = account.phone || "";
    if (!checkoutIsBeingEdited && !String(f.address.value || "").trim())
      f.address.value = account.address || "";
  }
  updateCheckoutAccess();
}
window.panoraSyncAccountChrome=syncAccountChrome;
function applyAccount() {
  syncAccountChrome();
  renderProducts();
  renderCart();
  renderAccountModal();
}
function portalCurrentProductPrice(product) {
  if (!product) return 0;
  if (account?.prices?.[product.id] != null) return Number(account.prices[product.id]);
  try {
    const managed = JSON.parse(localStorage.getItem("panora-public-products") || localStorage.getItem("panora-products") || "[]");
    const item = managed.find((p) => String(p.id) === String(product.id));
    if (item) return Number(item.basePrice ?? item.price ?? 0);
  } catch {}
  return Number(product.basePrice ?? product.price ?? 0);
}
function renderAccountModal() {
  const modal = $("#profileModal");
  if (!account) {
    modal.innerHTML = `<div class="modal-head"><div><span class="kicker">Panora</span><h2>${accountText("login")}</h2></div><button class="close-button" data-portal-close>×</button></div><form class="account-login" id="accountLogin"><label><span>${accountText("email")}</span><input name="email" type="email" required autocomplete="email"></label><label><span>${accountText("code")}</span><input name="code" required autocomplete="current-password"></label><p class="account-error" id="accountError">${accountText("error")}</p><button class="button button-primary full">${accountText("enter")}</button></form>`;
    modal.querySelector("[data-portal-close]").onclick = closePanels;
    modal.querySelector("#accountLogin").onsubmit = loginAccount;
    return;
  }
  const orders = portalOrders()
    .filter((o) => o.restaurantId === account.id)
    .slice()
    .reverse();
  modal.innerHTML = `<div class="modal-head"><div><span class="kicker">Panora</span><h2>${tr("profile.title")}</h2></div><button class="close-button" data-portal-close>×</button></div><div class="account-head"><div class="account-avatar">${portalEscape(account.name[0].toUpperCase())}</div><div><strong>${portalEscape(account.name)}</strong><span>${portalEscape(account.email)}</span></div></div><div class="account-balance"><span>${accountText("debt")}</span><strong>${portalMoney(accountDebt())}</strong></div><section class="account-section"><h3>${accountText("prices")}</h3>${PRODUCTS.map((product) => `<div class="account-price"><span>${portalEscape(pText(product)[0])}<small>${accountText("piece")}</small></span><strong>${portalMoney(portalCurrentProductPrice(product))}</strong></div>`).join("")}</section><section class="account-section"><h3>${accountText("orders")}</h3>${orders.length ? orders.map((o) => `<div class="account-order"><span><strong>PN-${String(o.number).padStart(4, "0")}</strong><small>${o.date} · ${o.items.reduce((s, i) => s + i.quantity, 0)} ${lang === "ru" ? "шт." : lang === "es" ? "uds." : "pcs"}</small></span><span>${o.status === "shipped" ? accountText("shipped") : accountText("confirmed")}</span></div>`).join("") : `<p>${accountText("noOrders")}</p>`}</section><div class="account-actions"><button class="button button-ghost" id="accountLogout">${accountText("logout")}</button><button class="button button-primary" data-portal-close>${accountText("close")}</button></div>`;
  modal
    .querySelectorAll("[data-portal-close]")
    .forEach((b) => (b.onclick = closePanels));
  modal.querySelector("#accountLogout").onclick = logoutAccount;
}
function loginAccount(e) {
  e.preventDefault();
  const f = new FormData(e.target),
    email = String(f.get("email")).trim().toLowerCase(),
    code = String(f.get("code")).trim(),
    found = portalRestaurants().find(
      (r) =>
        !r.deletedAt &&
        r.email.toLowerCase() === email &&
        String(r.accessCode) === code,
    );
  if (!found) {
    $("#accountError").classList.add("show");
    return;
  }
  account = found;
  localStorage.setItem("panora-account-id", account.id);
  applyAccount();
  showToast(account.name);
  if ("Notification" in window && Notification.permission === "default")
    Notification.requestPermission().catch(() => {});
}
function logoutAccount() {
  account = null;
  SHOW_PRICES = true;
  const managedRetail = (() => { try { return JSON.parse(localStorage.getItem("panora-public-products") || localStorage.getItem("panora-products") || "[]"); } catch { return []; } })();
  const retailById = new Map(managedRetail.map((item) => [item.id, Number(item.basePrice ?? item.price ?? 0)]));
  PRODUCTS.forEach((p) => {
    if (retailById.has(p.id)) p.price = retailById.get(p.id);
  });
  localStorage.removeItem("panora-account-id");
  const f = $("#checkoutForm");
  f.restaurant.value = "";
  f.restaurant.readOnly = false;
  f.email.value = "";
  f.email.readOnly = false;
  renderProducts();
  renderCart();
  renderAccountModal();
  updateCheckoutAccess();
}
function portalStatus(status) {
  const labels = {
    ru: {
      submitted: "Новый заказ",
      confirmed: "Подтверждён",
      shipped: "Отгружен",
      cancelled: "Отменён",
    },
    en: {
      submitted: "New order",
      confirmed: "Confirmed",
      shipped: "Shipped",
      cancelled: "Cancelled",
    },
    es: {
      submitted: "Pedido nuevo",
      confirmed: "Confirmado",
      shipped: "Enviado",
      cancelled: "Cancelado",
    },
  };
  return labels[lang][status] || status;
}
function canRestaurantCancel(order) {
  if (order.status !== "submitted") return false;
  const plan = productionPlans().find(
    (p) =>
      p.bakeDate === order.date &&
      order.items.some((i) => i.product === p.product),
  );
  return !plan || new Date(plan.cutoff) > new Date();
}
function restaurantCancelOrder(id) {
  const orders = portalRead("panora-orders"),
    order = orders.find((o) => o.id === id);
  if (!order || !canRestaurantCancel(order)) return;
  const number = `PN-${String(order.number).padStart(4, "0")}`,
    items = order.items
      .map(
        (i) => `${portalEscape(portalProduct(i.product))} — ${i.quantity} ${portalPieces()}`,
      )
      .join("\n"),
    question =
      lang === "ru"
        ? `Отменить заказ ${number}?\n\n${items}\n\nКоличество вернётся в свободный план выпечки.`
        : lang === "es"
          ? `¿Cancelar el pedido ${number}?\n\n${items}\n\nLas unidades volverán al plan disponible.`
          : `Cancel order ${number}?\n\n${items}\n\nThe quantities will return to available bake capacity.`;
  if (!confirm(question)) return;
  order.status = "cancelled";
  const plans = productionPlans();
  order.items.forEach((i) => {
    const p = plans.find(
      (x) => x.bakeDate === order.date && x.product === i.product,
    );
    if (p) p.ordered = Math.max(0, Number(p.ordered || 0) - i.quantity);
  });
  savePortalOrdersFallback(orders);
  localStorage.setItem("panora-production-plans", JSON.stringify(plans));
  renderAccountModal();
  renderProducts();
  renderCart();
  const released = order.items
      .map((i) => `${portalEscape(portalProduct(i.product))} ${i.quantity}`)
      .join(", "),
    message =
      lang === "ru"
        ? `${number} отменён. Освобождено: ${released} шт.`
        : lang === "es"
          ? `${number} cancelado. Liberado: ${released} uds.`
          : `${number} cancelled. Released: ${released} pcs.`;
  showToast(message);
}
const baseRenderAccountModal = renderAccountModal;
renderAccountModal = function () {
  baseRenderAccountModal();
  if (!account) return;
  const current = portalOrders()
      .filter((o) => o.restaurantId === account.id)
      .slice()
      .reverse(),
    rows = [...document.querySelectorAll(".account-order")];
  rows.forEach((row, index) => {
    const order = current[index],
      right = row.lastElementChild;
    if (!order || !right) return;
    const cancel =
      lang === "ru" ? "Отменить" : lang === "es" ? "Cancelar" : "Cancel";
    right.innerHTML = `<span class="account-status">${portalStatus(order.status)}</span>${canRestaurantCancel(order) ? `<button class="account-cancel" data-account-cancel="${order.id}">${cancel}</button>` : ""}`;
  });
  document
    .querySelectorAll("[data-account-cancel]")
    .forEach(
      (b) => (b.onclick = () => restaurantCancelOrder(b.dataset.accountCancel)),
    );
};
function renderDetailedAccountModal() {
  const modal = $("#profileModal");
  if (!account) {
    modal.innerHTML = `<div class="modal-head"><div><span class="kicker">Panora</span><h2>${accountText("login")}</h2></div><button class="close-button" data-portal-close>×</button></div><form class="account-login" id="accountLogin"><label><span>${accountText("email")}</span><input name="email" type="email" required autocomplete="email"></label><label><span>${accountText("code")}</span><input name="code" required autocomplete="current-password"></label><p class="account-error" id="accountError">${accountText("error")}</p><button class="button button-primary full">${accountText("enter")}</button></form>`;
    modal.querySelector("[data-portal-close]").onclick = closePanels;
    modal.querySelector("#accountLogin").onsubmit = loginAccount;
    return;
  }
  const orders = portalOrders()
      .filter((o) => o.restaurantId === account.id)
      .slice()
      .reverse(),
    cancel = lang === "ru" ? "Отменить" : lang === "es" ? "Cancelar" : "Cancel";
  modal.innerHTML = `<div class="modal-head"><div><span class="kicker">Panora</span><h2>${accountText("cabinet")}</h2></div><button class="close-button" data-portal-close>×</button></div><section class="account-profile"><h3>${accountText("profile")}</h3><div class="account-head"><div class="account-avatar">${portalEscape(account.name[0].toUpperCase())}</div><div><strong>${portalEscape(account.name)}</strong><span>${portalEscape(account.email)}</span></div></div><dl><div><dt>${accountText("phone")}</dt><dd>${portalEscape(account.phone || "—")}</dd></div><div><dt>${accountText("address")}</dt><dd>${portalEscape(account.address || "—")}</dd></div></dl></section><div class="account-balance"><span>${accountText("debt")}</span><strong>${portalMoney(accountDebt())}</strong></div><section class="account-section"><h3>${accountText("prices")}</h3><div class="account-price"><span>${accountText("plain")}<small>${accountText("piece")}</small></span><strong>${portalMoney(account.prices.plain)}</strong></div><div class="account-price"><span>${accountText("pumpkin")}<small>${accountText("piece")}</small></span><strong>${portalMoney(account.prices.pumpkin)}</strong></div></section><section class="account-section"><h3>${accountText("orders")}</h3>${orders.length ? orders.map((o) => `<article class="account-order"><div class="account-order-main"><header><strong>PN-${String(o.number).padStart(4, "0")}</strong><b>${portalMoney(portalOrderTotal(o))}</b></header><small>${accountText("bake")}: ${o.date}<br>${accountText("delivery")}: ${o.deliveryDate || o.date}</small><ul>${o.items.map((i) => `<li><span>${portalEscape(portalProduct(i.product))}</span><strong>${i.quantity} ${portalPieces()}</strong></li>`).join("")}</ul></div><div class="account-order-side"><span class="account-status">${portalStatus(o.status)}</span>${canRestaurantCancel(o) ? `<button class="account-cancel" data-account-cancel="${o.id}">${cancel}</button>` : ""}</div></article>`).join("") : `<p>${accountText("noOrders")}</p>`}</section><div class="account-actions"><button class="button button-ghost" id="accountLogout">${accountText("logout")}</button><button class="button button-primary" data-portal-close>${accountText("close")}</button></div>`;
  modal
    .querySelectorAll("[data-portal-close]")
    .forEach((b) => (b.onclick = closePanels));
  modal.querySelector("#accountLogout").onclick = logoutAccount;
  modal
    .querySelectorAll("[data-account-cancel]")
    .forEach(
      (b) => (b.onclick = () => restaurantCancelOrder(b.dataset.accountCancel)),
    );
}
renderAccountModal = renderDetailedAccountModal;
function portalPrintNote(note) {
  const order = portalOrders().find((o) => o.id === note.orderId),
    history = portalNotes()
      .filter((x) => x.restaurantId === note.restaurantId)
      .slice()
      .sort(
        (a, b) =>
          String(a.date).localeCompare(String(b.date)) ||
          Number(a.number) - Number(b.number),
      ),
    index = history.findIndex((x) => x.id === note.id),
    included = index < 0 ? history : history.slice(0, index + 1),
    totalDebt = included.reduce((s, x) => s + Number(x.total || 0), 0),
    confirmedPayments = portalPayments().filter(
      (p) =>
        p.restaurantId === note.restaurantId &&
        portalPaymentFinanciallyConfirmed(p) &&
        String(p.date) <= String(note.date),
    ),
    paidAll = confirmedPayments.reduce((s, p) => s + Number(p.amount || 0), 0),
    paidHere = confirmedPayments
      .filter((p) => p.deliveryNoteId === note.id)
      .reduce((s, p) => s + Number(p.amount || 0), 0),
    balance = Math.max(0, totalDebt - paidAll),
    previous = Math.max(0, balance - Number(note.total || 0) + paidHere),
    w = window.open("", "_blank");
  if (!w) return;
  const product = (i) => portalProduct(i.product),
    previousLabel =
      lang === "ru"
        ? "Задолженность до поставки"
        : lang === "es"
          ? "Deuda antes de la entrega"
          : "Balance before shipment",
    paidLabel =
      lang === "ru"
        ? "Оплачено при отгрузке"
        : lang === "es"
          ? "Pagado en la entrega"
          : "Paid on shipment",
    balanceLabel =
      lang === "ru"
        ? "Остаток задолженности"
        : lang === "es"
          ? "Deuda pendiente"
          : "Remaining balance",
    paymentDueLabel =
      lang === "ru"
        ? "Плановая дата оплаты"
        : lang === "es"
          ? "Fecha prevista de pago"
          : "Expected payment date",
    paymentDueLine = note.paymentDueDate
      ? `<br><strong>${paymentDueLabel}: ${note.paymentDueDate}</strong>`
      : "",
    trayLine = note.customerTraysReceived == null
      ? `${lang === "ru" ? "Пекарня выдала лотков" : lang === "es" ? "Bandejas entregadas por la panadería" : "Trays issued by the bakery"}: ${Number(note.traysDelivered || 0)}`
      : `${lang === "ru" ? "Лотки: выдано" : lang === "es" ? "Bandejas: entregadas" : "Trays: issued"} ${Number(note.traysDelivered || 0)} · ${lang === "ru" ? "принято" : lang === "es" ? "recibidas" : "received"} ${Number(note.customerTraysReceived)} · ${lang === "ru" ? "возвращено" : lang === "es" ? "devueltas" : "returned"} ${Number(note.customerTraysReturned || 0)} · ${lang === "ru" ? "осталось" : lang === "es" ? "saldo" : "balance"} ${Number(note.trayBalanceAfter || 0)}`;
  w.document.write(
    `<title>Panora DN-${String(note.number).padStart(4, "0")}</title><style>body{font:15px Arial;max-width:760px;margin:40px auto;color:#17231b}h1{font:38px Georgia}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{padding:10px;border-bottom:1px solid #ccc;text-align:left}.trays{padding:12px;background:#f1f6ef;border-radius:8px}.total{text-align:right;font-size:18px;line-height:1.6}.debt{font-size:20px;border-top:1px solid #aaa;padding-top:6px}.sign{display:flex;justify-content:space-between;margin-top:70px}</style><h1>Panora</h1><h2>DN-${String(note.number).padStart(4, "0")}</h2><p>${portalEscape(account.name)}<br>${portalEscape(account.address || "")}</p><p>${accountText("bake")}: ${order?.date || note.date}<br>${accountText("delivery")}: ${order?.deliveryDate || note.date}${paymentDueLine}</p><table><tr><th>${lang === "ru" ? "Товар" : lang === "es" ? "Producto" : "Product"}</th><th>${lang === "ru" ? "Количество" : lang === "es" ? "Cantidad" : "Quantity"}</th><th>${lang === "ru" ? "Цена" : lang === "es" ? "Precio" : "Price"}</th><th>${lang === "ru" ? "Сумма" : lang === "es" ? "Importe" : "Amount"}</th></tr>${note.items.map((i) => `<tr><td>${product(i)}</td><td>${i.quantity} ${portalPieces()}</td><td>${portalMoney(note.prices[i.product])}</td><td>${portalMoney(i.quantity * note.prices[i.product])}</td></tr>`).join("")}</table><p class="trays"><strong>${trayLine}</strong></p><p class="total">${lang === "ru" ? "Итого" : lang === "es" ? "Total" : "Total"}: <strong>${portalMoney(note.total)}</strong><br>${previousLabel}: ${portalMoney(previous)}<br>${paidLabel}: ${portalMoney(paidHere)}<br><strong class="debt">${balanceLabel}: ${portalMoney(balance)}</strong></p><div class="sign"><span>Panora __________________</span><span>${portalEscape(account.name)} __________________</span></div>`,
  );
  w.document.close();
  w.print();
}
const accountWithDocuments = renderAccountModal;
renderAccountModal = function () {
  accountWithDocuments();
  if (!account) return;
  const current = portalOrders()
      .filter((o) => o.restaurantId === account.id)
      .slice()
      .reverse(),
    notes = portalNotes(),
    rows = [...document.querySelectorAll(".account-order")];
  rows.forEach((row, index) => {
    const order = current[index],
      note = notes.find((n) => n.orderId === order?.id),
      side = row.querySelector(".account-order-side");
    if (note && side)
      side.insertAdjacentHTML(
        "beforeend",
        `<button class="account-note" data-account-note="${note.id}">${lang === "ru" ? "Накладная" : lang === "es" ? "Albarán" : "Delivery note"}</button>`,
      );
  });
  const payments = portalPayments()
      .filter((p) => p.restaurantId === account.id)
      .slice()
      .reverse(),
    actions = modal.querySelector(".account-actions");
  if (actions) {
    const title =
        lang === "ru"
          ? "История оплат"
          : lang === "es"
            ? "Historial de pagos"
            : "Payment history",
      empty =
        lang === "ru"
          ? "Оплат пока нет"
          : lang === "es"
            ? "Aún no hay pagos"
            : "No payments yet",
      pending =
        lang === "ru"
          ? "Ожидает подтверждения"
          : lang === "es"
            ? "Pendiente de confirmación"
            : "Awaiting confirmation";
    actions.insertAdjacentHTML(
      "beforebegin",
      `<section class="account-section account-payments"><h3>${title}</h3>${payments.length ? payments.map((p) => `<div><span><strong>${p.date}</strong><small>${p.method || ""}${p.note ? ` · ${p.note}` : ""}${p.confirmed === false ? ` · ${pending}` : ""}</small></span><b>${portalMoney(p.amount)}</b></div>`).join("") : `<p>${empty}</p>`}</section>`,
    );
  }
  modal
    .querySelectorAll("[data-account-note]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          portalPrintNote(notes.find((n) => n.id === b.dataset.accountNote))),
    );
};
function showOrderItemCosts() {
  if (!account) return;
  const orders = portalOrders()
      .filter((o) => o.restaurantId === account.id)
      .slice()
      .reverse(),
    rows = [...modal.querySelectorAll(".account-order")];
  rows.forEach((row, orderIndex) => {
    const order = orders[orderIndex];
    if (!order || row.dataset.costs === order.id) return;
    const items = [...row.querySelectorAll(".account-order-main li")];
    items.forEach((line, itemIndex) => {
      const item = order.items[itemIndex];
      if (!item) return;
      const unit = portalOrderUnitPrice(order,item.product),
        subtotal =
          Number(item.quantity || 0) *
          unit *
          (1 + Number(order.taxRate || 0) / 100),
        value = line.querySelector("strong");
      if (value)
        value.innerHTML = `${item.quantity} ${portalPieces()}<small class="order-item-cost">× ${portalMoney(unit)} = ${portalMoney(subtotal)}</small>`;
    });
    row.dataset.costs = order.id;
  });
}
const orderCostObserver = new MutationObserver(showOrderItemCosts);
orderCostObserver.observe(modal, { childList: true, subtree: true });
function enforceDateConfirmation() {
  const confirmBox = $("#confirmDeliveryDate"),
    button = $("#checkoutButton"),
    count = cartData().count;
  if (!count) confirmBox.checked = false;
  button.disabled = false;
  button.classList.remove("needs-minimum");
  button.classList.toggle(
    "needs-date-confirmation",
    !confirmBox.checked,
  );
}
const baseRenderCart = renderCart;
renderCart = function () {
  baseRenderCart();
  enforceDateConfirmation();
};
document.addEventListener(
  "change",
  (e) => {
    if (e.target.id === "confirmDeliveryDate") enforceDateConfirmation();
    if (e.target.id === "cartDeliveryDate") {
      $("#confirmDeliveryDate").checked = false;
      enforceDateConfirmation();
    }
  },
  true,
);
const originalApplyLanguage = applyLanguage;
applyLanguage = function () {
  originalApplyLanguage();
  renderAccountModal();
  updateCheckoutAccess();
};
const originalShowShare = showShare;
showShare = function (order) {
  /* В облачной версии заказ создаёт только portal-cloud.js после успешной транзакции Supabase. */ if (
    account &&
    !window.PANORA_SUPABASE
  ) {
    const orders = portalOrders();
    if (!orders.some((o) => o.sourceId === order.id)) {
      const plans = productionPlans(),
        schedule = plans.find((x) => x.bakeDate === order.date),
        settings = portalRead("panora-bakery-settings", { taxRate: 0 });
      const saved = {
        id: crypto.randomUUID(),
        sourceId: order.id,
        number: (orders.at(-1)?.number || 0) + 1,
        restaurantId: account.id,
        date: order.date,
        deliveryDate: schedule?.deliveryDate || order.date,
        items: order.items.map((i) => ({
          product: i.id,
          quantity: i.quantityPieces,
        })),
        prices: structuredClone(account.prices),
        taxRate: Number(settings.taxRate || 0),
        status: "submitted",
      };
      orders.push(saved);
      savePortalOrdersFallback(orders);
      saved.items.forEach((i) => {
        const p = plans.find(
          (x) => x.bakeDate === saved.date && x.product === i.product,
        );
        if (p) p.ordered = Number(p.ordered || 0) + i.quantity;
      });
      localStorage.setItem("panora-production-plans", JSON.stringify(plans));
    }
    renderAccountModal();
  }
  originalShowShare(order);
};
function checkoutProfileKey() {
  return `panora-checkout-profile-${account?.id || "guest"}`;
}

const checkoutProfileFields = [
  "contact",
  "phone",
  "email",
  "address",
  "fulfillment",
  "time",
];

function readCheckoutProfile() {
  try {
    return JSON.parse(localStorage.getItem(checkoutProfileKey()) || "{}");
  } catch {
    return {};
  }
}

function checkoutFieldKey(field) {
  return `${checkoutProfileKey()}-${field}`;
}

function checkoutContactValue(field, fallback = "") {
  const direct = localStorage.getItem(checkoutFieldKey(field));
  if (String(direct || "").trim()) return String(direct).trim();
  const saved = readCheckoutProfile();
  return String(saved[field] || fallback || "").trim();
}

function saveCheckoutProfile(event) {
  if (!account) return;
  const form = $("#checkoutForm");
  const saved = readCheckoutProfile();
  const changedField = event?.target?.name;
  if (changedField && checkoutProfileFields.includes(changedField)) {
    const value = String(event.target.value || "").trim();
    if (changedField === "phone" || changedField === "address") {
      if (value) {
        saved[changedField] = value;
        localStorage.setItem(checkoutFieldKey(changedField), value);
      }
    } else {
      saved[changedField] = event.target.value;
    }
  } else {
    checkoutProfileFields.forEach((field) => {
      const control = form.elements.namedItem(field);
      if (!control) return;
      const value = String(control.value || "").trim();
      if (field === "phone" || field === "address") {
        if (value) {
          saved[field] = value;
          localStorage.setItem(checkoutFieldKey(field), value);
        }
      } else if (value || !(field in saved)) {
        saved[field] = control.value;
      }
    });
  }
  localStorage.setItem(checkoutProfileKey(), JSON.stringify(saved));
}
function restoreCheckoutProfile() {
  if (!account) return;
  const form = $("#checkoutForm");
  const saved = readCheckoutProfile();
  const fillEmpty = (field, value) => {
    const control = form.elements.namedItem(field);
    if (control && !String(control.value || "").trim()) {
      control.value = value || "";
    }
  };
  fillEmpty("contact", saved.contact || account.name);
  fillEmpty("phone", checkoutContactValue("phone", account.phone));
  fillEmpty("email", saved.email || account.email);
  fillEmpty("address", checkoutContactValue("address", account.address));
  if(form.fulfillment){
    const validFulfillment=["delivery","pickup"];
    const requested=validFulfillment.includes(String(saved.fulfillment||""))?String(saved.fulfillment):"delivery";
    form.fulfillment.value=requested;
    if(!validFulfillment.includes(String(form.fulfillment.value||""))){
      form.fulfillment.value="delivery";
      if(!form.fulfillment.value&&form.fulfillment.options.length)form.fulfillment.selectedIndex=0;
    }
  }
  if (saved.time) form.time.value = saved.time;
  toggleFulfillment();
}
function updateMobileCheckoutSummary() {
  const form = $("#checkoutForm");
  const saved = readCheckoutProfile();
  const effective = {
    contact:
      String(form.contact.value || saved.contact || account?.name || "").trim(),
    phone:
      String(
        form.phone.value || checkoutContactValue("phone", account?.phone),
      ).trim(),
    email:
      String(form.email.value || saved.email || account?.email || "").trim(),
    address:
      String(
        form.address.value || checkoutContactValue("address", account?.address),
      ).trim(),
  };
  const complete = Boolean(
    account && effective.contact && effective.phone && effective.address,
  );
  form.classList.toggle("returning-checkout", complete);
  form
    .querySelectorAll("[data-customer-fields]")
    .forEach((x) => x.removeAttribute("data-customer-fields"));
  [
    form.restaurant.closest("label"),
    form.contact.closest(".form-row"),
    form.email.closest("label"),
    form.address.closest("label"),
  ]
    .filter(Boolean)
    .forEach((x) => x.setAttribute("data-customer-fields", ""));
  let summary = $("#savedCustomerSummary");
  if (!summary) {
    summary = document.createElement("section");
    summary.id = "savedCustomerSummary";
    summary.className = "saved-customer-summary";
    form.prepend(summary);
  }
  summary.hidden = !complete;
  if (complete) {
    summary.innerHTML =
      '<div><strong></strong><span></span></div><button type="button"></button>';
    summary.querySelector("strong").textContent = account.name;
    summary.querySelector("span").textContent =
      `${effective.contact} · ${effective.phone} · ${effective.address}`;
    summary.querySelector("button").textContent =
      lang === "ru" ? "Изменить" : lang === "es" ? "Editar" : "Edit";
    summary.querySelector("button").onclick = () => {
      form.classList.remove("returning-checkout");
      summary.hidden = true;
      form.contact.focus();
    };
  }
}
$("#checkoutForm").addEventListener("input", saveCheckoutProfile);
$("#checkoutForm").addEventListener("change", saveCheckoutProfile);
let checkoutAfterLogin = false;
function openCheckoutForAccount() {
  const form = $("#checkoutForm");
  restoreCheckoutProfile();
  if(form.fulfillment&&!["delivery","pickup"].includes(String(form.fulfillment.value||""))){
    form.fulfillment.value="delivery";
    if(!form.fulfillment.value&&form.fulfillment.options.length)form.fulfillment.selectedIndex=0;
  }
  updateMobileCheckoutSummary();
  try{syncDateSelect?.();syncCartDeliveryDate?.()}catch{}
  const cartDate=String($("#cartDeliveryDate")?.value||"");
  const formValues=[...(form.date?.options||[])].map(option=>String(option.value||"")).filter(Boolean);
  let resolved=String(selectedBakeDate||"");
  if(!formValues.includes(resolved))resolved=formValues.includes(cartDate)?cartDate:"";
  // Panora 6.66: checkout has no visible date control. It can only carry
  // forward a date already validated and selected on the first step.
  if(resolved){
    selectedBakeDate=resolved;
    try{localStorage.setItem("panora-bake-date",resolved)}catch{}
    form.date.disabled=false;
    form.date.value=resolved;
  }else if(form.date){
    form.date.value="";
  }
  originalCheckout();
}
const originalCheckout = $("#checkoutButton").onclick;
$("#checkoutButton").onclick = () => {
  const count = cartData().count;
  const mobile=window.matchMedia?.('(max-width:720px)')?.matches;
  const dateSelect=$("#cartDeliveryDate");
  const dateReady=Boolean(dateSelect?.value&&!dateSelect?.disabled);
  if(mobile&&dateReady)$("#confirmDeliveryDate").checked=true;
  if (!$("#confirmDeliveryDate").checked) {
    showToast(
      lang === "ru"
        ? "Сначала выберите и подтвердите день выпечки"
        : lang === "es"
          ? "Primero elige y confirma el día de horneado"
          : "First choose and confirm the bake day",
    );
    const box = $("#confirmDeliveryDate");
    box.closest("label")?.scrollIntoView({ behavior: "smooth", block: "center" });
    box.focus();
    return;
  }
  if (!account) {
    checkoutAfterLogin = true;
    closePanels();
    setTimeout(() => openPanel($("#profileModal")), 180);
    return;
  }
  openCheckoutForAccount();
};
$("#checkoutForm").addEventListener(
  "submit",
  (e) => {
    // portal-cloud.js owns the final checkout in authenticated mode. Running
    // this legacy local-plan guard first can cancel a valid cloud order using
    // a stale selectedBakeDate from a previous render.
    if (window.panoraPortalCloud) return;
    if (!account) {
      e.preventDefault();
      e.stopImmediatePropagation();
      closePanels();
      setTimeout(() => openPanel($("#profileModal")), 180);
      return;
    }
    saveCheckoutProfile();
    const schedules = productionPlans().filter(
        (p) =>
          p.bakeDate === selectedBakeDate &&
          Object.keys(cart).includes(p.product),
      ),
      closed = schedules.some(
        (p) => !p.open || new Date(p.cutoff) <= new Date(),
      );
    if (closed) {
      e.preventDefault();
      e.stopImmediatePropagation();
      alert(
        lang === "ru"
          ? "Приём заказов на эту выпечку уже закрыт."
          : lang === "es"
            ? "Los pedidos para este horneado están cerrados."
            : "Orders for this bake are closed.",
      );
      renderBakeDates();
      renderProducts();
      renderCart();
    }
  },
  true,
);
$("#checkoutForm").addEventListener(
  "invalid",
  (e) => {
    e.preventDefault();
    const field = e.target,
      label = field.closest("label")?.querySelector("span")?.textContent || "";
    showToast(
      lang === "ru"
        ? `Заполните поле: ${label}`
        : lang === "es"
          ? `Completa el campo: ${label}`
          : `Complete the field: ${label}`,
    );
    field.focus();
    field.scrollIntoView({ behavior: "smooth", block: "center" });
  },
  true,
);
function updateFirstOrderGuide() {
  const guide = document.querySelector(".how-section");
  if (!guide) return;
  const hasOrder = Boolean(
    account && portalOrders().some((o) => o.restaurantId === account.id),
  );
  guide.hidden = hasOrder;
  guide.setAttribute("aria-hidden", String(hasOrder));
}
const accountRenderWithGuide = renderAccountModal;
renderAccountModal = function () {
  accountRenderWithGuide();
  updateFirstOrderGuide();
};
const loginThenCheckout = loginAccount;
loginAccount = function (e) {
  loginThenCheckout(e);
  if (account && checkoutAfterLogin) {
    checkoutAfterLogin = false;
    setTimeout(openCheckoutForAccount, 220);
  }
};
let knownRestaurantOrderStatuses = new Map(
  portalOrders().map((order) => [order.id, order.status]),
);
function notifyRestaurantStatusChanges() {
  if (!account) return;
  portalOrders()
    .filter((order) => order.restaurantId === account.id)
    .forEach((order) => {
      const previous = knownRestaurantOrderStatuses.get(order.id);
      if (
        previous &&
        previous !== order.status &&
        ["confirmed", "cancelled"].includes(order.status)
      ) {
        const number = `PN-${String(order.number).padStart(4, "0")}`,
          message =
            order.status === "confirmed"
              ? lang === "ru"
                ? `${number}: заказ принят пекарней`
                : lang === "es"
                  ? `${number}: pedido aceptado por la panadería`
                  : `${number}: order accepted by the bakery`
              : lang === "ru"
                ? `${number}: заказ отменён пекарней`
                : lang === "es"
                  ? `${number}: pedido cancelado por la panadería`
                  : `${number}: order cancelled by the bakery`;
        showToast(message);
        if ("Notification" in window && Notification.permission === "granted")
          new Notification("Panora", {
            body: message,
            icon: "icon.svg",
            tag: `panora-status-${order.id}`,
          });
      }
      knownRestaurantOrderStatuses.set(order.id, order.status);
    });
}
function refreshRestaurantData() {
  if (account) {
    const fresh = portalRestaurants().find(
      (r) => r.id === account.id && !r.deletedAt,
    );
    if (fresh) account = fresh;
    else account = null;
  }
  notifyRestaurantStatusChanges();
  renderAccountModal();
  showOrderItemCosts();
  updateCheckoutAccess();
  renderProducts();
  renderCart();
}
window.addEventListener("storage", (event) => {
  if (
    [
      "panora-restaurants",
      "panora-orders",
      "panora-payments",
      "panora-delivery-notes",
      "panora-production-plans",
    ].includes(event.key)
  )
    refreshRestaurantData();
});
window.addEventListener("focus", refreshRestaurantData);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshRestaurantData();
});
if ("BroadcastChannel" in window) {
  const panoraChannel = new BroadcastChannel("panora-data");
  panoraChannel.onmessage = refreshRestaurantData;
  const notify = () => panoraChannel.postMessage({ updatedAt: Date.now() });
  document
    .querySelector("#checkoutForm")
    .addEventListener("submit", () => setTimeout(notify, 50));
  window.panoraNotify = notify;
}
restoreAccount();
renderAccountModal();
showOrderItemCosts();
updateCheckoutAccess();
renderCart();

// Panora 6.62: restaurant-workspace/dynamic-products handle pricing refresh
// without rebuilding product images during background polling.
