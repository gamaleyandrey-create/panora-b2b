(function(){
 const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const appName=(document.querySelector('meta[name="application-name"]')?.content||'Panora').trim();
 const appId=/пекарня/i.test(appName)?'bakery':'partner';
 const installedKey='panora-pwa-installed-'+appId;
 const dismissedKey='panora-install-hint-closed-'+appId;
 const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
 let installPrompt=null,banner=null,modal=null,native=null;

 function markInstalled(){
  try{localStorage.setItem(installedKey,'1')}catch{}
 }
 function removeGuide(){
  if(banner?.isConnected)banner.remove();
  if(modal?.isConnected)modal.remove();
  document.body.classList.remove('install-open');
  banner=modal=native=null;
 }
 function renderGuide(){
  if(banner||standalone)return;
  if(localStorage.getItem(dismissedKey))return;
  banner=document.createElement('aside');banner.className='install-banner';banner.innerHTML='<div><strong>'+appName+' на домашнем экране</strong><span>Открывайте приложение одним нажатием.</span></div><button class="install-now" type="button">Установить</button><button class="install-dismiss" type="button" aria-label="Закрыть">×</button>';document.body.appendChild(banner);
  modal=document.createElement('section');modal.className='install-modal';modal.setAttribute('aria-hidden','true');modal.innerHTML=`<div class="install-card"><button class="install-close" type="button" aria-label="Закрыть">×</button><span class="kicker">PANORA</span><h2>Добавить на домашний экран</h2><div class="install-ios"><h3>iPhone или iPad</h3><ol><li>Откройте Panora именно в <strong>Safari</strong>.</li><li>Нажмите кнопку <strong>Поделиться</strong> — квадрат со стрелкой вверх.</li><li>Прокрутите меню и выберите <strong>На экран «Домой»</strong>.</li><li>Нажмите <strong>Добавить</strong>.</li></ol></div><div class="install-android"><h3>Android</h3><ol><li>Откройте Panora в <strong>Chrome</strong>.</li><li>Нажмите меню <strong>⋮</strong> справа сверху.</li><li>Выберите <strong>Установить приложение</strong> или <strong>Добавить на главный экран</strong>.</li><li>Подтвердите установку.</li></ol></div><button class="button button-primary full install-native" type="button">Установить приложение</button></div>`;document.body.appendChild(modal);
  const open=()=>{modal.setAttribute('aria-hidden','false');document.body.classList.add('install-open')};
  const close=()=>{modal.setAttribute('aria-hidden','true');document.body.classList.remove('install-open')};
  banner.querySelector('.install-now').onclick=()=>installPrompt?native.click():open();
  banner.querySelector('.install-dismiss').onclick=()=>{localStorage.setItem(dismissedKey,'1');banner.remove();banner=null};
  modal.querySelector('.install-close').onclick=close;modal.onclick=event=>{if(event.target===modal)close()};
  modal.querySelector('.install-ios').hidden=!ios;modal.querySelector('.install-android').hidden=ios;
  native=modal.querySelector('.install-native');native.hidden=!installPrompt;
  native.onclick=async()=>{if(!installPrompt)return;installPrompt.prompt();const choice=await installPrompt.userChoice;if(choice?.outcome==='accepted')markInstalled();installPrompt=null;close()};
 }

 if(standalone){markInstalled();removeGuide();return}
 if(!localStorage.getItem(installedKey))renderGuide();

 window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  // If the browser says the app is installable again, a stale installed marker
  // (for example after uninstalling the PWA) must not hide the install action.
  try{localStorage.removeItem(installedKey)}catch{}
  installPrompt=event;
  renderGuide();
  if(native)native.hidden=false;
  if(banner)banner.querySelector('.install-now').textContent='Установить';
 });
 window.addEventListener('appinstalled',()=>{markInstalled();installPrompt=null;removeGuide()});
 window.matchMedia('(display-mode: standalone)').addEventListener?.('change',event=>{if(event.matches){markInstalled();removeGuide()}});
})();
