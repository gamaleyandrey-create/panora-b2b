const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const app=path.join(__dirname,'../app');
const head=fs.readFileSync(path.join(app,'mobile-header.css'),'utf8');
const responsive=fs.readFileSync(path.join(app,'responsive.css'),'utf8');
assert.match(head,/#profileButton\.account-entry/);
assert.match(head,/#adminLogout\.admin-logout/);
assert.match(responsive,/unified desktop\/mobile partner layout/);
assert.match(responsive,/\.mobile-nav/);
console.log('v337.4-mobile-button-audit-compatible: 4 assertions passed');
