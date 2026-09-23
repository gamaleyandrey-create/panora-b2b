const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const build=JSON.parse(fs.readFileSync('build.json','utf8'));
assert.deepEqual(build,{version:'11.11',build:11110,cache:11110});
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
for(const token of ['Panora 10.75 — compact collapsible Bakery navigation groups','admin-nav-submenu-long','grid-column:1/-1','max-height:48dvh'])assert.ok(adminCss.includes(token),token);const adminTheme=fs.readFileSync('admin-partner-theme.css','utf8');for(const token of ['Panora 10.77 — larger persistent collapsible Bakery navigation sections','admin-nav-major-toggle.has-active','Panora 10.82 — compact persistent Bakery navigation groups','Panora 10.82 — larger vertical Bakery navigation on desktop and mobile.','grid-template-columns:260px minmax(0,1fr)!important','grid-template-columns:1fr!important','min-height:56px!important','font-size:16px!important'])assert.ok(adminTheme.includes(token),token);const planCss=fs.readFileSync('easy-plan.css','utf8'),calendarCss=fs.readFileSync('calendar-plan.css','utf8');for(const token of ['Panora 10.82 — stable mobile bake-day editor.','min-inline-size:0!important','overflow-x:hidden!important'])assert.ok(planCss.includes(token),token);for(const token of ['Panora 11.03 — one calendar data model, responsive presentation only.','grid-template-columns:repeat(2,minmax(0,1fr))','@media(max-width:520px)'])assert.ok(calendarCss.includes(token),token);const calendarJs=fs.readFileSync('calendar-plan.js','utf8'),calendarCalm=fs.readFileSync('calendar-calm.css','utf8');for(const token of ['class="calendar-scroll" id="calendarScroll"','function calendarEntryMetrics(plan)','if(Array.isArray(plans))return plans;','Партнёры ${m.partner}','Розница ${m.retail}'])assert.ok(calendarJs.includes(token),token);for(const token of ['Panora 11.03 — calm styling shared by desktop and mobile calendar.','body.admin-page #view-plan .calendar-day>span.calendar-bread{display:block!important','overflow-wrap:break-word!important'])assert.ok(calendarCalm.includes(token),token);
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

const productAdmin1111=fs.readFileSync('product-admin.js','utf8'),productAdminCss1111=fs.readFileSync('product-admin.css','utf8');
for(const html of [admin,bakery])for(const token of ['data-view="price-labels"','id="view-price-labels"','id="priceLabelBuilder"','product-admin.css?v=11110','product-admin.js?v=11110','горизонтальные и вертикальные этикетки'])assert.ok(html.includes(token),`11.11 label UI: ${token}`);
for(const token of ['Panora 11.11 — visual label layout editor + thermal and standard printer output.','const BUILD=11110','const PANORA_SITE=\'https://panora.es/\'','function eanCheck','function normalizeEan','function eanSvg','shape-rendering="crispEdges"','function thermalInk','color:{dark:codeInk(),light:\'#ffffff\'}','58x160','data-value="vertical"','Вертикальная','Preenvasado','Envasado para venta inmediata','ES · основной','Белый + чёрный','Белый + основной цвет','function validationIssues','allergensVerified','quidEs','function highlightedComposition','pl-allergen-inline','Información nutricional por 100 g','Pide en','PANORA.ES','function verticalSiteUrl','function renderedFitIssues','function measureLabelFit','Печать остановлена','function printLabels','function recordHistory','Редактировать макет','Свой размер','Обычный принтер','function captureLayoutFromPreview','function wireLayoutEditorPreview','function blockAttrs','function layoutSafetyIssues','plBlockRotate'])assert.ok(productAdmin1111.includes(token),`11.11 label logic: ${token}`);
for(const token of ['Panora 11.11 — price tags, horizontal labels, vertical package label and visual layout editor','Panora 11.11 — thermal/standard printer preview, Spain-first label completeness','.pl-layout','.pl-label','.pl-template-full','.product-label-nutrition-grid','.pl-template-vertical','.pl-size-58x160','.pl-vertical-order','.pl-allergen-inline','.pl-internal-code','.pl-size-58x40 .pl-price small{font-size:2mm','.pl-custom-layout','.pl-resize-handle','.pl-printer-standard-color','.pl-grid-4'])assert.ok(productAdminCss1111.includes(token),`11.11 label CSS: ${token}`);
const release1111=fs.readFileSync('RELEASE_PANORA_11_11.txt','utf8');
for(const token of ['Panora 11.11 FULL','GTIN/EAN-13','internal Panora cash-register code','58×160','Spanish remains the default','white + black','No BIO marking','No SQL migration required.'])assert.ok(release1111.includes(token),token);
assert.ok(!productAdmin1111.includes('BIO'), 'Product label code must not print BIO marking');

