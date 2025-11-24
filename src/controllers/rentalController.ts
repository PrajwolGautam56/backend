import { Request, Response } from 'express';
import Rental, { RentalStatus, PaymentStatus } from '../models/Rental';
import { AuthRequest } from '../interfaces/Request';
import User from '../models/User';
import logger from '../utils/logger';
import mongoose from 'mongoose';
import {
  sendRentalConfirmation,
  sendPaymentConfirmation,
  sendRentalStatusUpdate
} from '../utils/email';

// Helper to link rental to user by email
const linkRentalToUser = async (email: string): Promise<mongoose.Types.ObjectId | null> => {
  try {
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });
    return user ? user._id : null;
  } catch (error) {
    logger.warn('Failed to link rental to user', { email, error });
    return null;
  }
};

// Create a new rental (Admin only)
export const createRental = async (req: AuthRequest, res: Response) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      customer_address,
      items,
      start_date,
      end_date,
      notes
    } = req.body;

    // Validate required fields
    if (!customer_name || !customer_email || !customer_phone || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['customer_name', 'customer_email', 'customer_phone', 'items']
      });
    }

    // Validate items
    for (const item of items) {
      if (!item.product_name || !item.monthly_price) {
        return res.status(400).json({
          message: 'Each item must have product_name and monthly_price'
        });
      }
    }

    // Calculate totals
    const total_monthly_amount = items.reduce((sum: number, item: any) => 
      sum + (item.monthly_price * (item.quantity || 1)), 0
    );
    const total_deposit = items.reduce((sum: number, item: any) => 
      sum + (item.deposit || 0), 0
    );

    // Link to user if email matches
    const userId = await linkRentalToUser(customer_email);

    // Generate rental_id before creating (MUST be set before validation)
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const crypto = require('crypto');
    const randomString = crypto.randomBytes(3).toString('hex').toUpperCase();
    const rental_id = `RENT-${year}-${month}${day}-${randomString}`;

    logger.info('Generated rental_id:', rental_id);

    // Create rental
    const rentalData: any = {
      rental_id: rental_id, // MUST be set - validation runs before pre-save hook
      customer_name,
      customer_email,
      customer_phone,
      items: items.map((item: any) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_type: item.product_type || 'Other',
        quantity: item.quantity || 1,
        monthly_price: item.monthly_price,
        deposit: item.deposit || 0,
        start_date: item.start_date || start_date || new Date(),
        end_date: item.end_date || end_date
      })),
      total_monthly_amount,
      total_deposit,
      start_date: start_date || new Date(),
      end_date,
      status: RentalStatus.ACTIVE,
      payment_records: [],
      notes,
      createdBy: req.userId,
      updatedBy: req.userId
    };

    if (customer_address) {
      rentalData.customer_address = customer_address;
    }

    if (userId) {
      rentalData.userId = userId;
    }

    // Ensure rental_id is set
    if (!rentalData.rental_id) {
      logger.warn('rental_id was not generated, generating now...');
      const date = new Date();
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const crypto = require('crypto');
      const randomString = crypto.randomBytes(3).toString('hex').toUpperCase();
      rentalData.rental_id = `RENT-${year}-${month}${day}-${randomString}`;
    }

    logger.info('Creating rental with data:', { 
      hasRentalId: !!rentalData.rental_id,
      rentalId: rentalData.rental_id,
      customerEmail: rentalData.customer_email,
      rentalDataKeys: Object.keys(rentalData)
    });

    // Ensure rental_id is definitely set
    if (!rentalData.rental_id || rentalData.rental_id.trim() === '') {
      throw new Error('rental_id was not generated properly');
    }

    // Use native MongoDB driver to bypass Mongoose validation (similar to property creation)
    // Check if MongoDB connection is ready
    if (!mongoose.connection.db) {
      logger.error('MongoDB connection not ready');
      throw new Error('Database connection not ready. Please try again.');
    }

    const db = mongoose.connection.db;
    const rentalsCollection = db.collection('rentals');
    
    const insertData = {
      ...rentalData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    logger.info('Inserting rental using native MongoDB driver:', { 
      rentalId: insertData.rental_id,
      hasRentalId: !!insertData.rental_id,
      dbReady: !!db,
      collectionReady: !!rentalsCollection
    });
    
    let rental: any;
    try {
      const result = await rentalsCollection.insertOne(insertData);
      logger.info('Rental inserted successfully:', { insertedId: result.insertedId });
      
      // Return the inserted document
      rental = await rentalsCollection.findOne({ _id: result.insertedId });
      
      if (!rental) {
        throw new Error('Failed to retrieve created rental');
      }
      
      logger.info('Rental retrieved after insertion:', { rentalId: rental.rental_id });
    } catch (dbError: any) {
      logger.error('Error inserting rental with native driver:', {
        error: dbError.message,
        stack: dbError.stack,
        rentalId: insertData.rental_id
      });
      throw dbError;
    }

    // Generate payment records ONLY for months that are due or past (systematic approach)
    await generatePaymentRecords(rental._id.toString(), new Date(rental.start_date), total_monthly_amount);

    // Reload rental to get payment records
    const rentalWithPayments = await Rental.findById(rental._id);

    // Send confirmation email
    if (rentalWithPayments) {
      try {
        await sendRentalConfirmation(rentalWithPayments.toObject());
      } catch (emailError) {
        logger.warn('Failed to send rental confirmation email', { error: emailError });
        // Don't fail the request if email fails
      }
    }

    // Track activity
    if (req.userId) {
      await User.findByIdAndUpdate(req.userId, {
        $push: {
          activityLog: {
            action: 'create_rental',
            timestamp: new Date(),
            details: {
              rental_id: rental.rental_id,
              customer_email: customer_email,
              total_amount: total_monthly_amount
            }
          }
        }
      });
    }

    logger.info('Rental created', { rentalId: rental.rental_id, admin: req.userId });

    res.status(201).json({
      success: true,
      message: 'Rental created successfully',
      data: rentalWithPayments || rental
    });
  } catch (error: any) {
    logger.error('Error creating rental:', error);
    res.status(500).json({
      message: 'Error creating rental',
      error: error.message
    });
  }
};

