/* Panora 4.3 — stable money editing lock. */
(function(){
  'use strict';
  const SELECTOR='[data-price],[data-custom-price],[data-direct-price],[data-ingredient-price]';
  let activeInput=null;
  window.panoraMoneyEditing={
    get active(){return !!(activeInput&&document.contains(activeInput));},
    get element(){return activeInput&&document.contains(activeInput)?activeInput:null;},
    begin(input){activeInput=input||null;},
    end(input){if(!input||activeInput===input)activeInput=null;}
  };
  document.addEventListener('focusin',event=>{
    const input=event.target.closest?.(SELECTOR);
    if(input)window.panoraMoneyEditing.begin(input);
  },true);
  document.addEventListener('focusout',event=>{
    const input=event.target.closest?.(SELECTOR);
    if(!input)return;
    setTimeout(()=>window.panoraMoneyEditing.end(input),0);
  },true);
})();
