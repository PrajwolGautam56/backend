import nodemailer from 'nodemailer';
import { IServiceBooking } from '../models/ServiceBooking';
import logger from './logger';
import { config } from '../config/config';

// Create transporter if email is configured
let transporter: nodemailer.Transporter | null = null;

if (config.isEmailEnabled()) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.NODEMAILER_EMAIL,
      pass: config.NODEMAILER_PASSWORD,
    },
  });
}

// Send booking confirmation to customer
export const sendBookingConfirmation = async (booking: IServiceBooking) => {
  if (!transporter || !(booking as any).email) {
    logger.info('Email not configured or no email provided', { 
      bookingId: booking.service_booking_id 
    });
    return;
  }

  const mailOptions = {
    from: config.NODEMAILER_EMAIL,
    to: (booking as any).email,
    subject: 'Service Booking Confirmation',
    html: `
      <h2>Your Service Booking Confirmed</h2>
      <p>Hello ${booking.name},</p>
      <p>Your service booking has been received.</p>
      <h3>Booking Details:</h3>
      <ul>
        <li><strong>Booking ID:</strong> ${booking.service_booking_id}</li>
        <li><strong>Service Type:</strong> ${booking.service_type}</li>
        <li><strong>Preferred Date:</strong> ${new Date(booking.preferred_date).toLocaleDateString()}</li>
        <li><strong>Preferred Time:</strong> ${booking.preferred_time}</li>
        <li><strong>Service Address:</strong> ${booking.service_address}</li>
        <li><strong>Status:</strong> ${booking.status}</li>
      </ul>
      <p>We will contact you shortly.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Booking confirmation email sent', { email: (booking as any).email });
  } catch (error) {
    logger.error('Error sending confirmation email:', error);
  }
};

// Send booking update notification to customer
export const sendBookingUpdate = async (
  booking: IServiceBooking,
  oldDate: Date,
  oldTime: string,
  newDate: Date,
  newTime: string
) => {
  if (!transporter || !(booking as any).email) {
    logger.info('Email not configured or no email provided', { 
      bookingId: booking.service_booking_id 
    });
    return;
  }

  const mailOptions = {
    from: config.NODEMAILER_EMAIL,
    to: (booking as any).email,
    subject: 'Service Booking Update',
    html: `
      <h2>Your Service Booking Has Been Updated</h2>
      <p>Hello ${booking.name},</p>
      <p>Your service booking time has been changed:</p>
      <h3>Previous Schedule:</h3>
      <ul>
        <li>Date: ${oldDate.toLocaleDateString()}</li>
        <li>Time: ${oldTime}</li>
      </ul>
      <h3>New Schedule:</h3>
      <ul>
        <li>Date: ${newDate.toLocaleDateString()}</li>
        <li>Time: ${newTime}</li>
      </ul>
      <p><strong>Booking ID:</strong> ${booking.service_booking_id}</p>
      <p><strong>Service Type:</strong> ${booking.service_type}</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Booking update email sent', { email: (booking as any).email });
  } catch (error) {
    logger.error('Error sending update email:', error);
  }
};

