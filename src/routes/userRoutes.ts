import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { isAdmin } from '../middleware/adminAuth';
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getOwnProfile,
  updateOwnProfile,
  getOwnActivityHistory,
  getOwnDashboard,
  getUserDetails,
  testDashboardQuery
} from '../controllers/userController';

const router = Router();

// Admin routes - User management
router.get('/', authenticateToken, isAdmin, getUsers); // List all users
router.get('/details/:id', authenticateToken, isAdmin, getUserDetails); // Get user with all details
router.get('/:id', authenticateToken, isAdmin, getUserById); // Get single user
router.put('/:id', authenticateToken, isAdmin, updateUser); // Update user
router.delete('/:id', authenticateToken, isAdmin, deleteUser); // Delete user

// User routes - Own profile
router.get('/profile/me', authenticateToken, getOwnProfile); // Get own profile
router.put('/profile/me', authenticateToken, updateOwnProfile); // Update own profile
router.get('/profile/activity', authenticateToken, getOwnActivityHistory); // Get own activity history
router.get('/dashboard/me', authenticateToken, getOwnDashboard); // Get own dashboard
router.get('/dashboard/test', authenticateToken, testDashboardQuery); // Debug: Test dashboard query

export default router;

