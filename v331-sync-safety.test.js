const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

const status=fs.readFileSync(path.join(__dirname,'../app/connection-status.js'),'utf8');
const recovery=fs.readFileSync(path.join(__dirname,'../app/recovery-guard.js'),'utf8');
const admin=fs.readFileSync(path.join(__dirname,'../app/admin.html'),'utf8');
const partner=fs.readFileSync(path.join(__dirname,'../app/index.html'),'utf8');

assert.match(status,/window\.addEventListener\('offline'/);
assert.match(status,/window\.addEventListener\('online'/);
assert.match(status,/panoraFormDrafts\?\.flush/);
assert.match(status,/panoraCloud\?\.retrySync/);
assert.match(status,/panoraPortalCloud\?\.refreshOrders/);

assert.match(recovery,/panora-products/);
assert.match(recovery,/panora-production-plans/);
assert.match(recovery,/panora-form-draft-v3258:/);
assert.match(recovery,/pagehide/);
assert.match(recovery,/beforeunload/);
assert.match(recovery,/restoreLatest/);

for(const html of [admin,partner]){
  assert.match(html,/connection-status\.css\?v=3362/);
  assert.match(html,/recovery-guard\.js\?v=3310/);
  assert.match(html,/connection-status\.js\?v=3360/);
}

console.log('v331-sync-safety: 17 assertions passed');
