
/* Panora v331 — unified connection/synchronization indicator */
(function(){
  let last={state:navigator.onLine?'synced':'offline',text:navigator.onLine?'Синхронизировано':'Нет сети'};

  const hasUsableAdminCache=()=>{
    if(!document.body?.classList.contains('admin-page'))return false;
    try{
      return ['panora-orders','panora-delivery-notes','panora-payments'].some(key=>{
        const value=JSON.parse(localStorage.getItem(key)||'[]');
        return Array.isArray(value)&&value.length>0;
      });
    }catch{return false}
  };

  const labels={
    synced:'Синхронизировано',
    syncing:'Сохраняем…',
    offline:'Нет сети',
    local:'Сохранено на устройстве',
    error:'Ошибка синхронизации',
    pending:'Отправляем изменения…'
  };

  function ensure(){
    const partnerPage=!document.body.classList.contains('admin-page');
    if(partnerPage){
      document.querySelector('#panoraConnectionState')?.remove();
      document.querySelector('#partnerSyncInline')?.remove();
      return null;
    }
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
    if(!el)return;
    const s=state||'synced';
    const partnerPage=!document.body.classList.contains('admin-page');
    const resolved=(s==='synced'&&partnerPage)?'Актуально':(text||labels[s]||labels.synced);
    last={state:s,text:resolved};
    el.dataset.state=s;
    if(el.id==='partnerSyncInline'){
      el.innerHTML=`<i aria-hidden="true">${icon(s)}</i><em>${last.text}</em>`;
    }else{
      el.innerHTML=`<span class="panora-connection-dot" aria-hidden="true">${icon(s)}</span><span>${last.text}</span>`;
    }
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
    if(datasetState==='local'||/устройств|офлайн|offline|отправим при подключении/.test(t))return 'local';
    if(/отправляем изменения|ожидает/.test(t))return 'pending';
    if(datasetState==='syncing'||/синхронизац|загруз|сохранение|сохраняем|проверяем|отправляем|syncing|loading/.test(t))return 'syncing';
    return 'synced';
  }

  function readState(){
    if(!navigator.onLine){render('offline',labels.offline);return}
    const source=document.querySelector('#saveState,[data-form-save-state]');
    if(source){
      let state=classify(source.textContent,source.dataset.syncState);
      const detail=`${String(source.title||'')} ${String(source.textContent||'')}`;
      const cacheQuotaOnly=state==='error'&&/(?:localstorage|setitem[^\n]*storage|storage[^\n]*quota|exceeded the quota|quotaexceedederror)/i.test(detail);
      if(cacheQuotaOnly)state='synced';
      const staleWithCache=state==='error'&&hasUsableAdminCache();
      if(staleWithCache)state='local';
      let text=source.textContent?.trim()||labels[state];
      if(cacheQuotaOnly)text=labels.synced;
      else if(staleWithCache)text='Сохранённые данные';
      else if(state==='error') text=labels.error;
      const pending=Number(window.panoraCloud?.pendingCount||0);
      if(state==='local'&&pending>0)text='Сохранено на устройстве · отправим при подключении';
      if(state==='pending'&&pending>0)text='Отправляем изменения…';
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
  window.addEventListener('panora:storage-quota',()=>render('synced',labels.synced,'Локальный кэш сокращён. Данные в облаке сохранены.'));

  function observe(){
    const source=document.querySelector('#saveState,[data-form-save-state]');
    if(source)new MutationObserver(readState).observe(source,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['data-sync-state','title']});
    readState();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});
  else observe();

  window.panoraConnectionState={render,refresh:readState,get:()=>({...last})};
})();


/* Panora 10.28 — visible loading reminder refined from real mobile feedback.
   Presentation only: no network requests. */
