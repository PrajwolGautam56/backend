import { Request, Response } from 'express';
import FurnitureForm, { FurnitureFormStatus } from '../models/FurnitureForm';
import { AuthRequest } from '../interfaces/Request';
import Furniture from '../models/Furniture';
import User from '../models/User';
import Rental, { RentalStatus } from '../models/Rental';
import logger from '../utils/logger';
import mongoose from 'mongoose';
import {
  sendFurnitureRequestConfirmation,
  sendFurnitureStatusUpdate
} from '../utils/email';
import { sendEmailInBackground } from '../utils/emailDispatcher';

/**
 * Create rental record when furniture is delivered (for Rent listings)
 * Note: Same person can rent same product multiple times, so we don't check for duplicates
 */
const createRentalFromFurnitureDelivery = async (furnitureForm: any, adminUserId?: string) => {
  try {
    // Get furniture details
    const furniture = await Furniture.findOne({ furniture_id: furnitureForm.furniture_id });
    if (!furniture) {
      logger.warn('Furniture not found for rental creation', { furniture_id: furnitureForm.furniture_id });
      return;
    }

    // Link to user if email matches
    let userId: mongoose.Types.ObjectId | null = null;
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${furnitureForm.email}$`, 'i') }
    });
    if (user) {
      userId = user._id;
    }

    // Generate rental_id
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const crypto = require('crypto');
    const randomString = crypto.randomBytes(3).toString('hex').toUpperCase();
    const rental_id = `RENT-${year}-${month}${day}-${randomString}`;

    // Calculate rental amounts
    const monthlyPrice = (furniture.price as any)?.rent_monthly || 0;
    const deposit = (furniture.price as any)?.deposit || 0;

    // Create rental items
    const items = [{
      product_id: furniture.furniture_id,
      product_name: furniture.name,
      product_type: furniture.category || 'Furniture',
      quantity: 1,
      monthly_price: monthlyPrice,
      deposit: deposit,
      start_date: new Date(),
      end_date: furnitureForm.scheduled_delivery_date ? new Date(furnitureForm.scheduled_delivery_date) : undefined
    }];

    // Use delivery date (updatedAt when status changed to Delivered) or current date
    const deliveryDate = furnitureForm.updatedAt || new Date();
    const rentalStartDate = new Date(deliveryDate);
    rentalStartDate.setHours(0, 0, 0, 0);
    
    // Log for debugging
    logger.info('Creating rental from furniture delivery', {
      deliveryDate: deliveryDate,
      rentalStartDate: rentalStartDate,
      deliveryMonth: rentalStartDate.getMonth() + 1,
      deliveryYear: rentalStartDate.getFullYear()
    });

    // Create rental record using native MongoDB driver
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not ready');
    }

    const rentalsCollection = db.collection('rentals');
    const rentalData = {
      rental_id,
      customer_name: furnitureForm.name,
      customer_email: furnitureForm.email,
      customer_phone: furnitureForm.phoneNumber,
      customer_address: {},
      userId: userId || undefined,
      items,
      total_monthly_amount: monthlyPrice,
      total_deposit: deposit,
      start_date: rentalStartDate,
      status: RentalStatus.ACTIVE,
      payment_records: [],
      notes: `Auto-created from furniture delivery. Furniture ID: ${furniture.furniture_id}, Furniture Form ID: ${furnitureForm._id}`,
      createdBy: adminUserId ? new mongoose.Types.ObjectId(adminUserId) : undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await rentalsCollection.insertOne(rentalData);
    const rental = await rentalsCollection.findOne({ _id: result.insertedId });

    if (rental) {
      // Generate payment records and mark first month as paid
      const RentalModel = mongoose.model('Rental');
      const rentalDoc = await RentalModel.findById(rental._id);
      
      if (rentalDoc) {
        // First payment is for the delivery month (same month as delivery)
        // Payment month = month when furniture was delivered
        // IMPORTANT: Use rentalStartDate directly to get the correct month
        const year = rentalStartDate.getFullYear();
        const month = (rentalStartDate.getMonth() + 1).toString().padStart(2, '0');
        const monthKey = `${year}-${month}`;

        // Get the day of month from delivery date for consistent due dates
        const dayOfMonth = rentalStartDate.getDate();

        // First payment due date is the delivery date itself (same day of delivery month)
        const firstPaymentDueDate = new Date(rentalStartDate);

        // Determine payment status based on furniture form payment_status
        // If payment_status is 'Paid', mark as paid; otherwise mark as 'Pending'
        const paymentStatus = furnitureForm.payment_status === 'Paid' ? 'Paid' : 'Pending';
        const paidDate = paymentStatus === 'Paid' ? rentalStartDate : undefined;

        // Create first payment record for the delivery month
        const firstPayment = {
          month: monthKey,
          amount: monthlyPrice,
          dueDate: firstPaymentDueDate, // Due date = delivery date (1st month payment)
          paidDate: paidDate, // Payment date only if paid
          status: paymentStatus, // 'Paid' if payment_status is 'Paid', else 'Pending'
          paymentMethod: paymentStatus === 'Paid' ? 'Initial Payment' : undefined,
          notes: paymentStatus === 'Paid' 
            ? 'First month payment - furniture delivery (paid)' 
            : 'First month payment - furniture delivery (pending)'
        };

        logger.info('Creating first payment record', {
          monthKey,
          year,
          month,
          rentalStartDate: rentalStartDate.toISOString(),
          firstPaymentDueDate: firstPaymentDueDate.toISOString()
        });

        rentalDoc.payment_records = [firstPayment as any];
        await rentalDoc.save();

        logger.info('Rental created from furniture delivery', {
          rental_id,
          furnitureFormId: furnitureForm._id,
          furniture_id: furniture.furniture_id
        });
      }
    }
  } catch (error: any) {
    logger.error('Error creating rental from furniture delivery', {
      error: error.message,
      furnitureFormId: furnitureForm._id
    });
    throw error;
  }
};

/**
 * Normalize status value from frontend to backend enum value
 * Maps common frontend status values to valid enum values
 */
const normalizeStatus = (status: string, listingType?: string): FurnitureFormStatus | null => {
  if (!status) return null;
  
  const normalized = status.trim();
  const lowerStatus = normalized.toLowerCase();
  
  // Map frontend-friendly values to enum values
  const statusMap: Record<string, FurnitureFormStatus> = {
    'ordered': FurnitureFormStatus.ORDERED,
    'order': FurnitureFormStatus.ORDERED,
    'requested': FurnitureFormStatus.REQUESTED,
    'request': FurnitureFormStatus.REQUESTED,
    'confirm': FurnitureFormStatus.CONFIRMED,
    'confirmed': FurnitureFormStatus.CONFIRMED,
    'scheduled': FurnitureFormStatus.SCHEDULED_DELIVERY,
    'scheduled delivery': FurnitureFormStatus.SCHEDULED_DELIVERY,
    'scheduled_delivery': FurnitureFormStatus.SCHEDULED_DELIVERY,
    'out for delivery': FurnitureFormStatus.OUT_FOR_DELIVERY,
    'out_for_delivery': FurnitureFormStatus.OUT_FOR_DELIVERY,
    'outfordelivery': FurnitureFormStatus.OUT_FOR_DELIVERY,
    'delivered': FurnitureFormStatus.DELIVERED,
    'deliver': FurnitureFormStatus.DELIVERED,
    'reject': FurnitureFormStatus.CANCELLED,
    'rejected': FurnitureFormStatus.CANCELLED,
    'cancel': FurnitureFormStatus.CANCELLED,
    'cancelled': FurnitureFormStatus.CANCELLED
  };
  
  // Check if it's a mapped value
  if (statusMap[lowerStatus]) {
    return statusMap[lowerStatus];
  }
  
  // Check if it's already a valid enum value (case-insensitive)
  const validStatuses = Object.values(FurnitureFormStatus);
  const matchingStatus = validStatuses.find(
    s => s.toLowerCase() === lowerStatus
  );
  
  if (matchingStatus) {
    return matchingStatus as FurnitureFormStatus;
  }
  
  return null;
};

// Create a new furniture form entry
export const createFurnitureForm = async (req: AuthRequest, res: Response) => {
  try {
    // If user is logged in, use their email from database (ignore form email)
    let userEmail = req.body.email;
    let userName = req.body.name;
    let userPhone = req.body.phoneNumber;
    
    if (req.userId) {
      const user = await User.findById(req.userId);
      if (user) {
        userEmail = user.email; // Always use logged-in user's email
        userName = user.fullName || userName; // Use user's name if available
        userPhone = user.phoneNumber || userPhone; // Use user's phone if available
      }
    }

    // Determine initial status based on listing type and payment
    let initialStatus = FurnitureFormStatus.REQUESTED;
    let paymentStatus = 'Pending';
    
    if (req.body.listing_type === 'Sell' || req.body.listing_type === 'Rent & Sell') {
      initialStatus = FurnitureFormStatus.ORDERED;
    }
    
    // If payment is done during order, set to Confirmed
    if (req.body.payment_status === 'Paid' || req.body.payment_done === true) {
      initialStatus = FurnitureFormStatus.CONFIRMED;
      paymentStatus = 'Paid';
    }

    const furnitureFormData = {
      furniture_id: req.body.furniture_id,
      name: userName,
      email: userEmail, // Use logged-in user's email if available
      phoneNumber: userPhone,
      message: req.body.message,
      listing_type: req.body.listing_type,
      status: initialStatus,
      payment_status: paymentStatus,
      userId: req.userId ? req.userId : undefined
    };

    // Validate required fields (message is optional)
    const requiredFields: Record<string, any> = {
      furniture_id: furnitureFormData.furniture_id,
      listing_type: furnitureFormData.listing_type,
      name: furnitureFormData.name,
      email: furnitureFormData.email,
      phoneNumber: furnitureFormData.phoneNumber
    };

    const missingFields: string[] = [];
    Object.keys(requiredFields).forEach(key => {
      if (!requiredFields[key]) {
        missingFields.push(key);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        missingFields: missingFields
      });
    }

    // Provide a default message if user left it blank
    if (!furnitureFormData.message || furnitureFormData.message.trim().length === 0) {
      furnitureFormData.message = `${furnitureFormData.name} submitted a ${furnitureFormData.listing_type || 'Rent'} request`;
    }

    // Get furniture details
    const furniture = await Furniture.findOne({ furniture_id: req.body.furniture_id });
    if (!furniture) {
      return res.status(404).json({ message: 'Furniture item not found' });
    }

    // Create a new furniture form
    const furnitureForm = new FurnitureForm(furnitureFormData);
    await furnitureForm.save();

    // Track activity if user is logged in
    if (req.userId) {
      await User.findByIdAndUpdate(req.userId, {
        $push: {
          activityLog: {
            action: 'furniture_request',
            timestamp: new Date(),
            details: {
              furniture_id: req.body.furniture_id,
              furniture_name: furniture.name,
              request_id: furnitureForm._id,
              listing_type: req.body.listing_type
            }
          }
        }
      });
      logger.info('User activity tracked', { userId: req.userId, action: 'furniture_request' });
    }

    if (furnitureForm.email) {
      sendEmailInBackground(
        'Furniture request confirmation',
        () => sendFurnitureRequestConfirmation(furnitureForm, furniture),
        { email: furnitureForm.email, furnitureFormId: furnitureForm._id }
      );
    } else {
      logger.warn('No email provided for furniture request confirmation', { furnitureFormId: furnitureForm._id });
    }

    logger.info('Furniture request created', { furnitureFormId: furnitureForm._id });
    
    res.status(201).json({ 
      message: "Furniture request submitted successfully", 
      request_details: furnitureForm,
      furniture_details: furniture
    });
  } catch (error) {
    logger.error('Error creating furniture form:', error);
    res.status(500).json({ message: 'Error creating furniture form', error });
  }
};

// Get all furniture forms (Admin) - with filtering and pagination
export const getFurnitureForms = async (req: Request, res: Response) => {
  try {
    const {
      status,
      furniture_id,
      listing_type,
      search,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (furniture_id) {
      query.furniture_id = furniture_id;
    }

    if (listing_type) {
      query.listing_type = listing_type;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count for pagination
    const total = await FurnitureForm.countDocuments(query);

    // Fetch with pagination and sorting
    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const furnitureForms = await FurnitureForm.find(query)
      .populate('userId', 'fullName email username')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    // Populate furniture details for each form
    const formsWithFurniture = await Promise.all(
      furnitureForms.map(async (form) => {
        const furniture = await Furniture.findOne({ furniture_id: form.furniture_id });
        const formObj = form.toObject();
        return {
          ...formObj,
          furniture_details: furniture ? {
            furniture_id: furniture.furniture_id,
            name: furniture.name,
            category: furniture.category,
            item_type: furniture.item_type,
            brand: furniture.brand,
            condition: furniture.condition,
            price: furniture.price,
            listing_type: furniture.listing_type,
            location: furniture.location,
            photos: furniture.photos,
            features: furniture.features
          } : null
        };
      })
    );

    res.status(200).json({
      success: true,
      data: formsWithFurniture,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Error fetching furniture forms:', error);
    res.status(500).json({ message: 'Error fetching furniture forms', error });
  }
};

// Get user's own furniture forms
export const getMyFurnitureForms = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find furniture forms by userId OR email (case-insensitive)
    const furnitureForms = await FurnitureForm.find({
      $or: [
        { userId: req.userId },
        { email: { $regex: new RegExp(`^${user.email}$`, 'i') } }
      ]
    })
      .sort({ createdAt: -1 })
      .lean();

    // Populate furniture details
    const furnitureIds = [...new Set(furnitureForms.map(f => f.furniture_id))];
    const db = mongoose.connection.db;
    const furnitures = furnitureIds.length > 0
      ? await db.collection('furnitures')
          .find({ furniture_id: { $in: furnitureIds } })
          .toArray()
      : [];

    const furnitureMap = new Map(furnitures.map(f => [f.furniture_id, f]));

    const formattedForms = furnitureForms.map((form: any) => {
      const furniture = furnitureMap.get(form.furniture_id);
      return {
        _id: form._id,
        furniture_id: form.furniture_id,
        furniture_name: furniture?.name || 'Unknown Item',
        furniture_details: furniture ? {
          name: furniture.name,
          furniture_id: furniture.furniture_id,
          category: furniture.category,
          photos: furniture.photos || []
        } : null,
        status: form.status,
        listing_type: form.listing_type,
        name: form.name,
        email: form.email,
        phoneNumber: form.phoneNumber,
        message: form.message,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt
      };
    });

    res.status(200).json({
      success: true,
      data: formattedForms,
      count: formattedForms.length
    });
  } catch (error: any) {
    logger.error('Error fetching user furniture forms:', error);
    res.status(500).json({
      message: 'Error fetching furniture forms',
      error: error.message
    });
  }
};

// Get single furniture form by ID (Admin)
export const getFurnitureFormById = async (req: Request, res: Response) => {
  try {
    const furnitureForm = await FurnitureForm.findById(req.params.id)
      .populate('userId', 'fullName email username phoneNumber');

    if (!furnitureForm) {
      return res.status(404).json({ message: 'Furniture form not found' });
    }

    // Get furniture details
    const furniture = await Furniture.findOne({ furniture_id: furnitureForm.furniture_id });
    
    const formObj = furnitureForm.toObject();
    const responseData = {
      ...formObj,
      furniture_details: furniture ? {
        furniture_id: furniture.furniture_id,
        name: furniture.name,
        category: furniture.category,
        item_type: furniture.item_type,
        brand: furniture.brand,
        condition: furniture.condition,
        price: furniture.price,
        listing_type: furniture.listing_type,
        location: furniture.location,
        photos: furniture.photos,
        features: furniture.features,
        dimensions: furniture.dimensions,
        delivery_available: furniture.delivery_available,
        delivery_charge: furniture.delivery_charge,
        warranty: furniture.warranty,
        warranty_months: furniture.warranty_months
      } : null
    };

    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    logger.error('Error fetching furniture form:', error);
    res.status(500).json({ message: 'Error fetching furniture form', error });
  }
};

// Update furniture form status (Admin)
export const updateFurnitureFormStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    let { status, payment_status, scheduled_delivery_date } = req.body;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        message: 'Invalid furniture form ID format',
        furnitureFormId: id,
        hint: 'ID must be a valid MongoDB ObjectId'
      });
    }

    // Try to find furniture form by MongoDB _id
    let oldFurnitureForm = await FurnitureForm.findById(id).populate('userId', 'fullName email');
    
    if (!oldFurnitureForm) {
      logger.warn('Furniture form not found by ID', { 
        id, 
        idType: typeof id,
        idLength: id?.length,
        isValidObjectId: mongoose.Types.ObjectId.isValid(id)
      });
      return res.status(404).json({ 
        message: 'Furniture form not found',
        furnitureFormId: id
      });
    }

    // Prepare update data
    const updateData: any = {};

    // Handle payment status update - if payment is done, auto-confirm
    if (payment_status !== undefined && payment_status !== null) {
      updateData.payment_status = payment_status;
      // If payment is paid and status is not already confirmed/delivered, set to confirmed
      if (payment_status === 'Paid' && 
          oldFurnitureForm.status !== FurnitureFormStatus.CONFIRMED &&
          oldFurnitureForm.status !== FurnitureFormStatus.DELIVERED &&
          oldFurnitureForm.status !== FurnitureFormStatus.OUT_FOR_DELIVERY) {
        updateData.status = FurnitureFormStatus.CONFIRMED;
      }
    }

    // Handle status update
    if (status) {
      // Normalize status value
      const normalizedStatus = normalizeStatus(status, oldFurnitureForm.listing_type);
      
      if (!normalizedStatus) {
        return res.status(400).json({ 
          message: 'Invalid status',
          receivedStatus: status,
          validStatuses: Object.values(FurnitureFormStatus),
          listing_type: oldFurnitureForm.listing_type,
          hint: 'Valid statuses: Ordered (Sell), Requested (Rent), Confirmed, Scheduled Delivery (Rent), Out for Delivery, Delivered, Cancelled'
        });
      }
      
      updateData.status = normalizedStatus;
    }

    // If no updates provided, return error
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: 'No valid update data provided',
        received: { status, payment_status, scheduled_delivery_date }
      });
    }

    // Handle scheduled delivery date (for Rent)
    if (scheduled_delivery_date) {
      updateData.scheduled_delivery_date = new Date(scheduled_delivery_date);
      // If setting scheduled delivery date, ensure status is Scheduled Delivery
      if (!updateData.status) {
        updateData.status = FurnitureFormStatus.SCHEDULED_DELIVERY;
      }
    }

    // Update the furniture form
    const furnitureForm = await FurnitureForm.findByIdAndUpdate(
      oldFurnitureForm._id, 
      updateData, 
      { new: true }
    ).populate('userId', 'fullName email');

    if (!furnitureForm) {
      return res.status(404).json({ 
        message: 'Furniture form not found after update',
        furnitureFormId: id
      });
    }

    // If status is Delivered and listing_type is Rent or Rent & Sell, create rental record
    // Add ALL delivered items to rental management (regardless of payment status)
    if (furnitureForm.status === FurnitureFormStatus.DELIVERED && 
        (furnitureForm.listing_type === 'Rent' || furnitureForm.listing_type === 'Rent & Sell')) {
      try {
        // Check if rental already exists for this furniture form
        const existingRental = await Rental.findOne({
          'items.product_id': furnitureForm.furniture_id,
          customer_email: { $regex: new RegExp(`^${furnitureForm.email}$`, 'i') },
          status: RentalStatus.ACTIVE
        });

        // Only create if rental doesn't exist (allow multiple rentals of same product by same person)
        // But check if this specific furniture form was already converted
        if (!existingRental || existingRental.notes?.includes(`Furniture ID: ${furnitureForm.furniture_id}`)) {
          await createRentalFromFurnitureDelivery(furnitureForm, req.userId);
          logger.info('Rental created from furniture delivery', {
            furnitureFormId: id,
            payment_status: furnitureForm.payment_status
          });
        } else {
          logger.info('Rental already exists for this furniture form', {
            furnitureFormId: id,
            rental_id: existingRental.rental_id
          });
        }
      } catch (rentalError: any) {
        logger.error('Error creating rental from furniture delivery', {
          error: rentalError.message,
          furnitureFormId: id
        });
        // Don't fail the request, just log the error
      }
    }

    // Get furniture details for response
    const furniture = await Furniture.findOne({ furniture_id: furnitureForm.furniture_id });

    // Track admin activity
    if (req.userId) {
      try {
        await User.findByIdAndUpdate(req.userId, {
          $push: {
            activityLog: {
              action: 'update_furniture_request_status',
              timestamp: new Date(),
              details: {
                request_id: id,
                furniture_id: furnitureForm.furniture_id,
                old_status: oldFurnitureForm.status,
                new_status: status
              }
            }
          }
        });
        logger.info('Admin activity tracked', { userId: req.userId, action: 'update_furniture_request_status' });
      } catch (activityError) {
        logger.warn('Failed to track admin activity', { error: activityError });
        // Don't fail the request if activity tracking fails
      }
    }

    // Send status update email
    if (furnitureForm && furnitureForm.email) {
      try {
        // Get furniture details if not already fetched
        const furnitureForEmail = furniture || await Furniture.findOne({ furniture_id: furnitureForm.furniture_id });
        sendEmailInBackground(
          'Furniture status update',
          () => sendFurnitureStatusUpdate(furnitureForm, status, furnitureForEmail),
          { email: furnitureForm.email, furnitureFormId: furnitureForm._id, status }
        );
      } catch (emailError) {
        logger.warn('Failed to send status update email', { error: emailError });
        // Don't fail the request if email fails
      }
    }

    logger.info('Furniture form status updated successfully', { 
      id, 
      furnitureFormId: furnitureForm._id,
      status: updateData.status || oldFurnitureForm.status, 
      admin: req.userId 
    });

    // Include furniture details in response
    const formObj = furnitureForm.toObject();
    const responseData = {
      ...formObj,
      furniture_details: furniture ? {
        furniture_id: furniture.furniture_id,
        name: furniture.name,
        category: furniture.category,
        item_type: furniture.item_type,
        brand: furniture.brand,
        condition: furniture.condition,
        price: furniture.price,
        listing_type: furniture.listing_type,
        location: furniture.location,
        photos: furniture.photos,
        features: furniture.features
      } : null
    };

    res.status(200).json({ 
      success: true,
      message: 'Furniture request status updated successfully', 
      data: responseData 
    });
  } catch (error: any) {
    logger.error('Error updating furniture form status:', { 
      error: error.message,
      stack: error.stack,
      id: req.params.id,
      status: req.body.status
    });
    res.status(500).json({ 
      message: 'Error updating furniture form status',
      error: error.message || 'Unknown error'
    });
  }
};

// Update a furniture form entry (Admin)
export const updateFurnitureForm = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        message: 'Invalid furniture form ID format',
        furnitureFormId: id,
        hint: 'ID must be a valid MongoDB ObjectId'
      });
    }

    // If status is being updated, normalize and validate it
    if (updateData.status) {
      const normalizedStatus = normalizeStatus(updateData.status);
      if (!normalizedStatus) {
        return res.status(400).json({ 
          message: 'Invalid status',
          receivedStatus: updateData.status,
          validStatuses: Object.values(FurnitureFormStatus),
          hint: 'Common mappings: "Confirm"/"Accept" -> "Accepted", "Reject"/"Cancel" -> "Cancelled"'
        });
      }
      // Replace with normalized status
      updateData.status = normalizedStatus;
    }

    const oldFurnitureForm = await FurnitureForm.findById(id);
    if (!oldFurnitureForm) {
      return res.status(404).json({ 
        message: 'Furniture form not found',
        furnitureFormId: id
      });
    }

    const furnitureForm = await FurnitureForm.findByIdAndUpdate(
      oldFurnitureForm._id, 
      updateData, 
      { new: true }
    ).populate('userId', 'fullName email');

    if (!furnitureForm) {
      return res.status(404).json({ 
        message: 'Furniture form not found after update',
        furnitureFormId: id
      });
    }

    // Track admin activity
    if (req.userId) {
      try {
        // If status was updated, track status update action
        if (updateData.status && oldFurnitureForm.status !== updateData.status) {
          await User.findByIdAndUpdate(req.userId, {
            $push: {
              activityLog: {
                action: 'update_furniture_request_status',
                timestamp: new Date(),
                details: {
                  request_id: id,
                  furniture_id: furnitureForm.furniture_id,
                  old_status: oldFurnitureForm.status,
                  new_status: updateData.status
                }
              }
            }
          });
          
          // Send status update email
          if (furnitureForm.email) {
            try {
              // Fetch furniture details for email
              const furnitureForEmail = await Furniture.findOne({ furniture_id: furnitureForm.furniture_id });
              sendEmailInBackground(
                'Furniture status update',
                () => sendFurnitureStatusUpdate(furnitureForm, updateData.status!, furnitureForEmail),
                { email: furnitureForm.email, furnitureFormId: furnitureForm._id, status: updateData.status }
              );
            } catch (emailError) {
              logger.warn('Failed to send status update email', { error: emailError });
            }
          }
        } else {
          // Track general update action
          await User.findByIdAndUpdate(req.userId, {
            $push: {
              activityLog: {
                action: 'update_furniture_request',
                timestamp: new Date(),
                details: {
                  request_id: id,
                  furniture_id: furnitureForm.furniture_id,
                  updated_fields: Object.keys(updateData)
                }
              }
            }
          });
        }
      } catch (activityError) {
        logger.warn('Failed to track admin activity', { error: activityError });
        // Don't fail the request if activity tracking fails
      }
    }

    logger.info('Furniture form updated', { id, admin: req.userId });

    // Get furniture details for response
    const furniture = await Furniture.findOne({ furniture_id: furnitureForm.furniture_id });
    
    const formObj = furnitureForm.toObject();
    const responseData = {
      ...formObj,
      furniture_details: furniture ? {
        furniture_id: furniture.furniture_id,
        name: furniture.name,
        category: furniture.category,
        item_type: furniture.item_type,
        brand: furniture.brand,
        condition: furniture.condition,
        price: furniture.price,
        listing_type: furniture.listing_type,
        location: furniture.location,
        photos: furniture.photos,
        features: furniture.features
      } : null
    };

    res.status(200).json({
      success: true,
      message: 'Furniture request updated successfully', 
      data: responseData 
    });
  } catch (error) {
    logger.error('Error updating furniture form:', error);
    res.status(500).json({ message: 'Error updating furniture form', error });
  }
};

// Delete a furniture form entry (Admin)
export const deleteFurnitureForm = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const furnitureForm = await FurnitureForm.findById(id);
    if (!furnitureForm) {
      return res.status(404).json({ message: 'Furniture form not found' });
    }

    await FurnitureForm.findByIdAndDelete(id);

    // Track admin activity
    if (req.userId) {
      await User.findByIdAndUpdate(req.userId, {
        $push: {
          activityLog: {
            action: 'delete_furniture_request',
            timestamp: new Date(),
            details: {
              request_id: id,
              furniture_id: furnitureForm.furniture_id
            }
          }
        }
      });
    }

    logger.info('Furniture form deleted', { id, admin: req.userId });
    res.status(200).json({ message: 'Furniture form deleted successfully' });
  } catch (error) {
    logger.error('Error deleting furniture form:', error);
    res.status(500).json({ message: 'Error deleting furniture form', error });
  }
};

// Migrate existing delivered rentals to rental management (Admin)
export const migrateDeliveredRentals = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Find ALL delivered furniture forms for Rent listings (regardless of payment status)
    // This allows tracking all delivered rentals in rental management
    const deliveredRentals = await FurnitureForm.find({
      status: FurnitureFormStatus.DELIVERED,
      $or: [
        { listing_type: 'Rent' },
        { listing_type: 'Rent & Sell' }
      ]
    }).sort({ createdAt: -1 });

    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    const results: any[] = [];

    for (const furnitureForm of deliveredRentals) {
      try {
        // Check if rental already exists for this furniture form
        const existingRental = await Rental.findOne({
          notes: { $regex: new RegExp(`Furniture Form ID: ${furnitureForm._id}`, 'i') }
        });

        if (existingRental) {
          skipped++;
          results.push({
            furnitureFormId: furnitureForm._id,
            status: 'skipped',
            reason: 'Rental already exists for this furniture form',
            rental_id: existingRental.rental_id,
            furniture_id: furnitureForm.furniture_id,
            customer_email: furnitureForm.email
          });
          continue;
        }

        // Create rental record (same person can rent same product multiple times)
        // Payment status will be set based on furniture form payment_status
        await createRentalFromFurnitureDelivery(furnitureForm, userId);
        migrated++;
        results.push({
          furnitureFormId: furnitureForm._id,
          status: 'migrated',
          furniture_id: furnitureForm.furniture_id,
          customer_email: furnitureForm.email,
          payment_status: furnitureForm.payment_status || 'Pending'
        });
      } catch (error: any) {
        errors++;
        results.push({
          furnitureFormId: furnitureForm._id,
          status: 'error',
          error: error.message
        });
        logger.error('Error migrating furniture form to rental', {
          furnitureFormId: furnitureForm._id,
          error: error.message
        });
      }
    }

    logger.info('Migration of delivered rentals completed', {
      total: deliveredRentals.length,
      migrated,
      skipped,
      errors
    });

    res.status(200).json({
      success: true,
      message: 'Migration completed',
      summary: {
        total: deliveredRentals.length,
        migrated,
        skipped,
        errors
      },
      results
    });
  } catch (error: any) {
    logger.error('Error migrating delivered rentals:', error);
    res.status(500).json({
      message: 'Error migrating delivered rentals',
      error: error.message
    });
  }
};


