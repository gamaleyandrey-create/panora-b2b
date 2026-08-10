
/* Panora v332 — in-app order/status notifications with optional sound */
(function(){
 const SOUND_KEY='panora-event-sound-v332',SNAP_KEY='panora-event-orders-v332';
 let sound=localStorage.getItem(SOUND_KEY)==='1',audioCtx=null,initialized=false,lastPlanNoticeAt=0,lastPlanNoticeSig='';

 function readOrders(){try{return JSON.parse(localStorage.getItem('panora-orders')||'[]')||[]}catch{return[]}}
 function readSnap(){try{return JSON.parse(sessionStorage.getItem(SNAP_KEY)||'{}')||{}}catch{return{}}}
 function saveSnap(orders){sessionStorage.setItem(SNAP_KEY,JSON.stringify(Object.fromEntries(orders.map(o=>[o.id,{status:o.status,number:o.number,restaurantId:o.restaurantId}]))))}
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
 function toast(title,text,type='order',icon='🔔'){
   const el=document.createElement('div');el.className='panora-event-toast';el.dataset.type=type;
   el.innerHTML=`<div class="panora-event-icon">${icon}</div><div><p class="panora-event-title"></p><p class="panora-event-text"></p></div><button type="button" class="panora-event-close" aria-label="Закрыть">×</button>`;
   el.querySelector('.panora-event-title').textContent=title;el.querySelector('.panora-event-text').textContent=text;
   el.querySelector('.panora-event-close').onclick=()=>el.remove();stack().prepend(el);beep(type);setTimeout(()=>el.remove(),8000);
 }
 function toastOnce(key,title,text,type='order',icon='🔔',cooldownMs=12000){
   const now=Date.now();
   const existing=document.querySelector(`.panora-event-toast[data-key="${key}"]`);
   if(existing){
     existing.querySelector('.panora-event-title').textContent=title;
     existing.querySelector('.panora-event-text').textContent=text;
     return existing;
   }
   const last=Number(sessionStorage.getItem(`panora-toast-last:${key}`)||0);
   if(now-last<cooldownMs)return null;
   sessionStorage.setItem(`panora-toast-last:${key}`,String(now));
   const before=stack().firstElementChild;
   toast(title,text,type,icon);
   const el=stack().firstElementChild;
   if(el&&el!==before)el.dataset.key=key;
   return el;
 }
 function orderNo(o){return `PN-${String(o.number||0).padStart(4,'0')}`}
 function partnerName(id){try{const rows=JSON.parse(localStorage.getItem('panora-restaurants')||'[]');return rows.find(x=>x.id===id)?.name||'Партнёр'}catch{return'Партнёр'}}
 function statusText(status){return({submitted:'отправлен в пекарню',confirmed:'подтверждён',processing:'в работе',shipped:'отгружен',completed:'выполнен',cancelled:'отменён'})[status]||`статус: ${status}`}
 function typeFor(status){return status==='cancelled'?'error':(['confirmed','shipped','completed'].includes(status)?'success':'order')}

 function compare(){
   const orders=readOrders(),before=readSnap();
   if(!initialized){saveSnap(orders);initialized=true;return}
   const admin=document.body.classList.contains('admin-page');
   orders.forEach(o=>{
     const old=before[o.id];
     if(!old&&admin&&o.status==='submitted')toast('Новый заказ поступил в пекарню',`${partnerName(o.restaurantId)} · ${orderNo(o)}. Откройте заказ и проверьте позиции.`,'order','🧾');
     else if(old&&old.status!==o.status){
       if(admin)toast('Заказ изменил статус',`${orderNo(o)} — ${statusText(o.status)}. Изменение синхронизировано с партнёром.`,typeFor(o.status),o.status==='cancelled'?'⚠️':'✓');
       else toast('Есть новости по вашему заказу',`${orderNo(o)} — ${statusText(o.status)}.`,typeFor(o.status),o.status==='cancelled'?'⚠️':'✓');
     }
   });
   saveSnap(orders);
 }
 function settings(){
   // v336.7: no floating bell. Toast and sound/event logic stay available.
 }
 window.addEventListener('panora:notification-preference',event=>{
   sound=!!event.detail?.enabled;
   localStorage.setItem(SOUND_KEY,sound?'1':'0');
   if(sound)beep('success');
 });
 window.addEventListener('storage',e=>{if(e.key==='panora-orders')setTimeout(compare,0)});
 window.addEventListener('panora:partner-orders-updated',()=>setTimeout(compare,0));
 window.addEventListener('panora:orders-updated',()=>setTimeout(compare,0));
 window.addEventListener('panora:order-status-local',()=>setTimeout(compare,0));
 window.addEventListener('panora:plans-updated',event=>{
   if(event.detail?.source!=='cloud-remote')return;
   const calendarVisible=document.querySelector('#view-plan')?.classList.contains('active');
   if(!calendarVisible)return;
   const state=document.querySelector('#saveState');
   if(state&&state.dataset.syncState!=='syncing'&&state.dataset.syncState!=='local'&&state.dataset.syncState!=='error'){
     state.textContent='План обновлён';
     state.dataset.syncState='synced';
     setTimeout(()=>{if(state.textContent==='План обновлён')state.textContent='Сохранено'},1400);
   }
 });
 window.addEventListener('panora:restaurant-sync',e=>{if(e.detail?.type==='error')toast('Ошибка синхронизации',e.detail.text||'Не удалось синхронизировать данные.','error','!')});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(compare,100)});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{settings();compare()},{once:true});else{settings();compare()}
 window.panoraEventNotifications={check:compare,toast,setSound:value=>{sound=Boolean(value);localStorage.setItem(SOUND_KEY,sound?'1':'0')}};
})();
