import { Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { AuthRequest } from '../interfaces/Request';
import { UserRole } from '../interfaces/User';
import { normalizeEmployeePermissions, permissionGroups } from '../utils/employeePermissions';

export async function requireSuperAdmin(req: AuthRequest, res: Response, next: () => void) {
  try {
    const actor = await User.findById(req.userId);
    if (!actor?.isSuperAdmin) return res.status(403).json({ message: 'Super admin access required.' });
    next();
  } catch {
    res.status(500).json({ message: 'Unable to verify super admin access.' });
  }
}

export function getEmployeePermissions(_req: AuthRequest, res: Response) {
  res.json({ success: true, data: permissionGroups });
}

export async function getEmployees(_req: AuthRequest, res: Response) {
  try {
    const employees = await User.find({ isEmployee: true }).select('fullName email phoneNumber role isEmployee employeeActive permissions createdAt').sort({ createdAt: -1 });
    res.json({ success: true, data: employees });
  } catch {
    res.status(500).json({ message: 'Unable to load employees.' });
  }
}

export async function saveEmployee(req: AuthRequest, res: Response) {
  try {
    const { fullName, email, phoneNumber, password, permissions, employeeActive } = req.body;
    if (typeof fullName !== 'string' || !fullName.trim() || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
      return res.status(400).json({ message: 'Name, valid email and phone number are required.' });
    }
    if (typeof employeeActive !== 'boolean') return res.status(400).json({ message: 'Select employee active status.' });
    const selectedPermissions = normalizeEmployeePermissions(permissions);
    const creating = !req.params.id;
    if ((creating || password) && (typeof password !== 'string' || password.length < 12)) return res.status(400).json({ message: 'Password must be at least 12 characters.' });
    const user = creating ? new User({ username: `employee-${new mongoose.Types.ObjectId()}`, nationality: 'Not provided' }) : await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Employee not found.' });
    if (!creating && (!user.isEmployee || user.isSuperAdmin)) return res.status(403).json({ message: 'Only employee accounts can be edited here.' });
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: { $regex: `^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
    if (existing && String(existing._id) !== String(user._id)) return res.status(409).json({ message: 'This email is already registered. Use a different employee email.' });
    user.fullName = fullName.trim();
    user.email = normalizedEmail;
    user.phoneNumber = phoneNumber.trim();
    user.role = UserRole.ADMIN;
    user.isAdmin = true;
    user.isEmployee = true;
    user.employeeActive = employeeActive;
    user.permissions = selectedPermissions;
    user.isVerified = true;
    user.refreshToken = null;
    if (password) {
      user.password = await bcrypt.hash(password, 12);
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
    }
    await user.save();
    res.status(creating ? 201 : 200).json({ success: true, message: creating ? 'Employee created.' : 'Employee updated.' });
  } catch (error: any) {
    if (error?.code === 11000) return res.status(409).json({ message: 'Employee email is already registered.' });
    res.status(400).json({ message: error?.message === 'Select valid employee permissions.' ? error.message : 'Unable to save employee. Check the details and retry.' });
  }
}
