(function () {
  const dialog = $("#accountDetailDialog");
  const body = $("#accountRows");
  if (!dialog || !body) return;
  let selectedId = null;

  function bindRows() {
    [...body.querySelectorAll("tr")].forEach((row, index) => {
      const client = restaurants[index];
      if (!client) return;
      row.dataset.accountRestaurant = client.id;
      row.tabIndex = 0;
      row.title = "Открыть операции партнёра";
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
                ? "Оплата подтверждена"
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
            ? "Оплата подтверждена"
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
        item.balanceAfter = Math.max(0, running);
        return item;
      })
      .reverse();
  }

  function open(id) {
    const client = restaurant(id);
    if (!client) return;
    selectedId = id;
    const shipped = shippedFor(id);
    const paid = paidFor(id);
    const history = historyFor(id);
    $("#accountDetailName").textContent = client.name;
    $("#accountDetailContact").textContent = [
      client.email,
      client.phone,
      client.address,
    ]
      .filter(Boolean)
      .join(" · ");
    $("#accountDetailDebt").textContent = euro(shipped - paid);
    $("#accountDetailShipped").textContent = euro(shipped);
    $("#accountDetailPaid").textContent = euro(paid);
    $("#accountDetailHistory").innerHTML = history.length
      ? history
          .map(
            (item) =>
              `<article class="${item.className}"><div><strong>${item.type}</strong><span>${item.date}${item.number ? ` · ${item.number}` : ""}</span></div><div class="account-payment-value"><b>${item.amount < 0 ? "−" : "+"}${euro(Math.abs(item.amount))}</b><small>Задолженность после операции: ${euro(Math.max(0, Number(item.balanceAfter || 0)))}</small>${item.className.includes("pending") ? `<button type="button" data-confirm-payment="${item.id}">Подтвердить получение</button>` : ""}</div></article>`,
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
    $("#paymentDialog").showModal();
  };
  const observer = new MutationObserver(bindRows);
  observer.observe(body, { childList: true });
  bindRows();
})();