(()=>{
  'use strict';
  let hideTimer=0,lastState='';
  const isAdmin=()=>document.body?.classList.contains('admin-page');
  const hasCachedAdminData=()=>{
    if(!isAdmin())return false;
    try{return ['panora-orders','panora-delivery-notes','panora-payments'].some(key=>{const rows=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(rows)&&rows.length>0})}catch{return false}
  };
  const ensure=()=>{
    let el=document.querySelector('#panoraLoadReminder');
    if(el)return el;
    el=document.createElement('div');
    el.id='panoraLoadReminder';
    el.className='panora-load-reminder';
    el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.hidden=true;
    el.innerHTML='<div class="panora-load-reminder-main"><i aria-hidden="true"></i><div><strong data-load-title></strong><small data-load-detail></small></div></div><div class="panora-load-skeleton" aria-hidden="true"><span></span><span></span><span></span></div>';
    const anchor=document.querySelector('.admin-topbar,header,.topbar');
    if(anchor?.parentNode)anchor.insertAdjacentElement('afterend',el);else document.body.prepend(el);
    return el;
  };
  const show=(state,text)=>{
    const el=ensure();if(!el)return;
    clearTimeout(hideTimer);lastState=state;
    const title=el.querySelector('[data-load-title]'),detail=el.querySelector('[data-load-detail]');
    const stale=state==='error'&&hasCachedAdminData();
    const shownState=stale?'stale':state;
    el.dataset.state=shownState;el.hidden=false;el.classList.remove('is-done');
    const raw=String(text||'').trim();
    if(state==='loading'||state==='syncing'){
      title.textContent=raw||'Обновляем данные…';
      detail.textContent=isAdmin()?'Дождитесь завершения — данные на экране ещё обновляются.':'Покажем актуальные данные после завершения загрузки.';
      el.classList.add('is-busy');
    }else if(state==='offline'||state==='local'){
      title.textContent='Нет сети · показаны сохранённые данные';
      detail.textContent='После восстановления связи Panora проверит актуальные данные.';
      el.classList.remove('is-busy');
    }else if(stale){
      title.textContent='Не удалось проверить обновления';
      detail.textContent='Показаны сохранённые данные. Нажмите «Обновить», когда связь станет стабильнее.';
      el.classList.remove('is-busy');
    }else if(state==='error'){
      title.textContent=raw||'Не удалось обновить данные';
      detail.textContent='Проверьте соединение и нажмите «Обновить».';
      el.classList.remove('is-busy');
    }else{
      title.textContent=isAdmin()?'✓ Данные актуальны':'✓ Актуально';detail.textContent='';el.classList.remove('is-busy');el.classList.add('is-done');
      const delay=isAdmin()?1400:900;
      hideTimer=setTimeout(()=>{if(lastState==='synced'){el.hidden=true;el.classList.remove('is-done')}},delay);
    }
  };
  const mapState=(type,text)=>{
    const t=String(type||'').toLowerCase(),x=String(text||'').toLowerCase();
    if(!navigator.onLine)return'offline';
    if(t==='error'||/ошиб|error|failed/.test(x))return'error';
    if(t==='local'||/сохран.*устройств|offline|офлайн/.test(x))return'local';
    if(t==='loading'||t==='syncing'||t==='sending'||/загруз|обнов|синхрони|провер|loading|updat|sync/.test(x))return'loading';
    return'synced';
  };
  window.addEventListener('panora:restaurant-sync',e=>{const d=e.detail||{};show(mapState(d.type,d.text),d.text)});
  window.addEventListener('online',()=>show('loading','Восстанавливаем актуальные данные…'));
  window.addEventListener('offline',()=>show('offline'));
  const observeAdmin=()=>{
    const source=document.querySelector('#saveState');if(!source)return;
    const read=()=>{const text=source.textContent||'',state=mapState(source.dataset.syncState,text);show(state,text)};
    new MutationObserver(read).observe(source,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-sync-state']});
    if(/загруз|синхрони|обнов/i.test(source.textContent||''))read();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observeAdmin,{once:true});else observeAdmin();
})();
