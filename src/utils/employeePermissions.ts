export const permissionGroups = [
  { key: 'properties', name: 'Properties', actions: ['view', 'create', 'update', 'delete'] },
  { key: 'rentals', name: 'Rentals (deleting rental history also requires payment access)', actions: ['view', 'create', 'update', 'delete'] },
  { key: 'payments', name: 'Payment Records (add, edit, delete and mark paid)', actions: ['update'] },
  { key: 'reminders', name: 'Payment Reminder Emails', actions: ['send'] },
  { key: 'furniture', name: 'Furniture & Stock', actions: ['view', 'create', 'update', 'delete'] },
  { key: 'orders', name: 'Orders', actions: ['view', 'update', 'delete'] },
  { key: 'propertyRequests', name: 'Property Requests', actions: ['view', 'update', 'delete'] },
  { key: 'furnitureRequests', name: 'Furniture Requests', actions: ['view', 'update', 'delete'] },
  { key: 'transactions', name: 'Transactions', actions: ['view', 'create', 'update', 'delete'] },
  { key: 'invoices', name: 'Invoices', actions: ['view', 'create'] },
  { key: 'users', name: 'Customers (administrator access is reserved for the super admin)', actions: ['view', 'update', 'delete'] },
  { key: 'services', name: 'Service Bookings', actions: ['view', 'update', 'delete'] },
  { key: 'serviceCatalog', name: 'Service Catalog', actions: ['view', 'create', 'update', 'delete'] },
  { key: 'enquiries', name: 'Enquiries', actions: ['view', 'update', 'delete'] },
  { key: 'dashboard', name: 'Business Dashboard', actions: ['view'] },
  { key: 'analytics', name: 'Analytics', actions: ['view'] },
  { key: 'settings', name: 'Settings', actions: ['view', 'update'] },
  { key: 'promoCodes', name: 'Promo Codes', actions: ['view', 'update'] }
];

export const allEmployeePermissions = permissionGroups.flatMap(group => group.actions.map(action => `${group.key}.${action}`));

export function normalizeEmployeePermissions(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !allEmployeePermissions.includes(item))) {
    throw new Error('Select valid employee permissions.');
  }
  const selected = new Set<string>(value);
  for (const key of value) {
    const section = key.split('.')[0];
    if (allEmployeePermissions.includes(`${section}.view`)) selected.add(`${section}.view`);
  }
  if (selected.has('payments.update') || selected.has('reminders.send')) selected.add('rentals.view');
  return [...selected];
}

export const hasEmployeePermission = (user: { role?: string; isEmployee?: boolean; employeeActive?: boolean; permissions?: string[] }, permission: string) =>
  user.role === 'ADMIN' && (!user.isEmployee || (user.employeeActive !== false && (user.permissions || []).includes(permission)));

// Unknown routes are denied for employees, including new admin endpoints added later.
export function employeeRoutePermission(url: string, method: string): string | 'account' | null {
  const path = url.split('?')[0].replace(/\/+$/, '');
  const read = method === 'GET' || method === 'HEAD';
  const action = read ? 'view' : method === 'DELETE' ? 'delete' : method === 'POST' ? 'create' : 'update';
  if (/^\/api\/auth\//.test(path) || /^\/api\/users\/(profile|dashboard)\//.test(path)) return 'account';
  if (/^\/api\/admin\/(employees|employee-permissions|update-role)(\/|$)/.test(path)) return null;
  if (/^\/api\/admin\/dashboard\//.test(path)) return read ? 'dashboard.view' : null;
  if (/^\/api\/admin\/analytics\//.test(path)) return read ? 'analytics.view' : null;
  if (/^\/api\/admin\/settings(\/|$)/.test(path)) return read ? 'settings.view' : 'settings.update';
  if (/^\/api\/admin\/invoices(\/|$)/.test(path)) return read ? 'invoices.view' : method === 'POST' ? 'invoices.create' : null;
  if (/^\/api\/rentals(\/|$)/.test(path)) {
    if (/send-reminder/.test(path)) return 'reminders.send';
    if (/\/payments(\/|$)/.test(path) && !read) return 'payments.update';
    if (/\/(order-status|confirm|out-for-delivery|delivered)$/.test(path)) return 'orders.update';
    return `rentals.${action}`;
  }
  if (/^\/api\/furniture-transactions(\/|$)/.test(path)) {
    if (/\/payment(\/|$)/.test(path) && !read) return 'payments.update';
    if (/\/invoice$/.test(path)) return 'invoices.create';
    return `transactions.${read ? 'view' : method === 'POST' && path !== '/api/furniture-transactions' ? 'update' : action}`;
  }
  const sections: [RegExp, string][] = [
    [/^\/api\/(admin\/)?properties(\/|$)/, 'properties'],
    [/^\/api\/furniture(\/|$)/, 'furniture'],
    [/^\/api\/property-forms(\/|$)/, 'propertyRequests'],
    [/^\/api\/furniture-forms(\/|$)/, 'furnitureRequests'],
    [/^\/api\/orders(\/|$)/, 'orders'],
    [/^\/api\/users(\/|$)/, 'users'],
    [/^\/api\/service-bookings(\/|$)/, 'services'],
    [/^\/api\/services(\/|$)/, 'serviceCatalog'],
    [/^\/api\/contacts(\/|$)/, 'enquiries'],
    [/^\/api\/promo-codes(\/|$)/, 'promoCodes']
  ];
  for (const [pattern, section] of sections) {
    if (pattern.test(path)) {
      if (section === 'orders' && !read && method !== 'DELETE') return 'orders.update';
      if (section === 'furniture' && /\/(bulk-stock-update|stock|status)$/.test(path)) return 'furniture.update';
      if (section === 'properties' && /\/discount$/.test(path)) return 'properties.update';
      if (section === 'promoCodes' && !read) return 'promoCodes.update';
      if (section === 'furnitureRequests' && /migrate-delivered-rentals$/.test(path)) return null;
      return `${section}.${action}`;
    }
  }
  if (/^\/api\/geocoding\/(geocode|reverse)$/.test(path) && (read || method === 'POST')) return 'properties.view';
  return null;
}
