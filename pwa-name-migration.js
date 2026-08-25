/* Panora 9.99 — installed PWA role/scope migration helper */
(function(){
  const BUILD='9990';
  const isStandalone=window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone===true;
  if(!isStandalone)return;
  const path=(location.pathname||'').toLowerCase();
  const role=(path.includes('/bakery/')||path.includes('admin.html'))?'Пекарня':path.includes('/retail/')||path.includes('retail')?'Розница':path.includes('confirm.html')?'Подтверждение поставки':'Партнёр';
  const expected=`Panora — ${role}`;
  // Existing installed web-app shells (notably macOS/Safari/Chrome) can retain the old app name.
  // The web page cannot rename that native shell. Surface a one-time explicit migration notice.
  const key=`panora-pwa-name-migration-${BUILD}-${role}`;
  try{if(localStorage.getItem(key)==='done')return}catch{}
  window.addEventListener('DOMContentLoaded',()=>{
    if(document.getElementById('panoraPwaNameMigration'))return;
    const box=document.createElement('section');
    box.id='panoraPwaNameMigration';
    box.setAttribute('role','status');
    box.innerHTML=`<div class="panora-pwa-name-card"><strong>Обновлено название приложения</strong><p>Новое имя: <b>${expected}</b>. Версия 9.99 разделяет Партнёра, Пекарню и Розницу по отдельным областям PWA. Если в верхней системной строке всё ещё видно старое имя или имя другой роли, удалите прежнее установленное приложение один раз и установите нужную роль заново.</p><div><button type="button" data-pwa-name-ok>Понятно</button></div></div>`;
    document.body.appendChild(box);
    box.querySelector('[data-pwa-name-ok]')?.addEventListener('click',()=>{try{localStorage.setItem(key,'done')}catch{} box.remove()});
  },{once:true});
})();
