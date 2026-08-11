/* Panora 4.2 — stable money input helpers. */
window.panoraParseDecimal = window.panoraParseDecimal || function(value){
  const normalized=String(value??'').trim().replace(/\s+/g,'').replace(',','.');
  if(normalized==='') return null;
  const number=Number(normalized);
  return Number.isFinite(number)?Math.max(0,number):null;
};
window.panoraFormatDecimal = window.panoraFormatDecimal || function(value,digits=2){
  return Number(value||0).toFixed(digits);
};
document.addEventListener('keydown',event=>{
  const input=event.target.closest?.('[data-price],[data-custom-price],[data-ingredient-price]');
  if(input && event.key==='Enter'){
    event.preventDefault();
    input.blur();
  }
});
