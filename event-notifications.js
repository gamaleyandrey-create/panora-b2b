/* Panora 2.6 — active notifications, priority timing and persistent new-order alerts */
(function(){
 const SOUND_KEY='panora-event-sound-v332',SNAP_KEY='panora-event-orders-v332',PENDING_KEY='panora-admin-pending-order-alerts-v25';
 let sound=localStorage.getItem(SOUND_KEY)==='1',audioCtx=null,initialized=false,lastPlanNoticeAt=0,lastPlanNoticeSig='';

 function readOrders(){try{return JSON.parse(localStorage.getItem('panora-orders')||'[]')||[]}catch{return[]}}
 function readSnap(){try{return JSON.parse(sessionStorage.getItem(SNAP_KEY)||'{}')||{}}catch{return{}}}
 function saveSnap(orders){sessionStorage.setItem(SNAP_KEY,JSON.stringify(Object.fromEntries(orders.map(o=>[o.id,{status:o.status,number:o.number,restaurantId:o.restaurantId}]))))}
 function readPending(){try{return new Set(JSON.parse(localStorage.getItem(PENDING_KEY)||'[]')||[])}catch{return new Set()}}
 function savePending(set){localStorage.setItem(PENDING_KEY,JSON.stringify([...set]))}
 function addPending(id){const set=readPending();set.add(id);savePending(set)}
 function clearPending(id){const set=readPending();if(set.delete(id))savePending(set);document.querySelector(`.panora-event-toast[data-order-id="${CSS.escape(String(id))}"]`)?.remove()}
 function prunePending(orders){const submitted=new Set(orders.filter(o=>o.status==='submitted').map(o=>o.id));const set=readPending();let changed=false;for(const id of [...set])if(!submitted.has(id)){set.delete(id);changed=true}if(changed)savePending(set);return set}
 function stack(){let el=document.querySelector('.panora-event-stack');if(!el){el=document.createElement('div');el.className='panora-event-stack';el.setAttribute('aria-live','polite');document.body.appendChild(el)}return el}
 function beep(type='order'){
   if(!sound)return;
   try{
     audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
     const now=audioCtx.currentTime;
     const tones=type==='error'?[330,260]:type==='success'?[660,880]:[620,820];
     tones.forEach((freq,i)=>{
       const o=audioCtx.createOscillator(),g=audioCtx.createGain(),start=now+i*.13;
       o.type='sine';o.frequency.setValueAtTime(freq,start);
       g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(.16,start+.018);g.gain.exponentialRampToValueAtTime(.0001,start+.19);
       o.connect(g);g.connect(audioCtx.destination);o.start(start);o.stop(start+.21);
     });
   }catch{}
 }
 function activateTarget(options={}){
   const admin=document.body.classList.contains('admin-page');
   if(admin&&options.view){
     document.querySelector(`.admin-nav button[data-view="${CSS.escape(String(options.view))}"]`)?.click();
   } else if(!admin&&options.partnerCabinet){
     (document.querySelector('#profileButton')||document.querySelector('#mobileProfile'))?.click();
   }
   if(options.orderId){
     const focusOrder=()=>{
       const row=document.querySelector(`[data-order-id="${CSS.escape(String(options.orderId))}"]`);
       if(row){row.scrollIntoView({behavior:'smooth',block:'center'});row.classList.add('order-row-attention');setTimeout(()=>row.classList.remove('order-row-attention'),1800);return true}
       return false;
     };
     if(admin){document.querySelector('.admin-nav button[data-view="orders"]')?.click();requestAnimationFrame(()=>requestAnimationFrame(focusOrder))}
     else{(document.querySelector('#profileButton')||document.querySelector('#mobileProfile'))?.click();setTimeout(focusOrder,120)}
   } else if(options.selector){
     requestAnimationFrame(()=>document.querySelector(options.selector)?.scrollIntoView({behavior:'smooth',block:'center'}));
   }
 }
 function toastDuration(type,options={}){
   if(options.persistent||options.priority==='critical')return 0;
   if(Number.isFinite(options.duration))return Math.max(0,options.duration);
   if(options.priority==='technical')return 2500;
   if(options.priority==='normal')return 6000;
   return type==='error'?0:6000;
 }
 function toast(title,text,type='order',icon='🔔',options={}){
   const el=document.createElement('div');el.className='panora-event-toast';el.dataset.type=type;
   if(options.orderId)el.dataset.orderId=String(options.orderId);
   if(options.persistent||options.priority==='critical')el.dataset.persistent='true';
   const actionable=Boolean(options.orderId||options.view||options.partnerCabinet||options.selector||options.onActivate);
   if(actionable){el.classList.add('panora-event-actionable');el.setAttribute('role','button');el.tabIndex=0}
   el.innerHTML=`<div class="panora-event-icon">${icon}</div><div><p class="panora-event-title"></p><p class="panora-event-text"></p>${actionable?'<span class="panora-event-hint">Открыть →</span>':''}</div><button type="button" class="panora-event-close" aria-label="Закрыть">×</button>`;
   el.querySelector('.panora-event-title').textContent=title;el.querySelector('.panora-event-text').textContent=text;
   el.querySelector('.panora-event-close').onclick=e=>{e.stopPropagation();if(options.orderId&&options.persistent)clearPending(options.orderId);else el.remove()};
   const activate=e=>{
     if(e?.target?.closest?.('.panora-event-close'))return;
     if(options.orderId&&options.persistent)clearPending(options.orderId);else el.remove();
     if(typeof options.onActivate==='function')options.onActivate();else activateTarget(options);
   };
   if(actionable){el.onclick=activate;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate(e)}}}
   stack().prepend(el);if(!options.silent)beep(type);
   const duration=toastDuration(type,options);if(duration)setTimeout(()=>el.remove(),duration);
   return el;
 }
 function persistentOrderToast(order,playSound=false){
   const selector=`.panora-event-toast[data-order-id="${CSS.escape(String(order.id))}"]`;
   if(document.querySelector(selector))return;
   const el=toast('Новый заказ поступил в пекарню',`${partnerName(order.restaurantId)} · ${orderNo(order)}. Откройте заказ и проверьте позиции.`,'order','🧾',{persistent:true,priority:'critical',orderId:order.id,view:'orders',silent:!playSound});
   return el;
 }
 function restorePending(orders){
   if(!document.body.classList.contains('admin-page'))return;
   const pending=prunePending(orders);
   orders.filter(o=>o.status==='submitted'&&pending.has(o.id)).forEach(o=>persistentOrderToast(o,false));
 }
 function toastOnce(key,title,text,type='order',icon='🔔',cooldownMs=12000,options={}){
   const now=Date.now();
   const existing=document.querySelector(`.panora-event-toast[data-key="${key}"]`);
   if(existing){existing.querySelector('.panora-event-title').textContent=title;existing.querySelector('.panora-event-text').textContent=text;return existing}
   const last=Number(sessionStorage.getItem(`panora-toast-last:${key}`)||0);if(now-last<cooldownMs)return null;
   sessionStorage.setItem(`panora-toast-last:${key}`,String(now));
   const el=toast(title,text,type,icon,options);if(el)el.dataset.key=key;return el;
 }
 function orderNo(o){return `PN-${String(o.number||0).padStart(4,'0')}`}
 function partnerName(id){try{const rows=JSON.parse(localStorage.getItem('panora-restaurants')||'[]');return rows.find(x=>x.id===id)?.name||'Партнёр'}catch{return'Партнёр'}}
 function statusText(status){return({submitted:'отправлен в пекарню',confirmed:'подтверждён',processing:'в работе',shipped:'отгружен',completed:'выполнен',cancelled:'отменён'})[status]||`статус: ${status}`}
 function typeFor(status){return status==='cancelled'?'error':(['confirmed','shipped','completed'].includes(status)?'success':'order')}

 function compare(){
   const orders=readOrders(),before=readSnap();
   if(!initialized){saveSnap(orders);initialized=true;restorePending(orders);return}
   const admin=document.body.classList.contains('admin-page');
   orders.forEach(o=>{
     const old=before[o.id];
     if(!old&&admin&&o.status==='submitted'){
       addPending(o.id);
       persistentOrderToast(o,true);
     } else if(old&&old.status!==o.status){
       if(old.status==='submitted'&&o.status!=='submitted')clearPending(o.id);
       if(admin)toastOnce(`order-status:${o.id}:${o.status}`,'Статус заказа обновлён',`${orderNo(o)} — ${statusText(o.status)}.`,typeFor(o.status),o.status==='cancelled'?'⚠️':'✓',30000,{priority:o.status==='cancelled'?'critical':'normal',orderId:o.id,view:'orders'});
       else toastOnce(`order-status:${o.id}:${o.status}`,'Есть новости по вашему заказу',`${orderNo(o)} — ${statusText(o.status)}.`,typeFor(o.status),o.status==='cancelled'?'⚠️':'✓',30000,{priority:o.status==='cancelled'?'critical':'normal',orderId:o.id,partnerCabinet:true});
     }
   });
   prunePending(orders);saveSnap(orders);
 }
 function settings(){/* no floating bell; header control is managed by order-notifications.js */}
 window.addEventListener('panora:notification-preference',event=>{sound=!!event.detail?.enabled;localStorage.setItem(SOUND_KEY,sound?'1':'0');if(sound)beep('success')});
 window.addEventListener('storage',e=>{if(e.key==='panora-orders')setTimeout(compare,0);if(e.key===PENDING_KEY)setTimeout(()=>restorePending(readOrders()),0)});
 window.addEventListener('panora:partner-orders-updated',()=>setTimeout(compare,0));
 window.addEventListener('panora:orders-updated',()=>setTimeout(compare,0));
 window.addEventListener('panora:order-status-local',()=>setTimeout(compare,0));
 window.addEventListener('panora:plans-updated',event=>{
   if(event.detail?.source!=='cloud-remote')return;const calendarVisible=document.querySelector('#view-plan')?.classList.contains('active');if(!calendarVisible)return;
   const state=document.querySelector('#saveState');if(state&&state.dataset.syncState!=='syncing'&&state.dataset.syncState!=='local'&&state.dataset.syncState!=='error'){
     state.textContent='План обновлён';state.dataset.syncState='synced';setTimeout(()=>{if(state.textContent==='План обновлён')state.textContent='Сохранено'},1400);
   }
 });
 window.addEventListener('panora:restaurant-sync',e=>{if(e.detail?.type==='error')toast('Ошибка синхронизации',e.detail.text||'Не удалось синхронизировать данные.','error','!',{priority:'critical',view:document.body.classList.contains('admin-page')?'settings':null,partnerCabinet:!document.body.classList.contains('admin-page')})});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(compare,100)});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{settings();compare()},{once:true});else{settings();compare()}
 window.panoraEventNotifications={check:compare,toast,notifyTechnical:(title,text,options={})=>toast(title,text,'success','✓',{...options,priority:'technical'}),notify:(title,text,options={})=>toast(title,text,options.type||'order',options.icon||'🔔',{...options,priority:options.priority||'normal'}),setSound:value=>{sound=Boolean(value);localStorage.setItem(SOUND_KEY,sound?'1':'0')},clearOrderAlert:clearPending};
})();
