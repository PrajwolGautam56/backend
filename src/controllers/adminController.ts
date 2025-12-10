import { Request, Response } from 'express';
import Property from '../models/Property';
import User from '../models/User';
import ServiceBooking from '../models/ServiceBooking';
import Furniture from '../models/Furniture';
import Rental from '../models/Rental';
import FurnitureTransaction from '../models/FurnitureTransaction';
import { AuthRequest } from '../interfaces/Request';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';

export const addProperty = async (req: AuthRequest, res: Response) => {
  try {
    const propertyData = req.body;
    const images = (req.files as Express.Multer.File[])?.map(file => file.filename) || [];

    const property = new Property({
      ...propertyData,
      images,
      createdBy: req.userId,
      updatedBy: req.userId
    });

    await property.save();
    logger.info('Property added successfully', { propertyId: property._id });
    res.status(201).json(property);
  } catch (error) {
    logger.error('Error adding property:', error);
    res.status(500).json({ message: 'Error adding property' });
  }
};

export const updateProperty = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const images = (req.files as Express.Multer.File[])?.map(file => file.filename);

    if (images?.length) {
      updateData.images = images;
    }

    const property = await Property.findByIdAndUpdate(
      id,
      { 
        ...updateData,
        updatedBy: req.userId 
      },
      { new: true }
    );

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    logger.info('Property updated successfully', { propertyId: id });
    return res.status(200).json(property);
  } catch (error) {
    logger.error('Update property error:', error);
    return res.status(500).json({ message: 'Error updating property' });
  }
};

export const deleteProperty = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const property = await Property.findByIdAndDelete(id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Delete property images
    if (property.photos && property.photos.length) {
      property.photos.forEach((photo: string) => {
        const imagePath = path.join(__dirname, '../../uploads/properties', photo);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });
    }

    logger.info('Property deleted successfully', { propertyId: id });
    return res.status(200).json({ message: 'Property deleted successfully' });
  } catch (error) {
    logger.error('Delete property error:', error);
    return res.status(500).json({ message: 'Error deleting property' });
  }
};

export const setDiscount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { discountedPrice } = req.body;

    const property = await Property.findByIdAndUpdate(
      id,
      { 
        discountedPrice,
        isDiscounted: !!discountedPrice
      },
      { new: true }
    );

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    logger.info('Property discount updated', { propertyId: id });
    return res.status(200).json({ message: 'Discount set successfully' });
  } catch (error) {
    logger.error('Set discount error:', error);
    return res.status(500).json({ message: 'Error setting discount' });
  }
};

