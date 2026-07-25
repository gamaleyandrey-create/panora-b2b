/* Panora restaurant workspace: focused navigation over the existing secure account data. */
(()=>{
  'use strict';
  const previousRender=renderAccountModal;
  const tx={
    ru:{title:'Кабинет ресторана',newOrder:'Новый заказ',orders:'Мои заказы',notes:'Накладные',payments:'Оплаты',profile:'Профиль',debt:'Задолженность',prices:'Персональные цены',emptyOrders:'Заказов пока нет',emptyNotes:'Накладных пока нет',emptyPayments:'Операций пока нет',openNote:'Открыть накладную',bake:'Выпечка',delivery:'Поставка',pieces:'шт.',signOut:'Выйти',close:'Закрыть',pending:'Ожидает подтверждения',startOrder:'Выбрать хлеб и дату',orderHelp:'Выберите хлеб, затем подтвердите дату поставки в корзине.',phone:'Телефон',address:'Адрес доставки',finance:'Баланс и оплаты',deliveredTotal:'Поставлено',paidTotal:'Оплачено',pendingTotal:'Ожидает подтверждения',operationHistory:'История операций',payment:'Оплата',withoutNote:'без накладной',balanceAfter:'Остаток после операции'},
    en:{title:'Restaurant workspace',newOrder:'New order',orders:'My orders',notes:'Delivery notes',payments:'Payments',profile:'Profile',debt:'Balance due',prices:'Your prices',emptyOrders:'No orders yet',emptyNotes:'No delivery notes yet',emptyPayments:'No transactions yet',openNote:'Open delivery note',bake:'Bake',delivery:'Delivery',pieces:'pcs',signOut:'Sign out',close:'Close',pending:'Awaiting confirmation',startOrder:'Choose bread and date',orderHelp:'Choose bread, then confirm the delivery date in the basket.',phone:'Phone',address:'Delivery address',finance:'Balance and payments',deliveredTotal:'Delivered',paidTotal:'Paid',pendingTotal:'Awaiting confirmation',operationHistory:'Transaction history',payment:'Payment',withoutNote:'without delivery note',balanceAfter:'Balance after transaction'},
    es:{title:'Área del restaurante',newOrder:'Nuevo pedido',orders:'Mis pedidos',notes:'Albaranes',payments:'Pagos',profile:'Perfil',debt:'Deuda actual',prices:'Tus precios',emptyOrders:'Aún no hay pedidos',emptyNotes:'Aún no hay albaranes',emptyPayments:'Aún no hay movimientos',openNote:'Abrir albarán',bake:'Horneado',delivery:'Entrega',pieces:'uds.',signOut:'Salir',close:'Cerrar',pending:'Pendiente de confirmación',startOrder:'Elegir pan y fecha',orderHelp:'Elige el pan y confirma la fecha de entrega en la cesta.',phone:'Teléfono',address:'Dirección de entrega',finance:'Saldo y pagos',deliveredTotal:'Entregado',paidTotal:'Pagado',pendingTotal:'Pendiente de confirmar',operationHistory:'Historial de movimientos',payment:'Pago',withoutNote:'sin albarán',balanceAfter:'Saldo después del movimiento'}
  };
  const t=key=>(tx[lang]||tx.ru)[key];
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let activeTab='orders';

  const ownOrders=()=>portalOrders().filter(order=>order.restaurantId===account?.id).slice().sort((a,b)=>Number(b.number)-Number(a.number));
  const ownNotes=()=>portalNotes().filter(note=>note.restaurantId===account?.id).slice().sort((a,b)=>Number(b.number)-Number(a.number));
  const ownPayments=()=>portalPayments().filter(payment=>payment.restaurantId===account?.id).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const orderNumber=order=>`PN-${String(order.number).padStart(4,'0')}`;
  const noteNumber=note=>`DN-${String(note.number).padStart(4,'0')}`;
  const itemName=id=>typeof portalProduct==='function'?portalProduct(id):(PRODUCTS.find(product=>product.id===id)?.text?.[lang]?.[0]||id);
  const orderTotal=order=>typeof portalOrderTotal==='function'?portalOrderTotal(order):order.items.reduce((sum,item)=>sum+item.quantity*Number((order.prices||account.prices)[item.product]||0),0);
  const status=order=>typeof portalStatus==='function'?portalStatus(order.status):order.status;

  function profileHtml(){
    return `<aside class="rw-profile">
      <div class="rw-profile-main"><span class="account-avatar">${esc(account.name?.[0]?.toUpperCase()||'R')}</span><span><strong>${esc(account.name)}</strong><small>${esc(account.email)}</small></span></div>
      <div class="rw-balance"><span>${t('debt')}</span><strong>${portalMoney(accountDebt())}</strong></div>
      <dl><div><dt>${t('phone')}</dt><dd>${esc(account.phone||'—')}</dd></div><div><dt>${t('address')}</dt><dd>${esc(account.address||'—')}</dd></div></dl>
    </aside>`;
  }
  function newOrderHtml(){
    return `<section class="rw-empty rw-new-order"><span>＋</span><h3>${t('newOrder')}</h3><p>${t('orderHelp')}</p><button class="button button-primary" data-rw-start>${t('startOrder')}</button></section>`;
  }
  function ordersHtml(){
    const rows=ownOrders();
    if(!rows.length)return `<section class="rw-empty"><h3>${t('emptyOrders')}</h3><button class="button button-primary" data-rw-start>${t('newOrder')}</button></section>`;
    return `<section class="rw-list">${rows.map(order=>`<article class="rw-order">
      <header><span><strong>${orderNumber(order)}</strong><small>${t('delivery')}: ${esc(order.deliveryDate||order.date)}</small></span><b>${portalMoney(orderTotal(order))}</b></header>
      <div class="rw-order-status status-${esc(order.status)}">${esc(status(order))}</div>
      <ul>${order.items.map(item=>`<li><span>${esc(itemName(item.product))}</span><strong>${item.quantity} ${t('pieces')}<small>× ${portalMoney(Number((order.prices||account.prices)[item.product]||0))}</small></strong></li>`).join('')}</ul>
      <footer><span>${t('bake')}: <strong>${esc(order.date)}</strong></span>${canRestaurantCancel(order)?`<button class="rw-cancel" data-rw-cancel="${esc(order.id)}">${lang==='ru'?'Отменить заказ':lang==='es'?'Cancelar pedido':'Cancel order'}</button>`:''}</footer>
    </article>`).join('')}</section>`;
  }
  function notesHtml(){
    const notes=ownNotes(),orders=ownOrders();
    if(!notes.length)return `<section class="rw-empty"><h3>${t('emptyNotes')}</h3></section>`;
    return `<section class="rw-list">${notes.map(note=>{const order=orders.find(item=>item.id===note.orderId);return `<article class="rw-document">
      <span><strong>${noteNumber(note)}</strong><small>${t('delivery')}: ${esc(order?.deliveryDate||note.date)}</small></span>
      <b>${portalMoney(note.total)}</b>
      <button class="button button-ghost" data-rw-note="${esc(note.id)}">${t('openNote')}</button>
    </article>`}).join('')}</section>`;
  }
  function paymentsHtml(){
    const payments=ownPayments(),notes=ownNotes();
    const delivered=notes.reduce((sum,note)=>sum+Number(note.total||0),0);
    const paid=payments.filter(payment=>payment.confirmed!==false&&payment.status!=='cancelled').reduce((sum,payment)=>sum+Number(payment.amount||0),0);
    const pending=payments.filter(payment=>payment.confirmed===false&&payment.status!=='cancelled').reduce((sum,payment)=>sum+Number(payment.amount||0),0);
    const operations=[
      ...notes.map(note=>({date:note.date,kind:'delivery',amount:Number(note.total||0),label:noteNumber(note),note,sort:0})),
      ...payments.filter(payment=>payment.status!=='cancelled').map(payment=>({date:payment.date,kind:'payment',amount:-Number(payment.amount||0),label:payment.deliveryNoteId?noteNumber(notes.find(note=>note.id===payment.deliveryNoteId)||{number:'—'}):t('withoutNote'),payment,sort:1}))
    ].sort((a,b)=>String(a.date).localeCompare(String(b.date))||a.sort-b.sort);
    let running=0;
    operations.forEach(operation=>{if(operation.kind==='delivery'||operation.payment?.confirmed!==false)running+=operation.amount;operation.balance=running});
    const history=operations.reverse();
    return `<section class="rw-finance">
      <header><div><span class="kicker">Panora</span><h3>${t('finance')}</h3></div><div class="rw-finance-debt"><span>${t('debt')}</span><strong>${portalMoney(Math.max(0,delivered-paid))}</strong></div></header>
      <div class="rw-finance-stats">
        <article><span>${t('deliveredTotal')}</span><strong>${portalMoney(delivered)}</strong></article>
        <article><span>${t('paidTotal')}</span><strong>${portalMoney(paid)}</strong></article>
        <article><span>${t('pendingTotal')}</span><strong>${portalMoney(pending)}</strong></article>
      </div>
      <h4>${t('operationHistory')}</h4>
      ${history.length?`<div class="rw-finance-history">${history.map(operation=>`<article class="rw-operation ${operation.kind}${operation.payment?.confirmed===false?' pending':''}">
        <div><strong>${operation.kind==='delivery'?`${t('delivery')} · ${esc(operation.label)}`:`${t('payment')} · ${esc(operation.label)}`}</strong><small>${esc(operation.date)}${operation.payment?.method?` · ${esc(operation.payment.method)}`:''}${operation.payment?.note?` · ${esc(operation.payment.note)}`:''}</small></div>
        <div class="rw-operation-amount"><b>${operation.amount<0?'−':'+'}${portalMoney(Math.abs(operation.amount))}</b><small>${operation.payment?.confirmed===false?t('pending'):`${t('balanceAfter')}: ${portalMoney(Math.max(0,operation.balance))}`}</small></div>
      </article>`).join('')}</div>`:`<p class="rw-finance-empty">${t('emptyPayments')}</p>`}
    </section>`;
  }
  function pricesHtml(){
    const products=PRODUCTS.filter(product=>account.prices?.[product.id]!=null);
    return `<section class="rw-prices"><h3>${t('prices')}</h3>${products.map(product=>`<div><span>${esc(itemName(product.id))}</span><strong>${portalMoney(account.prices[product.id])}</strong></div>`).join('')}</section>`;
  }
  function contentHtml(){
    if(activeTab==='new')return newOrderHtml();
    if(activeTab==='notes')return notesHtml();
    if(activeTab==='payments')return paymentsHtml();
    if(activeTab==='profile')return `${profileHtml()}${pricesHtml()}`;
    return ordersHtml();
  }
  function bind(modal){
    modal.querySelectorAll('[data-rw-tab]').forEach(button=>button.onclick=()=>{activeTab=button.dataset.rwTab;renderAccountModal()});
    modal.querySelectorAll('[data-portal-close]').forEach(button=>button.onclick=closePanels);
    modal.querySelector('[data-rw-logout]')?.addEventListener('click',logoutAccount);
    modal.querySelectorAll('[data-rw-start]').forEach(button=>button.onclick=()=>{closePanels();document.querySelector('#catalog')?.scrollIntoView({behavior:'smooth',block:'start'})});
    modal.querySelectorAll('[data-rw-cancel]').forEach(button=>button.onclick=()=>restaurantCancelOrder(button.dataset.rwCancel));
    modal.querySelectorAll('[data-rw-note]').forEach(button=>button.onclick=()=>{const note=ownNotes().find(item=>item.id===button.dataset.rwNote);if(note)portalPrintNote(note)});
  }
  renderAccountModal=function(){
    const modal=document.querySelector('#profileModal');
    if(!account){
      modal?.classList.remove('restaurant-workspace');
      previousRender();
      return;
    }
    const counts={orders:ownOrders().length,notes:ownNotes().length,payments:ownPayments().length};
    modal.classList.add('restaurant-workspace');
    modal.innerHTML=`<div class="modal-head rw-head"><div><span class="kicker">Panora</span><h2>${t('title')}</h2></div><button class="close-button" data-portal-close>×</button></div>
      <div class="rw-layout">
        <nav class="rw-nav" aria-label="${t('title')}">
          ${[['new',t('newOrder'),'＋'],['orders',t('orders'),counts.orders],['notes',t('notes'),counts.notes],['payments',t('payments'),counts.payments],['profile',t('profile'),'●']].map(([key,label,badge])=>`<button class="${activeTab===key?'active':''}" data-rw-tab="${key}"><i>${badge}</i><span>${label}</span></button>`).join('')}
        </nav>
        <main class="rw-content">${contentHtml()}</main>
      </div>
      <footer class="rw-footer"><button class="button button-ghost" data-rw-logout>${t('signOut')}</button><button class="button button-primary" data-portal-close>${t('close')}</button></footer>`;
    bind(modal);
  };
})();
