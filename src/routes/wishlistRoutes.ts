import { Router } from 'express';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  moveToCart
} from '../controllers/wishlistController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All wishlist routes require authentication
router.use(authenticateToken);

router.get('/', getWishlist); // Get user's wishlist
router.post('/add', addToWishlist); // Add item to wishlist
router.delete('/remove/:furniture_id', removeFromWishlist); // Remove item from wishlist
router.delete('/clear', clearWishlist); // Clear wishlist
router.post('/move-to-cart/:furniture_id', moveToCart); // Move item to cart

export default router;

