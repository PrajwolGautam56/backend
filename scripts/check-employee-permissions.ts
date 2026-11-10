import assert from 'assert';
import { allEmployeePermissions, employeeRoutePermission, hasEmployeePermission, normalizeEmployeePermissions } from '../src/utils/employeePermissions';

const viewer = { role: 'ADMIN', isEmployee: true, employeeActive: true, permissions: ['properties.view', 'rentals.view'] };
assert.strictEqual(hasEmployeePermission(viewer, 'rentals.view'), true);
assert.strictEqual(hasEmployeePermission(viewer, 'payments.update'), false);
assert.strictEqual(hasEmployeePermission({ ...viewer, employeeActive: false }, 'rentals.view'), false);
assert.strictEqual(hasEmployeePermission({ role: 'USER', permissions: allEmployeePermissions }, 'payments.update'), false);
assert.strictEqual(hasEmployeePermission({ role: 'ADMIN' }, 'payments.update'), true);
assert.throws(() => normalizeEmployeePermissions(['superAdmin']));
assert.throws(() => normalizeEmployeePermissions('payments.update'));
assert.deepStrictEqual(normalizeEmployeePermissions(['properties.update']).sort(), ['properties.update', 'properties.view']);
assert.deepStrictEqual(normalizeEmployeePermissions(['payments.update']).sort(), ['payments.update', 'rentals.view']);
const paths: [string, string, string | null][] = [
  ['/api/rentals', 'GET', 'rentals.view'],
  ['/api/rentals?id=1', 'GET', 'rentals.view'],
  ['/api/rentals/1', 'PUT', 'rentals.update'],
  ['/api/rentals/1', 'DELETE', 'rentals.delete'],
  ['/api/rentals/1/payments/2', 'PUT', 'payments.update'],
  ['/api/rentals/1/payments/2', 'DELETE', 'payments.update'],
  ['/api/rentals/1/payments/generate', 'POST', 'payments.update'],
  ['/api/rentals/1/payments', 'POST', 'payments.update'],
  ['/api/rentals/1/payments/2/send-reminder', 'POST', 'reminders.send'],
  ['/api/admin/properties/1', 'PUT', 'properties.update'],
  ['/api/properties', 'POST', 'properties.create'],
  ['/api/furniture-transactions/1/payment', 'POST', 'payments.update'],
  ['/api/furniture-transactions/1/delivery', 'PUT', 'transactions.update'],
  ['/api/admin/employees', 'POST', null],
  ['/api/admin/update-role/1', 'PATCH', null],
  ['/api/admin/new-privileged-feature', 'POST', null],
  ['/api/users/profile/me', 'GET', 'account'],
  ['/api/auth/check-admin', 'GET', 'account']
];
for (const [path, method, permission] of paths) assert.strictEqual(employeeRoutePermission(path, method), permission, `${method} ${path}`);
console.log('Passed employee permissions: read-only access, payment isolation, deactivation, permission validation and protected API routes.');
