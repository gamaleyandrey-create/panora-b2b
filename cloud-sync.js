(()=>{
  const cfg=window.PANORA_SUPABASE;
  const pendingKey='panora-cloud-pending-v283';
  const revisionKey='panora-cloud-revisions-v285',conflictKey='panora-cloud-conflicts-v285',acceptedKey='panora-cloud-accepted-v317',baselineKey='panora-cloud-baselines-v323',backupKey='panora-cloud-backups-v286',syncSchemaKey='panora-cloud-sync-schema';
  const restaurantBaselineKey='panora-cloud-restaurants-baseline-v415';
  const adminRestaurantPricesKey='panora-admin-restaurant-prices-v420';
  const ingredientCostsKey='panora-ingredient-costs';
  let ingredientCostTimer=0,ingredientCostsSaving=null;
  const readPending=()=>{try{return JSON.parse(localStorage.getItem(pendingKey)||'{}')||{}}catch{return{}}};
  const readObject=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{return{}}};
  let pending=readPending();
  let revisions=readObject(revisionKey),conflicts=readObject(conflictKey),accepted=readObject(acceptedKey),baselines=readObject(baselineKey);
  const sectionKeys={products:'panora-products',recipes:'panora-recipes',restaurants:'panora-restaurants',plans:'panora-production-plans'};
  const readBackups=()=>{try{const value=JSON.parse(localStorage.getItem(backupKey)||'[]');return Array.isArray(value)?value:[]}catch{return[]}};
  const isQuotaError=error=>error?.name==='QuotaExceededError'||error?.code===22||/quota/i.test(String(error?.message||error||''));
  const releaseStorageQuota=()=>{
    try{
      const backups=readBackups();
      if(backups.length>1)localStorage.setItem(backupKey,JSON.stringify(backups.slice(0,1)));
      else if(backups.length===1&&JSON.stringify(backups[0]).length>250000)localStorage.removeItem(backupKey);
    }catch{try{localStorage.removeItem(backupKey)}catch{}}
    // Only cloud-rebuildable / expendable caches are pruned here.
    // NEVER remove panora-raw-stock-movements or panora-bake-completions.
    try{
      const auditRows=JSON.parse(localStorage.getItem('panora-audit-v333')||'[]');
      if(Array.isArray(auditRows)&&auditRows.length>80)localStorage.setItem('panora-audit-v333',JSON.stringify(auditRows.slice(0,80)));
    }catch{try{localStorage.removeItem('panora-audit-v333')}catch{}}
    ['panora-portal-orders','panora-portal-delivery-notes','panora-portal-payments'].forEach(key=>{try{localStorage.removeItem(key)}catch{}});
  };
  const safeLocalSet=(key,value,{quotaIsWarning=true}={})=>{try{localStorage.setItem(key,value);return true}catch(error){if(!isQuotaError(error))throw error;releaseStorageQuota();try{localStorage.setItem(key,value);return true}catch(retry){if(!isQuotaError(retry))throw retry;if(quotaIsWarning){console.warn('Panora localStorage quota · cache write skipped',key);window.dispatchEvent(new CustomEvent('panora:storage-quota',{detail:{key}}))}return false}}};
  const cacheDeliveryNotesLocal=()=>typeof window.panoraSaveDeliveryNotesCache==='function'
    ? window.panoraSaveDeliveryNotesCache(deliveryNotes)
    : safeLocalSet('panora-delivery-notes',JSON.stringify(Array.isArray(deliveryNotes)?deliveryNotes:[]),{quotaIsWarning:false});
  const cachePaymentsLocal=()=>typeof window.panoraSavePaymentsCache==='function'
    ? window.panoraSavePaymentsCache(payments)
    : safeLocalSet('panora-payments',JSON.stringify(Array.isArray(payments)?payments:[]),{quotaIsWarning:false});
  const backupSectionNames={products:'Товары',recipes:'Рецептуры',restaurants:'Партнёры',plans:'План производства'};
  const backupReasonNames={'conflict-cloud':'Перед применением облачной версии',sync:'Перед синхронизацией','before-restore':'Перед восстановлением снимка',imported:'Импортировано с другого устройства'};
  const parseBackupSection=raw=>{try{return JSON.parse(raw)}catch{return null}};
  const backupEntities=(section,value)=>{
    if(section==='recipes'&&value&&typeof value==='object'&&!Array.isArray(value))return Object.entries(value).flatMap(([product,items])=>(Array.isArray(items)?items:[]).map((item,index)=>({id:`${product}:${index}`,value:item})));
    if(Array.isArray(value))return value.map((item,index)=>({id:String(item?.id??item?.date??item?.bakeDate??index),value:item}));
    if(value&&typeof value==='object')return Object.entries(value).map(([id,item])=>({id,value:item}));
    return[];
  };
  const compareBackupSection=(section,raw)=>{
    const target=backupEntities(section,parseBackupSection(raw)),current=backupEntities(section,parseBackupSection(localStorage.getItem(sectionKeys[section])||'null'));
    const before=new Map(current.map(item=>[item.id,JSON.stringify(item.value)])),after=new Map(target.map(item=>[item.id,JSON.stringify(item.value)]));
    let added=0,changed=0,removed=0,same=0;
    after.forEach((value,id)=>{if(!before.has(id))added++;else if(before.get(id)!==value)changed++;else same++});
    before.forEach((value,id)=>{if(!after.has(id))removed++});
    return{section,added,changed,removed,same,total:target.length};
  };
  const backupDiff=(snapshot)=>Object.entries(snapshot?.data||{}).map(([section,raw])=>compareBackupSection(section,raw));
  const backupDiffText=diff=>diff.map(row=>`${backupSectionNames[row.section]||row.section}: +${row.added} добавлено, ${row.changed} изменено, −${row.removed} удалено, ${row.same} без изменений`).join('\n');
  const saveBackup=(sections,reason='sync')=>{
    const data={};
    sections.forEach(section=>{const key=sectionKeys[section];if(key&&localStorage.getItem(key)!=null)data[section]=localStorage.getItem(key)});
    if(!Object.keys(data).length)return null;
    const snapshot={id:`${Date.now()}-${Math.random().toString(36).slice(2)}`,at:new Date().toISOString(),reason,source:'automatic',integrity:'local',data};
    const backups=[snapshot,...readBackups()].slice(0,3);
    if(!safeLocalSet(backupKey,JSON.stringify(backups),{quotaIsWarning:false})){
      // Automatic reserves are expendable cache. Keep sync operational even when storage is full.
      try{localStorage.removeItem(backupKey)}catch{}
      safeLocalSet(backupKey,JSON.stringify([snapshot]),{quotaIsWarning:false});
    }
    audit('sync.backup_created',`Резерв: ${Object.keys(data).join(', ')}`);return snapshot;
  };
  // v283-v322 inferred a product edit from durable queue flags. A flag could
  // survive an already accepted cloud load and make one clean device reopen
  // the same conflict forever. On the first v323 start preserve the local
  // product snapshot, then discard only that legacy inference. The empty v323
  // baseline makes the next cloud read authoritative and automatic.
  if(localStorage.getItem(syncSchemaKey)!=='323'){
    if(pending.products||conflicts.products)saveBackup(['products'],'sync');
    delete pending.products;delete conflicts.products;delete accepted.products;delete revisions.products;
    Object.keys(pending).length?localStorage.setItem(pendingKey,JSON.stringify(pending)):localStorage.removeItem(pendingKey);
    Object.keys(conflicts).length?localStorage.setItem(conflictKey,JSON.stringify(conflicts)):localStorage.removeItem(conflictKey);
    Object.keys(accepted).length?localStorage.setItem(acceptedKey,JSON.stringify(accepted)):localStorage.removeItem(acceptedKey);
    Object.keys(revisions).length?localStorage.setItem(revisionKey,JSON.stringify(revisions)):localStorage.removeItem(revisionKey);
    localStorage.setItem(syncSchemaKey,'323');
  }
  // v325.5: one-time cleanup of stale production-plan pending/conflict state
  // left by earlier multi-device builds. A clean startup must treat Supabase as
  // authoritative; merely opening a second device is not a local plan edit.
  const restaurantPendingCleanupKey='panora-cloud-restaurant-pending-cleanup-v415';
  if(localStorage.getItem(restaurantPendingCleanupKey)!=='1'){
    if(pending.restaurants===true)delete pending.restaurants;
    Object.keys(pending).length?localStorage.setItem(pendingKey,JSON.stringify(pending)):localStorage.removeItem(pendingKey);
    localStorage.setItem(restaurantPendingCleanupKey,'1');
  }

  const planCleanupKey='panora-cloud-plan-cleanup-v3255';
  if(localStorage.getItem(planCleanupKey)!=='1'){
    delete pending.plans;
    delete conflicts.plans;
    delete accepted.plans;
    delete revisions.plans;
    Object.keys(pending).length?localStorage.setItem(pendingKey,JSON.stringify(pending)):localStorage.removeItem(pendingKey);
    Object.keys(conflicts).length?localStorage.setItem(conflictKey,JSON.stringify(conflicts)):localStorage.removeItem(conflictKey);
    Object.keys(accepted).length?localStorage.setItem(acceptedKey,JSON.stringify(accepted)):localStorage.removeItem(acceptedKey);
    Object.keys(revisions).length?localStorage.setItem(revisionKey,JSON.stringify(revisions)):localStorage.removeItem(revisionKey);
    localStorage.setItem(planCleanupKey,'1');
  }

  // v325.6: clear legacy timestamp-based plan state once. The new plan
  // synchronizer rebuilds its baseline from actual cloud/local content.
  const planContentSyncKey='panora-cloud-plan-content-sync-v3256';
  if(localStorage.getItem(planContentSyncKey)!=='1'){
    delete pending.plans;delete conflicts.plans;delete accepted.plans;delete revisions.plans;delete baselines.plans;
    Object.keys(pending).length?localStorage.setItem(pendingKey,JSON.stringify(pending)):localStorage.removeItem(pendingKey);
    Object.keys(conflicts).length?localStorage.setItem(conflictKey,JSON.stringify(conflicts)):localStorage.removeItem(conflictKey);
    Object.keys(accepted).length?localStorage.setItem(acceptedKey,JSON.stringify(accepted)):localStorage.removeItem(acceptedKey);
    Object.keys(revisions).length?localStorage.setItem(revisionKey,JSON.stringify(revisions)):localStorage.removeItem(revisionKey);
    localStorage.setItem(baselineKey,JSON.stringify(baselines));
    localStorage.setItem(planContentSyncKey,'1');
  }

  const restaurantSyncShape=list=>(Array.isArray(list)?list:[]).map(r=>({
    id:String(r?.id||''),
    name:String(r?.name||''),
    email:String(r?.email||''),
    phone:String(r?.phone||''),
    address:String(r?.address||''),
    legalName:String(r?.legalName||''),
    taxId:String(r?.taxId||''),
    billingAddress:String(r?.billingAddress||''),
    language:String(r?.language||'ru'),
    partnerType:String(r?.partnerType||'restaurant'),
    deletedAt:String(r?.deletedAt||''),
    prices:Object.fromEntries(Object.entries(r?.prices||{}).sort(([a],[b])=>String(a).localeCompare(String(b))).map(([k,v])=>[k,Number(v)]))
  })).sort((a,b)=>a.id.localeCompare(b.id));
  const restaurantSignature=list=>JSON.stringify(restaurantSyncShape(list));
  const readRestaurantBaseline=()=>localStorage.getItem(restaurantBaselineKey)||'';
  const writeRestaurantBaseline=list=>localStorage.setItem(restaurantBaselineKey,restaurantSignature(list));
  const restaurantHasRealLocalChanges=()=>{
    const local=JSON.parse(localStorage.getItem('panora-restaurants')||'[]');
    const baseline=readRestaurantBaseline();
    return !!baseline && restaurantSignature(local)!==baseline;
  };
  const forceSections=new Set();
  const pendingCount=()=>Object.keys(pending).length;
  const markPending=section=>{pending[section]=true;safeLocalSet(pendingKey,JSON.stringify(pending));showPending()};
  const clearPending=section=>{delete pending[section];if(Object.keys(pending).length)safeLocalSet(pendingKey,JSON.stringify(pending));else localStorage.removeItem(pendingKey)};
  let session=null,ready=false,planTimer=0,productTimer=0,recipeTimer=0,restaurantTimer=0,orderTimer=0,financeTimer=0,orderPoll=0,productPoll=0,planPoll=0,restaurantPoll=0,rawStockPoll=0,bakeCompletionPoll=0,pendingRetryTimer=0,adminLeaderHeartbeat=0,adminWakeRefreshTimer=0,adminWakeRefreshAt=0,adminWakeRefreshPromise=null,refreshing=null,loadingOrders=null,savingOrders=null,savingProducts=null,productDirty=Boolean(pending.products),savingRecipes=null,recipeDirty=Boolean(pending.recipes),recipeRevision=0,financeLoaded=false,repairingFinance=null,retrying=null,applyingCloud=0,shippingLocks=new Set();
  const techCardLocks=new Map();
  const uuid=()=>globalThis.crypto?.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)});
  const techCardDeviceId=(()=>{let id=localStorage.getItem('panora-tech-card-device-id');if(!id){id=uuid();localStorage.setItem('panora-tech-card-device-id',id)}return id})();
  const audit=(action,details='',level='info')=>window.panoraAudit?.record(action,details,level);
  const status=(text,error=false,detail='')=>{
    const el=document.querySelector('#saveState');if(!el)return;
    el.textContent=text;el.style.color='';el.title=detail||'';
    const syncing=/загруз|синхронизац|отправ|провер|loading|syncing|cargando|sincron/i.test(text);
    const local=/устройств|офлайн|offline|device|dispositivo|отправим при подключении/i.test(text);
    el.dataset.syncState=error?'error':syncing?'syncing':local?'local':'synced';
    el.style.cursor=error?'pointer':'';
    el.onclick=error?()=>retrySync():null;
  };
  const showPending=()=>{const count=pendingCount();if(!count)return false;status(navigator.onLine?'Отправляем изменения…':'Сохранено на устройстве · отправим при подключении',false,navigator.onLine?'Panora автоматически отправляет изменения. Ничего нажимать не нужно.':'Изменения сохранены на этом устройстве и будут отправлены автоматически после восстановления сети.');return true};
  const rememberRevision=(section,rows=[])=>{const latest=(rows||[]).reduce((value,row)=>String(row.updated_at||'')>value?String(row.updated_at):value,'');if(latest){revisions[section]=latest;localStorage.setItem(revisionKey,JSON.stringify(revisions))}return latest};
  const conflictCount=()=>Object.keys(conflicts).length;
  const saveConflicts=()=>Object.keys(conflicts).length?localStorage.setItem(conflictKey,JSON.stringify(conflicts)):localStorage.removeItem(conflictKey);
  const clearOrphanConflicts=()=>{let changed=false;for(const section of Object.keys(conflicts)){if(!pending[section]){delete conflicts[section];changed=true}}if(changed)saveConflicts()};
  clearOrphanConflicts();
  const saveAccepted=()=>Object.keys(accepted).length?localStorage.setItem(acceptedKey,JSON.stringify(accepted)):localStorage.removeItem(acceptedKey);
  const conflictNames=()=>{const names={products:'технологические карты',recipes:'рецептуры',restaurants:'партнёры',plans:'план производства'};return Object.keys(conflicts).map(section=>names[section]||section).join(', ')};
  const showConflicts=()=>{const count=conflictCount();if(!count)return false;status(`Есть изменения: ${conflictNames()}`,true,'Нажмите, чтобы выбрать актуальную версию');const el=document.querySelector('#saveState');if(el)el.onclick=resolveConflicts;return true};
  function chooseConflictVersion(names){
    return new Promise(resolve=>{
      document.querySelector('#panoraConflictChoice')?.remove();
      const modal=document.createElement('div');modal.id='panoraConflictChoice';modal.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(16,27,20,.58);display:grid;place-items:center;padding:20px';
      modal.innerHTML=`<section role="dialog" aria-modal="true" aria-labelledby="panoraConflictTitle" style="width:min(520px,100%);background:#fff;color:#17251d;border-radius:18px;padding:24px;box-shadow:0 20px 70px #0005"><h2 id="panoraConflictTitle" style="margin:0 0 12px">Есть изменения на другом устройстве</h2><p>В облаке сохранена другая версия раздела: <strong>${String(names).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</strong>. Выберите, какую версию использовать.</p><button type="button" data-choice="cloud" style="width:100%;margin-top:10px;padding:12px">Загрузить обновления из облака</button><p style="margin:6px 0 14px;color:#607066">Текущие поля будут заменены последней версией из облака.</p><button type="button" data-choice="local" style="width:100%;padding:12px">Сохранить версию этого устройства в облако</button><p style="margin:6px 0 14px;color:#607066">Данные с этого устройства заменят облачную версию.</p><button type="button" data-choice="later" style="width:100%;padding:10px;background:transparent;border:0;text-decoration:underline">Решить позже</button><p style="margin:14px 0 0;color:#42684d">Ваши данные не пропадут: перед заменой Panora сохранит резервную копию.</p></section>`;
      modal.addEventListener('click',event=>{const choice=event.target.closest('[data-choice]')?.dataset.choice;if(!choice)return;modal.remove();resolve(choice)});document.body.append(modal);modal.querySelector('[data-choice="cloud"]')?.focus();
    })
  }
  async function guardSection(section,path){
    if(forceSections.has(section)||!pending[section]||!revisions[section])return;
    const rows=section==='products'
      ?await request(`products?select=${PRODUCT_SELECT}&order=created_at.asc`)
      :await request(`${path}${path.includes('?')?'&':'?'}select=updated_at&order=updated_at.desc&limit=1`),
      remoteAt=(rows||[]).reduce((latest,row)=>String(row.updated_at||'')>latest?String(row.updated_at):latest,'');
    if(section==='products'){
      const decision=await reconcileProducts(rows);
      if(decision==='cloud'||decision==='equal'||decision==='local')return;
      const error=new Error('Товары одновременно изменены на этом и другом устройстве');error.panoraConflict=true;throw error
    }
    if(remoteAt&&remoteAt>revisions[section]){
      if(String(remoteAt)<=String(accepted[section]||'')){
        revisions[section]=remoteAt;localStorage.setItem(revisionKey,JSON.stringify(revisions));
        clearPending(section);delete conflicts[section];saveConflicts();return;
      }
      conflicts[section]={remoteAt,localAt:new Date().toISOString()};saveConflicts();audit('sync.conflict',`${section}: облако ${remoteAt}, устройство ${revisions[section]}`,'warning');showConflicts();const error=new Error(`На другом устройстве изменён раздел «${section}»`);error.panoraConflict=true;throw error
    }
  }
  const clearAdminSession=()=>{
    session=null;ready=false;
    localStorage.removeItem('panora-admin-supabase-session-v975');
    localStorage.removeItem('panora-supabase-session');
    window.panoraSupabaseSession=null;
    try{window.dispatchEvent(new CustomEvent('panora:admin-session-expired'))}catch{}
  };
  const refreshSession=async()=>{
    if(refreshing)return refreshing;
    if(!session?.refresh_token){
      clearAdminSession();
      const error=new Error('Сессия пекарни истекла. Войдите повторно.');
      error.code='PANORA_ADMIN_SESSION_EXPIRED';
      throw error;
    }
    refreshing=fetch(`${cfg.url}/auth/v1/token?grant_type=refresh_token`,{
      method:'POST',
      headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},
      body:JSON.stringify({refresh_token:session.refresh_token})
    }).then(async response=>{
      if(!response.ok){
        let detail='';
        try{detail=await response.text()}catch{}
        clearAdminSession();
        const error=new Error('Сессия пекарни истекла. Войдите повторно.');
        error.code='PANORA_ADMIN_SESSION_EXPIRED';
        error.detail=detail;
        throw error;
      }
      session=await response.json();
      localStorage.setItem('panora-admin-supabase-session-v975',JSON.stringify(session));
      window.panoraSupabaseSession=session;
      return session;
    }).finally(()=>refreshing=null);
    return refreshing
  };
  // Panora 9.37: collapse identical concurrent GETs into one network request.
  // This protects against overlapping UI events without changing business behavior.
  const inflightReads=new Map();
  const request=async(path,options={},retried=false)=>{
    if(!session?.access_token)throw new Error('Нет активной сессии');
    const method=String(options.method||'GET').toUpperCase(),readKey=!retried&&method==='GET'?String(path):'';
    if(readKey&&inflightReads.has(readKey))return inflightReads.get(readKey);
    const run=(async()=>{
      const response=await fetch(`${cfg.url}/rest/v1/${path}`,{cache:'no-store',...options,headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json','Cache-Control':'no-cache',...(options.headers||{})}});
      if(response.status===401&&!retried){
        await refreshSession();
        return request(path,options,true);
      }
      if(response.status===401){
        clearAdminSession();
        const error=new Error('Сессия пекарни истекла. Войдите повторно.');
        error.code='PANORA_ADMIN_SESSION_EXPIRED';
        throw error;
      }
      if(!response.ok){const detail=await response.text();throw new Error(detail||`Supabase: ${response.status}`)}
      if(response.status===204)return null;
      const text=await response.text();return text?JSON.parse(text):null;
    })();
    if(!readKey)return run;
    inflightReads.set(readKey,run);
    try{return await run}finally{if(inflightReads.get(readKey)===run)inflightReads.delete(readKey)}
  };

  // Panora 9.37 — one visible admin tab owns background polling for this browser.
  // User-triggered saves and wake refreshes still run immediately in the focused tab.
  const adminLeaderKey='panora-admin-background-leader-v937';
  const adminTabId=(()=>{try{const key='panora-admin-tab-id-v937';let id=sessionStorage.getItem(key);if(!id){id=`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;sessionStorage.setItem(key,id)}return id}catch{return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}})();
  const readAdminLeader=()=>{try{return JSON.parse(localStorage.getItem(adminLeaderKey)||'null')}catch{return null}};
  const claimAdminLeader=(force=false)=>{
    const now=Date.now(),current=readAdminLeader();
    if(force||!current||current.id===adminTabId||Number(current.until||0)<now){
      try{localStorage.setItem(adminLeaderKey,JSON.stringify({id:adminTabId,until:now+45000}))}catch{}
      return true;
    }
    return false;
  };
  const isAdminBackgroundLeader=()=>{
    if(document.hidden)return false;
    const current=readAdminLeader(),now=Date.now();
    if(current?.id===adminTabId&&Number(current.until||0)>=now)return true;
    return claimAdminLeader(false);
  };
  const startAdminLeaderHeartbeat=()=>{
    clearInterval(adminLeaderHeartbeat);
    claimAdminLeader(!document.hidden);
    adminLeaderHeartbeat=setInterval(()=>{if(!document.hidden)claimAdminLeader(false)},15000);
  };

  // Panora 9.38 — tiny operational revision RPC gates plan/raw-stock/bake reads.
  let adminOperationalRevisionUnavailable=false,adminOperationalRevisionPromise=null,adminOperationalRevisionCache=null,adminOperationalRevisionAt=0;
  const adminOperationalSeen={plans:'',rawStock:'',bakeCompletions:''};
  async function getAdminOperationalRevision(){
    if(adminOperationalRevisionUnavailable)return null;
    const now=Date.now();
    if(adminOperationalRevisionCache&&now-adminOperationalRevisionAt<10000)return adminOperationalRevisionCache;
    if(adminOperationalRevisionPromise)return adminOperationalRevisionPromise;
    adminOperationalRevisionPromise=(async()=>{
      try{
        const rows=await request('rpc/panora_admin_operational_revision',{method:'POST',body:'{}'}),row=Array.isArray(rows)?rows[0]:rows;
        adminOperationalRevisionCache={plans:String(row?.plans_revision||''),rawStock:String(row?.raw_stock_revision||''),bakeCompletions:String(row?.bake_revision||'')};
        adminOperationalRevisionAt=Date.now();return adminOperationalRevisionCache;
      }catch(error){
        const raw=String(error?.message||error||'');
        if(/panora_admin_operational_revision|PGRST202|does not exist|schema cache/i.test(raw)){adminOperationalRevisionUnavailable=true;return null}
        throw error;
      }
    })().finally(()=>{adminOperationalRevisionPromise=null});
    return adminOperationalRevisionPromise;
  }
  async function adminOperationalComponentChanged(component){
    const current=await getAdminOperationalRevision();
    if(!current)return true;
    const next=String(current[component]||'');if(!next)return true;
    if(!adminOperationalSeen[component]){adminOperationalSeen[component]=next;return false}
    if(adminOperationalSeen[component]===next)return false;
    adminOperationalSeen[component]=next;return true;
  }

  // Panora 9.38 — tiny revisions for rarely changing reference data. Background
  // product/partner checks no longer download their full payload just to discover
  // that nothing changed. Falls back to the previous safe behavior until SQL 9.38 runs.
  let adminReferenceRevisionUnavailable=false,adminReferenceRevisionPromise=null,adminReferenceRevisionCache=null,adminReferenceRevisionAt=0;
  const adminReferenceSeen={products:'',restaurants:'',recipes:'',ingredientCosts:''};
  async function getAdminReferenceRevision(){
    if(adminReferenceRevisionUnavailable)return null;
    const now=Date.now();
    if(adminReferenceRevisionCache&&now-adminReferenceRevisionAt<10000)return adminReferenceRevisionCache;
    if(adminReferenceRevisionPromise)return adminReferenceRevisionPromise;
    adminReferenceRevisionPromise=(async()=>{
      try{
        const rows=await request('rpc/panora_admin_reference_revision',{method:'POST',body:'{}'}),row=Array.isArray(rows)?rows[0]:rows;
        adminReferenceRevisionCache={products:String(row?.products_revision||''),restaurants:String(row?.restaurants_revision||''),recipes:String(row?.recipes_revision||''),ingredientCosts:String(row?.ingredient_costs_revision||'')};
        adminReferenceRevisionAt=Date.now();return adminReferenceRevisionCache;
      }catch(error){
        const raw=String(error?.message||error||'');
        if(/panora_admin_reference_revision|PGRST202|does not exist|schema cache/i.test(raw)){adminReferenceRevisionUnavailable=true;return null}
        throw error;
      }
    })().finally(()=>{adminReferenceRevisionPromise=null});
    return adminReferenceRevisionPromise;
  }
  async function adminReferenceComponentChanged(component){
    const current=await getAdminReferenceRevision();
    if(!current)return true;
    const next=String(current[component]||'');if(!next)return true;
    if(!adminReferenceSeen[component]){adminReferenceSeen[component]=next;return false}
    if(adminReferenceSeen[component]===next)return false;
    adminReferenceSeen[component]=next;return true;
  }

  /* Panora 6.07 — raw material movement sync.
     Automatic bake consumption remains deterministic/virtual, so it can never
     be duplicated by two devices. Only manual/opening movements are persisted. */
  const rawStockKey='panora-raw-stock-movements';
  const readRawStockLocal=()=>{try{const value=JSON.parse(localStorage.getItem(rawStockKey)||'[]');return Array.isArray(value)?value:[]}catch{return[]}};
  const rawStockTime=item=>String(item?.updatedAt||item?.createdAt||`${item?.date||''}T00:00:00.000Z`||'');
  const rawStockToCloud=item=>({
    id:String(item.id),movement_date:String(item.date||'').slice(0,10),ingredient_key:String(item.key||''),ingredient_name:String(item.name||''),
    unit:String(item.unit||'g'),movement_type:String(item.type||'correction_plus'),quantity:Math.max(0,Number(item.quantity||0)),
    note:item.note||null,device_id:item.deviceId||null,created_at:item.createdAt||new Date().toISOString(),updated_at:item.updatedAt||item.createdAt||new Date().toISOString(),deleted_at:item.deletedAt||null
  });
  const rawStockFromCloud=row=>({
    id:String(row.id),date:row.movement_date,key:row.ingredient_key,name:row.ingredient_name,unit:row.unit||'g',type:row.movement_type,
    quantity:Number(row.quantity||0),note:row.note||'',deviceId:row.device_id||'',createdAt:row.created_at||'',updatedAt:row.updated_at||row.created_at||'',deletedAt:row.deleted_at||'',system:String(row.id||'').startsWith('opening:')
  });
  const rawStockState=(text,state='synced',detail='')=>window.dispatchEvent(new CustomEvent('panora:raw-stock-cloud-state',{detail:{text,state,detail}}));
  function mergeRawStock(remoteRows,localRows){
    const remote=new Map((remoteRows||[]).map(row=>[String(row.id),rawStockFromCloud(row)])),merged=new Map(remote),outgoing=[];
    (localRows||[]).forEach(local=>{
      if(!local?.id)return;
      const id=String(local.id),cloud=merged.get(id),localAt=rawStockTime(local),cloudAt=rawStockTime(cloud);
      if(!cloud){merged.set(id,local);outgoing.push(local);return}
      if(localAt>cloudAt){merged.set(id,local);outgoing.push(local)}
      // Cloud wins equal timestamps. This is important for deterministic opening rows on a second device.
    });
    return {merged:[...merged.values()],outgoing};
  }
  const rawStockDeltaKey='panora-raw-stock-cloud-watermark-v934';
  const latestTimestamp=(rows,field='updated_at')=>(rows||[]).map(row=>String(row?.[field]||row?.created_at||'')).filter(Boolean).sort().at(-1)||'';
  async function syncRawStockNow({quiet=false,delta=false}={}){
    if(!ready)return false;
    if(!navigator.onLine){markPending('rawStock');rawStockState('Офлайн · сохранено','local');return false}
    if(!quiet)rawStockState('Синхронизация…','syncing');
    const useDelta=delta&&!pending.rawStock;
    const watermark=useDelta?localStorage.getItem(rawStockDeltaKey)||'':'';
    const deltaQuery=watermark?`&updated_at=gt.${encodeURIComponent(watermark)}`:'';
    const remoteRows=await request(`raw_material_movements?select=id,movement_date,ingredient_key,ingredient_name,unit,movement_type,quantity,note,device_id,created_at,updated_at,deleted_at${deltaQuery}&order=movement_date.asc,created_at.asc`);
    const localRows=readRawStockLocal();
    let merged,outgoing;
    if(!useDelta&&!pending.rawStock){
      // Clean/normal bootstrap: Supabase is authoritative, including an empty table.
      // Never resurrect stale training rows from local storage.
      merged=(remoteRows||[]).map(rawStockFromCloud);outgoing=[];
    }else if(useDelta&&watermark){
      const map=new Map(localRows.map(item=>[String(item.id),item]));
      (remoteRows||[]).forEach(row=>map.set(String(row.id),rawStockFromCloud(row)));
      merged=[...map.values()];outgoing=[];
    }else({merged,outgoing}=mergeRawStock(remoteRows,localRows));
    if(outgoing.length){
      await request('raw_material_movements?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(outgoing.map(rawStockToCloud))});
    }
    const canonical=merged.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)));
    const current=localRows.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)));
    if(JSON.stringify(canonical)!==JSON.stringify(current)){
      const cached=safeLocalSet(rawStockKey,JSON.stringify(canonical),{quotaIsWarning:false});
      if(cached)window.dispatchEvent(new CustomEvent('panora:raw-stock-cloud-updated',{detail:{count:canonical.filter(item=>!item.deletedAt).length}}));
    }
    const newestRaw=latestTimestamp(remoteRows);if(newestRaw)localStorage.setItem(rawStockDeltaKey,newestRaw);
    clearPending('rawStock');rawStockState('Облако ✓','synced');return true;
  }

  /* Panora 6.08 — cloud sync for factual bake completions. */
  const bakeCompletionKey='panora-bake-completions';
  const readBakeCompletionLocal=()=>{try{const value=JSON.parse(localStorage.getItem(bakeCompletionKey)||'[]');return Array.isArray(value)?value:[]}catch{return[]}};
  const bakeCompletionTime=item=>String(item?.updatedAt||item?.createdAt||`${item?.date||''}T00:00:00.000Z`);
  const bakeCompletionToCloud=item=>({id:String(item.id),bake_date:String(item.date||'').slice(0,10),items:Array.isArray(item.items)?item.items:[],note:item.note||null,source:item.source||'actual',device_id:item.deviceId||null,created_at:item.createdAt||new Date().toISOString(),updated_at:item.updatedAt||item.createdAt||new Date().toISOString(),deleted_at:item.deletedAt||null});
  const bakeCompletionFromCloud=row=>({id:String(row.id),date:row.bake_date,items:Array.isArray(row.items)?row.items:[],note:row.note||'',source:row.source||'actual',deviceId:row.device_id||'',createdAt:row.created_at||'',updatedAt:row.updated_at||row.created_at||'',deletedAt:row.deleted_at||''});
  function mergeBakeCompletions(remoteRows,localRows){const remote=new Map((remoteRows||[]).map(row=>[String(row.id),bakeCompletionFromCloud(row)])),merged=new Map(remote),outgoing=[];(localRows||[]).forEach(local=>{if(!local?.id)return;const id=String(local.id),cloud=merged.get(id),localAt=bakeCompletionTime(local),cloudAt=bakeCompletionTime(cloud);if(!cloud){merged.set(id,local);outgoing.push(local);return}if(localAt>cloudAt){merged.set(id,local);outgoing.push(local)}});return{merged:[...merged.values()],outgoing}}
  const bakeCompletionDeltaKey='panora-bake-completion-cloud-watermark-v934';
  async function syncBakeCompletionsNow({quiet=false,delta=false}={}){
    if(!ready)return false;if(!navigator.onLine){markPending('bakeCompletions');return false}
    const useDelta=delta&&!pending.bakeCompletions;
    const watermark=useDelta?localStorage.getItem(bakeCompletionDeltaKey)||'':'',deltaQuery=watermark?`&updated_at=gt.${encodeURIComponent(watermark)}`:'';
    const remoteRows=await request(`bake_completions?select=id,bake_date,items,note,source,device_id,created_at,updated_at,deleted_at${deltaQuery}&order=bake_date.asc`),localRows=readBakeCompletionLocal();
    let merged,outgoing;
    if(!useDelta&&!pending.bakeCompletions){merged=(remoteRows||[]).map(bakeCompletionFromCloud);outgoing=[]}
    else if(useDelta&&watermark){const map=new Map(localRows.map(item=>[String(item.id),item]));(remoteRows||[]).forEach(row=>map.set(String(row.id),bakeCompletionFromCloud(row)));merged=[...map.values()];outgoing=[]}
    else({merged,outgoing}=mergeBakeCompletions(remoteRows,localRows));
    if(outgoing.length)await request('bake_completions?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(outgoing.map(bakeCompletionToCloud))});
    const canonical=merged.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id))),current=localRows.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)));
    if(JSON.stringify(canonical)!==JSON.stringify(current)){const cached=safeLocalSet(bakeCompletionKey,JSON.stringify(canonical),{quotaIsWarning:false});if(cached)window.dispatchEvent(new CustomEvent('panora:bake-completions-cloud-updated',{detail:{count:canonical.filter(item=>!item.deletedAt).length}}))}
    const newestBake=latestTimestamp(remoteRows);if(newestBake)localStorage.setItem(bakeCompletionDeltaKey,newestBake);
    clearPending('bakeCompletions');if(!quiet)status('Облако ✓');return true
  }

  async function acquireTechCardLock(productId){
    if(!productId)throw new Error('Не удалось определить технологическую карту');
    if(!ready||!navigator.onLine)throw new Error('Для безопасного редактирования технологической карты требуется подключение к облаку.');
    const existing=techCardLocks.get(productId);
    if(existing?.token&&new Date(existing.expiresAt).getTime()>Date.now()+15000)return existing;
    const token=existing?.token||uuid();
    try{
      const rows=await request('rpc/panora_acquire_tech_card_lock',{method:'POST',body:JSON.stringify({p_product_id:productId,p_device_id:techCardDeviceId,p_lock_token:token,p_ttl_seconds:240})});
      const row=rows?.[0];if(!row?.lock_token)throw new Error('Сервер не подтвердил блокировку технологической карты');
      const lock={token:row.lock_token,expiresAt:row.expires_at,deviceId:row.device_id};techCardLocks.set(productId,lock);return lock;
    }catch(error){
    if(window.panoraHandleSessionError?.(error)) return;
    if(/PANORA_TECH_CARD_LOCKED/i.test(String(error?.message||error)))throw new Error('Эта технологическая карта уже редактируется на другом устройстве. Дождитесь сохранения или автоматического освобождения блокировки.');
      throw error;
    }
  }
  async function renewTechCardLock(productId){
    const lock=techCardLocks.get(productId);if(!lock?.token)return false;
    try{const expiresAt=await request('rpc/panora_renew_tech_card_lock',{method:'POST',body:JSON.stringify({p_product_id:productId,p_lock_token:lock.token,p_ttl_seconds:240})});lock.expiresAt=expiresAt;return true}
    catch(error){
    if(window.panoraHandleSessionError?.(error)) return;
    techCardLocks.delete(productId);window.dispatchEvent(new CustomEvent('panora:tech-card-lock-lost',{detail:{productId}}));throw error}
  }
  async function releaseTechCardLock(productId){
    const lock=techCardLocks.get(productId);techCardLocks.delete(productId);if(!lock?.token||!session?.access_token||!navigator.onLine)return false;
    try{return await request('rpc/panora_release_tech_card_lock',{method:'POST',body:JSON.stringify({p_product_id:productId,p_lock_token:lock.token})})}catch(error){
    if(window.panoraHandleSessionError?.(error)) return;
    console.warn('Panora tech-card unlock',error);return false}
  }
  function hasTechCardLock(productId){const lock=techCardLocks.get(productId);return Boolean(lock?.token&&new Date(lock.expiresAt).getTime()>Date.now())}
  setInterval(()=>{for(const productId of techCardLocks.keys())renewTechCardLock(productId).catch(()=>{})},60000);

  // Panora 9.38 — request only fields used by the client. This avoids moving
  // unused product/partner columns on every authoritative refresh.
  const PRODUCT_SELECT='id,name_ru,name_en,name_es,description_ru,description_en,description_es,weight_g,base_price,wholesale_min_qty,image_url,gallery_urls,active,storefront_visible,category,tech_card,tech_card_revision,created_at,updated_at';
  const RESTAURANT_SELECT='id,name,email,phone,whatsapp,telegram,extra_messengers,address,legal_name,tax_id,billing_address,language,partner_type,active,created_at,updated_at,restaurant_prices(product_id,price)';

  // Ordinary product saves deliberately omit tech_card. A stale device must
  // never overwrite a newer card as a side effect of changing a name/price.
  const productRow=(p,{includeTechCard=false}={})=>({
    id:p.id,name_ru:p.names?.ru||p.id,name_en:p.names?.en||p.names?.ru||p.id,name_es:p.names?.es||p.names?.ru||p.id,
    description_ru:p.descriptions?.ru||'',description_en:p.descriptions?.en||'',description_es:p.descriptions?.es||'',
    weight_g:Number(p.weight||750),base_price:Number(p.basePrice||0),wholesale_min_qty:Math.max(1,Number(p.wholesaleMinQty||8)),
    ...(!p._imageCloudOnly?{image_url:p.image||null}:{}),
    ...(!p._galleryCloudOnly?{gallery_urls:Array.isArray(p.gallery)?p.gallery.filter(Boolean).slice(0,6):[]}:{}),
    active:p.active!==false,storefront_visible:p.storefrontVisible!==false,category:String(p.category||'bread'),
    ...(includeTechCard?{tech_card:p.techCard||{}}:{}),updated_at:new Date().toISOString()
  });
  const rowProduct=(row,local)=>({id:row.id,builtIn:['plain','pumpkin'].includes(row.id),active:row.active,storefrontVisible:row.storefront_visible!==false,category:String(row.category||local?.category||'bread'),weight:Number(row.weight_g),basePrice:Number(row.base_price),wholesaleMinQty:Math.max(1,Number(row.wholesale_min_qty||local?.wholesaleMinQty||8)),image:row.image_url||local?.image||'icon.svg',gallery:Array.isArray(row.gallery_urls)?row.gallery_urls:(Array.isArray(local?.gallery)?local.gallery:[]),techCard:row.tech_card||{},techCardRevision:Number(row.tech_card_revision||0),names:{ru:row.name_ru,en:row.name_en,es:row.name_es},descriptions:{ru:row.description_ru||'',en:row.description_en||'',es:row.description_es||''}});
  const canonicalValue=value=>{
    if(Array.isArray(value))return value.map(canonicalValue);
    if(value&&typeof value==='object')return Object.keys(value).sort().reduce((result,key)=>{result[key]=canonicalValue(value[key]);return result},{});
    return value;
  };
  const productMediaFingerprint=value=>{
    const text=String(value||'');
    if(!text)return'';
    if(!/^data:image\//i.test(text))return text;
    let hash=2166136261;
    for(let i=0;i<text.length;i+=Math.max(1,Math.floor(text.length/2048))){
      hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619)>>>0;
    }
    return `inline:${text.length}:${hash.toString(16)}`;
  };
  const comparableProduct=p=>canonicalValue({id:String(p.id),active:p.active!==false,storefrontVisible:p.storefrontVisible!==false,category:String(p.category||'bread'),weight:Number(p.weight),basePrice:Number(p.basePrice),wholesaleMinQty:Math.max(1,Number(p.wholesaleMinQty||8)),image:p._imageCloudOnly?'cloud-image':productMediaFingerprint(p.image||'icon.svg'),gallery:p._galleryCloudOnly?['cloud-gallery']:(Array.isArray(p.gallery)?p.gallery.map(productMediaFingerprint):[]),techCard:p.techCard||{},techCardRevision:Number(p.techCardRevision||0),names:p.names||{},descriptions:p.descriptions||{}});
  const normalizedProducts=list=>(list||[]).map(comparableProduct).sort((a,b)=>a.id.localeCompare(b.id));
  const productSignature=list=>JSON.stringify(normalizedProducts(list));
  const localProducts=()=>typeof productRegistry!=='undefined'?productRegistry:JSON.parse(localStorage.getItem('panora-products')||'[]');
  const remoteProducts=rows=>{const local=localProducts();return(rows||[]).map(row=>rowProduct(row,local.find(p=>p.id===row.id)))};
  const saveProductBaseline=list=>{baselines.products=productSignature(list);localStorage.setItem(baselineKey,JSON.stringify(baselines))};
  function productsEqualCloud(rows){
    return productSignature(localProducts())===productSignature(remoteProducts(rows));
  }
  async function applyProductRows(rows){
    rememberRevision('products',rows);
    if(!rows?.length)return;
    const local=JSON.parse(localStorage.getItem('panora-products')||'[]');
    const mapped=rows.map(row=>rowProduct(row,local.find(p=>p.id===row.id)));
    applyingCloud++;
    try{
      // Product rows are the committed business record. Recipe-card drafts
      // from another device/older render must not repaint stale values over
      // the verified tech_card. acceptCommittedWithin keeps a timestamped
      // local backup before clearing those drafts.
      await window.panoraFormDrafts?.acceptCommittedWithin?.('#recipeList');
      if(window.panoraPersistProductsCache)window.panoraPersistProductsCache(mapped);else localStorage.setItem('panora-products',JSON.stringify(mapped));
      if(typeof productRegistry!=='undefined')productRegistry=mapped;
      if(typeof syncAdminProductRegistry==='function')syncAdminProductRegistry();
      if(typeof renderProductCards==='function')renderProductCards();
      if(typeof buildPlanProductFields==='function')buildPlanProductFields();
      if(typeof syncProductSelects==='function')syncProductSelects();
      if(typeof renderAll==='function')renderAll();
      saveProductBaseline(mapped);productDirty=false;clearPending('products');delete conflicts.products;saveConflicts();
    }finally{applyingCloud--}
  }
  async function reconcileProducts(rows=null,{allowManual=true}={}){
    rows=rows||await request(`products?select=${PRODUCT_SELECT}&order=created_at.asc`);
    if(!rows?.length)return'empty';
    const localSig=productSignature(localProducts()),remoteSig=productSignature(remoteProducts(rows)),baseSig=String(baselines.products||'');
    if(localSig===remoteSig){saveProductBaseline(remoteProducts(rows));productDirty=false;clearPending('products');delete conflicts.products;saveConflicts();rememberRevision('products',rows);return'equal'}
    if(!baseSig){
      saveBackup(['products'],'conflict-cloud');await applyProductRows(rows);audit('sync.auto_cloud_bootstrap','Товары: облако принято как начальная общая версия');return'cloud'
    }
    // A content difference is not proof of a local edit: older releases could
    // leave a stale baseline after rendering or browser normalization. Only a
    // queued user change is allowed to compete with the cloud version.
    const localChanged=Boolean(productDirty||pending.products)&&localSig!==baseSig;
    const remoteChanged=remoteSig!==baseSig;
    if(localChanged&&remoteChanged){
      if(!allowManual)return'conflict';
      const remoteAt=(rows||[]).reduce((latest,row)=>String(row.updated_at||'')>latest?String(row.updated_at):latest,'');
      conflicts.products={remoteAt,localAt:new Date().toISOString()};saveConflicts();showConflicts();return'conflict'
    }
    if(!localChanged){await applyProductRows(rows);audit('sync.auto_cloud','Товары: автоматически применены изменения из облака');return'cloud'}
    return'local'
  }
  async function loadProducts(){
    const rows=await request(`products?select=${PRODUCT_SELECT}&order=created_at.asc`);
    if(!baselines.products||productDirty||savingProducts){
      const decision=await reconcileProducts(rows);
      if(decision==='local'){await flushProducts();return}
      return
    }
    await applyProductRows(rows);
  }
  async function refreshProductsIfChanged(){
    if(!ready||savingProducts||document.activeElement?.closest?.('#recipeList')||window.panoraRecipeEditing)return false;
    // Device clocks are not a reliable revision source. Compare the complete,
    // canonical product payload so a tech-card change is detected even when
    // another row has a newer timestamp from a clock that is ahead.
    const rows=await request(`products?select=${PRODUCT_SELECT}&order=created_at.asc`);
    if(!rows?.length)return false;
    const remoteSig=productSignature(remoteProducts(rows)),localSig=productSignature(localProducts());
    if(remoteSig===localSig){rememberRevision('products',rows);saveProductBaseline(remoteProducts(rows));productDirty=false;clearPending('products');delete conflicts.products;saveConflicts();return false}
    const decision=await reconcileProducts(rows);
    if(decision==='local')await flushProducts();
    if(decision!=='conflict')window.dispatchEvent(new CustomEvent('panora:products-changed'));
    return decision!=='conflict'
  }
  async function saveProducts(){
    if(!ready||typeof productRegistry==='undefined')return false;
    if(savingProducts)return savingProducts;
    const snapshot=JSON.parse(JSON.stringify(productRegistry));
    savingProducts=(async()=>{
      status('Сохранение товара…');
      await guardSection('products','products');
      await request('products?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(snapshot.map(productRow))});
      const confirmed=await request(`products?select=${PRODUCT_SELECT}&order=created_at.asc`);rememberRevision('products',confirmed);saveProductBaseline(snapshot);forceSections.delete('products');delete conflicts.products;saveConflicts();
      productDirty=false;clearPending('products');status('Товар сохранён ✓');return true;
    })().finally(()=>savingProducts=null);
    return savingProducts;
  }
  async function flushProducts(){
    clearTimeout(productTimer);productTimer=0;
    if(!ready)return false;
    if(savingProducts)await savingProducts;
    if(productDirty)return saveProducts();
    return true;
  }
  async function saveProductConfirmed(product){
    if(!product?.id)throw new Error('Не удалось определить новый товар');
    if(!ready)throw new Error('Облако ещё загружается. Подождите несколько секунд и повторите сохранение.');
    if(!session?.access_token)throw new Error('Сессия пекарни истекла. Войдите повторно.');
    status('Сохранение товара…');
    const rows=await request('products?on_conflict=id',{
      method:'POST',
      headers:{Prefer:'resolution=merge-duplicates,return=representation'},
      body:JSON.stringify(productRow(product,{includeTechCard:product.techCardRevision==null}))
    });
    const saved=rows?.find(row=>row.id===product.id);
    if(!saved)throw new Error('Supabase не подтвердил создание товара');
    productDirty=false;clearPending('products');saveProductBaseline([...localProducts().filter(item=>item.id!==product.id),rowProduct(saved,product)]);
    status('Товар сохранён ✓');
    return rowProduct(saved,product);
  }
  async function saveProductTechCardConfirmed(productId,techCard){
    if(!productId)throw new Error('Не удалось определить хлеб');
    if(!ready)throw new Error('Облако ещё загружается. Подождите несколько секунд и повторите.');
    if(!session?.access_token)throw new Error('Сессия пекарни истекла. Войдите повторно.');
    const normalized={mix:String(techCard?.mix||''),fermentation:Number(techCard?.fermentation||0),proof:Number(techCard?.proof||0),bakeTemp:Number(techCard?.bakeTemp||0),bakeTime:Number(techCard?.bakeTime||0),steps:String(techCard?.steps||''),notes:String(techCard?.notes||''),recipeArchived:Boolean(techCard?.recipeArchived)};
    const local=typeof productRegistry!=='undefined'?productRegistry.find(item=>item.id===productId):null;
    const expectedRevision=Number(local?.techCardRevision||0);
    status('Сохранение технологической карты…');
    let rows;
    try{
      const lock=techCardLocks.get(productId);if(!lock?.token)throw new Error('PANORA_LOCK_REQUIRED');
      rows=await request('rpc/panora_save_locked_tech_card_revision',{method:'POST',body:JSON.stringify({p_product_id:productId,p_tech_card:normalized,p_expected_revision:expectedRevision,p_lock_token:lock.token})});
    }catch(error){
    if(window.panoraHandleSessionError?.(error)) return;
    if(/PANORA_REVISION_CONFLICT/i.test(String(error?.message||error))){
        await releaseTechCardLock(productId);
        const latest=await request(`products?id=eq.${encodeURIComponent(productId)}&select=${PRODUCT_SELECT}&limit=1`);
        if(latest?.length)await applyProductRows((await request(`products?select=${PRODUCT_SELECT}&order=created_at.asc`))||latest);
        throw new Error('Карта уже изменена на другом устройстве. Блокировка снята, новая облачная версия загружена; проверьте её и начните редактирование заново.');
      }
      if(/PANORA_LOCK_(REQUIRED|LOST|NOT_OWNER)/i.test(String(error?.message||error))){techCardLocks.delete(productId);window.dispatchEvent(new CustomEvent('panora:tech-card-lock-lost',{detail:{productId}}));throw new Error('Безопасная блокировка технологической карты потеряна. Начните редактирование заново.');}
      throw error;
    }
    const saved=rows?.[0];
    if(!saved||saved.id!==productId)throw new Error('Сервер не подтвердил новую ревизию технологической карты');
    const verified=await request(`products?id=eq.${encodeURIComponent(productId)}&select=id,tech_card,tech_card_revision,updated_at&limit=1`),confirmed=verified?.[0];
    if(!confirmed||Number(confirmed.tech_card_revision)!==expectedRevision+1||JSON.stringify(canonicalValue(confirmed.tech_card||{}))!==JSON.stringify(canonicalValue(normalized)))throw new Error('Проверка технологической карты после записи не пройдена');
    if(local){local.techCard=confirmed.tech_card;local.techCardRevision=Number(confirmed.tech_card_revision)}
    techCardLocks.delete(productId);window.dispatchEvent(new CustomEvent('panora:tech-card-lock-released',{detail:{productId}}));
    productDirty=false;clearPending('products');rememberRevision('products',verified);saveProductBaseline(localProducts());status('Технологическая карта сохранена ✓');
    return confirmed.tech_card;
  }
  const ingredientCostParts=key=>{
    const value=String(key||''),split=value.lastIndexOf('|');
    return split>0?{name:value.slice(0,split),unit:value.slice(split+1)||'g'}:{name:value,unit:'g'};
  };
  async function loadIngredientCosts(){
    if(!ready)return false;
    if(pending.ingredientCosts||ingredientCostsSaving)return true;
    const rows=await request('raw_material_prices?select=ingredient_key,ingredient_name,unit,purchase_price,updated_at&order=ingredient_key.asc');
    const local=JSON.parse(localStorage.getItem(ingredientCostsKey)||'{}')||{};
    if(Array.isArray(rows)&&rows.length){
      const remote={};
      rows.forEach(row=>{remote[String(row.ingredient_key||'')]=Math.max(0,Number(row.purchase_price||0))});
      safeLocalSet(ingredientCostsKey,JSON.stringify(remote),{quotaIsWarning:false});
      clearPending('ingredientCosts');
      window.dispatchEvent(new CustomEvent('panora:ingredient-costs-changed',{detail:{prices:remote,source:'cloud'}}));
      return true;
    }
    if(Object.keys(local).length){
      markPending('ingredientCosts');
      await saveIngredientCostsNow();
      return true;
    }
    safeLocalSet(ingredientCostsKey,'{}',{quotaIsWarning:false});
    return true;
  }
  async function saveIngredientCostsNow(){
    if(!ready)return false;
    if(ingredientCostsSaving)return ingredientCostsSaving;
    ingredientCostsSaving=(async()=>{
      const map=JSON.parse(localStorage.getItem(ingredientCostsKey)||'{}')||{};
      const payload=Object.entries(map).map(([key,value])=>{
        const part=ingredientCostParts(key);
        return{
          ingredient_key:String(key),
          ingredient_name:part.name,
          unit:['g','ml','pcs'].includes(part.unit)?part.unit:'g',
          purchase_price:Math.max(0,Number(value)||0),
          updated_at:new Date().toISOString(),
          updated_by:session?.user?.id||null
        };
      });
      if(payload.length){
        await request('raw_material_prices?on_conflict=ingredient_key',{
          method:'POST',
          headers:{Prefer:'resolution=merge-duplicates,return=minimal'},
          body:JSON.stringify(payload)
        });
      }
      clearPending('ingredientCosts');
      return true;
    })().finally(()=>ingredientCostsSaving=null);
    return ingredientCostsSaving;
  }
  function queueIngredientCosts(){
    markPending('ingredientCosts');
    clearTimeout(ingredientCostTimer);
    if(!ready||!navigator.onLine)return;
    ingredientCostTimer=setTimeout(()=>saveIngredientCostsNow().catch(error=>{
      console.warn('Panora ingredient price save',error);
      status('Ошибка синхронизации',true,error?.message||String(error));
    }),250);
  }
  async function flushIngredientCosts(){
    clearTimeout(ingredientCostTimer);ingredientCostTimer=0;
    if(!ready)return false;
    if(ingredientCostsSaving)await ingredientCostsSaving;
    if(pending.ingredientCosts)await saveIngredientCostsNow();
    return true;
  }

  async function loadRecipes(){
    const rows=await request('recipe_items?select=product_id,position,ingredient_name,quantity,unit,stock,margin,source_ingredient_name,source_unit,source_yield_pct,updated_at&order=product_id.asc,position.asc');
    const local=JSON.parse(localStorage.getItem('panora-recipes')||'{}');
    if(recipeDirty||savingRecipes){await flushRecipes();return}
    rememberRevision('recipes',rows);
    if(rows?.length){
      await window.panoraFormDrafts?.acceptCommittedWithin?.('#recipeList');
      const remote={};
      rows.forEach(row=>{const pos=Number(row.position||0),localItem=local?.[row.product_id]?.[pos]||{};(remote[row.product_id]??=[]).push({name:row.ingredient_name,qty:Number(row.quantity),unit:row.unit,stock:Number(row.stock||0),margin:Number(row.margin||0),sourceIngredientName:row.source_ingredient_name??localItem.sourceIngredientName??'',sourceUnit:row.source_unit??localItem.sourceUnit??'g',sourceYieldPct:Number(row.source_yield_pct??localItem.sourceYieldPct??0)})});
      recipes=remote;if(typeof syncAdminProductRegistry==='function')syncAdminProductRegistry();safeLocalSet('panora-recipes',JSON.stringify(recipes),{quotaIsWarning:false});safeLocalSet('panora-recipes-version','cloud-2',{quotaIsWarning:false});window.dispatchEvent(new CustomEvent('panora:recipes-changed'));
      if(typeof renderAll==='function')renderAll();
    }else if(Object.keys(local).length){recipes=local;ready=true;recipeDirty=true;recipeRevision++;await flushRecipes()}
  }
  async function saveRecipesNow(){
    if(!ready||typeof recipes==='undefined')return false;
    if(savingRecipes)return savingRecipes;
    const revision=recipeRevision,snapshot=JSON.parse(JSON.stringify(recipes));
    savingRecipes=(async()=>{
      status('Синхронизация рецептур…');
      await guardSection('recipes','recipe_items');
      await request('recipe_items?id=not.is.null',{method:'DELETE'});
      const payload=Object.entries(snapshot).flatMap(([productId,items])=>(items||[]).map((item,position)=>({product_id:productId,position,ingredient_name:String(item.name||''),quantity:Number(item.qty||0),unit:item.unit||'g',stock:Number(item.stock||0),margin:Number(item.margin||0),source_ingredient_name:item.sourceIngredientName||null,source_unit:item.sourceUnit||null,source_yield_pct:Number(item.sourceYieldPct||0)||null})));
      if(payload.length){
        try{await request('recipe_items?on_conflict=product_id,position',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(payload)})}
        catch(error){
          if(!/source_ingredient_name|source_unit|source_yield_pct|PGRST204/i.test(String(error?.message||error)))throw error;
          const legacy=payload.map(({source_ingredient_name,source_unit,source_yield_pct,...row})=>row);
          await request('recipe_items?on_conflict=product_id,position',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(legacy)});
          status('Облако ✓ · для полуфабрикатов выполните SQL Panora 5.83');
        }
      }
      revisions.recipes=new Date().toISOString();localStorage.setItem(revisionKey,JSON.stringify(revisions));forceSections.delete('recipes');delete conflicts.recipes;saveConflicts();
      if(recipeRevision===revision){recipeDirty=false;clearPending('recipes')}
      status('Облако ✓');return true;
    })().finally(()=>savingRecipes=null);
    const result=await savingRecipes;
    if(recipeDirty)return saveRecipesNow();
    return result;
  }
  async function flushRecipes(){
    clearTimeout(recipeTimer);recipeTimer=0;
    if(!ready)return false;
    while(recipeDirty||savingRecipes){if(savingRecipes)await savingRecipes;else await saveRecipesNow()}
    return true;
  }
  const safeMessengerRows=value=>Array.isArray(value)?value.filter(item=>item&&item.name&&item.contact).slice(0,10).map(item=>({name:String(item.name).slice(0,40),contact:String(item.contact).slice(0,120)})):[];
  const normalizeCloudPartnerType=value=>{const raw=String(value??'').trim().toLowerCase(),aliases={restaurant:'restaurant','ресторан':'restaurant',restaurante:'restaurant',shop:'shop','магазин':'shop',tienda:'shop',hotel:'hotel','отель':'hotel',cafe:'cafe','кафе':'cafe','café':'cafe',catering:'catering','кейтеринг':'catering',cátering:'catering',other:'other','другое':'other',otro:'other'};return aliases[raw]||'restaurant'};
  const restaurantRow=r=>({id:r.id,name:r.name,email:r.email,phone:r.phone||null,whatsapp:r.whatsapp||null,telegram:r.telegram||null,extra_messengers:safeMessengerRows(r.extraMessengers),address:r.address||null,legal_name:r.legalName||null,tax_id:r.taxId||null,billing_address:r.billingAddress||null,language:r.language||'ru',partner_type:normalizeCloudPartnerType(r.partnerType),active:!r.deletedAt});
  const rowRestaurant=(row,local)=>({id:row.id,name:row.name,email:row.email,phone:row.phone||'',whatsapp:row.whatsapp||'',telegram:row.telegram||'',extraMessengers:safeMessengerRows(row.extra_messengers),address:row.address||'',legalName:row.legal_name||'',taxId:row.tax_id||'',billingAddress:row.billing_address||'',language:row.language||'ru',partnerType:normalizeCloudPartnerType(row.partner_type||local?.partnerType),accessCode:local?.accessCode||'',prices:Object.fromEntries((row.restaurant_prices||[]).map(item=>[item.product_id,Number(item.price)])),...(row.active?{}:{deletedAt:local?.deletedAt||row.updated_at})});
  async function refreshRestaurantPricesDirect(){
    if(!ready)return false;
    const activeMoneyInput=window.panoraMoneyEditing?.element||null;

    // restaurant_prices is the ONLY authority for wholesale prices.
    const rows=await request('restaurant_prices?select=restaurant_id,product_id,price,updated_at&order=restaurant_id.asc,product_id.asc');
    const local=JSON.parse(localStorage.getItem('panora-restaurants')||'[]');

    const remoteMap={};
    for(const row of rows||[]){
      const rid=String(row.restaurant_id),pid=String(row.product_id);
      (remoteMap[rid]??={})[pid]=Number(row.price);
    }

    // Store the exact Supabase map every time. No early return:
    // DOM/local cache may be stale even when this map is already current.
    safeLocalSet(adminRestaurantPricesKey,JSON.stringify(remoteMap),{quotaIsWarning:false});

    let localChanged=false;
    const next=(local||[]).map(r=>{
      const remote=remoteMap[String(r.id)];
      if(!remote)return r;
      const before=JSON.stringify(r.prices||{});
      const after=JSON.stringify(remote);
      if(before!==after)localChanged=true;
      return before===after?r:{...r,prices:{...remote}};
    });
    if(localChanged){
      restaurants=next;
      safeLocalSet('panora-restaurants',JSON.stringify(next),{quotaIsWarning:false});
      writeRestaurantBaseline(next);
      clearPending('restaurants');
    }else if(Array.isArray(next)){
      restaurants=next;
    }

    let domChanged=false;
    const apply=(input,key)=>{
      if(input===activeMoneyInput)return;
      const [rid,pid]=String(key||'').split(':');
      const value=remoteMap?.[rid]?.[pid];
      if(value==null||!Number.isFinite(Number(value)))return;
      const shown=Number(value).toFixed(2);
      if(input.value!==shown){input.value=shown;domChanged=true}
    };
    document.querySelectorAll('#restaurantCards input[data-price]').forEach(input=>apply(input,input.dataset.price));
    document.querySelectorAll('#restaurantCards input[data-custom-price]').forEach(input=>apply(input,input.dataset.customPrice));

    if(localChanged||domChanged){
      window.dispatchEvent(new CustomEvent('panora:admin-prices-updated',{detail:{source:'restaurant-prices-authoritative',count:(rows||[]).length}}));
    }
    return localChanged||domChanged;
  }

  async function loadRestaurants(){
    if(pending.restaurants&&!window.panoraMoneyEditing?.active&&!restaurantTimer)clearPending('restaurants');
    const rows=await request(`restaurants?select=${RESTAURANT_SELECT}&order=created_at.asc`);
    rememberRevision('restaurants',rows);
    const local=JSON.parse(localStorage.getItem('panora-restaurants')||'[]');
    if(rows?.length){
      restaurants=rows.map(row=>rowRestaurant(row,local.find(r=>r.id===row.id||String(r.email).toLowerCase()===String(row.email).toLowerCase())));
      safeLocalSet('panora-restaurants',JSON.stringify(restaurants),{quotaIsWarning:false});
      writeRestaurantBaseline(restaurants);
      clearPending('restaurants');
      await refreshRestaurantPricesDirect();
      if(typeof renderCommerce==='function')renderCommerce();
    }else{
      // Panora 9.88 CLEAN BASE: Supabase is authoritative on first hydration.
      // Never resurrect partners from an old browser cache when the server is empty.
      restaurants=[];
      safeLocalSet('panora-restaurants','[]',{quotaIsWarning:false});
      writeRestaurantBaseline([]);
      clearPending('restaurants');
      ready=true;
      if(typeof renderCommerce==='function')renderCommerce();
    }
  }
  async function refreshRestaurantsIfChanged(){
    if(!ready||document.hidden)return false;
    if(window.panoraMoneyEditing?.active)return false;
    if(pending.restaurants)clearPending('restaurants');

    const rows=await request(`restaurants?select=${RESTAURANT_SELECT}&order=created_at.asc`);
    const local=JSON.parse(localStorage.getItem('panora-restaurants')||'[]');
    const mapped=(rows||[]).map(row=>rowRestaurant(row,local.find(r=>r.id===row.id||String(r.email).toLowerCase()===String(row.email).toLowerCase())));
    const before=restaurantSignature(local);
    const after=restaurantSignature(mapped);

    writeRestaurantBaseline(mapped);
    if(before===after)return false;

    restaurants=mapped;
    safeLocalSet('panora-restaurants',JSON.stringify(restaurants),{quotaIsWarning:false});
    clearPending('restaurants');
    rememberRevision('restaurants',rows);
    window.dispatchEvent(new CustomEvent('panora:restaurants-ui-refresh',{detail:{source:'cloud-authoritative',count:restaurants.length}}));
    if(typeof renderCommerce==='function')renderCommerce();
    return true;
  }
  async function saveRestaurantsNow(){
    clearTimeout(restaurantTimer);restaurantTimer=0;
    if(!ready||typeof restaurants==='undefined')return;
    status('Синхронизация…');
    await guardSection('restaurants','restaurants');
    if(restaurants.length)await request('restaurants?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(restaurants.map(restaurantRow))});
    const prices=restaurants.flatMap(r=>Object.entries(r.prices||{}).map(([product_id,price])=>({restaurant_id:r.id,product_id,price:Number(price)})));
    if(prices.length){
      const remotePrices=await request('restaurant_prices?select=restaurant_id,product_id');
      const existing=new Set((remotePrices||[]).map(row=>`${row.restaurant_id}:${row.product_id}`));
      const missingPrices=prices.filter(row=>!existing.has(`${row.restaurant_id}:${row.product_id}`));
      if(missingPrices.length)await request('restaurant_prices?on_conflict=restaurant_id,product_id',{
        method:'POST',
        headers:{Prefer:'resolution=merge-duplicates,return=minimal'},
        body:JSON.stringify(missingPrices)
      });
    }
    revisions.restaurants=new Date().toISOString();localStorage.setItem(revisionKey,JSON.stringify(revisions));forceSections.delete('restaurants');delete conflicts.restaurants;saveConflicts();
    clearPending('restaurants');writeRestaurantBaseline(restaurants);window.dispatchEvent(new CustomEvent('panora:restaurants-ui-refresh'));
    status('Облако ✓');
  }
  const orderMeta=order=>JSON.stringify({deliveryDate:order.deliveryDate||order.date,deliveryWindow:order.deliveryWindow||'',taxRate:Number(order.taxRate||0),comment:order.comment||'',createdSource:order.createdSource||'',createdByRole:order.createdByRole||'',createdByName:order.createdByName||'',createdByAt:order.createdByAt||'',confirmedByRole:order.confirmedByRole||'',confirmedByName:order.confirmedByName||'',confirmedAt:order.confirmedAt||''});
  const parseOrderMeta=value=>{try{return JSON.parse(value||'{}')}catch{return{comment:value||''}}};
  const rowOrder=row=>{
    const meta=parseOrderMeta(row.comment),day=row.bake_days||{},rawItems=row.order_items||[],items=rawItems.map(item=>({product:item.product_id,quantity:Number(item.quantity),nameSnapshot:item.product_names_snapshot||null,imageSnapshot:item.product_image_snapshot||''})),partnerPrices=restaurant(row.restaurant_id)?.prices||{};
    const orderPrices=Object.fromEntries(rawItems.map(item=>{const saved=Number(item.unit_price),fallback=Number(partnerPrices[item.product_id]);return[item.product_id,(Number.isFinite(saved)&&saved>0)?saved:(Number.isFinite(fallback)&&fallback>0?fallback:saved)]}));
    return{id:row.id,number:Number(row.order_number),restaurantId:row.restaurant_id,date:day.bake_date,deliveryDate:meta.deliveryDate||day.delivery_date||day.bake_date,deliveryWindow:meta.deliveryWindow||'',items,prices:orderPrices,taxRate:Number(meta.taxRate||0),status:row.status,comment:meta.comment||'',createdSource:meta.createdSource||'',createdByRole:meta.createdByRole||'',createdByName:meta.createdByName||'',createdByAt:meta.createdByAt||'',confirmedByRole:meta.confirmedByRole||'',confirmedByName:meta.confirmedByName||'',confirmedAt:meta.confirmedAt||'',cancellationReason:row.cancelled_reason||'',createdAt:row.created_at};
  };
  async function hydrateAdminOrderRows(orderRows){
    const rows=Array.isArray(orderRows)?orderRows:[];
    const missing=rows.filter(row=>!Array.isArray(row?.order_items)||row.order_items.length===0);
    if(!missing.length)return rows;
    const ids=missing.map(row=>String(row.id||'')).filter(Boolean);
    if(!ids.length)return rows;
    try{
      const encoded=ids.map(id=>`"${id.replace(/"/g,'')}"`).join(',');
      const itemRows=await request(`order_items?order_id=in.(${encodeURIComponent(encoded)})&select=order_id,product_id,quantity,unit_price,product_names_snapshot,product_image_snapshot&order=order_id.asc,product_id.asc`);
      const grouped=new Map();
      for(const item of itemRows||[]){
        const key=String(item.order_id||'');
        if(!grouped.has(key))grouped.set(key,[]);
        grouped.get(key).push(item);
      }
      return rows.map(row=>{
        const direct=grouped.get(String(row.id||''))||[];
        return direct.length?{...row,order_items:direct}:row;
      });
    }catch(error){
      console.warn('Panora admin order item hydration',error);
      return rows;
    }
  }
  async function repairTrueOrphanOrders(orderRows){
    const rows=Array.isArray(orderRows)?orderRows:[];
    const orphans=rows.filter(row=>
      ['submitted','confirmed'].includes(String(row?.status||'')) &&
      (!Array.isArray(row?.order_items)||row.order_items.length===0)
    );
    for(const row of orphans){
      try{
        await request(`orders?id=eq.${encodeURIComponent(row.id)}`,{
          method:'PATCH',
          headers:{Prefer:'return=minimal'},
          body:JSON.stringify({
            status:'cancelled',
            cancelled_reason:'Panora 6.50 repair: order has no items',
            updated_at:new Date().toISOString()
          })
        });
        row.status='cancelled';
        row.cancelled_reason='Panora 6.50 repair: order has no items';
        audit?.('order.orphan.repaired',`PN-${row.order_number||row.id} · пустой заказ переведён в отменённые`,'warning');
      }catch(error){
        console.warn('Panora orphan order repair',row?.id,error);
      }
    }
    return rows;
  }
  const adminOrdersWatermarkKey='panora-admin-orders-watermark-v936';
  const adminPaymentsWatermarkKey='panora-admin-payments-watermark-v936';
  let adminCommerceRevision='',adminCommerceParts={orders:'',payments:'',notes:''},adminCommerceRevisionUnavailable=false,adminCommerceRevisionPromise=null;
  async function adminCommerceRevisionChanged(){
    if(adminCommerceRevisionUnavailable)return {changed:true,orders:true,payments:true,notes:true};
    if(adminCommerceRevisionPromise)return adminCommerceRevisionPromise;
    adminCommerceRevisionPromise=(async()=>{
      try{
        const rows=await request('rpc/panora_admin_commerce_revision',{method:'POST',body:'{}'});
        const row=Array.isArray(rows)?rows[0]:rows,next=String(row?.revision||'');
        const active=Math.max(0,Number(row?.active_count)||0),archive=Math.max(0,Number(row?.archive_count)||0);
        if(row&&('active_count' in row||'archive_count' in row)){
          safeLocalSet('panora-order-counts-cache',JSON.stringify({active,archive,updatedAt:new Date().toISOString()}),{quotaIsWarning:false});
          window.dispatchEvent(new CustomEvent('panora:order-counts-updated',{detail:{active,archive,submitted:Math.max(0,Number(row?.submitted_count)||0),authoritative:true}}));
        }
        if(!next)return {changed:true,orders:true,payments:true,notes:true};
        const parts={orders:String(row?.orders_revision||''),payments:String(row?.payments_revision||''),notes:String(row?.notes_revision||'')};
        if(!adminCommerceRevision){adminCommerceRevision=next;adminCommerceParts=parts;return {changed:true,orders:true,payments:true,notes:true}}
        if(next===adminCommerceRevision)return {changed:false,orders:false,payments:false,notes:false};
        const componentAware=Boolean(parts.orders||parts.payments||parts.notes);
        const changed={changed:true,orders:!componentAware||parts.orders!==adminCommerceParts.orders,payments:!componentAware||parts.payments!==adminCommerceParts.payments,notes:!componentAware||parts.notes!==adminCommerceParts.notes};
        adminCommerceRevision=next;adminCommerceParts=parts;return changed;
      }catch(error){
        const raw=String(error?.message||error||'');
        if(/panora_admin_commerce_revision|PGRST202|does not exist|schema cache/i.test(raw)){adminCommerceRevisionUnavailable=true;return {changed:true,orders:true,payments:true,notes:true}}
        throw error;
      }
    })().finally(()=>{adminCommerceRevisionPromise=null});
    return adminCommerceRevisionPromise;
  }
  async function loadOrders(){
    if(loadingOrders)return loadingOrders;if(savingOrders)await savingOrders;
    if(pending.orders){await saveOrdersNow();clearPending('orders')}
    loadingOrders=(async()=>{
      const firstHydration=!window.panoraAdminOrdersHydrated;
      const beforeSignature=orderUiSignature(typeof orders!=='undefined'?orders:[]);
      const watermark=!firstHydration?String(localStorage.getItem(adminOrdersWatermarkKey)||''):'';
      const deltaQuery=watermark?`&updated_at=gt.${encodeURIComponent(watermark)}`:'';
      const fetched=await request(`orders?select=id,order_number,restaurant_id,status,comment,cancelled_reason,created_at,updated_at,bake_days(bake_date,delivery_date),order_items(product_id,quantity,unit_price,product_names_snapshot,product_image_snapshot)${deltaQuery}&order=order_number.asc`);
      if(watermark&&!(fetched||[]).length){status('Облако ✓');return}
      const newest=(fetched||[]).reduce((latest,row)=>String(row?.updated_at||'')>latest?String(row.updated_at):latest,watermark);
      const hydrated=await hydrateAdminOrderRows(fetched||[]);
      const changedRows=await repairTrueOrphanOrders(hydrated);
      if(watermark){
        const merged=new Map((orders||[]).map(order=>[String(order.id),order]));
        (changedRows||[]).map(rowOrder).forEach(order=>merged.set(String(order.id),order));
        orders=[...merged.values()].sort((a,b)=>Number(a?.number||0)-Number(b?.number||0));
      }else orders=(changedRows||[]).map(rowOrder);
      if(newest)localStorage.setItem(adminOrdersWatermarkKey,newest);
      const activeOrderCount=orders.filter(order=>!['shipped','cancelled'].includes(String(order?.status||''))).length;
      const archivedOrderCount=orders.length-activeOrderCount;
      safeLocalSet('panora-order-counts-cache',JSON.stringify({active:activeOrderCount,archive:archivedOrderCount,updatedAt:new Date().toISOString()}),{quotaIsWarning:false});
      window.panoraAdminOrdersHydrated=true;
      window.dispatchEvent(new CustomEvent('panora:order-counts-updated',{detail:{active:activeOrderCount,archive:archivedOrderCount,authoritative:true}}));
      const afterOrders=JSON.stringify(orders);
      const afterSignature=orderUiSignature(orders);
      const changed=beforeSignature!==afterSignature;

      if(typeof window.panoraSaveOrdersCache==='function')window.panoraSaveOrdersCache(orders);
      else safeLocalSet('panora-orders',afterOrders,{quotaIsWarning:false});

      if(changed)window.dispatchEvent(new CustomEvent('panora:orders-updated',{detail:{count:orders.length}}));
      syncPlansFromOrders();
      if(financeLoaded){try{await repairMissingDeliveryNotes()}catch(error){console.warn('Panora finance repair skipped during order refresh',error)}}

      if(changed||firstHydration)queueAdminCommerceRender(true);
      status(`Облако ✓ · ${orders?.length||0} заказов`);
    })().finally(()=>loadingOrders=null);
    return loadingOrders;
  }
  async function updateOrderStatus(id,nextStatus,cancelledReason=null){
    if(!ready)throw new Error('Облако ещё загружается');
    if(loadingOrders)await loadingOrders;
    if(savingOrders)await savingOrders;
    clearTimeout(orderTimer);orderTimer=0;
    let result;
    try{
      result=await request('rpc/panora_admin_set_order_status',{
        method:'POST',
        headers:{Prefer:'return=representation'},
        body:JSON.stringify({p_order_id:id,p_status:String(nextStatus||''),p_reason:cancelledReason||null})
      });
    }catch(error){
      const raw=String(error?.message||error||'');
      if(/panora_admin_set_order_status|PGRST202|does not exist/i.test(raw))
        throw new Error('На сервере не установлен RPC статусов Panora 6.74. Выполните SQL 6.74.');
      throw error;
    }
    const returned=Array.isArray(result)?result[0]:result;
    if(returned?.status&&String(returned.status)!==String(nextStatus))
      throw new Error(`Сервер сохранил статус «${returned.status}» вместо «${nextStatus}»`);
    await loadOrders();
    const saved=orders.find(order=>String(order.id)===String(id));
    if(saved&&String(nextStatus)==='confirmed'){
      const confirmedAt=new Date().toISOString();
      Object.assign(saved,{confirmedByRole:'admin',confirmedByName:'Пекарня',confirmedAt});
      try{
        await request(`orders?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({comment:orderMeta(saved),updated_at:confirmedAt})});
      }catch(metaError){console.warn('Panora bakery confirmation audit meta',metaError)}
    }
    window.dispatchEvent(new CustomEvent('panora:order-status-local',{detail:{id,nextStatus}}));
    if(!saved||String(saved.status)!==String(nextStatus))
      throw new Error(`Supabase вернул статус «${saved?.status||'не найден'}» вместо «${nextStatus}»`);
    window.panoraRefreshNewOrderBadge?.();
    return saved;
  }
  async function shipOrderAtomic({orderId,items,paymentAmount=0,paymentMethod='Наличные',paymentDueDate=null,traysDelivered=0,traysReturned=0,trayBalanceAfter=0}){
    if(!ready)throw new Error('Нет соединения с облаком');
    if(shippingLocks.has(orderId)){audit('shipment.duplicate_prevented',`Заказ ${orderId}: повторное нажатие заблокировано`,'warning');throw new Error('Отгрузка уже выполняется')}
    const localNote=deliveryNotes.find(entry=>entry.orderId===orderId);
    if(localNote){audit('shipment.duplicate_prevented',`Заказ ${orderId}: накладная уже существует`,'warning');return localNote}
    shippingLocks.add(orderId);
    try{
      if(loadingOrders)await loadingOrders;
      clearTimeout(orderTimer);orderTimer=0;
      const existing=await request(`delivery_notes?order_id=eq.${encodeURIComponent(orderId)}&select=id,note_number&limit=1`);
      if(existing?.length){
        await loadDeliveryNotes();
        const found=deliveryNotes.find(entry=>entry.orderId===orderId);
        audit('shipment.duplicate_prevented',`Заказ ${orderId}: найдена существующая накладная ${existing[0].note_number}`,'warning');
        if(found)return found;
      }
    await request('rpc/panora_ship_order',{
        method:'POST',
        headers:{Prefer:'return=representation'},
        body:JSON.stringify({
          p_order_id:orderId,
          p_items:(items||[]).map(item=>({product_id:item.product,quantity:Number(item.quantity||0)})),
          p_payment_amount:Number(paymentAmount||0),
          p_payment_method:paymentMethod||'Наличные',
          p_payment_due_date:paymentDueDate||null
        })
      });
    await request(`delivery_notes?order_id=eq.${encodeURIComponent(orderId)}`,{
      method:'PATCH',
      headers:{Prefer:'return=minimal'},
      body:JSON.stringify({
        trays_delivered:Number(traysDelivered||0),
        trays_returned:Number(traysReturned||0),
        tray_balance_after:Number(trayBalanceAfter||0)
      })
    });
    await loadOrders();await loadPayments();await loadDeliveryNotes();
      const note=deliveryNotes.find(entry=>entry.orderId===orderId);
      if(!note)throw new Error('Supabase не вернул созданную накладную');

      let order=orders.find(entry=>entry.id===orderId);
      // Panora 6.73: a delivery note without status=shipped is NOT a completed
      // shipment. Repair the server row explicitly, then verify it again.
      if(order?.status!=='shipped'){
        await request('rpc/panora_admin_set_order_status',{
          method:'POST',
          headers:{Prefer:'return=representation'},
          body:JSON.stringify({p_order_id:orderId,p_status:'shipped',p_reason:null})
        });
        await loadOrders();
        order=orders.find(entry=>entry.id===orderId);
      }
      if(!order||order.status!=='shipped'){
        throw new Error('Supabase создал накладную, но не подтвердил статус «Отгружен»');
      }
      window.dispatchEvent(new CustomEvent('panora:order-status-local',{detail:{id:orderId,nextStatus:'shipped'}}));
      window.dispatchEvent(new CustomEvent('panora:order-cycle-updated',{detail:{id:orderId,status:'shipped'}}));
      window.panoraRefreshNewOrderBadge?.();
      audit('shipment.completed',`${order?.number||orderId} · накладная ${note.number||note.noteNumber||''}`);
      return note;
    }catch(error){
    if(window.panoraHandleSessionError?.(error)) return;
    try{
        const existing=await request(`delivery_notes?order_id=eq.${encodeURIComponent(orderId)}&select=id,note_number&limit=1`);
        if(existing?.length){
          await loadOrders();await loadPayments();await loadDeliveryNotes();
          const recovered=deliveryNotes.find(entry=>entry.orderId===orderId);
          if(recovered){
            let order=orders.find(entry=>entry.id===orderId);
            if(order?.status!=='shipped'){
              await request('rpc/panora_admin_set_order_status',{
          method:'POST',
          headers:{Prefer:'return=representation'},
          body:JSON.stringify({p_order_id:orderId,p_status:'shipped',p_reason:null})
        });
              await loadOrders();
              order=orders.find(entry=>entry.id===orderId);
            }
            if(order?.status!=='shipped')throw new Error('Накладная существует, но заказ не переведён в «Отгружен»');
            window.panoraRefreshNewOrderBadge?.();
            audit('shipment.recovered',`${order?.number||orderId} · накладная ${recovered.number||existing[0].note_number}`,'warning');
            status('Облако ✓');
            return recovered;
          }
        }
      }catch(recoveryError){console.warn('Panora shipment recovery failed',recoveryError)}
      audit('shipment.failed',`Заказ ${orderId}: ${error?.message||error}`,'error');
      throw error;
    }finally{shippingLocks.delete(orderId)}
  }
  async function bakeDayMap(){const days=await request('bake_days?select=id,bake_date');return new Map((days||[]).map(day=>[day.bake_date,day.id]))}
  async function saveOrdersNow(){
    if(!ready||typeof orders==='undefined')return;if(savingOrders)return savingOrders;
    savingOrders=(async()=>{status('Синхронизация…');
    // Panora 6.70: this queue is only for explicitly new/manual orders.
    // Existing cloud orders are authoritative and MUST NOT be upserted from
    // local cache, especially not their status.
    let itemSyncOrders=(orders||[]).filter(order=>order?._itemSyncRequired===true);
    let days=await bakeDayMap();
    const missing=itemSyncOrders.some(order=>!days.has(order.date));
    if(missing){await savePlansNow();days=await bakeDayMap()}
    itemSyncOrders=itemSyncOrders.filter(order=>days.has(order.date)&&restaurants.some(r=>r.id===order.restaurantId));
    if(itemSyncOrders.length){
      const payload=itemSyncOrders.map(order=>({
        id:order.id,
        restaurant_id:order.restaurantId,
        bake_day_id:days.get(order.date),
        status:order.status||'confirmed',
        comment:orderMeta(order),
        cancelled_reason:order.cancellationReason||null,
        created_by:session.user?.id||null,
        updated_at:new Date().toISOString()
      }));
      await request('orders?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(payload)});
      for(const order of itemSyncOrders){
        const items=(order.items||[]).filter(item=>Number(item.quantity)>0).map(item=>{const product=(typeof productRegistry!=='undefined'?productRegistry:[]).find(p=>String(p.id)===String(item.product));return{order_id:order.id,product_id:item.product,quantity:Number(item.quantity),unit_price:Number((order.prices||{})[item.product]??restaurant(order.restaurantId)?.prices?.[item.product]??0),product_names_snapshot:item.nameSnapshot||product?.names||null,product_image_snapshot:item.imageSnapshot||product?.image||null}});
        if(!items.length)throw new Error(`Пустой заказ не может быть сохранён: ${order.number||order.id}`);
        await request('order_items?on_conflict=order_id,product_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(items)});
      }
      if(itemSyncOrders.length){
        const ids=itemSyncOrders.map(order=>String(order.id||'')).filter(Boolean);
        if(ids.length){
          const quoted=ids.map(id=>`"${id.replace(/"/g,'')}"`).join(',');
          const serverRows=await request(`orders?id=in.(${encodeURIComponent(quoted)})&select=id,order_number,status,created_at`);
          const byId=new Map((serverRows||[]).map(row=>[String(row.id),row]));
          itemSyncOrders.forEach(order=>{
            const server=byId.get(String(order.id));
            if(server){
              order.number=Number(server.order_number);
              order.createdAt=server.created_at||order.createdAt;
              order.status=server.status||order.status;
              order._serverNumberPending=false;
              order._itemSyncRequired=false;
            }
          });
        }
        window.panoraSaveOrdersCache?.(orders);
        window.dispatchEvent(new CustomEvent('panora:orders-updated',{detail:{count:orders.length,source:'server-number'}}));
      }
    }
    status('Облако ✓');})().finally(()=>savingOrders=null);return savingOrders
  }
  let adminCommerceRenderTimer=0,adminCommerceRenderNeedsAll=false;
  const adminOrderInteractionActive=()=>Date.now()<Number(window.panoraAdminOrderInteractionUntil||0);
  function queueAdminCommerceRender(needsAll=false){
    adminCommerceRenderNeedsAll=adminCommerceRenderNeedsAll||Boolean(needsAll);
    clearTimeout(adminCommerceRenderTimer);
    const run=()=>{
      if(adminOrderInteractionActive()){
        adminCommerceRenderTimer=setTimeout(run,120);
        return;
      }
      adminCommerceRenderTimer=0;
      const renderAllNeeded=adminCommerceRenderNeedsAll;
      adminCommerceRenderNeedsAll=false;
      if(typeof renderCommerce==='function')renderCommerce();
      if(renderAllNeeded&&typeof renderAll==='function')renderAll();
    };
    adminCommerceRenderTimer=setTimeout(run,0);
  }
  const stableJson=value=>JSON.stringify(value);
  const orderUiSignature=list=>stableJson((list||[]).map(order=>({
    id:String(order?.id||''),number:Number(order?.number||0),restaurantId:String(order?.restaurantId||''),
    date:String(order?.date||''),deliveryDate:String(order?.deliveryDate||''),status:String(order?.status||''),
    comment:String(order?.comment||''),cancellationReason:String(order?.cancellationReason||''),
    items:(order?.items||[]).map(item=>({product:String(item?.product||''),quantity:Number(item?.quantity||0)}))
      .sort((a,b)=>a.product.localeCompare(b.product)),
    prices:Object.entries(order?.prices||{}).map(([id,price])=>[String(id),Number(price||0)]).sort((a,b)=>a[0].localeCompare(b[0]))
  })).sort((a,b)=>a.id.localeCompare(b.id)));
  const noteUiSignature=list=>stableJson((list||[]).map(note=>({
    id:String(note?.id||''),orderId:String(note?.orderId||''),number:Number(note?.number||0),
    date:String(note?.date||''),total:Number(note?.total||0),paid:Number(note?.paid||0),
    customerConfirmedAt:String(note?.customerConfirmedAt||''),customerReceiver:String(note?.customerReceiver||''),
    customerTraysReceived:note?.customerTraysReceived==null?null:Number(note.customerTraysReceived),
    customerTraysReturned:note?.customerTraysReturned==null?null:Number(note.customerTraysReturned),
    offlineReceivedAt:String(note?.offlineProof?.receivedAt||''),offlineReceiver:String(note?.offlineProof?.receiver||''),
    offlineSignaturePresent:Boolean(note?.offlineProof?.signature),offlinePending:Boolean(note?.offlineProof?.pending),
    traysDelivered:Number(note?.traysDelivered||0),traysReturned:Number(note?.traysReturned||0),
    trayBalanceAfter:Number(note?.trayBalanceAfter||0)
  })).sort((a,b)=>a.id.localeCompare(b.id)));
  const paymentUiSignature=list=>stableJson((list||[]).map(payment=>({
    id:String(payment?.id||''),restaurantId:String(payment?.restaurantId||''),deliveryNoteId:String(payment?.deliveryNoteId||''),
    amount:Number(payment?.amount||0),status:String(payment?.status||''),confirmed:Boolean(payment?.confirmed),disputeStatus:String(payment?.disputeStatus||'none'),
    receivedAt:String(payment?.receivedAt||''),method:String(payment?.method||'')
  })).sort((a,b)=>a.id.localeCompare(b.id)));
  // Panora 7.11: Supabase timestamps are UTC, while Panora's economic dates are bakery-local.
  // Around midnight, a payment received at 00:30 local time may still have yesterday's UTC date.
  // Preserve date-only values, but convert real timestamps through the browser's local calendar.
  const localDate=value=>{
    const raw=String(value||'');if(!raw)return '';
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
    const parsed=new Date(raw);if(Number.isNaN(parsed.getTime()))return raw.slice(0,10);
    const pad=n=>String(n).padStart(2,'0');
    return `${parsed.getFullYear()}-${pad(parsed.getMonth()+1)}-${pad(parsed.getDate())}`;
  };
  function noteTaxPartsFromGross(grossValue,taxRateValue){
    const gross=Math.max(0,Number(grossValue||0)),taxRate=Math.max(0,Number(taxRateValue||0));
    const subtotal=taxRate>0?gross/(1+taxRate/100):gross;
    return{gross,subtotal,taxRate,tax:Math.max(0,gross-subtotal)};
  }
  const rowNote=row=>{
    const order=orders.find(item=>item.id===row.order_id),paid=payments.filter(p=>p.deliveryNoteId===row.id&&paymentFinanciallyConfirmed(p)).reduce((sum,p)=>sum+Number(p.amount||0),0),parts=noteTaxPartsFromGross(row.total,order?.taxRate);
    return{id:row.id,number:Number(row.note_number),orderId:row.order_id,restaurantId:row.restaurant_id,date:localDate(row.delivered_at),paymentDueDate:row.payment_due_date||'',items:structuredClone(order?.items||[]),prices:structuredClone(order?.prices||{}),bakery:structuredClone(typeof bakerySettings!=='undefined'?bakerySettings:{}),subtotal:parts.subtotal,taxRate:parts.taxRate,tax:parts.tax,total:parts.gross,paid,balanceAfter:0,traysDelivered:Number(row.trays_delivered||0),traysReturned:Number(row.trays_returned||0),trayBalanceAfter:Number(row.tray_balance_after||0),customerTraysReceived:row.customer_trays_received==null?null:Number(row.customer_trays_received),customerTraysReturned:row.customer_trays_returned==null?null:Number(row.customer_trays_returned),qrToken:row.qr_token,customerConfirmedAt:row.customer_confirmed_at||null,customerReceiver:row.customer_receiver||'',offlineProof:row.offline_received_at?{receivedAt:row.offline_received_at,receiver:row.offline_receiver||'',signature:row.offline_signature||'',pending:false}:null};
  };
  const recoveredNote=order=>{const items=structuredClone(order.items||[]),prices=structuredClone(order.prices||{}),subtotal=items.reduce((sum,item)=>sum+Number(item.quantity||0)*Number(prices[item.product]||0),0),taxRate=Number(order.taxRate||0),tax=subtotal*taxRate/100;return{id:order.id,number:null,orderId:order.id,restaurantId:order.restaurantId,date:localDate(order.deliveryDate||order.date||new Date().toISOString()),items,prices,bakery:structuredClone(typeof bakerySettings!=='undefined'?bakerySettings:{}),subtotal,taxRate,tax,total:subtotal+tax,paid:0,balanceAfter:0,recovered:true}};
  const deliveryNoteRow=(note,{includeId=true}={})=>{note.qrToken ||= crypto.randomUUID();const row={order_id:note.orderId,restaurant_id:note.restaurantId,delivered_at:`${localDate(note.date)}T12:00:00Z`,payment_due_date:note.paymentDueDate||null,total:Number(note.total||0),trays_delivered:Number(note.traysDelivered||0),trays_returned:Number(note.traysReturned||0),tray_balance_after:Number(note.trayBalanceAfter||0),customer_trays_received:note.customerTraysReceived==null?null:Number(note.customerTraysReceived),customer_trays_returned:note.customerTraysReturned==null?null:Number(note.customerTraysReturned),qr_token:note.qrToken,customer_confirmed_at:note.customerConfirmedAt||null,customer_receiver:note.customerReceiver||null,offline_received_at:note.offlineProof?.receivedAt||null,offline_receiver:note.offlineProof?.receiver||null,offline_signature:note.offlineProof?.signature||null};if(includeId&&note.id)row.id=note.id;if(Number(note.number)>0)row.note_number=Number(note.number);return row};
  async function repairMissingDeliveryNotes(){
    if(repairingFinance)return repairingFinance;
    repairingFinance=(async()=>{
      const remoteRows=await request('delivery_notes?select=id,note_number,order_id,restaurant_id,delivered_at,payment_due_date,total,trays_delivered,trays_returned,tray_balance_after,customer_trays_received,customer_trays_returned,qr_token,customer_confirmed_at,customer_receiver,offline_received_at,offline_receiver,offline_signature');
      const remoteOrders=new Set((remoteRows||[]).map(row=>row.order_id));
      const missing=(orders||[]).filter(order=>order.status==='shipped'&&order.restaurantId&&!remoteOrders.has(order.id));
      for(const order of missing){
        const local=deliveryNotes.find(note=>note.orderId===order.id)||recoveredNote(order);
        const rows=await request('delivery_notes?on_conflict=order_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(deliveryNoteRow(local,{includeId:false}))});
        const saved=rows?.[0];if(!saved)throw new Error(`Не удалось восстановить накладную заказа PN-${String(order.number||'—').padStart(4,'0')}`);
        const restored=rowNote(saved),index=deliveryNotes.findIndex(note=>note.orderId===order.id);
        if(index>=0)deliveryNotes[index]=restored;else deliveryNotes.push(restored);
      }
      for(const row of remoteRows||[]){if(!deliveryNotes.some(note=>note.orderId===row.order_id))deliveryNotes.push(rowNote(row))}
      const changed=noteUiSignature(deliveryNotes)!==noteUiSignature(JSON.parse(localStorage.getItem('panora-delivery-notes')||'[]'));
      recalculateBalances();cacheDeliveryNotesLocal();
      if(missing.length||changed)queueAdminCommerceRender();
      return missing.length;
    })().finally(()=>repairingFinance=null);
    return repairingFinance;
  }
  async function loadDeliveryNotes(){
    const beforeSignature=noteUiSignature(typeof deliveryNotes!=='undefined'?deliveryNotes:[]);
    const rows=await request('delivery_notes?select=id,note_number,order_id,restaurant_id,delivered_at,payment_due_date,total,trays_delivered,trays_returned,tray_balance_after,customer_trays_received,customer_trays_returned,qr_token,customer_confirmed_at,customer_receiver,offline_received_at,offline_receiver,offline_signature&order=note_number.asc');
    const local=JSON.parse(localStorage.getItem('panora-delivery-notes')||'[]');
    const remote=(rows||[]).map(rowNote);
    // Panora 9.88 CLEAN BASE: an arbitrary old local cache is never treated as
    // an unsent delivery note. Offline confirmations use their dedicated queue.
    deliveryNotes=remote;
    financeLoaded=true;cacheDeliveryNotesLocal();
    ready=true;await repairMissingDeliveryNotes();
    const changed=beforeSignature!==noteUiSignature(deliveryNotes);
    if(changed)queueAdminCommerceRender()
  }
  async function saveDeliveryNotesNow(){
    if(!ready||typeof deliveryNotes==='undefined')return;
    const valid=deliveryNotes.filter(note=>orders.some(order=>order.id===note.orderId)&&restaurants.some(r=>r.id===note.restaurantId));
    if(!valid.length)return;
    status('Синхронизация…');
    const payload=valid.map(note=>deliveryNoteRow(note));
    const rows=await request('delivery_notes?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(payload)});
    (rows||[]).forEach(row=>{const note=deliveryNotes.find(item=>item.id===row.id);if(note){note.number=Number(row.note_number);note.qrToken=row.qr_token}});
    cacheDeliveryNotesLocal();status('Облако ✓');
  }
  const rowPayment=row=>({id:row.id,restaurantId:row.restaurant_id,deliveryNoteId:row.delivery_note_id||null,date:localDate(row.received_at),receivedAt:row.received_at||null,amount:Number(row.amount),method:row.method,note:row.note||'',confirmed:row.status==null?true:row.status==='confirmed',confirmedAt:row.confirmed_at||row.received_at||null,status:row.status,disputeStatus:row.dispute_status||'none',disputeReason:row.dispute_reason||'',disputedAt:row.disputed_at||null,disputeDeadline:row.dispute_deadline||null,updatedAt:row.updated_at||null,recordedBy:row.confirmed_by||null});
  const paymentFinanciallyConfirmed=payment=>payment?.confirmed!==false&&(!payment?.status||payment.status==='confirmed')&&payment?.disputeStatus!=='open';
  function cachePayment(row){
    const payment=rowPayment(row);
    const index=payments.findIndex(item=>item.id===payment.id);
    if(index>=0)payments[index]=payment;
    else payments.push(payment);
    cachePaymentsLocal();
    recalculateBalances();
    if(typeof renderCommerce==='function')renderCommerce();
    return payment;
  }
  async function loadPayments(){
    const firstHydration=!window.panoraAdminPaymentsHydrated;
    const beforeSignature=paymentUiSignature(typeof payments!=='undefined'?payments:[]);
    const watermark=!firstHydration?String(localStorage.getItem(adminPaymentsWatermarkKey)||''):'';
    const deltaQuery=watermark?`&updated_at=gt.${encodeURIComponent(watermark)}`:'';
    const rows=await request(`payments?select=id,restaurant_id,delivery_note_id,amount,method,note,status,received_at,confirmed_at,confirmed_by,dispute_status,dispute_reason,disputed_at,dispute_deadline,updated_at${deltaQuery}&order=received_at.asc`);
    const local=JSON.parse(localStorage.getItem('panora-payments')||'[]');
    if(rows?.length){
      const mapped=rows.map(rowPayment);
      if(watermark){
        const merged=new Map((payments||[]).map(payment=>[String(payment.id),payment]));
        mapped.forEach(payment=>merged.set(String(payment.id),payment));
        payments=[...merged.values()].sort((a,b)=>String(a?.receivedAt||a?.date||'').localeCompare(String(b?.receivedAt||b?.date||'')));
      }else payments=mapped;
      const newest=rows.reduce((latest,row)=>String(row?.updated_at||'')>latest?String(row.updated_at):latest,watermark);
      if(newest)localStorage.setItem(adminPaymentsWatermarkKey,newest);
      cachePaymentsLocal();recalculateBalances();
      const changed=beforeSignature!==paymentUiSignature(payments);
      if(changed)queueAdminCommerceRender();
    }else if(firstHydration){
      // Panora 9.88 CLEAN BASE: empty server means no payments. Do not upload
      // stale training/history rows from this browser.
      payments=[];
      cachePaymentsLocal();
      recalculateBalances();
      queueAdminCommerceRender();
    }
    window.panoraAdminPaymentsHydrated=true;
  }
  async function savePaymentsNow(){
    if(!ready||typeof payments==='undefined')return;
    const valid=payments.filter(payment=>restaurants.some(r=>r.id===payment.restaurantId)&&Number(payment.amount)>0);
    if(!valid.length)return;
    status('Синхронизация…');
    const payload=valid.map(payment=>({id:payment.id,restaurant_id:payment.restaurantId,delivery_note_id:payment.deliveryNoteId||null,amount:Number(payment.amount),method:payment.method||'Не указан',note:payment.note||null,status:payment.status==='cancelled'?'cancelled':'confirmed',received_at:payment.receivedAt||`${localDate(payment.date)}T12:00:00Z`,confirmed_at:payment.confirmedAt||new Date().toISOString(),confirmed_by:session.user?.id||null,dispute_status:payment.disputeStatus||'none',dispute_reason:payment.disputeReason||null,disputed_at:payment.disputedAt||null,dispute_deadline:payment.disputeDeadline||null}));
    await request('payments?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(payload)});status('Облако ✓');
  }
  const paymentRpcMissing=error=>/panora_(?:record|confirm)_payment|PGRST202|does not exist|Could not find the function|schema cache/i.test(String(error?.message||error||''));
  async function confirmPaymentDirect(paymentId){
    const now=new Date().toISOString();
    const rows=await request(`payments?id=eq.${encodeURIComponent(paymentId)}`,{
      method:'PATCH',headers:{Prefer:'return=representation'},
      body:JSON.stringify({status:'confirmed',confirmed_at:now,confirmed_by:session.user?.id||null})
    });
    const row=Array.isArray(rows)?rows[0]:rows;
    if(!row?.id||String(row.status||'')!=='confirmed')throw new Error('Supabase не подтвердил получение оплаты.');
    return row;
  }
  async function confirmPaymentAtomic(paymentId){
    if(!ready)throw new Error('Облако ещё загружается.');
    let row;
    try{
      const rows=await request('rpc/panora_confirm_payment',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_payment_id:paymentId})});
      row=Array.isArray(rows)?rows[0]:rows;
      if(!row?.id)throw new Error('Сервер не подтвердил оплату.');
    }catch(error){
      if(!paymentRpcMissing(error))throw error;
      row=await confirmPaymentDirect(paymentId);
    }
    if(String(row.status||'')!=='confirmed')throw new Error('Оплата сохранена, но не получила статус «Подтверждена».');
    status('Облако ✓');
    return cachePayment(row);
  }
  async function recordPaymentAtomic(input){
    if(!ready)throw new Error('Облако ещё загружается.');
    const amount=Number(input.amount),restaurantId=String(input.restaurantId||'').trim(),receivedAt=input.receivedAt||new Date().toISOString();
    if(!restaurantId)throw new Error('Выберите партнёра.');
    if(!Number.isFinite(amount)||amount<=0)throw new Error('Введите сумму оплаты больше нуля.');
    let row;
    try{
      const rows=await request('rpc/panora_record_payment',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({
        p_restaurant_id:restaurantId,
        p_amount:amount,
        p_method:input.method||'Наличные',
        p_note:input.note||null,
        p_delivery_note_id:input.deliveryNoteId||null,
        p_received_at:receivedAt
      })});
      row=Array.isArray(rows)?rows[0]:rows;
      if(!row?.id)throw new Error('Сервер не вернул сохранённую оплату.');
    }catch(error){
      if(!paymentRpcMissing(error))throw error;
      const now=new Date().toISOString();
      const rows=await request('payments',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({
        restaurant_id:restaurantId,
        delivery_note_id:input.deliveryNoteId||null,
        amount,
        method:input.method||'Наличные',
        note:input.note||null,
        status:'confirmed',
        received_at:receivedAt,
        confirmed_at:now,
        confirmed_by:session.user?.id||null
      })});
      row=Array.isArray(rows)?rows[0]:rows;
      if(!row?.id||String(row.status||'')!=='confirmed')throw new Error('Supabase не сохранил подтверждённую оплату.');
      status('Облако ✓');
      return cachePayment(row);
    }
    // Bakery-entered money is already physically received. Do not leave it in
    // the partner-reported «pending» state: confirm it before reporting success.
    if(String(row.status||'')!=='confirmed')return confirmPaymentAtomic(row.id);
    status('Облако ✓');
    return cachePayment(row);
  }
  async function cancelPaymentAtomic(paymentId){
    // Panora 7.16: bakery can reverse an erroneously recorded confirmed payment
    // without forcing the partner to open a dispute first. The existing verified
    // dispute resolver already performs the exact server-side cancellation patch.
    return resolvePaymentDisputeAtomic(paymentId,'cancel');
  }
  async function resolvePaymentDisputeAtomic(paymentId,decision){
    if(!ready)throw new Error('Облако ещё загружается.');
    const mode=decision==='cancel'?'cancel':'keep';
    const patch=mode==='cancel'
      ? {status:'cancelled',dispute_status:'none',dispute_reason:null,disputed_at:null,dispute_deadline:null,updated_at:new Date().toISOString()}
      : {status:'confirmed',dispute_status:'none',dispute_reason:null,disputed_at:null,dispute_deadline:null,updated_at:new Date().toISOString()};
    const rows=await request(`payments?id=eq.${encodeURIComponent(paymentId)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(patch)});
    const row=Array.isArray(rows)?rows[0]:rows;
    if(!row?.id)throw new Error(mode==='cancel'?'Сервер не подтвердил отмену оплаты.':'Сервер не подтвердил снятие спора.');
    const expectedStatus=mode==='cancel'?'cancelled':'confirmed';
    if(String(row.status||'')!==expectedStatus||String(row.dispute_status||'none')==='open')throw new Error('Сервер вернул неподтверждённое состояние оплаты.');
    status('Облако ✓');
    return cachePayment(row);
  }
function b2bReturnNoteIdFromMovement(movement){
  const match=String(movement?.note||'').match(/\[panora:b2b-return:([^\]]+)\]/);return match?String(match[1]):'';
}
const b2bReturnCreditPaymentMarker=movementId=>`[panora:b2b-return-credit:${String(movementId||'')}]`;
const isB2BReturnCreditPayment=payment=>/\[panora:b2b-return-credit:[^\]]+\]/.test(String(payment?.note||''));
function localFinishedStockMovements(){
  try{const rows=JSON.parse(localStorage.getItem('panora-stock-movements')||'[]');return Array.isArray(rows)?rows:[]}catch{return[]}
}
function b2bReturnCreditForNote(note,sourceMovements=localFinishedStockMovements(),asOf=''){
  if(!note?.id)return{gross:0,net:0,tax:0,rows:[]};
  const returnCutoff=String(asOf||'').slice(0,10);
  const items=Array.isArray(note.items)?note.items:[],prices=note.prices||{},remaining=new Map();
  items.forEach(item=>{const product=String(item?.product||''),qty=Math.max(0,Number(item?.quantity||0));if(product&&qty)remaining.set(product,(remaining.get(product)||0)+qty)});
  const subtotalBasis=Math.max(0,Number(note.subtotal||0))||items.reduce((sum,item)=>sum+Math.max(0,Number(item?.quantity||0))*Math.max(0,Number(prices[item?.product]||0)),0);
  const grossBasis=Math.max(0,Number(note.total||0)),taxRate=Math.max(0,Number(note.taxRate||0));
  let gross=0,net=0,tax=0;const rows=[];
  (Array.isArray(sourceMovements)?sourceMovements:[]).filter(m=>String(m?.type||'')==='returned'&&b2bReturnNoteIdFromMovement(m)===String(note.id)&&(!returnCutoff||localDate(m?.date||m?.createdAt)<=returnCutoff)).slice().sort((a,b)=>String(a?.date||'').localeCompare(String(b?.date||''))||String(a?.createdAt||'').localeCompare(String(b?.createdAt||''))||String(a?.id||'').localeCompare(String(b?.id||''))).forEach(movement=>{
    const product=String(movement?.product||''),left=Math.max(0,Number(remaining.get(product)||0)),requested=Math.max(0,Math.abs(Number(movement?.quantity||0))),qty=Math.min(left,requested);if(!product||qty<=0)return;
    remaining.set(product,Math.max(0,left-qty));
    const rowNet=qty*Math.max(0,Number(prices[product]||0));
    const rowGross=subtotalBasis>0&&grossBasis>0?grossBasis*(rowNet/subtotalBasis):rowNet*(1+taxRate/100);
    const cappedGross=Math.min(Math.max(0,grossBasis-gross),Math.max(0,rowGross)),rowTax=Math.max(0,cappedGross-rowNet);
    gross+=cappedGross;net+=rowNet;tax+=rowTax;rows.push({movement,product,quantity:qty,net:rowNet,gross:cappedGross,tax:rowTax});
  });
  return{gross:Math.min(grossBasis,gross),net:Math.min(subtotalBasis||net,net),tax,rows};
}
function b2bEffectiveNoteTotal(note,asOf=''){return Math.max(0,Number(note?.total||0)-Number(b2bReturnCreditForNote(note,localFinishedStockMovements(),asOf).gross||0))}
async function ensureB2BReturnCreditPayments(){
  if(!ready||typeof deliveryNotes==='undefined'||typeof payments==='undefined')return 0;
  const remoteRows=await request('finished_stock_movements?movement_type=eq.returned&select=id,movement_date,product_id,movement_type,quantity,note,created_at,updated_at&order=movement_date.asc,created_at.asc');
  const remoteMovements=(Array.isArray(remoteRows)?remoteRows:[]).map(row=>({id:String(row.id||''),date:String(row.movement_date||''),product:String(row.product_id||''),type:String(row.movement_type||''),quantity:Math.abs(Number(row.quantity||0)),note:row.note||'',createdAt:row.created_at||row.updated_at||''})).filter(m=>m.id&&m.product&&m.type==='returned'&&b2bReturnNoteIdFromMovement(m));
  if(!remoteMovements.length)return 0;
  const paymentById=new Map((Array.isArray(payments)?payments:[]).map(payment=>[String(payment?.id||''),payment]));
  const payload=[];
  for(const note of deliveryNotes){
    const rows=b2bReturnCreditForNote(note,remoteMovements).rows;
    for(const row of rows){
      const movementId=String(row.movement?.id||'');if(!movementId||Number(row.gross||0)<=0)continue;
      const existing=paymentById.get(movementId);
      if(existing&&isB2BReturnCreditPayment(existing)&&String(existing.deliveryNoteId||'')===String(note.id)&&Math.abs(Number(existing.amount||0)-Number(row.gross||0))<=0.01)continue;
      payload.push({id:movementId,restaurant_id:note.restaurantId,delivery_note_id:note.id,amount:Number(row.gross||0),method:'Возврат товара',note:`${b2bReturnCreditPaymentMarker(movementId)} Возврат товара по DN-${String(note.number||'').padStart(4,'0')}`,status:'confirmed',received_at:row.movement?.createdAt||`${String(row.movement?.date||note.date||localDate(new Date().toISOString()))}T12:00:00Z`,confirmed_at:row.movement?.createdAt||new Date().toISOString(),confirmed_by:session.user?.id||null,dispute_status:'none'});
    }
  }
  if(!payload.length)return 0;
  const saved=await request('payments?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(payload)});
  if(!Array.isArray(saved)||saved.length<payload.length)throw new Error('Supabase не подтвердил кредит B2B-возврата.');
  saved.forEach(cachePayment);
  return saved.length;
}
window.panoraB2BReturnCredit=b2bReturnCreditForNote;
window.panoraB2BEffectiveNoteTotal=b2bEffectiveNoteTotal;
window.panoraIsB2BReturnCreditPayment=isB2BReturnCreditPayment;
function financeAllocation(restaurantId){
  if(typeof deliveryNotes==='undefined'||typeof payments==='undefined'){
    return{notes:[],debt:0,credit:0,net:0,totalShipped:0,totalPaid:0};
  }
  const notes=deliveryNotes
    .filter(note=>note.restaurantId===restaurantId)
    .slice()
    .sort((a,b)=>
      String(a.date||'').localeCompare(String(b.date||''))||
      Number(a.number||0)-Number(b.number||0)||
      String(a.id||'').localeCompare(String(b.id||''))
    );
  const confirmed=payments
    .filter(payment=>
      payment.restaurantId===restaurantId&&
      paymentFinanciallyConfirmed(payment)&&
      !isB2BReturnCreditPayment(payment)&&
      Number(payment.amount||0)>0
    )
    .slice()
    .sort((a,b)=>
      String(a.receivedAt||a.date||'').localeCompare(String(b.receivedAt||b.date||''))||
      String(a.id||'').localeCompare(String(b.id||''))
    );
  const noteById=new Map(notes.map(note=>[String(note.id),note]));
  const paidByNote=new Map(notes.map(note=>[String(note.id),0]));
  let fifoPool=0;

  confirmed.forEach(payment=>{
    const amount=Math.max(0,Number(payment.amount||0));
    const linked=payment.deliveryNoteId?noteById.get(String(payment.deliveryNoteId)):null;
    if(!linked){fifoPool+=amount;return;}
    const id=String(linked.id),already=Number(paidByNote.get(id)||0),total=b2bEffectiveNoteTotal(linked);
    const applied=Math.min(Math.max(0,total-already),amount);
    paidByNote.set(id,already+applied);
    fifoPool+=Math.max(0,amount-applied);
  });

  notes.forEach(note=>{
    if(fifoPool<=0)return;
    const id=String(note.id),already=Number(paidByNote.get(id)||0),total=b2bEffectiveNoteTotal(note);
    const due=Math.max(0,total-already),applied=Math.min(due,fifoPool);
    if(applied>0){
      paidByNote.set(id,already+applied);
      fifoPool-=applied;
    }
  });

  const rows=notes.map(note=>{
    const total=b2bEffectiveNoteTotal(note);
    const paid=Math.min(total,Math.max(0,Number(paidByNote.get(String(note.id))||0)));
    const due=Math.max(0,total-paid);
    note.paid=paid;
    note.financeDue=due;
    return{note,total,paid,due,closed:due<=0.005};
  });
  const debt=rows.reduce((sum,row)=>sum+row.due,0);
  const credit=Math.max(0,fifoPool);
  const totalShipped=rows.reduce((sum,row)=>sum+row.total,0);
  const totalPaid=confirmed.reduce((sum,payment)=>sum+Number(payment.amount||0),0);
  return{notes:rows,debt,credit,net:debt-credit,totalShipped,totalPaid};
}

function financeTimeline(restaurantId){
  if(typeof deliveryNotes==='undefined'||typeof payments==='undefined')return[];
  const notes=deliveryNotes.filter(note=>note.restaurantId===restaurantId);
  const noteById=new Map(notes.map(note=>[note.id,note]));
  const returnCreditById=new Map(payments.filter(payment=>payment.restaurantId===restaurantId&&isB2BReturnCreditPayment(payment)).map(payment=>[String(payment.id||''),payment]));
  const returnEvents=notes.flatMap(note=>b2bReturnCreditForNote(note).rows.map((row,index)=>({
    id:`return:${row.movement?.id||note.id+':'+index}`,date:String(row.movement?.date||note.date||''),occurredAt:String(row.movement?.createdAt||`${row.movement?.date||note.date||''}T12:00:00`),kind:'return',sequence:Number(note.number||0)*2+0.5,note,movement:row.movement,product:row.product,quantity:row.quantity,amount:Number(row.gross||0),payment:returnCreditById.get(String(row.movement?.id||''))||null
  })));
  const paymentEvents=payments.filter(payment=>payment.restaurantId===restaurantId&&!isB2BReturnCreditPayment(payment)).flatMap(payment=>{
    const linkedNote=noteById.get(payment.deliveryNoteId);
    const paidAtShipment=linkedNote&&String(linkedNote.date||'')===String(payment.date||'');
    const amount=Number(payment.amount||0);
    const originallyConfirmed=Boolean(payment.confirmedAt)||['confirmed','cancelled'].includes(String(payment.status||''))||String(payment.disputeStatus||'')==='open';
    const received={
      id:`payment:${payment.id}`,
      date:String(payment.date||localDate(payment.receivedAt)||''),
      occurredAt:String(payment.receivedAt||`${payment.date||''}T12:00:00`),
      kind:'payment',
      sequence:paidAtShipment?Number(linkedNote.number||0)*2+1:1000000,
      payment,
      amount,
      linkedNote:linkedNote||null,
      financialEffect:originallyConfirmed?-amount:0,
      timelineState:originallyConfirmed?'received':'pending'
    };
    const reversalType=String(payment.status||'')==='cancelled'?'cancel':String(payment.disputeStatus||'')==='open'?'dispute':'';
    if(!reversalType||!originallyConfirmed)return[received];
    const stateAt=reversalType==='dispute'?(payment.disputedAt||payment.updatedAt||payment.receivedAt):(payment.updatedAt||payment.disputedAt||payment.receivedAt);
    return[received,{
      id:`payment-reversal:${payment.id}:${reversalType}`,
      date:String(localDate(stateAt)||payment.date||''),
      occurredAt:String(stateAt||`${payment.date||''}T23:59:59`),
      kind:'payment_reversal',
      sequence:1000001,
      payment,
      amount,
      linkedNote:linkedNote||null,
      financialEffect:amount,
      reversalType
    }];
  });
  const events=[
    ...notes.map(note=>({
      id:`delivery:${note.id}`,
      date:String(note.date||''),
      occurredAt:`${String(note.date||'')}T12:00:00`,
      kind:'delivery',
      sequence:Number(note.number||0)*2,
      note,
      amount:Number(note.total||0)
    })),
    ...returnEvents,
    ...paymentEvents
  ].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||Number(a.sequence||0)-Number(b.sequence||0)||String(a.occurredAt||'').localeCompare(String(b.occurredAt||''))||a.id.localeCompare(b.id));

  // Panora 6.96: history is event-sourced. A confirmed payment remains on its original
  // receipt date; a later dispute/cancellation is a separate reversal on its own date.
  // This keeps the current debt identical while avoiding retroactive rewriting of history.
  let historyRunning=0;
  events.forEach(event=>{
    if(event.kind==='delivery')historyRunning+=event.amount;
    else if(event.kind==='return')historyRunning-=event.amount;
    else historyRunning+=Number(event.financialEffect||0);
    event.balanceAfter=historyRunning;
  });

  // Preserve the existing current-state note fields used by document previews: disputed or
  // cancelled payments do not reduce the current note balance. History balances above remain
  // chronological and are not reused for this mutable current-state projection.
  let currentRunning=0;
  events.forEach(event=>{
    if(event.kind==='delivery'){
      event.note.balanceBefore=currentRunning;
      currentRunning+=event.amount;
      event.note.balanceAfter=Math.max(0,currentRunning);
    }else if(event.kind==='return'){
      currentRunning-=event.amount;
    }else if(event.kind==='payment'&&paymentFinanciallyConfirmed(event.payment)){
      currentRunning-=event.amount;
      if(event.linkedNote&&event.date===String(event.linkedNote.date||''))event.linkedNote.balanceAfter=Math.max(0,currentRunning);
    }
  });

  financeAllocation(restaurantId);
  return events;
}
function recalculateBalances(){
  if(typeof deliveryNotes==='undefined'||typeof payments==='undefined')return;
  new Set([
    ...deliveryNotes.map(note=>note.restaurantId),
    ...payments.map(payment=>payment.restaurantId)
  ].filter(Boolean)).forEach(financeTimeline);
  cacheDeliveryNotesLocal();
}
window.panoraFinanceAllocation=financeAllocation;
window.panoraFinanceTimeline=financeTimeline;
window.panoraRecalculateBalances=recalculateBalances;
  const cutoffIso=value=>{const raw=String(value||'').trim();if(!raw)return null;const parsed=new Date(raw);return Number.isFinite(parsed.getTime())?parsed.toISOString():null};
  const remotePlan=p=>({id:`${p.id}:${p.product_id}`,bakeDate:p.bake_date,deliveryDate:p.delivery_date,product:p.product_id,planned:Number(p.planned_quantity),ordered:0,cutoff:p.cutoff_at,open:p.accepting_orders});
  async function getRemotePlans(){
    const days=await request('bake_days?select=id,bake_date,delivery_date,cutoff_at,accepting_orders,updated_at,bake_items(product_id,planned_quantity)&order=bake_date.asc');
    rememberRevision('plans',days);
    return (days||[]).flatMap(day=>(day.bake_items||[]).map(item=>remotePlan({...day,...item})));
  }
  const planComparable=p=>({bakeDate:String(p?.bakeDate||''),deliveryDate:String(p?.deliveryDate||''),product:String(p?.product||''),planned:Number(p?.planned||0),cutoff:String(p?.cutoff||''),open:p?.open!==false});
  const planSignature=list=>JSON.stringify((list||[]).map(planComparable).sort((a,b)=>`${a.bakeDate}|${a.product}`.localeCompare(`${b.bakeDate}|${b.product}`)));
  const savePlanBaseline=list=>{baselines.plans=planSignature(list||[]);safeLocalSet(baselineKey,JSON.stringify(baselines))};
  async function applyCloudPlans(remote){
    applyingCloud++;
    try{
      plans=Array.isArray(remote)?remote:[];
      safeLocalSet('panora-production-plans',JSON.stringify(plans));
      savePlanBaseline(plans);
      clearPending('plans');delete conflicts.plans;delete accepted.plans;saveConflicts();saveAccepted();
      if(typeof renderAll==='function')renderAll();
    }finally{applyingCloud--}
  }
  async function loadPlans(){
    // v325.6: plan conflicts are determined by CONTENT, not timestamps.
    // Merely starting a second device can never become a local edit.
    const remote=await getRemotePlans();
    const local=JSON.parse(localStorage.getItem('panora-production-plans')||'[]');
    const remoteSig=planSignature(remote),localSig=planSignature(local),baseSig=String(baselines.plans||'');

    if(remoteSig===localSig){
      plans=remote.length?remote:local;
      safeLocalSet('panora-production-plans',JSON.stringify(plans));
      savePlanBaseline(plans);
      clearPending('plans');delete conflicts.plans;delete accepted.plans;saveConflicts();saveAccepted();
      return;
    }

    // First clean start on this device: Supabase is authoritative.
    if(!baseSig){
      await applyCloudPlans(remote);
      return;
    }

    const localChanged=Boolean(pending.plans)&&localSig!==baseSig;
    const remoteChanged=remoteSig!==baseSig;

    if(!localChanged){
      await applyCloudPlans(remote);
      return;
    }

    if(localChanged&&!remoteChanged){
      plans=local;
      await savePlansNow();
      return;
    }

    if(localChanged&&remoteChanged){
      conflicts.plans={remoteAt:new Date().toISOString(),localAt:new Date().toISOString()};
      saveConflicts();showConflicts();
      return;
    }

    await applyCloudPlans(remote);
  }
  async function refreshPlansIfChanged(){
    if(!ready||pending.plans||conflicts.plans)return false;
    const remote=await getRemotePlans();
    const local=JSON.parse(localStorage.getItem('panora-production-plans')||'[]');
    const remoteSig=planSignature(remote),localSig=planSignature(local);
    if(remoteSig===localSig)return false;
    await applyCloudPlans(remote);
    window.dispatchEvent(new CustomEvent('panora:plans-updated',{detail:{count:remote.length,source:'cloud-remote',signature:remoteSig}}));
    return true;
  }

  const bakeCancellationLog=()=>{try{return JSON.parse(localStorage.getItem('panora-cancelled-bake-dates')||'[]')}catch{return[]}};
  const bakeCancellationReason=date=>{const matches=bakeCancellationLog().filter(row=>String(row?.date||'')===String(date));return String(matches.at(-1)?.reason||'День выпечки отменён пекарней').trim()||'День выпечки отменён пекарней'};
  async function retireBakeDayRemote(day,reason=bakeCancellationReason(day?.bake_date)){
    const id=String(day?.id||'');const date=String(day?.bake_date||'');if(!id)return{date,ordersCancelled:0};
    const closed=await request(`bake_days?id=eq.${encodeURIComponent(id)}`,{
      method:'PATCH',
      headers:{Prefer:'return=representation'},
      body:JSON.stringify({accepting_orders:false})
    });
    if(closed?.[0]&&closed[0].accepting_orders!==undefined&&closed[0].accepting_orders!==false)throw new Error(`Не удалось закрыть приём заказов на ${date}`);
    const closedCheck=await request(`bake_days?id=eq.${encodeURIComponent(id)}&select=id,accepting_orders&limit=1`);
    if(!closedCheck?.[0]||closedCheck[0].accepting_orders!==false)throw new Error(`Supabase не подтвердил закрытие приёма заказов на ${date}`);
    const remoteOrders=await request(`orders?bake_day_id=eq.${encodeURIComponent(id)}&select=id,status`);
    const cancellable=(remoteOrders||[]).filter(order=>!['cancelled','canceled','shipped'].includes(String(order?.status||'').toLowerCase()));
    for(const order of cancellable){
      await request('rpc/panora_admin_set_order_status',{
        method:'POST',
        headers:{Prefer:'return=representation'},
        body:JSON.stringify({p_order_id:order.id,p_status:'cancelled',p_reason:String(reason||'День выпечки отменён пекарней')})
      });
    }
    const verifiedOrders=await request(`orders?bake_day_id=eq.${encodeURIComponent(id)}&select=id,status`);
    const stillActive=(verifiedOrders||[]).filter(order=>!['cancelled','canceled','shipped'].includes(String(order?.status||'').toLowerCase()));
    if(stillActive.length)throw new Error(`Не удалось отменить ${stillActive.length} заказ(а) на ${date}`);
    await request(`bake_items?bake_day_id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});
    const remaining=await request(`bake_items?bake_day_id=eq.${encodeURIComponent(id)}&select=product_id`);
    if(remaining?.length)throw new Error(`Не удалось удалить план выпечки на ${date}`);
    return{date,ordersCancelled:cancellable.length};
  }
  async function cancelBakeDayAtomic({date,reason}={}){
    if(!ready)throw new Error('Облако ещё загружается');
    if(!navigator.onLine)throw new Error('Нет соединения с облаком');
    const target=String(date||'');if(!target)throw new Error('Не указана дата выпечки');
    status('Отменяем день выпечки…');
    const rows=await request(`bake_days?bake_date=eq.${encodeURIComponent(target)}&select=id,bake_date,accepting_orders,bake_items(product_id)&limit=1`);
    const day=rows?.[0];
    if(!day){status('Облако ✓');return{date:target,ordersCancelled:0,alreadyMissing:true}}
    const result=await retireBakeDayRemote(day,String(reason||bakeCancellationReason(target)));
    await loadOrders();status('Облако ✓');
    window.dispatchEvent(new CustomEvent('panora:bake-day-cancelled',{detail:result}));
    return result;
  }
  async function savePlansNow(){
    if(!ready||typeof plans==='undefined')return;
    status('Сохраняем…');

    // Content-based optimistic concurrency for production plans.
    // This prevents a stale timestamp/pending flag on another device from
    // creating a false conflict, while still protecting genuine concurrent edits.
    const remoteBefore=await getRemotePlans();
    const localSig=planSignature(plans),remoteSig=planSignature(remoteBefore),baseSig=String(baselines.plans||'');
    const localChanged=!baseSig||localSig!==baseSig;
    const remoteChanged=Boolean(baseSig)&&remoteSig!==baseSig;
    if(localChanged&&remoteChanged&&localSig!==remoteSig&&!forceSections.has('plans')){
      conflicts.plans={remoteAt:new Date().toISOString(),localAt:new Date().toISOString()};
      saveConflicts();showConflicts();
      const error=new Error('План производства одновременно изменён на другом устройстве');
      error.panoraConflict=true;
      throw error;
    }

    const byDate=new Map();
    plans.forEach(p=>{if(!byDate.has(p.bakeDate))byDate.set(p.bakeDate,[]);byDate.get(p.bakeDate).push(p)});
    const existing=await request('bake_days?select=id,bake_date,accepting_orders,bake_items(product_id)');
    let retiredAny=false;
    for(const day of existing||[]){
      if(byDate.has(day.bake_date))continue;
      const hasItems=Array.isArray(day.bake_items)&&day.bake_items.length>0;
      if(day.accepting_orders===false&&!hasItems)continue;
      await retireBakeDayRemote(day);retiredAny=true;
    }
    for(const [date,items] of byDate){
      const first=items[0],cutoff=cutoffIso(first.cutoff);if(!cutoff)throw new Error(`Некорректный срок приёма заказов для ${date}`);const payload={bake_date:date,delivery_date:first.deliveryDate||date,cutoff_at:cutoff,accepting_orders:first.open!==false};
      const rows=await request('bake_days?on_conflict=bake_date',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(payload)});
      const day=rows?.[0];if(!day)continue;
      await request(`bake_items?bake_day_id=eq.${encodeURIComponent(day.id)}`,{method:'DELETE'});
      await request('bake_items?on_conflict=bake_day_id,product_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(items.map(p=>({bake_day_id:day.id,product_id:p.product,planned_quantity:Number(p.planned||0)})))});
    }
    revisions.plans=new Date().toISOString();localStorage.setItem(revisionKey,JSON.stringify(revisions));forceSections.delete('plans');delete conflicts.plans;saveConflicts();
    clearPending('plans');savePlanBaseline(plans);
    if(retiredAny)await loadOrders();
    status('Сохранено');
    window.dispatchEvent(new CustomEvent('panora:plan-saved',{detail:{at:new Date().toISOString()}}));
  }
  const fail=(section,error)=>{console.error(`Panora cloud sync · ${section}`,error);if(error?.panoraConflict){showConflicts();return}audit('sync.failed',`${section}: ${error?.message||error}`,'error');status(`Ошибка: ${section}`,true,error?.message||String(error))};
  function queuePlans(){if(applyingCloud)return;const current=typeof plans!=='undefined'?plans:JSON.parse(localStorage.getItem('panora-production-plans')||'[]');const signature=planSignature(current);if(signature===String(baselines.plans||'')){clearPending('plans');delete conflicts.plans;saveConflicts();return}markPending('plans');clearTimeout(planTimer);planTimer=setTimeout(()=>savePlansNow().catch(error=>{showPending();fail('план',error)}),350)}
  function queueProducts(){if(applyingCloud)return;const signature=productSignature(localProducts());if(signature===String(baselines.products||'')){productDirty=false;clearPending('products');return}productDirty=true;markPending('products');clearTimeout(productTimer);productTimer=setTimeout(()=>flushProducts().catch(error=>fail('товары',error)),350)}
  function queueRecipes(){recipeDirty=true;recipeRevision++;markPending('recipes');clearTimeout(recipeTimer);recipeTimer=setTimeout(()=>flushRecipes().catch(error=>fail('рецептуры',error)),400)}
  function queueRestaurants(){
    markPending('restaurants');
    clearTimeout(restaurantTimer);
    restaurantTimer=setTimeout(()=>{
      restaurantTimer=0;
      saveRestaurantsNow().catch(error=>fail('партнёры',error));
    },350);
  }
  async function flushRestaurants(){clearTimeout(restaurantTimer);restaurantTimer=0;await saveRestaurantsNow();return true}
  async function setRestaurantActiveConfirmed(restaurantId,active){
    if(!ready)throw new Error('Облако ещё загружается');
    if(!session?.access_token)throw new Error('Сессия пекарни истекла. Войдите повторно.');
    const id=String(restaurantId||'');
    if(!id)throw new Error('Не удалось определить партнёра');
    const nextActive=Boolean(active),changedAt=new Date().toISOString();
    status(nextActive?'Восстанавливаем партнёра…':'Архивируем партнёра…');
    const rows=await request(`restaurants?id=eq.${encodeURIComponent(id)}`,{
      method:'PATCH',
      headers:{Prefer:'return=representation'},
      body:JSON.stringify({active:nextActive,updated_at:changedAt})
    });
    const saved=rows?.[0];
    if(!saved||Boolean(saved.active)!==nextActive)throw new Error('Supabase не подтвердил статус партнёра');
    const verified=await request(`restaurants?id=eq.${encodeURIComponent(id)}&select=id,active,updated_at&limit=1`);
    if(!verified?.[0]||Boolean(verified[0].active)!==nextActive)throw new Error('Повторная проверка Supabase не подтвердила статус партнёра');
    const local=JSON.parse(localStorage.getItem('panora-restaurants')||'[]');
    const nextLocal=(local||[]).map(r=>{
      if(String(r.id)!==id)return r;
      if(nextActive){const restored={...r};delete restored.deletedAt;return restored}
      return {...r,deletedAt:verified[0].updated_at||changedAt};
    });
    restaurants=nextLocal;
    safeLocalSet('panora-restaurants',JSON.stringify(nextLocal),{quotaIsWarning:false});
    writeRestaurantBaseline(nextLocal);clearPending('restaurants');
    window.dispatchEvent(new CustomEvent('panora:restaurants-ui-refresh',{detail:{source:nextActive?'partner-restored':'partner-archived',restaurantId:id,active:nextActive}}));
    if(typeof renderCommerce==='function')renderCommerce();
    status('Облако ✓');
    return {id,active:nextActive,updatedAt:verified[0].updated_at||changedAt};
  }

  async function saveRestaurantPriceConfirmed(restaurantId,productId,price){
    if(!ready)throw new Error('Облако ещё загружается');
    const row={restaurant_id:restaurantId,product_id:productId,price:Number(price)};
    await request('restaurant_prices?on_conflict=restaurant_id,product_id',{
      method:'POST',
      headers:{Prefer:'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify(row)
    });
    const verified=await request(`restaurant_prices?restaurant_id=eq.${encodeURIComponent(restaurantId)}&product_id=eq.${encodeURIComponent(productId)}&select=restaurant_id,product_id,price&limit=1`);
    const saved=verified?.[0];
    if(!saved||Math.abs(Number(saved.price)-Number(price))>0.0001)throw new Error('Supabase не подтвердил новую оптовую цену');
    clearTimeout(restaurantTimer);restaurantTimer=0;
    const local=JSON.parse(localStorage.getItem('panora-restaurants')||'[]');
    const nextLocal=(local||[]).map(r=>{
      if(String(r.id)!==String(restaurantId))return r;
      return {...r,prices:{...(r.prices||{}),[productId]:Number(saved.price)}};
    });
    restaurants=nextLocal;
    localStorage.setItem('panora-restaurants',JSON.stringify(nextLocal));
    writeRestaurantBaseline(nextLocal);
    clearPending('restaurants');
    try{
      const priceMap=JSON.parse(localStorage.getItem(adminRestaurantPricesKey)||'{}');
      if(!priceMap[restaurantId])priceMap[restaurantId]={};
      priceMap[restaurantId][productId]=Number(saved.price);
      localStorage.setItem(adminRestaurantPricesKey,JSON.stringify(priceMap));
    }catch{}
    window.dispatchEvent(new CustomEvent('panora:admin-prices-updated',{detail:{source:'confirmed-price',restaurantId,productId,price:Number(saved.price)}}));
    window.dispatchEvent(new CustomEvent('panora:restaurants-ui-refresh',{detail:{source:'confirmed-price',restaurantId,productId,price:Number(saved.price)}}));
    setTimeout(()=>refreshRestaurantPricesDirect().catch(()=>{}),120);
    return Number(saved.price);
  }
  function queueOrders(){markPending('orders');clearTimeout(orderTimer);orderTimer=setTimeout(()=>saveOrdersNow().then(()=>clearPending('orders')).catch(error=>fail('заказы',error)),500)}
  async function syncFinanceNow(){
    clearTimeout(financeTimer);
    if(savingOrders)await savingOrders;
    else if(typeof orders!=='undefined')await saveOrdersNow();
    await saveDeliveryNotesNow();
    await savePaymentsNow();
    const remote=await request('delivery_notes?select=id,order_id,qr_token');
    const remoteByOrder=new Map((remote||[]).map(row=>[row.order_id,row]));
    for(const note of deliveryNotes||[]){
      const saved=remoteByOrder.get(note.orderId);
      if(!saved)throw new Error(`Накладная по заказу PN-${String(orders.find(order=>order.id===note.orderId)?.number||'—').padStart(4,'0')} не подтверждена облаком`);
      note.qrToken=saved.qr_token||note.qrToken;
    }
    cacheDeliveryNotesLocal();
    recalculateBalances();
    if(typeof renderCommerce==='function')renderCommerce();
    return true;
  }
  function queueFinance(){
    markPending('finance');
    clearTimeout(financeTimer);
    financeTimer=setTimeout(()=>syncFinanceNow().then(()=>clearPending('finance')).catch(error=>fail('накладные и оплаты',error)),120);
  }
  async function loadOperationEvents(){
    try{
      const rows=await request('operation_events?select=id,event_type,entity_type,entity_id,restaurant_id,payload,created_at&order=created_at.desc&limit=200');
      window.panoraAudit?.mergeCloud(rows||[]);
      return rows||[];
    }catch(error){
    if(window.panoraHandleSessionError?.(error)) return;
    const message=String(error?.message||error);
      if(!/operation_events|42P01|PGRST205/i.test(message))console.warn('Panora operation journal',error);
      return [];
    }
  }
  async function loadCloudSection(section,acceptedRemoteAt=''){
    const previous=pending[section];delete pending[section];
    if(section==='products')productDirty=false;
    if(section==='recipes')recipeDirty=false;
    if(acceptedRemoteAt){
      accepted[section]=String(acceptedRemoteAt);revisions[section]=String(acceptedRemoteAt);
      saveAccepted();localStorage.setItem(revisionKey,JSON.stringify(revisions));
      clearPending(section);delete conflicts[section];saveConflicts();
    }
    try{
      // A committed product/tech-card version is authoritative. Clear both the
      // local and server-side editor drafts before rebuilding the recipe cards;
      // otherwise MutationObserver can replay an older draft over fresh cloud
      // values immediately after loadProducts() renders the screen.
      if(section==='products'&&acceptedRemoteAt)await window.panoraFormDrafts?.acceptCommittedWithin?.('#recipeList');
      if(section==='products'){const rows=await request(`products?select=${PRODUCT_SELECT}&order=created_at.asc`);await applyProductRows(rows)}else if(section==='recipes')await loadRecipes();else if(section==='restaurants')await loadRestaurants();else if(section==='plans')await loadPlans();
      if(acceptedRemoteAt&&String(acceptedRemoteAt)>String(revisions[section]||''))revisions[section]=String(acceptedRemoteAt);
      localStorage.setItem(revisionKey,JSON.stringify(revisions));
      forceSections.delete(section);clearPending(section);delete conflicts[section];saveConflicts();
    }
    catch(error){
    if(window.panoraHandleSessionError?.(error)) return;
    if(!acceptedRemoteAt){if(previous)pending[section]=previous;if(section==='products')productDirty=Boolean(previous);if(section==='recipes')recipeDirty=Boolean(previous)}
      throw error
    }
  }
  async function resolveConflicts(){
    const sections=Object.keys(conflicts);if(!sections.length)return retrySync();
    const sectionNames={products:'Товары и технологические карты',recipes:'Рецептуры',restaurants:'Партнёры',plans:'План производства'},names=sections.map(section=>sectionNames[section]||section).join(', '),choice=await chooseConflictVersion(names);
    if(choice==='later'){showConflicts();return false}
    if(choice==='local'){sections.forEach(section=>forceSections.add(section));audit('sync.conflict_local',`Выбрана локальная версия: ${names}`,'warning');return retrySync()}
    try{const backup=saveBackup(sections,'conflict-cloud'),accepted=Object.fromEntries(sections.map(section=>[section,conflicts[section]?.remoteAt||'']));for(const section of sections)await loadCloudSection(section,accepted[section]);audit('sync.conflict_cloud',`Выбрана облачная версия: ${names}`,'warning');status(backup?'Облако загружено · есть резерв':'Облачная версия загружена ✓',false,backup?'Нажмите, чтобы восстановить прежнюю локальную версию':'');const el=document.querySelector('#saveState');if(el&&backup){el.style.cursor='pointer';el.onclick=restoreLatestBackup}return true}catch(error){
    if(window.panoraHandleSessionError?.(error)) return;
    fail('разрешение конфликта',error);return false}
  }
  async function restoreBackup(snapshot){
    if(!snapshot)return false;
    const sections=Object.keys(snapshot.data||{});if(!sections.length)return false;
    const diff=backupDiff(snapshot),hasChanges=diff.some(row=>row.added||row.changed||row.removed);
    if(!hasChanges){alert('Этот снимок полностью совпадает с текущими данными. Восстановление не требуется.');return false}
    const preview=`Сравнение с текущими данными\n\n${backupDiffText(diff)}\n\nПосле подтверждения текущие данные будут сохранены отдельным резервом, а выбранный снимок отправлен в облако. Продолжить?`;
    if(!confirm(preview)){audit('sync.backup_restore_cancelled','Восстановление отменено после сравнения');return false}
    try{
      saveBackup(sections,'before-restore');
      sections.forEach(section=>{const key=sectionKeys[section];if(!key)return;localStorage.setItem(key,snapshot.data[section]);markPending(section);forceSections.add(section)});
      if(snapshot.data.products&&typeof productRegistry!=='undefined')productRegistry=JSON.parse(snapshot.data.products);
      if(snapshot.data.recipes&&typeof recipes!=='undefined'){recipes=JSON.parse(snapshot.data.recipes);recipeDirty=true;recipeRevision++}
      if(snapshot.data.restaurants&&typeof restaurants!=='undefined')restaurants=JSON.parse(snapshot.data.restaurants);
      if(snapshot.data.plans&&typeof plans!=='undefined')plans=JSON.parse(snapshot.data.plans);
      if(snapshot.data.products)productDirty=true;
      audit('sync.backup_restored',`Восстановлен резерв: ${backupDiffText(diff).replaceAll('\n','; ')}`,'warning');
      closeBackupHistory();
      if(typeof syncAdminProductRegistry==='function')syncAdminProductRegistry();if(typeof renderAll==='function')renderAll();
      return retrySync();
    }catch(error){
    if(window.panoraHandleSessionError?.(error)) return;
    fail('восстановление резерва',error);return false}
  }
  async function restoreLatestBackup(){return restoreBackup(readBackups()[0])}
  function closeBackupHistory(){const modal=document.querySelector('#syncBackupModal');if(modal)modal.hidden=true}
  const checksumText=async text=>{
    if(!window.crypto?.subtle)throw new Error('Проверка целостности не поддерживается этим браузером');
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
    return Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
  };
  async function downloadBackup(snapshot){
    if(!snapshot)return;
    const snapshotText=JSON.stringify(snapshot),checksum=await checksumText(snapshotText);
    const payload={type:'panora-sync-backup',version:2,exportedAt:new Date().toISOString(),integrity:{algorithm:'SHA-256',checksum},snapshot};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`panora-reserve-${String(snapshot.at||'').slice(0,10)||'backup'}.json`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    audit('sync.backup_exported','Экспортирован резерв с контрольной суммой SHA-256');
  }
  function validateImportedBackup(value){
    const snapshot=value?.type==='panora-sync-backup'?value.snapshot:value?.snapshot||value;
    if(!snapshot||typeof snapshot!=='object'||!snapshot.data||typeof snapshot.data!=='object')throw new Error('Файл не содержит резерв Panora');
    const data={};
    for(const [section,raw] of Object.entries(snapshot.data)){
      if(!sectionKeys[section]||typeof raw!=='string')continue;
      const parsed=JSON.parse(raw),valid=section==='recipes'?Boolean(parsed&&typeof parsed==='object'&&!Array.isArray(parsed)):Array.isArray(parsed);
      if(!valid)throw new Error(`Неверная структура раздела «${backupSectionNames[section]}»`);
      data[section]=raw;
    }
    if(!Object.keys(data).length)throw new Error('В резерве нет поддерживаемых разделов');
    const at=new Date(snapshot.at);return{id:`${Date.now()}-import-${Math.random().toString(36).slice(2)}`,at:Number.isNaN(at.getTime())?new Date().toISOString():at.toISOString(),reason:'imported',source:'imported',integrity:value?.integrity?'sha256':'legacy',data};
  }
  async function importBackupFile(file){
    if(!file)return;
    try{
      if(file.size>5*1024*1024)throw new Error('Размер файла превышает 5 МБ');
      const value=JSON.parse(await file.text()),source=value?.type==='panora-sync-backup'?value.snapshot:value?.snapshot||value;
      let integrity='Старый формат без контрольной суммы';
      if(value?.integrity){
        if(value.integrity.algorithm!=='SHA-256'||!value.integrity.checksum)throw new Error('Неизвестный формат контрольной суммы');
        const actual=await checksumText(JSON.stringify(source));
        if(actual!==String(value.integrity.checksum).toLowerCase()){audit('sync.backup_integrity_failed',file.name||'Импорт резервной копии','warning');throw new Error('Контрольная сумма не совпадает: файл изменён или повреждён')}
        integrity='Целостность подтверждена SHA-256';
      }
      const snapshot=validateImportedBackup(value),sections=Object.keys(snapshot.data).map(section=>backupSectionNames[section]||section).join(', ');
      const size=Object.values(snapshot.data).reduce((total,raw)=>total+new Blob([raw]).size,0);
      const preview=`Проверка завершена.\n\nДата снимка: ${new Date(snapshot.at).toLocaleString('ru-RU')}\nРазделы: ${sections}\nОбъём данных: ${(size/1024).toFixed(1)} КБ\n${integrity}\n\nДобавить снимок в историю?`;
      if(!confirm(preview)){audit('sync.backup_import_cancelled','Импорт отменён после предварительного просмотра');return}
      const backups=[snapshot,...readBackups()].slice(0,3);
      safeLocalSet(backupKey,JSON.stringify(backups));audit('sync.backup_imported',`Импортирован резерв: ${Object.keys(snapshot.data).join(', ')}`);renderBackupHistory();
      if(confirm('Резерв проверен и добавлен в историю. Восстановить его сейчас?'))await restoreBackup(snapshot);
    }catch(error){
    if(window.panoraHandleSessionError?.(error)) return;
    alert(`Не удалось импортировать резерв. ${error.message||'Проверьте выбранный файл.'}`);audit('sync.backup_import_failed',String(error.message||error),'warning')}
  }
  function renderBackupHistory(){
    const root=document.querySelector('#syncBackupList');if(!root)return;
    const backups=readBackups();
    root.innerHTML=backups.length?backups.map((snapshot,index)=>{const sectionList=Object.keys(snapshot.data||{}),sections=sectionList.map(section=>backupSectionNames[section]||section).join(', '),bytes=Object.values(snapshot.data||{}).reduce((total,raw)=>total+new Blob([String(raw)]).size,0),source=snapshot.source==='imported'||snapshot.reason==='imported'?'Импортирован':'Автоматический',integrity=snapshot.integrity==='sha256'?'SHA-256 проверен':snapshot.integrity==='legacy'?'Старый формат':'Локальный снимок';return `<article class="sync-backup-item"><div class="sync-backup-title"><div><strong>${new Date(snapshot.at).toLocaleString('ru-RU')}</strong><div class="sync-backup-meta">${backupReasonNames[snapshot.reason]||'Автоматический резерв'}</div></div>${index===0?'<span class="sync-backup-latest">Последний</span>':''}</div><div class="sync-backup-badges"><span>${source}</span><span>${integrity}</span></div><div class="sync-backup-sections">${sections||'Нет доступных разделов'} · ${sectionList.length} разд. · ${(bytes/1024).toFixed(1)} КБ</div><div class="sync-backup-actions"><button type="button" class="secondary" data-backup-restore="${snapshot.id}">Сравнить и восстановить</button><button type="button" class="secondary" data-backup-export="${snapshot.id}">Экспорт</button><button type="button" class="secondary sync-backup-delete" data-backup-delete="${snapshot.id}" ${backups.length===1?'disabled title="Последний резерв защищён"':''}>Удалить</button></div></article>`}).join(''):'<p class="sync-backup-empty">Резервных снимков пока нет.</p>';
  }
  function openBackupHistory(){renderBackupHistory();const modal=document.querySelector('#syncBackupModal');if(modal)modal.hidden=false}
  function deleteBackup(id){
    const backups=readBackups(),snapshot=backups.find(item=>item.id===id);if(!snapshot)return;
    if(backups.length<=1){alert('Нельзя удалить последний резервный снимок. Сначала создайте или импортируйте другой резерв.');return}
    if(!confirm(`Удалить резерв от ${new Date(snapshot.at).toLocaleString('ru-RU')}? Это действие нельзя отменить.`))return;
    localStorage.setItem(backupKey,JSON.stringify(backups.filter(item=>item.id!==id)));audit('sync.backup_deleted','Удалён резерв данных','warning');renderBackupHistory();
  }
  function cleanupBackups(){
    const backups=readBackups();if(backups.length<=1){alert(backups.length?'Оставлен единственный защищённый резерв.':'Резервных снимков пока нет.');return}
    if(!confirm(`Удалить ${backups.length-1} старых резервов и оставить самый новый? Последний рабочий снимок будет сохранён.`))return;
    localStorage.setItem(backupKey,JSON.stringify([backups[0]]));audit('sync.backups_cleaned',`Удалено старых резервов: ${backups.length-1}`,'warning');renderBackupHistory();
  }
  function initBackupHistory(){
    document.querySelector('#syncBackupHistory')?.addEventListener('click',openBackupHistory);document.querySelector('#syncBackupClose')?.addEventListener('click',closeBackupHistory);document.querySelector('#syncBackupCleanup')?.addEventListener('click',cleanupBackups);document.querySelector('#syncBackupImport')?.addEventListener('click',()=>document.querySelector('#syncBackupImportFile')?.click());document.querySelector('#syncBackupImportFile')?.addEventListener('change',event=>{const file=event.target.files?.[0];event.target.value='';importBackupFile(file)});
    document.querySelector('#syncBackupModal')?.addEventListener('click',event=>{if(event.target.id==='syncBackupModal')closeBackupHistory()});
    document.querySelector('#syncBackupList')?.addEventListener('click',event=>{const restore=event.target.closest('[data-backup-restore]'),download=event.target.closest('[data-backup-export]'),remove=event.target.closest('[data-backup-delete]');if(restore)restoreBackup(readBackups().find(item=>item.id===restore.dataset.backupRestore));if(download)downloadBackup(readBackups().find(item=>item.id===download.dataset.backupExport));if(remove)deleteBackup(remove.dataset.backupDelete)});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeBackupHistory()});
  }
  async function retrySync(){
    if(retrying)return retrying;
    if(!navigator.onLine){status('Сохранено на устройстве · отправим при подключении');return false}
    if(!ready){status('Облако не подключено',true,'Сначала войдите в приложение');return false}
    retrying=(async()=>{status(pendingCount()?'Отправляем изменения…':'Проверяем синхронизацию…');
    try{
      if(pending.products)await flushProducts();
      if(pending.recipes)await flushRecipes();
      if(pending.ingredientCosts)await flushIngredientCosts();
      if(pending.restaurants)await saveRestaurantsNow();
      if(pending.plans)await savePlansNow();
      if(pending.orders){await saveOrdersNow();clearPending('orders')}
      if(pending.finance){await syncFinanceNow();clearPending('finance')}
      if(pending.rawStock)await syncRawStockNow();
      if(pending.bakeCompletions)await syncBakeCompletionsNow();
      await loadRestaurants();await loadProducts();await loadPlans();await loadRecipes();await loadIngredientCosts();await loadOrders();await loadPayments();await loadDeliveryNotes();await ensureB2BReturnCreditPayments();await syncBakeCompletionsNow({quiet:true});await syncRawStockNow({quiet:true});await loadOperationEvents();
      audit('sync.restored','Облачная синхронизация восстановлена');
      status('Облако ✓');return true;
    }catch(error){
    if(window.panoraHandleSessionError?.(error)) return false;
    console.error('Panora cloud retry failed',error);
    audit('sync.failed',`синхронизация: ${error?.message||error}`,'error');
    status('Ошибка синхронизации',true,error?.message||String(error));
    return false}
    })().finally(()=>retrying=null);
    return retrying;
  }
  async function start(authSession){
    if(!authSession?.access_token||session?.access_token===authSession.access_token&&ready)return;
    session=authSession;ready=true;clearOrphanConflicts();status('Загрузка облака…');
    const steps=[['товары',loadProducts],['рецептуры',loadRecipes],['цены сырья',loadIngredientCosts],['план',loadPlans],['партнёры',loadRestaurants],['заказы',loadOrders],['накладные',loadDeliveryNotes],['оплаты',loadPayments],['B2B возвраты',ensureB2BReturnCreditPayments],['факт выпечки',syncBakeCompletionsNow],['склад сырья',syncRawStockNow],['журнал',loadOperationEvents]],errors=[];
    for(const [name,run] of steps){status(`Загрузка: ${name}…`);try{await run()}catch(error){
    if(window.panoraHandleSessionError?.(error)) return;
    errors.push([name,error]);console.error(`Panora cloud sync · ${name}`,error)}}
    if(productDirty)try{await flushProducts()}catch(error){
    if(window.panoraHandleSessionError?.(error)) return;
    errors.push(['товары',error])}
    if(recipeDirty)try{await flushRecipes()}catch(error){
    if(window.panoraHandleSessionError?.(error)) return;
    errors.push(['рецептуры',error])}
    const activeAdminView=()=>document.querySelector('.view.active')?.id?.replace(/^view-/,'')||'';
    const viewIs=(...names)=>names.includes(activeAdminView());
    startAdminLeaderHeartbeat();
    // Panora 9.37: periodic cloud reads are scoped to the screen that can actually use them,
    // and only one visible tab owns background polling.
    // User actions still save/refresh immediately; this only removes background table downloads.
    clearInterval(orderPoll);orderPoll=setInterval(async()=>{if(document.hidden||!navigator.onLine||!isAdminBackgroundLeader()||!viewIs('orders','accounting','finance','reminders'))return;try{
      // Panora 9.37: one tiny revision RPC replaces three table downloads while commerce data is unchanged.
      const changed=await adminCommerceRevisionChanged();if(!changed?.changed)return;
      if(changed.orders)await loadOrders();
      if(changed.payments)await loadPayments();
      if(changed.notes)await loadDeliveryNotes();
    }catch(error){
    if(window.panoraHandleSessionError?.(error)) return;
    fail('заказы, оплаты и накладные',error)}},1800000);
    clearInterval(productPoll);productPoll=setInterval(async()=>{if(document.hidden||!navigator.onLine||!isAdminBackgroundLeader()||!viewIs('products','recipes'))return;try{
      const productsChanged=await adminReferenceComponentChanged('products');
      const recipesChanged=await adminReferenceComponentChanged('recipes');
      const ingredientCostsChanged=await adminReferenceComponentChanged('ingredientCosts');
      if(productsChanged)await refreshProductsIfChanged();
      if(recipesChanged)await loadRecipes();
      if(ingredientCostsChanged)await loadIngredientCosts();
    }catch(error){if(window.panoraHandleSessionError?.(error))return;console.warn('Panora reference refresh',error)}},1800000);
    clearInterval(planPoll);planPoll=setInterval(async()=>{if(document.hidden||!navigator.onLine||!isAdminBackgroundLeader()||!viewIs('plan','orders'))return;try{
      if(!await adminOperationalComponentChanged('plans'))return;
      await refreshPlansIfChanged();
    }catch(error){if(window.panoraHandleSessionError?.(error))return;console.warn('Panora plan refresh',error)}},300000);
    clearInterval(rawStockPoll);rawStockPoll=setInterval(async()=>{if(document.hidden||!navigator.onLine||!isAdminBackgroundLeader()||!viewIs('rawstock','purchase','recipes'))return;try{
      if(!await adminOperationalComponentChanged('rawStock'))return;
      await syncRawStockNow({quiet:true,delta:true});
    }catch(error){
      if(window.panoraHandleSessionError?.(error))return;
      rawStockState('Ошибка облака','error',error?.message||String(error));
      console.warn('Panora raw stock refresh',error);
    }},900000);
    clearInterval(bakeCompletionPoll);bakeCompletionPoll=setInterval(async()=>{if(document.hidden||!navigator.onLine||!isAdminBackgroundLeader()||!viewIs('plan','rawstock','finance'))return;try{
      if(!await adminOperationalComponentChanged('bakeCompletions'))return;
      await syncBakeCompletionsNow({quiet:true,delta:true});
    }catch(error){if(window.panoraHandleSessionError?.(error))return;console.warn('Panora bake completion refresh',error)}},900000);
    clearInterval(restaurantPoll);restaurantPoll=setInterval(async()=>{
      if(!isAdminBackgroundLeader())return;
      const view=document.querySelector('#view-restaurants');
      if(!view||view.hidden||!view.classList.contains('active'))return;
      try{
        if(!await adminReferenceComponentChanged('restaurants'))return;
        await refreshRestaurantsIfChanged();
        await refreshRestaurantPricesDirect();
      }catch(error){
        if(window.panoraHandleSessionError?.(error))return;
        console.warn('Panora restaurant refresh',error);
      }
    },600000);
    if(conflictCount())showConflicts();else if(errors.length){const [name,error]=errors[0];fail(name,error)}else status('Облако ✓');
  }
  window.panoraCloud={start,refreshOrders:loadOrders,refreshRestaurants:refreshRestaurantsIfChanged,refreshRestaurantPrices:refreshRestaurantPricesDirect,refreshPlans:refreshPlansIfChanged,queuePlans,queueProducts,flushProducts,saveProductConfirmed,saveProductTechCardConfirmed,acquireTechCardLock,renewTechCardLock,releaseTechCardLock,hasTechCardLock,queueRecipes,flushRecipes,queueIngredientCosts,flushIngredientCosts,refreshIngredientCosts:loadIngredientCosts,queueRestaurants,flushRestaurants,setRestaurantActiveConfirmed,saveRestaurantPriceConfirmed,queueOrders,queueFinance,syncFinance:syncFinanceNow,syncRawStock:syncRawStockNow,syncBakeCompletions:syncBakeCompletionsNow,retrySync,resolveConflicts,restoreLatestBackup,openBackupHistory,refreshAudit:loadOperationEvents,repairFinance:repairMissingDeliveryNotes,updateOrderStatus,cancelBakeDayAtomic,shipOrderAtomic,recordPaymentAtomic,confirmPaymentAtomic,cancelPaymentAtomic,resolvePaymentDisputeAtomic,syncB2BReturnCredits:ensureB2BReturnCreditPayments,get ready(){return ready},get pendingCount(){return pendingCount()},get conflictCount(){return conflictCount()},get backupCount(){return readBackups().length}};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',initBackupHistory):initBackupHistory();
  window.addEventListener('panora:authenticated',event=>start(event.detail));
  window.addEventListener('panora:raw-stock-local-change',()=>{
    markPending('rawStock');rawStockState(navigator.onLine?'Отправляем…':'Офлайн · сохранено',navigator.onLine?'syncing':'local');
    if(ready&&navigator.onLine)syncRawStockNow().catch(error=>{
      const message=error?.message||String(error);
      rawStockState('Ошибка облака · сохранено','error',`Движение сохранено на устройстве. Повторите синхронизацию. ${message}`);
      console.warn('Panora raw stock save',error);
    });
  });
  window.addEventListener('panora:bake-completion-local-change',()=>{markPending('bakeCompletions');if(ready&&navigator.onLine)syncBakeCompletionsNow().catch(error=>console.warn('Panora bake completion save',error))});
  const activeAdminWakeView=()=>document.querySelector('.view.active')?.id?.replace(/^view-/,'')||'orders';
  const refreshAdminCommerceOnWake=reason=>{
    if(!ready||!navigator.onLine)return Promise.resolve(false);
    const now=Date.now();
    if(adminWakeRefreshPromise)return adminWakeRefreshPromise;
    // focus + visibilitychange + pageshow commonly fire together on mobile.
    // One wake refresh per 15 seconds is enough; periodic timers cover the rest.
    if(now-adminWakeRefreshAt<15000)return Promise.resolve(false);
    adminWakeRefreshAt=now;
    adminWakeRefreshPromise=(async()=>{
      const view=activeAdminWakeView();
      if(['orders','accounting','finance','reminders'].includes(view)){
        const changed=await adminCommerceRevisionChanged();
        if(changed?.changed){
          if(changed.orders)await loadOrders();
          if(changed.payments)await loadPayments();
          if(changed.notes)await loadDeliveryNotes();
        }
        window.dispatchEvent(new CustomEvent('panora:admin-commerce-wake-refreshed',{detail:{reason,view,changed:Boolean(changed?.changed)}}));
      }else if(view==='plan'){
        const [plansChanged,bakeChanged]=await Promise.all([adminOperationalComponentChanged('plans'),adminOperationalComponentChanged('bakeCompletions')]);
        const tasks=[];if(plansChanged)tasks.push(refreshPlansIfChanged());if(bakeChanged)tasks.push(syncBakeCompletionsNow({quiet:true,delta:true}));
        if(tasks.length)await Promise.allSettled(tasks);
      }else if(view==='rawstock'){
        const [rawChanged,bakeChanged]=await Promise.all([adminOperationalComponentChanged('rawStock'),adminOperationalComponentChanged('bakeCompletions')]);
        const tasks=[];if(rawChanged)tasks.push(syncRawStockNow({quiet:true,delta:true}));if(bakeChanged)tasks.push(syncBakeCompletionsNow({quiet:true,delta:true}));
        if(tasks.length)await Promise.allSettled(tasks);
      }else if(['recipes','purchase'].includes(view)){
        await loadIngredientCosts();
      }else if(view==='restaurants'){
        await refreshRestaurantPricesDirect();
      }else if(view==='products'){
        await refreshProductsIfChanged();
      }
      return true;
    })().finally(()=>{adminWakeRefreshPromise=null});
    return adminWakeRefreshPromise;
  };
  const scheduleAdminCommerceWakeRefresh=(reason,delay=60)=>{
    clearTimeout(adminWakeRefreshTimer);
    adminWakeRefreshTimer=setTimeout(()=>refreshAdminCommerceOnWake(reason).catch(error=>console.warn('Panora commerce wake refresh',reason,error)),delay);
  };
  window.addEventListener('online',()=>{pending=readPending();if(ready){retrySync();scheduleAdminCommerceWakeRefresh('online',100)}});
  window.addEventListener('offline',()=>showPending()||status('Сохранено на устройстве'));
  const startPendingWatchdog=()=>{
    clearInterval(pendingRetryTimer);
    pendingRetryTimer=setInterval(()=>{
      pending=readPending();
      if(!ready||retrying||!pendingCount())return;
      retrySync().catch(error=>console.warn('Panora pending retry',error));
    },30000);
  };
  startPendingWatchdog();
  if(window.panoraSupabaseSession)start(window.panoraSupabaseSession);
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden&&ready)scheduleAdminCommerceWakeRefresh('visibility');
  });
  window.addEventListener('focus',()=>{
    if(ready)scheduleAdminCommerceWakeRefresh('focus');
  });
  window.addEventListener('pageshow',()=>{if(ready)scheduleAdminCommerceWakeRefresh('pageshow',30)});
  navigator.serviceWorker?.addEventListener?.('message',event=>{
    if(event.data?.type==='PANORA_PUSH_OPENED'&&ready)scheduleAdminCommerceWakeRefresh('push',0);
  });
})();
