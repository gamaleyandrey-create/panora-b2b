const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const js=fs.readFileSync(path.join(__dirname,'../app/event-notifications.js'),'utf8');
const cloud=fs.readFileSync(path.join(__dirname,'../app/cloud-sync.js'),'utf8');
const admin=fs.readFileSync(path.join(__dirname,'../app/admin.html'),'utf8');
const partner=fs.readFileSync(path.join(__dirname,'../app/index.html'),'utf8');
assert.match(js,/Новый заказ/);
assert.match(js,/Есть новости по вашему заказу/);
assert.match(js,/Ошибка синхронизации/);
assert.match(js,/panora-event-sound-v332/);
assert.match(js,/status==='cancelled'/);
assert.match(js,/confirmed:'подтверждён'/);
assert.match(js,/shipped:'отгружен'/);
assert.match(js,/panora:orders-updated/);
assert.match(cloud,/panora:orders-updated/);
for(const h of [admin,partner]){assert.match(h,/event-notifications\.css\?v=3364/);assert.match(h,/event-notifications\.js\?v=3364/)}
console.log('v332-notifications: 13 assertions passed');
