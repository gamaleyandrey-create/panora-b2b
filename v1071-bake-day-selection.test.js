const fs=require('fs');
const assert=require('assert');
const vm=require('vm');
const read=name=>fs.readFileSync(name,'utf8');
const product=read('product-admin.js');
const calendar=read('calendar-plan.js');
const admin=read('admin.js');
const commerce=read('commerce.js');
const app=read('app.js');
const purchase=read('purchase-costs.js');
const cloud=read('cloud-sync.js');
const html=read('admin.html');
const build=JSON.parse(read('build.json'));

assert.equal(build.version,'11.28');
assert.equal(build.build,11280);
assert.equal(build.cache,11280);
assert.match(product,/data-plan-enabled/);
assert.match(product,/Quantity is optional|Количество необязательно/);
assert.match(product,/planned=String\(input\?\.value\|\|''\)\.trim\(\)===''\?0/);
assert.match(product,/Select at least one bread|Отметьте хотя бы один хлеб/);
assert.doesNotMatch(product,/Укажите количество хотя бы одного хлеба/);
assert.match(calendar,/план без количества/);
assert.match(calendar,/window\.panoraBuildPlanProductFields\?\.\(date\)/);
assert.match(commerce,/planned: 0,\s*ordered: g\.ordered/);
assert.match(app,/function catalogAvailablePieces\(id\).*eligible\.length\?MAX_PIECES_PER_PRODUCT:0/s);
assert.doesNotMatch(app,/planPlannedPieces\(p\)>0/);
assert.match(admin,/suggested=Math\.max\(0,orderQty,Number\(plan\.planOrdered\|\|0\),Number\(plan\.planned\|\|0\)\)/);
assert.match(purchase,/manual>current\)products\.set\(product,manual\)/);
assert.match(html,/Отметьте хлеб, который планируется выпекать/);
assert.match(admin,/panora:b2b-shipment/);
assert.match(admin,/replace\(\/\\s\*·\?\\s\*\\\[panora:b2b-shipment/);

assert.match(admin,/function planSummaryDetail/);
assert.match(admin,/function updatePlanSummaryCards/);
assert.match(calendar,/updatePlanSummaryCards\(monthPlans,\{scope:monthTitle\(\)\}\)/);
assert.match(html,/plannedPiecesDetail/);
assert.match(html,/orderedPiecesDetail/);
{
 const start=admin.indexOf('function planSummaryTypeLabel'),end=admin.indexOf('function renderPlan',start);
 assert.ok(start>=0&&end>start,'11.28 summary helper source slice');
 const nodes={plannedPieces:{},orderedPieces:{},freePieces:{},plannedPiecesDetail:{},orderedPiecesDetail:{},freePiecesDetail:{}};
 const context={lang:'ru',retailPreorderQuantity:()=>0,t:key=>key==='pcs'?'шт.':key,$:sel=>nodes[String(sel).replace('#','')]||null,Map,Math,Number,String,Array,Object};
 vm.runInNewContext(admin.slice(start,end)+`;this.summaryApi={planSummaryDetail,updatePlanSummaryCards};`,context);
 const rows=[{product:'flax',ordered:17,planned:17,bakeDate:'2026-10-08'},{product:'pumpkin',ordered:17,planned:17,bakeDate:'2026-10-08'}];
 const result=context.summaryApi.updatePlanSummaryCards(rows,{scope:'октябрь 2026 г.'});
 assert.equal(result.ordered,34);assert.equal(result.planned,34);assert.equal(result.extra,0);
 assert.equal(nodes.orderedPieces.textContent,'34 шт.');assert.equal(nodes.plannedPieces.textContent,'34 шт.');
 assert.match(nodes.orderedPiecesDetail.textContent,/2 вида хлеба/);assert.match(nodes.orderedPiecesDetail.textContent,/17 \+ 17 = 34/);
 assert.match(nodes.freePiecesDetail.textContent,/заказ покрыт/);
}


assert.match(admin,/window\.panoraAdminOrderIsArchived=isArchivedAdminOrder/);
assert.match(commerce,/window\.panoraAdminOrderIsArchived\(o,deliveryNotes\)/);
assert.match(cloud,/window\.panoraAdminOrderIsArchived\(order,deliveryNotes\)/);
assert.match(commerce,/completed:o=>orderIsArchived\(o\)/);
assert.match(commerce,/orderIsArchived\(o\)&&status!=='shipped'/);
{
 const start=admin.indexOf('function isArchivedAdminOrder'),end=admin.indexOf('function compactAdminOrderForCache',start);
 assert.ok(start>=0&&end>start,'11.28 canonical order archive helper source slice');
 const store={'panora-delivery-followups':JSON.stringify({'note-manual':{manualClosedAt:'2026-10-08T10:00:00Z'}})};
 const context={localStorage:{getItem:key=>store[key]||null},deliveryNotes:[],window:{}};
 vm.runInNewContext(admin.slice(start,end)+`;this.archive=isArchivedAdminOrder;`,context);
 const f=context.archive;
 assert.equal(f({id:'a',status:'submitted'},[]),false);
 assert.equal(f({id:'b',status:'confirmed'},[]),false);
 assert.equal(f({id:'c',status:'shipped'},[]),false);
 assert.equal(f({id:'d',status:'cancelled'},[]),true);
 assert.equal(f({id:'e',status:'delivered'},[]),true);
 assert.equal(f({id:'f',status:'completed'},[]),true);
 assert.equal(f({id:'g',status:'shipped'},[{id:'note-g',orderId:'g',customerConfirmedAt:'2026-10-08T10:00:00Z'}]),true);
 assert.equal(f({id:'h',status:'shipped'},[{id:'note-h',orderId:'h',offlineProof:{receivedAt:'2026-10-08T10:00:00Z'}}]),true);
 assert.equal(f({id:'i',status:'shipped'},[{id:'note-manual',orderId:'i'}]),true);
 assert.equal(f({id:'j',status:'confirmed',archived:true},[]),true);
}

console.log('Panora 11.28 bake totals tests: OK');
