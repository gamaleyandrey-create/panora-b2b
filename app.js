const products = [
  {id:'baguette',name:'Багет традиционный',category:'Багеты',description:'Хрустящая корочка, воздушный мякиш и длительная ферментация.',price:115,unit:'20 шт. в коробе',min:1,weight:'280 г',tag:'Хит',bg:'#e9dfca'},
  {id:'sourdough',name:'Тартин на закваске',category:'Ремесленный',description:'Пшенично-ржаной хлеб на живой закваске, ферментация 24 часа.',price:340,unit:'8 шт. в коробе',min:1,weight:'650 г',tag:'24 часа',bg:'#ded1b8'},
  {id:'brioche',name:'Бриошь сливочная',category:'Для завтраков',description:'Нежная французская бриошь на сливочном масле.',price:165,unit:'12 шт. в коробе',min:1,weight:'300 г',tag:'Завтрак',bg:'#f0dfbd'},
  {id:'ciabatta',name:'Чиабатта',category:'Ремесленный',description:'Пористый мякиш и тонкая корочка. Для сэндвичей и подачи.',price:145,unit:'16 шт. в коробе',min:1,weight:'320 г',tag:'HoReCa',bg:'#e6dac6'},
  {id:'mini',name:'Мини-булочки микс',category:'Для подачи',description:'Пшеничные, зерновые и ржаные булочки для хлебной корзины.',price:42,unit:'48 шт. в коробе',min:1,weight:'50 г',tag:'Микс',bg:'#ead7bb'},
  {id:'burger',name:'Булочка бриошь',category:'Для бургеров',description:'Ровная глянцевая булочка, держит соус и не размокает.',price:68,unit:'30 шт. в коробе',min:1,weight:'85 г',tag:'Burger',bg:'#efdbb2'}
];
const MIN_ORDER=2500;
const BAKE_WEEKDAYS=[3,6]; // среда и суббота; 0 = воскресенье
const CUTOFF_HOURS=36;
const money=n=>new Intl.NumberFormat('ru-RU').format(n)+' ₽';
let cart=JSON.parse(localStorage.getItem('panora-cart')||'{}');
let activeCategory='Все';
let selectedBakeDate='';
const $=s=>document.querySelector(s);
const categories=['Все',...new Set(products.map(p=>p.category))];

function getBakeDates(count=4){
  const dates=[];const cursor=new Date();cursor.setHours(9,0,0,0);
  for(let i=1;dates.length<count&&i<35;i++){
    const date=new Date(cursor);date.setDate(date.getDate()+i);
    if(BAKE_WEEKDAYS.includes(date.getDay())){
      const cutoff=new Date(date.getTime()-CUTOFF_HOURS*3600000);
      if(cutoff>new Date())dates.push({date,cutoff});
    }
  }
  return dates;
}
function dateValue(date){return date.toISOString().split('T')[0]}
function formatDate(date,weekday=true){return new Intl.DateTimeFormat('ru-RU',{weekday:weekday?'long':undefined,day:'numeric',month:'long'}).format(date)}
function renderBakeDates(){
  const dates=getBakeDates();
  if(!selectedBakeDate)selectedBakeDate=dateValue(dates[0].date);
  $('#bakeDates').innerHTML=dates.map(({date,cutoff})=>`<button class="bake-date ${dateValue(date)===selectedBakeDate?'active':''}" data-bake="${dateValue(date)}"><strong>${formatDate(date)}</strong><span>заказ до ${formatDate(cutoff,false)}, ${cutoff.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</span></button>`).join('');
  document.querySelectorAll('[data-bake]').forEach(button=>button.onclick=()=>{selectedBakeDate=button.dataset.bake;renderBakeDates();showToast('Дата выпечки выбрана')});
  $('#nextBakeHero').textContent=formatDate(dates[0].date);
  $('#cutoffHero').textContent=dates[0].cutoff.toLocaleDateString('ru-RU',{day:'numeric',month:'short'})+', '+dates[0].cutoff.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
  syncDateSelect();
}
function syncDateSelect(){
  const select=$('#deliveryDate');if(!select)return;
  select.innerHTML=getBakeDates().map(({date})=>`<option value="${dateValue(date)}" ${dateValue(date)===selectedBakeDate?'selected':''}>${formatDate(date)}</option>`).join('');
  select.onchange=()=>{selectedBakeDate=select.value;renderBakeDates()};
}

