(()=>{
  const cfg=window.PANORA_SUPABASE;
  if(!cfg)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const session=()=>window.panoraSupabaseSession||null;
  const passwordOk=value=>String(value||'').length>=6;
  const endpoint=()=>`${cfg.url}/functions/v1/admin-partner-password`;
  async function setPartnerPassword({restaurantId,email,password,mode='reset'}){
    const s=session();
    if(!s?.access_token)throw new Error('Сессия пекарни завершена. Войдите снова.');
    if(!passwordOk(password))throw new Error('Пароль должен содержать минимум 6 символов.');
    const response=await fetch(endpoint(),{
      method:'POST',cache:'no-store',mode:'cors',credentials:'omit',
      headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'},
      body:JSON.stringify({restaurantId,email,password,mode})
    });
    const text=await response.text();
    let data={};try{data=text?JSON.parse(text):{}}catch{}
    if(!response.ok){
      if(response.status===404)throw new Error('Серверная функция смены пароля ещё не опубликована в Supabase.');
      throw new Error(data.error||data.message||text||`Ошибка ${response.status}`);
    }
    return data;
  }
  function accessBlock(card){
    if(!card||card.querySelector('.partner-access-settings'))return;
    const id=String(card.dataset.directRestaurant||'');if(!id)return;
    const email=String(card.querySelector('[data-partner-profile="email"]')?.value||card.querySelector(':scope > p')?.textContent?.split('\n')[0]||'').trim();
    const details=document.createElement('details');details.className='partner-access-settings';
    details.innerHTML=`<summary>Доступ к кабинету</summary><div class="partner-access-grid"><label><span>Новый пароль</span><input type="password" data-partner-new-password minlength="6" autocomplete="new-password" placeholder="Минимум 6 символов"></label><label><span>Повторите пароль</span><input type="password" data-partner-confirm-password minlength="6" autocomplete="new-password" placeholder="Повторите пароль"></label></div><div class="partner-access-actions"><small data-partner-password-status>Старый пароль не отображается. Здесь можно назначить новый.</small><button type="button" class="secondary" data-partner-reset-password="${esc(id)}">Задать новый пароль</button></div>`;
    card.append(details);
    const button=details.querySelector('[data-partner-reset-password]');
    button.onclick=async()=>{
      const p1=details.querySelector('[data-partner-new-password]').value;
      const p2=details.querySelector('[data-partner-confirm-password]').value;
      const status=details.querySelector('[data-partner-password-status]');
      status.className='';
      if(!passwordOk(p1)){status.textContent='Минимум 6 символов.';status.classList.add('error');return}
      if(p1!==p2){status.textContent='Пароли не совпадают.';status.classList.add('error');return}
      const currentEmail=String(card.querySelector('[data-partner-profile="email"]')?.value||email).trim().toLowerCase();
      if(!currentEmail){status.textContent='У партнёра не указан email.';status.classList.add('error');return}
      button.disabled=true;status.textContent='Меняем пароль…';
      try{
        await setPartnerPassword({restaurantId:id,email:currentEmail,password:p1,mode:'reset'});
        details.querySelector('[data-partner-new-password]').value='';details.querySelector('[data-partner-confirm-password]').value='';
        status.textContent='Новый пароль установлен ✓';status.classList.add('success');
      }catch(error){status.textContent=error.message||'Не удалось изменить пароль.';status.classList.add('error')}
      finally{button.disabled=false}
    };
  }
  function enhance(){document.querySelectorAll('#restaurantCards [data-direct-restaurant]').forEach(accessBlock)}
  const root=document.querySelector('#restaurantCards');if(root)new MutationObserver(enhance).observe(root,{childList:true,subtree:true});
  window.addEventListener('panora:restaurants-ui-refresh',()=>setTimeout(enhance,30));
  setTimeout(enhance,100);

  // Preserve the first password before the existing partner form resets itself.
  const save=document.querySelector('#saveRestaurant');
  if(save)save.addEventListener('click',event=>{
    const form=document.querySelector('#restaurantForm');if(!form||!form.reportValidity())return;
    const f=new FormData(form),email=String(f.get('email')||'').trim().toLowerCase(),password=String(f.get('initialPassword')||'');
    if(!passwordOk(password))return;
    setTimeout(async()=>{
      try{
        await window.panoraCloud?.flushRestaurants?.();
        let list=[];try{list=JSON.parse(localStorage.getItem('panora-restaurants')||'[]')}catch{}
        const partner=(Array.isArray(list)?list:[]).find(r=>String(r.email||'').trim().toLowerCase()===email&&!r.deletedAt);
        if(!partner)throw new Error('Карточка партнёра ещё не синхронизирована.');
        await setPartnerPassword({restaurantId:partner.id,email,password,mode:'ensure'});
        window.dispatchEvent(new CustomEvent('panora:partner-access-created',{detail:{restaurantId:partner.id,email}}));
      }catch(error){
        console.error('Panora partner first password',error);
        alert(`Партнёр сохранён, но пароль кабинета не установлен: ${error.message||error}`);
      }
    },80);
  },true);
  window.panoraPartnerAccess={setPassword:setPartnerPassword};
})();
