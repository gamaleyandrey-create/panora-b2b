const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const app=path.join(__dirname,'../app');
const partner=fs.readFileSync(path.join(app,'index.html'),'utf8');
const admin=fs.readFileSync(path.join(app,'admin.html'),'utf8');
const commerce=fs.readFileSync(path.join(app,'commerce.js'),'utf8');
assert.match(partner,/id="partnerSyncInline"/);
assert.match(admin,/Поставка с/);
assert.match(commerce,/order\.deliveryDate\|\|order\.date/);
console.log('v337.4-embedded-status-delivery-compatible: 3 assertions passed');
