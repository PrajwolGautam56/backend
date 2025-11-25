import { Request, Response } from 'express';
import FurnitureTransaction from '../models/FurnitureTransaction';
import Furniture from '../models/Furniture';
import User from '../models/User';
import { AuthRequest } from '../interfaces/Request';
import { TransactionType, PaymentStatus, DeliveryStatus } from '../interfaces/FurnitureTransaction';
import { generateInvoiceNumber, generateInvoiceHTML, InvoiceData } from '../utils/invoiceGenerator';
import logger from '../utils/logger';
import crypto from 'crypto';
import { sendInvoiceEmail } from '../utils/email';
import { sendEmailInBackground } from '../utils/emailDispatcher';

/**
 * Create a new furniture transaction (rent or sale)
 */
export const createTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { furniture_id, transaction_type, delivery_address, rental_duration_months, customer_notes } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    // Find furniture item
    const furniture = await Furniture.findById(furniture_id);
    if (!furniture) {
      return res.status(404).json({ message: 'Furniture item not found' });
    }

    // Check if furniture is available
    if (furniture.status !== 'Available') {
      return res.status(400).json({ 
        message: `Furniture item is ${furniture.status.toLowerCase()}` 
      });
    }

    // Validate transaction type matches listing type
    if (transaction_type === TransactionType.RENT && !furniture.listing_type.includes('Rent')) {
      return res.status(400).json({ message: 'This item is not available for rent' });
    }
    if (transaction_type === TransactionType.SALE && !furniture.listing_type.includes('Sell')) {
      return res.status(400).json({ message: 'This item is not available for sale' });
    }

    // Calculate amounts
    let totalAmount = 0;
    let depositAmount = 0;
    let monthlyRent = 0;
    const deliveryCharge = furniture.delivery_available ? (furniture.delivery_charge || 0) : 0;

    if (transaction_type === TransactionType.RENT) {
      monthlyRent = furniture.price?.rent_monthly || 0;
      depositAmount = furniture.price?.deposit || 0;
      const duration = rental_duration_months || 1;
      totalAmount = (monthlyRent * duration) + depositAmount + deliveryCharge;
    } else {
      totalAmount = (furniture.price?.sell_price || 0) + deliveryCharge;
    }

    // Create transaction
    const transaction = new FurnitureTransaction({
      furniture_id: furniture._id,
      user_id: userId,
      transaction_type,
      total_amount: totalAmount,
      deposit_amount: depositAmount,
      monthly_rent: monthlyRent,
      delivery_charge: deliveryCharge,
      remaining_amount: totalAmount,
      delivery_address,
      rental_start_date: transaction_type === TransactionType.RENT ? new Date() : undefined,
      rental_end_date: transaction_type === TransactionType.RENT && rental_duration_months 
        ? new Date(Date.now() + rental_duration_months * 30 * 24 * 60 * 60 * 1000)
        : undefined,
      rental_duration_months: transaction_type === TransactionType.RENT ? rental_duration_months : undefined,
      customer_notes,
      status: 'Active'
    });

    await transaction.save();

    // Update furniture status
    furniture.status = transaction_type === TransactionType.RENT ? 'Rented' : 'Sold';
    furniture.availability = transaction_type === TransactionType.RENT ? 'Rented' : 'Sold';
    await furniture.save();

    // Populate and return
    await transaction.populate('furniture_id', 'name description photos price');
    await transaction.populate('user_id', 'fullName email phoneNumber');

    logger.info('Furniture transaction created', { transactionId: transaction.transaction_id });

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction
    });
  } catch (error: any) {
    logger.error('Error creating transaction', { error: error.message });
    res.status(500).json({ message: 'Error creating transaction', error: error.message });
  }
};

/**
 * Get all transactions (Admin) or user's own transactions
 */
