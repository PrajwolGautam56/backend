import { Request, Response } from 'express';
import ServiceBooking from '../models/ServiceBooking';
import logger from '../utils/logger';
import { sendBookingConfirmation, sendBookingUpdate, sendStatusUpdate, sendAdminNotification } from '../utils/email';
import { AuthRequest } from '../interfaces/Request';
import User from '../models/User';

export const serviceBookingController = {
  // Create a new service booking
  async createBooking(req: Request, res: Response) {
    try {
      // Extract userId from request if authenticated (optional middleware attaches userId)
      const authReq = req as AuthRequest;
      const userId = authReq.userId || undefined;

      // If user is logged in, use their email from database (ignore form email)
      let userEmail = req.body.email;
      let userName = req.body.name;
      let userPhone = req.body.phone_number;
      
      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          userEmail = user.email; // Always use logged-in user's email
          userName = user.fullName || userName; // Use user's name if available
          userPhone = user.phoneNumber || userPhone; // Use user's phone if available
        }
      }

      const bookingData = {
        service_type: req.body.service_type,
        name: userName,
        phone_number: userPhone,
        email: userEmail, // Use logged-in user's email if available
        preferred_date: new Date(req.body.preferred_date),
        preferred_time: req.body.preferred_time,
        alternate_date: req.body.alternate_date ? new Date(req.body.alternate_date) : undefined,
        alternate_time: req.body.alternate_time,
        service_address: req.body.service_address,
        additional_notes: req.body.additional_notes,
        userId: userId // Attach userId if user is logged in
      };

      const booking = new ServiceBooking(bookingData);
      await booking.save();

      // Track activity if user is logged in
      if (userId) {
        await User.findByIdAndUpdate(userId, {
          $push: {
            activityLog: {
              action: 'service_booking',
              timestamp: new Date(),
              details: {
                service_type: req.body.service_type,
                booking_id: booking.service_booking_id,
                preferred_date: req.body.preferred_date,
                preferred_time: req.body.preferred_time
              }
            }
          }
        });
        logger.info('User activity tracked', { userId, action: 'service_booking' });
      }

      logger.info('Service booking created', { 
        bookingId: booking.service_booking_id 
      });

      // Send email notifications
      await sendBookingConfirmation(booking);
      await sendAdminNotification(booking);

      res.status(201).json(booking);
    } catch (error) {
      logger.error('Error creating service booking:', error);
      res.status(500).json({ message: 'Error creating service booking', error });
    }
  },

  // Get all bookings with filters (Admin only)
  async getBookings(req: Request, res: Response) {
    try {
      const { 
        service_type, 
        status, 
        date,
        phone_number 
      } = req.query;

      const query: any = {};

      if (service_type) query.service_type = service_type;
      if (status) query.status = status;
      if (date) query.preferred_date = new Date(date as string);
      if (phone_number) query.phone_number = phone_number;

      const bookings = await ServiceBooking.find(query)
        .sort({ preferred_date: -1 });

      res.json(bookings);
    } catch (error) {
      logger.error('Error fetching service bookings:', error);
      res.status(500).json({ message: 'Error fetching service bookings', error });
    }
  },

  // Get user's own bookings
  async getMyBookings(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.userId;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get bookings by userId OR email (case-insensitive)
      const bookings = await ServiceBooking.find({
        $or: [
          { userId: userId },
          { email: { $regex: new RegExp(`^${user.email}$`, 'i') } } // Case-insensitive email match
        ]
      })
        .sort({ created_at: -1 });

      // Track activity
      await User.findByIdAndUpdate(userId, {
        $push: {
          activityLog: {
            action: 'view_service_bookings',
            timestamp: new Date(),
            details: {
              bookings_count: bookings.length
            }
          }
        }
      });

      res.json(bookings);
    } catch (error) {
      logger.error('Error fetching user service bookings:', error);
      res.status(500).json({ message: 'Error fetching service bookings', error });
    }
  },

  // Get booking by ID
  async getBookingById(req: Request, res: Response) {
    try {
      const booking = await ServiceBooking.findOne({_id:req.params.id
      });

      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      res.json(booking);
    } catch (error) {
      logger.error('Error fetching service booking:', error);
      res.status(500).json({ message: 'Error fetching service booking', error });
    }
  },

  // Update booking status (Admin only)
  async updateBookingStatus(req: Request, res: Response) {
    try {
      const { status } = req.body;

      const validStatuses = ['requested', 'accepted', 'ongoing', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status', validStatuses });
      }

      const oldBooking = await ServiceBooking.findById(req.params.id);
      if (!oldBooking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      const booking = await ServiceBooking.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      logger.info('Service booking status updated', { 
        bookingId: booking.service_booking_id, 
        status 
      });

      // Track admin activity
      const authReq = req as AuthRequest;
      if (authReq.userId) {
        await User.findByIdAndUpdate(authReq.userId, {
          $push: {
            activityLog: {
              action: 'update_service_booking_status',
              timestamp: new Date(),
              details: {
                booking_id: booking.service_booking_id,
                old_status: oldBooking.status,
                new_status: status
              }
            }
          }
        });
      }

      // Send status update email
      await sendStatusUpdate(booking, status);

      res.json(booking);
    } catch (error) {
      logger.error('Error updating service booking status:', error);
      res.status(500).json({ message: 'Error updating service booking status', error });
    }
  },

  // Admin: Update booking time/date
  async updateBookingTime(req: Request, res: Response) {
    try {
      const { preferred_date, preferred_time, alternate_date, alternate_time } = req.body;

      const updateData: any = {};
      if (preferred_date) updateData.preferred_date = new Date(preferred_date);
      if (preferred_time) updateData.preferred_time = preferred_time;
      if (alternate_date) updateData.alternate_date = new Date(alternate_date);
      if (alternate_time) updateData.alternate_time = alternate_time;

      const oldBooking = await ServiceBooking.findById(req.params.id);
      if (!oldBooking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      const booking = await ServiceBooking.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      logger.info('Service booking time updated', { 
        bookingId: booking.service_booking_id
      });

      // Track admin activity
      const authReq = req as AuthRequest;
      if (authReq.userId) {
        await User.findByIdAndUpdate(authReq.userId, {
          $push: {
            activityLog: {
              action: 'update_service_booking_time',
              timestamp: new Date(),
              details: {
                booking_id: booking.service_booking_id,
                service_type: booking.service_type
              }
            }
          }
        });
      }

      // Send update email if time changed
      if (updateData.preferred_date && updateData.preferred_time && (booking as any).email) {
        await sendBookingUpdate(
          booking,
          oldBooking.preferred_date,
          oldBooking.preferred_time,
          new Date(updateData.preferred_date),
          updateData.preferred_time as string
        );
      }

      res.json(booking);
    } catch (error) {
      logger.error('Error updating booking time:', error);
      res.status(500).json({ message: 'Error updating booking time', error });
    }
  },

  // User: Update own booking (limited fields)
  async updateMyBooking(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.userId;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const booking = await ServiceBooking.findById(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Check if user owns this booking
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const isOwner = booking.userId?.toString() === userId ||
                     ((booking as any).email && (booking as any).email.toLowerCase() === user.email.toLowerCase());

      if (!isOwner) {
        return res.status(403).json({ message: 'You can only update your own bookings' });
      }

      // Users can only update limited fields (not status)
      const { preferred_date, preferred_time, alternate_date, alternate_time, service_address, additional_notes } = req.body;

      const updateData: any = {};
      if (preferred_date) updateData.preferred_date = new Date(preferred_date);
      if (preferred_time) updateData.preferred_time = preferred_time;
      if (alternate_date) updateData.alternate_date = new Date(alternate_date);
      if (alternate_time) updateData.alternate_time = alternate_time;
      if (service_address) updateData.service_address = service_address;
      if (additional_notes !== undefined) updateData.additional_notes = additional_notes;

      // Don't allow updating if booking is completed or cancelled
      if (['completed', 'cancelled'].includes(booking.status)) {
        return res.status(400).json({ message: 'Cannot update completed or cancelled booking' });
      }

      const oldBooking = await ServiceBooking.findById(req.params.id);
      const updatedBooking = await ServiceBooking.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

      // Track user activity
      await User.findByIdAndUpdate(userId, {
        $push: {
          activityLog: {
            action: 'update_own_service_booking',
            timestamp: new Date(),
            details: {
              booking_id: booking.service_booking_id,
              service_type: booking.service_type,
              changes: Object.keys(updateData)
            }
          }
        }
      });

      logger.info('User updated their service booking', { 
        bookingId: booking.service_booking_id,
        userId
      });

      // Send update email if time/date changed
      if ((updateData.preferred_date || updateData.preferred_time) && oldBooking && updatedBooking) {
        await sendBookingUpdate(
          updatedBooking,
          oldBooking.preferred_date,
          oldBooking.preferred_time,
          updatedBooking.preferred_date,
          updatedBooking.preferred_time
        );
      }

      res.json(updatedBooking);
    } catch (error) {
      logger.error('Error updating user booking:', error);
      res.status(500).json({ message: 'Error updating booking', error });
    }
  },

  // Cancel booking (User or Admin)
  async cancelBooking(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.userId;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const booking = await ServiceBooking.findById(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Check if user is admin or owns the booking
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const isOwner = booking.userId?.toString() === userId ||
                     ((booking as any).email && (booking as any).email.toLowerCase() === user.email.toLowerCase());

      if (!user.isAdmin && !isOwner) {
        return res.status(403).json({ message: 'You can only cancel your own bookings' });
      }

      // Check if booking can be cancelled
      if (['completed', 'cancelled'].includes(booking.status)) {
        return res.status(400).json({ message: 'Booking cannot be cancelled' });
      }

      const cancelledBooking = await ServiceBooking.findByIdAndUpdate(
        req.params.id,
        { status: 'cancelled' },
        { new: true }
      );

      // Track activity
      await User.findByIdAndUpdate(userId, {
        $push: {
          activityLog: {
            action: 'cancel_service_booking',
            timestamp: new Date(),
            details: {
              booking_id: booking.service_booking_id,
              service_type: booking.service_type
            }
          }
        }
      });

      logger.info('Service booking cancelled', { 
        bookingId: booking.service_booking_id,
        cancelledBy: user.isAdmin ? 'admin' : 'user',
        userId
      });

      // Send cancellation email
      await sendStatusUpdate(cancelledBooking!, 'cancelled');

      res.json({ message: 'Booking cancelled successfully', booking: cancelledBooking });
    } catch (error) {
      logger.error('Error cancelling service booking:', error);
      res.status(500).json({ message: 'Error cancelling service booking', error });
    }
  }
}; 