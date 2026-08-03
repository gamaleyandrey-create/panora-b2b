/* Panora v310: issue immutable Spanish Albaran/Factura snapshots in Supabase. */
(() => {
  "use strict";
  const cfg = window.PANORA_SUPABASE;
  const round = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  const productLabel = id => {
    const p = (window.productRegistry || []).find(x => x.id === id);
    const language = document.querySelector("#adminLanguage")?.value || "es";
    return p?.names?.[language] || p?.names?.es || p?.names?.ru || String(id || "");
  };
  const nifOk = value => /^[A-Z0-9][A-Z0-9 -]{6,13}$/i.test(String(value || "").trim());
  const session = () => window.panoraSupabaseSession;
  async function rpc(body) {
    const auth = session();
    if (!cfg || !auth?.access_token) throw new Error("Для выпуска документа войдите в кабинет пекарни и подключитесь к интернету.");
    const response = await fetch(`${cfg.url}/rest/v1/rpc/panora_issue_commercial_document`, {
      method: "POST",
      headers: {apikey: cfg.publishableKey, Authorization: `Bearer ${auth.access_token}`, "Content-Type": "application/json"},
      body: JSON.stringify(body)
    });
    const text = await response.text();
    if (!response.ok) { let message=text; try { const j=JSON.parse(text); message=j.message||j.hint||text; } catch {} throw new Error(message || "Не удалось выпустить документ."); }
    return text ? JSON.parse(text) : null;
  }
  window.panoraIssueSpanishDocument = async (note, variant, data) => {
    if (!nifOk(data.sellerTaxId) || !nifOk(data.buyerTaxId)) throw new Error("Проверьте NIF/CIF поставщика и получателя.");
    const issueDate = data.issueDate || new Date().toISOString().slice(0,10);
    const operationDate = data.operationDate || note.date || issueDate;
    const rate = variant === "factura" ? Number(data.ivaRate || 0) : 0;
    const pricesIncludeTax = data.pricesIncludeTax !== false;
    const lines = (note.items || []).map(item => {
      const quantity=Number(item.quantity||0), sourcePrice=Number(note.prices?.[item.product]||0);
      const unitNet=variant==="factura"&&pricesIncludeTax?round(sourcePrice/(1+rate/100)):round(sourcePrice);
      const base=round(quantity*unitNet), tax=round(base*rate/100);
      return {product_id:item.product,name:productLabel(item.product),quantity,unit_code:"C62",unit_price_net:unitNet,tax_rate:rate,tax_base:base,tax_amount:tax,line_total:round(base+tax)};
    });
    const taxableBase=round(lines.reduce((s,x)=>s+x.tax_base,0));
    const taxTotal=round(lines.reduce((s,x)=>s+x.tax_amount,0));
    const total=round(taxableBase+taxTotal);
    const taxes=variant==="factura"?[{rate,base:taxableBase,amount:taxTotal,category:"S"}]:[];
    const seller={name:data.sellerLegalName,tax_id:String(data.sellerTaxId).toUpperCase(),address:data.sellerAddress,country_code:"ES",email:data.sellerEmail||"",phone:data.sellerPhone||""};
    const buyer={name:data.buyerLegalName,tax_id:String(data.buyerTaxId).toUpperCase(),address:data.buyerAddress,country_code:"ES",email:data.buyerEmail||"",phone:data.buyerPhone||""};
    const body={p_document_type:variant,p_series:variant==="albaran"?(data.albaranSeries||"ALB"):(data.facturaSeries||"F"),p_issue_date:issueDate,p_operation_date:operationDate,p_due_date:data.dueDate||null,p_restaurant_id:note.restaurantId,p_delivery_note_id:note.id||null,p_seller:seller,p_buyer:buyer,p_lines:lines,p_tax_breakdown:taxes,p_taxable_base:taxableBase,p_tax_total:taxTotal,p_total:total,p_payment_method:data.paymentMethod||note.paymentMethod||null,p_notes:data.notes||null,p_snapshot_hash:null};
    const saved = await rpc(body);
    return {...data,documentId:saved.id,documentNumber:saved.document_number,issueDate:saved.issue_date,operationDate:saved.operation_date,dueDate:saved.due_date,lines:saved.lines,taxBreakdown:saved.tax_breakdown,taxableBase:Number(saved.taxable_base),taxTotal:Number(saved.tax_total),documentTotal:Number(saved.total),sellerSnapshot:saved.seller,buyerSnapshot:saved.buyer,issued:true};
  };
})();
