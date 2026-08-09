
/* Panora v329.1 — light is always the default */
(function(){
  const KEY='panora-theme';
  const root=document.documentElement;

  function savedTheme(){
    return localStorage.getItem(KEY)==='dark' ? 'dark' : 'light';
  }

  function sync(){
    const dark=root.dataset.theme==='dark';
    document.querySelectorAll('.panora-theme-toggle').forEach(button=>{
      button.textContent=dark?'☀️':'🌙';
      button.title=dark?'Светлая тема':'Тёмная тема';
      button.setAttribute('aria-label',button.title);
    });
  }

  function setTheme(theme){
    const next=theme==='dark'?'dark':'light';
    root.dataset.theme=next;
    localStorage.setItem(KEY,next);
    sync();
  }

  function toggle(){
    setTheme(root.dataset.theme==='dark'?'light':'dark');
  }

  function install(){
    root.dataset.theme=savedTheme();

    const partner=document.querySelector('.topbar .top-actions');
    const bakery=document.querySelector('.admin-topbar .top-actions') ||
                  document.querySelector('.admin-topbar > div:last-child');
    [partner,bakery].filter(Boolean).forEach(container=>{
      if(container.querySelector('.panora-theme-toggle'))return;
      const button=document.createElement('button');
      button.type='button';
      button.className='panora-theme-toggle';
      button.addEventListener('click',toggle);

      // Place before the final account/logout action so language stays easy to reach.
      const anchor=container.querySelector('#profileButton,[data-logout],#logoutBtn,.logout-button');
      container.insertBefore(button,anchor||null);
    });
    sync();
  }

  // Important: first visit is LIGHT regardless of OS appearance.
  root.dataset.theme=savedTheme();
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',install,{once:true});
  }else{
    install();
  }

  window.panoraTheme={get:()=>root.dataset.theme,set:setTheme,toggle};
})();
