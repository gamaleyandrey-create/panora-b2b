
/* Panora v331 — unified connection/synchronization indicator */
(function(){
  let last={state:navigator.onLine?'synced':'offline',text:navigator.onLine?'Синхронизировано':'Нет сети'};

  const labels={
    synced:'Синхронизировано',
    syncing:'Синхронизация…',
    offline:'Нет сети',
    local:'Сохранено на устройстве',
    error:'Ошибка синхронизации',
    pending:'Ожидает отправки'
  };

  function ensure(){
    let el=document.querySelector('#panoraConnectionState');
    if(el)return el;
    el=document.createElement('button');
    el.type='button';
    el.id='panoraConnectionState';
    el.className='panora-connection-state';
    el.setAttribute('aria-live','polite');
    el.addEventListener('click',async()=>{
      if(!navigator.onLine)return;
      el.disabled=true;
      try{
        await window.panoraFormDrafts?.flush?.();
        await window.panoraCloud?.retrySync?.();
        await window.panoraPortalCloud?.refreshOrders?.();
      }catch{}
      finally{el.disabled=false;readState()}
    });
    document.body.appendChild(el);
    return el;
  }

  function icon(state){
    return state==='synced'?'●':state==='syncing'?'↻':state==='offline'?'○':state==='local'||state==='pending'?'↑':'!';
  }

  function render(state,text,detail=''){
    const el=ensure();
    const s=state||'synced';
    last={state:s,text:text||labels[s]||labels.synced};
    el.dataset.state=s;
    el.innerHTML=`<span class="panora-connection-dot" aria-hidden="true">${icon(s)}</span><span>${last.text}</span>`;
    el.title=detail||(
      s==='offline'?'Изменения сохраняются на этом устройстве и отправятся после восстановления сети.':
      s==='local'||s==='pending'?'Есть локальные изменения. Нажмите после восстановления связи для повторной синхронизации.':
      s==='error'?'Нажмите, чтобы повторить синхронизацию.':
      'Связь с облаком работает.'
    );
  }

  function classify(text='',datasetState=''){
    const t=String(text).toLowerCase();
    if(!navigator.onLine)return 'offline';
    if(datasetState==='error'||/ошиб|error|conflict|конфликт/.test(t))return 'error';
    if(datasetState==='local'||/устройств|офлайн|offline|ожидает/.test(t))return /ожидает/.test(t)?'pending':'local';
    if(datasetState==='syncing'||/синх|загруз|сохранение|повтор|sync|loading/.test(t))return 'syncing';
    return 'synced';
  }

  function readState(){
    if(!navigator.onLine){render('offline',labels.offline);return}
    const source=document.querySelector('#saveState,[data-form-save-state]');
    if(source){
      const state=classify(source.textContent,source.dataset.syncState);
      let text=source.textContent?.trim()||labels[state];
      const pending=Number(window.panoraCloud?.pendingCount||0);
      if((state==='local'||state==='pending')&&pending>0)text=`Ожидает отправки: ${pending}`;
      if(state==='synced'&&!/сохран|синхрониз|облако/i.test(text))text=labels.synced;
      render(state,text,source.title||'');
      return;
    }
    render('synced',labels.synced);
  }

  window.addEventListener('online',()=>{
    render('syncing','Восстановление связи…');
    setTimeout(async()=>{
      try{
        await window.panoraFormDrafts?.flush?.();
        await window.panoraCloud?.retrySync?.();
        await window.panoraPortalCloud?.refreshOrders?.();
      }catch{}
      readState();
    },250);
  });
  window.addEventListener('offline',()=>render('offline',labels.offline));
  window.addEventListener('panora:form-save-state',event=>{
    const d=event.detail||{},s=classify(d.text,d.state);
    render(s,d.text||labels[s]);
  });
  window.addEventListener('panora:restaurant-sync',event=>{
    const d=event.detail||{},s=d.type==='error'?'error':classify(d.text,d.type);
    render(s,d.text||labels[s]);
  });
  window.addEventListener('panora:partner-orders-updated',()=>render('synced',labels.synced));

  function observe(){
    const source=document.querySelector('#saveState,[data-form-save-state]');
    if(source)new MutationObserver(readState).observe(source,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['data-sync-state','title']});
    readState();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});
  else observe();

  window.panoraConnectionState={render,refresh:readState,get:()=>({...last})};
})();
