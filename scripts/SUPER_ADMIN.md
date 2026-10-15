# Super Admin Setup

Run `ts-node scripts/setup-super-admin.ts` from the backend directory with
`SUPER_ADMIN_PASSWORD` supplied through the process environment. The script uses
the configured `MONGODB_URI`. The default account is `brokerin.in@gmail.com`;
`SUPER_ADMIN_EMAIL` can override it for another environment.

This is an explicit one-time setup/reset command, not a startup task. It hashes
the password through the User model, verifies the account, assigns ADMIN plus
isSuperAdmin, and clears refresh and password-reset tokens. Re-running it resets
the password. Never commit the password or add it to frontend configuration.

After backend and frontend deployment, sign in and open Admin > Users. The super
admin can use Make Admin and Remove Admin for existing registered users. Regular
admins cannot manage admin accounts or assign roles. The super admin account
cannot be deleted, demoted, or have its email changed using user-management APIs.

Run `ts-node scripts/check-admin-permissions.ts` for the permission checks.
