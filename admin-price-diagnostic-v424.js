(()=>{
  const cfg=window.PANORA_SUPABASE;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const readJson=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
  const session=()=>window.panoraSupabaseSession||null;
  const request=async(path,options={})=>{
    const s=session();
    if(!s?.access_token)throw new Error('Нет активной админской сессии');
    const response=await fetch(`${cfg.url}/rest/v1/${path}`,{
      cache:'no-store',
      ...options,
      headers:{
        apikey:cfg.publishableKey,
        Authorization:`Bearer ${s.access_token}`,
        'Content-Type':'application/json',
        'Cache-Control':'no-cache',
        ...(options.headers||{})
      }
    });
    const text=await response.text();
    if(!response.ok)throw new Error(`${response.status} ${text||response.statusText}`);
    return text?JSON.parse(text):null;
  };

  const ensurePanel=()=>{
    let el=document.querySelector('#panoraPriceDiagnostic');
    if(el)return el;
    el=document.createElement('details');
    el.id='panoraPriceDiagnostic';
    el.className='panora-price-diagnostic';
    el.innerHTML=`<summary>Диагностика цен</summary><div class="panora-price-diagnostic-body">Откройте раздел «Партнёры и цены».</div>`;
    const view=document.querySelector('#view-restaurants');
    view?.querySelector('.page-head')?.insertAdjacentElement('afterend',el);
    return el;
  };

  const inspect=async()=>{
    const panel=ensurePanel();
    if(!panel)return;
    const body=panel.querySelector('.panora-price-diagnostic-body');
    body.textContent='Проверяю Supabase…';

    const local=readJson('panora-restaurants',[]);
    const map=readJson('panora-admin-restaurant-prices-v420',{});
    let remote=[],adminCheck='не проверен',error='';

    try{
      remote=await request('restaurant_prices?select=restaurant_id,product_id,price,updated_at&order=restaurant_id.asc,product_id.asc');
    }catch(e){error=`restaurant_prices: ${e.message||e}`}

    try{
      const result=await request('rpc/panora_is_admin',{method:'POST',body:'{}'});
      adminCheck=String(result);
    }catch(e){
      adminCheck=`ошибка: ${e.message||e}`;
    }

    const localRows=[];
    for(const r of local||[]){
      for(const [pid,price] of Object.entries(r.prices||{})){
        localRows.push({restaurant_id:String(r.id),email:r.email||'',product_id:pid,price:Number(price)});
      }
    }

    const mapRows=[];
    for(const [rid,prices] of Object.entries(map||{})){
      for(const [pid,price] of Object.entries(prices||{})){
        mapRows.push({restaurant_id:rid,product_id:pid,price:Number(price)});
      }
    }

    const remoteKey=new Map((remote||[]).map(r=>[`${r.restaurant_id}:${r.product_id}`,Number(r.price)]));
    const localKey=new Map(localRows.map(r=>[`${r.restaurant_id}:${r.product_id}`,Number(r.price)]));
    const mapKey=new Map(mapRows.map(r=>[`${r.restaurant_id}:${r.product_id}`,Number(r.price)]));
    const keys=[...new Set([...remoteKey.keys(),...localKey.keys(),...mapKey.keys()])];

    const rows=keys.slice(0,40).map(k=>{
      const [rid,pid]=k.split(':');
      const rv=remoteKey.has(k)?remoteKey.get(k):'—';
      const mv=mapKey.has(k)?mapKey.get(k):'—';
      const lv=localKey.has(k)?localKey.get(k):'—';
      const same=String(rv)===String(mv)&&String(rv)===String(lv);
      return `<tr class="${same?'':'diff'}"><td>${esc(rid.slice(0,8))}</td><td>${esc(pid)}</td><td>${esc(rv)}</td><td>${esc(mv)}</td><td>${esc(lv)}</td></tr>`;
    }).join('');

    body.innerHTML=`
      <div class="diag-meta"><b>Admin:</b> ${esc(adminCheck)} · <b>Supabase строк:</b> ${(remote||[]).length} · <b>Local партнёров:</b> ${(local||[]).length}</div>
      ${error?`<div class="diag-error">${esc(error)}</div>`:''}
      <table><thead><tr><th>Партнёр</th><th>Товар</th><th>Supabase</th><th>Admin map</th><th>Local</th></tr></thead><tbody>${rows||'<tr><td colspan="5">Нет строк цен</td></tr>'}</tbody></table>
      <button type="button" id="panoraPriceDiagnosticRefresh">Проверить ещё раз</button>
      <p>Если Supabase уже показывает новую цену, а Admin map/Local старую — проблема в клиентской синхронизации. Если Supabase сам показывает старую цену — проблема в записи/БД.</p>
    `;
    body.querySelector('#panoraPriceDiagnosticRefresh')?.addEventListener('click',inspect);
  };

  window.panoraPriceDiagnostic={inspect};
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-view="restaurants"]'))setTimeout(inspect,250);
  });
  window.addEventListener('panora:admin-prices-updated',()=>setTimeout(inspect,80));
})();