const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const js=fs.readFileSync(path.join(__dirname,'../app/audit-trail.js'),'utf8');
const admin=fs.readFileSync(path.join(__dirname,'../app/admin.html'),'utf8'),partner=fs.readFileSync(path.join(__dirname,'../app/index.html'),'utf8');
for(const x of ['panora-products','panora-recipes','panora-production-plans','panora-orders','panora-shipments','panora-delivery-notes','panora-payments'])assert.match(js,new RegExp(x));
assert.match(js,/История изменений/);assert.match(js,/Создание/);assert.match(js,/Изменение/);assert.match(js,/Удаление/);assert.match(js,/window\.addEventListener\('storage'/);assert.match(js,/source==='remote'/);
for(const h of [admin,partner]){assert.match(h,/audit-trail\.css\?v=3364/);assert.match(h,/audit-trail\.js\?v=3364/)}
console.log('v333-audit-trail: 17 assertions passed');
