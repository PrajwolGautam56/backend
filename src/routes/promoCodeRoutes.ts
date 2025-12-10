import { Router } from 'express';
import {
  validatePromoCode,
  applyPromoCode,
  getAllPromoCodes,
  createPromoCode,
  updatePromoCode,
  deletePromoCode
} from '../controllers/promoCodeController';
import { authenticateToken } from '../middleware/auth';
import { isAdmin } from '../middleware/adminAuth';

const router = Router();

// Public/User routes
router.post('/validate', validatePromoCode); // Validate promo code
router.post('/apply', authenticateToken, applyPromoCode); // Apply promo code

// Admin routes
router.use(authenticateToken, isAdmin);
router.get('/', getAllPromoCodes); // Get all promo codes
router.post('/', createPromoCode); // Create promo code
router.put('/:id', updatePromoCode); // Update promo code
router.delete('/:id', deletePromoCode); // Delete promo code

export default router;

