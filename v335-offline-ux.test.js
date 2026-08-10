const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const cloud=fs.readFileSync(path.join(__dirname,'../app/cloud-sync.js'),'utf8');
const note=fs.readFileSync(path.join(__dirname,'../app/event-notifications.js'),'utf8');
const noteCss=fs.readFileSync(path.join(__dirname,'../app/event-notifications.css'),'utf8');
const auditCss=fs.readFileSync(path.join(__dirname,'../app/audit-trail.css'),'utf8');

const qStart=cloud.indexOf('function queuePlans()');
const qEnd=cloud.indexOf('function queueProducts()',qStart);
const queuePlans=cloud.slice(qStart,qEnd);

assert.ok(qStart>=0 && qEnd>qStart,'queuePlans found');
assert.match(queuePlans,/markPending\('plans'\)/);
assert.match(queuePlans,/planTimer=setTimeout\(\(\)=>savePlansNow/);
assert.doesNotMatch(queuePlans,/if\(!navigator\.onLine\)/);
assert.match(cloud,/pendingRetryTimer=setInterval/);
assert.match(cloud,/window\.addEventListener\('online'.*pending=readPending\(\).*retrySync/s);
assert.match(note,/Новый заказ поступил в пекарню/);
assert.match(note,/Есть новости по вашему заказу/);
assert.match(noteCss,/\.panora-event-settings\{top:64px;right:14px\}/);
assert.match(auditCss,/\.panora-audit-button\{top:64px;right:58px\}/);
console.log('v335.1-calendar-sync: 10 assertions passed');
