const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const cloud = fs.readFileSync(path.join(__dirname, '../app/cloud-sync.js'), 'utf8');
const drafts = fs.readFileSync(path.join(__dirname, '../app/input-stability.js'), 'utf8');
const mobile = fs.readFileSync(path.join(__dirname, '../app/mobile-admin-nav-fix.css'), 'utf8');

assert.match(cloud, /loadCloudSection\(section,acceptedRemoteAt=''/, 'cloud acceptance receives the accepted revision');
assert.match(cloud, /revisions\[section\]=String\(acceptedRemoteAt\)/, 'accepted cloud revision becomes the local baseline');
assert.match(cloud, /clearPending\(section\);delete conflicts\[section\];saveConflicts\(\)/, 'accepted section clears pending state and conflict together');
assert.match(mobile, /#saveState\{[^}]*min-height:44px/, 'mobile sync status has a 44px touch target');
assert.match(mobile, /#panoraConflictChoice button\[data-choice\]\{[^}]*min-height:48px/, 'mobile conflict choices have 48px touch targets');
assert.match(cloud, /await window\.panoraFormDrafts\?\.acceptCommittedWithin\?\.\('#recipeList'\)/, 'product cloud acceptance clears recipe-card drafts before loading products');
assert.ok(cloud.indexOf("acceptCommittedWithin?.('#recipeList')") < cloud.indexOf("if(section==='products'){const rows=await request('products?select=*&order=created_at.asc');await applyProductRows(rows)"), 'draft cleanup runs before the cloud product render');
assert.match(drafts, /await api\("rpc\/panora_clear_form_draft"[\s\S]*discard\(form\)/, 'committed cloud acceptance waits for server draft cleanup before local discard');
assert.match(drafts, /localStorage\.setItem\(`\$\{localKey\(form\)\}:backup:/, 'the replaced device draft is backed up first');
assert.match(cloud, /const canonicalValue=value=>/, 'identical JSONB data does not create a false conflict when key order differs');
assert.match(cloud, /if\(remoteSig===localSig\)[\s\S]*productDirty=false;clearPending\('products'\)/, 'an identical cloud payload becomes the clean local baseline');

console.log('cloud-conflict-acceptance: 11 assertions passed');
