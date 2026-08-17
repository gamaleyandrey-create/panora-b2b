/* Professional recipe editor: baker's percentages with total flour = 100%. */
(()=>{
  const words={
    ru:{weight:'Вес готового изделия',flour:'Мука',ingredient:'Ингредиент',amount:'Количество',percent:'Пекарский %',unit:'Ед.',add:'+ Добавить ингредиент',save:'Сохранить рецептуру и карту',saving:'Сохранение…',saved:'Рецептура и карта сохранены в облаке',localSaved:'Сохранено на устройстве. Облако недоступно.',help:'Вся мука вместе принимается за 100%. Остальные ингредиенты можно менять в количестве или пекарских процентах.',noFlour:'Добавьте ингредиент с названием «мука» и единицей g — без него проценты рассчитать нельзя.',delete:'Удалить ингредиент?',stock:'Остаток и запас учитываются в разделе «Закупка».',dough:'Вес теста на 1 хлеб',formula:'Сумма формулы',loss:'Потери при выпечке',yield:'Выход изделия',hydration:'Гидратация',cost:'Себестоимость 1 хлеба',approx:'Для жидкостей используется технологическое приближение 1 ml ≈ 1 g.',batch:'Текущая партия',pieces:'шт.',batchEmpty:'Нет запланированной выпечки',invalidMass:'Вес готового хлеба больше массы замеса. Проверьте ингредиенты или вес изделия.',missingWater:'В рецептуре не найдена вода.',missingSalt:'В рецептуре не найдена соль.',saltRange:'Соль обычно составляет 1–3% от массы муки. Проверьте значение.',priceHint:'Заполните цены ингредиентов в разделе «Закупка», чтобы увидеть себестоимость.',tech:'Технологическая карта',mix:'Замес и порядок внесения',fermentation:'Брожение, мин',proof:'Расстойка, мин',bakeTemp:'Температура, °C',bakeTime:'Выпечка, мин',steps:'Этапы приготовления',notes:'Примечания пекаря',print:'Печать / PDF',printTitle:'Технологическая карта',edit:'Редактировать',cancelEdit:'Отменить',lockReady:'Редактирование защищено',lockBusy:'Редактируется на другом устройстве',lockNeed:'Нажмите «Редактировать», чтобы получить безопасную блокировку',lockOnline:'Для редактирования требуется интернет',saveError:'Не сохранено в облако',semi:'Полуфабрикат',semiToggle:'Производится из сырья',semiSource:'Исходное сырьё',semiYield:'Выход готового продукта, %',semiHelp:'Например: 60% означает, что из 1 кг сырья получается 0,60 кг полуфабриката.',purchasePrice:'Закупочная цена',sourcePrice:'Цена исходного сырья',priceMissing:'Цена не указана',priceSaved:'Цена сохранена',priceOne:'Единая цена для рецептур, закупки и склада'},
    en:{weight:'Finished product weight',flour:'Flour',ingredient:'Ingredient',amount:'Amount',percent:"Baker's %",unit:'Unit',add:'+ Add ingredient',save:'Save recipe',saving:'Saving…',saved:'Recipe saved to cloud',localSaved:'Saved on this device. Cloud is unavailable.',help:"All flour combined is 100%. Other ingredients can be edited by amount or baker's percentage.",noFlour:'Add an ingredient named “flour” with unit g to calculate percentages.',delete:'Delete ingredient?',stock:'Stock and safety margin are used in Purchasing.',dough:'Dough weight per loaf',formula:'Total formula',loss:'Baking loss',yield:'Product yield',hydration:'Hydration',cost:'Cost per loaf',approx:'Liquids use the technological approximation 1 ml ≈ 1 g.',batch:'Current batch',pieces:'pcs',batchEmpty:'No bake is planned',invalidMass:'Finished bread weight exceeds dough weight. Check the ingredients or product weight.',missingWater:'No water was found in the recipe.',missingSalt:'No salt was found in the recipe.',saltRange:'Salt is usually 1–3% of total flour. Check the amount.',priceHint:'Enter ingredient prices in Purchasing to calculate the cost.',edit:'Edit',cancelEdit:'Cancel',lockReady:'Protected editing active',lockBusy:'Being edited on another device',lockNeed:'Click Edit to acquire a safe lock',lockOnline:'Internet connection is required to edit',saveError:'Not saved to cloud',semi:'Semi-finished',semiToggle:'Made from raw material',semiSource:'Raw material',semiYield:'Finished yield, %',semiHelp:'Example: 60% means 1 kg of raw material yields 0.60 kg of semi-finished product.',purchasePrice:'Purchase price',sourcePrice:'Source raw material price',priceMissing:'Price not set',priceSaved:'Price saved',priceOne:'One price for recipes, purchasing and stock'},
    es:{weight:'Peso del producto terminado',flour:'Harina',ingredient:'Ingrediente',amount:'Cantidad',percent:'% panadero',unit:'Ud.',add:'+ Añadir ingrediente',save:'Guardar receta',saving:'Guardando…',saved:'Receta guardada en la nube',localSaved:'Guardado en este dispositivo. La nube no está disponible.',help:'Toda la harina combinada representa el 100 %. Los demás ingredientes se pueden editar por cantidad o porcentaje panadero.',noFlour:'Añada un ingrediente llamado “harina” con unidad g para calcular porcentajes.',delete:'¿Eliminar ingrediente?',stock:'Las existencias y el margen se usan en Compras.',dough:'Peso de masa por pan',formula:'Fórmula total',loss:'Merma de horneado',yield:'Rendimiento del producto',hydration:'Hidratación',cost:'Coste por pan',approx:'Para líquidos se usa la aproximación tecnológica 1 ml ≈ 1 g.',batch:'Lote actual',pieces:'uds.',batchEmpty:'No hay horneado planificado',invalidMass:'El peso del pan terminado supera el peso de la masa. Revise los ingredientes o el peso del producto.',missingWater:'No se ha encontrado agua en la receta.',missingSalt:'No se ha encontrado sal en la receta.',saltRange:'La sal suele ser el 1–3% de la harina total. Revise la cantidad.',priceHint:'Introduzca los precios en Compras para calcular el coste.',edit:'Editar',cancelEdit:'Cancelar',lockReady:'Edición protegida activa',lockBusy:'Se está editando en otro dispositivo',lockNeed:'Pulse Editar para obtener un bloqueo seguro',lockOnline:'Se requiere internet para editar',saveError:'No guardado en la nube',semi:'Semielaborado',semiToggle:'Se produce a partir de materia prima',semiSource:'Materia prima',semiYield:'Rendimiento final, %',semiHelp:'Ejemplo: 60% significa que 1 kg de materia prima produce 0,60 kg de producto.',purchasePrice:'Precio de compra',sourcePrice:'Precio de materia prima',priceMissing:'Precio no indicado',priceSaved:'Precio guardado',priceOne:'Un solo precio para recetas, compras y stock'}
  };
  const L=()=>({...words.ru,...words[typeof lang==='string'&&words[lang]?lang:'ru']});
  const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const normalizeText=value=>String(value??'').normalize('NFKC').trim().toLocaleLowerCase();
  const flourName=name=>{
    const value=normalizeText(name).replace(/[\u00a0\s]+/g,' ');
    return /(^|[^\p{L}])(мук|муки|мучн|пшенич|ржан|гречнев|овсян|полб|flour|wheat|rye|spelt|oat|buckwheat|harina|trigo|centeno|espelta|avena|farina|farine)/iu.test(value);
  };
  const gramUnit=unit=>normalizeText(unit).replace(/[.\s]/g,'')==='g';
  const named=(name,pattern)=>pattern.test(normalizeText(name));
  const waterName=name=>named(name,/(^|\s)(вода|воды|water|agua)(\s|$)/iu);
  const saltName=name=>named(name,/(^|\s)(соль|соли|salt|sal)(\s|$)/iu);
  const numeric=value=>Number(String(value??'').replace(',','.').trim())||0;
  const round=(value,digits=2)=>{const p=10**digits;return Math.round((Number(value)||0)*p)/p};
  const display=value=>String(round(value,2)).replace('.',',');
  const costKey=(name,unit)=>`${String(name||'').normalize('NFKC').trim().toLocaleLowerCase('ru-RU').replace(/ё/g,'е').replace(/[‐‑‒–—]/g,'-').replace(/\s+/g,' ')}|${String(unit||'').trim().toLowerCase()}`;
  const ingredientPrice=(prices,name,unit)=>Number(prices[costKey(name,unit)] ?? prices[`${name}|${unit}`] ?? 0);
  const priceUnitLabel=unit=>unit==='g'?'€/кг':unit==='ml'?'€/л':'€/шт.';
  const readIngredientPrices=()=>window.panoraIngredientCosts?.read?.()||(()=>{try{return JSON.parse(localStorage.getItem('panora-ingredient-costs')||'{}')||{}}catch{return{}}})();
  const saveIngredientPrice=(name,unit,value)=>{
    if(!String(name||'').trim())return 0;
    if(window.panoraIngredientCosts?.set)return window.panoraIngredientCosts.set(name,unit,value);
    const prices=readIngredientPrices(),key=costKey(name,unit),price=Math.max(0,Number(value)||0);
    prices[key]=price;
    localStorage.setItem('panora-ingredient-costs',JSON.stringify(prices));
    window.panoraCloud?.queueIngredientCosts?.();
    window.dispatchEvent(new CustomEvent('panora:ingredient-costs-changed'));
    return price;
  };
  function rowPriceTarget(row){
    const semi=row.querySelector('[data-role="sourceEnabled"]')?.checked;
    const sourceName=row.querySelector('[data-role="sourceName"]')?.value.trim()||'';
    const sourceUnit=row.querySelector('[data-role="sourceUnit"]')?.value||'g';
    if(semi)return {name:sourceName,unit:sourceUnit,source:true};
    return {name:row.querySelector('[data-role="name"]')?.value.trim()||'',unit:row.querySelector('[data-role="unit"]')?.value||'g',source:false};
  }
  function refreshRowPrice(row){
    const target=rowPriceTarget(row),input=row.querySelector('[data-role="purchasePrice"]'),label=row.querySelector('[data-role="priceLabel"]'),state=row.querySelector('[data-role="priceState"]');
    if(!input||!label||!state)return;
    label.textContent=target.source?L().sourcePrice:L().purchasePrice;
    input.dataset.priceName=target.name;
    input.dataset.priceUnit=target.unit;
    const price=target.name?ingredientPrice(readIngredientPrices(),target.name,target.unit):0;
    if(document.activeElement!==input)input.value=price>0?price.toFixed(2):'';
    row.querySelector('[data-role="priceUnit"]').textContent=priceUnitLabel(target.unit);
    state.textContent=target.name?(price>0?L().priceOne:L().priceMissing):(target.source?L().semiSource:L().ingredient);
    state.classList.toggle('missing',Boolean(target.name)&&price<=0);
  }
  const rowCostPerRecipe=(item,prices)=>{
    const qty=Math.max(0,Number(item?.qty||0)),unit=item?.unit||'g',baseFactor=(unit==='g'||unit==='ml')?1000:1;
    if(!qty)return {cost:0,priced:true};
    const source=String(item?.sourceIngredientName||'').trim(),yieldPct=Number(item?.sourceYieldPct||0),sourceUnit=item?.sourceUnit||unit;
    if(source&&yieldPct>0){
      const sourcePrice=ingredientPrice(prices,source,sourceUnit);
      const sourceQty=qty/(yieldPct/100);
      const sourceFactor=(sourceUnit==='g'||sourceUnit==='ml')?1000:1;
      return {cost:sourcePrice>0?sourceQty/sourceFactor*sourcePrice:0,priced:sourcePrice>0};
    }
    const price=ingredientPrice(prices,item?.name||'',unit);
    return {cost:price>0?qty/baseFactor*price:0,priced:price>0};
  };
  const localToday=()=>{const d=new Date(),pad=v=>String(v).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
  const productionPieces=pid=>typeof plans==='undefined'?0:plans.filter(plan=>plan.product===pid&&plan.bakeDate>=localToday()).reduce((sum,plan)=>sum+Math.max(Number(plan.planned)||0,Number(plan.ordered)||0),0);
  const flourTotal=card=>[...card.querySelectorAll('.recipe-percent-row')].reduce((sum,row)=>{
    const name=row.querySelector('[data-role="name"]')?.value||'';
    const unit=row.querySelector('[data-role="unit"]')?.value||'';
    const qty=numeric(row.querySelector('[data-role="qty"]')?.value);
    return sum+(gramUnit(unit)&&flourName(name)?qty:0);
  },0);
  function updateCard(card,preservePercent=null){
    const total=flourTotal(card), warning=card.querySelector('.recipe-warning');
    card.querySelector('[data-flour-total]').textContent=`${L().flour}: ${total?'100':'0'}%${total?` · ${display(total)} g`:''}`;
    warning.hidden=total>0;
    card.querySelectorAll('.recipe-percent-row').forEach(row=>{
      const pct=row.querySelector('[data-role="percent"]'),qty=numeric(row.querySelector('[data-role="qty"]').value);
      const unit=row.querySelector('[data-role="unit"]').value,isBase=gramUnit(unit)&&flourName(row.querySelector('[data-role="name"]').value);
      pct.readOnly=!total||unit==='pcs'||isBase;
      pct.title=isBase?L().flour:'';
      if(pct!==preservePercent)pct.value=total&&unit!=='pcs'?display(qty/total*100):'';
    });
    const dough=[...card.querySelectorAll('.recipe-percent-row')].reduce((sum,row)=>{
      const unit=row.querySelector('[data-role="unit"]')?.value;
      const qty=numeric(row.querySelector('[data-role="qty"]')?.value);
      return sum+(unit==='g'||unit==='ml'?qty:0);
    },0);
    const finished=Math.max(0,numeric(card.querySelector('[data-recipe-weight]')?.value));
    const formula=total?dough/total*100:0;
    const loss=dough?Math.max(0,(dough-finished)/dough*100):0;
    const productYield=dough?finished/dough*100:0;
    const rows=[...card.querySelectorAll('.recipe-percent-row')];
    const water=rows.reduce((sum,row)=>sum+(waterName(row.querySelector('[data-role="name"]')?.value||'')?numeric(row.querySelector('[data-role="qty"]')?.value):0),0);
    const salt=rows.reduce((sum,row)=>sum+(saltName(row.querySelector('[data-role="name"]')?.value||'')?numeric(row.querySelector('[data-role="qty"]')?.value):0),0);
    const hydration=total?water/total*100:0,saltPercent=total?salt/total*100:0;
    let prices={};try{prices=JSON.parse(localStorage.getItem('panora-ingredient-costs')||'{}')||{}}catch{}
    let recipeCost=0,priced=0,costable=0;
    const pid=card.dataset.recipeCard,stored=recipes[pid]||[];
    rows.forEach((row,index)=>{const item={...(stored[index]||{}),name:row.querySelector('[data-role="name"]')?.value||'',unit:row.querySelector('[data-role="unit"]')?.value||'g',qty:numeric(row.querySelector('[data-role="qty"]')?.value)};if(item.qty>0){costable++;const result=rowCostPerRecipe(item,prices);if(result.priced){priced++;recipeCost+=result.cost}}});
    const set=(name,value)=>{const el=card.querySelector(`[data-tech-stat="${name}"]`);if(el)el.textContent=value};
    set('dough',`${display(dough)} g`);
    set('formula',total?`${display(formula)}%`:'—');
    set('loss',dough?`${display(loss)}%`:'—');
    set('yield',dough?`${display(productYield)}%`:'—');
    set('hydration',total?`${display(hydration)}%`:'—');
    set('cost',priced?`${display(recipeCost)} €`:'—');
    const massWarning=card.querySelector('.recipe-mass-warning');
    if(massWarning)massWarning.hidden=!dough||finished<=dough;
    const waterWarning=card.querySelector('[data-warning="water"]');if(waterWarning)waterWarning.hidden=!total||water>0;
    const saltWarning=card.querySelector('[data-warning="salt"]');if(saltWarning)saltWarning.hidden=!total||salt>0;
    const saltRangeWarning=card.querySelector('[data-warning="salt-range"]');if(saltRangeWarning)saltRangeWarning.hidden=!total||!salt||saltPercent>=1&&saltPercent<=3;
    const costHint=card.querySelector('[data-warning="cost"]');if(costHint)costHint.hidden=!costable||priced===costable;
    const pieces=productionPieces(card.dataset.recipeCard),batch=card.querySelector('[data-recipe-batch]');
    if(batch)batch.innerHTML=pieces?`<strong>${L().batch}: ${display(pieces)} ${L().pieces}</strong><span>${[...card.querySelectorAll('.recipe-percent-row')].map(row=>{const name=esc(row.querySelector('[data-role="name"]').value),qty=numeric(row.querySelector('[data-role="qty"]').value),unit=esc(row.querySelector('[data-role="unit"]').value);return `${name}: <b>${display(qty*pieces)} ${unit}</b>`}).join(' · ')}</span>`:`<strong>${L().batch}</strong><span>${L().batchEmpty}</span>`;
    card.querySelectorAll('.recipe-percent-row').forEach(refreshRowPrice);
  }
  function saveWeight(pid,value){
    const product=typeof recipeProduct==='function'?recipeProduct(pid):null;if(!product)return;
    product.weight=Math.max(1,Math.round(Number(value)||1));
    if(typeof saveProducts==='function')saveProducts();
    else{const all=JSON.parse(localStorage.getItem('panora-products')||'[]'),saved=all.find(p=>p.id===product.id);if(saved){saved.weight=product.weight;if(window.panoraPersistProductsCache)window.panoraPersistProductsCache(all);else localStorage.setItem('panora-products',JSON.stringify(all));window.panoraCloud?.queueProducts?.()}}
  }
  function setCardEditMode(card,enabled,message=''){
    // v325.1: do not freeze the whole recipe card while waiting for a server lock.
    // Users may prepare a local draft at any time; the exclusive server lock and
    // revision check are mandatory at SAVE time, so stale data still cannot overwrite
    // a newer technology card from another device.
    card.dataset.techEdit=enabled?'true':'draft';
    card.querySelectorAll('input,select,textarea').forEach(el=>{el.disabled=false});
    card.querySelectorAll('[data-delete-ingredient],[data-add-ingredient],.recipe-save').forEach(el=>el.disabled=false);
    const edit=card.querySelector('[data-tech-edit]'),cancel=card.querySelector('[data-tech-cancel]');
    if(edit)edit.hidden=enabled;if(cancel)cancel.hidden=!enabled;
    const state=card.querySelector('[data-tech-lock-state]');if(state)state.textContent=message||(enabled?L().lockReady:L().lockNeed);
  }
  async function beginProtectedEdit(card){
    const pid=card.dataset.recipeCard,state=card.querySelector('[data-tech-lock-state]'),edit=card.querySelector('[data-tech-edit]');
    if(!navigator.onLine||!window.panoraCloud?.ready){if(state)state.textContent=L().lockOnline;return}
    if(edit)edit.disabled=true;if(state)state.textContent=L().saving;
    try{await window.panoraCloud.acquireTechCardLock(pid);setCardEditMode(card,true,L().lockReady);card.querySelector('input:not([data-product-active]),textarea,select')?.focus()}
    catch(error){console.warn('Panora tech-card lock',error);setCardEditMode(card,false,/другом устройстве|another device|otro dispositivo/i.test(String(error?.message||error))?L().lockBusy:String(error?.message||error))}
    finally{if(edit)edit.disabled=false}
  }
  async function cancelProtectedEdit(card){
    const pid=card.dataset.recipeCard;await window.panoraCloud?.releaseTechCardLock?.(pid);professionalRender(true);
  }
  async function saveCard(card){
    const pid=card.dataset.recipeCard,status=card.querySelector('.recipe-save-status');
    // Acquire the exclusive lock just before saving. This keeps the editor usable even
    // before a lock is held, while the server remains the final authority for writes.
    if(!window.panoraCloud?.hasTechCardLock?.(pid)){
      if(!navigator.onLine||!window.panoraCloud?.ready){status.textContent=L().lockOnline;return}
      status.textContent=L().saving;
      try{await window.panoraCloud.acquireTechCardLock(pid);setCardEditMode(card,true,L().lockReady)}
      catch(error){console.warn('Panora tech-card save lock',error);status.textContent='⚠ '+(error?.message||L().saveError);return}
    }
    const previous=recipes[pid]||[];
    recipes[pid]=[...card.querySelectorAll('.recipe-percent-row')].map((row,index)=>({
      name:row.querySelector('[data-role="name"]').value.trim()||L().ingredient,
      qty:Math.max(0,round(numeric(row.querySelector('[data-role="qty"]').value),3)),
      unit:row.querySelector('[data-role="unit"]').value,
      stock:Number(previous[index]?.stock)||0,
      margin:Number(previous[index]?.margin??5)||0,
      sourceIngredientName:row.querySelector('[data-role="sourceEnabled"]')?.checked ? (row.querySelector('[data-role="sourceName"]')?.value.trim()||'') : '',
      sourceUnit:row.querySelector('[data-role="sourceUnit"]')?.value||'g',
      sourceYieldPct:row.querySelector('[data-role="sourceEnabled"]')?.checked ? Math.max(0,round(numeric(row.querySelector('[data-role="sourceYield"]')?.value),2)) : 0
    }));
    saveWeight(pid,card.querySelector('[data-recipe-weight]').value);
    const product=typeof recipeProduct==='function'?recipeProduct(pid):null;
    if(product)product.techCard={mix:card.querySelector('[data-tech="mix"]')?.value.trim()||'',fermentation:Math.max(0,numeric(card.querySelector('[data-tech="fermentation"]')?.value)),proof:Math.max(0,numeric(card.querySelector('[data-tech="proof"]')?.value)),bakeTemp:Math.max(0,numeric(card.querySelector('[data-tech="bakeTemp"]')?.value)),bakeTime:Math.max(0,numeric(card.querySelector('[data-tech="bakeTime"]')?.value)),steps:card.querySelector('[data-tech="steps"]')?.value.trim()||'',notes:card.querySelector('[data-tech="notes"]')?.value.trim()||''};
    store('panora-recipes',recipes);if(typeof renderPurchase==='function')renderPurchase();
    status.textContent=L().saving;
    try{
      if(navigator.onLine&&window.panoraCloud?.ready&&window.panoraCloud?.flushRecipes&&window.panoraCloud?.saveProductTechCardConfirmed){
        await Promise.all([window.panoraCloud.flushRecipes(),window.panoraCloud.saveProductTechCardConfirmed(pid,product?.techCard||{})]);
        await window.panoraFormDrafts?.confirmSaved?.(card);
        window.panoraPersistProductsCache?.(typeof productRegistry!=='undefined'?productRegistry:JSON.parse(localStorage.getItem('panora-products')||'[]'));
        status.textContent='✓ '+L().saved;setCardEditMode(card,false,L().lockNeed)
      }
      else status.textContent=L().saveError;
    }
    catch(error){console.error('Panora recipe save',error);status.textContent='⚠ '+(error?.message||L().saveError)}
    setTimeout(()=>{if(status)status.textContent=''},3500);
    updateCard(card);
  }
  function printCard(card){
    const pid=card.dataset.recipeCard,title=esc(productName(pid)),tech={mix:card.querySelector('[data-tech="mix"]')?.value||'',fermentation:card.querySelector('[data-tech="fermentation"]')?.value||'',proof:card.querySelector('[data-tech="proof"]')?.value||'',bakeTemp:card.querySelector('[data-tech="bakeTemp"]')?.value||'',bakeTime:card.querySelector('[data-tech="bakeTime"]')?.value||'',steps:card.querySelector('[data-tech="steps"]')?.value||'',notes:card.querySelector('[data-tech="notes"]')?.value||''},rows=[...card.querySelectorAll('.recipe-percent-row')].map(row=>`<tr><td>${esc(row.querySelector('[data-role="name"]').value)}</td><td>${esc(row.querySelector('[data-role="qty"]').value)} ${esc(row.querySelector('[data-role="unit"]').value)}</td><td>${esc(row.querySelector('[data-role="percent"]').value||'—')}%</td></tr>`).join('');
    const value=(label,v,unit='')=>`<div><b>${esc(label)}:</b> ${esc(v||'—')}${v&&unit?' '+unit:''}</div>`,win=open('','_blank','noopener,noreferrer');if(!win)return;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(L().printTitle)} — ${title}</title><style>body{font:15px Arial;color:#17251d;max-width:900px;margin:32px auto;padding:0 24px}h1{margin-bottom:4px}h2{margin-top:28px;border-bottom:2px solid #24382c;padding-bottom:7px}table{width:100%;border-collapse:collapse}th,td{padding:9px;border-bottom:1px solid #bbb;text-align:left}.meta{display:grid;grid-template-columns:repeat(2,1fr);gap:8px 24px}.text{white-space:pre-wrap;line-height:1.5}@media print{body{margin:0;max-width:none}}</style></head><body><h1>${title}</h1><p>${esc(L().printTitle)}</p><div class="meta">${value(L().weight,card.querySelector('[data-recipe-weight]').value,'g')}${value(L().fermentation,tech.fermentation,'мин')}${value(L().proof,tech.proof,'мин')}${value(L().bakeTemp,tech.bakeTemp,'°C')}${value(L().bakeTime,tech.bakeTime,'мин')}</div><h2>${esc(L().ingredient)}</h2><table><thead><tr><th>${esc(L().ingredient)}</th><th>${esc(L().amount)}</th><th>${esc(L().percent)}</th></tr></thead><tbody>${rows}</tbody></table><h2>${esc(L().mix)}</h2><div class="text">${esc(tech.mix||'—')}</div><h2>${esc(L().steps)}</h2><div class="text">${esc(tech.steps||'—')}</div><h2>${esc(L().notes)}</h2><div class="text">${esc(tech.notes||'—')}</div><script>onload=()=>setTimeout(()=>print(),150)<\/script></body></html>`);win.document.close();
  }
  function rowHtml(pid,item,index,total){
    const unit=item.unit||'g',qty=numeric(item.qty),isBase=gramUnit(unit)&&flourName(item.name),percent=total&&unit!=='pcs'?display(qty/total*100):'';
    const source=String(item.sourceIngredientName||''),sourceUnit=item.sourceUnit||'g',yieldPct=Number(item.sourceYieldPct||0),isSemi=Boolean(source&&yieldPct>0);
    return `<div class="recipe-row recipe-percent-row${isSemi?' is-semi':''}" data-row-id="${esc(pid)}:${index}" data-index="${index}">
      <label class="recipe-field recipe-field-name"><small>${L().ingredient}</small><input data-role="name" data-draft-key="name" value="${esc(item.name)}" aria-label="${L().ingredient}"></label>
      <label class="recipe-field"><small>${L().amount}</small><input data-role="qty" data-draft-key="qty" type="text" inputmode="decimal" value="${Number(item.qty)||0}" aria-label="${L().amount}"></label>
      <label class="recipe-field recipe-percent-suffix"><small>${L().percent}</small><input data-role="percent" data-draft-key="percent" type="text" inputmode="decimal" value="${percent}" ${!total||unit==='pcs'||isBase?'readonly':''} aria-label="${L().percent}"></label>
      <label class="recipe-field recipe-unit-field"><small>${L().unit}</small><select data-role="unit" data-draft-key="unit" aria-label="${L().unit}"><option ${item.unit==='g'?'selected':''}>g</option><option ${item.unit==='ml'?'selected':''}>ml</option><option ${item.unit==='pcs'?'selected':''}>pcs</option></select></label>
      <button class="recipe-delete" data-delete-ingredient="${pid}:${index}" type="button" aria-label="${L().delete}">×</button>

      <section class="recipe-price-settings">
        <div class="recipe-price-copy"><strong data-role="priceLabel">${L().purchasePrice}</strong><small data-role="priceState">${L().priceMissing}</small></div>
        <label class="recipe-price-input"><input data-role="purchasePrice" data-panora-no-draft="1" data-direct-price="1" type="text" inputmode="decimal" autocomplete="off" placeholder="0,00"><span data-role="priceUnit">${priceUnitLabel(unit)}</span></label>
      </section>

      <section class="recipe-semi-settings">
        <label class="recipe-semi-toggle">
          <input type="checkbox" data-role="sourceEnabled" ${isSemi?'checked':''}>
          <span><strong>${L().semiToggle}</strong><small>${lang==='ru'?'Включите для пюре, закваски, сиропа и других заготовок':lang==='es'?'Para puré, masa madre, jarabe y otras preparaciones':'For purée, starter, syrup and other preparations'}</small></span>
        </label>
        <div class="recipe-semi-fields" ${isSemi?'':'hidden'}>
          <label><span>${L().semiSource}</span><input data-role="sourceName" value="${esc(source)}" placeholder="${lang==='ru'?'Например: Тыква свежая':lang==='es'?'Ej.: Calabaza fresca':'e.g. Fresh pumpkin'}"></label>
          <label><span>${L().unit}</span><select data-role="sourceUnit"><option ${sourceUnit==='g'?'selected':''}>g</option><option ${sourceUnit==='ml'?'selected':''}>ml</option><option ${sourceUnit==='pcs'?'selected':''}>pcs</option></select></label>
          <label><span>${L().semiYield}</span><input data-role="sourceYield" type="text" inputmode="decimal" value="${yieldPct||''}" placeholder="60"></label>
          <small class="recipe-semi-example">${lang==='ru'?'Пример: для «Пюре тыквенное» укажите «Тыква свежая» и 60%. Если нужно 3,55 кг пюре, Panora рассчитает 5,92 кг свежей тыквы до учёта остатка готового пюре.':lang==='es'?'Ejemplo: para puré de calabaza indique calabaza fresca y 60%.':'Example: for pumpkin purée set Fresh pumpkin and 60% yield.'}</small>
        </div>
      </section>
    </div>`
  }
  function professionalRender(force=false){
    const root=document.querySelector('#recipeList');if(!root)return;
    // Background order/plan refreshes call renderAll(). Never replace the recipe
    // inputs while the mobile keyboard is open: doing so removes the focused
    // element and makes the user appear to be "thrown out" of gram editing.
    if(!force&&(window.panoraRecipeEditing||root.dataset.recipeEditing==='true'||document.activeElement?.closest?.('#recipeList'))&&root.children.length)return;
    root.innerHTML=Object.keys(PRODUCTS).map(pid=>{const product=recipeProduct(pid),tech=product?.techCard||{},items=recipes[pid]||[],initialFlour=items.reduce((sum,item)=>sum+(gramUnit(item.unit)&&flourName(item.name)?numeric(item.qty):0),0);return `<article class="recipe-card recipe-card-professional" data-recipe-card="${pid}">
      <div class="recipe-card-head"><h3>${esc(productName(pid))}</h3><span class="recipe-flour-summary" data-flour-total>${L().flour}</span></div>
      <label class="recipe-product-weight"><span>${L().weight}</span><span><input data-recipe-weight="${pid}" type="number" min="1" step="1" value="${Number(product?.weight||750)}"> g</span></label>
      <p class="recipe-help"><strong>${L().percent}.</strong> ${L().help} ${L().stock}</p>
      <div class="recipe-tech-summary" aria-label="${L().formula}">
        <div><small>${L().dough}</small><strong data-tech-stat="dough">—</strong></div>
        <div><small>${L().formula}</small><strong data-tech-stat="formula">—</strong></div>
        <div><small>${L().yield}</small><strong data-tech-stat="yield">—</strong></div>
        <div><small>${L().loss}</small><strong data-tech-stat="loss">—</strong></div>
        <div><small>${L().hydration}</small><strong data-tech-stat="hydration">—</strong></div>
        <div><small>${L().cost}</small><strong data-tech-stat="cost">—</strong></div>
      </div>
      <p class="recipe-tech-note">${L().approx}</p>
      <p class="recipe-warning recipe-mass-warning" hidden>${L().invalidMass}</p>
      <p class="recipe-warning" data-warning="water" hidden>${L().missingWater}</p>
      <p class="recipe-warning" data-warning="salt" hidden>${L().missingSalt}</p>
      <p class="recipe-warning" data-warning="salt-range" hidden>${L().saltRange}</p>
      <p class="recipe-cost-hint" data-warning="cost" hidden>${L().priceHint}</p>
      <div class="recipe-batch-summary" data-recipe-batch></div>
      <div class="recipe-semi-banner"><strong>Полуфабрикаты</strong><span>У каждого ингредиента ниже есть переключатель «Производится из сырья». Для тыквенного пюре включите его и задайте свежую тыкву + процент выхода.</span></div>
      <div class="recipe-column-heads"><span>${L().ingredient}</span><span>${L().amount}</span><span>${L().percent}</span><span>${L().unit}</span><span></span></div>
      <div class="recipe-ingredients">${items.map((item,index)=>rowHtml(pid,item,index,initialFlour)).join('')}</div>
      <p class="recipe-warning" hidden>${L().noFlour}</p>
      <details class="recipe-tech-card" open><summary>${L().tech}</summary><div class="recipe-tech-fields"><label class="wide"><span>${L().mix}</span><textarea data-tech="mix" data-draft-key="tech:mix" rows="3">${esc(tech.mix||'')}</textarea></label><label><span>${L().fermentation}</span><input data-tech="fermentation" data-draft-key="tech:fermentation" type="number" min="0" inputmode="numeric" value="${numeric(tech.fermentation)||''}"></label><label><span>${L().proof}</span><input data-tech="proof" data-draft-key="tech:proof" type="number" min="0" inputmode="numeric" value="${numeric(tech.proof)||''}"></label><label><span>${L().bakeTemp}</span><input data-tech="bakeTemp" data-draft-key="tech:bakeTemp" type="number" min="0" inputmode="numeric" value="${numeric(tech.bakeTemp)||''}"></label><label><span>${L().bakeTime}</span><input data-tech="bakeTime" data-draft-key="tech:bakeTime" type="number" min="0" inputmode="numeric" value="${numeric(tech.bakeTime)||''}"></label><label class="wide"><span>${L().steps}</span><textarea data-tech="steps" data-draft-key="tech:steps" rows="5" placeholder="1. …&#10;2. …">${esc(tech.steps||'')}</textarea></label><label class="wide"><span>${L().notes}</span><textarea data-tech="notes" data-draft-key="tech:notes" rows="3">${esc(tech.notes||'')}</textarea></label></div><button class="secondary recipe-print" type="button">${L().print}</button></details>
      <div class="recipe-lock-bar"><span data-tech-lock-state></span><button class="secondary" data-tech-edit type="button">${L().edit}</button><button class="secondary" data-tech-cancel type="button" hidden>${L().cancelEdit}</button></div><div class="recipe-actions"><button class="secondary" data-add-ingredient="${pid}" type="button">${L().add}</button><span class="recipe-save-status" aria-live="polite"></span><button class="primary recipe-save" type="button">${L().save}</button></div>
      <div class="product-manage"><label><input type="checkbox" data-product-active="${pid}" ${productRegistry.find(p=>p.id===pid)?.active!==false?'checked':''}> В каталоге</label><button type="button" class="product-delete-button" data-delete-product="${pid}">Удалить товар</button></div>
    </article>`}).join('');
    root.querySelectorAll('.recipe-card').forEach(card=>{
      updateCard(card);
      setCardEditMode(card,Boolean(window.panoraCloud?.hasTechCardLock?.(card.dataset.recipeCard)));
      card.querySelector('[data-tech-edit]')?.addEventListener('click',()=>beginProtectedEdit(card));
      card.querySelector('[data-tech-cancel]')?.addEventListener('click',()=>cancelProtectedEdit(card));
      const updateDraft=()=>{const pid=card.dataset.recipeCard,previous=recipes[pid]||[];recipes[pid]=[...card.querySelectorAll('.recipe-percent-row')].map((row,index)=>({name:row.querySelector('[data-role="name"]').value,qty:numeric(row.querySelector('[data-role="qty"]').value),unit:row.querySelector('[data-role="unit"]').value,stock:Number(previous[index]?.stock)||0,margin:Number(previous[index]?.margin??5)||0,sourceIngredientName:row.querySelector('[data-role="sourceEnabled"]')?.checked?(row.querySelector('[data-role="sourceName"]')?.value.trim()||''):'',sourceUnit:row.querySelector('[data-role="sourceUnit"]')?.value||'g',sourceYieldPct:row.querySelector('[data-role="sourceEnabled"]')?.checked?Math.max(0,numeric(row.querySelector('[data-role="sourceYield"]')?.value)):0}))};
      card.querySelectorAll('[data-role="name"],[data-role="qty"],[data-role="unit"],[data-role="sourceName"],[data-role="sourceUnit"],[data-role="sourceYield"]').forEach(el=>el.addEventListener('input',()=>{updateDraft();updateCard(card)}));
      card.querySelectorAll('[data-role="sourceEnabled"]').forEach(box=>box.addEventListener('change',()=>{const fields=box.closest('.recipe-semi-settings')?.querySelector('.recipe-semi-fields');if(fields)fields.hidden=!box.checked;box.closest('.recipe-percent-row')?.classList.toggle('is-semi',box.checked);updateDraft();updateCard(card)}));
      card.querySelectorAll('[data-role="purchasePrice"]').forEach(input=>{
        const commit=()=>{
          const row=input.closest('.recipe-percent-row'),target=rowPriceTarget(row),raw=String(input.value||'').replace(',','.').trim();
          if(!target.name){refreshRowPrice(row);return}
          const value=raw===''?0:Number(raw);
          if(!Number.isFinite(value)||value<0){refreshRowPrice(row);return}
          const saved=saveIngredientPrice(target.name,target.unit,value);
          input.value=saved>0?saved.toFixed(2):'';
          refreshRowPrice(row);
          updateCard(card);
          const priceState=row.querySelector('[data-role="priceState"]');
          if(priceState){priceState.textContent=`${L().priceSaved} ✓`;priceState.classList.remove('missing')}
          if(typeof renderPurchase==='function')renderPurchase();
          window.panoraRawStock?.render?.();
          setTimeout(()=>{if(document.body.contains(row)&&document.activeElement!==input)refreshRowPrice(row)},1400);
        };
        input.addEventListener('blur',commit);
        input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();input.blur()}});
        input.addEventListener('focus',()=>requestAnimationFrame(()=>input.select()));
      });
      card.querySelector('[data-recipe-weight]')?.addEventListener('input',()=>updateCard(card));
      card.querySelectorAll('[data-role="percent"]').forEach(pct=>{
        pct.addEventListener('input',()=>{if(pct.readOnly)return;const total=flourTotal(card),row=pct.closest('.recipe-percent-row'),raw=String(pct.value).replace(',','.').trim(),value=Number(raw);if(raw!==''&&total&&Number.isFinite(value)&&value>=0){row.querySelector('[data-role="qty"]').value=round(total*value/100,3);updateDraft();updateCard(card,pct)}});
        pct.addEventListener('blur',()=>updateCard(card));
      });
      card.querySelector('.recipe-save').onclick=async event=>{const button=event.currentTarget;button.disabled=true;try{await saveCard(card)}finally{button.disabled=false}};
      card.querySelector('.recipe-print').onclick=()=>printCard(card);
    });
    const lockEditing=()=>{window.panoraRecipeEditing=true;root.dataset.recipeEditing='true'};
    root.onpointerdown=lockEditing;
    root.ontouchstart=lockEditing;
    root.onfocusin=lockEditing;
    root.onfocusout=()=>setTimeout(()=>{if(!root.contains(document.activeElement)){root.dataset.recipeEditing='false';window.panoraRecipeEditing=false}},800);
    root.querySelectorAll('[data-add-ingredient]').forEach(button=>button.onclick=()=>{const pid=button.dataset.addIngredient;recipes[pid]=recipes[pid]||[];recipes[pid].push({name:L().ingredient,qty:0,unit:'g',stock:0,margin:5});store('panora-recipes',recipes);professionalRender(true)});
    root.querySelectorAll('[data-delete-ingredient]').forEach(button=>button.onclick=()=>{if(!confirm(L().delete))return;const [pid,index]=button.dataset.deleteIngredient.split(':');recipes[pid].splice(Number(index),1);store('panora-recipes',recipes);professionalRender(true)});
    root.querySelectorAll('[data-product-active]').forEach(input=>input.onchange=()=>{const product=productRegistry.find(p=>p.id===input.dataset.productActive);if(!product)return;product.active=input.checked;saveProducts()});
    bindProductDeleteButtons(root);
  }
  window.panoraBakersPercent={flourName,gramUnit,round};
  renderRecipes=professionalRender;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',professionalRender);else professionalRender();
  window.addEventListener('panora:recipes-changed',()=>{if(!document.activeElement?.closest?.('#recipeList'))professionalRender()});
  // v325.2: cloud-sync refreshes products in the background every ~3 s and
  // emits this event when another device saved a new tech-card revision.
  // Re-render immediately when this device is only viewing the recipe.
  // Never overwrite an active local edit.
  window.addEventListener('panora:products-changed',()=>{
    const root=document.querySelector('#recipeList');
    const activelyEditing=Boolean(window.panoraRecipeEditing||root?.dataset.recipeEditing==='true'||document.activeElement?.closest?.('#recipeList'));
    if(!activelyEditing)professionalRender(true);
  });
  window.addEventListener('panora:ingredient-costs-changed',()=>{if(!document.activeElement?.closest?.('#recipeList'))professionalRender()});
  window.addEventListener('panora:tech-card-lock-lost',event=>{const card=document.querySelector(`[data-recipe-card="${CSS.escape(event.detail?.productId||'')}"]`);if(card)setCardEditMode(card,false,L().lockNeed)});
})();