{
 const start=productAdmin1111.indexOf('function eanCheck'),end=productAdmin1111.indexOf('function latestLot',start);assert.ok(start>=0&&end>start,'EAN source slice');
 const context={String,Number};vm.runInNewContext(productAdmin1111.slice(start,end)+`;this.eanApi={eanCheck,normalizeEan,eanSvg};`,context);
 assert.equal(context.eanApi.normalizeEan('400638133393'),'4006381333931','12-digit GTIN must receive a valid EAN-13 check digit');
 assert.equal(context.eanApi.normalizeEan('4006381333931'),'4006381333931','valid EAN-13 must be preserved');
 assert.equal(context.eanApi.normalizeEan('4006381333932'),'','invalid EAN-13 checksum must be rejected');
 assert.ok(context.eanApi.eanSvg('4006381333931','#0057B8').includes('aria-label="EAN 4006381333931"'));
 assert.ok(context.eanApi.eanSvg('4006381333931','#0057B8').includes('x="11"'),'EAN left quiet zone must start at module 11');
 assert.ok(context.eanApi.eanSvg('4006381333931','#0057B8').includes('fill="#0057B8"'),'EAN must use selected thermal ink');
}
{
 const start=productAdmin1111.indexOf('function defaultInternalCode'),end=productAdmin1111.indexOf('function internalProductCode',start);assert.ok(start>=0&&end>start,'internal-code source slice');
 const context={String,Math};vm.runInNewContext(productAdmin1111.slice(start,end)+`;this.code=defaultInternalCode;`,context);
 const a=context.code('plain'),b=context.code('plain'),c=context.code('pumpkin');assert.match(a,/^P\d{6}$/);assert.equal(a,b,'internal code must be stable for the same product ID');assert.notEqual(a,c,'different built-in products should receive different internal codes');
}
{
 const start=productAdmin1111.indexOf('function verticalSiteUrl'),end=productAdmin1111.indexOf('function thermalInk',start);assert.ok(start>=0&&end>start,'vertical URL source slice');
 const context={PANORA_SITE:'https://panora.es/'};vm.runInNewContext(productAdmin1111.slice(start,end)+`;this.site=verticalSiteUrl();`,context);assert.equal(context.site,'https://panora.es/');
}
{
 const start=productAdmin1111.indexOf('function nutritionComplete'),end=productAdmin1111.indexOf('function needsQuid',start);assert.ok(start>=0&&end>start,'nutrition completeness source slice');
 const context={num:v=>Number(String(v??'').replace(',','.'))||0,String,Number};vm.runInNewContext(productAdmin1111.slice(start,end)+`;this.ok=nutritionComplete;`,context);
 assert.equal(context.ok({kj:1000,kcal:240,fat:2,saturates:0.3,carbs:45,sugars:2,protein:8,salt:1.1}),true);
 assert.equal(context.ok({kj:1000,kcal:240,fat:2,saturates:0.3,carbs:45,sugars:2,protein:8,salt:''}),false);
}
{
 const start=productAdmin1111.indexOf('function renderedFitIssues'),end=productAdmin1111.indexOf('async function measureLabelFit',start);assert.ok(start>=0&&end>start,'label fit source slice');
 const toggles=[];const context={builder:{size:'58x160'},builderDimensions:()=>({w:58,h:160})};vm.runInNewContext(productAdmin1111.slice(start,end)+`;this.fit=renderedFitIssues;`,context);
 const ok={scrollWidth:58,clientWidth:58,scrollHeight:160,clientHeight:160,classList:{toggle:(k,v)=>toggles.push([k,v])}};
 const bad={scrollWidth:58,clientWidth:58,scrollHeight:162,clientHeight:160,classList:{toggle:(k,v)=>toggles.push([k,v])}};
 const issues=context.fit({querySelectorAll:()=>[ok,bad]});assert.equal(issues.length,1);assert.ok(issues[0].includes('58×160'));assert.ok(toggles.some(([k,v])=>k==='pl-fit-fail'&&v===true));
}

