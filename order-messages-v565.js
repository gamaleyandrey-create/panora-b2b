(()=>{
  "use strict";
  const cfg=window.PANORA_SUPABASE;
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const language=()=>{
    const value=(typeof lang!=="undefined"?lang:document.documentElement.lang||"ru").slice(0,2).toLowerCase();
    return ["ru","en","es"].includes(value)?value:"ru";
  };
  const words={
    ru:{title:"Чат по поставке",empty:"Сообщений пока нет.",placeholder:"Написать сообщение…",send:"Отправить",close:"Закрыть",bakery:"Пекарня",partner:"Партнёр",loading:"Загрузка…",error:"Не удалось загрузить сообщения.",sending:"Отправляем…",message:"Чат по поставке",intro:"Сообщения сохраняются в заказе. Push только уведомляет о новых.",pushOn:"Включить Push",pushOff:"Отключить Push",pushActive:"Push включён ✓",pushInactive:"Push выключен",pushChecking:"Проверяем Push…",pushUnavailable:"Push недоступен",pushError:"Не удалось изменить Push"},
    en:{title:"Delivery chat",empty:"No messages yet.",placeholder:"Write a message…",send:"Send",close:"Close",bakery:"Bakery",partner:"Partner",loading:"Loading…",error:"Could not load messages.",sending:"Sending…",message:"Delivery chat",intro:"Messages stay in the order. Push only alerts you about new ones.",pushOn:"Enable Push",pushOff:"Disable Push",pushActive:"Push enabled ✓",pushInactive:"Push disabled",pushChecking:"Checking Push…",pushUnavailable:"Push unavailable",pushError:"Could not change Push"},
    es:{title:"Chat de entrega",empty:"Todavía no hay mensajes.",placeholder:"Escribe un mensaje…",send:"Enviar",close:"Cerrar",bakery:"Panadería",partner:"Socio",loading:"Cargando…",error:"No se pudieron cargar los mensajes.",sending:"Enviando…",message:"Chat de entrega",intro:"Los mensajes se guardan en el pedido. Push solo avisa de los nuevos.",pushOn:"Activar Push",pushOff:"Desactivar Push",pushActive:"Push activado ✓",pushInactive:"Push desactivado",pushChecking:"Comprobando Push…",pushUnavailable:"Push no disponible",pushError:"No se pudo cambiar Push"}
  };
  const t=key=>words[language()]?.[key]||words.ru[key]||key;

  const session=()=>window.panoraSupabaseSession||null;
  const adminRpc=async(name,body={})=>{
    const s=session();
    if(!cfg?.url||!cfg?.publishableKey||!s?.access_token)throw new Error("No admin session");
    const response=await fetch(`${cfg.url}/rest/v1/rpc/${name}`,{
      method:"POST",cache:"no-store",
      headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${s.access_token}`,"Content-Type":"application/json",Accept:"application/json"},
      body:JSON.stringify(body)
    });
    const text=await response.text();
    if(!response.ok)throw new Error(text||`HTTP ${response.status}`);
    return text?JSON.parse(text):null;
  };

  const api=()=>{
    if(window.panoraPartnerOrderMessages)return window.panoraPartnerOrderMessages;
    return {
      list:orderId=>adminRpc("panora_order_messages_for_order",{p_order_id:orderId}),
      send:(orderId,body)=>adminRpc("panora_send_order_message",{p_order_id:orderId,p_body:body}),
      markRead:orderId=>adminRpc("panora_mark_order_messages_read",{p_order_id:orderId}),
      unread:()=>adminRpc("panora_order_message_unread_counts",{})
    };
  };

  const UNREAD_CACHE_KEY="panora-order-message-unread-v1";
  const readUnreadCache=()=>{
    try{return new Map(Object.entries(JSON.parse(localStorage.getItem(UNREAD_CACHE_KEY)||"{}")||{}).map(([id,count])=>[String(id),Number(count||0)]))}catch{return new Map()}
  };
  const writeUnreadCache=map=>{
    try{localStorage.setItem(UNREAD_CACHE_KEY,JSON.stringify(Object.fromEntries([...(map instanceof Map?map:new Map())].filter(([,count])=>Number(count)>0))))}catch{}
  };
  let dialog=null,currentOrderId="",currentOrderLabel="",poll=0,lastUnreadMap=readUnreadCache(),unreadPaintQueued=false;
  const MESSAGE_CACHE_KEY="panora-order-message-cache-v1";
  const readMessageCache=orderId=>{
    try{
      const state=JSON.parse(localStorage.getItem(MESSAGE_CACHE_KEY)||"{}");
      const rows=state&&typeof state==="object"&&!Array.isArray(state)?state[String(orderId)]?.rows:null;
      return Array.isArray(rows)?rows:[];
    }catch{return[]}
  };
  const writeMessageCache=(orderId,rows)=>{
    try{
      const state=JSON.parse(localStorage.getItem(MESSAGE_CACHE_KEY)||"{}");
      const next=state&&typeof state==="object"&&!Array.isArray(state)?state:{};
      next[String(orderId)]={rows:(Array.isArray(rows)?rows:[]).slice(-100),updatedAt:new Date().toISOString()};
      const keys=Object.keys(next).sort((a,b)=>String(next[b]?.updatedAt||"").localeCompare(String(next[a]?.updatedAt||"")));
      keys.slice(30).forEach(key=>delete next[key]);
      localStorage.setItem(MESSAGE_CACHE_KEY,JSON.stringify(next));
    }catch{}
  };
  const ownRole=()=>window.panoraPartnerOrderMessages?"restaurant":"admin";
  const pushApi=()=>ownRole()==="restaurant"?window.panoraPartnerPush:window.panoraAdminWebPush;
  const pushAvailable=()=>Boolean(pushApi()?.status&&("Notification" in window)&&("serviceWorker" in navigator)&&("PushManager" in window));
  const renderPushState=({active=false,checking=false,error=""}={})=>{
    if(!dialog)return;
    const button=dialog.querySelector("[data-order-message-push-toggle]");
    const state=dialog.querySelector("[data-order-message-push-state]");
    if(!button||!state)return;
    if(!pushAvailable()){
      button.disabled=true;button.dataset.active="0";button.textContent=t("pushOn");state.textContent=t("pushUnavailable");return;
    }
    if(checking){
      button.disabled=true;state.textContent=t("pushChecking");return;
    }
    button.disabled=false;button.dataset.active=active?"1":"0";button.textContent=active?t("pushOff"):t("pushOn");
    state.textContent=error?`${t("pushError")}: ${String(error).slice(0,120)}`:(active?t("pushActive"):t("pushInactive"));
  };
  const syncPushState=async()=>{
    if(!dialog)return;
    renderPushState({checking:true});
    try{
      const info=await pushApi()?.status?.();
      renderPushState({active:Boolean(info?.active)});
      return Boolean(info?.active);
    }catch(error){
      renderPushState({active:false,error:error?.message||error});
      return false;
    }
  };
  const togglePushState=async()=>{
    if(!dialog||!pushAvailable())return;
    const button=dialog.querySelector("[data-order-message-push-toggle]");
    const active=button?.dataset.active==="1";
    renderPushState({checking:true});
    try{
      if(active)await pushApi()?.disable?.();
      else await pushApi()?.enable?.();
      await syncPushState();
    }catch(error){
      renderPushState({active,error:error?.message||error});
    }
  };
  const dateText=value=>{
    try{return new Intl.DateTimeFormat(language()==="ru"?"ru-RU":language()==="es"?"es-ES":"en-GB",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value))}
    catch{return String(value||"")}
  };
  const renderMessages=rows=>{
    if(!dialog)return;
    const root=dialog.querySelector("[data-order-message-list]");
    const list=Array.isArray(rows)?rows:[];
    root.innerHTML=list.length?list.map(row=>{
      const mine=row.sender_role===ownRole();
      const role=row.sender_role==="admin"?t("bakery"):row.sender_role==="restaurant"?t("partner"):"Panora";
      const system=row.sender_role==="system";return `<article class="order-message ${system?"system":mine?"mine":"other"}"><header><strong>${esc(row.sender_name||role)}</strong><span>${esc(role)} · ${esc(dateText(row.created_at))}</span></header><p>${esc(row.body).replace(/\n/g,"<br>")}</p></article>`;
    }).join(""):`<p class="order-message-empty">${t("empty")}</p>`;
    requestAnimationFrame(()=>{root.scrollTop=root.scrollHeight});
  };
  const load=async({quiet=false,fastOpen=false}={})=>{
    if(!dialog||!currentOrderId)return;
    const root=dialog.querySelector("[data-order-message-list]");
    const targetOrderId=currentOrderId;
    if(!quiet)root.innerHTML=`<p class="order-message-empty">${t("loading")}</p>`;
    try{
      if(fastOpen){
        // First paint waits for only one network request. The cached conversation is
        // already visible when available; then the fresh list replaces it immediately.
        const firstRows=await api().list(targetOrderId);
        if(!dialog||currentOrderId!==targetOrderId)return;
        renderMessages(firstRows);
        writeMessageCache(targetOrderId,firstRows);
        // Preserve the read-race protection from Panora 7.19 without keeping the
        // initial dialog on “Loading…”: mark what is now visible, then reconcile once.
        await api().markRead(targetOrderId).catch(()=>{});
        if(!dialog||currentOrderId!==targetOrderId)return;
        const reconciledRows=await api().list(targetOrderId).catch(()=>firstRows);
        if(!dialog||currentOrderId!==targetOrderId)return;
        renderMessages(reconciledRows);
        writeMessageCache(targetOrderId,reconciledRows);
      }else{
        // Background refreshes keep the safe mark-read -> list ordering while the
        // existing conversation stays on screen, so there is no visible loading wait.
        await api().markRead(targetOrderId).catch(()=>{});
        const rows=await api().list(targetOrderId);
        if(!dialog||currentOrderId!==targetOrderId)return;
        renderMessages(rows);
        writeMessageCache(targetOrderId,rows);
      }
      refreshUnread().catch(()=>{});
    }catch(error){
      if(!quiet&&(!readMessageCache(targetOrderId).length))root.innerHTML=`<p class="order-message-empty error">${t("error")}</p>`;
      console.warn("Panora order messages",error);
    }
  };
  const close=()=>{
    clearInterval(poll);poll=0;
    if(dialog){dialog.close();dialog.remove();dialog=null}
    currentOrderId="";currentOrderLabel="";
  };
  const open=async(orderId,{orderLabel=""}={})=>{
    close();
    currentOrderId=String(orderId||"");
    currentOrderLabel=orderLabel||"";
    if(!currentOrderId)return;
    dialog=document.createElement("dialog");
    dialog.className="order-message-dialog";
    dialog.innerHTML=`<div class="order-message-shell"><header class="order-message-head"><div><span>${esc(currentOrderLabel)}</span><h3>${t("title")}</h3></div><button type="button" class="order-message-x" aria-label="${t("close")}">×</button></header><div class="order-message-channel"><div><strong>Panora</strong><small>${t("intro")}</small><em data-order-message-push-state>${t("pushChecking")}</em></div><button type="button" data-order-message-push-toggle>${t("pushOn")}</button></div><section class="order-message-list" data-order-message-list></section><form class="order-message-form"><textarea name="body" maxlength="2000" rows="3" required placeholder="${t("placeholder")}"></textarea><div><small data-order-message-status></small><button type="submit" class="primary">${t("send")}</button></div></form></div>`;
    document.body.append(dialog);
    dialog.querySelector(".order-message-x").onclick=close;
    dialog.querySelector("[data-order-message-push-toggle]").onclick=togglePushState;
    dialog.addEventListener("click",event=>{if(event.target===dialog)close()});
    dialog.addEventListener("cancel",event=>{event.preventDefault();close()});
    const form=dialog.querySelector(".order-message-form");
    form.onsubmit=async event=>{
      event.preventDefault();
      const textarea=form.elements.body,body=String(textarea.value||"").trim(),button=form.querySelector('button[type="submit"]'),status=form.querySelector("[data-order-message-status]");
      if(!body)return;
      button.disabled=true;textarea.disabled=true;status.textContent=t("sending");
      try{
        await api().send(currentOrderId,body);
        textarea.value="";
        await load({quiet:true});
      }catch(error){
        status.textContent=String(error?.message||error);
      }finally{
        button.disabled=false;textarea.disabled=false;
        if(!status.textContent||status.textContent===t("sending"))status.textContent="";
        textarea.focus();
      }
    };
    dialog.showModal();
    const cachedRows=readMessageCache(currentOrderId);
    if(cachedRows.length)renderMessages(cachedRows);
    else dialog.querySelector("[data-order-message-list]").innerHTML=`<p class="order-message-empty">${t("loading")}</p>`;
    syncPushState().catch(()=>{});
    await load({quiet:cachedRows.length>0,fastOpen:true});
    poll=setInterval(()=>{if(dialog&&!document.hidden)load({quiet:true})},30000);
  };

  const applyUnread=(map,{remember=true}={})=>{
    const source=map instanceof Map?map:new Map();
    if(remember){lastUnreadMap=new Map(source);writeUnreadCache(lastUnreadMap)}
    document.querySelectorAll("[data-order-messages]").forEach(button=>{
      const id=String(button.dataset.orderMessages||"");
      const count=Number(source.get(id)||0);
      let badge=button.querySelector(".order-message-badge");
      if(!badge){
        badge=document.createElement("b");
        badge.className="order-message-badge";
        badge.setAttribute("aria-hidden","true");
        button.append(badge);
      }
      badge.textContent=count?String(count):"0";
      badge.hidden=!count;
      button.classList.toggle("has-unread",Boolean(count));
      button.setAttribute("aria-label",count?`${t("message")}: ${count}`:t("message"));
    });
  };
  const scheduleUnreadPaint=()=>{
    if(unreadPaintQueued)return;
    unreadPaintQueued=true;
    queueMicrotask(()=>{
      unreadPaintQueued=false;
      applyUnread(lastUnreadMap,{remember:false});
    });
  };
  const unreadObserver=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      for(const node of mutation.addedNodes){
        if(node?.nodeType!==1)continue;
        if(node.matches?.("[data-order-messages]")||node.querySelector?.("[data-order-messages]")){
          scheduleUnreadPaint();
          return;
        }
      }
    }
  });
  unreadObserver.observe(document.documentElement,{childList:true,subtree:true});
  async function refreshUnread(){
    try{
      const rows=await api().unread();
      const map=new Map((Array.isArray(rows)?rows:[]).map(row=>[String(row.order_id),Number(row.unread_count||0)]));
      applyUnread(map);
      return map;
    }catch{return new Map()}
  }


  const pushChatTarget=raw=>{
    try{
      const url=new URL(String(raw||location.href),location.href);
      const wantsChat=url.searchParams.get("chat")==="1"||url.searchParams.get("panoraChat")==="1";
      const orderId=String(url.searchParams.get("order")||url.searchParams.get("orderId")||"");
      return wantsChat&&orderId?{orderId,url}:null;
    }catch{return null}
  };
  let lastPushChatKey="";
  const openPushChat=raw=>{
    const target=pushChatTarget(raw);
    if(!target)return false;
    const key=`${target.orderId}|${target.url.search}`;
    if(key===lastPushChatKey&&dialog&&currentOrderId===target.orderId)return true;
    lastPushChatKey=key;
    const button=[...document.querySelectorAll("[data-order-messages]")].find(node=>String(node.dataset.orderMessages||"")===target.orderId);
    const label=button?.dataset.orderLabel||"";
    open(target.orderId,{orderLabel:label});
    return true;
  };

  document.addEventListener("click",event=>{
    const button=event.target.closest?.("[data-order-messages]");
    if(!button)return;
    event.preventDefault();event.stopPropagation();
    open(button.dataset.orderMessages,{orderLabel:button.dataset.orderLabel||""});
  });
  window.panoraOrderMessages={open,close,refreshUnread,openPushChat};
  const tryInitialPushChat=()=>{if(pushChatTarget(location.href))setTimeout(()=>openPushChat(location.href),250)};
  window.addEventListener("panora:authenticated",()=>setTimeout(()=>{refreshUnread();openPushChat(location.href)},500));
  navigator.serviceWorker?.addEventListener?.("message",event=>{
    if(event.data?.type==="PANORA_PUSH_OPENED")openPushChat(event.data.url||location.href);
  });
  const initialMessagePaint=()=>{scheduleUnreadPaint();tryInitialPushChat()};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialMessagePaint,{once:true});else initialMessagePaint();
  window.addEventListener("panora:partner-data-updated",()=>setTimeout(()=>refreshUnread(),500));
  window.addEventListener("panora:partner-push-state",()=>{if(dialog)syncPushState().catch(()=>{})});
  window.addEventListener("panora:admin-webpush-state",()=>{if(dialog)syncPushState().catch(()=>{})});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshUnread()});
  setInterval(()=>{if(!document.hidden&&navigator.onLine)refreshUnread()},120000);
  setTimeout(()=>refreshUnread(),1200);
})();