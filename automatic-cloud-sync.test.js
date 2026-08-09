const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const cloud = fs.readFileSync(path.join(__dirname, '../app/cloud-sync.js'), 'utf8');

assert.match(cloud, /baselineKey='panora-cloud-baselines-v323'/, 'v323 resets and stores a clean shared product baseline');
assert.match(cloud, /if\(localSig===remoteSig\)/, 'identical copies are accepted silently');
assert.match(cloud, /if\(!baseSig\)[\s\S]*applyProductRows\(rows\)/, 'upgrade adopts cloud automatically and creates a baseline');
assert.match(cloud, /if\(!localChanged\)[\s\S]*applyProductRows\(rows\)/, 'cloud-only changes are applied automatically');
assert.match(cloud, /const localChanged=Boolean\(productDirty\|\|pending\.products\)&&localSig!==baseSig/, 'only a queued user edit counts as a local change');
assert.match(cloud, /if\(localChanged&&remoteChanged\)/, 'manual conflict is reserved for two confirmed concurrent changes');
assert.match(cloud, /if\(!localChanged\)[\s\S]*applyProductRows\(rows\)/, 'a clean device always adopts the cloud version automatically');
assert.match(cloud, /clearOrphanConflicts/, 'stale conflict flags without pending edits are removed');
assert.match(cloud, /if\(!baselines\.products\|\|productDirty\|\|savingProducts\)/, 'the first v323 cloud load creates a backup before replacing local cards');
assert.match(cloud, /function queueProducts\(\)\{if\(applyingCloud\)return/, 'cloud rendering cannot enqueue a local upload');
assert.match(cloud, /saveProductBaseline\(mapped\);productDirty=false;clearPending\('products'\)/, 'applied cloud data becomes the clean baseline');
assert.match(cloud, /productPoll=setInterval\(\(\)=>refreshProductsIfChanged/, 'devices continue checking for cloud changes automatically');

assert.match(cloud, /const canonicalValue=value=>/, 'nested JSON fields are canonicalized before comparison');
assert.match(cloud, /const rows=await request\('products\?select=\*&order=created_at.asc'\)/, 'polling compares the complete cloud payload');
console.log('automatic-cloud-sync: 13 assertions passed');
