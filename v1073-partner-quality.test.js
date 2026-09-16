const fs=require('node:fs'),assert=require('node:assert/strict');
const sql=fs.readFileSync('PANORA_10.73_QUALITY_CASES.sql','utf8');
for(const token of ['create table if not exists public.partner_quality_cases','partner_quality_cases_restaurant_read','partner_quality_cases_restaurant_insert','public.panora_restaurant_id()','public.panora_is_admin()','delivery_note_id','product_id','bakery_response'])assert.ok(sql.includes(token),token);
const cloud=fs.readFileSync('portal-cloud.js','utf8');
for(const token of ['fetchPartnerQualityCases','submitPartnerQualityCase','window.panoraPartnerQuality','partner_quality_cases?restaurant_id=eq.','panora:partner-quality-updated'])assert.ok(cloud.includes(token),token);
const ws=fs.readFileSync('restaurant-workspace.js','utf8');
for(const token of ['function qualityHtml()','data-rw-quality-form','activeTab === "quality"','["quality"','window.panoraPartnerQuality.submit'])assert.ok(ws.includes(token),token);
const css=fs.readFileSync('restaurant-workspace.css','utf8');assert.ok(css.includes('.rw-quality-form'));assert.ok(css.includes('.rw-quality-case'));
console.log('Panora 10.73 partner quality tests: OK');