// Generate payment records for a rental - ONLY for months that are due or past
const generatePaymentRecords = async (
  rentalId: string,
  startDate: Date,
  monthlyAmount: number
) => {
  try {
    const rental = await Rental.findById(rentalId);
    if (!rental) return;

    const records: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start generating from the rental start date month (first payment is for the start month)
    const rentalStart = new Date(startDate);
    rentalStart.setHours(0, 0, 0, 0);

    // Get the day of month from start date for consistent due dates
    const dayOfMonth = rentalStart.getDate();

    // First payment month is the same month as rental start
    const firstPaymentMonth = new Date(rentalStart);
    firstPaymentMonth.setDate(1); // Start of the month

    // Calculate current month
    const currentMonth = new Date(today);
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    // Only generate records for months from start month up to current month
    // Plus one month ahead (for the upcoming month that's about to be due)
    const maxMonth = new Date(currentMonth);
    maxMonth.setMonth(maxMonth.getMonth() + 1); // One month ahead

    let paymentMonth = new Date(firstPaymentMonth);
    let monthIndex = 0; // Start from 0 (first month is start month)

    while (paymentMonth <= maxMonth) {
      const year = paymentMonth.getFullYear();
      const month = (paymentMonth.getMonth() + 1).toString().padStart(2, '0');
      const monthKey = `${year}-${month}`;

      // Check if payment record already exists for this month
      const existingRecord = rental.payment_records?.find(
        (r: any) => r.month === monthKey
      );

      if (!existingRecord) {
        // Due date is the same day of the payment month
        // For first month (monthIndex === 0): due date = start date
        // For subsequent months: due date = same day of that month
        let dueDate: Date;
        if (monthIndex === 0) {
          // First payment: due date is the rental start date
          dueDate = new Date(rentalStart);
        } else {
          // Subsequent payments: same day of the payment month
          dueDate = new Date(paymentMonth.getFullYear(), paymentMonth.getMonth(), dayOfMonth);
          
          // Handle edge case: if day doesn't exist in that month (e.g., Jan 31 -> Feb 31), use last day of month
          if (dueDate.getMonth() !== paymentMonth.getMonth()) {
            // Day doesn't exist in this month, use last day of the payment month
            dueDate = new Date(paymentMonth.getFullYear(), paymentMonth.getMonth() + 1, 0);
          }
        }

        // Determine status: if due date has passed and not paid, mark as overdue
        let status = PaymentStatus.PENDING;
        const dueDateCheck = new Date(dueDate);
        dueDateCheck.setHours(0, 0, 0, 0);
        
        // Mark as overdue if due date has passed
        if (dueDateCheck < today) {
          status = PaymentStatus.OVERDUE;
        }

        records.push({
          month: monthKey,
          amount: monthlyAmount,
          dueDate,
          status
        });
      }

      // Move to next month
      paymentMonth.setMonth(paymentMonth.getMonth() + 1);
      monthIndex++;
    }

    // Add new records to existing ones
    if (records.length > 0) {
      if (rental.payment_records && rental.payment_records.length > 0) {
        rental.payment_records = [...rental.payment_records, ...records] as any;
      } else {
        rental.payment_records = records as any;
      }
      await rental.save();
      logger.info('Payment records generated', { rentalId, recordsGenerated: records.length });
    }
  } catch (error) {
    logger.error('Error generating payment records:', error);
  }
};

