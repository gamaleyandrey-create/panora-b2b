const assert = require('node:assert/strict');
const fs = require('node:fs');

const cloud = fs.readFileSync(new URL('../app/cloud-sync.js', `file://${__filename}`), 'utf8');
const sql = fs.readFileSync(new URL('../sql/supabase-v324-tech-card-revisions.sql', `file://${__filename}`), 'utf8');
const lockSql = fs.readFileSync(new URL('../sql/supabase-v325-tech-card-locks.sql', `file://${__filename}`), 'utf8');

assert.match(sql, /tech_card_revision bigint not null default 0/);
assert.match(sql, /tech_card_revision = tech_card_revision \+ 1/);
assert.match(sql, /tech_card_revision = coalesce\(p_expected_revision, 0\)/);
assert.match(sql, /PANORA_REVISION_CONFLICT/);
assert.match(cloud, /rpc\/panora_save_locked_tech_card_revision/);
assert.match(lockSql, /PANORA_LOCK_REQUIRED/);
assert.match(lockSql, /revoke all on function public\.panora_save_tech_card_revision/);
assert.match(cloud, /p_expected_revision:expectedRevision/);
assert.match(cloud, /techCardRevision:Number\(row\.tech_card_revision\|\|0\)/);
assert.match(cloud, /techCardRevision:Number\(p\.techCardRevision\|\|0\)/, 'revision-only changes trigger a cloud apply');
assert.doesNotMatch(cloud, /const productRow=p=>[^\n]*tech_card:/, 'ordinary product writes cannot overwrite a newer card');
assert.match(cloud, /setInterval\(\(\)=>refreshProductsIfChanged\(\).*?,3000\)/);

function save(server, expected, value) {
  if (server.revision !== expected) return {conflict: true, server};
  return {conflict: false, server: {revision: server.revision + 1, value}};
}
let server = {revision: 0, value: 'v0'};
const a = save(server, 0, 'v1');
assert.equal(a.conflict, false);
server = a.server;
const staleB = save(server, 0, 'stale-b');
assert.equal(staleB.conflict, true);
assert.deepEqual(staleB.server, {revision: 1, value: 'v1'});

console.log('server-revision-sync: v325 revision + exclusive-lock assertions passed');
