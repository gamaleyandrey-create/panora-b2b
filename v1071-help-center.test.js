const fs=require('fs');const assert=require('assert');
const js=fs.readFileSync('production-safety.js','utf8');const css=fs.readFileSync('production-safety.css','utf8');const build=JSON.parse(fs.readFileSync('build.json','utf8'));
assert.equal(build.version,'10.89');assert.equal(build.build,10890);assert.equal(build.cache,10890);
for(const section of ['production','breadLots','rawLots','allergens','sanitation','haccp','capa','recalls','suppliers','training','documents','trace'])assert(js.includes(`helpBlock('${section}')`),`missing help for ${section}`);
for(const id of ['gluten','crustaceans','eggs','fish','peanuts','soy','milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs'])assert(js.includes(`${id}:`),`missing allergen guide ${id}`);
assert(js.includes('suggestedIngredientAllergens'));assert(js.includes('data-ps-apply-suggestion'));assert(js.includes('data-ps-apply-all-suggestions'));assert(js.includes('Проверьте состав и маркировку поставщика.'));
assert(css.includes('.ps-help'));assert(css.includes('.ps-allergen-reference'));assert(css.includes('.ps-allergen-suggestion'));

const admin=fs.readFileSync('admin.html','utf8');const bakery=fs.readFileSync('bakery/index.html','utf8');
for(const html of [admin,bakery]){assert(html.includes('data-view="ps-help"'), 'missing Help menu item');assert(html.includes('id="view-ps-help"'), 'missing Help view');}
for(const token of ['renderHelpCenter','renderFirstSteps','contextHelp','data-ps-tip','data-ps-go','psContextHelpDialog','refreshNavLanguage'])assert(js.includes(token),`missing ${token}`);
for(const cssToken of ['.ps-help-grid','.ps-first-steps-home','.ps-help-dot','.ps-context-help-dialog','.ps-workflow'])assert(css.includes(cssToken),`missing ${cssToken}`);
assert(js.includes("tipButton('blockLot')"));assert(js.includes("tipButton('autoAllergens')"));assert(js.includes("tipButton('actualProduced')"));assert(js.includes("tipButton('supplierLot')"));
console.log('Panora 10.75 help center/allergen tests: OK');
