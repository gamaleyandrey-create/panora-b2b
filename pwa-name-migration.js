/* Panora 10.00 — installed PWA role/scope migration helper */
(function(){
  const BUILD='10000';
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
    box.innerHTML=`<div class="panora-pwa-name-card"><strong>Panora 10.00</strong><p>Эта роль работает как отдельное приложение: <b>${expected}</b>. У Партнёра, Пекарни и Розницы теперь собственные адрес, manifest и service worker.</p><div><button type="button" data-pwa-name-ok>Понятно</button></div></div>`;
    document.body.appendChild(box);
    box.querySelector('[data-pwa-name-ok]')?.addEventListener('click',()=>{try{localStorage.setItem(key,'done')}catch{} box.remove()});
  },{once:true});
})();
