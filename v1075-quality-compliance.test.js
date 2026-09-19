const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const build=JSON.parse(fs.readFileSync('build.json','utf8'));
assert.deepEqual(build,{version:'11.02',build:11020,cache:11020});
const ps=fs.readFileSync('production-safety.js','utf8');
for(const token of ['qualityCases:[]','labAnalyses:[]','shelfLifeEvidence:[]','packagingRecords:[]','mutate:(fn)=>'])assert.ok(ps.includes(token),token);
const qc=fs.readFileSync('quality-compliance-v1075.js','utf8');
for(const token of ["const VERSION='11.01',BUILD=11010",'partner_quality_cases','renderQuality()','renderLabs()','renderShelf()','renderPackaging()','renderInspection()','createCapaFromCase','Печать / PDF'])assert.ok(qc.includes(token),token);
const admin=fs.readFileSync('admin.html','utf8'),bakery=fs.readFileSync('bakery/index.html','utf8');
for(const html of [admin,bakery])for(const token of ['data-view="ps-quality"','data-view="ps-labs"','data-view="ps-shelf-life"','data-view="ps-packaging"','data-view="ps-inspection"','quality-compliance-v1075.css?v=11020','quality-compliance-v1075.js?v=11020'])assert.ok(html.includes(token),token);

