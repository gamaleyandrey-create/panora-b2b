(function () {
  const dialog = $("#accountDetailDialog");
  const body = $("#accountRows");
  if (!dialog || !body) return;
  let selectedId = null;
  let debtTab = "active";

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
        payment.status !== "cancelled"
      )
      .reduce((sum,payment)=>sum+Number(payment.amount||0),0);
    const rows = notes.map(note => {
      const total = Math.max(0,Number(note.total||0));
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
      return window.panoraFinanceTimeline(id).slice().reverse().map((event) =>
        event.kind === "delivery"
          ? {
              date: event.date,
              type: "Отгрузка",
              number: `DN-${String(event.note.number).padStart(4, "0")}`,
              amount: event.amount,
              className: "shipment",
              balanceAfter: event.balanceAfter,
            }
          : {
              id: event.payment.id,
              date: event.date,
              type: paymentConfirmed(event.payment)
                ? event.payment.deliveryNoteId ? "Оплата по накладной" : "Общая оплата"
                : "Ожидает подтверждения",
              number: event.payment.note || event.payment.method || "",
              amount: -event.amount,
              className: paymentConfirmed(event.payment)
                ? "payment"
                : "payment pending",
              balanceAfter: event.balanceAfter,
            },
      );
    }
    let running = 0;
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
        })),
      ...payments
        .filter((payment) => payment.restaurantId === id)
        .map((payment) => ({
          id: payment.id,
          date: payment.date,
          type: paymentConfirmed(payment)
            ? payment.deliveryNoteId ? "Оплата по накладной" : "Общая оплата"
            : "Ожидает подтверждения",
          number: payment.note || payment.method || "",
          amount: -payment.amount,
          className: paymentConfirmed(payment)
            ? "payment"
            : "payment pending",
          sort: 1,
        })),
    ]
      .sort(
        (a, b) =>
          String(a.date).localeCompare(String(b.date)) || a.sort - b.sort,
      )
      .map((item) => {
        if (
          item.className === "shipment" ||
          !item.className.includes("pending")
        )
          running += Number(item.amount || 0);
        item.balanceAfter = running;
        return item;
      })
      .reverse();
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
    const archived=allocation.notes.filter(row=>Number(row.due||0)<=0.005).slice().reverse();
    let debtBlock = dialog.querySelector("#accountDetailDebts");
    if (!debtBlock) {
      debtBlock = document.createElement("section");
      debtBlock.id = "accountDetailDebts";
      debtBlock.className = "account-detail-debts";
      const head = dialog.querySelector(".account-detail-head");
      head?.before(debtBlock);
    }

    if(debtTab==="active"&&!active.length&&archived.length)debtTab="active";
    const rows=debtTab==="archive"?archived:active;
    const creditNotice=allocation.credit>0.005
      ? `<div class="account-credit-notice"><span>Аванс / переплата</span><strong>${euro(allocation.credit)}</strong><small>Будет автоматически зачтена в самые старые неоплаченные накладные и будущие поставки.</small></div>`
      : "";

    const listHtml=rows.length
      ? `<div class="account-detail-debt-list ${debtTab==="archive"?"is-archive":""}">${rows.map(({note,total,paid,due}) =>
          `<article><div><strong>DN-${String(note.number).padStart(4,"0")}</strong><span>Поставка: ${prettyDate(note.date)}</span>${note.paymentDueDate?`<small>Оплатить до: ${prettyDate(note.paymentDueDate)}</small>`:""}</div><div><span>Сумма ${euro(total)}</span><span>Зачтено ${euro(paid)}</span>${due>0.005?`<b>К оплате ${euro(due)}</b>`:`<b class="paid-full">Оплачено полностью</b>`}</div></article>`
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

  function open(id) {
    const client = restaurant(id);
    if (!client) return;
    selectedId = id;
    debtTab = "active";
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

    $("#accountDetailHistory").innerHTML = history.length
      ? history
          .map(
            (item) =>
              `<article class="${item.className}"><div><strong>${item.type}</strong><span>${prettyDate(item.date)}${item.number ? ` · ${item.number}` : ""}</span></div><div class="account-payment-value"><b>${item.amount < 0 ? "−" : "+"}${euro(Math.abs(item.amount))}</b>${balanceAfterHtml(item.balanceAfter)}${item.className.includes("pending") ? `<button type="button" data-confirm-payment="${item.id}">Подтвердить получение</button>` : ""}</div></article>`,
          )
          .join("")
      : '<p class="empty-row">Операций пока нет.</p>';

    $("#accountDetailHistory")
      .querySelectorAll("[data-confirm-payment]")
      .forEach(
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
    dialog.showModal();
  }

  body.addEventListener("click", (event) => {
    const row = event.target.closest("[data-account-restaurant]");
    if (row) open(row.dataset.accountRestaurant);
  });
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
