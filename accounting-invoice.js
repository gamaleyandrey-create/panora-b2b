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
    new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "EUR",
    }).format(Number(value || 0));
  const currentLanguage = () =>
    document.querySelector("#adminLanguage")?.value ||
    (typeof lang !== "undefined" ? lang : "") ||
    localStorage.getItem("panora-language") ||
    "ru";
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
      restaurantCopy: "Restaurant copy",
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
      access: "This delivery note does not belong to this restaurant.",
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
      restaurantCopy: "Copia del restaurante",
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
      access: "Este albarán no pertenece a este restaurante.",
      missing: "No se encontró el albarán.",
      choose: "Seleccionar copia",
      albaran: "Albarán",
      factura: "Factura",
      taxableBase: "Base imponible",
      vat: "IVA",
    },
  };
  const text = (key) => (words[currentLanguage()] || words.ru)[key];
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
  const productName = (id) => {
    if (typeof portalProduct === "function") return portalProduct(id);
    const registry =
      (typeof productRegistry !== "undefined" && productRegistry) ||
      (typeof PRODUCTS !== "undefined" && PRODUCTS) ||
      [];
    const product = registry.find((item) => item.id === id);
    const language = currentLanguage();
    return (
      product?.names?.[language] ||
      product?.names?.ru ||
      product?.text?.[language]?.[0] ||
      product?.text?.ru?.[0] ||
      (id === "plain"
        ? "Льняной бездрожжевой хлеб с семенами"
        : id === "pumpkin"
          ? "Тыквенный бездрожжевой хлеб с семенами"
          : id)
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
              item.status !== "cancelled",
          )
          .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    );
  };
  const safeCell = (value) =>
    `"${String(value ?? "").replaceAll('"', '""').replace(/[\r\n]+/g, " ")}"`;

  function downloadCsv(note, order, client, bakery, number) {
    const rows = [
      [text("title"), number],
      [text("issueDate"), note.date || ""],
      [text("deliveryDate"), order.deliveryDate || order.date || note.date || ""],
      [],
      [text("seller"), bakery.legalName || "Panora"],
      [text("taxId"), bakery.taxId || ""],
      [text("address"), bakery.billingAddress || bakery.address || ""],
      [text("contacts"), [bakery.email, bakery.phone].filter(Boolean).join(" ")],
      [],
      [text("buyer"), client.legalName || client.name || ""],
      [text("taxId"), client.taxId || client.vatId || ""],
      [text("address"), client.billingAddress || client.address || ""],
      [text("contacts"), [client.email, client.phone].filter(Boolean).join(" ")],
      [],
      [text("product"), text("quantity"), text("price"), text("amount")],
      ...note.items.map((item) => [
        productName(item.product),
        item.quantity,
        Number(note.prices?.[item.product] || 0).toFixed(2),
        (Number(item.quantity) * Number(note.prices?.[item.product] || 0)).toFixed(2),
      ]),
      [],
      [text("total"), Number(note.total || 0).toFixed(2)],
      [text("paid"), paidAmount(note).toFixed(2)],
      [text("due"), Math.max(0, Number(note.total || 0) - paidAmount(note)).toFixed(2)],
      [text("dueDate"), note.paymentDueDate || ""],
      [text("method"), note.paymentMethod || ""],
    ];
    const csv = "\uFEFF" + rows.map((row) => row.map(safeCell).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${number}-accounting.csv`;
    link.click();
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

  function downloadUbl(note, order, client, bakery, number) {
    const items = Array.isArray(note.items) ? note.items : [];
    const total = Number(note.total || 0);
    const lines = items
      .map((item, index) => {
        const quantity = Number(item.quantity || 0);
        const price = Number(item.unitPrice ?? item.price ?? 0);
        const lineTotal = Number(item.total ?? quantity * price);
        return `<cac:InvoiceLine>
  <cbc:ID>${index + 1}</cbc:ID>
  <cbc:InvoicedQuantity unitCode="C62">${quantity}</cbc:InvoicedQuantity>
  <cbc:LineExtensionAmount currencyID="EUR">${lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
  <cac:Item><cbc:Name>${xml(item.name || item.productName || item.productId || "")}</cbc:Name></cac:Item>
  <cac:Price><cbc:PriceAmount currencyID="EUR">${price.toFixed(2)}</cbc:PriceAmount></cac:Price>
</cac:InvoiceLine>`;
      })
      .join("\n");
    const party = (data) => `<cac:Party>
  <cac:PartyName><cbc:Name>${xml(data?.name || "")}</cbc:Name></cac:PartyName>
  ${data?.taxId ? `<cac:PartyTaxScheme><cbc:CompanyID>${xml(data.taxId)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : ""}
  ${data?.address ? `<cac:PostalAddress><cbc:StreetName>${xml(data.address)}</cbc:StreetName><cbc:CountrySubentity>${xml(data.city || "")}</cbc:CountrySubentity><cac:Country><cbc:IdentificationCode>${xml(data.countryCode || "ES")}</cbc:IdentificationCode></cac:Country></cac:PostalAddress>` : ""}
</cac:Party>`;
    const document = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
 xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
 xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
<cbc:UBLVersionID>2.1</cbc:UBLVersionID>
<cbc:CustomizationID>Panora-Accounting-Export-1</cbc:CustomizationID>
<cbc:ID>${xml(number)}</cbc:ID>
<cbc:IssueDate>${xml(isoDate(note.date || new Date().toISOString()))}</cbc:IssueDate>
${note.paymentDueDate ? `<cbc:DueDate>${xml(isoDate(note.paymentDueDate))}</cbc:DueDate>` : ""}
<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
<cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
<cac:AccountingSupplierParty>${party(bakery)}</cac:AccountingSupplierParty>
<cac:AccountingCustomerParty>${party(client)}</cac:AccountingCustomerParty>
<cac:LegalMonetaryTotal>
  <cbc:TaxExclusiveAmount currencyID="EUR">${total.toFixed(2)}</cbc:TaxExclusiveAmount>
  <cbc:TaxInclusiveAmount currencyID="EUR">${total.toFixed(2)}</cbc:TaxInclusiveAmount>
  <cbc:PayableAmount currencyID="EUR">${total.toFixed(2)}</cbc:PayableAmount>
</cac:LegalMonetaryTotal>
${lines}
</Invoice>`;
    const blob = new Blob([document], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${number}-ubl.xml`;
    link.click();
    URL.revokeObjectURL(url);
  }

  window.openAccountingInvoice = (value, options = {}) => {
    const note = findNote(value);
    if (!note) {
      alert(text("missing"));
      return;
    }
    if (
      options.context === "restaurant" &&
      (typeof account === "undefined" || !account || note.restaurantId !== account.id)
    ) {
      alert(text("access"));
      return;
    }
    const order = findOrder(note.orderId);
    const meta = options.documentData || {};
    const variant = options.variant === "albaran" ? "albaran" : "factura";
    const baseClient = findRestaurant(note.restaurantId);
    const baseBakery = bakeryData(note);
    const client = {...baseClient, legalName: meta.buyerLegalName || baseClient.legalName, taxId: meta.buyerTaxId || baseClient.taxId || baseClient.vatId, billingAddress: meta.buyerAddress || baseClient.billingAddress || baseClient.address};
    const bakery = {...baseBakery, legalName: meta.sellerLegalName || baseBakery.legalName, taxId: meta.sellerTaxId || baseBakery.taxId, billingAddress: meta.sellerAddress || baseBakery.billingAddress || baseBakery.address};
    const prefix = variant === "albaran" ? "ALB-" : "F-";
    const number = meta.documentNumber || `${prefix}${new Date().getFullYear()}-${String(note.number).padStart(4, "0")}`;
    const rate = variant === "factura" ? Number(meta.ivaRate || 0) : 0;
    const gross = Number(note.total || 0);
    const pricesIncludeTax = meta.pricesIncludeTax !== false;
    const taxableBase = variant === "factura" && pricesIncludeTax ? gross / (1 + rate / 100) : gross;
    const vatAmount = variant === "factura" ? taxableBase * rate / 100 : 0;
    const documentTotal = variant === "factura" && !pricesIncludeTax ? taxableBase + vatAmount : gross;
    const paid = paidAmount(note);
    const due = Math.max(0, documentTotal - paid);
    document.querySelector("#accountingInvoiceDialog")?.remove();
    const dialog = document.createElement("dialog");
    dialog.id = "accountingInvoiceDialog";
    dialog.className = "accounting-dialog";
    const side = options.side || (options.context === "restaurant" ? "restaurant" : "bakery");
    dialog.innerHTML = `<div class="accounting-toolbar">
      <span><strong>${esc(text(variant))}</strong><small>${esc(side === "restaurant" ? text("restaurantCopy") : text("bakeryCopy"))}</small></span>
      ${options.context !== "restaurant" ? `<label>${esc(text("choose"))}<select class="accounting-side"><option value="bakery"${side === "bakery" ? " selected" : ""}>${esc(text("bakeryCopy"))}</option><option value="restaurant"${side === "restaurant" ? " selected" : ""}>${esc(text("restaurantCopy"))}</option></select></label>` : ""}
      <button type="button" class="accounting-x" aria-label="${esc(text("close"))}">×</button>
    </div>
    <article class="accounting-sheet">
      <header><div><span class="accounting-kicker">PANORA</span><h1>${esc(text(variant))}</h1><p class="accounting-copy-label">${esc(side === "restaurant" ? text("restaurantCopy") : text("bakeryCopy"))}</p></div><dl><div><dt>${esc(text("number"))}</dt><dd>${esc(number)}</dd></div><div><dt>${esc(text("issueDate"))}</dt><dd>${esc(note.date || "—")}</dd></div><div><dt>${esc(text("deliveryDate"))}</dt><dd>${esc(order.deliveryDate || order.date || note.date || "—")}</dd></div></dl></header>
      <section class="accounting-parties">
        <div><h2>${esc(text("seller"))}</h2><strong>${esc(bakery.legalName || "Panora")}</strong><p>${esc(text("taxId"))}: ${esc(bakery.taxId || "—")}<br>${esc(text("address"))}: ${esc(bakery.billingAddress || bakery.address || "—")}<br>${esc(text("contacts"))}: ${esc([bakery.email, bakery.phone].filter(Boolean).join(" ") || "—")}</p></div>
        <div><h2>${esc(text("buyer"))}</h2><strong>${esc(client.legalName || client.name || "—")}</strong><p>${esc(text("taxId"))}: ${esc(client.taxId || client.vatId || "—")}<br>${esc(text("address"))}: ${esc(client.billingAddress || client.address || "—")}<br>${esc(text("contacts"))}: ${esc([client.email, client.phone].filter(Boolean).join(" ") || "—")}</p></div>
      </section>
      <div class="accounting-lines"><div class="accounting-line accounting-head"><span>${esc(text("product"))}</span><span>${esc(text("quantity"))}</span><span>${esc(text("price"))}</span><span>${esc(text("amount"))}</span></div>${note.items.map((item) => {
        const price = Number(note.prices?.[item.product] || 0);
        return `<div class="accounting-line"><strong>${esc(productName(item.product))}</strong><span>${esc(item.quantity)}</span><span>${esc(money(price))}</span><strong>${esc(money(Number(item.quantity) * price))}</strong></div>`;
      }).join("")}</div>
      <section class="accounting-summary"><dl>${variant === "factura" ? `<div><dt>${esc(text("taxableBase"))}</dt><dd>${esc(money(taxableBase))}</dd></div><div><dt>${esc(text("vat"))} ${esc(rate)}%</dt><dd>${esc(money(vatAmount))}</dd></div>` : ""}<div><dt>${esc(text("total"))}</dt><dd>${esc(money(documentTotal))}</dd></div><div><dt>${esc(text("paid"))}</dt><dd>${esc(money(paid))}</dd></div><div class="accounting-due"><dt>${esc(text("due"))}</dt><dd>${esc(money(due))}</dd></div>${note.paymentDueDate ? `<div><dt>${esc(text("dueDate"))}</dt><dd>${esc(note.paymentDueDate)}</dd></div>` : ""}${note.paymentMethod ? `<div><dt>${esc(text("method"))}</dt><dd>${esc(note.paymentMethod)}</dd></div>` : ""}</dl></section>
      <footer><span>${esc(text("bakerySignature"))} __________________</span><span>${esc(text("restaurantSignature"))} __________________</span></footer>
    </article>
<div class="accounting-actions"><button type="button" class="secondary accounting-close">${esc(text("close"))}</button><button type="button" class="secondary accounting-csv">${esc(text("csv"))}</button>${variant === "factura" ? `<button type="button" class="secondary accounting-edi">${esc(text("edi"))}</button>` : ""}<button type="button" class="primary accounting-print">${esc(text("print"))}</button></div>`;
    document.body.appendChild(dialog);
    const close = () => dialog.close();
    dialog.querySelector(".accounting-x").onclick = close;
    dialog.querySelector(".accounting-close").onclick = close;
    dialog.querySelector(".accounting-print").onclick = () => window.print();
    dialog.querySelector(".accounting-csv").onclick = () =>
      downloadCsv(note, order, client, bakery, number);
    dialog.querySelector(".accounting-edi")?.addEventListener("click", () =>
      downloadUbl(note, order, client, bakery, number));
    dialog.querySelector(".accounting-side")?.addEventListener("change", (event) => {
      const label = dialog.querySelector(".accounting-copy-label");
      label.textContent =
        event.target.value === "restaurant"
          ? text("restaurantCopy")
          : text("bakeryCopy");
    });
    dialog.onclick = (event) => {
      if (event.target === dialog) close();
    };
    dialog.addEventListener("close", () => dialog.remove(), { once: true });
    dialog.showModal();
  };
})();
