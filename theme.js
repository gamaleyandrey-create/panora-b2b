
/* Panora v329 — appearance controller */
(function(){
  const KEY='panora-theme';
  const root=document.documentElement;

  function systemTheme(){
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getTheme(){
    const saved=localStorage.getItem(KEY);
    return saved==='light'||saved==='dark' ? saved : systemTheme();
  }

  function label(theme){
    return theme==='dark' ? 'Светлая тема' : 'Тёмная тема';
  }

  function icon(theme){
    return theme==='dark' ? '☀️' : '🌙';
  }

  function syncButtons(theme){
    document.querySelectorAll('.panora-theme-toggle').forEach(btn=>{
      btn.textContent=icon(theme);
      btn.title=label(theme);
      btn.setAttribute('aria-label',label(theme));
      btn.setAttribute('aria-pressed',String(theme==='dark'));
    });
  }

  function apply(theme, persist=true){
    const next=theme==='dark'?'dark':'light';
    root.dataset.theme=next;
    if(persist)localStorage.setItem(KEY,next);
    syncButtons(next);
    window.dispatchEvent(new CustomEvent('panora:theme-changed',{detail:{theme:next}}));
  }

  function toggle(){
    apply((root.dataset.theme||getTheme())==='dark'?'light':'dark',true);
  }

  function install(){
    apply(getTheme(),false);

    const containers=[
      document.querySelector('.topbar .top-actions'),
      document.querySelector('.admin-topbar .top-actions'),
      document.querySelector('.admin-topbar > div:last-child')
    ].filter(Boolean);

    containers.forEach(container=>{
      if(container.querySelector('.panora-theme-toggle'))return;
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='panora-theme-toggle';
      btn.addEventListener('click',toggle);
      // Put theme control before logout/account when possible.
      const account=container.querySelector('#profileButton,[data-open-account],.account-entry,.logout-button,[data-logout],#logoutBtn');
      container.insertBefore(btn,account||null);
    });
    syncButtons(root.dataset.theme||getTheme());
  }

  // Apply as early as possible, then add buttons once DOM exists.
  apply(getTheme(),false);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();

  // If no explicit user choice exists, follow OS changes.
  if(window.matchMedia){
    const mq=window.matchMedia('(prefers-color-scheme: dark)');
    const handler=()=>{if(!localStorage.getItem(KEY))apply(systemTheme(),false)};
    mq.addEventListener?.('change',handler);
  }

  window.panoraTheme={get:()=>root.dataset.theme||getTheme(),set:apply,toggle};
})();
