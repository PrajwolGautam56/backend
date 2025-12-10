import { Request, Response } from 'express';
import { AuthRequest } from '../interfaces/Request';
import User from '../models/User';
import PropertyForm from '../models/PropertyForm';
import FurnitureForm from '../models/FurnitureForm';
import ServiceBooking from '../models/ServiceBooking';
import Contact from '../models/Contact';
import Property from '../models/Property';
import Furniture from '../models/Furniture';
import Rental from '../models/Rental';
import mongoose from 'mongoose';
import logger from '../utils/logger';

// Admin: Get all users with filtering and pagination
export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const {
      search,
      role,
      isVerified,
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

    if (role) {
      query.role = role;
    }

    if (isVerified !== undefined) {
      query.isVerified = isVerified === 'true';
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count
    const total = await User.countDocuments(query);

    // Fetch with pagination and sorting
    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const users = await User.find(query)
      .select('-password -otp -otpExpires')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users', error });
  }
};

// Admin: Get single user with full details
export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -otp -otpExpires');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user', error });
  }
};

// Admin: Update user information
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Don't allow updating sensitive fields directly
    delete updateData.password;
    delete updateData.refreshToken;
    delete updateData.otp;

    const user = await User.findByIdAndUpdate(id, updateData, { new: true })
      .select('-password -otp -otpExpires');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    logger.info('User updated', { userId: id, admin: req.userId });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user', error });
  }
};

// Admin: Delete user
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    logger.info('User deleted', { userId: id, admin: req.userId });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user', error });
  }
};

// User: Get own profile
export const getOwnProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId)
      .select('-password -otp -otpExpires');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Error fetching profile', error });
  }
};

// User: Update own profile
export const updateOwnProfile = async (req: AuthRequest, res: Response) => {
  try {
    const updateData = req.body;

    // Don't allow updating sensitive fields
    delete updateData.password;
    delete updateData.refreshToken;
    delete updateData.isAdmin;
    delete updateData.role;
    delete updateData.isVerified;

    const user = await User.findByIdAndUpdate(req.userId, updateData, { new: true })
      .select('-password -otp -otpExpires');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    logger.info('User profile updated', { userId: req.userId });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    logger.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile', error });
  }
};

// User: Get own activity history
export const getOwnActivityHistory = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('activityLog');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        activityLog: user.activityLog || [],
        totalActivities: user.activityLog?.length || 0
      }
    });
  } catch (error) {
    logger.error('Error fetching activity history:', error);
    res.status(500).json({ message: 'Error fetching activity history', error });
  }
};

