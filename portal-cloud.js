/* Panora restaurant cloud v2. Supabase is the only source of truth for orders. */
(()=>{
  let partnerOrderPoll=0,partnerOrdersLoading=null;
  'use strict';
  const PORTAL_ORDERS_CACHE_KEY="panora-portal-orders";
  const PORTAL_ORDERS_ARCHIVE_CACHE_LIMIT=250;
  const PORTAL_NOTES_CACHE_LIMIT=250;
  const PORTAL_PAYMENTS_CACHE_LIMIT=350;

  function isPortalStorageQuotaError(error){
    const name=String(error?.name||"");
    const message=String(error?.message||error||"");
    return name==="QuotaExceededError" ||
      name==="NS_ERROR_DOM_QUOTA_REACHED" ||
      /exceeded the quota|quota/i.test(message);
  }

  function isArchivedPortalOrder(row){
    const status=String(row?.status||"").toLowerCase();
    return Boolean(
      row?.archived ||
      row?.isArchived ||
      row?.archive ||
      ["delivered","cancelled","canceled","closed","archived"].includes(status)
    );
  }

  function compactPortalOrderForCache(row){
    const copy={...(row||{})};
    if(Array.isArray(copy.order_items)){
      copy.order_items=copy.order_items.map((item)=>({
        product_id:item?.product_id,
        quantity:item?.quantity,
        unit_price:item?.unit_price,
        product_names_snapshot:item?.product_names_snapshot,
        product_image_snapshot:item?.product_image_snapshot
      }));
    }
    delete copy.status_history;
    delete copy.messages;
    delete copy.notification_events;
    delete copy.raw_payload;
    return copy;
  }

  function releasePortalCacheQuota(){
    const expendable=[
      'panora-cloud-backups-v286',
      'panora-audit-v333',
      'panora-portal-delivery-notes',
      'panora-portal-payments'
    ];
    for(const key of expendable){
      try{
        if(key==='panora-audit-v333'){
          const rows=JSON.parse(localStorage.getItem(key)||'[]');
          if(Array.isArray(rows)&&rows.length>80){
            localStorage.setItem(key,JSON.stringify(rows.slice(0,80)));
            continue;
          }
        }
        localStorage.removeItem(key);
      }catch{}
    }
  }

  function compactPortalNoteForCache(note){
    const copy={...(note||{})};
    if(copy.offlineProof){
      copy.offlineProof={
        receivedAt:copy.offlineProof.receivedAt||'',
        receiver:copy.offlineProof.receiver||'',
        pending:Boolean(copy.offlineProof.pending)
      };
    }
    return copy;
  }

  function savePortalNotesCache(rows){
    setPortalRuntime('panora-delivery-notes',Array.isArray(rows)?rows:[]);
    const source=(Array.isArray(rows)?rows:[])
      .slice()
      .sort((a,b)=>String(b?.date||'').localeCompare(String(a?.date||'')))
      .slice(0,PORTAL_NOTES_CACHE_LIMIT)
      .map(compactPortalNoteForCache);
    const key='panora-portal-delivery-notes';
    try{
      localStorage.setItem(key,JSON.stringify(source));
      return true;
    }catch(error){
      if(!isPortalStorageQuotaError(error))throw error;
      releasePortalCacheQuota();
      try{
        localStorage.setItem(key,JSON.stringify(source.slice(0,80)));
        return true;
      }catch(retry){
        if(!isPortalStorageQuotaError(retry))throw retry;
        try{localStorage.removeItem(key)}catch(_){}
        return false;
      }
    }
  }

  function savePortalPaymentsCache(rows){
    setPortalRuntime('panora-payments',Array.isArray(rows)?rows:[]);
    const source=(Array.isArray(rows)?rows:[])
      .slice()
      .sort((a,b)=>String(b?.receivedAt||b?.date||'').localeCompare(String(a?.receivedAt||a?.date||'')))
      .slice(0,PORTAL_PAYMENTS_CACHE_LIMIT);
    const key='panora-portal-payments';
    try{
      localStorage.setItem(key,JSON.stringify(source));
      return true;
    }catch(error){
      if(!isPortalStorageQuotaError(error))throw error;
      releasePortalCacheQuota();
      try{
        localStorage.setItem(key,JSON.stringify(source.slice(0,120)));
        return true;
      }catch(retry){
        if(!isPortalStorageQuotaError(retry))throw retry;
        try{localStorage.removeItem(key)}catch(_){}
        return false;
      }
    }
  }

  const archiveMetaForOrder=(order,note)=>{
    const confirmedAt=note?.customerConfirmedAt||note?.offlineProof?.receivedAt||order?.deliveryConfirmedAt||null;
    let reference=confirmedAt||order?.archiveReferenceAt||null;
    if(!reference&&['completed','paid'].includes(String(order?.status||''))&&(order?.deliveryDate||order?.date)){
      reference=`${String(order.deliveryDate||order.date).slice(0,10)}T23:59:59`;
    }
    const when=reference?new Date(reference):null;
    const archived=String(order?.status||'')==='cancelled' ||
      Boolean(when&&!Number.isNaN(when.getTime())&&Date.now()-when.getTime()>=5*24*60*60*1000);
    return {...order,deliveryConfirmedAt:confirmedAt,archiveReferenceAt:reference,archived};
  };

  function savePortalOrdersCache(rows){
    const source=Array.isArray(rows)?rows:[];
    setPortalRuntime('panora-orders',source);
    const working=[];
    const archived=[];
    for(const row of source){
      (isArchivedPortalOrder(row)?archived:working).push(compactPortalOrderForCache(row));
    }
    archived.sort((a,b)=>String(b?.created_at||b?.createdAt||"").localeCompare(String(a?.created_at||a?.createdAt||"")));
    const compact=[...working,...archived.slice(0,PORTAL_ORDERS_ARCHIVE_CACHE_LIMIT)];
    try{
      localStorage.setItem(PORTAL_ORDERS_CACHE_KEY,JSON.stringify(compact));
      return true;
    }catch(error){
      if(!isPortalStorageQuotaError(error))throw error;
      releasePortalCacheQuota();
      try{
        localStorage.removeItem(PORTAL_ORDERS_CACHE_KEY);
        localStorage.setItem(PORTAL_ORDERS_CACHE_KEY,JSON.stringify(working));
        return true;
      }catch(retryError){
        if(!isPortalStorageQuotaError(retryError))throw retryError;
        try{localStorage.removeItem(PORTAL_ORDERS_CACHE_KEY);}catch(_){}
        return false;
      }
    }
  }

  const cfg=window.PANORA_SUPABASE;
  if(!cfg)return;
  const SESSION_KEY='panora-restaurant-cloud-session';
  const APP_URL='https://gamaleyandrey-create.github.io/panora-b2b/';
  let session=null,refreshPromise=null,loadPromise=null,submitting=false,lastState={type:'ok',text:'Соединение установлено'};
  const privateKeys=new Set(['panora-restaurants','panora-orders','panora-delivery-notes','panora-payments']);
  const storageKey=key=>privateKeys.has(key)?`panora-portal-${key.slice(7)}`:key;
  const setPortalRuntime=(key,value)=>{
    try{window.panoraPortalSetRuntime?.(key,value)}catch{}
    return value;
  };
  const read=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(storageKey(key))||'null')??fallback}catch{return fallback}};
  const write=(key,value)=>{
    setPortalRuntime(key,value);
    if(key==='panora-orders')return savePortalOrdersCache(value);
    if(key==='panora-delivery-notes')return savePortalNotesCache(value);
    if(key==='panora-payments')return savePortalPaymentsCache(value);
    try{
      localStorage.setItem(storageKey(key),JSON.stringify(value));
      return true;
    }catch(error){
      if(!isPortalStorageQuotaError(error))throw error;
      releasePortalCacheQuota();
      try{localStorage.setItem(storageKey(key),JSON.stringify(value));return true}
      catch(retry){if(!isPortalStorageQuotaError(retry))throw retry;return false}
    }
  };
  const saveSession=value=>{session=value;if(value)write(SESSION_KEY,value);else localStorage.removeItem(SESSION_KEY)};
  const labels=(ru,en,es)=>lang==='es'?es:lang==='en'?en:ru;
  let loginCooldownTimer=0,loginCooldownUntil=0;
  function cooldownSeconds(message=''){
    const match=String(message).match(/(?:after|через|después de)\s+(\d+)\s*(?:seconds?|сек|segundos?)/i);
    return match?Math.max(1,Number(match[1])):0;
  }
  function startLoginCooldown(form,seconds){
    loginCooldownUntil=Math.max(loginCooldownUntil,Date.now()+seconds*1000);
    clearInterval(loginCooldownTimer);
    const error=form.querySelector('#accountError'),buttons=[...form.querySelectorAll('button')];
    const update=()=>{
      const left=Math.max(0,Math.ceil((loginCooldownUntil-Date.now())/1000));
      buttons.forEach(button=>button.disabled=left>0);
      if(left){
        error.textContent=labels(`Слишком много попыток. Повторите через ${left} сек.`,`Too many attempts. Try again in ${left} sec.`,`Demasiados intentos. Repite en ${left} s.`);
        error.classList.add('show');
      }else{
        clearInterval(loginCooldownTimer);
        error.textContent=labels('Теперь можно войти.','You can sign in now.','Ya puedes entrar.');
        error.classList.add('show');
      }
    };
    update();loginCooldownTimer=setInterval(update,1000);
  }
  function showLoginError(form,error){
    const seconds=cooldownSeconds(error?.message);
    if(seconds)return startLoginCooldown(form,seconds);
    const el=form.querySelector('#accountError');
    const message=String(error?.message||'');
    el.textContent=/email not confirmed/i.test(message)
      ?labels(
        'Учётная запись ожидает подтверждения email. Откройте письмо Panora, подтвердите адрес и затем нажмите «Войти». Проверьте папку «Спам».',
        'Your account is waiting for email confirmation. Open the Panora email, confirm your address, then select “Sign in”. Check your spam folder.',
        'La cuenta está pendiente de confirmación por email. Abre el correo de Panora, confirma tu dirección y pulsa «Entrar». Revisa la carpeta de spam.'
      )
      :(message||labels('Не удалось войти','Could not sign in','No se pudo iniciar sesión'));
    el.classList.add('show');
  }
  async function fetchJson(url,options={}){
    const response=await fetch(url,{cache:'no-store',...options}),text=await response.text();
    if(!response.ok){let message=text;try{const body=JSON.parse(text);message=body.message||body.msg||body.error_description||body.error||text}catch{}const error=new Error(message||`HTTP ${response.status}`);error.status=response.status;throw error}
    return text?JSON.parse(text):null;
  }
  const isInvalidRefreshToken=error=>/invalid refresh token|refresh token not found|refresh token not found|invalid_refresh_token|refresh_token_not_found/i.test(String(error?.message||error||''));
  function expiredSessionError(cause){
    const error=new Error(labels('Сессия истекла. Войдите снова.','Session expired. Sign in again.','La sesión ha caducado. Inicia sesión de nuevo.'));
    error.code='PANORA_SESSION_EXPIRED';error.cause=cause||null;return error;
  }
  function clearBrokenSession(cause){
    stopPartnerOrderPolling();stopPartnerPricingPolling();
    saveSession(null);
    account=null;
    localStorage.removeItem('panora-account-id');
    state('error',labels('Сессия истекла. Войдите снова.','Session expired. Sign in again.','La sesión ha caducado. Inicia sesión de nuevo.'));
    try{
      renderAccountModal();
      closePanels();
      setTimeout(()=>openPanel(document.querySelector('#profileModal')),80);
    }catch{}
    window.dispatchEvent(new CustomEvent('panora:session-expired',{detail:{reason:String(cause?.message||cause||'')}}));
  }
  async function refreshSession(){
    if(refreshPromise)return refreshPromise;
    if(!session?.refresh_token){
      const error=expiredSessionError();
      clearBrokenSession(error);
      throw error;
    }
    refreshPromise=fetchJson(`${cfg.url}/auth/v1/token?grant_type=refresh_token`,{
      method:'POST',
      headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},
      body:JSON.stringify({refresh_token:session.refresh_token})
    }).then(next=>{
      if(!next?.access_token||!next?.refresh_token)throw expiredSessionError();
      saveSession(next);return next;
    }).catch(error=>{
      if(isInvalidRefreshToken(error)||error?.status===400||error?.status===401){
        const friendly=expiredSessionError(error);
        clearBrokenSession(error);
        throw friendly;
      }
      throw error;
    }).finally(()=>refreshPromise=null);
    return refreshPromise;
  }
  async function ensureSession(){
    if(!session?.access_token){
      const error=expiredSessionError();
      clearBrokenSession(error);
      throw error;
    }
    if(session.expires_at&&Date.now()>Number(session.expires_at)*1000-60000)await refreshSession();
  }
  async function api(path,options={},retry=true){
    await ensureSession();
    try{return await fetchJson(`${cfg.url}/rest/v1/${path}`,{...options,headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json','Cache-Control':'no-cache',...(options.headers||{})}})}
    catch(error){
      if(error.status===401&&retry){
        try{await refreshSession();return api(path,options,false)}
        catch(refreshError){throw refreshError}
      }
      if(error.status===401){
        const friendly=expiredSessionError(error);clearBrokenSession(error);throw friendly;
      }
      throw error;
    }
  }
  function state(type,text){lastState={type,text};window.panoraRestaurantSyncState=lastState;window.dispatchEvent(new CustomEvent('panora:restaurant-sync',{detail:lastState}));decorateState()}
  function decorateState(){
    if(!account)return;const modal=document.querySelector('#profileModal'),anchor=modal?.querySelector('.account-section');if(!anchor)return;
    let box=modal.querySelector('#restaurantCloudState');if(!box){box=document.createElement('section');box.id='restaurantCloudState';box.className='account-section';anchor.before(box)}
    box.innerHTML=`<h3>${labels('Облако','Cloud','Nube')}</h3><p style="color:${lastState.type==='error'?'#a5443c':'#42684d'};overflow-wrap:anywhere">${lastState.text}</p>${lastState.type==='error'?`<button type="button" class="button button-ghost full" id="cloudReload">${labels('Повторить','Retry','Reintentar')}</button>`:''}`;
    box.querySelector('#cloudReload')?.addEventListener('click',()=>loadAll(true));
  }
  const safeMessengers=value=>Array.isArray(value)?value.filter(item=>item&&typeof item==='object').slice(0,10).map(item=>({name:String(item.name||'').trim().slice(0,40),contact:String(item.contact||'').trim().slice(0,120)})).filter(item=>item.name&&item.contact):[];
  const normalizePortalPartnerType=value=>{const raw=String(value??'').trim().toLowerCase(),aliases={restaurant:'restaurant','ресторан':'restaurant',restaurante:'restaurant',shop:'shop','магазин':'shop',tienda:'shop',hotel:'hotel','отель':'hotel',cafe:'cafe','кафе':'cafe','café':'cafe',catering:'catering','кейтеринг':'catering',cátering:'catering',other:'other','другое':'other',otro:'other'};return aliases[raw]||'restaurant'};
  const mapRestaurant=(row,prices)=>({id:row.id,name:row.name,email:row.email,phone:row.phone||'',whatsapp:row.whatsapp||'',telegram:row.telegram||'',extraMessengers:safeMessengers(row.extra_messengers),address:row.address||'',legalName:row.legal_name||'',taxId:row.tax_id||'',billingAddress:row.billing_address||'',contactPerson:row.contact_person||'',deliveryComment:row.delivery_comment||'',receivingHours:row.receiving_hours||'',receivingDays:row.receiving_days||'',notifyOrder:row.notify_order!==false,notifyShipment:row.notify_shipment!==false,notifyInvoice:row.notify_invoice!==false,notifyPayment:row.notify_payment!==false,language:row.language||'ru',partnerType:normalizePortalPartnerType(row.partner_type),prices:Object.fromEntries(prices.map(x=>[x.product_id,Number(x.price)]))});
  function mapOrder(row){
    let meta={};try{meta=JSON.parse(row.comment||'{}')}catch{meta={comment:row.comment||''}}
    const day=row.bake_days||{},items=row.order_items||[];
    return{id:row.id,number:Number(row.order_number),restaurantId:row.restaurant_id,date:day.bake_date,deliveryDate:meta.deliveryDate||day.delivery_date||day.bake_date,items:items.map(x=>({product:x.product_id,quantity:Number(x.quantity),nameSnapshot:x.product_names_snapshot||null,imageSnapshot:x.product_image_snapshot||''})),prices:Object.fromEntries(items.map(x=>[x.product_id,Number(x.unit_price)])),taxRate:0,status:row.status,comment:meta.comment||'',cancellationReason:row.cancelled_reason||'',createdAt:row.created_at,statusHistory:[]};
  }

  async function hydrateOrderRows(orderRows){
    const rows=Array.isArray(orderRows)?orderRows:[];
    const ids=rows.map(r=>String(r?.id||'')).filter(Boolean);
    if(!ids.length)return rows;
    const needsFallback=rows.some(r=>!Array.isArray(r?.order_items)||r.order_items.length===0);
    if(!needsFallback)return rows;
    try{
      const encoded=ids.map(id=>`"${id.replace(/"/g,'')}"`).join(',');
      const itemRows=await api(`order_items?order_id=in.(${encodeURIComponent(encoded)})&select=order_id,product_id,quantity,unit_price,product_names_snapshot,product_image_snapshot&order=order_id.asc,product_id.asc`);
      const grouped=new Map();
      for(const item of itemRows||[]){const key=String(item.order_id||'');if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(item)}
      return rows.map(row=>{
        const direct=grouped.get(String(row.id||''))||[];
        const nested=Array.isArray(row.order_items)?row.order_items:[];
        return {...row,order_items:direct.length?direct:nested};
      });
    }catch(error){
      console.warn('Panora order items fallback',error);
      return rows;
    }
  }
  function recoverZeroOrderPrices(nextOrders,partnerPrices){
    const fallback=partnerPrices&&typeof partnerPrices==='object'?partnerPrices:{};
    return (nextOrders||[]).map(order=>{
      if(!order?.items?.length)return order;
      const prices={...(order.prices||{})};
      let recovered=false;
      for(const item of order.items){
        const saved=Number(prices[item.product]);
        const current=Number(fallback[item.product]);
        if((!Number.isFinite(saved)||saved<=0)&&Number.isFinite(current)&&current>0){prices[item.product]=current;recovered=true}
      }
      return recovered?{...order,prices,_pricesRecoveredFromPartner:true}:order;
    });
  }
  function preserveKnownOrderItems(nextOrders){
    const previous=read('panora-orders')||[];
    const previousById=new Map(previous.map(order=>[String(order.id),order]));
    return (nextOrders||[]).map(order=>{
      const old=previousById.get(String(order.id));
      let next=order;
      if(!order.items?.length&&old?.items?.length)next={...next,items:old.items,prices:old.prices||order.prices,_itemsRecoveredFromCache:true};
      if(old){
        next={
          ...next,
          deliveryConfirmedAt:old.deliveryConfirmedAt||null,
          archiveReferenceAt:old.archiveReferenceAt||null,
          archived:Boolean(old.archived)
        };
      }
      return next;
    });
  }
  const mapStatusEvent=row=>({
    id:row.id,
    orderId:row.order_id,
    status:row.status,
    occurredAt:row.occurred_at,
    actorRole:row.actor_role||'',
    actorName:row.actor_name||'',
    actorUserId:row.actor_user_id||null,
    source:row.source||''
  });
  const attachStatusHistory=(orders,rows)=>{
    const grouped=new Map();
    (rows||[]).map(mapStatusEvent).forEach(event=>{
      const list=grouped.get(String(event.orderId))||[];
      list.push(event);grouped.set(String(event.orderId),list);
    });
    return (orders||[]).map(order=>({...order,statusHistory:(grouped.get(String(order.id))||[]).sort((a,b)=>String(a.occurredAt).localeCompare(String(b.occurredAt)))}));
  };
  async function fetchStatusEvents(){
    try{return await api('order_status_events?select=id,order_id,status,occurred_at,actor_role,actor_name,actor_user_id,source&order=occurred_at.asc')}
    catch(error){
      if(error?.status!==404)console.warn('Panora status history',error);
      return [];
    }
  }
  async function loadAll(force=false){
    /* A forced refresh must run AFTER any older request. Reusing an in-flight
       response here used to make a newly created order appear and disappear. */
    if(loadPromise){
      if(!force)return loadPromise;
      try{await loadPromise}catch{}
    }
    loadPromise=(async()=>{
      const uid=session?.user?.id;if(!uid)return;
      const profiles=await api(`profiles?id=eq.${encodeURIComponent(uid)}&select=restaurant_id,role`),profile=profiles?.[0];
      if(!profile||profile.role!=='restaurant'||!profile.restaurant_id)throw new Error(labels('Email не связан с карточкой партнёра','Email is not linked to a partner profile','El email no está vinculado al perfil del socio'));
      const rid=profile.restaurant_id;
      const [restaurantRows,prices,orderRows,notes,payments,days,products,statusEvents,orderRules]=await Promise.all([
        api(`restaurants?id=eq.${rid}&select=*`),api(`restaurant_prices?restaurant_id=eq.${rid}&select=product_id,price`),api(`orders?restaurant_id=eq.${rid}&select=id,order_number,restaurant_id,status,comment,cancelled_reason,created_at,bake_days(bake_date,delivery_date),order_items(product_id,quantity,unit_price,product_names_snapshot,product_image_snapshot)&order=order_number.asc`),api(`delivery_notes?restaurant_id=eq.${rid}&select=*`),api(`payments?restaurant_id=eq.${rid}&select=*`),api('bake_days?select=id,bake_date,delivery_date,cutoff_at,accepting_orders,bake_items(product_id,planned_quantity)&order=bake_date.asc'),api('rpc/panora_restaurant_catalog',{method:'POST',body:'{}'}),fetchStatusEvents(),api('rpc/panora_public_order_rules',{method:'POST',body:'{}'}).catch(()=>[])
      ]);
      if(!restaurantRows?.[0])throw new Error('Partner not found');
      const rpcPrices=Object.fromEntries((products||[]).map(item=>[item.id,Number(item.price)]));
      const hydratedOrderRows=await hydrateOrderRows(orderRows||[]);
      const own={...mapRestaurant(restaurantRows[0],prices||[]),prices:Object.keys(rpcPrices).length?rpcPrices:mapRestaurant(restaurantRows[0],prices||[]).prices};
      const initialOrders=recoverZeroOrderPrices(preserveKnownOrderItems(attachStatusHistory(hydratedOrderRows.map(mapOrder),statusEvents)),Object.keys(rpcPrices).length?rpcPrices:mapRestaurant(restaurantRows[0],prices||[]).prices);
      const mappedNotes=(notes||[]).map(n=>({id:n.id,number:Number(n.note_number),orderId:n.order_id,restaurantId:n.restaurant_id,date:String(n.delivered_at).slice(0,10),paymentDueDate:n.payment_due_date||'',items:initialOrders.find(o=>o.id===n.order_id)?.items||[],prices:initialOrders.find(o=>o.id===n.order_id)?.prices||{},total:Number(n.total),traysDelivered:Number(n.trays_delivered||0),traysReturned:Number(n.trays_returned||0),trayBalanceAfter:Number(n.tray_balance_after||0),customerTraysReceived:n.customer_trays_received==null?null:Number(n.customer_trays_received),customerTraysReturned:n.customer_trays_returned==null?null:Number(n.customer_trays_returned),qrToken:n.qr_token,customerConfirmedAt:n.customer_confirmed_at||null,customerReceiver:n.customer_receiver||'',offlineProof:n.offline_received_at?{receivedAt:n.offline_received_at,receiver:n.offline_receiver||'',pending:false}:null}));
      const notesByOrder=new Map(mappedNotes.map(note=>[String(note.orderId),note]));
      const orders=initialOrders.map(order=>archiveMetaForOrder(order,notesByOrder.get(String(order.id))));
      const mappedPayments=(payments||[]).map(p=>({id:p.id,restaurantId:p.restaurant_id,deliveryNoteId:p.delivery_note_id||null,date:String(p.received_at).slice(0,10),receivedAt:p.received_at||null,amount:Number(p.amount),method:p.method,note:p.note||'',confirmed:p.status!=='cancelled',status:p.status,disputeStatus:p.dispute_status||'none',disputeReason:p.dispute_reason||'',disputedAt:p.disputed_at||null,disputeDeadline:p.dispute_deadline||null,recordedBy:p.recorded_by||p.confirmed_by||null}));
      setPortalRuntime('panora-restaurants',[own]);
      setPortalRuntime('panora-orders',orders);
      setPortalRuntime('panora-delivery-notes',mappedNotes);
      setPortalRuntime('panora-payments',mappedPayments);
      write('panora-restaurants',[own]);savePortalOrdersCache(orders);
      write('panora-delivery-notes',mappedNotes);
      write('panora-payments',mappedPayments);
      write('panora-production-plans',(days||[]).flatMap(d=>(d.bake_items||[]).map(i=>({id:`${d.id}:${i.product_id}`,bakeDayId:d.id,bakeDate:d.bake_date,deliveryDate:d.delivery_date,product:i.product_id,planned:Number(i.planned_quantity),ordered:orders.filter(o=>o.date===d.bake_date&&o.status!=='cancelled').flatMap(o=>o.items).filter(x=>x.product===i.product_id).reduce((s,x)=>s+x.quantity,0),cutoff:d.cutoff_at,open:d.accepting_orders}))));
      const initialRuleMap=new Map((orderRules||[]).map(row=>[String(row.id),Math.max(1,Number(row.wholesale_min_qty||8))]));
      if(products?.length)localStorage.setItem('panora-partner-products',JSON.stringify(products.map(p=>({id:p.id,builtIn:['plain','pumpkin'].includes(p.id),active:p.active,weight:Number(p.weight_g),wholesaleMinQty:initialRuleMap.get(String(p.id))||Math.max(1,Number(p.wholesale_min_qty||8)),image:p.image_url||'icon.svg',names:{ru:p.name_ru,en:p.name_en,es:p.name_es},descriptions:{ru:p.description_ru||'',en:p.description_en||'',es:p.description_es||''}}))));
      account=own;localStorage.setItem('panora-account-id',own.id);applyAccount();window.dispatchEvent(new CustomEvent('panora:products-changed'));
      const active=document.activeElement;
      const editingWorkspace=Boolean(active&&active.closest?.("#profileModal.restaurant-workspace")&&["INPUT","TEXTAREA","SELECT"].includes(active.tagName));
      if(!editingWorkspace)renderAccountModal();
      renderCart();window.dispatchEvent(new CustomEvent('panora:partner-data-updated'));startPartnerOrderPolling();startPartnerPricingPolling();setTimeout(()=>partnerPushRepairRegistration().catch(()=>{}),250);setTimeout(()=>window.panoraOrderMessages?.refreshUnread?.(),350);state('ok',labels('Синхронизировано','Synced','Sincronizado'));return orders;
    })().catch(error=>{state('error',error.message);throw error}).finally(()=>loadPromise=null);
    return loadPromise;
  }
  async function refreshPartnerOrders(){
    if(partnerOrdersLoading)return partnerOrdersLoading;
    if(!session?.user?.id||!account?.id||!navigator.onLine)return [];
    partnerOrdersLoading=(async()=>{
      const rows=await api(`orders?restaurant_id=eq.${encodeURIComponent(account.id)}&select=id,order_number,restaurant_id,status,comment,cancelled_reason,created_at,bake_days(bake_date,delivery_date),order_items(product_id,quantity,unit_price,product_names_snapshot,product_image_snapshot)&order=order_number.asc`);
      const hydratedRows=await hydrateOrderRows(rows||[]);
      const next=recoverZeroOrderPrices(preserveKnownOrderItems(hydratedRows.map(mapOrder)),account?.prices||{});
      const previous=read('panora-orders')||[];
      const comparable=order=>({
        id:order.id,number:order.number,restaurantId:order.restaurantId,date:order.date,
        deliveryDate:order.deliveryDate,items:order.items,prices:order.prices,taxRate:order.taxRate,
        status:order.status,comment:order.comment||'',cancellationReason:order.cancellationReason||'',
        createdAt:order.createdAt
      });
      const before=JSON.stringify(previous.map(comparable));
      const after=JSON.stringify(next.map(comparable));
      const previousById=new Map(previous.map(order=>[order.id,order.status]));
      const changed=next.filter(order=>previousById.get(order.id)!==order.status).map(order=>({id:order.id,status:order.status}));
      const eventRows=changed.length?await fetchStatusEvents():[];
      const enriched=changed.length?attachStatusHistory(next,eventRows):next.map(order=>({...order,statusHistory:previous.find(old=>old.id===order.id)?.statusHistory||[]}));
      setPortalRuntime('panora-orders',enriched);
      if(before!==after){
        savePortalOrdersCache(enriched);
        const active=document.activeElement;
        const editingWorkspace=Boolean(active&&active.closest?.("#profileModal.restaurant-workspace")&&["INPUT","TEXTAREA","SELECT"].includes(active.tagName));
        if(!editingWorkspace)renderAccountModal();
        window.dispatchEvent(new CustomEvent('panora:partner-orders-updated',{detail:{count:next.length,changed}}));
        if(changed.some(change=>change.status==='shipped')){
          setTimeout(()=>loadAll(true).catch(()=>{}),80);
        }
      }else if(!(read('panora-orders')||[]).length&&enriched.length){
        // Runtime has live cloud data even if the offline cache is absent.
        try{renderAccountModal(true)}catch{}
        window.dispatchEvent(new CustomEvent('panora:partner-orders-updated',{detail:{count:enriched.length,changed:[],source:'live-runtime'}}));
      }
      state('ok',labels('Синхронизировано','Synced','Sincronizado'));
      return enriched;
    })().finally(()=>partnerOrdersLoading=null);
    return partnerOrdersLoading;
  }
  async function confirmDeliveryRemote(noteId,receiver,traysReceived,traysReturned){
    const rows=await api('rpc/panora_confirm_delivery_remote',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_note_id:noteId,p_receiver:String(receiver||'').trim(),p_trays_received:Number(traysReceived||0),p_trays_returned:Number(traysReturned||0)})});
    if(!rows?.length)throw new Error(labels('Не удалось подтвердить получение','Could not confirm receipt','No se pudo confirmar la recepción'));
    await loadAll(true); return rows[0];
  }
  window.panoraPartnerDelivery={confirmRemote:confirmDeliveryRemote};

  async function disputePayment(paymentId,reason){
    const rows=await api('rpc/panora_dispute_payment',{
      method:'POST',
      headers:{Prefer:'return=representation'},
      body:JSON.stringify({p_payment_id:paymentId,p_reason:String(reason||'').trim()})
    });
    if(!rows?.length)throw new Error(labels('Не удалось открыть спор','Could not open dispute','No se pudo abrir la disputa'));
    await loadAll(true);
    return rows[0];
  }
  window.panoraPartnerPayments={dispute:disputePayment};

  function startPartnerOrderPolling(){
    clearInterval(partnerOrderPoll);
    if(!session?.user||!account)return;
    const tick=()=>refreshPartnerOrders().catch(error=>{
      if(error?.code==='PANORA_SESSION_EXPIRED'||isInvalidRefreshToken(error))return;
      console.warn('Panora partner order refresh',error);
    });
    tick();
    partnerOrderPoll=setInterval(()=>{if(!document.hidden)tick()},2000);
  }
  function stopPartnerOrderPolling(){clearInterval(partnerOrderPoll);partnerOrderPoll=0}
  let partnerPricingPoll=0,partnerPricingLoading=null;
  async function refreshPartnerPricing(){
    if(partnerPricingLoading)return partnerPricingLoading;
    if(!session?.user?.id||!account?.id||!navigator.onLine)return null;
    partnerPricingLoading=(async()=>{
      const [prices,products,rules]=await Promise.all([
        api(`restaurant_prices?restaurant_id=eq.${encodeURIComponent(account.id)}&select=product_id,price`).catch(()=>[]),
        api('rpc/panora_restaurant_catalog',{method:'POST',body:'{}'}),
        api('rpc/panora_public_order_rules',{method:'POST',body:'{}'}).catch(()=>[])
      ]);
      const ruleMap=new Map((rules||[]).map(row=>[String(row.id),Math.max(1,Number(row.wholesale_min_qty||8))]));
      const rpcPrices=Object.fromEntries((products||[]).map(item=>[item.id,Number(item.price)]));
      const directPrices=Object.fromEntries((prices||[]).map(item=>[item.product_id,Number(item.price)]));
      const nextPrices=Object.keys(rpcPrices).length?rpcPrices:directPrices;
      const priceChanged=JSON.stringify(account.prices||{})!==JSON.stringify(nextPrices);
      if(priceChanged){
        account={...account,prices:nextPrices};
        write('panora-restaurants',[account]);
        try{renderAccountModal()}catch{}
      }
      let productChanged=false;
      if(products?.length){
        const nextProducts=products.map(p=>({id:p.id,builtIn:['plain','pumpkin'].includes(p.id),active:p.active,weight:Number(p.weight_g),wholesaleMinQty:Math.max(1,Number(p.wholesale_min_qty||8)),image:p.image_url||'icon.svg',names:{ru:p.name_ru,en:p.name_en,es:p.name_es},descriptions:{ru:p.description_ru||'',en:p.description_en||'',es:p.description_es||''}}));
        const before=localStorage.getItem('panora-partner-products')||'[]',after=JSON.stringify(nextProducts);
        productChanged=before!==after;
        if(productChanged)localStorage.setItem('panora-partner-products',after);
      }
      if(priceChanged||productChanged){
        if(typeof refreshRestaurantProducts==='function')refreshRestaurantProducts();
        else applyAccount();
        renderAccountModal();
        renderCart();
        window.dispatchEvent(new CustomEvent('panora:partner-pricing-updated',{detail:{priceChanged,productChanged,productCount:products?.length||0}}));
      }
      return {priceChanged,productCount:products?.length||0};
    })().finally(()=>partnerPricingLoading=null);
    return partnerPricingLoading;
  }
  function startPartnerPricingPolling(){
    clearInterval(partnerPricingPoll);
    if(!session?.user||!account)return;
    const tick=()=>refreshPartnerPricing().catch(error=>{
      if(error?.code==='PANORA_SESSION_EXPIRED'||isInvalidRefreshToken(error))return;
      console.warn('Panora partner pricing refresh',error);
    });
    tick();
    partnerPricingPoll=setInterval(()=>{if(!document.hidden)tick()},2500);
  }
  function stopPartnerPricingPolling(){clearInterval(partnerPricingPoll);partnerPricingPoll=0}

  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&session?.user&&account){refreshPartnerOrders().catch(()=>{});refreshPartnerPricing().catch(()=>{})}});
  window.addEventListener('focus',()=>{if(session?.user&&account){refreshPartnerOrders().catch(()=>{});refreshPartnerPricing().catch(()=>{})}});
  window.addEventListener('online',()=>{if(session?.user&&account){refreshPartnerOrders().catch(()=>{});refreshPartnerPricing().catch(()=>{})}});

  window.addEventListener('storage',event=>{
    if(!session?.user||!account)return;
    if(event.key==='panora-public-products'||event.key==='panora-partner-products'||event.key==='panora-restaurants'){
      setTimeout(()=>refreshPartnerPricing().catch(()=>{}),700);
    }
  });

  async function signIn(email,password,signup=false){
    const path=signup?`/auth/v1/signup?redirect_to=${encodeURIComponent(APP_URL)}`:'/auth/v1/token?grant_type=password',body={email,password,...(signup?{data:{display_name:email,language:lang}}:{})};
    const result=await fetchJson(`${cfg.url}${path}`,{method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},body:JSON.stringify(body)}),next=result.access_token?result:result.session;
    if(!next)throw new Error(labels(
      'Учётная запись создана. Мы отправили письмо Panora: подтвердите email, затем вернитесь и нажмите «Войти». Проверьте папку «Спам».',
      'Account created. We sent you a Panora email: confirm your address, return here, then select “Sign in”. Check your spam folder.',
      'Cuenta creada. Te enviamos un correo de Panora: confirma tu email, vuelve aquí y pulsa «Entrar». Revisa la carpeta de spam.'
    ));
    saveSession(next);await loadAll(true);
  }
  loginAccount=async event=>{
    event.preventDefault();const form=event.currentTarget,data=new FormData(form),button=form.querySelector('button');button.disabled=true;
    try{await signIn(String(data.get('email')).trim().toLowerCase(),String(data.get('code')),false);closePanels();renderAccountModal();setTimeout(()=>openPanel(document.querySelector('#profileModal')),180);showToast(account.name)}catch(error){showLoginError(form,error)}finally{if(Date.now()>=loginCooldownUntil)button.disabled=false}
  };
  const legacyRender=renderAccountModal;
  renderAccountModal=function(force=false){
    const active=document.activeElement;
    const editingWorkspace=Boolean(active&&active.closest?.("#profileModal.restaurant-workspace")&&["INPUT","TEXTAREA","SELECT"].includes(active.tagName));
    if(editingWorkspace&&!force)return;
    legacyRender();if(account){decorateState();return}
    const form=document.querySelector('#accountLogin');if(!form)return;form.onsubmit=loginAccount;const input=form.elements.code;input.type='password';input.minLength=6;
    if(!form.querySelector('[data-cloud-signup]')){const button=document.createElement('button');button.type='button';button.className='button button-ghost full';button.dataset.cloudSignup='';button.textContent=labels('Первый вход — создать пароль','First sign-in — create password','Primer acceso — crear contraseña');button.onclick=async()=>{const data=new FormData(form);button.disabled=true;try{await signIn(String(data.get('email')).trim().toLowerCase(),String(data.get('code')),true)}catch(error){showLoginError(form,error)}finally{if(Date.now()>=loginCooldownUntil)button.disabled=false}};form.append(button)}
    if(!form.querySelector('.account-confirm-hint')){const hint=document.createElement('p');hint.className='account-confirm-hint';hint.textContent=labels('При первом входе после создания пароля подтвердите email по письму Panora. Без подтверждения вход закрыт.','After creating a password for the first time, confirm your email using the Panora message. You cannot sign in until it is confirmed.','Después de crear la contraseña por primera vez, confirma tu email con el mensaje de Panora. No podrás entrar hasta confirmarlo.');form.querySelector('[data-cloud-signup]')?.before(hint)}
    if(Date.now()<loginCooldownUntil)startLoginCooldown(form,Math.ceil((loginCooldownUntil-Date.now())/1000));
  };
  const legacyLogout=logoutAccount;
  logoutAccount=async()=>{stopPartnerOrderPolling();stopPartnerPricingPolling();try{if(session)await fetch(`${cfg.url}/auth/v1/logout`,{method:'POST',headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${session.access_token}`}})}catch{}saveSession(null);legacyLogout()};
  restaurantCancelOrder=async id=>{try{await api(`orders?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'cancelled',cancelled_reason:'Cancelled by partner',updated_at:new Date().toISOString()})});await loadAll(true);state('ok',labels('Заказ отменён','Order cancelled','Pedido cancelado'))}catch(error){state('error',error.message)}};
  window.panoraPartnerOrderMessages={
    list:orderId=>api('rpc/panora_order_messages_for_order',{method:'POST',body:JSON.stringify({p_order_id:orderId})}),
    send:(orderId,body)=>api('rpc/panora_send_order_message',{method:'POST',body:JSON.stringify({p_order_id:orderId,p_body:String(body||'').trim()})}),
    markRead:orderId=>api('rpc/panora_mark_order_messages_read',{method:'POST',body:JSON.stringify({p_order_id:orderId})}),
    unread:()=>api('rpc/panora_order_message_unread_counts',{method:'POST',body:'{}'})
  };
  const partnerPushB64ToBytes=value=>{const pad='='.repeat((4-String(value||'').length%4)%4),base64=(String(value||'')+pad).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(base64);return Uint8Array.from([...raw].map(ch=>ch.charCodeAt(0)))};
  const partnerPushConfig=async()=>{const rows=await api('rpc/panora_partner_push_config',{method:'POST',body:'{}'});return Array.isArray(rows)?rows[0]:rows};
  const partnerPushEnable=async()=>{
    if(!account)throw new Error(labels('Войдите в кабинет партнёра','Sign in to the partner account','Inicia sesión en el área del socio'));
    if(!('Notification'in window)||!('serviceWorker'in navigator)||!('PushManager'in window))throw new Error(labels('Этот браузер не поддерживает Web Push','This browser does not support Web Push','Este navegador no admite Web Push'));
    const config=await partnerPushConfig();
    if(!config?.enabled)throw new Error(labels('Push для партнёров пока выключен','Partner Push is currently disabled','Las notificaciones Push para socios están desactivadas'));
    if(!config?.vapid_public_key)throw new Error(labels('VAPID public key не настроен','VAPID public key is not configured','La clave pública VAPID no está configurada'));
    const permission=await Notification.requestPermission();
    if(permission!=='granted')throw new Error(labels('Разрешение на уведомления не предоставлено','Notification permission was not granted','No se concedió permiso para notificaciones'));
    const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:partnerPushB64ToBytes(config.vapid_public_key)});
    const json=sub.toJSON();
    await api('rpc/panora_partner_register_push',{method:'POST',body:JSON.stringify({p_endpoint:json.endpoint,p_p256dh:json.keys?.p256dh||'',p_auth:json.keys?.auth||'',p_user_agent:navigator.userAgent})});
    return true;
  };
  const partnerPushTest=async()=>{await api('rpc/panora_partner_test_push',{method:'POST',body:'{}'});return true};
  const partnerPushStatus=async()=>{
    if(!account||!('Notification'in window)||!('serviceWorker'in navigator)||!('PushManager'in window))return{active:false,browser:false,server:false,reason:'unsupported'};
    if(Notification.permission!=='granted')return{active:false,browser:false,server:false,reason:Notification.permission};
    const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();
    if(!sub)return{active:false,browser:false,server:false,reason:'no_subscription'};
    try{
      const rows=await api('rpc/panora_partner_push_status',{method:'POST',body:JSON.stringify({p_endpoint:sub.endpoint})});
      const row=Array.isArray(rows)?rows[0]:rows;
      const server=Boolean(row?.active ?? row);
      return{active:server,browser:true,server,reason:server?'ready':'not_registered',endpoint:sub.endpoint};
    }catch(error){
      return{active:false,browser:true,server:false,reason:'status_error',error:String(error?.message||error),endpoint:sub.endpoint};
    }
  };
  let partnerPushRepairBusy=false,partnerPushRepairAt=0;
  const partnerPushRepairRegistration=async()=>{
    if(partnerPushRepairBusy||Date.now()-partnerPushRepairAt<30000)return false;
    partnerPushRepairAt=Date.now();
    if(!account||Notification?.permission!=='granted'||!('serviceWorker'in navigator)||!('PushManager'in window))return false;
    partnerPushRepairBusy=true;
    try{
      const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();
      if(!sub)return false;
      const config=await partnerPushConfig();
      if(!config?.enabled||!config?.vapid_public_key)return false;
      const json=sub.toJSON();
      await api('rpc/panora_partner_register_push',{method:'POST',body:JSON.stringify({p_endpoint:json.endpoint,p_p256dh:json.keys?.p256dh||'',p_auth:json.keys?.auth||'',p_user_agent:navigator.userAgent})});
      const verified=await partnerPushStatus();
      if(!verified.active)throw new Error(verified.error||verified.reason||'server_registration_failed');
      localStorage.setItem('panora-partner-webpush-registered','1');
      window.dispatchEvent(new CustomEvent('panora:partner-push-state',{detail:{active:true}}));
      return true;
    }catch(error){
      localStorage.removeItem('panora-partner-webpush-registered');
      window.dispatchEvent(new CustomEvent('panora:partner-push-state',{detail:{active:false,error:String(error?.message||error)}}));
      return false;
    }finally{partnerPushRepairBusy=false}
  };
  window.panoraPartnerPush={
    enable:async()=>{
      await partnerPushEnable();
      const verified=await partnerPushStatus();
      if(!verified.active){
        localStorage.removeItem('panora-partner-webpush-registered');
        const reason=verified.error||verified.reason||'server_registration_failed';
        window.dispatchEvent(new CustomEvent('panora:partner-push-state',{detail:{active:false,reason}}));
        throw new Error(labels(
          `Браузер разрешил Push, но устройство не зарегистрировано на сервере: ${reason}`,
          `The browser allowed Push, but this device is not registered on the server: ${reason}`,
          `El navegador permitió Push, pero el dispositivo no está registrado en el servidor: ${reason}`
        ));
      }
      localStorage.setItem('panora-partner-webpush-registered','1');
      window.dispatchEvent(new CustomEvent('panora:partner-push-state',{detail:{active:true}}));
      return verified;
    },
    test:partnerPushTest,
    config:partnerPushConfig,
    status:partnerPushStatus,
    repair:partnerPushRepairRegistration
  };
  window.panoraRestaurantProfile={save:async details=>{
    if(!account)throw new Error(labels('Войдите в кабинет партнёра','Sign in to the partner account','Inicia sesión en el área del socio'));
    if(!navigator.onLine)throw new Error(labels('Для сохранения профиля подключитесь к интернету','Connect to the internet to save your profile','Conéctate a internet para guardar el perfil'));
    const patch={name:String(details.name||'').trim().slice(0,120),phone:String(details.phone||'').trim().slice(0,30),address:String(details.address||'').trim().slice(0,300),whatsapp:String(details.whatsapp||'').trim().slice(0,30)||null,telegram:String(details.telegram||'').trim().slice(0,120)||null,extra_messengers:safeMessengers(details.extraMessengers),legal_name:String(details.legalName||'').trim().slice(0,180)||null,tax_id:String(details.taxId||'').trim().toUpperCase().slice(0,25)||null,billing_address:String(details.billingAddress||'').trim().slice(0,300)||null,contact_person:String(details.contactPerson||'').trim().slice(0,120)||null,delivery_comment:String(details.deliveryComment||'').trim().slice(0,500)||null,receiving_hours:String(details.receivingHours||'').trim().slice(0,80)||null,receiving_days:String(details.receivingDays||'').trim().slice(0,120)||null,notify_order:details.notifyOrder==='on',notify_shipment:details.notifyShipment==='on',notify_invoice:details.notifyInvoice==='on',notify_payment:details.notifyPayment==='on',language:['ru','en','es'].includes(details.language)?details.language:'ru',partner_type:['restaurant','shop','hotel','cafe','catering','other'].includes(details.partnerType)?details.partnerType:'other',updated_at:new Date().toISOString()};
    if(!patch.name||!patch.phone||!patch.address)throw new Error(labels('Заполните обязательные поля','Complete the required fields','Completa los campos obligatorios'));
    state('sending',labels('Сохраняем профиль…','Saving profile…','Guardando perfil…'));
    await api('rpc/panora_update_partner_profile',{method:'POST',body:JSON.stringify({p_name:patch.name,p_phone:patch.phone,p_address:patch.address,p_whatsapp:patch.whatsapp,p_telegram:patch.telegram,p_extra_messengers:patch.extra_messengers,p_legal_name:patch.legal_name,p_tax_id:patch.tax_id,p_billing_address:patch.billing_address,p_contact_person:patch.contact_person,p_delivery_comment:patch.delivery_comment,p_receiving_hours:patch.receiving_hours,p_receiving_days:patch.receiving_days,p_notify_order:patch.notify_order,p_notify_shipment:patch.notify_shipment,p_notify_invoice:patch.notify_invoice,p_notify_payment:patch.notify_payment,p_language:patch.language,p_partner_type:patch.partner_type})});
    account={...account,...patch,partnerType:patch.partner_type,whatsapp:patch.whatsapp||'',telegram:patch.telegram||'',extraMessengers:patch.extra_messengers,legalName:patch.legal_name||'',taxId:patch.tax_id||'',billingAddress:patch.billing_address||'',contactPerson:patch.contact_person||'',deliveryComment:patch.delivery_comment||'',receivingHours:patch.receiving_hours||'',receivingDays:patch.receiving_days||'',notifyOrder:patch.notify_order,notifyShipment:patch.notify_shipment,notifyInvoice:patch.notify_invoice,notifyPayment:patch.notify_payment};window.panoraSetLanguage?.(patch.language);delete account.partner_type;delete account.extra_messengers;delete account.legal_name;delete account.tax_id;delete account.billing_address;write('panora-restaurants',[account]);applyAccount();window.dispatchEvent(new CustomEvent('panora:partner-data-updated'));state('ok',labels('Профиль сохранён','Profile saved','Perfil guardado'));return account;
  }};
  const tierPriceForOrderItem=(item)=>{
    const managed=(()=>{try{return JSON.parse(localStorage.getItem('panora-public-products')||'[]')}catch{return[]}})();
    const product=(managed||[]).find(p=>String(p.id)===String(item.product))||{};
    const min=Math.max(1,Number(product.wholesaleMinQty||8));
    const retail=Number(product.basePrice||0);
    const wholesale=Number(account?.prices?.[item.product] ?? retail);
    return Number(item.quantity)>=min?wholesale:retail;
  };
  const expectedOrderItems=items=>{
    const expected=new Map();
    for(const item of items||[]){
      const product=String(item?.product||'').trim(),quantity=Math.trunc(Number(item?.quantity)||0);
      if(product&&quantity>0)expected.set(product,quantity);
    }
    return expected;
  };
  const orderSnapshotMatches=(row,items)=>{
    if(!row?.id)return false;
    const expected=expectedOrderItems(items),actual=new Map();
    if(!expected.size)return false;
    for(const item of row.order_items||[]){
      const product=String(item?.product_id||'').trim(),quantity=Math.trunc(Number(item?.quantity)||0);
      if(!product||quantity<=0||actual.has(product))return false;
      actual.set(product,quantity);
    }
    if(actual.size!==expected.size)return false;
    for(const [product,quantity] of expected){if(actual.get(product)!==quantity)return false}
    return true;
  };
  async function verifyCreatedOrder(id,items,{requireComplete=true}={}){
    for(const delay of [0,180,450,900]){
      if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
      try{
        const rows=await api(`orders?id=eq.${encodeURIComponent(id)}&select=id,order_number,restaurant_id,status,order_items(product_id,quantity,unit_price,product_names_snapshot,product_image_snapshot)&limit=1`);
        const row=rows?.[0];
        if(row?.id===id&&(!requireComplete||orderSnapshotMatches(row,items)))return row;
      }catch(error){if(delay===900)throw error}
    }
    return null;
  }
  const incompleteOrderError=()=>{
    const error=new Error(labels(
      'Заказ не подтверждён: не все позиции сохранились. Корзина сохранена — повторите отправку после обновления SQL Panora 6.16.',
      'Order was not confirmed: not all items were saved. Your cart is preserved — retry after applying the Panora 6.16 SQL update.',
      'El pedido no se confirmó: no se guardaron todas las posiciones. Tu carrito se conserva; reintenta después de aplicar la actualización SQL de Panora 6.16.'
    ));
    error.code='PANORA_ORDER_INCOMPLETE';return error;
  };
  const activeProductMap=()=>new Map((PRODUCTS||[]).filter(p=>p&&p.active!==false&&p.storefrontVisible!==false).map(p=>[String(p.id),p]));
  function validateCheckoutItems(items){
    const active=activeProductMap(),valid=[],unavailable=[];
    for(const item of items||[]){
      const product=String(item?.product||'').trim(),quantity=Math.trunc(Number(item?.quantity)||0);
      if(!product||quantity<=0)continue;
      if(!active.has(product)){unavailable.push(product);continue}
      valid.push({product,quantity});
    }
    const count=valid.reduce((sum,item)=>sum+item.quantity,0);
    return{items:valid,count,unavailable:[...new Set(unavailable)]};
  }
  function unavailableCartError(){
    const error=new Error(labels(
      'Один из товаров в корзине больше недоступен. Корзина обновлена — проверьте состав заказа.',
      'One of the products in your cart is no longer available. The cart was refreshed — please review your order.',
      'Uno de los productos de la cesta ya no está disponible. La cesta se ha actualizado; revisa el pedido.'
    ));
    error.code='PANORA_CART_PRODUCT_UNAVAILABLE';return error;
  }
  function purgeUnavailableCart(productIds){
    let changed=false;
    for(const id of productIds||[]){if(Object.prototype.hasOwnProperty.call(cart,id)){delete cart[id];changed=true}}
    if(changed){localStorage.setItem('panora-cart',JSON.stringify(cart));renderCart?.();renderProducts?.()}
    return changed;
  }
  const isOrderNumberConflict=error=>/orders_order_number_key|duplicate key value[^\n]*order_number|key \(order_number\)=/i.test(String(error?.message||error||''));
  const isCreateOrderRpcUnavailable=error=>error?.status===404||/panora_create_order|schema cache|PGRST202|ambiguous|42702/i.test(String(error?.message||error||''));
  async function createOrderWithRecovery(id,date,deliveryDate,items,comment){
    let lastError=null;
    for(let attempt=0;attempt<3;attempt++){
      try{
        const rows=await api('rpc/panora_create_order',{method:'POST',body:JSON.stringify({p_order_id:id,p_bake_date:date,p_delivery_date:deliveryDate,p_items:items,p_comment:comment})});
        const created=rows?.[0]||null;
        const verified=await verifyCreatedOrder(id,items);
        if(verified)return{...created,...verified};
        throw incompleteOrderError();
      }catch(error){
        lastError=error;
        const verified=await verifyCreatedOrder(id,items).catch(()=>null);
        if(verified)return verified;
        if(isCreateOrderRpcUnavailable(error)){
          const rpcError=new Error(labels(
            'Сервер оформления заказа ещё не обновлён. Корзина сохранена — сообщите пекарне и повторите после обновления.',
            'The order server is not updated yet. Your cart is preserved — contact the bakery and try again after the update.',
            'El servidor de pedidos aún no está actualizado. La cesta se conserva; contacte con la panadería y vuelva a intentarlo.'
          ));
          rpcError.code='PANORA_ORDER_RPC_REQUIRED';
          throw rpcError;
        }
        const partial=await verifyCreatedOrder(id,items,{requireComplete:false}).catch(()=>null);
        /* A 6.15 client could leave only the order header. Reusing the same UUID
           makes the server RPC idempotently upsert the missing items instead of
           allocating another order. Never treat the header alone as success. */
        if(partial?.id===id&&partial.status==='submitted'&&attempt<2){
          await new Promise(resolve=>setTimeout(resolve,180*(attempt+1)));
          continue;
        }
        if(isOrderNumberConflict(error)&&attempt<2){
          await new Promise(resolve=>setTimeout(resolve,180*(attempt+1)));
          continue;
        }
        throw error;
      }
    }
    if(isOrderNumberConflict(lastError)){
      const friendly=new Error(labels(
        'Нумерация заказов временно не синхронизирована. Корзина сохранена. Повторите заказ после обновления базы Panora.',
        'Order numbering is temporarily out of sync. Your cart is saved. Retry after the Panora database is updated.',
        'La numeración de pedidos está temporalmente desincronizada. Tu carrito está guardado. Reintenta después de actualizar la base de datos de Panora.'
      ));
      friendly.code='PANORA_ORDER_NUMBER_CONFLICT';friendly.cause=lastError;throw friendly;
    }
    throw lastError||incompleteOrderError();
  }
  const orderAttemptKey=accountId=>`panora-order-attempt-${accountId}`;
  const orderFingerprint=(date,items,comment)=>JSON.stringify({date,items:[...items].sort((a,b)=>String(a.product).localeCompare(String(b.product))),comment:String(comment||'')});
  function orderAttempt(accountId,fingerprint){
    const key=orderAttemptKey(accountId);try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved?.fingerprint===fingerprint&&saved?.id)return saved.id}catch{}
    const id=crypto.randomUUID();localStorage.setItem(key,JSON.stringify({id,fingerprint,createdAt:new Date().toISOString()}));return id
  }
  const form=document.querySelector('#checkoutForm');
  /* Disable app.js' legacy localStorage submit path. Cloud orders are only
     considered successful after panora_create_order commits in Supabase. */
  if(form){form.onsubmit=null;form.noValidate=true}
  form?.addEventListener('submit',async event=>{
    event.preventDefault();event.stopImmediatePropagation();
    /*
     * Customer details belong to the second checkout screen. Never validate
     * phone/address while the basket drawer is still visible.
     */
    const checkoutModal=document.querySelector('#checkoutModal');
    if(!checkoutModal?.classList.contains('open')||checkoutModal.getAttribute('aria-hidden')!=='false'){
      document.querySelector('#checkoutButton')?.click();
      return;
    }
    if(submitting)return;if(!account){openPanel(document.querySelector('#profileModal'));return}
    /* Hidden returning-customer fields must never block mobile checkout. */
    form.restaurant.value=String(form.restaurant.value||account.name||'').trim();
    form.contact.value=String(form.contact.value||account.name||'').trim();
    form.phone.value=String(form.phone.value||(typeof checkoutContactValue==='function'?checkoutContactValue('phone',account.phone):account.phone)||'').trim();
    form.email.value=String(form.email.value||account.email||'').trim();
    const fulfillment=form.fulfillment.value||'delivery';
    form.address.value=String(form.address.value||(typeof checkoutContactValue==='function'?checkoutContactValue('address',account.address):account.address)||'').trim();
    const data=new FormData(form),summary=cartData(),rawItems=summary.rows.map(p=>({product:p.id,quantity:Math.trunc(Number(p.quantityPieces)||0)})).filter(i=>i.quantity>0),checkedItems=validateCheckoutItems(rawItems),items=checkedItems.items,count=checkedItems.count,date=String(data.get('date')||selectedBakeDate||'');
    if(checkedItems.unavailable.length){purgeUnavailableCart(checkedItems.unavailable);return showToast(unavailableCartError().message)}
    const missing=[];
    if(!form.restaurant.value)missing.push(labels('название партнёра','partner name','nombre del socio'));
    if(!form.contact.value)missing.push(labels('контактное лицо','contact person','persona de contacto'));
    if(!form.phone.value)missing.push(labels('телефон','phone','teléfono'));
    if(fulfillment==='delivery'&&!form.address.value)missing.push(labels('адрес доставки','delivery address','dirección de entrega'));
    if(!date)missing.push(labels('дату поставки','delivery date','fecha de entrega'));
    if(missing.length)return showToast(labels(`Заполните: ${missing.join(', ')}`,`Complete: ${missing.join(', ')}`,`Completa: ${missing.join(', ')}`));
    submitting=true;const button=form.querySelector('[type="submit"]');button.disabled=true;state('sending',labels('Отправляем заказ…','Sending order…','Enviando pedido…'));
    if(typeof saveCheckoutProfile==='function')saveCheckoutProfile();
    const nextPhone=String(form.phone.value||'').trim(),nextAddress=String(form.address.value||'').trim();
    const contactChanged=(nextPhone&&nextPhone!==String(account.phone||''))||(nextAddress&&nextAddress!==String(account.address||''));
    try{
      if(contactChanged){
        try{
          await window.panoraRestaurantProfile.save({name:account.name,phone:nextPhone||account.phone,address:nextAddress||account.address,whatsapp:account.whatsapp,telegram:account.telegram,extraMessengers:account.extraMessengers,legalName:account.legalName,taxId:account.taxId,billingAddress:account.billingAddress,language:account.language,partnerType:account.partnerType});
        }catch(profileError){
          /* An outdated profile RPC must not discard checkout data or block
             an otherwise valid order. The v311 draft retries after migration. */
          account={...account,phone:nextPhone||account.phone,address:nextAddress||account.address};
          write('panora-restaurants',[account]);applyAccount();
          window.dispatchEvent(new CustomEvent('panora:profile-save-deferred',{detail:{message:String(profileError?.message||profileError)}}));
        }
        state('sending',labels('Отправляем заказ…','Sending order…','Enviando pedido…'));
      }
      const plan=productionPlans().find(p=>p.bakeDate===date),deliveryDate=plan?.deliveryDate||date,comment=String(data.get('comment')||''),fingerprint=orderFingerprint(date,items,comment),id=orderAttempt(account.id,fingerprint);
      const created=await createOrderWithRecovery(id,date,deliveryDate,items,comment);
      if(!created)throw new Error('Order was not created');
      try{
        await api('rpc/panora_apply_order_tier_prices',{method:'POST',body:JSON.stringify({p_order_id:id})});
      }catch(priceError){
        console.warn('Panora tier price apply',priceError);
        // Direct fallback already stores the correct unit_price. For RPC-created
        // orders the server migration is required; fail visibly rather than save
        // a wholesale price for a retail-sized quantity.
        if(created&&priceError?.status!==404)throw priceError;
        if(created&&priceError?.status===404)throw new Error(labels('Обновите SQL Panora 5.44: правило розничной/оптовой цены ещё не установлено.','Run the Panora 5.44 SQL update: tier pricing is not installed yet.','Ejecuta el SQL de Panora 5.44: aún no está instalada la tarifa por cantidad.'));
      }
      const saved=await verifyCreatedOrder(id,items);
      if(!saved)throw new Error(labels('Заказ сохранён, но не найден при контрольной загрузке','Order saved but was not found during verification','El pedido se guardó, pero no apareció durante la verificación'));
      localStorage.removeItem(orderAttemptKey(account.id));
      /* Contact details are a reusable checkout profile, not order draft data.
         Keep them after success so the next order is prefilled even while a
         delayed profile RPC is still being reconciled with the cloud. */
      saveCheckoutProfile();
      cart={};localStorage.removeItem('panora-cart');await window.panoraFormDrafts?.confirmSaved?.(form);form.reset();closePanels();renderProducts();renderCart();const sentMessage=labels(`Заказ PN-${String(saved.order_number||created.order_number).padStart(4,'0')} отправлен пекарне`,`Order PN-${String(saved.order_number||created.order_number).padStart(4,'0')} sent`,`Pedido PN-${String(saved.order_number||created.order_number).padStart(4,'0')} enviado`);
      showToast(sentMessage);
      state('ok',labels('Синхронизировано','Synced','Sincronizado'));
      try{
        await loadAll(true);
      }catch(refreshError){
        console.warn('Panora order refresh',refreshError);
      }
      // Stay inside the partner workflow after checkout: show the order that
      // has just been created instead of exposing the public home page.
      if(window.panoraOpenPartnerOrder)window.panoraOpenPartnerOrder(id);
      else if(window.panoraOpenPartnerOrders)window.panoraOpenPartnerOrders();
      else{renderAccountModal();openPanel(document.querySelector('#profileModal'))}
    }catch(error){
      if(error?.code==='PANORA_SESSION_EXPIRED'||isInvalidRefreshToken(error)){
        clearBrokenSession(error);
        showToast(labels('Сессия истекла. Войдите снова, корзина сохранена.','Session expired. Sign in again; your cart is saved.','La sesión ha caducado. Inicia sesión de nuevo; el carrito está guardado.'));
      }else{
        const message=String(error?.message||'');
        if(/Product unavailable|Unknown product|inactive product/i.test(message)){
          const checked=validateCheckoutItems(rawItems);purgeUnavailableCart(checked.unavailable);showToast(unavailableCartError().message);
        }
        state('error',labels('Заказ не создан: ','Order failed: ','Error del pedido: ')+error.message);
        showToast(lastState.text);
      }
    }finally{submitting=false;button.disabled=false}
  },true);
  const hash=new URLSearchParams(location.hash.replace(/^#/,''));if(hash.get('access_token')){saveSession({access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token'),expires_at:Math.floor(Date.now()/1000)+Number(hash.get('expires_in')||3600),user:null});history.replaceState(null,'',location.pathname+location.search)}
  session=read(SESSION_KEY);
  (async()=>{try{
    if(session?.access_token&&!session.user){
      try{
        session.user=await fetchJson(`${cfg.url}/auth/v1/user`,{headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${session.access_token}`}});
        saveSession(session);
      }catch(error){
        if(error.status===401){
          try{await refreshSession()}catch(refreshError){if(refreshError?.code==='PANORA_SESSION_EXPIRED')return;throw refreshError}
          if(session?.access_token){
            session.user=await fetchJson(`${cfg.url}/auth/v1/user`,{headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${session.access_token}`}});
            saveSession(session);
          }
        }else throw error;
      }
    }
    if(session?.user){await loadAll(true);setTimeout(()=>openPanel(document.querySelector('#profileModal')),120)}
    else renderAccountModal();
  }catch(error){
    if(error?.code==='PANORA_SESSION_EXPIRED'||isInvalidRefreshToken(error))clearBrokenSession(error);
    else{state('error',error.message);renderAccountModal()}
  }})();
  setInterval(()=>{if(session?.user&&!loadPromise)loadAll().catch(()=>{})},10000);
  window.panoraPortalCloud={load:()=>loadAll(true),refreshOrders:refreshPartnerOrders,refreshPricing:refreshPartnerPricing};
})();