// Admin Dashboard Overview
export const getDashboardOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Total Properties
    const totalProperties = await Property.countDocuments();
    const propertiesLastMonth = await Property.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    const propertiesTwoMonthsAgo = await Property.countDocuments({
      createdAt: { 
        $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    });
    const propertyChange = propertiesTwoMonthsAgo > 0 
      ? Math.round(((propertiesLastMonth - propertiesTwoMonthsAgo) / propertiesTwoMonthsAgo) * 100) 
      : propertiesLastMonth > 0 ? 100 : 0;

    // Active Users
    const totalUsers = await User.countDocuments({ isVerified: true });
    const usersLastMonth = await User.countDocuments({
      isVerified: true,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    const usersTwoMonthsAgo = await User.countDocuments({
      isVerified: true,
      createdAt: { 
        $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    });
    const userChange = usersTwoMonthsAgo > 0 
      ? Math.round(((usersLastMonth - usersTwoMonthsAgo) / usersTwoMonthsAgo) * 100) 
      : usersLastMonth > 0 ? 100 : 0;

    // Service Requests
    const totalServiceRequests = await ServiceBooking.countDocuments();
    const serviceRequestsLastMonth = await ServiceBooking.countDocuments({
      created_at: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    const serviceRequestsTwoMonthsAgo = await ServiceBooking.countDocuments({
      created_at: { 
        $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    });
    const serviceChange = serviceRequestsTwoMonthsAgo > 0 
      ? Math.round(((serviceRequestsLastMonth - serviceRequestsTwoMonthsAgo) / serviceRequestsTwoMonthsAgo) * 100) 
      : serviceRequestsLastMonth > 0 ? 100 : 0;

    // Total Revenue (from rentals and furniture transactions)
    const activeRentals = await Rental.find({ status: 'Active' });
    const rentalRevenue = activeRentals.reduce((sum, rental) => {
      const paidPayments = rental.payment_records?.filter(
        (p: any) => p.status === 'Paid'
      ) || [];
      return sum + paidPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
    }, 0);

    const furnitureTransactions = await FurnitureTransaction.find({
      payment_status: 'Paid'
    });
    const furnitureRevenue = furnitureTransactions.reduce(
      (sum, t) => sum + (t.total_paid || 0), 0
    );

    const totalRevenue = rentalRevenue + furnitureRevenue;
    
    // Calculate revenue change (this month vs last month)
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0);

    const thisMonthRentals = await Rental.find({
      createdAt: { $gte: thisMonthStart }
    });
    const thisMonthRevenue = thisMonthRentals.reduce((sum, rental) => {
      const paidPayments = rental.payment_records?.filter(
        (p: any) => p.status === 'Paid' && p.paidDate >= thisMonthStart
      ) || [];
      return sum + paidPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
    }, 0);

    const lastMonthRentals = await Rental.find({
      createdAt: { $gte: lastMonthStart, $lt: thisMonthStart }
    });
    const lastMonthRevenue = lastMonthRentals.reduce((sum, rental) => {
      const paidPayments = rental.payment_records?.filter(
        (p: any) => p.status === 'Paid' && p.paidDate >= lastMonthStart && p.paidDate < thisMonthStart
      ) || [];
      return sum + paidPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
    }, 0);

    const revenueChange = lastMonthRevenue > 0 
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) 
      : thisMonthRevenue > 0 ? 100 : 0;

    // Recent Properties
    const recentProperties = await Property.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name address status property_type listing_type photos createdAt')
      .lean();

    // Recent Activities
    interface ActivityItem {
      type: string;
      title: string;
      description: string;
      timestamp: Date | string;
      user?: { name: string; email: string };
      customer?: { name: string; email: string };
      status?: string;
    }
    
    const recentActivities: ActivityItem[] = [];
    
    // Add property additions
    recentProperties.forEach((prop: any) => {
      recentActivities.push({
        type: 'property_added',
        title: prop.name || 'Unnamed Property',
        description: 'New property added',
        timestamp: prop.createdAt || new Date(),
        user: { name: 'Admin', email: 'admin@brokerin.com' }
      });
    });

    // Add service requests
    const recentServices = await ServiceBooking.find()
      .sort({ created_at: -1 })
      .limit(5)
      .populate('userId', 'fullName email')
      .lean();
    
    recentServices.forEach((service: any) => {
      recentActivities.push({
        type: 'service_request',
        title: `${service.service_type} Service Request`,
        description: 'New service booking',
        timestamp: service.created_at || new Date(),
        status: service.status,
        customer: {
          name: service.name,
          email: service.email
        }
      });
    });

    // Add user registrations
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('fullName email createdAt')
      .lean();
    
    recentUsers.forEach((user: any) => {
      recentActivities.push({
        type: 'user_registration',
        title: 'New User Registration',
        description: 'User signed up',
        timestamp: user.createdAt || new Date(),
        user: {
          name: user.fullName,
          email: user.email
        }
      });
    });

    // Sort by timestamp (most recent first)
    recentActivities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    res.json({
      success: true,
      data: {
        totalProperties: {
          count: totalProperties,
          change: Math.abs(propertyChange),
          changeType: propertyChange >= 0 ? 'increase' : 'decrease',
          available: await Property.countDocuments({ status: 'Available' }),
          sold: await Property.countDocuments({ status: 'Sold' }),
          pending: await Property.countDocuments({ status: { $ne: 'Available' } })
        },
        activeUsers: {
          count: totalUsers,
          change: Math.abs(userChange),
          changeType: userChange >= 0 ? 'increase' : 'decrease',
          verified: totalUsers,
          unverified: await User.countDocuments({ isVerified: false }),
          newThisMonth: usersLastMonth
        },
        serviceRequests: {
          count: totalServiceRequests,
          change: Math.abs(serviceChange),
          changeType: serviceChange >= 0 ? 'increase' : 'decrease',
          pending: await ServiceBooking.countDocuments({ status: 'requested' }),
          accepted: await ServiceBooking.countDocuments({ status: 'accepted' }),
          ongoing: await ServiceBooking.countDocuments({ status: 'ongoing' }),
          completed: await ServiceBooking.countDocuments({ status: 'completed' })
        },
        totalRevenue: {
          amount: totalRevenue,
          currency: 'INR',
          change: Math.abs(revenueChange),
          changeType: revenueChange >= 0 ? 'increase' : 'decrease',
          thisMonth: thisMonthRevenue,
          lastMonth: lastMonthRevenue,
          rentalRevenue,
          furnitureRevenue,
          serviceRevenue: 0
        },
        recentProperties: recentProperties.map(p => ({
          ...p,
          address: p.address || {}
        })),
        recentActivities: recentActivities.slice(0, 10),
        quickStats: {
          totalFurnitureItems: await Furniture.countDocuments(),
          activeRentals: await Rental.countDocuments({ status: 'Active' }),
          pendingPayments: await Rental.countDocuments({
            'payment_records.status': 'Pending'
          }),
          overduePayments: await Rental.countDocuments({
            'payment_records.status': 'Overdue'
          }),
          totalBookings: totalServiceRequests,
          todayBookings: await ServiceBooking.countDocuments({
            created_at: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
          })
        }
      }
    });
  } catch (error: any) {
    logger.error('Error fetching dashboard overview:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message 
    });
  }
};

// Get Settings
export const getSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get settings from environment/config
    const settings = {
      system: {
        emailProvider: process.env.EMAIL_PROVIDER || 'smtp',
        paymentGateway: process.env.RAZORPAY_KEY_ID ? 'razorpay' : 'none',
        cloudinaryEnabled: !!process.env.CLOUDINARY_CLOUD_NAME,
        googleAuthEnabled: !!process.env.GOOGLE_CLIENT_ID
      },
      business: {
        companyName: process.env.COMPANY_NAME || 'BrokerIn',
        contactEmail: process.env.CONTACT_EMAIL || process.env.NODEMAILER_EMAIL || '',
        contactPhone: process.env.CONTACT_PHONE || '',
        address: process.env.COMPANY_ADDRESS || '',
        businessHours: process.env.BUSINESS_HOURS || '9 AM - 6 PM',
        timezone: process.env.TIMEZONE || 'Asia/Kolkata'
      },
      notifications: {
        emailEnabled: !!process.env.NODEMAILER_EMAIL || !!process.env.RESEND_API_KEY || !!process.env.ZEPTO_TOKEN,
        smsEnabled: false, // Not implemented yet
        reminderSchedule: {
          paymentReminders: process.env.PAYMENT_REMINDER_SCHEDULE || 'daily',
          serviceReminders: process.env.SERVICE_REMINDER_SCHEDULE || 'daily',
          time: process.env.REMINDER_TIME || '09:00'
        }
      },
      userManagement: {
        requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION !== 'false',
        requirePhoneVerification: process.env.REQUIRE_PHONE_VERIFICATION === 'true',
        passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT_HOURS || '24', 10)
      },
      content: {
        homepageBanners: [], // Can be stored in database later
        featuredProperties: [], // Can be stored in database later
        featuredFurniture: [] // Can be stored in database later
      },
      analytics: {
        googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID || '',
        facebookPixelId: process.env.FACEBOOK_PIXEL_ID || ''
      }
    };

    res.json({
      success: true,
      data: settings
    });
  } catch (error: any) {
    logger.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching settings',
      error: error.message
    });
  }
};

