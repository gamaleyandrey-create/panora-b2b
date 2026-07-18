(()=>{
  const cfg=window.PANORA_SUPABASE;
  if(!cfg)return;
  const SESSION_KEY='panora-restaurant-cloud-session';
  let session=null,uploading=false;
  const readSession=()=>{try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}};
  const saveSession=value=>{session=value;if(value)localStorage.setItem(SESSION_KEY,JSON.stringify(value));else localStorage.removeItem(SESSION_KEY)};
  const authHeaders=()=>({apikey:cfg.publishableKey,Authorization:`Bearer ${session?.access_token||''}`,'Content-Type':'application/json'});
  async function jsonFetch(url,options={}){
    const response=await fetch(url,options),text=await response.text();
    if(!response.ok){let message=text;try{const body=JSON.parse(text);message=body.msg||body.message||body.error_description||body.error||text}catch{}throw new Error(message||`HTTP ${response.status}`)}
    return text?JSON.parse(text):null;
  }
  const rest=(path,options={})=>jsonFetch(`${cfg.url}/rest/v1/${path}`,{...options,headers:{...authHeaders(),...(options.headers||{})}});
  async function authenticate(email,password,signup=false){
    const pendingLocal=typeof portalOrders==='function'?portalOrders().filter(o=>o.status==='submitted'):[];
    const path=signup?'/auth/v1/signup':'/auth/v1/token?grant_type=password';
    const body=signup?{email,password,data:{display_name:email}}:{email,password};
    const data=await jsonFetch(`${cfg.url}${path}`,{method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const next=data.access_token?data:data.session;
    if(!next){throw new Error(lang==='ru'?'Подтвердите email по письму, затем войдите.':lang==='es'?'Confirma el email y después inicia sesión.':'Confirm the email, then sign in.')}
    saveSession(next);await hydrate();
    for(const order of pendingLocal.filter(o=>o.restaurantId===account?.id&&!portalOrders().some(remote=>remote.id===o.id)))await uploadOrder(order);
    return next;
  }
  function mapRestaurant(row,prices){return{id:row.id,name:row.name,email:row.email,phone:row.phone||'',telegram:row.telegram||'',address:row.address||'',language:row.language||'ru',prices:Object.fromEntries(prices.map(x=>[x.product_id,Number(x.price)]))}}
  function mapOrder(row){
    let meta={};try{meta=JSON.parse(row.comment||'{}')}catch{meta={comment:row.comment||''}}
    const day=row.bake_days||{},items=row.order_items||[];
    return{id:row.id,number:Number(row.order_number),restaurantId:row.restaurant_id,date:day.bake_date,deliveryDate:meta.deliveryDate||day.delivery_date||day.bake_date,items:items.map(x=>({product:x.product_id,quantity:Number(x.quantity)})),prices:Object.fromEntries(items.map(x=>[x.product_id,Number(x.unit_price)])),taxRate:Number(meta.taxRate||0),status:row.status,comment:meta.comment||'',cancellationReason:row.cancelled_reason||'',createdAt:row.created_at};
  }
  async function hydrate(){
    if(!session?.access_token)return false;
    const uid=session.user?.id;
    const profiles=await rest(`profiles?id=eq.${encodeURIComponent(uid)}&select=restaurant_id,role`);
    const profile=profiles?.[0];
    if(!profile||profile.role!=='restaurant'||!profile.restaurant_id)throw new Error(lang==='ru'?'Этот email ещё не привязан к ресторану. Сначала добавьте его в разделе «Рестораны и цены».':lang==='es'?'Este email todavía no está vinculado a un restaurante.':'This email is not linked to a restaurant yet.');
    const restaurantId=profile.restaurant_id;
    const [restaurantRows,prices,orders,notes,payments,days,products]=await Promise.all([
      rest(`restaurants?id=eq.${restaurantId}&select=*`),rest(`restaurant_prices?restaurant_id=eq.${restaurantId}&select=product_id,price`),rest(`orders?restaurant_id=eq.${restaurantId}&select=id,order_number,restaurant_id,status,comment,cancelled_reason,created_at,bake_days(bake_date,delivery_date),order_items(product_id,quantity,unit_price)&order=order_number.asc`),rest(`delivery_notes?restaurant_id=eq.${restaurantId}&select=*`),rest(`payments?restaurant_id=eq.${restaurantId}&select=*`),rest('bake_days?select=id,bake_date,delivery_date,cutoff_at,accepting_orders,bake_items(product_id,planned_quantity)&order=bake_date.asc'),rest('products?select=*&active=eq.true&order=created_at.asc')
    ]);
    const own=mapRestaurant(restaurantRows[0],prices||[]),mappedOrders=(orders||[]).map(mapOrder);
    localStorage.setItem('panora-restaurants',JSON.stringify([own]));localStorage.setItem('panora-orders',JSON.stringify(mappedOrders));
    localStorage.setItem('panora-delivery-notes',JSON.stringify((notes||[]).map(n=>({id:n.id,number:Number(n.note_number),orderId:n.order_id,restaurantId:n.restaurant_id,date:String(n.delivered_at).slice(0,10),items:mappedOrders.find(o=>o.id===n.order_id)?.items||[],prices:mappedOrders.find(o=>o.id===n.order_id)?.prices||{},total:Number(n.total),qrToken:n.qr_token,customerConfirmedAt:n.customer_confirmed_at||null,customerReceiver:n.customer_receiver||''}))));
    localStorage.setItem('panora-payments',JSON.stringify((payments||[]).map(p=>({id:p.id,restaurantId:p.restaurant_id,deliveryNoteId:p.delivery_note_id||null,date:String(p.received_at).slice(0,10),amount:Number(p.amount),method:p.method,note:p.note||'',confirmed:p.status==='confirmed',status:p.status}))));
    localStorage.setItem('panora-production-plans',JSON.stringify((days||[]).flatMap(d=>(d.bake_items||[]).map(i=>({id:`${d.id}:${i.product_id}`,bakeDayId:d.id,bakeDate:d.bake_date,deliveryDate:d.delivery_date,product:i.product_id,planned:Number(i.planned_quantity),ordered:mappedOrders.filter(o=>o.date===d.bake_date&&!['cancelled'].includes(o.status)).flatMap(o=>o.items).filter(i2=>i2.product===i.product_id).reduce((s,i2)=>s+i2.quantity,0),cutoff:d.cutoff_at,open:d.accepting_orders})))));
    if(products?.length)localStorage.setItem('panora-products',JSON.stringify(products.map(p=>({id:p.id,builtIn:['plain','pumpkin'].includes(p.id),active:p.active,weight:Number(p.weight_g),basePrice:Number(p.base_price),image:p.image_url||'icon.svg',names:{ru:p.name_ru,en:p.name_en,es:p.name_es},descriptions:{ru:p.description_ru||'',en:p.description_en||'',es:p.description_es||''}}))));
    account=own;localStorage.setItem('panora-account-id',own.id);applyAccount();if(typeof refreshRestaurantData==='function')refreshRestaurantData();return true;
  }
  async function uploadOrder(order){
    if(!session?.access_token||!order||uploading)return;
    uploading=true;
    try{
      const existing=await rest(`orders?id=eq.${encodeURIComponent(order.id)}&select=id`);if(existing?.length){await hydrate();return}
      const days=await rest(`bake_days?bake_date=eq.${encodeURIComponent(order.date)}&select=id,delivery_date`),day=days?.[0];
      if(!day)throw new Error(lang==='ru'?'День выпечки отсутствует в облачном плане.':lang==='es'?'El día de horneado no existe en el plan.':'Bake day is missing from the cloud plan.');
      const meta=JSON.stringify({deliveryDate:order.deliveryDate||day.delivery_date||order.date,taxRate:Number(order.taxRate||0),comment:order.comment||''});
      const rows=await rest('orders',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({id:order.id,restaurant_id:account.id,bake_day_id:day.id,status:'submitted',comment:meta,created_by:session.user.id})}),created=rows?.[0];
      if(!created)throw new Error('Заказ не создан');
      await rest('order_items',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(order.items.map(i=>({order_id:order.id,product_id:i.product,quantity:Number(i.quantity),unit_price:Number(order.prices?.[i.product]??account.prices?.[i.product]??0)})))});
      await hydrate();showToast(lang==='ru'?`Заказ PN-${String(created.order_number).padStart(4,'0')} отправлен пекарне`:lang==='es'?'Pedido enviado a la panadería':'Order sent to the bakery');
    }catch(error){console.error('Panora restaurant cloud order',error);showToast((lang==='ru'?'Заказ сохранён на устройстве, но не отправлен: ':'Cloud order failed: ')+error.message)}finally{uploading=false}
  }
  async function cancelOrder(id){try{await rest(`orders?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'cancelled',cancelled_reason:'Cancelled by restaurant',updated_at:new Date().toISOString()})});await hydrate()}catch(error){showToast(error.message)}}
  const oldLogin=loginAccount;loginAccount=async function(e){
    e.preventDefault();const form=new FormData(e.target),email=String(form.get('email')).trim().toLowerCase(),password=String(form.get('code')).trim(),button=e.target.querySelector('button[type="submit"],button:not([type])');if(button)button.disabled=true;
    try{await authenticate(email,password,false);closePanels();showToast(account.name);if(checkoutAfterLogin){checkoutAfterLogin=false;setTimeout(openCheckoutForAccount,220)}}catch(error){const el=$('#accountError');el.textContent=error.message;el.classList.add('show')}finally{if(button)button.disabled=false}
  };
  const oldLogout=logoutAccount;logoutAccount=async function(){try{if(session)await fetch(`${cfg.url}/auth/v1/logout`,{method:'POST',headers:authHeaders()})}catch{}saveSession(null);oldLogout()};
  const oldRender=renderAccountModal;renderAccountModal=function(){oldRender();if(account)return;const form=$('#accountLogin');if(!form||form.querySelector('[data-cloud-signup]'))return;const input=form.elements.code;if(input){input.type='password';input.minLength=6}const button=document.createElement('button');button.type='button';button.className='button button-ghost full';button.dataset.cloudSignup='';button.textContent=lang==='ru'?'Первый вход — создать пароль':lang==='es'?'Primer acceso — crear contraseña':'First sign-in — create password';button.onclick=async()=>{const data=new FormData(form),email=String(data.get('email')).trim().toLowerCase(),password=String(data.get('code')).trim();try{await authenticate(email,password,true);closePanels();showToast(account.name)}catch(error){const el=$('#accountError');el.textContent=error.message;el.classList.add('show')}};form.append(button)};
  const oldShowShare=showShare;showShare=function(order){oldShowShare(order);const saved=portalOrders().find(o=>o.sourceId===order.id);if(saved)uploadOrder(saved)};
  const oldCancel=restaurantCancelOrder;restaurantCancelOrder=function(id){const before=portalOrders().find(o=>o.id===id)?.status;oldCancel(id);const after=portalOrders().find(o=>o.id===id)?.status;if(before!==after&&after==='cancelled')cancelOrder(id)};
  session=readSession();if(session?.access_token)hydrate().catch(error=>{console.error(error);saveSession(null);renderAccountModal()});else renderAccountModal();
  setInterval(()=>{if(session?.access_token)hydrate().catch(()=>{})},15000);
  window.panoraPortalCloud={uploadOrder,hydrate};
})();
