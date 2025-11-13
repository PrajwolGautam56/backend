import { Request, Response } from 'express';
import { AuthRequest } from '../interfaces/Request';
import FurnitureTransaction from '../models/FurnitureTransaction';
import Furniture from '../models/Furniture';
import User from '../models/User';
import { createRazorpayOrder, verifyPaymentSignature, fetchPaymentDetails } from '../utils/razorpay';
import { PaymentStatus, TransactionType } from '../interfaces/FurnitureTransaction';
import { generateInvoiceNumber, InvoiceData } from '../utils/invoiceGenerator';
import { sendInvoiceEmail } from '../utils/email';
import logger from '../utils/logger';
import crypto from 'crypto';
import { config } from '../config/config';

/**
 * Create Razorpay order for furniture transaction
 */
export const createPaymentOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { transaction_id } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!config.isRazorpayEnabled()) {
      return res.status(503).json({ message: 'Payment gateway is not configured' });
    }

    // Find transaction
    const transaction = await FurnitureTransaction.findOne({ 
      transaction_id,
      user_id: userId 
    }).populate('furniture_id', 'name');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check if already paid
    if (transaction.payment_status === PaymentStatus.PAID) {
      return res.status(400).json({ message: 'Transaction is already paid' });
    }

    // Calculate amount to pay (remaining amount)
    const amountToPay = Number(transaction.remaining_amount) || Number(transaction.total_amount);

    if (amountToPay <= 0) {
      return res.status(400).json({ message: 'No amount due' });
    }

    // Create Razorpay order
    const order = await createRazorpayOrder(
      amountToPay,
      'INR',
      transaction.transaction_id,
      {
        transaction_id: transaction.transaction_id,
        transaction_type: transaction.transaction_type,
        user_id: userId.toString()
      }
    );

    logger.info('Razorpay order created', {
      orderId: order.id,
      transactionId: transaction.transaction_id,
      amount: amountToPay
    });

    res.json({
      orderId: order.id,
      amount: Number(order.amount) / 100, // Convert from paise to rupees
      currency: order.currency,
      key: config.RAZORPAY_KEY_ID,
      transaction_id: transaction.transaction_id,
      receipt: order.receipt
    });
  } catch (error: any) {
    logger.error('Error creating payment order', { error: error.message });
    res.status(500).json({ message: 'Error creating payment order', error: error.message });
  }
};

/**
 * Verify and process Razorpay payment
 */
