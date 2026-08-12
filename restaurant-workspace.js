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
      noteLibraryHint: "Рабочие накладные Panora и архив поставок вашей организации.",
      mainNote: "Основная для работы",
      otherForms: "Другие формы",
      bake: "Выпечка",
      delivery: "Поставка",
      pieces: "шт.",
      signOut: "Выйти",
      close: "Закрыть",
      pending: "Ожидает подтверждения",
      activeOrders: "Рабочие", historyOrders: "Архив", noActiveOrders: "Рабочих заказов нет",
      startOrder: "Выбрать хлеб и дату",
      orderHelp: "Выберите хлеб, затем подтвердите дату поставки в корзине.",
      phone: "Телефон",
      address: "Адрес доставки",
      partnerType: "Тип партнёра", restaurant: "Ресторан", shop: "Магазин", hotel: "Отель", cafe: "Кафе", catering: "Кейтеринг", other: "Другое",
      restaurantName: "Название партнёра", email: "Email для входа", telegram: "Telegram", whatsapp: "WhatsApp", messengers: "Мессенджеры", messengersHint: "Добавьте удобные способы связи. Пустые необязательные поля можно не заполнять.", telegramHint: "Имя пользователя, например @panora", whatsappHint: "Номер с кодом страны, например +34 600 000 000", otherMessengers: "Другие мессенджеры", addMessenger: "Добавить мессенджер", messengerName: "Название", messengerContact: "Номер или имя пользователя", removeMessenger: "Удалить", incompleteMessenger: "Укажите и название мессенджера, и контакт либо удалите пустую строку.", invalidPhone: "Проверьте номер телефона", invalidTelegram: "Используйте имя вида @username или ссылку", invalidTaxId: "Проверьте NIF / CIF", saveError: "Не удалось сохранить. Данные остались в форме — проверьте поля и повторите.", billingDetails: "Реквизиты", billingHint: "Данные для накладных и счетов.", legalName: "Юридическое название", taxId: "NIF / CIF", billingAddress: "Адрес для счетов", language: "Язык сообщений", profileData: "Данные партнёра", profileHint: "Эти данные подставляются в заказ и накладные.", saveProfile: "Сохранить изменения", savingProfile: "Сохраняем…", profileSaved: "Профиль сохранён", required: "Обязательное поле", emailLocked: "Email для входа меняет менеджер Panora.", accountAccess: "Доступ к кабинету",
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
      noteLibraryHint: "Working Panora delivery notes and your partner delivery archive.",
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
      restaurantName: "Partner name", email: "Sign-in email", telegram: "Telegram", whatsapp: "WhatsApp", messengers: "Messengers", messengersHint: "Add the contact methods you prefer. Optional fields may be left empty.", telegramHint: "Username, for example @panora", whatsappHint: "Number with country code, for example +34 600 000 000", otherMessengers: "Other messengers", addMessenger: "Add messenger", messengerName: "Name", messengerContact: "Number or username", removeMessenger: "Remove", incompleteMessenger: "Enter both the messenger name and contact, or remove the empty row.", invalidPhone: "Check the phone number", invalidTelegram: "Use @username or a link", invalidTaxId: "Check the NIF / CIF", saveError: "Could not save. Your entries remain in the form — check the fields and try again.", billingDetails: "Billing details", billingHint: "Details used on delivery notes and invoices.", legalName: "Legal name", taxId: "NIF / CIF", billingAddress: "Billing address", language: "Message language", profileData: "Partner details", profileHint: "These details are used in orders and delivery notes.", saveProfile: "Save changes", savingProfile: "Saving…", profileSaved: "Profile saved", required: "Required field", emailLocked: "Your Panora manager changes the sign-in email.", accountAccess: "Account access",
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
      trayBalance: "Trays with you",
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
      noteLibraryHint: "Albaranes Panora de trabajo y archivo de entregas de tu organización.",
      mainNote: "Documento principal",
      otherForms: "Otros formatos",
      bake: "Horneado",
      delivery: "Entrega",
      pieces: "uds.",
      signOut: "Salir",
      close: "Cerrar",
      pending: "Pendiente de confirmación",
      activeOrders: "En curso", historyOrders: "Archivo", noActiveOrders: "No hay pedidos en curso",
      startOrder: "Elegir pan y fecha",
      orderHelp: "Elige el pan y confirma la fecha de entrega en la cesta.",
      phone: "Teléfono",
      address: "Dirección de entrega",
      partnerType: "Tipo de socio", restaurant: "Restaurante", shop: "Tienda", hotel: "Hotel", cafe: "Cafetería", catering: "Catering", other: "Otro",
      restaurantName: "Nombre del socio", email: "Email de acceso", telegram: "Telegram", whatsapp: "WhatsApp", messengers: "Mensajería", messengersHint: "Añade las formas de contacto que prefieras. Los campos opcionales pueden quedar vacíos.", telegramHint: "Usuario, por ejemplo @panora", whatsappHint: "Número con prefijo, por ejemplo +34 600 000 000", otherMessengers: "Otros mensajeros", addMessenger: "Añadir mensajero", messengerName: "Nombre", messengerContact: "Número o usuario", removeMessenger: "Eliminar", incompleteMessenger: "Indica el nombre y el contacto, o elimina la fila vacía.", invalidPhone: "Revisa el número de teléfono", invalidTelegram: "Usa @usuario o un enlace", invalidTaxId: "Revisa el NIF / CIF", saveError: "No se pudo guardar. Los datos siguen en el formulario; revísalos e inténtalo de nuevo.", billingDetails: "Datos fiscales", billingHint: "Datos para albaranes y facturas.", legalName: "Razón social", taxId: "NIF / CIF", billingAddress: "Dirección de facturación", language: "Idioma de mensajes", profileData: "Datos del socio", profileHint: "Estos datos se usan en pedidos y albaranes.", saveProfile: "Guardar cambios", savingProfile: "Guardando…", profileSaved: "Perfil guardado", required: "Campo obligatorio", emailLocked: "El responsable de Panora cambia el email de acceso.", accountAccess: "Acceso a la cuenta",
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
      trayBalance: "Bandejas contigo",
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
  let orderView = "active";
  let orderStatusFilter = "all";
  let orderSearch = "";
  let orderDateFrom = "";
  let orderDateTo = "";
  let orderToReveal = "";

  let noteView = "active";
  let noteQuery = "";
  let noteDateFrom = "";
  let noteDateTo = "";

  let paymentDateFrom = "";
  let paymentDateTo = "";

  let openFilterMenu = "";
  const calendarMonth = { order:"", note:"", payment:"" };

  const isoToday=()=>new Date().toISOString().slice(0,10);
  const normalizeIso=value=>String(value||"").slice(0,10);
  const dateInRange=(value,from,to)=>{
    const raw=normalizeIso(value);
    if(!raw)return false;
    if(from&&raw<from)return false;
    if(to&&raw>to)return false;
    return true;
  };
  const periodLabel=(from,to)=>{
    if(!from&&!to)return lang==="ru"?"Все даты":lang==="es"?"Todas las fechas":"All dates";
    if(from&&to&&from===to)return localDate(from);
    if(from&&to)return `${localDate(from)} — ${localDate(to)}`;
    if(from)return `${lang==="ru"?"с":lang==="es"?"desde":"from"} ${localDate(from)}`;
    return `${lang==="ru"?"до":lang==="es"?"hasta":"to"} ${localDate(to)}`;
  };
  const monthKey=value=>{
    const raw=normalizeIso(value)||isoToday();
    return raw.slice(0,7);
  };
  const shiftMonth=(key,delta)=>{
    const [y,m]=String(key||monthKey()).split("-").map(Number);
    const d=new Date(y,m-1+delta,1,12);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  };
  const calendarTitle=key=>{
    const [y,m]=String(key||monthKey()).split("-").map(Number);
    return new Intl.DateTimeFormat(lang==="ru"?"ru-RU":lang==="es"?"es-ES":"en-GB",{month:"long",year:"numeric"}).format(new Date(y,m-1,1,12));
  };
  const calendarDays=(scope,from,to)=>{
    const key=calendarMonth[scope]||monthKey(from||to||isoToday());
    calendarMonth[scope]=key;
    const [year,month]=key.split("-").map(Number);
    const first=new Date(year,month-1,1,12);
    const start=(first.getDay()+6)%7;
    const days=new Date(year,month,0,12).getDate();
    const cells=[];
    for(let i=0;i<start;i++)cells.push('<span class="rw-cal-empty"></span>');
    for(let day=1;day<=days;day++){
      const iso=`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
      const selected=iso===from||iso===to;
      const inRange=from&&to&&iso>=from&&iso<=to;
      cells.push(`<button type="button" class="rw-cal-day${selected?" selected":""}${inRange?" in-range":""}" data-rw-cal-date="${iso}" data-rw-cal-scope="${scope}">${day}</button>`);
    }
    return cells.join("");
  };
  const calendarHtml=(scope,from,to)=>{
    const weekdays=lang==="ru"?["Пн","Вт","Ср","Чт","Пт","Сб","Вс"]:lang==="es"?["Lu","Ma","Mi","Ju","Vi","Sa","Do"]:["Mo","Tu","We","Th","Fr","Sa","Su"];
    return `<div class="rw-calendar" data-rw-calendar="${scope}">
      <div class="rw-cal-quick">
        <button type="button" data-rw-cal-quick="today" data-rw-cal-scope="${scope}">${lang==="ru"?"Сегодня":lang==="es"?"Hoy":"Today"}</button>
        <button type="button" data-rw-cal-quick="week" data-rw-cal-scope="${scope}">${lang==="ru"?"7 дней":lang==="es"?"7 días":"7 days"}</button>
        <button type="button" data-rw-cal-quick="month" data-rw-cal-scope="${scope}">${lang==="ru"?"Месяц":lang==="es"?"Mes":"Month"}</button>
        <button type="button" data-rw-cal-quick="year" data-rw-cal-scope="${scope}">${lang==="ru"?"Год":lang==="es"?"Año":"Year"}</button>
        <button type="button" data-rw-cal-quick="all" data-rw-cal-scope="${scope}">${lang==="ru"?"Всё":lang==="es"?"Todo":"All"}</button>
      </div>
      <div class="rw-cal-head"><button type="button" data-rw-cal-nav="-1" data-rw-cal-scope="${scope}">‹</button><strong>${esc(calendarTitle(calendarMonth[scope]||monthKey(from||to||isoToday())))}</strong><button type="button" data-rw-cal-nav="1" data-rw-cal-scope="${scope}">›</button></div>
      <div class="rw-cal-week">${weekdays.map(x=>`<span>${x}</span>`).join("")}</div>
      <div class="rw-cal-grid">${calendarDays(scope,from,to)}</div>
      <div class="rw-cal-range"><span>${periodLabel(from,to)}</span>${(from||to)?`<button type="button" data-rw-cal-clear data-rw-cal-scope="${scope}">${lang==="ru"?"Очистить":lang==="es"?"Limpiar":"Clear"}</button>`:""}</div>
    </div>`;
  };
  const getRange=scope=>scope==="order"?[orderDateFrom,orderDateTo]:scope==="note"?[noteDateFrom,noteDateTo]:[paymentDateFrom,paymentDateTo];
  const setRange=(scope,from,to)=>{
    if(scope==="order"){orderDateFrom=from;orderDateTo=to}
    else if(scope==="note"){noteDateFrom=from;noteDateTo=to}
    else {paymentDateFrom=from;paymentDateTo=to}
  };
  const messengerRow = (item = {}) => `<div class="rw-extra-messenger" data-rw-messenger-row>
    <label><span>${t("messengerName")}</span><input data-rw-messenger-name maxlength="40" value="${esc(item.name || "")}" placeholder="Signal, Viber, LINE…"><small data-rw-messenger-error></small></label>
    <label><span>${t("messengerContact")}</span><input data-rw-messenger-contact maxlength="120" value="${esc(item.contact || "")}" placeholder="@username, +34…, https://…"><small></small></label>
    <button type="button" class="rw-remove-messenger" data-rw-remove-messenger aria-label="${t("removeMessenger")}" title="${t("removeMessenger")}">×</button>
  </div>`;

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

  const orderDeliveryNote = (order) =>
    ownNotes().find((note) => String(note.orderId) === String(order.id)) || null;

  const confirmedDeliveryAt = (order) => {
    const note = orderDeliveryNote(order);
    return note?.customerConfirmedAt || note?.offlineProof?.receivedAt || null;
  };

  const archiveReferenceDate = (order) => {
    const confirmed = confirmedDeliveryAt(order);
    if (confirmed) return new Date(confirmed);
    // Legacy completed/paid orders may pre-date customer confirmation support.
    if (["completed","paid"].includes(order.status) && (order.deliveryDate || order.date))
      return new Date(`${String(order.deliveryDate || order.date).slice(0,10)}T23:59:59`);
    return null;
  };

  const isArchivedOrder = (order) => {
    if (order.status === "cancelled") return true;
    const deliveredAt = archiveReferenceDate(order);
    if (!deliveredAt || Number.isNaN(deliveredAt.getTime())) return false;
    return Date.now() - deliveredAt.getTime() >= 7 * 24 * 60 * 60 * 1000;
  };

  const isActiveOrder = (order) => !isArchivedOrder(order);

  const orderLifecycleStatus = (order) => {
    if (order.status === "cancelled") return "cancelled";
    if (confirmedDeliveryAt(order) || ["completed","paid"].includes(order.status)) return "delivered";
    if (order.status === "shipped") return "shipped";
    if (["confirmed","processing"].includes(order.status)) return "confirmed";
    return "submitted";
  };

  const statusStageLabel=key=>({
    submitted:lang==="ru"?"Заказ создан":lang==="es"?"Pedido creado":"Order created",
    confirmed:lang==="ru"?"Подтверждён":lang==="es"?"Confirmado":"Confirmed",
    shipped:lang==="ru"?"Отгружен":lang==="es"?"Enviado":"Shipped",
    delivered:lang==="ru"?"Доставлен":lang==="es"?"Entregado":"Delivered",
    cancelled:lang==="ru"?"Отменён":lang==="es"?"Cancelado":"Cancelled",
    processing:lang==="ru"?"Подтверждён":lang==="es"?"Confirmado":"Confirmed",
    completed:lang==="ru"?"Доставлен":lang==="es"?"Entregado":"Delivered",
    paid:lang==="ru"?"Доставлен":lang==="es"?"Entregado":"Delivered",
  }[key]||key);

  const formatStatusTime=value=>{
    if(!value)return "";
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return "";
    return new Intl.DateTimeFormat(lang==="ru"?"ru-RU":lang==="es"?"es-ES":"en-GB",{
      day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"
    }).format(d);
  };

  const actorLabel=event=>{
    if(!event)return "";
    const name=String(event.actorName||"").trim();
    if(event.actorRole==="restaurant_receiver")
      return `${lang==="ru"?"Получил":lang==="es"?"Recibió":"Received by"}: ${name||"—"}`;
    if(event.actorRole==="restaurant")
      return `${lang==="ru"?"Партнёр":lang==="es"?"Socio":"Partner"}: ${name||account?.name||"—"}`;
    if(event.actorRole==="admin")
      return `${lang==="ru"?"Пекарня":lang==="es"?"Panadería":"Bakery"}: ${name||"Panora"}`;
    return name||"Panora";
  };

  const effectiveStatusHistory=order=>{
    const raw=Array.isArray(order.statusHistory)?order.statusHistory.slice():[];
    const note=orderDeliveryNote(order);
    const has=status=>raw.some(event=>event.status===status);
    if(!has("submitted")&&order.createdAt)raw.push({status:"submitted",occurredAt:order.createdAt,actorRole:"restaurant",actorName:account?.name||""});
    const deliveredAt=note?.customerConfirmedAt||note?.offlineProof?.receivedAt;
    if(deliveredAt&&!has("delivered"))raw.push({status:"delivered",occurredAt:deliveredAt,actorRole:"restaurant_receiver",actorName:note?.customerReceiver||note?.offlineProof?.receiver||""});
    const normalized=raw.map(event=>({...event,status:["processing"].includes(event.status)?"confirmed":["completed","paid"].includes(event.status)?"delivered":event.status}));
    const orderRank={submitted:0,confirmed:1,shipped:2,delivered:3,cancelled:4};
    return normalized.sort((a,b)=>String(a.occurredAt||"").localeCompare(String(b.occurredAt||""))||((orderRank[a.status]??9)-(orderRank[b.status]??9)));
  };

  const latestStatusEvent=(order,statusKey)=>{
    const list=effectiveStatusHistory(order).filter(event=>event.status===statusKey);
    return list[list.length-1]||null;
  };

  function statusHistoryHtml(order){
    const events=effectiveStatusHistory(order);
    if(!events.length)return "";
    return `<details class="rw-status-history"><summary>${lang==="ru"?"Дата, время и кто менял статус":lang==="es"?"Fecha, hora y quién cambió el estado":"Date, time and who changed status"}</summary><div>${events.map(event=>`<p><strong>${esc(statusStageLabel(event.status))}</strong><span>${esc(formatStatusTime(event.occurredAt)||"—")}</span><small>${esc(actorLabel(event))}</small></p>`).join("")}</div></details>`;
  }

  function orderProgressHtml(order) {
    if(order.status==="cancelled")
      return `<div class="rw-order-progress cancelled"><strong>${lang==="ru"?"Заказ отменён":lang==="es"?"Pedido cancelado":"Order cancelled"}</strong></div>`;
    const stages = [
      ["submitted", lang==="ru"?"Заказ создан":lang==="es"?"Pedido creado":"Order created"],
      ["confirmed", lang==="ru"?"Подтверждён":lang==="es"?"Confirmado":"Confirmed"],
      ["shipped", lang==="ru"?"Отгружен":lang==="es"?"Enviado":"Shipped"],
      ["delivered", lang==="ru"?"Доставлен":lang==="es"?"Entregado":"Delivered"],
    ];
    const current=orderLifecycleStatus(order);
    const rank=Math.max(0,stages.findIndex(([key])=>key===current));
    return `<div class="rw-order-progress">${stages.map((stage,index)=>{
      const event=latestStatusEvent(order,stage[0]);
      const meta=event?`${formatStatusTime(event.occurredAt)} · ${actorLabel(event)}`:"";
      return `<span class="${index<rank?"done":index===rank?"current":"next"}"${meta?` title="${esc(meta)}"`:""}><b>${index<rank?"✓":index+1}</b><em>${stage[1]}</em>${meta?`<small class="rw-stage-meta">${esc(formatStatusTime(event.occurredAt))}</small>`:""}</span>`;
    }).join("")}</div>`;
  }

  function orderStatusHint(order) {
    const lifecycle=orderLifecycleStatus(order);
    if(lifecycle==="submitted")return lang==="ru"?"Пекарня получила заказ. Ожидайте подтверждения.":lang==="es"?"La panadería recibió el pedido. Espera la confirmación.":"The bakery received the order. Awaiting confirmation.";
    if(lifecycle==="confirmed")return lang==="ru"?"Заказ подтверждён пекарней и готовится к поставке.":lang==="es"?"El pedido está confirmado y se prepara para la entrega.":"The order is confirmed and being prepared for delivery.";
    if(lifecycle==="shipped")return lang==="ru"?"Заказ отгружен. После подтверждения получения он ещё 7 дней останется в рабочих.":lang==="es"?"El pedido fue enviado. Tras confirmar la recepción permanecerá 7 días en curso.":"The order has shipped. After receipt confirmation it remains in Working for 7 days.";
    if(lifecycle==="delivered")return lang==="ru"?"Поставка завершена. Заказ автоматически перейдёт в архив через 7 дней.":lang==="es"?"Entrega completada. El pedido pasará al archivo automáticamente en 7 días.":"Delivery completed. The order moves to Archive automatically after 7 days.";
    return "";
  }

  const orderMatchesPeriod=(order)=>dateInRange(order.deliveryDate||order.date,orderDateFrom,orderDateTo);

  const orderMatchesStatus=(order)=>{
    if(orderStatusFilter==="all")return true;
    return orderLifecycleStatus(order)===orderStatusFilter;
  };

  const orderMatchesSearch=(order)=>{
    if(!orderSearch)return true;
    const q=orderSearch.toLowerCase();
    return orderNumber(order).toLowerCase().includes(q) ||
      order.items.some(item=>String(itemName(item.product)).toLowerCase().includes(q));
  };

  function updateMobileOrdersBadge() {
    const button=document.querySelector("#mobileOrders");if(!button)return;
    const count=account?ownOrders().filter(isActiveOrder).length:0;
    let badge=button.querySelector(".mobile-orders-badge");
    if(!badge){badge=document.createElement("b");badge.className="mobile-orders-badge";button.appendChild(badge)}
    badge.textContent=String(count);badge.hidden=!count;
  }
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
        <label><span>${t("restaurantName")} *</span><input name="name" required maxlength="120" value="${esc(account.name || "")}" autocomplete="organization"><small data-rw-field-error="name"></small></label>
        <label><span>${t("phone")} *</span><input name="phone" required maxlength="30" type="tel" inputmode="tel" autocomplete="tel" value="${esc(account.phone || "")}" placeholder="+34 …"><small data-rw-field-error="phone"></small></label>
        <label class="rw-profile-wide"><span>${t("address")} *</span><input name="address" required maxlength="300" autocomplete="street-address" value="${esc(account.address || "")}" placeholder="${t("address")}"><small data-rw-field-error="address"></small></label>
        <label><span>${t("language")}</span><select name="language"><option value="ru"${account.language === "ru" ? " selected" : ""}>Русский</option><option value="es"${account.language === "es" ? " selected" : ""}>Español</option><option value="en"${account.language === "en" ? " selected" : ""}>English</option></select></label>
      </div>
      <section class="rw-messengers" aria-labelledby="rw-messengers-title">
        <header><span class="rw-messenger-mark" aria-hidden="true">✦</span><div><h4 id="rw-messengers-title">${t("messengers")}</h4><p>${t("messengersHint")}</p></div></header>
        <div class="rw-messenger-grid">
          <label><span class="rw-messenger-label"><i aria-hidden="true">W</i>${t("whatsapp")}</span><input name="whatsapp" maxlength="30" type="tel" inputmode="tel" autocomplete="tel" value="${esc(account.whatsapp || "")}" placeholder="+34 600 000 000"><small>${t("whatsappHint")}</small></label>
          <label><span class="rw-messenger-label"><i aria-hidden="true">T</i>${t("telegram")}</span><input name="telegram" maxlength="120" autocapitalize="none" autocomplete="off" spellcheck="false" value="${esc(account.telegram || "")}" placeholder="@panora"><small>${t("telegramHint")}</small></label>
        </div>
        <div class="rw-extra-messengers"><h5>${t("otherMessengers")}</h5><div data-rw-messenger-list>${(account.extraMessengers || []).map(messengerRow).join("")}</div><button type="button" class="button button-ghost rw-add-messenger" data-rw-add-messenger>＋ ${t("addMessenger")}</button></div>
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
    const all = ownOrders();
    if (!all.length)
      return `<section class="rw-empty"><h3>${t("emptyOrders")}</h3><button class="button button-primary" data-rw-start>${t("newOrder")}</button></section>`;

    const working = all.filter(isActiveOrder);
    const archive = all.filter(isArchivedOrder);
    const source = orderView === "history" ? archive : working;
    const rows = source.filter(orderMatchesStatus).filter(orderMatchesPeriod).filter(orderMatchesSearch);

    const statusOptions = [
      ["all", lang==="ru"?"Все статусы":lang==="es"?"Todos los estados":"All statuses"],
      ["submitted", lang==="ru"?"Отправлены":lang==="es"?"Enviados":"Sent"],
      ["confirmed", lang==="ru"?"Подтверждены":lang==="es"?"Confirmados":"Confirmed"],
      ["shipped", lang==="ru"?"Отгружены":lang==="es"?"Expedidos":"Shipped"],
      ["delivered", lang==="ru"?"Доставлены":lang==="es"?"Entregados":"Delivered"],
      ["cancelled", lang==="ru"?"Отменены":lang==="es"?"Cancelados":"Cancelled"],
    ];


    return `<section class="rw-orders-page">
      <header class="rw-orders-toolbar">
        <div class="rw-order-view-tabs" role="tablist">
          <button type="button" class="${orderView === "active" ? "active" : ""}" data-rw-order-view="active"><span>${t("activeOrders")}</span><b>${working.length}</b></button>
          <button type="button" class="${orderView === "history" ? "active" : ""}" data-rw-order-view="history"><span>${t("historyOrders")}</span><b>${archive.length}</b></button>
        </div>
        <div class="rw-order-filters">
          <label class="rw-order-search"><span>${lang==="ru"?"Заказ":lang==="es"?"Pedido":"Order"}</span><input data-rw-order-search value="${esc(orderSearch)}" placeholder="${lang==="ru"?"Номер заказа":lang==="es"?"Número de pedido":"Order number"}"></label>
          <div class="rw-filter-menu"><span>${lang==="ru"?"Статус":lang==="es"?"Estado":"Status"}</span><button type="button" class="rw-filter-trigger" data-rw-filter-toggle="status">${esc((statusOptions.find(([value])=>value===orderStatusFilter)||statusOptions[0])[1])}<i>⌄</i></button><div class="rw-filter-popover" data-rw-filter-panel="status"${openFilterMenu==="status"?"":" hidden"}>${statusOptions.map(([value,label])=>`<button type="button" class="${orderStatusFilter===value?"active":""}" data-rw-order-status="${value}">${label}</button>`).join("")}</div></div>
          <div class="rw-filter-menu rw-period-menu"><span>${lang==="ru"?"Период":lang==="es"?"Período":"Period"}</span><button type="button" class="rw-filter-trigger" data-rw-filter-toggle="order-period">${esc(periodLabel(orderDateFrom,orderDateTo))}<i>▣</i></button><div class="rw-filter-popover rw-calendar-popover" data-rw-filter-panel="order-period"${openFilterMenu==="order-period"?"":" hidden"}>${calendarHtml("order",orderDateFrom,orderDateTo)}</div></div>
          ${(orderStatusFilter!=="all"||orderDateFrom||orderDateTo||orderSearch)?`<button type="button" class="rw-order-filter-reset" data-rw-order-filter-reset>${lang==="ru"?"Сбросить":lang==="es"?"Restablecer":"Reset"}</button>`:""}
        </div>
      </header>
      ${orderView==="active"?`<p class="rw-archive-rule">${lang==="ru"?"В рабочих остаются текущие и недавно доставленные заказы. После подтверждения доставки заказ автоматически переносится в архив через 7 дней.":lang==="es"?"Los pedidos actuales y recién entregados permanecen en curso. Tras confirmar la entrega, pasan al archivo automáticamente en 7 días.":"Current and recently delivered orders stay in Working. After delivery confirmation they move to Archive automatically after 7 days."}</p>`:""}
      ${rows.length ? `<section class="rw-list">${rows.map((order) => {
        const note=orderDeliveryNote(order);
        const lifecycle=orderLifecycleStatus(order);
        return `<article class="rw-order" data-rw-order="${esc(order.id)}">
      <header><span><strong>${orderNumber(order)}</strong><small>${t("delivery")}: ${esc(localDate(order.deliveryDate || order.date))}</small>${note?`<small class="rw-order-note">${lang==="ru"?"Накладная":lang==="es"?"Albarán":"Delivery note"}: ${esc(noteNumber(note))}</small>`:""}</span><b>${portalMoney(orderTotal(order))}</b></header>
      <div class="rw-order-status status-${esc(lifecycle)}">${esc(lifecycle==="delivered"?(lang==="ru"?"Доставлен":lang==="es"?"Entregado":"Delivered"):status(order))}</div>
      ${orderProgressHtml(order)}
      ${statusHistoryHtml(order)}
      <p class="rw-order-status-hint">${esc(orderStatusHint(order))}</p>
      <ul>${order.items.map((item) => `<li><span>${esc(itemName(item.product))}</span><strong>${item.quantity} ${t("pieces")}<small>× ${portalMoney(Number((order.prices || account.prices)[item.product] || 0))}</small></strong></li>`).join("")}</ul>
      <footer><span>${t("bake")}: <strong>${esc(localDate(order.date))}</strong></span>${canRestaurantCancel(order) ? `<button class="rw-cancel" data-rw-cancel="${esc(order.id)}">${lang === "ru" ? "Отменить заказ" : lang === "es" ? "Cancelar pedido" : "Cancel order"}</button>` : ""}</footer>
    </article>`;
      }).join("")}</section>` : `<section class="rw-empty rw-filtered-empty"><h3>${lang==="ru"?"По фильтру заказов нет":lang==="es"?"No hay pedidos con estos filtros":"No orders match these filters"}</h3>${orderView === "active" ? `<button class="button button-primary" data-rw-start>${t("newOrder")}</button>` : ""}</section>`}
    </section>`;
  }
  function notesHtml() {
    const allNotes = ownNotes(),
      orders = ownOrders();
    if (!allNotes.length)
      return `<section class="rw-empty"><h3>${t("emptyNotes")}</h3></section>`;

    const noteOrder=note=>orders.find((item)=>String(item.id)===String(note.orderId));
    const noteArchived=note=>{
      const order=noteOrder(note);
      if(order)return isArchivedOrder(order);
      const confirmed=note.customerConfirmedAt||note.offlineProof?.receivedAt;
      if(!confirmed)return false;
      const d=new Date(confirmed);
      return !Number.isNaN(d.getTime()) && Date.now()-d.getTime()>=7*24*60*60*1000;
    };
    const working=allNotes.filter(note=>!noteArchived(note));
    const archive=allNotes.filter(noteArchived);
    const source=noteView==="history"?archive:working;
    const notes=source.filter(note=>
      dateInRange(note.date,noteDateFrom,noteDateTo) &&
      (!noteQuery||noteNumber(note).toLowerCase().includes(noteQuery.toLowerCase()))
    );

    return `<section class="rw-note-library">
      <header class="rw-note-library-head"><div><span class="kicker">Panora</span><h3>${t("noteLibrary")}</h3><p>${t("noteLibraryHint")}</p></div></header>
      <div class="rw-order-view-tabs rw-note-view-tabs" role="tablist">
        <button type="button" class="${noteView==="active"?"active":""}" data-rw-note-view="active"><span>${lang==="ru"?"Рабочие":lang==="es"?"En curso":"Working"}</span><b>${working.length}</b></button>
        <button type="button" class="${noteView==="history"?"active":""}" data-rw-note-view="history"><span>${lang==="ru"?"Архив":lang==="es"?"Archivo":"Archive"}</span><b>${archive.length}</b></button>
      </div>
      <div class="rw-note-filters">
        <label class="rw-note-search"><span>${lang==="ru"?"Накладная":lang==="es"?"Albarán":"Delivery note"}</span><input data-rw-note-search value="${esc(noteQuery)}" placeholder="${lang==="ru"?"Номер накладной":lang==="es"?"Número de albarán":"Delivery note number"}"></label>
        <div class="rw-filter-menu rw-period-menu"><span>${lang==="ru"?"Период":lang==="es"?"Período":"Period"}</span><button type="button" class="rw-filter-trigger" data-rw-filter-toggle="note-period">${esc(periodLabel(noteDateFrom,noteDateTo))}<i>▣</i></button><div class="rw-filter-popover rw-calendar-popover" data-rw-filter-panel="note-period"${openFilterMenu==="note-period"?"":" hidden"}>${calendarHtml("note",noteDateFrom,noteDateTo)}</div></div>
        ${(noteQuery||noteDateFrom||noteDateTo)?`<button type="button" class="rw-order-filter-reset" data-rw-note-filter-reset>${lang==="ru"?"Сбросить":lang==="es"?"Restablecer":"Reset"}</button>`:""}
      </div>
      ${noteView==="active"?`<p class="rw-archive-rule">${lang==="ru"?"Рабочая накладная остаётся здесь до завершения поставки и ещё 7 дней после подтверждения получения. Затем она автоматически переходит в архив вместе с заказом.":lang==="es"?"El albarán permanece en curso hasta completar la entrega y 7 días más tras confirmar la recepción. Después pasa al archivo junto con el pedido.":"A delivery note stays in Working until delivery is complete and for 7 days after receipt confirmation, then moves to Archive with the order."}</p>`:""}
      <div class="rw-list">${notes.map((note) => {
        const order = noteOrder(note);
        const isMain = note.id === working[0]?.id && noteView==="active";
        return `<article class="rw-document${isMain ? " rw-document-main" : ""}">
      <span>${isMain ? `<em class="rw-main-note">${t("mainNote")}</em>` : ""}<strong>${noteNumber(note)}</strong><small>${t("delivery")}: ${esc(localDate(order?.deliveryDate || note.date))}</small>${note.paymentDueDate ? `<small class="rw-payment-due">${t("paymentDue")}: <strong>${esc(localDate(note.paymentDueDate))}</strong></small>` : ""}<small class="rw-trays">${t("traysDelivered")}: <b>${Number(note.traysDelivered || 0)}</b> · ${t("traysReturned")}: <b>${Number(note.traysReturned || 0)}</b> · ${t("trayBalance")}: <b>${Number(note.trayBalanceAfter || 0)}</b></small></span>
      <b>${portalMoney(note.total)}</b>
      <div class="rw-document-actions"><button class="button button-ghost" data-rw-note="${esc(note.id)}">${t("openNote")} Panora</button><button class="rw-other-forms" data-rw-forms="${esc(note.id)}">${t("otherForms")}</button></div>
    </article>`;
      }).join("")}</div>${notes.length ? "" : `<p class="rw-filter-empty">${t("nothingFound")}</p>`}
    </section>`;
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
    const filteredHistory = history.filter(operation=>dateInRange(operation.date,paymentDateFrom,paymentDateTo));
    return `<section class="rw-finance">
      <header><div><span class="kicker">Panora</span><h3>${t("finance")}</h3></div><div class="rw-finance-debt"><span>${t("debt")}</span><strong>${portalMoney(Math.max(0, delivered - paid))}</strong></div></header>
      <div class="rw-finance-stats">
        <article><span>${t("deliveredTotal")}</span><strong>${portalMoney(delivered)}</strong></article>
        <article><span>${t("paidTotal")}</span><strong>${portalMoney(paid)}</strong></article>
        <article><span>${t("pendingTotal")}</span><strong>${portalMoney(pending)}</strong></article>
      </div>
      <div class="rw-finance-history-head"><h4>${t("operationHistory")}</h4><div class="rw-filter-menu rw-period-menu rw-payment-period"><span>${lang==="ru"?"Период":lang==="es"?"Período":"Period"}</span><button type="button" class="rw-filter-trigger" data-rw-filter-toggle="payment-period">${esc(periodLabel(paymentDateFrom,paymentDateTo))}<i>▣</i></button><div class="rw-filter-popover rw-calendar-popover" data-rw-filter-panel="payment-period"${openFilterMenu==="payment-period"?"":" hidden"}>${calendarHtml("payment",paymentDateFrom,paymentDateTo)}</div></div></div>
      ${
        filteredHistory.length
          ? `<div class="rw-finance-history">${filteredHistory
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
    const messengerList = profileForm?.querySelector("[data-rw-messenger-list]");
    const bindMessengerRows = () => messengerList?.querySelectorAll("[data-rw-remove-messenger]").forEach((button) => button.onclick = () => button.closest("[data-rw-messenger-row]")?.remove());
    bindMessengerRows();
    profileForm?.querySelector("[data-rw-add-messenger]")?.addEventListener("click", () => {
      if ((messengerList?.children.length || 0) >= 10) return;
      messengerList?.insertAdjacentHTML("beforeend", messengerRow());
      bindMessengerRows();
      messengerList?.lastElementChild?.querySelector("input")?.focus();
    });
    if (profileForm) profileForm.onsubmit = async (event) => {
      event.preventDefault();
      const button = profileForm.querySelector('[type="submit"]'), result = profileForm.querySelector('[data-rw-profile-result]');
      let valid = true;
      ["name", "phone", "address"].forEach((field) => { const input = profileForm.elements[field], error = profileForm.querySelector(`[data-rw-field-error="${field}"]`), missing = !String(input.value || "").trim(); input.classList.toggle("invalid", missing); error.textContent = missing ? t("required") : ""; valid = valid && !missing; });
      const phoneLike = (value) => !value || /^[+()\d][\d\s().-]{5,24}$/.test(value);
      const telegram = String(profileForm.elements.telegram.value || "").trim();
      const taxId = String(profileForm.elements.taxId.value || "").trim();
      [["phone", phoneLike(profileForm.elements.phone.value), t("invalidPhone")], ["whatsapp", phoneLike(profileForm.elements.whatsapp.value), t("invalidPhone")], ["telegram", !telegram || /^(@[A-Za-z0-9_]{4,32}|https?:\/\/\S+)$/i.test(telegram), t("invalidTelegram")], ["taxId", !taxId || /^[A-Za-z0-9][A-Za-z0-9 .\/-]{2,24}$/.test(taxId), t("invalidTaxId")]].forEach(([field, ok, message]) => { const input = profileForm.elements[field]; input.classList.toggle("invalid", !ok); if (!ok) { const small = input.closest("label")?.querySelector("small"); if (small) small.textContent = message; valid = false; } });
      const extraMessengers = [...profileForm.querySelectorAll("[data-rw-messenger-row]")].map((row) => ({ name: row.querySelector("[data-rw-messenger-name]").value.trim(), contact: row.querySelector("[data-rw-messenger-contact]").value.trim(), row })).filter((item) => item.name || item.contact);
      extraMessengers.forEach((item) => { const complete = item.name && item.contact; item.row.classList.toggle("invalid", !complete); item.row.querySelector("[data-rw-messenger-error]").textContent = complete ? "" : t("incompleteMessenger"); if (!complete) valid = false; });
      if (!valid) return profileForm.querySelector(".invalid input, input.invalid")?.focus();
      button.disabled = true; button.textContent = t("savingProfile"); result.textContent = "";
      try { const details = Object.fromEntries(new FormData(profileForm)); details.extraMessengers = extraMessengers.map(({name, contact}) => ({name, contact})); await window.panoraRestaurantProfile.save(details); result.textContent = t("profileSaved"); result.className = "rw-profile-result success"; window.setTimeout(() => { activeTab = "profile"; renderAccountModal(); }, 650); }
      catch (error) { result.textContent = `${t("saveError")} ${error.message || ""}`.trim(); result.className = "rw-profile-result error"; button.disabled = false; button.textContent = t("saveProfile"); }
    };
    modal.querySelectorAll("[data-rw-tab]").forEach(
      (button) =>
        (button.onclick = () => {
          activeTab = button.dataset.rwTab;
          openFilterMenu = "";
          renderAccountModal();
        }),
    );
    modal.querySelectorAll("[data-rw-order-view]").forEach(
      (button) =>
        (button.onclick = () => {
          orderView = button.dataset.rwOrderView;
          openFilterMenu = "";
          renderAccountModal();
        }),
    );
    modal.querySelectorAll("[data-rw-note-view]").forEach(
      (button) =>
        (button.onclick = () => {
          noteView = button.dataset.rwNoteView;
          openFilterMenu = "";
          renderAccountModal();
        }),
    );
    const closeFilterPanels=(except="")=>{
      modal.querySelectorAll("[data-rw-filter-panel]").forEach((panel)=>{if(panel.dataset.rwFilterPanel!==except)panel.hidden=true;});
      if(!except)openFilterMenu="";
    };
    modal.querySelectorAll("[data-rw-filter-toggle]").forEach((button)=>button.onclick=(event)=>{
      event.preventDefault();event.stopPropagation();
      const key=button.dataset.rwFilterToggle;
      const panel=modal.querySelector(`[data-rw-filter-panel="${key}"]`);
      if(!panel)return;
      const willOpen=openFilterMenu!==key;
      closeFilterPanels(key);
      openFilterMenu=willOpen?key:"";
      panel.hidden=!willOpen;
    });
    modal.querySelectorAll("button[data-rw-order-status]").forEach((button)=>button.onclick=(event)=>{event.stopPropagation(); orderStatusFilter=button.dataset.rwOrderStatus; openFilterMenu=""; renderAccountModal(); });
    modal.onclick=(event)=>{if(!event.target.closest(".rw-filter-menu"))closeFilterPanels();};
    const orderSearchInput = modal.querySelector("[data-rw-order-search]");
    if (orderSearchInput) orderSearchInput.oninput = () => {
      orderSearch = orderSearchInput.value.trim();
      renderAccountModal();
      requestAnimationFrame(() => {
        const next = modal.querySelector("[data-rw-order-search]");
        if (next) { next.focus(); next.setSelectionRange(next.value.length,next.value.length); }
      });
    };
    modal.querySelector("[data-rw-order-filter-reset]")?.addEventListener("click",()=>{ orderStatusFilter="all"; orderSearch=""; orderDateFrom=""; orderDateTo=""; openFilterMenu=""; renderAccountModal(); });
    modal.querySelectorAll("[data-rw-cal-nav]").forEach(button=>button.onclick=(event)=>{
      event.preventDefault();event.stopPropagation();
      const scope=button.dataset.rwCalScope;
      calendarMonth[scope]=shiftMonth(calendarMonth[scope]||monthKey(getRange(scope)[0]||getRange(scope)[1]||isoToday()),Number(button.dataset.rwCalNav));
      renderAccountModal();
    });
    modal.querySelectorAll("[data-rw-cal-date]").forEach(button=>button.onclick=(event)=>{
      event.preventDefault();event.stopPropagation();
      const scope=button.dataset.rwCalScope,iso=button.dataset.rwCalDate;
      let [from,to]=getRange(scope);
      if(!from || (from&&to)){from=iso;to="";}
      else if(iso<from){to=from;from=iso}else to=iso;
      setRange(scope,from,to);
      renderAccountModal();
    });
    modal.querySelectorAll("[data-rw-cal-quick]").forEach(button=>button.onclick=(event)=>{
      event.preventDefault();event.stopPropagation();
      const scope=button.dataset.rwCalScope,key=button.dataset.rwCalQuick;
      const today=isoToday();let from="",to="";
      if(key==="today"){from=today;to=today}
      else if(key==="week"){const d=new Date(`${today}T12:00:00`);d.setDate(d.getDate()-6);from=d.toISOString().slice(0,10);to=today}
      else if(key==="month"){from=`${today.slice(0,7)}-01`;to=today}
      else if(key==="year"){from=`${today.slice(0,4)}-01-01`;to=today}
      setRange(scope,from,to);calendarMonth[scope]=monthKey(to||from||today);renderAccountModal();
    });
    modal.querySelectorAll("[data-rw-cal-clear]").forEach(button=>button.onclick=(event)=>{
      event.preventDefault();event.stopPropagation();
      setRange(button.dataset.rwCalScope,"","");renderAccountModal();
    });
    const search = modal.querySelector("[data-rw-note-search]");
    if (search) search.oninput = () => { noteQuery = search.value.trim(); renderAccountModal(); requestAnimationFrame(() => {const next=modal.querySelector("[data-rw-note-search]");if(next){next.focus();next.setSelectionRange(next.value.length,next.value.length);}}); };
    modal.querySelector("[data-rw-note-filter-reset]")?.addEventListener("click",()=>{ noteQuery=""; noteDateFrom=""; noteDateTo=""; openFilterMenu=""; renderAccountModal(); });
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
    updateMobileOrdersBadge();
    const counts = {
      orders: ownOrders().length,
      notes: ownNotes().length,
      payments: ownPayments().length,
    };
    modal.classList.add("restaurant-workspace");
    modal.innerHTML = `<div class="modal-head rw-head"><div><span class="kicker">Panora</span><h2>${t("title")}</h2><button type="button" class="rw-partner-name" data-rw-mobile-profile>${partnerTypeLabel()} · ${esc(account.name)} <span aria-hidden="true">›</span></button></div><button class="close-button" data-portal-close>×</button></div>
      <div class="rw-layout">
        <nav class="rw-nav" aria-label="${t("title")}">
          ${[
            ["home", t("home"), "⌂"],
            ["new", t("newOrder"), "＋"],
            ["orders", t("orders"), counts.orders],
            ["notes", t("notes"), counts.notes],
            ["payments", t("payments"), counts.payments],
            ["profile", t("profile"), "__PROFILE__"],
          ]
            .map(
              ([key, label, badge]) => {
                const icon = badge === "__PROFILE__"
                  ? `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4.4" fill="none" stroke="currentColor" stroke-width="2.3"/><path d="M3.6 20.5c.8-4.7 3.5-7 8.4-7s7.6 2.3 8.4 7" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>`
                  : badge;
                return `<button class="${activeTab === key ? "active" : ""}" data-rw-tab="${key}"><i>${icon}</i><span>${label}</span></button>`;
              },
            )
            .join("")}
        </nav>
        <main class="rw-content">${contentHtml()}</main>
      </div>
      <footer class="rw-footer"><button class="button button-ghost" data-rw-logout>${t("signOut")}</button><button class="button button-primary" data-portal-close>${t("close")}</button></footer>`;
    bind(modal);
    modal.querySelector("[data-rw-mobile-profile]")?.addEventListener("click", () => { activeTab = "profile"; renderAccountModal(); });
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
  };
  window.panoraOpenPartnerOrders = () => {
    if (!account) {
      openPanel(document.querySelector("#profileModal"));
      return;
    }
    activeTab = "orders";
    orderView = "active";
    renderAccountModal();
    openPanel(document.querySelector("#profileModal"));
  };
  window.panoraOpenPartnerProfile = () => {
    if (!account) {
      openPanel(document.querySelector("#profileModal"));
      return;
    }
    activeTab = "profile";
    renderAccountModal();
    openPanel(document.querySelector("#profileModal"));
  };
  const mobileProfileButton = document.querySelector("#mobileProfile");
  if (mobileProfileButton) mobileProfileButton.onclick = () => window.panoraOpenPartnerProfile();

  const backgroundWorkspaceRender=()=>{if(account&&!openFilterMenu)renderAccountModal();};
  window.addEventListener("online", backgroundWorkspaceRender);
  window.addEventListener("offline", backgroundWorkspaceRender);
  window.addEventListener("panora:restaurant-sync", backgroundWorkspaceRender);
  window.addEventListener("panora:partner-pricing-updated", backgroundWorkspaceRender);
  window.addEventListener("panora:pricing-refresh", backgroundWorkspaceRender);
  window.addEventListener("panora:retail-catalog-updated", backgroundWorkspaceRender);
  window.addEventListener("panora:partner-data-updated", backgroundWorkspaceRender);
})();
