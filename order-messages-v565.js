(()=>{
  "use strict";
  const cfg=window.PANORA_SUPABASE;
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const language=()=>{
    const value=(typeof lang!=="undefined"?lang:document.documentElement.lang||"ru").slice(0,2).toLowerCase();
    return ["ru","en","es"].includes(value)?value:"ru";
  };
  const words={
    ru:{title:"Сообщения по заказу",empty:"Сообщений пока нет.",placeholder:"Написать сообщение…",send:"Отправить",close:"Закрыть",bakery:"Пекарня",partner:"Партнёр",loading:"Загрузка…",error:"Не удалось загрузить сообщения.",sending:"Отправляем…",message:"Сообщения"},
    en:{title:"Order messages",empty:"No messages yet.",placeholder:"Write a message…",send:"Send",close:"Close",bakery:"Bakery",partner:"Partner",loading:"Loading…",error:"Could not load messages.",sending:"Sending…",message:"Messages"},
    es:{title:"Mensajes del pedido",empty:"Todavía no hay mensajes.",placeholder:"Escribe un mensaje…",send:"Enviar",close:"Cerrar",bakery:"Panadería",partner:"Socio",loading:"Cargando…",error:"No se pudieron cargar los mensajes.",sending:"Enviando…",message:"Mensajes"}
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

  let dialog=null,currentOrderId="",currentOrderLabel="",poll=0;
  const ownRole=()=>window.panoraPartnerOrderMessages?"restaurant":"admin";
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
      return `<article class="order-message ${mine?"mine":"other"}"><header><strong>${esc(row.sender_name||role)}</strong><span>${esc(role)} · ${esc(dateText(row.created_at))}</span></header><p>${esc(row.body).replace(/\n/g,"<br>")}</p></article>`;
    }).join(""):`<p class="order-message-empty">${t("empty")}</p>`;
    requestAnimationFrame(()=>{root.scrollTop=root.scrollHeight});
  };
  const load=async({quiet=false}={})=>{
    if(!dialog||!currentOrderId)return;
    const root=dialog.querySelector("[data-order-message-list]");
    if(!quiet)root.innerHTML=`<p class="order-message-empty">${t("loading")}</p>`;
    try{
      const rows=await api().list(currentOrderId);
      renderMessages(rows);
      await api().markRead(currentOrderId).catch(()=>{});
      refreshUnread().catch(()=>{});
    }catch(error){
      if(!quiet)root.innerHTML=`<p class="order-message-empty error">${t("error")}</p>`;
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
    dialog.innerHTML=`<div class="order-message-shell"><header class="order-message-head"><div><span>${esc(currentOrderLabel)}</span><h3>${t("title")}</h3></div><button type="button" class="order-message-x" aria-label="${t("close")}">×</button></header><section class="order-message-list" data-order-message-list></section><form class="order-message-form"><textarea name="body" maxlength="2000" rows="3" required placeholder="${t("placeholder")}"></textarea><div><small data-order-message-status></small><button type="submit" class="primary">${t("send")}</button></div></form></div>`;
    document.body.append(dialog);
    dialog.querySelector(".order-message-x").onclick=close;
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
    await load();
    poll=setInterval(()=>{if(dialog&&!document.hidden)load({quiet:true})},5000);
  };

  const applyUnread=map=>{
    document.querySelectorAll("[data-order-messages]").forEach(button=>{
      const id=String(button.dataset.orderMessages||"");
      const count=Number(map.get(id)||0);
      let badge=button.querySelector(".order-message-badge");
      if(count){
        if(!badge){badge=document.createElement("b");badge.className="order-message-badge";button.append(badge)}
        badge.textContent=String(count);badge.hidden=false;
        button.classList.add("has-unread");
      }else{
        if(badge)badge.hidden=true;
        button.classList.remove("has-unread");
      }
    });
  };
  async function refreshUnread(){
    try{
      const rows=await api().unread();
      const map=new Map((Array.isArray(rows)?rows:[]).map(row=>[String(row.order_id),Number(row.unread_count||0)]));
      applyUnread(map);
      return map;
    }catch{return new Map()}
  }

  document.addEventListener("click",event=>{
    const button=event.target.closest?.("[data-order-messages]");
    if(!button)return;
    event.preventDefault();event.stopPropagation();
    open(button.dataset.orderMessages,{orderLabel:button.dataset.orderLabel||""});
  });
  window.panoraOrderMessages={open,close,refreshUnread};
  window.addEventListener("panora:authenticated",()=>setTimeout(()=>refreshUnread(),500));
  window.addEventListener("panora:partner-data-updated",()=>setTimeout(()=>refreshUnread(),500));
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshUnread()});
  setInterval(()=>{if(!document.hidden)refreshUnread()},15000);
  setTimeout(()=>refreshUnread(),1200);
})();