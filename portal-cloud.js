/* Panora restaurant cloud v2. Supabase is the only source of truth for orders. */
(()=>{
  'use strict';
  const cfg=window.PANORA_SUPABASE;
  if(!cfg)return;
  const SESSION_KEY='panora-restaurant-cloud-session';
  const APP_URL='https://gamaleyandrey-create.github.io/panora-b2b/';
  let session=null,refreshPromise=null,loadPromise=null,submitting=false,lastState={type:'ok',text:'Соединение установлено'};
  const read=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const saveSession=value=>{session=value;if(value)write(SESSION_KEY,value);else localStorage.removeItem(SESSION_KEY)};
  const labels=(ru,en,es)=>lang==='es'?es:lang==='en'?en:ru;
  async function fetchJson(url,options={}){
    const response=await fetch(url,{cache:'no-store',...options}),text=await response.text();
    if(!response.ok){let message=text;try{const body=JSON.parse(text);message=body.message||body.msg||body.error_description||body.error||text}catch{}const error=new Error(message||`HTTP ${response.status}`);error.status=response.status;throw error}
    return text?JSON.parse(text):null;
  }
  async function refreshSession(){
    if(refreshPromise)return refreshPromise;
    if(!session?.refresh_token)throw new Error(labels('Войдите снова','Sign in again','Inicia sesión de nuevo'));
    refreshPromise=fetchJson(`${cfg.url}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})}).then(next=>{saveSession(next);return next}).finally(()=>refreshPromise=null);
    return refreshPromise;
  }
  async function ensureSession(){if(!session?.access_token)throw new Error(labels('Войдите в кабинет ресторана','Sign in to the restaurant account','Inicia sesión'));if(session.expires_at&&Date.now()>Number(session.expires_at)*1000-60000)await refreshSession()}
  async function api(path,options={},retry=true){
    await ensureSession();
    try{return await fetchJson(`${cfg.url}/rest/v1/${path}`,{...options,headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json','Cache-Control':'no-cache',...(options.headers||{})}})}
    catch(error){if(error.status===401&&retry){await refreshSession();return api(path,options,false)}throw error}
  }
  function state(type,text){lastState={type,text};decorateState()}
  function decorateState(){
    if(!account)return;const modal=document.querySelector('#profileModal'),anchor=modal?.querySelector('.account-section');if(!anchor)return;
    let box=modal.querySelector('#restaurantCloudState');if(!box){box=document.createElement('section');box.id='restaurantCloudState';box.className='account-section';anchor.before(box)}
    box.innerHTML=`<h3>${labels('Облако','Cloud','Nube')}</h3><p style="color:${lastState.type==='error'?'#a5443c':'#42684d'};overflow-wrap:anywhere">${lastState.text}</p>${lastState.type==='error'?`<button type="button" class="button button-ghost full" id="cloudReload">${labels('Повторить','Retry','Reintentar')}</button>`:''}`;
    box.querySelector('#cloudReload')?.addEventListener('click',()=>loadAll(true));
  }
  const mapRestaurant=(row,prices)=>({id:row.id,name:row.name,email:row.email,phone:row.phone||'',telegram:row.telegram||'',address:row.address||'',language:row.language||'ru',prices:Object.fromEntries(prices.map(x=>[x.product_id,Number(x.price)]))});
  function mapOrder(row){
    let meta={};try{meta=JSON.parse(row.comment||'{}')}catch{meta={comment:row.comment||''}}
    const day=row.bake_days||{},items=row.order_items||[];
    return{id:row.id,number:Number(row.order_number),restaurantId:row.restaurant_id,date:day.bake_date,deliveryDate:meta.deliveryDate||day.delivery_date||day.bake_date,items:items.map(x=>({product:x.product_id,quantity:Number(x.quantity)})),prices:Object.fromEntries(items.map(x=>[x.product_id,Number(x.unit_price)])),taxRate:0,status:row.status,comment:meta.comment||'',cancellationReason:row.cancelled_reason||'',createdAt:row.created_at};
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
      if(!profile||profile.role!=='restaurant'||!profile.restaurant_id)throw new Error(labels('Email не связан с карточкой ресторана','Email is not linked to a restaurant','El email no está vinculado al restaurante'));
      const rid=profile.restaurant_id;
      const [restaurantRows,prices,orderRows,notes,payments,days,products]=await Promise.all([
        api(`restaurants?id=eq.${rid}&select=*`),api(`restaurant_prices?restaurant_id=eq.${rid}&select=product_id,price`),api(`orders?restaurant_id=eq.${rid}&select=id,order_number,restaurant_id,status,comment,cancelled_reason,created_at,bake_days(bake_date,delivery_date),order_items(product_id,quantity,unit_price)&order=order_number.asc`),api(`delivery_notes?restaurant_id=eq.${rid}&select=*`),api(`payments?restaurant_id=eq.${rid}&select=*`),api('bake_days?select=id,bake_date,delivery_date,cutoff_at,accepting_orders,bake_items(product_id,planned_quantity)&order=bake_date.asc'),api('products?select=*&active=eq.true&order=created_at.asc')
      ]);
      if(!restaurantRows?.[0])throw new Error('Restaurant not found');
      const own=mapRestaurant(restaurantRows[0],prices||[]),orders=(orderRows||[]).map(mapOrder);
      write('panora-restaurants',[own]);write('panora-orders',orders);
      write('panora-delivery-notes',(notes||[]).map(n=>({id:n.id,number:Number(n.note_number),orderId:n.order_id,restaurantId:n.restaurant_id,date:String(n.delivered_at).slice(0,10),items:orders.find(o=>o.id===n.order_id)?.items||[],prices:orders.find(o=>o.id===n.order_id)?.prices||{},total:Number(n.total),qrToken:n.qr_token,customerConfirmedAt:n.customer_confirmed_at||null,customerReceiver:n.customer_receiver||''})));
      write('panora-payments',(payments||[]).map(p=>({id:p.id,restaurantId:p.restaurant_id,deliveryNoteId:p.delivery_note_id||null,date:String(p.received_at).slice(0,10),amount:Number(p.amount),method:p.method,note:p.note||'',confirmed:p.status==='confirmed',status:p.status})));
      write('panora-production-plans',(days||[]).flatMap(d=>(d.bake_items||[]).map(i=>({id:`${d.id}:${i.product_id}`,bakeDayId:d.id,bakeDate:d.bake_date,deliveryDate:d.delivery_date,product:i.product_id,planned:Number(i.planned_quantity),ordered:orders.filter(o=>o.date===d.bake_date&&o.status!=='cancelled').flatMap(o=>o.items).filter(x=>x.product===i.product_id).reduce((s,x)=>s+x.quantity,0),cutoff:d.cutoff_at,open:d.accepting_orders}))));
      if(products?.length)write('panora-products',products.map(p=>({id:p.id,builtIn:['plain','pumpkin'].includes(p.id),active:p.active,weight:Number(p.weight_g),basePrice:Number(p.base_price),image:p.image_url||'icon.svg',names:{ru:p.name_ru,en:p.name_en,es:p.name_es},descriptions:{ru:p.description_ru||'',en:p.description_en||'',es:p.description_es||''}})));
      account=own;localStorage.setItem('panora-account-id',own.id);applyAccount();renderAccountModal();decorateState();renderProducts();renderCart();return orders;
    })().catch(error=>{state('error',error.message);throw error}).finally(()=>loadPromise=null);
    return loadPromise;
  }
  async function signIn(email,password,signup=false){
    const path=signup?`/auth/v1/signup?redirect_to=${encodeURIComponent(APP_URL)}`:'/auth/v1/token?grant_type=password',body={email,password,...(signup?{data:{display_name:email}}:{})};
    const result=await fetchJson(`${cfg.url}${path}`,{method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},body:JSON.stringify(body)}),next=result.access_token?result:result.session;
    if(!next)throw new Error(labels('Подтвердите email по новому письму','Confirm your email','Confirma tu email'));
    saveSession(next);await loadAll(true);
  }
  loginAccount=async event=>{
    event.preventDefault();const form=event.currentTarget,data=new FormData(form),button=form.querySelector('button');button.disabled=true;
    try{await signIn(String(data.get('email')).trim().toLowerCase(),String(data.get('code')),false);closePanels();showToast(account.name)}catch(error){const el=document.querySelector('#accountError');el.textContent=error.message;el.classList.add('show')}finally{button.disabled=false}
  };
  const legacyRender=renderAccountModal;
  renderAccountModal=function(){
    legacyRender();if(account){decorateState();return}
    const form=document.querySelector('#accountLogin');if(!form)return;form.onsubmit=loginAccount;const input=form.elements.code;input.type='password';input.minLength=6;
    if(!form.querySelector('[data-cloud-signup]')){const button=document.createElement('button');button.type='button';button.className='button button-ghost full';button.dataset.cloudSignup='';button.textContent=labels('Первый вход — создать пароль','First sign-in — create password','Primer acceso — crear contraseña');button.onclick=async()=>{const data=new FormData(form);try{await signIn(String(data.get('email')).trim().toLowerCase(),String(data.get('code')),true);closePanels()}catch(error){const el=document.querySelector('#accountError');el.textContent=error.message;el.classList.add('show')}};form.append(button)}
  };
  const legacyLogout=logoutAccount;
  logoutAccount=async()=>{try{if(session)await fetch(`${cfg.url}/auth/v1/logout`,{method:'POST',headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${session.access_token}`}})}catch{}saveSession(null);legacyLogout()};
  restaurantCancelOrder=async id=>{try{await api(`orders?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'cancelled',cancelled_reason:'Cancelled by restaurant',updated_at:new Date().toISOString()})});await loadAll(true);state('ok',labels('Заказ отменён','Order cancelled','Pedido cancelado'))}catch(error){state('error',error.message)}};
  async function createOrderDirect(id,date,deliveryDate,items,comment){
    const plan=productionPlans().find(p=>p.bakeDate===date&&p.bakeDayId);
    if(!plan?.bakeDayId)throw new Error(labels('День выпечки не найден в облаке','Bake day was not found in the cloud','No se encontró el día de horneado'));
    const rows=await api('orders',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({id,restaurant_id:account.id,bake_day_id:plan.bakeDayId,status:'submitted',comment:JSON.stringify({deliveryDate,taxRate:0,comment}),created_by:session.user.id})});
    const created=rows?.[0];if(!created)throw new Error(labels('Supabase не вернул созданный заказ','Supabase did not return the created order','Supabase no devolvió el pedido creado'));
    await api('order_items',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(items.map(item=>({order_id:id,product_id:item.product,quantity:item.quantity,unit_price:Number(account.prices[item.product])}))) });
    return created;
  }
  const form=document.querySelector('#checkoutForm');
  /* Disable app.js' legacy localStorage submit path. Cloud orders are only
     considered successful after panora_create_order commits in Supabase. */
  if(form){form.onsubmit=null;form.noValidate=true}
  form?.addEventListener('submit',async event=>{
    event.preventDefault();event.stopImmediatePropagation();
    if(submitting)return;if(!account){openPanel(document.querySelector('#profileModal'));return}
    /* Hidden returning-customer fields must never block mobile checkout. */
    form.restaurant.value=String(form.restaurant.value||account.name||'').trim();
    form.contact.value=String(form.contact.value||account.name||'').trim();
    form.phone.value=String(form.phone.value||account.phone||'').trim();
    form.email.value=String(form.email.value||account.email||'').trim();
    const fulfillment=form.fulfillment.value||'delivery';
    if(fulfillment==='delivery')form.address.value=String(form.address.value||account.address||'').trim();
    const data=new FormData(form),summary=cartData(),items=summary.rows.map(p=>({product:p.id,quantity:Number(p.quantityPieces)})).filter(i=>i.quantity>0),count=items.reduce((s,i)=>s+i.quantity,0),date=String(data.get('date')||selectedBakeDate||'');
    const missing=[];
    if(!form.restaurant.value)missing.push(labels('название ресторана','restaurant name','nombre del restaurante'));
    if(!form.contact.value)missing.push(labels('контактное лицо','contact person','persona de contacto'));
    if(!form.phone.value)missing.push(labels('телефон','phone','teléfono'));
    if(fulfillment==='delivery'&&!form.address.value)missing.push(labels('адрес доставки','delivery address','dirección de entrega'));
    if(!date)missing.push(labels('дату поставки','delivery date','fecha de entrega'));
    if(missing.length)return showToast(labels(`Заполните: ${missing.join(', ')}`,`Complete: ${missing.join(', ')}`,`Completa: ${missing.join(', ')}`));
    if(count<MIN_PIECES)return showToast(labels(`Минимальный заказ — ${MIN_PIECES} шт.`,`Minimum order is ${MIN_PIECES} pcs.`,`Pedido mínimo: ${MIN_PIECES} uds.`));
    submitting=true;const button=form.querySelector('[type="submit"]');button.disabled=true;state('sending',labels('Отправляем заказ…','Sending order…','Enviando pedido…'));
    try{
      const id=crypto.randomUUID(),plan=productionPlans().find(p=>p.bakeDate===date),deliveryDate=plan?.deliveryDate||date,comment=String(data.get('comment')||'');let created;
      try{const rows=await api('rpc/panora_create_order',{method:'POST',body:JSON.stringify({p_order_id:id,p_bake_date:date,p_delivery_date:deliveryDate,p_items:items,p_comment:comment})});created=rows?.[0]}
      catch(error){const unusableRpc=error.status===404||/panora_create_order|schema cache|PGRST202|ambiguous|42702/i.test(error.message);if(!unusableRpc)throw error;created=await createOrderDirect(id,date,deliveryDate,items,comment)}
      if(!created)throw new Error('Order was not created');
      const fresh=await loadAll(true),saved=fresh.find(order=>order.id===id);
      if(!saved)throw new Error(labels('Заказ сохранён, но не найден при контрольной загрузке','Order saved but was not found during verification','El pedido se guardó, pero no apareció durante la verificación'));
      cart={};localStorage.removeItem('panora-cart');closePanels();renderProducts();renderCart();renderAccountModal();state('ok',labels(`Заказ PN-${String(created.order_number).padStart(4,'0')} отправлен пекарне`,`Order PN-${String(created.order_number).padStart(4,'0')} sent`,`Pedido PN-${String(created.order_number).padStart(4,'0')} enviado`));showToast(lastState.text);
    }catch(error){state('error',labels('Заказ не создан: ','Order failed: ','Error del pedido: ')+error.message);showToast(lastState.text)}finally{submitting=false;button.disabled=false}
  },true);
  const hash=new URLSearchParams(location.hash.replace(/^#/,''));if(hash.get('access_token')){saveSession({access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token'),expires_at:Math.floor(Date.now()/1000)+Number(hash.get('expires_in')||3600),user:null});history.replaceState(null,'',location.pathname+location.search)}
  session=read(SESSION_KEY);
  (async()=>{try{if(session?.access_token&&!session.user){session.user=await fetchJson(`${cfg.url}/auth/v1/user`,{headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${session.access_token}`}});saveSession(session)}if(session?.user)await loadAll(true);else renderAccountModal()}catch(error){state('error',error.message);renderAccountModal()}})();
  setInterval(()=>{if(session?.user&&!loadPromise)loadAll().catch(()=>{})},10000);
  window.panoraPortalCloud={load:()=>loadAll(true)};
})();
