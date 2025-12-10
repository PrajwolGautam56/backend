import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  updateDeliveryCharge,
  checkout
} from '../controllers/cartController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All cart routes require authentication
router.use(authenticateToken);

// Cart operations
router.get('/', getCart); // Get user's cart
router.post('/add', addToCart); // Add item to cart
router.put('/update', updateCartItem); // Update item quantity
router.delete('/remove/:product_id', removeFromCart); // Remove item from cart
router.delete('/clear', clearCart); // Clear entire cart
router.put('/delivery-charge', updateDeliveryCharge); // Update delivery charge

// Checkout
router.post('/checkout', checkout); // Convert cart to rental order

export default router;