export const verifyPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { transaction_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!config.isRazorpayEnabled()) {
      return res.status(503).json({ message: 'Payment gateway is not configured' });
    }

    // Verify signature
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Find transaction
    const transaction = await FurnitureTransaction.findOne({ 
      transaction_id,
      user_id: userId 
    }).populate('furniture_id', 'name description photos price')
      .populate('user_id', 'fullName email phoneNumber address');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Fetch payment details from Razorpay
    const paymentDetails = await fetchPaymentDetails(razorpay_payment_id);

    // Check if payment was successful
    if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
      return res.status(400).json({ 
        message: 'Payment not successful',
        status: paymentDetails.status
      });
    }

    // Check if payment already recorded
    const existingPayment = transaction.payment_records.find(
      p => p.payment_reference === razorpay_payment_id
    );

    if (existingPayment) {
      return res.status(400).json({ message: 'Payment already recorded' });
    }

    // Create payment record
    const paymentId = `PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const paymentAmount = Number(paymentDetails.amount) / 100; // Convert from paise to rupees

    const paymentRecord: any = {
      payment_id: paymentId,
      amount: paymentAmount,
      payment_date: new Date(paymentDetails.created_at * 1000), // Razorpay uses Unix timestamp
      payment_method: 'UPI', // Default, can be determined from payment method
      payment_reference: razorpay_payment_id,
      status: 'Completed' as const,
      notes: `Razorpay Payment - Order: ${razorpay_order_id}`,
      invoice_generated: false,
      invoice_number: undefined,
      created_at: new Date()
    };

    transaction.payment_records.push(paymentRecord);
    transaction.total_paid = (transaction.total_paid || 0) + paymentAmount;
    transaction.remaining_amount = transaction.total_amount - transaction.total_paid;

    // Update payment status
    if (transaction.remaining_amount <= 0) {
      transaction.payment_status = PaymentStatus.PAID;
    } else if (transaction.total_paid > 0) {
      transaction.payment_status = PaymentStatus.PARTIAL;
    }

    // Auto-generate invoice if payment received
    let invoiceGenerated = false;
    if (paymentRecord.status === 'Completed' && !transaction.invoice_number) {
      transaction.invoice_number = generateInvoiceNumber();
      transaction.invoice_generated = true;
      transaction.invoice_generated_at = new Date();
      invoiceGenerated = true;
    }

    // Mark payment record as invoiced
    if (invoiceGenerated) {
      paymentRecord.invoice_generated = true;
      paymentRecord.invoice_number = transaction.invoice_number;
    }

    await transaction.save();

    // Send invoice email if generated
    if (invoiceGenerated && paymentRecord.status === 'Completed') {
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
          paymentMethod: 'Razorpay (UPI/Card)',
          paymentReference: razorpay_payment_id,
          transactionType: transaction.transaction_type as 'Rent' | 'Sale',
          transactionId: transaction.transaction_id,
          notes: transaction.customer_notes
        };

        await sendInvoiceEmail(customer?.email, invoiceData, transaction.transaction_id);
        logger.info('Invoice email sent after Razorpay payment', {
          transactionId: transaction.transaction_id,
          email: customer?.email
        });
      } catch (emailError: any) {
        logger.error('Error sending invoice email', {
          error: emailError.message,
          transactionId: transaction.transaction_id
        });
      }
    }

    logger.info('Razorpay payment verified and recorded', {
      transactionId: transaction.transaction_id,
      paymentId: razorpay_payment_id,
      amount: paymentAmount
    });

    res.json({
      message: 'Payment verified and recorded successfully',
      payment: paymentRecord,
      transaction,
      invoiceGenerated,
      invoiceNumber: transaction.invoice_number
    });
  } catch (error: any) {
    logger.error('Error verifying payment', { error: error.message });
    res.status(500).json({ message: 'Error verifying payment', error: error.message });
  }
};

/**
 * Get pending monthly payments for rentals
 */
export const getPendingMonthlyPayments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Find all active rental transactions for the user
    const rentals = await FurnitureTransaction.find({
      user_id: userId,
      transaction_type: TransactionType.RENT,
      status: 'Active',
      payment_status: { $in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] }
    })
      .populate('furniture_id', 'name photos price')
      .sort({ createdAt: -1 });

    const pendingPayments = rentals.map(rental => {
      const now = new Date();
      const rentalStart = rental.rental_start_date || rental.createdAt;
      const monthsSinceStart = Math.floor(
        (now.getTime() - rentalStart.getTime()) / (30 * 24 * 60 * 60 * 1000)
      );

      // Calculate how many months have been paid
      const monthlyRent = rental.monthly_rent || 0;
      const totalPaid = rental.total_paid || 0;
      const deposit = rental.deposit_amount || 0;
      
      // Subtract deposit from total paid to get actual rent paid
      const rentPaid = Math.max(0, totalPaid - deposit);
      const monthsPaid = monthlyRent > 0 ? Math.floor(rentPaid / monthlyRent) : 0;
      
      // Calculate pending months
      const pendingMonths = Math.max(0, monthsSinceStart - monthsPaid);
      const amountDue = pendingMonths * monthlyRent;

      return {
        transaction_id: rental.transaction_id,
        furniture: rental.furniture_id,
        monthly_rent: monthlyRent,
        months_paid: monthsPaid,
        pending_months: pendingMonths,
        amount_due: amountDue,
        next_payment_due: monthsPaid > 0 
          ? new Date(rentalStart.getTime() + (monthsPaid + 1) * 30 * 24 * 60 * 60 * 1000)
          : rentalStart,
        rental_start_date: rentalStart,
        payment_status: rental.payment_status
      };
    }).filter(payment => payment.amount_due > 0);

    res.json({
      pendingPayments,
      totalPendingAmount: pendingPayments.reduce((sum, p) => sum + p.amount_due, 0)
    });
  } catch (error: any) {
    logger.error('Error fetching pending monthly payments', { error: error.message });
    res.status(500).json({ message: 'Error fetching pending payments' });
  }
};

/**
 * Create Razorpay order for monthly rental payment
 */
export const createMonthlyPaymentOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { transaction_id, months = 1 } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!config.isRazorpayEnabled()) {
      return res.status(503).json({ message: 'Payment gateway is not configured' });
    }

    // Find rental transaction
    const transaction = await FurnitureTransaction.findOne({
      transaction_id,
      user_id: userId,
      transaction_type: TransactionType.RENT,
      status: 'Active'
    }).populate('furniture_id', 'name');

    if (!transaction) {
      return res.status(404).json({ message: 'Rental transaction not found' });
    }

    const monthlyRent = transaction.monthly_rent || 0;
    if (monthlyRent <= 0) {
      return res.status(400).json({ message: 'Invalid monthly rent amount' });
    }

    const amountToPay = Number(monthlyRent) * Number(months);

    // Create Razorpay order
    const order = await createRazorpayOrder(
      amountToPay,
      'INR',
      `${transaction.transaction_id}_monthly_${Date.now()}`,
      {
        transaction_id: transaction.transaction_id,
        transaction_type: 'Rent',
        payment_type: 'monthly_rent',
        months: months.toString(),
        user_id: userId.toString()
      }
    );

    logger.info('Monthly payment order created', {
      orderId: order.id,
      transactionId: transaction.transaction_id,
      amount: amountToPay,
      months
    });

    res.json({
      orderId: order.id,
      amount: Number(order.amount) / 100,
      currency: order.currency,
      key: config.RAZORPAY_KEY_ID,
      transaction_id: transaction.transaction_id,
      months,
      receipt: order.receipt
    });
  } catch (error: any) {
    logger.error('Error creating monthly payment order', { error: error.message });
    res.status(500).json({ message: 'Error creating payment order', error: error.message });
  }
};