// Get all rentals (Admin) with filtering
export const getRentals = async (req: Request, res: Response) => {
  try {
    const {
      status,
      customer_email,
      search,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (customer_email) {
      query.customer_email = { $regex: customer_email, $options: 'i' };
    }

    if (search) {
      query.$or = [
        { customer_name: { $regex: search, $options: 'i' } },
        { customer_email: { $regex: search, $options: 'i' } },
        { customer_phone: { $regex: search, $options: 'i' } },
        { rental_id: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Rental.countDocuments(query);

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const rentals = await Rental.find(query)
      .populate('userId', 'fullName email username')
      .populate('createdBy', 'fullName email')
      .populate('updatedBy', 'fullName email')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    // Fix payment months for all rentals
    const fixedRentals = await Promise.all(
      rentals.map(async (rental) => {
        return await fixPaymentMonthForRental(rental);
      })
    );

    res.status(200).json({
      success: true,
      data: fixedRentals,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    logger.error('Error fetching rentals:', error);
    res.status(500).json({
      message: 'Error fetching rentals',
      error: error.message
    });
  }
};

// Get single rental by ID
export const getRentalById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if id is a valid MongoDB ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
    let rental = null;

    if (isValidObjectId) {
      // Try to find by MongoDB _id first
      rental = await Rental.findById(id)
        .populate('userId', 'fullName email username phoneNumber')
        .populate('createdBy', 'fullName email')
        .populate('updatedBy', 'fullName email');
    }

    // If not found by _id, try to find by rental_id
    if (!rental) {
      rental = await Rental.findOne({ rental_id: id })
        .populate('userId', 'fullName email username phoneNumber')
        .populate('createdBy', 'fullName email')
        .populate('updatedBy', 'fullName email');
    }

    if (!rental) {
      return res.status(404).json({
        message: 'Rental not found',
        rentalId: id
      });
    }

    // Fix payment month if needed
    const fixedRental = await fixPaymentMonthForRental(rental);

    res.status(200).json({
      success: true,
      data: fixedRental
    });
  } catch (error: any) {
    logger.error('Error fetching rental:', error);
    res.status(500).json({
      message: 'Error fetching rental',
      error: error.message
    });
  }
};

// Helper function to fix payment months based on rental start date
const fixPaymentMonthForRental = async (rental: any): Promise<any> => {
  if (!rental.start_date || !rental.payment_records || rental.payment_records.length === 0) {
    return rental;
  }

  // Ensure start_date is a proper Date object
  const startDate = new Date(rental.start_date);
  if (isNaN(startDate.getTime())) {
    logger.warn('Invalid start_date for rental', { rental_id: rental.rental_id, start_date: rental.start_date });
    return rental;
  }

  // Normalize to local time (avoid timezone issues)
  const localStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const correctYear = localStartDate.getFullYear();
  const correctMonth = (localStartDate.getMonth() + 1).toString().padStart(2, '0');
  const correctMonthKey = `${correctYear}-${correctMonth}`;

  // Check if first payment month is incorrect
  const firstPayment = rental.payment_records[0];
  if (firstPayment) {
    const currentMonth = firstPayment.month;
    
    // Always log for debugging
    logger.info('Checking payment month for rental', {
      rental_id: rental.rental_id,
      current_month: currentMonth,
      correct_month: correctMonthKey,
      start_date: rental.start_date,
      start_date_iso: startDate.toISOString(),
      start_date_local: localStartDate.toISOString(),
      start_date_month: localStartDate.getMonth() + 1,
      start_date_year: localStartDate.getFullYear()
    });

    if (currentMonth !== correctMonthKey) {
      logger.info('Fixing payment month for rental', {
        rental_id: rental.rental_id,
        old_month: currentMonth,
        correct_month: correctMonthKey,
        start_date: rental.start_date,
        start_date_string: rental.start_date.toString()
      });

      // Fix the first payment month
      firstPayment.month = correctMonthKey;
      
      // Fix dueDate to match start date (same day of the start month)
      const correctDueDate = new Date(localStartDate);
      firstPayment.dueDate = correctDueDate;
      
      // Fix paidDate if payment is marked as paid - use start date
      if (firstPayment.status === 'Paid' || firstPayment.status === PaymentStatus.PAID) {
        // If paidDate exists but is in wrong month, or doesn't exist, set it to start date
        if (!firstPayment.paidDate) {
          firstPayment.paidDate = new Date(localStartDate);
        } else {
          const paidDate = new Date(firstPayment.paidDate);
          const paidDateMonth = (paidDate.getMonth() + 1).toString().padStart(2, '0');
          const paidDateYear = paidDate.getFullYear();
          const paidDateMonthKey = `${paidDateYear}-${paidDateMonth}`;
          
          // If paid date month doesn't match start date month, fix it
          if (paidDateMonthKey !== correctMonthKey) {
            firstPayment.paidDate = new Date(localStartDate);
            logger.info('Fixed paidDate to match start date', {
              rental_id: rental.rental_id,
              old_paidDate: paidDate.toISOString(),
              new_paidDate: localStartDate.toISOString()
            });
          }
        }
      }

      // Mark as modified so Mongoose saves it
      rental.markModified('payment_records');

      // Save the fixed rental
      try {
        const savedRental = await rental.save();
        logger.info('Fixed payment month saved for rental', { 
          rental_id: rental.rental_id,
          old_month: currentMonth,
          new_month: correctMonthKey,
          saved_month: savedRental.payment_records?.[0]?.month,
          saved_dueDate: savedRental.payment_records?.[0]?.dueDate,
          saved_paidDate: savedRental.payment_records?.[0]?.paidDate
        });
      } catch (saveError: any) {
        logger.error('Failed to save fixed payment month', { 
          error: saveError.message,
          stack: saveError.stack,
          rental_id: rental.rental_id 
        });
      }
    } else {
      // Even if month is correct, check if dueDate is wrong
      const dueDate = firstPayment.dueDate ? new Date(firstPayment.dueDate) : null;
      if (dueDate) {
        const dueDateMonth = (dueDate.getMonth() + 1).toString().padStart(2, '0');
        const dueDateYear = dueDate.getFullYear();
        const dueDateMonthKey = `${dueDateYear}-${dueDateMonth}`;
        
        if (dueDateMonthKey !== correctMonthKey) {
          logger.info('Fixing dueDate month for rental', {
            rental_id: rental.rental_id,
            old_dueDate: dueDate.toISOString(),
            correct_month: correctMonthKey
          });
          firstPayment.dueDate = new Date(localStartDate);
          rental.markModified('payment_records');
          try {
            await rental.save();
            logger.info('Fixed dueDate saved for rental', { rental_id: rental.rental_id });
          } catch (saveError: any) {
            logger.warn('Failed to save fixed dueDate', { error: saveError.message });
          }
        }
      }
    }
  }

  return rental;
};

// Get user's own rentals
export const getMyRentals = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const rentals = await Rental.find({ userId: req.userId })
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });

    // Fix payment months and enhance rentals with payment summary
    const enhancedRentals = await Promise.all(
      rentals.map(async (rental) => {
        // Fix payment month if needed
        const fixedRental = await fixPaymentMonthForRental(rental);
        
        const paymentRecords = fixedRental.payment_records || [];
        const pendingPayments = paymentRecords.filter((p: any) => p.status === PaymentStatus.PENDING);
        const overduePayments = paymentRecords.filter((p: any) => p.status === PaymentStatus.OVERDUE);
        const paidPayments = paymentRecords.filter((p: any) => p.status === PaymentStatus.PAID);
        
        const totalPending = pendingPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        const totalOverdue = overduePayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        const totalPaid = paidPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

        return {
          ...fixedRental.toObject(),
          payment_summary: {
            monthly_rent: fixedRental.total_monthly_amount,
            total_pending: totalPending,
            total_overdue: totalOverdue,
            total_paid: totalPaid,
            pending_count: pendingPayments.length,
            overdue_count: overduePayments.length,
            paid_count: paidPayments.length,
            pending_months: pendingPayments.map((p: any) => p.month),
            overdue_months: overduePayments.map((p: any) => p.month)
          }
        };
      })
    );

    res.status(200).json({
      success: true,
      data: enhancedRentals
    });
  } catch (error: any) {
    logger.error('Error fetching user rentals:', error);
    res.status(500).json({
      message: 'Error fetching rentals',
      error: error.message
    });
  }
};