// User: Get own dashboard data
export const getOwnDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's all submissions by userId OR email
    // Service bookings, furniture requests, contact inquiries, and rentals can be matched by userId OR user's email
    const [propertyRequests, furnitureRequests, serviceBookings, contactInquiries, rentals] = await Promise.all([
      PropertyForm.find({ userId })
        .sort({ createdAt: -1 })
        .lean(),
      // Match furniture requests by userId OR email (case-insensitive)
      FurnitureForm.find({
        $or: [
          { userId: userId },
          { email: { $regex: new RegExp(`^${user.email}$`, 'i') } } // Case-insensitive email match
        ]
      })
        .sort({ createdAt: -1 })
        .lean(),
      // Match service bookings by userId OR email (case-insensitive)
      ServiceBooking.find({
        $or: [
          { userId: userId },
          { email: { $regex: new RegExp(`^${user.email}$`, 'i') } } // Case-insensitive email match
        ]
      })
        .sort({ created_at: -1 })
        .lean(),
      // Match contact inquiries by userId OR email (case-insensitive)
      Contact.find({
        $or: [
          { userId: userId },
          { email: { $regex: new RegExp(`^${user.email}$`, 'i') } } // Case-insensitive email match
        ]
      })
        .sort({ created_at: -1 })
        .lean(),
      // Match rentals by userId OR email (case-insensitive)
      Rental.find({
        $or: [
          { userId: userId },
          { customer_email: { $regex: new RegExp(`^${user.email}$`, 'i') } } // Case-insensitive email match
        ]
      })
        .sort({ createdAt: -1 })
        .lean()
    ]);

    // Log for debugging with detailed query info
    logger.info('Dashboard data fetched', {
      userId,
      userEmail: user.email,
      propertyRequestsCount: propertyRequests.length,
      furnitureRequestsCount: furnitureRequests.length,
      serviceBookingsCount: serviceBookings.length,
      contactInquiriesCount: contactInquiries.length,
      rentalsCount: rentals.length,
      rentalIds: rentals.map((r: any) => r.rental_id),
      rentalEmails: rentals.map((r: any) => r.customer_email),
      rentalUserIds: rentals.map((r: any) => r.userId?.toString())
    });

    // Fetch property and furniture details separately (since IDs are strings)
    const propertyIds = [...new Set(propertyRequests.map(r => r.property_id))];
    const furnitureIds = [...new Set(furnitureRequests.map(r => r.furniture_id))];
    
    // Use native MongoDB for faster lookup (Mongoose pluralizes: Furniture -> furnitures)
    const db = mongoose.connection.db;
    const [properties, furnitures] = await Promise.all([
      propertyIds.length > 0 
        ? db.collection('properties')
            .find({ property_id: { $in: propertyIds } })
            .toArray()
        : [],
      furnitureIds.length > 0
        ? db.collection('furnitures') // Mongoose pluralizes model names
            .find({ furniture_id: { $in: furnitureIds } })
            .toArray()
        : []
    ]);

    // Create lookup maps
    const propertyMap = new Map(properties.map(p => [p.property_id, p]));
    const furnitureMap = new Map(furnitures.map(f => [f.furniture_id, f]));

    // Format recent items with better structure
    const formatPropertyRequest = (req: any) => {
      const property = propertyMap.get(req.property_id);
      return {
        _id: req._id,
        property_id: req.property_id,
        property_name: property?.name || 'Unknown Property',
        property_details: property ? {
          name: property.name,
          property_id: property.property_id,
          location: property.location,
          photos: property.photos || []
        } : null,
        status: req.status,
        name: req.name,
        email: req.email,
        phoneNumber: req.phoneNumber,
        message: req.message,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt
      };
    };

    const formatFurnitureRequest = (req: any) => {
      const furniture = furnitureMap.get(req.furniture_id);
      return {
        _id: req._id,
        furniture_id: req.furniture_id,
        furniture_name: furniture?.name || 'Unknown Item',
        furniture_details: furniture ? {
          name: furniture.name,
          furniture_id: furniture.furniture_id,
          category: furniture.category,
          photos: furniture.photos || []
        } : null,
        status: req.status,
        listing_type: req.listing_type,
        name: req.name,
        email: req.email,
        phoneNumber: req.phoneNumber,
        message: req.message,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt
      };
    };

    const formatServiceBooking = (booking: any) => ({
      _id: booking._id,
      service_booking_id: booking.service_booking_id,
      service_type: booking.service_type,
      name: booking.name,
      phone_number: booking.phone_number,
      email: booking.email,
      preferred_date: booking.preferred_date,
      preferred_time: booking.preferred_time,
      alternate_date: booking.alternate_date,
      alternate_time: booking.alternate_time,
      service_address: booking.service_address,
      additional_notes: booking.additional_notes,
      status: booking.status,
      created_at: booking.created_at,
      updated_at: booking.updated_at
    });

    const formatContactInquiry = (inquiry: any) => ({
      _id: inquiry._id,
      contact_id: inquiry.contact_id,
      fullname: inquiry.fullname,
      email: inquiry.email,
      phonenumber: inquiry.phonenumber,
      subject: inquiry.subject,
      message: inquiry.message,
      status: inquiry.status,
      created_at: inquiry.created_at,
      updated_at: inquiry.updated_at
    });

    const formatRental = (rental: any) => ({
      _id: rental._id,
      rental_id: rental.rental_id,
      customer_name: rental.customer_name,
      customer_email: rental.customer_email,
      customer_phone: rental.customer_phone,
      customer_address: rental.customer_address,
      items: rental.items,
      total_monthly_amount: rental.total_monthly_amount,
      total_deposit: rental.total_deposit,
      delivery_charge: rental.delivery_charge || 0,
      total_amount: rental.total_amount || (rental.total_monthly_amount + rental.total_deposit + (rental.delivery_charge || 0)),
      start_date: rental.start_date,
      end_date: rental.end_date,
      status: rental.status,
      order_status: rental.order_status || 'Pending',
      payment_method: rental.payment_method,
      order_placed_at: rental.order_placed_at || rental.createdAt,
      order_confirmed_at: rental.order_confirmed_at,
      delivery_date: rental.delivery_date,
      delivered_at: rental.delivered_at,
      payment_records: rental.payment_records || [],
      notes: rental.notes,
      createdAt: rental.createdAt,
      updatedAt: rental.updatedAt
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          username: user.username,
          phoneNumber: user.phoneNumber,
          profilePicture: user.profilePicture,
          isVerified: user.isVerified
        },
        stats: {
          totalPropertyRequests: propertyRequests.length,
          totalFurnitureRequests: furnitureRequests.length,
          totalServiceBookings: serviceBookings.length,
          totalContactInquiries: contactInquiries.length,
          totalRentals: rentals.length,
          activeRentals: rentals.filter((r: any) => r.status === 'Active').length,
          totalActivities: user?.activityLog?.length || 0,
          totalSubmissions: propertyRequests.length + furnitureRequests.length + serviceBookings.length + contactInquiries.length + rentals.length
        },
        recentPropertyRequests: propertyRequests.slice(0, 5).map(formatPropertyRequest),
        recentFurnitureRequests: furnitureRequests.slice(0, 5).map(formatFurnitureRequest),
        recentServiceBookings: serviceBookings.slice(0, 5).map(formatServiceBooking),
        recentContactInquiries: contactInquiries.slice(0, 5).map(formatContactInquiry),
        recentRentals: rentals.slice(0, 5).map(formatRental),
        activityLog: user?.activityLog?.slice(0, 10) || [],
        // Full lists (optional - can be moved to separate endpoints if needed)
        allPropertyRequests: propertyRequests.map(formatPropertyRequest),
        allFurnitureRequests: furnitureRequests.map(formatFurnitureRequest),
        allServiceBookings: serviceBookings.map(formatServiceBooking),
        allContactInquiries: contactInquiries.map(formatContactInquiry),
        allRentals: rentals.map(formatRental)
      }
    });
  } catch (error) {
    logger.error('Error fetching dashboard:', error);
    res.status(500).json({ message: 'Error fetching dashboard', error });
  }
};

