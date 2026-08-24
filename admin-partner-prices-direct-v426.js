(()=>{
  const cfg=window.PANORA_SUPABASE;
  if(!cfg)return;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const session=()=>window.panoraSupabaseSession||null;
  const authHeaders=()=>{
    const s=session();
    if(!s?.access_token)throw new Error('Нет активной сессии пекарни');
    return {
      apikey:cfg.publishableKey,
      Authorization:`Bearer ${s.access_token}`,
      'Content-Type':'application/json',
      'Cache-Control':'no-cache'
    };
  };
  const rest=async(path,options={})=>{
    const response=await fetch(`${cfg.url}/rest/v1/${path}`,{
      cache:'no-store',
      ...options,
      headers:{...authHeaders(),...(options.headers||{})}
    });
    const text=await response.text();
    if(!response.ok)throw new Error(`${response.status}: ${text||response.statusText}`);
    return text?JSON.parse(text):null;
  };

  let active=false;
  let loading=false;
  let lastRows=[];
  let ws=null;
  let reconnectTimer=0;
  let realtimeOk=false;

  // Drafts are kept locally until the bakery explicitly presses "Сохранить цены".
  const drafts=new Map(); // key restaurantId:productId -> number
  const savingRestaurants=new Set();

  const products=()=>{
    try{
      const list=JSON.parse(localStorage.getItem('panora-products')||'[]');
      return Array.isArray(list)?list.filter(p=>p&&p.active!==false&&!p.deletedAt):[];
    }catch{return[]}
  };
  const productLabel=id=>{
    const p=products().find(x=>String(x.id)===String(id));
    return p?.names?.ru||p?.name||String(id);
  };
  const partnerTypeLabel=value=>({
    restaurant:'Ресторан',shop:'Магазин',hotel:'Отель',cafe:'Кафе',
    catering:'Кейтеринг',other:'Другое'
  }[String(value||'').toLowerCase()]||'Партнёр');

  const messengerRows=value=>Array.isArray(value)?value.filter(Boolean):[];
  const messengerValue=(r,name)=>String(messengerRows(r?.extra_messengers).find(x=>String(x?.name||'').toLowerCase()===String(name).toLowerCase())?.contact||'');
  const preferredChannel=r=>{
    const value=messengerValue(r,'__preferred__').toLowerCase();
    return ['whatsapp','email','telegram','signal','viber','messenger','copy'].includes(value)?value:'whatsapp';
  };
  const contactPayload=card=>{
    const get=name=>String(card.querySelector(`[data-partner-contact="${name}"]`)?.value||'').trim();
    const preferred=get('preferred')||'whatsapp';
    return {
      whatsapp:get('whatsapp')||null,
      telegram:get('telegram')||null,
      extra_messengers:[
        ['Signal',get('signal')],['Viber',get('viber')],['Messenger',get('messenger')],['__preferred__',preferred]
      ].filter(([,contact])=>contact).map(([name,contact])=>({name,contact}))
    };
  };

  const profilePayload=card=>{
    const get=name=>String(card.querySelector(`[data-partner-profile="${name}"]`)?.value||'').trim();
    return {
      name:get('name'),
      email:get('email')||null,
      phone:get('phone')||null,
      address:get('address')||null,
      legal_name:get('legal_name')||null,
      tax_id:(get('tax_id')||'').toUpperCase()||null,
      billing_address:get('billing_address')||null,
      contact_person:get('contact_person')||null,
      delivery_comment:get('delivery_comment')||null,
      receiving_hours:get('receiving_hours')||null,
      receiving_days:get('receiving_days')||null,
      partner_type:get('partner_type')||'restaurant'
    };
  };

  const screen=()=>document.querySelector('#view-restaurants');
  const cards=()=>document.querySelector('#restaurantCards');
  const draftKey=(restaurantId,productId)=>`${restaurantId}:${productId}`;
  const partnerHasDrafts=restaurantId=>[...drafts.keys()].some(key=>key.startsWith(`${restaurantId}:`));
  const euro=value=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'EUR'}).format(Number(value||0));
  const partnerDebtToday=restaurantId=>{try{return Math.max(0,Number(window.panoraAccountingAllocationToday?.(restaurantId)?.debt||0))}catch{return 0}};
  const updateLocalArchive=(restaurantId,active,updatedAt)=>{try{
    const local=JSON.parse(localStorage.getItem('panora-restaurants')||'[]');
    const next=(Array.isArray(local)?local:[]).map(r=>{
      if(String(r.id)!==String(restaurantId))return r;
      if(active){const restored={...r};delete restored.deletedAt;return restored}
      return {...r,deletedAt:updatedAt||new Date().toISOString()};
    });
    localStorage.setItem('panora-restaurants',JSON.stringify(next));
  }catch{}};
  const archiveDialog=()=>{
    let dialog=document.querySelector('#directPartnerArchiveDialog');
    if(dialog)return dialog;
    document.body.insertAdjacentHTML('beforeend',`<dialog id="directPartnerArchiveDialog" class="partner-archive-dialog"><form method="dialog"><button type="button" class="dialog-close" data-partner-archive-close aria-label="Закрыть">×</button><h3>Архивировать партнёра?</h3><p data-partner-archive-name></p><div class="partner-archive-warning"><span>Задолженность перед пекарней на сегодня</span><strong data-partner-archive-debt></strong></div><p class="partner-archive-help">Партнёр потеряет доступ к новым заказам. Заказы, накладные, оплаты, возвраты и вся финансовая история сохранятся. При наличии долга партнёр останется в «Оплаты и задолженности» до полного погашения.</p><div class="dialog-actions"><button type="button" data-partner-archive-cancel>Отмена</button><button type="button" class="danger" data-partner-archive-confirm>Архивировать</button></div></form></dialog>`);
    dialog=document.querySelector('#directPartnerArchiveDialog');
    dialog.querySelector('[data-partner-archive-close]').onclick=()=>dialog.close('cancel');
    dialog.querySelector('[data-partner-archive-cancel]').onclick=()=>dialog.close('cancel');
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close('cancel')});
    return dialog;
  };
  const askArchivePartner=(partner,debt)=>new Promise(resolve=>{
    const dialog=archiveDialog(),confirmButton=dialog.querySelector('[data-partner-archive-confirm]');
    dialog.querySelector('[data-partner-archive-name]').innerHTML=`Партнёр <strong>${esc(partner?.name||'')}</strong> будет перенесён из активных в архив.`;
    const debtNode=dialog.querySelector('[data-partner-archive-debt]');
    debtNode.textContent=euro(debt);debtNode.classList.toggle('is-zero',debt<=0.005);
    const finish=value=>{dialog.removeEventListener('close',onClose);resolve(value)};
    const onClose=()=>finish(false);
    dialog.addEventListener('close',onClose,{once:true});
    confirmButton.onclick=()=>{dialog.removeEventListener('close',onClose);dialog.close('confirm');resolve(true)};
    dialog.showModal();
  });
  const setPartnerActive=async(restaurantId,nextActive)=>{
    restaurantId=String(restaurantId||'');
    const partner=lastRows.find(r=>String(r.id)===restaurantId);if(!partner)return false;
    if(!nextActive&&partnerHasDrafts(restaurantId)){alert('Сначала сохраните или отмените изменения цен этого партнёра.');return false}
    if(!nextActive){const debt=partnerDebtToday(restaurantId);if(!await askArchivePartner(partner,debt))return false}
    else if(!confirm(`Восстановить партнёра «${partner.name}»? Он снова сможет создавать новые заказы.`))return false;
    try{
      if(!window.panoraCloud?.setRestaurantActiveConfirmed)throw new Error('Облако ещё загружается');
      const saved=await window.panoraCloud.setRestaurantActiveConfirmed(restaurantId,nextActive);
      partner.active=nextActive;updateLocalArchive(restaurantId,nextActive,saved?.updatedAt);
      await refresh();
      window.dispatchEvent(new CustomEvent('panora:partner-archive-changed',{detail:{restaurantId,active:nextActive}}));
      return true;
    }catch(error){alert(`Не удалось ${nextActive?'восстановить':'архивировать'} партнёра: ${error.message||error}`);return false}
  };

  const syncCaches=(restaurantId,values)=>{
    try{
      const restaurants=JSON.parse(localStorage.getItem('panora-restaurants')||'[]');
      const next=(Array.isArray(restaurants)?restaurants:[]).map(r=>{
        if(String(r.id)!==String(restaurantId))return r;
        return {...r,prices:{...(r.prices||{}),...values}};
      });
      localStorage.setItem('panora-restaurants',JSON.stringify(next));
    }catch{}
    try{
      const map=JSON.parse(localStorage.getItem('panora-admin-restaurant-prices-v420')||'{}')||{};
      map[String(restaurantId)]??={};
      Object.entries(values).forEach(([productId,price])=>{
        map[String(restaurantId)][productId]=Number(price);
      });
      localStorage.setItem('panora-admin-restaurant-prices-v420',JSON.stringify(map));
    }catch{}
  };

  const render=rows=>{
    const root=cards();
    if(!root)return;
    lastRows=rows||[];
    const activeRows=(rows||[]).filter(r=>r?.active!==false),archivedRows=(rows||[]).filter(r=>r?.active===false);
    root.innerHTML=activeRows.map(r=>{
      const prices=Object.fromEntries((r.restaurant_prices||[]).map(x=>[String(x.product_id),Number(x.price)]));
      const productList=products();
      const restaurantId=String(r.id);
      return `<article class="restaurant-card" data-direct-restaurant="${esc(r.id)}">
        <div class="restaurant-card-head"><span class="tag">${esc(partnerTypeLabel(r.partner_type))}</span><button type="button" class="restaurant-delete" data-direct-archive-partner="${esc(restaurantId)}">Архивировать</button></div>
        <h3>${esc(r.name)}</h3>
        <p>${esc(r.email||'')}<br>${esc(r.address||'')}</p>
        ${r.email?`<div class="partner-access-actions"><button type="button" class="secondary" data-partner-invite="${esc(restaurantId)}">Пригласить в Panora</button><span data-partner-invite-status="${esc(restaurantId)}"></span></div>`:''}
        <details class="partner-contact-settings partner-profile-settings">
          <summary>Данные партнёра</summary>
          <div class="partner-contact-grid partner-profile-grid">
            <label><span>Название</span><input data-partner-profile="name" value="${esc(r.name||'')}" maxlength="120"></label>
            <label><span>Email</span><input data-partner-profile="email" type="email" value="${esc(r.email||'')}" autocomplete="off"></label>
            <label><span>Телефон</span><input data-partner-profile="phone" type="tel" value="${esc(r.phone||'')}" placeholder="+34 600 000 000"></label>
            <label><span>Контактное лицо</span><input data-partner-profile="contact_person" value="${esc(r.contact_person||'')}"></label>
            <label class="partner-profile-wide"><span>Адрес</span><input data-partner-profile="address" value="${esc(r.address||'')}"></label>
            <label><span>Юридическое название</span><input data-partner-profile="legal_name" value="${esc(r.legal_name||'')}"></label>
            <label><span>NIF / CIF</span><input data-partner-profile="tax_id" value="${esc(r.tax_id||'')}"></label>
            <label class="partner-profile-wide"><span>Адрес для документов</span><input data-partner-profile="billing_address" value="${esc(r.billing_address||'')}"></label>
            <label><span>Часы приёмки</span><input data-partner-profile="receiving_hours" value="${esc(r.receiving_hours||'')}" placeholder="09:00–18:00"></label>
            <label><span>Дни приёмки</span><input data-partner-profile="receiving_days" value="${esc(r.receiving_days||'')}"></label>
            <label class="partner-profile-wide"><span>Комментарий к доставке</span><input data-partner-profile="delivery_comment" value="${esc(r.delivery_comment||'')}"></label>
            <label><span>Тип партнёра</span><select data-partner-profile="partner_type">${[['restaurant','Ресторан'],['shop','Магазин'],['hotel','Отель'],['cafe','Кафе'],['catering','Кейтеринг'],['other','Другое']].map(([value,label])=>`<option value="${value}"${String(r.partner_type||'restaurant')===value?' selected':''}>${label}</option>`).join('')}</select></label>
          </div>
          <p class="partner-profile-note">Email здесь используется в карточке и документах. Email для входа партнёр меняет в своём профиле безопасности.</p>
          <div class="partner-contact-save-row"><span data-partner-profile-status></span><button type="button" class="secondary" data-save-partner-profile="${esc(restaurantId)}">Сохранить данные</button></div>
        </details>
        <details class="partner-contact-settings">
          <summary>Контакты и мессенджеры</summary>
          <div class="partner-contact-grid">
            <label><span>WhatsApp</span><input data-partner-contact="whatsapp" value="${esc(r.whatsapp||'')}" placeholder="+34 600 000 000"></label>
            <label><span>Telegram</span><input data-partner-contact="telegram" value="${esc(r.telegram||'')}" placeholder="@username"></label>
            <label><span>Signal</span><input data-partner-contact="signal" value="${esc(messengerValue(r,'signal'))}" placeholder="+34 600 000 000"></label>
            <label><span>Viber</span><input data-partner-contact="viber" value="${esc(messengerValue(r,'viber'))}" placeholder="+34 600 000 000"></label>
            <label><span>Messenger</span><input data-partner-contact="messenger" value="${esc(messengerValue(r,'messenger'))}" placeholder="username или m.me"></label>
            <label><span>Главный способ</span><select data-partner-contact="preferred">
              ${[['whatsapp','WhatsApp'],['email','Email'],['telegram','Telegram'],['signal','Signal'],['viber','Viber'],['messenger','Messenger'],['copy','Копировать']].map(([value,label])=>`<option value="${value}"${preferredChannel(r)===value?' selected':''}>${label}</option>`).join('')}
            </select></label>
          </div>
          <div class="partner-contact-save-row"><span data-partner-contact-status></span><button type="button" class="secondary" data-save-partner-contacts="${esc(restaurantId)}">Сохранить контакты</button></div>
        </details>
        <label class="partner-language-setting">
          <span><strong>Язык партнёра</strong><small>Кабинет, уведомления и документы</small></span>
          <select data-direct-partner-language="${esc(restaurantId)}">
            <option value="ru"${(r.language||"ru")==="ru"?" selected":""}>Русский</option>
            <option value="en"${r.language==="en"?" selected":""}>English</option>
            <option value="es"${r.language==="es"?" selected":""}>Español</option>
          </select>
        </label>
        ${productList.map(p=>{
          const productId=String(p.id);
          const key=draftKey(restaurantId,productId);
          const saved=Number(prices[productId]??p.basePrice??p.price??0);
          const shown=drafts.has(key)?Number(drafts.get(key)):saved;
          return `<label class="price-row${drafts.has(key)?' price-row-dirty':''}" data-direct-price-row="${esc(key)}" data-panora-price-owned="direct">
            <span>${esc(productLabel(p.id))}<small>Оптовая цена</small></span>
            <span><input data-direct-price="${esc(key)}" type="text" inputmode="decimal" autocomplete="off" value="${shown.toFixed(2)}"> €</span>
          </label>`;
        }).join('')}
        <div class="partner-price-savebar${partnerHasDrafts(restaurantId)?' is-visible':''}" data-price-savebar="${esc(restaurantId)}">
          <span class="partner-price-status" data-price-status="${esc(restaurantId)}">${partnerHasDrafts(restaurantId)?'Есть несохранённые изменения':''}</span>
          <button type="button" class="partner-price-save" data-save-partner-prices="${esc(restaurantId)}"${partnerHasDrafts(restaurantId)?'':' hidden'}>Сохранить цены</button>
        </div>
      </article>`;
    }).join('')||'<div class="empty-row">Нет активных партнёров.</div>';
    if(archivedRows.length){
      root.insertAdjacentHTML('beforeend',`<section class="direct-archived-partners"><div class="direct-archived-head"><div><span class="tag">Архив</span><h3>Архивные партнёры</h3></div><small>Финансовая история сохранена</small></div>${archivedRows.map(r=>{const debt=partnerDebtToday(r.id);return `<article class="direct-archived-row"><span><strong>${esc(r.name)}</strong><small>${esc(r.email||'')}</small></span><span class="direct-archived-debt${debt>0.005?' has-debt':''}"><small>${debt>0.005?'Задолженность на сегодня':'Расчёты закрыты'}</small><strong>${euro(debt)}</strong></span><button type="button" data-direct-restore-partner="${esc(r.id)}">Восстановить</button></article>`}).join('')}</section>`);
    }

    root.querySelectorAll('[data-direct-archive-partner]').forEach(button=>button.onclick=()=>setPartnerActive(button.dataset.directArchivePartner,false));
    root.querySelectorAll('[data-direct-restore-partner]').forEach(button=>button.onclick=()=>setPartnerActive(button.dataset.directRestorePartner,true));
    root.querySelectorAll('[data-partner-invite]').forEach(button=>{
      button.onclick=async()=>{
        const restaurantId=String(button.dataset.partnerInvite||''),partner=lastRows.find(r=>String(r.id)===restaurantId);
        const email=String(partner?.email||'').trim().toLowerCase();if(!email)return;
        const link=`https://gamaleyandrey-create.github.io/panora-b2b/?invite=${encodeURIComponent(email)}`;
        const subject='Panora — доступ для партнёра';
        const body=`Здравствуйте!\n\nДля вашей компании открыт кабинет партнёра Panora.\n\nПервый вход: ${link}\n\nИспользуйте email ${email} и создайте пароль. После этого вход выполняется по email и паролю.`;
        const status=root.querySelector(`[data-partner-invite-status="${CSS.escape(restaurantId)}"]`);
        try{
          if(navigator.share){await navigator.share({title:subject,text:body});if(status)status.textContent='Приглашение открыто ✓'}
          else{location.href=`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;if(status)status.textContent='Открыто письмо ✓'}
        }catch(error){
          if(error?.name==='AbortError')return;
          try{await navigator.clipboard.writeText(link);if(status)status.textContent='Ссылка скопирована ✓'}catch{if(status)status.textContent=link}
        }
        setTimeout(()=>{if(status)status.textContent=''},2500);
      };
    });
    root.querySelectorAll('select[data-direct-partner-language]').forEach(select=>{
      select.addEventListener('change',async()=>{
        const restaurantId=String(select.dataset.directPartnerLanguage||'');
        const partner=lastRows.find(r=>String(r.id)===restaurantId);
        if(!partner)return;
        const previous=partner.language||'ru';
        const next=['ru','en','es'].includes(select.value)?select.value:'ru';
        if(next===previous)return;
        select.disabled=true;
        try{
          await rest(`restaurants?id=eq.${encodeURIComponent(restaurantId)}`,{
            method:'PATCH',
            headers:{Prefer:'return=representation'},
            body:JSON.stringify({language:next,updated_at:new Date().toISOString()})
          });
          partner.language=next;
          try{
            const restaurants=JSON.parse(localStorage.getItem('panora-restaurants')||'[]');
            const updated=(Array.isArray(restaurants)?restaurants:[]).map(r=>String(r.id)===restaurantId?{...r,language:next}:r);
            localStorage.setItem('panora-restaurants',JSON.stringify(updated));
          }catch{}
          window.dispatchEvent(new CustomEvent('panora:partner-language-changed',{detail:{restaurantId,language:next,source:'bakery'}}));
          select.disabled=false;
          const status=select.closest('.partner-language-setting')?.querySelector('small');
          if(status){const original=status.textContent;status.textContent='Сохранено ✓';setTimeout(()=>{if(status)status.textContent=original},1200);}
        }catch(error){
          select.value=previous;
          select.disabled=false;
          alert(`Не удалось сохранить язык партнёра: ${error.message||error}`);
        }
      });
    });

    root.querySelectorAll('[data-save-partner-profile]').forEach(button=>{
      button.addEventListener('click',async()=>{
        const restaurantId=String(button.dataset.savePartnerProfile||''),card=button.closest('[data-direct-restaurant]');
        const partner=lastRows.find(r=>String(r.id)===restaurantId);if(!partner||!card)return;
        const status=card.querySelector('[data-partner-profile-status]'),payload=profilePayload(card);
        if(!payload.name){if(status)status.textContent='Укажите название';return}
        button.disabled=true;if(status)status.textContent='Сохраняем…';
        try{
          const rows=await rest(`restaurants?id=eq.${encodeURIComponent(restaurantId)}`,{
            method:'PATCH',headers:{Prefer:'return=representation'},
            body:JSON.stringify({...payload,updated_at:new Date().toISOString()})
          });
          const saved=Array.isArray(rows)?rows[0]:null;
          Object.assign(partner,payload,saved||{});
          try{
            const local=JSON.parse(localStorage.getItem('panora-restaurants')||'[]');
            const next=(Array.isArray(local)?local:[]).map(r=>String(r.id)===restaurantId?{...r,...payload}:r);
            localStorage.setItem('panora-restaurants',JSON.stringify(next));
          }catch{}
          const title=card.querySelector('h3'),summary=card.querySelector(':scope > p');
          if(title)title.textContent=partner.name||payload.name;
          if(summary)summary.innerHTML=`${esc(partner.email||'')}<br>${esc(partner.address||'')}`;
          if(status){status.textContent='Сохранено ✓';setTimeout(()=>{if(status)status.textContent=''},1400)}
          window.dispatchEvent(new CustomEvent('panora:partner-profile-changed',{detail:{restaurantId}}));
        }catch(error){
          if(status)status.textContent='Ошибка сохранения';
          alert(`Не удалось сохранить данные партнёра: ${error.message||error}`);
        }finally{button.disabled=false}
      });
    });

    root.querySelectorAll('[data-save-partner-contacts]').forEach(button=>{
      button.addEventListener('click',async()=>{
        const restaurantId=String(button.dataset.savePartnerContacts||''),card=button.closest('[data-direct-restaurant]');
        const partner=lastRows.find(r=>String(r.id)===restaurantId);if(!partner||!card)return;
        const status=card.querySelector('[data-partner-contact-status]'),payload=contactPayload(card);
        button.disabled=true;if(status)status.textContent='Сохраняем…';
        try{
          const rows=await rest(`restaurants?id=eq.${encodeURIComponent(restaurantId)}`,{
            method:'PATCH',headers:{Prefer:'return=representation'},
            body:JSON.stringify({...payload,updated_at:new Date().toISOString()})
          });
          const saved=Array.isArray(rows)?rows[0]:null;
          partner.whatsapp=saved?.whatsapp??payload.whatsapp??'';
          partner.telegram=saved?.telegram??payload.telegram??'';
          partner.extra_messengers=saved?.extra_messengers??payload.extra_messengers;
          try{
            const local=JSON.parse(localStorage.getItem('panora-restaurants')||'[]');
            const next=(Array.isArray(local)?local:[]).map(r=>String(r.id)===restaurantId?{
              ...r,whatsapp:partner.whatsapp||'',telegram:partner.telegram||'',
              extraMessengers:(partner.extra_messengers||[]).map(x=>({name:x.name,contact:x.contact}))
            }:r);
            localStorage.setItem('panora-restaurants',JSON.stringify(next));
          }catch{}
          if(status){status.textContent='Сохранено ✓';setTimeout(()=>{if(status)status.textContent=''},1400)}
          window.dispatchEvent(new CustomEvent('panora:partner-contacts-changed',{detail:{restaurantId}}));
        }catch(error){
          if(status)status.textContent='Ошибка сохранения';
          alert(`Не удалось сохранить контакты: ${error.message||error}`);
        }finally{button.disabled=false}
      });
    });

    root.querySelectorAll('input[data-direct-price]').forEach(input=>{
      const key=String(input.dataset.directPrice||'');
      const [restaurantId,productId]=key.split(':');

      const parse=()=>{
        const raw=String(input.value||'').replace(/\s+/g,'').replace(',','.').trim();
        if(raw==='')return null;
        const value=Number(raw);
        return Number.isFinite(value)&&value>=0?value:null;
      };

      const markDirty=()=>{
        const value=parse();
        const partner=lastRows.find(r=>String(r.id)===String(restaurantId));
        const savedRow=(partner?.restaurant_prices||[]).find(x=>String(x.product_id)===String(productId));
        const saved=Number(savedRow?.price??0);
        const row=input.closest('.price-row');
        if(value===null){
          row?.classList.add('price-row-error');
          return;
        }
        row?.classList.remove('price-row-error');
        if(Math.abs(Number(value)-saved)<0.0001){
          drafts.delete(key);
          row?.classList.remove('price-row-dirty');
        }else{
          drafts.set(key,Number(value));
          row?.classList.add('price-row-dirty');
        }
        updateSavebar(restaurantId);
      };

      input.addEventListener('focus',()=>requestAnimationFrame(()=>input.select()));
      input.addEventListener('input',markDirty);
      input.addEventListener('change',markDirty);
      input.addEventListener('keydown',event=>{
        if(event.key==='Enter'){
          event.preventDefault();
          input.blur(); // explicit Save button remains the only save action
        }
      });
      input.addEventListener('blur',markDirty);
    });

    root.querySelectorAll('[data-save-partner-prices]').forEach(button=>{
      button.addEventListener('click',()=>savePartnerPrices(button.dataset.savePartnerPrices));
    });
  };

  const updateSavebar=restaurantId=>{
    const root=cards();
    if(!root)return;
    const bar=root.querySelector(`[data-price-savebar="${CSS.escape(String(restaurantId))}"]`);
    const button=root.querySelector(`[data-save-partner-prices="${CSS.escape(String(restaurantId))}"]`);
    const status=root.querySelector(`[data-price-status="${CSS.escape(String(restaurantId))}"]`);
    const dirty=partnerHasDrafts(String(restaurantId));
    bar?.classList.toggle('is-visible',dirty||savingRestaurants.has(String(restaurantId)));
    if(button){
      button.hidden=!dirty;
      button.disabled=savingRestaurants.has(String(restaurantId));
      button.textContent=savingRestaurants.has(String(restaurantId))?'Сохраняем…':'Сохранить цены';
    }
    if(status&&!savingRestaurants.has(String(restaurantId))){
      status.textContent=dirty?'Есть несохранённые изменения':'';
      status.className='partner-price-status';
    }
  };

  const savePartnerPrices=async restaurantId=>{
    restaurantId=String(restaurantId||'');
    if(!restaurantId||savingRestaurants.has(restaurantId))return;

    const entries=[...drafts.entries()]
      .filter(([key])=>key.startsWith(`${restaurantId}:`))
      .map(([key,price])=>({productId:key.slice(restaurantId.length+1),price:Number(price)}));

    if(!entries.length)return;

    const root=cards();
    const status=root?.querySelector(`[data-price-status="${CSS.escape(restaurantId)}"]`);
    savingRestaurants.add(restaurantId);
    updateSavebar(restaurantId);
    if(status){
      status.textContent='Сохраняем цены…';
      status.className='partner-price-status is-saving';
    }

    try{
      const payload=entries.map(({productId,price})=>({
        restaurant_id:restaurantId,
        product_id:productId,
        price:Number(price),
        updated_at:new Date().toISOString()
      }));

      await rest('restaurant_prices?on_conflict=restaurant_id,product_id',{
        method:'POST',
        headers:{Prefer:'resolution=merge-duplicates,return=representation'},
        body:JSON.stringify(payload)
      });

      const verified=await rest(
        `restaurant_prices?restaurant_id=eq.${encodeURIComponent(restaurantId)}&select=restaurant_id,product_id,price,updated_at`
      );
      const verifiedMap=Object.fromEntries((verified||[]).map(row=>[String(row.product_id),Number(row.price)]));

      for(const {productId,price} of entries){
        if(!(productId in verifiedMap)||Math.abs(Number(verifiedMap[productId])-Number(price))>0.0001){
          throw new Error(`Supabase не подтвердил цену для ${productLabel(productId)}`);
        }
      }

      const confirmed={};
      for(const {productId} of entries){
        confirmed[productId]=Number(verifiedMap[productId]);
        drafts.delete(draftKey(restaurantId,productId));
      }
      syncCaches(restaurantId,confirmed);

      const partner=lastRows.find(r=>String(r.id)===restaurantId);
      if(partner){
        partner.restaurant_prices=Array.isArray(partner.restaurant_prices)?partner.restaurant_prices:[];
        Object.entries(confirmed).forEach(([productId,price])=>{
          const existing=partner.restaurant_prices.find(x=>String(x.product_id)===String(productId));
          if(existing)existing.price=Number(price);
          else partner.restaurant_prices.push({product_id:productId,price:Number(price),updated_at:new Date().toISOString()});
        });
      }

      render(lastRows);
      const nextStatus=cards()?.querySelector(`[data-price-status="${CSS.escape(restaurantId)}"]`);
      const nextBar=cards()?.querySelector(`[data-price-savebar="${CSS.escape(restaurantId)}"]`);
      if(nextStatus){
        nextStatus.textContent='Цены сохранены';
        nextStatus.className='partner-price-status is-saved';
      }
      nextBar?.classList.add('is-visible');
      setTimeout(()=>{
        const currentStatus=cards()?.querySelector(`[data-price-status="${CSS.escape(restaurantId)}"]`);
        const currentBar=cards()?.querySelector(`[data-price-savebar="${CSS.escape(restaurantId)}"]`);
        if(currentStatus&&!partnerHasDrafts(restaurantId)){
          currentStatus.textContent='';
          currentStatus.className='partner-price-status';
          currentBar?.classList.remove('is-visible');
        }
      },1800);

      window.dispatchEvent(new CustomEvent('panora:partner-prices-changed',{
        detail:{restaurantId,prices:confirmed,source:'bakery-explicit-save'}
      }));
    }catch(error){
      console.error('Panora explicit partner price save',error);
      if(status){
        status.textContent='Не удалось сохранить. Проверьте соединение и повторите.';
        status.className='partner-price-status is-error';
      }
      alert(`Не удалось сохранить цены: ${error.message||error}`);
    }finally{
      savingRestaurants.delete(restaurantId);
      updateSavebar(restaurantId);
    }
  };

  const refresh=async()=>{
    // Never redraw while there are unsaved user changes.
    if(!active||loading||drafts.size||savingRestaurants.size)return;
    loading=true;
    try{
      const rows=await rest('restaurants?select=id,name,email,address,phone,whatsapp,telegram,extra_messengers,legal_name,tax_id,billing_address,contact_person,delivery_comment,receiving_hours,receiving_days,partner_type,language,active,updated_at,restaurant_prices(product_id,price,updated_at)&order=created_at.asc');
      if(active)render(rows||[]);
    }catch(error){
      console.error('Panora direct partners refresh',error);
      const root=cards();
      if(root&&active)root.innerHTML=`<div class="empty-row">Ошибка загрузки цен из Supabase: ${esc(error.message||error)}</div>`;
    }finally{
      loading=false;
    }
  };

  const connectRealtime=()=>{
    clearTimeout(reconnectTimer);
    try{ws?.close()}catch{}
    ws=null;
    realtimeOk=false;
    const s=session();
    if(!s?.access_token||!cfg.url)return;
    const wsUrl=cfg.url.replace(/^http/,'ws')+'/realtime/v1/websocket?apikey='+encodeURIComponent(cfg.publishableKey)+'&vsn=1.0.0';
    try{
      ws=new WebSocket(wsUrl);
      ws.onopen=()=>{
        realtimeOk=true;
        ws.send(JSON.stringify({
          topic:'realtime:public:restaurant_prices',
          event:'phx_join',
          payload:{
            config:{
              broadcast:{ack:false,self:false},
              presence:{key:''},
              postgres_changes:[{event:'*',schema:'public',table:'restaurant_prices'}]
            },
            access_token:s.access_token
          },
          ref:'1'
        }));
      };
      ws.onmessage=event=>{
        try{
          const msg=JSON.parse(event.data||'{}');
          if(msg.event==='postgres_changes'&&active)refresh();
        }catch{}
      };
      ws.onerror=()=>{};
      ws.onclose=()=>{
        realtimeOk=false;
        if(active)reconnectTimer=setTimeout(connectRealtime,4000);
      };
    }catch{
      realtimeOk=false;
    }
  };

  const renderCurrent=()=>{
    if(!active)active=true;
    if(lastRows.length){
      render(lastRows);
      return;
    }
    refresh();
  };

  const activate=()=>{
    active=true;
    renderCurrent();
    connectRealtime();
  };
  const deactivate=()=>{
    active=false;
    clearTimeout(reconnectTimer);
    try{ws?.close()}catch{}
    ws=null;
  };

  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('.admin-nav [data-view]');
    if(!button)return;
    if(button.dataset.view==='restaurants')setTimeout(activate,50);
    else if(active)deactivate();
  },true);

  document.addEventListener('visibilitychange',()=>{if(active&&!document.hidden)refresh()});
  window.addEventListener('focus',()=>{if(active)refresh()});

  setTimeout(()=>{
    const view=screen();
    if(view?.classList.contains('active'))activate();
  },500);

  const legacyRenderRestaurants=window.renderRestaurants;
  window.panoraDirectPartnerPrices={refresh,activate,deactivate,renderCurrent};

  // Final ownership guard: this file is loaded last. Any later call from
  // renderCommerce/cloud-sync/product-admin must keep the direct design visible
  // while the Partners view is active.
  if(typeof legacyRenderRestaurants==="function"){
    window.renderRestaurants=function(){
      if(screen()?.classList.contains("active")){
        renderCurrent();
        return;
      }
      return legacyRenderRestaurants.apply(this,arguments);
    };
  }
})();