// Get pending and overdue payments only (User)
export const getPendingOverduePayments = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const rentals = await Rental.find({ 
      userId: req.userId,
      status: RentalStatus.ACTIVE
    })
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });

    const pendingOverduePayments: any[] = [];

    rentals.forEach(rental => {
      const paymentRecords = rental.payment_records || [];
      const pending = paymentRecords.filter((p: any) => p.status === PaymentStatus.PENDING);
      const overdue = paymentRecords.filter((p: any) => p.status === PaymentStatus.OVERDUE);

      if (pending.length > 0 || overdue.length > 0) {
        pendingOverduePayments.push({
          rental_id: rental.rental_id,
          rental_items: rental.items.map((item: any) => item.product_name).join(', '),
          monthly_rent: rental.total_monthly_amount,
          pending_payments: pending.map((p: any) => ({
            month: p.month,
            amount: p.amount,
            dueDate: p.dueDate,
            status: p.status
          })),
          overdue_payments: overdue.map((p: any) => ({
            month: p.month,
            amount: p.amount,
            dueDate: p.dueDate,
            status: p.status,
            daysOverdue: Math.floor((new Date().getTime() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24))
          })),
          total_pending: pending.reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
          total_overdue: overdue.reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
          total_due: pending.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) + 
                     overdue.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
        });
      }
    });

    res.status(200).json({
      success: true,
      data: pendingOverduePayments,
      summary: {
        total_rentals_with_due: pendingOverduePayments.length,
        total_pending_amount: pendingOverduePayments.reduce((sum, r) => sum + r.total_pending, 0),
        total_overdue_amount: pendingOverduePayments.reduce((sum, r) => sum + r.total_overdue, 0),
        total_due_amount: pendingOverduePayments.reduce((sum, r) => sum + r.total_due, 0)
      }
    });
  } catch (error: any) {
    logger.error('Error fetching pending/overdue payments:', error);
    res.status(500).json({
      message: 'Error fetching payments',
      error: error.message
    });
  }
};

// Update rental (Admin)
export const updateRental = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid rental ID format'
      });
    }

    const oldRental = await Rental.findById(id);
    if (!oldRental) {
      return res.status(404).json({
        message: 'Rental not found',
        rentalId: id
      });
    }

    // If items are updated, recalculate totals
    if (updateData.items && Array.isArray(updateData.items)) {
      updateData.total_monthly_amount = updateData.items.reduce(
        (sum: number, item: any) => sum + (item.monthly_price * (item.quantity || 1)),
        0
      );
      updateData.total_deposit = updateData.items.reduce(
        (sum: number, item: any) => sum + (item.deposit || 0),
        0
      );
    }

    // If email is updated, try to link to user
    if (updateData.customer_email && updateData.customer_email !== oldRental.customer_email) {
      const userId = await linkRentalToUser(updateData.customer_email);
      if (userId) {
        updateData.userId = userId;
      }
    }

    updateData.updatedBy = req.userId;

    const rental = await Rental.findByIdAndUpdate(
      oldRental._id,
      { $set: updateData },
      { new: true }
    )
      .populate('userId', 'fullName email username')
      .populate('createdBy', 'fullName email')
      .populate('updatedBy', 'fullName email');

    if (!rental) {
      return res.status(404).json({
        message: 'Rental not found after update'
      });
    }

    // Send status update email if status changed
    if (updateData.status && oldRental.status !== updateData.status) {
      try {
        await sendRentalStatusUpdate(rental.toObject(), oldRental.status, updateData.status);
      } catch (emailError) {
        logger.warn('Failed to send rental status update email', { error: emailError });
      }
    }

    // Track activity
    if (req.userId) {
      await User.findByIdAndUpdate(req.userId, {
        $push: {
          activityLog: {
            action: 'update_rental',
            timestamp: new Date(),
            details: {
              rental_id: rental.rental_id,
              updated_fields: Object.keys(updateData)
            }
          }
        }
      });
    }

    logger.info('Rental updated', { rentalId: rental.rental_id, admin: req.userId });

    res.status(200).json({
      success: true,
      message: 'Rental updated successfully',
      data: rental
    });
  } catch (error: any) {
    logger.error('Error updating rental:', error);
    res.status(500).json({
      message: 'Error updating rental',
      error: error.message
    });
  }
};

// Add payment record (Admin)
export const addPaymentRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { month, amount, dueDate, paidDate, status, paymentMethod, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid rental ID format'
      });
    }

    const rental = await Rental.findById(id);
    if (!rental) {
      return res.status(404).json({
        message: 'Rental not found',
        rentalId: id
      });
    }

    const paymentRecord = {
      month: month || new Date().toISOString().slice(0, 7), // Default to current month
      amount: amount || rental.total_monthly_amount,
      dueDate: dueDate ? new Date(dueDate) : new Date(),
      paidDate: paidDate ? new Date(paidDate) : undefined,
      status: status || PaymentStatus.PENDING,
      paymentMethod,
      notes
    };

    rental.payment_records.push(paymentRecord as any);
    await rental.save();

    // Track activity
    if (req.userId) {
      await User.findByIdAndUpdate(req.userId, {
        $push: {
          activityLog: {
            action: 'add_payment_record',
            timestamp: new Date(),
            details: {
              rental_id: rental.rental_id,
              month: paymentRecord.month,
              amount: paymentRecord.amount
            }
          }
        }
      });
    }

    logger.info('Payment record added', { rentalId: rental.rental_id, month: paymentRecord.month });

    res.status(200).json({
      success: true,
      message: 'Payment record added successfully',
      data: rental
    });
  } catch (error: any) {
    logger.error('Error adding payment record:', error);
    res.status(500).json({
      message: 'Error adding payment record',
      error: error.message
    });
  }
};

