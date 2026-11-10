# Employee Access

Sign in as the super admin and open Admin > Employees. Add an employee using a
unique login email, name, phone and password (12 or more characters). Select the
permissions and save. The account can sign in immediately. No email is sent by
employee setup.

Edit Access changes permissions, optionally resets the password, or deactivates
the account. Existing access tokens are checked against current database
permissions on every API request; deactivation takes effect immediately.

Employees retain the existing ADMIN role for compatibility with existing admin
controllers, with isEmployee identifying restricted accounts. New employees have
only explicitly assigned permissions. Existing full admins retain their access.
Only the super admin can create employees or change employee access.

View, Add, Edit and Delete are separate choices. Selecting a write permission
also enables its section's View permission. Payment changes and reminder emails
are separate from rental editing. Changing existing monthly rent amounts (which
updates unpaid payment records) and deleting rental payment history require
Payment Records access. Partial or unassigned permissions never grant full admin
access. Unknown API routes are denied for employees until explicitly mapped.

API routes use employeeAccess before all API routers, including endpoints with
authentication-only checks. Public requests without authentication remain public.
Employees may see public content anonymously, like any visitor.

Verification commands, run from backend:

- `ts-node scripts/check-employee-permissions.ts`
- `ts-node scripts/check-employee-api.ts`
- `ts-node scripts/check-employee-management.ts`
- `npm run typecheck`

The check scripts use local mocks; they do not create accounts or modify the live
database.
