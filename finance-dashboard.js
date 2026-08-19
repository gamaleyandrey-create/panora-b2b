(()=>{
  const root=document.querySelector('#view-finance');if(!root)return;
  const cfg=window.PANORA_SUPABASE||{};
  const KEY='panora-finance-expenses';
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
  const save=(key,value)=>{const payload=JSON.stringify(value);if(key==='panora-delivery-notes'&&window.panoraSaveDeliveryNotesCache)return window.panoraSaveDeliveryNotesCache(value);if(key==='panora-payments'&&window.panoraSavePaymentsCache)return window.panoraSavePaymentsCache(value);if(typeof setLocalStorageSafely==='function')return setLocalStorageSafely(key,payload);try{localStorage.setItem(key,payload);return true}catch(error){console.warn('Panora finance cache write skipped',key,error);return false}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=value=>new Intl.NumberFormat('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0)+' €';
  const pct=value=>`${new Intl.NumberFormat('ru-RU',{minimumFractionDigits:0,maximumFractionDigits:1}).format(Number(value)||0)}%`;
  const parse=value=>{const n=Number(String(value??'').replace(/\s/g,'').replace(',','.'));return Number.isFinite(n)?n:0};
  const normalize=value=>String(value||'').normalize('NFKC').trim().toLocaleLowerCase('ru-RU').replace(/ё/g,'е').replace(/[‐‑‒–—]/g,'-').replace(/\s+/g,' ');
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
  const canonicalRetailOrders=list=>{const map=new Map();(Array.isArray(list)?list:[]).filter(Boolean).forEach(order=>{const key=String(order.id||order.number||'').trim();if(!key)return;const prev=map.get(key),stamp=o=>String(o?.updatedAt||o?.completedAt||o?.createdAt||'');if(!prev||stamp(order)>=stamp(prev))map.set(key,order)});return [...map.values()]};

  const recipeUnitRawCost=(recipe,product)=>{
    const source=Array.isArray(recipe)&&recipe.length?recipe:(recipes()?.[product]||[]),priceMap=prices();
    return (Array.isArray(source)?source:[]).reduce((sum,item)=>{
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
  const unitRawCost=product=>recipeUnitRawCost(null,product);

  let expenses=read(KEY,[]);
  let retailOrders=canonicalRetailOrders(read('panora-retail-orders',[]));
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
  const retailOrderFromCloud=row=>({
    id:String(row.id||''),number:Number(row.order_number||0),source:String(row.source||'stock'),fulfillment:String(row.fulfillment||'pickup'),
    bakeDate:row.bake_date||'',pickupDate:row.pickup_date||'',deliveryFee:Number(row.delivery_fee||0),status:String(row.status||'new'),
    paymentStatus:String(row.payment_status||'pending'),paymentMethod:String(row.payment_method||'pickup'),total:Number(row.total||0),createdAt:row.created_at||'',updatedAt:row.updated_at||'',completedAt:row.completed_at||'',cancelledAt:row.cancelled_at||'',
    items:(row.retail_order_items||[]).map(item=>({product:String(item.product_id||''),quantity:Math.max(0,Number(item.quantity||0)),unitPrice:Number(item.unit_price||0)}))
  });
  const loadRetailCloud=async()=>{
    try{
      const rows=await request('retail_orders?select=id,order_number,source,fulfillment,bake_date,pickup_date,delivery_fee,status,payment_status,payment_method,total,created_at,updated_at,completed_at,cancelled_at,retail_order_items(product_id,quantity,unit_price)&order=created_at.desc');
      if(Array.isArray(rows)){retailOrders=canonicalRetailOrders(rows.map(retailOrderFromCloud));save('panora-retail-orders',retailOrders);render()}
    }catch{retailOrders=canonicalRetailOrders(read('panora-retail-orders',[]))}
  };
  const cloudConfigured=()=>Boolean(cfg.url&&cfg.publishableKey);
  const persist=async row=>{
    // Financial edits must never look saved locally when the configured cloud rejected them.
    // In a cloud-backed installation the server confirms first; local mode remains available only when Supabase is not configured.
    if(cloudConfigured()){
      await request('finance_expenses?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rowToCloud(row))});
    }
    const index=expenses.findIndex(x=>x.id===row.id);
    if(index>=0)expenses[index]=row;else expenses.push(row);
    save(KEY,expenses);render();
    return true;
  };
  const remove=async id=>{
    if(cloudConfigured())await request(`finance_expenses?id=eq.${encodeURIComponent(id)}`,{method:'DELETE'});
    expenses=expenses.filter(row=>row.id!==id);save(KEY,expenses);render();return true;
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

  // Raw-material purchases create inventory/cash outflow, not a second P&L expense.
  // COGS is already recognised above through the shipped bread recipes.
  const isRawMaterialPurchase=row=>{
    const category=normalize(row?.category);
    const description=normalize(row?.description);
    return category==='сырье'||
      category==='сырье (запас)'||
      category==='закупка сырья'||
      description.startsWith('закупка сырья');
  };

  function calculate(){
    // Panora 7.02: Finance must use the cost captured with the factual bake, not
    // today's ingredient price. This keeps closed periods immutable and lets a later
    // physical return reverse exactly the COGS that belonged to the original bake.
    const costBakeCompletions=(Array.isArray(read('panora-bake-completions',[]))?read('panora-bake-completions',[]):[])
      .filter(row=>row&&!row.deletedAt).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
    const b2bOrders=Array.isArray(read('panora-orders',[]))?read('panora-orders',[]):[],b2bOrderById=new Map(b2bOrders.filter(Boolean).map(order=>[String(order.id||''),order]));
    const historicalUnitRawCost=(product,date)=>{
      const day=String(date||'').slice(0,10);let fallbackRecipe=null;
      for(let i=costBakeCompletions.length-1;i>=0;i--){
        const completion=costBakeCompletions[i];if(day&&String(completion?.date||'')>day)continue;
        const item=(Array.isArray(completion?.items)?completion.items:[]).find(row=>String(row?.product||'')===String(product));if(!item)continue;
        const snapshot=item.costSnapshot,unit=Number(snapshot?.unitRawCost);
        if(snapshot?.complete===true&&Number.isFinite(unit)&&unit>=0)return unit;
        if(!fallbackRecipe&&Array.isArray(item.recipeSnapshot)&&item.recipeSnapshot.length)fallbackRecipe=item.recipeSnapshot;
      }
      return fallbackRecipe?recipeUnitRawCost(fallbackRecipe,product):unitRawCost(product);
    };
    const noteCostDate=note=>{const order=b2bOrderById.get(String(note?.orderId||''));return String(order?.date||note?.date||'').slice(0,10)};
    const noteUnitRawCost=(note,product)=>historicalUnitRawCost(product,noteCostDate(note));
    const retailUnitRawCost=(order,product)=>historicalUnitRawCost(product,String(order?.bakeDate||order?.pickupDate||order?.completedAt||order?.createdAt||'').slice(0,10));
    const seenNotes=new Set();
    const allNotes=read('panora-delivery-notes',[])
      .slice()
      .sort((a,b)=>String(a.createdAt||a.date||'').localeCompare(String(b.createdAt||b.date||'')))
      .filter(note=>{
        const key=note.orderId?`order:${String(note.orderId)}`:`note:${String(note.id||'')}`;
        if(seenNotes.has(key))return false;
        seenNotes.add(key);return true;
      });

    /* Panora 7.05 — finished-goods FIFO cost layers.
       A shipment must consume the actual older bake layers still on hand, not simply
       inherit the cost of the latest bake before its date. The engine is rebuilt from
       immutable bake snapshots + stock events, so mixed batches, returns and write-offs
       keep the same historical COGS without adding a new SQL table. */
    const allFinishedMovements=Array.isArray(read('panora-stock-movements',[]))?read('panora-stock-movements',[]):[];
    const allRetailForCost=Array.isArray(retailOrders)?retailOrders:[];
    const costLayers=new Map(),b2bSaleCost=new Map(),retailSaleCost=new Map(),returnMovementCost=new Map(),writeOffCost=new Map();
    const layerList=product=>{const key=String(product||'');if(!costLayers.has(key))costLayers.set(key,[]);return costLayers.get(key)};
    const layerQty=product=>layerList(product).reduce((sum,row)=>sum+Math.max(0,Number(row.qty||0)),0);
    const addLayer=(product,qty,unitCost,source='')=>{qty=Math.max(0,Number(qty||0));unitCost=Math.max(0,Number(unitCost||0));if(qty<=0)return;const rows=layerList(product),last=rows[rows.length-1];if(last&&Math.abs(Number(last.unitCost)-unitCost)<1e-9&&String(last.source||'')===String(source||''))last.qty+=qty;else rows.push({qty,unitCost,source})};
    const consumeLayers=(product,qty,fallbackUnitCost=0)=>{let remaining=Math.max(0,Number(qty||0)),cost=0;const rows=layerList(product),parts=[];while(remaining>1e-9&&rows.length){const row=rows[0],take=Math.min(remaining,Math.max(0,Number(row.qty||0)));if(take<=1e-9){rows.shift();continue}const unit=Math.max(0,Number(row.unitCost||0));row.qty-=take;remaining-=take;cost+=take*unit;parts.push({qty:take,unitCost:unit,source:row.source||''});if(row.qty<=1e-9)rows.shift()}if(remaining>1e-9){const unit=Math.max(0,Number(fallbackUnitCost||0));cost+=remaining*unit;parts.push({qty:remaining,unitCost:unit,source:'fallback'});remaining=0}return{cost,parts,unitCost:qty>0?cost/Math.max(0,Number(qty||0)):0}};
    const frozenBakeUnitCost=(item,product,date)=>{const frozen=Number(item?.costSnapshot?.unitRawCost);return Number.isFinite(frozen)&&frozen>=0?frozen:historicalUnitRawCost(product,date)};
    const b2bReturnNoteId=movement=>{const direct=String(movement?.b2bReturnNoteId||'');if(direct)return direct;const match=String(movement?.note||'').match(/\[panora:b2b-return:([^\]]+)\]/);return match?String(match[1]):''};
    const retailReturnOrderId=movement=>{const direct=String(movement?.retailOrderId||'');if(direct)return direct;const match=String(movement?.note||'').match(/\[panora:retail-return:([^:\]]+):/);return match?String(match[1]):''};
    const stockInventoryTarget=movement=>{const match=String(movement?.note||'').match(/^Инвентаризация:\s*установлен остаток\s+(-?\d+(?:[.,]\d+)?)\s*шт\./i);if(!match)return null;const target=Number(String(match[1]).replace(',','.'));return Number.isFinite(target)?Math.max(0,target):null};
    const economicEventStamp=(date,...candidates)=>{const day=String(date||'').slice(0,10);if(!day)return '';for(const value of candidates){const stamp=String(value||'');if(stamp.length>10&&stamp.slice(0,10)===day)return stamp}return `${day}T12:00:00.000Z`};
    const costEventKey=(date,stamp,priority,id)=>`${String(date||'').slice(0,10)}\u0000${String(stamp||'')}\u0000${String(priority).padStart(2,'0')}\u0000${String(id||'')}`;
    const costEvents=[];
    const manualProducedByDayProduct=new Map();
    allFinishedMovements.filter(m=>String(m?.type||'')==='produced').forEach(m=>{const key=`${String(m?.date||'').slice(0,10)}\u0000${String(m?.product||'')}`;manualProducedByDayProduct.set(key,(manualProducedByDayProduct.get(key)||0)+Math.max(0,Math.abs(Number(m?.quantity||0))))});
    costBakeCompletions.forEach(completion=>(Array.isArray(completion?.items)?completion.items:[]).forEach((item,index)=>{const product=String(item?.product||''),good=Math.max(0,Number(item?.good??(Number(item?.produced||0)-Number(item?.waste||0))));if(!product||good<=0)return;const legacyManual=completion?.source==='legacy_inferred'?Number(manualProducedByDayProduct.get(`${String(completion?.date||'').slice(0,10)}\u0000${product}`)||0):0,qty=Math.max(0,good-legacyManual);if(qty<=0)return;costEvents.push({kind:'add',product,qty,unitCost:frozenBakeUnitCost(item,product,completion.date),source:`bake:${completion.id||completion.date}:${index}`,key:costEventKey(completion.date,`${String(completion.date||'').slice(0,10)}T00:00:00.000Z`,0,`bake:${completion.id||completion.date}:${index}`)})}));
    const noteOrderIds=new Set(allNotes.map(note=>String(note?.orderId||'')).filter(Boolean));
    allFinishedMovements.forEach((movement,index)=>{const product=String(movement?.product||''),type=String(movement?.type||''),qty=Math.max(0,Math.abs(Number(movement?.quantity||0)));if(!product||qty<=0)return;if(type==='shipped'&&movement?.orderId&&noteOrderIds.has(String(movement.orderId)))return;const date=String(movement?.date||'').slice(0,10),stamp=movement?.occurredAt||movement?.createdAt||`${date}T12:00:00.000Z`,id=String(movement?.id||`manual:${index}`),target=stockInventoryTarget(movement);if(target!==null){costEvents.push({kind:'inventory',product,target,fallback:historicalUnitRawCost(product,date),key:costEventKey(date,stamp,45,id),id});return}if(['produced','initial_balance','correction_plus'].includes(type)){costEvents.push({kind:'add',product,qty,unitCost:historicalUnitRawCost(product,date),source:`stock:${id}`,key:costEventKey(date,stamp,10,id)});return}if(type==='returned'){costEvents.push({kind:'return',product,qty,movement,b2bNoteId:b2bReturnNoteId(movement),retailOrderId:retailReturnOrderId(movement),fallback:historicalUnitRawCost(product,date),key:costEventKey(date,stamp,35,id),id});return}if(type==='written_off'){costEvents.push({kind:'writeoff',product,qty,fallback:historicalUnitRawCost(product,date),key:costEventKey(date,stamp,40,id),id});return}if(['correction_minus','shipped','retail_sold'].includes(type)){costEvents.push({kind:'consume',product,qty,fallback:historicalUnitRawCost(product,date),key:costEventKey(date,stamp,30,id),id})}});
    allNotes.forEach(note=>{const grouped=new Map();(Array.isArray(note?.items)?note.items:[]).forEach(item=>{const product=String(item?.product||''),qty=Math.max(0,Number(item?.quantity||0));if(product&&qty)grouped.set(product,(grouped.get(product)||0)+qty)});grouped.forEach((qty,product)=>costEvents.push({kind:'b2b-sale',product,qty,note,fallback:noteUnitRawCost(note,product),key:costEventKey(note?.date,economicEventStamp(note?.date,note?.createdAt,note?.customerConfirmedAt,note?.offlineProof?.receivedAt),20,`b2b:${note?.id}:${product}`)}))});
    allRetailForCost.filter(order=>String(order?.status||'')==='completed').forEach(order=>{const grouped=new Map();(Array.isArray(order?.items)?order.items:[]).forEach(item=>{const product=String(item?.product||''),qty=Math.max(0,Number(item?.quantity||0));if(product&&qty)grouped.set(product,(grouped.get(product)||0)+qty)});const saleDay=String(order?.completedAt||order?.pickupDate||order?.createdAt||'').slice(0,10);grouped.forEach((qty,product)=>costEvents.push({kind:'retail-sale',product,qty,order,fallback:retailUnitRawCost(order,product),key:costEventKey(saleDay,order?.completedAt||order?.updatedAt||order?.createdAt||`${saleDay}T12:00:00.000Z`,25,`retail:${order?.id}:${product}`)}))});
    costEvents.sort((a,b)=>String(a.key).localeCompare(String(b.key)));
    costEvents.forEach(event=>{if(event.kind==='add'){addLayer(event.product,event.qty,event.unitCost,event.source);return}if(event.kind==='inventory'){const current=layerQty(event.product);if(current>event.target+1e-9)consumeLayers(event.product,current-event.target,event.fallback);else if(current+1e-9<event.target)addLayer(event.product,event.target-current,event.fallback,`inventory:${event.id}`);return}if(event.kind==='b2b-sale'){const allocation=consumeLayers(event.product,event.qty,event.fallback);b2bSaleCost.set(`${String(event.note?.id||'')}\u0000${event.product}`,{...allocation,qty:event.qty});return}if(event.kind==='retail-sale'){const allocation=consumeLayers(event.product,event.qty,event.fallback);retailSaleCost.set(`${String(event.order?.id||'')}\u0000${event.product}`,{...allocation,qty:event.qty});return}if(event.kind==='return'){let profile=null;if(event.b2bNoteId)profile=b2bSaleCost.get(`${event.b2bNoteId}\u0000${event.product}`);else if(event.retailOrderId)profile=retailSaleCost.get(`${event.retailOrderId}\u0000${event.product}`);const unit=profile&&Number(profile.qty)>0?Number(profile.cost||0)/Number(profile.qty):event.fallback,cost=unit*event.qty;returnMovementCost.set(event.id,cost);addLayer(event.product,event.qty,unit,`return:${event.id}`);return}if(event.kind==='writeoff'){const allocation=consumeLayers(event.product,event.qty,event.fallback);writeOffCost.set(event.id,allocation.cost);return}if(event.kind==='consume')consumeLayers(event.product,event.qty,event.fallback)});
    const b2bAllocatedUnitCost=(note,product)=>{const row=b2bSaleCost.get(`${String(note?.id||'')}\u0000${String(product||'')}`);return row&&Number(row.qty)>0?Number(row.cost||0)/Number(row.qty):noteUnitRawCost(note,product)};
    const retailAllocatedUnitCost=(order,product)=>{const row=retailSaleCost.get(`${String(order?.id||'')}\u0000${String(product||'')}`);return row&&Number(row.qty)>0?Number(row.cost||0)/Number(row.qty):retailUnitRawCost(order,product)};
    const notes=allNotes.filter(note=>inPeriod(note.date));
    const productMap=new Map(),partnerMap=new Map();
    let b2bGrossRevenue=0,b2bRevenueNet=0,b2bSalesVat=0,b2bCogs=0,b2bPieces=0,b2bReturnsGross=0,b2bReturnedPieces=0;

    notes.forEach(note=>{
      const noteGross=Number(note.total||0),noteNet=Number(note.subtotal??(noteGross-Number(note.tax||0))),noteVat=Number(note.tax??Math.max(0,noteGross-noteNet));
      b2bGrossRevenue+=noteGross;b2bRevenueNet+=noteNet;b2bSalesVat+=noteVat;
      const items=Array.isArray(note.items)?note.items:[],pricesSnapshot=note.prices||{};
      const itemNetTotal=items.reduce((sum,item)=>sum+Number(item.quantity||0)*Number(pricesSnapshot[item.product]||0),0)||noteNet||1;
      items.forEach(item=>{
        const qty=Math.max(0,Number(item.quantity||0));if(!qty)return;
        const unitCogs=b2bAllocatedUnitCost(note,item.product),itemCogs=unitCogs*qty;
        const sourceGross=qty*Number(pricesSnapshot[item.product]||0);
        const itemNet=itemNetTotal>0?noteNet*(sourceGross/itemNetTotal):0;
        b2bCogs+=itemCogs;b2bPieces+=qty;
        const p=productMap.get(item.product)||{product:item.product,pieces:0,revenue:0,cogs:0,b2bPieces:0,retailPieces:0,b2bRevenue:0,retailRevenue:0};
        p.pieces+=qty;p.b2bPieces+=qty;p.revenue+=itemNet;p.b2bRevenue+=itemNet;p.cogs+=itemCogs;productMap.set(item.product,p);
        const k=String(note.restaurantId||'');
        const partner=partnerMap.get(k)||{id:k,pieces:0,revenue:0,cogs:0};
        partner.pieces+=qty;partner.revenue+=itemNet;partner.cogs+=itemCogs;partnerMap.set(k,partner);
      });
    });

    // Panora 6.87 B2B: a return linked to a delivery note is a separate credit event.
    // The original delivery note stays intact; the return reduces revenue/VAT in the return
    // period and reverses COGS only because the bread is physically back in finished stock.
    if(typeof window.panoraB2BReturnCredit==='function'){
      allNotes.forEach(note=>{
        const credit=window.panoraB2BReturnCredit(note);
        (credit?.rows||[]).filter(row=>inPeriod(row?.movement?.date)).forEach(row=>{
          const gross=Math.max(0,Number(row.gross||0)),net=Math.max(0,Number(row.net||0)),tax=Math.max(0,Number(row.tax||0)),qty=Math.max(0,Number(row.quantity||0)),product=String(row.product||'');
          if(gross<=0||qty<=0||!product)return;
          const movementId=String(row?.movement?.id||''),itemCogs=returnMovementCost.has(movementId)?Number(returnMovementCost.get(movementId)||0):b2bAllocatedUnitCost(note,product)*qty;
          // Panora 7.05: a DN return is a physical reversal, so unit analytics must
          // reverse the returned pieces together with revenue and COGS. Otherwise a
          // same-period return leaves the sale price/profit per piece artificially low.
          b2bReturnsGross+=gross;b2bReturnedPieces+=qty;b2bGrossRevenue-=gross;b2bRevenueNet-=net;b2bSalesVat-=tax;b2bCogs-=itemCogs;b2bPieces-=qty;
          const p=productMap.get(product)||{product,pieces:0,revenue:0,cogs:0,b2bPieces:0,retailPieces:0,b2bRevenue:0,retailRevenue:0};
          p.revenue-=net;p.b2bRevenue-=net;p.cogs-=itemCogs;p.pieces-=qty;p.b2bPieces-=qty;productMap.set(product,p);
          const k=String(note.restaurantId||''),partner=partnerMap.get(k)||{id:k,pieces:0,revenue:0,cogs:0};
          partner.revenue-=net;partner.cogs-=itemCogs;partner.pieces-=qty;partnerMap.set(k,partner);
        });
      });
    }

    // Panora 6.87 retail accounting: sale and refund are separate accounting events.
    // The completed sale stays in its original period. A later refund reverses revenue in the
    // refund period. COGS is reversed only when that same completed order was physically
    // returned to finished stock through Panora's order-linked return movement.
    const bakery=read('panora-bakery-settings',{}),retailVatRate=bakery?.useTax?Math.max(0,Number(bakery.taxRate||0)):0;
    const netOfVat=gross=>retailVatRate>0?gross/(1+retailVatRate/100):gross;
    const allRetail=Array.isArray(retailOrders)?retailOrders:[];
    const stockMovements=read('panora-stock-movements',[]);
    const returnedToStock=order=>{
      const items=Array.isArray(order?.items)?order.items:[];if(!items.length)return false;
      return items.every((item,index)=>{const legacy=`retail-return:${String(order?.id||'')}:${String(item?.product||'')}:${index}`,marker=`[panora:retail-return:${String(order?.id||'')}:${String(item?.product||'')}:${index}]`,qty=Math.max(0,Number(item?.quantity||0));return qty>0&&(Array.isArray(stockMovements)?stockMovements:[]).some(m=>String(m?.type||'')==='returned'&&(String(m?.id||'')===legacy||String(m?.note||'').includes(marker))&&Math.abs(Number(m?.quantity||0))>=qty)});
    };
    const saleDate=order=>order.completedAt||order.pickupDate||order.createdAt;
    const refundDate=order=>order.updatedAt||order.cancelledAt||order.completedAt||order.pickupDate||order.createdAt;
    const retailCompleted=allRetail.filter(order=>String(order.status)==='completed'&&['paid','refunded'].includes(String(order.paymentStatus))&&inPeriod(saleDate(order)));
    const retailRefunded=allRetail.filter(order=>String(order.paymentStatus)==='refunded'&&Boolean(order.completedAt)&&inPeriod(refundDate(order)));
    let retailGrossRevenue=0,retailRevenueNet=0,retailSalesVat=0,retailCogs=0,retailPieces=0,retailDeliveryGross=0,retailDeliveryNet=0,retailBreadGross=0,retailBreadNet=0;
    const retailParts=order=>{
      const items=Array.isArray(order.items)?order.items:[],itemGross=items.reduce((sum,item)=>sum+Math.max(0,Number(item.quantity||0))*Math.max(0,Number(item.unitPrice||0)),0),orderGross=Math.max(0,Number(order.total||0)),deliveryGross=Math.max(0,Math.min(orderGross,Number(order.deliveryFee||0))),breadGross=Math.max(0,Math.min(orderGross-deliveryGross,itemGross||orderGross-deliveryGross)),otherGross=Math.max(0,orderGross-breadGross-deliveryGross),orderNet=netOfVat(orderGross),deliveryNet=netOfVat(deliveryGross),breadNet=Math.max(0,orderNet-deliveryNet);
      return{items,itemGross,orderGross,deliveryGross,breadGross,otherGross,orderNet,deliveryNet,breadNet};
    };
    retailCompleted.forEach(order=>{
      const x=retailParts(order);
      retailGrossRevenue+=x.orderGross;retailBreadGross+=x.breadGross+x.otherGross;retailDeliveryGross+=x.deliveryGross;
      retailRevenueNet+=x.orderNet;retailDeliveryNet+=x.deliveryNet;retailBreadNet+=x.breadNet;retailSalesVat+=Math.max(0,x.orderGross-x.orderNet);
      const grossBasis=x.itemGross||1;
      x.items.forEach(item=>{
        const qty=Math.max(0,Number(item.quantity||0));if(!qty)return;
        const itemGrossValue=qty*Math.max(0,Number(item.unitPrice||0)),itemNet=x.breadNet*(itemGrossValue/grossBasis),itemCogs=retailAllocatedUnitCost(order,item.product)*qty;
        retailCogs+=itemCogs;retailPieces+=qty;
        const p=productMap.get(item.product)||{product:item.product,pieces:0,revenue:0,cogs:0,b2bPieces:0,retailPieces:0,b2bRevenue:0,retailRevenue:0};
        p.pieces+=qty;p.retailPieces+=qty;p.revenue+=itemNet;p.retailRevenue+=itemNet;p.cogs+=itemCogs;productMap.set(item.product,p);
      });
    });
    let retailRefundsGross=0;
    retailRefunded.forEach(order=>{
      const x=retailParts(order),physicalReturn=returnedToStock(order);retailRefundsGross+=x.orderGross;
      retailGrossRevenue-=x.orderGross;retailBreadGross-=x.breadGross+x.otherGross;retailDeliveryGross-=x.deliveryGross;retailRevenueNet-=x.orderNet;retailDeliveryNet-=x.deliveryNet;retailBreadNet-=x.breadNet;retailSalesVat-=Math.max(0,x.orderGross-x.orderNet);
      const grossBasis=x.itemGross||1;
      x.items.forEach(item=>{
        const qty=Math.max(0,Number(item.quantity||0));if(!qty)return;
        const itemGrossValue=qty*Math.max(0,Number(item.unitPrice||0)),itemNet=x.breadNet*(itemGrossValue/grossBasis),itemCogs=retailAllocatedUnitCost(order,item.product)*qty;
        const p=productMap.get(item.product)||{product:item.product,pieces:0,revenue:0,cogs:0,b2bPieces:0,retailPieces:0,b2bRevenue:0,retailRevenue:0};
        p.revenue-=itemNet;p.retailRevenue-=itemNet;
        if(physicalReturn){retailCogs-=itemCogs;retailPieces-=qty;p.cogs-=itemCogs;p.pieces-=qty;p.retailPieces-=qty}
        productMap.set(item.product,p);
      });
    });

    const manualExpenses=expenses.filter(row=>inPeriod(row.date));
    let expensesNet=0,inputVat=0,rawPurchasesNet=0,rawPurchasesGross=0,rawPurchasesVat=0;
    manualExpenses.forEach(row=>{
      const x=expenseParts(row);
      inputVat+=x.deductibleVat;
      if(isRawMaterialPurchase(row)){
        rawPurchasesNet+=x.net;
        rawPurchasesGross+=x.gross;
        rawPurchasesVat+=x.vat;
      }else{
        expensesNet+=x.net;
      }
    });

    // Panora 6.83: factual bake waste and explicit finished-bread write-offs are real
    // production/stock losses. Keep sales COGS clean, but subtract these losses from
    // operating profit so physical losses cannot disappear from P&L. Inventory
    // corrections (+/-) remain reconciliation entries and are not auto-expensed.
    const lossRows=[];
    const bakeCompletions=read('panora-bake-completions',[]);
    (Array.isArray(bakeCompletions)?bakeCompletions:[]).filter(row=>row&&!row.deletedAt&&inPeriod(row.date)).forEach(completion=>{
      (Array.isArray(completion.items)?completion.items:[]).forEach((item,index)=>{
        const product=String(item?.product||''),waste=Math.max(0,Number(item?.waste||0));if(!product||!waste)return;
        const frozen=Number(item?.costSnapshot?.unitRawCost),unitCost=item?.costSnapshot?.complete===true&&Number.isFinite(frozen)?frozen:recipeUnitRawCost(item?.recipeSnapshot,product),cost=unitCost*waste;if(cost<=0)return;
        lossRows.push({id:`auto-loss:bake:${completion.id||completion.date}:${product}:${index}`,date:String(completion.date||''),category:'Производственные потери',description:`Брак при выпечке · ${productLabel(product)} · ${waste} шт.`,expenseType:'variable',grossAmount:cost,vatRate:0,vatDeductible:false,syntheticLoss:true,lossKind:'bake_waste'});
      });
    });
    const finishedMovements=read('panora-stock-movements',[]),seenWriteOffs=new Set();
    (Array.isArray(finishedMovements)?finishedMovements:[]).filter(row=>row&&String(row.type||'')==='written_off'&&inPeriod(row.date)).forEach((movement,index)=>{
      const key=String(movement.id||`${movement.date}:${movement.product}:${movement.quantity}:${index}`);if(seenWriteOffs.has(key))return;seenWriteOffs.add(key);
      const product=String(movement.product||''),qty=Math.max(0,Number(movement.quantity||0));if(!product||!qty)return;
      const cost=writeOffCost.has(String(movement.id||''))?Number(writeOffCost.get(String(movement.id||''))||0):historicalUnitRawCost(product,movement.date)*qty;if(cost<=0)return;
      const note=String(movement.note||'').trim();
      lossRows.push({id:`auto-loss:stock:${key}`,date:String(movement.date||''),category:'Потери склада',description:`Списание готового хлеба · ${productLabel(product)} · ${qty} шт.${note?` · ${note}`:''}`,expenseType:'variable',grossAmount:cost,vatRate:0,vatDeductible:false,syntheticLoss:true,lossKind:'finished_write_off'});
    });
    const stockLossesNet=lossRows.reduce((sum,row)=>sum+Math.max(0,Number(row.grossAmount||0)),0);
    const operatingCostsNet=expensesNet+stockLossesNet;
    const grossRevenue=b2bGrossRevenue+retailGrossRevenue,revenueNet=b2bRevenueNet+retailRevenueNet,salesVat=b2bSalesVat+retailSalesVat,cogs=b2bCogs+retailCogs,pieces=b2bPieces+retailPieces;
    const grossProfit=revenueNet-cogs,operatingProfit=grossProfit-operatingCostsNet;
    return {grossRevenue,revenueNet,salesVat,cogs,pieces,expensesNet,stockLossesNet,operatingCostsNet,inputVat,rawPurchasesNet,rawPurchasesGross,rawPurchasesVat,grossProfit,operatingProfit,
      vatPayable:Math.max(0,salesVat-inputVat),products:[...productMap.values()],partners:[...partnerMap.values()],periodExpenses:[...manualExpenses,...lossRows],lossRows,
      b2b:{grossRevenue:b2bGrossRevenue,revenueNet:b2bRevenueNet,salesVat:b2bSalesVat,cogs:b2bCogs,pieces:b2bPieces,returnsGross:b2bReturnsGross,returnedPieces:b2bReturnedPieces,grossProfit:b2bRevenueNet-b2bCogs},
      retail:{grossRevenue:retailGrossRevenue,revenueNet:retailRevenueNet,salesVat:retailSalesVat,cogs:retailCogs,pieces:retailPieces,grossProfit:retailRevenueNet-retailCogs,deliveryGross:retailDeliveryGross,deliveryNet:retailDeliveryNet,breadGross:retailBreadGross,breadNet:retailBreadNet,refundsGross:retailRefundsGross,completed:retailCompleted.length,refunded:retailRefunded.length,vatRate:retailVatRate}};
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
    const setText=(id,value)=>{const el=document.querySelector(id);if(el)el.textContent=value};
    setText('#financeB2bRevenue',money(x.b2b.revenueNet));setText('#financeB2bReturns',money(x.b2b.returnsGross));setText('#financeB2bCogs',money(x.b2b.cogs));setText('#financeB2bGrossProfit',money(x.b2b.grossProfit));setText('#financeB2bPieces',`${x.b2b.pieces} шт.`);
    setText('#financeRetailRevenue',money(x.retail.revenueNet));setText('#financeRetailRevenueGross',`С НДС: ${money(x.retail.grossRevenue)}`);setText('#financeRetailBreadRevenue',money(x.retail.breadNet));setText('#financeRetailDeliveryRevenue',money(x.retail.deliveryNet));setText('#financeRetailRefunds',money(x.retail.refundsGross));setText('#financeRetailCogs',money(x.retail.cogs));setText('#financeRetailGrossProfit',money(x.retail.grossProfit));setText('#financeRetailPieces',`${x.retail.pieces} шт.`);setText('#financeRetailOrders',`${x.retail.completed} завершённых продаж · ${x.retail.refunded} возвратов`);
    setSignedState(document.querySelector('#financeRetailGrossProfit'),x.retail.grossProfit);

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

    document.querySelector('#financeExpensesNet').textContent=money(x.operatingCostsNet);
    setText('#financeExpensesDetail',`Ручные: ${money(x.expensesNet)} · потери: ${money(x.stockLossesNet)} · перейти ↓`);
    const rawPurchases=document.querySelector('#financeRawPurchasesNet');
    if(rawPurchases)rawPurchases.textContent=money(x.rawPurchasesNet);
    const rawPurchasesGross=document.querySelector('#financeRawPurchasesGross');
    if(rawPurchasesGross)rawPurchasesGross.textContent=`С НДС: ${money(x.rawPurchasesGross)}`;
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
        <td><strong>${esc(productLabel(row.product))}</strong><small>${row.b2bPieces||0} B2B · ${row.retailPieces||0} розница</small></td>
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
      const part=expenseParts(row),inventory=isRawMaterialPurchase(row);
      const accounting=inventory
        ? '<span class="finance-accounting-badge inventory">Запас сырья</span><small>не уменьшает прибыль повторно</small>'
        : '<span class="finance-accounting-badge operating">Операционный</span><small>уменьшает операционную прибыль</small>';
      const actions=row.syntheticLoss?'<span class="finance-accounting-badge operating">Автоматически</span>':`<button type="button" class="finance-row-action" data-finance-edit="${row.id}">Изменить</button><button type="button" class="finance-row-action danger" data-finance-delete="${row.id}">Удалить</button>`;
      return `<tr class="${inventory?'finance-inventory-row':''}"><td>${esc(row.date)}</td><td>${esc(row.category)}</td><td>${esc(row.description||'—')}</td><td>${row.expenseType==='fixed'?'Постоянный':'Переменный'}</td><td>${money(part.gross)}</td><td>${money(part.vat)}${row.vatDeductible===false&&!row.syntheticLoss?' <small>без вычета</small>':''}</td><td>${money(part.net)}</td><td>${accounting}</td><td>${actions}</td></tr>`
    }).join(''):'<tr><td colspan="9">Расходов и закупок за выбранный период нет.</td></tr>';

    root.querySelectorAll('[data-finance-edit]').forEach(button=>button.onclick=()=>openExpense(expenses.find(row=>row.id===button.dataset.financeEdit)));
    root.querySelectorAll('[data-finance-delete]').forEach(button=>button.onclick=async()=>{
      if(!confirm('Удалить этот расход?'))return;
      button.disabled=true;
      try{await remove(button.dataset.financeDelete)}
      catch(error){button.disabled=false;alert(`Не удалось удалить расход из облака. Изменения не применены. ${error?.message||''}`.trim())}
    });
  }

  const dialog=document.querySelector('#financeExpenseDialog'),form=document.querySelector('#financeExpenseForm'),preview=document.querySelector('#financeExpensePreview');
  function previewExpense(){
    const data=Object.fromEntries(new FormData(form)),gross=parse(data.grossAmount),rate=parse(data.vatRate),net=rate>0?gross/(1+rate/100):gross,vat=gross-net;
    preview.textContent=`Без НДС: ${money(net)} · НДС: ${money(vat)}`;
  }
  function openExpense(row=null){
    form.reset();form.id.value=row?.id||'';form.date.value=row?.date||iso(new Date());
    const category=row?.category||'Упаковка';
    if(category&&![...form.category.options].some(option=>option.value===category)){
      form.category.add(new Option(category,category));
    }
    form.category.value=category;form.description.value=row?.description||'';
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
  form.onsubmit=async event=>{
    event.preventDefault();const data=Object.fromEntries(new FormData(form)),gross=parse(data.grossAmount);
    if(gross<=0)return alert('Введите сумму расхода больше нуля.');
    const row={id:data.id||crypto.randomUUID(),date:data.date,category:data.category,description:data.description||'',expenseType:data.expenseType,grossAmount:gross,vatRate:Math.max(0,parse(data.vatRate)),vatDeductible:form.vatDeductible.checked};
    const submit=form.querySelector('[type="submit"]');if(submit)submit.disabled=true;
    try{await persist(row);dialog.close()}
    catch(error){alert(`Не удалось сохранить расход в облаке. Изменения не применены. ${error?.message||''}`.trim())}
    finally{if(submit)submit.disabled=false}
  };

  from.onchange=to.onchange=render;
  document.querySelector('#financeThisMonth').onclick=()=>{const d=new Date();from.value=iso(new Date(d.getFullYear(),d.getMonth(),1));to.value=iso(d);render()};
  document.querySelector('#financeThisYear').onclick=()=>{const d=new Date();from.value=`${d.getFullYear()}-01-01`;to.value=iso(d);render()};
  document.addEventListener('click',event=>{if(event.target.closest('.admin-nav [data-view="finance"]'))setTimeout(()=>{retailOrders=read('panora-retail-orders',[]);render();loadCloud();loadRetailCloud()},20)},true);
  window.addEventListener('panora:ingredient-costs-changed',render);
  window.addEventListener('panora:recipes-changed',render);
  window.addEventListener('panora:retail-orders-updated',()=>{retailOrders=read('panora-retail-orders',[]);render()});
  window.addEventListener('panora:retail-payments-updated',()=>{retailOrders=read('panora-retail-orders',[]);render()});
  window.addEventListener('panora:stock-movements-changed',render);
  window.addEventListener('panora:finished-stock-cloud-updated',render);
  window.addEventListener('panora:bake-completions-changed',render);
  window.addEventListener('panora:bake-completions-cloud-updated',render);
  window.addEventListener('storage',event=>{if(['panora-retail-orders','panora-stock-movements','panora-bake-completions'].includes(event.key)){retailOrders=read('panora-retail-orders',[]);render()}});
  render();setTimeout(()=>{loadCloud();loadRetailCloud()},700);
})();
