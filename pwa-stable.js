
/* Panora 7.33 — stable install/update controller */
(function(){
  const BUILD='10180';
  const INSTALL_SNOOZE_MS=10*24*60*60*1000;
  let deferredPrompt=null;

  function installSnoozeKey(){
    const role=(location.pathname.match(/\/(partner|bakery|retail)\//i)||[])[1]||'root';
    return 'panora-pwa-install-snooze-until:'+role.toLowerCase();
  }
  function installSnoozed(){
    try{return Number(localStorage.getItem(installSnoozeKey())||0)>Date.now()}catch{return false}
  }
  function snoozeInstall(){
    try{localStorage.setItem(installSnoozeKey(),String(Date.now()+INSTALL_SNOOZE_MS))}catch{}
  }
  function clearInstallSnooze(){
    try{localStorage.removeItem(installSnoozeKey())}catch{}
  }

  function ensure(){
    let el=document.getElementById('panoraPwaStatus');
    if(el)return el;
    el=document.createElement('div');
    el.id='panoraPwaStatus';
    el.className='panora-pwa-status';
    el.hidden=true;
    document.body.appendChild(el);
    return el;
  }
  function show(text,type='info',action){
    const el=ensure();
    el.hidden=false;el.dataset.type=type;
    el.innerHTML='<span class="panora-pwa-text"></span><button type="button" class="panora-pwa-action"></button><button type="button" class="panora-pwa-close">×</button>';
    el.querySelector('.panora-pwa-text').textContent=text;
    const btn=el.querySelector('.panora-pwa-action');
    if(action){btn.textContent=action.label;btn.onclick=()=>action.run(btn)}else btn.hidden=true;
    el.querySelector('.panora-pwa-close').onclick=()=>{if(type==='install')snoozeInstall();el.hidden=true};
  }
  let updateReloading=false;
  function reloadWithBuild(){
    if(updateReloading)return;
    updateReloading=true;
    const url=new URL(location.href);
    url.searchParams.set('panora_build',BUILD);
    location.replace(url.toString());
  }
  async function applyUpdate(worker,reg,button){
    if(button){button.disabled=true;button.textContent='Обновляем…'}
    try{
      let target=worker||reg.waiting;
      if(!target){await reg.update();target=reg.waiting||reg.installing}
      if(!target){show('Panora уже обновлена.','success');return}
      target.addEventListener?.('statechange',()=>{if(target.state==='activated')reloadWithBuild()});
      target.postMessage({type:'PANORA_SKIP_WAITING'});
      setTimeout(()=>{if(!updateReloading)reloadWithBuild()},2200);
    }catch(error){
      console.warn('Panora PWA update',error);
      show('Не удалось применить обновление. Повторите ещё раз.','error',{label:'Повторить',run:btn=>applyUpdate(reg.waiting,reg,btn)});
    }
  }
  async function register(){
    if(!('serviceWorker' in navigator))return null;
    try{
      const roleMatch=location.pathname.match(/\/(partner|bakery|retail)\/(?:index\.html)?$/i);
      const swUrl=roleMatch?new URL('./sw.js?v='+BUILD,location.href).href:new URL('sw.js?v='+BUILD,document.baseURI).href;
      const swScope=roleMatch?new URL('./',location.href).pathname:new URL('./',document.baseURI).pathname;
      const reg=await navigator.serviceWorker.register(swUrl,{scope:swScope,updateViaCache:'none'});
      reg.update().catch(()=>{});
      const offer=worker=>show('Доступно обновление Panora.','update',{label:'Обновить',run:button=>applyUpdate(worker,reg,button)});
      if(reg.waiting)offer(reg.waiting);
      reg.addEventListener('updatefound',()=>{
        const worker=reg.installing;if(!worker)return;
        worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)offer(worker)});
      });
      return reg;
    }catch(error){console.warn('Panora PWA',error);return null}
  }
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();deferredPrompt=event;
    if(installSnoozed())return;
    show('Panora можно установить как приложение.','install',{label:'Установить',run:async()=>{
      if(!deferredPrompt)return;
      deferredPrompt.prompt();
      try{
        const choice=await deferredPrompt.userChoice;
        if(choice?.outcome==='dismissed')snoozeInstall();
      }catch{}
      deferredPrompt=null;
    }});
  });
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;clearInstallSnooze();show('Panora установлена.','success')});
  navigator.serviceWorker?.addEventListener?.('controllerchange',reloadWithBuild);
  window.addEventListener('load',()=>{
    const url=new URL(location.href);
    if(url.searchParams.get('panora_build')===BUILD){
      url.searchParams.delete('panora_build');
      history.replaceState(null,'',url.pathname+url.search+url.hash);
    }
    register();
  },{once:true});
  window.panoraPwa={build:BUILD,register};
})();
