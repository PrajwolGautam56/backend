import { Request, Response ,NextFunction} from 'express';
import PropertyForm, { PropertyFormStatus } from '../models/PropertyForm';
import { AuthRequest } from '../interfaces/Request';
import Property from '../models/Property';
import User from '../models/User';
import logger from '../utils/logger';
import { 
  sendPropertyRequestConfirmation,
  sendPropertyStatusUpdate 
} from '../utils/email';

// Create a new property form entry
export const createPropertyForm = async (req: AuthRequest, res: Response) => {
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

    const propertyFormData = {
      property_id: req.body.property_id, // Reference to the property ID
      name: userName,
      email: userEmail, // Use logged-in user's email if available
      phoneNumber: userPhone,
      message: req.body.message,
      userId: req.userId ? req.userId : undefined // Include userId if logged in
    };

    // Validate required fields
    const requiredFields: Record<string, any> = {
      property_id: propertyFormData.property_id,
      name: propertyFormData.name,
      email: propertyFormData.email,
      phoneNumber: propertyFormData.phoneNumber,
      message: propertyFormData.message
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

    // Get property details
    const property = await Property.findOne({ property_id: req.body.property_id });
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Create a new property form
    const propertyForm = new PropertyForm(propertyFormData);
    await propertyForm.save();

    // Track activity if user is logged in
    if (req.userId) {
      await User.findByIdAndUpdate(req.userId, {
        $push: {
          activityLog: {
            action: 'property_request',
            timestamp: new Date(),
            details: {
              property_id: req.body.property_id,
              property_name: property.name,
              request_id: propertyForm._id
            }
          }
        }
      });
      logger.info('User activity tracked', { userId: req.userId, action: 'property_request' });
    }

    // Send notification email (if configured)
    try {
      await sendPropertyRequestConfirmation(propertyForm, property);
    } catch (emailError) {
      logger.warn('Failed to send email notification', { error: emailError });
    }

    logger.info('Property request created', { propertyFormId: propertyForm._id });
    
    res.status(201).json({ 
      message: "Property request submitted successfully", 
      request_details: propertyForm,
      property_details: property
    });
  } catch (error) {
    logger.error('Error creating property form:', error);
    res.status(500).json({ message: 'Error creating property form', error });
  }
};

// Get all property forms (Admin) - with filtering and pagination
export const getPropertyForms = async (req: Request, res: Response) => {
  try {
    const {
      status,
      property_id,
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

    if (property_id) {
      query.property_id = property_id;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count for pagination
    const total = await PropertyForm.countDocuments(query);

    // Fetch with pagination and sorting
    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const propertyForms = await PropertyForm.find(query)
      .populate('userId', 'fullName email username')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: propertyForms,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Error fetching property forms:', error);
    res.status(500).json({ message: 'Error fetching property forms', error });
  }
};

// Get single property form by ID (Admin)
export const getPropertyFormById = async (req: Request, res: Response) => {
  try {
    const propertyForm = await PropertyForm.findById(req.params.id)
      .populate('userId', 'fullName email username phoneNumber')
      .populate('property_id'); // If you want to populate property details

    if (!propertyForm) {
      return res.status(404).json({ message: 'Property form not found' });
    }

    res.status(200).json({
      success: true,
      data: propertyForm
    });
  } catch (error) {
    logger.error('Error fetching property form:', error);
    res.status(500).json({ message: 'Error fetching property form', error });
  }
};

// Update property form status (Admin)
export const updatePropertyFormStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!Object.values(PropertyFormStatus).includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status',
        validStatuses: Object.values(PropertyFormStatus)
      });
    }

    const oldPropertyForm = await PropertyForm.findById(id);
    if (!oldPropertyForm) {
      return res.status(404).json({ message: 'Property form not found' });
    }

    const propertyForm = await PropertyForm.findByIdAndUpdate(
      id, 
      { status }, 
      { new: true }
    ).populate('userId', 'fullName email');

    // Send status update email
    if (propertyForm && propertyForm.email) {
      try {
        await sendPropertyStatusUpdate(propertyForm, status);
      } catch (emailError) {
        logger.warn('Failed to send status update email', { error: emailError });
      }
    }

    // Track admin activity
    if (req.userId) {
      await User.findByIdAndUpdate(req.userId, {
        $push: {
          activityLog: {
            action: 'update_property_request_status',
            timestamp: new Date(),
            details: {
              request_id: id,
              property_id: propertyForm?.property_id,
              old_status: oldPropertyForm.status,
              new_status: status
            }
          }
        }
      });
    }

    logger.info('Property form status updated', { 
      id, 
      status, 
      admin: req.userId 
    });

    res.status(200).json({ 
      success: true,
      message: 'Property request status updated successfully', 
      data: propertyForm 
    });
  } catch (error) {
    logger.error('Error updating property form status:', error);
    res.status(500).json({ message: 'Error updating property form status', error });
  }
};

// Update a property form entry (Admin)
export const updatePropertyForm = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const propertyForm = await PropertyForm.findByIdAndUpdate(id, updateData, { new: true })
      .populate('userId', 'fullName email');

    if (!propertyForm) {
      return res.status(404).json({ message: 'Property form not found' });
    }

    // Track admin activity
    if (req.userId) {
      await User.findByIdAndUpdate(req.userId, {
        $push: {
          activityLog: {
            action: 'update_property_request',
            timestamp: new Date(),
            details: {
              request_id: id,
              property_id: propertyForm.property_id,
              updated_fields: Object.keys(updateData)
            }
          }
        }
      });
    }

    logger.info('Property form updated', { id, admin: req.userId });

    res.status(200).json({ 
      success: true,
      message: 'Property request updated successfully', 
      data: propertyForm 
    });
  } catch (error) {
    logger.error('Error updating property form:', error);
    res.status(500).json({ message: 'Error updating property form', error });
  }
};

// Delete a property form entry
export const deletePropertyForm = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const propertyForm = await PropertyForm.findById(id);
    if (!propertyForm) {
      return res.status(404).json({ message: 'Property form not found' });
    }

    await PropertyForm.findByIdAndDelete(id);

    // Track admin activity
    if (req.userId) {
      await User.findByIdAndUpdate(req.userId, {
        $push: {
          activityLog: {
            action: 'delete_property_request',
            timestamp: new Date(),
            details: {
              request_id: id,
              property_id: propertyForm.property_id
            }
          }
        }
      });
    }

    logger.info('Property form deleted', { id, admin: req.userId });
    res.status(200).json({ message: 'Property form deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting property form', error });
  }
};
