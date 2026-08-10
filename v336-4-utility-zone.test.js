const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const app=path.join(__dirname,'../app');
const audit=fs.readFileSync(path.join(app,'audit-trail.js'),'utf8');
const note=fs.readFileSync(path.join(app,'event-notifications.js'),'utf8');
assert.match(audit,/openAuditHistory/);
assert.doesNotMatch(audit,/utilityZone\(\)\.appendChild/);
assert.doesNotMatch(note,/utilityZone\(\)\.appendChild/);
console.log('v336.7-utility-cleanup: 3 assertions passed');