for(const html of [admin,bakery])for(const token of ['id="workNavToggle"','id="workNavItems"','id="financeNavToggle"','id="financeNavItems"','id="partnersNavToggle"','id="partnersNavItems"','id="productsNavToggle"','id="productsNavItems"','id="productionSafetyNavToggle"','id="productionSafetyNavItems"','id="retailNavToggle"','id="retailNavItems"','id="settingsNavToggle"','id="settingsNavItems"','admin-nav-major-toggle','admin-nav-submenu-long','admin-nav-submenu-retail'])assert.ok(html.includes(token),token);
for(const html of [admin,bakery]){assert.match(html,/id="partnersNavToggle"[\s\S]*?>[\s\S]*?Партнёры[\s\S]*?<\/button>[\s\S]*?id="partnersNavItems"[\s\S]*?Напоминания клиентам[\s\S]*?Партнёры и цены[\s\S]*?<\/div>/);assert.match(html,/id="productsNavToggle"[\s\S]*?>[\s\S]*?Продукция[\s\S]*?<\/button>[\s\S]*?id="productsNavItems"[\s\S]*?Карточки продукции[\s\S]*?Рецептуры[\s\S]*?<\/div>/);assert.ok(!html.includes('>Партнёры и продукция<'));}
for(const html of [admin,bakery]){const navOrder=['workNavToggle','productsNavToggle','productionSafetyNavToggle','partnersNavToggle','retailNavToggle','financeNavToggle','settingsNavToggle'].map(id=>html.indexOf(`id="${id}"`));assert.ok(navOrder.every(i=>i>=0),'all major Bakery groups must exist');assert.deepEqual([...navOrder].sort((a,b)=>a-b),navOrder,'Bakery groups must follow Work → Products → Production & safety → Partners → Retail → Finance → Settings');}
const adminJs=fs.readFileSync('admin.js','utf8'),adminCss=fs.readFileSync('admin.css','utf8');
for(const token of ['ADMIN_NAV_GROUP_STATE_KEY','panora-admin-nav-groups-v1075','ADMIN_NAV_GROUPS','workNavToggle','financeNavToggle','partnersNavToggle','productsNavToggle','productionSafetyNavToggle','retailNavToggle','settingsNavToggle','hasStored?!!state[key]:hasLegacy?!!state[legacyKey]:(hasActive||!!defaultOpen)','bindAdminNavGroups()','syncAdminNavGroupActive'])assert.ok(adminJs.includes(token),token);
for(const token of ['Panora 10.75 — compact collapsible Bakery navigation groups','admin-nav-submenu-long','grid-column:1/-1','max-height:48dvh'])assert.ok(adminCss.includes(token),token);const adminTheme=fs.readFileSync('admin-partner-theme.css','utf8');for(const token of ['Panora 10.77 — larger persistent collapsible Bakery navigation sections','admin-nav-major-toggle.has-active','Panora 10.82 — compact persistent Bakery navigation groups','Panora 10.82 — larger vertical Bakery navigation on desktop and mobile.','grid-template-columns:260px minmax(0,1fr)!important','grid-template-columns:1fr!important','min-height:56px!important','font-size:16px!important'])assert.ok(adminTheme.includes(token),token);const planCss=fs.readFileSync('easy-plan.css','utf8'),calendarCss=fs.readFileSync('calendar-plan.css','utf8');for(const token of ['Panora 10.82 — stable mobile bake-day editor.','min-inline-size:0!important','overflow-x:hidden!important'])assert.ok(planCss.includes(token),token);for(const token of ['Panora 10.82 — one calendar model on desktop and mobile.','grid-template-columns:repeat(7,minmax(96px,1fr))!important','min-width:720px!important','.calendar-weekdays{display:grid!important'])assert.ok(calendarCss.includes(token),token);const calendarJs=fs.readFileSync('calendar-plan.js','utf8'),calendarCalm=fs.readFileSync('calendar-calm.css','utf8');for(const token of ['class=\"calendar-scroll\" id=\"calendarScroll\"','function alignMobileCalendar(today,shownPrefix)','alignMobileCalendar(today,shownPrefix);'])assert.ok(calendarJs.includes(token),token);for(const token of ['Panora 10.82 — mobile/desktop bake-calendar parity.','grid-template-columns:repeat(7,minmax(132px,1fr))!important','body.admin-page #view-plan .calendar-day.has-bake>span{','white-space:nowrap!important;','body.admin-page #view-plan .calendar-day.has-bake::after{','content:none!important;'])assert.ok(calendarCalm.includes(token),token);
{
 const start=adminJs.indexOf("const ADMIN_NAV_GROUP_STATE_KEY"),end=adminJs.indexOf('function openRetailView',start);assert.ok(start>=0&&end>start,'nav group source slice');
 const listeners=new Map(),attrs=new Map(),storage=new Map();
 const classSet=new Set();
 const child={addEventListener:(name,fn)=>listeners.set('child:'+name,fn)};
 const toggle={setAttribute:(k,v)=>attrs.set(k,String(v)),getAttribute:k=>attrs.get(k)||null,classList:{toggle:(k,on)=>on?classSet.add(k):classSet.delete(k)},set onclick(fn){listeners.set('toggle:click',fn)},get onclick(){return listeners.get('toggle:click')}};
 const menu={hidden:true,querySelector:()=>null,querySelectorAll:()=>[child]};
 const context={$:sel=>sel==='#productionSafetyNavToggle'?toggle:sel==='#productionSafetyNavItems'?menu:null,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))},Object,JSON};
 vm.runInNewContext(adminJs.slice(start,end)+`;this.navApi={bindAdminNavGroup,setAdminNavGroup,readAdminNavGroupState};`,context);
 context.navApi.bindAdminNavGroup('#productionSafetyNavToggle','#productionSafetyNavItems','productionSafety');
 assert.equal(attrs.get('aria-expanded'),'false');assert.equal(menu.hidden,true);
 listeners.get('toggle:click')();assert.equal(attrs.get('aria-expanded'),'true');assert.equal(menu.hidden,false);
 assert.equal(JSON.parse(storage.get('panora-admin-nav-groups-v1075')).productionSafety,true);
 listeners.get('toggle:click')();assert.equal(menu.hidden,true);
 listeners.get('child:click')();assert.equal(menu.hidden,false);assert.equal(attrs.get('aria-expanded'),'true');
}
{
 const start=adminJs.indexOf("const ADMIN_NAV_GROUP_STATE_KEY"),end=adminJs.indexOf('function openRetailView',start),storage=new Map([['panora-admin-nav-groups-v1075',JSON.stringify({finance:false})]]),attrs=new Map(),listeners=new Map(),child={addEventListener:(name,fn)=>listeners.set(name,fn)},toggle={setAttribute:(k,v)=>attrs.set(k,String(v)),getAttribute:k=>attrs.get(k)||null,classList:{toggle:()=>{}},set onclick(fn){listeners.set('toggle',fn)}},menu={hidden:false,querySelector:()=>child,querySelectorAll:()=>[child]},context={$:sel=>sel==='#financeNavToggle'?toggle:sel==='#financeNavItems'?menu:null,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))},Object,JSON};
 vm.runInNewContext(adminJs.slice(start,end)+`;this.navApi={bindAdminNavGroup};`,context);context.navApi.bindAdminNavGroup('#financeNavToggle','#financeNavItems','finance',{defaultOpen:true});assert.equal(attrs.get('aria-expanded'),'false');assert.equal(menu.hidden,true,'stored collapsed state must survive reload even with active child');
}
{
 const start=adminJs.indexOf("const ADMIN_NAV_GROUP_STATE_KEY"),end=adminJs.indexOf('function openRetailView',start),storage=new Map([['panora-admin-nav-groups-v1075',JSON.stringify({partners:false})]]),attrs=new Map(),listeners=new Map(),child={addEventListener:(name,fn)=>listeners.set(name,fn)},toggle={setAttribute:(k,v)=>attrs.set(k,String(v)),getAttribute:k=>attrs.get(k)||null,classList:{toggle:()=>{}},set onclick(fn){listeners.set('toggle',fn)}},menu={hidden:false,querySelector:()=>null,querySelectorAll:()=>[child]},context={$:sel=>sel==='#productsNavToggle'?toggle:sel==='#productsNavItems'?menu:null,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))},Object,JSON};
 vm.runInNewContext(adminJs.slice(start,end)+`;this.navApi={bindAdminNavGroup};`,context);context.navApi.bindAdminNavGroup('#productsNavToggle','#productsNavItems','products',{defaultOpen:true,legacyKey:'partners'});assert.equal(attrs.get('aria-expanded'),'false','new Products group should inherit the old combined-group state once');listeners.get('toggle')();const state=JSON.parse(storage.get('panora-admin-nav-groups-v1075'));assert.equal(state.partners,false);assert.equal(state.products,true,'Products must persist independently after first user toggle');
}
const rootSw=fs.readFileSync('sw.js','utf8'),bakerySw=fs.readFileSync('bakery/sw.js','utf8');
assert.ok(rootSw.includes('quality-compliance-v1075.js'));assert.ok(rootSw.includes('quality-compliance-v1075.css'));assert.ok(bakerySw.includes('../quality-compliance-v1075.js'));assert.ok(bakerySw.includes('../quality-compliance-v1075.css'));
for(const token of ['recordVersions:[]','version=5','recordVersions:mergeArray'])assert.ok(ps.includes(token),token);
for(const token of ['renderControl()','renderArchive()','captureVersions','exportZip','zipStore','ps-control','ps-archive','printElement','deviations()'])assert.ok(qc.includes(token),token);
for(const html of [admin,bakery])for(const token of ['data-view="ps-control"','data-view="ps-archive"','id="psControlRoot"','id="psArchiveRoot"'])assert.ok(html.includes(token),token);
const css=fs.readFileSync('quality-compliance-v1075.css','utf8');for(const token of ['ps1074-summary','ps1074-printing','rw-product-doc-print','data-label'])assert.ok(css.includes(token),token);
const partnerWs=fs.readFileSync('restaurant-workspace.js','utf8'),partnerCss=fs.readFileSync('restaurant-workspace.css','utf8');for(const token of ['data-rw-print-product-docs','rw-product-docs-printing','Internal recipes, suppliers and costs are not shown.'])assert.ok((partnerWs+'\n'+partnerCss).includes(token),token);const docsSlice=partnerWs.slice(partnerWs.indexOf('function productDocumentsHtml()'),partnerWs.indexOf('function qualityCases()'));for(const forbidden of ['rawLots','rawUsages','approvedSuppliers','purchaseCosts','recipeMap'])assert.ok(!docsSlice.includes(forbidden),`partner docs leak token: ${forbidden}`);

