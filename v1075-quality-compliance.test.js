const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const build=JSON.parse(fs.readFileSync('build.json','utf8'));
assert.deepEqual(build,{version:'10.95',build:10950,cache:10950});
const ps=fs.readFileSync('production-safety.js','utf8');
for(const token of ['qualityCases:[]','labAnalyses:[]','shelfLifeEvidence:[]','packagingRecords:[]','mutate:(fn)=>'])assert.ok(ps.includes(token),token);
const qc=fs.readFileSync('quality-compliance-v1075.js','utf8');
for(const token of ["const VERSION='10.95',BUILD=10950",'partner_quality_cases','renderQuality()','renderLabs()','renderShelf()','renderPackaging()','renderInspection()','createCapaFromCase','Печать / PDF'])assert.ok(qc.includes(token),token);
const admin=fs.readFileSync('admin.html','utf8'),bakery=fs.readFileSync('bakery/index.html','utf8');
for(const html of [admin,bakery])for(const token of ['data-view="ps-quality"','data-view="ps-labs"','data-view="ps-shelf-life"','data-view="ps-packaging"','data-view="ps-inspection"','quality-compliance-v1075.css?v=10950','quality-compliance-v1075.js?v=10950'])assert.ok(html.includes(token),token);

for(const html of [admin,bakery])for(const token of ['id="workNavToggle"','id="workNavItems"','id="financeNavToggle"','id="financeNavItems"','id="partnersNavToggle"','id="partnersNavItems"','id="productionSafetyNavToggle"','id="productionSafetyNavItems"','id="retailNavToggle"','id="retailNavItems"','id="settingsNavToggle"','id="settingsNavItems"','admin-nav-major-toggle','admin-nav-submenu-long','admin-nav-submenu-retail'])assert.ok(html.includes(token),token);
const adminJs=fs.readFileSync('admin.js','utf8'),adminCss=fs.readFileSync('admin.css','utf8');
for(const token of ['ADMIN_NAV_GROUP_STATE_KEY','panora-admin-nav-groups-v1075','ADMIN_NAV_GROUPS','workNavToggle','financeNavToggle','partnersNavToggle','productionSafetyNavToggle','retailNavToggle','settingsNavToggle','hasStored?!!state[key]:(hasActive||!!defaultOpen)','bindAdminNavGroups()','syncAdminNavGroupActive'])assert.ok(adminJs.includes(token),token);
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
const rootSw=fs.readFileSync('sw.js','utf8'),bakerySw=fs.readFileSync('bakery/sw.js','utf8');
assert.ok(rootSw.includes('quality-compliance-v1075.js'));assert.ok(rootSw.includes('quality-compliance-v1075.css'));assert.ok(bakerySw.includes('../quality-compliance-v1075.js'));assert.ok(bakerySw.includes('../quality-compliance-v1075.css'));
for(const token of ['recordVersions:[]','version=5','recordVersions:mergeArray'])assert.ok(ps.includes(token),token);
for(const token of ['renderControl()','renderArchive()','captureVersions','exportZip','zipStore','ps-control','ps-archive','printElement','deviations()'])assert.ok(qc.includes(token),token);
for(const html of [admin,bakery])for(const token of ['data-view="ps-control"','data-view="ps-archive"','id="psControlRoot"','id="psArchiveRoot"'])assert.ok(html.includes(token),token);
const css=fs.readFileSync('quality-compliance-v1075.css','utf8');for(const token of ['ps1074-summary','ps1074-printing','rw-product-doc-print','data-label'])assert.ok(css.includes(token),token);
const partnerWs=fs.readFileSync('restaurant-workspace.js','utf8'),partnerCss=fs.readFileSync('restaurant-workspace.css','utf8');for(const token of ['data-rw-print-product-docs','rw-product-docs-printing','Internal recipes, suppliers and costs are not shown.'])assert.ok((partnerWs+'\n'+partnerCss).includes(token),token);const docsSlice=partnerWs.slice(partnerWs.indexOf('function productDocumentsHtml()'),partnerWs.indexOf('function qualityCases()'));for(const forbidden of ['rawLots','rawUsages','approvedSuppliers','purchaseCosts','recipeMap'])assert.ok(!docsSlice.includes(forbidden),`partner docs leak token: ${forbidden}`);

