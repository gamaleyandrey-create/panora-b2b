(()=>{
  const KEY='panora-audit-log-v1',CLOUD_KEY='panora-audit-cloud-v1',MAX=250;
  const labels={
    'shipment.completed':'Отгрузка и накладная созданы',
    'shipment.recovered':'Отгрузка восстановлена после сбоя связи',
    'shipment.duplicate_prevented':'Повторная отгрузка предотвращена',
    'shipment.failed':'Ошибка отгрузки',
    'order.created':'Создан новый заказ',
    'order.status_changed':'Изменён статус заказа',
    'delivery_note.created':'Создана накладная',
    'delivery_note.confirmed':'Ресторан подтвердил поставку',
    'payment.created':'Добавлена оплата',
    'payment.status_changed':'Изменён статус оплаты',
    'sync.failed':'Ошибка синхронизации',
    'sync.restored':'Связь с облаком восстановлена'
  };
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function readStore(key){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return[]}}
  function read(){
    const unique=new Map();
    [...readStore(KEY),...readStore(CLOUD_KEY)].forEach(entry=>unique.set(entry.id,entry));
    return [...unique.values()].sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,MAX);
  }
  function cloudDetails(row){
    const data=row.payload||{},parts=[];
    if(data.order_number!=null)parts.push(`PN-${String(data.order_number).padStart(4,'0')}`);
    if(data.note_number!=null)parts.push(`накладная №${data.note_number}`);
    if(data.status)parts.push(`статус: ${data.status}`);
    if(data.amount!=null)parts.push(`сумма: ${Number(data.amount).toFixed(2)} €`);
    return parts.join(' · ');
  }
  function mergeCloud(rows=[]){
    const entries=rows.map(row=>({
      id:`cloud:${row.id}`,
      at:row.created_at,
      action:row.event_type,
      level:/failed|cancel/i.test(row.event_type||'')?'error':/recover|confirm/i.test(row.event_type||'')?'warning':'info',
      details:cloudDetails(row),
      actor:''
    }));
    localStorage.setItem(CLOUD_KEY,JSON.stringify(entries.slice(0,MAX)));
    render();
  }
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
    const entries=readStore(KEY);
    entries.unshift({id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,at:new Date().toISOString(),action,level,details,actor:window.panoraSupabaseSession?.user?.email||''});
    localStorage.setItem(KEY,JSON.stringify(entries.slice(0,MAX)));render();
  }
  function clear(){if(confirm('Очистить локальные записи? Серверная история останется.')){localStorage.removeItem(KEY);render()}}
  function init(){document.querySelector('#auditLogClear')?.addEventListener('click',clear);render()}
  window.panoraAudit={record,read,clear,render,mergeCloud};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
