(()=>{
  const cfg=window.PANORA_SUPABASE;
  const pendingKey='panora-cloud-pending-v283';
  const revisionKey='panora-cloud-revisions-v285',conflictKey='panora-cloud-conflicts-v285',acceptedKey='panora-cloud-accepted-v317',baselineKey='panora-cloud-baselines-v323',backupKey='panora-cloud-backups-v286',syncSchemaKey='panora-cloud-sync-schema';
  const restaurantBaselineKey='panora-cloud-restaurants-baseline-v415';
  const adminRestaurantPricesKey='panora-admin-restaurant-prices-v420';
  const readPending=()=>{try{return JSON.parse(localStorage.getItem(pendingKey)||'{}')||{}}catch{return{}}};
  const readObject=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{return{}}};
  let pending=readPending();
  let revisions=readObject(revisionKey),conflicts=readObject(conflictKey),accepted=readObject(acceptedKey),baselines=readObject(baselineKey);
  const sectionKeys={products:'panora-products',recipes:'panora-recipes',restaurants:'panora-restaurants',plans:'panora-production-plans'};
  const readBackups=()=>{try{const value=JSON.parse(localStorage.getItem(backupKey)||'[]');return Array.isArray(value)?value:[]}catch{return[]}};
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
    const backups=[snapshot,...readBackups()].slice(0,10);localStorage.setItem(backupKey,JSON.stringify(backups));
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
  const markPending=section=>{pending[section]=true;localStorage.setItem(pendingKey,JSON.stringify(pending));showPending()};
  const clearPending=section=>{delete pending[section];Object.keys(pending).length?localStorage.setItem(pendingKey,JSON.stringify(pending)):localStorage.removeItem(pendingKey)};
  let session=null,ready=false,planTimer=0,productTimer=0,recipeTimer=0,restaurantTimer=0,orderTimer=0,financeTimer=0,orderPoll=0,productPoll=0,planPoll=0,restaurantPoll=0,rawStockPoll=0,bakeCompletionPoll=0,pendingRetryTimer=0,refreshing=null,loadingOrders=null,savingOrders=null,savingProducts=null,productDirty=Boolean(pending.products),savingRecipes=null,recipeDirty=Boolean(pending.recipes),recipeRevision=0,financeLoaded=false,repairingFinance=null,retrying=null,applyingCloud=0,shippingLocks=new Set();
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
      ?await request('products?select=*&order=created_at.asc')
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
      localStorage.setItem('panora-supabase-session',JSON.stringify(session));
      window.panoraSupabaseSession=session;
      return session;
    }).finally(()=>refreshing=null);
    return refreshing
  };
  const request=async(path,options={},retried=false)=>{
    if(!session?.access_token)throw new Error('Нет активной сессии');
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
  };

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
  async function syncRawStockNow({quiet=false}={}){
    if(!ready)return false;
    if(!navigator.onLine){markPending('rawStock');rawStockState('Офлайн · сохранено','local');return false}
    if(!quiet)rawStockState('Синхронизация…','syncing');
    const remoteRows=await request('raw_material_movements?select=id,movement_date,ingredient_key,ingredient_name,unit,movement_type,quantity,note,device_id,created_at,updated_at,deleted_at&order=movement_date.asc,created_at.asc');
    const localRows=readRawStockLocal(),{merged,outgoing}=mergeRawStock(remoteRows,localRows);
    if(outgoing.length){
      await request('raw_material_movements?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(outgoing.map(rawStockToCloud))});
    }
    const canonical=merged.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)));
    const current=localRows.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)));
    if(JSON.stringify(canonical)!==JSON.stringify(current)){
      localStorage.setItem(rawStockKey,JSON.stringify(canonical));
      window.dispatchEvent(new CustomEvent('panora:raw-stock-cloud-updated',{detail:{count:canonical.filter(item=>!item.deletedAt).length}}));
    }
    clearPending('rawStock');rawStockState('Облако ✓','synced');return true;
  }

  /* Panora 6.08 — cloud sync for factual bake completions. */
  const bakeCompletionKey='panora-bake-completions';
  const readBakeCompletionLocal=()=>{try{const value=JSON.parse(localStorage.getItem(bakeCompletionKey)||'[]');return Array.isArray(value)?value:[]}catch{return[]}};
  const bakeCompletionTime=item=>String(item?.updatedAt||item?.createdAt||`${item?.date||''}T00:00:00.000Z`);
  const bakeCompletionToCloud=item=>({id:String(item.id),bake_date:String(item.date||'').slice(0,10),items:Array.isArray(item.items)?item.items:[],note:item.note||null,source:item.source||'actual',device_id:item.deviceId||null,created_at:item.createdAt||new Date().toISOString(),updated_at:item.updatedAt||item.createdAt||new Date().toISOString(),deleted_at:item.deletedAt||null});
  const bakeCompletionFromCloud=row=>({id:String(row.id),date:row.bake_date,items:Array.isArray(row.items)?row.items:[],note:row.note||'',source:row.source||'actual',deviceId:row.device_id||'',createdAt:row.created_at||'',updatedAt:row.updated_at||row.created_at||'',deletedAt:row.deleted_at||''});
  function mergeBakeCompletions(remoteRows,localRows){const remote=new Map((remoteRows||[]).map(row=>[String(row.id),bakeCompletionFromCloud(row)])),merged=new Map(remote),outgoing=[];(localRows||[]).forEach(local=>{if(!local?.id)return;const id=String(local.id),cloud=merged.get(id),localAt=bakeCompletionTime(local),cloudAt=bakeCompletionTime(cloud);if(!cloud){merged.set(id,local);outgoing.push(local);return}if(localAt>cloudAt){merged.set(id,local);outgoing.push(local)}});return{merged:[...merged.values()],outgoing}}
  async function syncBakeCompletionsNow({quiet=false}={}){if(!ready)return false;if(!navigator.onLine){markPending('bakeCompletions');return false}const remoteRows=await request('bake_completions?select=id,bake_date,items,note,source,device_id,created_at,updated_at,deleted_at&order=bake_date.asc'),localRows=readBakeCompletionLocal(),{merged,outgoing}=mergeBakeCompletions(remoteRows,localRows);if(outgoing.length)await request('bake_completions?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(outgoing.map(bakeCompletionToCloud))});const canonical=merged.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id))),current=localRows.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)));if(JSON.stringify(canonical)!==JSON.stringify(current)){localStorage.setItem(bakeCompletionKey,JSON.stringify(canonical));window.dispatchEvent(new CustomEvent('panora:bake-completions-cloud-updated',{detail:{count:canonical.filter(item=>!item.deletedAt).length}}))}clearPending('bakeCompletions');if(!quiet)status('Облако ✓');return true}

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

  // Ordinary product saves deliberately omit tech_card. A stale device must
  // never overwrite a newer card as a side effect of changing a name/price.
  const productRow=(p,{includeTechCard=false}={})=>({
    id:p.id,name_ru:p.names?.ru||p.id,name_en:p.names?.en||p.names?.ru||p.id,name_es:p.names?.es||p.names?.ru||p.id,
    description_ru:p.descriptions?.ru||'',description_en:p.descriptions?.en||'',description_es:p.descriptions?.es||'',
    weight_g:Number(p.weight||750),base_price:Number(p.basePrice||0),wholesale_min_qty:Math.max(1,Number(p.wholesaleMinQty||12)),
    ...(!p._imageCloudOnly?{image_url:p.image||null}:{}),
    ...(!p._galleryCloudOnly?{gallery_urls:Array.isArray(p.gallery)?p.gallery.filter(Boolean).slice(0,6):[]}:{}),
    active:p.active!==false,storefront_visible:p.storefrontVisible!==false,category:String(p.category||'bread'),
    ...(includeTechCard?{tech_card:p.techCard||{}}:{}),updated_at:new Date().toISOString()
  });
  const rowProduct=(row,local)=>({id:row.id,builtIn:['plain','pumpkin'].includes(row.id),active:row.active,storefrontVisible:row.storefront_visible!==false,category:String(row.category||local?.category||'bread'),weight:Number(row.weight_g),basePrice:Number(row.base_price),wholesaleMinQty:Math.max(1,Number(row.wholesale_min_qty||local?.wholesaleMinQty||12)),image:row.image_url||local?.image||'icon.svg',gallery:Array.isArray(row.gallery_urls)?row.gallery_urls:(Array.isArray(local?.gallery)?local.gallery:[]),techCard:row.tech_card||{},techCardRevision:Number(row.tech_card_revision||0),names:{ru:row.name_ru,en:row.name_en,es:row.name_es},descriptions:{ru:row.description_ru||'',en:row.description_en||'',es:row.description_es||''}});
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
  const comparableProduct=p=>canonicalValue({id:String(p.id),active:p.active!==false,storefrontVisible:p.storefrontVisible!==false,category:String(p.category||'bread'),weight:Number(p.weight),basePrice:Number(p.basePrice),wholesaleMinQty:Math.max(1,Number(p.wholesaleMinQty||12)),image:p._imageCloudOnly?'cloud-image':productMediaFingerprint(p.image||'icon.svg'),gallery:p._galleryCloudOnly?['cloud-gallery']:(Array.isArray(p.gallery)?p.gallery.map(productMediaFingerprint):[]),techCard:p.techCard||{},techCardRevision:Number(p.techCardRevision||0),names:p.names||{},descriptions:p.descriptions||{}});
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
    rows=rows||await request('products?select=*&order=created_at.asc');
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
    const rows=await request('products?select=*&order=created_at.asc');
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
    const rows=await request('products?select=*&order=created_at.asc');
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
      const confirmed=await request('products?select=*&order=created_at.asc');rememberRevision('products',confirmed);saveProductBaseline(snapshot);forceSections.delete('products');delete conflicts.products;saveConflicts();
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
    const normalized={mix:String(techCard?.mix||''),fermentation:Number(techCard?.fermentation||0),proof:Number(techCard?.proof||0),bakeTemp:Number(techCard?.bakeTemp||0),bakeTime:Number(techCard?.bakeTime||0),steps:String(techCard?.steps||''),notes:String(techCard?.notes||'')};
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
        const latest=await request(`products?id=eq.${encodeURIComponent(productId)}&select=*&limit=1`);
        if(latest?.length)await applyProductRows((await request('products?select=*&order=created_at.asc'))||latest);
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
  async function deleteProductConfirmed(productId){
    if(!productId)throw new Error('Не удалось определить товар');
    if(!ready)throw new Error('Облако ещё загружается. Подождите несколько секунд и повторите.');
    if(!session?.access_token)throw new Error('Сессия пекарни истекла. Войдите повторно.');
    status('Удаление товара…');
    await request(`products?id=eq.${encodeURIComponent(productId)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});
    const rows=await request(`products?id=eq.${encodeURIComponent(productId)}&select=id`);
    if(rows?.length)throw new Error('Supabase не подтвердил удаление товара');
    productDirty=false;status('Товар удалён ✓');return true;
  }
  async function loadRecipes(){
    const rows=await request('recipe_items?select=*&order=product_id.asc,position.asc');
    const local=JSON.parse(localStorage.getItem('panora-recipes')||'{}');
    if(recipeDirty||savingRecipes){await flushRecipes();return}
    rememberRevision('recipes',rows);
    if(rows?.length){
      await window.panoraFormDrafts?.acceptCommittedWithin?.('#recipeList');
      const remote={};
      rows.forEach(row=>{const pos=Number(row.position||0),localItem=local?.[row.product_id]?.[pos]||{};(remote[row.product_id]??=[]).push({name:row.ingredient_name,qty:Number(row.quantity),unit:row.unit,stock:Number(row.stock||0),margin:Number(row.margin||0),sourceIngredientName:row.source_ingredient_name??localItem.sourceIngredientName??'',sourceUnit:row.source_unit??localItem.sourceUnit??'g',sourceYieldPct:Number(row.source_yield_pct??localItem.sourceYieldPct??0)})});
      recipes=remote;if(typeof syncAdminProductRegistry==='function')syncAdminProductRegistry();localStorage.setItem('panora-recipes',JSON.stringify(recipes));localStorage.setItem('panora-recipes-version','cloud-2');window.dispatchEvent(new CustomEvent('panora:recipes-changed'));
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
      const payload=Object.entries(snapshot).flatMap(([productId,items])=>(items||[]).map((item,position)=>({product_id:productId,position,ingredient_name:String(item.name||''),quantity:Number(item.qty||0),unit:item.unit||'g',stock:Number(item.stock||0),margin:Number(item.margin||0),source_ingredient_name:item.sourceIngredientName||null,source_unit:item.sourceUnit||null,source_yield_pct:Number(item.sourceYieldPct||0)||null,updated_at:new Date().toISOString()})));
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
  const restaurantRow=r=>({id:r.id,name:r.name,email:r.email,phone:r.phone||null,whatsapp:r.whatsapp||null,telegram:r.telegram||null,extra_messengers:safeMessengerRows(r.extraMessengers),address:r.address||null,legal_name:r.legalName||null,tax_id:r.taxId||null,billing_address:r.billingAddress||null,language:r.language||'ru',partner_type:normalizeCloudPartnerType(r.partnerType),active:!r.deletedAt,updated_at:new Date().toISOString()});
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
    localStorage.setItem(adminRestaurantPricesKey,JSON.stringify(remoteMap));

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
      localStorage.setItem('panora-restaurants',JSON.stringify(next));
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
    const rows=await request('restaurants?select=*,restaurant_prices(product_id,price)&order=created_at.asc');
    rememberRevision('restaurants',rows);
    const local=JSON.parse(localStorage.getItem('panora-restaurants')||'[]');
    if(rows?.length){
      restaurants=rows.map(row=>rowRestaurant(row,local.find(r=>r.id===row.id||String(r.email).toLowerCase()===String(row.email).toLowerCase())));
      localStorage.setItem('panora-restaurants',JSON.stringify(restaurants));
      writeRestaurantBaseline(restaurants);
      clearPending('restaurants');
      await refreshRestaurantPricesDirect();
      if(typeof renderCommerce==='function')renderCommerce();
    }else if(local.length){restaurants=local;ready=true;await saveRestaurantsNow()}
  }
  async function refreshRestaurantsIfChanged(){
    if(!ready||document.hidden)return false;
    if(window.panoraMoneyEditing?.active)return false;
    if(pending.restaurants)clearPending('restaurants');

    const rows=await request('restaurants?select=*,restaurant_prices(product_id,price)&order=created_at.asc');
    const local=JSON.parse(localStorage.getItem('panora-restaurants')||'[]');
    const mapped=(rows||[]).map(row=>rowRestaurant(row,local.find(r=>r.id===row.id||String(r.email).toLowerCase()===String(row.email).toLowerCase())));
    const before=restaurantSignature(local);
    const after=restaurantSignature(mapped);

    writeRestaurantBaseline(mapped);
    if(before===after)return false;

    restaurants=mapped;
    localStorage.setItem('panora-restaurants',JSON.stringify(restaurants));
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
    const prices=restaurants.flatMap(r=>Object.entries(r.prices||{}).map(([product_id,price])=>({restaurant_id:r.id,product_id,price:Number(price),updated_at:new Date().toISOString()})));
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
  const orderMeta=order=>JSON.stringify({deliveryDate:order.deliveryDate||order.date,taxRate:Number(order.taxRate||0),comment:order.comment||''});
  const parseOrderMeta=value=>{try{return JSON.parse(value||'{}')}catch{return{comment:value||''}}};
  const rowOrder=row=>{
    const meta=parseOrderMeta(row.comment),day=row.bake_days||{},items=(row.order_items||[]).map(item=>({product:item.product_id,quantity:Number(item.quantity)}));
    return{id:row.id,number:Number(row.order_number),restaurantId:row.restaurant_id,date:day.bake_date,deliveryDate:meta.deliveryDate||day.delivery_date||day.bake_date,items,prices:Object.fromEntries((row.order_items||[]).map(item=>[item.product_id,Number(item.unit_price)])),taxRate:Number(meta.taxRate||0),status:row.status,comment:meta.comment||'',cancellationReason:row.cancelled_reason||'',createdAt:row.created_at};
  };
  async function loadOrders(){
    if(loadingOrders)return loadingOrders;if(savingOrders)await savingOrders;
    if(pending.orders){await saveOrdersNow();clearPending('orders')}
    loadingOrders=(async()=>{const rows=await request('orders?select=id,order_number,restaurant_id,status,comment,cancelled_reason,created_at,bake_days(bake_date,delivery_date),order_items(product_id,quantity,unit_price)&order=order_number.asc');const beforeOrders=localStorage.getItem('panora-orders')||'[]';orders=(rows||[]).map(rowOrder);const afterOrders=JSON.stringify(orders);localStorage.setItem('panora-orders',afterOrders);if(beforeOrders!==afterOrders)window.dispatchEvent(new CustomEvent('panora:orders-updated',{detail:{count:orders.length}}));syncPlansFromOrders();if(financeLoaded)await repairMissingDeliveryNotes();if(typeof renderCommerce==='function')renderCommerce();if(typeof renderAll==='function')renderAll();status(`Облако ✓ · ${rows?.length||0} заказов`)})().finally(()=>loadingOrders=null);return loadingOrders
  }
  async function updateOrderStatus(id,nextStatus,cancelledReason=null){
    if(!ready)throw new Error('Облако ещё загружается');
    if(loadingOrders)await loadingOrders;
    clearTimeout(orderTimer);orderTimer=0;
    await request(`orders?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:nextStatus,cancelled_reason:cancelledReason,updated_at:new Date().toISOString()})});
    try{await loadOrders()}catch{}
    window.dispatchEvent(new CustomEvent('panora:order-status-local',{detail:{id,nextStatus}}));
    await loadOrders();
    const saved=orders.find(order=>order.id===id);
    if(!saved||saved.status!==nextStatus)throw new Error('Supabase не подтвердил изменение статуса заказа');
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
      const order=orders.find(entry=>entry.id===orderId);
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
            const order=orders.find(entry=>entry.id===orderId);
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
    let days=await bakeDayMap();
    const missing=orders.some(order=>!days.has(order.date));
    if(missing){await savePlansNow();days=await bakeDayMap()}
    const valid=orders.filter(order=>days.has(order.date)&&restaurants.some(r=>r.id===order.restaurantId));
    if(valid.length){
      const payload=valid.map(order=>({id:order.id,order_number:Number(order.number)||undefined,restaurant_id:order.restaurantId,bake_day_id:days.get(order.date),status:order.status||'submitted',comment:orderMeta(order),cancelled_reason:order.cancellationReason||null,created_by:session.user?.id||null,updated_at:new Date().toISOString()}));
      await request('orders?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(payload)});
      for(const order of valid){
        await request(`order_items?order_id=eq.${encodeURIComponent(order.id)}`,{method:'DELETE'});
        const items=(order.items||[]).filter(item=>Number(item.quantity)>0).map(item=>({order_id:order.id,product_id:item.product,quantity:Number(item.quantity),unit_price:Number((order.prices||{})[item.product]??restaurant(order.restaurantId)?.prices?.[item.product]??0)}));
        if(items.length)await request('order_items?on_conflict=order_id,product_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(items)});
      }
    }
    status('Облако ✓');})().finally(()=>savingOrders=null);return savingOrders
  }
  const localDate=value=>String(value||'').slice(0,10);
  const rowNote=row=>{const order=orders.find(item=>item.id===row.order_id),paid=payments.filter(p=>p.deliveryNoteId===row.id&&p.confirmed!==false).reduce((sum,p)=>sum+Number(p.amount||0),0);return{id:row.id,number:Number(row.note_number),orderId:row.order_id,restaurantId:row.restaurant_id,date:localDate(row.delivered_at),paymentDueDate:row.payment_due_date||'',items:structuredClone(order?.items||[]),prices:structuredClone(order?.prices||{}),bakery:structuredClone(typeof bakerySettings!=='undefined'?bakerySettings:{}),subtotal:Number(row.total),taxRate:Number(order?.taxRate||0),tax:0,total:Number(row.total),paid,balanceAfter:0,traysDelivered:Number(row.trays_delivered||0),traysReturned:Number(row.trays_returned||0),trayBalanceAfter:Number(row.tray_balance_after||0),customerTraysReceived:row.customer_trays_received==null?null:Number(row.customer_trays_received),customerTraysReturned:row.customer_trays_returned==null?null:Number(row.customer_trays_returned),qrToken:row.qr_token,customerConfirmedAt:row.customer_confirmed_at||null,customerReceiver:row.customer_receiver||'',offlineProof:row.offline_received_at?{receivedAt:row.offline_received_at,receiver:row.offline_receiver||'',signature:row.offline_signature||'',pending:false}:null}};
  const recoveredNote=order=>{const items=structuredClone(order.items||[]),prices=structuredClone(order.prices||{}),subtotal=items.reduce((sum,item)=>sum+Number(item.quantity||0)*Number(prices[item.product]||0),0),taxRate=Number(order.taxRate||0),tax=subtotal*taxRate/100;return{id:order.id,number:null,orderId:order.id,restaurantId:order.restaurantId,date:localDate(order.deliveryDate||order.date||new Date().toISOString()),items,prices,bakery:structuredClone(typeof bakerySettings!=='undefined'?bakerySettings:{}),subtotal,taxRate,tax,total:subtotal+tax,paid:0,balanceAfter:0,recovered:true}};
  const deliveryNoteRow=(note,{includeId=true}={})=>{note.qrToken ||= crypto.randomUUID();const row={order_id:note.orderId,restaurant_id:note.restaurantId,delivered_at:`${localDate(note.date)}T12:00:00Z`,payment_due_date:note.paymentDueDate||null,total:Number(note.total||0),trays_delivered:Number(note.traysDelivered||0),trays_returned:Number(note.traysReturned||0),tray_balance_after:Number(note.trayBalanceAfter||0),customer_trays_received:note.customerTraysReceived==null?null:Number(note.customerTraysReceived),customer_trays_returned:note.customerTraysReturned==null?null:Number(note.customerTraysReturned),qr_token:note.qrToken,customer_confirmed_at:note.customerConfirmedAt||null,customer_receiver:note.customerReceiver||null,offline_received_at:note.offlineProof?.receivedAt||null,offline_receiver:note.offlineProof?.receiver||null,offline_signature:note.offlineProof?.signature||null};if(includeId&&note.id)row.id=note.id;if(Number(note.number)>0)row.note_number=Number(note.number);return row};
  async function repairMissingDeliveryNotes(){
    if(repairingFinance)return repairingFinance;
    repairingFinance=(async()=>{
      const remoteRows=await request('delivery_notes?select=*');
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
      recalculateBalances();localStorage.setItem('panora-delivery-notes',JSON.stringify(deliveryNotes));
      if(typeof renderCommerce==='function')renderCommerce();
      return missing.length;
    })().finally(()=>repairingFinance=null);
    return repairingFinance;
  }
  async function loadDeliveryNotes(){
    const rows=await request('delivery_notes?select=*&order=note_number.asc');
    const local=JSON.parse(localStorage.getItem('panora-delivery-notes')||'[]');
    const remote=(rows||[]).map(rowNote),remoteIds=new Set(remote.map(note=>note.id)),remoteOrders=new Set(remote.map(note=>note.orderId)),pending=local.filter(note=>!remoteIds.has(note.id)&&!remoteOrders.has(note.orderId));
    deliveryNotes=[...remote,...pending];
    financeLoaded=true;localStorage.setItem('panora-delivery-notes',JSON.stringify(deliveryNotes));
    if(pending.length){ready=true;try{await saveDeliveryNotesNow()}catch(error){
    if(window.panoraHandleSessionError?.(error)) return;
    console.warn('Pending delivery notes were not uploaded; repair will retry by order.',error)}}
    ready=true;await repairMissingDeliveryNotes();
    if(typeof renderCommerce==='function')renderCommerce()
  }
  async function saveDeliveryNotesNow(){
    if(!ready||typeof deliveryNotes==='undefined')return;
    const valid=deliveryNotes.filter(note=>orders.some(order=>order.id===note.orderId)&&restaurants.some(r=>r.id===note.restaurantId));
    if(!valid.length)return;
    status('Синхронизация…');
    const payload=valid.map(note=>deliveryNoteRow(note));
    const rows=await request('delivery_notes?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(payload)});
    (rows||[]).forEach(row=>{const note=deliveryNotes.find(item=>item.id===row.id);if(note){note.number=Number(row.note_number);note.qrToken=row.qr_token}});
    localStorage.setItem('panora-delivery-notes',JSON.stringify(deliveryNotes));status('Облако ✓');
  }
  const rowPayment=row=>({id:row.id,restaurantId:row.restaurant_id,deliveryNoteId:row.delivery_note_id||null,date:localDate(row.received_at),receivedAt:row.received_at||null,amount:Number(row.amount),method:row.method,note:row.note||'',confirmed:row.status!=='cancelled',confirmedAt:row.confirmed_at||row.received_at||null,status:row.status,disputeStatus:row.dispute_status||'none',disputeReason:row.dispute_reason||'',disputedAt:row.disputed_at||null,disputeDeadline:row.dispute_deadline||null,recordedBy:row.recorded_by||row.confirmed_by||null});
  function cachePayment(row){
    const payment=rowPayment(row);
    const index=payments.findIndex(item=>item.id===payment.id);
    if(index>=0)payments[index]=payment;
    else payments.push(payment);
    localStorage.setItem('panora-payments',JSON.stringify(payments));
    recalculateBalances();
    if(typeof renderCommerce==='function')renderCommerce();
    return payment;
  }
  async function loadPayments(){
    const rows=await request('payments?select=*&order=received_at.asc');
    const local=JSON.parse(localStorage.getItem('panora-payments')||'[]');
    if(rows?.length){payments=rows.map(rowPayment);localStorage.setItem('panora-payments',JSON.stringify(payments));recalculateBalances();if(typeof renderCommerce==='function')renderCommerce()}
    else if(local.length){payments=local;ready=true;await savePaymentsNow()}
  }
  async function savePaymentsNow(){
    if(!ready||typeof payments==='undefined')return;
    const valid=payments.filter(payment=>restaurants.some(r=>r.id===payment.restaurantId)&&Number(payment.amount)>0);
    if(!valid.length)return;
    status('Синхронизация…');
    const payload=valid.map(payment=>({id:payment.id,restaurant_id:payment.restaurantId,delivery_note_id:payment.deliveryNoteId||null,amount:Number(payment.amount),method:payment.method||'Не указан',note:payment.note||null,status:payment.status==='cancelled'?'cancelled':'confirmed',received_at:payment.receivedAt||`${localDate(payment.date)}T12:00:00Z`,confirmed_at:payment.confirmedAt||new Date().toISOString(),confirmed_by:session.user?.id||null,recorded_by:payment.recordedBy||session.user?.id||null,dispute_status:payment.disputeStatus||'none',dispute_reason:payment.disputeReason||null,disputed_at:payment.disputedAt||null,dispute_deadline:payment.disputeDeadline||null}));
    await request('payments?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(payload)});status('Облако ✓');
  }
  async function recordPaymentAtomic(input){
    if(!ready)throw new Error('Облако ещё загружается.');
    const rows=await request('rpc/panora_record_payment',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({
      p_restaurant_id:input.restaurantId,
      p_amount:Number(input.amount),
      p_method:input.method||'Наличные',
      p_note:input.note||null,
      p_delivery_note_id:input.deliveryNoteId||null,
      p_received_at:input.receivedAt||new Date().toISOString()
    })});
    const row=Array.isArray(rows)?rows[0]:rows;
    if(!row?.id)throw new Error('Сервер не вернул сохранённую оплату.');
    status('Облако ✓');
    return cachePayment(row);
  }
  async function confirmPaymentAtomic(paymentId){
    if(!ready)throw new Error('Облако ещё загружается.');
    const rows=await request('rpc/panora_confirm_payment',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_payment_id:paymentId})});
    const row=Array.isArray(rows)?rows[0]:rows;
    if(!row?.id)throw new Error('Сервер не подтвердил оплату.');
    status('Облако ✓');
    return cachePayment(row);
  }
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
      payment.confirmed!==false&&
      payment.status!=='cancelled'&&
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
    const id=String(linked.id),already=Number(paidByNote.get(id)||0),total=Math.max(0,Number(linked.total||0));
    const applied=Math.min(Math.max(0,total-already),amount);
    paidByNote.set(id,already+applied);
    fifoPool+=Math.max(0,amount-applied);
  });

  notes.forEach(note=>{
    if(fifoPool<=0)return;
    const id=String(note.id),already=Number(paidByNote.get(id)||0),total=Math.max(0,Number(note.total||0));
    const due=Math.max(0,total-already),applied=Math.min(due,fifoPool);
    if(applied>0){
      paidByNote.set(id,already+applied);
      fifoPool-=applied;
    }
  });

  const rows=notes.map(note=>{
    const total=Math.max(0,Number(note.total||0));
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
  const events=[
    ...notes.map(note=>({
      id:`delivery:${note.id}`,
      date:String(note.date||''),
      kind:'delivery',
      sequence:Number(note.number||0)*2,
      note,
      amount:Number(note.total||0)
    })),
    ...payments.filter(payment=>payment.restaurantId===restaurantId&&payment.status!=='cancelled').map(payment=>{
      const linkedNote=noteById.get(payment.deliveryNoteId);
      const paidAtShipment=linkedNote&&String(linkedNote.date||'')===String(payment.date||'');
      return{
        id:`payment:${payment.id}`,
        date:String(payment.date||''),
        kind:'payment',
        sequence:paidAtShipment?Number(linkedNote.number||0)*2+1:1000000,
        payment,
        amount:Number(payment.amount||0),
        linkedNote:linkedNote||null
      };
    })
  ].sort((a,b)=>a.date.localeCompare(b.date)||a.sequence-b.sequence||a.id.localeCompare(b.id));

  let running=0;
  events.forEach(event=>{
    if(event.kind==='delivery'){
      event.note.balanceBefore=running;
      running+=event.amount;
      event.note.balanceAfter=Math.max(0,running);
    }else if(event.payment.confirmed!==false){
      running-=event.amount;
      if(event.linkedNote&&event.date===String(event.linkedNote.date||'')){
        event.linkedNote.balanceAfter=Math.max(0,running);
      }
    }
    event.balanceAfter=running;
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
  localStorage.setItem('panora-delivery-notes',JSON.stringify(deliveryNotes));
}
window.panoraFinanceAllocation=financeAllocation;
window.panoraFinanceTimeline=financeTimeline;
window.panoraRecalculateBalances=recalculateBalances;
  const remotePlan=p=>({id:`${p.id}:${p.product_id}`,bakeDate:p.bake_date,deliveryDate:p.delivery_date,product:p.product_id,planned:Number(p.planned_quantity),ordered:0,cutoff:p.cutoff_at,open:p.accepting_orders});
  async function getRemotePlans(){
    const days=await request('bake_days?select=id,bake_date,delivery_date,cutoff_at,accepting_orders,updated_at,bake_items(product_id,planned_quantity)&order=bake_date.asc');
    rememberRevision('plans',days);
    return (days||[]).flatMap(day=>(day.bake_items||[]).map(item=>remotePlan({...day,...item})));
  }
  const planComparable=p=>({bakeDate:String(p?.bakeDate||''),deliveryDate:String(p?.deliveryDate||''),product:String(p?.product||''),planned:Number(p?.planned||0),cutoff:String(p?.cutoff||''),open:p?.open!==false});
  const planSignature=list=>JSON.stringify((list||[]).map(planComparable).sort((a,b)=>`${a.bakeDate}|${a.product}`.localeCompare(`${b.bakeDate}|${b.product}`)));
  const savePlanBaseline=list=>{baselines.plans=planSignature(list||[]);localStorage.setItem(baselineKey,JSON.stringify(baselines))};
  async function applyCloudPlans(remote){
    applyingCloud++;
    try{
      plans=Array.isArray(remote)?remote:[];
      localStorage.setItem('panora-production-plans',JSON.stringify(plans));
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
      localStorage.setItem('panora-production-plans',JSON.stringify(plans));
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
    const existing=await request('bake_days?select=id,bake_date');
    for(const day of existing||[]){if(!byDate.has(day.bake_date))await request(`bake_days?id=eq.${encodeURIComponent(day.id)}`,{method:'DELETE'})}
    for(const [date,items] of byDate){
      const first=items[0],payload={bake_date:date,delivery_date:first.deliveryDate||date,cutoff_at:first.cutoff,accepting_orders:first.open!==false,updated_at:new Date().toISOString()};
      const rows=await request('bake_days?on_conflict=bake_date',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(payload)});
      const day=rows?.[0];if(!day)continue;
      await request(`bake_items?bake_day_id=eq.${encodeURIComponent(day.id)}`,{method:'DELETE'});
      await request('bake_items?on_conflict=bake_day_id,product_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(items.map(p=>({bake_day_id:day.id,product_id:p.product,planned_quantity:Number(p.planned||0)})))});
    }
    revisions.plans=new Date().toISOString();localStorage.setItem(revisionKey,JSON.stringify(revisions));forceSections.delete('plans');delete conflicts.plans;saveConflicts();
    clearPending('plans');savePlanBaseline(plans);
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
  async function saveRestaurantPriceConfirmed(restaurantId,productId,price){
    if(!ready)throw new Error('Облако ещё загружается');
    const row={restaurant_id:restaurantId,product_id:productId,price:Number(price),updated_at:new Date().toISOString()};
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
    localStorage.setItem('panora-delivery-notes',JSON.stringify(deliveryNotes));
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
      if(section==='products'){const rows=await request('products?select=*&order=created_at.asc');await applyProductRows(rows)}else if(section==='recipes')await loadRecipes();else if(section==='restaurants')await loadRestaurants();else if(section==='plans')await loadPlans();
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
      const backups=[snapshot,...readBackups()].slice(0,10);
      localStorage.setItem(backupKey,JSON.stringify(backups));audit('sync.backup_imported',`Импортирован резерв: ${Object.keys(snapshot.data).join(', ')}`);renderBackupHistory();
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
      if(pending.restaurants)await saveRestaurantsNow();
      if(pending.plans)await savePlansNow();
      if(pending.orders){await saveOrdersNow();clearPending('orders')}
      if(pending.finance){await syncFinanceNow();clearPending('finance')}
      if(pending.rawStock)await syncRawStockNow();
      if(pending.bakeCompletions)await syncBakeCompletionsNow();
      await loadRestaurants();await loadProducts();await loadPlans();await loadRecipes();await loadOrders();await loadPayments();await loadDeliveryNotes();await syncBakeCompletionsNow({quiet:true});await syncRawStockNow({quiet:true});await loadOperationEvents();
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
    const steps=[['товары',loadProducts],['рецептуры',loadRecipes],['план',loadPlans],['партнёры',loadRestaurants],['заказы',loadOrders],['накладные',loadDeliveryNotes],['оплаты',loadPayments],['факт выпечки',syncBakeCompletionsNow],['склад сырья',syncRawStockNow],['журнал',loadOperationEvents]],errors=[];
    for(const [name,run] of steps){status(`Загрузка: ${name}…`);try{await run()}catch(error){
    if(window.panoraHandleSessionError?.(error)) return;
    errors.push([name,error]);console.error(`Panora cloud sync · ${name}`,error)}}
    if(productDirty)try{await flushProducts()}catch(error){
    if(window.panoraHandleSessionError?.(error)) return;
    errors.push(['товары',error])}
    if(recipeDirty)try{await flushRecipes()}catch(error){
    if(window.panoraHandleSessionError?.(error)) return;
    errors.push(['рецептуры',error])}
    clearInterval(orderPoll);orderPoll=setInterval(async()=>{try{await loadOrders();await loadDeliveryNotes()}catch(error){
    if(window.panoraHandleSessionError?.(error)) return;
    fail('заказы и накладные',error)}},2000);
    clearInterval(productPoll);productPoll=setInterval(()=>refreshProductsIfChanged().catch(error=>console.warn('Panora product refresh',error)),3000);
    clearInterval(planPoll);planPoll=setInterval(()=>refreshPlansIfChanged().catch(error=>{
      if(window.panoraHandleSessionError?.(error))return;
      console.warn('Panora plan refresh',error);
    }),2000);
    clearInterval(rawStockPoll);rawStockPoll=setInterval(()=>syncRawStockNow({quiet:true}).catch(error=>{
      if(window.panoraHandleSessionError?.(error))return;
      rawStockState('Ошибка облака','error',error?.message||String(error));
      console.warn('Panora raw stock refresh',error);
    }),3000);
    clearInterval(bakeCompletionPoll);bakeCompletionPoll=setInterval(()=>syncBakeCompletionsNow({quiet:true}).catch(error=>{if(window.panoraHandleSessionError?.(error))return;console.warn('Panora bake completion refresh',error)}),2500);
    clearInterval(restaurantPoll);restaurantPoll=setInterval(()=>{
      const view=document.querySelector('#view-restaurants');
      if(!view||view.hidden||!view.classList.contains('active'))return;
      refreshRestaurantPricesDirect().catch(error=>{
        if(window.panoraHandleSessionError?.(error))return;
        console.warn('Panora restaurant price refresh',error);
      });
    },2000);
    if(conflictCount())showConflicts();else if(errors.length){const [name,error]=errors[0];fail(name,error)}else status('Облако ✓');
  }
  window.panoraCloud={start,refreshRestaurants:refreshRestaurantsIfChanged,refreshRestaurantPrices:refreshRestaurantPricesDirect,refreshPlans:refreshPlansIfChanged,queuePlans,queueProducts,flushProducts,saveProductConfirmed,saveProductTechCardConfirmed,acquireTechCardLock,renewTechCardLock,releaseTechCardLock,hasTechCardLock,deleteProductConfirmed,queueRecipes,flushRecipes,queueRestaurants,flushRestaurants,saveRestaurantPriceConfirmed,queueOrders,queueFinance,syncFinance:syncFinanceNow,syncRawStock:syncRawStockNow,syncBakeCompletions:syncBakeCompletionsNow,retrySync,resolveConflicts,restoreLatestBackup,openBackupHistory,refreshAudit:loadOperationEvents,repairFinance:repairMissingDeliveryNotes,updateOrderStatus,shipOrderAtomic,recordPaymentAtomic,confirmPaymentAtomic,get ready(){return ready},get pendingCount(){return pendingCount()},get conflictCount(){return conflictCount()},get backupCount(){return readBackups().length}};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',initBackupHistory):initBackupHistory();
  window.addEventListener('panora:authenticated',event=>start(event.detail));
  window.addEventListener('panora:raw-stock-local-change',()=>{
    markPending('rawStock');rawStockState(navigator.onLine?'Отправляем…':'Офлайн · сохранено',navigator.onLine?'syncing':'local');
    if(ready&&navigator.onLine)syncRawStockNow().catch(error=>{rawStockState('Ошибка облака','error',error?.message||String(error));console.warn('Panora raw stock save',error)});
  });
  window.addEventListener('panora:bake-completion-local-change',()=>{markPending('bakeCompletions');if(ready&&navigator.onLine)syncBakeCompletionsNow().catch(error=>console.warn('Panora bake completion save',error))});
  window.addEventListener('online',()=>{pending=readPending();if(ready)retrySync()});
  window.addEventListener('offline',()=>showPending()||status('Сохранено на устройстве'));
  const startPendingWatchdog=()=>{
    clearInterval(pendingRetryTimer);
    pendingRetryTimer=setInterval(()=>{
      pending=readPending();
      if(!ready||retrying||!pendingCount())return;
      retrySync().catch(error=>console.warn('Panora pending retry',error));
    },4000);
  };
  startPendingWatchdog();
  if(window.panoraSupabaseSession)start(window.panoraSupabaseSession);
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden&&ready){refreshRestaurantPricesDirect().catch(error=>console.warn('Panora restaurant price visibility refresh',error));syncRawStockNow({quiet:true}).catch(error=>console.warn('Panora raw stock visibility refresh',error));syncBakeCompletionsNow({quiet:true}).catch(error=>console.warn('Panora bake completion visibility refresh',error))}
  });
  window.addEventListener('focus',()=>{
    if(ready){refreshRestaurantPricesDirect().catch(error=>console.warn('Panora restaurant price focus refresh',error));syncRawStockNow({quiet:true}).catch(error=>console.warn('Panora raw stock focus refresh',error));syncBakeCompletionsNow({quiet:true}).catch(error=>console.warn('Panora bake completion focus refresh',error))}
  });
})();
