export const canManageUser = (
  actor: { isSuperAdmin?: boolean } | null,
  target: { role?: string; isSuperAdmin?: boolean },
  changesRole = false,
  deleting = false
): boolean => {
  if (target.isSuperAdmin) return !deleting && !changesRole && !!actor?.isSuperAdmin;
  return !(changesRole || target.role === 'ADMIN') || !!actor?.isSuperAdmin;
};
