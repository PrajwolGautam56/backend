import { Router } from 'express';
import { 
  createPropertyForm, 
  getPropertyForms, 
  getPropertyFormById,
  updatePropertyForm, 
  updatePropertyFormStatus,
  deletePropertyForm 
} from '../controllers/propertyFormController';
import { authenticateToken } from '../middleware/auth';
import { optionalAuthenticate } from '../middleware/optionalAuth';
import { isAdmin } from '../middleware/adminAuth';

const router = Router();

// Public route - Submit property request (with optional auth to track logged-in users)
router.post('/', optionalAuthenticate, createPropertyForm); // Create a property form - Public

// Admin routes - Manage property requests
router.get('/', authenticateToken, isAdmin, getPropertyForms); // List all requests with filters
router.get('/:id', authenticateToken, isAdmin, getPropertyFormById); // Get single request
router.put('/:id', authenticateToken, isAdmin, updatePropertyForm); // Update request
router.patch('/:id/status', authenticateToken, isAdmin, updatePropertyFormStatus); // Update status
router.delete('/:id', authenticateToken, isAdmin, deletePropertyForm); // Delete request

export default router;