import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { config } from '../config/config';
import { employeeRoutePermission, hasEmployeePermission } from '../utils/employeePermissions';

export async function employeeAccess(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next();
  let userId: string;
  try {
    userId = (jwt.verify(token, config.JWT_SECRET) as { userId: string }).userId;
  } catch {
    return next();
  }
  try {
    const user = await User.findById(userId).select('role isEmployee employeeActive permissions');
    if (!user?.isEmployee) return next();
    if (user.role !== 'ADMIN' || user.employeeActive === false) return res.status(403).json({ message: 'Employee access is disabled.' });
    if (req.method === 'DELETE' && /^\/api\/rentals\/[^/]+\/?(?:\?|$)/.test(req.originalUrl) && !hasEmployeePermission(user, 'payments.update')) {
      return res.status(403).json({ message: 'Deleting a rental also deletes its payment history. Payment update permission is required.' });
    }
    const permission = employeeRoutePermission(req.originalUrl, req.method);
    if (permission === 'properties.view' && req.originalUrl.startsWith('/api/geocoding/') && hasEmployeePermission(user, 'furniture.view')) return next();
    if (permission === 'account' || (permission && hasEmployeePermission(user, permission))) return next();
    return res.status(403).json({ message: 'You do not have permission for this action.', permission });
  } catch {
    return res.status(500).json({ message: 'Unable to verify employee permissions.' });
  }
}