export const getTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const user = await User.findById(userId);
    const isAdmin = user?.isAdmin || false;

    let query: any = {};
    
    // Non-admin users can only see their own transactions
    if (!isAdmin) {
      query.user_id = userId;
    }

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by transaction type
    if (req.query.transaction_type) {
      query.transaction_type = req.query.transaction_type;
    }

    // Filter by payment status
    if (req.query.payment_status) {
      query.payment_status = req.query.payment_status;
    }

    // Filter by delivery status
    if (req.query.delivery_status) {
      query.delivery_status = req.query.delivery_status;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const transactions = await FurnitureTransaction.find(query)
      .populate('furniture_id', 'name description photos price listing_type')
      .populate('user_id', 'fullName email phoneNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await FurnitureTransaction.countDocuments(query);

    res.json({
      transactions,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    logger.error('Error fetching transactions', { error: error.message });
    res.status(500).json({ message: 'Error fetching transactions' });
  }
};

/**
 * Get single transaction by ID
 */
export const getTransactionById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const user = await User.findById(userId);
    const isAdmin = user?.isAdmin || false;

    const transaction = await FurnitureTransaction.findById(id)
      .populate('furniture_id', 'name description photos price listing_type')
      .populate('user_id', 'fullName email phoneNumber address');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Non-admin users can only view their own transactions
    if (!isAdmin && transaction.user_id.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(transaction);
  } catch (error: any) {
    logger.error('Error fetching transaction', { error: error.message });
    res.status(500).json({ message: 'Error fetching transaction' });
  }
};

/**
 * Add payment record (Admin only)
 */
export const addPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, payment_method, payment_reference, notes } = req.body;

    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const user = await User.findById(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const transaction = await FurnitureTransaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Generate payment ID
    const paymentId = `PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Create payment record
    const paymentRecord: any = {
      payment_id: paymentId,
      amount: parseFloat(amount),
      payment_date: new Date(),
      payment_method: payment_method || 'Cash',
      payment_reference: payment_reference,
      status: 'Completed' as const,
      notes,
      invoice_generated: false,
      invoice_number: undefined,
      created_at: new Date()
    };

    transaction.payment_records.push(paymentRecord);
    transaction.total_paid = (transaction.total_paid || 0) + paymentRecord.amount;
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

    // Populate for invoice generation
    await transaction.populate('furniture_id', 'name description photos price');
    await transaction.populate('user_id', 'fullName email phoneNumber address');

    // Send invoice email if payment received and invoice generated
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
            unitPrice: paymentRecord.amount,
            total: paymentRecord.amount
          }],
          subtotal: paymentRecord.amount,
          deliveryCharge: transaction.delivery_charge,
          total: paymentRecord.amount + (transaction.delivery_charge || 0),
          paymentStatus: transaction.payment_status as 'Paid' | 'Partial' | 'Pending',
          paymentMethod: paymentRecord.payment_method,
          paymentReference: paymentRecord.payment_reference,
          transactionType: transaction.transaction_type as 'Rent' | 'Sale',
          transactionId: transaction.transaction_id,
          notes: transaction.customer_notes
        };

        sendEmailInBackground(
          'Invoice email',
          () => sendInvoiceEmail(customer?.email, invoiceData, transaction.transaction_id),
          { transactionId: transaction.transaction_id, email: customer?.email }
        );
      } catch (emailError: any) {
        logger.error('Error sending invoice email', { 
          error: emailError.message,
          transactionId: transaction.transaction_id 
        });
        // Don't fail the payment if email fails
      }
    }

    logger.info('Payment added to transaction', { 
      transactionId: transaction.transaction_id, 
      paymentId,
      invoiceGenerated
    });

    res.status(200).json({
      message: 'Payment recorded successfully',
      payment: paymentRecord,
      transaction,
      invoiceGenerated,
      invoiceNumber: transaction.invoice_number
    });
  } catch (error: any) {
    logger.error('Error adding payment', { error: error.message });
    res.status(500).json({ message: 'Error adding payment', error: error.message });
  }
};

/**
 * Update delivery status (Admin only)
 */
export const updateDeliveryStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { delivery_status, delivery_tracking_number, delivery_date } = req.body;

    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const user = await User.findById(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const transaction = await FurnitureTransaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    transaction.delivery_status = delivery_status;
    
    if (delivery_tracking_number) {
      transaction.delivery_tracking_number = delivery_tracking_number;
    }

    if (delivery_date) {
      transaction.delivery_date = new Date(delivery_date);
    }

    if (delivery_status === DeliveryStatus.DELIVERED) {
      transaction.delivered_date = new Date();
    }

    await transaction.save();

    logger.info('Delivery status updated', { 
      transactionId: transaction.transaction_id, 
      delivery_status 
    });

    res.json({
      message: 'Delivery status updated successfully',
      transaction
    });
  } catch (error: any) {
    logger.error('Error updating delivery status', { error: error.message });
    res.status(500).json({ message: 'Error updating delivery status' });
  }
};

/**
 * Generate invoice for transaction
 */
export const generateInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { payment_id } = req.query; // Optional: generate invoice for specific payment

    const transaction = await FurnitureTransaction.findById(id)
      .populate('furniture_id', 'name description price')
      .populate('user_id', 'fullName email phoneNumber address');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check access (admin or transaction owner)
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const currentUser = await User.findById(userId);
    const isAdmin = currentUser?.isAdmin || false;
    
    if (!isAdmin && transaction.user_id.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Generate invoice number if not exists
    if (!transaction.invoice_number) {
      transaction.invoice_number = generateInvoiceNumber();
      transaction.invoice_generated = true;
      transaction.invoice_generated_at = new Date();
      await transaction.save();
    }

    // Get payment record if payment_id provided
    let paymentRecord = null;
    if (payment_id) {
      paymentRecord = transaction.payment_records.find(
        p => p.payment_id === payment_id
      );
    }

    // Prepare invoice data
    const customer = transaction.user_id as any;
    const furniture = transaction.furniture_id as any;

    const invoiceData: InvoiceData = {
      invoiceNumber: transaction.invoice_number,
      invoiceDate: transaction.invoice_generated_at || transaction.createdAt,
      customerName: customer?.fullName || 'Customer',
      customerEmail: customer?.email,
      customerPhone: customer?.phoneNumber,
      customerAddress: transaction.delivery_address || undefined,
      items: [{
        description: furniture.name,
        quantity: 1,
        unitPrice: paymentRecord ? paymentRecord.amount : transaction.total_amount,
        total: paymentRecord ? paymentRecord.amount : transaction.total_amount
      }],
      subtotal: paymentRecord ? paymentRecord.amount : transaction.total_amount,
      deliveryCharge: transaction.delivery_charge,
      total: paymentRecord ? paymentRecord.amount : transaction.total_amount,
      paymentStatus: transaction.payment_status as 'Paid' | 'Partial' | 'Pending',
      paymentMethod: paymentRecord?.payment_method,
      paymentReference: paymentRecord?.payment_reference,
      transactionType: transaction.transaction_type as 'Rent' | 'Sale',
      transactionId: transaction.transaction_id,
      notes: transaction.customer_notes
    };

    const invoiceHTML = generateInvoiceHTML(invoiceData);

    // Mark payment record as invoiced if applicable
    if (paymentRecord && !paymentRecord.invoice_generated) {
      paymentRecord.invoice_generated = true;
      paymentRecord.invoice_number = transaction.invoice_number;
      await transaction.save();
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(invoiceHTML);
  } catch (error: any) {
    logger.error('Error generating invoice', { error: error.message });
    res.status(500).json({ message: 'Error generating invoice' });
  }
};

/**
 * Cancel transaction (Admin only)
 */
export const cancelTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const user = await User.findById(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const transaction = await FurnitureTransaction.findById(id)
      .populate('furniture_id');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    transaction.status = 'Cancelled';
    transaction.cancellation_reason = cancellation_reason;
    transaction.cancelled_at = new Date();

    // Make furniture available again
    const furniture = transaction.furniture_id as any;
    furniture.status = 'Available';
    furniture.availability = 'Available';
    await furniture.save();

    await transaction.save();

    logger.info('Transaction cancelled', { transactionId: transaction.transaction_id });

    res.json({
      message: 'Transaction cancelled successfully',
      transaction
    });
  } catch (error: any) {
    logger.error('Error cancelling transaction', { error: error.message });
    res.status(500).json({ message: 'Error cancelling transaction' });
  }
};

