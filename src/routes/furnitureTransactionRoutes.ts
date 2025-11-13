import express, { Router } from 'express';
import * as furnitureTransactionController from '../controllers/furnitureTransactionController';
import { authenticateToken } from '../middleware/auth';
import { isAdmin } from '../middleware/adminAuth';

const router: Router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Furniture Transactions
 *   description: Furniture rental and sale transaction management
 */

/**
 * @swagger
 * /api/furniture-transactions:
 *   post:
 *     summary: Create a new furniture transaction (rent or sale)
 *     tags: [Furniture Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - furniture_id
 *               - transaction_type
 *             properties:
 *               furniture_id:
 *                 type: string
 *               transaction_type:
 *                 type: string
 *                 enum: [Rent, Sale]
 *               delivery_address:
 *                 type: object
 *               rental_duration_months:
 *                 type: number
 *               customer_notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/', furnitureTransactionController.createTransaction);

/**
 * @swagger
 * /api/furniture-transactions:
 *   get:
 *     summary: Get all transactions (admin sees all, users see their own)
 *     tags: [Furniture Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: transaction_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: payment_status
 *         schema:
 *           type: string
 *       - in: query
 *         name: delivery_status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: List of transactions
 */
router.get('/', furnitureTransactionController.getTransactions);

/**
 * @swagger
 * /api/furniture-transactions/{id}:
 *   get:
 *     summary: Get transaction by ID
 *     tags: [Furniture Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaction details
 *       404:
 *         description: Transaction not found
 */
router.get('/:id', furnitureTransactionController.getTransactionById);

/**
 * @swagger
 * /api/furniture-transactions/{id}/payment:
 *   post:
 *     summary: Add payment record (Admin only)
 *     tags: [Furniture Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *               payment_method:
 *                 type: string
 *                 enum: [Cash, UPI, Card, Bank Transfer, Cheque, Other]
 *               payment_reference:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment recorded successfully
 *       403:
 *         description: Admin access required
 */
router.post('/:id/payment', isAdmin, furnitureTransactionController.addPayment);

/**
 * @swagger
 * /api/furniture-transactions/{id}/delivery:
 *   put:
 *     summary: Update delivery status (Admin only)
 *     tags: [Furniture Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               delivery_status:
 *                 type: string
 *                 enum: [Pending, Confirmed, Preparing, Out for Delivery, Delivered, Cancelled]
 *               delivery_tracking_number:
 *                 type: string
 *               delivery_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Delivery status updated
 *       403:
 *         description: Admin access required
 */
router.put('/:id/delivery', isAdmin, furnitureTransactionController.updateDeliveryStatus);

/**
 * @swagger
 * /api/furniture-transactions/{id}/invoice:
 *   get:
 *     summary: Generate invoice for transaction
 *     tags: [Furniture Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: payment_id
 *         schema:
 *           type: string
 *         description: Optional payment ID to generate invoice for specific payment
 *     responses:
 *       200:
 *         description: Invoice HTML
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */
router.get('/:id/invoice', furnitureTransactionController.generateInvoice);

/**
 * @swagger
 * /api/furniture-transactions/{id}/cancel:
 *   post:
 *     summary: Cancel transaction (Admin only)
 *     tags: [Furniture Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancellation_reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transaction cancelled
 *       403:
 *         description: Admin access required
 */
router.post('/:id/cancel', isAdmin, furnitureTransactionController.cancelTransaction);

export default router;

