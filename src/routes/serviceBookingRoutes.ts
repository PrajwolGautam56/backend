import express from 'express';
import { serviceBookingController } from '../controllers/serviceBookingController';
import { authenticateToken } from '../middleware/auth';
import { optionalAuthenticate } from '../middleware/optionalAuth';
import { isAdmin } from '../middleware/adminAuth';

const router = express.Router();

/**
 * @swagger
 * /api/service-bookings:
 *   post:
 *     summary: Create a new service booking
 *     tags: [ServiceBookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - services
 *               - scheduledDate
 *               - scheduledTimeSlot
 *               - contactDetails
 *             properties:
 *               services:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     service:
 *                       type: string
 *                     quantity:
 *                       type: number
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *               scheduledTimeSlot:
 *                 type: string
 *               contactDetails:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   email:
 *                     type: string
 *                   address:
 *                     type: string
 *     responses:
 *       201:
 *         description: Booking created successfully
 */
// Public route - can be accessed with or without authentication
// Uses optionalAuth to attach userId if token is provided
router.post('/', optionalAuthenticate, serviceBookingController.createBooking);

/**
 * @swagger
 * /api/service-bookings:
 *   get:
 *     summary: Get all bookings for the authenticated user
 *     tags: [ServiceBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of bookings
 */
// Admin: Get all bookings
router.get('/', authenticateToken, isAdmin, serviceBookingController.getBookings);

// User: Get own bookings
router.get('/my-bookings', authenticateToken, serviceBookingController.getMyBookings);

router.get('/:id', authenticateToken, serviceBookingController.getBookingById);

// Admin: Update booking status
router.put('/:id/status', authenticateToken, isAdmin, serviceBookingController.updateBookingStatus);

// Admin: Update booking time/date
router.put('/:id/time', authenticateToken, isAdmin, serviceBookingController.updateBookingTime);

// User: Update own booking
router.put('/:id', authenticateToken, serviceBookingController.updateMyBooking);

// User or Admin: Cancel booking
router.put('/:id/cancel', authenticateToken, serviceBookingController.cancelBooking);

export default router; 