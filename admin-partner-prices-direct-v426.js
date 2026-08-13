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

  // Drafts are kept locally until the bakery explicitly presses "Сохранить цены".
  const drafts=new Map(); // key restaurantId:productId -> number
  const savingRestaurants=new Set();

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
  const partnerTypeLabel=value=>({
    restaurant:'Ресторан',shop:'Магазин',hotel:'Отель',cafe:'Кафе',
    catering:'Кейтеринг',other:'Другое'
  }[String(value||'').toLowerCase()]||'Партнёр');

  const screen=()=>document.querySelector('#view-restaurants');
  const cards=()=>document.querySelector('#restaurantCards');
  const draftKey=(restaurantId,productId)=>`${restaurantId}:${productId}`;
  const partnerHasDrafts=restaurantId=>[...drafts.keys()].some(key=>key.startsWith(`${restaurantId}:`));

  const syncCaches=(restaurantId,values)=>{
    try{
      const restaurants=JSON.parse(localStorage.getItem('panora-restaurants')||'[]');
      const next=(Array.isArray(restaurants)?restaurants:[]).map(r=>{
        if(String(r.id)!==String(restaurantId))return r;
        return {...r,prices:{...(r.prices||{}),...values}};
      });
      localStorage.setItem('panora-restaurants',JSON.stringify(next));
    }catch{}
    try{
      const map=JSON.parse(localStorage.getItem('panora-admin-restaurant-prices-v420')||'{}')||{};
      map[String(restaurantId)]??={};
      Object.entries(values).forEach(([productId,price])=>{
        map[String(restaurantId)][productId]=Number(price);
      });
      localStorage.setItem('panora-admin-restaurant-prices-v420',JSON.stringify(map));
    }catch{}
  };

  const render=rows=>{
    const root=cards();
    if(!root)return;
    lastRows=rows||[];
    root.innerHTML=(rows||[]).map(r=>{
      const prices=Object.fromEntries((r.restaurant_prices||[]).map(x=>[String(x.product_id),Number(x.price)]));
      const productList=products();
      const restaurantId=String(r.id);
      return `<article class="restaurant-card" data-direct-restaurant="${esc(r.id)}">
        <div class="restaurant-card-head"><span class="tag">${esc(partnerTypeLabel(r.partner_type))}</span></div>
        <h3>${esc(r.name)}</h3>
        <p>${esc(r.email||'')}<br>${esc(r.address||'')}</p>
        ${productList.map(p=>{
          const productId=String(p.id);
          const key=draftKey(restaurantId,productId);
          const saved=Number(prices[productId]??p.basePrice??p.price??0);
          const shown=drafts.has(key)?Number(drafts.get(key)):saved;
          return `<label class="price-row${drafts.has(key)?' price-row-dirty':''}" data-direct-price-row="${esc(key)}" data-panora-price-owned="direct">
            <span>${esc(productLabel(p.id))}<small>Оптовая цена</small></span>
            <span><input data-direct-price="${esc(key)}" type="text" inputmode="decimal" autocomplete="off" value="${shown.toFixed(2)}"> €</span>
          </label>`;
        }).join('')}
        <div class="partner-price-savebar${partnerHasDrafts(restaurantId)?' is-visible':''}" data-price-savebar="${esc(restaurantId)}">
          <span class="partner-price-status" data-price-status="${esc(restaurantId)}">${partnerHasDrafts(restaurantId)?'Есть несохранённые изменения':''}</span>
          <button type="button" class="partner-price-save" data-save-partner-prices="${esc(restaurantId)}"${partnerHasDrafts(restaurantId)?'':' hidden'}>Сохранить цены</button>
        </div>
      </article>`;
    }).join('')||'<div class="empty-row">Нет партнёров.</div>';

    root.querySelectorAll('input[data-direct-price]').forEach(input=>{
      const key=String(input.dataset.directPrice||'');
      const [restaurantId,productId]=key.split(':');

      const parse=()=>{
        const raw=String(input.value||'').replace(/\s+/g,'').replace(',','.').trim();
        if(raw==='')return null;
        const value=Number(raw);
        return Number.isFinite(value)&&value>=0?value:null;
      };

      const markDirty=()=>{
        const value=parse();
        const partner=lastRows.find(r=>String(r.id)===String(restaurantId));
        const savedRow=(partner?.restaurant_prices||[]).find(x=>String(x.product_id)===String(productId));
        const saved=Number(savedRow?.price??0);
        const row=input.closest('.price-row');
        if(value===null){
          row?.classList.add('price-row-error');
          return;
        }
        row?.classList.remove('price-row-error');
        if(Math.abs(Number(value)-saved)<0.0001){
          drafts.delete(key);
          row?.classList.remove('price-row-dirty');
        }else{
          drafts.set(key,Number(value));
          row?.classList.add('price-row-dirty');
        }
        updateSavebar(restaurantId);
      };

      input.addEventListener('focus',()=>requestAnimationFrame(()=>input.select()));
      input.addEventListener('input',markDirty);
      input.addEventListener('change',markDirty);
      input.addEventListener('keydown',event=>{
        if(event.key==='Enter'){
          event.preventDefault();
          input.blur(); // explicit Save button remains the only save action
        }
      });
      input.addEventListener('blur',markDirty);
    });

    root.querySelectorAll('[data-save-partner-prices]').forEach(button=>{
      button.addEventListener('click',()=>savePartnerPrices(button.dataset.savePartnerPrices));
    });
  };

  const updateSavebar=restaurantId=>{
    const root=cards();
    if(!root)return;
    const bar=root.querySelector(`[data-price-savebar="${CSS.escape(String(restaurantId))}"]`);
    const button=root.querySelector(`[data-save-partner-prices="${CSS.escape(String(restaurantId))}"]`);
    const status=root.querySelector(`[data-price-status="${CSS.escape(String(restaurantId))}"]`);
    const dirty=partnerHasDrafts(String(restaurantId));
    bar?.classList.toggle('is-visible',dirty||savingRestaurants.has(String(restaurantId)));
    if(button){
      button.hidden=!dirty;
      button.disabled=savingRestaurants.has(String(restaurantId));
      button.textContent=savingRestaurants.has(String(restaurantId))?'Сохраняем…':'Сохранить цены';
    }
    if(status&&!savingRestaurants.has(String(restaurantId))){
      status.textContent=dirty?'Есть несохранённые изменения':'';
      status.className='partner-price-status';
    }
  };

  const savePartnerPrices=async restaurantId=>{
    restaurantId=String(restaurantId||'');
    if(!restaurantId||savingRestaurants.has(restaurantId))return;

    const entries=[...drafts.entries()]
      .filter(([key])=>key.startsWith(`${restaurantId}:`))
      .map(([key,price])=>({productId:key.slice(restaurantId.length+1),price:Number(price)}));

    if(!entries.length)return;

    const root=cards();
    const status=root?.querySelector(`[data-price-status="${CSS.escape(restaurantId)}"]`);
    savingRestaurants.add(restaurantId);
    updateSavebar(restaurantId);
    if(status){
      status.textContent='Сохраняем цены…';
      status.className='partner-price-status is-saving';
    }

    try{
      const payload=entries.map(({productId,price})=>({
        restaurant_id:restaurantId,
        product_id:productId,
        price:Number(price),
        updated_at:new Date().toISOString()
      }));

      await rest('restaurant_prices?on_conflict=restaurant_id,product_id',{
        method:'POST',
        headers:{Prefer:'resolution=merge-duplicates,return=representation'},
        body:JSON.stringify(payload)
      });

      const verified=await rest(
        `restaurant_prices?restaurant_id=eq.${encodeURIComponent(restaurantId)}&select=restaurant_id,product_id,price,updated_at`
      );
      const verifiedMap=Object.fromEntries((verified||[]).map(row=>[String(row.product_id),Number(row.price)]));

      for(const {productId,price} of entries){
        if(!(productId in verifiedMap)||Math.abs(Number(verifiedMap[productId])-Number(price))>0.0001){
          throw new Error(`Supabase не подтвердил цену для ${productLabel(productId)}`);
        }
      }

      const confirmed={};
      for(const {productId} of entries){
        confirmed[productId]=Number(verifiedMap[productId]);
        drafts.delete(draftKey(restaurantId,productId));
      }
      syncCaches(restaurantId,confirmed);

      const partner=lastRows.find(r=>String(r.id)===restaurantId);
      if(partner){
        partner.restaurant_prices=Array.isArray(partner.restaurant_prices)?partner.restaurant_prices:[];
        Object.entries(confirmed).forEach(([productId,price])=>{
          const existing=partner.restaurant_prices.find(x=>String(x.product_id)===String(productId));
          if(existing)existing.price=Number(price);
          else partner.restaurant_prices.push({product_id:productId,price:Number(price),updated_at:new Date().toISOString()});
        });
      }

      render(lastRows);
      const nextStatus=cards()?.querySelector(`[data-price-status="${CSS.escape(restaurantId)}"]`);
      const nextBar=cards()?.querySelector(`[data-price-savebar="${CSS.escape(restaurantId)}"]`);
      if(nextStatus){
        nextStatus.textContent='Цены сохранены';
        nextStatus.className='partner-price-status is-saved';
      }
      nextBar?.classList.add('is-visible');
      setTimeout(()=>{
        const currentStatus=cards()?.querySelector(`[data-price-status="${CSS.escape(restaurantId)}"]`);
        const currentBar=cards()?.querySelector(`[data-price-savebar="${CSS.escape(restaurantId)}"]`);
        if(currentStatus&&!partnerHasDrafts(restaurantId)){
          currentStatus.textContent='';
          currentStatus.className='partner-price-status';
          currentBar?.classList.remove('is-visible');
        }
      },1800);

      window.dispatchEvent(new CustomEvent('panora:partner-prices-changed',{
        detail:{restaurantId,prices:confirmed,source:'bakery-explicit-save'}
      }));
    }catch(error){
      console.error('Panora explicit partner price save',error);
      if(status){
        status.textContent='Не удалось сохранить. Проверьте соединение и повторите.';
        status.className='partner-price-status is-error';
      }
      alert(`Не удалось сохранить цены: ${error.message||error}`);
    }finally{
      savingRestaurants.delete(restaurantId);
      updateSavebar(restaurantId);
    }
  };

  const refresh=async()=>{
    // Never redraw while there are unsaved user changes.
    if(!active||loading||drafts.size||savingRestaurants.size)return;
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

  setTimeout(()=>{
    const view=screen();
    if(view?.classList.contains('active'))activate();
  },500);

  window.panoraDirectPartnerPrices={refresh,activate,deactivate};
})();