// Update payment record (Admin)
export const updatePaymentRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { id, paymentId } = req.params;
    const { amount, dueDate, paidDate, status, paymentMethod, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid rental ID format'
      });
    }

    const rental = await Rental.findById(id);
    if (!rental) {
      return res.status(404).json({
        message: 'Rental not found',
        rentalId: id
      });
    }

    const paymentIndex = rental.payment_records.findIndex(
      (p: any) => p._id.toString() === paymentId
    );

    if (paymentIndex === -1) {
      return res.status(404).json({
        message: 'Payment record not found',
        paymentId
      });
    }

    const oldPaymentStatus = rental.payment_records[paymentIndex].status;
    const oldPaidDate = rental.payment_records[paymentIndex].paidDate;

    // Update payment record
    if (amount !== undefined) rental.payment_records[paymentIndex].amount = amount;
    if (dueDate) rental.payment_records[paymentIndex].dueDate = new Date(dueDate);
    if (paidDate !== undefined) {
      rental.payment_records[paymentIndex].paidDate = paidDate ? new Date(paidDate) : undefined;
    }
    if (status) rental.payment_records[paymentIndex].status = status;
    if (paymentMethod !== undefined) rental.payment_records[paymentIndex].paymentMethod = paymentMethod;
    if (notes !== undefined) rental.payment_records[paymentIndex].notes = notes;

    await rental.save();

    // Send payment confirmation email if status changed to Paid
    if (status === PaymentStatus.PAID && oldPaymentStatus !== PaymentStatus.PAID) {
      try {
        await sendPaymentConfirmation(rental.toObject(), rental.payment_records[paymentIndex].toObject());
      } catch (emailError) {
        logger.warn('Failed to send payment confirmation email', { error: emailError });
      }
    }

    // Track activity
    if (req.userId) {
      await User.findByIdAndUpdate(req.userId, {
        $push: {
          activityLog: {
            action: 'update_payment_record',
            timestamp: new Date(),
            details: {
              rental_id: rental.rental_id,
              payment_id: paymentId,
              status: status || rental.payment_records[paymentIndex].status
            }
          }
        }
      });
    }

    logger.info('Payment record updated', { rentalId: rental.rental_id, paymentId });

    res.status(200).json({
      success: true,
      message: 'Payment record updated successfully',
      data: rental
    });
  } catch (error: any) {
    logger.error('Error updating payment record:', error);
    res.status(500).json({
      message: 'Error updating payment record',
      error: error.message
    });
  }
};

// Generate payment records for months that are due (Admin) - Automatic and systematic
export const generatePayments = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid rental ID format'
      });
    }

    const rental = await Rental.findById(id);
    if (!rental) {
      return res.status(404).json({
        message: 'Rental not found',
        rentalId: id
      });
    }

    // Automatically generate records for months that are due or past
    await generatePaymentRecords(id, rental.start_date, rental.total_monthly_amount);

    const updatedRental = await Rental.findById(id);

    // Track activity
    if (req.userId) {
      await User.findByIdAndUpdate(req.userId, {
        $push: {
          activityLog: {
            action: 'generate_payment_records',
            timestamp: new Date(),
            details: {
              rental_id: rental.rental_id,
              message: 'Automatic payment records generated for due months'
            }
          }
        }
      });
    }

    logger.info('Payment records generated automatically', { rentalId: rental.rental_id });

    res.status(200).json({
      success: true,
      message: 'Payment records generated automatically for due months',
      data: updatedRental
    });
  } catch (error: any) {
    logger.error('Error generating payment records:', error);
    res.status(500).json({
      message: 'Error generating payment records',
      error: error.message
    });
  }
};

// Send payment reminders for a rental (Admin)
export const sendPaymentReminders = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentLink } = req.body; // Optional Razorpay payment link

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid rental ID format'
      });
    }

    const rental = await Rental.findById(id);
    if (!rental) {
      return res.status(404).json({
        message: 'Rental not found'
      });
    }

    if (rental.status !== RentalStatus.ACTIVE) {
      return res.status(400).json({
        message: 'Rental is not active',
        last_reminder_sent_at: rental.last_reminder_sent_at || null
      });
    }

    // Get pending and overdue payments
    const paymentRecords = rental.payment_records || [];
    const pendingPayments = paymentRecords.filter((p: any) => p.status === PaymentStatus.PENDING);
    const overduePayments = paymentRecords.filter((p: any) => p.status === PaymentStatus.OVERDUE);

    if (pendingPayments.length === 0 && overduePayments.length === 0) {
      return res.status(400).json({
        message: 'No pending or overdue payments found',
        last_reminder_sent_at: rental.last_reminder_sent_at || null
      });
    }

    // Check if reminder was sent within last 24 hours
    const now = new Date();
    const lastReminderSent = rental.last_reminder_sent_at;
    
    if (lastReminderSent) {
      const timeSinceLastReminder = now.getTime() - lastReminderSent.getTime();
      const hoursSinceLastReminder = timeSinceLastReminder / (1000 * 60 * 60);
      
      if (hoursSinceLastReminder < 24) {
        const hoursRemaining = 24 - hoursSinceLastReminder;
        const minutesRemaining = Math.ceil(hoursRemaining * 60);
        
        return res.status(429).json({
          success: false,
          message: `Reminder was recently sent. Please wait ${Math.ceil(hoursRemaining)} hour(s) before sending another reminder.`,
          data: {
            rental_id: rental.rental_id,
            last_reminder_sent_at: lastReminderSent,
            hours_remaining: Math.ceil(hoursRemaining),
            minutes_remaining: minutesRemaining,
            can_send_after: new Date(lastReminderSent.getTime() + 24 * 60 * 60 * 1000)
          }
        });
      }
    }

    // Send comprehensive email
    const { sendComprehensivePaymentReminder } = await import('../utils/email');
    await sendComprehensivePaymentReminder(
      rental.toObject(),
      pendingPayments,
      overduePayments,
      paymentLink
    );

    // Update last reminder sent timestamp
    rental.last_reminder_sent_at = now;
    await rental.save();

    logger.info('Comprehensive payment reminder sent', { 
      rentalId: rental.rental_id, 
      admin: req.userId,
      pendingCount: pendingPayments.length,
      overdueCount: overduePayments.length,
      lastReminderSentAt: now
    });

    res.status(200).json({
      success: true,
      message: 'Payment reminder email sent successfully',
      data: {
        rental_id: rental.rental_id,
        pending_count: pendingPayments.length,
        overdue_count: overduePayments.length,
        total_pending: pendingPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
        total_overdue: overduePayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
        last_reminder_sent_at: now
      }
    });
  } catch (error: any) {
    logger.error('Error sending payment reminders:', error);
    res.status(500).json({
      message: 'Error sending payment reminders',
      error: error.message
    });
  }
};

