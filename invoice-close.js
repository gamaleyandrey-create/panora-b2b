/* Add a reliable exit to every invoice opened in a new browser tab. */
(function(){
 const nativeOpen=window.open.bind(window);
 window.open=function(...args){
  const child=nativeOpen(...args);if(!child)return child;
  setTimeout(()=>{try{
   if(!child.document?.body||child.document.querySelector('[data-panora-invoice-close]'))return;
   const style=child.document.createElement('style');style.textContent='.panora-invoice-close{position:fixed;top:14px;right:14px;z-index:9999;width:50px;height:50px;border:0;border-radius:50%;background:#31543e;color:#fff;font:32px/1 Arial;cursor:pointer;box-shadow:0 5px 16px #0002}.panora-invoice-back{position:fixed;top:18px;left:14px;z-index:9999;padding:10px 14px;border-radius:12px;background:#fff;color:#31543e;border:1px solid #31543e;font:700 14px Arial;cursor:pointer}@media print{.panora-invoice-close,.panora-invoice-back{display:none!important}}';child.document.head.appendChild(style);
   const close=()=>{child.close();setTimeout(()=>{try{if(!child.closed)child.history.back()}catch{}},80)};
   const cross=child.document.createElement('button');cross.type='button';cross.className='panora-invoice-close';cross.dataset.panoraInvoiceClose='';cross.setAttribute('aria-label','Закрыть накладную');cross.textContent='×';cross.onclick=close;
   const back=child.document.createElement('button');back.type='button';back.className='panora-invoice-back';back.textContent='← Назад';back.onclick=close;child.document.body.prepend(back,cross);
  }catch{}},120);return child
 };
})();