// Debug: Test dashboard query for specific email
export const testDashboardQuery = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Test rental query
    const rentalQuery = {
      $or: [
        { userId: userId },
        { customer_email: { $regex: new RegExp(`^${user.email}$`, 'i') } }
      ]
    };

    const rentals = await Rental.find(rentalQuery).lean();

    // Test furniture form query
    const furnitureQuery = {
      $or: [
        { userId: userId },
        { email: { $regex: new RegExp(`^${user.email}$`, 'i') } }
      ]
    };
    const furnitureRequests = await FurnitureForm.find(furnitureQuery).lean();

    // Test service booking query
    const serviceQuery = {
      $or: [
        { userId: userId },
        { email: { $regex: new RegExp(`^${user.email}$`, 'i') } }
      ]
    };
    const serviceBookings = await ServiceBooking.find(serviceQuery).lean();

    return res.status(200).json({
      success: true,
      debug: {
        user: {
          _id: user._id.toString(),
          email: user.email,
          fullName: user.fullName
        },
        queries: {
          rentalQuery,
          furnitureQuery,
          serviceQuery
        },
        results: {
          rentals: {
            count: rentals.length,
            rentalIds: rentals.map((r: any) => r.rental_id),
            emails: rentals.map((r: any) => r.customer_email),
            userIds: rentals.map((r: any) => r.userId?.toString() || 'null')
          },
          furnitureRequests: {
            count: furnitureRequests.length,
            ids: furnitureRequests.map((f: any) => f._id.toString())
          },
          serviceBookings: {
            count: serviceBookings.length,
            ids: serviceBookings.map((s: any) => s._id.toString())
          }
        },
        allRentals: rentals.map((r: any) => ({
          rental_id: r.rental_id,
          customer_email: r.customer_email,
          userId: r.userId?.toString() || null,
          order_status: r.order_status,
          total_amount: r.total_amount,
          items_count: r.items?.length || 0
        }))
      }
    });
  } catch (error: any) {
    logger.error('Test dashboard query error:', error);
    return res.status(500).json({ 
      message: 'Error testing dashboard query', 
      error: error.message 
    });
  }
};

