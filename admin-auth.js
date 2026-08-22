/* Panora 9.82 — mobile network diagnostics and resilient admin authentication */
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
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const fetchOptions=options=>({cache:'no-store',credentials:'omit',mode:'cors',referrerPolicy:'no-referrer',...options});
  const isTransportError=err=>/load failed|failed to fetch|network|internet connection|network request failed|server panora unavailable|сервер panora недоступен/i.test(String(err?.message||err||''));
  const isIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
  async function probeServer(timeoutMs=6500){
    if(navigator.onLine===false)return {online:false,reachable:false};
    const probeUrl=`${cfg.url}/auth/v1/health?panora_probe=${Date.now()}`;
    try{
      await withTimeout(fetch(probeUrl,{method:'GET',cache:'no-store',credentials:'omit',mode:'no-cors',referrerPolicy:'no-referrer'}),timeoutMs);
      return {online:true,reachable:true};
    }catch(error){
      return {online:true,reachable:false,error};
    }
  }
  async function transportMessage(){
    const probe=await probeServer();
    if(!probe.online)return 'Нет подключения к интернету. Подключитесь к сети и повторите вход.';
    if(!probe.reachable)return isIOS()?
      'Сервер Panora недоступен через текущую сеть. На iPhone при LTE/5G переключитесь на Wi‑Fi и повторите вход.':
      'Сервер Panora недоступен через текущую сеть. Попробуйте другую сеть или Wi‑Fi.';
    return isIOS()?
      'Сервер Panora доступен, но запрос авторизации блокируется текущей сетью. На iPhone при LTE/5G переключитесь на Wi‑Fi и повторите вход.':
      'Сервер Panora доступен, но запрос авторизации блокируется сетью. Попробуйте другую сеть.';
  }
  function xhrRequest(url,options={},timeoutMs=15000){
    return new Promise((resolve,reject)=>{
      let xhr;
      try{xhr=new XMLHttpRequest()}catch(error){reject(error);return}
      xhr.open(String(options.method||'GET').toUpperCase(),url,true);
      xhr.timeout=timeoutMs;
      xhr.withCredentials=false;
      const h=options.headers||{};Object.entries(h).forEach(([key,value])=>{try{xhr.setRequestHeader(key,String(value))}catch{}});
      xhr.onload=()=>{
        const text=String(xhr.responseText||'');
        resolve({ok:xhr.status>=200&&xhr.status<300,status:xhr.status,text:async()=>text,json:async()=>{try{return text?JSON.parse(text):{}}catch{return {}}}});
      };
      xhr.onerror=()=>reject(new Error('Не удалось связаться с сервером Panora. Проверьте интернет или откройте приложение ещё раз.'));
      xhr.ontimeout=()=>reject(new Error('Сервер не ответил. Проверьте интернет и повторите вход.'));
      try{xhr.send(options.body??null)}catch(error){reject(error)}
    });
  }
  async function request(url,options={},timeoutMs=15000){
    const prepared=fetchOptions(options);
    let firstError=null;
    try{return await withTimeout(fetch(url,prepared),timeoutMs)}catch(error){firstError=error}
    if(!isTransportError(firstError))throw firstError;
    await sleep(350);
    try{return await withTimeout(fetch(url,prepared),timeoutMs)}catch(secondError){
      if(!isTransportError(secondError))throw secondError;
      try{return await xhrRequest(url,options,timeoutMs)}catch(xhrError){
        const err=new Error(await transportMessage());
        err.cause=xhrError||secondError||firstError;throw err;
      }
    }
  }
  window.panoraAuthNetworkCheck=async()=>{
    const result=await probeServer();
    return {build:'9830',online:result.online,serverReachable:result.reachable,ios:isIOS(),standalone:!!(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)};
  };
  async function signOut(session=readSession()){
    try{if(session?.access_token)await request(`${cfg.url}/auth/v1/logout`,{method:'POST',headers:headers(session.access_token)})}catch{}
    clearSession();location.reload();
  }
  const message=text=>{error.textContent=text||''};
  async function getProfile(token,userId){
    const url=`${cfg.url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,role,display_name`;
    const response=await request(url,{headers:headers(token)});
    if(!response.ok)throw new Error('Не удалось проверить права пользователя.');
    const rows=await response.json();
    if(!rows[0]||rows[0].role!=='admin')throw new Error('У этого пользователя нет прав администратора.');
    return rows[0];
  }
  async function refresh(session){
    if(!session?.refresh_token)return null;
    const response=await request(`${cfg.url}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
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
    try{const profile=await getProfile(session.access_token,session.user.id);unlock(session,profile);return true}catch{
      const updated=await refresh(session);if(!updated)return false;
      try{const profile=await getProfile(updated.access_token,updated.user.id);unlock(updated,profile);return true}catch{return false}
    }
  }
  async function changePassword(currentPassword,newPassword){
    const active=readSession();
    const email=String(active?.user?.email||'').trim().toLowerCase();
    if(!active?.access_token||!email)throw new Error('Сессия входа устарела. Войдите в пекарню заново.');
    const verifyResponse=await request(`${cfg.url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email,password:currentPassword})});
    const verified=await verifyResponse.json();
    if(!verifyResponse.ok)throw new Error('Текущий пароль указан неверно.');
    const updateResponse=await request(`${cfg.url}/auth/v1/user`,{method:'PUT',headers:{...headers(verified.access_token),'Content-Type':'application/json'},body:JSON.stringify({password:newPassword})});
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
    event.preventDefault();const generation=++authGeneration;message('');clearSession();const submit=form.querySelector('button[type="submit"]')||form.querySelector('button');submit.disabled=true;
    const data=new FormData(form);
    try{
      const response=await request(`${cfg.url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email:String(data.get('email')).trim(),password:String(data.get('password'))})});
      const session=await response.json();
      if(!response.ok)throw new Error(session.error_description||session.msg||'Неверный email или пароль.');
      const profile=await getProfile(session.access_token,session.user.id);if(generation!==authGeneration)return;saveSession(session);unlock(session,profile);form.reset();
    }catch(err){message(err.message||'Не удалось войти. Проверьте соединение.')}finally{submit.disabled=false}
  });
  window.addEventListener('panora:admin-session-expired',()=>{authUnlocked=false;clearSession();document.body.classList.remove('admin-authenticated','auth-pending');layer.hidden=false;message('Сессия завершена. Войдите снова.');});
  window.addEventListener('pageshow',()=>{if(!authUnlocked&&!readSession()){document.body.classList.remove('auth-pending');layer.hidden=false;}});
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
