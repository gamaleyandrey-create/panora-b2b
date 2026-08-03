(() => {
  "use strict";
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const lang = () => document.querySelector("#adminLanguage")?.value || localStorage.getItem("panora-language") || "ru";
  const copy = {
    ru:{title:"Библиотека документов",hint:"Выберите документ. Обычная накладная Panora остаётся без налоговых формулировок.",panora:"Накладная Panora",panoraHint:"Оперативный документ поставки",albaran:"Albarán (España)",albaranHint:"Испанская форма товарной накладной",factura:"Factura (España)",facturaHint:"Счёт-фактура с реквизитами и IVA",seller:"Поставщик",buyer:"Получатель",legal:"Юридическое название",tax:"NIF / CIF / VAT",address:"Юридический адрес",number:"Номер Factura",vat:"Ставка IVA",included:"Цены уже включают IVA",open:"Создать Factura",required:"Заполните юридические названия, NIF/CIF и адреса обеих сторон.",close:"Закрыть"},
    en:{title:"Document library",hint:"Choose a document. The standard Panora delivery note remains tax-neutral.",panora:"Panora delivery note",panoraHint:"Operational delivery document",albaran:"Albarán (Spain)",albaranHint:"Spanish goods delivery note",factura:"Factura (Spain)",facturaHint:"Invoice with legal details and IVA",seller:"Supplier",buyer:"Recipient",legal:"Legal name",tax:"NIF / CIF / VAT",address:"Registered address",number:"Invoice number",vat:"IVA rate",included:"Prices include IVA",open:"Create Factura",required:"Enter legal names, NIF/CIF and addresses for both parties.",close:"Close"},
    es:{title:"Biblioteca de documentos",hint:"Elige un documento. El albarán Panora habitual no incluye menciones fiscales.",panora:"Albarán Panora",panoraHint:"Documento operativo de entrega",albaran:"Albarán (España)",albaranHint:"Documento español de entrega",factura:"Factura (España)",facturaHint:"Factura con datos fiscales e IVA",seller:"Proveedor",buyer:"Destinatario",legal:"Razón social",tax:"NIF / CIF / VAT",address:"Domicilio fiscal",number:"Número de factura",vat:"Tipo de IVA",included:"Los precios incluyen IVA",open:"Crear Factura",required:"Completa razón social, NIF/CIF y domicilio fiscal de ambas partes.",close:"Cerrar"}
  };
  const t = k => (copy[lang()] || copy.ru)[k];
  const findNote = value => {
    if (value && typeof value === "object") return value;
    const notes = (typeof portalNotes === "function" && portalNotes()) || (typeof deliveryNotes !== "undefined" && deliveryNotes) || [];
    return notes.find(n => n.id === value || n.orderId === value);
  };
  const findRestaurant = id => {
    if (typeof restaurant === "function") return restaurant(id) || {};
    const rows = (typeof portalRestaurants === "function" && portalRestaurants()) || (typeof restaurants !== "undefined" && restaurants) || [];
    return rows.find(r => r.id === id) || {};
  };
  const bakery = () => ({...(typeof invoiceDefaults !== "undefined" ? invoiceDefaults : {}), ...(typeof bakerySettings !== "undefined" ? bakerySettings : {})});
  const key = note => `panora-document-meta-${note.id || note.orderId}`;
  const read = note => { try { return JSON.parse(localStorage.getItem(key(note)) || "{}"); } catch { return {}; } };
  const ordinary = (note, options) => {
    document.querySelector("#panoraDocumentLibrary")?.close();
    if (options.context === "restaurant" && typeof window.portalPrintNote === "function") window.portalPrintNote(note);
    else if (typeof window.printNote === "function") window.printNote(note.orderId);
  };
  window.openPanoraDocumentLibrary = (value, options = {}) => {
    const note = findNote(value);
    if (!note) return alert(t("panora") + ": —");
    if (options.context === "restaurant" && (typeof account === "undefined" || !account || note.restaurantId !== account.id)) return alert("Доступ запрещён.");
    document.querySelector("#panoraDocumentLibrary")?.remove();
    const client = findRestaurant(note.restaurantId), shop = bakery(), saved = read(note);
    const defaults = {
      sellerLegalName:saved.sellerLegalName || shop.legalName || "Panora",
      sellerTaxId:saved.sellerTaxId || shop.taxId || "",
      sellerAddress:saved.sellerAddress || shop.billingAddress || shop.address || "",
      buyerLegalName:saved.buyerLegalName || client.legalName || client.name || "",
      buyerTaxId:saved.buyerTaxId || client.taxId || client.vatId || "",
      buyerAddress:saved.buyerAddress || client.billingAddress || client.address || "",
      issueDate:saved.issueDate || new Date().toISOString().slice(0,10),
      operationDate:saved.operationDate || note.date || new Date().toISOString().slice(0,10),
      dueDate:saved.dueDate || note.paymentDueDate || "",
      facturaSeries:saved.facturaSeries || "F",
      albaranSeries:saved.albaranSeries || "ALB",
      ivaRate:saved.ivaRate ?? 10,
      pricesIncludeTax:saved.pricesIncludeTax !== false
    };
    const dialog = document.createElement("dialog"); dialog.id="panoraDocumentLibrary"; dialog.className="document-library-dialog";
    dialog.innerHTML=`<div class="document-library-shell"><button class="document-library-x" aria-label="${esc(t("close"))}">×</button><span class="document-library-kicker">PANORA</span><h2>${esc(t("title"))}</h2><p>${esc(t("hint"))}</p><div class="document-library-grid"><button data-doc="panora"><strong>${esc(t("panora"))}</strong><small>${esc(t("panoraHint"))}</small></button><button data-doc="albaran"><strong>${esc(t("albaran"))}</strong><small>${esc(t("albaranHint"))}</small></button><button data-doc="factura"><strong>${esc(t("factura"))}</strong><small>${esc(t("facturaHint"))}</small></button></div><form class="document-factura-form" hidden><div class="document-party"><h3>${esc(t("seller"))}</h3><label>${esc(t("legal"))}<input name="sellerLegalName" value="${esc(defaults.sellerLegalName)}" required></label><label>${esc(t("tax"))}<input name="sellerTaxId" value="${esc(defaults.sellerTaxId)}" required></label><label>${esc(t("address"))}<input name="sellerAddress" value="${esc(defaults.sellerAddress)}" required></label></div><div class="document-party"><h3>${esc(t("buyer"))}</h3><label>${esc(t("legal"))}<input name="buyerLegalName" value="${esc(defaults.buyerLegalName)}" required></label><label>${esc(t("tax"))}<input name="buyerTaxId" value="${esc(defaults.buyerTaxId)}" required></label><label>${esc(t("address"))}<input name="buyerAddress" value="${esc(defaults.buyerAddress)}" required></label></div><label>Серия Factura<input name="facturaSeries" value="${esc(defaults.facturaSeries)}" maxlength="12" required></label><label>Дата выпуска<input type="date" name="issueDate" value="${esc(defaults.issueDate)}" required></label><label>Дата операции / поставки<input type="date" name="operationDate" value="${esc(defaults.operationDate)}" required></label><label>Срок оплаты<input type="date" name="dueDate" value="${esc(defaults.dueDate)}"></label><label>${esc(t("vat"))}<select name="ivaRate">${[0,4,10,21].map(v=>`<option value="${v}"${Number(defaults.ivaRate)===v?" selected":""}>${v}%</option>`).join("")}</select></label><label class="document-check"><input type="checkbox" name="pricesIncludeTax"${defaults.pricesIncludeTax?" checked":""}> ${esc(t("included"))}</label><p class="document-form-error" role="alert"></p><button class="document-create" type="submit">Выпустить и открыть Factura</button></form></div>`;
    document.body.appendChild(dialog);
    const close=()=>dialog.close(); dialog.querySelector(".document-library-x").onclick=close;
    dialog.querySelector('[data-doc="panora"]').onclick=()=>ordinary(note,options);
    dialog.querySelector('[data-doc="albaran"]').onclick=async()=>{ const error=dialog.querySelector(".document-form-error"); try{const data=await window.panoraIssueSpanishDocument(note,"albaran",defaults);close();setTimeout(()=>window.openAccountingInvoice?.(note,{...options,variant:"albaran",documentData:data}),0);}catch(err){dialog.querySelector("form").hidden=false;error.textContent=err.message;} };
    dialog.querySelector('[data-doc="factura"]').onclick=()=>{dialog.querySelector(".document-factura-form").hidden=false;};
    dialog.querySelector("form").onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,error=form.querySelector(".document-form-error"),button=form.querySelector(".document-create");const data=Object.fromEntries(new FormData(form));data.pricesIncludeTax=form.pricesIncludeTax.checked;data.ivaRate=Number(data.ivaRate);const required=["sellerLegalName","sellerTaxId","sellerAddress","buyerLegalName","buyerTaxId","buyerAddress","facturaSeries","issueDate","operationDate"];if(required.some(k=>!String(data[k]||"").trim())){error.textContent=t("required");return;}button.disabled=true;error.textContent="";try{const issued=await window.panoraIssueSpanishDocument(note,"factura",data);localStorage.setItem(key(note),JSON.stringify(data));close();setTimeout(()=>window.openAccountingInvoice?.(note,{...options,variant:"factura",documentData:issued}),0);}catch(err){error.textContent=err.message||"Не удалось выпустить документ.";}finally{button.disabled=false;}};
    dialog.onclick=e=>{if(e.target===dialog)close();}; dialog.addEventListener("close",()=>dialog.remove(),{once:true}); dialog.showModal();
  };
})();