// Update Settings
export const updateSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { business, notifications, userManagement, content, analytics } = req.body;

    // Note: In a production system, you'd want to store these in a database
    // For now, we'll just validate and return success
    // You can implement a Settings model later to persist these

    const updatedSettings: any = {};

    if (business) {
      // Update business settings (would save to database)
      updatedSettings.business = business;
      logger.info('Business settings updated', { business });
    }

    if (notifications) {
      updatedSettings.notifications = notifications;
      logger.info('Notification settings updated', { notifications });
    }

    if (userManagement) {
      updatedSettings.userManagement = userManagement;
      logger.info('User management settings updated', { userManagement });
    }

    if (content) {
      updatedSettings.content = content;
      logger.info('Content settings updated', { content });
    }

    if (analytics) {
      updatedSettings.analytics = analytics;
      logger.info('Analytics settings updated', { analytics });
    }

    // TODO: Save to database (create Settings model)
    // For now, just return success
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedSettings
    });
  } catch (error: any) {
    logger.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating settings',
      error: error.message
    });
  }
};

// Test Email Configuration
export const testEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { to, subject, message } = req.body;

    if (!to) {
      res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
      return;
    }

    // Import email utilities
    const emailUtils = await import('../utils/email');
    const nodemailer = require('nodemailer');
    const { config } = await import('../config/config');
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.NODEMAILER_EMAIL,
        pass: config.NODEMAILER_PASSWORD
      }
    });
    
    await transporter.sendMail({
      from: config.NODEMAILER_EMAIL,
      to: to,
      subject: subject || 'Test Email from BrokerIn',
      text: message || 'This is a test email from BrokerIn admin dashboard.',
      html: `<p>${message || 'This is a test email from BrokerIn admin dashboard.'}</p>`
    });

    res.json({
      success: true,
      message: 'Test email sent successfully'
    });
  } catch (error: any) {
    logger.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending test email',
      error: error.message
    });
  }
};

