const fs=require('fs');const assert=require('assert');
const js=fs.readFileSync('production-safety.js','utf8');const css=fs.readFileSync('production-safety.css','utf8');const build=JSON.parse(fs.readFileSync('build.json','utf8'));
assert.equal(build.version,'10.68');assert.equal(build.build,10680);assert.equal(build.cache,10680);
for(const section of ['production','breadLots','rawLots','allergens','sanitation','documents','trace'])assert(js.includes(`helpBlock('${section}')`),`missing help for ${section}`);
for(const id of ['gluten','crustaceans','eggs','fish','peanuts','soy','milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs'])assert(js.includes(`${id}:`),`missing allergen guide ${id}`);
assert(js.includes('suggestedIngredientAllergens'));assert(js.includes('data-ps-apply-suggestion'));assert(js.includes('data-ps-apply-all-suggestions'));assert(js.includes('Проверьте состав и маркировку поставщика.'));
assert(css.includes('.ps-help'));assert(css.includes('.ps-allergen-reference'));assert(css.includes('.ps-allergen-suggestion'));
console.log('Panora 10.68 help/allergen tests: OK');