// Admin Dashboard - Rental Statistics
export const getRentalDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Get all active rentals
    const activeRentals = await Rental.find({ status: RentalStatus.ACTIVE });
    
    // Calculate statistics
    let totalRentedItems = 0;
    let totalMonthlyRevenue = 0;
    let totalDeposits = 0;
    let totalPendingAmount = 0;
    let totalOverdueAmount = 0;
    let totalPaidAmount = 0;
    const monthlyPayments: Record<string, { month: string; total: number; count: number }> = {};
    const duesBreakdown: any[] = [];

    activeRentals.forEach(rental => {
      try {
        // Count rented items
        if (rental.items && Array.isArray(rental.items)) {
          totalRentedItems += rental.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
        }
        
        // Monthly revenue (potential)
        if (rental.total_monthly_amount) {
          totalMonthlyRevenue += Number(rental.total_monthly_amount) || 0;
        }
        if (rental.total_deposit) {
          totalDeposits += Number(rental.total_deposit) || 0;
        }

        // Payment records analysis
        const paymentRecords = rental.payment_records || [];
        
        paymentRecords.forEach((payment: any) => {
          try {
            // Skip if payment is missing required fields
            if (!payment || !payment.month || payment.amount === undefined || payment.amount === null) {
              return;
            }

            const month = String(payment.month);
            const amount = Number(payment.amount) || 0;
            const paymentStatus = String(payment.status || PaymentStatus.PENDING);
            
            // Monthly collection tracking
            if (!monthlyPayments[month]) {
              monthlyPayments[month] = {
                month,
                total: 0,
                count: 0
              };
            }

            if (paymentStatus === PaymentStatus.PAID || paymentStatus === 'Paid') {
              monthlyPayments[month].total += amount;
              monthlyPayments[month].count += 1;
              totalPaidAmount += amount;
            } else if (paymentStatus === PaymentStatus.PENDING || paymentStatus === 'Pending') {
              totalPendingAmount += amount;
              
              // Add to dues breakdown
              duesBreakdown.push({
                rental_id: rental.rental_id || 'N/A',
                customer_name: rental.customer_name || 'N/A',
                customer_email: rental.customer_email || 'N/A',
                customer_phone: rental.customer_phone || 'N/A',
                month: month,
                amount: amount,
                dueDate: payment.dueDate || new Date(),
                status: 'Pending',
                items: (rental.items || []).map((item: any) => ({
                  product_name: item.product_name || 'N/A',
                  quantity: item.quantity || 1,
                  monthly_price: item.monthly_price || 0
                })),
                monthly_rent: rental.total_monthly_amount || 0
              });
            } else if (paymentStatus === PaymentStatus.OVERDUE || paymentStatus === 'Overdue') {
              totalOverdueAmount += amount;
              
              // Add to dues breakdown
              const dueDate = payment.dueDate ? new Date(payment.dueDate) : new Date();
              const daysOverdue = Math.floor(
                (new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
              );
              
              duesBreakdown.push({
                rental_id: rental.rental_id || 'N/A',
                customer_name: rental.customer_name || 'N/A',
                customer_email: rental.customer_email || 'N/A',
                customer_phone: rental.customer_phone || 'N/A',
                month: month,
                amount: amount,
                dueDate: dueDate,
                status: 'Overdue',
                daysOverdue,
                items: (rental.items || []).map((item: any) => ({
                  product_name: item.product_name || 'N/A',
                  quantity: item.quantity || 1,
                  monthly_price: item.monthly_price || 0
                })),
                monthly_rent: rental.total_monthly_amount || 0
              });
            }
          } catch (paymentError: any) {
            logger.warn('Error processing payment record:', {
              error: paymentError.message,
              rental_id: rental.rental_id,
              payment: payment
            });
          }
        });
      } catch (rentalError: any) {
        logger.warn('Error processing rental:', {
          error: rentalError.message,
          rental_id: rental.rental_id
        });
      }
    });

    // Convert monthly payments to array and sort
    const monthlyPaymentsArray = Object.values(monthlyPayments)
      .sort((a, b) => a.month.localeCompare(b.month));

    // Group dues by customer
    const duesByCustomer: Record<string, any> = {};
    duesBreakdown.forEach(due => {
      try {
        const key = due.customer_email || 'unknown';
        if (!duesByCustomer[key]) {
          duesByCustomer[key] = {
            customer_name: due.customer_name || 'N/A',
            customer_email: due.customer_email || 'N/A',
            customer_phone: due.customer_phone || 'N/A',
            rental_id: due.rental_id || 'N/A',
            items: due.items || [],
            monthly_rent: due.monthly_rent || 0,
            pending_months: [],
            overdue_months: [],
            total_pending: 0,
            total_overdue: 0,
            total_due: 0
          };
        }
        
        const amount = Number(due.amount) || 0;
        
        if (due.status === 'Pending') {
          duesByCustomer[key].pending_months.push({
            month: due.month,
            amount: amount,
            dueDate: due.dueDate
          });
          duesByCustomer[key].total_pending += amount;
        } else {
          duesByCustomer[key].overdue_months.push({
            month: due.month,
            amount: amount,
            dueDate: due.dueDate,
            daysOverdue: due.daysOverdue || 0
          });
          duesByCustomer[key].total_overdue += amount;
        }
        
        duesByCustomer[key].total_due = 
          duesByCustomer[key].total_pending + duesByCustomer[key].total_overdue;
      } catch (error: any) {
        logger.warn('Error grouping dues by customer:', { error: error.message, due });
      }
    });

    const duesByCustomerArray = Object.values(duesByCustomer);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total_rented_items: totalRentedItems,
          total_active_rentals: activeRentals.length,
          total_monthly_revenue: totalMonthlyRevenue,
          total_deposits: totalDeposits,
          total_pending_amount: totalPendingAmount,
          total_overdue_amount: totalOverdueAmount,
          total_paid_amount: totalPaidAmount,
          total_due_amount: totalPendingAmount + totalOverdueAmount,
          pending_count: duesBreakdown.filter(d => d.status === 'Pending').length,
          overdue_count: duesBreakdown.filter(d => d.status === 'Overdue').length
        },
        monthly_payments: monthlyPaymentsArray,
        dues_breakdown: {
          total_dues: duesBreakdown.length,
          total_amount: totalPendingAmount + totalOverdueAmount,
          by_customer: duesByCustomerArray,
          all_dues: duesBreakdown.sort((a, b) => {
            // Sort by status (overdue first), then by due date
            if (a.status !== b.status) {
              return a.status === 'Overdue' ? -1 : 1;
            }
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          })
        },
        monthly_collection: monthlyPaymentsArray.map(mp => {
          try {
            const monthDate = new Date(mp.month + '-01');
            return {
              month: mp.month,
              month_name: monthDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
              total_collected: mp.total || 0,
              payments_count: mp.count || 0,
              average_payment: mp.count > 0 ? (mp.total || 0) / mp.count : 0
            };
          } catch (error: any) {
            logger.warn('Error formatting monthly collection:', { error: error.message, mp });
            return {
              month: mp.month,
              month_name: mp.month,
              total_collected: mp.total || 0,
              payments_count: mp.count || 0,
              average_payment: 0
            };
          }
        })
      }
    });
  } catch (error: any) {
    logger.error('Error fetching rental dashboard:', error);
    res.status(500).json({
      message: 'Error fetching rental dashboard',
      error: error.message
    });
  }
};