// Admin: Get user's all submissions and activity
export const getUserDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all user's submissions by userId OR email
    const [propertyRequests, furnitureRequests, serviceBookings, contactInquiries] = await Promise.all([
      PropertyForm.find({ userId: id })
        .sort({ createdAt: -1 })
        .lean(),
      // Match furniture requests by userId OR email (case-insensitive)
      FurnitureForm.find({
        $or: [
          { userId: id },
          { email: { $regex: new RegExp(`^${user.email}$`, 'i') } } // Case-insensitive email match
        ]
      })
        .sort({ createdAt: -1 })
        .lean(),
      // Match service bookings by userId OR email (case-insensitive)
      ServiceBooking.find({
        $or: [
          { userId: id },
          { email: { $regex: new RegExp(`^${user.email}$`, 'i') } } // Case-insensitive email match
        ]
      })
        .sort({ created_at: -1 })
        .lean(),
      // Match contact inquiries by userId OR email (case-insensitive)
      Contact.find({
        $or: [
          { userId: id },
          { email: { $regex: new RegExp(`^${user.email}$`, 'i') } } // Case-insensitive email match
        ]
      })
        .sort({ created_at: -1 })
        .lean()
    ]);

    // Fetch property and furniture details
    const propertyIds = [...new Set(propertyRequests.map(r => r.property_id))];
    const furnitureIds = [...new Set(furnitureRequests.map(r => r.furniture_id))];
    const db = mongoose.connection.db;
    const [properties, furnitures] = await Promise.all([
      propertyIds.length > 0 
        ? db.collection('properties')
            .find({ property_id: { $in: propertyIds } })
            .toArray()
        : [],
      furnitureIds.length > 0
        ? db.collection('furnitures')
            .find({ furniture_id: { $in: furnitureIds } })
            .toArray()
        : []
    ]);
    const propertyMap = new Map(properties.map(p => [p.property_id, p]));
    const furnitureMap = new Map(furnitures.map(f => [f.furniture_id, f]));

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          username: user.username,
          phoneNumber: user.phoneNumber,
          nationality: user.nationality,
          role: user.role,
          isVerified: user.isVerified,
          isAdmin: user.isAdmin,
          createdAt: (user as any).createdAt,
          activityLog: user.activityLog
        },
        submissions: {
          propertyRequests: {
            total: propertyRequests.length,
            items: propertyRequests.map((req: any) => {
              const property = propertyMap.get(req.property_id);
              return {
                ...req,
                property_name: property?.name || 'Unknown Property',
                property_details: property ? {
                  name: property.name,
                  property_id: property.property_id,
                  location: property.location,
                  photos: property.photos || []
                } : null
              };
            })
          },
          furnitureRequests: {
            total: furnitureRequests.length,
            items: furnitureRequests.map((req: any) => {
              const furniture = furnitureMap.get(req.furniture_id);
              return {
                ...req,
                furniture_name: furniture?.name || 'Unknown Item',
                furniture_details: furniture ? {
                  name: furniture.name,
                  furniture_id: furniture.furniture_id,
                  category: furniture.category,
                  photos: furniture.photos || []
                } : null
              };
            })
          },
          serviceBookings: {
            total: serviceBookings.length,
            items: serviceBookings
          },
          contactInquiries: {
            total: contactInquiries.length,
            items: contactInquiries
          }
        },
        stats: {
          totalSubmissions: propertyRequests.length + furnitureRequests.length + serviceBookings.length + contactInquiries.length,
          totalActivities: user.activityLog?.length || 0
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching user details:', error);
    res.status(500).json({ message: 'Error fetching user details', error });
  }
};

