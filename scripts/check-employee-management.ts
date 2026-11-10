import 'dotenv/config';
import assert from 'assert';
import bcrypt from 'bcryptjs';
import User from '../src/models/User';
import { requireSuperAdmin, saveEmployee } from '../src/controllers/employeeController';

async function main() {
  const originals = { findById: User.findById, findOne: User.findOne, save: User.prototype.save };
  const response = () => {
    const result: any = { code: 200, body: undefined };
    result.status = (code: number) => { result.code = code; return result; };
    result.json = (body: any) => { result.body = body; return result; };
    return result;
  };
  let saved: any;
  try {
    (User as any).findById = async () => ({ isSuperAdmin: false });
    let called = false;
    const denied = response();
    await requireSuperAdmin({ userId: 'regular-admin' } as any, denied, () => { called = true; });
    assert.strictEqual(denied.code, 403);
    assert.strictEqual(called, false);
    (User as any).findById = async () => ({ isSuperAdmin: true });
    await requireSuperAdmin({ userId: 'owner' } as any, response(), () => { called = true; });
    assert.strictEqual(called, true);
    (User as any).findOne = async () => null;
    (User.prototype as any).save = async function() { saved = this; return this; };
    const body = { fullName: 'Test Employee', email: 'STAFF@example.com', phoneNumber: '1234567890', password: 'unit-test-password-only', employeeActive: true, permissions: ['properties.view', 'rentals.view'] };
    const created = response();
    await saveEmployee({ params: {}, body } as any, created);
    assert.strictEqual(created.code, 201);
    assert.strictEqual(saved.email, 'staff@example.com');
    assert.strictEqual(saved.isEmployee, true);
    assert.strictEqual(saved.isSuperAdmin, false);
    assert.strictEqual(saved.role, 'ADMIN');
    assert.strictEqual(saved.permissions.includes('payments.update'), false);
    assert.strictEqual(await bcrypt.compare(body.password, saved.password), true);
    const invalid = response();
    await saveEmployee({ params: {}, body: { ...body, permissions: ['superadmin'] } } as any, invalid);
    assert.strictEqual(invalid.code, 400);
    const protectedAccount = response();
    (User as any).findById = async () => ({ isSuperAdmin: true, isEmployee: false });
    await saveEmployee({ params: { id: 'owner' }, body } as any, protectedAccount);
    assert.strictEqual(protectedAccount.code, 403);
    console.log('Passed employee creation, password hashing, permission validation and super-admin protection checks.');
  } finally {
    (User as any).findById = originals.findById;
    (User as any).findOne = originals.findOne;
    (User.prototype as any).save = originals.save;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
