(() => {
  "use strict";
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const normalizeLanguage=value=>['ru','en','es'].includes(String(value||'').slice(0,2).toLowerCase())?String(value||'').slice(0,2).toLowerCase():'';
  const resolveUiLanguage=options=>{
    if(options?.context==='restaurant'){
      const accountLanguage=typeof account!=='undefined'&&account?account.language:'';
      const portalLanguage=typeof lang!=='undefined'?lang:'';
      return normalizeLanguage(accountLanguage)||normalizeLanguage(portalLanguage)||normalizeLanguage(document.documentElement.lang)||'en';
    }
    return normalizeLanguage(document.querySelector('#adminLanguage')?.value)||normalizeLanguage(localStorage.getItem('panora-admin-lang'))||normalizeLanguage(document.documentElement.lang)||'en';
  };
  let activeUiLanguage='en';
  const copy={
    ru:{missing:'Накладная не найдена.',title:'Документы по накладной',hint:'Основная накладная остаётся неизменной. Дополнительные формы выпускаются как связанные документы.',base:'Открыть обычную накладную',albaran:'Накладная (Albarán)',factura:'Счёт-фактура (Factura)',simple:'Упрощённая фактура',rect:'Корректировочная фактура',return:'Возврат',credit:'Кредит-нота',tax:'Испанская налоговая форма',ops:'Логистический документ',warning:'Panora формирует и хранит документ, но эта форма сама по себе не отправляет данные в AEAT / VERI*FACTU.',readonly:'Налоговые и корректировочные документы выпускает пекарня. Партнёр может открыть структуру формы и исходную накладную.',seller:'Поставщик',buyer:'Получатель',legal:'Юридическое название',nif:'NIF / CIF / VAT',address:'Юридический адрес',series:'Серия',issue:'Дата выпуска',operation:'Дата операции',due:'Срок оплаты',vat:'IVA',included:'Цены включают IVA',reference:'Исправляемая Factura',reason:'Основание rectificación',mode:'Метод rectificación',notes:'Причина / примечание',create:'Выпустить документ',close:'Закрыть',required:'Заполните обязательные реквизиты.',sql:'Для этого вида документа сначала примените SQL Panora 9.60 в Supabase.'},
    es:{missing:'No se encontró el albarán.',title:'Documentos vinculados',hint:'El albarán original permanece inalterado. Los demás documentos se emiten vinculados al original.',base:'Abrir albarán',albaran:'Albarán',factura:'Factura completa',simple:'Factura simplificada',rect:'Factura rectificativa',return:'Devolución',credit:'Abono',tax:'Documento fiscal español',ops:'Documento logístico',warning:'Panora prepara y conserva el documento; esta pantalla no realiza por sí sola el envío a AEAT / VERI*FACTU.',readonly:'Los documentos fiscales y rectificativos los emite la panadería. El socio puede consultar la estructura y abrir el albarán original.',seller:'Proveedor',buyer:'Destinatario',legal:'Razón social',nif:'NIF / CIF / VAT',address:'Domicilio fiscal',series:'Serie',issue:'Fecha de expedición',operation:'Fecha de operación',due:'Vencimiento',vat:'IVA',included:'Precios con IVA incluido',reference:'Factura rectificada',reason:'Motivo de rectificación',mode:'Tipo de rectificación',notes:'Motivo / notas',create:'Emitir documento',close:'Cerrar',required:'Completa los datos obligatorios.',sql:'Aplica primero el SQL Panora 9.60 en Supabase.'},
    en:{missing:'Delivery note not found.',title:'Linked documents',hint:'The original delivery note remains unchanged. Additional forms are issued as linked documents.',base:'Open standard delivery note',albaran:'Delivery note (Albarán)',factura:'Invoice (Factura)',simple:'Simplified invoice',rect:'Corrective invoice',return:'Return',credit:'Credit note',tax:'Spanish tax document',ops:'Logistics document',warning:'Panora prepares and stores the document; this screen does not itself submit records to AEAT / VERI*FACTU.',readonly:'Tax and corrective documents are issued by the bakery. The partner can review the form structure and open the original delivery note.',seller:'Supplier',buyer:'Recipient',legal:'Legal name',nif:'NIF / CIF / VAT',address:'Registered address',series:'Series',issue:'Issue date',operation:'Operation date',due:'Due date',vat:'IVA',included:'Prices include IVA',reference:'Corrected invoice',reason:'Correction reason',mode:'Correction method',notes:'Reason / notes',create:'Issue document',close:'Close',required:'Complete the required details.',sql:'Apply the Panora 9.60 SQL in Supabase first.'}
  };
  const t=k=>(copy[activeUiLanguage]||copy.en)[k]||copy.es[k]||k;
  const notes=()=>typeof portalNotes==='function'?portalNotes():(typeof deliveryNotes!=='undefined'?deliveryNotes:[]);
  const findNote=v=>v&&typeof v==='object'?v:notes().find(n=>n.id===v||n.orderId===v);
  const findRestaurant=id=>typeof restaurant==='function'?(restaurant(id)||{}):((typeof restaurants!=='undefined'?restaurants:[]).find(r=>r.id===id)||{});
  const bakery=()=>({...(typeof invoiceDefaults!=='undefined'?invoiceDefaults:{}),...(typeof bakerySettings!=='undefined'?bakerySettings:{})});
  const metaKey=n=>`panora-document-meta-${n.id||n.orderId}`;
  const sellerProfileKey='panora-accounting-seller-profile';
  const buyerProfileKey=id=>`panora-accounting-buyer-profile-${String(id||'unknown')}`;
  const readJson=key=>{try{return JSON.parse(localStorage.getItem(key)||'{}')}catch{return {}}};
  const read=n=>readJson(metaKey(n));
  const clean=v=>String(v??'').trim();
  const saveJson=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
  const persistOrganizationProfiles=(note,data)=>{
    const seller={legalName:clean(data.sellerLegalName),taxId:clean(data.sellerTaxId).toUpperCase(),billingAddress:clean(data.sellerAddress)};
    const buyer={legalName:clean(data.buyerLegalName),taxId:clean(data.buyerTaxId).toUpperCase(),billingAddress:clean(data.buyerAddress)};
    if(seller.legalName||seller.taxId||seller.billingAddress){
      saveJson(sellerProfileKey,seller);
      if(typeof bakerySettings!=='undefined'){
        bakerySettings={...bakerySettings,...(seller.legalName?{legalName:seller.legalName}:{}),...(seller.taxId?{taxId:seller.taxId}:{}),...(seller.billingAddress?{address:seller.billingAddress,billingAddress:seller.billingAddress}:{})};
        if(typeof cSave==='function')cSave('panora-bakery-settings',bakerySettings);
        else saveJson('panora-bakery-settings',bakerySettings);
      }
    }
    if((buyer.legalName||buyer.taxId||buyer.billingAddress)&&note?.restaurantId){
      saveJson(buyerProfileKey(note.restaurantId),buyer);
      if(typeof restaurants!=='undefined'&&Array.isArray(restaurants)){
        let changed=false;
        restaurants=restaurants.map(item=>{
          if(String(item?.id)!==String(note.restaurantId))return item;
          const next={...item,...(buyer.legalName?{legalName:buyer.legalName}:{}),...(buyer.taxId?{taxId:buyer.taxId}:{}),...(buyer.billingAddress?{billingAddress:buyer.billingAddress}:{})};
          changed=JSON.stringify(next)!==JSON.stringify(item)||changed;
          return next;
        });
        if(changed){
          if(typeof cSave==='function')cSave('panora-restaurants',restaurants);
          else saveJson('panora-restaurants',restaurants);
        }
      }
    }
  };
  const ordinary=(note,options)=>{document.querySelector('#panoraDocumentLibrary')?.close();if(options.context==='restaurant'&&typeof portalPrintNote==='function')portalPrintNote(note);else if(typeof printNote==='function')printNote(note.orderId)};
  const typeInfo={
    albaran:{label:'albaran',aeat:'',kind:'albaran',series:'ALB',tax:false,negative:false},
    factura:{label:'factura',aeat:'F1',kind:'factura',series:'F',tax:true,negative:false},
    simplificada:{label:'simple',aeat:'F2',kind:'factura_simplificada',series:'FS',tax:true,negative:false},
    rectificativa:{label:'rect',aeat:'R4',kind:'factura_rectificativa',series:'R',tax:true,negative:false,rect:true},
    devolucion:{label:'return',aeat:'R4',kind:'devolucion',series:'DEV',tax:true,negative:true,rect:true},
    abono:{label:'credit',aeat:'R4',kind:'abono',series:'AB',tax:true,negative:true,rect:true}
  };
  const card=(type,sub)=>`<button type="button" data-doc="${type}"><span class="document-card-top"><strong>${esc(t(typeInfo[type]?.label||type))}</strong>${typeInfo[type]?.aeat?`<b>${esc(typeInfo[type].aeat)}</b>`:''}</span><small>${esc(sub)}</small></button>`;
  window.openPanoraDocumentLibrary=(value,options={})=>{
    activeUiLanguage=resolveUiLanguage(options);
    const note=findNote(value);if(!note)return alert(t('missing'));
    const readOnly=options.context==='restaurant';
    document.querySelector('#panoraDocumentLibrary')?.remove();
    const client=findRestaurant(note.restaurantId),shop=bakery(),saved=read(note),sellerMaster=readJson(sellerProfileKey),buyerMaster=readJson(buyerProfileKey(note.restaurantId)),today=new Date().toISOString().slice(0,10);
    const defaults={sellerLegalName:saved.sellerLegalName||sellerMaster.legalName||shop.legalName||'Panora',sellerTaxId:saved.sellerTaxId||sellerMaster.taxId||shop.taxId||'',sellerAddress:saved.sellerAddress||sellerMaster.billingAddress||shop.billingAddress||shop.address||'',buyerLegalName:saved.buyerLegalName||buyerMaster.legalName||client.legalName||client.name||'',buyerTaxId:saved.buyerTaxId||buyerMaster.taxId||client.taxId||client.vatId||'',buyerAddress:saved.buyerAddress||buyerMaster.billingAddress||client.billingAddress||client.address||'',issueDate:saved.issueDate||today,operationDate:saved.operationDate||note.date||today,dueDate:saved.dueDate||note.paymentDueDate||'',ivaRate:saved.ivaRate??10,pricesIncludeTax:saved.pricesIncludeTax!==false};
    const dialog=document.createElement('dialog');dialog.id='panoraDocumentLibrary';dialog.className='document-library-dialog';
    dialog.innerHTML=`<div class="document-library-shell"><button type="button" class="document-library-x" aria-label="${esc(t('close'))}">×</button><span class="document-library-kicker">PANORA · ESPAÑA</span><h2>${esc(t('title'))}</h2><p>${esc(t('hint'))}</p><p class="document-library-warning">${esc(t('warning'))}</p>${readOnly?`<p class="document-library-readonly">${esc(t('readonly'))}</p>`:''}<div class="document-library-grid"><button type="button" data-doc="panora"><span class="document-card-top"><strong>${esc(t('base'))}</strong></span><small>${esc(t('ops'))}</small></button>${card('albaran',t('ops'))}${card('factura',t('tax'))}${card('simplificada',t('tax'))}${card('rectificativa',t('tax'))}${card('devolucion',t('tax'))}${card('abono',t('tax'))}</div><form class="document-factura-form" hidden><input type="hidden" name="variant"><div class="document-form-heading"><strong data-document-form-title></strong><span data-document-aeat></span></div><div class="document-party"><h3>${esc(t('seller'))}</h3><label>${esc(t('legal'))}<input name="sellerLegalName" value="${esc(defaults.sellerLegalName)}" required></label><label>${esc(t('nif'))}<input name="sellerTaxId" value="${esc(defaults.sellerTaxId)}" required></label><label>${esc(t('address'))}<input name="sellerAddress" value="${esc(defaults.sellerAddress)}" required></label></div><div class="document-party" data-buyer-party><h3>${esc(t('buyer'))}</h3><label>${esc(t('legal'))}<input name="buyerLegalName" value="${esc(defaults.buyerLegalName)}"></label><label>${esc(t('nif'))}<input name="buyerTaxId" value="${esc(defaults.buyerTaxId)}"></label><label>${esc(t('address'))}<input name="buyerAddress" value="${esc(defaults.buyerAddress)}"></label></div><label>${esc(t('series'))}<input name="series" maxlength="12" required></label><label>${esc(t('issue'))}<input type="date" name="issueDate" value="${esc(defaults.issueDate)}" required></label><label>${esc(t('operation'))}<input type="date" name="operationDate" value="${esc(defaults.operationDate)}" required></label><label>${esc(t('due'))}<input type="date" name="dueDate" value="${esc(defaults.dueDate)}"></label><label data-tax-field>${esc(t('vat'))}<select name="ivaRate">${[0,4,10,21].map(v=>`<option value="${v}"${Number(defaults.ivaRate)===v?' selected':''}>${v}%</option>`).join('')}</select></label><label class="document-check" data-tax-field><input type="checkbox" name="pricesIncludeTax"${defaults.pricesIncludeTax?' checked':''}> ${esc(t('included'))}</label><div class="document-rect-fields" hidden><label>${esc(t('reference'))}<input name="rectifiesNumber" placeholder="F-0001"></label><label>${esc(t('reason'))}<select name="aeatType"><option value="R1">R1 · Art. 80.1/2/6 LIVA / error jurídico</option><option value="R2">R2 · Concurso</option><option value="R3">R3 · Crédito incobrable</option><option value="R4" selected>R4 · Resto de causas</option><option value="R5">R5 · Rectifica factura simplificada</option></select></label><label>${esc(t('mode'))}<select name="rectificationMode"><option value="I" selected>I · Por diferencias</option><option value="S">S · Por sustitución</option></select></label></div><label class="document-notes">${esc(t('notes'))}<textarea name="notes" rows="3"></textarea></label><p class="document-form-error" role="alert"></p><button class="document-create" type="submit">${esc(t('create'))}</button></form></div>`;
    document.body.appendChild(dialog);
    const form=dialog.querySelector('form'),error=form.querySelector('.document-form-error');
    const close=()=>dialog.close();dialog.querySelector('.document-library-x').onclick=close;dialog.querySelector('[data-doc="panora"]').onclick=()=>ordinary(note,options);
    const openForm=variant=>{const info=typeInfo[variant];form.hidden=false;form.variant.value=variant;form.series.value=saved[`${variant}Series`]||info.series;form.querySelector('[data-document-form-title]').textContent=t(info.label);form.querySelector('[data-document-aeat]').textContent=info.aeat||'';form.querySelector('.document-rect-fields').hidden=!info.rect;form.querySelectorAll('[data-tax-field]').forEach(el=>el.hidden=!info.tax);form.querySelector('[data-buyer-party]').classList.toggle('document-buyer-optional',variant==='simplificada');if(info.rect){form.rectifiesNumber.required=true;form.aeatType.value=variant==='rectificativa'?(saved.aeatType||'R4'):'R4'}else form.rectifiesNumber.required=false;form.scrollIntoView({behavior:'smooth',block:'start'});};
    dialog.querySelector('[data-doc="albaran"]').onclick=async()=>{if(readOnly){openForm('albaran');return}try{const data=await window.panoraIssueSpanishDocument(note,'albaran',{...defaults,series:saved.albaranSeries||'ALB'});close();setTimeout(()=>window.openAccountingInvoice?.(note,{...options,variant:'albaran',documentData:data}),0)}catch(err){error.textContent=err.message||t('sql');openForm('albaran')}};
    ['factura','simplificada','rectificativa','devolucion','abono'].forEach(v=>dialog.querySelector(`[data-doc="${v}"]`).onclick=()=>openForm(v));
    if(readOnly){form.querySelectorAll('input,select,textarea').forEach(el=>el.disabled=true);form.querySelector('.document-create').hidden=true;}
    form.onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form));const variant=data.variant,info=typeInfo[variant];data.pricesIncludeTax=form.pricesIncludeTax.checked;data.ivaRate=Number(data.ivaRate||0);data.aeatType=info.rect?data.aeatType:info.aeat;data.documentKind=info.kind;data.negative=!!info.negative;const buyerRequired=variant!=='simplificada';const required=['sellerLegalName','sellerTaxId','sellerAddress','series','issueDate','operationDate',...(buyerRequired?['buyerLegalName','buyerTaxId','buyerAddress']:[]),...(info.rect?['rectifiesNumber']:[])];if(required.some(k=>!String(data[k]||'').trim())){error.textContent=t('required');return}persistOrganizationProfiles(note,data);const btn=form.querySelector('.document-create');btn.disabled=true;error.textContent='';try{const issued=await window.panoraIssueSpanishDocument(note,variant,data);localStorage.setItem(metaKey(note),JSON.stringify({...data,[`${variant}Series`]:data.series}));close();setTimeout(()=>window.openAccountingInvoice?.(note,{...options,variant:variant==='albaran'?'albaran':'factura',documentData:{...issued,displayTitle:t(info.label),aeatType:data.aeatType,rectifiesNumber:data.rectifiesNumber,rectificationMode:data.rectificationMode}}),0)}catch(err){error.textContent=(err.message||'Не удалось выпустить документ.').includes('404')?t('sql'):(err.message||t('sql'))}finally{btn.disabled=false}};
    dialog.onclick=e=>{if(e.target===dialog)close()};dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
  };
})();
