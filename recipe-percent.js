/* Professional recipe editor: baker's percentages with total flour = 100%. */
(()=>{
  const words={
    ru:{weight:'Вес готового изделия',flour:'Мука: 100%',ingredient:'Ингредиент',amount:'Количество',percent:'Пекарский %',unit:'Ед.',add:'+ Добавить ингредиент',save:'Сохранить рецептуру',saving:'Сохранение…',saved:'Рецептура сохранена в облаке',localSaved:'Сохранено на устройстве. Облако недоступно.',help:'Вся мука вместе принимается за 100%. Остальные ингредиенты можно менять в количестве или пекарских процентах.',noFlour:'Добавьте ингредиент с названием «мука» и единицей g — без него проценты рассчитать нельзя.',delete:'Удалить ингредиент?',stock:'Остаток и запас учитываются в разделе «Закупка».',dough:'Расчётная масса замеса',formula:'Сумма формулы',loss:'Потери при выпечке',yield:'Выход изделия',approx:'Для жидкостей используется технологическое приближение 1 ml ≈ 1 g.'},
    en:{weight:'Finished product weight',flour:'Flour: 100%',ingredient:'Ingredient',amount:'Amount',percent:"Baker's %",unit:'Unit',add:'+ Add ingredient',save:'Save recipe',saving:'Saving…',saved:'Recipe saved to cloud',localSaved:'Saved on this device. Cloud is unavailable.',help:"All flour combined is 100%. Other ingredients can be edited by amount or baker's percentage.",noFlour:'Add an ingredient named “flour” with unit g to calculate percentages.',delete:'Delete ingredient?',stock:'Stock and safety margin are used in Purchasing.',dough:'Estimated dough weight',formula:'Total formula',loss:'Baking loss',yield:'Product yield',approx:'Liquids use the technological approximation 1 ml ≈ 1 g.'},
    es:{weight:'Peso del producto terminado',flour:'Harina: 100%',ingredient:'Ingrediente',amount:'Cantidad',percent:'% panadero',unit:'Ud.',add:'+ Añadir ingrediente',save:'Guardar receta',saving:'Guardando…',saved:'Receta guardada en la nube',localSaved:'Guardado en este dispositivo. La nube no está disponible.',help:'Toda la harina combinada representa el 100 %. Los demás ingredientes se pueden editar por cantidad o porcentaje panadero.',noFlour:'Añada un ingrediente llamado “harina” con unidad g para calcular porcentajes.',delete:'¿Eliminar ingrediente?',stock:'Las existencias y el margen se usan en Compras.',dough:'Peso estimado de la masa',formula:'Fórmula total',loss:'Merma de horneado',yield:'Rendimiento del producto',approx:'Para líquidos se usa la aproximación tecnológica 1 ml ≈ 1 g.'}
  };
  const L=()=>words[typeof lang==='string'&&words[lang]?lang:'ru'];
  const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const normalizeText=value=>String(value??'').normalize('NFKC').trim().toLocaleLowerCase();
  const flourName=name=>{
    const value=normalizeText(name).replace(/[\u00a0\s]+/g,' ');
    return /(^|[^\p{L}])(мук|муки|мучн|пшенич|ржан|гречнев|овсян|полб|flour|wheat|rye|spelt|oat|buckwheat|harina|trigo|centeno|espelta|avena|farina|farine)/iu.test(value);
  };
  const gramUnit=unit=>normalizeText(unit).replace(/[.\s]/g,'')==='g';
  const numeric=value=>Number(String(value??'').replace(',','.').trim())||0;
  const round=(value,digits=2)=>{const p=10**digits;return Math.round((Number(value)||0)*p)/p};
  const display=value=>String(round(value,2)).replace('.',',');
  const flourTotal=card=>[...card.querySelectorAll('.recipe-percent-row')].reduce((sum,row)=>{
    const name=row.querySelector('[data-role="name"]')?.value||'';
    const unit=row.querySelector('[data-role="unit"]')?.value||'';
    const qty=numeric(row.querySelector('[data-role="qty"]')?.value);
    return sum+(gramUnit(unit)&&flourName(name)?qty:0);
  },0);
  function updateCard(card,preservePercent=null){
    const total=flourTotal(card), warning=card.querySelector('.recipe-warning');
    card.querySelector('[data-flour-total]').textContent=total?`${L().flour} · ${display(total)} g`:L().flour;
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
    const set=(name,value)=>{const el=card.querySelector(`[data-tech-stat="${name}"]`);if(el)el.textContent=value};
    set('dough',`${display(dough)} g`);
    set('formula',total?`${display(formula)}%`:'—');
    set('loss',dough?`${display(loss)}%`:'—');
    set('yield',dough?`${display(productYield)}%`:'—');
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
    store('panora-recipes',recipes);if(typeof renderPurchase==='function')renderPurchase();
    const status=card.querySelector('.recipe-save-status');status.textContent=L().saving;
    try{
      if(navigator.onLine&&window.panoraCloud?.ready&&window.panoraCloud?.flushRecipes){await window.panoraCloud.flushRecipes();status.textContent='✓ '+L().saved}
      else status.textContent=L().localSaved;
    }
    catch(error){console.error('Panora recipe save',error);status.textContent=L().localSaved}
    setTimeout(()=>{if(status)status.textContent=''},3500);
    updateCard(card);
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
    root.innerHTML=Object.keys(PRODUCTS).map(pid=>{const product=recipeProduct(pid),items=recipes[pid]||[],initialFlour=items.reduce((sum,item)=>sum+(gramUnit(item.unit)&&flourName(item.name)?numeric(item.qty):0),0);return `<article class="recipe-card recipe-card-professional" data-recipe-card="${pid}">
      <div class="recipe-card-head"><h3>${esc(productName(pid))}</h3><span class="recipe-flour-summary" data-flour-total>${L().flour}</span></div>
      <label class="recipe-product-weight"><span>${L().weight}</span><span><input data-recipe-weight="${pid}" type="number" min="1" step="1" value="${Number(product?.weight||750)}"> g</span></label>
      <p class="recipe-help"><strong>${L().percent}.</strong> ${L().help} ${L().stock}</p>
      <div class="recipe-tech-summary" aria-label="${L().formula}">
        <div><small>${L().dough}</small><strong data-tech-stat="dough">—</strong></div>
        <div><small>${L().formula}</small><strong data-tech-stat="formula">—</strong></div>
        <div><small>${L().yield}</small><strong data-tech-stat="yield">—</strong></div>
        <div><small>${L().loss}</small><strong data-tech-stat="loss">—</strong></div>
      </div>
      <p class="recipe-tech-note">${L().approx}</p>
      <div class="recipe-column-heads"><span>${L().ingredient}</span><span>${L().amount}</span><span>${L().percent}</span><span>${L().unit}</span><span></span></div>
      <div class="recipe-ingredients">${items.map((item,index)=>rowHtml(pid,item,index,initialFlour)).join('')}</div>
      <p class="recipe-warning" hidden>${L().noFlour}</p>
      <div class="recipe-actions"><button class="secondary" data-add-ingredient="${pid}" type="button">${L().add}</button><span class="recipe-save-status" aria-live="polite"></span><button class="primary recipe-save" type="button">${L().save}</button></div>
      <div class="product-manage"><label><input type="checkbox" data-product-active="${pid}" ${productRegistry.find(p=>p.id===pid)?.active!==false?'checked':''}> В каталоге</label><button type="button" class="product-delete-button" data-delete-product="${pid}">Удалить товар</button></div>
    </article>`}).join('');
    root.querySelectorAll('.recipe-card').forEach(card=>{
      updateCard(card);
      const updateDraft=()=>{const pid=card.dataset.recipeCard,previous=recipes[pid]||[];recipes[pid]=[...card.querySelectorAll('.recipe-percent-row')].map((row,index)=>({name:row.querySelector('[data-role="name"]').value,qty:numeric(row.querySelector('[data-role="qty"]').value),unit:row.querySelector('[data-role="unit"]').value,stock:Number(previous[index]?.stock)||0,margin:Number(previous[index]?.margin??5)||0}))};
      card.querySelectorAll('[data-role="name"],[data-role="qty"],[data-role="unit"]').forEach(el=>el.addEventListener('input',()=>{updateDraft();updateCard(card)}));
      card.querySelector('[data-recipe-weight]')?.addEventListener('input',()=>updateCard(card));
      card.querySelectorAll('[data-role="percent"]').forEach(pct=>{
        pct.addEventListener('input',()=>{if(pct.readOnly)return;const total=flourTotal(card),row=pct.closest('.recipe-percent-row'),raw=String(pct.value).replace(',','.').trim(),value=Number(raw);if(raw!==''&&total&&Number.isFinite(value)&&value>=0){row.querySelector('[data-role="qty"]').value=round(total*value/100,3);updateDraft();updateCard(card,pct)}});
        pct.addEventListener('blur',()=>updateCard(card));
      });
      card.querySelector('.recipe-save').onclick=async event=>{const button=event.currentTarget;button.disabled=true;try{await saveCard(card)}finally{button.disabled=false}};
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
})();
