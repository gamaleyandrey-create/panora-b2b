/* Panora v314: durable, versioned drafts for every standard form control. */
(() => {
  "use strict";

  const VERSION = 1;
  // v313 intentionally uses a new namespace. v312 could assign one key to
  // several recipe tech-card controls and must never replay that corrupt draft.
  const LOCAL_PREFIX = "panora-form-draft-v314:";
  const DEVICE_KEY = "panora-form-device-v312";
  const SEND_DELAY = 900;
  const SKIP_TYPES = new Set(["password", "file", "hidden", "submit", "button", "reset", "image"]);
  const controls = 'input:not([type="password"]):not([type="file"]):not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]),textarea,select,[contenteditable="true"]';
  const timers = new Map();
  const requestVersion = new Map();
  const hydrated = new Set();
  const committedScopes = new Set();
  let mutationQueued = false;

  const json = (value, fallback = null) => { try { return JSON.parse(value) ?? fallback; } catch { return fallback; } };
  const uuid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const deviceId = (() => {
    let value = localStorage.getItem(DEVICE_KEY);
    if (!value) { value = uuid(); localStorage.setItem(DEVICE_KEY, value); }
    return value;
  })();
  const session = () => json(localStorage.getItem(location.pathname.includes("admin") ? "panora-supabase-session" : "panora-restaurant-cloud-session"), {});
  const userId = () => {
    if (session()?.user?.id) return session().user.id;
    try {
      const part = String(session()?.access_token || "").split(".")[1] || "";
      return json(atob(part.replace(/-/g, "+").replace(/_/g, "/")), {})?.sub || "anonymous";
    } catch { return "anonymous"; }
  };
  const role = () => location.pathname.includes("admin") ? "bakery" : location.pathname.includes("confirm") ? "confirmation" : "partner";
  const esc = (value) => globalThis.CSS?.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, "\\$&");
  const isEditable = (node) => node instanceof Element && node.matches(controls) && !SKIP_TYPES.has(String(node.type || "").toLowerCase()) && !node.disabled;
  const formOf = (field) => field.closest("form") || field.closest("dialog,[role=dialog],section,article,main") || document.body;
  const formId = (form) => form.id || form.getAttribute?.("data-panora-form") || form.getAttribute?.("data-rw-profile-form") !== null && "partner-profile" || stablePath(form);
  const stablePath = (node) => {
    if (!node || node === document.body) return "body";
    if (node.id) return `#${node.id}`;
    const bits = [];
    for (let current = node; current && current !== document.body && bits.length < 4; current = current.parentElement) {
      const key = current.getAttribute?.("data-field-id") || current.getAttribute?.("data-product") || current.getAttribute?.("data-id") || current.getAttribute?.("name");
      bits.unshift(`${current.tagName.toLowerCase()}${key ? `[${key}]` : ""}`);
    }
    return bits.join(">");
  };
  const fieldId = (field) => {
    const row = field.closest("[data-row-id],[data-item-id],[data-product],[data-qty-select],[data-id],[data-index]");
    const owner = field.closest("[data-recipe-card]")?.getAttribute("data-recipe-card") || "";
    const rowId = row?.getAttribute("data-row-id") || row?.getAttribute("data-item-id") || row?.getAttribute("data-product") || row?.getAttribute("data-qty-select") || row?.getAttribute("data-id") || row?.getAttribute("data-index") || "";
    const base = field.getAttribute("data-draft-key") || field.name || field.id || field.getAttribute("data-tech") || field.getAttribute("data-role") || field.getAttribute("data-recipe-weight") || field.getAttribute("data-product") || field.getAttribute("data-qty-select") || field.getAttribute("data-field-id") || stablePath(field);
    const option = field.type === "radio" || field.type === "checkbox" ? `:${field.value || "checked"}` : "";
    return `${owner ? `${owner}:` : ""}${rowId ? `${rowId}:` : ""}${base}${option}`;
  };
  const scope = (form) => `${location.pathname}|${role()}|${userId()}|${formId(form)}`;
  const localKey = (form) => LOCAL_PREFIX + scope(form);
  const readDraft = (form) => json(localStorage.getItem(localKey(form)), { version: VERSION, fields: {}, seq: 0, serverVersion: 0, dirty: false });
  const writeDraft = (form, draft) => {
    try { localStorage.setItem(localKey(form), JSON.stringify(draft)); }
    catch { announce("Не сохранено", "error"); }
  };
  const valueOf = (field) => {
    if (field.type === "checkbox" || field.type === "radio") return { checked: field.checked, value: field.value };
    if (field instanceof HTMLSelectElement && field.multiple) return { value: [...field.selectedOptions].map(option => option.value) };
    if (field.isContentEditable) return { html: field.innerHTML };
    return { value: field.value };
  };
  const applyValue = (field, saved) => {
    if (!saved || field.dataset.panoraApplying === "1") return;
    field.dataset.panoraApplying = "1";
    try {
      if (field.type === "checkbox" || field.type === "radio") field.checked = Boolean(saved.checked);
      else if (field instanceof HTMLSelectElement && field.multiple) [...field.options].forEach(option => { option.selected = saved.value?.includes(option.value); });
      else if (field.isContentEditable && typeof saved.html === "string") field.innerHTML = saved.html;
      else if (saved.value !== undefined && field.value !== String(saved.value)) field.value = saved.value;
      field.dataset.panoraDirty = "true";
    } finally { delete field.dataset.panoraApplying; }
  };
  const announce = (text, state = "") => {
    const target = document.querySelector("#saveState,[data-form-save-state]");
    if (target) { target.textContent = text; target.dataset.syncState = state; }
    window.dispatchEvent(new CustomEvent("panora:form-save-state", { detail: { text, state } }));
  };
  const saveLocal = (field) => {
    const form = formOf(field), draft = readDraft(form), key = fieldId(field);
    committedScopes.delete(scope(form));
    draft.fields[key] = { ...valueOf(field), changedAt: new Date().toISOString() };
    draft.seq = Number(draft.seq || 0) + 1;
    draft.updatedAt = new Date().toISOString();
    draft.clientId = deviceId;
    draft.dirty = true;
    writeDraft(form, draft);
    field.dataset.panoraDirty = "true";
    announce(navigator.onLine ? "Сохранение…" : "Ожидает синхронизации", navigator.onLine ? "syncing" : "local");
    scheduleRemote(form);
  };
  const restoreForm = (form) => {
    const draft = readDraft(form);
    if (!draft?.fields) return;
    form.querySelectorAll(controls).forEach(field => applyValue(field, draft.fields[fieldId(field)]));
  };
  const allContainers = () => [...new Set([...document.querySelectorAll(controls)].map(formOf))];
  const restoreAll = () => allContainers().forEach(restoreForm);
  const api = async (path, options = {}) => {
    const cfg = window.PANORA_SUPABASE, token = session()?.access_token;
    if (!cfg?.url || !cfg?.publishableKey || !token) throw new Error("no-session");
    const response = await fetch(`${cfg.url}/rest/v1/${path}`, { ...options, headers: { apikey: cfg.publishableKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(options.headers || {}) } });
    if (!response.ok) throw new Error(await response.text() || String(response.status));
    return response.status === 204 ? null : json(await response.text(), null);
  };
  const pullRemote = async (form) => {
    const key = scope(form), local = readDraft(form);
    if (committedScopes.has(key) || local.dirty || hydrated.has(key) || userId() === "anonymous") return;
    hydrated.add(key);
    try {
      const rows = await api(`panora_form_drafts?form_key=eq.${encodeURIComponent(key)}&select=payload,version,updated_at&limit=1`);
      const remote = rows?.[0];
      if (!remote?.payload?.fields || Number(remote.version || 0) <= Number(local.serverVersion || 0)) return;
      writeDraft(form, { ...remote.payload, serverVersion: remote.version, dirty: false });
      restoreForm(form);
    } catch { /* Local draft remains authoritative and usable. */ }
  };
  const pushRemote = async (form) => {
    const key = scope(form), draft = readDraft(form), sentSeq = Number(draft.seq || 0);
    if (!draft.dirty || userId() === "anonymous" || !navigator.onLine) { announce("Ожидает синхронизации", "local"); return; }
    const marker = (requestVersion.get(key) || 0) + 1;
    requestVersion.set(key, marker);
    try {
      const rows = await api("rpc/panora_save_form_draft", { method: "POST", body: JSON.stringify({ p_form_key: key, p_payload: { ...draft, dirty: false }, p_client_id: deviceId, p_client_seq: sentSeq, p_base_version: Number(draft.serverVersion || 0) }) });
      if (requestVersion.get(key) !== marker) return;
      const result = Array.isArray(rows) ? rows[0] : rows;
      const current = readDraft(form);
      if (result?.conflict) { current.conflict = true; current.dirty = true; writeDraft(form, current); announce("Нужно выбрать версию данных", "error"); showConflictHelp(form, result.version); return; }
      current.serverVersion = Number(result?.version || current.serverVersion || 0);
      if (Number(current.seq || 0) === sentSeq) { current.dirty = false; current.conflict = false; announce("Сохранено", "synced"); }
      writeDraft(form, current);
    } catch { announce("Ожидает синхронизации", "local"); }
  };
  const scheduleRemote = (form) => {
    const key = scope(form);
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => pushRemote(form), SEND_DELAY));
  };
  const discard = (form) => { localStorage.removeItem(localKey(form)); hydrated.delete(scope(form)); };
  const discardConfirmed = async (form) => {
    const key = scope(form), draft = readDraft(form);
    clearTimeout(timers.get(key)); timers.delete(key);
    discard(form);
    if (userId() === "anonymous" || !navigator.onLine) return;
    try {
      await api("rpc/panora_clear_form_draft", { method: "POST", body: JSON.stringify({ p_form_key: key }) });
    } catch {
      // The committed business record is authoritative. A failed cleanup must
      // not recreate or restore the already confirmed local draft.
    }
  };
  const acceptCommitted = async (form) => {
    const key = scope(form), draft = readDraft(form);
    committedScopes.add(key);
    clearTimeout(timers.get(key)); timers.delete(key);
    if (draft?.fields && Object.keys(draft.fields).length) {
      localStorage.setItem(`${localKey(form)}:backup:${Date.now()}`, JSON.stringify(draft));
    }
    if (userId() !== "anonymous" && navigator.onLine) {
      try {
        await api("rpc/panora_clear_form_draft", { method: "POST", body: JSON.stringify({ p_form_key: key }) });
      } catch {
        // The verified product/recipe record stays authoritative even when the
        // optional draft-cleanup endpoint is temporarily unavailable.
      }
    }
    discard(form);
  };
  const showConflictHelp = (form, serverVersion) => {
    if (document.querySelector('[data-panora-conflict]')) return;
    const box = document.createElement('section');
    box.dataset.panoraConflict = 'true';
    box.setAttribute('role', 'alertdialog');
    box.setAttribute('aria-live', 'assertive');
    box.style.cssText = 'position:fixed;z-index:100000;left:12px;right:12px;bottom:12px;max-width:620px;margin:auto;padding:18px;border-radius:16px;background:#fff;color:#17251d;box-shadow:0 12px 45px #0005;border:2px solid #b7791f;font:15px/1.45 system-ui';
    const title = document.createElement('strong');
    title.textContent = role() === 'partner' ? 'Данные изменены на другом устройстве' : 'Обнаружен конфликт данных';
    const help = document.createElement('p');
    help.textContent = 'Ваши текущие значения сохранены на этом устройстве и не пропадут. Если вы сейчас заполняли форму здесь — выберите «Оставить с этого устройства». Если правильные данные вводили на другом телефоне или компьютере — выберите «Загрузить из облака».';
    const note = document.createElement('p');
    note.textContent = 'Не закрывайте страницу до выбора. Перед загрузкой облачной версии Panora сохранит резервную копию текущих значений.';
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;margin-top:12px';
    const keep = document.createElement('button');
    keep.type = 'button'; keep.textContent = 'Оставить с этого устройства';
    const cloud = document.createElement('button');
    cloud.type = 'button'; cloud.textContent = 'Загрузить из облака';
    [keep, cloud].forEach(button => { button.style.cssText = 'padding:10px 14px;border-radius:10px;border:1px solid #627568;background:#f7faf8;color:#17251d;font-weight:700'; });
    keep.onclick = () => {
      const current = readDraft(form);
      current.serverVersion = Number(serverVersion || current.serverVersion || 0);
      current.conflict = false; current.dirty = true;
      writeDraft(form, current); box.remove(); announce('Сохраняем выбранную версию…', 'syncing'); scheduleRemote(form);
    };
    cloud.onclick = async () => {
      const key = scope(form), current = readDraft(form);
      localStorage.setItem(`${localKey(form)}:backup:${Date.now()}`, JSON.stringify(current));
      cloud.disabled = true; keep.disabled = true;
      try {
        const rows = await api(`panora_form_drafts?form_key=eq.${encodeURIComponent(key)}&select=payload,version,updated_at&limit=1`);
        const remote = rows?.[0];
        if (!remote?.payload?.fields) throw new Error('cloud-draft-missing');
        writeDraft(form, { ...remote.payload, serverVersion: Number(remote.version || 0), dirty: false, conflict: false });
        restoreForm(form); box.remove(); announce('Загружена версия из облака', 'synced');
      } catch { cloud.disabled = false; keep.disabled = false; announce('Облако недоступно — текущие данные сохранены на устройстве', 'local'); }
    };
    actions.append(keep, cloud); box.append(title, help, note, actions); document.body.append(box); keep.focus();
  };

  document.addEventListener("input", event => { if (isEditable(event.target) && event.target.dataset.panoraApplying !== "1") saveLocal(event.target); }, true);
  document.addEventListener("change", event => { if (isEditable(event.target) && event.target.dataset.panoraApplying !== "1") saveLocal(event.target); }, true);
  document.addEventListener("reset", event => { const form = event.target; setTimeout(() => discard(form)); }, true);
  document.addEventListener("submit", event => { const form = event.target; form.dataset.panoraSubmitting = "true"; }, true);
  window.addEventListener("online", () => allContainers().forEach(form => { restoreForm(form); scheduleRemote(form); }));
  window.addEventListener("pageshow", restoreAll);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) restoreAll(); });
  new MutationObserver(() => {
    if (mutationQueued) return;
    mutationQueued = true;
    queueMicrotask(() => { mutationQueued = false; restoreAll(); allContainers().forEach(pullRemote); });
  }).observe(document.documentElement, { childList: true, subtree: true });

  window.panoraFormDrafts = {
    restore: restoreAll,
    clear(formOrSelector) { const form = typeof formOrSelector === "string" ? document.querySelector(formOrSelector) : formOrSelector; if (form) discard(form); },
    async acceptCommittedWithin(rootOrSelector) {
      const root = typeof rootOrSelector === "string" ? document.querySelector(rootOrSelector) : rootOrSelector;
      if (!root) return;
      const forms = [...new Set([...root.querySelectorAll(controls)].map(formOf).filter(form => root.contains(form)))];
      await Promise.all(forms.map(acceptCommitted));
    },
    async confirmSaved(formOrSelector) { const form = typeof formOrSelector === "string" ? document.querySelector(formOrSelector) : formOrSelector; if (form) { await discardConfirmed(form); announce("Сохранено", "synced"); } },
    flush: () => Promise.all(allContainers().map(pushRemote))
  };
  restoreAll();
  allContainers().forEach(pullRemote);
})();
