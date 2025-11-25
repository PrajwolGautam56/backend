import express, { Router } from 'express';
import * as paymentController from '../controllers/paymentController';
import { authenticateToken } from '../middleware/auth';
import { verifyWebhookSignature } from '../utils/razorpay';
import FurnitureTransaction from '../models/FurnitureTransaction';
import { PaymentStatus } from '../interfaces/FurnitureTransaction';
import logger from '../utils/logger';
import { generateInvoiceNumber, InvoiceData } from '../utils/invoiceGenerator';
import { sendInvoiceEmail } from '../utils/email';
import { sendEmailInBackground } from '../utils/emailDispatcher';

const router: Router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment processing endpoints
 */

/**
 * Create Razorpay order for transaction payment
 */
router.post('/create-order', authenticateToken, paymentController.createPaymentOrder);

/**
 * Verify Razorpay payment
 */
router.post('/verify', authenticateToken, paymentController.verifyPayment);

/**
 * Get pending monthly payments for rentals
 */
router.get('/pending-monthly', authenticateToken, paymentController.getPendingMonthlyPayments);

/**
 * Create Razorpay order for monthly rental payment
 */
router.post('/monthly-payment-order', authenticateToken, paymentController.createMonthlyPaymentOrder);

/**
 * Razorpay webhook handler (no auth required - uses signature verification)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: express.Request, res: express.Response) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'] as string;
    const webhookBody = req.body.toString();

    if (!webhookSignature) {
      return res.status(400).json({ message: 'Missing webhook signature' });
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(webhookBody, webhookSignature);
    if (!isValid) {
      logger.warn('Invalid webhook signature received');
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const event = JSON.parse(webhookBody);
    logger.info('Razorpay webhook received', { event: event.event, entity: event.entity });

    // Handle payment.captured event
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;

      // Find transaction by order receipt or notes
      const transaction = await FurnitureTransaction.findOne({
        $or: [
          { 'payment_records.payment_reference': payment.id },
          { transaction_id: orderId.split('_')[0] } // Extract transaction_id from order receipt
        ]
      }).populate('furniture_id', 'name description photos price')
        .populate('user_id', 'fullName email phoneNumber address');

      if (transaction) {
        // Check if payment already recorded
        const existingPayment = transaction.payment_records.find(
          p => p.payment_reference === payment.id
        );

        if (!existingPayment && payment.status === 'captured') {
          const crypto = require('crypto');
          const paymentId = `PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
          const paymentAmount = payment.amount / 100;

          const paymentRecord: any = {
            payment_id: paymentId,
            amount: paymentAmount,
            payment_date: new Date(payment.created_at * 1000),
            payment_method: payment.method || 'UPI',
            payment_reference: payment.id,
            status: 'Completed' as const,
            notes: `Razorpay Webhook - Order: ${orderId}`,
            invoice_generated: false,
            invoice_number: undefined,
            created_at: new Date()
          };

          transaction.payment_records.push(paymentRecord);
          transaction.total_paid = (transaction.total_paid || 0) + paymentAmount;
          transaction.remaining_amount = transaction.total_amount - transaction.total_paid;

          if (transaction.remaining_amount <= 0) {
            transaction.payment_status = PaymentStatus.PAID;
          } else if (transaction.total_paid > 0) {
            transaction.payment_status = PaymentStatus.PARTIAL;
          }

          // Auto-generate invoice
          if (!transaction.invoice_number) {
            transaction.invoice_number = generateInvoiceNumber();
            transaction.invoice_generated = true;
            transaction.invoice_generated_at = new Date();
          }

          if (transaction.invoice_number) {
            paymentRecord.invoice_generated = true;
            paymentRecord.invoice_number = transaction.invoice_number;
          }

          await transaction.save();

          // Send invoice email
          try {
            const customer = transaction.user_id as any;
            const furniture = transaction.furniture_id as any;
            
            const invoiceData: InvoiceData = {
              invoiceNumber: transaction.invoice_number!,
              invoiceDate: transaction.invoice_generated_at || new Date(),
              customerName: customer?.fullName || 'Customer',
              customerEmail: customer?.email,
              customerPhone: customer?.phoneNumber,
              customerAddress: transaction.delivery_address || undefined,
              items: [{
                description: furniture.name,
                quantity: 1,
                unitPrice: paymentAmount,
                total: paymentAmount
              }],
              subtotal: paymentAmount,
              deliveryCharge: transaction.delivery_charge,
              total: paymentAmount + (transaction.delivery_charge || 0),
              paymentStatus: transaction.payment_status as 'Paid' | 'Partial' | 'Pending',
              paymentMethod: 'Razorpay',
              paymentReference: payment.id,
              transactionType: transaction.transaction_type as 'Rent' | 'Sale',
              transactionId: transaction.transaction_id,
              notes: transaction.customer_notes
            };

            sendEmailInBackground(
              'Invoice email (webhook)',
              () => sendInvoiceEmail(customer?.email, invoiceData, transaction.transaction_id),
              { transactionId: transaction.transaction_id, email: customer?.email }
            );
          } catch (emailError: any) {
            logger.error('Error sending invoice email via webhook', {
              error: emailError.message
            });
          }

          logger.info('Payment processed via webhook', {
            paymentId: payment.id,
            transactionId: transaction.transaction_id
          });
        }
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    logger.error('Error processing webhook', { error: error.message });
    res.status(500).json({ message: 'Webhook processing error' });
  }
});

export default router;

