/* Panora restaurant cloud v2. Supabase is the only source of truth for orders. */
(()=>{
  let partnerOrderPoll=0,partnerOrdersLoading=null;
  'use strict';
  const cfg=window.PANORA_SUPABASE;
  if(!cfg)return;
  const SESSION_KEY='panora-restaurant-cloud-session';
  const APP_URL='https://gamaleyandrey-create.github.io/panora-b2b/';
  let session=null,refreshPromise=null,loadPromise=null,submitting=false,lastState={type:'ok',text:'Соединение установлено'};
  const privateKeys=new Set(['panora-restaurants','panora-orders','panora-delivery-notes','panora-payments']);
  const storageKey=key=>privateKeys.has(key)?`panora-portal-${key.slice(7)}`:key;
  const read=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(storageKey(key))||'null')??fallback}catch{return fallback}};
  const write=(key,value)=>localStorage.setItem(storageKey(key),JSON.stringify(value));
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
  const mapRestaurant=(row,prices)=>({id:row.id,name:row.name,email:row.email,phone:row.phone||'',whatsapp:row.whatsapp||'',telegram:row.telegram||'',extraMessengers:safeMessengers(row.extra_messengers),address:row.address||'',legalName:row.legal_name||'',taxId:row.tax_id||'',billingAddress:row.billing_address||'',language:row.language||'ru',partnerType:normalizePortalPartnerType(row.partner_type),prices:Object.fromEntries(prices.map(x=>[x.product_id,Number(x.price)]))});
  function mapOrder(row){
    let meta={};try{meta=JSON.parse(row.comment||'{}')}catch{meta={comment:row.comment||''}}
    const day=row.bake_days||{},items=row.order_items||[];
    return{id:row.id,number:Number(row.order_number),restaurantId:row.restaurant_id,date:day.bake_date,deliveryDate:meta.deliveryDate||day.delivery_date||day.bake_date,items:items.map(x=>({product:x.product_id,quantity:Number(x.quantity)})),prices:Object.fromEntries(items.map(x=>[x.product_id,Number(x.unit_price)])),taxRate:0,status:row.status,comment:meta.comment||'',cancellationReason:row.cancelled_reason||'',createdAt:row.created_at,statusHistory:[]};
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
      const [restaurantRows,prices,orderRows,notes,payments,days,products,statusEvents]=await Promise.all([
        api(`restaurants?id=eq.${rid}&select=*`),api(`restaurant_prices?restaurant_id=eq.${rid}&select=product_id,price`),api(`orders?restaurant_id=eq.${rid}&select=id,order_number,restaurant_id,status,comment,cancelled_reason,created_at,bake_days(bake_date,delivery_date),order_items(product_id,quantity,unit_price)&order=order_number.asc`),api(`delivery_notes?restaurant_id=eq.${rid}&select=*`),api(`payments?restaurant_id=eq.${rid}&select=*`),api('bake_days?select=id,bake_date,delivery_date,cutoff_at,accepting_orders,bake_items(product_id,planned_quantity)&order=bake_date.asc'),api('rpc/panora_restaurant_catalog',{method:'POST',body:'{}'}),fetchStatusEvents()
      ]);
      if(!restaurantRows?.[0])throw new Error('Partner not found');
      const rpcPrices=Object.fromEntries((products||[]).map(item=>[item.id,Number(item.price)]));
      const own={...mapRestaurant(restaurantRows[0],prices||[]),prices:Object.keys(rpcPrices).length?rpcPrices:mapRestaurant(restaurantRows[0],prices||[]).prices},orders=attachStatusHistory((orderRows||[]).map(mapOrder),statusEvents);
      write('panora-restaurants',[own]);write('panora-orders',orders);
      write('panora-delivery-notes',(notes||[]).map(n=>({id:n.id,number:Number(n.note_number),orderId:n.order_id,restaurantId:n.restaurant_id,date:String(n.delivered_at).slice(0,10),paymentDueDate:n.payment_due_date||'',items:orders.find(o=>o.id===n.order_id)?.items||[],prices:orders.find(o=>o.id===n.order_id)?.prices||{},total:Number(n.total),traysDelivered:Number(n.trays_delivered||0),traysReturned:Number(n.trays_returned||0),trayBalanceAfter:Number(n.tray_balance_after||0),customerTraysReceived:n.customer_trays_received==null?null:Number(n.customer_trays_received),customerTraysReturned:n.customer_trays_returned==null?null:Number(n.customer_trays_returned),qrToken:n.qr_token,customerConfirmedAt:n.customer_confirmed_at||null,customerReceiver:n.customer_receiver||'',offlineProof:n.offline_received_at?{receivedAt:n.offline_received_at,receiver:n.offline_receiver||'',signature:n.offline_signature||'',pending:false}:null})));
      write('panora-payments',(payments||[]).map(p=>({id:p.id,restaurantId:p.restaurant_id,deliveryNoteId:p.delivery_note_id||null,date:String(p.received_at).slice(0,10),receivedAt:p.received_at||null,amount:Number(p.amount),method:p.method,note:p.note||'',confirmed:p.status!=='cancelled',status:p.status,disputeStatus:p.dispute_status||'none',disputeReason:p.dispute_reason||'',disputedAt:p.disputed_at||null,disputeDeadline:p.dispute_deadline||null,recordedBy:p.recorded_by||p.confirmed_by||null})));
      write('panora-production-plans',(days||[]).flatMap(d=>(d.bake_items||[]).map(i=>({id:`${d.id}:${i.product_id}`,bakeDayId:d.id,bakeDate:d.bake_date,deliveryDate:d.delivery_date,product:i.product_id,planned:Number(i.planned_quantity),ordered:orders.filter(o=>o.date===d.bake_date&&o.status!=='cancelled').flatMap(o=>o.items).filter(x=>x.product===i.product_id).reduce((s,x)=>s+x.quantity,0),cutoff:d.cutoff_at,open:d.accepting_orders}))));
      if(products?.length)localStorage.setItem('panora-partner-products',JSON.stringify(products.map(p=>({id:p.id,builtIn:['plain','pumpkin'].includes(p.id),active:p.active,weight:Number(p.weight_g),image:p.image_url||'icon.svg',names:{ru:p.name_ru,en:p.name_en,es:p.name_es},descriptions:{ru:p.description_ru||'',en:p.description_en||'',es:p.description_es||''}}))));
      account=own;localStorage.setItem('panora-account-id',own.id);applyAccount();window.dispatchEvent(new CustomEvent('panora:products-changed'));
      const active=document.activeElement;
      const editingWorkspace=Boolean(active&&active.closest?.("#restaurantWorkspace")&&["INPUT","TEXTAREA","SELECT"].includes(active.tagName));
      if(!editingWorkspace)renderAccountModal();
      renderProducts();renderCart();window.dispatchEvent(new CustomEvent('panora:partner-data-updated'));startPartnerOrderPolling();startPartnerPricingPolling();state('ok',labels('Синхронизировано','Synced','Sincronizado'));return orders;
    })().catch(error=>{state('error',error.message);throw error}).finally(()=>loadPromise=null);
    return loadPromise;
  }
  async function refreshPartnerOrders(){
    if(partnerOrdersLoading)return partnerOrdersLoading;
    if(!session?.user?.id||!account?.id||!navigator.onLine)return [];
    partnerOrdersLoading=(async()=>{
      const rows=await api(`orders?restaurant_id=eq.${encodeURIComponent(account.id)}&select=id,order_number,restaurant_id,status,comment,cancelled_reason,created_at,bake_days(bake_date,delivery_date),order_items(product_id,quantity,unit_price)&order=order_number.asc`);
      const next=(rows||[]).map(mapOrder);
      const previous=read('panora-orders')||[];
      const comparable=order=>({
        id:order.id,number:order.number,restaurantId:order.restaurantId,date:order.date,
        deliveryDate:order.deliveryDate,items:order.items,prices:order.prices,taxRate:order.taxRate,
        status:order.status,comment:order.comment||'',cancellationReason:order.cancellationReason||'',
        createdAt:order.createdAt
      });
      const before=JSON.stringify(previous.map(comparable));
      const after=JSON.stringify(next.map(comparable));
      if(before!==after){
        const previousById=new Map(previous.map(order=>[order.id,order.status]));
        const changed=next.filter(order=>previousById.get(order.id)!==order.status).map(order=>({id:order.id,status:order.status}));
        const eventRows=changed.length?await fetchStatusEvents():[];
        const enriched=changed.length?attachStatusHistory(next,eventRows):next.map(order=>({...order,statusHistory:previous.find(old=>old.id===order.id)?.statusHistory||[]}));
        write('panora-orders',enriched);
        const active=document.activeElement;
        const editingWorkspace=Boolean(active&&active.closest?.("#restaurantWorkspace")&&["INPUT","TEXTAREA","SELECT"].includes(active.tagName));
        if(!editingWorkspace)renderAccountModal();
        window.dispatchEvent(new CustomEvent('panora:partner-orders-updated',{detail:{count:next.length,changed}}));
        if(changed.some(change=>change.status==='shipped')){
          setTimeout(()=>loadAll(true).catch(()=>{}),80);
        }
      }
      state('ok',labels('Синхронизировано','Synced','Sincronizado'));
      return next;
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
      const [prices,products]=await Promise.all([
        api(`restaurant_prices?restaurant_id=eq.${encodeURIComponent(account.id)}&select=product_id,price`).catch(()=>[]),
        api('rpc/panora_restaurant_catalog',{method:'POST',body:'{}'})
      ]);
      const rpcPrices=Object.fromEntries((products||[]).map(item=>[item.id,Number(item.price)]));
      const directPrices=Object.fromEntries((prices||[]).map(item=>[item.product_id,Number(item.price)]));
      const nextPrices=Object.keys(rpcPrices).length?rpcPrices:directPrices;
      const priceChanged=JSON.stringify(account.prices||{})!==JSON.stringify(nextPrices);
      if(priceChanged){
        account={...account,prices:nextPrices};
        write('panora-restaurants',[account]);
        try{renderAccountModal()}catch{}
      }
      if(products?.length){
        const nextProducts=products.map(p=>({id:p.id,builtIn:['plain','pumpkin'].includes(p.id),active:p.active,weight:Number(p.weight_g),image:p.image_url||'icon.svg',names:{ru:p.name_ru,en:p.name_en,es:p.name_es},descriptions:{ru:p.description_ru||'',en:p.description_en||'',es:p.description_es||''}}));
        const before=localStorage.getItem('panora-partner-products')||'[]',after=JSON.stringify(nextProducts);
        if(before!==after)localStorage.setItem('panora-partner-products',after);
      }
      if(priceChanged||products?.length){
        if(typeof refreshRestaurantProducts==='function')refreshRestaurantProducts();
        else applyAccount();
        renderAccountModal();
        renderProducts();
        renderCart();
        window.dispatchEvent(new CustomEvent('panora:partner-pricing-updated',{detail:{priceChanged,productCount:products?.length||0}}));
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
    const editingWorkspace=Boolean(active&&active.closest?.("#restaurantWorkspace")&&["INPUT","TEXTAREA","SELECT"].includes(active.tagName));
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
  window.panoraRestaurantProfile={save:async details=>{
    if(!account)throw new Error(labels('Войдите в кабинет партнёра','Sign in to the partner account','Inicia sesión en el área del socio'));
    if(!navigator.onLine)throw new Error(labels('Для сохранения профиля подключитесь к интернету','Connect to the internet to save your profile','Conéctate a internet para guardar el perfil'));
    const patch={name:String(details.name||'').trim().slice(0,120),phone:String(details.phone||'').trim().slice(0,30),address:String(details.address||'').trim().slice(0,300),whatsapp:String(details.whatsapp||'').trim().slice(0,30)||null,telegram:String(details.telegram||'').trim().slice(0,120)||null,extra_messengers:safeMessengers(details.extraMessengers),legal_name:String(details.legalName||'').trim().slice(0,180)||null,tax_id:String(details.taxId||'').trim().toUpperCase().slice(0,25)||null,billing_address:String(details.billingAddress||'').trim().slice(0,300)||null,language:['ru','en','es'].includes(details.language)?details.language:'ru',partner_type:['restaurant','shop','hotel','cafe','catering','other'].includes(details.partnerType)?details.partnerType:'other',updated_at:new Date().toISOString()};
    if(!patch.name||!patch.phone||!patch.address)throw new Error(labels('Заполните обязательные поля','Complete the required fields','Completa los campos obligatorios'));
    state('sending',labels('Сохраняем профиль…','Saving profile…','Guardando perfil…'));
    await api('rpc/panora_update_partner_profile',{method:'POST',body:JSON.stringify({p_name:patch.name,p_phone:patch.phone,p_address:patch.address,p_whatsapp:patch.whatsapp,p_telegram:patch.telegram,p_extra_messengers:patch.extra_messengers,p_legal_name:patch.legal_name,p_tax_id:patch.tax_id,p_billing_address:patch.billing_address,p_language:patch.language,p_partner_type:patch.partner_type})});
    account={...account,...patch,partnerType:patch.partner_type,whatsapp:patch.whatsapp||'',telegram:patch.telegram||'',extraMessengers:patch.extra_messengers,legalName:patch.legal_name||'',taxId:patch.tax_id||'',billingAddress:patch.billing_address||''};delete account.partner_type;delete account.extra_messengers;delete account.legal_name;delete account.tax_id;delete account.billing_address;write('panora-restaurants',[account]);applyAccount();window.dispatchEvent(new CustomEvent('panora:partner-data-updated'));state('ok',labels('Профиль сохранён','Profile saved','Perfil guardado'));return account;
  }};
  async function createOrderDirect(id,date,deliveryDate,items,comment){
    const plan=productionPlans().find(p=>p.bakeDate===date&&p.bakeDayId);
    if(!plan?.bakeDayId)throw new Error(labels('День выпечки не найден в облаке','Bake day was not found in the cloud','No se encontró el día de horneado'));
    const rows=await api('orders',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({id,restaurant_id:account.id,bake_day_id:plan.bakeDayId,status:'submitted',comment:JSON.stringify({deliveryDate,taxRate:0,comment}),created_by:session.user.id})});
    const created=rows?.[0];if(!created)throw new Error(labels('Supabase не вернул созданный заказ','Supabase did not return the created order','Supabase no devolvió el pedido creado'));
    await api('order_items',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(items.map(item=>({order_id:id,product_id:item.product,quantity:item.quantity,unit_price:Number(account.prices[item.product])}))) });
    return created;
  }
  async function verifyCreatedOrder(id){
    for(const delay of [0,180,450,900]){
      if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
      try{
        const rows=await api(`orders?id=eq.${encodeURIComponent(id)}&select=id,order_number,status&limit=1`);
        if(rows?.[0]?.id===id)return rows[0];
      }catch(error){if(delay===900)throw error}
    }
    return null;
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
    const data=new FormData(form),summary=cartData(),items=summary.rows.map(p=>({product:p.id,quantity:Number(p.quantityPieces)})).filter(i=>i.quantity>0),count=items.reduce((s,i)=>s+i.quantity,0),date=String(data.get('date')||selectedBakeDate||'');
    const missing=[];
    if(!form.restaurant.value)missing.push(labels('название партнёра','partner name','nombre del socio'));
    if(!form.contact.value)missing.push(labels('контактное лицо','contact person','persona de contacto'));
    if(!form.phone.value)missing.push(labels('телефон','phone','teléfono'));
    if(fulfillment==='delivery'&&!form.address.value)missing.push(labels('адрес доставки','delivery address','dirección de entrega'));
    if(!date)missing.push(labels('дату поставки','delivery date','fecha de entrega'));
    if(missing.length)return showToast(labels(`Заполните: ${missing.join(', ')}`,`Complete: ${missing.join(', ')}`,`Completa: ${missing.join(', ')}`));
    if(count<MIN_PIECES)return showToast(labels(`Минимальный заказ — ${MIN_PIECES} шт.`,`Minimum order is ${MIN_PIECES} pcs.`,`Pedido mínimo: ${MIN_PIECES} uds.`));
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
      const plan=productionPlans().find(p=>p.bakeDate===date),deliveryDate=plan?.deliveryDate||date,comment=String(data.get('comment')||''),fingerprint=orderFingerprint(date,items,comment),id=orderAttempt(account.id,fingerprint);let created;
      try{const rows=await api('rpc/panora_create_order',{method:'POST',body:JSON.stringify({p_order_id:id,p_bake_date:date,p_delivery_date:deliveryDate,p_items:items,p_comment:comment})});created=rows?.[0]}
      catch(error){const unusableRpc=error.status===404||/panora_create_order|schema cache|PGRST202|ambiguous|42702/i.test(error.message);if(!unusableRpc)throw error;created=await createOrderDirect(id,date,deliveryDate,items,comment)}
      if(!created)throw new Error('Order was not created');
      const saved=await verifyCreatedOrder(id);
      if(!saved)throw new Error(labels('Заказ сохранён, но не найден при контрольной загрузке','Order saved but was not found during verification','El pedido se guardó, pero no apareció durante la verificación'));
      localStorage.removeItem(orderAttemptKey(account.id));
      /* Contact details are a reusable checkout profile, not order draft data.
         Keep them after success so the next order is prefilled even while a
         delayed profile RPC is still being reconciled with the cloud. */
      saveCheckoutProfile();
      cart={};localStorage.removeItem('panora-cart');await window.panoraFormDrafts?.confirmSaved?.(form);form.reset();closePanels();renderProducts();renderCart();renderAccountModal();const sentMessage=labels(`Заказ PN-${String(saved.order_number||created.order_number).padStart(4,'0')} отправлен пекарне`,`Order PN-${String(saved.order_number||created.order_number).padStart(4,'0')} sent`,`Pedido PN-${String(saved.order_number||created.order_number).padStart(4,'0')} enviado`);
      showToast(sentMessage);
      state('ok',labels('Синхронизировано','Synced','Sincronizado'));
      loadAll(true).catch(error=>console.warn('Panora order refresh',error));
    }catch(error){
      if(error?.code==='PANORA_SESSION_EXPIRED'||isInvalidRefreshToken(error)){
        clearBrokenSession(error);
        showToast(labels('Сессия истекла. Войдите снова, корзина сохранена.','Session expired. Sign in again; your cart is saved.','La sesión ha caducado. Inicia sesión de nuevo; el carrito está guardado.'));
      }else{
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
