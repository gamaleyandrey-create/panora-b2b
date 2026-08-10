const assert = require('node:assert/strict');
const fs = require('node:fs');

const cloud = fs.readFileSync(new URL('../app/cloud-sync.js', `file://${__filename}`), 'utf8');
const html = fs.readFileSync(new URL('../app/admin.html', `file://${__filename}`), 'utf8');
const drafts = fs.readFileSync(new URL('../app/input-stability.js', `file://${__filename}`), 'utf8');

assert.match(cloud, /await window\.panoraFormDrafts\?\.acceptCommittedWithin\?\.\('#recipeList'\);\s*localStorage\.setItem\('panora-products'/, 'cloud tech cards clear stale editor drafts before rendering');
assert.match(cloud, /if\(rows\?\.length\)\{\s*await window\.panoraFormDrafts\?\.acceptCommittedWithin\?\.\('#recipeList'\);\s*const remote=\{\}/, 'cloud ingredients clear stale editor drafts before rendering');
assert.match(cloud, /canonicalValue\(confirmed\.tech_card\|\|\{\}\).*canonicalValue\(normalized\)/, 'all seven tech-card fields are verified independent of JSONB key order');
assert.ok(html.indexOf('input-stability.js?v=324') < html.indexOf('cloud-sync.js?v=3350'), 'draft protection initializes before cloud synchronization');
assert.match(drafts, /localStorage\.setItem\(`\$\{localKey\(form\)\}:backup:/, 'old draft values are backed up before replacement');
assert.match(drafts, /try \{\s*await api\("rpc\/panora_clear_form_draft"[\s\S]*?\} catch \{[\s\S]*?\}\s*\}\s*discard\(form\)/, 'a draft-cleanup API failure cannot block verified cloud data');
assert.match(drafts, /committedScopes\.has\(key\).*local\.dirty/, 'a failed remote cleanup cannot replay the stale server draft over committed data');
assert.match(drafts, /committedScopes\.delete\(scope\(form\)\)/, 'fresh user input re-enables draft protection for that card');

console.log('cloud-tech-card-authority: 8 assertions passed');