const cloudSync1075=fs.readFileSync('cloud-sync.js','utf8');
const crypto=require('node:crypto');
const blob=Buffer.from(cloudSync1075,'utf8');
const gitSha=crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+blob.length+'\0'),blob])).digest('hex');
assert.equal(gitSha,'4e83f12b328292a5d3e77b9934925ef426d3eab0','Bakery cloud-sync must be byte-identical to Panora 10.75');
for(const token of [
  "if(watermark&&!(fetched||[]).length){status('Облако ✓');return}",
  'ready=true;await repairMissingDeliveryNotes();',
  'await syncB2BShipmentStockDurability();',
  'window.panoraAdminOrderArchiveHydrated=true;',
  "const steps=[['товары',loadProducts],['заказы',loadOrders],['накладные',loadDeliveryNotes]"
])assert.ok(cloudSync1075.includes(token),token);
const start=cloudSync1075.indexOf('async function start(authSession)');
const end=cloudSync1075.indexOf('async function refreshAdminAllOnDemand',start);
const startup=cloudSync1075.slice(start,end);
assert.ok(start>=0&&end>start,'10.75 startup slice');
assert.ok(!startup.includes('settleAdminActiveView('),'10.75 startup must stay sequential and simple');
for(const html of [admin,bakery]){
 const cloud=html.indexOf('cloud-sync.js?v=11020');
 const status=html.indexOf('connection-status.js?v=11020');
 assert.ok(cloud>=0&&status>=0&&cloud<status,'Bakery must load 10.75 cloud-sync before connection-status');
}
console.log('Panora 11.02 quality/compliance + Bakery 10.75 rollback guards: OK');