function renderCategories(){
  $('#categoryChips').innerHTML=categories.map(c=>`<button class="chip ${c===activeCategory?'active':''}" data-category="${c}">${c}</button>`).join('');
  document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{activeCategory=b.dataset.category;renderCategories();renderProducts()});
}
function renderProducts(){
  const visible=activeCategory==='Все'?products:products.filter(p=>p.category===activeCategory);
  $('#productGrid').innerHTML=visible.map(p=>{
    const qty=cart[p.id]||0;
    return `<article class="product-card"><div class="product-image" style="--product-bg:${p.bg}"><span class="product-tag">${p.tag}</span><div class="bread-art"></div></div><div class="product-info"><div class="product-name">${p.name}</div><p class="product-description">${p.description}</p><div class="product-meta"><span>${p.weight} / шт.</span><span>${p.unit}</span></div><div class="product-buy"><div class="price"><strong>${money(p.price)}</strong><span>за штуку</span></div>${qty?qtyControl(p.id,qty):`<button class="add-button" data-add="${p.id}">В корзину</button>`}</div></div></article>`;
  }).join('');
  document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>changeQty(b.dataset.add,1));
  bindQty();
}
function qtyControl(id,qty){return `<div class="qty-control"><button data-minus="${id}" aria-label="Уменьшить">−</button><strong>${qty}</strong><button data-plus="${id}" aria-label="Увеличить">+</button></div>`}
function bindQty(){
  document.querySelectorAll('[data-minus]').forEach(b=>b.onclick=()=>changeQty(b.dataset.minus,-1));
  document.querySelectorAll('[data-plus]').forEach(b=>b.onclick=()=>changeQty(b.dataset.plus,1));
}
function changeQty(id,delta){
  cart[id]=Math.max(0,(cart[id]||0)+delta);if(!cart[id])delete cart[id];localStorage.setItem('panora-cart',JSON.stringify(cart));renderProducts();renderCart();
  if(delta>0)showToast('Добавлено в корзину');
}
function cartData(){
  const rows=products.filter(p=>cart[p.id]).map(p=>({...p,boxes:cart[p.id],pieces:Number(p.unit.match(/\d+/)[0]),total:p.price*Number(p.unit.match(/\d+/)[0])*cart[p.id]}));
  return {rows,total:rows.reduce((s,p)=>s+p.total,0),count:rows.reduce((s,p)=>s+p.boxes,0)};
}
function renderCart(){
  const {rows,total,count}=cartData();
  $('#cartCount').textContent=count;$('#cartTotal').textContent=money(total);$('#subtotal').textContent=money(total);$('#summaryTotal').textContent=money(total);$('#checkoutTotal').textContent=money(total);
  $('#cartButton').classList.toggle('visible',count>0);$('#cartEmpty').style.display=count?'none':'block';$('#cartSummary').style.display=count?'block':'none';
  $('#cartItems').innerHTML=rows.map(p=>`<div class="cart-item"><div class="cart-thumb"><span></span></div><div><div class="cart-item-name">${p.name}</div><small>${p.unit} × ${p.boxes}</small>${qtyControl(p.id,p.boxes)}</div><strong>${money(p.total)}</strong></div>`).join('');
  bindQty();const missing=Math.max(0,MIN_ORDER-total);$('#minimumHint').style.display=missing?'block':'none';$('#minimumHint').textContent=`Добавьте ещё на ${money(missing)} до минимальной суммы.`;$('#checkoutButton').disabled=total<MIN_ORDER;
}
function openPanel(panel){$('#overlay').classList.add('open');panel.classList.add('open');panel.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}
function closePanels(){document.querySelectorAll('.drawer,.modal').forEach(p=>{p.classList.remove('open');p.setAttribute('aria-hidden','true')});$('#overlay').classList.remove('open');document.body.style.overflow=''}
function showToast(text){const t=$('#toast');t.textContent=text;t.classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>t.classList.remove('show'),1600)}
function openProfile(){openPanel($('#profileModal'))}
$('#cartButton').onclick=()=>openPanel($('#cartDrawer'));$('#checkoutButton').onclick=()=>{closePanels();setTimeout(()=>openPanel($('#checkoutModal')),180)};$('#overlay').onclick=closePanels;document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closePanels);$('#profileButton').onclick=openProfile;$('#mobileProfile').onclick=openProfile;
$('#repeatOrderButton').onclick=()=>showToast('Предыдущих заказов пока нет');$('#mobileOrders').onclick=()=>showToast('История заказов появится после первой поставки');
$('#checkoutForm').onsubmit=e=>{e.preventDefault();const data=new FormData(e.target);const {total}=cartData();const order={id:'PN-'+Date.now().toString().slice(-6),restaurant:data.get('restaurant'),date:data.get('date'),time:data.get('time'),total};localStorage.setItem('panora-last-order',JSON.stringify(order));cart={};localStorage.removeItem('panora-cart');closePanels();renderProducts();renderCart();$('#successText').textContent=`${order.id} · поставка ${new Date(order.date).toLocaleDateString('ru-RU')}`;$('#successMessage').classList.add('show');setTimeout(()=>$('#successMessage').classList.remove('show'),5000)};
renderBakeDates();renderCategories();renderProducts();renderCart();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