// Test Payment Gateway
export const testPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount = 100, currency = 'INR' } = req.body;

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      res.status(400).json({
        success: false,
        message: 'Payment gateway is not configured'
      });
      return;
    }

    // Import Razorpay utilities
    const { createRazorpayOrder } = await import('../utils/razorpay');
    
    const order = await createRazorpayOrder(
      amount,
      currency,
      `test_${Date.now()}`,
      { test: 'true' }
    );

    res.json({
      success: true,
      message: 'Payment gateway test successful',
      data: {
        orderId: order.id,
        amount: Number(order.amount) / 100,
        currency: (order.currency as string) || 'INR'
      }
    });
  } catch (error: any) {
    logger.error('Error testing payment gateway:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing payment gateway',
      error: error.message
    });
  }
};

// Analytics Endpoints

// Revenue Analytics
export const getRevenueAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { period = 'monthly', startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get rental revenue
    const rentals = await Rental.find({
      createdAt: { $gte: start, $lte: end }
    });

    let rentalRevenue = 0;
    const rentalTrends: Record<string, { revenue: number; count: number }> = {};

    rentals.forEach(rental => {
      const paidPayments = rental.payment_records?.filter(
        (p: any) => p.status === 'Paid'
      ) || [];
      const revenue = paidPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      rentalRevenue += revenue;

      // Group by month
      paidPayments.forEach((p: any) => {
        if (p.paidDate) {
          const month = new Date(p.paidDate).toISOString().slice(0, 7);
          if (!rentalTrends[month]) {
            rentalTrends[month] = { revenue: 0, count: 0 };
          }
          rentalTrends[month].revenue += p.amount || 0;
          rentalTrends[month].count += 1;
        }
      });
    });

    // Get furniture revenue
    const furnitureTransactions = await FurnitureTransaction.find({
      payment_status: 'Paid',
      createdAt: { $gte: start, $lte: end }
    });

    const furnitureRevenue = furnitureTransactions.reduce(
      (sum, t) => sum + (t.total_paid || 0), 0
    );

    const totalRevenue = rentalRevenue + furnitureRevenue;

    // Calculate growth (simplified - compare with previous period)
    const previousStart = new Date(start);
    previousStart.setMonth(previousStart.getMonth() - 1);
    const previousEnd = new Date(start);

    const previousRentals = await Rental.find({
      createdAt: { $gte: previousStart, $lt: previousEnd }
    });
    const previousRevenue = previousRentals.reduce((sum, rental) => {
      const paidPayments = rental.payment_records?.filter(
        (p: any) => p.status === 'Paid' && p.paidDate >= previousStart && p.paidDate < previousEnd
      ) || [];
      return sum + paidPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
    }, 0);

    const monthOverMonth = previousRevenue > 0 
      ? Math.round(((rentalRevenue - previousRevenue) / previousRevenue) * 100) 
      : 0;

    // Payment method breakdown (from payment records)
    const paymentMethods: Record<string, number> = {};
    rentals.forEach(rental => {
      rental.payment_records?.forEach((p: any) => {
        if (p.status === 'Paid' && p.paymentMethod) {
          paymentMethods[p.paymentMethod] = (paymentMethods[p.paymentMethod] || 0) + (p.amount || 0);
        }
      });
    });

    // Convert trends to array
    const trends = Object.entries(rentalTrends)
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        rentalRevenue: data.revenue,
        furnitureRevenue: 0, // Can be calculated separately if needed
        serviceRevenue: 0,
        count: data.count
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      success: true,
      data: {
        totalRevenue,
        period: period as string,
        trends,
        byCategory: {
          rental: rentalRevenue,
          furniture: furnitureRevenue,
          service: 0
        },
        byPaymentMethod: paymentMethods,
        growth: {
          monthOverMonth,
          yearOverYear: 0 // Can be calculated if needed
        }
      }
    });
  } catch (error: any) {
    logger.error('Error fetching revenue analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching revenue analytics',
      error: error.message
    });
  }
};

