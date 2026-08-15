(()=>{
  const root=document.querySelector('#view-finance');if(!root)return;
  const cfg=window.PANORA_SUPABASE||{};
  const KEY='panora-finance-expenses';
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
  const save=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=value=>new Intl.NumberFormat('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0)+' €';
  const pct=value=>`${new Intl.NumberFormat('ru-RU',{minimumFractionDigits:0,maximumFractionDigits:1}).format(Number(value)||0)}%`;
  const parse=value=>{const n=Number(String(value??'').replace(/\s/g,'').replace(',','.'));return Number.isFinite(n)?n:0};
  const normalize=value=>String(value||'').trim().toLocaleLowerCase('ru-RU').replace(/ё/g,'е').replace(/\s+/g,' ');
  const factor=unit=>unit==='g'||unit==='ml'?1000:1;
  const productLabel=id=>{
    const list=read('panora-products',[]);
    const product=(Array.isArray(list)?list:[]).find(item=>String(item.id)===String(id));
    return product?.names?.ru||product?.name||(typeof productName==='function'?productName(id):String(id));
  };
  const partnerLabel=id=>{
    const list=read('panora-restaurants',[]);
    return (Array.isArray(list)?list:[]).find(item=>String(item.id)===String(id))?.name||'—';
  };
  const recipes=()=>read('panora-recipes',{});
  const prices=()=>read('panora-ingredient-costs',{});
  const ingredientPrice=(map,name,unit)=>Number(map[`${normalize(name)}|${String(unit||'').toLowerCase()}`]??map[`${name}|${unit}`]??0);

  const unitRawCost=(product)=>{
    const recipe=recipes()?.[product]||[],priceMap=prices();
    return (Array.isArray(recipe)?recipe:[]).reduce((sum,item)=>{
      const qty=Math.max(0,Number(item.qty||0));if(!qty)return sum;
      if(item.sourceIngredientName&&Number(item.sourceYieldPct)>0){
        const sourceUnit=item.sourceUnit||item.unit||'g';
        const sourcePrice=ingredientPrice(priceMap,item.sourceIngredientName,sourceUnit);
        const rawQty=qty/(Number(item.sourceYieldPct)/100);
        return sum+rawQty/factor(sourceUnit)*sourcePrice;
      }
      return sum+qty/factor(item.unit||'g')*ingredientPrice(priceMap,item.name,item.unit||'g');
    },0);
  };

  let expenses=read(KEY,[]);
  const session=()=>window.panoraSupabaseSession||null;
  const request=async(path,options={})=>{
    const s=session();
    if(!cfg.url||!cfg.publishableKey||!s?.access_token)throw new Error('no-session');
    const response=await fetch(`${cfg.url}/rest/v1/${path}`,{
      cache:'no-store',...options,
      headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json',...(options.headers||{})}
    });
    const text=await response.text();
    if(!response.ok)throw new Error(text||`HTTP ${response.status}`);
    return text?JSON.parse(text):null;
  };
  const rowFromCloud=row=>({
    id:row.id,date:row.expense_date,category:row.category||'Другое',description:row.description||'',
    expenseType:row.expense_type||'variable',grossAmount:Number(row.gross_amount||0),
    vatRate:Number(row.vat_rate||0),vatDeductible:row.vat_deductible!==false
  });
  const rowToCloud=row=>({
    id:row.id,expense_date:row.date,category:row.category,description:row.description||null,
    expense_type:row.expenseType,gross_amount:Number(row.grossAmount||0),vat_rate:Number(row.vatRate||0),
    vat_deductible:row.vatDeductible!==false
  });
  const loadCloud=async()=>{
    try{
      const rows=await request('finance_expenses?select=id,expense_date,category,description,expense_type,gross_amount,vat_rate,vat_deductible&order=expense_date.desc,created_at.desc');
      if(Array.isArray(rows)){expenses=rows.map(rowFromCloud);save(KEY,expenses);render()}
    }catch{}
  };
  const persist=async row=>{
    const index=expenses.findIndex(x=>x.id===row.id);
    if(index>=0)expenses[index]=row;else expenses.push(row);
    save(KEY,expenses);render();
    try{
      await request('finance_expenses?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rowToCloud(row))});
    }catch{}
  };
  const remove=async id=>{
    expenses=expenses.filter(row=>row.id!==id);save(KEY,expenses);render();
    try{await request(`finance_expenses?id=eq.${encodeURIComponent(id)}`,{method:'DELETE'})}catch{}
  };

  const from=document.querySelector('#financeDateFrom'),to=document.querySelector('#financeDateTo');
  const today=new Date(),monthStart=new Date(today.getFullYear(),today.getMonth(),1);
  const iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
  if(!from.value)from.value=iso(monthStart);if(!to.value)to.value=iso(today);
  const inPeriod=date=>{const d=String(date||'').slice(0,10);return (!from.value||d>=from.value)&&(!to.value||d<=to.value)};
  const periodLabel=()=>{
    const parseDate=value=>value?new Date(`${value}T12:00:00`):null;
    const a=parseDate(from.value),b=parseDate(to.value);
    if(!a&&!b)return 'Все даты';
    const fmt=(date,options)=>new Intl.DateTimeFormat('ru-RU',options).format(date).replace(' г.','');
    if(a&&b){
      if(a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()){
        return `${a.getDate()}–${fmt(b,{day:'numeric',month:'long',year:'numeric'})}`;
      }
      if(a.getFullYear()===b.getFullYear()){
        return `${fmt(a,{day:'numeric',month:'long'})} – ${fmt(b,{day:'numeric',month:'long',year:'numeric'})}`;
      }
      return `${fmt(a,{day:'numeric',month:'long',year:'numeric'})} – ${fmt(b,{day:'numeric',month:'long',year:'numeric'})}`;
    }
    return a?`С ${fmt(a,{day:'numeric',month:'long',year:'numeric'})}`:`По ${fmt(b,{day:'numeric',month:'long',year:'numeric'})}`;
  };

  const expenseParts=row=>{
    const gross=Math.max(0,Number(row.grossAmount||0)),rate=Math.max(0,Number(row.vatRate||0));
    const net=rate>0?gross/(1+rate/100):gross,vat=gross-net;
    return {gross,net,vat,deductibleVat:row.vatDeductible!==false?vat:0};
  };

  function calculate(){
    const notes=read('panora-delivery-notes',[]).filter(note=>inPeriod(note.date));
    const productMap=new Map(),partnerMap=new Map();
    let grossRevenue=0,revenueNet=0,salesVat=0,cogs=0,pieces=0;

    notes.forEach(note=>{
      const noteGross=Number(note.total||0),noteNet=Number(note.subtotal??(noteGross-Number(note.tax||0))),noteVat=Number(note.tax??Math.max(0,noteGross-noteNet));
      grossRevenue+=noteGross;revenueNet+=noteNet;salesVat+=noteVat;
      const items=Array.isArray(note.items)?note.items:[],pricesSnapshot=note.prices||{};
      const itemNetTotal=items.reduce((sum,item)=>sum+Number(item.quantity||0)*Number(pricesSnapshot[item.product]||0),0)||noteNet||1;
      items.forEach(item=>{
        const qty=Math.max(0,Number(item.quantity||0));if(!qty)return;
        const unitCogs=unitRawCost(item.product),itemCogs=unitCogs*qty;
        const sourceGross=qty*Number(pricesSnapshot[item.product]||0);
        const itemNet=itemNetTotal>0?noteNet*(sourceGross/itemNetTotal):0;
        cogs+=itemCogs;pieces+=qty;
        const p=productMap.get(item.product)||{product:item.product,pieces:0,revenue:0,cogs:0};
        p.pieces+=qty;p.revenue+=itemNet;p.cogs+=itemCogs;productMap.set(item.product,p);
        const k=String(note.restaurantId||'');
        const partner=partnerMap.get(k)||{id:k,pieces:0,revenue:0,cogs:0};
        partner.pieces+=qty;partner.revenue+=itemNet;partner.cogs+=itemCogs;partnerMap.set(k,partner);
      });
    });

    const periodExpenses=expenses.filter(row=>inPeriod(row.date));
    let expensesNet=0,inputVat=0;
    periodExpenses.forEach(row=>{const x=expenseParts(row);expensesNet+=x.net;inputVat+=x.deductibleVat});
    const grossProfit=revenueNet-cogs,operatingProfit=grossProfit-expensesNet;
    return {grossRevenue,revenueNet,salesVat,cogs,pieces,expensesNet,inputVat,grossProfit,operatingProfit,
      vatPayable:Math.max(0,salesVat-inputVat),products:[...productMap.values()],partners:[...partnerMap.values()],periodExpenses};
  }

  function setSignedState(element,value){
    if(!element)return;
    element.classList.remove('is-positive','is-negative','is-zero');
    element.classList.add(value>0.005?'is-positive':value<-0.005?'is-negative':'is-zero');
  }

  function render(){
    const x=calculate();
    const operatingMargin=x.revenueNet?x.operatingProfit/x.revenueNet*100:0;
    const grossMargin=x.revenueNet?x.grossProfit/x.revenueNet*100:0;
    document.querySelector('#financePeriodLabel').textContent=periodLabel();

    document.querySelector('#financeRevenueNet').textContent=money(x.revenueNet);
    document.querySelector('#financeRevenueGross').textContent=`С НДС: ${money(x.grossRevenue)}`;
    document.querySelector('#financeCogs').textContent=money(x.cogs);

    const profit=document.querySelector('#financeOperatingProfit');
    profit.textContent=money(x.operatingProfit);
    setSignedState(profit,x.operatingProfit);

    const marginValue=document.querySelector('#financeOperatingMarginValue');
    marginValue.textContent=pct(operatingMargin);
    setSignedState(marginValue,operatingMargin);

    const grossProfit=document.querySelector('#financeGrossProfit');
    grossProfit.textContent=money(x.grossProfit);
    setSignedState(grossProfit,x.grossProfit);
    document.querySelector('#financeGrossMargin').textContent=`Маржа: ${pct(grossMargin)}`;

    document.querySelector('#financeExpensesNet').textContent=money(x.expensesNet);
    document.querySelector('#financePieces').textContent=`${x.pieces} шт.`;
    const avgProfit=x.pieces?x.operatingProfit/x.pieces:0;
    const avgProfitValue=document.querySelector('#financeAvgProfitValue');
    avgProfitValue.textContent=money(avgProfit);
    setSignedState(avgProfitValue,avgProfit);

    document.querySelector('#financeSalesVat').textContent=money(x.salesVat);
    document.querySelector('#financeInputVat').textContent=money(x.inputVat);
    document.querySelector('#financeVatPayable').textContent=money(x.vatPayable);

    const productRows=document.querySelector('#financeProductRows');
    productRows.innerHTML=x.products.length?x.products.sort((a,b)=>b.revenue-a.revenue).map(row=>{
      const profit=row.revenue-row.cogs,margin=row.revenue?profit/row.revenue*100:0;
      const salePerPiece=row.pieces?row.revenue/row.pieces:0;
      return `<tr>
        <td><strong>${esc(productLabel(row.product))}</strong></td>
        <td>${row.pieces}</td>
        <td><strong>${money(salePerPiece)}</strong></td>
        <td>${money(row.revenue)}</td>
        <td>${money(row.cogs)}</td>
        <td><strong class="${profit<0?'finance-negative':'finance-positive'}">${money(profit)}</strong></td>
        <td>${money(row.pieces?profit/row.pieces:0)}</td>
        <td>${pct(margin)}</td>
      </tr>`
    }).join(''):'<tr><td colspan="8">В выбранном периоде нет отгрузок.</td></tr>';

    const partnerRows=document.querySelector('#financePartnerRows');
    partnerRows.innerHTML=x.partners.length?x.partners.sort((a,b)=>b.revenue-a.revenue).map(row=>{
      const profit=row.revenue-row.cogs,margin=row.revenue?profit/row.revenue*100:0;
      return `<tr>
        <td><strong>${esc(partnerLabel(row.id))}</strong></td>
        <td>${row.pieces}</td>
        <td>${money(row.revenue)}</td>
        <td>${money(row.pieces?row.revenue/row.pieces:0)}</td>
        <td>${money(row.cogs)}</td>
        <td><strong class="${profit<0?'finance-negative':'finance-positive'}">${money(profit)}</strong></td>
        <td>${pct(margin)}</td>
      </tr>`
    }).join(''):'<tr><td colspan="7">В выбранном периоде нет отгрузок.</td></tr>';

    const expenseRows=document.querySelector('#financeExpenseRows');
    const rows=x.periodExpenses.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    expenseRows.innerHTML=rows.length?rows.map(row=>{
      const part=expenseParts(row);
      return `<tr><td>${esc(row.date)}</td><td>${esc(row.category)}</td><td>${esc(row.description||'—')}</td><td>${row.expenseType==='fixed'?'Постоянный':'Переменный'}</td><td>${money(part.gross)}</td><td>${money(part.vat)}${row.vatDeductible===false?' <small>без вычета</small>':''}</td><td>${money(part.net)}</td><td><button type="button" class="finance-row-action" data-finance-edit="${row.id}">Изменить</button><button type="button" class="finance-row-action danger" data-finance-delete="${row.id}">Удалить</button></td></tr>`
    }).join(''):'<tr><td colspan="8">Расходов за выбранный период нет.</td></tr>';

    root.querySelectorAll('[data-finance-edit]').forEach(button=>button.onclick=()=>openExpense(expenses.find(row=>row.id===button.dataset.financeEdit)));
    root.querySelectorAll('[data-finance-delete]').forEach(button=>button.onclick=()=>{if(confirm('Удалить этот расход?'))remove(button.dataset.financeDelete)});
  }

  const dialog=document.querySelector('#financeExpenseDialog'),form=document.querySelector('#financeExpenseForm'),preview=document.querySelector('#financeExpensePreview');
  function previewExpense(){
    const data=Object.fromEntries(new FormData(form)),gross=parse(data.grossAmount),rate=parse(data.vatRate),net=rate>0?gross/(1+rate/100):gross,vat=gross-net;
    preview.textContent=`Без НДС: ${money(net)} · НДС: ${money(vat)}`;
  }
  function openExpense(row=null){
    form.reset();form.id.value=row?.id||'';form.date.value=row?.date||iso(new Date());
    form.category.value=row?.category||'Упаковка';form.description.value=row?.description||'';
    form.expenseType.value=row?.expenseType||'variable';form.grossAmount.value=row?String(row.grossAmount).replace('.',','):'';
    form.vatRate.value=row?String(row.vatRate).replace('.',','):'21';form.vatDeductible.checked=row?.vatDeductible!==false;
    previewExpense();dialog.showModal();
  }
  document.querySelector('#financeAddExpense').onclick=()=>openExpense();
  document.querySelector('#financeExpenseJump').onclick=()=>{
    const panel=document.querySelector('#financeExpensesPanel');
    panel?.scrollIntoView({behavior:'smooth',block:'start'});
    setTimeout(()=>document.querySelector('#financeAddExpense')?.focus({preventScroll:true}),450);
  };
  document.querySelector('#financeExpenseClose').onclick=document.querySelector('#financeExpenseCancel').onclick=()=>dialog.close();
  form.grossAmount.oninput=form.vatRate.oninput=previewExpense;
  form.onsubmit=event=>{
    event.preventDefault();const data=Object.fromEntries(new FormData(form)),gross=parse(data.grossAmount);
    if(gross<=0)return alert('Введите сумму расхода больше нуля.');
    const row={id:data.id||crypto.randomUUID(),date:data.date,category:data.category,description:data.description||'',expenseType:data.expenseType,grossAmount:gross,vatRate:Math.max(0,parse(data.vatRate)),vatDeductible:form.vatDeductible.checked};
    persist(row);dialog.close();
  };

  from.onchange=to.onchange=render;
  document.querySelector('#financeThisMonth').onclick=()=>{const d=new Date();from.value=iso(new Date(d.getFullYear(),d.getMonth(),1));to.value=iso(d);render()};
  document.querySelector('#financeThisYear').onclick=()=>{const d=new Date();from.value=`${d.getFullYear()}-01-01`;to.value=iso(d);render()};
  document.addEventListener('click',event=>{if(event.target.closest('.admin-nav [data-view="finance"]'))setTimeout(()=>{render();loadCloud()},20)},true);
  window.addEventListener('panora:ingredient-costs-changed',render);
  window.addEventListener('panora:recipes-changed',render);
  render();setTimeout(loadCloud,700);
})();
