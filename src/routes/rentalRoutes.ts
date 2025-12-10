import { Router } from 'express';
import {
  createRental,
  getRentals,
  getRentalById,
  getMyRentals,
  getPendingOverduePayments,
  getRentalDashboard,
  getDuesBreakdown,
  getMonthlyCollection,
  getMonthlyCollectionDetails,
  updateRental,
  addPaymentRecord,
  updatePaymentRecord,
  deletePaymentRecord,
  generatePayments,
  sendPaymentReminders,
  sendReminderForMonth,
  deleteRental,
  updateOrderStatus,
  confirmOrder,
  markOutForDelivery,
  markAsDelivered,
  getOrderStatusStats
} from '../controllers/rentalController';
import { authenticateToken } from '../middleware/auth';
import { isAdmin } from '../middleware/adminAuth';

const router = Router();

// Admin routes - Rental Management
router.post('/', authenticateToken, isAdmin, createRental); // Create rental
router.get('/', authenticateToken, isAdmin, getRentals); // Get all rentals with filters
router.get('/dashboard', authenticateToken, isAdmin, getRentalDashboard); // Admin dashboard with statistics
router.get('/dues-breakdown', authenticateToken, isAdmin, getDuesBreakdown); // Detailed dues breakdown
router.get('/monthly-collection', authenticateToken, isAdmin, getMonthlyCollection); // Monthly collection records
router.get('/monthly-collection/:month', authenticateToken, isAdmin, getMonthlyCollectionDetails); // Monthly collection details for specific month (clickable)
router.get('/my-rentals', authenticateToken, getMyRentals); // Get user's own rentals
router.get('/pending-overdue', authenticateToken, getPendingOverduePayments); // Get pending/overdue payments only

// Payment management routes - MUST come before /:id routes (more specific routes first)
router.post('/:id/payments/:paymentId/send-reminder', authenticateToken, isAdmin, sendReminderForMonth); // Send reminder for specific payment record
router.delete('/:id/payments/:paymentId', authenticateToken, isAdmin, deletePaymentRecord); // Delete payment record
router.put('/:id/payments/:paymentId', authenticateToken, isAdmin, updatePaymentRecord); // Update payment record
router.post('/:id/payments/generate', authenticateToken, isAdmin, generatePayments); // Generate payment records
router.post('/:id/payments', authenticateToken, isAdmin, addPaymentRecord); // Add payment record
router.post('/:id/send-reminders', authenticateToken, isAdmin, sendPaymentReminders); // Send payment reminders for all pending/overdue

// Order status management routes
router.get('/order-stats', authenticateToken, isAdmin, getOrderStatusStats); // Get order status statistics
router.put('/:id/order-status', authenticateToken, isAdmin, updateOrderStatus); // Update order status
router.post('/:id/confirm', authenticateToken, isAdmin, confirmOrder); // Quick action: Confirm order
router.post('/:id/out-for-delivery', authenticateToken, isAdmin, markOutForDelivery); // Quick action: Mark as out for delivery
router.post('/:id/delivered', authenticateToken, isAdmin, markAsDelivered); // Quick action: Mark as delivered

// Generic rental routes - MUST come after specific routes (less specific routes last)
router.get('/:id', authenticateToken, isAdmin, getRentalById); // Get single rental
router.put('/:id', authenticateToken, isAdmin, updateRental); // Update rental
router.delete('/:id', authenticateToken, isAdmin, deleteRental); // Delete rental

export default router;

