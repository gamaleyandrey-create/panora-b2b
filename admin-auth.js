(()=>{
  const cfg=window.PANORA_SUPABASE;
  const layer=document.querySelector('#adminAuthLayer');
  const form=document.querySelector('#adminAuthForm');
  const error=document.querySelector('#adminAuthError');
  const sessionKey='panora-supabase-session';
  const headers=token=>({apikey:cfg.publishableKey,Authorization:`Bearer ${token}`});
  const readSession=()=>{try{return JSON.parse(localStorage.getItem(sessionKey)||'null')}catch{return null}};
  const saveSession=value=>localStorage.setItem(sessionKey,JSON.stringify(value));
  const clearSession=()=>localStorage.removeItem(sessionKey);
  const cleanRemoteMark='panora-clean-production-cloud-v974';
  async function cleanPartnerTrainingCloud(session){
    // Panora 9.73: the production app excludes all partner/B2B records created before the cutover.
    // Clear device caches before authenticated cloud modules start, so training data cannot flash or re-upload.
    try{
      const keys=['panora-restaurants','panora-orders','panora-payments','panora-delivery-notes','panora-portal-restaurants','panora-portal-orders','panora-portal-payments','panora-portal-delivery-notes','panora-admin-restaurant-prices-v420','panora-order-counts-cache','panora-admin-orders-watermark-v936','panora-admin-payments-watermark-v936','panora-raw-stock-movements','panora-stock-movements','panora-raw-stock-cloud-watermark-v934','panora-finished-stock-watermark-v934'];
      keys.forEach(key=>localStorage.removeItem(key));
      localStorage.setItem(cleanRemoteMark,'1');
    }catch{}
    return true;
  }
  async function signOut(session=readSession()){
    try{if(session?.access_token)await fetch(`${cfg.url}/auth/v1/logout`,{method:'POST',headers:headers(session.access_token)})}catch{}
    clearSession();location.reload();
  }
  const message=text=>{error.textContent=text||''};
  async function getProfile(token,userId){
    const url=`${cfg.url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,role,display_name`;
    const response=await fetch(url,{headers:headers(token)});
    if(!response.ok)throw new Error('Не удалось проверить права пользователя.');
    const rows=await response.json();
    if(!rows[0]||rows[0].role!=='admin')throw new Error('У этого пользователя нет прав администратора.');
    return rows[0];
  }
  async function refresh(session){
    if(!session?.refresh_token)return null;
    const response=await fetch(`${cfg.url}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
    if(!response.ok)return null;
    const updated=await response.json();saveSession(updated);return updated;
  }
  function unlock(session,profile){
    window.panoraSupabaseSession=session;
    window.panoraAdminProfile=profile;
    document.body.classList.remove('auth-pending');
    document.body.classList.add('admin-authenticated');
    layer.hidden=true;
    const button=document.querySelector('#adminLogout');
    if(button)button.onclick=()=>signOut(session);
    window.dispatchEvent(new CustomEvent('panora:authenticated',{detail:session}));
  }
  async function validate(session){
    if(!session)return false;
    try{const profile=await getProfile(session.access_token,session.user.id);await cleanPartnerTrainingCloud(session);unlock(session,profile);return true}catch(err){console.error('Panora partner clean start',err);message('Не удалось очистить учебные данные партнёров: '+(err.message||err));
      const updated=await refresh(session);if(!updated)return false;
      try{const profile=await getProfile(updated.access_token,updated.user.id);await cleanPartnerTrainingCloud(updated);unlock(updated,profile);return true}catch(err){console.error('Panora partner clean start',err);message('Не удалось очистить учебные данные партнёров: '+(err.message||err));return false}
    }
  }
  async function changePassword(currentPassword,newPassword){
    const active=readSession();
    const email=String(active?.user?.email||'').trim().toLowerCase();
    if(!active?.access_token||!email)throw new Error('Сессия входа устарела. Войдите в пекарню заново.');
    const verifyResponse=await fetch(`${cfg.url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email,password:currentPassword})});
    const verified=await verifyResponse.json();
    if(!verifyResponse.ok)throw new Error('Текущий пароль указан неверно.');
    const updateResponse=await fetch(`${cfg.url}/auth/v1/user`,{method:'PUT',headers:{...headers(verified.access_token),'Content-Type':'application/json'},body:JSON.stringify({password:newPassword})});
    const updated=await updateResponse.json();
    if(!updateResponse.ok)throw new Error(updated?.msg||updated?.message||updated?.error_description||'Не удалось изменить пароль.');
    saveSession(verified);
    window.panoraSupabaseSession=verified;
    return true;
  }
  const passwordForm=document.querySelector('#adminPasswordForm');
  if(passwordForm){
    passwordForm.addEventListener('submit',async event=>{
      event.preventDefault();
      const status=document.querySelector('#adminPasswordStatus');
      const button=passwordForm.querySelector('[type="submit"]');
      const data=new FormData(passwordForm);
      const current=String(data.get('currentPassword')||'');
      const next=String(data.get('newPassword')||'');
      const confirm=String(data.get('confirmPassword')||'');
      if(status){status.textContent='';status.classList.remove('success','error')}
      if(next.length<8){if(status){status.textContent='Новый пароль должен содержать не менее 8 символов.';status.classList.add('error')}return}
      if(next!==confirm){if(status){status.textContent='Новый пароль и подтверждение не совпадают.';status.classList.add('error')}return}
      if(current===next){if(status){status.textContent='Новый пароль должен отличаться от текущего.';status.classList.add('error')}return}
      button.disabled=true;
      try{
        await changePassword(current,next);
        passwordForm.reset();
        if(status){status.textContent='Пароль изменён.';status.classList.add('success')}
      }catch(err){if(status){status.textContent=err.message||'Не удалось изменить пароль.';status.classList.add('error')}}
      finally{button.disabled=false}
    });
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();message('');const submit=form.querySelector('button');submit.disabled=true;
    const data=new FormData(form);
    try{
      const response=await fetch(`${cfg.url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email:String(data.get('email')).trim(),password:String(data.get('password'))})});
      const session=await response.json();
      if(!response.ok)throw new Error(session.error_description||session.msg||'Неверный email или пароль.');
      const profile=await getProfile(session.access_token,session.user.id);saveSession(session);await cleanPartnerTrainingCloud(session);unlock(session,profile);form.reset();
    }catch(err){message(err.message||'Не удалось войти. Проверьте соединение.')}finally{submit.disabled=false}
  });
  validate(readSession()).then(ok=>{if(!ok){clearSession();document.body.classList.remove('auth-pending');layer.hidden=false}});
})();
