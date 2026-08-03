/* Panora restaurant workspace: focused navigation over the existing secure account data. */
(() => {
  "use strict";
  const previousRender = renderAccountModal;
  const tx = {
    ru: {
      title: "Кабинет партнёра",
      home: "Главная",
      newOrder: "Новый заказ",
      orders: "Мои заказы",
      notes: "Накладные",
      payments: "Оплаты",
      profile: "Профиль",
      debt: "Задолженность",
      prices: "Персональные цены",
      emptyOrders: "Заказов пока нет",
      emptyNotes: "Накладных пока нет",
      emptyPayments: "Операций пока нет",
      openNote: "Открыть накладную",
      noteLibrary: "Библиотека накладных",
      noteLibraryHint: "Рабочие накладные Panora и архив поставок вашего ресторана.",
      mainNote: "Основная для работы",
      otherForms: "Другие формы",
      bake: "Выпечка",
      delivery: "Поставка",
      pieces: "шт.",
      signOut: "Выйти",
      close: "Закрыть",
      pending: "Ожидает подтверждения",
      startOrder: "Выбрать хлеб и дату",
      orderHelp: "Выберите хлеб, затем подтвердите дату поставки в корзине.",
      phone: "Телефон",
      address: "Адрес доставки",
      partnerType: "Тип партнёра", restaurant: "Ресторан", shop: "Магазин", hotel: "Отель", cafe: "Кафе", catering: "Кейтеринг", other: "Другое",
      restaurantName: "Название партнёра", email: "Email для входа", telegram: "Telegram", whatsapp: "WhatsApp", messengers: "Мессенджеры", messengersHint: "Укажите контакты, по которым Panora может быстро связаться с вами.", telegramHint: "Имя пользователя, например @panora", whatsappHint: "Номер с кодом страны, например +34 600 000 000", billingDetails: "Реквизиты", billingHint: "Данные для накладных и счетов.", legalName: "Юридическое название", taxId: "NIF / CIF", billingAddress: "Адрес для счетов", language: "Язык сообщений", profileData: "Данные партнёра", profileHint: "Эти данные подставляются в заказ и накладные.", saveProfile: "Сохранить изменения", savingProfile: "Сохраняем…", profileSaved: "Профиль сохранён", required: "Обязательное поле", emailLocked: "Email для входа меняет менеджер Panora.", accountAccess: "Доступ к кабинету",
      finance: "Баланс и оплаты",
      deliveredTotal: "Поставлено",
      paidTotal: "Оплачено",
      pendingTotal: "Ожидает подтверждения",
      operationHistory: "История операций",
      payment: "Оплата",
      withoutNote: "без накладной",
      balanceAfter: "Остаток после операции",
      paymentDue: "Оплатить до",
      traysDelivered: "Передано лотков",
      traysReturned: "Возвращено",
      trayBalance: "Лотки у вас",
      overview: "Сегодня в Panora",
      nextDelivery: "Ближайшая поставка",
      activeOrder: "Текущий заказ",
      repeatOrder: "Повторить заказ",
      continueOrder: "Продолжить заказ",
      noActiveOrder: "Активных заказов нет",
      saved: "Сохранено",
      offline: "Нет сети",
      syncing: "Синхронизация…",
      noteSearch: "Номер накладной",
      allMonths: "Все месяцы",
      nothingFound: "Накладные не найдены",
    },
    en: {
      title: "Partner workspace",
      home: "Home",
      newOrder: "New order",
      orders: "My orders",
      notes: "Delivery notes",
      payments: "Payments",
      profile: "Profile",
      debt: "Balance due",
      prices: "Your prices",
      emptyOrders: "No orders yet",
      emptyNotes: "No delivery notes yet",
      emptyPayments: "No transactions yet",
      openNote: "Open delivery note",
      noteLibrary: "Delivery note library",
      noteLibraryHint: "Working Panora delivery notes and your restaurant delivery archive.",
      mainNote: "Main working document",
      otherForms: "Other formats",
      bake: "Bake",
      delivery: "Delivery",
      pieces: "pcs",
      signOut: "Sign out",
      close: "Close",
      pending: "Awaiting confirmation",
      startOrder: "Choose bread and date",
      orderHelp: "Choose bread, then confirm the delivery date in the basket.",
      phone: "Phone",
      address: "Delivery address",
      partnerType: "Partner type", restaurant: "Restaurant", shop: "Shop", hotel: "Hotel", cafe: "Cafe", catering: "Catering", other: "Other",
      restaurantName: "Partner name", email: "Sign-in email", telegram: "Telegram", whatsapp: "WhatsApp", messengers: "Messengers", messengersHint: "Add the contacts Panora can use to reach you quickly.", telegramHint: "Username, for example @panora", whatsappHint: "Number with country code, for example +34 600 000 000", billingDetails: "Billing details", billingHint: "Details used on delivery notes and invoices.", legalName: "Legal name", taxId: "NIF / CIF", billingAddress: "Billing address", language: "Message language", profileData: "Partner details", profileHint: "These details are used in orders and delivery notes.", saveProfile: "Save changes", savingProfile: "Saving…", profileSaved: "Profile saved", required: "Required field", emailLocked: "Your Panora manager changes the sign-in email.", accountAccess: "Account access",
      finance: "Balance and payments",
      deliveredTotal: "Delivered",
      paidTotal: "Paid",
      pendingTotal: "Awaiting confirmation",
      operationHistory: "Transaction history",
      payment: "Payment",
      withoutNote: "without delivery note",
      balanceAfter: "Balance after transaction",
      paymentDue: "Payment due",
      traysDelivered: "Delivered trays",
      traysReturned: "Returned",
      trayBalance: "At your restaurant",
      overview: "Today in Panora", nextDelivery: "Next delivery", activeOrder: "Current order", repeatOrder: "Repeat order", continueOrder: "Continue order", noActiveOrder: "No active orders", saved: "Saved", offline: "Offline", syncing: "Syncing…", noteSearch: "Delivery note number", allMonths: "All months", nothingFound: "No delivery notes found",
    },
    es: {
      title: "Área del socio",
      home: "Inicio",
      newOrder: "Nuevo pedido",
      orders: "Mis pedidos",
      notes: "Albaranes",
      payments: "Pagos",
      profile: "Perfil",
      debt: "Deuda actual",
      prices: "Tus precios",
      emptyOrders: "Aún no hay pedidos",
      emptyNotes: "Aún no hay albaranes",
      emptyPayments: "Aún no hay movimientos",
      openNote: "Abrir albarán",
      noteLibrary: "Biblioteca de albaranes",
      noteLibraryHint: "Albaranes Panora de trabajo y archivo de entregas de tu restaurante.",
      mainNote: "Documento principal",
      otherForms: "Otros formatos",
      bake: "Horneado",
      delivery: "Entrega",
      pieces: "uds.",
      signOut: "Salir",
      close: "Cerrar",
      pending: "Pendiente de confirmación",
      startOrder: "Elegir pan y fecha",
      orderHelp: "Elige el pan y confirma la fecha de entrega en la cesta.",
      phone: "Teléfono",
      address: "Dirección de entrega",
      partnerType: "Tipo de socio", restaurant: "Restaurante", shop: "Tienda", hotel: "Hotel", cafe: "Cafetería", catering: "Catering", other: "Otro",
      restaurantName: "Nombre del socio", email: "Email de acceso", telegram: "Telegram", whatsapp: "WhatsApp", messengers: "Mensajería", messengersHint: "Añade los contactos que Panora puede usar para comunicarse contigo.", telegramHint: "Usuario, por ejemplo @panora", whatsappHint: "Número con prefijo, por ejemplo +34 600 000 000", billingDetails: "Datos fiscales", billingHint: "Datos para albaranes y facturas.", legalName: "Razón social", taxId: "NIF / CIF", billingAddress: "Dirección de facturación", language: "Idioma de mensajes", profileData: "Datos del socio", profileHint: "Estos datos se usan en pedidos y albaranes.", saveProfile: "Guardar cambios", savingProfile: "Guardando…", profileSaved: "Perfil guardado", required: "Campo obligatorio", emailLocked: "El responsable de Panora cambia el email de acceso.", accountAccess: "Acceso a la cuenta",
      finance: "Saldo y pagos",
      deliveredTotal: "Entregado",
      paidTotal: "Pagado",
      pendingTotal: "Pendiente de confirmar",
      operationHistory: "Historial de movimientos",
      payment: "Pago",
      withoutNote: "sin albarán",
      balanceAfter: "Saldo después del movimiento",
      paymentDue: "Pagar antes del",
      traysDelivered: "Bandejas entregadas",
      traysReturned: "Devueltas",
      trayBalance: "En tu restaurante",
      overview: "Hoy en Panora", nextDelivery: "Próxima entrega", activeOrder: "Pedido actual", repeatOrder: "Repetir pedido", continueOrder: "Continuar pedido", noActiveOrder: "No hay pedidos activos", saved: "Guardado", offline: "Sin conexión", syncing: "Sincronizando…", noteSearch: "Número de albarán", allMonths: "Todos los meses", nothingFound: "No se encontraron albaranes",
    },
  };
  const t = (key) => (tx[lang] || tx.ru)[key];
  const localDate = (value) => {
    if (!value) return "—";
    const raw = String(value).slice(0, 10);
    const date = new Date(`${raw}T12:00:00`);
    const locale = lang === "es" ? "es-ES" : lang === "en" ? "en-GB" : "ru-RU";
    return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  };
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  let activeTab = "home";
  let orderToReveal = "";
  let noteQuery = "";
  let noteMonth = "";

  const ownOrders = () =>
    portalOrders()
      .filter((order) => order.restaurantId === account?.id)
      .slice()
      .sort((a, b) => Number(b.number) - Number(a.number));
  const ownNotes = () =>
    portalNotes()
      .filter((note) => note.restaurantId === account?.id)
      .slice()
      .sort((a, b) => Number(b.number) - Number(a.number));
  const ownPayments = () =>
    portalPayments()
      .filter((payment) => payment.restaurantId === account?.id)
      .slice()
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const orderNumber = (order) => `PN-${String(order.number).padStart(4, "0")}`;
  const noteNumber = (note) => `DN-${String(note.number).padStart(4, "0")}`;
  const itemName = (id) =>
    typeof portalProduct === "function"
      ? portalProduct(id)
      : PRODUCTS.find((product) => product.id === id)?.text?.[lang]?.[0] || id;
  const orderTotal = (order) =>
    typeof portalOrderTotal === "function"
      ? portalOrderTotal(order)
      : order.items.reduce(
          (sum, item) =>
            sum +
            item.quantity *
              Number((order.prices || account.prices)[item.product] || 0),
          0,
        );
  const status = (order) =>
    typeof portalStatus === "function"
      ? portalStatus(order.status)
      : order.status;

  const isActiveOrder = (order) => !["cancelled", "shipped", "paid", "completed"].includes(order.status);
  const cartCount = () => Object.values(cart || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  const partnerTypeLabel = () => t(["restaurant", "shop", "hotel", "cafe", "catering", "other"].includes(account?.partnerType) ? account.partnerType : "other");
  function syncLabel() {
    if (!navigator.onLine) return t("offline");
    return window.panoraRestaurantSyncState?.type === "sending" ? t("syncing") : t("saved");
  }
  function homeHtml() {
    const orders = ownOrders();
    const active = orders.filter(isActiveOrder).sort((a, b) => String(a.deliveryDate || a.date).localeCompare(String(b.deliveryDate || b.date)))[0];
    const last = orders[0];
    const notes = ownNotes();
    const trays = notes.length ? Number(notes[0].trayBalanceAfter || 0) : 0;
    const draftCount = cartCount();
    return `<section class="rw-home">
      <header class="rw-overview-head"><div><span class="kicker">Panora</span><h3>${t("overview")}</h3></div><span class="rw-sync ${navigator.onLine ? "online" : "offline"}"><i></i>${syncLabel()}</span></header>
      <div class="rw-summary-grid">
        <button type="button" class="rw-summary-card" data-rw-summary="${active ? "delivery" : "new"}"${active ? ` data-rw-order-target="${esc(active.id)}"` : ""}><span>${t("nextDelivery")}</span><strong>${active ? esc(localDate(active.deliveryDate || active.date)) : "—"}</strong><small>${active ? esc(orderNumber(active)) : t("noActiveOrder")}</small></button>
        <button type="button" class="rw-summary-card" data-rw-summary="payments"><span>${t("debt")}</span><strong>${portalMoney(accountDebt())}</strong><small>${t("finance")}</small></button>
        <article><span>${t("trayBalance")}</span><strong>${trays}</strong><small>${t("pieces")}</small></article>
      </div>
      ${active ? `<article class="rw-current-order"><div><span>${t("activeOrder")}</span><strong>${esc(orderNumber(active))}</strong><small>${esc(status(active))} · ${esc(localDate(active.deliveryDate || active.date))}</small></div><b>${portalMoney(orderTotal(active))}</b><button class="button button-ghost" data-rw-tab="orders">${t("orders")}</button></article>` : ""}
      <div class="rw-quick-actions"><button class="button button-primary" data-rw-start>${draftCount ? `${t("continueOrder")} · ${draftCount} ${t("pieces")}` : t("newOrder")}</button>${last ? `<button class="button button-ghost" data-rw-repeat="${esc(last.id)}">${t("repeatOrder")}</button>` : ""}</div>
    </section>`;
  }

  function profileHtml() {
    return `<section class="rw-profile-page"><aside class="rw-profile rw-profile-summary">
      <div class="rw-profile-main"><span class="account-avatar">${esc(account.name?.[0]?.toUpperCase() || "R")}</span><span><strong>${esc(account.name)}</strong><small>${esc(account.email)}</small></span></div>
      <div class="rw-balance"><span>${t("debt")}</span><strong>${portalMoney(accountDebt())}</strong></div>
    </aside><form class="rw-profile-form" data-rw-profile-form>
      <header><h3>${t("profileData")}</h3><p>${t("profileHint")}</p></header>
      <div class="rw-profile-grid">
        <label><span>${t("partnerType")}</span><select name="partnerType">${["restaurant", "shop", "hotel", "cafe", "catering", "other"].map((type) => `<option value="${type}"${(account.partnerType || "restaurant") === type ? " selected" : ""}>${t(type)}</option>`).join("")}</select></label>
        <label><span>${t("restaurantName")} *</span><input name="name" required value="${esc(account.name || "")}" autocomplete="organization"><small data-rw-field-error="name"></small></label>
        <label><span>${t("phone")} *</span><input name="phone" required type="tel" inputmode="tel" autocomplete="tel" value="${esc(account.phone || "")}" placeholder="+34 …"><small data-rw-field-error="phone"></small></label>
        <label class="rw-profile-wide"><span>${t("address")} *</span><input name="address" required autocomplete="street-address" value="${esc(account.address || "")}" placeholder="${t("address")}"><small data-rw-field-error="address"></small></label>
        <label><span>${t("language")}</span><select name="language"><option value="ru"${account.language === "ru" ? " selected" : ""}>Русский</option><option value="es"${account.language === "es" ? " selected" : ""}>Español</option><option value="en"${account.language === "en" ? " selected" : ""}>English</option></select></label>
      </div>
      <section class="rw-messengers" aria-labelledby="rw-messengers-title">
        <header><span class="rw-messenger-mark" aria-hidden="true">✦</span><div><h4 id="rw-messengers-title">${t("messengers")}</h4><p>${t("messengersHint")}</p></div></header>
        <div class="rw-messenger-grid">
          <label><span class="rw-messenger-label"><i aria-hidden="true">W</i>${t("whatsapp")}</span><input name="whatsapp" type="tel" inputmode="tel" autocomplete="tel" value="${esc(account.whatsapp || "")}" placeholder="+34 600 000 000"><small>${t("whatsappHint")}</small></label>
          <label><span class="rw-messenger-label"><i aria-hidden="true">T</i>${t("telegram")}</span><input name="telegram" autocapitalize="none" autocomplete="off" spellcheck="false" value="${esc(account.telegram || "")}" placeholder="@panora"><small>${t("telegramHint")}</small></label>
        </div>
      </section>
      <section class="rw-billing-details" aria-labelledby="rw-billing-title">
        <header><span aria-hidden="true">▤</span><div><h4 id="rw-billing-title">${t("billingDetails")}</h4><p>${t("billingHint")}</p></div></header>
        <div class="rw-billing-grid">
          <label><span>${t("legalName")}</span><input name="legalName" autocomplete="organization" value="${esc(account.legalName || "")}" placeholder="Panora Partner S.L."></label>
          <label><span>${t("taxId")}</span><input name="taxId" autocapitalize="characters" autocomplete="off" value="${esc(account.taxId || "")}" placeholder="B12345678"></label>
          <label class="rw-profile-wide"><span>${t("billingAddress")}</span><input name="billingAddress" autocomplete="billing street-address" value="${esc(account.billingAddress || "")}" placeholder="${t("billingAddress")}"></label>
        </div>
      </section>
      <div class="rw-profile-access"><span><strong>${t("accountAccess")}</strong><small>${t("emailLocked")}</small></span><b>${esc(account.email)}</b></div>
      <p class="rw-profile-result" data-rw-profile-result role="status"></p>
      <button class="button button-primary rw-profile-save" type="submit">${t("saveProfile")}</button>
    </form></section>`;
  }
  function newOrderHtml() {
    return `<section class="rw-empty rw-new-order"><span>＋</span><h3>${t("newOrder")}</h3><p>${t("orderHelp")}</p><button class="button button-primary" data-rw-start>${t("startOrder")}</button></section>`;
  }
  function ordersHtml() {
    const rows = ownOrders();
    if (!rows.length)
      return `<section class="rw-empty"><h3>${t("emptyOrders")}</h3><button class="button button-primary" data-rw-start>${t("newOrder")}</button></section>`;
    return `<section class="rw-list">${rows
      .map(
        (order) => `<article class="rw-order" data-rw-order="${esc(order.id)}">
      <header><span><strong>${orderNumber(order)}</strong><small>${t("delivery")}: ${esc(localDate(order.deliveryDate || order.date))}</small></span><b>${portalMoney(orderTotal(order))}</b></header>
      <div class="rw-order-status status-${esc(order.status)}">${esc(status(order))}</div>
      <ul>${order.items.map((item) => `<li><span>${esc(itemName(item.product))}</span><strong>${item.quantity} ${t("pieces")}<small>× ${portalMoney(Number((order.prices || account.prices)[item.product] || 0))}</small></strong></li>`).join("")}</ul>
      <footer><span>${t("bake")}: <strong>${esc(localDate(order.date))}</strong></span>${canRestaurantCancel(order) ? `<button class="rw-cancel" data-rw-cancel="${esc(order.id)}">${lang === "ru" ? "Отменить заказ" : lang === "es" ? "Cancelar pedido" : "Cancel order"}</button>` : ""}</footer>
    </article>`,
      )
      .join("")}</section>`;
  }
  function notesHtml() {
    const allNotes = ownNotes(),
      orders = ownOrders();
    if (!allNotes.length)
      return `<section class="rw-empty"><h3>${t("emptyNotes")}</h3></section>`;
    const months = [...new Set(allNotes.map((note) => String(note.date || "").slice(0, 7)).filter(Boolean))];
    const notes = allNotes.filter((note) => (!noteMonth || String(note.date || "").startsWith(noteMonth)) && (!noteQuery || noteNumber(note).toLowerCase().includes(noteQuery.toLowerCase())));
    return `<section class="rw-note-library"><header class="rw-note-library-head"><div><span class="kicker">Panora</span><h3>${t("noteLibrary")}</h3><p>${t("noteLibraryHint")}</p></div></header><div class="rw-list">${notes
      .map((note) => {
        const order = orders.find((item) => item.id === note.orderId);
        const isMain = note.id === allNotes[0].id;
        return `<article class="rw-document${isMain ? " rw-document-main" : ""}">
      <span>${isMain ? `<em class="rw-main-note">${t("mainNote")}</em>` : ""}<strong>${noteNumber(note)}</strong><small>${t("delivery")}: ${esc(localDate(order?.deliveryDate || note.date))}</small>${note.paymentDueDate ? `<small class="rw-payment-due">${t("paymentDue")}: <strong>${esc(localDate(note.paymentDueDate))}</strong></small>` : ""}<small class="rw-trays">${t("traysDelivered")}: <b>${Number(note.traysDelivered || 0)}</b> · ${t("traysReturned")}: <b>${Number(note.traysReturned || 0)}</b> · ${t("trayBalance")}: <b>${Number(note.trayBalanceAfter || 0)}</b></small></span>
      <b>${portalMoney(note.total)}</b>
      <div class="rw-document-actions"><button class="button button-ghost" data-rw-note="${esc(note.id)}">${t("openNote")} Panora</button><button class="rw-other-forms" data-rw-forms="${esc(note.id)}">${t("otherForms")}</button></div>
    </article>`;
      })
      .join("")}</div>${notes.length ? "" : `<p class="rw-filter-empty">${t("nothingFound")}</p>`}</section>`;
  }
  function paymentsHtml() {
    window.panoraRecalculateBalances?.();
    const payments = ownPayments(),
      notes = ownNotes();
    const sharedTimeline =
      typeof window.panoraFinanceTimeline === "function"
        ? window.panoraFinanceTimeline(account.id)
        : null;
    const delivered = notes.reduce(
      (sum, note) => sum + Number(note.total || 0),
      0,
    );
    const paid = payments
      .filter(
        (payment) =>
          payment.confirmed !== false && payment.status !== "cancelled",
      )
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const pending = payments
      .filter(
        (payment) =>
          payment.confirmed === false && payment.status !== "cancelled",
      )
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const operations = sharedTimeline
      ? sharedTimeline.map((event) =>
          event.kind === "delivery"
            ? {
                date: event.date,
                kind: "delivery",
                amount: event.amount,
                label: noteNumber(event.note),
                note: event.note,
                sort: 0,
                balanceAfter: event.balanceAfter,
              }
            : {
                date: event.date,
                kind: "payment",
                amount: -event.amount,
                label: event.payment.deliveryNoteId
                  ? noteNumber(
                      notes.find(
                        (note) => note.id === event.payment.deliveryNoteId,
                      ) || { number: "—" },
                    )
                  : t("withoutNote"),
                payment: event.payment,
                sort: 1,
                balanceAfter: event.balanceAfter,
              },
        )
      : [
      ...notes.map((note) => ({
        date: note.date,
        kind: "delivery",
        amount: Number(note.total || 0),
        label: noteNumber(note),
        note,
        sort: 0,
      })),
      ...payments
        .filter((payment) => payment.status !== "cancelled")
        .map((payment) => ({
          date: payment.date,
          kind: "payment",
          amount: -Number(payment.amount || 0),
          label: payment.deliveryNoteId
            ? noteNumber(
                notes.find((note) => note.id === payment.deliveryNoteId) || {
                  number: "—",
                },
              )
            : t("withoutNote"),
          payment,
          sort: 1,
        })),
        ].sort(
          (a, b) =>
            String(a.date).localeCompare(String(b.date)) || a.sort - b.sort,
        );
    if (!sharedTimeline) {
      let running = 0;
      operations.forEach((operation) => {
        if (
          operation.kind === "delivery" ||
          operation.payment?.confirmed !== false
        )
          running += operation.amount;
        operation.balanceAfter = Math.max(0, running);
      });
    }
    const history = operations.slice().reverse();
    return `<section class="rw-finance">
      <header><div><span class="kicker">Panora</span><h3>${t("finance")}</h3></div><div class="rw-finance-debt"><span>${t("debt")}</span><strong>${portalMoney(Math.max(0, delivered - paid))}</strong></div></header>
      <div class="rw-finance-stats">
        <article><span>${t("deliveredTotal")}</span><strong>${portalMoney(delivered)}</strong></article>
        <article><span>${t("paidTotal")}</span><strong>${portalMoney(paid)}</strong></article>
        <article><span>${t("pendingTotal")}</span><strong>${portalMoney(pending)}</strong></article>
      </div>
      <h4>${t("operationHistory")}</h4>
      ${
        history.length
          ? `<div class="rw-finance-history">${history
              .map(
                (
                  operation,
                ) => `<article class="rw-operation ${operation.kind}${operation.payment?.confirmed === false ? " pending" : ""}">
        <div><strong>${operation.kind === "delivery" ? `${t("delivery")} · ${esc(operation.label)}` : `${t("payment")} · ${esc(operation.label)}`}</strong><small>${esc(operation.date)}${operation.note?.paymentDueDate ? ` · ${t("paymentDue")}: ${esc(operation.note.paymentDueDate)}` : ""}${operation.payment?.method ? ` · ${esc(operation.payment.method)}` : ""}${operation.payment?.note ? ` · ${esc(operation.payment.note)}` : ""}</small></div>
        <div class="rw-operation-amount"><b>${operation.amount < 0 ? "−" : "+"}${portalMoney(Math.abs(operation.amount))}</b><small>${operation.payment?.confirmed === false ? t("pending") : `${t("balanceAfter")}: ${portalMoney(Math.max(0, operation.balanceAfter))}`}</small></div>
      </article>`,
              )
              .join("")}</div>`
          : `<p class="rw-finance-empty">${t("emptyPayments")}</p>`
      }
    </section>`;
  }
  function pricesHtml() {
    const products = PRODUCTS.filter(
      (product) => account.prices?.[product.id] != null,
    );
    return `<section class="rw-prices"><h3>${t("prices")}</h3>${products.map((product) => `<div><span>${esc(itemName(product.id))}</span><strong>${portalMoney(account.prices[product.id])}</strong></div>`).join("")}</section>`;
  }
  function contentHtml() {
    if (activeTab === "home") return homeHtml();
    if (activeTab === "new") return newOrderHtml();
    if (activeTab === "notes") return notesHtml();
    if (activeTab === "payments") return paymentsHtml();
    if (activeTab === "profile") return `${profileHtml()}${pricesHtml()}`;
    return ordersHtml();
  }
  function bind(modal) {
    modal.querySelectorAll("[data-rw-summary]").forEach((button) => button.onclick = () => {
      if (button.dataset.rwSummary === "payments") activeTab = "payments";
      else if (button.dataset.rwSummary === "delivery") {
        activeTab = "orders";
        orderToReveal = button.dataset.rwOrderTarget || "";
      } else activeTab = "new";
      renderAccountModal();
    });
    const profileForm = modal.querySelector("[data-rw-profile-form]");
    if (profileForm) profileForm.onsubmit = async (event) => {
      event.preventDefault();
      const button = profileForm.querySelector('[type="submit"]'), result = profileForm.querySelector('[data-rw-profile-result]');
      let valid = true;
      ["name", "phone", "address"].forEach((field) => { const input = profileForm.elements[field], error = profileForm.querySelector(`[data-rw-field-error="${field}"]`), missing = !String(input.value || "").trim(); input.classList.toggle("invalid", missing); error.textContent = missing ? t("required") : ""; valid = valid && !missing; });
      if (!valid) return profileForm.querySelector(".invalid")?.focus();
      button.disabled = true; button.textContent = t("savingProfile"); result.textContent = "";
      try { await window.panoraRestaurantProfile.save(Object.fromEntries(new FormData(profileForm))); result.textContent = t("profileSaved"); result.className = "rw-profile-result success"; window.setTimeout(() => { activeTab = "profile"; renderAccountModal(); }, 650); }
      catch (error) { result.textContent = error.message || String(error); result.className = "rw-profile-result error"; button.disabled = false; button.textContent = t("saveProfile"); }
    };
    modal.querySelectorAll("[data-rw-tab]").forEach(
      (button) =>
        (button.onclick = () => {
          activeTab = button.dataset.rwTab;
          renderAccountModal();
        }),
    );
    const search = modal.querySelector("[data-rw-note-search]");
    if (search) search.oninput = () => { noteQuery = search.value.trim(); renderAccountModal(); requestAnimationFrame(() => modal.querySelector("[data-rw-note-search]")?.focus()); };
    const month = modal.querySelector("[data-rw-note-month]");
    if (month) month.onchange = () => { noteMonth = month.value; renderAccountModal(); };
    modal
      .querySelectorAll("[data-portal-close]")
      .forEach((button) => (button.onclick = closePanels));
    modal
      .querySelector("[data-rw-logout]")
      ?.addEventListener("click", logoutAccount);
    modal.querySelectorAll("[data-rw-start]").forEach(
      (button) =>
        (button.onclick = () => {
          closePanels();
          document
            .querySelector("#catalog")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }),
    );
    modal.querySelectorAll("[data-rw-repeat]").forEach((button) => button.onclick = () => {
      const order = ownOrders().find((item) => item.id === button.dataset.rwRepeat);
      if (!order) return;
      cart = Object.fromEntries(order.items.map((item) => [item.product, Number(item.quantity)]));
      localStorage.setItem("panora-cart", JSON.stringify(cart));
      closePanels(); renderProducts(); renderCart();
      document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    modal
      .querySelectorAll("[data-rw-cancel]")
      .forEach(
        (button) =>
          (button.onclick = () =>
            restaurantCancelOrder(button.dataset.rwCancel)),
      );
    modal.querySelectorAll("[data-rw-note]").forEach(
      (button) =>
        (button.onclick = () => {
          const note = ownNotes().find(
            (item) => item.id === button.dataset.rwNote,
          );
          if (note) {
            portalPrintNote(note);
          }
        }),
    );
    modal.querySelectorAll("[data-rw-forms]").forEach(
      (button) =>
        (button.onclick = () => {
          const note = ownNotes().find(
            (item) => item.id === button.dataset.rwForms,
          );
          if (note && window.openPanoraDocumentLibrary)
            window.openPanoraDocumentLibrary(note, { context: "restaurant" });
        }),
    );
  }
  renderAccountModal = function () {
    const modal = document.querySelector("#profileModal");
    if (!account) {
      modal?.classList.remove("restaurant-workspace");
      previousRender();
      return;
    }
    const counts = {
      orders: ownOrders().length,
      notes: ownNotes().length,
      payments: ownPayments().length,
    };
    modal.classList.add("restaurant-workspace");
    modal.innerHTML = `<div class="modal-head rw-head"><div><span class="kicker">Panora</span><h2>${t("title")}</h2><p class="rw-partner-name">${partnerTypeLabel()} · ${esc(account.name)}</p></div><button class="close-button" data-portal-close>×</button></div>
      <div class="rw-layout">
        <nav class="rw-nav" aria-label="${t("title")}">
          ${[
            ["home", t("home"), "⌂"],
            ["new", t("newOrder"), "＋"],
            ["orders", t("orders"), counts.orders],
            ["notes", t("notes"), counts.notes],
            ["payments", t("payments"), counts.payments],
            ["profile", t("profile"), "●"],
          ]
            .map(
              ([key, label, badge]) =>
                `<button class="${activeTab === key ? "active" : ""}" data-rw-tab="${key}"><i>${badge}</i><span>${label}</span></button>`,
            )
            .join("")}
        </nav>
        <main class="rw-content">${contentHtml()}</main>
      </div>
      <footer class="rw-footer"><button class="button button-ghost" data-rw-logout>${t("signOut")}</button><button class="button button-primary" data-portal-close>${t("close")}</button></footer>`;
    bind(modal);
    if (activeTab === "orders" && orderToReveal) {
      const targetId = orderToReveal;
      orderToReveal = "";
      requestAnimationFrame(() => {
        const card = [...modal.querySelectorAll("[data-rw-order]")].find((item) => item.dataset.rwOrder === targetId);
        card?.scrollIntoView({ behavior: "smooth", block: "center" });
        card?.classList.add("rw-order-focus");
        window.setTimeout(() => card?.classList.remove("rw-order-focus"), 1800);
      });
    }
    if (activeTab === "notes") {
      const head = modal.querySelector(".rw-note-library-head");
      head?.insertAdjacentHTML("beforeend", `<div class="rw-note-filters"><input type="search" data-rw-note-search value="${esc(noteQuery)}" placeholder="${t("noteSearch")}"><select data-rw-note-month><option value="">${t("allMonths")}</option>${[...new Set(ownNotes().map((note) => String(note.date || "").slice(0, 7)).filter(Boolean))].map((month) => `<option value="${esc(month)}"${noteMonth === month ? " selected" : ""}>${esc(month)}</option>`).join("")}</select></div>`);
      bind(modal);
    }
  };
  window.addEventListener("online", () => account && renderAccountModal());
  window.addEventListener("offline", () => account && renderAccountModal());
  window.addEventListener("panora:restaurant-sync", () => account && renderAccountModal());
})();
