import 'dotenv/config';
import assert from 'assert';
import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import User from '../src/models/User';
import { config } from '../src/config/config';
import { employeeAccess } from '../src/middleware/employeeAccess';

async function main() {
  let actor = { role: 'ADMIN', isEmployee: true, employeeActive: true, permissions: ['rentals.view', 'properties.view'] };
  const original = User.findById;
  (User as any).findById = () => ({ select: async () => actor });
  const app = express();
  app.use('/api', employeeAccess);
  app.use((_req, res) => { res.json({ ok: true }); });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const port = (server.address() as { port: number }).port;
  const token = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, config.JWT_SECRET);
  const request = (path: string, method = 'GET') => new Promise<number>((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method, headers: { authorization: `Bearer ${token}` } }, res => {
      res.resume();
      res.on('end', () => resolve(res.statusCode || 0));
    });
    req.on('error', reject); req.end();
  });
  try {
    assert.strictEqual(await request('/api/rentals'), 200);
    assert.strictEqual(await request('/api/properties/123', 'PUT'), 403);
    assert.strictEqual(await request('/api/rentals/123/payments/456', 'PUT'), 403);
    assert.strictEqual(await request('/api/rentals/123/payments/456', 'DELETE'), 403);
    assert.strictEqual(await request('/api/rentals/123/payments/generate', 'POST'), 403);
    assert.strictEqual(await request('/api/furniture-transactions/123/payment', 'POST'), 403);
    assert.strictEqual(await request('/api/admin/employees'), 403);
    assert.strictEqual(await request('/api/admin/update-role/123', 'PATCH'), 403);
    actor.permissions.push('rentals.delete');
    assert.strictEqual(await request('/api/rentals/123', 'DELETE'), 403);
    actor.permissions.push('payments.update');
    assert.strictEqual(await request('/api/rentals/123/payments/456', 'PUT'), 200);
    assert.strictEqual(await request('/api/rentals/123', 'DELETE'), 200);
    assert.strictEqual(await request('/api/rentals/123/send-reminders', 'POST'), 403);
    actor.permissions.push('reminders.send');
    assert.strictEqual(await request('/api/rentals/123/send-reminders', 'POST'), 200);
    actor.employeeActive = false;
    assert.strictEqual(await request('/api/rentals'), 403);
    assert.strictEqual(await request('/api/auth/check-admin'), 403);
    actor = { role: 'ADMIN', isEmployee: false, employeeActive: true, permissions: [] };
    assert.strictEqual(await request('/api/admin/settings', 'PUT'), 200);
    console.log('Passed 16 HTTP employee access checks without connecting to a database.');
  } finally {
    (User as any).findById = original;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
