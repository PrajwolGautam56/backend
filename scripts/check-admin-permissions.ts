import assert from 'assert';
import { canManageUser } from '../src/utils/adminPermissions';

const admin = { isSuperAdmin: false };
const owner = { isSuperAdmin: true };
const regularUser = { role: 'USER' };
const adminUser = { role: 'ADMIN' };
const ownerUser = { role: 'ADMIN', isSuperAdmin: true };
assert.strictEqual(canManageUser(admin, regularUser, true), false);
assert.strictEqual(canManageUser(admin, adminUser), false);
assert.strictEqual(canManageUser(admin, adminUser, false, true), false);
assert.strictEqual(canManageUser(admin, ownerUser), false);
assert.strictEqual(canManageUser(owner, ownerUser, true), false);
assert.strictEqual(canManageUser(owner, ownerUser, false, true), false);
assert.strictEqual(canManageUser(owner, regularUser, true), true);
assert.strictEqual(canManageUser(owner, adminUser, true), true);
assert.strictEqual(canManageUser(owner, adminUser, false, true), true);
assert.strictEqual(canManageUser(admin, regularUser), true);
console.log('Passed 10 administrator permission checks.');
