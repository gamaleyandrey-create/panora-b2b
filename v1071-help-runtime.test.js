const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
let source=fs.readFileSync('production-safety.js','utf8');
source=source.replace("if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();\n})();",`window.__psHelpTest={bindCommon,showContextHelp,tipButton,contextHelp,onboardingNeeded,refreshNavLanguage};\nif(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();\n})();`);
class Storage{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
const storage=new Storage();storage.setItem('panora-admin-lang','ru');
const title={textContent:''},text={textContent:''};
const dialog={open:false,querySelector(sel){if(sel==='[data-ps-context-title]')return title;if(sel==='[data-ps-context-text]')return text;return null},showModal(){this.open=true}};
let navClicks=0;const navTarget={click(){navClicks++}};
const group={textContent:''};
const navButtons=new Map(['ps-production','ps-bread-lots','ps-raw-lots','ps-allergens','ps-sanitation','ps-haccp','ps-capa','ps-recalls','ps-suppliers','ps-training','ps-documents','ps-trace','ps-help'].map(x=>[x,{textContent:''}]));
const document={readyState:'loading',body:{classList:{contains:()=>true}},addEventListener:()=>{},querySelector(sel){
 if(sel==='#adminLanguage')return {value:'ru'};
 if(sel==='#psContextHelpDialog')return dialog;
 if(sel==='.ps-nav-group-label')return group;
 const m=sel.match(/^\.admin-nav \[data-view="([^"]+)"\]$/);if(m)return navButtons.get(m[1])||null;
 return null;
},querySelectorAll:()=>[]};
const window={PANORA_SUPABASE:{},panoraSupabaseSession:null,addEventListener:()=>{},dispatchEvent:()=>{},panoraProductRegistry:()=>[]};
const ctx={window,document,localStorage:storage,navigator:{onLine:false},crypto:{randomUUID:()=>crypto.randomUUID()},structuredClone,CustomEvent:function(){},Intl,Date,Math,JSON,Number,String,Array,Object,Set,Map,Promise,console,setTimeout:()=>0,clearTimeout:()=>{},fetch:async()=>{},Notification:{permission:'denied'},FormData:function(){},confirm:()=>true,prompt:()=>null,alert:()=>{}};
Object.assign(window,{window,document,localStorage:storage,navigator:ctx.navigator,crypto:ctx.crypto,CustomEvent:ctx.CustomEvent,Notification:ctx.Notification});
vm.createContext(ctx);vm.runInContext(source,ctx,{filename:'production-safety.js'});
const api=window.__psHelpTest;assert(api,'test hooks exported');
assert.match(api.tipButton('blockLot'),/data-ps-tip="blockLot"/);
const tip={dataset:{psTip:'blockLot'},onclick:null},go={dataset:{psGo:'ps-allergens'},onclick:null};
const fakeRoot={querySelectorAll(sel){if(sel==='[data-ps-tip]')return [tip];if(sel==='[data-ps-go]')return [go];return []}};
// Route target for this handler test.
document.querySelector=(sel)=>{
 if(sel==='#adminLanguage')return {value:'ru'};
 if(sel==='#psContextHelpDialog')return dialog;
 if(sel==='.ps-nav-group-label')return group;
 if(sel==='.admin-nav [data-view="ps-allergens"]')return navTarget;
 const m=sel.match(/^\.admin-nav \[data-view="([^"]+)"\]$/);if(m)return navButtons.get(m[1])||null;
 return null;
};
api.bindCommon(fakeRoot);assert.equal(typeof tip.onclick,'function');assert.equal(typeof go.onclick,'function');
tip.onclick({preventDefault(){},stopPropagation(){}});assert.equal(dialog.open,true);assert.equal(title.textContent,'Блокировка партии');assert.match(text.textContent,/не используется в новых автоматических B2B\/Retail/);
go.onclick();assert.equal(navClicks,1,'quick help link opens requested section');
api.refreshNavLanguage();assert.equal(group.textContent,'ПРОИЗВОДСТВО И БЕЗОПАСНОСТЬ');assert.equal(navButtons.get('ps-help').textContent,'Справка');
assert.equal(api.onboardingNeeded(),true,'first steps shown for an empty production setup');
console.log('Panora 10.73 help runtime handlers: OK');
