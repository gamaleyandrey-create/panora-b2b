const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=__dirname,source=fs.readFileSync(path.join(root,'production-safety.js'),'utf8');
class Storage{constructor(seed={}){this.m=new Map(Object.entries(seed).map(([k,v])=>[k,String(v)]))}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}key(i){return [...this.m.keys()][i]??null}get length(){return this.m.size}}
function context(seed={},stock=0){
 const storage=new Storage(seed),document={readyState:'loading',body:{classList:{contains:()=>true}},querySelector:()=>null,querySelectorAll:()=>[],addEventListener:()=>{}};
 const window={PANORA_SUPABASE:{},panoraSupabaseSession:null,stockRawBalance:()=>stock,panoraProductRegistry:()=>JSON.parse(storage.getItem('panora-products')||'[]'),addEventListener:()=>{},dispatchEvent:()=>{},panoraAudit:{record:()=>{}}};
 const ctx={window,document,localStorage:storage,navigator:{onLine:false,serviceWorker:null},crypto:{randomUUID:()=>crypto.randomUUID()},structuredClone,CustomEvent:function(type,init){this.type=type;this.detail=init?.detail},Intl,Date,Math,JSON,Number,String,Array,Object,Set,Map,Promise,console,setTimeout:()=>0,clearTimeout:()=>{},fetch:async()=>{throw new Error('offline')},Notification:{permission:'denied'},FormData:function(){},confirm:()=>true,prompt:()=>null,alert:()=>{}};
 window.window=window;window.document=document;window.localStorage=storage;window.navigator=ctx.navigator;window.crypto=ctx.crypto;window.CustomEvent=ctx.CustomEvent;window.Notification=ctx.Notification;
 vm.createContext(ctx);vm.runInContext(source,ctx,{filename:'production-safety.js'});return ctx;
}
const recipe=[{name:'Flour',qty:100,unit:'g',sourceIngredientName:'',sourceUnit:'g',sourceYieldPct:0}];
const seed={
 'panora-admin-lang':'en',
 'panora-products':JSON.stringify([{id:'bread1',active:true,weight:650,names:{ru:'Хлеб',en:'Bread',es:'Pan'}}]),
 'panora-recipes':JSON.stringify({bread1:recipe}),
 'panora-restaurants':JSON.stringify([{id:'r1',name:'Restaurant Uno'}]),
 'panora-delivery-notes':JSON.stringify([{id:'dn1',number:1,orderId:'o1',restaurantId:'r1',date:'2026-09-16',createdAt:'2026-09-16T10:00:00Z',items:[{product:'bread1',quantity:3}]}]),
 'panora-retail-orders':JSON.stringify([{id:'ret1',number:7,status:'completed',completedAt:'2026-09-16T12:00:00Z',items:[{product:'bread1',quantity:2}]}]),
 'panora-bake-completions':JSON.stringify([{id:'bake1',date:'2026-09-16',createdAt:'2026-09-16T06:00:00Z',updatedAt:'2026-09-16T08:00:00Z',items:[{product:'bread1',planned:10,produced:10,waste:1,good:9,recipeSnapshot:recipe}]}]),
 'panora-production-safety-v1066':JSON.stringify({version:1,technicalCards:{},ingredientAllergens:{'flour|g':{contains:['gluten'],updatedAt:'2026-09-15T00:00:00Z'}},productionRuns:[],breadLots:[],rawLots:[{id:'raw-old',ingredientKey:'flour|g',ingredientName:'Flour',unit:'g',quantity:800,supplier:'A',supplierLot:'F-OLD',receivedDate:'2026-09-10',expiryDate:'2026-10-01',createdAt:'2026-09-10T00:00:00Z',updatedAt:'2026-09-10T00:00:00Z'},{id:'raw-new',ingredientKey:'flour|g',ingredientName:'Flour',unit:'g',quantity:500,supplier:'B',supplierLot:'F-NEW',receivedDate:'2026-09-12',expiryDate:'2026-09-25',createdAt:'2026-09-12T00:00:00Z',updatedAt:'2026-09-12T00:00:00Z'}],allocations:[],rawUsages:[],rawOverrides:{},sanitary:[],documents:[]})
};
const c=context(seed,4),api=c.window.panoraProductionSafety;assert.equal(api.version,'10.87');assert.equal(api.build,10870);api.reconcile();const st=api.read();
assert.equal(st.productionRuns.length,1,'actual bake creates one production run');assert.equal(st.breadLots.length,1,'actual bake creates one bread lot');
assert.match(st.breadLots[0].number,/^LOT-2026-09-16-001$/);assert.equal(st.breadLots[0].quantity,9);
const stat=api.lotStats(st.breadLots[0]);assert.deepEqual(JSON.parse(JSON.stringify(stat)),{b2b:3,retail:2,written:0,available:4});
const rawOld=st.rawUsages.find(x=>x.rawLotId==='raw-old'),rawNew=st.rawUsages.find(x=>x.rawLotId==='raw-new');assert.equal(rawOld.quantity,800,'oldest raw lot is consumed first');assert.equal(rawNew.quantity,200,'next raw lot supplies the remainder');
assert.deepEqual(Array.from(api.computedAllergens('bread1')),['gluten']);assert.equal(api.customerComposition('bread1','ru'),'Flour');assert.equal(api.customerComposition('bread1','en'),'','client composition does not leak another language');
assert.equal(api.traceMatches('Restaurant Uno').length,1);assert.equal(api.traceMatches('', '2026-09-17','').length,0,'date range filters traceability');
assert.equal(api.validateBreadIssue([{product:'bread1',quantity:4}]).ok,true);assert.equal(api.validateBreadIssue([{product:'bread1',quantity:5}]).ok,false,'lot validation is capped by physical stock');
const blockedSeed={'panora-products':seed['panora-products'],'panora-recipes':'{}','panora-delivery-notes':'[]','panora-retail-orders':'[]','panora-bake-completions':'[]','panora-production-safety-v1066':JSON.stringify({version:1,technicalCards:{},ingredientAllergens:{},productionRuns:[],breadLots:[{id:'blocked',number:'LOT-2026-09-15-001',product:'bread1',date:'2026-09-15',quantity:5,blocked:true,createdAt:'2026-09-15T00:00:00Z',updatedAt:'2026-09-15T00:00:00Z'}],rawLots:[],allocations:[],rawUsages:[],rawOverrides:{},sanitary:[],documents:[]})};
const blocked=context(blockedSeed,5).window.panoraProductionSafety;assert.equal(blocked.validateBreadIssue([{product:'bread1',quantity:1}]).ok,false,'blocked lot is excluded from new issues');
const legacy=context({'panora-products':seed['panora-products'],'panora-recipes':'{}','panora-delivery-notes':'[]','panora-retail-orders':'[]','panora-bake-completions':'[]'},7).window.panoraProductionSafety;assert.equal(legacy.validateBreadIssue([{product:'bread1',quantity:7}]).ok,true,'legacy untracked physical stock remains usable');
const sql=fs.readFileSync(path.join(root,'PANORA_10.66_PRODUCTION_SAFETY.sql'),'utf8');assert.match(sql,/create table if not exists public\.production_safety_state/i);assert.match(sql,/panora_save_production_safety_state/i);assert.match(sql,/product_customer_safety/i);assert.match(sql,/panora_public_product_customer_safety/i);
assert.match(source,/panora:stock-movements-changed/);assert.match(source,/raw-stock-local-change/);assert.doesNotMatch(source,/setInterval\s*\(/,'no fixed polling is introduced');
console.log('production safety regression: 23 assertions passed');

// Release integration guards added for final 10.66 packaging.
{
  const fs=require('fs'), path=require('path');
  const root=__dirname;
  const ps=fs.readFileSync(path.join(root,'production-safety.js'),'utf8');
  const admin=fs.readFileSync(path.join(root,'admin.html'),'utf8');
  const bakery=fs.readFileSync(path.join(root,'bakery/index.html'),'utf8');
  const commerce=fs.readFileSync(path.join(root,'commerce.js'),'utf8');
  const adminJs=fs.readFileSync(path.join(root,'admin.js'),'utf8');
  const retailRoot=fs.readFileSync(path.join(root,'retail.html'),'utf8');
  const retailIndex=fs.readFileSync(path.join(root,'retail/index.html'),'utf8');
  const sql=fs.readFileSync(path.join(root,'PANORA_10.66_PRODUCTION_SAFETY.sql'),'utf8');
  const assert2=(cond,msg)=>{ if(!cond) throw new Error('production safety release guard: '+msg); };
  assert2(/ПРОИЗВОДСТВО И БЕЗОПАСНОСТЬ/i.test(admin),'admin production/safety group');
  assert2(/production-safety\.js\?v=10870/.test(admin),'admin module version');
  assert2(/production-safety\.js\?v=10870/.test(bakery),'bakery module version');
  assert2(/validateBreadIssue/.test(commerce),'B2B lot validation hook');
  assert2(/retailAllocatable/.test(adminJs),'Retail lot availability cap');
  assert2(/productSafetyHtml/.test(retailRoot) && /productSafetyHtml/.test(retailIndex),'customer-safe product info in both retail entry points');
  assert2(ps.includes("String(r.expiryDate)>=String(breadLot.date||'')"),'expired raw lots excluded from automatic production FIFO');
  assert2(/new Map\(\)/.test(ps) && /validateBreadIssue/.test(ps),'duplicate product issue aggregation present');
  assert2(/addEventListener\(['"]storage['"]/.test(ps),'cross-tab refresh event');
  assert2(/visibilitychange/.test(ps) && /addEventListener\(['"]focus['"]/.test(ps),'return-to-app refresh events');
  assert2(!/setInterval\s*\(/.test(ps),'no constant polling');
  assert2(/create table if not exists public\.production_safety_state/i.test(sql),'production cloud state table');
  assert2(/create table if not exists public\.product_customer_safety/i.test(sql),'safe public product table');
  assert2(!/\bdrop\s+table\b/i.test(sql) && !/\btruncate\b/i.test(sql),'migration has no destructive table operations');
  console.log('production safety integration guards: 14 assertions passed');
}
