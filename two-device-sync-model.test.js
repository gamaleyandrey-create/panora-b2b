const assert = require('node:assert/strict');

function decide(base, local, cloud, dirty = false) {
  if (local === cloud) return 'equal';
  if (!base) return 'cloud';
  if (!dirty) return 'cloud';
  if (cloud === base) return 'local';
  return 'manual';
}

let cloud = 'card-v1';
let deviceA = {base: '', local: 'old-a'};
let deviceB = {base: '', local: 'old-b'};

assert.equal(decide(deviceA.base, deviceA.local, cloud), 'cloud');
deviceA = {base: cloud, local: cloud};
assert.equal(decide(deviceB.base, deviceB.local, cloud), 'cloud');
deviceB = {base: cloud, local: cloud};

deviceA.local = 'card-v2';
assert.equal(decide(deviceA.base, deviceA.local, cloud, true), 'local');
cloud = deviceA.local;
deviceA.base = cloud;
assert.equal(decide(deviceB.base, deviceB.local, cloud), 'cloud');
deviceB.local = cloud;
deviceB.base = cloud;
assert.equal(deviceA.local, deviceB.local, 'both bakery devices converge automatically');

deviceA.local = 'card-from-a';
deviceB.local = 'card-from-b';
cloud = deviceA.local;
assert.equal(decide(deviceB.base, deviceB.local, cloud, true), 'manual', 'only simultaneous queued edits require a person');

deviceB = {base: 'stale-base', local: 'browser-normalized-copy'};
assert.equal(decide(deviceB.base, deviceB.local, cloud, false), 'cloud', 'a clean device never creates a conflict from stale local metadata');

console.log('two-device-sync-model: 7 assertions passed');
