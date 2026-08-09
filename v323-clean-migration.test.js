const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(new URL('../app/cloud-sync.js', `file://${__filename}`), 'utf8');
const prefix = source.slice(0, source.indexOf('  const forceSections='));

function migrate(seed) {
  const data = new Map(Object.entries(seed));
  const localStorage = {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key)
  };
  vm.runInNewContext(`(()=>{const audit=()=>{};${prefix.slice(prefix.indexOf('\n') + 1)} })()`, {
    window: { PANORA_SUPABASE: {}, panoraAudit: { record() {} } }, localStorage, Date, Math, JSON
  });
  return data;
}

const pendingKey = 'panora-cloud-pending-v283';
const conflictKey = 'panora-cloud-conflicts-v285';
const data = migrate({
  [pendingKey]: JSON.stringify({ products: true, orders: true }),
  [conflictKey]: JSON.stringify({ products: { remoteAt: 'old' }, plans: { remoteAt: 'new' } }),
  'panora-cloud-accepted-v317': JSON.stringify({ products: 'old', plans: 'new' }),
  'panora-cloud-revisions-v285': JSON.stringify({ products: 'old', plans: 'new' }),
  'panora-products': JSON.stringify([{ id: 'bread', techCard: { mix: 'local' } }])
});

assert.equal(JSON.parse(data.get(pendingKey)).products, undefined);
assert.equal(JSON.parse(data.get(pendingKey)).orders, true);
assert.equal(data.get(conflictKey), undefined, 'current migrations remove stale product and plan conflicts');
assert.equal(data.get('panora-cloud-sync-schema'), '323');
assert.ok(JSON.parse(data.get('panora-cloud-backups-v286'))[0].data.products);

const second = migrate(Object.fromEntries(data));
assert.deepEqual(Object.fromEntries(second), Object.fromEntries(data), 'migration is idempotent');
console.log('v323-clean-migration: 7 assertions passed');
