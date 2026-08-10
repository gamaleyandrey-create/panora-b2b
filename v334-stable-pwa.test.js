const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const app=path.join(__dirname,'../app');
const manifest=JSON.parse(fs.readFileSync(path.join(app,'manifest.webmanifest'),'utf8'));
const sw=fs.readFileSync(path.join(app,'sw.js'),'utf8');
const pwa=fs.readFileSync(path.join(app,'pwa-stable.js'),'utf8');
const health=fs.readFileSync(path.join(app,'stable-health.js'),'utf8');
const partner=fs.readFileSync(path.join(app,'index.html'),'utf8');
const admin=fs.readFileSync(path.join(app,'admin.html'),'utf8');
assert.equal(manifest.name,'Panora');assert.equal(manifest.display,'standalone');assert.match(manifest.start_url,/build=3355/);assert.ok(manifest.icons.some(x=>x.src==='icon.svg'));
assert.match(sw,/panora-v3355/);assert.match(sw,/skipWaiting/);assert.match(sw,/clients\.claim/);assert.match(sw,/PANORA_SKIP_WAITING/);
assert.match(pwa,/beforeinstallprompt/);assert.match(pwa,/updatefound/);assert.match(pwa,/controllerchange/);assert.match(health,/panoraStableHealth/);
for(const h of [partner,admin]){assert.match(h,/manifest\.webmanifest\?v=3340/);assert.match(h,/pwa-stable\.css\?v=3340/);assert.match(h,/pwa-stable\.js\?v=3355/);assert.match(h,/stable-health\.js\?v=3340/)}
assert.doesNotMatch(partner,/panora-client-bootstrap-v3262/);
console.log('v334-stable-pwa: 21 assertions passed');