// User Analytics
export const getUserAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { period = 'monthly' } = req.query;

    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });

    // User growth by month
    const growth: Array<{ month: string; newUsers: number; activeUsers: number; verifiedUsers: number }> = [];
    const months = 12; // Last 12 months

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const newUsers = await User.countDocuments({
        createdAt: { $gte: monthStart, $lt: monthEnd }
      });

      const activeUsers = await User.countDocuments({
        createdAt: { $lt: monthEnd },
        isVerified: true
      });

      const verifiedUsersCount = await User.countDocuments({
        createdAt: { $lt: monthEnd },
        isVerified: true
      });

      growth.push({
        month: monthStart.toISOString().slice(0, 7),
        newUsers,
        activeUsers,
        verifiedUsers: verifiedUsersCount
      });
    }

    // Engagement metrics (simplified)
    const usersWithActivity = await User.countDocuments({
      'activityLog.0': { $exists: true }
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        verifiedUsers,
        unverifiedUsers: totalUsers - verifiedUsers,
        growth,
        engagement: {
          dailyActiveUsers: 0, // Would need activity tracking
          weeklyActiveUsers: 0,
          monthlyActiveUsers: usersWithActivity,
          totalLogins: 0
        },
        retention: {
          day1: 0,
          day7: 0,
          day30: 0
        },
        activity: {
          totalLogins: 0,
          averageSessionTime: 0,
          mostActiveHour: 0
        }
      }
    });
  } catch (error: any) {
    logger.error('Error fetching user analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user analytics',
      error: error.message
    });
  }
};

// Property Analytics
export const getPropertyAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalProperties = await Property.countDocuments();

    const byStatus = {
      available: await Property.countDocuments({ status: 'Available' }),
      sold: await Property.countDocuments({ status: 'Sold' }),
      rented: await Property.countDocuments({ status: { $ne: 'Available' } })
    };

    const byType = {
      Residential: await Property.countDocuments({ property_type: 'Residential' }),
      Commercial: await Property.countDocuments({ property_type: 'Commercial' }),
      'PG Hostel': await Property.countDocuments({ property_type: 'PG Hostel' })
    };

    const byListingType = {
      Rent: await Property.countDocuments({ listing_type: 'Rent' }),
      Sell: await Property.countDocuments({ listing_type: 'Sell' }),
      'Rent & Sell': await Property.countDocuments({ listing_type: 'Rent & Sell' })
    };

    // Top properties (by views if available, otherwise by creation date)
    const topProperties = await Property.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name status property_type listing_type address')
      .lean();

    res.json({
      success: true,
      data: {
        totalProperties,
        byStatus,
        byType,
        byListingType,
        topProperties: topProperties.map((p: any) => ({
          _id: p._id,
          name: p.name,
          views: 0, // Would need view tracking
          inquiries: 0, // Would need inquiry tracking
          status: p.status
        })),
        conversionRate: 0, // Would need tracking
        averageDaysOnMarket: 0 // Would need tracking
      }
    });
  } catch (error: any) {
    logger.error('Error fetching property analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching property analytics',
      error: error.message
    });
  }
};

