/* Panora v304: do not replace a form while the user is typing in it. */
(() => {
  "use strict";
  const editable = (element) =>
    element instanceof Element &&
    element.matches('input:not([type="hidden"]), textarea, select, [contenteditable="true"]');
  const userIsEditing = () => editable(document.activeElement);
  const protect = (name) => {
    const original = window[name];
    if (typeof original !== "function" || original.panoraInputStable) return;
    const guarded = function (...args) {
      if (userIsEditing()) return;
      return original.apply(this, args);
    };
    guarded.panoraInputStable = true;
    window[name] = guarded;
  };
  ["renderAll", "renderCommerce", "renderAccountModal"].forEach(protect);
})();
