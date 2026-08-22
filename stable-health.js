/* Panora 9.79 — production runtime health. */
(function(){
 async function run(){
   const out={build:'9830',online:navigator.onLine,serviceWorker:'serviceWorker' in navigator,fetch:typeof fetch==='function',storage:false};
   try{const k='panora-health-v9830';localStorage.setItem(k,'1');out.storage=localStorage.getItem(k)==='1';localStorage.removeItem(k)}catch{}
   window.panoraStableHealth=out;
   window.dispatchEvent(new CustomEvent('panora:stable-health',{detail:out}));
   return out;
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
 window.panoraRunHealthCheck=run;
})();
