const assert = require('node:assert/strict');

const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.keys(value).sort().reduce((out, key) => {
    out[key] = canonical(value[key]);
    return out;
  }, {});
  return value;
};
const signature = value => JSON.stringify(canonical(value));

const deviceCard = {mix:'8 мин',fermentation:60,proof:45,bakeTemp:230,bakeTime:32,steps:'1. Замес',notes:''};
const jsonbCard = {bakeTemp:230,bakeTime:32,fermentation:60,mix:'8 мин',notes:'',proof:45,steps:'1. Замес'};
assert.notEqual(JSON.stringify(deviceCard), JSON.stringify(jsonbCard), 'plain JSON text differs when JSONB changes key order');
assert.equal(signature(deviceCard), signature(jsonbCard), 'canonical comparison treats the same tech card as equal');

const rows = [{id:'plain',updated_at:'2026-08-09T08:00:00Z',tech_card:{mix:'new'}},{id:'pumpkin',updated_at:'2026-08-09T12:00:00Z',tech_card:{mix:'old'}}];
const previousMax = '2026-08-09T12:00:00Z';
assert.equal(Math.max(...rows.map(row=>Date.parse(row.updated_at))), Date.parse(previousMax), 'max timestamp can stay unchanged after another row changes');
assert.notEqual(signature(rows.map(({id,tech_card})=>({id,tech_card}))), signature([{id:'plain',tech_card:{mix:'old'}},{id:'pumpkin',tech_card:{mix:'old'}}]), 'full payload still detects that tech card change');

console.log('canonical-two-device-sync: 4 assertions passed');
