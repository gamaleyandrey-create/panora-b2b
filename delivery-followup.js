/* Panora 9.94 — shipment receipt follow-up for B2B partners.
   Financial shipment remains final at dispatch. These records only describe receipt evidence/follow-up. */
(function(){
  const STORE='panora-delivery-followups';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{}}catch(_){return{}}};
  const write=value=>{try{localStorage.setItem(STORE,JSON.stringify(value))}catch(_){}};
  const key=note=>String(note?.id||note?.orderId||'');
  const meta=note=>read()[key(note)]||{};
  const save=(note,patch)=>{const all=read(),k=key(note);if(!k)return null;all[k]={...(all[k]||{}),...patch,updatedAt:new Date().toISOString()};write(all);return all[k]};
  const noteForOrder=orderId=>(typeof deliveryNotes!=='undefined'?deliveryNotes:[]).find(n=>String(n.orderId)===String(orderId));
  const orderForNote=note=>(typeof orders!=='undefined'?orders:[]).find(o=>String(o.id)===String(note?.orderId));
  const doneByPartner=note=>Boolean(note?.customerConfirmedAt);
  const doneBySignature=note=>Boolean(note?.offlineProof?.receivedAt);
  const manuallyClosed=note=>Boolean(meta(note).manualClosedAt);
  const pending=note=>Boolean(note)&&!doneByPartner(note)&&!doneBySignature(note)&&!manuallyClosed(note);
  const ageDays=note=>{
    const raw=note?.deliveredAt||note?.createdAt||note?.date;
    if(!raw)return 0;
    const d=new Date(String(raw).length<=10?`${raw}T12:00:00`:raw);if(Number.isNaN(d.getTime()))return 0;
    return Math.max(0,Math.floor((Date.now()-d.getTime())/86400000));
  };
  const statusHtml=note=>{
    if(doneByPartner(note))return '<span class="delivery-followup-status is-ok">✓ Подтверждено партнёром</span>';
    if(doneBySignature(note))return `<span class="delivery-followup-status is-ok">✓ Получено по подписи${note.offlineProof?.receiver?` · ${esc(note.offlineProof.receiver)}`:''}</span>`;
    if(manuallyClosed(note)){const m=meta(note);return `<span class="delivery-followup-status is-manual">Закрыто пекарней${m.manualReason?` · ${esc(m.manualReason)}`:''}</span>`}
    const days=ageDays(note);return `<span class="delivery-followup-status ${days>=2?'is-late':days>=1?'is-warn':'is-pending'}">${days>=2?'! ':''}Ожидает подтверждения партнёра${days?` · ${days} дн.`:''}</span>`;
  };
  const copy=async text=>{if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(text);const t=document.createElement('textarea');t.value=text;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()};
  const partnerFor=note=>typeof restaurant==='function'?restaurant(note.restaurantId):null;
  const number=note=>`DN-${String(note?.number||'—').padStart(4,'0')}`;
  const reminderText=note=>{
    const r=partnerFor(note),order=orderForNote(note),link=window.panoraDeliveryQr?.url?.(note)||new URL('index.html',location.href).href;
    const orderNo=order?.number?`PN-${String(order.number).padStart(4,'0')}`:'';
    return `Здравствуйте${r?.name?`, ${r.name}`:''}!\n\nПоставка Panora ${number(note)}${orderNo?` · ${orderNo}`:''} ожидает подтверждения получения.\nПожалуйста, откройте ссылку и подтвердите поставку:\n${link}\n\nЕсли подтверждение через ссылку невозможно, сообщите пекарне — получение можно зафиксировать подписью на устройстве пекарни.`;
  };
  function closeDialog(id){document.querySelector(id)?.remove()}
  function openReminder(note){
    const r=partnerFor(note),text=reminderText(note),subject=`Panora — подтвердите поставку ${number(note)}`;
    const channels=typeof reminderChannels==='function'?reminderChannels(r):['copy'];
    const buttons=channels.map(ch=>`<button type="button" class="secondary" data-delivery-remind-channel="${esc(ch)}">${esc(typeof reminderChannelLabel==='function'?reminderChannelLabel(ch):ch)}</button>`).join('');
    closeDialog('#deliveryReminderDialog');document.body.insertAdjacentHTML('beforeend',`<dialog id="deliveryReminderDialog" class="modal delivery-followup-dialog"><form method="dialog" class="dialog-card"><button class="modal-close" value="cancel" aria-label="Закрыть">×</button><p class="eyebrow">PANORA · ПОСТАВКА</p><h2>Напомнить партнёру</h2><p><strong>${esc(r?.name||'Партнёр')}</strong> · ${esc(number(note))}</p><textarea rows="8" readonly>${esc(text)}</textarea><div class="delivery-followup-share">${buttons}</div><small>После открытия мессенджера Panora сохранит дату напоминания на этом устройстве.</small></form></dialog>`);
    const d=document.querySelector('#deliveryReminderDialog');d.querySelectorAll('[data-delivery-remind-channel]').forEach(btn=>btn.onclick=async()=>{const channel=btn.dataset.deliveryRemindChannel;try{if(channel==='copy'){await copy(text)}else{const url=typeof reminderUrl==='function'?reminderUrl(r,channel,text,subject):'';if(url)window.open(url,'_blank','noopener');if(typeof reminderNeedsClipboard==='function'&&reminderNeedsClipboard(channel))await copy(text)}}catch(_){}save(note,{lastReminderAt:new Date().toISOString(),lastReminderChannel:channel});btn.textContent='Готово · '+(typeof reminderChannelLabel==='function'?reminderChannelLabel(channel):channel);setTimeout(()=>{closeDialog('#deliveryReminderDialog');typeof renderCommerce==='function'&&renderCommerce()},450)});d.showModal();
  }
  function openManualClose(note){
    closeDialog('#deliveryManualCloseDialog');
    document.body.insertAdjacentHTML('beforeend',`<dialog id="deliveryManualCloseDialog" class="modal delivery-followup-dialog"><form class="dialog-card" data-delivery-manual-form><button type="button" class="modal-close" aria-label="Закрыть">×</button><p class="eyebrow">PANORA · КОНТРОЛЬ ПОСТАВКИ</p><h2>Закрыть поставку вручную</h2><p><strong>${esc(number(note))}</strong>. Это действие <strong>не будет</strong> отмечено как подтверждение партнёра.</p><label><span>Основание</span><select name="reason" required><option value="">Выберите…</option><option>Подтверждено по телефону</option><option>Подтверждено в мессенджере</option><option>Есть бумажная накладная с подписью</option><option>Другая причина</option></select></label><label><span>Комментарий</span><textarea name="comment" rows="4" minlength="5" required placeholder="Кто подтвердил, когда и на каком основании"></textarea></label><label class="proof-check"><input name="accepted" type="checkbox" required><span>Понимаю: это административное закрытие, а не подтверждение партнёром.</span></label><div class="delivery-followup-actions"><button type="button" class="secondary" data-delivery-manual-cancel>Отмена</button><button type="submit" class="primary">Закрыть поставку</button></div></form></dialog>`);
    const d=document.querySelector('#deliveryManualCloseDialog');const close=()=>d.remove();d.querySelector('.modal-close').onclick=close;d.querySelector('[data-delivery-manual-cancel]').onclick=close;d.querySelector('form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);save(note,{manualClosedAt:new Date().toISOString(),manualReason:String(f.get('reason')||''),manualComment:String(f.get('comment')||'').trim()});close();typeof renderCommerce==='function'&&renderCommerce()};d.showModal();
  }
  function openActions(note){
    const m=meta(note),reminder=m.lastReminderAt?new Date(m.lastReminderAt).toLocaleString('ru-RU',{dateStyle:'short',timeStyle:'short'}):'';
    closeDialog('#deliveryFollowupDialog');document.body.insertAdjacentHTML('beforeend',`<dialog id="deliveryFollowupDialog" class="modal delivery-followup-dialog"><form method="dialog" class="dialog-card"><button class="modal-close" value="cancel" aria-label="Закрыть">×</button><p class="eyebrow">PANORA · ПОСТАВКА</p><h2>${esc(number(note))}</h2>${statusHtml(note)}${reminder?`<p class="delivery-followup-last">Последнее напоминание: ${esc(reminder)}${m.lastReminderChannel?` · ${esc(m.lastReminderChannel)}`:''}</p>`:''}<div class="delivery-followup-actions">${pending(note)?'<button type="button" class="primary" data-delivery-remind>Напомнить партнёру</button>':''}<button type="button" class="secondary" data-delivery-sign>Принять подпись получателя</button>${pending(note)?'<button type="button" class="secondary" data-delivery-manual>Закрыть вручную</button>':''}${manuallyClosed(note)?'<button type="button" class="secondary" data-delivery-reopen>Вернуть в ожидание</button>':''}</div>${m.manualComment?`<p class="delivery-followup-manual-note"><strong>Комментарий пекарни:</strong> ${esc(m.manualComment)}</p>`:''}</form></dialog>`);
    const d=document.querySelector('#deliveryFollowupDialog');d.querySelector('[data-delivery-remind]')?.addEventListener('click',()=>{d.remove();openReminder(note)});d.querySelector('[data-delivery-sign]')?.addEventListener('click',()=>{d.remove();window.panoraOpenRecipientProof?.(note.orderId)});d.querySelector('[data-delivery-manual]')?.addEventListener('click',()=>{d.remove();openManualClose(note)});d.querySelector('[data-delivery-reopen]')?.addEventListener('click',()=>{save(note,{manualClosedAt:null,manualReason:'',manualComment:''});d.remove();typeof renderCommerce==='function'&&renderCommerce()});d.showModal();
  }
  const oldActions=typeof orderActions==='function'?orderActions:null;
  if(oldActions)orderActions=function(order){
    const html=oldActions(order);if(order?.status!=='shipped')return html;const note=noteForOrder(order.id);if(!note)return html;
    const follow=`<div class="delivery-followup-row">${statusHtml(note)}<button type="button" class="action-small" data-delivery-followup="${esc(order.id)}">Контроль поставки</button>${pending(note)?`<button type="button" class="action-small" data-delivery-remind="${esc(order.id)}">Напомнить</button>`:''}</div>`;
    return html+follow;
  };
  const oldConfirmation=typeof customerConfirmationHtml==='function'?customerConfirmationHtml:null;
  if(oldConfirmation)customerConfirmationHtml=function(order){
    const note=noteForOrder(order?.id);if(note?.offlineProof?.receivedAt&&!note?.customerConfirmedAt){
      const at=new Date(note.offlineProof.receivedAt).toLocaleString('ru-RU',{dateStyle:'short',timeStyle:'short'});return `<small class="customer-confirmed">✓ Получено по подписи${note.offlineProof.receiver?` · ${esc(note.offlineProof.receiver)}`:''}<br>${esc(at)}</small>`;
    }
    return oldConfirmation(order);
  };
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-delivery-followup],[data-delivery-remind]');if(!b)return;
    const orderId=b.dataset.deliveryFollowup||b.dataset.deliveryRemind,note=noteForOrder(orderId);if(!note)return;
    e.preventDefault();e.stopPropagation();if(b.dataset.deliveryRemind!==undefined)openReminder(note);else openActions(note);
  },true);
  window.panoraDeliveryFollowup={meta,save,pending,statusHtml,openReminder,openActions};
})();