{
 const start=productAdmin1111.indexOf('function validationIssues'),end=productAdmin1111.indexOf('function warnings',start);assert.ok(start>=0&&end>start,'validation source slice');
 const source=productAdmin1111.slice(start,end)+`;this.check=validationIssues;`;
 const common={
  productList:()=>[{id:'bread',basePrice:5,names:{es:'Pan artesano'}}],
  bakeryProfile:()=>({legalName:'Panora SL',address:'Calle Prueba 1',country:'España'}),
  labelMeta:()=>({legalNames:{es:'Pan artesano'},netWeightG:500,allergensVerified:true,nutrition:{}}),
  technicalCard:()=>({storageEs:'Lugar fresco y seco',shelfLifeDays:3}),
  productLabel:()=> 'Pan artesano', num:v=>Number(v)||0, productAllergens:()=>['gluten'],
  composition:()=> 'harina de trigo, agua, sal', addDays:()=> '2026-09-26', latestLot:()=>'',
  needsQuid:()=>false, nutritionComplete:()=>false, normalizeEan:()=>'', qrTarget:()=>'', labelProfile:()=>({}), layoutSafetyIssues:()=>[], sizeRank:s=>({'70x50':2,'100x50':3,'100x70':4}[s]||0),
  Set,String,Number
 };
 const pre={...common,builder:{template:'package',packageMode:'prepacked',language:'es',size:'100x70',showBarcode:false,showQr:false,bakeDate:'2026-09-23',products:{bread:{selected:true,lot:'',bestBefore:'2026-09-26'}}}};
 vm.runInNewContext(source,pre);const preIssues=pre.check();assert.ok(preIssues.errors.some(x=>x.includes('Lote')));assert.ok(preIssues.errors.some(x=>x.includes('пищевую ценность')));
 const immediate={...common,builder:{template:'package',packageMode:'immediate',language:'es',size:'100x70',showBarcode:false,showQr:false,bakeDate:'2026-09-23',products:{bread:{selected:true,lot:'',bestBefore:'2026-09-26'}}}};
 vm.runInNewContext(source,immediate);const immediateIssues=immediate.check();assert.equal(immediateIssues.errors.length,0,'immediate-sale mode must not require lot/nutrition when other required data is complete');
}
assert.ok(productAdmin1111.includes('${esc(c.internal)}: <b>${esc(internal)}</b>'),'package/full/vertical meta must print internal code');
assert.ok(productAdmin1111.includes('pl-internal-code'),'shelf price tag must print internal cash-register code');
for(const token of ['Ценник','Упаковка','Полная','Вертикальная'])assert.ok(productAdmin1111.includes(token),`template retained: ${token}`);
for(const token of ['58 × 40 мм · ценник','70 × 50 мм · компактно','100 × 50 мм','100 × 70 мм · рекомендовано','58 × 160 мм · вертикальная'])assert.ok(productAdmin1111.includes(token),`size retained/added: ${token}`);
assert.ok(productAdmin1111.includes("language:migrated?'es'"),'Spanish must be the migrated/default label language');
assert.ok(productAdmin1111.includes("if(v.errors.length){alert(`Печать остановлена"),'required label data must block print');

console.log('Panora 11.11 label layout editor + thermal/standard printer + compliance guards: OK');
