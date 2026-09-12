/* Optional accounting copy of a Panora delivery note. */
(() => {
  "use strict";

  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);
  const money = (value) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(Number(value || 0));
  // Accounting document content is always Spanish. The surrounding controls
  // follow the current bakery/partner UI language.
  const normalizeLanguage = (value) =>
    ["ru", "en", "es"].includes(String(value || "").slice(0, 2).toLowerCase())
      ? String(value || "").slice(0, 2).toLowerCase()
      : "";
  const resolveUiLanguage = (options = {}) => {
    if (options.context === "restaurant") {
      const accountLanguage = typeof account !== "undefined" && account ? account.language : "";
      const portalLanguage = typeof lang !== "undefined" ? lang : "";
      return (
        normalizeLanguage(accountLanguage) ||
        normalizeLanguage(portalLanguage) ||
        normalizeLanguage(document.documentElement.lang) ||
        "en"
      );
    }
    return (
      normalizeLanguage(document.querySelector("#adminLanguage")?.value) ||
      normalizeLanguage(localStorage.getItem("panora-admin-lang")) ||
      normalizeLanguage(document.documentElement.lang) ||
      "en"
    );
  };
  let uiLanguage = "en";
  const words = {
    ru: {
      title: "Счёт-фактура",
      bakeryCopy: "Экземпляр пекарни",
      restaurantCopy: "Экземпляр партнёра",
      seller: "Поставщик",
      buyer: "Получатель",
      number: "Номер документа",
      issueDate: "Дата документа",
      deliveryDate: "Дата поставки",
      product: "Товар",
      quantity: "Количество",
      price: "Цена",
      amount: "Сумма",
      total: "Итого",
      paid: "Оплачено при отгрузке",
      due: "К оплате",
      dueDate: "Плановая дата оплаты",
      method: "Способ оплаты",
      taxId: "Регистрационный / налоговый номер",
      address: "Адрес",
      contacts: "Контакты",
      bakerySignature: "Поставщик",
      restaurantSignature: "Получатель",
      close: "Закрыть",
      print: "Печать / PDF",
      csv: "Скачать CSV",
      edi: "EDI / UBL XML",
      access: "Эта накладная недоступна данному партнёру.",
      missing: "Накладная не найдена.",
      choose: "Выберите экземпляр",
      albaran: "Albarán",
      factura: "Factura",
      taxableBase: "Налоговая база",
      vat: "IVA",
    },
    en: {
      title: "Invoice",
      bakeryCopy: "Bakery copy",
      restaurantCopy: "Partner copy",
      seller: "Supplier",
      buyer: "Recipient",
      number: "Document number",
      issueDate: "Document date",
      deliveryDate: "Delivery date",
      product: "Product",
      quantity: "Quantity",
      price: "Unit price",
      amount: "Amount",
      total: "Total",
      paid: "Paid on delivery",
      due: "Balance due",
      dueDate: "Payment due date",
      method: "Payment method",
      taxId: "Registration / tax number",
      address: "Address",
      contacts: "Contacts",
      bakerySignature: "Supplier",
      restaurantSignature: "Recipient",
      close: "Close",
      print: "Print / PDF",
      csv: "Download CSV",
      edi: "EDI / UBL XML",
      access: "This delivery note does not belong to this partner.",
      missing: "Delivery note not found.",
      choose: "Select copy",
      albaran: "Delivery note (Albarán)",
      factura: "Invoice (Factura)",
      taxableBase: "Taxable base",
      vat: "IVA",
    },
    es: {
      title: "Factura",
      bakeryCopy: "Copia de la panadería",
      restaurantCopy: "Copia del socio",
      seller: "Proveedor",
      buyer: "Destinatario",
      number: "Número de documento",
      issueDate: "Fecha del documento",
      deliveryDate: "Fecha de entrega",
      product: "Producto",
      quantity: "Cantidad",
      price: "Precio",
      amount: "Importe",
      total: "Total",
      paid: "Pagado en la entrega",
      due: "Pendiente",
      dueDate: "Fecha prevista de pago",
      method: "Forma de pago",
      taxId: "Número fiscal / registro",
      address: "Dirección",
      contacts: "Contacto",
      bakerySignature: "Proveedor",
      restaurantSignature: "Destinatario",
      close: "Cerrar",
      print: "Imprimir / PDF",
      csv: "Descargar CSV",
      edi: "EDI / UBL XML",
      access: "Este albarán no pertenece a este socio.",
      missing: "No se encontró el albarán.",
      choose: "Seleccionar copia",
      albaran: "Albarán",
      factura: "Factura",
      taxableBase: "Base imponible",
      vat: "IVA",
    },
  };
  const docText = (key) => words.es[key] || key;
  const documentPaymentMethod = (value) => {
    const raw = String(value || "").trim();
    const key = raw.toLowerCase();
    const map = {
      "наличные": "Efectivo",
      "cash": "Efectivo",
      "efectivo": "Efectivo",
      "банковский перевод": "Transferencia bancaria",
      "bank transfer": "Transferencia bancaria",
      "transferencia bancaria": "Transferencia bancaria",
      "карта": "Tarjeta",
      "card": "Tarjeta",
      "tarjeta": "Tarjeta",
    };
    return map[key] || raw;
  };
  const uiText = (key) => (words[uiLanguage] || words.en)[key] || words.es[key] || key;
  const list = (name, fallback) =>
    typeof window[name] === "function"
      ? window[name]()
      : typeof window[name] !== "undefined"
        ? window[name]
        : fallback;
  const findNote = (value) => {
    if (value && typeof value === "object") return value;
    const notes =
      (typeof portalNotes === "function" && portalNotes()) ||
      (typeof deliveryNotes !== "undefined" && deliveryNotes) ||
      [];
    return notes.find((note) => note.id === value || note.orderId === value);
  };
  const findOrder = (id) => {
    const rows =
      (typeof portalOrders === "function" && portalOrders()) ||
      (typeof orders !== "undefined" && orders) ||
      [];
    return rows.find((order) => order.id === id) || {};
  };
  const findRestaurant = (id) => {
    if (typeof restaurant === "function") return restaurant(id) || {};
    const rows =
      (typeof portalRestaurants === "function" && portalRestaurants()) ||
      (typeof restaurants !== "undefined" && restaurants) ||
      [];
    return rows.find((item) => item.id === id) || {};
  };
  const productRecord = (id) => {
    const registries = [
      typeof productRegistry !== "undefined" ? productRegistry : [],
      typeof PRODUCTS !== "undefined" ? PRODUCTS : [],
    ];
    return registries.flat().find((item) => item?.id === id) || {};
  };
  const productName = (id) => {
    const product = productRecord(id);
    return (
      product?.names?.es ||
      product?.name_es ||
      product?.text?.es?.[0] ||
      (id === "plain"
        ? "Pan de lino sin levadura con semillas"
        : id === "pumpkin"
          ? "Pan de calabaza"
          : `Producto ${id || ""}`.trim())
    );
  };
  const bakeryData = (note) => ({
    ...(typeof invoiceDefaults !== "undefined" ? invoiceDefaults : {}),
    ...(typeof bakerySettings !== "undefined" ? bakerySettings : {}),
    ...(note.bakery || {}),
  });
  const paidAmount = (note) => {
    const rows =
      (typeof portalPayments === "function" && portalPayments()) ||
      (typeof payments !== "undefined" && payments) ||
      [];
    return Number(
      note.paidAtShipment ??
        rows
          .filter(
            (item) =>
              item.deliveryNoteId === note.id &&
              item.confirmed !== false &&
              item.status !== "cancelled" &&
              item.disputeStatus !== "open" &&
              !/\[panora:b2b-return-credit:[^\]]+\]/.test(String(item.note || "")) &&
              String(item.date || item.receivedAt || "").slice(0, 10) === String(note.date || "").slice(0, 10),
          )
          .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    );
  };
  const safeCell = (value) =>
    `"${String(value ?? "").replaceAll('"', '""').replace(/[\r\n]+/g, " ")}"`;

  const accountingLines = (note, meta = {}) => {
    if (Array.isArray(meta.lines) && meta.lines.length) return meta.lines.map((line) => ({
      product_id: line.product_id || "", name: line.name || productName(line.product_id), quantity: Number(line.quantity || 0),
      unit_price_net: Number(line.unit_price_net || 0), tax_rate: Number(line.tax_rate || 0), tax_base: Number(line.tax_base ?? Number(line.quantity || 0) * Number(line.unit_price_net || 0)), tax_amount: Number(line.tax_amount || 0), line_total: Number(line.line_total ?? line.tax_base ?? 0)
    }));
    const rate=Number(meta.ivaRate||0),includeTax=meta.pricesIncludeTax!==false,variant=meta.variant||"factura";
    const round=v=>Math.round((Number(v)+Number.EPSILON)*100)/100;
    const rows=(note.items||[]).map(item=>{const source=Number(note.prices?.[item.product]||0),net=variant!=="albaran"&&includeTax?round(source/(1+rate/100)):round(source),base=round(Number(item.quantity||0)*net),tax=variant==="albaran"?0:round(base*rate/100);return{product_id:item.product,name:productName(item.product),quantity:Number(item.quantity||0),unit_price_net:net,tax_rate:variant==="albaran"?0:rate,tax_base:base,tax_amount:tax,line_total:round(base+tax)}});
    const delivery=Number(note.deliveryCharge||0);if(delivery>0){const net=variant!=="albaran"&&includeTax?round(delivery/(1+rate/100)):round(delivery),base=net,tax=variant==="albaran"?0:round(base*rate/100);rows.push({product_id:"__delivery__",name:"Entrega",quantity:1,unit_price_net:net,tax_rate:variant==="albaran"?0:rate,tax_base:base,tax_amount:tax,line_total:round(base+tax)})}return rows;
  };

  function downloadCsv(note, order, client, bakery, number, meta = {}) {
    const lines=accountingLines(note,meta);
    const taxableBase=Number(meta.taxableBase ?? lines.reduce((s,x)=>s+Number(x.tax_base||0),0));
    const taxTotal=Number(meta.taxTotal ?? lines.reduce((s,x)=>s+Number(x.tax_amount||0),0));
    const total=Number(meta.documentTotal ?? lines.reduce((s,x)=>s+Number(x.line_total ?? x.tax_base ?? 0),0));
    const paid=paidAmount(note),due=Math.max(0,total-paid);
    const rows = [
      [meta.variant === "albaran" ? docText("albaran") : docText("factura"), number],
      [docText("issueDate"), meta.issueDate || note.date || ""],
      ["Fecha de operación", meta.operationDate || order.deliveryDate || order.date || note.date || ""],
      [],
      [docText("seller"), bakery.legalName || bakery.name || "Panora"],
      [docText("taxId"), bakery.taxId || ""],
      [docText("address"), bakery.billingAddress || bakery.address || ""],
      [docText("contacts"), [bakery.email, bakery.phone].filter(Boolean).join(" ")],
      [],
      [docText("buyer"), client.legalName || client.name || ""],
      [docText("taxId"), client.taxId || client.vatId || ""],
      [docText("address"), client.billingAddress || client.address || ""],
      [docText("contacts"), [client.email, client.phone].filter(Boolean).join(" ")],
      [],
      [docText("product"), docText("quantity"), docText("price"), docText("amount")],
      ...lines.map(line=>[line.name||productName(line.product_id),Number(line.quantity||0),Number(line.unit_price_net||0).toFixed(2),Number(line.tax_base||0).toFixed(2)]),
      [],
      [docText("taxableBase"), taxableBase.toFixed(2)],
      [docText("vat"), taxTotal.toFixed(2)],
      [docText("total"), total.toFixed(2)],
      [docText("paid"), paid.toFixed(2)],
      [docText("due"), due.toFixed(2)],
      [docText("dueDate"), meta.dueDate || note.paymentDueDate || ""],
      [docText("method"), documentPaymentMethod(meta.paymentMethod || note.paymentMethod)],
    ];
    const csv = "\uFEFF" + rows.map((row) => row.map(safeCell).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `${number}-accounting.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const xml = (value) =>
    String(value ?? "").replace(
      /[<>&'"]/g,
      (char) =>
        ({
          "<": "&lt;",
          ">": "&gt;",
          "&": "&amp;",
          "'": "&apos;",
          '"': "&quot;",
        })[char],
    );

  const isoDate = (value) => String(value || "").slice(0, 10);

  function downloadUbl(note, order, client, bakery, number, meta = {}) {
    const items = accountingLines(note, meta);
    const taxableBase = Number(meta.taxableBase ?? items.reduce((s,x)=>s+Number(x.tax_base||0),0)), taxTotal = Number(meta.taxTotal ?? items.reduce((s,x)=>s+Number(x.tax_amount||0),0)), total = Number(meta.documentTotal ?? items.reduce((s,x)=>s+Number(x.line_total ?? x.tax_base ?? 0),0));
    const lines = items
      .map((item, index) => {
        const quantity = Number(item.quantity || 0);
        const price = Number(item.unit_price_net || 0);
        const lineTotal = Number(item.tax_base || quantity * price);
        return `<cac:InvoiceLine>
  <cbc:ID>${index + 1}</cbc:ID>
  <cbc:InvoicedQuantity unitCode="C62">${quantity}</cbc:InvoicedQuantity>
  <cbc:LineExtensionAmount currencyID="EUR">${lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
  <cac:Item><cbc:Name>${xml(item.name || item.product_id || "")}</cbc:Name><cac:ClassifiedTaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>${Number(item.tax_rate||0).toFixed(2)}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item>
  <cac:Price><cbc:PriceAmount currencyID="EUR">${price.toFixed(2)}</cbc:PriceAmount></cac:Price>
</cac:InvoiceLine>`;
      })
      .join("\n");
    const party = (data) => {const name=data?.legalName||data?.name||"",address=data?.billingAddress||data?.address||"",taxId=data?.taxId||data?.vatId||"",countryCode=data?.countryCode||data?.country_code||"ES";return `<cac:Party>
  <cac:PartyName><cbc:Name>${xml(name)}</cbc:Name></cac:PartyName>
  ${taxId ? `<cac:PartyTaxScheme><cbc:CompanyID>${xml(taxId)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : ""}
  ${address ? `<cac:PostalAddress><cbc:StreetName>${xml(address)}</cbc:StreetName><cac:Country><cbc:IdentificationCode>${xml(countryCode)}</cbc:IdentificationCode></cac:Country></cac:PostalAddress>` : ""}
  ${(data?.email||data?.phone)?`<cac:Contact>${data?.phone?`<cbc:Telephone>${xml(data.phone)}</cbc:Telephone>`:""}${data?.email?`<cbc:ElectronicMail>${xml(data.email)}</cbc:ElectronicMail>`:""}</cac:Contact>`:""}
</cac:Party>`};
    const xmlDocument = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
 xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
 xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
<cbc:UBLVersionID>2.1</cbc:UBLVersionID>
<cbc:CustomizationID>urn:cen.eu:en16931:2017</cbc:CustomizationID>
<cbc:ID>${xml(number)}</cbc:ID>
<cbc:IssueDate>${xml(isoDate(meta.issueDate || new Date().toISOString()))}</cbc:IssueDate>
${meta.dueDate ? `<cbc:DueDate>${xml(isoDate(meta.dueDate))}</cbc:DueDate>` : ""}
<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
<cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
<cac:AccountingSupplierParty>${party(bakery)}</cac:AccountingSupplierParty>
<cac:AccountingCustomerParty>${party(client)}</cac:AccountingCustomerParty>
<cac:TaxTotal><cbc:TaxAmount currencyID="EUR">${taxTotal.toFixed(2)}</cbc:TaxAmount>${(meta.taxBreakdown||[]).map(t=>`<cac:TaxSubtotal><cbc:TaxableAmount currencyID="EUR">${Number(t.base||0).toFixed(2)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="EUR">${Number(t.amount||0).toFixed(2)}</cbc:TaxAmount><cac:TaxCategory><cbc:ID>${xml(t.category||'S')}</cbc:ID><cbc:Percent>${Number(t.rate||0).toFixed(2)}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>`).join('')}</cac:TaxTotal>
<cac:LegalMonetaryTotal>
  <cbc:LineExtensionAmount currencyID="EUR">${taxableBase.toFixed(2)}</cbc:LineExtensionAmount>
  <cbc:TaxExclusiveAmount currencyID="EUR">${taxableBase.toFixed(2)}</cbc:TaxExclusiveAmount>
  <cbc:TaxInclusiveAmount currencyID="EUR">${total.toFixed(2)}</cbc:TaxInclusiveAmount>
  <cbc:PayableAmount currencyID="EUR">${total.toFixed(2)}</cbc:PayableAmount>
</cac:LegalMonetaryTotal>
${lines}
</Invoice>`;
    const blob = new Blob([xmlDocument], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${number}-ubl.xml`;
    link.click();
    URL.revokeObjectURL(url);
  }

  window.openAccountingInvoice = (value, options = {}) => {
    uiLanguage = resolveUiLanguage(options);
    const note = findNote(value);
    if (!note) {
      alert(uiText("missing"));
      return;
    }
    if (
      options.context === "restaurant" &&
      (typeof account === "undefined" || !account || note.restaurantId !== account.id)
    ) {
      alert(uiText("access"));
      return;
    }
    const order = findOrder(note.orderId);
    const meta = options.documentData || {};
    const variant = options.variant === "albaran" ? "albaran" : "factura";
    const spanishDocumentTitles={albaran:"Albarán",factura:"Factura",simplificada:"Factura simplificada",rectificativa:"Factura rectificativa",devolucion:"Devolución",abono:"Abono"};
    const displayTitle = spanishDocumentTitles[meta.variant] || docText(variant);
    const baseClient = findRestaurant(note.restaurantId);
    const baseBakery = bakeryData(note);
    const client = {...baseClient, legalName: meta.buyerSnapshot?.name || meta.buyerLegalName || baseClient.legalName, taxId: meta.buyerSnapshot?.tax_id || meta.buyerTaxId || baseClient.taxId || baseClient.vatId, billingAddress: meta.buyerSnapshot?.address || meta.buyerAddress || baseClient.billingAddress || baseClient.address, email: meta.buyerSnapshot?.email ?? meta.buyerEmail ?? baseClient.email, phone: meta.buyerSnapshot?.phone ?? meta.buyerPhone ?? baseClient.phone, countryCode: meta.buyerSnapshot?.country_code || 'ES'};
    const bakery = {...baseBakery, legalName: meta.sellerSnapshot?.name || meta.sellerLegalName || baseBakery.legalName, taxId: meta.sellerSnapshot?.tax_id || meta.sellerTaxId || baseBakery.taxId, billingAddress: meta.sellerSnapshot?.address || meta.sellerAddress || baseBakery.billingAddress || baseBakery.address, email: meta.sellerSnapshot?.email ?? meta.sellerEmail ?? baseBakery.email, phone: meta.sellerSnapshot?.phone ?? meta.sellerPhone ?? baseBakery.phone, countryCode: meta.sellerSnapshot?.country_code || 'ES'};
    const prefix = variant === "albaran" ? "ALB-" : "F-";
    const number = meta.documentNumber || `${prefix}${new Date().getFullYear()}-${String(note.number).padStart(4, "0")}`;
    const rate = variant === "factura" ? Number(meta.ivaRate || 0) : 0;
    const gross = Number(note.total || 0);
    const pricesIncludeTax = meta.pricesIncludeTax !== false;
    const taxableBase = meta.taxableBase ?? (variant === "factura" && pricesIncludeTax ? gross / (1 + rate / 100) : gross);
    const vatAmount = meta.taxTotal ?? (variant === "factura" ? taxableBase * rate / 100 : 0);
    const documentTotal = meta.documentTotal ?? (variant === "factura" && !pricesIncludeTax ? taxableBase + vatAmount : gross);
    const paid = paidAmount(note);
    const due = Math.max(0, documentTotal - paid);
    document.querySelector("#accountingInvoiceDialog")?.remove();
    const dialog = document.createElement("dialog");
    dialog.id = "accountingInvoiceDialog";
    dialog.className = "accounting-dialog";
    const side = options.side || (options.context === "restaurant" ? "restaurant" : "bakery");
    dialog.innerHTML = `<div class="accounting-toolbar">
      <span><strong data-panora-fixed-language="es">${esc(displayTitle)}</strong><small>${esc(side === "restaurant" ? uiText("restaurantCopy") : uiText("bakeryCopy"))}</small></span>
      ${options.context !== "restaurant" ? `<label>${esc(uiText("choose"))}<select class="accounting-side"><option value="bakery"${side === "bakery" ? " selected" : ""}>${esc(uiText("bakeryCopy"))}</option><option value="restaurant"${side === "restaurant" ? " selected" : ""}>${esc(uiText("restaurantCopy"))}</option></select></label>` : ""}
      <button type="button" class="accounting-x" aria-label="${esc(uiText("close"))}">×</button>
    </div>
    <article class="accounting-sheet" lang="es" data-panora-fixed-language="es">
      <header><div><span class="accounting-kicker">PANORA</span><h1>${esc(displayTitle)}</h1><p class="accounting-copy-label">${esc(side === "restaurant" ? docText("restaurantCopy") : docText("bakeryCopy"))}</p></div><dl><div><dt>${esc(docText("number"))}</dt><dd>${esc(number)}</dd></div><div><dt>${esc(docText("issueDate"))}</dt><dd>${esc(meta.issueDate || note.date || "—")}</dd></div><div><dt>Fecha de operación</dt><dd>${esc(meta.operationDate || order.deliveryDate || order.date || note.date || "—")}</dd></div></dl></header>
      <section class="accounting-parties">
        <div><h2>${esc(docText("seller"))}</h2><strong>${esc(bakery.legalName || "Panora")}</strong><p>${esc(docText("taxId"))}: ${esc(bakery.taxId || "—")}<br>${esc(docText("address"))}: ${esc(bakery.billingAddress || bakery.address || "—")}<br>${esc(docText("contacts"))}: ${esc([bakery.email, bakery.phone].filter(Boolean).join(" ") || "—")}</p></div>
        <div><h2>${esc(docText("buyer"))}</h2><strong>${esc(client.legalName || client.name || "—")}</strong><p>${esc(docText("taxId"))}: ${esc(client.taxId || client.vatId || "—")}<br>${esc(docText("address"))}: ${esc(client.billingAddress || client.address || "—")}<br>${esc(docText("contacts"))}: ${esc([client.email, client.phone].filter(Boolean).join(" ") || "—")}</p></div>
      </section>
      <div class="accounting-lines"><div class="accounting-line accounting-head"><span>${esc(docText("product"))}</span><span>${esc(docText("quantity"))}</span><span>${esc(docText("price"))}</span><span>${esc(docText("amount"))}</span></div>${accountingLines(note,meta).map((line) => `<div class="accounting-line"><strong>${esc(line.name||productName(line.product_id))}</strong><span>${esc(line.quantity)}</span><span>${esc(money(line.unit_price_net))}</span><strong>${esc(money(line.tax_base))}</strong></div>`).join("")}</div>
      ${meta.aeatType?`<section class="accounting-tax-meta"><p><span>Tipo AEAT</span><strong>${esc(meta.aeatType)}</strong></p>${meta.rectifiesNumber?`<p><span>Rectifica</span><strong>${esc(meta.rectifiesNumber)}</strong></p>`:''}${meta.rectificationMode?`<p><span>Modalidad</span><strong>${esc(meta.rectificationMode)}</strong></p>`:''}</section>`:''}<section class="accounting-summary"><dl>${variant === "factura" ? `<div><dt>${esc(docText("taxableBase"))}</dt><dd>${esc(money(taxableBase))}</dd></div><div><dt>${esc(docText("vat"))} ${esc(rate)}%</dt><dd>${esc(money(vatAmount))}</dd></div>` : ""}<div><dt>${esc(docText("total"))}</dt><dd>${esc(money(documentTotal))}</dd></div><div><dt>${esc(docText("paid"))}</dt><dd>${esc(money(paid))}</dd></div><div class="accounting-due"><dt>${esc(docText("due"))}</dt><dd>${esc(money(due))}</dd></div>${note.paymentDueDate ? `<div><dt>${esc(docText("dueDate"))}</dt><dd>${esc(note.paymentDueDate)}</dd></div>` : ""}${note.paymentMethod ? `<div><dt>${esc(docText("method"))}</dt><dd>${esc(documentPaymentMethod(note.paymentMethod))}</dd></div>` : ""}</dl></section>
      <footer><span>${esc(docText("bakerySignature"))} __________________</span><span>${esc(docText("restaurantSignature"))} __________________</span></footer>
    </article>
<div class="accounting-actions"><button type="button" class="secondary accounting-close">${esc(uiText("close"))}</button><button type="button" class="secondary accounting-csv">${esc(uiText("csv"))}</button>${variant === "factura" && (!meta.variant || meta.variant === "factura") ? `<button type="button" class="secondary accounting-edi">${esc(uiText("edi"))}</button>` : ""}<button type="button" class="primary accounting-print">${esc(uiText("print"))}</button></div>`;
    document.body.appendChild(dialog);
    const close = () => dialog.close();
    dialog.querySelector(".accounting-x").onclick = close;
    dialog.querySelector(".accounting-close").onclick = close;
    dialog.querySelector(".accounting-print").onclick = () => window.print();
    dialog.querySelector(".accounting-csv").onclick = () =>
      downloadCsv(note, order, client, bakery, number, meta);
    dialog.querySelector(".accounting-edi")?.addEventListener("click", () =>
      downloadUbl(note, order, client, bakery, number, meta));
    dialog.querySelector(".accounting-side")?.addEventListener("change", (event) => {
      const label = dialog.querySelector(".accounting-copy-label");
      label.textContent =
        event.target.value === "restaurant"
          ? docText("restaurantCopy")
          : docText("bakeryCopy");
    });
    dialog.onclick = (event) => {
      if (event.target === dialog) close();
    };
    dialog.addEventListener("close", () => { uiLanguage="en"; dialog.remove(); }, { once: true });
    dialog.showModal();
  };
})();
