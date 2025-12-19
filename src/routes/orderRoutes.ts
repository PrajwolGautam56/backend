import { Router } from 'express';
import {
  getOrders,
  getOrderById,
  updateOrderStatus,
  confirmOrder,
  markOutForDelivery,
  markAsDelivered,
  deleteOrder,
  getOrderStatusStats
} from '../controllers/orderController';
import { authenticateToken } from '../middleware/auth';
import { isAdmin } from '../middleware/adminAuth';

const router = Router();

// All routes require authentication and admin access
router.get('/', authenticateToken, isAdmin, getOrders);
router.get('/order-stats', authenticateToken, isAdmin, getOrderStatusStats);
router.get('/:id', authenticateToken, isAdmin, getOrderById);
router.put('/:id/order-status', authenticateToken, isAdmin, updateOrderStatus);
router.post('/:id/confirm', authenticateToken, isAdmin, confirmOrder);
router.post('/:id/out-for-delivery', authenticateToken, isAdmin, markOutForDelivery);
router.post('/:id/delivered', authenticateToken, isAdmin, markAsDelivered);
router.delete('/:id', authenticateToken, isAdmin, deleteOrder);

export default router;

