(()=>{
  const cfg=window.PANORA_SUPABASE;
  if(!cfg)return;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const session=()=>window.panoraSupabaseSession||null;
  const authHeaders=()=>{
    const s=session();
    if(!s?.access_token)throw new Error('Нет активной сессии пекарни');
    return {
      apikey:cfg.publishableKey,
      Authorization:`Bearer ${s.access_token}`,
      'Content-Type':'application/json',
      'Cache-Control':'no-cache'
    };
  };
  const rest=async(path,options={})=>{
    const response=await fetch(`${cfg.url}/rest/v1/${path}`,{
      cache:'no-store',
      ...options,
      headers:{...authHeaders(),...(options.headers||{})}
    });
    const text=await response.text();
    if(!response.ok)throw new Error(`${response.status}: ${text||response.statusText}`);
    return text?JSON.parse(text):null;
  };

  let active=false;
  let loading=false;
  let lastRows=[];
  let ws=null;
  let reconnectTimer=0;
  let realtimeOk=false;

  const products=()=>{
    try{
      const list=JSON.parse(localStorage.getItem('panora-products')||'[]');
      return Array.isArray(list)?list.filter(p=>p&&p.active!==false&&!p.deletedAt):[];
    }catch{return[]}
  };
  const productLabel=id=>{
    const p=products().find(x=>String(x.id)===String(id));
    return p?.names?.ru||p?.name||String(id);
  };

  const screen=()=>document.querySelector('#view-restaurants');
  const cards=()=>document.querySelector('#restaurantCards');

  const render=rows=>{
    const root=cards();
    if(!root)return;
    lastRows=rows||[];
    root.innerHTML=(rows||[]).map(r=>{
      const prices=Object.fromEntries((r.restaurant_prices||[]).map(x=>[String(x.product_id),Number(x.price)]));
      const productList=products();
      return `<article class="restaurant-card" data-direct-restaurant="${esc(r.id)}">
        <div class="restaurant-card-head"><span class="tag">${esc(r.partner_type||'restaurant')}</span></div>
        <h3>${esc(r.name)}</h3>
        <p>${esc(r.email||'')}<br>${esc(r.address||'')}</p>
        ${productList.map(p=>{
          const value=prices[String(p.id)];
          const shown=Number(value??p.basePrice??p.price??0).toFixed(2);
          return `<label class="price-row"><span>${esc(productLabel(p.id))}<small>Оптовая цена</small></span><span><input data-direct-price="${esc(r.id)}:${esc(p.id)}" type="text" inputmode="decimal" autocomplete="off" value="${shown}"> €</span></label>`;
        }).join('')}
      </article>`;
    }).join('')||'<div class="empty-row">Нет партнёров.</div>';

    root.querySelectorAll('input[data-direct-price]').forEach(input=>{
      input.addEventListener('focus',()=>requestAnimationFrame(()=>input.select()));
      input.addEventListener('blur',async()=>{
        const [restaurantId,productId]=String(input.dataset.directPrice||'').split(':');
        const raw=String(input.value||'').replace(',','.').trim();
        const value=Number(raw);
        if(!restaurantId||!productId||!Number.isFinite(value)||value<0){
          await refresh();
          return;
        }
        input.disabled=true;
        try{
          const saved=await rest('restaurant_prices?on_conflict=restaurant_id,product_id',{
            method:'POST',
            headers:{Prefer:'resolution=merge-duplicates,return=representation'},
            body:JSON.stringify([{restaurant_id:restaurantId,product_id:productId,price:value,updated_at:new Date().toISOString()}])
          });
          const row=Array.isArray(saved)?saved[0]:null;
          if(!row)throw new Error('Supabase не вернул сохранённую цену');
          input.value=Number(row.price).toFixed(2);
          await refresh();
        }catch(error){
          console.error('Panora direct wholesale save',error);
          alert(`Не удалось сохранить оптовую цену: ${error.message||error}`);
          await refresh();
        }finally{
          input.disabled=false;
        }
      });
    });
  };

  const refresh=async()=>{
    if(!active||loading)return;
    loading=true;
    try{
      const rows=await rest('restaurants?select=id,name,email,address,partner_type,active,restaurant_prices(product_id,price,updated_at)&active=eq.true&order=created_at.asc');
      if(active)render(rows||[]);
    }catch(error){
      console.error('Panora direct partners refresh',error);
      const root=cards();
      if(root&&active)root.innerHTML=`<div class="empty-row">Ошибка загрузки цен из Supabase: ${esc(error.message||error)}</div>`;
    }finally{
      loading=false;
    }
  };

  const connectRealtime=()=>{
    clearTimeout(reconnectTimer);
    try{ws?.close()}catch{}
    ws=null;
    realtimeOk=false;
    const s=session();
    if(!s?.access_token||!cfg.url)return;
    const wsUrl=cfg.url.replace(/^http/,'ws')+'/realtime/v1/websocket?apikey='+encodeURIComponent(cfg.publishableKey)+'&vsn=1.0.0';
    try{
      ws=new WebSocket(wsUrl);
      ws.onopen=()=>{
        realtimeOk=true;
        ws.send(JSON.stringify({
          topic:'realtime:public:restaurant_prices',
          event:'phx_join',
          payload:{
            config:{
              broadcast:{ack:false,self:false},
              presence:{key:''},
              postgres_changes:[{event:'*',schema:'public',table:'restaurant_prices'}]
            },
            access_token:s.access_token
          },
          ref:'1'
        }));
      };
      ws.onmessage=event=>{
        try{
          const msg=JSON.parse(event.data||'{}');
          if(msg.event==='postgres_changes'&&active)refresh();
        }catch{}
      };
      ws.onerror=()=>{};
      ws.onclose=()=>{
        realtimeOk=false;
        if(active)reconnectTimer=setTimeout(connectRealtime,4000);
      };
    }catch{
      realtimeOk=false;
    }
  };

  const activate=()=>{
    active=true;
    refresh();
    connectRealtime();
  };
  const deactivate=()=>{
    active=false;
    clearTimeout(reconnectTimer);
    try{ws?.close()}catch{}
    ws=null;
  };

  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('.admin-nav [data-view]');
    if(!button)return;
    if(button.dataset.view==='restaurants')setTimeout(activate,50);
    else if(active)deactivate();
  },true);

  document.addEventListener('visibilitychange',()=>{if(active&&!document.hidden)refresh()});
  window.addEventListener('focus',()=>{if(active)refresh()});

  // If page restores directly on partners view.
  setTimeout(()=>{
    const view=screen();
    if(view?.classList.contains('active'))activate();
  },500);

  window.panoraDirectPartnerPrices={refresh,activate,deactivate};
})();