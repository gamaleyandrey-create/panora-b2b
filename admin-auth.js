(()=>{
  const cfg=window.PANORA_SUPABASE;
  const layer=document.querySelector('#adminAuthLayer');
  const form=document.querySelector('#adminAuthForm');
  const error=document.querySelector('#adminAuthError');
  const sessionKey='panora-admin-supabase-session-v975';
  const legacySessionKey='panora-supabase-session';
  try{localStorage.removeItem(legacySessionKey)}catch{}
  const headers=token=>({apikey:cfg.publishableKey,Authorization:`Bearer ${token}`});
  const readSession=()=>{try{return JSON.parse(localStorage.getItem(sessionKey)||'null')}catch{return null}};
  const saveSession=value=>localStorage.setItem(sessionKey,JSON.stringify(value));
  const clearSession=()=>{localStorage.removeItem(sessionKey);try{localStorage.removeItem(legacySessionKey)}catch{}};
  let authUnlocked=false;
  let authGeneration=0;
  const withTimeout=async(promise,ms=15000)=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Сервер не ответил. Проверьте интернет и повторите вход.')),ms)})])}finally{clearTimeout(timer)}};
  async function signOut(session=readSession()){
    try{if(session?.access_token)await fetch(`${cfg.url}/auth/v1/logout`,{method:'POST',headers:headers(session.access_token)})}catch{}
    clearSession();location.reload();
  }
  const message=text=>{error.textContent=text||''};
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function getProfile(token,userId){
    const url=`${cfg.url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,role,display_name`;
    let response;
    try{response=await withTimeout(fetch(url,{headers:headers(token)}),12000)}
    catch(cause){const e=new Error('Не удалось связаться с сервером проверки доступа.');e.code='PANORA_PROFILE_NETWORK';e.cause=cause;throw e}
    if(!response.ok){const e=new Error(response.status===401?'Сессия входа требует обновления.':'Не удалось проверить права пользователя.');e.status=response.status;e.code='PANORA_PROFILE_HTTP';throw e}
    const rows=await response.json();
    if(!rows[0]||rows[0].role!=='admin'){const e=new Error('У этого пользователя нет прав администратора.');e.code='PANORA_NOT_ADMIN';throw e}
    return rows[0];
  }
  async function verifyAdminSession(input,{allowRefresh=true}={}){
    let active=input;
    let lastError=null;
    for(let attempt=0;attempt<2;attempt++){
      try{return {session:active,profile:await getProfile(active.access_token,active.user.id)}}
      catch(error){
        lastError=error;
        if(error?.code==='PANORA_NOT_ADMIN')throw error;
        if(error?.status===401&&allowRefresh){
          const updated=await refresh(active);
          if(updated){active=updated;allowRefresh=false;continue}
        }
        if(attempt===0){await wait(650);continue}
      }
    }
    throw lastError||new Error('Не удалось проверить доступ.');
  }
  async function refresh(session){
    if(!session?.refresh_token)return null;
    const response=await withTimeout(fetch(`${cfg.url}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})}));
    if(!response.ok)return null;
    const updated=await response.json();saveSession(updated);return updated;
  }
  function unlock(session,profile){
    authUnlocked=true;
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
    try{
      const checked=await verifyAdminSession(session);
      saveSession(checked.session);unlock(checked.session,checked.profile);return true;
    }catch(error){
      if(error?.code==='PANORA_NOT_ADMIN')clearSession();
      return false;
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
    event.preventDefault();const generation=++authGeneration;message('Входим…');clearSession();const submit=form.querySelector('button[type="submit"]')||form.querySelector('button');submit.disabled=true;
    const data=new FormData(form);
    let authenticated=false;
    try{
      const response=await withTimeout(fetch(`${cfg.url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email:String(data.get('email')).trim(),password:String(data.get('password'))})}));
      const session=await response.json();
      if(!response.ok)throw new Error(session.error_description||session.msg||'Неверный email или пароль.');
      authenticated=true;saveSession(session);message('Пароль принят. Проверяем доступ…');
      const checked=await verifyAdminSession(session);if(generation!==authGeneration)return;
      saveSession(checked.session);unlock(checked.session,checked.profile);form.reset();message('');
    }catch(err){
      if(err?.code==='PANORA_NOT_ADMIN'){clearSession();message(err.message)}
      else if(authenticated){message('Вход подтверждён, но проверка доступа не завершилась. Проверьте интернет — Panora продолжит автоматически.')}
      else message(err.message||'Не удалось войти. Проверьте соединение.');
    }finally{submit.disabled=false}
  });
  window.addEventListener('panora:admin-session-expired',()=>{authUnlocked=false;clearSession();document.body.classList.remove('admin-authenticated','auth-pending');layer.hidden=false;message('Сессия завершена. Войдите снова.');});
  window.addEventListener('pageshow',()=>{if(!authUnlocked&&!readSession()){document.body.classList.remove('auth-pending');layer.hidden=false;}});

  let authResumeAt=0,authResumePromise=null;
  const resumeStoredLogin=()=>{
    if(authUnlocked||document.hidden||!navigator.onLine)return Promise.resolve(false);
    const stored=readSession();if(!stored?.access_token||!stored?.user?.id)return Promise.resolve(false);
    const now=Date.now();if(authResumePromise)return authResumePromise;if(now-authResumeAt<10000)return Promise.resolve(false);
    authResumeAt=now;message('Проверяем сохранённый вход…');
    authResumePromise=validate(stored).then(ok=>{if(!ok&&!authUnlocked)message('Не удалось проверить доступ. Проверьте интернет и повторите.');return ok}).finally(()=>{authResumePromise=null});
    return authResumePromise;
  };
  window.addEventListener('online',()=>resumeStoredLogin().catch(()=>{}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)resumeStoredLogin().catch(()=>{})});
  const initialSession=readSession();
  const restoreGeneration=authGeneration;
  if(!initialSession){
    document.body.classList.remove('auth-pending');
    layer.hidden=false;
  }else{
    validate(initialSession).then(ok=>{
      if(ok||authUnlocked||restoreGeneration!==authGeneration)return;
      const current=readSession();
      const unchanged=!!current&&current.access_token===initialSession.access_token&&current.refresh_token===initialSession.refresh_token;
      if(unchanged)clearSession();
      document.body.classList.remove('auth-pending');
      layer.hidden=false;
    }).catch(()=>{
      if(authUnlocked||restoreGeneration!==authGeneration)return;
      document.body.classList.remove('auth-pending');
      layer.hidden=false;
    });
  }
})();
