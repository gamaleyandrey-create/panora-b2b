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
      orderHelp: "Выберите хлеб, затем подтвердите дату поставки в корзине. Заказы принимаются не позднее чем за 48 часов до выпечки.",
      phone: "Телефон",
      address: "Адрес доставки",
      partnerType: "Тип партнёра", restaurant: "Ресторан", shop: "Магазин", hotel: "Отель", cafe: "Кафе", catering: "Кейтеринг", other: "Другое",
      restaurantName: "Название партнёра", email: "Email для входа", telegram: "Telegram", whatsapp: "WhatsApp", messengers: "Мессенджеры", messengersHint: "Добавьте удобные способы связи. Пустые необязательные поля можно не заполнять.", telegramHint: "Имя пользователя, например @panora", whatsappHint: "Номер с кодом страны, например +34 600 000 000", otherMessengers: "Другие мессенджеры", addMessenger: "Добавить мессенджер", messengerName: "Название", messengerContact: "Номер или имя пользователя", removeMessenger: "Удалить", incompleteMessenger: "Укажите и название мессенджера, и контакт либо удалите пустую строку.", invalidPhone: "Проверьте номер телефона", invalidTelegram: "Используйте имя вида @username или ссылку", invalidTaxId: "Проверьте NIF / CIF", saveError: "Не удалось сохранить. Данные остались в форме — проверьте поля и повторите.", billingDetails: "Реквизиты", billingHint: "Данные для накладных и счетов.", legalName: "Юридическое название", taxId: "NIF / CIF", billingAddress: "Адрес для счетов", language: "Язык сообщений", contactPerson: "Контактное лицо", deliveryComment: "Комментарий для доставки", receivingHours: "Время приёмки", receivingDays: "Дни приёмки", notifications: "Уведомления", notifyOrder: "Подтверждение заказа", notifyShipment: "Отгрузка", notifyInvoice: "Новая накладная", notifyPayment: "Оплата", pushDevice:"Push на этом устройстве", pushDeviceHint:"Получать подтверждения, отгрузки и сообщения даже когда Panora закрыта.", pushEnable:"Включить Push", pushDisable:"Отключить Push", pushTest:"Тест Push", pushReady:"Push включён на этом устройстве ✓", pushNotReady:"Push не подключён — нажмите «Включить Push»", pushConnecting:"Подключаем Push…", pushServerMissing:"Браузер подписан, но сервер ещё не видит это устройство.", pushError:"Не удалось включить Push", profileData: "Данные партнёра", profileHint: "Эти данные подставляются в заказ и накладные.", saveProfile: "Сохранить изменения", savingProfile: "Сохраняем…", profileSaved: "Профиль сохранён", required: "Обязательное поле", emailLocked: "Email для входа меняет менеджер Panora.", accountAccess: "Доступ к кабинету",
      finance: "Баланс и оплаты",
      deliveredTotal: "Поставлено",
      paidTotal: "Оплачено",
      pendingTotal: "В споре",
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
      orderHelp: "Choose bread, then confirm the delivery date in the basket. Orders close 48 hours before baking.",
      phone: "Phone",
      address: "Delivery address",
      partnerType: "Partner type", restaurant: "Restaurant", shop: "Shop", hotel: "Hotel", cafe: "Cafe", catering: "Catering", other: "Other",
      restaurantName: "Partner name", email: "Sign-in email", telegram: "Telegram", whatsapp: "WhatsApp", messengers: "Messengers", messengersHint: "Add the contact methods you prefer. Optional fields may be left empty.", telegramHint: "Username, for example @panora", whatsappHint: "Number with country code, for example +34 600 000 000", otherMessengers: "Other messengers", addMessenger: "Add messenger", messengerName: "Name", messengerContact: "Number or username", removeMessenger: "Remove", incompleteMessenger: "Enter both the messenger name and contact, or remove the empty row.", invalidPhone: "Check the phone number", invalidTelegram: "Use @username or a link", invalidTaxId: "Check the NIF / CIF", saveError: "Could not save. Your entries remain in the form — check the fields and try again.", billingDetails: "Billing details", billingHint: "Details used on delivery notes and invoices.", legalName: "Legal name", taxId: "NIF / CIF", billingAddress: "Billing address", language: "Message language", contactPerson: "Contact person", deliveryComment: "Delivery note", receivingHours: "Receiving hours", receivingDays: "Receiving days", notifications: "Notifications", notifyOrder: "Order confirmation", notifyShipment: "Shipment", notifyInvoice: "New delivery note", notifyPayment: "Payment", pushDevice:"Push on this device", pushDeviceHint:"Receive confirmations, shipments and messages even when Panora is closed.", pushEnable:"Enable Push", pushDisable:"Disable Push", pushTest:"Test Push", pushReady:"Push is enabled on this device ✓", pushNotReady:"Push is not connected — click Enable Push", pushConnecting:"Connecting Push…", pushServerMissing:"The browser is subscribed, but the server does not see this device yet.", pushError:"Could not enable Push", profileData: "Partner details", profileHint: "These details are used in orders and delivery notes.", saveProfile: "Save changes", savingProfile: "Saving…", profileSaved: "Profile saved", required: "Required field", emailLocked: "Your Panora manager changes the sign-in email.", accountAccess: "Account access",
      finance: "Balance and payments",
      deliveredTotal: "Delivered",
      paidTotal: "Paid",
      pendingTotal: "In dispute",
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
      orderHelp: "Elige el pan y confirma la fecha de entrega en la cesta. Los pedidos se aceptan hasta 48 horas antes del horneado.",
      phone: "Teléfono",
      address: "Dirección de entrega",
      partnerType: "Tipo de socio", restaurant: "Restaurante", shop: "Tienda", hotel: "Hotel", cafe: "Cafetería", catering: "Catering", other: "Otro",
      restaurantName: "Nombre del socio", email: "Email de acceso", telegram: "Telegram", whatsapp: "WhatsApp", messengers: "Mensajería", messengersHint: "Añade las formas de contacto que prefieras. Los campos opcionales pueden quedar vacíos.", telegramHint: "Usuario, por ejemplo @panora", whatsappHint: "Número con prefijo, por ejemplo +34 600 000 000", otherMessengers: "Otros mensajeros", addMessenger: "Añadir mensajero", messengerName: "Nombre", messengerContact: "Número o usuario", removeMessenger: "Eliminar", incompleteMessenger: "Indica el nombre y el contacto, o elimina la fila vacía.", invalidPhone: "Revisa el número de teléfono", invalidTelegram: "Usa @usuario o un enlace", invalidTaxId: "Revisa el NIF / CIF", saveError: "No se pudo guardar. Los datos siguen en el formulario; revísalos e inténtalo de nuevo.", billingDetails: "Datos fiscales", billingHint: "Datos para albaranes y facturas.", legalName: "Razón social", taxId: "NIF / CIF", billingAddress: "Dirección de facturación", language: "Idioma de mensajes", contactPerson: "Persona de contacto", deliveryComment: "Comentario de entrega", receivingHours: "Horario de recepción", receivingDays: "Días de recepción", notifications: "Notificaciones", notifyOrder: "Confirmación del pedido", notifyShipment: "Envío", notifyInvoice: "Nuevo albarán", notifyPayment: "Pago", pushDevice:"Push en este dispositivo", pushDeviceHint:"Recibe confirmaciones, envíos y mensajes incluso con Panora cerrada.", pushEnable:"Activar Push", pushDisable:"Desactivar Push", pushTest:"Probar Push", pushReady:"Push activado en este dispositivo ✓", pushNotReady:"Push no está conectado — pulsa Activar Push", pushConnecting:"Conectando Push…", pushServerMissing:"El navegador está suscrito, pero el servidor aún no ve este dispositivo.", pushError:"No se pudo activar Push", profileData: "Datos del socio", profileHint: "Estos datos se usan en pedidos y albaranes.", saveProfile: "Guardar cambios", savingProfile: "Guardando…", profileSaved: "Perfil guardado", required: "Campo obligatorio", emailLocked: "El responsable de Panora cambia el email de acceso.", accountAccess: "Acceso a la cuenta",
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
  const pushParams=new URLSearchParams(location.search);
  let activeTab = pushParams.get("panoraPush")==="orders"?"orders":"home";
  let partnerPushUiBusy=false;
  const PARTNER_NOTIFY_FIELDS=["notifyOrder","notifyShipment","notifyInvoice","notifyPayment"];
  const snapshotPartnerNotificationPrefs=form=>{
    const snapshot={};
    PARTNER_NOTIFY_FIELDS.forEach(name=>{
      const input=form?.elements?.[name];
      const value=Boolean(input?.checked);
      snapshot[name]=value;
      if(account)account[name]=value;
    });
    return snapshot;
  };
  const restorePartnerNotificationPrefs=(form,snapshot)=>{
    if(!form||!snapshot)return;
    PARTNER_NOTIFY_FIELDS.forEach(name=>{
      const input=form.elements?.[name];
      if(input)input.checked=Boolean(snapshot[name]);
      if(account)account[name]=Boolean(snapshot[name]);
    });
  };
  let orderToReveal = pushParams.get("order")||"";
  let orderView = "active";
  let orderStatusFilter = "all";
  let orderSearch = "";
  let orderDateFrom = "";
  let orderDateTo = "";

  let orderFiltersOpen = false;

  let noteView = "active";
  let noteQuery = "";
  let noteDateFrom = "";
  let noteDateTo = "";
  let noteFiltersOpen = false;
  let noteToReveal = "";

  let paymentDateFrom = "";
  let paymentDateTo = "";
  let paymentSearch = "";
  let debtSearch = "";
  let paymentHistoryOpen = false;
  let financeView = "active";
  let financeArchiveSearch = "";
  let financeSummaryOpen = false;
  let financeFiltersOpen = false;
  let debtSearchDraft = "";
  let financeArchiveSearchDraft = "";
  const openPaymentAllocations = new Set();

  let openFilterMenu = "";
  const calendarMonth = { order:"", note:"", payment:"" };

  const localDateKey=date=>{const d=new Date(date),pad=v=>String(v).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
  const isoToday=()=>localDateKey(new Date());
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

  const ownOrders = () => {
    const rows=portalOrders();
    const accountId=String(account?.id||'').trim();
    return (Array.isArray(rows)?rows:[])
      .filter(order=>{
        const restaurantId=String(order?.restaurantId||'').trim();
        return !accountId||!restaurantId||restaurantId===accountId;
      })
      .slice()
      .sort((a,b)=>(Number(b.number)||0)-(Number(a.number)||0));
  };
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
  const orderNumber = (order) => Number(order?.number)>0?`PN-${String(Number(order.number)).padStart(4, "0")}`:"PN-…";
  const noteNumber = (note) => `DN-${String(note.number).padStart(4, "0")}`;
  const itemName = (id) =>
    typeof portalProduct === "function"
      ? portalProduct(id)
      : PRODUCTS.find((product) => product.id === id)?.text?.[lang]?.[0] || id;
  const orderItemName = (order, item) => {
    const names=item?.nameSnapshot;
    if(names&&typeof names==='object'){const value=names[lang]||names.ru||names.en||names.es;if(value)return String(value)}
    return itemName(item?.product);
  };
  const orderItemUnitPrice = (order, productId) => {
    const snapshot = Number(order?.prices?.[productId]);
    if (Number.isFinite(snapshot) && snapshot > 0) return snapshot;
    const partner = Number(account?.prices?.[productId]);
    if (Number.isFinite(partner) && partner > 0) return partner;
    try {
      const restaurantPrice = Number(restaurant?.(order?.restaurantId)?.prices?.[productId]);
      if (Number.isFinite(restaurantPrice) && restaurantPrice > 0) return restaurantPrice;
    } catch {}
    return 0;
  };
  const orderTotal = (order) =>
    typeof portalOrderTotal === "function"
      ? portalOrderTotal(order)
      : order.items.reduce(
          (sum, item) =>
            sum +
            item.quantity *
              orderItemUnitPrice(order,item.product),
          0,
        );
  const status = (order) =>
    typeof portalStatus === "function"
      ? portalStatus(order.status)
      : order.status;

  const orderDeliveryNote = (order) =>
    ownNotes().find((note) => String(note.orderId) === String(order.id)) || null;

  const confirmedDeliveryAt = (order) => {
    if(order?.deliveryConfirmedAt)return order.deliveryConfirmedAt;
    const note = orderDeliveryNote(order);
    return note?.customerConfirmedAt || note?.offlineProof?.receivedAt || null;
  };

  const archiveReferenceDate = (order) => {
    if(order?.archiveReferenceAt){
      const cached=new Date(order.archiveReferenceAt);
      if(!Number.isNaN(cached.getTime()))return cached;
    }
    const confirmed = confirmedDeliveryAt(order);
    if (confirmed) return new Date(confirmed);
    // Legacy completed/paid orders may pre-date customer confirmation support.
    if (["completed","paid"].includes(order.status) && (order.deliveryDate || order.date))
      return new Date(`${String(order.deliveryDate || order.date).slice(0,10)}T23:59:59`);
    return null;
  };

  const isArchivedOrder = (order) => {
    if (order?.archived === true) return true;
    if (order.status === "cancelled") return true;
    const deliveredAt = archiveReferenceDate(order);
    if (!deliveredAt || Number.isNaN(deliveredAt.getTime())) return false;
    return Date.now() - deliveredAt.getTime() >= 5 * 24 * 60 * 60 * 1000;
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

  function receiptConfirmationHtml(order){
    const note=orderDeliveryNote(order);
    const event=latestStatusEvent(order,"delivered");
    const confirmedAt=note?.customerConfirmedAt||note?.offlineProof?.receivedAt||event?.occurredAt;
    const receiver=String(note?.customerReceiver||note?.offlineProof?.receiver||event?.actorName||"").trim();
    if(!confirmedAt||!receiver)return "";
    const source=event?.source||"";
    const method=source==="partner_remote"
      ? (lang==="ru"?"удалённо":lang==="es"?"a distancia":"remotely")
      : note?.offlineProof?.receivedAt
        ? (lang==="ru"?"офлайн":lang==="es"?"sin conexión":"offline")
        : (lang==="ru"?"при получении":lang==="es"?"en la recepción":"on receipt");
    return `<div class="rw-receipt-confirmed"><span>${lang==="ru"?"Получение подтвердил":lang==="es"?"Recepción confirmada por":"Receipt confirmed by"}</span><strong>${esc(receiver)}</strong><small>${esc(formatStatusTime(confirmedAt))} · ${esc(method)}</small></div>`;
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
    if(lifecycle==="shipped")return lang==="ru"?"Заказ отгружен. После подтверждения получения он ещё 5 дней останется в рабочих.":lang==="es"?"El pedido fue enviado. Tras confirmar la recepción permanecerá 5 días en curso.":"The order has shipped. After receipt confirmation it remains in Working for 5 days.";
    if(lifecycle==="delivered")return lang==="ru"?"Поставка завершена. Заказ автоматически перейдёт в архив через 5 дней.":lang==="es"?"Entrega completada. El pedido pasará al archivo automáticamente en 5 días.":"Delivery completed. The order moves to Archive automatically after 5 days.";
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
  const partnerPaymentConfirmed=payment=>payment?.confirmed!==false&&(!payment?.status||payment.status==="confirmed")&&payment?.disputeStatus!=="open";
  const partnerFinanceSummary=()=>{
    const delivered=ownNotes().reduce((sum,note)=>sum+Number(note.total||0),0);
    const paid=ownPayments()
      .filter(payment=>partnerPaymentConfirmed(payment))
      .reduce((sum,payment)=>sum+Number(payment.amount||0),0);
    return {
      delivered,
      paid,
      debt:Math.max(0,delivered-paid),
      advance:Math.max(0,paid-delivered)
    };
  };

  function homeHtml() {
    const orders = ownOrders();
    const active = orders.filter(order => isActiveOrder(order) && !["delivered","cancelled"].includes(orderLifecycleStatus(order))).sort((a, b) => String(a.deliveryDate || a.date).localeCompare(String(b.deliveryDate || b.date)))[0];
    const last = orders[0];
    const notes = ownNotes();
    const trays = notes.length ? Number(notes[0].trayBalanceAfter || 0) : 0;
    const draftCount = cartCount();
    const finance=partnerFinanceSummary();
    return `<section class="rw-home">
      <header class="rw-overview-head"><div><span class="kicker">Panora</span><h3>${t("overview")}</h3></div><span class="rw-sync ${navigator.onLine ? "online" : "offline"}"><i></i>${syncLabel()}</span></header>
      <div class="rw-summary-grid">
        <button type="button" class="rw-summary-card" data-rw-summary="${active ? "delivery" : "new"}"${active ? ` data-rw-order-target="${esc(active.id)}"` : ""}><span>${t("nextDelivery")}</span><strong>${active ? esc(localDate(active.deliveryDate || active.date)) : "—"}</strong><small>${active ? esc(orderNumber(active)) : t("noActiveOrder")}</small></button>
        <button type="button" class="rw-summary-card rw-home-finance-card${finance.advance>0?" has-advance":""}" data-rw-summary="payments"><span>${t("debt")}</span><strong>${portalMoney(finance.debt)}</strong><small>${finance.advance>0?`${lang==="ru"?"Аванс":lang==="es"?"Anticipo":"Advance"}: ${portalMoney(finance.advance)}`:t("finance")}</small></button>
        <article><span>${t("trayBalance")}</span><strong>${trays}</strong><small>${t("pieces")}</small></article>
      </div>
      ${active ? (()=>{const note=notes.find(n=>n.orderId===active.id);return `<article class="rw-current-order"><div class="rw-current-order-main"><span>${t("activeOrder")}</span><div class="rw-current-order-title"><strong>${esc(orderNumber(active))}</strong><em>${esc(status(active))}</em></div><small><b>${t("delivery")}:</b> ${esc(localDate(active.deliveryDate || active.date))}</small>${active.bakeDate?`<small><b>${t("bake")}:</b> ${esc(localDate(active.bakeDate))}</small>`:""}<ul class="rw-current-order-items">${(active.items||[]).map(item=>{const qty=Number(item.quantity||0),unit=orderItemUnitPrice(active,item.product);return `<li><span>${esc(orderItemName(active,item))}</span><strong>${qty} ${t("pieces")} × ${portalMoney(unit)} = ${portalMoney(qty*unit)}</strong></li>`}).join("")}</ul>${note?`<small><b>${t("notes")}:</b> ${esc(noteNumber(note))}</small>`:""}</div><div class="rw-current-order-total"><span>${lang==="ru"?"Итого":lang==="es"?"Total":"Total"}</span><b>${portalMoney(orderTotal(active))}</b></div><div class="rw-current-order-actions"><button class="button button-ghost" data-rw-open-order="${esc(active.id)}">${lang==="ru"?"Открыть заказ":lang==="es"?"Abrir pedido":"Open order"}</button><button type="button" class="button button-ghost" data-order-messages="${esc(active.id)}" data-order-label="${esc(orderNumber(active))}">✉ ${lang==="ru"?"Связь":lang==="es"?"Comunicación":"Communication"}</button></div></article>`})() : ""}
      <div class="rw-quick-actions">${active ? (last ? `<button class="button button-ghost" data-rw-repeat="${esc(last.id)}">${t("repeatOrder")}</button>` : "") : `<button class="button button-primary" data-rw-start>${draftCount ? `${t("continueOrder")} · ${draftCount} ${t("pieces")}` : t("newOrder")}</button>${last ? `<button class="button button-ghost" data-rw-repeat="${esc(last.id)}">${t("repeatOrder")}</button>` : ""}`}</div>
    </section>`;
  }

  function profileHtml() {
    return `<section class="rw-profile-page"><aside class="rw-profile rw-profile-summary" aria-label="${esc(account.name)}">
      <div class="rw-profile-main"><span class="account-avatar">${esc(account.name?.[0]?.toUpperCase() || "R")}</span><span><strong>${esc(account.name)}</strong><small>${esc(account.email)}</small></span></div>
    </aside><form class="rw-profile-form" data-rw-profile-form>
      <header><h3>${t("profileData")}</h3><p>${t("profileHint")}</p></header>
      <div class="rw-profile-grid">
        <label class="rw-required-field"><span>${t("partnerType")} <b class="rw-required-mark">*</b><small class="rw-required-word">${lang==="ru"?"обязательно":lang==="es"?"obligatorio":"required"}</small></span><select name="partnerType" required>${["restaurant", "shop", "hotel", "cafe", "catering", "other"].map((type) => `<option value="${type}"${(account.partnerType || "restaurant") === type ? " selected" : ""}>${t(type)}</option>`).join("")}</select></label>
        <label class="rw-required-field"><span>${t("restaurantName")} <b class="rw-required-mark">*</b><small class="rw-required-word">${lang==="ru"?"обязательно":lang==="es"?"obligatorio":"required"}</small></span><input name="name" required maxlength="120" value="${esc(account.name || "")}" autocomplete="organization"><small data-rw-field-error="name"></small></label>
        <label class="rw-required-field"><span>${t("phone")} <b class="rw-required-mark">*</b><small class="rw-required-word">${lang==="ru"?"обязательно":lang==="es"?"obligatorio":"required"}</small></span><input name="phone" required maxlength="30" type="tel" inputmode="tel" autocomplete="tel" value="${esc(account.phone || "")}" placeholder="+34 …"><small data-rw-field-error="phone"></small></label>
        <label class="rw-profile-wide rw-required-field"><span>${t("address")} <b class="rw-required-mark">*</b><small class="rw-required-word">${lang==="ru"?"обязательно":lang==="es"?"obligatorio":"required"}</small></span><input name="address" required maxlength="300" autocomplete="street-address" value="${esc(account.address || "")}" placeholder="${t("address")}"><small data-rw-field-error="address"></small></label>
        <label><span>${t("contactPerson")}</span><input name="contactPerson" maxlength="120" value="${esc(account.contactPerson || "")}" autocomplete="name"></label>
        <label><span>${t("receivingHours")}</span><input name="receivingHours" maxlength="80" value="${esc(account.receivingHours || "")}" placeholder="08:00–11:00"></label>
        <label class="rw-profile-wide"><span>${t("receivingDays")}</span><input name="receivingDays" maxlength="120" value="${esc(account.receivingDays || "")}" placeholder="${lang==="ru"?"Пн–Сб":lang==="es"?"Lun–Sáb":"Mon–Sat"}"></label>
        <label class="rw-profile-wide"><span>${t("deliveryComment")}</span><textarea name="deliveryComment" maxlength="500" rows="3" placeholder="${lang==="ru"?"Например: вход со двора, звонить за 10 минут":lang==="es"?"Por ejemplo: entrada por el patio, llamar 10 min antes":"For example: courtyard entrance, call 10 min before"}">${esc(account.deliveryComment || "")}</textarea></label>
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
      <section class="rw-settings-panel">
        <header><div><h4>${lang==="ru"?"Настройки":lang==="es"?"Ajustes":"Settings"}</h4><p>${lang==="ru"?"Персональные настройки кабинета и сообщений.":lang==="es"?"Preferencias personales del área y los mensajes.":"Personal account and message preferences."}</p></div></header>
        <label class="rw-setting-language"><span>${t("language")}</span><select name="language"><option value="ru"${account.language === "ru" ? " selected" : ""}>Русский</option><option value="es"${account.language === "es" ? " selected" : ""}>Español</option><option value="en"${account.language === "en" ? " selected" : ""}>English</option></select><small>${lang==="ru"?"Этот язык используется в кабинете, уведомлениях и документах партнёра.":lang==="es"?"Este idioma se usa en el área, avisos y documentos del socio.":"This language is used for the account, notifications and partner documents."}</small></label>
        <div class="rw-notification-settings"><h5>${t("notifications")}</h5><div>
          ${[["notifyOrder","notifyOrder"],["notifyShipment","notifyShipment"],["notifyInvoice","notifyInvoice"],["notifyPayment","notifyPayment"]].map(([name,label])=>`<label><input type="checkbox" name="${name}"${account[name]!==false?" checked":""}><span>${t(label)}</span></label>`).join("")}
        </div></div>
        <div class="rw-partner-push"><div><strong>${t("pushDevice")}</strong><small>${t("pushDeviceHint")}</small></div><div class="rw-partner-push-actions"><button type="button" class="button button-ghost" data-rw-partner-push-enable>${t("pushEnable")}</button><button type="button" class="button button-ghost" data-rw-partner-push-test>${t("pushTest")}</button><button type="button" class="button button-ghost" data-rw-partner-push-disable hidden>${t("pushDisable")}</button></div><p data-rw-partner-push-state role="status"></p></div>
      </section>
      <div class="rw-profile-access"><span><strong>${t("accountAccess")}</strong><small>${t("emailLocked")}</small></span><b>${esc(account.email)}</b></div>
      <p class="rw-profile-result" data-rw-profile-result role="status"></p>
      <button class="button button-primary rw-profile-save" type="submit">${t("saveProfile")}</button>
    </form></section>`;
  }
  const NEW_ORDER_QTY_CAP = 500;
  const newOrderProducts=()=> (Array.isArray(PRODUCTS)?PRODUCTS:[])
    .filter(product=>product&&product.active!==false)
    .map(product=>{
      const id=String(product.id);
      const name=itemName(id);
      const retailPrice=Number(product.retailPrice ?? product.basePrice ?? product.price ?? 0);
      const wholesalePrice=Number(account?.prices?.[id] ?? product.wholesalePrice ?? product.price ?? retailPrice);
      const wholesaleMinQty=Math.max(1,Number(product.wholesaleMinQty||8));
      const image=product.image||"icon.svg";
      const gallery=[image,...(Array.isArray(product.gallery)?product.gallery:[])].filter((value,index,array)=>value&&array.indexOf(value)===index);
      return {id,name,retailPrice,wholesalePrice,wholesaleMinQty,image,gallery};
    });

  const newOrderTierPrice=(product,qty)=>Number(qty||0)>=product.wholesaleMinQty?product.wholesalePrice:product.retailPrice;
  const newOrderTierWarning=(product,qty)=>{
    if(!qty||Number(qty)>=product.wholesaleMinQty)return "";
    return lang==="ru"
      ?`Меньше ${product.wholesaleMinQty} шт. — розничная цена ${portalMoney(product.retailPrice)}/шт. Оптовая ${portalMoney(product.wholesalePrice)}/шт. действует от ${product.wholesaleMinQty} шт.`
      :lang==="es"
       ?`Menos de ${product.wholesaleMinQty} uds.: precio minorista ${portalMoney(product.retailPrice)}/ud. El mayorista ${portalMoney(product.wholesalePrice)}/ud. se aplica desde ${product.wholesaleMinQty} uds.`
       :`Below ${product.wholesaleMinQty} pcs: retail ${portalMoney(product.retailPrice)}/pc applies. Wholesale ${portalMoney(product.wholesalePrice)}/pc applies from ${product.wholesaleMinQty} pcs.`;
  };
  const newOrderDeliveryOptions=()=>{
    try{
      if(typeof getBakeDates==="function"){
        const selectedIds=Object.keys(cart||{}).filter(id=>Number(cart?.[id]||0)>0);
        const source=typeof window.panoraCompatibleBakeDates==="function"
          ?window.panoraCompatibleBakeDates(selectedIds,12)
          :getBakeDates(12);
        return source.map(item=>{
          const bakeDate=typeof dateValue==="function"?dateValue(item.date):String(item.date||"").slice(0,10);
          const deliveryDate=String(item.deliveryDate||bakeDate||"").slice(0,10);
          if(!bakeDate)return null;
          const bakeLabel=localDate(bakeDate);
          const deliveryLabel=localDate(deliveryDate||bakeDate);
          const label=deliveryDate&&deliveryDate!==bakeDate
            ?(lang==="ru"
              ?`Выпечка: ${bakeLabel} · Поставка: ${deliveryLabel}`
              :lang==="es"
                ?`Horneado: ${bakeLabel} · Entrega: ${deliveryLabel}`
                :`Bake: ${bakeLabel} · Delivery: ${deliveryLabel}`)
            :deliveryLabel;
          return {value:bakeDate,bakeDate,deliveryDate,label};
        }).filter(Boolean);
      }
    }catch{}
    return [];
  };

  function newOrderHtml() {
    const products=newOrderProducts();
    const options=newOrderDeliveryOptions();
    const count=cartCount();
    const total=products.reduce((sum,product)=>{const qty=Number(cart?.[product.id]||0);return sum+qty*newOrderTierPrice(product,qty)},0);
    const storedChosen=String(localStorage.getItem("panora-bake-date")||"");
    const chosen=options.some(option=>option.value===storedChosen)?storedChosen:(options[0]?.value||"");
    return `<section class="rw-new-order-page">
      <header class="rw-new-order-head"><div><span class="kicker">Panora</span><h3>${t("newOrder")}</h3><p>${lang==="ru"?"Выберите хлеб и количество. Ниже доступны только общие открытые дни выпечки для выбранных товаров.":lang==="es"?"Elige el pan y la cantidad. Abajo solo aparecen días de horneado abiertos comunes a los productos elegidos.":"Choose bread and quantity. Only common open bake days for the selected products appear below."}</p></div></header>
      <div class="rw-new-product-grid">
        ${products.map(product=>{
          const qty=Math.max(0,Math.min(NEW_ORDER_QTY_CAP,Number(cart?.[product.id]||0)));
          const unitPrice=newOrderTierPrice(product,qty);
          const warning=newOrderTierWarning(product,qty);
          const isWholesale=qty>=product.wholesaleMinQty;
          const displayWholesale=qty===0;
          const displayUnitPrice=displayWholesale?product.wholesalePrice:unitPrice;
          return `<article class="rw-new-product-card" data-rw-new-product="${esc(product.id)}">
            <div class="rw-new-product-photo"><img src="${esc(product.image)}" alt="${esc(product.name)}" width="320" height="320" loading="eager" decoding="async" data-rw-product-image></div>
            <div class="rw-new-product-body"><h4>${esc(product.name)}</h4>
              <div class="rw-new-product-price"><span data-rw-new-price-kind>${(displayWholesale||isWholesale)?(lang==="ru"?"Ваша оптовая цена":lang==="es"?"Tu precio mayorista":"Your wholesale price"):(lang==="ru"?"Розничная цена":lang==="es"?"Precio minorista":"Retail price")}</span><strong data-rw-new-unit-price>${portalMoney(displayUnitPrice)}</strong> <small>${lang==="ru"?"/ шт.":lang==="es"?"/ ud.":"/ pc."}</small></div>
              <small class="rw-new-wholesale-rule">${lang==="ru"?`Оптовая цена ${portalMoney(product.wholesalePrice)}/шт. от ${product.wholesaleMinQty} шт.`:lang==="es"?`Mayorista ${portalMoney(product.wholesalePrice)}/ud. desde ${product.wholesaleMinQty} uds.`:`Wholesale ${portalMoney(product.wholesalePrice)}/pc from ${product.wholesaleMinQty} pcs`}</small>
              <div class="rw-new-qty rw-new-qty-select" data-rw-new-qty-wrap="${esc(product.id)}">
                <label>
                  <span>${lang==="ru"?"Количество":lang==="es"?"Cantidad":"Quantity"}</span>
                  <select data-rw-new-qty-select="${esc(product.id)}" data-panora-no-draft="1" data-rw-stable-select="qty" aria-label="${lang==="ru"?"Количество":lang==="es"?"Cantidad":"Quantity"}">
                    ${Array.from({length:Math.min(NEW_ORDER_QTY_CAP+1,Math.max(51,product.wholesaleMinQty+25))},(_,value)=>`<option value="${value}"${value===qty?" selected":""}>${value}</option>`).join("")}
                  </select>
                </label>
                <small class="rw-new-limit-warning"${warning?"":" hidden"}>${warning}</small>
              </div>
            </div>
          </article>`;
        }).join("")}
      </div>
      <aside class="rw-new-cart">
        <div><span>${lang==="ru"?"В заказе":lang==="es"?"En el pedido":"In order"}</span><strong data-rw-new-count>${count} ${t("pieces")}</strong></div>
        <div><span>${lang==="ru"?"Сумма":lang==="es"?"Importe":"Total"}</span><strong data-rw-new-total>${portalMoney(total)}</strong></div>
        <label><span>${lang==="ru"?"День выпечки / поставка":lang==="es"?"Horneado / entrega":"Bake / delivery"}</span><select data-rw-new-date data-panora-no-draft="1" data-rw-stable-select="date">
          ${options.length?options.map(option=>`<option value="${esc(option.value)}"${option.value===chosen?" selected":""}>${esc(option.label)}</option>`).join(""):`<option value="">${lang==="ru"?"Нет общего открытого дня выпечки":lang==="es"?"No hay un día de horneado abierto común":"No common open bake day"}</option>`}
        </select></label>
        <button type="button" class="button button-primary" data-rw-new-open-cart${count?"":" disabled"}>${lang==="ru"?"Продолжить":lang==="es"?"Continuar":"Continue"}</button>
      </aside>
    </section>`;
  }
  function ordersHtml() {
    const all = ownOrders();
    if (!all.length)
      return `<section class="rw-empty"><h3>${t("emptyOrders")}</h3><button class="button button-primary" data-rw-start>${t("newOrder")}</button></section>`;

    const working = all.filter(isActiveOrder);
    const archive = all.filter(isArchivedOrder);
    const source = orderView === "history" ? archive : working;
    const rows = source.filter(orderMatchesStatus).filter(orderMatchesPeriod);

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
        <button type="button" class="rw-order-filters-toggle${(orderStatusFilter!=="all"||orderDateFrom||orderDateTo||orderSearch)?" has-active":""}" data-rw-order-filters-toggle aria-expanded="${orderFiltersOpen?"true":"false"}">
          <span>${lang==="ru"?"Фильтры":lang==="es"?"Filtros":"Filters"}</span>
          ${(orderStatusFilter!=="all"||orderDateFrom||orderDateTo||orderSearch)?`<b>${[orderSearch,orderStatusFilter!=="all",orderDateFrom||orderDateTo].filter(Boolean).length}</b>`:""}
          <i>${orderFiltersOpen?"⌃":"⌄"}</i>
        </button>
        <div class="rw-order-filters"${orderFiltersOpen?"":" hidden"}>
          <label class="rw-order-search"><span>${lang==="ru"?"Заказ":lang==="es"?"Pedido":"Order"}</span><input data-rw-order-search data-panora-no-draft="1" value="${esc(orderSearch)}" placeholder="${lang==="ru"?"Номер заказа":lang==="es"?"Número de pedido":"Order number"}" autocomplete="off" spellcheck="false"></label>
          <div class="rw-filter-menu"><span>${lang==="ru"?"Статус":lang==="es"?"Estado":"Status"}</span><button type="button" class="rw-filter-trigger" data-rw-filter-toggle="status">${esc((statusOptions.find(([value])=>value===orderStatusFilter)||statusOptions[0])[1])}<i>⌄</i></button><div class="rw-filter-popover" data-rw-filter-panel="status"${openFilterMenu==="status"?"":" hidden"}>${statusOptions.map(([value,label])=>`<button type="button" class="${orderStatusFilter===value?"active":""}" data-rw-order-status="${value}">${label}</button>`).join("")}</div></div>
          <div class="rw-filter-menu rw-period-menu"><span>${lang==="ru"?"Период":lang==="es"?"Período":"Period"}</span><button type="button" class="rw-filter-trigger" data-rw-filter-toggle="order-period">${esc(periodLabel(orderDateFrom,orderDateTo))}<i>▣</i></button><div class="rw-filter-popover rw-calendar-popover" data-rw-filter-panel="order-period"${openFilterMenu==="order-period"?"":" hidden"}>${calendarHtml("order",orderDateFrom,orderDateTo)}</div></div>
          ${(orderStatusFilter!=="all"||orderDateFrom||orderDateTo||orderSearch)?`<button type="button" class="rw-order-filter-reset" data-rw-order-filter-reset>${lang==="ru"?"Сбросить":lang==="es"?"Restablecer":"Reset"}</button>`:""}
        </div>
      </header>
      ${orderView==="active"?`<p class="rw-archive-rule">${lang==="ru"?"В рабочих остаются текущие и недавно доставленные заказы. После подтверждения доставки заказ автоматически переносится в архив через 5 дней.":lang==="es"?"Los pedidos actuales y recién entregados permanecen en curso. Tras confirmar la entrega, pasan al archivo automáticamente en 5 días.":"Current and recently delivered orders stay in Working. After delivery confirmation they move to Archive automatically after 5 days."}</p>`:""}
      ${rows.length ? `<section class="rw-list">${rows.map((order) => {
        const note=orderDeliveryNote(order);
        const lifecycle=orderLifecycleStatus(order);
        const searchText=`${orderNumber(order)} ${(order.items||[]).map(item=>orderItemName(order,item)).join(" ")}`.toLowerCase();
        const searchHidden=orderSearch&&!searchText.includes(orderSearch.toLowerCase());
        return `<article class="rw-order" data-rw-order="${esc(order.id)}" data-rw-order-search data-panora-no-draft="1"-text="${esc(searchText)}"${searchHidden?" hidden":""}>
      <header><span><strong>${orderNumber(order)}</strong><small>${t("delivery")}: ${esc(localDate(order.deliveryDate || order.date))}</small>${note?`<button type="button" class="rw-order-note rw-linked-document" data-rw-open-note="${esc(note.id)}">${lang==="ru"?"Накладная":lang==="es"?"Albarán":"Delivery note"}: ${esc(noteNumber(note))}</button>`:""}</span><b>${portalMoney(orderTotal(order))}</b></header>
      <div class="rw-order-status status-${esc(lifecycle)}">${esc(lifecycle==="delivered"?(lang==="ru"?"Доставлен":lang==="es"?"Entregado":"Delivered"):status(order))}</div>
      ${orderProgressHtml(order)}
      ${statusHistoryHtml(order)}
      ${receiptConfirmationHtml(order)}
      <p class="rw-order-status-hint">${esc(orderStatusHint(order))}</p>
      ${lifecycle==="shipped"&&note&&!note.customerConfirmedAt&&!note.offlineProof?.receivedAt?`<button type="button" class="button button-primary rw-confirm-delivery-remote" data-rw-confirm-delivery="${esc(note.id)}" data-rw-confirm-order="${esc(order.id)}">${lang==="ru"?"Подтвердить получение":lang==="es"?"Confirmar recepción":"Confirm receipt"}</button>`:""}
      ${(order.items||[]).length?`<ul>${order.items.map((item) => `<li><span>${esc(orderItemName(order,item))}</span><strong>${item.quantity} ${t("pieces")}<small>× ${portalMoney(orderItemUnitPrice(order,item.product))}</small></strong></li>`).join("")}</ul>`:`<div class="rw-order-items-error" role="alert"><strong>${lang==="ru"?"Состав заказа не загружен":lang==="es"?"No se cargó la composición del pedido":"Order items were not loaded"}</strong><span>${lang==="ru"?"Обновите данные. Если состав не появится, заказ требует проверки пекарней.":lang==="es"?"Actualice los datos. Si los productos no aparecen, la panadería debe revisar el pedido.":"Refresh the data. If the items do not appear, the bakery must review the order."}</span></div>`}
      <footer><span>${t("bake")}: <strong>${esc(localDate(order.date))}</strong></span><div class="rw-order-footer-actions"><button type="button" class="rw-order-message-button" data-order-messages="${esc(order.id)}" data-order-label="${esc(orderNumber(order))}">✉ ${lang==="ru"?"Связь":lang==="es"?"Comunicación":"Communication"}</button>${canRestaurantCancel(order) ? `<button class="rw-cancel" data-rw-cancel="${esc(order.id)}">${lang === "ru" ? "Отменить заказ" : lang === "es" ? "Cancelar pedido" : "Cancel order"}</button>` : ""}</div></footer>
    </article>`;
      }).join("")}</section><section class="rw-empty rw-filtered-empty" data-rw-order-empty hidden><h3>${lang==="ru"?"По фильтру заказов нет":lang==="es"?"No hay pedidos con estos filtros":"No orders match these filters"}</h3>${orderView === "active" ? `<button class="button button-primary" data-rw-start>${t("newOrder")}</button>` : ""}</section>` : `<section class="rw-empty rw-filtered-empty"><h3>${lang==="ru"?"По фильтру заказов нет":lang==="es"?"No hay pedidos con estos filtros":"No orders match these filters"}</h3>${orderView === "active" ? `<button class="button button-primary" data-rw-start>${t("newOrder")}</button>` : ""}</section>`}
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
      return !Number.isNaN(d.getTime()) && Date.now()-d.getTime()>=5 * 24 * 60 * 60 * 1000;
    };
    const working=allNotes.filter(note=>!noteArchived(note));
    const archive=allNotes.filter(noteArchived);

    const noteDebtMap=new Map(currentDebtItems().map(item=>[String(item.note.id),item]));
    const notePaymentSummary=note=>{
      const total=Number(note.total||0);
      const debtItem=noteDebtMap.get(String(note.id));
      const due=debtItem?Number(debtItem.due||0):0;
      return {
        total,
        paid:Math.max(0,total-due),
        due:Math.max(0,due)
      };
    };

    const source=noteView==="history"?archive:working;
    const notes=source.filter(note=>
      dateInRange(note.date,noteDateFrom,noteDateTo)
    );

    return `<section class="rw-note-library">
      <header class="rw-note-library-head"><div><span class="kicker">Panora</span><h3>${t("noteLibrary")}</h3><p>${t("noteLibraryHint")}</p></div></header>
      <div class="rw-order-view-tabs rw-note-view-tabs" role="tablist">
        <button type="button" class="${noteView==="active"?"active":""}" data-rw-note-view="active"><span>${lang==="ru"?"Рабочие":lang==="es"?"En curso":"Working"}</span><b>${working.length}</b></button>
        <button type="button" class="${noteView==="history"?"active":""}" data-rw-note-view="history"><span>${lang==="ru"?"Архив":lang==="es"?"Archivo":"Archive"}</span><b>${archive.length}</b></button>
      </div>
      <button type="button" class="rw-note-filters-toggle${(noteQuery||noteDateFrom||noteDateTo)?" has-active":""}" data-rw-note-filters-toggle aria-expanded="${noteFiltersOpen?"true":"false"}">
        <span>${lang==="ru"?"Фильтры":lang==="es"?"Filtros":"Filters"}</span>
        ${(noteQuery||noteDateFrom||noteDateTo)?`<b>${[noteQuery,noteDateFrom||noteDateTo].filter(Boolean).length}</b>`:""}
        <i>${noteFiltersOpen?"⌃":"⌄"}</i>
      </button>
      <div class="rw-note-filters"${noteFiltersOpen?"":" hidden"}>
        <label class="rw-note-search"><span>${lang==="ru"?"Накладная":lang==="es"?"Albarán":"Delivery note"}</span><input data-rw-note-search data-panora-no-draft="1" value="${esc(noteQuery)}" placeholder="${lang==="ru"?"Номер накладной":lang==="es"?"Número de albarán":"Delivery note number"}" autocomplete="off" spellcheck="false"></label>
        <div class="rw-filter-menu rw-period-menu"><span>${lang==="ru"?"Период":lang==="es"?"Período":"Period"}</span><button type="button" class="rw-filter-trigger" data-rw-filter-toggle="note-period">${esc(periodLabel(noteDateFrom,noteDateTo))}<i>▣</i></button><div class="rw-filter-popover rw-calendar-popover" data-rw-filter-panel="note-period"${openFilterMenu==="note-period"?"":" hidden"}>${calendarHtml("note",noteDateFrom,noteDateTo)}</div></div>
        <div class="rw-finance-filter-actions"><button type="button" class="rw-finance-filter-apply" data-rw-note-filter-apply>${lang==="ru"?"Применить":lang==="es"?"Aplicar":"Apply"}</button><button type="button" class="rw-finance-filter-close" data-rw-note-filter-close>${lang==="ru"?"Закрыть":lang==="es"?"Cerrar":"Close"}</button></div>
        ${(noteQuery||noteDateFrom||noteDateTo)?`<button type="button" class="rw-order-filter-reset" data-rw-note-filter-reset>${lang==="ru"?"Сбросить":lang==="es"?"Restablecer":"Reset"}</button>`:""}
      </div>
      ${noteView==="active"?`<p class="rw-archive-rule">${lang==="ru"?"Рабочая накладная остаётся здесь до завершения поставки и ещё 5 дней после подтверждения получения. Затем она автоматически переходит в архив вместе с заказом.":lang==="es"?"El albarán permanece en curso hasta completar la entrega y 5 días más tras confirmar la recepción. Después pasa al archivo junto con el pedido.":"A delivery note stays in Working until delivery is complete and for 5 days after receipt confirmation, then moves to Archive with the order."}</p>`:""}
      <div class="rw-list">${notes.map((note) => {
        const order = noteOrder(note);
        const isMain = note.id === working[0]?.id && noteView==="active";
        const noteSearchText=noteNumber(note).toLowerCase();
        const noteSearchHidden=noteQuery&&!noteSearchText.includes(noteQuery.toLowerCase());
        return `<article class="rw-document${isMain ? " rw-document-main" : ""}" data-rw-note-id="${esc(note.id)}" data-rw-note-search data-panora-no-draft="1"-text="${esc(noteSearchText)}"${noteSearchHidden?" hidden":""}>
      <span>${isMain ? `<em class="rw-main-note">${t("mainNote")}</em>` : ""}<strong>${noteNumber(note)}</strong>${order?`<button type="button" class="rw-linked-order" data-rw-open-order="${esc(order.id)}">${esc(orderNumber(order))}</button>`:""}<small>${t("delivery")}: ${esc(localDate(order?.deliveryDate || note.date))}</small>${order?.items?.length?`<small class="rw-note-products">${order.items.map(item=>{const qty=Number(item.quantity||0),priceSource=(order.prices&&Object.prototype.hasOwnProperty.call(order.prices,item.product))?order.prices:account.prices||{},unit=Number(priceSource[item.product]||0),line=qty*unit;return `<span class="rw-note-product-name">${esc(orderItemName(order,item))}</span><span class="rw-note-product-math"><b>${qty} ${t("pieces")}</b> × <b>${portalMoney(unit)}</b> = <strong>${portalMoney(line)}</strong></span>`}).join("")}</small>`:""}${note.paymentDueDate ? `<small class="rw-payment-due">${t("paymentDue")}: <strong>${esc(localDate(note.paymentDueDate))}</strong></small>` : ""}${(()=>{const fin=notePaymentSummary(note);return `<small class="rw-note-payment-state"><span>${lang==="ru"?"Сумма":lang==="es"?"Total":"Total"}: <b>${portalMoney(fin.total)}</b></span><span>${lang==="ru"?"Оплачено":lang==="es"?"Pagado":"Paid"}: <b>${portalMoney(fin.paid)}</b></span><span>${lang==="ru"?"К оплате":lang==="es"?"A pagar":"Due"}: <b>${portalMoney(fin.due)}</b></span></small>`})()}<small class="rw-trays">${t("traysDelivered")}: <b>${Number(note.traysDelivered || 0)}</b> · ${t("traysReturned")}: <b>${Number(note.traysReturned || 0)}</b> · ${t("trayBalance")}: <b>${Number(note.trayBalanceAfter || 0)}</b></small></span>
      <b>${portalMoney(note.total)}</b>
      <div class="rw-document-actions"><button class="button button-ghost" data-rw-note="${esc(note.id)}">${lang==="ru"?"Распечатать накладную":lang==="es"?"Imprimir albarán":"Print delivery note"}</button><button class="rw-other-forms" data-rw-forms="${esc(note.id)}">${t("otherForms")}</button></div>
    </article>`;
      }).join("")}</div><p class="rw-filter-empty" data-rw-note-empty${notes.some(note=>!noteQuery||noteNumber(note).toLowerCase().includes(noteQuery.toLowerCase()))?" hidden":""}>${t("nothingFound")}</p>
    </section>`;
  }
  const currentDebtItems=()=>{
    const shared = typeof window.panoraFinanceAllocation === "function"
      ? window.panoraFinanceAllocation(account.id)
      : null;
    if (shared?.notes) {
      return shared.notes
        .map(row => {
          const note = row.note;
          const due = Math.max(0, Number(row.due || 0));
          const paidAmount = Math.max(0, Number(row.paid || 0));
          const dueDate = note.paymentDueDate || "";
          const overdue = Boolean(dueDate && dueDate < isoToday());
          return {note, paidAmount, due, dueDate, overdue};
        })
        .filter(item => item.due > 0.009)
        .sort((a,b)=>{
          if(a.overdue!==b.overdue)return a.overdue?-1:1;
          const ad=a.dueDate||a.note.date||"9999-12-31";
          const bd=b.dueDate||b.note.date||"9999-12-31";
          return String(ad).localeCompare(String(bd))||Number(a.note.number||0)-Number(b.note.number||0);
        });
    }

    const notes=ownNotes().slice().sort((a,b)=>String(a.paymentDueDate||a.date||"").localeCompare(String(b.paymentDueDate||b.date||""))||Number(a.number||0)-Number(b.number||0));
    const payments=ownPayments().filter(payment=>partnerPaymentConfirmed(payment));

    const allocated=new Map(notes.map(note=>[String(note.id),0]));
    payments.filter(payment=>payment.deliveryNoteId).forEach(payment=>{
      const key=String(payment.deliveryNoteId);
      if(allocated.has(key))allocated.set(key,allocated.get(key)+Number(payment.amount||0));
    });
    let pool=payments.filter(payment=>!payment.deliveryNoteId).reduce((sum,payment)=>sum+Number(payment.amount||0),0);
    for(const note of notes){
      if(pool<=0)break;
      const key=String(note.id),already=allocated.get(key)||0;
      const remaining=Math.max(0,Number(note.total||0)-already);
      const used=Math.min(pool,remaining);
      allocated.set(key,already+used);pool-=used;
    }

    return notes.map(note=>{
      const paidAmount=Math.min(Number(note.total||0),allocated.get(String(note.id))||0);
      const due=Math.max(0,Number(note.total||0)-paidAmount);
      const dueDate=note.paymentDueDate||"";
      const overdue=Boolean(dueDate&&dueDate<isoToday());
      return {note,paidAmount,due,dueDate,overdue};
    }).filter(item=>item.due>0.009)
      .sort((a,b)=>{
        if(a.overdue!==b.overdue)return a.overdue?-1:1;
        const ad=a.dueDate||a.note.date||"9999-12-31";
        const bd=b.dueDate||b.note.date||"9999-12-31";
        return String(ad).localeCompare(String(bd))||Number(a.note.number||0)-Number(b.note.number||0);
      });
  };

  const partnerPaymentDistribution=(notes,payments)=>{
    const sortedNotes=(Array.isArray(notes)?notes:[])
      .slice()
      .sort((a,b)=>
        String(a.date||"").localeCompare(String(b.date||""))||
        Number(a.number||0)-Number(b.number||0)||
        String(a.id||"").localeCompare(String(b.id||""))
      );
    const sortedPayments=(Array.isArray(payments)?payments:[])
      .filter(payment=>partnerPaymentConfirmed(payment)&&Number(payment.amount||0)>0)
      .slice()
      .sort((a,b)=>
        String(a.receivedAt||a.date||"").localeCompare(String(b.receivedAt||b.date||""))||
        String(a.id||"").localeCompare(String(b.id||""))
      );

    const noteById=new Map(sortedNotes.map(note=>[String(note.id),note]));
    const remainingByNote=new Map(
      sortedNotes.map(note=>[String(note.id),Math.max(0,Number(note.total||0))])
    );
    const byPayment=new Map();
    const pooled=[];

    const rowFor=payment=>{
      const key=String(payment.id||"");
      if(!byPayment.has(key)){
        byPayment.set(key,{
          payment,
          amount:Math.max(0,Number(payment.amount||0)),
          allocations:[],
          credit:0
        });
      }
      return byPayment.get(key);
    };

    const apply=(row,note,requested)=>{
      if(!note||requested<=0)return 0;
      const key=String(note.id);
      const remaining=Math.max(0,Number(remainingByNote.get(key)||0));
      const used=Math.min(remaining,Math.max(0,Number(requested||0)));
      if(used<=0)return 0;
      remainingByNote.set(key,remaining-used);
      row.allocations.push({note,amount:used});
      return used;
    };

    // Match the bakery/shared balance algorithm:
    // first apply payments explicitly linked to a delivery note,
    // then distribute unlinked/excess amounts FIFO across the oldest open notes.
    sortedPayments.forEach(payment=>{
      const row=rowFor(payment);
      let amount=row.amount;
      const linked=payment.deliveryNoteId
        ? noteById.get(String(payment.deliveryNoteId))
        : null;
      if(linked){
        amount-=apply(row,linked,amount);
      }
      if(amount>0.005)pooled.push({row,amount});
    });

    pooled.forEach(pool=>{
      let amount=pool.amount;
      for(const note of sortedNotes){
        if(amount<=0.005)break;
        amount-=apply(pool.row,note,amount);
      }
      pool.row.credit=Math.max(0,amount);
    });

    return {byPayment,remainingByNote};
  };

  const partnerPaymentAllocationHtml=(payment,distribution)=>{
    const key=String(payment?.id||"");
    const row=distribution?.byPayment?.get?.(key);
    if(!row)return "";
    const allocations=(row.allocations||[]).filter(item=>Number(item.amount||0)>0.005);
    const credit=Math.max(0,Number(row.credit||0));
    if(!allocations.length&&credit<=0.005)return "";

    const open=openPaymentAllocations.has(key);
    const allocatedTotal=allocations.reduce((sum,item)=>sum+Number(item.amount||0),0);
    const summary=lang==="ru"
      ? `Куда зачтено · ${portalMoney(allocatedTotal)}${credit>0.005?` · аванс ${portalMoney(credit)}`:""}`
      : lang==="es"
        ? `Aplicación · ${portalMoney(allocatedTotal)}${credit>0.005?` · anticipo ${portalMoney(credit)}`:""}`
        : `Applied to · ${portalMoney(allocatedTotal)}${credit>0.005?` · credit ${portalMoney(credit)}`:""}`;

    return `<details class="rw-payment-allocation" data-rw-payment-allocation="${esc(key)}"${open?" open":""}>
      <summary>${esc(summary)}</summary>
      <div class="rw-payment-allocation-list">
        ${allocations.map(item=>`<div class="rw-payment-allocation-row">
          <button type="button" class="rw-payment-note-link" data-rw-allocation-note="${esc(item.note.id)}">${esc(noteNumber(item.note))}</button>
          <strong>${portalMoney(item.amount)}</strong>
        </div>`).join("")}
        ${credit>0.005?`<div class="rw-payment-allocation-row rw-payment-allocation-credit"><span>${lang==="ru"?"Аванс / переплата":lang==="es"?"Anticipo / saldo":"Advance / credit"}</span><strong>${portalMoney(credit)}</strong></div>`:""}
      </div>
    </details>`;
  };

  function paymentsHtml() {
    window.panoraRecalculateBalances?.();
    const payments = ownPayments(),
      notes = ownNotes();

    const confirmedPayments=payments.filter(payment=>partnerPaymentConfirmed(payment));
    const disputedPayments=payments.filter(payment=>payment.status!=="cancelled"&&payment.disputeStatus==="open");
    const paymentDistribution=partnerPaymentDistribution(notes,confirmedPayments);

    const delivered = notes.reduce((sum,note)=>sum+Number(note.total||0),0);
    const paid = confirmedPayments.reduce((sum,payment)=>sum+Number(payment.amount||0),0);
    const pending = disputedPayments.reduce((sum,payment)=>sum+Number(payment.amount||0),0);
    const advance = Math.max(0,paid-delivered);

    const debts=currentDebtItems();
    const debtById=new Map(debts.map(item=>[String(item.note.id),item]));
    const fullyPaidNotes=notes.map(note=>{
      const debtItem=debtById.get(String(note.id));
      const total=Number(note.total||0);
      const due=debtItem?Number(debtItem.due||0):0;
      const paidAmount=Math.max(0,total-due);
      const linkedPayments=confirmedPayments.filter(payment=>String(payment.deliveryNoteId||"")===String(note.id));
      const latestPaymentDate=linkedPayments.map(payment=>payment.receivedAt||payment.date||"").filter(Boolean).sort().slice(-1)[0]||note.date||"";
      return {note,total,paidAmount,due,closedAt:latestPaymentDate};
    }).filter(item=>item.due<=0.009);

    const filteredDebts=debts.filter(({note})=>
      dateInRange(note.date,paymentDateFrom,paymentDateTo) &&
      (!debtSearch||noteNumber(note).toLowerCase().includes(debtSearch.toLowerCase()))
    );

    const archivedFinance=fullyPaidNotes
      .filter(({note})=>dateInRange(note.date,paymentDateFrom,paymentDateTo))
      .filter(({note})=>!financeArchiveSearch||noteNumber(note).toLowerCase().includes(financeArchiveSearch.toLowerCase()))
      .sort((a,b)=>String(b.closedAt||b.note.date||"").localeCompare(String(a.closedAt||a.note.date||"")));

    const sharedTimeline =
      typeof window.panoraFinanceTimeline === "function"
        ? window.panoraFinanceTimeline(account.id)
        : null;

    const operations = sharedTimeline
      ? sharedTimeline.map(event=>
          event.kind==="delivery"
            ? {date:event.date,kind:"delivery",amount:event.amount,label:noteNumber(event.note),note:event.note,sort:0,balanceAfter:event.balanceAfter}
            : {date:event.date,kind:"payment",amount:-event.amount,label:event.payment.deliveryNoteId
                ? noteNumber(notes.find(note=>note.id===event.payment.deliveryNoteId)||{number:"—"})
                : t("withoutNote"),payment:event.payment,sort:1,balanceAfter:event.balanceAfter})
      : [
          ...notes.map(note=>({date:note.date,kind:"delivery",amount:Number(note.total||0),label:noteNumber(note),note,sort:0})),
          ...payments.filter(payment=>payment.status!=="cancelled").map(payment=>({
            date:payment.date,kind:"payment",amount:-Number(payment.amount||0),
            label:payment.deliveryNoteId?noteNumber(notes.find(note=>note.id===payment.deliveryNoteId)||{number:"—"}):t("withoutNote"),
            payment,sort:1
          }))
        ].sort((a,b)=>String(a.date).localeCompare(String(b.date))||a.sort-b.sort);

    if(!sharedTimeline){
      let running=0;
      operations.forEach(operation=>{
        if(operation.kind==="delivery"||partnerPaymentConfirmed(operation.payment))running+=operation.amount;
        operation.balanceAfter=Math.max(0,running);
      });
    }

    const history=operations.slice().reverse();
    const filteredHistory=history.filter(operation=>dateInRange(operation.date,paymentDateFrom,paymentDateTo));

    return `<section class="rw-finance">
      <header class="rw-finance-main-head"><div><h3>${t("finance")}</h3><button type="button" class="rw-finance-debt rw-finance-debt-button" data-rw-finance-summary-toggle aria-expanded="${financeSummaryOpen?"true":"false"}"><span>${lang==="ru"?"Актуальная задолженность":lang==="es"?"Deuda actual":"Current debt"}</span><strong>${portalMoney(Math.max(0,delivered-paid))}</strong>${advance>0?`<small>${lang==="ru"?"Аванс":lang==="es"?"Anticipo":"Advance"}: ${portalMoney(advance)}</small>`:""}<i aria-hidden="true">${financeSummaryOpen?"⌃":"⌄"}</i></button></div></header>


      ${(()=>{
        const now=Date.now();
        const disputable=payments.filter(payment=>{
          if(!partnerPaymentConfirmed(payment)||payment.disputeStatus==="open")return false;
          const deadline=new Date(payment.disputeDeadline||"").getTime();
          return Number.isFinite(deadline)&&deadline>now;
        }).sort((a,b)=>String(b.receivedAt||b.date).localeCompare(String(a.receivedAt||a.date)));
        const disputes=payments.filter(payment=>payment.disputeStatus==="open");
        if(!disputable.length&&!disputes.length)return "";
        return `<section class="rw-payment-notices">
          ${disputes.length?`<div class="rw-payment-dispute-banner"><strong>${lang==="ru"?"Есть оспоренные оплаты":lang==="es"?"Hay pagos disputados":"There are disputed payments"}</strong><span>${disputes.length} · ${portalMoney(disputes.reduce((sum,p)=>sum+Number(p.amount||0),0))}</span></div>`:""}
          ${disputable.map(payment=>`<article class="rw-payment-notice">
            <div><strong>${lang==="ru"?"Panora зарегистрировала оплату":lang==="es"?"Panora registró un pago":"Panora recorded a payment"}</strong><small>${esc(formatStatusTime(payment.receivedAt||payment.date))} · ${esc(payment.method||"")}${payment.deliveryNoteId?` · ${esc(noteNumber(notes.find(n=>n.id===payment.deliveryNoteId)||{number:"—"}))}`:""}</small><small>${lang==="ru"?"Оспорить можно до":lang==="es"?"Se puede disputar hasta":"Can be disputed until"} ${esc(formatStatusTime(payment.disputeDeadline))}</small></div>
            <strong>${portalMoney(payment.amount)}</strong>
            <button type="button" class="rw-dispute-payment" data-rw-dispute-payment="${esc(payment.id)}">${lang==="ru"?"Оспорить":lang==="es"?"Disputar":"Dispute"}</button>
          </article>`).join("")}
        </section>`;
      })()}

      <section class="rw-current-debts">
        <div class="rw-finance-view-tabs">
          <button type="button" class="${financeView==="active"?"active":""}" data-rw-finance-view="active"><span>${lang==="ru"?"Актуальные":lang==="es"?"Actuales":"Current"}</span><b>${debts.length}</b></button>
          <button type="button" class="${financeView==="archive"?"active":""}" data-rw-finance-view="archive"><span>${lang==="ru"?"Архив":lang==="es"?"Archivo":"Archive"}</span><b>${fullyPaidNotes.length}</b></button>
        </div>

        ${financeView==="active"?`
          <div class="rw-current-debts-head"><div><h4>${lang==="ru"?"Актуальные задолженности":lang==="es"?"Deudas actuales":"Current debts"}</h4></div><strong data-rw-debt-count>${debts.length}</strong></div>
          <div class="rw-finance-stats rw-finance-stats-4"${financeSummaryOpen?"":" hidden"}>
            <article><span>${t("deliveredTotal")}</span><strong>${portalMoney(delivered)}</strong></article>
            <article><span>${t("paidTotal")}</span><strong>${portalMoney(paid)}</strong></article>
            <article class="rw-finance-advance"><span>${lang==="ru"?"Аванс":lang==="es"?"Anticipo":"Advance"}</span><strong>${portalMoney(advance)}</strong></article>
            <article><span>${t("pendingTotal")}</span><strong>${portalMoney(pending)}</strong></article>
          </div>
          <button type="button" class="rw-finance-filters-toggle${(debtSearch||paymentDateFrom||paymentDateTo)?" has-active":""}" data-rw-finance-filters-toggle aria-expanded="${financeFiltersOpen?"true":"false"}"><span>${lang==="ru"?"Фильтры":lang==="es"?"Filtros":"Filters"}</span>${(debtSearch||paymentDateFrom||paymentDateTo)?`<b>${[debtSearch,paymentDateFrom||paymentDateTo].filter(Boolean).length}</b>`:""}<i>${financeFiltersOpen?"⌃":"⌄"}</i></button>
          <div class="rw-debt-filters"${financeFiltersOpen?"":" hidden"}>
            <label class="rw-debt-search"><span>${lang==="ru"?"Накладная":lang==="es"?"Albarán":"Delivery note"}</span><input data-rw-debt-search data-panora-no-draft="1" value="${esc(debtSearchDraft||debtSearch)}" placeholder="${lang==="ru"?"Введите номер накладной":lang==="es"?"Número de albarán":"Enter delivery note number"}" autocomplete="off" spellcheck="false"><small>${lang==="ru"?"Например: DN-0162":lang==="es"?"Por ejemplo: DN-0162":"For example: DN-0162"}</small></label><div class="rw-finance-filter-actions"><button type="button" class="rw-finance-filter-apply" data-rw-debt-filter-apply>${lang==="ru"?"Применить":lang==="es"?"Aplicar":"Apply"}</button><button type="button" class="rw-finance-filter-close" data-rw-finance-filter-close>Закрыть</button></div>
            <div class="rw-filter-menu rw-period-menu"><span>${lang==="ru"?"Период":lang==="es"?"Período":"Period"}</span><button type="button" class="rw-filter-trigger" data-rw-filter-toggle="payment-period">${esc(periodLabel(paymentDateFrom,paymentDateTo))}<i>▣</i></button><div class="rw-filter-popover rw-calendar-popover" data-rw-filter-panel="payment-period"${openFilterMenu==="payment-period"?"":" hidden"}>${calendarHtml("payment",paymentDateFrom,paymentDateTo)}</div></div>
            ${(debtSearch||paymentDateFrom||paymentDateTo)?`<button type="button" class="rw-order-filter-reset" data-rw-debt-filter-reset>${lang==="ru"?"Сбросить":lang==="es"?"Restablecer":"Reset"}</button>`:""}
          </div>
          ${debts.length?`<div class="rw-debt-list">${debts.map(({note,paidAmount,due,dueDate,overdue})=>{
            const searchText=noteNumber(note).toLowerCase();
            const rangeMatch=dateInRange(note.date,paymentDateFrom,paymentDateTo);
            const searchMatch=!debtSearch||searchText.includes(debtSearch.toLowerCase());
            return `<article class="rw-debt-item${overdue?" overdue":""}" data-rw-open-debt-note="${esc(note.id)}" tabindex="0" role="link" data-rw-debt-search data-panora-no-draft="1"-text="${esc(searchText)}" data-rw-debt-date="${esc(normalizeIso(note.date))}"${rangeMatch&&searchMatch?"":" hidden"}>
              <div><strong>${esc(noteNumber(note))}</strong><small>${lang==="ru"?"Поставка":lang==="es"?"Entrega":"Delivery"}: ${esc(localDate(note.date))}</small>${dueDate?`<small>${lang==="ru"?"Оплатить до":lang==="es"?"Pagar antes de":"Due"}: <b>${esc(localDate(dueDate))}</b></small>`:""}</div>
              <div><span>${lang==="ru"?"Сумма":lang==="es"?"Total":"Total"}</span><b>${portalMoney(note.total)}</b></div>
              <div><span>${lang==="ru"?"Оплачено":lang==="es"?"Pagado":"Paid"}</span><b>${portalMoney(paidAmount)}</b></div>
              <div class="rw-debt-due"><span>${overdue?(lang==="ru"?"Просрочено":lang==="es"?"Vencido":"Overdue"):(lang==="ru"?"К оплате":lang==="es"?"A pagar":"Due")}</span><strong>${portalMoney(due)}</strong></div>
            </article>`;
          }).join("")}</div><div class="rw-no-debt" data-rw-debt-empty${filteredDebts.length?" hidden":""}>${lang==="ru"?"По выбранному фильтру задолженностей нет.":lang==="es"?"No hay deudas con este filtro.":"No debts match this filter."}</div>`:`<div class="rw-no-debt">${lang==="ru"?"Актуальной задолженности нет.":lang==="es"?"No hay deuda pendiente.":"No current debt."}</div>`}
        `:`
          <div class="rw-current-debts-head"><div><h4>${lang==="ru"?"Архив закрытых расчётов":lang==="es"?"Archivo de pagos cerrados":"Closed settlements archive"}</h4></div><strong>${fullyPaidNotes.length}</strong></div>
          <button type="button" class="rw-finance-filters-toggle${(financeArchiveSearch||paymentDateFrom||paymentDateTo)?" has-active":""}" data-rw-finance-filters-toggle aria-expanded="${financeFiltersOpen?"true":"false"}"><span>${lang==="ru"?"Фильтры":lang==="es"?"Filtros":"Filters"}</span>${(financeArchiveSearch||paymentDateFrom||paymentDateTo)?`<b>${[financeArchiveSearch,paymentDateFrom||paymentDateTo].filter(Boolean).length}</b>`:""}<i>${financeFiltersOpen?"⌃":"⌄"}</i></button>
          <div class="rw-debt-filters"${financeFiltersOpen?"":" hidden"}>
            <label class="rw-debt-search"><span>${lang==="ru"?"Накладная":lang==="es"?"Albarán":"Delivery note"}</span><input data-rw-finance-archive-search data-panora-no-draft="1" value="${esc(financeArchiveSearchDraft||financeArchiveSearch)}" placeholder="${lang==="ru"?"Введите номер накладной":lang==="es"?"Número de albarán":"Enter delivery note number"}" autocomplete="off" spellcheck="false"><small>${lang==="ru"?"Например: DN-0162":lang==="es"?"Por ejemplo: DN-0162":"For example: DN-0162"}</small></label><div class="rw-finance-filter-actions"><button type="button" class="rw-finance-filter-apply" data-rw-finance-archive-apply>${lang==="ru"?"Применить":lang==="es"?"Aplicar":"Apply"}</button><button type="button" class="rw-finance-filter-close" data-rw-finance-filter-close>Закрыть</button></div>
            <div class="rw-filter-menu rw-period-menu"><span>${lang==="ru"?"Период":lang==="es"?"Período":"Period"}</span><button type="button" class="rw-filter-trigger" data-rw-filter-toggle="payment-period">${esc(periodLabel(paymentDateFrom,paymentDateTo))}<i>▣</i></button><div class="rw-filter-popover rw-calendar-popover" data-rw-filter-panel="payment-period"${openFilterMenu==="payment-period"?"":" hidden"}>${calendarHtml("payment",paymentDateFrom,paymentDateTo)}</div></div>
            ${(financeArchiveSearch||paymentDateFrom||paymentDateTo)?`<button type="button" class="rw-order-filter-reset" data-rw-finance-archive-reset>${lang==="ru"?"Сбросить":lang==="es"?"Restablecer":"Reset"}</button>`:""}
          </div>
          ${archivedFinance.length?`<div class="rw-finance-archive-list">${archivedFinance.map(({note,total,paidAmount,closedAt})=>`<article class="rw-finance-archive-item" data-rw-finance-archive-text="${esc(noteNumber(note).toLowerCase())}" data-rw-open-debt-note="${esc(note.id)}" tabindex="0" role="link">
            <div><strong>${esc(noteNumber(note))}</strong><small>${lang==="ru"?"Поставка":lang==="es"?"Entrega":"Delivery"}: ${esc(localDate(note.date))}</small></div>
            <div><span>${lang==="ru"?"Сумма":lang==="es"?"Total":"Total"}</span><b>${portalMoney(total)}</b></div>
            <div><span>${lang==="ru"?"Оплачено":lang==="es"?"Pagado":"Paid"}</span><b>${portalMoney(paidAmount)}</b></div>
            <div><span>${lang==="ru"?"Закрыто":lang==="es"?"Cerrado":"Closed"}</span><b>${esc(localDate(closedAt||note.date))}</b></div>
          </article>`).join("")}</div>`:`<div class="rw-no-debt">${lang==="ru"?"В архиве пока нет закрытых расчётов.":lang==="es"?"Todavía no hay pagos cerrados en el archivo.":"No closed settlements in the archive yet."}</div>`}
        `}
      </section>

      <section class="rw-history-collapsible">
        <button type="button" class="rw-history-toggle" data-rw-history-toggle aria-expanded="${paymentHistoryOpen?"true":"false"}"><span>${t("operationHistory")}</span><span class="rw-history-toggle-meta">${operations.length} <i>${paymentHistoryOpen?"⌃":"⌄"}</i></span></button>
        <div class="rw-history-content"${paymentHistoryOpen?"":" hidden"}>
      <div class="rw-finance-history-head">
        <h4>${lang==="ru"?"Фильтры истории":lang==="es"?"Filtros del historial":"History filters"}</h4>
        <div class="rw-finance-history-filters">
          <label class="rw-payment-search"><span>${lang==="ru"?"Поиск":lang==="es"?"Buscar":"Search"}</span><input data-rw-payment-search data-panora-no-draft="1" value="${esc(paymentSearch)}" placeholder="${lang==="ru"?"Накладная или оплата":lang==="es"?"Albarán o pago":"Delivery note or payment"}"></label>
        </div>
      </div>

      ${filteredHistory.length
        ? `<div class="rw-finance-history">${filteredHistory.map(operation=>{
            const searchText=`${operation.label||""} ${operation.payment?.method||""} ${operation.payment?.note||""} ${operation.kind==="payment"?t("payment"):t("delivery")}`.toLowerCase();
            const hidden=paymentSearch&&!searchText.includes(paymentSearch.toLowerCase());
            return `<article class="rw-operation ${operation.kind}${operation.payment?.disputeStatus==="open"?" disputed":""}" data-rw-payment-search data-panora-no-draft="1"-text="${esc(searchText)}"${hidden?" hidden":""}>
              <div><strong>${operation.kind==="delivery"?`${t("delivery")} · ${esc(operation.label)}`:`${t("payment")} · ${esc(operation.label)}`}</strong><small>${esc(localDate(operation.date))}${operation.note?.paymentDueDate?` · ${t("paymentDue")}: ${esc(localDate(operation.note.paymentDueDate))}`:""}${operation.payment?.method?` · ${esc(operation.payment.method)}`:""}${operation.payment?.note?` · ${esc(operation.payment.note)}`:""}</small>${operation.kind==="payment"?partnerPaymentAllocationHtml(operation.payment,paymentDistribution):""}</div>
              <div class="rw-operation-amount"><b>${operation.kind==="payment"?(operation.payment?.status==="cancelled"?(lang==="ru"?"Оплата отменена ":lang==="es"?"Pago cancelado ":"Payment cancelled "):(lang==="ru"?"Оплата ":lang==="es"?"Pago ":"Payment ")):(lang==="ru"?"Начислено ":lang==="es"?"Cargado ":"Charged ")}${portalMoney(Math.abs(operation.amount))}</b><small>${operation.payment?.status==="cancelled"?(lang==="ru"?"Не участвует в расчётах":lang==="es"?"No afecta al saldo":"Excluded from balance"):operation.payment?.disputeStatus==="open"?(lang==="ru"?"В споре":lang==="es"?"En disputa":"In dispute"):`${t("balanceAfter")}: ${portalMoney(Math.max(0,operation.balanceAfter))}`}</small></div>
            </article>`;
          }).join("")}</div><p class="rw-finance-empty" data-rw-payment-empty hidden>${t("emptyPayments")}</p>`
        : `<p class="rw-finance-empty">${t("emptyPayments")}</p>`}
        </div>
      </section>
    </section>`;
  }
  function pricesHtml() {
    const products = PRODUCTS.filter(
      (product) => account.prices?.[product.id] != null,
    );
    const productDescription = (product) => {
      const fromText = product?.text?.[lang]?.[1];
      if (fromText) return String(fromText);
      const managed = (() => {
        try {
          const list = JSON.parse(localStorage.getItem("panora-products") || "[]");
          return Array.isArray(list) ? list.find(item => String(item.id) === String(product.id)) : null;
        } catch (_) { return null; }
      })();
      const value = String(
        managed?.descriptions?.[lang] ||
        managed?.descriptions?.ru ||
        ""
      ).trim();
      const compact = value.replace(/\s+/g, "");
      // Hide accidental placeholder text like "oooooooo", "aaaaaa", etc.
      if (compact.length >= 5 && /^([\p{L}\p{N}])\1+$/u.test(compact)) return "";
      return value;
    };
    return `<section class="rw-prices rw-profile-prices">
      <header class="rw-profile-prices-head">
        <div><h3>${t("prices")}</h3><p>${lang==="ru"?"Ваши действующие цены на продукцию Panora.":lang==="es"?"Tus precios actuales de productos Panora.":"Your current Panora product prices."}</p></div>
      </header>
      <div class="rw-profile-price-list">
        ${products.map((product) => {
          const description = productDescription(product);
          const image = product.image || "icon.svg";
          const weight = Number(product.weight || 0);
          return `<article class="rw-profile-price-row" data-rw-price-product="${esc(product.id)}">
            <div class="rw-profile-price-photo" style="background-image:url(&quot;${esc(image)}&quot;)"><img src="${esc(image)}" alt="${esc(itemName(product.id))}" loading="eager" decoding="async" fetchpriority="low" width="320" height="320"></div>
            <div class="rw-profile-price-copy">
              <strong>${esc(itemName(product.id))}</strong>
              ${description ? `<p>${esc(description)}</p>` : ""}
              ${weight ? `<small>${weight} г · ${lang==="ru"?"цена за 1 шт.":lang==="es"?"precio por 1 ud.":"price per 1 pc."}</small>` : `<small>${lang==="ru"?"Цена за 1 шт.":lang==="es"?"Precio por 1 ud.":"Price per 1 pc."}</small>`}
            </div>
            <div class="rw-profile-price-value"><span>${lang==="ru"?"Ваша цена":lang==="es"?"Tu precio":"Your price"}</span><strong>${portalMoney(account.prices[product.id])}</strong></div>
          </article>`;
        }).join("")}
      </div>
    </section>`;
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
    modal.querySelectorAll("[data-rw-payment-allocation]").forEach((details)=>{
      details.addEventListener("toggle",()=>{
        const key=String(details.dataset.rwPaymentAllocation||"");
        if(!key)return;
        if(details.open)openPaymentAllocations.add(key);
        else openPaymentAllocations.delete(key);
      });
    });
    modal.querySelectorAll("[data-rw-allocation-note]").forEach((button)=>{
      button.onclick=(event)=>{
        event.preventDefault();
        event.stopPropagation();
        activeTab="notes";
        noteToReveal=button.dataset.rwAllocationNote||"";
        renderAccountModal();
      };
    });
    modal.querySelectorAll("[data-rw-summary]").forEach((button) => button.onclick = () => {
      if (button.dataset.rwSummary === "payments") activeTab = "payments";
      else if (button.dataset.rwSummary === "delivery") {
        activeTab = "orders";
        orderToReveal = button.dataset.rwOrderTarget || "";
      } else activeTab = "new";
      renderAccountModal();
    });
    const profileForm = modal.querySelector("[data-rw-profile-form]");
    const profileLanguage = profileForm?.querySelector('select[name="language"]');
    if(profileLanguage){
      profileLanguage.onchange=async()=>{
        const next=profileLanguage.value;
        const previous=account?.language||lang;
        if(account)account.language=next;
        window.panoraSetLanguage?.(next);
        profileLanguage.disabled=true;
        try{
          if(!window.panoraRestaurantProfile?.save)throw new Error(lang==="ru"?"Облако ещё загружается":lang==="es"?"La nube aún se está cargando":"Cloud is still loading");
          await window.panoraRestaurantProfile.save({
            name:account.name,
            phone:account.phone,
            address:account.address,
            whatsapp:account.whatsapp,
            telegram:account.telegram,
            extraMessengers:account.extraMessengers||[],
            legalName:account.legalName,
            taxId:account.taxId,
            billingAddress:account.billingAddress,
            contactPerson:account.contactPerson,
            deliveryComment:account.deliveryComment,
            receivingHours:account.receivingHours,
            receivingDays:account.receivingDays,
            notifyOrder:account.notifyOrder!==false?"on":"",
            notifyShipment:account.notifyShipment!==false?"on":"",
            notifyInvoice:account.notifyInvoice!==false?"on":"",
            notifyPayment:account.notifyPayment!==false?"on":"",
            language:next,
            partnerType:account.partnerType
          });
          const result=profileForm.querySelector('[data-rw-profile-result]');
          if(result){result.textContent=t("profileSaved");result.className="rw-profile-result success";}
          setTimeout(()=>{activeTab="profile";renderAccountModal();},250);
        }catch(error){
          if(account)account.language=previous;
          window.panoraSetLanguage?.(previous);
          profileLanguage.value=previous;
          profileLanguage.disabled=false;
          const result=profileForm.querySelector('[data-rw-profile-result]');
          if(result){result.textContent=`${t("saveError")} ${error.message||""}`.trim();result.className="rw-profile-result error";}
        }
      };
    }
    const messengerList = profileForm?.querySelector("[data-rw-messenger-list]");
    const bindMessengerRows = () => messengerList?.querySelectorAll("[data-rw-remove-messenger]").forEach((button) => button.onclick = () => button.closest("[data-rw-messenger-row]")?.remove());
    bindMessengerRows();
    profileForm?.querySelector("[data-rw-add-messenger]")?.addEventListener("click", () => {
      if ((messengerList?.children.length || 0) >= 10) return;
      messengerList?.insertAdjacentHTML("beforeend", messengerRow());
      bindMessengerRows();
      messengerList?.lastElementChild?.querySelector("input")?.focus();
    });
    const pushState=profileForm?.querySelector("[data-rw-partner-push-state]");
    const pushEnableButton=profileForm?.querySelector("[data-rw-partner-push-enable]");
    const pushTestButton=profileForm?.querySelector("[data-rw-partner-push-test]");
    const pushDisableButton=profileForm?.querySelector("[data-rw-partner-push-disable]");
    const applyPushState=info=>{
      if(!pushState)return;
      if(info?.active){
        pushState.textContent=t("pushReady");
        pushState.className="success";
        if(pushEnableButton)pushEnableButton.hidden=true;
        if(pushDisableButton){pushDisableButton.hidden=false;pushDisableButton.disabled=false}
        if(pushTestButton)pushTestButton.disabled=false;
      }else{
        pushState.textContent=info?.browser&&!info?.server?t("pushServerMissing"):t("pushNotReady");
        pushState.className=info?.browser&&!info?.server?"error":"";
        if(pushEnableButton)pushEnableButton.hidden=false;
        if(pushDisableButton)pushDisableButton.hidden=true;
        if(pushTestButton)pushTestButton.disabled=true;
      }
    };
    if(pushState&&window.panoraPartnerPush?.status){
      if(pushTestButton)pushTestButton.disabled=true;
      window.panoraPartnerPush.status().then(applyPushState).catch(()=>applyPushState({active:false}));
    }
    profileForm?.querySelector("[data-rw-partner-push-enable]")?.addEventListener("click",async(event)=>{
      event.preventDefault();
      event.stopPropagation();
      const button=event.currentTarget;
      const snapshot=snapshotPartnerNotificationPrefs(profileForm);
      partnerPushUiBusy=true;
      button.disabled=true;
      if(pushTestButton)pushTestButton.disabled=true;
      if(pushState){pushState.textContent=t("pushConnecting");pushState.className=""}
      try{
        if(!window.panoraPartnerPush?.enable)throw new Error(t("pushError"));
        await window.panoraPartnerPush.enable();
        restorePartnerNotificationPrefs(profileForm,snapshot);
        const info=await window.panoraPartnerPush.status?.();
        restorePartnerNotificationPrefs(profileForm,snapshot);
        applyPushState(info||{active:true});
      }catch(error){
        restorePartnerNotificationPrefs(profileForm,snapshot);
        if(pushState){pushState.textContent=`${t("pushError")}: ${error.message||error}`;pushState.className="error"}
      }finally{
        restorePartnerNotificationPrefs(profileForm,snapshot);
        partnerPushUiBusy=false;
        button.disabled=false;
      }
    });
    profileForm?.querySelector("[data-rw-partner-push-disable]")?.addEventListener("click",async(event)=>{
      event.preventDefault();
      event.stopPropagation();
      const button=event.currentTarget;
      const snapshot=snapshotPartnerNotificationPrefs(profileForm);
      partnerPushUiBusy=true;button.disabled=true;
      try{
        await window.panoraPartnerPush?.disable?.();
        restorePartnerNotificationPrefs(profileForm,snapshot);
        applyPushState({active:false,browser:true,server:false,reason:'disabled'});
      }catch(error){
        restorePartnerNotificationPrefs(profileForm,snapshot);
        if(pushState){pushState.textContent=`${t("pushError")}: ${error.message||error}`;pushState.className="error"}
      }finally{
        restorePartnerNotificationPrefs(profileForm,snapshot);
        partnerPushUiBusy=false;button.disabled=false;
      }
    });
    profileForm?.querySelector("[data-rw-partner-push-test]")?.addEventListener("click",async(event)=>{
      event.preventDefault();
      event.stopPropagation();
      const button=event.currentTarget;
      const snapshot=snapshotPartnerNotificationPrefs(profileForm);
      partnerPushUiBusy=true;
      button.disabled=true;
      if(pushState)pushState.textContent="";
      try{
        const status=await window.panoraPartnerPush?.status?.();
        if(!status?.active)throw new Error(t("pushNotReady"));
        if(!window.panoraPartnerPush?.test)throw new Error(t("pushError"));
        await window.panoraPartnerPush.test();
        restorePartnerNotificationPrefs(profileForm,snapshot);
        if(pushState){pushState.textContent=lang==="ru"?"Тест Push отправлен":lang==="es"?"Push de prueba enviado":"Test Push sent";pushState.className="success"}
      }catch(error){
        restorePartnerNotificationPrefs(profileForm,snapshot);
        if(pushState){pushState.textContent=`${t("pushError")}: ${error.message||error}`;pushState.className="error"}
      }finally{
        restorePartnerNotificationPrefs(profileForm,snapshot);
        partnerPushUiBusy=false;
        button.disabled=false;
      }
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
          orderFiltersOpen = false;
          renderAccountModal();
        }),
    );
    modal.querySelectorAll("[data-rw-note-view]").forEach(
      (button) =>
        (button.onclick = () => {
          noteView = button.dataset.rwNoteView;
          openFilterMenu = "";
          noteFiltersOpen = false;
          renderAccountModal();
        }),
    );
    modal.querySelector("[data-rw-order-filters-toggle]")?.addEventListener("click",()=>{
      orderFiltersOpen=!orderFiltersOpen;
      const filters=modal.querySelector(".rw-order-filters");
      const toggle=modal.querySelector("[data-rw-order-filters-toggle]");
      if(filters)filters.hidden=!orderFiltersOpen;
      if(toggle){
        toggle.setAttribute("aria-expanded",orderFiltersOpen?"true":"false");
        const icon=toggle.querySelector("i");if(icon)icon.textContent=orderFiltersOpen?"⌃":"⌄";
      }
    });

    modal.querySelector("[data-rw-note-filters-toggle]")?.addEventListener("click",()=>{
      noteFiltersOpen=!noteFiltersOpen;
      const filters=modal.querySelector(".rw-note-filters");
      const toggle=modal.querySelector("[data-rw-note-filters-toggle]");
      if(filters)filters.hidden=!noteFiltersOpen;
      if(toggle){
        toggle.setAttribute("aria-expanded",noteFiltersOpen?"true":"false");
        const icon=toggle.querySelector("i");if(icon)icon.textContent=noteFiltersOpen?"⌃":"⌄";
      }
    });

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
    modal.querySelectorAll("[data-rw-confirm-delivery]").forEach(button=>button.onclick=()=>{
      const note=ownNotes().find(item=>String(item.id)===String(button.dataset.rwConfirmDelivery)),order=ownOrders().find(item=>String(item.id)===String(button.dataset.rwConfirmOrder));if(!note||!order)return;
      const previous=Math.max(0,Number(note.trayBalanceAfter||0)-Number(note.traysDelivered||0)+Number(note.traysReturned||0)),maxReturned=previous+Number(note.traysDelivered||0),dialog=document.createElement("dialog");dialog.className="rw-remote-confirm-dialog";
      dialog.innerHTML=`<form method="dialog" class="rw-remote-confirm-card" data-rw-remote-form><button type="button" class="rw-remote-close">×</button><span class="kicker">Panora</span><h3>${lang==="ru"?"Подтвердить получение":lang==="es"?"Confirmar recepción":"Confirm receipt"}</h3><p>${lang==="ru"?`Подтверждаете, что заказ ${orderNumber(order)} и накладная ${noteNumber(note)} получены?`:`${orderNumber(order)} · ${noteNumber(note)}`}</p><label><span>${lang==="ru"?"Получатель — имя и фамилия":lang==="es"?"Receptor — nombre y apellido":"Recipient — first and last name"}</span><input name="receiver" required minlength="5" maxlength="120" autocomplete="name" placeholder="${lang==="ru"?"Например: Андрей Иванов":lang==="es"?"Ej.: Andrés García":"Example: Andrew Smith"}" value=""></label><div class="rw-remote-trays"><label><span>${lang==="ru"?"Принято лотков":lang==="es"?"Bandejas recibidas":"Trays received"}</span><input name="traysReceived" type="number" min="0" max="${Number(note.traysDelivered||0)}" value="${Number(note.traysDelivered||0)}" required></label><label><span>${lang==="ru"?"Возвращено пустых":lang==="es"?"Bandejas devueltas":"Empty trays returned"}</span><input name="traysReturned" type="number" min="0" max="${maxReturned}" value="${Math.min(Number(note.traysReturned||0),maxReturned)}" required></label></div><label class="rw-remote-check"><input name="accepted" type="checkbox" required><span>${lang==="ru"?"Количество товара и лотков проверено. Подтверждаю получение удалённо.":"I confirm receipt remotely."}</span></label><button type="submit" class="button button-primary">${lang==="ru"?"Да, заказ получен":"Confirm receipt"}</button></form>`;
      document.body.appendChild(dialog);dialog.showModal();const close=()=>dialog.remove();dialog.querySelector(".rw-remote-close").onclick=close;dialog.addEventListener("click",e=>{if(e.target===dialog)close()});
      dialog.querySelector("[data-rw-remote-form]").onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,d=new FormData(form),receiver=String(d.get("receiver")||"").trim(),received=Number(d.get("traysReceived")),returned=Number(d.get("traysReturned")),submit=form.querySelector('button[type="submit"]');
        const receiverParts=receiver.split(/\s+/).filter(Boolean);
        if(receiver.length<5||receiverParts.length<2){alert(lang==="ru"?"Укажите имя и фамилию получателя.":lang==="es"?"Indique el nombre y apellido del receptor.":"Enter the recipient's first and last name.");return;}
        submit.disabled=true;try{await window.panoraPartnerDelivery?.confirmRemote(note.id,receiver,received,returned);close();}catch(error){alert(`${lang==="ru"?"Не удалось подтвердить получение":"Could not confirm receipt"}: ${error.message||error}`);submit.disabled=false;}};
    });

    const orderSearchInput = modal.querySelector("[data-rw-order-search]");
    if (orderSearchInput) orderSearchInput.oninput = () => {
      orderSearch = orderSearchInput.value.trim();
      const q=orderSearch.toLowerCase();
      let visible=0;
      modal.querySelectorAll("[data-rw-order-search-text]").forEach(card=>{
        const show=!q||String(card.dataset.rwOrderSearchText||"").includes(q);
        card.hidden=!show;if(show)visible++;
      });
      const empty=modal.querySelector("[data-rw-order-empty]");
      if(empty)empty.hidden=visible>0;
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
      else if(key==="week"){const d=new Date(`${today}T12:00:00`);d.setDate(d.getDate()-6);from=localDateKey(d);to=today}
      else if(key==="month"){from=`${today.slice(0,7)}-01`;to=today}
      else if(key==="year"){from=`${today.slice(0,4)}-01-01`;to=today}
      setRange(scope,from,to);calendarMonth[scope]=monthKey(to||from||today);renderAccountModal();
    });
    modal.querySelectorAll("[data-rw-cal-clear]").forEach(button=>button.onclick=(event)=>{
      event.preventDefault();event.stopPropagation();
      setRange(button.dataset.rwCalScope,"","");renderAccountModal();
    });
    const search = modal.querySelector("[data-rw-note-search]");
    if (search) {
      search.dataset.rwStableInput="1";
      search.oninput = () => {
        noteQuery = search.value.trim();
        const q=noteQuery.toLowerCase();
        let visible=0;
        modal.querySelectorAll("[data-rw-note-search-text]").forEach(card=>{
          const show=!q||String(card.dataset.rwNoteSearchText||"").includes(q);
          card.hidden=!show;if(show)visible++;
        });
        const empty=modal.querySelector("[data-rw-note-empty]");
        if(empty)empty.hidden=visible>0;
      };
    }
    modal.querySelector("[data-rw-note-filter-apply]")?.addEventListener("click",()=>{noteFiltersOpen=false;openFilterMenu="";renderAccountModal();});
    modal.querySelector("[data-rw-note-filter-close]")?.addEventListener("click",()=>{noteFiltersOpen=false;openFilterMenu="";renderAccountModal();});
    modal.querySelector("[data-rw-note-filter-reset]")?.addEventListener("click",()=>{ noteQuery=""; noteDateFrom=""; noteDateTo=""; openFilterMenu=""; renderAccountModal(); });
    modal.querySelector("[data-rw-finance-summary-toggle]")?.addEventListener("click",()=>{
      financeSummaryOpen=!financeSummaryOpen;
      const stats=modal.querySelector(".rw-finance-stats");
      const toggle=modal.querySelector("[data-rw-finance-summary-toggle]");
      if(stats)stats.hidden=!financeSummaryOpen;
      if(toggle){toggle.setAttribute("aria-expanded",financeSummaryOpen?"true":"false");const icon=toggle.querySelector("i");if(icon)icon.textContent=financeSummaryOpen?"⌃":"⌄";}
    });
    modal.querySelector("[data-rw-finance-filters-toggle]")?.addEventListener("click",()=>{
      financeFiltersOpen=!financeFiltersOpen;
      const filters=modal.querySelector(".rw-debt-filters");
      const toggle=modal.querySelector("[data-rw-finance-filters-toggle]");
      if(filters)filters.hidden=!financeFiltersOpen;
      if(toggle){toggle.setAttribute("aria-expanded",financeFiltersOpen?"true":"false");const icon=toggle.querySelector("i");if(icon)icon.textContent=financeFiltersOpen?"⌃":"⌄";}
    });
    modal.querySelectorAll("[data-rw-finance-view]").forEach(button=>button.onclick=()=>{
      financeView=button.dataset.rwFinanceView;
      openFilterMenu="";
      financeFiltersOpen=false;
      debtSearchDraft=debtSearch;
      financeArchiveSearchDraft=financeArchiveSearch;
      renderAccountModal();
    });

    const financeArchiveSearchInput=modal.querySelector("[data-rw-finance-archive-search]");
    if(financeArchiveSearchInput){
      financeArchiveSearchInput.oninput=()=>{financeArchiveSearchDraft=financeArchiveSearchInput.value;};
      financeArchiveSearchInput.onkeydown=event=>{if(event.key==="Enter"){event.preventDefault();modal.querySelector("[data-rw-finance-archive-apply]")?.click();}};
    }
    modal.querySelector("[data-rw-finance-archive-apply]")?.addEventListener("click",()=>{
      financeArchiveSearch=financeArchiveSearchDraft.trim();
      financeFiltersOpen=false;openFilterMenu="";
      renderAccountModal();
    });
    modal.querySelector("[data-rw-finance-archive-reset]")?.addEventListener("click",()=>{
      financeArchiveSearch="";financeArchiveSearchDraft="";paymentDateFrom="";paymentDateTo="";openFilterMenu="";renderAccountModal();
    });

    modal.querySelector("[data-rw-history-toggle]")?.addEventListener("click",()=>{
      paymentHistoryOpen=!paymentHistoryOpen;
      const content=modal.querySelector(".rw-history-content"),toggle=modal.querySelector("[data-rw-history-toggle]");
      if(content)content.hidden=!paymentHistoryOpen;
      if(toggle){toggle.setAttribute("aria-expanded",paymentHistoryOpen?"true":"false");const icon=toggle.querySelector("i");if(icon)icon.textContent=paymentHistoryOpen?"⌃":"⌄";}
    });
    const debtSearchInput=modal.querySelector("[data-rw-debt-search]");
    if(debtSearchInput){
      debtSearchInput.oninput=()=>{debtSearchDraft=debtSearchInput.value;};
      debtSearchInput.onkeydown=event=>{if(event.key==="Enter"){event.preventDefault();modal.querySelector("[data-rw-debt-filter-apply]")?.click();}};
    }
    modal.querySelector("[data-rw-debt-filter-apply]")?.addEventListener("click",()=>{
      debtSearch=debtSearchDraft.trim();
      financeFiltersOpen=false;openFilterMenu="";
      renderAccountModal();
    });
    modal.querySelectorAll("[data-rw-finance-filter-close]").forEach(button=>button.addEventListener("click",()=>{financeFiltersOpen=false;openFilterMenu="";renderAccountModal();}));
    modal.querySelector("[data-rw-debt-filter-reset]")?.addEventListener("click",()=>{
      debtSearch="";debtSearchDraft="";paymentDateFrom="";paymentDateTo="";openFilterMenu="";renderAccountModal();
    });

    modal.querySelectorAll("[data-rw-dispute-payment]").forEach(button=>button.onclick=async()=>{
      const payment=ownPayments().find(item=>String(item.id)===String(button.dataset.rwDisputePayment));
      if(!payment)return;
      const reason=prompt(lang==="ru"?"Почему вы оспариваете эту оплату?":lang==="es"?"¿Por qué disputas este pago?":"Why are you disputing this payment?");
      if(reason===null)return;
      if(String(reason).trim().length<3)return alert(lang==="ru"?"Укажите причину спора.":lang==="es"?"Indica el motivo de la disputa.":"Enter a dispute reason.");
      button.disabled=true;
      try{
        await window.panoraPartnerPayments?.dispute(payment.id,reason);
      }catch(error){
        alert(`${lang==="ru"?"Не удалось открыть спор":lang==="es"?"No se pudo abrir la disputa":"Could not open dispute"}: ${error.message||error}`);
        button.disabled=false;
      }
    });

    const paymentSearchInput=modal.querySelector("[data-rw-payment-search]");
    if(paymentSearchInput)paymentSearchInput.oninput=()=>{
      paymentSearch=paymentSearchInput.value.trim();
      const q=paymentSearch.toLowerCase();
      let visible=0;
      modal.querySelectorAll("[data-rw-payment-search-text]").forEach(row=>{
        const show=!q||String(row.dataset.rwPaymentSearchText||"").includes(q);
        row.hidden=!show;if(show)visible++;
      });
      const empty=modal.querySelector("[data-rw-payment-empty]");
      if(empty)empty.hidden=visible>0;
    };
    modal
      .querySelectorAll("[data-portal-close]")
      .forEach((button) => (button.onclick = closePanels));
    modal
      .querySelector("[data-rw-logout]")
      ?.addEventListener("click", logoutAccount);
    const refreshNewOrderSummary=()=>{
      const products=newOrderProducts();
      const count=cartCount();
      const total=products.reduce((sum,product)=>{const qty=Number(cart?.[product.id]||0);return sum+qty*newOrderTierPrice(product,qty)},0);
      const countNode=modal.querySelector("[data-rw-new-count]");
      const totalNode=modal.querySelector("[data-rw-new-total]");
      const nextButton=modal.querySelector("[data-rw-new-open-cart]");
      if(countNode)countNode.textContent=`${count} ${t("pieces")}`;
      if(totalNode)totalNode.textContent=portalMoney(total);
      if(nextButton){
        const dateSelect=modal.querySelector("[data-rw-new-date]");
        const dateReady=Boolean(dateSelect&&!dateSelect.disabled&&dateSelect.value);
        nextButton.toggleAttribute("disabled",!count||!dateReady);
        nextButton.classList.toggle("is-disabled",!count||!dateReady);
      }
    };
    const refreshNewOrderDateOptions=()=>{
      const select=modal.querySelector("[data-rw-new-date]");
      if(!select)return false;
      const options=newOrderDeliveryOptions();
      const previous=String(select.value||localStorage.getItem("panora-bake-date")||"");
      if(!options.length){
        select.innerHTML=`<option value="">${lang==="ru"?"Нет общего открытого дня выпечки":lang==="es"?"No hay un día de horneado abierto común":"No common open bake day"}</option>`;
        select.value="";select.disabled=true;
        selectedBakeDate="";
        try{localStorage.removeItem("panora-bake-date")}catch{}
        try{syncCartDeliveryDate?.()}catch{}
        return false;
      }
      select.disabled=false;
      select.innerHTML=options.map(option=>`<option value="${esc(option.value)}">${esc(option.label)}</option>`).join("");
      const nextValue=options.some(option=>option.value===previous)?previous:options[0].value;
      select.value=nextValue;
      selectedBakeDate=nextValue;
      try{localStorage.setItem("panora-bake-date",nextValue)}catch{}
      try{syncCartDeliveryDate?.()}catch{}
      return true;
    };
    modal.querySelectorAll("[data-rw-new-qty-select]").forEach(select=>{
      select.onchange=()=>{
        const id=String(select.dataset.rwNewQtySelect||"");
        const next=Math.max(0,Math.min(NEW_ORDER_QTY_CAP,Number(select.value||0)));
        if(!id)return;
        select.value=String(next);
        if(next>0)cart[id]=next; else delete cart[id];
        localStorage.setItem("panora-cart",JSON.stringify(cart));
        const product=newOrderProducts().find(item=>String(item.id)===id);
        const card=select.closest("[data-rw-new-product]");
        if(product&&card){
          const warningText=newOrderTierWarning(product,next);
          const warning=card.querySelector(".rw-new-limit-warning");
          const price=card.querySelector("[data-rw-new-unit-price]");
          const kind=card.querySelector("[data-rw-new-price-kind]");
          if(warning){warning.textContent=warningText;warning.hidden=!warningText}
          if(price)price.textContent=portalMoney(next===0?product.wholesalePrice:newOrderTierPrice(product,next));
          if(kind)kind.textContent=(next===0||next>=product.wholesaleMinQty)?(lang==="ru"?"Ваша оптовая цена":lang==="es"?"Tu precio mayorista":"Your wholesale price"):(lang==="ru"?"Розничная цена":lang==="es"?"Precio minorista":"Retail price");
        }
        // Keep the native select mounted. Rebuilding the whole modal here caused
        // focus loss and visible jumps on desktop/mobile.
        // Do not rebuild public product cards here: recreating <img> caused
        // visible mobile flicker. Only cart totals and this card are updated.
        try{renderCart()}catch{}
        refreshNewOrderDateOptions();
        refreshNewOrderSummary();
      };
    });
    const newDate=modal.querySelector("[data-rw-new-date]");
    if(newDate){
      refreshNewOrderDateOptions();
      refreshNewOrderSummary();
      newDate.onchange=()=>{
        const valid=newOrderDeliveryOptions().some(option=>option.value===newDate.value);
        if(!valid){refreshNewOrderDateOptions();refreshNewOrderSummary();return}
        localStorage.setItem("panora-bake-date",newDate.value);
        try{selectedBakeDate=newDate.value;syncCartDeliveryDate?.()}catch{}
        const confirmBox=document.querySelector("#confirmDeliveryDate");
        if(confirmBox){confirmBox.checked=true;try{enforceDateConfirmation?.()}catch{}}
        refreshNewOrderSummary();
      };
    }
    modal.querySelectorAll("[data-rw-new-open-cart]").forEach(button=>{
      button.onclick=()=>{
        if(!cartCount())return;
        const dateSelect=modal.querySelector("[data-rw-new-date]");
        const date=dateSelect?.value;
        const validDate=Boolean(date&&!dateSelect?.disabled&&newOrderDeliveryOptions().some(option=>option.value===date));
        if(!validDate){
          refreshNewOrderDateOptions();refreshNewOrderSummary();
          showToast?.(lang==="ru"?"Выберите доступный день выпечки для всех товаров заказа.":lang==="es"?"Elige un día de horneado disponible para todos los productos.":"Choose an available bake day for all products in the order.");
          return;
        }
        if(date){
          localStorage.setItem("panora-bake-date",date);
          try{selectedBakeDate=date;syncCartDeliveryDate?.()}catch{}
          const confirmBox=document.querySelector("#confirmDeliveryDate");
          if(confirmBox){confirmBox.checked=true;try{enforceDateConfirmation?.()}catch{}}
        }
        const mobile=window.matchMedia?.("(max-width:720px)")?.matches;
        closePanels();
        try{
          renderProducts();renderCart();
          if(mobile){
            // Panora 6.68: the first mobile screen already contains the cart
            // composition and the validated bake day. Go straight to the final
            // details form instead of asking the partner to confirm a third time.
            window.setTimeout(()=>document.querySelector("#checkoutButton")?.click(),0);
          }else{
            openPanel(document.querySelector("#cartDrawer"));
          }
        }catch{}
      };
    });

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
    modal.querySelectorAll("[data-rw-open-note]").forEach((button) => button.onclick = (event) => {
      event.stopPropagation();
      activeTab = "notes"; noteToReveal = button.dataset.rwOpenNote || "";
      renderAccountModal();
    });
    modal.querySelectorAll("[data-rw-open-order]").forEach((button) => button.onclick = (event) => {
      event.stopPropagation();
      activeTab = "orders"; orderToReveal = button.dataset.rwOpenOrder || "";
      renderAccountModal();
    });
    modal.querySelectorAll("[data-rw-open-debt-note]").forEach((card) => {
      const open = () => { activeTab = "notes"; noteToReveal = card.dataset.rwOpenDebtNote || ""; renderAccountModal(); };
      card.onclick = open;
      card.onkeydown = (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } };
    });
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
    const activeControl = document.activeElement;
    if (
      modal?.classList.contains("restaurant-workspace") &&
      activeControl &&
      modal.contains(activeControl) &&
      ["INPUT","TEXTAREA","SELECT"].includes(activeControl.tagName)
    ) {
      // Keep the live native control mounted while the user is typing or while
      // a select/date picker is open. Background sync will repaint after blur.
      return;
    }
    if (!account) {
      modal?.classList.remove("restaurant-workspace");
      previousRender();
      return;
    }
    updateMobileOrdersBadge();
    const counts = {
      orders: ownOrders().length,
      notes: ownNotes().length,
      payments: currentDebtItems().length,
    };
    modal.classList.add("restaurant-workspace");
    const currentSectionLabel = ({home:t("home"),new:t("newOrder"),orders:t("orders"),notes:t("notes"),payments:t("payments"),profile:t("profile")})[activeTab] || t("home");
    document.body.classList.toggle("panora-partner-authenticated",Boolean(account));
    modal.innerHTML = `<div class="modal-head rw-head"><div><span class="kicker">Panora</span><h2>${t("title")}</h2><div class="rw-partner-context"><span class="rw-partner-name">${partnerTypeLabel()} · ${esc(account.name)}</span><span class="rw-section-name">${esc(currentSectionLabel)}</span></div></div><button class="close-button" data-portal-close aria-label="${t("close")}">×</button></div>
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
                return `<button class="${activeTab === key ? "active " : ""}rw-nav-${key}" data-rw-tab="${key}"><i>${icon}</i><span>${label}</span></button>`;
              },
            )
            .join("")}
          <button type="button" class="rw-nav-logout" data-rw-logout><i aria-hidden="true">↪</i><span>${t("signOut")}</span></button>
        </nav>
        <main class="rw-content">${contentHtml()}</main>
      </div>`;
    bind(modal);
    setTimeout(()=>window.panoraOrderMessages?.refreshUnread?.(),0);
    const workspaceClose=modal.querySelector("[data-portal-close]");
    if(workspaceClose)workspaceClose.onclick=(event)=>{event.preventDefault();event.stopPropagation();closePanels();};
    if (activeTab === "notes" && noteToReveal) {
      const targetId = noteToReveal;
      noteToReveal = "";
      requestAnimationFrame(() => {
        const card = [...modal.querySelectorAll("[data-rw-note-id]")].find((item) => item.dataset.rwNoteId === targetId);
        card?.scrollIntoView({ behavior: "smooth", block: "center" });
        card?.classList.add("rw-order-focus");
        window.setTimeout(() => card?.classList.remove("rw-order-focus"), 1800);
      });
    }
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
  window.panoraOpenPartnerOrder = (orderId) => {
    if (!account) {
      openPanel(document.querySelector("#profileModal"));
      return;
    }
    activeTab = "orders";
    orderView = "active";
    orderToReveal = String(orderId || "");
    renderAccountModal();
    openPanel(document.querySelector("#profileModal"));
  };
  window.panoraOpenPartnerCabinet = () => {
    const modal=document.querySelector("#profileModal");
    if(!modal)return;
    if(!account){
      renderAccountModal();
      requestAnimationFrame(()=>openPanel(modal));
      return;
    }
    activeTab = "home";
    renderAccountModal();
    requestAnimationFrame(()=>openPanel(modal));
  };
  window.panoraOpenPartnerProfile = () => {
    const modal=document.querySelector("#profileModal");
    if(!modal)return;
    if (!account) {
      renderAccountModal();
      requestAnimationFrame(()=>openPanel(modal));
      return;
    }
    activeTab = "profile";
    renderAccountModal();
    requestAnimationFrame(()=>openPanel(modal));
  };
  const mobileProfileButton = document.querySelector("#mobileProfile");
  if (mobileProfileButton) mobileProfileButton.onclick = () => window.panoraOpenPartnerProfile();
  const desktopCabinetButton = document.querySelector("#profileButton");
  if(desktopCabinetButton){
    desktopCabinetButton.disabled=false;
    desktopCabinetButton.removeAttribute("aria-disabled");
    desktopCabinetButton.onclick=(event)=>{
      event.preventDefault();
      event.stopPropagation();
      window.panoraOpenPartnerCabinet();
    };
  }

  const workspaceInputFocused=()=>{
    const active=document.activeElement;
    return Boolean(
      active &&
      active.closest?.("#profileModal.restaurant-workspace") &&
      ["INPUT","TEXTAREA","SELECT"].includes(active.tagName)
    );
  };
  let lastBackgroundRender=0;
  const backgroundWorkspaceRender=()=>{
    if(!account||openFilterMenu||workspaceInputFocused()||partnerPushUiBusy)return;
    if(activeTab==="new"||activeTab==="profile")return;
    const now=Date.now(); if(now-lastBackgroundRender<1200)return; lastBackgroundRender=now;
    renderAccountModal();
  };
  // Panora 6.63: connection/polling status is not a reason to rebuild the
  // cabinet. Actual order changes are rendered by portal-cloud.js and actual
  // catalogue/price changes are handled by dynamic-products.js.
  window.addEventListener("online", backgroundWorkspaceRender);
  window.addEventListener("offline", backgroundWorkspaceRender);
  window.addEventListener("panora:partner-push-state",event=>{
    const modal=document.querySelector("#profileModal.restaurant-workspace");
    const state=modal?.querySelector("[data-rw-partner-push-state]");
    const test=modal?.querySelector("[data-rw-partner-push-test]");
    if(state){
      const active=Boolean(event.detail?.active);
      state.textContent=active?t("pushReady"):(event.detail?.reason?`${t("pushError")}: ${event.detail.reason}`:t("pushNotReady"));
      state.className=active?"success":"error";
      if(test)test.disabled=!active;
      return;
    }
    backgroundWorkspaceRender();
  });
})();
