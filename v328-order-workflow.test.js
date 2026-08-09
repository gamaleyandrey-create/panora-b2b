const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const portal = fs.readFileSync(path.join(__dirname, '../app/portal-cloud.js'), 'utf8');
const cloud = fs.readFileSync(path.join(__dirname, '../app/cloud-sync.js'), 'utf8');
const commerce = fs.readFileSync(path.join(__dirname, '../app/commerce.js'), 'utf8');

assert.match(portal, /const saved=await verifyCreatedOrder\(id\);/, 'partner verifies a newly created order');
assert.ok(
  portal.indexOf("const saved=await verifyCreatedOrder(id);") <
  portal.indexOf("cart={};localStorage.removeItem('panora-cart')"),
  'cart is cleared only after order verification'
);
assert.match(portal, /async function refreshPartnerOrders\(\)/, 'partner has a lightweight order refresh');
assert.match(portal, /partnerOrderPoll=setInterval\(\(\)=>\{[\s\S]*refreshPartnerOrders\(\)/, 'partner order statuses refresh automatically');
assert.match(portal, /stopPartnerOrderPolling\(\);try\{if\(session\)/, 'partner polling stops on logout');

assert.match(cloud, /orderPoll=setInterval\(async\(\)=>\{try\{await loadOrders\(\);await loadDeliveryNotes\(\)/, 'bakery polls orders and delivery notes automatically');
assert.match(cloud, /async function updateOrderStatus\(id,nextStatus/, 'bakery uses a cloud status mutation');
assert.match(cloud, /await loadOrders\(\);\s*const saved=orders\.find\(order=>order\.id===id\);[\s\S]*saved\.status!==nextStatus/, 'bakery verifies changed status after write');
assert.match(cloud, /rpc\/panora_ship_order/, 'shipment uses server-side atomic RPC');
assert.match(cloud, /shippingLocks\.has\(orderId\)/, 'duplicate shipment clicks are blocked');

assert.match(commerce, /if \(!o \|\| o\.status !== "submitted"\) return;/, 'only submitted orders can be confirmed');
assert.match(commerce, /await window\.panoraCloud\.updateOrderStatus\(id, "confirmed"\)/, 'confirm action calls cloud update');
assert.match(commerce, /actualItems[\s\S]*Number\.isInteger\(i\.quantity\)/, 'shipment validates actual quantities');

console.log('v328-order-workflow: 13 assertions passed');
