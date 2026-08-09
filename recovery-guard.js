
/* Panora v331 — local recovery snapshots for interrupted/offline editing */
(function(){
  const KEY='panora-recovery-snapshots-v331',MAX=8,MAX_BYTES=1400000;
  let timer=0,lastSignature='';

  const exactKeys=new Set([
    'panora-products','panora-recipes','panora-restaurants','panora-production-plans',
    'panora-orders','panora-shipments','panora-invoices','panora-delivery-notes',
    'panora-payments','panora-bakery-settings'
  ]);

  function relevant(key){
    return exactKeys.has(key) ||
      key.startsWith('panora-form-draft-v3258:') ||
      key.startsWith('panora-cloud-pending-') ||
      key.startsWith('panora-cloud-conflicts-');
  }

  function collect(){
    const data={};
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key||!relevant(key))continue;
      const value=localStorage.getItem(key);
      if(value!=null)data[key]=value;
    }
    return data;
  }

  function signature(data){
    return Object.keys(data).sort().map(key=>`${key}:${data[key].length}:${data[key].slice(0,80)}`).join('|');
  }

  function read(){
    try{const list=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(list)?list:[]}
    catch{return[]}
  }

  function write(list){
    let next=list.slice(0,MAX);
    while(next.length){
      const raw=JSON.stringify(next);
      if(raw.length<=MAX_BYTES){localStorage.setItem(KEY,raw);return}
      next.pop();
    }
  }

  function snapshot(reason='edit'){
    try{
      const data=collect();
      if(!Object.keys(data).length)return null;
      const sig=signature(data);
      if(sig===lastSignature&&reason==='edit')return null;
      lastSignature=sig;
      const item={id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,at:new Date().toISOString(),reason,online:navigator.onLine,data};
      write([item,...read()]);
      window.dispatchEvent(new CustomEvent('panora:recovery-snapshot',{detail:{reason,at:item.at}}));
      return item;
    }catch{return null}
  }

  function schedule(){clearTimeout(timer);timer=setTimeout(()=>snapshot('edit'),700)}

  function restore(id){
    const items=read(),item=items.find(row=>row.id===id)||items[0];
    if(!item)return false;
    Object.entries(item.data||{}).forEach(([key,value])=>{if(relevant(key))localStorage.setItem(key,value)});
    location.reload();
    return true;
  }

  document.addEventListener('input',schedule,true);
  document.addEventListener('change',schedule,true);
  window.addEventListener('offline',()=>snapshot('offline'));
  window.addEventListener('pagehide',()=>snapshot('pagehide'));
  window.addEventListener('beforeunload',()=>snapshot('beforeunload'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)snapshot('background')});

  window.panoraRecovery={
    snapshot,
    list:()=>read().map(({data,...meta})=>({...meta,keys:Object.keys(data||{}).length})),
    restoreLatest:()=>restore(),
    restore
  };
})();