// Furniture Analytics
export const getFurnitureAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalItems = await Furniture.countDocuments();

    const byCategory = {
      Furniture: await Furniture.countDocuments({ category: 'Furniture' }),
      Appliance: await Furniture.countDocuments({ category: 'Appliance' }),
      Electronic: await Furniture.countDocuments({ category: 'Electronic' }),
      Decoration: await Furniture.countDocuments({ category: 'Decoration' }),
      Kitchenware: await Furniture.countDocuments({ category: 'Kitchenware' })
    };

    const byStatus = {
      Available: await Furniture.countDocuments({ status: 'Available' }),
      Rented: await Furniture.countDocuments({ status: 'Rented' }),
      Sold: await Furniture.countDocuments({ status: 'Sold' })
    };

    // Top items (by transactions)
    const transactions = await FurnitureTransaction.find()
      .populate('furniture_id', 'name category')
      .lean();

    const itemStats: Record<string, { rentals: number; sales: number; revenue: number }> = {};
    transactions.forEach((t: any) => {
      const furnitureId = t.furniture_id?._id?.toString();
      if (furnitureId) {
        if (!itemStats[furnitureId]) {
          itemStats[furnitureId] = { rentals: 0, sales: 0, revenue: 0 };
        }
        if (t.transaction_type === 'Rent') {
          itemStats[furnitureId].rentals += 1;
        } else {
          itemStats[furnitureId].sales += 1;
        }
        itemStats[furnitureId].revenue += t.total_paid || 0;
      }
    });

    const topItems = Object.entries(itemStats)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([id, stats]) => ({
        _id: id,
        ...stats
      }));

    // Stock alerts
    const lowStockItems = await Furniture.find({
      stock: { $lt: 5, $gte: 0 }
    }).countDocuments();

    const outOfStockItems = await Furniture.find({
      $or: [
        { stock: 0 },
        { stock: { $exists: false } }
      ]
    }).countDocuments();

    res.json({
      success: true,
      data: {
        totalItems,
        byCategory,
        byStatus,
        topItems,
        stockAlerts: {
          lowStock: lowStockItems,
          outOfStock: outOfStockItems
        },
        turnoverRate: 0 // Would need calculation
      }
    });
  } catch (error: any) {
    logger.error('Error fetching furniture analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching furniture analytics',
      error: error.message
    });
  }
};

// Service Analytics
export const getServiceAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalBookings = await ServiceBooking.countDocuments();

    const byStatus = {
      requested: await ServiceBooking.countDocuments({ status: 'requested' }),
      accepted: await ServiceBooking.countDocuments({ status: 'accepted' }),
      ongoing: await ServiceBooking.countDocuments({ status: 'ongoing' }),
      completed: await ServiceBooking.countDocuments({ status: 'completed' }),
      cancelled: await ServiceBooking.countDocuments({ status: 'cancelled' })
    };

    const byServiceType: Record<string, number> = {};
    const bookings = await ServiceBooking.find().lean();
    
    bookings.forEach((booking: any) => {
      const type = booking.service_type || 'Other';
      byServiceType[type] = (byServiceType[type] || 0) + 1;
    });

    const completed = byStatus.completed;
    const completionRate = totalBookings > 0 
      ? Math.round((completed / totalBookings) * 100 * 10) / 10 
      : 0;

    // Monthly trends
    const trends: Array<{ month: string; bookings: number; completed: number; revenue: number }> = [];
    const months = 12;

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const monthBookings = await ServiceBooking.countDocuments({
        created_at: { $gte: monthStart, $lt: monthEnd }
      });

      const monthCompleted = await ServiceBooking.countDocuments({
        created_at: { $gte: monthStart, $lt: monthEnd },
        status: 'completed'
      });

      trends.push({
        month: monthStart.toISOString().slice(0, 7),
        bookings: monthBookings,
        completed: monthCompleted,
        revenue: 0 // Service revenue tracking would need to be added
      });
    }

    res.json({
      success: true,
      data: {
        totalBookings,
        byStatus,
        byServiceType,
        completionRate,
        averageCompletionTime: 0, // Would need tracking
        revenue: 0, // Would need service pricing
        trends
      }
    });
  } catch (error: any) {
    logger.error('Error fetching service analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service analytics',
      error: error.message
    });
  }
};

