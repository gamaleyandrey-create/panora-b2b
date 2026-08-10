
/* Panora v334 — stable install/update controller */
(function(){
  const BUILD='3360';
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
    if(action){btn.textContent=action.label;btn.onclick=action.run}else btn.hidden=true;
    el.querySelector('.panora-pwa-close').onclick=()=>{el.hidden=true};
  }
  async function register(){
    if(!('serviceWorker' in navigator))return null;
    try{
      const reg=await navigator.serviceWorker.register(`sw.js?v=${BUILD}`,{scope:'./',updateViaCache:'none'});
      reg.update().catch(()=>{});
      if(reg.waiting){
        show('Доступно обновление Panora.','update',{label:'Обновить',run:()=>reg.waiting.postMessage({type:'PANORA_SKIP_WAITING'})});
      }
      reg.addEventListener('updatefound',()=>{
        const worker=reg.installing;if(!worker)return;
        worker.addEventListener('statechange',()=>{
          if(worker.state==='installed'&&navigator.serviceWorker.controller){
            show('Доступно обновление Panora.','update',{label:'Обновить',run:()=>worker.postMessage({type:'PANORA_SKIP_WAITING'})});
          }
        });
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
  navigator.serviceWorker?.addEventListener?.('controllerchange',()=>{
    if(sessionStorage.getItem('panora-pwa-reload')==='1')return;
    sessionStorage.setItem('panora-pwa-reload','1');
    location.reload();
  });
  window.addEventListener('load',()=>{sessionStorage.removeItem('panora-pwa-reload');register()},{once:true});
  window.panoraPwa={build:BUILD,register};
})();
