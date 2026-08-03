/* Panora v305: preserve edited fields and replay delayed background renders. */
(() => {
  "use strict";
  const editable = (element) =>
    element instanceof Element &&
    element.matches('input:not([type="hidden"]), textarea, select, [contenteditable="true"]');
  const dirtySelector = '[data-panora-dirty="true"]';
  const fieldKey = (field) => field.name || field.id || "";
  const formKey = (form, index) => form.id || (form.hasAttribute("data-rw-profile-form") ? "rw-profile" : `form-${index}`);
  const remember = () => [...document.forms].flatMap((form, formIndex) =>
    [...form.querySelectorAll(dirtySelector)].map((field) => ({
      form: formKey(form, formIndex), key: fieldKey(field), type: field.type,
      value: field.value, checked: field.checked,
    })).filter((item) => item.key));
  const restore = (snapshot) => snapshot.forEach((item) => {
    const form = [...document.forms].find((candidate, index) => formKey(candidate, index) === item.form);
    const field = form?.elements?.namedItem(item.key) || document.getElementById(item.key);
    if (!(field instanceof HTMLElement)) return;
    if (item.type === "checkbox" || item.type === "radio") field.checked = item.checked;
    else field.value = item.value;
    field.dataset.panoraDirty = "true";
  });
  ["input", "change"].forEach((type) => document.addEventListener(type, (event) => {
    if (editable(event.target)) event.target.dataset.panoraDirty = "true";
  }, true));
  const protect = (name) => {
    const original = window[name];
    if (typeof original !== "function" || original.panoraInputStable) return;
    let queued = false;
    const guarded = function (...args) {
      const active = document.activeElement;
      if (editable(active) && active.closest("form")) { queued = true; return; }
      const snapshot = remember();
      const result = original.apply(this, args);
      restore(snapshot);
      queued = false;
      return result;
    };
    guarded.panoraInputStable = true;
    window[name] = guarded;
    document.addEventListener("focusout", () => {
      if (!queued) return;
      queueMicrotask(() => {
        const active = document.activeElement;
        if (!editable(active) || !active.closest("form")) guarded();
      });
    }, true);
  };
  ["renderAll", "renderCommerce", "renderAccountModal"].forEach(protect);
})();