// Rental Analytics
export const getRentalAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalRentals = await Rental.countDocuments();
    const activeRentals = await Rental.countDocuments({ status: 'Active' });

    // Calculate total revenue from paid payments
    const rentals = await Rental.find({ status: 'Active' });
    let totalRevenue = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    let totalPaid = 0;

    rentals.forEach(rental => {
      const paymentRecords = rental.payment_records || [];
      paymentRecords.forEach((p: any) => {
        if (p.status === 'Paid') {
          totalPaid += p.amount || 0;
        } else if (p.status === 'Pending') {
          totalPending += p.amount || 0;
        } else if (p.status === 'Overdue') {
          totalOverdue += p.amount || 0;
        }
      });
    });

    totalRevenue = totalPaid;

    const byStatus = {
      Active: activeRentals,
      Completed: await Rental.countDocuments({ status: 'Completed' }),
      Cancelled: await Rental.countDocuments({ status: 'Cancelled' })
    };

    const collectionRate = totalRevenue > 0 
      ? Math.round((totalPaid / (totalPaid + totalPending + totalOverdue)) * 100 * 10) / 10 
      : 0;

    // Monthly trends
    const trends: Array<{ month: string; newRentals: number; revenue: number; averageOrderValue: number }> = [];
    const months = 12;

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const monthRentals = await Rental.find({
        createdAt: { $gte: monthStart, $lt: monthEnd }
      });

      const monthRevenue = monthRentals.reduce((sum, rental) => {
        const paidPayments = rental.payment_records?.filter(
          (p: any) => p.status === 'Paid' && p.paidDate >= monthStart && p.paidDate < monthEnd
        ) || [];
        return sum + paidPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
      }, 0);

      const avgOrderValue = monthRentals.length > 0 
        ? monthRevenue / monthRentals.length 
        : 0;

      trends.push({
        month: monthStart.toISOString().slice(0, 7),
        newRentals: monthRentals.length,
        revenue: monthRevenue,
        averageOrderValue: avgOrderValue
      });
    }

    // Top customers
    const customerStats: Record<string, { totalRentals: number; totalSpent: number }> = {};
    rentals.forEach(rental => {
      const email = rental.customer_email;
      if (email) {
        if (!customerStats[email]) {
          customerStats[email] = { totalRentals: 0, totalSpent: 0 };
        }
        customerStats[email].totalRentals += 1;
        const paidPayments = rental.payment_records?.filter(
          (p: any) => p.status === 'Paid'
        ) || [];
        customerStats[email].totalSpent += paidPayments.reduce(
          (sum: number, p: any) => sum + (p.amount || 0), 0
        );
      }
    });

    const topCustomers = Object.entries(customerStats)
      .sort((a, b) => b[1].totalSpent - a[1].totalSpent)
      .slice(0, 10)
      .map(([email, stats]) => ({
        customer_email: email,
        customer_name: '', // Would need to fetch from rental
        totalRentals: stats.totalRentals,
        totalSpent: stats.totalSpent,
        lifetimeValue: stats.totalSpent
      }));

    res.json({
      success: true,
      data: {
        totalRentals,
        activeRentals,
        totalRevenue,
        byStatus,
        paymentStats: {
          totalPending,
          totalOverdue,
          totalPaid,
          collectionRate
        },
        trends,
        topCustomers
      }
    });
  } catch (error: any) {
    logger.error('Error fetching rental analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching rental analytics',
      error: error.message
    });
  }
}; 