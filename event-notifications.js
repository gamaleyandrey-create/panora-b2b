
/* Panora v332 — in-app order/status notifications with optional sound */
(function(){
 const SOUND_KEY='panora-event-sound-v332',SNAP_KEY='panora-event-orders-v332';
 let sound=localStorage.getItem(SOUND_KEY)==='1',audioCtx=null,initialized=false;

 function readOrders(){try{return JSON.parse(localStorage.getItem('panora-orders')||'[]')||[]}catch{return[]}}
 function readSnap(){try{return JSON.parse(sessionStorage.getItem(SNAP_KEY)||'{}')||{}}catch{return{}}}
 function saveSnap(orders){sessionStorage.setItem(SNAP_KEY,JSON.stringify(Object.fromEntries(orders.map(o=>[o.id,{status:o.status,number:o.number,restaurantId:o.restaurantId}]))))}
 function stack(){let el=document.querySelector('.panora-event-stack');if(!el){el=document.createElement('div');el.className='panora-event-stack';el.setAttribute('aria-live','polite');document.body.appendChild(el)}return el}
 function beep(type='order'){
   if(!sound)return;
   try{
     audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
     const o=audioCtx.createOscillator(),g=audioCtx.createGain();
     o.type='sine';o.frequency.value=type==='error'?330:type==='success'?660:520;
     g.gain.setValueAtTime(.0001,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.055,audioCtx.currentTime+.015);g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+.16);
     o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.18);
   }catch{}
 }
 function toast(title,text,type='order',icon='🔔'){
   const el=document.createElement('div');el.className='panora-event-toast';el.dataset.type=type;
   el.innerHTML=`<div class="panora-event-icon">${icon}</div><div><p class="panora-event-title"></p><p class="panora-event-text"></p></div><button type="button" class="panora-event-close" aria-label="Закрыть">×</button>`;
   el.querySelector('.panora-event-title').textContent=title;el.querySelector('.panora-event-text').textContent=text;
   el.querySelector('.panora-event-close').onclick=()=>el.remove();stack().prepend(el);beep(type);setTimeout(()=>el.remove(),8000);
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
     if(!old&&admin&&o.status==='submitted')toast('Новый заказ',`${partnerName(o.restaurantId)} · ${orderNo(o)}`,'order','🧾');
     else if(old&&old.status!==o.status){
       if(admin)toast('Статус заказа изменён',`${orderNo(o)} · ${statusText(o.status)}`,typeFor(o.status),o.status==='cancelled'?'⚠️':'✓');
       else toast('Заказ обновлён',`${orderNo(o)} · ${statusText(o.status)}`,typeFor(o.status),o.status==='cancelled'?'⚠️':'✓');
     }
   });
   saveSnap(orders);
 }
 function settings(){
   let b=document.querySelector('.panora-event-settings');if(b)return;
   b=document.createElement('button');b.type='button';b.className='panora-event-settings';b.dataset.sound=sound?'on':'off';
   const sync=()=>{b.textContent=sound?'🔔':'🔕';b.title=sound?'Звук уведомлений включён':'Включить звук уведомлений';b.dataset.sound=sound?'on':'off'};sync();
   b.onclick=()=>{sound=!sound;localStorage.setItem(SOUND_KEY,sound?'1':'0');sync();if(sound){beep('success');toast('Звук включён','Новые заказы и изменения статусов могут сопровождаться коротким сигналом.','success','🔔')}};
   document.body.appendChild(b);
 }
 window.addEventListener('storage',e=>{if(e.key==='panora-orders')setTimeout(compare,0)});
 window.addEventListener('panora:partner-orders-updated',()=>setTimeout(compare,0));
 window.addEventListener('panora:orders-updated',()=>setTimeout(compare,0));
 window.addEventListener('panora:restaurant-sync',e=>{if(e.detail?.type==='error')toast('Ошибка синхронизации',e.detail.text||'Не удалось синхронизировать данные.','error','!')});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(compare,100)});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{settings();compare()},{once:true});else{settings();compare()}
 window.panoraEventNotifications={check:compare,toast,setSound:value=>{sound=Boolean(value);localStorage.setItem(SOUND_KEY,sound?'1':'0')}};
})();
