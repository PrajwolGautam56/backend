import { Request, Response } from 'express';
import FurnitureForm, { FurnitureFormStatus } from '../models/FurnitureForm';
import { AuthRequest } from '../interfaces/Request';
import Furniture from '../models/Furniture';
import User from '../models/User';
import logger from '../utils/logger';
import { 
  sendFurnitureRequestConfirmation,
  sendFurnitureStatusUpdate 
} from '../utils/email';

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

    const furnitureFormData = {
      furniture_id: req.body.furniture_id,
      name: userName,
      email: userEmail, // Use logged-in user's email if available
      phoneNumber: userPhone,
      message: req.body.message,
      listing_type: req.body.listing_type,
      userId: req.userId ? req.userId : undefined
    };

    // Validate required fields
    const requiredFields: Record<string, any> = {
      furniture_id: furnitureFormData.furniture_id,
      name: furnitureFormData.name,
      email: furnitureFormData.email,
      phoneNumber: furnitureFormData.phoneNumber,
      message: furnitureFormData.message
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

    // Send notification email (if configured)
    try {
      await sendFurnitureRequestConfirmation(furnitureForm, furniture);
    } catch (emailError) {
      logger.warn('Failed to send email notification', { error: emailError });
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

    res.status(200).json({
      success: true,
      data: furnitureForms,
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

// Get single furniture form by ID (Admin)
export const getFurnitureFormById = async (req: Request, res: Response) => {
  try {
    const furnitureForm = await FurnitureForm.findById(req.params.id)
      .populate('userId', 'fullName email username phoneNumber');

    if (!furnitureForm) {
      return res.status(404).json({ message: 'Furniture form not found' });
    }

    res.status(200).json({
      success: true,
      data: furnitureForm
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
    const { status } = req.body;

    if (!Object.values(FurnitureFormStatus).includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status',
        validStatuses: Object.values(FurnitureFormStatus)
      });
    }

    const oldFurnitureForm = await FurnitureForm.findById(id);
    if (!oldFurnitureForm) {
      return res.status(404).json({ message: 'Furniture form not found' });
    }

    const furnitureForm = await FurnitureForm.findByIdAndUpdate(
      id, 
      { status }, 
      { new: true }
    ).populate('userId', 'fullName email');

    // Track admin activity
    if (req.userId && furnitureForm) {
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
    }

    // Send status update email
    if (furnitureForm && furnitureForm.email) {
      try {
        await sendFurnitureStatusUpdate(furnitureForm, status);
      } catch (emailError) {
        logger.warn('Failed to send status update email', { error: emailError });
      }
    }

    logger.info('Furniture form status updated', { 
      id, 
      status, 
      admin: req.userId 
    });

    res.status(200).json({ 
      success: true,
      message: 'Furniture request status updated successfully', 
      data: furnitureForm 
    });
  } catch (error) {
    logger.error('Error updating furniture form status:', error);
    res.status(500).json({ message: 'Error updating furniture form status', error });
  }
};

// Update a furniture form entry (Admin)
export const updateFurnitureForm = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const furnitureForm = await FurnitureForm.findByIdAndUpdate(id, updateData, { new: true })
      .populate('userId', 'fullName email');

    if (!furnitureForm) {
      return res.status(404).json({ message: 'Furniture form not found' });
    }

    // Track admin activity
    if (req.userId) {
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

    logger.info('Furniture form updated', { id, admin: req.userId });

    res.status(200).json({ 
      success: true,
      message: 'Furniture request updated successfully', 
      data: furnitureForm 
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


