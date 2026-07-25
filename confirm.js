(function () {
  const root = document.querySelector('#deliveryCard');
  const cfg = window.PANORA_SUPABASE || {};
  const sessionKey = 'panora-restaurant-cloud-session';
  const queueKey = 'panora-delivery-confirmation-queue';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const token = new URLSearchParams(location.search).get('t') || '';
  const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token);

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  let session = readJson(sessionKey, null);

  function show(title, text, action = '') {
    root.innerHTML = `<div class="error"><strong>${esc(title)}</strong><br>${esc(text)}</div>${action}`;
  }

  function serverError(message, status, payload) {
    const error = new Error(message);
    error.status = status;
    error.payload = payload;
    return error;
  }

  async function refresh() {
    if (!session?.refresh_token) return false;
    let response;
    try {
      response = await fetch(`${cfg.url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          apikey: cfg.publishableKey,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ refresh_token: session.refresh_token })
      });
    } catch {
      throw serverError('NETWORK_ERROR', 0);
    }
    if (!response.ok) return false;
    session = await response.json();
    localStorage.setItem(sessionKey, JSON.stringify(session));
    return true;
  }

  async function rpc(name, body, retry = true) {
    let response;
    try {
      response = await fetch(`${cfg.url}/rest/v1/rpc/${name}`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          apikey: cfg.publishableKey,
          Authorization: `Bearer ${session?.access_token || ''}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(body)
      });
    } catch {
      throw serverError('NETWORK_ERROR', 0);
    }

    if (response.status === 401 && retry && await refresh()) {
      return rpc(name, body, false);
    }

    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
    if (!response.ok) {
      throw serverError(payload?.message || `HTTP_${response.status}`, response.status, payload);
    }
    return payload;
  }

  function queued() {
    const value = readJson(queueKey, []);
    return Array.isArray(value) ? value : [];
  }

  function savePending(receiver) {
    const queue = queued().filter(item => item.token !== token);
    queue.push({ token, receiver, createdAt: new Date().toISOString() });
    localStorage.setItem(queueKey, JSON.stringify(queue));
  }

  async function flush() {
    if (!navigator.onLine || !session?.access_token) return;
    const left = [];
    for (const item of queued()) {
      try {
        const rows = await rpc('panora_confirm_delivery', {
          p_token: item.token,
          p_receiver: item.receiver
        });
        if (!rows?.length) throw new Error('NOT_CONFIRMED');
      } catch {
        left.push(item);
      }
    }
    localStorage.setItem(queueKey, JSON.stringify(left));
  }

  function render(delivery) {
    const items = Array.isArray(delivery.items) ? delivery.items : [];
    root.innerHTML = `${delivery.customer_confirmed_at
      ? `<div class="success"><strong>Поставка подтверждена</strong><br>${new Date(delivery.customer_confirmed_at).toLocaleString('ru-RU')}</div>`
      : ''}
      <h2>Поставка DN-${String(delivery.note_number).padStart(4, '0')}</h2>
      <div class="meta">
        <div><small>Заказ</small><strong>PN-${String(delivery.order_number).padStart(4, '0')}</strong></div>
        <div><small>Дата поставки</small><strong>${esc(delivery.delivery_date || String(delivery.delivered_at).slice(0, 10))}</strong></div>
      </div>
      <table class="items">
        <thead><tr><th>Товар</th><th>Количество</th></tr></thead>
        <tbody>${items.map(item => `<tr><td>${esc(item.name_ru || item.product_id)}</td><td>${item.quantity} шт.</td></tr>`).join('')}</tbody>
      </table>
      ${delivery.customer_confirmed_at ? '' : `
        <form id="confirmForm" class="confirm-form">
          <label><span>Имя получателя</span><input name="receiver" minlength="2" maxlength="120" autocomplete="name" required></label>
          <label class="check"><input name="accepted" type="checkbox" required><span>Количество и состояние товара проверены. Подтверждаю получение.</span></label>
          <button>Подтвердить получение</button>
        </form>`}`;

    document.querySelector('#confirmForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const receiver = String(new FormData(form).get('receiver')).trim();
      const button = form.querySelector('button');
      button.disabled = true;
      try {
        if (!navigator.onLine) {
          savePending(receiver);
          root.insertAdjacentHTML('afterbegin', '<div class="pending"><strong>Ожидает отправки</strong><br>Подтверждение сохранено и будет проверено после появления интернета.</div>');
          form.remove();
          return;
        }
        const rows = await rpc('panora_confirm_delivery', { p_token: token, p_receiver: receiver });
        if (!rows?.length) throw serverError('NOT_CONFIRMED', 403);
        await load();
      } catch (error) {
        if (error.status === 0) {
          show('Нет связи с сервером', 'Проверьте интернет и нажмите «Повторить».', '<button class="button retry" type="button">Повторить</button>');
        } else {
          show('Не удалось подтвердить', 'Код недействителен, истёк или принадлежит другому ресторану.');
        }
      } finally {
        button.disabled = false;
      }
    });
  }

  async function load() {
    if (!valid) {
      show('Ссылка недействительна', 'Попросите пекарню показать новый QR-код.');
      return;
    }
    if (!cfg.url || !cfg.publishableKey) {
      show('Приложение не обновлено', 'Закройте страницу, откройте её снова и повторно отсканируйте QR-код.');
      return;
    }
    if (!session?.access_token) {
      show('Нужно войти в кабинет ресторана', 'После входа снова отсканируйте QR-код.', '<a class="button login" href="index.html">Войти</a>');
      return;
    }
    if (!navigator.onLine) {
      show('Нет подключения к интернету', 'Для первого открытия QR-кода нужна безопасная проверка. Повторите после появления сети.', '<button class="button retry" type="button">Повторить</button>');
      return;
    }

    root.innerHTML = '<p class="loading">Проверяем защищённый код…</p>';
    flush().catch(() => {});
    try {
      const rows = await rpc('panora_delivery_confirmation', { p_token: token });
      if (!rows?.length) {
        show('Поставка недоступна', 'QR-код относится к другому ресторану, недействителен или истёк.');
        return;
      }
      render(rows[0]);
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        localStorage.removeItem(sessionKey);
        session = null;
        show('Нужно снова войти', 'Срок безопасного входа истёк. Войдите в кабинет и повторно отсканируйте QR-код.', '<a class="button login" href="index.html">Войти</a>');
      } else if (error.status === 404 || error.payload?.code === 'PGRST202') {
        show('QR-подтверждение ещё не настроено', 'Обновите функцию подтверждения в Supabase и повторите.', '<button class="button retry" type="button">Повторить</button>');
      } else if (error.status === 0) {
        show('Нет связи с сервером', 'Проверьте интернет и нажмите «Повторить».', '<button class="button retry" type="button">Повторить</button>');
      } else {
        show('Не удалось проверить поставку', `Сервер вернул ошибку ${error.status || ''}. Нажмите «Повторить».`, '<button class="button retry" type="button">Повторить</button>');
      }
    }
  }

  root.addEventListener('click', event => {
    if (event.target.closest('.retry')) load();
  });
  addEventListener('online', load);
  load();
})();
