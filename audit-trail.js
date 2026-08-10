
/* Panora v333 — local audit trail: who, when, what changed */
(function(){
 const KEY='panora-audit-v333',MAX=800;
 const watched={
  'panora-products':'Товары',
  'panora-recipes':'Технологические карты',
  'panora-production-plans':'План производства',
  'panora-orders':'Заказы',
  'panora-shipments':'Поставки',
  'panora-delivery-notes':'Накладные',
  'panora-payments':'Платежи'
 };
 let shadow={},started=false,timer=0;

 function parse(raw,fallback=[]){try{return JSON.parse(raw??'')??fallback}catch{return fallback}}
 function read(){const v=parse(localStorage.getItem(KEY),[]);return Array.isArray(v)?v:[]}
 function write(rows){try{localStorage.setItem(KEY,JSON.stringify(rows.slice(0,MAX)))}catch{}}
 function actor(){
   const candidates=['panora-admin-user','panora-current-user','panora-user','panora-bakery-settings'];
   for(const k of candidates){
     const v=parse(localStorage.getItem(k),null);
     if(v&&typeof v==='object'){
       const name=v.name||v.displayName||v.email||v.login||v.username;
       if(name)return String(name);
     }
   }
   return document.body.classList.contains('admin-page')?'Пекарня':'Партнёр';
 }
 function idOf(x,i){return String(x?.id??x?.productId??x?.orderId??x?.number??i)}
 function labelOf(x,id){return String(x?.name||x?.title||x?.productName||(x?.number?`PN-${String(x.number).padStart(4,'0')}`:id))}
 function summarize(a,b){
   if(!a)return 'Создано';
   if(!b)return 'Удалено';
   const keys=new Set([...Object.keys(a||{}),...Object.keys(b||{})]);
   const changed=[];
   for(const k of keys){
     if(['updatedAt','updated_at','serverRevision','server_revision','revision','version'].includes(k))continue;
     const av=JSON.stringify(a?.[k]),bv=JSON.stringify(b?.[k]);
     if(av!==bv)changed.push(k);
     if(changed.length>=5)break;
   }
   return changed.length?`Изменены поля: ${changed.join(', ')}`:'Обновлено';
 }
 function record(section,action,entityId,entityLabel,detail,source='local'){
   const row={id:`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,at:new Date().toISOString(),actor:actor(),section,action,entityId,entityLabel,detail,source,device:(navigator.userAgentData?.platform||navigator.platform||'device')};
   write([row,...read()]);
   window.dispatchEvent(new CustomEvent('panora:audit-added',{detail:row}));
   render();
 }
 function diffKey(key,oldRaw,newRaw,source='local'){
   if(!(key in watched))return;
   const oldList=parse(oldRaw,[]),newList=parse(newRaw,[]);
   if(!Array.isArray(oldList)||!Array.isArray(newList))return;
   const oldMap=new Map(oldList.map((x,i)=>[idOf(x,i),x])),newMap=new Map(newList.map((x,i)=>[idOf(x,i),x]));
   for(const [id,n] of newMap){
     const o=oldMap.get(id);
     if(!o)record(watched[key],'Создание',id,labelOf(n,id),'Добавлена новая запись',source);
     else if(JSON.stringify(o)!==JSON.stringify(n))record(watched[key],'Изменение',id,labelOf(n,id),summarize(o,n),source);
   }
   for(const [id,o] of oldMap)if(!newMap.has(id))record(watched[key],'Удаление',id,labelOf(o,id),'Запись удалена',source);
 }
 function scan(source='local'){
   if(!started)return;
   for(const key of Object.keys(watched)){
     const now=localStorage.getItem(key)||'[]',before=shadow[key]??now;
     if(now!==before)diffKey(key,before,now,source);
     shadow[key]=now;
   }
 }
 function schedule(source='local'){clearTimeout(timer);timer=setTimeout(()=>scan(source),120)}
 function initShadow(){for(const key of Object.keys(watched))shadow[key]=localStorage.getItem(key)||'[]';started=true}

 function ui(){
   if(document.querySelector('.panora-audit-panel'))return;
   const p=document.createElement('div');p.className='panora-audit-panel';p.innerHTML=`<aside class="panora-audit-drawer"><div class="panora-audit-head"><h2>История изменений</h2><button class="panora-audit-close" type="button">×</button></div><div class="panora-audit-tools"><select class="panora-audit-filter"><option value="">Все разделы</option>${Object.values(watched).map(x=>`<option>${x}</option>`).join('')}</select></div><div class="panora-audit-list"></div></aside>`;document.body.appendChild(p);
   p.querySelector('.panora-audit-close').onclick=()=>p.classList.remove('open');p.onclick=e=>{if(e.target===p)p.classList.remove('open')};p.querySelector('select').onchange=render;
   const open=()=>{p.classList.add('open');render()};
   document.querySelector('#openAuditHistory')?.addEventListener('click',open);
   window.panoraAuditOpen=open;
   render();
 }
 function panel(){return document.querySelector('.panora-audit-panel')}
 function fmt(at){try{return new Intl.DateTimeFormat('ru-RU',{dateStyle:'short',timeStyle:'medium'}).format(new Date(at))}catch{return at}}
 function render(){
   const p=panel();if(!p)return;const filter=p.querySelector('select')?.value||'';const list=p.querySelector('.panora-audit-list');const rows=read().filter(x=>!filter||x.section===filter);
   list.innerHTML=rows.length?rows.map(x=>`<article class="panora-audit-item"><div class="panora-audit-title"></div><div class="panora-audit-meta"></div><div class="panora-audit-detail"></div></article>`).join(''):'<div class="panora-audit-empty">Изменений пока нет</div>';
   rows.forEach((x,i)=>{const el=list.children[i];el.querySelector('.panora-audit-title').textContent=`${x.section} · ${x.action}: ${x.entityLabel}`;el.querySelector('.panora-audit-meta').textContent=`${fmt(x.at)} · ${x.actor} · ${x.source==='remote'?'другое устройство':'это устройство'}`;el.querySelector('.panora-audit-detail').textContent=x.detail});
 }
 window.addEventListener('storage',e=>{if(e.key&&watched[e.key]){diffKey(e.key,e.oldValue||'[]',e.newValue||'[]','remote');shadow[e.key]=e.newValue||'[]'}});
 window.addEventListener('panora:orders-updated',()=>schedule('remote'));
 window.addEventListener('panora:partner-orders-updated',()=>schedule('remote'));
 window.addEventListener('panora:restaurant-sync',()=>schedule('remote'));
 document.addEventListener('input',()=>schedule('local'),true);document.addEventListener('change',()=>schedule('local'),true);document.addEventListener('click',()=>schedule('local'),true);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{initShadow();ui()},{once:true});else{initShadow();ui()}
 window.panoraAudit={list:read,record,scan};
})();
