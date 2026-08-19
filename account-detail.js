(function () {
  const dialog = $("#accountDetailDialog");
  const body = $("#accountRows");
  if (!dialog || !body) return;
  let selectedId = null;
  let debtTab = "active";
  let historyTab = "recent";
  const HISTORY_RECENT_LIMIT = 20;

  const prettyDate = (value) => {
    if (!value) return "—";
    try {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
        ? new Date(`${value}T12:00:00`)
        : new Date(value);
      return new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
    } catch (_) {
      return String(value);
    }
  };

  const returnCreditPayment = payment => typeof window.panoraIsB2BReturnCreditPayment==='function'
    ? window.panoraIsB2BReturnCreditPayment(payment)
    : /\[panora:b2b-return-credit:[^\]]+\]/.test(String(payment?.note||''));

  const allocationFor = (id) => {
    const cloud = window.panoraFinanceAllocation?.(id);
    if (cloud) return cloud;
    const notes = deliveryNotes
      .filter(note => note.restaurantId === id)
      .slice()
      .sort((a,b) =>
        String(a.date || "").localeCompare(String(b.date || "")) ||
        Number(a.number || 0) - Number(b.number || 0)
      );
    let pool = payments
      .filter(payment =>
        payment.restaurantId === id &&
        paymentConfirmed(payment) &&
        !returnCreditPayment(payment) &&
        payment.status !== "cancelled"
      )
      .reduce((sum,payment)=>sum+Number(payment.amount||0),0);
    const rows = notes.map(note => {
      const total = typeof window.panoraB2BEffectiveNoteTotal==='function'?window.panoraB2BEffectiveNoteTotal(note):Math.max(0,Number(note.total||0));
      const paid = Math.min(total,pool);
      pool -= paid;
      return {note,total,paid,due:Math.max(0,total-paid),closed:total-paid<=0.005};
    });
    return {
      notes: rows,
      debt: rows.reduce((sum,row)=>sum+row.due,0),
      credit: Math.max(0,pool),
      totalShipped: rows.reduce((sum,row)=>sum+row.total,0),
      totalPaid: paidFor(id),
    };
  };

  function bindRows() {
    [...body.querySelectorAll("tr[data-account-restaurant]")].forEach((row) => {
      row.tabIndex = 0;
      row.title = "Открыть расчёты и операции партнёра";
    });
  }

  function historyFor(id) {
    window.panoraRecalculateBalances?.();
    if (typeof window.panoraFinanceTimeline === "function") {
      return window.panoraFinanceTimeline(id).slice().reverse().map((event) => {
        if(event.kind === "delivery")return {date:event.date,type:"Отгрузка",number:`DN-${String(event.note.number).padStart(4, "0")}`,amount:event.amount,className:"shipment",balanceAfter:event.balanceAfter};
        if(event.kind === "return")return {id:event.movement?.id,date:event.date,type:"Возврат по накладной",number:`DN-${String(event.note.number).padStart(4, "0")}`,amount:-event.amount,className:"return",balanceAfter:event.balanceAfter};
        if(event.kind === "payment_reversal")return {
          id:event.payment.id,date:event.date,
          type:event.reversalType === "cancel" ? "Оплата отменена" : "Оплата оспорена",
          number:event.payment.note || event.payment.method || "",amount:event.amount,
          className:event.reversalType === "cancel" ? "payment reversal cancelled" : "payment reversal disputed",
          balanceAfter:event.balanceAfter,disputeReason:event.payment?.disputeReason||""
        };
        const pending=event.timelineState === "pending";
        return {
          id:event.payment.id,date:event.date,
          type:pending ? "Ожидает подтверждения" : event.payment.deliveryNoteId ? "Оплата по накладной" : "Общая оплата",
          number:event.payment.note || event.payment.method || "",amount:-event.amount,
          className:pending ? "payment pending" : "payment",balanceAfter:event.balanceAfter,
          disputeReason:""
        };
      });
    }
    let running = 0;
    const paymentHistoryEvents=payments
      .filter(payment=>payment.restaurantId===id)
      .flatMap(payment=>{
        if(returnCreditPayment(payment))return [{
          id:payment.id,date:payment.date,type:"Возврат по накладной",number:payment.note||payment.method||"",amount:-payment.amount,className:"return",sort:.5
        }];
        const originallyConfirmed=Boolean(payment.confirmedAt)||["confirmed","cancelled"].includes(String(payment.status||""))||payment.disputeStatus==="open";
        const rows=[{
          id:payment.id,date:payment.date,
          type:originallyConfirmed?(payment.deliveryNoteId?"Оплата по накладной":"Общая оплата"):"Ожидает подтверждения",
          number:payment.note||payment.method||"",amount:-payment.amount,
          className:originallyConfirmed?"payment":"payment pending",sort:1,effect:originallyConfirmed?-Number(payment.amount||0):0
        }];
        const reversalType=payment.status==="cancelled"?"cancel":payment.disputeStatus==="open"?"dispute":"";
        if(reversalType&&originallyConfirmed){
          const stateAt=reversalType==="dispute"?(payment.disputedAt||payment.updatedAt||payment.receivedAt):(payment.updatedAt||payment.disputedAt||payment.receivedAt);
          rows.push({id:payment.id,date:String(stateAt||payment.date||"").slice(0,10),type:reversalType==="cancel"?"Оплата отменена":"Оплата оспорена",number:payment.note||payment.method||"",amount:Number(payment.amount||0),className:reversalType==="cancel"?"payment reversal cancelled":"payment reversal disputed",disputeReason:payment.disputeReason||"",sort:2,effect:Number(payment.amount||0)});
        }
        return rows;
      });
    return [
      ...deliveryNotes
        .filter((note) => note.restaurantId === id)
        .map((note) => ({
          date: note.date,
          type: "Отгрузка",
          number: `DN-${String(note.number).padStart(4, "0")}`,
          amount: note.total,
          className: "shipment",
          sort: 0,
          effect:Number(note.total||0)
        })),
      ...paymentHistoryEvents,
    ]
      .sort((a, b) => String(a.date).localeCompare(String(b.date)) || a.sort - b.sort)
      .map((item) => {
        if(item.className==="shipment"||item.className==="return")running+=Number(item.amount||0);
        else running+=Number(item.effect||0);
        item.balanceAfter=running;
        return item;
      })
      .reverse();
  }


  function paymentDistributionFor(id) {
    const notes = deliveryNotes
      .filter(note => note.restaurantId === id)
      .slice()
      .sort((a,b) =>
        String(a.date || "").localeCompare(String(b.date || "")) ||
        Number(a.number || 0) - Number(b.number || 0) ||
        String(a.id || "").localeCompare(String(b.id || ""))
      );
    // Panora 6.92: reconstruct operation allocation chronologically from original DN
    // totals. A later goods-return credit is its own event and must not retroactively
    // make an older cash payment look as if it had been applied to another DN.
    const remaining = new Map(
      notes.map(note => [String(note.id || note.number), Math.max(0, Number(note.total || 0))])
    );
    const byId = new Map();
    const closedAtByNote = new Map();
    const confirmed = payments
      .filter(payment =>
        payment.restaurantId === id &&
        paymentConfirmed(payment) &&
        payment.status !== "cancelled" &&
        Number(payment.amount || 0) > 0
      )
      .slice()
      .sort((a,b) =>
        String(a.receivedAt || a.date || "").localeCompare(String(b.receivedAt || b.date || "")) ||
        String(a.id || "").localeCompare(String(b.id || ""))
      );

    // Panora 6.95: an advance can close a delivery note only when that note exists.
    const settlementAppliedAt = (paymentDate, noteDate) => {
      const paymentValue=String(paymentDate||""),noteValue=String(noteDate||"");
      const paymentDay=paymentValue.slice(0,10),noteDay=noteValue.slice(0,10);
      return noteDay&&(!paymentDay||noteDay>paymentDay)?noteValue:(paymentValue||noteValue);
    };
    const takeFromNote = (paymentId, note, amount, date, payment) => {
      const key = String(note.id || note.number);
      const due = Math.max(0, Number(remaining.get(key) || 0));
      const used = Math.min(due, Math.max(0, Number(amount || 0)));
      if (used <= 0.005) return 0;
      const next=Math.max(0, due - used);
      remaining.set(key, next);
      const entry = byId.get(paymentId) || { rows: [], credit: 0, returnCredit: returnCreditPayment(payment) };
      const appliedAt=settlementAppliedAt(date||payment.receivedAt||payment.date,note.date);
      entry.rows.push({ note, amount: used, date: appliedAt });
      if(next<=0.005&&!closedAtByNote.has(key))closedAtByNote.set(key,appliedAt);
      byId.set(paymentId, entry);
      return used;
    };

    confirmed.forEach(payment => {
      const paymentId = String(payment.id || "");
      let left = Math.max(0, Number(payment.amount || 0));
      byId.set(paymentId, { rows: [], credit: 0, returnCredit: returnCreditPayment(payment) });

      if (payment.deliveryNoteId) {
        const target = notes.find(note =>
          String(note.id || "") === String(payment.deliveryNoteId) ||
          String(note.number || "") === String(payment.deliveryNoteId)
        );
        if (target) left -= takeFromNote(paymentId, target, left, payment.receivedAt||payment.date||target.date, payment);
      }
      // Cash overpayments and goods-return credits use the same FIFO continuation:
      // after the linked DN, apply any remainder to the oldest open DN, then to advance.
      for (const note of notes) {
        if (left <= 0.005) break;
        left -= takeFromNote(paymentId, note, left, payment.receivedAt||payment.date||note.date, payment);
      }

      if (left > 0.005) {
        const entry = byId.get(paymentId);
        entry.credit = left;
        byId.set(paymentId, entry);
      }
    });

    // Panora 6.98: expose the actual settlement moment for the bakery archive.
    // Reopened notes must return to the archive according to the latest real close,
    // not according to their old delivery date.
    byId.closedAtByNote=closedAtByNote;
    return byId;
  }

  function paymentDistributionHtml(id, item) {
    if (!item?.id || item.amount >= 0 || item.className.includes("pending") || item.className.includes("cancelled") || item.className.includes("disputed")) return "";
    const payment = payments.find(row => String(row.id) === String(item.id));
    if (!payment) return "";
    const distribution = paymentDistributionFor(id).get(String(item.id));
    if (!distribution) return "";
    const isReturnCredit=returnCreditPayment(payment);
    const targetId=String(payment.deliveryNoteId||"");
    const spills=(distribution.rows||[]).some(({note})=>targetId&&String(note.id||note.number)!==targetId);
    const meaningful=isReturnCredit||!payment.deliveryNoteId||spills||Number(distribution.credit||0)>0.005||(distribution.rows||[]).length>1;
    if(!meaningful)return "";

    const rows = (distribution.rows || []).map(({note, amount, date}) =>
      `<div><span>${prettyDate(date)} · <button type="button" class="account-allocation-note-link" data-account-note="${String(note.id)}">DN-${String(note.number).padStart(4,"0")}</button></span><strong>${euro(amount)}</strong></div>`
    );
    if (Number(distribution.credit || 0) > 0.005) {
      rows.push(`<div class="payment-allocation-credit"><span>Осталось в авансе</span><strong>${euro(distribution.credit)}</strong></div>`);
    }
    if (!rows.length) {
      rows.push(`<div class="payment-allocation-credit"><span>В аванс / переплату</span><strong>${euro(Math.abs(item.amount))}</strong></div>`);
    }

    return `<details class="payment-allocation">
      <summary>${isReturnCredit?"Распределение кредита возврата":"Распределение платежа"}</summary>
      <div class="payment-allocation-rows">${rows.join("")}</div>
    </details>`;
  }

  function operationAmountHtml(item) {
    const amount = euro(Math.abs(Number(item.amount || 0)));
    if (item.className.includes("cancelled")) return `<b class="operation-amount-pending">Отменено ${amount}</b>`;
    if (item.className.includes("disputed")) return `<b class="operation-amount-pending">В споре ${amount}</b>`;
    if (item.className.includes("pending")) return `<b class="operation-amount-pending">Ожидается ${amount}</b>`;
    if (item.className.includes("return")) return `<b class="operation-amount-payment">Кредит ${amount}</b>`;
    if (Number(item.amount || 0) < 0) return `<b class="operation-amount-payment">Оплата ${amount}</b>`;
    return `<b class="operation-amount-shipment">Начислено ${amount}</b>`;
  }

  function balanceAfterHtml(value) {
    const balance=Number(value||0);
    if(balance>0.005)return `<small>Задолженность после операции: ${euro(balance)}</small>`;
    if(balance<-0.005)return `<small class="account-credit-text">Переплата после операции: ${euro(Math.abs(balance))}</small>`;
    return `<small>Расчёты после операции закрыты</small>`;
  }

  function renderDebtBlock(id) {
    const allocation=allocationFor(id);
    const active=allocation.notes.filter(row=>Number(row.due||0)>0.005);
    const settlement=paymentDistributionFor(id);
    const closedAtByNote=settlement?.closedAtByNote||new Map();
    const archived=allocation.notes
      .filter(row=>Number(row.due||0)<=0.005)
      .map(row=>({...row,closedAt:closedAtByNote.get(String(row.note?.id||row.note?.number||""))||row.note?.date||""}))
      .sort((a,b)=>String(b.closedAt||b.note?.date||"").localeCompare(String(a.closedAt||a.note?.date||""))||Number(b.note?.number||0)-Number(a.note?.number||0));
    let debtBlock = dialog.querySelector("#accountDetailDebts");
    if (!debtBlock) {
      debtBlock = document.createElement("section");
      debtBlock.id = "accountDetailDebts";
      debtBlock.className = "account-detail-debts";
      const head = dialog.querySelector(".account-detail-head");
      head?.before(debtBlock);
    }

    if(debtTab==="active"&&!active.length&&archived.length)debtTab="archive";
    const rows=debtTab==="archive"?archived:active;
    const creditNotice=allocation.credit>0.005
      ? `<div class="account-credit-notice"><span>Аванс / переплата</span><strong>${euro(allocation.credit)}</strong><small>Будет автоматически зачтена в самые старые неоплаченные накладные и будущие поставки.</small></div>`
      : "";

    const listHtml=rows.length
      ? `<div class="account-detail-debt-list ${debtTab==="archive"?"is-archive":""}">${rows.map(({note,total,paid,due,closedAt}) =>
          `<article class="account-note-card" data-account-note="${String(note.id)}" tabindex="0" role="button"><div><button type="button" class="account-note-link" data-account-note="${String(note.id)}">DN-${String(note.number).padStart(4,"0")}</button><span>Поставка: ${prettyDate(note.date)}</span>${note.paymentDueDate?`<small>Оплатить до: ${prettyDate(note.paymentDueDate)}</small>`:""}${debtTab==="archive"&&closedAt?`<small>Расчёты закрыты: ${prettyDate(closedAt)}</small>`:""}</div><div><span>Сумма ${euro(total)}</span><span>Зачтено ${euro(paid)}</span>${due>0.005?`<b>К оплате ${euro(due)}</b>`:`<b class="paid-full">Расчёты закрыты</b>`}</div></article>`
        ).join("")}</div>`
      : debtTab==="archive"
        ? `<p class="account-detail-no-debt">В архиве пока нет полностью оплаченных накладных.</p>`
        : `<p class="account-detail-no-debt">${allocation.credit>0.005?"Задолженности нет. Есть аванс / переплата.":"Задолженности нет."}</p>`;

    debtBlock.innerHTML = `
      ${creditNotice}
      <div class="account-debt-tabs" role="tablist">
        <button type="button" class="${debtTab==="active"?"active":""}" data-debt-tab="active">Актуальные <strong>${active.length}</strong></button>
        <button type="button" class="${debtTab==="archive"?"active":""}" data-debt-tab="archive">Архив <strong>${archived.length}</strong></button>
      </div>
      ${listHtml}`;

    debtBlock.querySelectorAll("[data-debt-tab]").forEach(button=>{
      button.onclick=()=>{
        debtTab=button.dataset.debtTab;
        renderDebtBlock(id);
      };
    });
  }

  function openAccountNote(noteId) {
    const note = deliveryNotes.find((item) => String(item.id) === String(noteId));
    if (!note) return;
    // Prefer the existing Panora document opener. Fall back to the delivery-note print action.
    if (typeof window.panoraOpenDeliveryNote === "function") {
      window.panoraOpenDeliveryNote(note.id);
      return;
    }
    const trigger = document.querySelector(`[data-print-note="${CSS.escape(String(note.id))}"],[data-note-id="${CSS.escape(String(note.id))}"],[data-delivery-note="${CSS.escape(String(note.id))}"]`);
    if (trigger) {
      trigger.click();
      return;
    }
    if (typeof window.printDeliveryNote === "function") {
      window.printDeliveryNote(note.id);
      return;
    }
    alert(`Накладная DN-${String(note.number).padStart(4,"0")} найдена. Откройте её в разделе «Заказы и отгрузки».`);
  }


  function bindAccountNoteLinks() {
    dialog.querySelectorAll("[data-account-note]").forEach((node) => {
      const openNote = (event) => {
        event.preventDefault();
        event.stopPropagation();
        openAccountNote(node.dataset.accountNote);
      };
      if (node.tagName === "BUTTON") node.onclick = openNote;
      else {
        node.onclick = openNote;
        node.onkeydown = (event) => {
          if (event.key === "Enter" || event.key === " ") openNote(event);
        };
      }
    });
  }

  function renderHistoryBlock(id, history) {
    let controls = dialog.querySelector("#accountHistoryControls");
    const historyRoot = $("#accountDetailHistory");
    if (!controls) {
      controls = document.createElement("div");
      controls.id = "accountHistoryControls";
      controls.className = "account-history-controls";
      historyRoot.before(controls);
    }

    const recent = history.slice(0, HISTORY_RECENT_LIMIT);
    const archived = history.slice(HISTORY_RECENT_LIMIT);
    if (historyTab === "archive" && !archived.length) historyTab = "recent";
    const visible = historyTab === "archive" ? archived : recent;

    controls.innerHTML = `
      <div class="account-history-tabs" role="tablist" aria-label="История операций">
        <button type="button" class="${historyTab==="recent"?"active":""}" data-history-tab="recent">
          Последние операции <strong>${recent.length}</strong>
        </button>
        <button type="button" class="${historyTab==="archive"?"active":""}" data-history-tab="archive">
          Архив операций <strong>${archived.length}</strong>
        </button>
      </div>
      ${historyTab==="archive" && archived.length
        ? `<p class="account-history-hint">Старые операции остаются в финансовых расчётах и не удаляются.</p>`
        : ""}`;

    historyRoot.innerHTML = visible.length
      ? visible.map((item) =>
          `<article class="${item.className}"><div><strong>${item.type}</strong><span>${prettyDate(item.date)}${item.number ? ` · ${item.number}` : ""}</span></div><div class="account-payment-value">${operationAmountHtml(item)}${balanceAfterHtml(item.balanceAfter)}${paymentDistributionHtml(id,item)}${item.className.includes("disputed") ? `<small class="account-payment-dispute-reason">${item.disputeReason ? `Причина: ${String(item.disputeReason).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]))}` : "Партнёр оспорил оплату"}</small><div class="account-payment-dispute-actions"><button type="button" data-resolve-payment-dispute="${item.id}" data-dispute-decision="keep">Оплата верна</button><button type="button" data-resolve-payment-dispute="${item.id}" data-dispute-decision="cancel">Отменить оплату</button></div>` : item.className.includes("pending") ? `<button type="button" data-confirm-payment="${item.id}">Подтвердить получение</button>` : ""}</div></article>`
        ).join("")
      : `<p class="empty-row">${historyTab==="archive"?"Архивных операций пока нет.":"Операций пока нет."}</p>`;

    controls.querySelectorAll("[data-history-tab]").forEach((button) => {
      button.onclick = () => {
        historyTab = button.dataset.historyTab;
        renderHistoryBlock(id, history);
      };
    });

    bindAccountNoteLinks();

    historyRoot.querySelectorAll("[data-confirm-payment]").forEach(
      (button) =>
        (button.onclick = async () => {
          const payment = payments.find(
            (item) => item.id === button.dataset.confirmPayment,
          );
          if (
            !payment ||
            !confirm(`Подтвердить получение ${euro(payment.amount)}?`)
          )
            return;
          if (
            !window.panoraCloud?.ready ||
            typeof window.panoraCloud.confirmPaymentAtomic !== "function"
          )
            return alert(
              "Облако ещё загружается. Подождите несколько секунд и повторите.",
            );
          button.disabled = true;
          button.textContent = "Сохраняем…";
          try {
            await window.panoraCloud.confirmPaymentAtomic(payment.id);
            renderCommerce();
            open(id);
          } catch (error) {
            alert(`Подтверждение не сохранено: ${error.message}`);
            open(id);
          }
        }),
    );

    historyRoot.querySelectorAll("[data-resolve-payment-dispute]").forEach((button) => {
      button.onclick = async () => {
        const payment=payments.find(item=>String(item.id)===String(button.dataset.resolvePaymentDispute));
        const decision=button.dataset.disputeDecision==='cancel'?'cancel':'keep';
        if(!payment)return;
        const question=decision==='cancel'
          ? `Отменить спорную оплату ${euro(payment.amount)}? Сумма снова станет задолженностью.`
          : `Подтвердить, что оплата ${euro(payment.amount)} верна? Спор будет закрыт и сумма снова погасит задолженность.`;
        if(!confirm(question))return;
        if(!window.panoraCloud?.ready||typeof window.panoraCloud.resolvePaymentDisputeAtomic!=="function")return alert("Облако ещё загружается. Подождите несколько секунд и повторите.");
        const buttons=[...historyRoot.querySelectorAll(`[data-resolve-payment-dispute="${String(payment.id)}"]`)];
        buttons.forEach(item=>item.disabled=true);
        try{
          await window.panoraCloud.resolvePaymentDisputeAtomic(payment.id,decision);
          renderCommerce();
          open(id);
        }catch(error){
          alert(`Решение по спору не сохранено: ${error.message||error}`);
          open(id);
        }
      };
    });
  }

  function open(id) {
    const normalizedId = String(id ?? "");
    const client = restaurants.find((item) => String(item.id) === normalizedId) || restaurant(id);
    if (!client) return;
    id = client.id;
    selectedId = id;
    debtTab = "active";
    historyTab = "recent";
    const shipped = shippedFor(id);
    const paid = paidFor(id);
    const allocation=allocationFor(id);
    const history = historyFor(id);
    $("#accountDetailName").textContent = client.name;
    $("#accountDetailContact").textContent = [
      client.email,
      client.phone,
      client.address,
    ]
      .filter(Boolean)
      .join(" · ");

    const balanceLabel=$("#accountDetailBalanceLabel");
    const balanceCard=$("#accountDetailBalanceCard");
    balanceCard?.classList.remove("is-credit","is-zero","is-debt");
    if(allocation.debt>0.005){
      if(balanceLabel)balanceLabel.textContent="Задолженность";
      $("#accountDetailDebt").textContent=euro(allocation.debt);
      balanceCard?.classList.add("is-debt");
    }else if(allocation.credit>0.005){
      if(balanceLabel)balanceLabel.textContent="Аванс / переплата";
      $("#accountDetailDebt").textContent=euro(allocation.credit);
      balanceCard?.classList.add("is-credit");
    }else{
      if(balanceLabel)balanceLabel.textContent="Расчёты закрыты";
      $("#accountDetailDebt").textContent=euro(0);
      balanceCard?.classList.add("is-zero");
    }
    $("#accountDetailShipped").textContent = euro(shipped);
    $("#accountDetailPaid").textContent = euro(paid);

    renderDebtBlock(id);

    renderHistoryBlock(id, history);

    dialog.showModal();
  }

  body.addEventListener("click", (event) => {
    const explicit = event.target.closest("[data-open-account]");
    if (explicit) {
      event.preventDefault();
      event.stopPropagation();
      open(explicit.dataset.openAccount);
      return;
    }
    const row = event.target.closest("[data-account-restaurant]");
    if (row) {
      event.preventDefault();
      open(row.dataset.accountRestaurant);
    }
  }, true);
  body.addEventListener("keydown", (event) => {
    const row = event.target.closest("[data-account-restaurant]");
    if (row && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      open(row.dataset.accountRestaurant);
    }
  });
  $("#closeAccountDetail").onclick = () => dialog.close();
  dialog.onclick = (event) => {
    if (event.target === dialog) dialog.close();
  };
  $("#accountDetailPayment").onclick = () => {
    dialog.close();
    $("#paymentRestaurant").value = selectedId;
    const mode=$("#paymentAllocationMode");
    if(mode)mode.value="fifo";
    $("#paymentRestaurant").dispatchEvent(new Event("change",{bubbles:true}));
    mode?.dispatchEvent(new Event("change",{bubbles:true}));
    $("#paymentDialog").showModal();
  };
  const observer = new MutationObserver(bindRows);
  observer.observe(body, { childList: true });
  bindRows();
})();
