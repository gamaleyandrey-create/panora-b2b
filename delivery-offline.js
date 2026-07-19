(function(){
  const oldShow=window.showDeliveryQr;
  const closeProof=()=>document.querySelector('#offlineProofDialog')?.remove();
  function openProof(orderId){
    const note=deliveryNotes.find(n=>n.orderId===orderId),client=restaurant(note?.restaurantId);if(!note)return;
    document.body.insertAdjacentHTML('beforeend',`<dialog id="offlineProofDialog" class="modal offline-proof-modal" open><form class="dialog-card" id="offlineProofForm"><button type="button" class="modal-close" aria-label="Закрыть">×</button><p class="eyebrow">РЕЗЕРВНЫЙ РЕЖИМ</p><h2>Получение без интернета</h2><p>${client?.name||'Ресторан'} проверяет поставку и расписывается на устройстве пекарни.</p><label><span>Имя получателя</span><input name="receiver" required minlength="2" maxlength="120" autocomplete="name"></label><label><span>Подпись</span><canvas id="offlineSignature" width="700" height="260"></canvas></label><button type="button" class="clear-signature secondary">Очистить подпись</button><label class="proof-check"><input name="accepted" type="checkbox" required><span>Количество и состояние товара проверены.</span></label><button class="primary" type="submit">Сохранить получение офлайн</button></form></dialog>`);
    const dialog=document.querySelector('#offlineProofDialog'),canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d');let drawing=false,signed=false;
    ctx.lineWidth=5;ctx.lineCap='round';ctx.strokeStyle='#17231c';
    const point=e=>{const r=canvas.getBoundingClientRect(),touch=e.touches?.[0]||e;return{x:(touch.clientX-r.left)*canvas.width/r.width,y:(touch.clientY-r.top)*canvas.height/r.height}};
    const start=e=>{e.preventDefault();drawing=true;signed=true;const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y)};
    const move=e=>{if(!drawing)return;e.preventDefault();const p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke()};
    const end=()=>drawing=false;
    ['pointerdown','touchstart'].forEach(x=>canvas.addEventListener(x,start,{passive:false}));['pointermove','touchmove'].forEach(x=>canvas.addEventListener(x,move,{passive:false}));['pointerup','pointerleave','touchend'].forEach(x=>canvas.addEventListener(x,end));
    dialog.querySelector('.clear-signature').onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);signed=false};dialog.querySelector('.modal-close').onclick=closeProof;dialog.onclick=e=>{if(e.target===dialog)closeProof()};
    dialog.querySelector('form').onsubmit=e=>{e.preventDefault();if(!signed)return alert('Попросите получателя поставить подпись.');const f=new FormData(e.currentTarget);note.offlineProof={receivedAt:new Date().toISOString(),receiver:String(f.get('receiver')).trim(),signature:canvas.toDataURL('image/webp',.65),pending:true};localStorage.setItem('panora-delivery-notes',JSON.stringify(deliveryNotes));window.panoraCloud?.queueFinance?.();closeProof();alert(navigator.onLine?'Получение сохранено и отправляется в облако.':'Получение сохранено на этом устройстве. Оно отправится в облако после появления интернета.')};
  }
  window.showDeliveryQr=async function(orderId){await oldShow(orderId);const actions=document.querySelector('#deliveryQrDialog .delivery-qr-actions');if(actions){actions.insertAdjacentHTML('beforeend','<button type="button" class="secondary qr-offline">Нет интернета — подпись</button>');actions.querySelector('.qr-offline').onclick=()=>{document.querySelector('#deliveryQrDialog')?.remove();openProof(orderId)}}};
})();
