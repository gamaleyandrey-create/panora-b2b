const productRegistryDefaults=[
 {id:'plain',builtIn:true,active:true,weight:750,basePrice:4.5,image:'bread-plain.jpg',names:{ru:'Льняной бездрожжевой хлеб с семенами',en:'Yeast-free flaxseed bread with seeds',es:'Pan de lino sin levadura con semillas'},descriptions:{ru:'Бездрожжевой льняной хлеб с семенами.',en:'Yeast-free flaxseed bread with seeds.',es:'Pan de lino sin levadura con semillas.'}},
 {id:'pumpkin',builtIn:true,active:true,weight:750,basePrice:5,image:'bread-pumpkin.jpg',names:{ru:'Тыквенный бездрожжевой хлеб с семенами',en:'Yeast-free pumpkin bread with seeds',es:'Pan de calabaza sin levadura con semillas'},descriptions:{ru:'Бездрожжевой тыквенный хлеб с семенами.',en:'Yeast-free pumpkin bread with seeds.',es:'Pan de calabaza sin levadura con semillas.'}}
];
let productRegistry=cRead('panora-products',productRegistryDefaults);
if(!productRegistry.some(p=>p.id==='plain'))productRegistry=[...productRegistryDefaults,...productRegistry];

const panoraInlineMedia=value=>/^data:image\//i.test(String(value||''));
const compactProductForLocal=product=>{
 const copy={...product};
 if(panoraInlineMedia(copy.image)){copy.image='';copy._imageCloudOnly=true}else delete copy._imageCloudOnly;
 const gallery=Array.isArray(copy.gallery)?copy.gallery.filter(Boolean):[];
 const keptGallery=gallery.filter(item=>!panoraInlineMedia(item));
 if(keptGallery.length!==gallery.length)copy._galleryCloudOnly=true;else delete copy._galleryCloudOnly;
 copy.gallery=keptGallery.slice(0,6);
 return copy;
};
function persistProductRegistryCache(list=productRegistry){
 const compact=(Array.isArray(list)?list:[]).map(compactProductForLocal);
 const payload=JSON.stringify(compact);
 try{
  localStorage.setItem('panora-products',payload);
 }catch(error){
  if(!/quota|exceed/i.test(String(error?.message||error)))throw error;
  // Replacing a legacy image-heavy cache must never block a confirmed cloud save.
  localStorage.removeItem('panora-products');
  localStorage.setItem('panora-products',payload);
 }
 return compact;
}
window.panoraPersistProductsCache=persistProductRegistryCache;