const cloudSync1083=fs.readFileSync('cloud-sync.js','utf8'),connection1083=fs.readFileSync('connection-status.js','utf8');
for(const token of ['panora-production-plans-last-good-v1083','sync.plan_empty_local_recovered',"el.dataset.syncState='conflict'",'sync.plan_items_recovered',"bake_items?select=bake_day_id,product_id,planned_quantity",'if(pending.plans)await loadPlans();'])assert.ok(cloudSync1083.includes(token),token);
for(const token of ["function calendarPlanRows()","panora-production-plans-last-good-v1083","['panora:plans-updated','panora:plan-saved','panora:plans-conflict','panora:admin-startup-recovered']"])assert.ok(calendarJs.includes(token),token);
for(const token of ['Panora 10.88 — stable mobile calendar viewport.','grid-template-columns:repeat(2,minmax(0,1fr))!important','grid-column:1/-1!important','overflow-x:hidden!important'])assert.ok(calendarCalm.includes(token),token);
for(const token of ['mobile calendar now fits the viewport','scroller.scrollLeft=0'])assert.ok(calendarJs.includes(token),token);
for(const token of ["conflict:'Нужно выбрать версию'","state==='conflict'"])assert.ok(connection1083.includes(token),token);

for(const token of ['panora-cloud-plan-authority-reset-v1087','panora-production-plans-recovery-draft-v1087','panora-production-plans-cloud-v1087','The next successful cloud read then becomes authoritative on every device.'])assert.ok(cloudSync1083.includes(token),token);
{
 const start=cloudSync1083.indexOf("const planAuthorityResetKey='panora-cloud-plan-authority-reset-v1087'"),end=cloudSync1083.indexOf('const restaurantSyncShape',start);assert.ok(start>=0&&end>start,'plan authority reset source slice');
 const storage=new Map([['panora-production-plans',JSON.stringify([{bakeDate:'2026-09-19',product:'mobile-draft'}])],['panora-production-plans-cloud-v1086','old-cloud'],['panora-production-plans-local-draft-v1086','old-draft']]);
 const localStorage={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
 const pending={plans:true,orders:true},conflicts={plans:{remoteAt:'x'},orders:{remoteAt:'y'}},accepted={plans:'x',orders:'y'},revisions={plans:'x',orders:'y'},baselines={plans:'local-base',orders:'order-base'},backups=[];
 const context={pending,conflicts,accepted,revisions,baselines,pendingKey:'pending',conflictKey:'conflict',acceptedKey:'accepted',revisionKey:'revision',baselineKey:'baseline',localStorage,JSON,Object,Boolean,Array,safeLocalSet:(k,v)=>{storage.set(k,String(v));return true},saveBackup:(sections,reason)=>{backups.push({sections,reason});return{};}};
 vm.runInNewContext(cloudSync1083.slice(start,end),context);
 assert.equal(storage.get('panora-cloud-plan-authority-reset-v1087'),'1');
 assert.deepEqual(JSON.parse(storage.get('panora-production-plans-recovery-draft-v1087')),[{bakeDate:'2026-09-19',product:'mobile-draft'}]);
 assert.equal(storage.has('panora-production-plans-cloud-v1087'),false,'fresh cloud mirror must be forced');
 assert.equal(storage.has('panora-production-plans-cloud-v1086'),false);assert.equal(storage.has('panora-production-plans-local-draft-v1086'),false);
 assert.equal('plans' in pending,false);assert.equal('plans' in conflicts,false);assert.equal('plans' in baselines,false);assert.equal(pending.orders,true);assert.equal(backups.length,1);
}
{
 const start=calendarJs.indexOf('function readCalendarPlanRows'),end=calendarJs.indexOf('function alignMobileCalendar',start);assert.ok(start>=0&&end>start,'calendar plan source slice');
 const local=[{bakeDate:'2026-09-19',product:'mobile'}],cloud=[{bakeDate:'2026-09-18',product:'desktop'}],storage=new Map([['panora-production-plans',JSON.stringify(local)],['panora-production-plans-cloud-v1087',JSON.stringify(cloud)],['panora-cloud-pending-v283',JSON.stringify({plans:true})]]);
 const context={localStorage:{getItem:k=>storage.has(k)?storage.get(k):null},plans:local,JSON,Array};vm.runInNewContext(calendarJs.slice(start,end)+`;this.readRows=calendarPlanRows;`,context);
 assert.deepEqual(JSON.parse(JSON.stringify(context.readRows())),cloud,'persisted pending plan must display confirmed cloud mirror');
 storage.delete('panora-cloud-pending-v283');assert.deepEqual(JSON.parse(JSON.stringify(context.readRows())),local,'clean local cache may display normally');
}


// Panora 10.95 — the global refresh lifecycle cannot announce completion while
// the visible Bakery screen is still hydrating. This covers desktop + mobile,
// including the reported Orders screen where the top line said «актуальны» while
// the table still said «Загружаем…».
for(const token of [
  'async function settleAdminActiveView(view=adminActiveView())',
  "status('Обновление: завершаем текущий раздел…');",
  'await settleAdminActiveView(view);',
  "await settleAdminActiveView(activeAdminView()||'orders');",
  "if(document.body?.classList.contains('admin-page')&&Number(window.__panoraAdminRefreshActive||0)>0){render('syncing','Обновление данных…');return}",
  "if(Number(window.__panoraAdminRefreshActive||0)>0){show('loading','Обновление данных…');return}"
])assert.ok((cloudSync1083+'\n'+connection1083).includes(token),token);

console.log('Panora 10.95 quality/compliance + vertical navigation + mobile calendar sync tests: OK');

// Panora 10.88 — regression for the reported two-device move: cancel 18 Sep,
// schedule 19 Sep, then refresh another device that still has 18 Sep cached.
for(const token of [
  "const planMoveRecoveryKey='panora-production-plan-move-recovery-v1088'",
  'isSafeExplicitPlanMove(local,remote)',
  'const remoteAfterCancel=await getRemotePlans();',
  'await applyCloudPlans(remoteAfterCancel);',
  'const remoteAfterSave=await getRemotePlans();',
  "if(confirmedSig!==expectedSig)throw new Error('Облако не подтвердило итоговый календарь выпечки.",
  "await refreshPlansManual(`auto-${reason}`)",
  "if(now-adminWakeRefreshAt<1800)",
  "resetAdminGlobalRefreshButton({forceIdle:true})",
  "scheduleAdminCommerceWakeRefresh('startup-ready',140)",
  'else localStorage.removeItem(planLastGoodKey)'
])assert.ok(cloudSync1083.includes(token),token);
const product1088=fs.readFileSync('product-admin.js','utf8');
assert.ok(product1088.includes("filtered=cancellationLog.filter(row=>String(row?.date||'')!==bakeDate)"),'re-scheduling a date must consume stale cancellation tombstone');
{
 const mk=(date,product='bread')=>({bakeDate:date,deliveryDate:date,product,planned:1,cutoff:`${date}T07:00:00.000Z`,open:true});
 const sig=list=>JSON.stringify((list||[]).map(x=>({bakeDate:x.bakeDate,deliveryDate:x.deliveryDate,product:x.product,planned:Number(x.planned||0),cutoff:x.cutoff,open:x.open!==false})).sort((a,b)=>`${a.bakeDate}|${a.product}`.localeCompare(`${b.bakeDate}|${b.product}`)));
 let cloud=[mk('2026-09-18')],a={local:[...cloud],baseline:sig(cloud)},b={local:[...cloud],baseline:sig(cloud)};
 cloud=[];a.local=[...cloud];a.baseline=sig(cloud);assert.equal(a.baseline,sig([]));
 a.local=[mk('2026-09-19')];assert.equal(sig(cloud)!==a.baseline,false);assert.equal(sig(a.local)!==a.baseline,true);cloud=[...a.local];
 b.local=[...cloud];b.baseline=sig(cloud);assert.deepEqual(b.local.map(x=>x.bakeDate),['2026-09-19']);
}

// Panora 10.95 — Refresh is a real top-layer control on iOS and desktop, remains
// physically clickable, and visibly reports both manual and automatic synchronization.
for(const token of [
  "const setAdminGlobalRefreshState=(state='idle')=>",
  "button.removeAttribute('disabled')",
  "setAdminGlobalRefreshState('loading');",
  "const planOk=await refreshPlansManual(reason);",
  "button.addEventListener('pointerup',event=>",
  "button.addEventListener('click',event=>",
  "window.addEventListener('pageshow',()=>{resetAdminGlobalRefreshButton({forceIdle:true})",
  "scheduleAdminCommerceWakeRefresh('visibility')"
])assert.ok(cloudSync1083.includes(token),token);
const retail1090=[fs.readFileSync('retail/index.html','utf8'),fs.readFileSync('retail.html','utf8')];
for(const html of retail1090)for(const token of [
  "const setRefreshState=mode=>",
  "refresh.removeAttribute('disabled')",
  "setRefreshState('loading')",
  "refresh.addEventListener('pointerup',event=>",
  "refresh.addEventListener('click',event=>",
  "window.addEventListener('pageshow',()=>autoRefresh('pageshow'))",
  "window.addEventListener('focus',()=>autoRefresh('focus'))",
  "setTimeout(()=>autoRefresh('startup'),0)"
])assert.ok(html.includes(token),token);


{
 const start=cloudSync1083.indexOf('const adminRefreshCopy='),end=cloudSync1083.indexOf('let adminManualRefreshPromise',start);assert.ok(start>=0&&end>start,'refresh button reset source slice');
 const label={textContent:'Обновление…'},button={disabled:true,dataset:{loading:'1',success:'1'},attrs:new Map([['aria-busy','true']]),style:{},querySelector:sel=>sel==='.admin-global-refresh-text'?label:null,removeAttribute(k){this.attrs.delete(k)},setAttribute(k,v){this.attrs.set(k,v)}};
 const language={value:'ru'};
 const context={window:{},document:{querySelector:sel=>sel==='#adminGlobalRefresh'?button:sel==='#adminLanguage'?language:null}};
 vm.runInNewContext(cloudSync1083.slice(start,end)+`;this.reset=resetAdminGlobalRefreshButton;`,context);
 context.reset({forceIdle:true});assert.equal(button.disabled,false);assert.equal(button.dataset.loading,undefined);assert.equal(button.dataset.success,undefined);assert.equal(label.textContent,'Обновить');assert.equal(button.attrs.has('aria-busy'),false);
}


// Panora 10.95 — manual Bakery Refresh remains tappable while its internal promise
// serializes work, and it actually performs calendar reconciliation + full retry.
{
 const start=cloudSync1083.indexOf('const adminRefreshCopy='),end=cloudSync1083.indexOf('async function refreshBreadStockData',start);assert.ok(start>=0&&end>start,'manual refresh source slice');
 const label={textContent:'Обновить'},button={disabled:false,dataset:{},attrs:new Map(),style:{},querySelector:sel=>sel==='.admin-global-refresh-text'?label:null,setAttribute(k,v){this.attrs.set(k,v)},removeAttribute(k){this.attrs.delete(k)}};
 const language={value:'ru'},active={id:'view-plan'};let planCalls=0,retryCalls=0,events=0,statuses=[],timers=[];
 const context={
  document:{querySelector:sel=>sel==='#adminGlobalRefresh'?button:sel==='#adminLanguage'?language:sel==='.view.active'?active:null},
  navigator:{onLine:true},ready:true,status:v=>statuses.push(v),
  refreshPlansManual:async()=>{planCalls++;return true},retrySync:async()=>{retryCalls++;return true},
  renderAll:()=>{},renderCommerce:()=>{},console,CustomEvent:function(type,opts){this.type=type;this.detail=opts?.detail},
  window:{dispatchEvent:()=>{events++}},adminWakeRefreshPromise:null,conflicts:{},setTimeout:fn=>{timers.push(fn);return timers.length}
 };
 vm.runInNewContext(cloudSync1083.slice(start,end)+`;this.runRefresh=refreshAdminAllOnDemand;`,context);
 const promise=context.runRefresh('test-manual');assert.equal(button.disabled,false,'manual refresh must never leave native disabled=true');
 promise.then(ok=>{assert.equal(ok,true);assert.equal(planCalls,2);assert.equal(retryCalls,1);assert.ok(events>=1);assert.equal(button.disabled,false);assert.equal(button.dataset.loading,undefined);assert.equal(label.textContent,'✓ Обновлено');timers.splice(0).forEach(fn=>fn());assert.equal(label.textContent,'Обновить')});
}

// Panora 10.95 — Retail uses the same visible loading reminder as Bakery.
for(const html of [fs.readFileSync('retail/index.html','utf8'),fs.readFileSync('retail.html','utf8')]){
  assert.ok(html.includes('connection-status.css?v=10950'),'retail must load visible refresh-line styles');
  assert.ok(html.includes('connection-status.js?v=10950'),'retail must load visible refresh-line controller');
  assert.ok(html.includes("panora:retail-global-refresh-started"),'retail refresh must emit start event');
  assert.ok(html.includes("panora:retail-global-refreshed"),'retail refresh must emit completion event');
}

// Panora 10.95 — reported Bakery startup regression: the top line must never say
// «Данные актуальны» while Orders/Delivery Notes are still on «Загружаем…».
for(const token of [
  "window.panoraAdminOrdersHydrated=true;",
  "if(typeof renderCommerce==='function')renderCommerce();",
  "throw new Error('Заказы и накладные ещё не завершили облачную загрузку')",
  "throw new Error('Экран заказов ещё не завершил отрисовку облачных данных')",
  "console.error('Panora startup finalization',error)",
  "window.addEventListener('panora:authenticated',event=>{",
  "console.error('Panora initial cloud start',error)"
])assert.ok(cloudSync1083.includes(token),token);
for(const token of [
  "Number(window.__panoraAdminRefreshActive||0)>0&&s==='synced'",
  "Number(window.__panoraAdminRefreshActive||0)>0&&state==='synced'"
])assert.ok(connection1083.includes(token),token);
