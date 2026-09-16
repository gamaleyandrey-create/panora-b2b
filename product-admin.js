const productRegistryDefaults=[
 {id:'plain',builtIn:true,active:true,weight:750,basePrice:4.5,image:'bread-plain.jpg',names:{ru:'Льняной бездрожжевой хлеб с семенами',en:'Yeast-free flaxseed bread with seeds',es:'Pan de lino sin levadura con semillas'},descriptions:{ru:'Бездрожжевой льняной хлеб с семенами.',en:'Yeast-free flaxseed bread with seeds.',es:'Pan de lino sin levadura con semillas.'}},
 {id:'pumpkin',builtIn:true,active:true,weight:750,basePrice:5,image:'bread-pumpkin.jpg',names:{ru:'Тыквенный бездрожжевой хлеб с семенами',en:'Yeast-free pumpkin bread with seeds',es:'Pan de calabaza sin levadura con semillas'},descriptions:{ru:'Бездрожжевой тыквенный хлеб с семенами.',en:'Yeast-free pumpkin bread with seeds.',es:'Pan de calabaza sin levadura con semillas.'}}
];
let productRegistry=cRead('panora-products',productRegistryDefaults);
window.panoraProductRegistry=()=>productRegistry;
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
const productLabel=(id,language=lang)=>{const p=productRegistry.find(p=>p.id===id);if(!p)return id;const current=['ru','en','es'].includes(language)?language:'en';return p.names?.[current]||(current==='es'?p.names?.en:p.names?.es)||p.names?.ru||id};
const productDescription=(p,language=lang)=>{const current=['ru','en','es'].includes(language)?language:'en';return p?.descriptions?.[current]||(current==='es'?p?.descriptions?.en:p?.descriptions?.es)||p?.descriptions?.ru||(current==='es'?'Descripción no disponible.':current==='en'?'No description.':'Описание не заполнено')};
productName=id=>productLabel(id);
function saveProducts(){persistProductRegistryCache(productRegistry);window.panoraCloud?.queueProducts();window.dispatchEvent(new CustomEvent('panora:products-changed'))}
function fileData(file){return new Promise(resolve=>{if(!file)return resolve('');const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const size=900,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d'),scale=Math.max(size/img.width,size/img.height),w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);resolve(canvas.toDataURL('image/webp',.84))};img.onerror=()=>resolve(reader.result);img.src=reader.result};reader.readAsDataURL(file)})}
const productEscape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
document.body.insertAdjacentHTML('beforeend',`<dialog id="productEditDialog" class="product-edit-dialog"><form method="dialog" id="productEditForm"><button type="button" class="dialog-close" id="closeProductEdit" aria-label="Закрыть">×</button><h3 id="productEditTitle">Карточка продукции</h3><input type="hidden" name="productId"><div class="product-photo-editor"><img id="productPhotoPreview" alt="Предпросмотр фотографии"><div><label><span>Главная фотография хлеба</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp"></label><button type="button" class="secondary" id="removeProductPhoto">Удалить главную фотографию</button><small>Рекомендуется квадратное фото JPG или WebP.</small></div></div><div class="product-gallery-editor"><label><span>Дополнительные фотографии</span><input name="galleryPhotos" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><div id="productGalleryPreview" class="product-gallery-preview"></div><button type="button" class="secondary" id="clearProductGallery">Удалить все дополнительные фото</button><small id="productGalleryHelp">Можно добавить до 6 дополнительных фотографий + 1 главную. Фото можно добавлять по одному или несколько сразу.</small></div><div class="settings-row"><label><span>Название RU</span><input name="nameRu" required></label><label><span>Название EN</span><input name="nameEn" required></label></div><label><span>Название ES</span><input name="nameEs" required></label><label><span>Описание RU</span><textarea name="descRu" rows="2"></textarea></label><label><span>Описание EN</span><textarea name="descEn" rows="2"></textarea></label><label><span>Описание ES</span><textarea name="descEs" rows="2"></textarea></label><div class="settings-row"><label><span>Вес одной штуки, г</span><input name="weight" type="number" min="1" required></label><label><span>Розничная цена, €</span><input name="basePrice" type="number" min="0" step="0.01" required><small>Цены партнёров настраиваются отдельно.</small></label></div><label><span>Раздел продукции</span><input name="category" list="panoraProductCategories" placeholder="Например: Хлеб"><datalist id="panoraProductCategories"><option value="Хлеб"><option value="Булочки и выпечка"><option value="Сезонное"><option value="Готовая продукция"><option value="Прочее"></datalist><small>Можно написать свой раздел. Он автоматически появится на витрине.</small></label><label><span>Оптовая цена действует от, шт.</span><input name="wholesaleMinQty" type="number" min="1" max="500" step="1" value="8" required><small>Для количества ниже этого порога партнёру применяется розничная цена.</small></label><label class="check"><input name="active" type="checkbox"><span>Товар активен внутри пекарни</span></label><label class="check"><input name="storefrontVisible" type="checkbox"><span>Показывать на витрине партнёров</span></label><div class="dialog-actions"><button type="button" id="cancelProductEdit">Отмена</button><button type="submit" class="primary">Сохранить карточку</button></div></form></dialog>`);
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
function productAdminCard(p,{archived=false}={}){
 const name=productEscape(productLabel(p.id));
 const image=productEscape(p.image||'icon.svg');
 const description=productEscape(productDescription(p));
 if(archived){
  return `<article class="product-admin-card product-admin-card-archived"><div class="product-admin-photo"><img src="${image}" alt="${name}"><span class="product-status off">Архив</span></div><div class="product-admin-body"><h3>${name}</h3><p>${description}</p><dl><div><dt>Вес</dt><dd>${Number(p.weight)||0} г</dd></div><div><dt>Розничная цена</dt><dd>${Number(p.basePrice||0).toFixed(2)} €</dd></div></dl><div class="product-card-actions"><button type="button" class="secondary product-restore-button" data-delete-product="${p.id}">Восстановить карточку</button></div></div></article>`;
 }
 return `<article class="product-admin-card"><div class="product-admin-photo"><img src="${image}" alt="${name}"><span class="product-status ${p.storefrontVisible===false?'off':''}">${p.storefrontVisible===false?'Скрыт с витрины':'На витрине'}</span></div><div class="product-admin-body"><h3>${name}</h3><p>${description}</p><dl><div><dt>Вес</dt><dd>${Number(p.weight)||0} г</dd></div><div><dt>Розничная цена</dt><dd>${Number(p.basePrice||0).toFixed(2)} €</dd></div><div><dt>Опт от</dt><dd>${Math.max(1,Number(p.wholesaleMinQty||8))} шт.</dd></div></dl><div class="product-storefront-control"><span>Показывать на витрине</span><button type="button" class="storefront-switch ${p.storefrontVisible===false?'off':'on'}" data-storefront-toggle="${p.id}" role="switch" aria-checked="${p.storefrontVisible===false?'false':'true'}"><span></span><b>${p.storefrontVisible===false?'Нет':'Да'}</b></button></div><div class="product-card-actions"><button type="button" class="primary" data-edit-product="${p.id}">Настроить карточку</button><button type="button" class="product-delete-button" data-delete-product="${p.id}">Удалить карточку</button></div></div></article>`;
}
function renderProductCards(){
 const grid=document.querySelector('#productAdminGrid'),archiveGrid=document.querySelector('#productArchiveGrid'),archiveSection=document.querySelector('#productArchiveSection'),archiveCount=document.querySelector('#productArchiveCount');
 if(!grid)return;
 const active=productRegistry.filter(p=>p.active!==false),archived=productRegistry.filter(p=>p.active===false);
 grid.innerHTML=active.length?active.map(p=>productAdminCard(p)).join(''):'<div class="product-admin-empty">Активных карточек нет. Создайте новый вид хлеба или восстановите карточку из архива.</div>';
 if(archiveGrid)archiveGrid.innerHTML=archived.map(p=>productAdminCard(p,{archived:true})).join('');
 if(archiveCount)archiveCount.textContent=String(archived.length);
 if(archiveSection)archiveSection.hidden=!archived.length;
 document.querySelectorAll('#productAdminGrid [data-edit-product]').forEach(b=>b.onclick=()=>openProductEditor(b.dataset.editProduct));
 document.querySelectorAll('#productAdminGrid [data-storefront-toggle]').forEach(b=>b.onclick=async()=>{const product=productRegistry.find(x=>x.id===b.dataset.storefrontToggle);if(!product||product.active===false)return;const previous=product.storefrontVisible!==false;product.storefrontVisible=!previous;persistProductRegistryCache(productRegistry);renderProductCards();try{if(!window.panoraCloud?.ready)throw new Error('Облако ещё загружается');const saved=await window.panoraCloud.saveProductConfirmed(product);Object.assign(product,saved);persistProductRegistryCache(productRegistry);window.dispatchEvent(new CustomEvent('panora:products-changed'));window.panoraPublicCatalog?.refresh?.().catch?.(()=>{});renderProductCards();}catch(error){product.storefrontVisible=previous;persistProductRegistryCache(productRegistry);renderProductCards();alert(`Не удалось изменить витрину: ${error.message||error}`)}});
 bindProductDeleteButtons(document.querySelector('#view-products')||document);
}
async function deleteProduct(productId,button){
 const p=productRegistry.find(x=>x.id===productId);if(!p)return;
 const name=productLabel(p.id),archived=p.active===false;
 const question=archived
  ?`Восстановить карточку «${name}»?\n\nОна вернётся в активные товары, но останется скрытой с витрины, пока вы не включите её отдельно.`
  :`Удалить карточку «${name}» из активных товаров?\n\nОна исчезнет из каталога пекарни, новых заказов, витрины и планирования и будет перенесена в Архив карточек. Старые заказы, накладные, цены и история сохранятся.`;
 if(!confirm(question))return;
 button.disabled=true;button.textContent=archived?'Восстанавливаю…':'Удаляю…';
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
  alert(archived?`Карточка «${name}» восстановлена. Включите её на витрине, когда товар снова готов к продаже.`:`Карточка «${name}» удалена из активных товаров и перенесена в Архив карточек. История заказов сохранена.`);
 }catch(error){
  p.active=previous.active;p.storefrontVisible=previous.storefrontVisible;
  persistProductRegistryCache(productRegistry);renderProductCards();
  button.disabled=false;button.textContent=archived?'Восстановить карточку':'Удалить карточку';
  alert(`Не удалось изменить статус товара: ${error.message||error}`);
 }
}
function bindProductDeleteButtons(root=document){root.querySelectorAll('[data-delete-product]').forEach(b=>b.onclick=()=>deleteProduct(b.dataset.deleteProduct,b))}
function openProductEditor(id=''){const p=productRegistry.find(x=>x.id===id),form=document.querySelector('#productEditForm');form.reset();form.productId.value=p?.id||'';form.nameRu.value=p?.names?.ru||'';form.nameEn.value=p?.names?.en||'';form.nameEs.value=p?.names?.es||'';form.descRu.value=p?.descriptions?.ru||'';form.descEn.value=p?.descriptions?.en||'';form.descEs.value=p?.descriptions?.es||'';form.weight.value=p?.weight||750;form.basePrice.value=p?.basePrice||0;form.wholesaleMinQty.value=Math.max(1,Number(p?.wholesaleMinQty||8));form.category.value=p?.category||'Хлеб';form.active.checked=p?.active!==false;form.storefrontVisible.checked=p?.storefrontVisible!==false;form.photo.value='';form.galleryPhotos.value='';removeEditedPhoto=false;clearEditedGallery=false;editedGallery=[...(Array.isArray(p?.gallery)?p.gallery:[])].filter(Boolean).slice(0,6);document.querySelector('#productEditTitle').textContent=p?'Настроить карточку':'Новый вид хлеба';document.querySelector('#productPhotoPreview').src=p?.image||'icon.svg';renderGalleryPreview();document.querySelector('#productEditDialog').showModal()}
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
document.querySelector('#productEditForm').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;const submit=form.querySelector('[type="submit"]'),f=new FormData(form),id=f.get('productId')||`bread-${Date.now()}`,existing=productRegistry.find(x=>x.id===id),isNew=!existing;submit.disabled=true;submit.textContent='Сохраняю…';try{const uploaded=await fileData(form.photo.files[0]);const uploadedGallery=editedGallery.filter(Boolean).slice(0,6);const p={...(existing||{}),id,active:f.get('active')==='on',storefrontVisible:f.get('storefrontVisible')==='on',builtIn:existing?.builtIn||false,names:{ru:f.get('nameRu').trim(),en:f.get('nameEn').trim(),es:f.get('nameEs').trim()},descriptions:{ru:f.get('descRu').trim(),en:f.get('descEn').trim(),es:f.get('descEs').trim()},weight:Number(f.get('weight')),basePrice:Number(f.get('basePrice')),wholesaleMinQty:Math.max(1,Number(f.get('wholesaleMinQty')||8)),category:(f.get('category')||'Хлеб').trim(),image:uploaded||(!removeEditedPhoto&&existing?.image)||((id==='plain'?'bread-plain.jpg':id==='pumpkin'?'bread-pumpkin.jpg':'icon.svg')),gallery:uploadedGallery};
if(uploaded||removeEditedPhoto)delete p._imageCloudOnly;
if(clearEditedGallery||editedGallery.length)delete p._galleryCloudOnly;if(!window.panoraCloud?.ready)throw new Error('Облако ещё загружается. Подождите несколько секунд и повторите.');const confirmed=await window.panoraCloud.saveProductConfirmed(p);if(existing)Object.assign(existing,confirmed);else productRegistry.push(confirmed);syncAdminProductRegistry();persistProductRegistryCache(productRegistry);window.dispatchEvent(new CustomEvent('panora:products-changed'));window.panoraPricing?.notifyRetail(p.id,Number(p.basePrice??0));window.dispatchEvent(new CustomEvent('panora:retail-cloud-committed',{detail:{productId:p.id,price:Number(p.basePrice??0)}}));if(isNew){recipes[id]=[];store('panora-recipes',recipes);restaurants.forEach(r=>{r.prices??={};r.prices[id]=Number(p.basePrice||0)});cSave('panora-restaurants',restaurants);window.panoraCloud.queueRestaurants()}closeProductEditor();renderProductCards();renderAll();renderProductManagement()}catch(error){alert(`Не удалось сохранить хлеб: ${error.message||error}`)}finally{submit.disabled=false;submit.textContent='Сохранить карточку'}};
document.querySelector('#addProductCard').onclick=()=>openProductEditor();
const recipeHead=document.querySelector('#view-recipes .page-head');
recipeHead.insertAdjacentHTML('beforeend','<button class="primary" id="addBreadType">+ Новый вид хлеба</button>');
document.body.insertAdjacentHTML('beforeend',`<dialog id="breadTypeDialog"><form method="dialog" id="breadTypeForm"><h3>Новый вид хлеба</h3><div class="settings-row"><label><span>Название RU</span><input name="nameRu" required></label><label><span>Название EN</span><input name="nameEn" required></label></div><label><span>Название ES</span><input name="nameEs" required></label><div class="settings-row"><label><span>Вес, г</span><input name="weight" type="number" min="1" value="750" required></label><label><span>Розничная цена, €</span><input name="basePrice" type="number" min="0" step="0.01" value="0"></label></div><label><span>Оптовая цена действует от, шт.</span><input name="wholesaleMinQty" type="number" min="1" max="500" step="1" value="8" required></label><label><span>Описание RU</span><input name="descRu"></label><label><span>Описание EN</span><input name="descEn"></label><label><span>Описание ES</span><input name="descEs"></label><label><span>Фотография карточки</span><input name="photo" type="file" accept="image/*"></label><label class="check"><input name="active" type="checkbox" checked><span>Показывать в каталоге</span></label><div class="dialog-actions"><button value="cancel">Отмена</button><button class="primary" id="saveBreadType">Создать хлеб и рецепт</button></div></form></dialog>`);
document.querySelector('#addBreadType').onclick=()=>openProductEditor();
document.querySelector('#saveBreadType').onclick=async e=>{e.preventDefault();const form=document.querySelector('#breadTypeForm');if(!form.reportValidity())return;const f=new FormData(form),id=`bread-${Date.now()}`,image=await fileData(form.photo.files[0]);productRegistry.push({id,builtIn:false,active:f.get('active')==='on',storefrontVisible:f.get('active')==='on',weight:Number(f.get('weight')||750),basePrice:Number(f.get('basePrice')||0),wholesaleMinQty:Math.max(1,Number(f.get('wholesaleMinQty')||8)),category:'Хлеб',image:image||'icon.svg',names:{ru:f.get('nameRu').trim(),en:f.get('nameEn').trim(),es:f.get('nameEs').trim()},descriptions:{ru:f.get('descRu')?.trim()||'',en:f.get('descEn')?.trim()||'',es:f.get('descEs')?.trim()||''}});recipes[id]=[];saveProducts();store('panora-recipes',recipes);await window.panoraCloud?.flushProducts?.();form.reset();form.weight.value=750;document.querySelector('#breadTypeDialog').close();renderAll();renderProductManagement()};
function renderProductManagement(){document.querySelectorAll('.product-manage').forEach(x=>x.remove());document.querySelectorAll('.recipe-card').forEach((card,index)=>{const p=productRegistry[index];if(!p)return;card.insertAdjacentHTML('beforeend',`<div class="product-manage"><span class="product-manage-status">${p.active===false?'Карточка в архиве':'Карточка активна'}</span><button type="button" class="product-delete-button" data-delete-product="${p.id}">${p.active===false?'Восстановить карточку':'Удалить карточку'}</button></div>`)});bindProductDeleteButtons(document)}
const originalRenderRecipes=renderRecipes;renderRecipes=function(){originalRenderRecipes();renderProductManagement()};
const planEditorCopy=()=>{const l=String(document.querySelector('#adminLanguage')?.value||localStorage.getItem('panora-admin-lang')||'ru');return l==='en'?{legend:'Bread planned for this bake',hint:'Select the breads that will be baked. Quantity is optional and can be changed later.',ordered:'Ordered',auto:'updates automatically',plan:'Plan, pcs',optional:'optional',placeholder:'By orders',choose:'Select at least one bread for this bake day.',locked:'There are active orders for this bread, so it stays selected.',newTitle:'Schedule bake day',editTitle:'Edit bake day',bakeDate:'Bake date',deliveryDate:'Delivery date',extra:'Additional settings',cutoff:'Order cutoff',accepting:'Accept orders',cancelDay:'Cancel bake day',close:'Close',save:'Save day'}:l==='es'?{legend:'Panes previstos para este horneado',hint:'Marca los panes que se hornearán. La cantidad es opcional y puede cambiarse después.',ordered:'Pedido',auto:'se actualiza automáticamente',plan:'Plan, uds.',optional:'opcional',placeholder:'Según pedidos',choose:'Selecciona al menos un pan para este día de horneado.',locked:'Hay pedidos activos de este pan, por lo que permanece seleccionado.',newTitle:'Programar día de horneado',editTitle:'Editar día de horneado',bakeDate:'Fecha de horneado',deliveryDate:'Fecha de entrega',extra:'Ajustes adicionales',cutoff:'Cierre de pedidos',accepting:'Aceptar pedidos',cancelDay:'Cancelar día de horneado',close:'Cerrar',save:'Guardar día'}:{legend:'Хлеб на этот день',hint:'Отметьте хлеб, который планируется выпекать. Количество необязательно и его можно менять позже.',ordered:'Заказано',auto:'обновляется автоматически',plan:'План, шт.',optional:'необязательно',placeholder:'По заказам',choose:'Отметьте хотя бы один хлеб для этого дня выпечки.',locked:'По этому хлебу уже есть активные заказы, поэтому он остаётся выбранным.',newTitle:'Назначить день выпечки',editTitle:'Изменить день выпечки',bakeDate:'Дата выпечки',deliveryDate:'Дата доставки',extra:'Дополнительные настройки',cutoff:'Приём заказов до',accepting:'Принимать заказы',cancelDay:'Отменить день выпечки',close:'Закрыть',save:'Сохранить день'}};
function planDemandFor(date,product){const partner=(plans||[]).filter(p=>String(p?.bakeDate||'')===String(date||'')&&String(p?.product||'')===String(product||'')).reduce((sum,p)=>sum+Math.max(0,Number(p?.ordered||0)),0);let retail=0;try{if(typeof retailPreorderQuantity==='function')retail=Math.max(0,Number(retailPreorderQuantity(date,product)||0))}catch{}return partner+retail}
function localizePlanDialog(hasEntries=false){const copy=planEditorCopy(),form=document.querySelector('#planForm');if(!form)return;const title=form.querySelector('h3'),hint=form.querySelector('.form-hint');if(title)title.textContent=hasEntries?copy.editTitle:copy.newTitle;if(hint)hint.textContent=copy.hint;const bakeLabel=form.elements.bakeDate?.closest('label')?.querySelector('span'),deliveryLabel=form.elements.deliveryDate?.closest('label')?.querySelector('span'),cutoffLabel=form.elements.cutoff?.closest('label')?.querySelector('span'),acceptingLabel=form.elements.open?.closest('label')?.querySelector('span'),summary=form.querySelector('.plan-extra summary'),cancelDay=document.querySelector('#cancelSelectedBake'),close=document.querySelector('#cancelPlan'),save=document.querySelector('#savePlan'),x=document.querySelector('#closePlan');if(bakeLabel)bakeLabel.textContent=copy.bakeDate;if(deliveryLabel)deliveryLabel.textContent=copy.deliveryDate;if(cutoffLabel)cutoffLabel.textContent=copy.cutoff;if(acceptingLabel)acceptingLabel.textContent=copy.accepting;if(summary)summary.textContent=copy.extra;if(cancelDay)cancelDay.textContent=copy.cancelDay;if(close)close.textContent=copy.close;if(save)save.textContent=copy.save;if(x)x.setAttribute('aria-label',copy.close)}
function buildPlanProductFields(date=''){const box=document.querySelector('.bread-plan-fields'),copy=planEditorCopy(),targetDate=String(date||document.querySelector('#planForm')?.bakeDate?.value||'');if(!box)return;box.innerHTML=`<legend>${copy.legend}</legend>`+productRegistry.filter(p=>p.active!==false).map(p=>{const existing=(plans||[]).find(x=>String(x?.bakeDate||'')===targetDate&&String(x?.product||'')===String(p.id)),demand=planDemandFor(targetDate,p.id),selected=Boolean(existing)||demand>0,manual=Math.max(0,Number(existing?.planned||0)),locked=demand>0;return `<div class="plan-product-row ${selected?'is-selected':''}" data-plan-row="${p.id}"><label class="plan-product-choice"><input type="checkbox" data-plan-enabled="${p.id}" ${selected?'checked':''} ${locked?'disabled':''}><span><strong>${productEscape(productLabel(p.id))}</strong><small>${copy.ordered}: <b>${demand}</b> · ${copy.auto}${locked?`<em>${copy.locked}</em>`:''}</small></span></label><label class="plan-product-quantity"><span>${copy.plan} <small>${copy.optional}</small></span><input type="number" min="0" max="5000" step="1" placeholder="${copy.placeholder}" data-plan-product="${p.id}" value="${manual>0?manual:''}" ${selected?'':'disabled'}></label></div>`}).join('');box.querySelectorAll('[data-plan-enabled]').forEach(check=>{check.onchange=()=>{const row=check.closest('[data-plan-row]'),input=row?.querySelector('[data-plan-product]');row?.classList.toggle('is-selected',check.checked);if(input)input.disabled=!check.checked}})}
window.panoraBuildPlanProductFields=buildPlanProductFields;window.panoraLocalizePlanDialog=localizePlanDialog;
function saveBakePlanFromForm(form=document.querySelector('#planForm')){if(!form)return false;const copy=planEditorCopy(),f=new FormData(form),error=document.querySelector('#planError'),bakeDate=String(f.get('bakeDate')||''),deliveryDate=String(f.get('deliveryDate')||''),rawCutoff=String(f.get('cutoff')||''),cutoff=typeof cutoffToIso==='function'?cutoffToIso(rawCutoff):rawCutoff;if(error)error.textContent='';if(!form.reportValidity())return false;if(deliveryDate<bakeDate){if(error)error.textContent=String(document.querySelector('#adminLanguage')?.value)==='en'?'Delivery date cannot be before the bake date.':String(document.querySelector('#adminLanguage')?.value)==='es'?'La fecha de entrega no puede ser anterior a la fecha de horneado.':'Дата доставки не может быть раньше даты выпечки.';form.deliveryDate.focus();return false}if(!cutoff){if(error)error.textContent=String(document.querySelector('#adminLanguage')?.value)==='en'?'Check the order cutoff date and time.':String(document.querySelector('#adminLanguage')?.value)==='es'?'Comprueba la fecha y hora de cierre de pedidos.':'Проверьте дату и время окончания приёма заказов.';form.cutoff.focus();return false}if(new Date(cutoff)>=new Date(`${bakeDate}T23:59:59`)){if(error)error.textContent=String(document.querySelector('#adminLanguage')?.value)==='en'?'Order cutoff must be before the end of the bake day.':String(document.querySelector('#adminLanguage')?.value)==='es'?'El cierre de pedidos debe ser anterior al final del día de horneado.':'Приём заказов должен завершиться до окончания дня выпечки.';form.cutoff.focus();return false}const rows=[...form.querySelectorAll('[data-plan-row]')],selected=rows.filter(row=>row.querySelector('[data-plan-enabled]')?.checked);if(!selected.length){if(error)error.textContent=copy.choose;return false}const selectedIds=new Set(selected.map(row=>String(row.dataset.planRow)));plans=plans.filter(p=>String(p?.bakeDate||'')!==bakeDate||selectedIds.has(String(p?.product||''))||planDemandFor(bakeDate,p?.product)>0);selected.forEach(row=>{const product=String(row.dataset.planRow),input=row.querySelector('[data-plan-product]'),planned=String(input?.value||'').trim()===''?0:Math.max(0,Math.floor(Number(input.value)||0)),existing=plans.find(p=>String(p?.bakeDate||'')===bakeDate&&String(p?.product||'')===product);if(existing)Object.assign(existing,{deliveryDate,planned,cutoff,open:f.get('open')==='on'});else plans.push({id:crypto.randomUUID(),bakeDate,deliveryDate,product,planned,ordered:0,cutoff,open:f.get('open')==='on'})});store('panora-production-plans',plans);document.querySelector('#planDialog')?.close();renderAll();return true}
window.panoraSaveBakePlanFromForm=saveBakePlanFromForm;
const originalAddPlan=document.querySelector('#addPlan').onclick;document.querySelector('#addPlan').onclick=()=>{originalAddPlan();const form=document.querySelector('#planForm'),date=form?.bakeDate?.value||'';buildPlanProductFields(date);localizePlanDialog((plans||[]).some(p=>String(p?.bakeDate||'')===String(date)))};
document.querySelector('#savePlan').onclick=e=>{e.preventDefault();saveBakePlanFromForm(document.querySelector('#planForm'))};
function syncProductSelects(){['#movementForm select[name="product"]'].forEach(sel=>{const el=document.querySelector(sel);if(el)el.innerHTML=productRegistry.filter(p=>p.active!==false).map(p=>`<option value="${p.id}">${productEscape(productLabel(p.id))}</option>`).join('')})}
function customProducts(){return productRegistry.filter(p=>!p.builtIn&&p.active!==false)}
function addCustomRestaurantFields(){const form=document.querySelector('#restaurantForm'),actions=form.querySelector('.dialog-actions');form.querySelectorAll('[data-new-product-price]').forEach(x=>x.remove());customProducts().forEach(p=>actions.insertAdjacentHTML('beforebegin',`<label data-new-product-price><span>${productEscape(productLabel(p.id))} — оптовая цена, € / шт.</span><input name="price_${p.id}" type="text" inputmode="decimal" autocomplete="off" value="${p.basePrice||0}" required></label>`))}
const baseAddRestaurant=document.querySelector('#addRestaurant').onclick;document.querySelector('#addRestaurant').onclick=()=>{addCustomRestaurantFields();baseAddRestaurant()};
document.querySelector('#saveRestaurant').onclick=e=>{e.preventDefault();const form=document.querySelector('#restaurantForm'),f=new FormData(form),prices={plain:window.panoraParseDecimal?.(f.get('plainPrice'))??0,pumpkin:window.panoraParseDecimal?.(f.get('pumpkinPrice'))??0};customProducts().forEach(p=>prices[p.id]=window.panoraParseDecimal?.(f.get(`price_${p.id}`))??Number(p.basePrice||0));restaurants.push({id:crypto.randomUUID(),name:f.get('name'),partnerType:f.get('partnerType')||'restaurant',email:f.get('email'),accessCode:f.get('accessCode'),phone:f.get('phone'),whatsapp:String(f.get('whatsapp')||'').trim(),telegram:String(f.get('telegram')||'').trim(),language:f.get('language')||'ru',address:f.get('address'),legalName:String(f.get('legalName')||'').trim(),taxId:String(f.get('taxId')||'').trim().toUpperCase(),billingAddress:String(f.get('billingAddress')||'').trim(),extraMessengers:[["Signal",String(f.get('signal')||'').trim()],["Viber",String(f.get('viber')||'').trim()],["Messenger",String(f.get('messenger')||'').trim()],["__preferred__",String(f.get('preferredChannel')||'whatsapp').trim()],["__reminder_orders__",f.get('reminderOrders')?'1':'0'],["__reminder_payments__",f.get('reminderPayments')?'1':'0'],["__reminder_paused__",f.get('reminderPaused')?'1':'0']].filter(([,contact])=>contact!=="").map(([name,contact])=>({name,contact})),prices});cSave('panora-restaurants',restaurants);document.querySelector('#restaurantDialog').close();form.reset();renderCommerce()};
const baseRenderRestaurants=renderRestaurants;renderRestaurants=function(){baseRenderRestaurants();const active=activeRestaurants(),cards=[...document.querySelectorAll('.restaurant-card')];cards.forEach((card,index)=>{const r=active[index],debt=card.querySelector('.debt-row');if(!r||!debt)return;customProducts().forEach(p=>{if(card.querySelector(`[data-price="${r.id}:${p.id}"]`))return;debt.insertAdjacentHTML('beforebegin',`<label class="price-row"><span>${productEscape(productLabel(p.id))}</span><span><input data-custom-price="${r.id}:${p.id}" type="text" inputmode="decimal" autocomplete="off" value="${(typeof adminPartnerPrice==="function"?adminPartnerPrice(r.id,p.id,r.prices[p.id]??p.basePrice??0):Number(r.prices[p.id]??p.basePrice??0)).toFixed(2)}"> €</span></label>`)});});document.querySelectorAll('[data-custom-price]').forEach(i=>{const commit=async()=>{const value=window.panoraParseDecimal?.(i.value);const [id,pid]=i.dataset.customPrice.split(':');if(value===null){i.value=Number(restaurant(id).prices[pid]??0).toFixed(2);return}restaurant(id).prices[pid]=value;i.value=value.toFixed(2);cSave('panora-restaurants',restaurants);try{if(window.panoraCloud?.saveRestaurantPriceConfirmed)await window.panoraCloud.saveRestaurantPriceConfirmed(id,pid,value);else await window.panoraCloud?.flushRestaurants?.()}catch(error){console.warn('Panora wholesale cloud save',error);alert(`Не удалось сохранить оптовую цену в облаке: ${error.message||error}`);return}window.dispatchEvent(new CustomEvent('panora:partner-prices-changed',{detail:{restaurantId:id,productId:pid,price:value}}));window.panoraPricing?.notifyWholesale(id,pid,value);window.dispatchEvent(new CustomEvent('panora:restaurants-ui-refresh',{detail:{source:'custom-price-save'}}))};i.onblur=commit;i.onchange=null;i.onfocus=()=>requestAnimationFrame(()=>i.select())})};
function orderLine(order,item){const prices=order.prices||restaurant(order.restaurantId)?.prices||{},price=Number(prices[item.product]||0),total=price*Number(item.quantity||0),snapshot=item?.nameSnapshot&&typeof item.nameSnapshot==='object'?(item.nameSnapshot.ru||item.nameSnapshot.en||item.nameSnapshot.es):'';return `<div class="order-price-line"><strong>${productEscape(snapshot||productLabel(item.product))}</strong><span>${item.quantity} шт. × ${euro(price)} = <b>${euro(total)}</b></span></div>`}
function orderStatusClass(status){return{submitted:'tag-new-order',confirmed:'tag-confirmed-order',shipped:'tag-shipped-order',cancelled:'tag-cancelled-order'}[status]||''}
/* renderOrders is owned by commerce.js. It also calls orderLine() when this
   module is loaded, so custom product prices and partner filtering coexist. */
/* Keep the shipment quantity editor defined in commerce.js. */
function addCustomOrderFields(){const form=document.querySelector('#orderForm'),hint=form.querySelector('.form-hint');form.querySelectorAll('[data-custom-order]').forEach(x=>x.remove());customProducts().forEach(p=>hint.insertAdjacentHTML('beforebegin',`<label data-custom-order><span>${productEscape(productLabel(p.id))}, шт.</span><input name="qty_${p.id}" type="number" min="0" step="1" placeholder="Количество"></label>`))}
const baseAddOrder=document.querySelector('#addOrder').onclick;document.querySelector('#addOrder').onclick=()=>{addCustomOrderFields();baseAddOrder()};
document.querySelector('#saveOrder').onclick=e=>{e.preventDefault();const form=document.querySelector('#orderForm'),f=new FormData(form),quantities={plain:Number(f.get('plain')||0),pumpkin:Number(f.get('pumpkin')||0)};customProducts().forEach(p=>quantities[p.id]=Number(f.get(`qty_${p.id}`)||0));const items=Object.entries(quantities).filter(([,quantity])=>quantity>0).map(([product,quantity])=>({product,quantity}));if(!items.length){alert('Добавьте хотя бы одну позицию в заказ.');return}const r=restaurant(f.get('restaurant'));const prices=typeof manualOrderPriceMap==='function'?manualOrderPriceMap(r,items):Object.fromEntries(items.map(item=>{const p=productRegistry.find(product=>product.id===item.product),retail=Number(p?.basePrice||0),threshold=Math.max(1,Number(p?.wholesaleMinQty||8)),wholesale=Number(r?.prices?.[item.product]??retail);return[item.product,item.quantity>=threshold?(wholesale||retail):retail]}));const now=new Date().toISOString(),confirmImmediately=f.get('confirmImmediately')==='on',bakeryActor='Пекарня';orders.push({id:crypto.randomUUID(),number:null,restaurantId:r.id,date:f.get('date'),deliveryDate:f.get('date'),deliveryWindow:String(f.get('deliveryWindow')||''),items,prices,taxRate:Number(bakerySettings.taxRate),status:confirmImmediately?'confirmed':'submitted',createdSource:'bakery_manual_order',createdByRole:'admin',createdByName:bakeryActor,createdByAt:now,confirmedByRole:confirmImmediately?'admin':'',confirmedByName:confirmImmediately?bakeryActor:'',confirmedAt:confirmImmediately?now:'',_serverNumberPending:true,_itemSyncRequired:true});cSave('panora-orders',orders);syncPlansFromOrders();document.querySelector('#orderDialog').close();form.reset();renderCommerce();renderAll()};
syncProductSelects();renderProductManagement();renderProductCards();renderCommerce();
