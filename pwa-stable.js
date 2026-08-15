
/* Panora v334 — stable install/update controller */
(function(){
  const BUILD='6080';
  let deferredPrompt=null;

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
    el.querySelector('.panora-pwa-close').onclick=()=>{el.hidden=true};
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
      const reg=await navigator.serviceWorker.register(`sw.js?v=${BUILD}`,{scope:'./',updateViaCache:'none'});
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
    show('Panora можно установить как приложение.','install',{label:'Установить',run:async()=>{
      if(!deferredPrompt)return;deferredPrompt.prompt();try{await deferredPrompt.userChoice}catch{}deferredPrompt=null;
    }});
  });
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;show('Panora установлена.','success')});
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