// Send booking status update to customer
export const sendStatusUpdate = async (booking: IServiceBooking, newStatus: string) => {
  if (!transporter || !(booking as any).email) {
    logger.info('Email not configured or no email provided', { 
      bookingId: booking.service_booking_id 
    });
    return;
  }

  const statusMessages: { [key: string]: string } = {
    'accepted': 'Your service booking has been accepted!',
    'ongoing': 'Our team has started your service.',
    'completed': 'Your service has been completed. We hope you were satisfied!',
    'cancelled': 'Your service booking has been cancelled.'
  };

  const mailOptions = {
    from: config.NODEMAILER_EMAIL,
    to: (booking as any).email,
    subject: 'Service Booking Status Update',
    html: `
      <h2>${statusMessages[newStatus] || 'Service Booking Update'}</h2>
      <p>Hello ${booking.name},</p>
      <h3>Booking Details:</h3>
      <ul>
        <li><strong>Booking ID:</strong> ${booking.service_booking_id}</li>
        <li><strong>Service Type:</strong> ${booking.service_type}</li>
        <li><strong>Status:</strong> ${newStatus}</li>
        <li><strong>Date:</strong> ${new Date(booking.preferred_date).toLocaleDateString()}</li>
        <li><strong>Time:</strong> ${booking.preferred_time}</li>
      </ul>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Status update email sent', { email: (booking as any).email, status: newStatus });
  } catch (error) {
    logger.error('Error sending status update email:', error);
  }
};

// Send new booking notification to admin
export const sendAdminNotification = async (booking: IServiceBooking) => {
  if (!transporter) {
    logger.info('Email not configured for admin notification', { 
      bookingId: booking.service_booking_id 
    });
    return;
  }

  const mailOptions = {
    from: config.NODEMAILER_EMAIL,
    to: config.NODEMAILER_EMAIL, // Admin email
    subject: 'New Service Booking Request',
    html: `
      <h2>New Service Booking Request</h2>
      <h3>Booking Details:</h3>
      <ul>
        <li><strong>Booking ID:</strong> ${booking.service_booking_id}</li>
        <li><strong>Service Type:</strong> ${booking.service_type}</li>
        <li><strong>Customer Name:</strong> ${booking.name}</li>
        <li><strong>Phone:</strong> ${booking.phone_number}</li>
        ${(booking as any).email ? `<li><strong>Email:</strong> ${(booking as any).email}</li>` : ''}
        <li><strong>Preferred Date:</strong> ${new Date(booking.preferred_date).toLocaleDateString()}</li>
        <li><strong>Preferred Time:</strong> ${booking.preferred_time}</li>
        <li><strong>Service Address:</strong> ${booking.service_address}</li>
        <li><strong>Additional Notes:</strong> ${booking.additional_notes || 'N/A'}</li>
        <li><strong>Status:</strong> ${booking.status}</li>
      </ul>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Admin notification email sent', { bookingId: booking.service_booking_id });
  } catch (error) {
    logger.error('Error sending admin notification email:', error);
  }
};

export const sendServiceBookingEmail = sendAdminNotification;

// ===== FURNITURE REQUEST EMAILS =====

// Send furniture request confirmation to customer
export const sendFurnitureRequestConfirmation = async (furnitureForm: any, furniture: any) => {
  if (!transporter || !furnitureForm.email) {
    logger.info('Email not configured or no email provided', { 
      furnitureFormId: furnitureForm._id 
    });
    return;
  }

  const mailOptions = {
    from: config.NODEMAILER_EMAIL,
    to: furnitureForm.email,
    subject: 'Furniture Request Confirmation',
    html: `
      <h2>Your Furniture Request Confirmed</h2>
      <p>Hello ${furnitureForm.name},</p>
      <p>Thank you for your interest in our furniture item.</p>
      <h3>Request Details:</h3>
      <ul>
        <li><strong>Furniture:</strong> ${furniture.name || furnitureForm.furniture_id}</li>
        <li><strong>Category:</strong> ${furniture.category || 'N/A'}</li>
        ${furnitureForm.listing_type ? `<li><strong>Type:</strong> ${furnitureForm.listing_type}</li>` : ''}
        <li><strong>Status:</strong> ${furnitureForm.status}</li>
      </ul>
      <p>We will contact you shortly regarding your request.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Furniture request confirmation email sent', { email: furnitureForm.email });
  } catch (error) {
    logger.error('Error sending furniture request confirmation email:', error);
  }
};

// Send furniture status update to customer
export const sendFurnitureStatusUpdate = async (furnitureForm: any, newStatus: string) => {
  if (!transporter || !furnitureForm.email) {
    logger.info('Email not configured or no email provided', { 
      furnitureFormId: furnitureForm._id 
    });
    return;
  }

  const statusMessages: { [key: string]: string } = {
    'Requested': 'Your furniture request has been received.',
    'Accepted': 'Your furniture request has been accepted! We will contact you shortly.',
    'Ongoing': 'Your furniture is being prepared.',
    'Completed': 'Your furniture request has been completed. We hope you enjoy your new furniture!',
    'Cancelled': 'Your furniture request has been cancelled.'
  };

  const mailOptions = {
    from: config.NODEMAILER_EMAIL,
    to: furnitureForm.email,
    subject: 'Furniture Request Status Update',
    html: `
      <h2>${statusMessages[newStatus] || 'Furniture Request Update'}</h2>
      <p>Hello ${furnitureForm.name},</p>
      <p>Your furniture request status has been updated:</p>
      <h3>Request Details:</h3>
      <ul>
        <li><strong>Item ID:</strong> ${furnitureForm.furniture_id}</li>
        <li><strong>Type:</strong> ${furnitureForm.listing_type || 'N/A'}</li>
        <li><strong>New Status:</strong> ${newStatus}</li>
      </ul>
      <p>Thank you for using BrokerIn!</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Furniture status update email sent', { email: furnitureForm.email, status: newStatus });
  } catch (error) {
    logger.error('Error sending furniture status update email:', error);
  }
}; 