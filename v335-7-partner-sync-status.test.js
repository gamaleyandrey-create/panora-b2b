const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const portal=fs.readFileSync(path.join(__dirname,'../app/portal-cloud.js'),'utf8');
assert.match(portal,/const sentMessage=labels\(`Заказ PN-/);
assert.match(portal,/showToast\(sentMessage\)/);
assert.match(portal,/state\('ok',labels\('Синхронизировано','Synced','Sincronizado'\)\)/);
assert.doesNotMatch(portal,/state\('ok',labels\(`Заказ PN-/);
const refreshCount=(portal.match(/state\('ok',labels\('Синхронизировано','Synced','Sincronizado'\)\)/g)||[]).length;
assert.ok(refreshCount>=3,'synced state applied after order/full refresh/poll refresh');
console.log('v335.7-partner-sync-status: 5 assertions passed');
