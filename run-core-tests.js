const { spawnSync } = require('node:child_process');
const path = require('node:path');

const list = [
  'automatic-cloud-sync.test.js',
  'canonical-two-device-sync.test.js',
  'cloud-conflict-acceptance.test.js',
  'cloud-tech-card-authority.test.js',
  'server-revision-sync.test.js',
  'two-device-sync-model.test.js',
  'v323-clean-migration.test.js',
  'v325-tech-card-lock.test.js',
  'v328-order-workflow.test.js',
  'v331-sync-safety.test.js',
  'v332-notifications.test.js',
  'v333-audit-trail.test.js',
  'v334-stable-pwa.test.js',
  'v335-offline-ux.test.js',
  'v335-2-calendar-live-sync.test.js',
  'v335-3-auto-sync-ux.test.js',
  'v335-4-remote-notice.test.js',
  'v335-5-notice-order-refresh.test.js',
  'v335-6-order-plan-loop.test.js',
  'v335-7-partner-sync-status.test.js',
  'v335-8-partner-filter-status.test.js',
  'v335-9-partner-history-filters.test.js',
  'v336-embedded-status-delivery-filter.test.js',
  'v336-1-status-filter-polish.test.js',
  'v336-2-mobile-button-audit.test.js',
  'v336-3-sync-position.test.js',
  'v336-4-utility-zone.test.js',
  'v336-5-active-orders-modern-bell.test.js'
];

let failures = 0;
for (const file of list) {
  const r = spawnSync(process.execPath, [path.join(__dirname, file)], { stdio: 'inherit' });
  if (r.status !== 0) failures++;
}
if (failures) process.exit(1);
console.log(`core regression: ${list.length}/${list.length} passed`);
