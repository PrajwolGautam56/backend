import { Router } from 'express';
import { 
  createFurnitureForm, 
  getFurnitureForms, 
  getFurnitureFormById,
  updateFurnitureForm, 
  updateFurnitureFormStatus,
  deleteFurnitureForm,
  migrateDeliveredRentals,
  getMyFurnitureForms
} from '../controllers/furnitureFormController';
import { authenticateToken } from '../middleware/auth';
import { optionalAuthenticate } from '../middleware/optionalAuth';
import { isAdmin } from '../middleware/adminAuth';

const router = Router();

// Public route - Submit furniture request (with optional auth to track logged-in users)
router.post('/', optionalAuthenticate, createFurnitureForm); // Create a furniture form - Public

// User routes - Get own furniture requests
router.get('/me', authenticateToken, getMyFurnitureForms); // Get user's own furniture requests

// Admin routes - Manage furniture requests
router.get('/', authenticateToken, isAdmin, getFurnitureForms); // List all requests with filters
router.post('/migrate-delivered-rentals', authenticateToken, isAdmin, migrateDeliveredRentals); // Migrate existing delivered rentals to rental management
router.patch('/:id/status', authenticateToken, isAdmin, updateFurnitureFormStatus); // Update status (must be before /:id route)
router.get('/:id', authenticateToken, isAdmin, getFurnitureFormById); // Get single request
router.put('/:id', authenticateToken, isAdmin, updateFurnitureForm); // Update request
router.delete('/:id', authenticateToken, isAdmin, deleteFurnitureForm); // Delete request

export default router;