// Get detailed dues breakdown (Admin)
export const getDuesBreakdown = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { status, month, customer_email } = req.query;

    const activeRentals = await Rental.find({ status: RentalStatus.ACTIVE });
    const duesBreakdown: any[] = [];

    activeRentals.forEach(rental => {
      const paymentRecords = rental.payment_records || [];
      
      paymentRecords.forEach((payment: any) => {
        if (payment.status === PaymentStatus.PENDING || payment.status === PaymentStatus.OVERDUE) {
          // Apply filters
          if (status && payment.status !== status) return;
          if (month && payment.month !== month) return;
          if (customer_email && rental.customer_email.toLowerCase() !== (customer_email as string).toLowerCase()) return;

          const daysOverdue = payment.status === PaymentStatus.OVERDUE
            ? Math.floor((new Date().getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24))
            : null;

          duesBreakdown.push({
            rental_id: rental.rental_id,
            customer_name: rental.customer_name,
            customer_email: rental.customer_email,
            customer_phone: rental.customer_phone,
            customer_address: rental.customer_address,
            month: payment.month,
            month_name: new Date(payment.month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' }),
            amount: payment.amount,
            dueDate: payment.dueDate,
            status: payment.status,
            daysOverdue,
            items: rental.items.map((item: any) => ({
              product_name: item.product_name,
              product_type: item.product_type,
              quantity: item.quantity || 1,
              monthly_price: item.monthly_price,
              deposit: item.deposit || 0
            })),
            monthly_rent: rental.total_monthly_amount,
            rental_start_date: rental.start_date,
            rental_end_date: rental.end_date
          });
        }
      });
    });

    // Sort: Overdue first, then by due date
    duesBreakdown.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'Overdue' ? -1 : 1;
      }
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    res.status(200).json({
      success: true,
      data: {
        total_dues: duesBreakdown.length,
        total_amount: duesBreakdown.reduce((sum, d) => sum + d.amount, 0),
        pending_count: duesBreakdown.filter(d => d.status === 'Pending').length,
        overdue_count: duesBreakdown.filter(d => d.status === 'Overdue').length,
        dues: duesBreakdown
      }
    });
  } catch (error: any) {
    logger.error('Error fetching dues breakdown:', error);
    res.status(500).json({
      message: 'Error fetching dues breakdown',
      error: error.message
    });
  }
};

