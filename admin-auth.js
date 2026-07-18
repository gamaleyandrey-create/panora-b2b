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
    try{const profile=await getProfile(session.access_token,session.user.id);unlock(session,profile);return true}catch{
      const updated=await refresh(session);if(!updated)return false;
      try{const profile=await getProfile(updated.access_token,updated.user.id);unlock(updated,profile);return true}catch{return false}
    }
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();message('');const submit=form.querySelector('button');submit.disabled=true;
    const data=new FormData(form);
    try{
      const response=await fetch(`${cfg.url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email:String(data.get('email')).trim(),password:String(data.get('password'))})});
      const session=await response.json();
      if(!response.ok)throw new Error(session.error_description||session.msg||'Неверный email или пароль.');
      const profile=await getProfile(session.access_token,session.user.id);saveSession(session);unlock(session,profile);form.reset();
    }catch(err){message(err.message||'Не удалось войти. Проверьте соединение.')}finally{submit.disabled=false}
  });
  validate(readSession()).then(ok=>{if(!ok){clearSession();document.body.classList.remove('auth-pending');layer.hidden=false}});
})();
