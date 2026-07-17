printNote=function(orderId){
  const n=deliveryNotes.find(x=>x.orderId===orderId),o=orders.find(x=>x.id===orderId);
  if(!n)return;
  const r=restaurant(n.restaurantId),b={...invoiceDefaults,...bakerySettings,...(n.bakery||{})};
  const prefix=b.notePrefix||'DN-',number=`${prefix}${String(n.number).padStart(4,'0')}`;
  const taxOn=n.taxEnabled!==undefined?Boolean(n.taxEnabled):Number(n.taxRate||0)>0;
  const subtotal=Number(n.subtotal??n.total),total=taxOn?Number(n.total):subtotal;
  const totals=taxOn
    ? `Без НДС: ${euro(subtotal)}<br>${b.showTax?`НДС ${n.taxRate||0}%: ${euro(n.tax||0)}<br>`:''}Итого: <strong>${euro(total)}</strong>`
    : `Итого: <strong>${euro(total)}</strong>`;
  const w=window.open('','_blank');if(!w)return;
  w.document.write(`<title>${number}</title><style>body{font:15px Arial;max-width:800px;margin:40px auto;color:#17231b}h1{font:38px Georgia;margin-bottom:5px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:30px}.doc{text-align:right}table{width:100%;border-collapse:collapse;margin-top:28px}td,th{padding:10px;border-bottom:1px solid #ccc;text-align:left}.total{text-align:right;font-size:17px}.terms,.footer{margin-top:24px;padding:12px;background:#f4f4ef}.sign{margin-top:70px;display:flex;justify-content:space-between}</style><h1>Panora</h1><div class="meta"><p><strong>${b.legalName||'Panora'}</strong><br>${b.taxId||''}<br>${b.address||''}<br>${b.email||''}<br>${b.phone||''}</p><div class="doc"><h2>${b.noteTitle||'Накладная'} ${number}</h2><p>${n.date}</p></div></div><p>Ресторан: <strong>${r.name}</strong><br>${r.address||'—'}<br>Выпечка: ${o?.date||n.date}<br>Доставка: ${o?.deliveryDate||o?.date||n.date}</p><table><tr><th>Товар</th><th>Количество</th><th>Цена</th><th>Сумма</th></tr>${n.items.map(i=>`<tr><td>${i.product==='plain'?'Обычный хлеб':'Хлеб из тыквы'}</td><td>${i.quantity} шт.</td><td>${euro(n.prices[i.product])}</td><td>${euro(i.quantity*n.prices[i.product])}</td></tr>`).join('')}</table><p class="total">${totals}<br>Оплачено: ${euro(n.paid||0)}<br>Задолженность: ${euro(n.balanceAfter||0)}</p>${b.paymentTerms?`<p class="terms"><strong>Условия оплаты:</strong> ${b.paymentTerms}</p>`:''}${b.noteFooter?`<p class="footer">${b.noteFooter}</p>`:''}<div class="sign"><span>${b.bakerySignature||'Panora'} __________________</span><span>${b.customerSignature||'Ресторан'} __________________</span></div>`);
  w.document.close();w.print();
};