// Get monthly collection records (Admin)
export const getMonthlyCollection = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { month, year } = req.query;

    const activeRentals = await Rental.find({ status: RentalStatus.ACTIVE });
    const monthlyCollection: Record<string, any> = {};

    activeRentals.forEach(rental => {
      const paymentRecords = rental.payment_records || [];
      
      paymentRecords.forEach((payment: any) => {
        try {
          const paymentStatus = String(payment.status || PaymentStatus.PENDING);
          if (paymentStatus === PaymentStatus.PAID || paymentStatus === 'Paid') {
            const paymentMonth = String(payment.month || '');
            
            if (!paymentMonth) return;
            
            // Filter by month/year if provided
            if (month && paymentMonth !== month) return;
            if (year && !paymentMonth.startsWith(year as string)) return;

            if (!monthlyCollection[paymentMonth]) {
              monthlyCollection[paymentMonth] = {
                month: paymentMonth,
                month_name: new Date(paymentMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' }),
                total_collected: 0,
                payments: [],
                customers_count: new Set(),
                rentals_count: new Set()
              };
            }

            const amount = Number(payment.amount) || 0;
            monthlyCollection[paymentMonth].total_collected += amount;
            monthlyCollection[paymentMonth].payments.push({
              rental_id: rental.rental_id || 'N/A',
              customer_name: rental.customer_name || 'N/A',
              customer_email: rental.customer_email || 'N/A',
              customer_phone: rental.customer_phone || 'N/A',
              amount: amount,
              paidDate: payment.paidDate || payment.paid_date,
              paymentMethod: payment.paymentMethod || payment.payment_method || 'N/A',
              items: (rental.items || []).map((item: any) => ({
                product_name: item.product_name || 'N/A',
                monthly_price: item.monthly_price || 0,
                quantity: item.quantity || 1
              }))
            });
            
            monthlyCollection[paymentMonth].customers_count.add(rental.customer_email || 'unknown');
            monthlyCollection[paymentMonth].rentals_count.add(rental.rental_id || 'unknown');
          }
        } catch (paymentError: any) {
          logger.warn('Error processing payment in monthly collection:', {
            error: paymentError.message,
            rental_id: rental.rental_id,
            payment
          });
        }
      });
    });

    // Convert to array and add counts
    const monthlyCollectionArray = Object.values(monthlyCollection).map((mc: any) => ({
      ...mc,
      customers_count: mc.customers_count.size,
      rentals_count: mc.rentals_count.size,
      payments_count: mc.payments.length,
      average_payment: mc.payments.length > 0 ? mc.total_collected / mc.payments.length : 0
    })).sort((a: any, b: any) => a.month.localeCompare(b.month));

    res.status(200).json({
      success: true,
      data: {
        monthly_collection: monthlyCollectionArray,
        summary: {
          total_months: monthlyCollectionArray.length,
          total_collected: monthlyCollectionArray.reduce((sum: number, mc: any) => sum + mc.total_collected, 0),
          average_monthly: monthlyCollectionArray.length > 0
            ? monthlyCollectionArray.reduce((sum: number, mc: any) => sum + mc.total_collected, 0) / monthlyCollectionArray.length
            : 0
        }
      }
    });
  } catch (error: any) {
    logger.error('Error fetching monthly collection:', error);
    res.status(500).json({
      message: 'Error fetching monthly collection',
      error: error.message
    });
  }
};

// Get monthly collection details for a specific month (clickable tab)
export const getMonthlyCollectionDetails = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { month } = req.params; // e.g., "2025-11"

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        message: 'Invalid month format. Expected format: YYYY-MM (e.g., 2025-11)'
      });
    }

    const activeRentals = await Rental.find({ status: RentalStatus.ACTIVE });
    const payments: any[] = [];

    activeRentals.forEach(rental => {
      const paymentRecords = rental.payment_records || [];
      
      paymentRecords.forEach((payment: any) => {
        try {
          const paymentStatus = String(payment.status || PaymentStatus.PENDING);
          const paymentMonth = String(payment.month || '');
          
          if ((paymentStatus === PaymentStatus.PAID || paymentStatus === 'Paid') && paymentMonth === month) {
            payments.push({
              rental_id: rental.rental_id || 'N/A',
              customer_name: rental.customer_name || 'N/A',
              customer_email: rental.customer_email || 'N/A',
              customer_phone: rental.customer_phone || 'N/A',
              customer_address: rental.customer_address || {},
              amount: Number(payment.amount) || 0,
              paidDate: payment.paidDate || payment.paid_date,
              paymentMethod: payment.paymentMethod || payment.payment_method || 'N/A',
              notes: payment.notes || '',
              items: (rental.items || []).map((item: any) => ({
                product_name: item.product_name || 'N/A',
                product_type: item.product_type || 'N/A',
                quantity: item.quantity || 1,
                monthly_price: item.monthly_price || 0,
                deposit: item.deposit || 0
              })),
              monthly_rent: rental.total_monthly_amount || 0,
              rental_start_date: rental.start_date,
              rental_end_date: rental.end_date
            });
          }
        } catch (paymentError: any) {
          logger.warn('Error processing payment in monthly details:', {
            error: paymentError.message,
            rental_id: rental.rental_id,
            payment
          });
        }
      });
    });

    // Sort by paid date (most recent first)
    payments.sort((a, b) => {
      const dateA = a.paidDate ? new Date(a.paidDate).getTime() : 0;
      const dateB = b.paidDate ? new Date(b.paidDate).getTime() : 0;
      return dateB - dateA;
    });

    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    const monthDate = new Date(month + '-01');
    const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    res.status(200).json({
      success: true,
      data: {
        month: month,
        month_name: monthName,
        total_collected: totalCollected,
        payments_count: payments.length,
        customers_count: new Set(payments.map(p => p.customer_email)).size,
        rentals_count: new Set(payments.map(p => p.rental_id)).size,
        average_payment: payments.length > 0 ? totalCollected / payments.length : 0,
        payments: payments
      }
    });
  } catch (error: any) {
    logger.error('Error fetching monthly collection details:', error);
    res.status(500).json({
      message: 'Error fetching monthly collection details',
      error: error.message
    });
  }
};

// Delete rental (Admin)
export const deleteRental = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid rental ID format'
      });
    }

    const rental = await Rental.findById(id);
    if (!rental) {
      return res.status(404).json({
        message: 'Rental not found',
        rentalId: id
      });
    }

    await Rental.findByIdAndDelete(id);

    // Track activity
    if (req.userId) {
      await User.findByIdAndUpdate(req.userId, {
        $push: {
          activityLog: {
            action: 'delete_rental',
            timestamp: new Date(),
            details: {
              rental_id: rental.rental_id
            }
          }
        }
      });
    }

    logger.info('Rental deleted', { rentalId: rental.rental_id, admin: req.userId });

    res.status(200).json({
      success: true,
      message: 'Rental deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting rental:', error);
    res.status(500).json({
      message: 'Error deleting rental',
      error: error.message
    });
  }
};

