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
  generatePayments,
  sendPaymentReminders,
  deleteRental
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
router.get('/:id', authenticateToken, isAdmin, getRentalById); // Get single rental
router.put('/:id', authenticateToken, isAdmin, updateRental); // Update rental
router.delete('/:id', authenticateToken, isAdmin, deleteRental); // Delete rental

// Payment management routes
router.post('/:id/payments', authenticateToken, isAdmin, addPaymentRecord); // Add payment record
router.put('/:id/payments/:paymentId', authenticateToken, isAdmin, updatePaymentRecord); // Update payment record
router.post('/:id/payments/generate', authenticateToken, isAdmin, generatePayments); // Generate payment records
router.post('/:id/send-reminders', authenticateToken, isAdmin, sendPaymentReminders); // Send payment reminders manually

export default router;

