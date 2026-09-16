const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const build=JSON.parse(fs.readFileSync('build.json','utf8'));
assert.deepEqual(build,{version:'10.79',build:10790,cache:10790});
const ps=fs.readFileSync('production-safety.js','utf8');
for(const token of ['qualityCases:[]','labAnalyses:[]','shelfLifeEvidence:[]','packagingRecords:[]','mutate:(fn)=>'])assert.ok(ps.includes(token),token);
const qc=fs.readFileSync('quality-compliance-v1075.js','utf8');
for(const token of ["const VERSION='10.79',BUILD=10790",'partner_quality_cases','renderQuality()','renderLabs()','renderShelf()','renderPackaging()','renderInspection()','createCapaFromCase','Печать / PDF'])assert.ok(qc.includes(token),token);
const admin=fs.readFileSync('admin.html','utf8'),bakery=fs.readFileSync('bakery/index.html','utf8');
for(const html of [admin,bakery])for(const token of ['data-view="ps-quality"','data-view="ps-labs"','data-view="ps-shelf-life"','data-view="ps-packaging"','data-view="ps-inspection"','quality-compliance-v1075.css?v=10790','quality-compliance-v1075.js?v=10790'])assert.ok(html.includes(token),token);

for(const html of [admin,bakery])for(const token of ['id="workNavToggle"','id="workNavItems"','id="financeNavToggle"','id="financeNavItems"','id="partnersNavToggle"','id="partnersNavItems"','id="productionSafetyNavToggle"','id="productionSafetyNavItems"','id="retailNavToggle"','id="retailNavItems"','id="settingsNavToggle"','id="settingsNavItems"','admin-nav-major-toggle','admin-nav-submenu-long','admin-nav-submenu-retail'])assert.ok(html.includes(token),token);
const adminJs=fs.readFileSync('admin.js','utf8'),adminCss=fs.readFileSync('admin.css','utf8');
for(const token of ['ADMIN_NAV_GROUP_STATE_KEY','panora-admin-nav-groups-v1075','ADMIN_NAV_GROUPS','workNavToggle','financeNavToggle','partnersNavToggle','productionSafetyNavToggle','retailNavToggle','settingsNavToggle','hasStored?!!state[key]:(hasActive||!!defaultOpen)','bindAdminNavGroups()','syncAdminNavGroupActive'])assert.ok(adminJs.includes(token),token);
for(const token of ['Panora 10.75 — compact collapsible Bakery navigation groups','admin-nav-submenu-long','grid-column:1/-1','max-height:48dvh'])assert.ok(adminCss.includes(token),token);const adminTheme=fs.readFileSync('admin-partner-theme.css','utf8');for(const token of ['Panora 10.77 — larger persistent collapsible Bakery navigation sections','admin-nav-major-toggle.has-active','Panora 10.79 — compact persistent Bakery navigation groups','min-height:42px!important','font-size:12.8px!important','min-height:44px!important','font-size:13px!important'])assert.ok(adminTheme.includes(token),token);
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
const rootSw=fs.readFileSync('sw.js','utf8'),bakerySw=fs.readFileSync('bakery/sw.js','utf8');
assert.ok(rootSw.includes('quality-compliance-v1075.js'));assert.ok(rootSw.includes('quality-compliance-v1075.css'));assert.ok(bakerySw.includes('../quality-compliance-v1075.js'));assert.ok(bakerySw.includes('../quality-compliance-v1075.css'));
for(const token of ['recordVersions:[]','version=5','recordVersions:mergeArray'])assert.ok(ps.includes(token),token);
for(const token of ['renderControl()','renderArchive()','captureVersions','exportZip','zipStore','ps-control','ps-archive','printElement','deviations()'])assert.ok(qc.includes(token),token);
for(const html of [admin,bakery])for(const token of ['data-view="ps-control"','data-view="ps-archive"','id="psControlRoot"','id="psArchiveRoot"'])assert.ok(html.includes(token),token);
const css=fs.readFileSync('quality-compliance-v1075.css','utf8');for(const token of ['ps1074-summary','ps1074-printing','rw-product-doc-print','data-label'])assert.ok(css.includes(token),token);
const partnerWs=fs.readFileSync('restaurant-workspace.js','utf8'),partnerCss=fs.readFileSync('restaurant-workspace.css','utf8');for(const token of ['data-rw-print-product-docs','rw-product-docs-printing','Internal recipes, suppliers and costs are not shown.'])assert.ok((partnerWs+'\n'+partnerCss).includes(token),token);const docsSlice=partnerWs.slice(partnerWs.indexOf('function productDocumentsHtml()'),partnerWs.indexOf('function qualityCases()'));for(const forbidden of ['rawLots','rawUsages','approvedSuppliers','purchaseCosts','recipeMap'])assert.ok(!docsSlice.includes(forbidden),`partner docs leak token: ${forbidden}`);
console.log('Panora 10.79 quality/compliance + navigation tests: OK');
