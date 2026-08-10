const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const app=path.join(__dirname,'../app');
const html=fs.readFileSync(path.join(app,'index.html'),'utf8');
const css=fs.readFileSync(path.join(app,'connection-status.css'),'utf8');
assert.match(html,/top-actions"><div class="partner-sync-inline"/);
assert.match(css,/definitive sync placement: topbar only/);
assert.match(css,/position:static!important/);
assert.match(css,/pointer-events:none!important/);
console.log('v337.4-sync-position-compatible: 4 assertions passed');
