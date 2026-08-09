const fs = require("node:fs");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");

const source = fs.readFileSync(require("node:path").join(__dirname, "../app/input-stability.js"), "utf8");
const tick = () => new Promise(resolve => setTimeout(resolve, 10));

(async () => {
  const dom = new JSDOM(`<!doctype html><body>
    <span id="saveState"></span>
    <form id="checkoutForm">
      <input name="address"><textarea name="comment"></textarea>
      <select name="fulfillment"><option value="delivery">Delivery</option><option value="pickup">Pickup</option></select>
      <label><input type="radio" name="slot" value="morning">AM</label>
      <label><input type="radio" name="slot" value="evening">PM</label>
      <input type="password" name="password">
    </form>
    <section id="outside"><input name="price" type="number"></section>
    <section id="orderQuantities">
      <select data-qty-select="plain"><option value="0">0</option><option value="3">3</option></select>
      <select data-qty-select="pumpkin"><option value="0">0</option><option value="7">7</option></select>
    </section>
    <article id="techCard" data-recipe-card="plain">
      <input data-tech="fermentation" data-draft-key="tech:fermentation" type="number">
      <input data-tech="proof" data-draft-key="tech:proof" type="number">
      <input data-tech="bakeTemp" data-draft-key="tech:bakeTemp" type="number">
      <input data-tech="bakeTime" data-draft-key="tech:bakeTime" type="number">
    </article>
  </body>`, { url: "https://example.test/index.html", runScripts: "outside-only" });
  dom.window.eval(source);
  const input = (selector, value) => {
    const field = dom.window.document.querySelector(selector);
    if (field.type === "radio") field.checked = value;
    else field.value = value;
    field.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  };

  input('[name="address"]', "Calle Mayor 10");
  input('[name="comment"]', "Puerta lateral");
  input('[name="slot"][value="evening"]', true);
  input('#outside [name="price"]', "12.50");
  input('[data-tech="fermentation"]', "23");
  input('[data-qty-select="plain"]', "3");
  input('[name="password"]', "must-not-persist");
  await tick();

  const keys = Object.keys(dom.window.localStorage).filter(key => key.startsWith("panora-form-draft-v314:"));
  assert.equal(keys.length, 4, "form and non-form containers have separate drafts");
  assert.ok(!keys.some(key => dom.window.localStorage.getItem(key).includes("must-not-persist")), "password is excluded");

  dom.window.document.querySelector("#checkoutForm").innerHTML = `
    <input name="address"><textarea name="comment"></textarea>
    <select name="fulfillment"><option value="delivery">Delivery</option><option value="pickup">Pickup</option></select>
    <label><input type="radio" name="slot" value="morning">AM</label>
    <label><input type="radio" name="slot" value="evening">PM</label>`;
  dom.window.document.querySelector("#outside").innerHTML = '<input name="price" type="number">';
  await tick();
  assert.equal(dom.window.document.querySelector('[name="address"]').value, "Calle Mayor 10", "text survives rerender");
  assert.equal(dom.window.document.querySelector('[name="comment"]').value, "Puerta lateral", "textarea survives rerender");
  assert.equal(dom.window.document.querySelector('[name="slot"][value="evening"]').checked, true, "radio choice survives rerender");
  assert.equal(dom.window.document.querySelector('#outside [name="price"]').value, "12.50", "field outside form survives rerender");

  dom.window.document.querySelector("#orderQuantities").innerHTML = `
    <select data-qty-select="plain"><option value="0">0</option><option value="3">3</option></select>
    <select data-qty-select="pumpkin"><option value="0">0</option><option value="7">7</option></select>`;
  await tick();
  assert.equal(dom.window.document.querySelector('[data-qty-select="plain"]').value, "3", "edited order quantity survives rerender");
  assert.equal(dom.window.document.querySelector('[data-qty-select="pumpkin"]').value, "0", "another product quantity remains independent");

  dom.window.document.querySelector("#techCard").innerHTML = `
    <input data-tech="fermentation" data-draft-key="tech:fermentation" type="number">
    <input data-tech="proof" data-draft-key="tech:proof" type="number">
    <input data-tech="bakeTemp" data-draft-key="tech:bakeTemp" type="number">
    <input data-tech="bakeTime" data-draft-key="tech:bakeTime" type="number">`;
  await tick();
  assert.equal(dom.window.document.querySelector('[data-tech="fermentation"]').value, "23", "edited tech value survives rerender");
  assert.equal(dom.window.document.querySelector('[data-tech="proof"]').value, "", "proof remains independent");
  assert.equal(dom.window.document.querySelector('[data-tech="bakeTemp"]').value, "", "temperature remains independent");
  assert.equal(dom.window.document.querySelector('[data-tech="bakeTime"]').value, "", "bake time remains independent");

  dom.window.document.querySelector('[name="comment"]').remove();
  await tick();
  dom.window.document.querySelector("#checkoutForm").insertAdjacentHTML("beforeend", '<textarea name="comment"></textarea>');
  await tick();
  assert.equal(dom.window.document.querySelector('[name="comment"]').value, "Puerta lateral", "conditional field survives unmount/remount");

  console.log("form-stability: 14 assertions passed");
})().catch(error => { console.error(error); process.exitCode = 1; });
