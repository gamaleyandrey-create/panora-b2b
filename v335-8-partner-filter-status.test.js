const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const app=path.join(__dirname,'../app');
const admin=fs.readFileSync(path.join(app,'admin.html'),'utf8');
const commerce=fs.readFileSync(path.join(app,'commerce.js'),'utf8');
const conn=fs.readFileSync(path.join(app,'connection-status.js'),'utf8');
assert.match(admin,/orderPartnerNameFilter/);
assert.match(commerce,/orderPartnerNameFilter/);
assert.match(conn,/Актуально/);
console.log('v335.8-compatible: 3 assertions passed');
