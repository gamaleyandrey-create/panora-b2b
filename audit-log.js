(()=>{
  const KEY='panora-audit-log-v1',MAX=250;
  const labels={
    'shipment.completed':'Отгрузка и накладная созданы',
    'shipment.duplicate_prevented':'Повторная отгрузка предотвращена',
    'shipment.failed':'Ошибка отгрузки',
    'sync.failed':'Ошибка синхронизации',
    'sync.restored':'Связь с облаком восстановлена'
  };
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function read(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
  function render(){
    const root=document.querySelector('#auditLogList');if(!root)return;
    const entries=read();
    root.innerHTML=entries.length?entries.map(entry=>`
      <article class="audit-entry audit-${esc(entry.level||'info')}">
        <div><strong>${esc(labels[entry.action]||entry.action)}</strong>${entry.details?`<p>${esc(entry.details)}</p>`:''}</div>
        <time datetime="${esc(entry.at)}">${esc(new Date(entry.at).toLocaleString('ru-RU'))}</time>
      </article>`).join(''):'<p class="audit-empty">Действий пока нет.</p>';
  }
  function record(action,details='',level='info'){
    const entries=read();
    entries.unshift({id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,at:new Date().toISOString(),action,level,details,actor:window.panoraSupabaseSession?.user?.email||''});
    localStorage.setItem(KEY,JSON.stringify(entries.slice(0,MAX)));render();
  }
  function clear(){if(confirm('Очистить журнал действий на этом устройстве?')){localStorage.removeItem(KEY);render()}}
  function init(){document.querySelector('#auditLogClear')?.addEventListener('click',clear);render()}
  window.panoraAudit={record,read,clear,render};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