// Panora 6.02: one-time cleanup of old base64 photos duplicated in localStorage.
// Supabase remains the media authority; localStorage keeps only lightweight product metadata.
(()=>{
 try{persistProductRegistryCache(productRegistry)}catch(error){console.warn('Panora compact product cache',error)}
 const migrationKey='panora-product-storage-migration-v602';
 if(localStorage.getItem(migrationKey)==='1')return;
 try{
  const baselineKey='panora-cloud-baselines-v323';
  const baselines=JSON.parse(localStorage.getItem(baselineKey)||'{}')||{};
  if(Object.prototype.hasOwnProperty.call(baselines,'products')){
   delete baselines.products;
   localStorage.setItem(baselineKey,JSON.stringify(baselines));
  }
 }catch(error){console.warn('Panora compact product baseline',error)}
 try{
  const backupKey='panora-cloud-backups-v286';
  const backups=JSON.parse(localStorage.getItem(backupKey)||'[]');
  if(Array.isArray(backups)){
   let changed=false;
   backups.forEach(snapshot=>{
    const raw=snapshot?.data?.products;
    if(!raw)return;
    try{
     const list=JSON.parse(raw);
     if(Array.isArray(list)){
      snapshot.data.products=JSON.stringify(list.map(compactProductForLocal));
      changed=true;
     }
    }catch{}
   });
   if(changed)localStorage.setItem(backupKey,JSON.stringify(backups));
  }
 }catch(error){
  console.warn('Panora compact product backups',error);
  // Backups are secondary to committed Supabase data. If an oversized legacy
  // backup cannot be rewritten, remove it so product editing can continue.
  try{localStorage.removeItem('panora-cloud-backups-v286')}catch{}
 }
 try{localStorage.setItem(migrationKey,'1')}catch{}
})();
function syncAdminProductRegistry(){
 productRegistry.forEach(p=>{
  PRODUCTS[p.id]={ru:p.names?.ru||p.id,en:p.names?.en||p.names?.ru||p.id,es:p.names?.es||p.names?.ru||p.id};
  if(typeof recipes!=='undefined'&&!Array.isArray(recipes[p.id]))recipes[p.id]=[];
 });
}
syncAdminProductRegistry();
if(localStorage.getItem('panora-builtin-products-version')!=='4'){
 productRegistryDefaults.forEach(source=>{const target=productRegistry.find(p=>p.id===source.id);if(!target){productRegistry.push(structuredClone(source));return}Object.entries(source).forEach(([key,value])=>{if(target[key]==null||target[key]==='')target[key]=structuredClone(value)});target.names??=structuredClone(source.names);target.descriptions??=structuredClone(source.descriptions);Object.entries(source.names).forEach(([key,value])=>{if(!target.names[key])target.names[key]=value});Object.entries(source.descriptions).forEach(([key,value])=>{if(!target.descriptions[key])target.descriptions[key]=value})});
 let savedRestaurants=[];
 try{const parsed=JSON.parse(localStorage.getItem('panora-restaurants')||'[]');savedRestaurants=Array.isArray(parsed)?parsed:[]}catch{localStorage.removeItem('panora-restaurants')}
 savedRestaurants.forEach(r=>{r.prices??={};if(r.prices.plain==null)r.prices.plain=4.5;if(r.prices.pumpkin==null)r.prices.pumpkin=5});
 persistProductRegistryCache(productRegistry);
 localStorage.setItem('panora-restaurants',JSON.stringify(savedRestaurants));
 localStorage.setItem('panora-builtin-products-version','4');
 if(typeof restaurants!=='undefined')restaurants=savedRestaurants;
}
const productLabel=(id,language=lang)=>productRegistry.find(p=>p.id===id)?.names?.[language]||productRegistry.find(p=>p.id===id)?.names?.ru||id;
productName=id=>productLabel(id);
function saveProducts(){persistProductRegistryCache(productRegistry);window.panoraCloud?.queueProducts();window.dispatchEvent(new CustomEvent('panora:products-changed'))}
function fileData(file){return new Promise(resolve=>{if(!file)return resolve('');const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const size=900,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d'),scale=Math.max(size/img.width,size/img.height),w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);resolve(canvas.toDataURL('image/webp',.84))};img.onerror=()=>resolve(reader.result);img.src=reader.result};reader.readAsDataURL(file)})}
const productEscape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
document.body.insertAdjacentHTML('beforeend',`<dialog id="productEditDialog" class="product-edit-dialog"><form method="dialog" id="productEditForm"><button type="button" class="dialog-close" id="closeProductEdit" aria-label="Закрыть">×</button><h3 id="productEditTitle">Карточка продукции</h3><input type="hidden" name="productId"><div class="product-photo-editor"><img id="productPhotoPreview" alt="Предпросмотр фотографии"><div><label><span>Главная фотография хлеба</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp"></label><button type="button" class="secondary" id="removeProductPhoto">Удалить главную фотографию</button><small>Рекомендуется квадратное фото JPG или WebP.</small></div></div><div class="product-gallery-editor"><label><span>Дополнительные фотографии</span><input name="galleryPhotos" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><div id="productGalleryPreview" class="product-gallery-preview"></div><button type="button" class="secondary" id="clearProductGallery">Удалить все дополнительные фото</button><small id="productGalleryHelp">Можно добавить до 6 дополнительных фотографий + 1 главную. Фото можно добавлять по одному или несколько сразу.</small></div><div class="settings-row"><label><span>Название RU</span><input name="nameRu" required></label><label><span>Название EN</span><input name="nameEn" required></label></div><label><span>Название ES</span><input name="nameEs" required></label><label><span>Описание RU</span><textarea name="descRu" rows="2"></textarea></label><label><span>Описание EN</span><textarea name="descEn" rows="2"></textarea></label><label><span>Описание ES</span><textarea name="descEs" rows="2"></textarea></label><div class="settings-row"><label><span>Вес одной штуки, г</span><input name="weight" type="number" min="1" required></label><label><span>Розничная цена, €</span><input name="basePrice" type="number" min="0" step="0.01" required><small>Цены партнёров настраиваются отдельно.</small></label></div><label><span>Раздел продукции</span><input name="category" list="panoraProductCategories" placeholder="Например: Хлеб"><datalist id="panoraProductCategories"><option value="Хлеб"><option value="Булочки и выпечка"><option value="Сезонное"><option value="Готовая продукция"><option value="Прочее"></datalist><small>Можно написать свой раздел. Он автоматически появится на витрине.</small></label><label><span>Оптовая цена действует от, шт.</span><input name="wholesaleMinQty" type="number" min="1" max="500" step="1" value="12" required><small>Для количества ниже этого порога партнёру применяется розничная цена.</small></label><label class="check"><input name="active" type="checkbox"><span>Товар активен внутри пекарни</span></label><label class="check"><input name="storefrontVisible" type="checkbox"><span>Показывать на витрине партнёров</span></label><div class="dialog-actions"><button type="button" id="cancelProductEdit">Отмена</button><button type="submit" class="primary">Сохранить карточку</button></div></form></dialog>`);
let removeEditedPhoto=false;
let clearEditedGallery=false;
let editedGallery=[];
const renderGalleryPreview=(images=editedGallery)=>{
  const root=document.querySelector('#productGalleryPreview'); if(!root)return;
  const list=(images||[]).filter(Boolean).slice(0,6);
  root.innerHTML=list.length?list.map((src,index)=>`<div class="product-gallery-item"><img src="${productEscape(src)}" alt="Дополнительное фото ${index+1}"><button type="button" class="product-gallery-remove" data-gallery-remove="${index}" aria-label="Удалить фото ${index+1}">×</button><span>${index+1}</span></div>`).join(''):'<span class="product-gallery-empty">Дополнительных фото нет</span>';
  root.querySelectorAll('[data-gallery-remove]').forEach(button=>button.onclick=()=>{editedGallery.splice(Number(button.dataset.galleryRemove),1);clearEditedGallery=true;renderGalleryPreview()});
  const help=document.querySelector('#productGalleryHelp'); if(help)help.textContent=`Дополнительных фото: ${list.length} из 6. Можно добавить ${Math.max(0,6-list.length)}. Главная фотография считается отдельно.`;
};
function renderProductCards(){const grid=document.querySelector('#productAdminGrid');if(!grid)return;grid.innerHTML=productRegistry.map(p=>`<article class="product-admin-card"><div class="product-admin-photo"><img src="${productEscape(p.image||'icon.svg')}" alt="${productEscape(p.names?.ru)}"><span class="product-status ${p.storefrontVisible===false||p.active===false?'off':''}">${p.active===false?'Архив':(p.storefrontVisible===false?'Скрыт с витрины':'На витрине')}</span></div><div class="product-admin-body"><h3>${productEscape(p.names?.ru)}</h3><p>${productEscape(p.descriptions?.ru||'Описание не заполнено')}</p><dl><div><dt>Вес</dt><dd>${Number(p.weight)||0} г</dd></div><div><dt>Розничная цена</dt><dd>${Number(p.basePrice||0).toFixed(2)} €</dd></div><div><dt>Опт от</dt><dd>${Math.max(1,Number(p.wholesaleMinQty||12))} шт.</dd></div></dl><div class="product-storefront-control"><span>Показывать на витрине</span><button type="button" class="storefront-switch ${p.storefrontVisible===false?'off':'on'}" data-storefront-toggle="${p.id}" role="switch" aria-checked="${p.storefrontVisible===false?'false':'true'}" ${p.active===false?'disabled':''}><span></span><b>${p.storefrontVisible===false?'Нет':'Да'}</b></button></div><div class="product-card-actions"><button type="button" class="primary" data-edit-product="${p.id}">Настроить карточку</button><button type="button" class="product-delete-button" data-delete-product="${p.id}">${p.active===false?'Вернуть товар':'Архивировать товар'}</button></div></div></article>`).join('');grid.querySelectorAll('[data-edit-product]').forEach(b=>b.onclick=()=>openProductEditor(b.dataset.editProduct));grid.querySelectorAll('[data-storefront-toggle]').forEach(b=>b.onclick=async()=>{const product=productRegistry.find(x=>x.id===b.dataset.storefrontToggle);if(!product)return;const previous=product.storefrontVisible!==false;product.storefrontVisible=!previous;persistProductRegistryCache(productRegistry);renderProductCards();try{if(!window.panoraCloud?.ready)throw new Error('Облако ещё загружается');const saved=await window.panoraCloud.saveProductConfirmed(product);Object.assign(product,saved);persistProductRegistryCache(productRegistry);window.dispatchEvent(new CustomEvent('panora:products-changed'));window.panoraPublicCatalog?.refresh?.().catch?.(()=>{});renderProductCards();}catch(error){product.storefrontVisible=previous;persistProductRegistryCache(productRegistry);renderProductCards();alert(`Не удалось изменить витрину: ${error.message||error}`)}});bindProductDeleteButtons(grid)}
async function deleteProduct(productId,button){
 const p=productRegistry.find(x=>x.id===productId);if(!p)return;
 const name=p.names?.ru||p.id,archived=p.active===false;
 const question=archived
  ?`Вернуть товар «${name}» в активные товары?\n\nПосле возврата его можно отдельно включить на витрине.`
  :`Архивировать товар «${name}»?\n\nОн исчезнет из новых заказов, витрины и планирования, но останется в базе. Старые заказы, накладные, цены и история сохранятся.`;
 if(!confirm(question))return;
 button.disabled=true;button.textContent=archived?'Возвращаю…':'Архивирую…';
 const previous={active:p.active,storefrontVisible:p.storefrontVisible};
 try{
  if(!window.panoraCloud?.saveProductConfirmed)throw new Error('Обновите приложение и повторите действие');
  p.active=archived?true:false;
  p.storefrontVisible=archived?false:false;
  const saved=await window.panoraCloud.saveProductConfirmed(p);
  Object.assign(p,saved);
  persistProductRegistryCache(productRegistry);
  window.dispatchEvent(new CustomEvent('panora:products-changed'));
  window.panoraPublicCatalog?.refresh?.().catch?.(()=>{});
  renderProductCards();renderAll();renderProductManagement();syncProductSelects();
  alert(archived?`Товар «${name}» возвращён. Включите его на витрине, когда он снова готов к продаже.`:`Товар «${name}» перенесён в архив. История заказов сохранена.`);
 }catch(error){
  p.active=previous.active;p.storefrontVisible=previous.storefrontVisible;
  persistProductRegistryCache(productRegistry);renderProductCards();
  button.disabled=false;button.textContent=archived?'Вернуть товар':'Архивировать товар';
  alert(`Не удалось изменить статус товара: ${error.message||error}`);
 }
}
function bindProductDeleteButtons(root=document){root.querySelectorAll('[data-delete-product]').forEach(b=>b.onclick=()=>deleteProduct(b.dataset.deleteProduct,b))}
function openProductEditor(id=''){const p=productRegistry.find(x=>x.id===id),form=document.querySelector('#productEditForm');form.reset();form.productId.value=p?.id||'';form.nameRu.value=p?.names?.ru||'';form.nameEn.value=p?.names?.en||'';form.nameEs.value=p?.names?.es||'';form.descRu.value=p?.descriptions?.ru||'';form.descEn.value=p?.descriptions?.en||'';form.descEs.value=p?.descriptions?.es||'';form.weight.value=p?.weight||750;form.basePrice.value=p?.basePrice||0;form.wholesaleMinQty.value=Math.max(1,Number(p?.wholesaleMinQty||12));form.category.value=p?.category||'Хлеб';form.active.checked=p?.active!==false;form.storefrontVisible.checked=p?.storefrontVisible!==false;form.photo.value='';form.galleryPhotos.value='';removeEditedPhoto=false;clearEditedGallery=false;editedGallery=[...(Array.isArray(p?.gallery)?p.gallery:[])].filter(Boolean).slice(0,6);document.querySelector('#productEditTitle').textContent=p?'Настроить карточку':'Новый вид хлеба';document.querySelector('#productPhotoPreview').src=p?.image||'icon.svg';renderGalleryPreview();document.querySelector('#productEditDialog').showModal()}
function closeProductEditor(){document.querySelector('#productEditDialog').close()}

document.querySelector('#closeProductEdit').onclick=closeProductEditor;
document.querySelector('#cancelProductEdit').onclick=closeProductEditor;
document.querySelector('#productEditDialog').onclick=e=>{if(e.target===e.currentTarget)closeProductEditor()};
document.querySelector('#removeProductPhoto').onclick=()=>{removeEditedPhoto=true;document.querySelector('#productEditForm').photo.value='';document.querySelector('#productPhotoPreview').src='icon.svg'};
document.querySelector('#clearProductGallery').onclick=()=>{clearEditedGallery=true;editedGallery=[];document.querySelector('#productEditForm').galleryPhotos.value='';renderGalleryPreview()};
document.querySelector('#productEditForm').galleryPhotos.onchange=async e=>{
  const files=[...(e.target.files||[])]; if(!files.length)return;
  const free=Math.max(0,6-editedGallery.length);
  if(!free){alert('Уже добавлено 6 дополнительных фотографий. Удалите одну, чтобы добавить новую.');e.target.value='';return;}
  const accepted=files.slice(0,free),previews=await Promise.all(accepted.map(file=>fileData(file)));
  editedGallery=[...editedGallery,...previews.filter(Boolean)].slice(0,6);clearEditedGallery=true;e.target.value='';renderGalleryPreview();
  if(files.length>free)alert(`Можно сохранить не более 6 дополнительных фотографий. Добавлено ${accepted.length}.`);
};
document.querySelector('#productEditForm').photo.onchange=e=>{const file=e.target.files[0];if(!file)return;removeEditedPhoto=false;const reader=new FileReader();reader.onload=()=>document.querySelector('#productPhotoPreview').src=reader.result;reader.readAsDataURL(file)};
document.querySelector('#productEditForm').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;const submit=form.querySelector('[type="submit"]'),f=new FormData(form),id=f.get('productId')||`bread-${Date.now()}`,existing=productRegistry.find(x=>x.id===id),isNew=!existing;submit.disabled=true;submit.textContent='Сохраняю…';try{const uploaded=await fileData(form.photo.files[0]);const uploadedGallery=editedGallery.filter(Boolean).slice(0,6);const p={...(existing||{}),id,active:f.get('active')==='on',storefrontVisible:f.get('storefrontVisible')==='on',builtIn:existing?.builtIn||false,names:{ru:f.get('nameRu').trim(),en:f.get('nameEn').trim(),es:f.get('nameEs').trim()},descriptions:{ru:f.get('descRu').trim(),en:f.get('descEn').trim(),es:f.get('descEs').trim()},weight:Number(f.get('weight')),basePrice:Number(f.get('basePrice')),wholesaleMinQty:Math.max(1,Number(f.get('wholesaleMinQty')||12)),category:(f.get('category')||'Хлеб').trim(),image:uploaded||(!removeEditedPhoto&&existing?.image)||((id==='plain'?'bread-plain.jpg':id==='pumpkin'?'bread-pumpkin.jpg':'icon.svg')),gallery:uploadedGallery};
if(uploaded||removeEditedPhoto)delete p._imageCloudOnly;
if(clearEditedGallery||editedGallery.length)delete p._galleryCloudOnly;if(!window.panoraCloud?.ready)throw new Error('Облако ещё загружается. Подождите несколько секунд и повторите.');const confirmed=await window.panoraCloud.saveProductConfirmed(p);if(existing)Object.assign(existing,confirmed);else productRegistry.push(confirmed);syncAdminProductRegistry();persistProductRegistryCache(productRegistry);window.dispatchEvent(new CustomEvent('panora:products-changed'));window.panoraPricing?.notifyRetail(p.id,Number(p.basePrice??0));window.dispatchEvent(new CustomEvent('panora:retail-cloud-committed',{detail:{productId:p.id,price:Number(p.basePrice??0)}}));if(isNew){recipes[id]=[];store('panora-recipes',recipes);restaurants.forEach(r=>{r.prices??={};r.prices[id]=Number(p.basePrice||0)});cSave('panora-restaurants',restaurants);window.panoraCloud.queueRestaurants()}closeProductEditor();renderProductCards();renderAll();renderProductManagement()}catch(error){alert(`Не удалось сохранить хлеб: ${error.message||error}`)}finally{submit.disabled=false;submit.textContent='Сохранить карточку'}};
document.querySelector('#addProductCard').onclick=()=>openProductEditor();
const recipeHead=document.querySelector('#view-recipes .page-head');
recipeHead.insertAdjacentHTML('beforeend','<button class="primary" id="addBreadType">+ Новый вид хлеба</button>');
document.body.insertAdjacentHTML('beforeend',`<dialog id="breadTypeDialog"><form method="dialog" id="breadTypeForm"><h3>Новый вид хлеба</h3><div class="settings-row"><label><span>Название RU</span><input name="nameRu" required></label><label><span>Название EN</span><input name="nameEn" required></label></div><label><span>Название ES</span><input name="nameEs" required></label><div class="settings-row"><label><span>Вес, г</span><input name="weight" type="number" min="1" value="750" required></label><label><span>Розничная цена, €</span><input name="basePrice" type="number" min="0" step="0.01" value="0"></label></div><label><span>Оптовая цена действует от, шт.</span><input name="wholesaleMinQty" type="number" min="1" max="500" step="1" value="12" required></label><label><span>Описание RU</span><input name="descRu"></label><label><span>Описание EN</span><input name="descEn"></label><label><span>Описание ES</span><input name="descEs"></label><label><span>Фотография карточки</span><input name="photo" type="file" accept="image/*"></label><label class="check"><input name="active" type="checkbox" checked><span>Показывать в каталоге</span></label><div class="dialog-actions"><button value="cancel">Отмена</button><button class="primary" id="saveBreadType">Создать хлеб и рецепт</button></div></form></dialog>`);
document.querySelector('#addBreadType').onclick=()=>openProductEditor();
document.querySelector('#saveBreadType').onclick=async e=>{e.preventDefault();const form=document.querySelector('#breadTypeForm');if(!form.reportValidity())return;const f=new FormData(form),id=`bread-${Date.now()}`,image=await fileData(form.photo.files[0]);productRegistry.push({id,builtIn:false,active:f.get('active')==='on',weight:Number(f.get('weight')||750),basePrice:Number(f.get('basePrice')||0),image:image||'icon.svg',names:{ru:f.get('nameRu').trim(),en:f.get('nameEn').trim(),es:f.get('nameEs').trim()},descriptions:{ru:f.get('descRu')?.trim()||'',en:f.get('descEn')?.trim()||'',es:f.get('descEs')?.trim()||''}});recipes[id]=[];saveProducts();store('panora-recipes',recipes);await window.panoraCloud?.flushProducts?.();form.reset();form.weight.value=750;document.querySelector('#breadTypeDialog').close();renderAll();renderProductManagement()};
function renderProductManagement(){document.querySelectorAll('.product-manage').forEach(x=>x.remove());document.querySelectorAll('.recipe-card').forEach((card,index)=>{const p=productRegistry[index];if(!p)return;card.insertAdjacentHTML('beforeend',`<div class="product-manage"><label><input type="checkbox" data-product-active="${p.id}" ${p.active!==false?'checked':''}> В каталоге</label><button type="button" class="product-delete-button" data-delete-product="${p.id}">${p.active===false?'Вернуть товар':'Архивировать товар'}</button></div>`)});document.querySelectorAll('[data-product-active]').forEach(x=>x.onchange=()=>{productRegistry.find(p=>p.id===x.dataset.productActive).active=x.checked;saveProducts()});bindProductDeleteButtons(document)}
const originalRenderRecipes=renderRecipes;renderRecipes=function(){originalRenderRecipes();renderProductManagement()};
function buildPlanProductFields(){const box=document.querySelector('.bread-plan-fields');box.innerHTML='<legend>Количество хлеба, шт.</legend>'+productRegistry.filter(p=>p.active!==false).map(p=>`<label><span>${productEscape(productLabel(p.id))}</span><input type="number" min="0" max="5000" step="1" placeholder="Количество" data-plan-product="${p.id}"></label>`).join('')}
const originalAddPlan=document.querySelector('#addPlan').onclick;document.querySelector('#addPlan').onclick=()=>{buildPlanProductFields();originalAddPlan()};
document.querySelector('#savePlan').onclick=e=>{e.preventDefault();const form=document.querySelector('#planForm'),f=new FormData(form),amounts=[...form.querySelectorAll('[data-plan-product]')].map(i=>[i.dataset.planProduct,Number(i.value||0)]);if(!amounts.some(([,n])=>n)){alert('Укажите количество хотя бы одного хлеба.');return}amounts.forEach(([product,planned])=>{if(!planned)return;const existing=plans.find(p=>p.bakeDate===f.get('bakeDate')&&p.product===product);if(existing)Object.assign(existing,{deliveryDate:f.get('deliveryDate'),planned,cutoff:f.get('cutoff'),open:f.get('open')==='on'});else plans.push({id:crypto.randomUUID(),bakeDate:f.get('bakeDate'),deliveryDate:f.get('deliveryDate'),product,planned,ordered:0,cutoff:f.get('cutoff'),open:f.get('open')==='on'})});store('panora-production-plans',plans);document.querySelector('#planDialog').close();renderAll()};
function syncProductSelects(){['#movementForm select[name="product"]'].forEach(sel=>{const el=document.querySelector(sel);if(el)el.innerHTML=productRegistry.filter(p=>p.active!==false).map(p=>`<option value="${p.id}">${productEscape(productLabel(p.id))}</option>`).join('')})}
function customProducts(){return productRegistry.filter(p=>!p.builtIn&&p.active!==false)}
function addCustomRestaurantFields(){const form=document.querySelector('#restaurantForm'),actions=form.querySelector('.dialog-actions');form.querySelectorAll('[data-new-product-price]').forEach(x=>x.remove());customProducts().forEach(p=>actions.insertAdjacentHTML('beforebegin',`<label data-new-product-price><span>${productEscape(productLabel(p.id))} — оптовая цена, € / шт.</span><input name="price_${p.id}" type="text" inputmode="decimal" autocomplete="off" value="${p.basePrice||0}" required></label>`))}
const baseAddRestaurant=document.querySelector('#addRestaurant').onclick;document.querySelector('#addRestaurant').onclick=()=>{addCustomRestaurantFields();baseAddRestaurant()};
document.querySelector('#saveRestaurant').onclick=e=>{e.preventDefault();const form=document.querySelector('#restaurantForm'),f=new FormData(form),prices={plain:window.panoraParseDecimal?.(f.get('plainPrice'))??0,pumpkin:window.panoraParseDecimal?.(f.get('pumpkinPrice'))??0};customProducts().forEach(p=>prices[p.id]=window.panoraParseDecimal?.(f.get(`price_${p.id}`))??Number(p.basePrice||0));restaurants.push({id:crypto.randomUUID(),name:f.get('name'),partnerType:f.get('partnerType')||'restaurant',email:f.get('email'),accessCode:f.get('accessCode'),phone:f.get('phone'),telegram:String(f.get('telegram')||'').replace('@',''),language:f.get('language')||'ru',address:f.get('address'),prices});cSave('panora-restaurants',restaurants);document.querySelector('#restaurantDialog').close();form.reset();renderCommerce()};
const baseRenderRestaurants=renderRestaurants;renderRestaurants=function(){baseRenderRestaurants();const active=activeRestaurants(),cards=[...document.querySelectorAll('.restaurant-card')];cards.forEach((card,index)=>{const r=active[index],debt=card.querySelector('.debt-row');if(!r||!debt)return;customProducts().forEach(p=>{if(card.querySelector(`[data-price="${r.id}:${p.id}"]`))return;debt.insertAdjacentHTML('beforebegin',`<label class="price-row"><span>${productEscape(productLabel(p.id))}</span><span><input data-custom-price="${r.id}:${p.id}" type="text" inputmode="decimal" autocomplete="off" value="${(typeof adminPartnerPrice==="function"?adminPartnerPrice(r.id,p.id,r.prices[p.id]??p.basePrice??0):Number(r.prices[p.id]??p.basePrice??0)).toFixed(2)}"> €</span></label>`)});});document.querySelectorAll('[data-custom-price]').forEach(i=>{const commit=async()=>{const value=window.panoraParseDecimal?.(i.value);const [id,pid]=i.dataset.customPrice.split(':');if(value===null){i.value=Number(restaurant(id).prices[pid]??0).toFixed(2);return}restaurant(id).prices[pid]=value;i.value=value.toFixed(2);cSave('panora-restaurants',restaurants);try{if(window.panoraCloud?.saveRestaurantPriceConfirmed)await window.panoraCloud.saveRestaurantPriceConfirmed(id,pid,value);else await window.panoraCloud?.flushRestaurants?.()}catch(error){console.warn('Panora wholesale cloud save',error);alert(`Не удалось сохранить оптовую цену в облаке: ${error.message||error}`);return}window.dispatchEvent(new CustomEvent('panora:partner-prices-changed',{detail:{restaurantId:id,productId:pid,price:value}}));window.panoraPricing?.notifyWholesale(id,pid,value);window.dispatchEvent(new CustomEvent('panora:restaurants-ui-refresh',{detail:{source:'custom-price-save'}}))};i.onblur=commit;i.onchange=null;i.onfocus=()=>requestAnimationFrame(()=>i.select())})};
function orderLine(order,item){const prices=order.prices||restaurant(order.restaurantId)?.prices||{},price=Number(prices[item.product]||0),total=price*Number(item.quantity||0),snapshot=item?.nameSnapshot&&typeof item.nameSnapshot==='object'?(item.nameSnapshot.ru||item.nameSnapshot.en||item.nameSnapshot.es):'';return `<div class="order-price-line"><strong>${productEscape(snapshot||productLabel(item.product))}</strong><span>${item.quantity} шт. × ${euro(price)} = <b>${euro(total)}</b></span></div>`}
function orderStatusClass(status){return{submitted:'tag-new-order',confirmed:'tag-confirmed-order',shipped:'tag-shipped-order',cancelled:'tag-cancelled-order'}[status]||''}
/* renderOrders is owned by commerce.js. It also calls orderLine() when this
   module is loaded, so custom product prices and partner filtering coexist. */
/* Keep the shipment quantity editor defined in commerce.js. */
function addCustomOrderFields(){const form=document.querySelector('#orderForm'),hint=form.querySelector('.form-hint');form.querySelectorAll('[data-custom-order]').forEach(x=>x.remove());customProducts().forEach(p=>hint.insertAdjacentHTML('beforebegin',`<label data-custom-order><span>${productEscape(productLabel(p.id))}, шт.</span><input name="qty_${p.id}" type="number" min="0" step="1" placeholder="Количество"></label>`))}
const baseAddOrder=document.querySelector('#addOrder').onclick;document.querySelector('#addOrder').onclick=()=>{addCustomOrderFields();baseAddOrder()};
document.querySelector('#saveOrder').onclick=e=>{e.preventDefault();const form=document.querySelector('#orderForm'),f=new FormData(form),quantities={plain:Number(f.get('plain')||0),pumpkin:Number(f.get('pumpkin')||0)};customProducts().forEach(p=>quantities[p.id]=Number(f.get(`qty_${p.id}`)||0));const items=Object.entries(quantities).filter(([,quantity])=>quantity>0).map(([product,quantity])=>({product,quantity}));if(items.reduce((s,i)=>s+i.quantity,0)<12){alert('Минимальный заказ — 12 шт.');return}const r=restaurant(f.get('restaurant'));orders.push({id:crypto.randomUUID(),number:(orders.at(-1)?.number||0)+1,restaurantId:r.id,date:f.get('date'),deliveryDate:f.get('date'),items,prices:structuredClone(r.prices),taxRate:Number(bakerySettings.taxRate),status:'confirmed'});cSave('panora-orders',orders);syncPlansFromOrders();document.querySelector('#orderDialog').close();form.reset();renderCommerce();renderAll()};
syncProductSelects();renderProductManagement();renderProductCards();renderCommerce();
