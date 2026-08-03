/* Professional recipe editor: baker's percentages with total flour = 100%. */
(()=>{
  const words={
    ru:{weight:'Вес готового изделия',flour:'Мука',ingredient:'Ингредиент',amount:'Количество',percent:'Пекарский %',unit:'Ед.',add:'+ Добавить ингредиент',save:'Сохранить рецептуру и карту',saving:'Сохранение…',saved:'Рецептура и карта сохранены в облаке',localSaved:'Сохранено на устройстве. Облако недоступно.',help:'Вся мука вместе принимается за 100%. Остальные ингредиенты можно менять в количестве или пекарских процентах.',noFlour:'Добавьте ингредиент с названием «мука» и единицей g — без него проценты рассчитать нельзя.',delete:'Удалить ингредиент?',stock:'Остаток и запас учитываются в разделе «Закупка».',dough:'Вес теста на 1 хлеб',formula:'Сумма формулы',loss:'Плановые потери',yield:'Выход изделия',hydration:'Гидратация',cost:'Себестоимость 1 хлеба',approx:'Для жидкостей используется технологическое приближение 1 ml ≈ 1 g.',batch:'Текущая партия',pieces:'шт.',batchEmpty:'Нет запланированной выпечки',invalidMass:'Вес готового хлеба больше массы замеса. Проверьте ингредиенты или вес изделия.',missingWater:'В рецептуре не найдена вода.',missingSalt:'В рецептуре не найдена соль.',saltRange:'Соль обычно составляет 1–3% от массы муки. Проверьте значение.',priceHint:'Заполните цены ингредиентов в разделе «Закупка», чтобы увидеть себестоимость.',tech:'Технологическая карта',mix:'Замес и порядок внесения',fermentation:'Брожение, мин',proof:'Расстойка, мин',bakeTemp:'Температура, °C',bakeTime:'Выпечка, мин',steps:'Этапы приготовления',notes:'Примечания пекаря',print:'Печать / PDF',printTitle:'Технологическая карта',control:'Контроль рецептуры',scale:'Рассчитать на количество',actualWeight:'Фактический вес после выпечки, г',actualLoss:'Фактические потери',draft:'Черновик',approved:'Утверждена',approve:'Утвердить рецептуру',unlock:'Вернуть в черновик',approvedHint:'Рецептура защищена от изменений.',approveError:'Для утверждения добавьте муку, воду и соль и исправьте ошибки массы.',approveConfirm:'Утвердить рецептуру и защитить её от изменений?',unlockConfirm:'Вернуть рецептуру в черновик и разрешить редактирование?'},
    en:{weight:'Finished product weight',flour:'Flour',ingredient:'Ingredient',amount:'Amount',percent:"Baker's %",unit:'Unit',add:'+ Add ingredient',save:'Save recipe',saving:'Saving…',saved:'Recipe saved to cloud',localSaved:'Saved on this device. Cloud is unavailable.',help:"All flour combined is 100%. Other ingredients can be edited by amount or baker's percentage.",noFlour:'Add an ingredient named “flour” with unit g to calculate percentages.',delete:'Delete ingredient?',stock:'Stock and safety margin are used in Purchasing.',dough:'Dough weight per loaf',formula:'Total formula',loss:'Baking loss',yield:'Product yield',hydration:'Hydration',cost:'Cost per loaf',approx:'Liquids use the technological approximation 1 ml ≈ 1 g.',batch:'Current batch',pieces:'pcs',batchEmpty:'No bake is planned',invalidMass:'Finished bread weight exceeds dough weight. Check the ingredients or product weight.',missingWater:'No water was found in the recipe.',missingSalt:'No salt was found in the recipe.',saltRange:'Salt is usually 1–3% of total flour. Check the amount.',priceHint:'Enter ingredient prices in Purchasing to calculate the cost.'},
    es:{weight:'Peso del producto terminado',flour:'Harina',ingredient:'Ingrediente',amount:'Cantidad',percent:'% panadero',unit:'Ud.',add:'+ Añadir ingrediente',save:'Guardar receta',saving:'Guardando…',saved:'Receta guardada en la nube',localSaved:'Guardado en este dispositivo. La nube no está disponible.',help:'Toda la harina combinada representa el 100 %. Los demás ingredientes se pueden editar por cantidad o porcentaje panadero.',noFlour:'Añada un ingrediente llamado “harina” con unidad g para calcular porcentajes.',delete:'¿Eliminar ingrediente?',stock:'Las existencias y el margen se usan en Compras.',dough:'Peso de masa por pan',formula:'Fórmula total',loss:'Merma de horneado',yield:'Rendimiento del producto',hydration:'Hidratación',cost:'Coste por pan',approx:'Para líquidos se usa la aproximación tecnológica 1 ml ≈ 1 g.',batch:'Lote actual',pieces:'uds.',batchEmpty:'No hay horneado planificado',invalidMass:'El peso del pan terminado supera el peso de la masa. Revise los ingredientes o el peso del producto.',missingWater:'No se ha encontrado agua en la receta.',missingSalt:'No se ha encontrado sal en la receta.',saltRange:'La sal suele ser el 1–3% de la harina total. Revise la cantidad.',priceHint:'Introduzca los precios en Compras para calcular el coste.'}
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
  const productionPieces=pid=>typeof plans==='undefined'?0:plans.filter(plan=>plan.product===pid&&plan.bakeDate>=new Date().toISOString().slice(0,10)).reduce((sum,plan)=>sum+Math.max(Number(plan.planned)||0,Number(plan.ordered)||0),0);
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
    rows.forEach(row=>{const name=row.querySelector('[data-role="name"]')?.value||'',unit=row.querySelector('[data-role="unit"]')?.value||'g',qty=numeric(row.querySelector('[data-role="qty"]')?.value),price=Number(prices[`${name}|${unit}`]||0);if(qty>0){costable++;if(price>0){priced++;recipeCost+=qty/(unit==='g'||unit==='ml'?1000:1)*price}}});
    const set=(name,value)=>{const el=card.querySelector(`[data-tech-stat="${name}"]`);if(el)el.textContent=value};
    set('dough',`${display(dough)} g`);
    set('formula',total?`${display(formula)}%`:'—');
    set('loss',dough?`${display(loss)}%`:'—');
    set('yield',dough?`${display(productYield)}%`:'—');
    set('hydration',total?`${display(hydration)}%`:'—');
    set('cost',priced?`${display(recipeCost)} €`:'—');
    const actual=Math.max(0,numeric(card.querySelector('[data-actual-weight]')?.value));
    set('actualLoss',dough&&actual?`${display(Math.max(0,(dough-actual)/dough*100))}%`:'—');
    const massWarning=card.querySelector('.recipe-mass-warning');
    if(massWarning)massWarning.hidden=!dough||finished<=dough;
    const waterWarning=card.querySelector('[data-warning="water"]');if(waterWarning)waterWarning.hidden=!total||water>0;
    const saltWarning=card.querySelector('[data-warning="salt"]');if(saltWarning)saltWarning.hidden=!total||salt>0;
    const saltRangeWarning=card.querySelector('[data-warning="salt-range"]');if(saltRangeWarning)saltRangeWarning.hidden=!total||!salt||saltPercent>=1&&saltPercent<=3;
    const costHint=card.querySelector('[data-warning="cost"]');if(costHint)costHint.hidden=!costable||priced===costable;
    const requested=Math.max(0,numeric(card.querySelector('[data-scale-pieces]')?.value));
    const pieces=requested||productionPieces(card.dataset.recipeCard),batch=card.querySelector('[data-recipe-batch]');
    if(batch)batch.innerHTML=pieces?`<strong>${L().batch}: ${display(pieces)} ${L().pieces}</strong><span>${[...card.querySelectorAll('.recipe-percent-row')].map(row=>{const name=esc(row.querySelector('[data-role="name"]').value),qty=numeric(row.querySelector('[data-role="qty"]').value),unit=esc(row.querySelector('[data-role="unit"]').value);return `${name}: <b>${display(qty*pieces)} ${unit}</b>`}).join(' · ')}</span>`:`<strong>${L().batch}</strong><span>${L().batchEmpty}</span>`;
  }
  function saveWeight(pid,value){
    const product=typeof recipeProduct==='function'?recipeProduct(pid):null;if(!product)return;
    product.weight=Math.max(1,Math.round(Number(value)||1));
    if(typeof saveProducts==='function')saveProducts();
    else{const all=JSON.parse(localStorage.getItem('panora-products')||'[]'),saved=all.find(p=>p.id===product.id);if(saved){saved.weight=product.weight;localStorage.setItem('panora-products',JSON.stringify(all));window.panoraCloud?.queueProducts?.()}}
  }
  async function saveCard(card){
    const pid=card.dataset.recipeCard,previous=recipes[pid]||[];
    recipes[pid]=[...card.querySelectorAll('.recipe-percent-row')].map((row,index)=>({
      name:row.querySelector('[data-role="name"]').value.trim()||L().ingredient,
      qty:Math.max(0,round(numeric(row.querySelector('[data-role="qty"]').value),3)),
      unit:row.querySelector('[data-role="unit"]').value,
      stock:Number(previous[index]?.stock)||0,
      margin:Number(previous[index]?.margin??5)||0
    }));
    saveWeight(pid,card.querySelector('[data-recipe-weight]').value);
    const product=typeof recipeProduct==='function'?recipeProduct(pid):null;
    if(product){const old=product.techCard||{};product.techCard={...old,mix:card.querySelector('[data-tech="mix"]')?.value.trim()||'',fermentation:Math.max(0,numeric(card.querySelector('[data-tech="fermentation"]')?.value)),proof:Math.max(0,numeric(card.querySelector('[data-tech="proof"]')?.value)),bakeTemp:Math.max(0,numeric(card.querySelector('[data-tech="bakeTemp"]')?.value)),bakeTime:Math.max(0,numeric(card.querySelector('[data-tech="bakeTime"]')?.value)),steps:card.querySelector('[data-tech="steps"]')?.value.trim()||'',notes:card.querySelector('[data-tech="notes"]')?.value.trim()||'',actualWeight:Math.max(0,numeric(card.querySelector('[data-actual-weight]')?.value)),status:card.dataset.recipeStatus||old.status||'draft',approvedAt:card.dataset.approvedAt||old.approvedAt||''}}
    store('panora-recipes',recipes);if(typeof renderPurchase==='function')renderPurchase();
    const status=card.querySelector('.recipe-save-status');status.textContent=L().saving;
    try{
      if(navigator.onLine&&window.panoraCloud?.ready&&window.panoraCloud?.flushRecipes){saveProducts();await Promise.all([window.panoraCloud.flushRecipes(),window.panoraCloud.flushProducts()]);status.textContent='✓ '+L().saved}
      else status.textContent=L().localSaved;
    }
    catch(error){console.error('Panora recipe save',error);status.textContent=L().localSaved}
    setTimeout(()=>{if(status)status.textContent=''},3500);
    updateCard(card);
  }
  async function toggleApproval(card){
    const approved=card.dataset.recipeStatus==='approved';
    if(approved){if(!confirm(L().unlockConfirm))return;card.dataset.recipeStatus='draft';card.dataset.approvedAt='';await saveCard(card);professionalRender(true);return}
    const total=flourTotal(card),rows=[...card.querySelectorAll('.recipe-percent-row')],dough=rows.reduce((sum,row)=>sum+(['g','ml'].includes(row.querySelector('[data-role="unit"]')?.value)?numeric(row.querySelector('[data-role="qty"]')?.value):0),0),finished=numeric(card.querySelector('[data-recipe-weight]')?.value),hasWater=rows.some(row=>waterName(row.querySelector('[data-role="name"]')?.value)&&numeric(row.querySelector('[data-role="qty"]')?.value)>0),hasSalt=rows.some(row=>saltName(row.querySelector('[data-role="name"]')?.value)&&numeric(row.querySelector('[data-role="qty"]')?.value)>0);
    if(!total||!hasWater||!hasSalt||!dough||finished>dough){alert(L().approveError);return}
    if(!confirm(L().approveConfirm))return;card.dataset.recipeStatus='approved';card.dataset.approvedAt=new Date().toISOString();await saveCard(card);professionalRender(true)
  }
  function printCard(card){
    const pid=card.dataset.recipeCard,title=esc(productName(pid)),tech={mix:card.querySelector('[data-tech="mix"]')?.value||'',fermentation:card.querySelector('[data-tech="fermentation"]')?.value||'',proof:card.querySelector('[data-tech="proof"]')?.value||'',bakeTemp:card.querySelector('[data-tech="bakeTemp"]')?.value||'',bakeTime:card.querySelector('[data-tech="bakeTime"]')?.value||'',steps:card.querySelector('[data-tech="steps"]')?.value||'',notes:card.querySelector('[data-tech="notes"]')?.value||''},rows=[...card.querySelectorAll('.recipe-percent-row')].map(row=>`<tr><td>${esc(row.querySelector('[data-role="name"]').value)}</td><td>${esc(row.querySelector('[data-role="qty"]').value)} ${esc(row.querySelector('[data-role="unit"]').value)}</td><td>${esc(row.querySelector('[data-role="percent"]').value||'—')}%</td></tr>`).join('');
    const value=(label,v,unit='')=>`<div><b>${esc(label)}:</b> ${esc(v||'—')}${v&&unit?' '+unit:''}</div>`,win=open('','_blank','noopener,noreferrer');if(!win)return;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(L().printTitle)} — ${title}</title><style>body{font:15px Arial;color:#17251d;max-width:900px;margin:32px auto;padding:0 24px}h1{margin-bottom:4px}h2{margin-top:28px;border-bottom:2px solid #24382c;padding-bottom:7px}table{width:100%;border-collapse:collapse}th,td{padding:9px;border-bottom:1px solid #bbb;text-align:left}.meta{display:grid;grid-template-columns:repeat(2,1fr);gap:8px 24px}.text{white-space:pre-wrap;line-height:1.5}@media print{body{margin:0;max-width:none}}</style></head><body><h1>${title}</h1><p>${esc(L().printTitle)}</p><div class="meta">${value(L().weight,card.querySelector('[data-recipe-weight]').value,'g')}${value(L().fermentation,tech.fermentation,'мин')}${value(L().proof,tech.proof,'мин')}${value(L().bakeTemp,tech.bakeTemp,'°C')}${value(L().bakeTime,tech.bakeTime,'мин')}</div><h2>${esc(L().ingredient)}</h2><table><thead><tr><th>${esc(L().ingredient)}</th><th>${esc(L().amount)}</th><th>${esc(L().percent)}</th></tr></thead><tbody>${rows}</tbody></table><h2>${esc(L().mix)}</h2><div class="text">${esc(tech.mix||'—')}</div><h2>${esc(L().steps)}</h2><div class="text">${esc(tech.steps||'—')}</div><h2>${esc(L().notes)}</h2><div class="text">${esc(tech.notes||'—')}</div><script>onload=()=>setTimeout(()=>print(),150)<\/script></body></html>`);win.document.close();
  }
  function rowHtml(pid,item,index,total){const unit=item.unit||'g',qty=numeric(item.qty),isBase=gramUnit(unit)&&flourName(item.name),percent=total&&unit!=='pcs'?display(qty/total*100):'';return `<div class="recipe-row recipe-percent-row" data-index="${index}">
    <label class="recipe-field recipe-field-name"><small>${L().ingredient}</small><input data-role="name" value="${esc(item.name)}" aria-label="${L().ingredient}"></label>
    <label class="recipe-field"><small>${L().amount}</small><input data-role="qty" type="text" inputmode="decimal" value="${Number(item.qty)||0}" aria-label="${L().amount}"></label>
    <label class="recipe-field recipe-percent-suffix"><small>${L().percent}</small><input data-role="percent" type="text" inputmode="decimal" value="${percent}" ${!total||unit==='pcs'||isBase?'readonly':''} aria-label="${L().percent}"></label>
    <label class="recipe-field recipe-unit-field"><small>${L().unit}</small><select data-role="unit" aria-label="${L().unit}"><option ${item.unit==='g'?'selected':''}>g</option><option ${item.unit==='ml'?'selected':''}>ml</option><option ${item.unit==='pcs'?'selected':''}>pcs</option></select></label>
    <button class="recipe-delete" data-delete-ingredient="${pid}:${index}" type="button" aria-label="${L().delete}">×</button>
  </div>`}
  function professionalRender(force=false){
    const root=document.querySelector('#recipeList');if(!root)return;
    // Background order/plan refreshes call renderAll(). Never replace the recipe
    // inputs while the mobile keyboard is open: doing so removes the focused
    // element and makes the user appear to be "thrown out" of gram editing.
    if(!force&&(window.panoraRecipeEditing||root.dataset.recipeEditing==='true'||document.activeElement?.closest?.('#recipeList'))&&root.children.length)return;
    root.innerHTML=Object.keys(PRODUCTS).map(pid=>{const product=recipeProduct(pid),tech=product?.techCard||{},approved=tech.status==='approved',items=recipes[pid]||[],initialFlour=items.reduce((sum,item)=>sum+(gramUnit(item.unit)&&flourName(item.name)?numeric(item.qty):0),0);return `<article class="recipe-card recipe-card-professional ${approved?'recipe-approved':''}" data-recipe-card="${pid}" data-recipe-status="${approved?'approved':'draft'}" data-approved-at="${esc(tech.approvedAt||'')}">
      <div class="recipe-card-head"><h3>${esc(productName(pid))}</h3><div class="recipe-head-badges"><span class="recipe-status ${approved?'is-approved':''}">${approved?L().approved:L().draft}</span><span class="recipe-flour-summary" data-flour-total>${L().flour}</span></div></div>
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
      <section class="recipe-control"><h4>${L().control}</h4><div class="recipe-control-fields"><label><span>${L().scale}</span><input data-scale-pieces type="number" min="0" step="1" inputmode="numeric" value="${productionPieces(pid)||1}"></label><label><span>${L().actualWeight}</span><input data-actual-weight type="number" min="0" step="1" inputmode="decimal" value="${numeric(tech.actualWeight)||''}" ${approved?'disabled':''}></label><div><span>${L().actualLoss}</span><strong data-tech-stat="actualLoss">—</strong></div></div></section>
      <div class="recipe-column-heads"><span>${L().ingredient}</span><span>${L().amount}</span><span>${L().percent}</span><span>${L().unit}</span><span></span></div>
      <div class="recipe-ingredients">${items.map((item,index)=>rowHtml(pid,item,index,initialFlour)).join('')}</div>
      <p class="recipe-warning" hidden>${L().noFlour}</p>
      <details class="recipe-tech-card" open><summary>${L().tech}</summary><div class="recipe-tech-fields"><label class="wide"><span>${L().mix}</span><textarea data-tech="mix" rows="3">${esc(tech.mix||'')}</textarea></label><label><span>${L().fermentation}</span><input data-tech="fermentation" type="number" min="0" inputmode="numeric" value="${numeric(tech.fermentation)||''}"></label><label><span>${L().proof}</span><input data-tech="proof" type="number" min="0" inputmode="numeric" value="${numeric(tech.proof)||''}"></label><label><span>${L().bakeTemp}</span><input data-tech="bakeTemp" type="number" min="0" inputmode="numeric" value="${numeric(tech.bakeTemp)||''}"></label><label><span>${L().bakeTime}</span><input data-tech="bakeTime" type="number" min="0" inputmode="numeric" value="${numeric(tech.bakeTime)||''}"></label><label class="wide"><span>${L().steps}</span><textarea data-tech="steps" rows="5" placeholder="1. …&#10;2. …">${esc(tech.steps||'')}</textarea></label><label class="wide"><span>${L().notes}</span><textarea data-tech="notes" rows="3">${esc(tech.notes||'')}</textarea></label></div><button class="secondary recipe-print" type="button">${L().print}</button></details>
      ${approved?`<p class="recipe-approved-hint">${L().approvedHint}</p>`:''}<div class="recipe-actions"><button class="secondary" data-add-ingredient="${pid}" type="button" ${approved?'disabled':''}>${L().add}</button><button class="secondary recipe-approval" type="button">${approved?L().unlock:L().approve}</button><span class="recipe-save-status" aria-live="polite"></span><button class="primary recipe-save" type="button" ${approved?'disabled':''}>${L().save}</button></div>
      <div class="product-manage"><label><input type="checkbox" data-product-active="${pid}" ${productRegistry.find(p=>p.id===pid)?.active!==false?'checked':''}> В каталоге</label><button type="button" class="product-delete-button" data-delete-product="${pid}">Удалить товар</button></div>
    </article>`}).join('');
    root.querySelectorAll('.recipe-card').forEach(card=>{
      updateCard(card);
      if(card.dataset.recipeStatus==='approved')card.querySelectorAll('[data-recipe-weight],[data-role],[data-tech],[data-delete-ingredient]').forEach(el=>el.disabled=true);
      const updateDraft=()=>{const pid=card.dataset.recipeCard,previous=recipes[pid]||[];recipes[pid]=[...card.querySelectorAll('.recipe-percent-row')].map((row,index)=>({name:row.querySelector('[data-role="name"]').value,qty:numeric(row.querySelector('[data-role="qty"]').value),unit:row.querySelector('[data-role="unit"]').value,stock:Number(previous[index]?.stock)||0,margin:Number(previous[index]?.margin??5)||0}))};
      card.querySelectorAll('[data-role="name"],[data-role="qty"],[data-role="unit"]').forEach(el=>el.addEventListener('input',()=>{updateDraft();updateCard(card)}));
      card.querySelector('[data-recipe-weight]')?.addEventListener('input',()=>updateCard(card));
      card.querySelector('[data-scale-pieces]')?.addEventListener('input',()=>updateCard(card));
      card.querySelector('[data-actual-weight]')?.addEventListener('input',()=>updateCard(card));
      card.querySelectorAll('[data-role="percent"]').forEach(pct=>{
        pct.addEventListener('input',()=>{if(pct.readOnly)return;const total=flourTotal(card),row=pct.closest('.recipe-percent-row'),raw=String(pct.value).replace(',','.').trim(),value=Number(raw);if(raw!==''&&total&&Number.isFinite(value)&&value>=0){row.querySelector('[data-role="qty"]').value=round(total*value/100,3);updateDraft();updateCard(card,pct)}});
        pct.addEventListener('blur',()=>updateCard(card));
      });
      card.querySelector('.recipe-save').onclick=async event=>{const button=event.currentTarget;button.disabled=true;try{await saveCard(card)}finally{button.disabled=false}};
      card.querySelector('.recipe-print').onclick=()=>printCard(card);
      card.querySelector('.recipe-approval').onclick=async event=>{const button=event.currentTarget;button.disabled=true;try{await toggleApproval(card)}finally{button.disabled=false}};
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
  window.addEventListener('panora:ingredient-costs-changed',()=>{if(!document.activeElement?.closest?.('#recipeList'))professionalRender()});
})();
