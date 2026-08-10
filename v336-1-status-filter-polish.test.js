const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const app=path.join(__dirname,'../app');
const css=fs.readFileSync(path.join(app,'connection-status.css'),'utf8');
const admin=fs.readFileSync(path.join(app,'admin.html'),'utf8');
assert.match(css,/definitive sync placement/);
assert.match(admin,/order-filter-card/);
assert.match(admin,/Поставка с/);
assert.match(admin,/order-date-range/);
console.log('v337.4-status-filter-polish-compatible: 4 assertions passed');
