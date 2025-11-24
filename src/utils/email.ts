import nodemailer from 'nodemailer';
import { IServiceBooking } from '../models/ServiceBooking';
import logger from './logger';
import { config } from '../config/config';
import { InvoiceData, generateInvoiceHTML } from './invoiceGenerator';

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

// Company Information
const COMPANY_INFO = {
  name: 'BrokerIn',
  email: 'brokerin.in@gmail.com',
  phone: '+91-8310652049', // Update with actual phone number
  address: 'Udayapala , Kanakapura Road, Bangalore, 560082', // Update with actual address
  website: 'https://brokerin.in', // Update with actual website
  logoUrl: 'https://www.brokerin.in/images/logo.png' // Replace with actual logo URL
};

/**
 * Generate professional email template with company branding
 */
const getEmailTemplate = (content: string, subject?: string): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject || COMPANY_INFO.name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center;">
              <img src="${COMPANY_INFO.logoUrl}" alt="${COMPANY_INFO.name}" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${COMPANY_INFO.name}</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              ${content}
            </td>
          </tr>

          <!-- Footer with Company Details -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; border-top: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center; padding-bottom: 20px;">
                    <p style="margin: 0 0 10px 0; color: #374151; font-size: 16px; font-weight: 600;">${COMPANY_INFO.name}</p>
                    <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">${COMPANY_INFO.address}</p>
                    <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">
                      <a href="tel:${COMPANY_INFO.phone}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.phone}</a>
                    </p>
                    <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">
                      <a href="mailto:${COMPANY_INFO.email}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.email}</a>
                    </p>
                    ${COMPANY_INFO.website ? `
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                      <a href="${COMPANY_INFO.website}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.website}</a>
                    </p>
                    ` : ''}
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                      © ${new Date().getFullYear()} ${COMPANY_INFO.name}. All rights reserved.<br>
                      This is an automated email. Please do not reply to this message.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

// Send OTP email for signup/verification
export const sendOtp = async (email: string, otp: string, purpose: string = 'Signup') => {
  if (!transporter || !email) {
    logger.warn('Email not configured or no email provided for OTP', { email, purpose });
    return;
  }

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Hello,</p>
    <p style="font-size: 16px; color: #374151; margin: 0 0 30px 0;">Your verification code for ${purpose} is:</p>
    
    <div style="background-color: #eff6ff; border: 2px solid #2563eb; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
      <h1 style="font-size: 48px; letter-spacing: 8px; color: #2563eb; margin: 0; font-weight: 700; font-family: 'Courier New', monospace;">${otp}</h1>
    </div>
    
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">This code will expire in <strong>20 minutes</strong>.</p>
    <p style="font-size: 14px; color: #6b7280; margin: 0 0 20px 0;">Please enter this code to complete your ${purpose.toLowerCase()} process.</p>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">⚠️ Security Notice</p>
      <p style="margin: 5px 0 0 0; color: #78350f; font-size: 13px;">If you didn't request this code, please ignore this email. Never share your OTP with anyone.</p>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin: 20px 0 0 0;">If you have any questions, please contact us at <a href="mailto:${COMPANY_INFO.email}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.email}</a> or call us at <a href="tel:${COMPANY_INFO.phone}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.phone}</a>.</p>
  `;

  const mailOptions = {
    from: config.NODEMAILER_EMAIL,
    to: email,
    subject: `Your ${purpose} Verification Code - ${COMPANY_INFO.name}`,
    html: getEmailTemplate(content, `${purpose} Verification Code`),
    text: `Your ${purpose} verification code is: ${otp}\n\nThis code will expire in 20 minutes.\n\nIf you didn't request this code, please ignore this email.`
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('OTP email sent successfully', { email, purpose });
  } catch (error: any) {
    logger.error('Error sending OTP email:', { 
      error: error.message || error,
      stack: error.stack,
      email,
      purpose,
      otp // Log OTP for debugging if email fails
    });
    throw error; // Re-throw so caller can handle
  }
};

// Send booking confirmation to customer
export const sendBookingConfirmation = async (booking: IServiceBooking) => {
  if (!transporter || !(booking as any).email) {
    logger.info('Email not configured or no email provided', { 
      bookingId: booking.service_booking_id 
    });
    return;
  }

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Hello <strong>${booking.name}</strong>,</p>
    <p style="font-size: 16px; color: #374151; margin: 0 0 30px 0;">Thank you for choosing ${COMPANY_INFO.name}! Your service booking has been received and confirmed.</p>
    
    <div style="background-color: #f9fafb; border-left: 4px solid #2563eb; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
      <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">Booking Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;"><strong>Booking ID:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 600;">${booking.service_booking_id}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Service Type:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${booking.service_type}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Preferred Date:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${new Date(booking.preferred_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Preferred Time:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${booking.preferred_time}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Service Address:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${booking.service_address}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Status:</strong></td>
          <td style="padding: 8px 0;">
            <span style="background-color: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${booking.status}</span>
          </td>
        </tr>
      </table>
    </div>
    
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Our team will contact you shortly to confirm the details and schedule your service.</p>
    <p style="font-size: 14px; color: #6b7280; margin: 0;">If you have any questions or need to make changes, please contact us at <a href="mailto:${COMPANY_INFO.email}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.email}</a> or call us at <a href="tel:${COMPANY_INFO.phone}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.phone}</a>.</p>
  `;

  const mailOptions = {
    from: config.NODEMAILER_EMAIL,
    to: (booking as any).email,
    subject: 'Service Booking Confirmation - ' + booking.service_booking_id,
    html: getEmailTemplate(content, 'Service Booking Confirmation')
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

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Hello <strong>${booking.name}</strong>,</p>
    <p style="font-size: 16px; color: #374151; margin: 0 0 30px 0;">Your service booking schedule has been updated. Please find the updated details below:</p>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
      <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">Previous Schedule</h3>
      <p style="margin: 5px 0; color: #78350f; font-size: 14px;"><strong>Date:</strong> ${oldDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p style="margin: 5px 0; color: #78350f; font-size: 14px;"><strong>Time:</strong> ${oldTime}</p>
    </div>
    
    <div style="background-color: #dbeafe; border-left: 4px solid #2563eb; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
      <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">New Schedule</h3>
      <p style="margin: 5px 0; color: #1e3a8a; font-size: 14px;"><strong>Date:</strong> ${newDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p style="margin: 5px 0; color: #1e3a8a; font-size: 14px;"><strong>Time:</strong> ${newTime}</p>
    </div>
    
    <div style="background-color: #f9fafb; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <p style="margin: 5px 0; color: #6b7280; font-size: 14px;"><strong>Booking ID:</strong> <span style="color: #374151;">${booking.service_booking_id}</span></p>
      <p style="margin: 5px 0; color: #6b7280; font-size: 14px;"><strong>Service Type:</strong> <span style="color: #374151;">${booking.service_type}</span></p>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin: 0;">If you have any questions, please contact us at <a href="mailto:${COMPANY_INFO.email}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.email}</a>.</p>
  `;

  const mailOptions = {
    from: config.NODEMAILER_EMAIL,
    to: (booking as any).email,
    subject: 'Service Booking Update - ' + booking.service_booking_id,
    html: getEmailTemplate(content, 'Service Booking Update')
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

  const statusColors: { [key: string]: { bg: string; text: string; border: string } } = {
    'accepted': { bg: '#dbeafe', text: '#1e40af', border: '#2563eb' },
    'ongoing': { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
    'completed': { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
    'cancelled': { bg: '#fee2e2', text: '#991b1b', border: '#dc2626' }
  };

  const statusStyle = statusColors[newStatus] || { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' };

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Hello <strong>${booking.name}</strong>,</p>
    <p style="font-size: 16px; color: #374151; margin: 0 0 30px 0;">${statusMessages[newStatus] || 'Your service booking status has been updated.'}</p>
    
    <div style="background-color: ${statusStyle.bg}; border-left: 4px solid ${statusStyle.border}; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
      <h3 style="color: ${statusStyle.text}; margin: 0 0 15px 0; font-size: 18px;">Booking Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;"><strong>Booking ID:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 600;">${booking.service_booking_id}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Service Type:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${booking.service_type}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Status:</strong></td>
          <td style="padding: 8px 0;">
            <span style="background-color: ${statusStyle.bg}; color: ${statusStyle.text}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: capitalize;">${newStatus}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Date:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${new Date(booking.preferred_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Time:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${booking.preferred_time}</td>
        </tr>
      </table>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin: 0;">If you have any questions, please contact us at <a href="mailto:${COMPANY_INFO.email}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.email}</a>.</p>
  `;

  const mailOptions = {
    from: config.NODEMAILER_EMAIL,
    to: (booking as any).email,
    subject: 'Service Booking Status Update - ' + booking.service_booking_id,
    html: getEmailTemplate(content, 'Service Booking Status Update')
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

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">A new service booking request has been received.</p>
    
    <div style="background-color: #f9fafb; border-left: 4px solid #2563eb; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
      <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">Booking Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;"><strong>Booking ID:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 600;">${booking.service_booking_id}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Service Type:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${booking.service_type}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Customer Name:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${booking.name}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Phone:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;"><a href="tel:${booking.phone_number}" style="color: #2563eb; text-decoration: none;">${booking.phone_number}</a></td>
        </tr>
        ${(booking as any).email ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Email:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;"><a href="mailto:${(booking as any).email}" style="color: #2563eb; text-decoration: none;">${(booking as any).email}</a></td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Preferred Date:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${new Date(booking.preferred_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Preferred Time:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${booking.preferred_time}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Service Address:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${booking.service_address}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Additional Notes:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${booking.additional_notes || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Status:</strong></td>
          <td style="padding: 8px 0;">
            <span style="background-color: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${booking.status}</span>
          </td>
        </tr>
      </table>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin: 0;">Please review and process this booking request in the admin dashboard.</p>
  `;

  const mailOptions = {
    from: config.NODEMAILER_EMAIL,
    to: config.NODEMAILER_EMAIL, // Admin email
    subject: 'New Service Booking Request - ' + booking.service_booking_id,
    html: getEmailTemplate(content, 'New Service Booking Request')
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

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Hello <strong>${furnitureForm.name}</strong>,</p>
    <p style="font-size: 16px; color: #374151; margin: 0 0 30px 0;">Thank you for your interest in our furniture item! Your request has been received and confirmed.</p>
    
    <div style="background-color: #f9fafb; border-left: 4px solid #2563eb; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
      <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">Request Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;"><strong>Furniture:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 600;">${furniture.name || furnitureForm.furniture_id}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Category:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${furniture.category || 'N/A'}</td>
        </tr>
        ${furnitureForm.listing_type ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Type:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${furnitureForm.listing_type}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Status:</strong></td>
          <td style="padding: 8px 0;">
            <span style="background-color: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${furnitureForm.status}</span>
          </td>
        </tr>
      </table>
    </div>
    
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Our team will contact you shortly regarding your request.</p>
    <p style="font-size: 14px; color: #6b7280; margin: 0;">If you have any questions, please contact us at <a href="mailto:${COMPANY_INFO.email}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.email}</a> or call us at <a href="tel:${COMPANY_INFO.phone}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.phone}</a>.</p>
  `;

  const mailOptions = {
    from: config.NODEMAILER_EMAIL,
    to: furnitureForm.email,
    subject: 'Furniture Request Confirmation - ' + (furniture.name || furnitureForm.furniture_id),
    html: getEmailTemplate(content, 'Furniture Request Confirmation')
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

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Hello <strong>${furnitureForm.name}</strong>,</p>
    <p style="font-size: 16px; color: #374151; margin: 0 0 30px 0;">${statusMessages[newStatus] || 'Your furniture request status has been updated.'}</p>
    
    <div style="background-color: #f9fafb; border-left: 4px solid #2563eb; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
      <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">Request Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;"><strong>Item ID:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 600;">${furnitureForm.furniture_id}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Type:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${furnitureForm.listing_type || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>New Status:</strong></td>
          <td style="padding: 8px 0;">
            <span style="background-color: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${newStatus}</span>
          </td>
        </tr>
      </table>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin: 0;">If you have any questions, please contact us at <a href="mailto:${COMPANY_INFO.email}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.email}</a>.</p>
  `;

  const mailOptions = {
    from: config.NODEMAILER_EMAIL,
    to: furnitureForm.email,
    subject: 'Furniture Request Status Update - ' + furnitureForm.furniture_id,
    html: getEmailTemplate(content, 'Furniture Request Status Update')
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Furniture status update email sent', { email: furnitureForm.email, status: newStatus });
  } catch (error) {
    logger.error('Error sending furniture status update email:', error);
  }
};

// ===== PROPERTY REQUEST EMAILS =====

// Send property request confirmation to customer
export const sendPropertyRequestConfirmation = async (propertyForm: any, property: any) => {
  if (!transporter || !propertyForm.email) {
    logger.info('Email not configured or no email provided', { 
      propertyFormId: propertyForm._id 
    });
    return;
  }

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Hello <strong>${propertyForm.name}</strong>,</p>
    <p style="font-size: 16px; color: #374151; margin: 0 0 30px 0;">Thank you for your interest in our property! Your request has been received and confirmed.</p>
    
    <div style="background-color: #f9fafb; border-left: 4px solid #2563eb; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
      <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">Request Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;"><strong>Property:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 600;">${property.name || propertyForm.property_id}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Property ID:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${propertyForm.property_id}</td>
        </tr>
        ${property.location ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Location:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${property.location}</td>
        </tr>
        ` : ''}
        ${property.property_type ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Type:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${property.property_type}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Status:</strong></td>
          <td style="padding: 8px 0;">
            <span style="background-color: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${propertyForm.status || 'Requested'}</span>
          </td>
        </tr>
      </table>
    </div>
    
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Our team will contact you shortly regarding your request.</p>
    <p style="font-size: 14px; color: #6b7280; margin: 0;">If you have any questions, please contact us at <a href="mailto:${COMPANY_INFO.email}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.email}</a> or call us at <a href="tel:${COMPANY_INFO.phone}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.phone}</a>.</p>
  `;

  const mailOptions = {
    from: config.NODEMAILER_EMAIL,
    to: propertyForm.email,
    subject: 'Property Request Confirmation - ' + (property.name || propertyForm.property_id),
    html: getEmailTemplate(content, 'Property Request Confirmation')
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Property request confirmation email sent', { email: propertyForm.email });
  } catch (error) {
    logger.error('Error sending property request confirmation email:', error);
  }
};

// Send property request status update to customer
export const sendPropertyStatusUpdate = async (propertyForm: any, newStatus: string) => {
  if (!transporter || !propertyForm.email) {
    logger.info('Email not configured or no email provided', { 
      propertyFormId: propertyForm._id 
    });
    return;
  }

  const statusMessages: { [key: string]: string } = {
    'Requested': 'Your property request has been received.',
    'Accepted': 'Your property request has been accepted! We will contact you shortly.',
    'Ongoing': 'Your property request is being processed.',
    'Completed': 'Your property request has been completed. We hope you found your perfect property!',
    'Cancelled': 'Your property request has been cancelled.'
  };

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Hello <strong>${propertyForm.name}</strong>,</p>
    <p style="font-size: 16px; color: #374151; margin: 0 0 30px 0;">${statusMessages[newStatus] || 'Your property request status has been updated.'}</p>
    
    <div style="background-color: #f9fafb; border-left: 4px solid #2563eb; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
      <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">Request Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;"><strong>Property ID:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 600;">${propertyForm.property_id}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>New Status:</strong></td>
          <td style="padding: 8px 0;">
            <span style="background-color: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${newStatus}</span>
          </td>
        </tr>
      </table>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin: 0;">If you have any questions, please contact us at <a href="mailto:${COMPANY_INFO.email}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.email}</a>.</p>
  `;

  const mailOptions = {
    from: config.NODEMAILER_EMAIL,
    to: propertyForm.email,
    subject: 'Property Request Status Update - ' + propertyForm.property_id,
    html: getEmailTemplate(content, 'Property Request Status Update')
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Property status update email sent', { email: propertyForm.email, status: newStatus });
  } catch (error) {
    logger.error('Error sending property status update email:', error);
  }
};

// ===== RENTAL EMAILS =====

// Send rental confirmation to customer
export const sendRentalConfirmation = async (rental: any) => {
  if (!transporter || !rental.customer_email) {
    logger.info('Email not configured or no email provided', { 
      rentalId: rental.rental_id 
    });
    return;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const itemsList = rental.items.map((item: any) => `
    <tr>
      <td style="padding: 8px 0; color: #374151; font-size: 14px;">${item.product_name}</td>
      <td style="padding: 8px 0; color: #6b7280; font-size: 14px; text-align: center;">${item.quantity}x</td>
      <td style="padding: 8px 0; color: #374151; font-size: 14px; text-align: right; font-weight: 600;">${formatCurrency(item.monthly_price)}/month</td>
      <td style="padding: 8px 0; color: #374151; font-size: 14px; text-align: right;">${formatCurrency(item.deposit)}</td>
    </tr>
  `).join('');

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Hello <strong>${rental.customer_name}</strong>,</p>
    <p style="font-size: 16px; color: #374151; margin: 0 0 30px 0;">Thank you for choosing ${COMPANY_INFO.name}! Your rental has been successfully set up.</p>
    
    <div style="background-color: #f9fafb; border-left: 4px solid #2563eb; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
      <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">Rental Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;"><strong>Rental ID:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 600;">${rental.rental_id}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Start Date:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${new Date(rental.start_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
        ${rental.end_date ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>End Date:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${new Date(rental.end_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Status:</strong></td>
          <td style="padding: 8px 0;">
            <span style="background-color: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${rental.status}</span>
          </td>
        </tr>
      </table>
    </div>

    <div style="background-color: #f9fafb; border-left: 4px solid #10b981; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
      <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 18px;">Rented Items</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 8px 0; text-align: left; color: #6b7280; font-size: 14px; font-weight: 600;">Item</th>
            <th style="padding: 8px 0; text-align: center; color: #6b7280; font-size: 14px; font-weight: 600;">Qty</th>
            <th style="padding: 8px 0; text-align: right; color: #6b7280; font-size: 14px; font-weight: 600;">Monthly Rent</th>
            <th style="padding: 8px 0; text-align: right; color: #6b7280; font-size: 14px; font-weight: 600;">Deposit</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
        </tbody>
      </table>
    </div>

    <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 20px; border-radius: 6px; margin-bottom: 30px; text-align: center;">
      <p style="color: #ffffff; font-size: 14px; margin: 0 0 10px 0; opacity: 0.9;">Total Monthly Payment</p>
      <p style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0 0 10px 0;">${formatCurrency(rental.total_monthly_amount)}</p>
      <p style="color: #ffffff; font-size: 14px; margin: 0; opacity: 0.9;">Total Deposit: ${formatCurrency(rental.total_deposit)}</p>
    </div>
    
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">We will send you payment reminders before each due date. Please ensure timely payments to avoid any inconvenience.</p>
    <p style="font-size: 14px; color: #6b7280; margin: 0;">If you have any questions, please contact us at <a href="mailto:${COMPANY_INFO.email}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.email}</a> or call us at <a href="tel:${COMPANY_INFO.phone}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.phone}</a>.</p>
  `;

  const mailOptions = {
    from: config.NODEMAILER_EMAIL,
    to: rental.customer_email,
    subject: `Rental Confirmation - ${rental.rental_id}`,
    html: getEmailTemplate(content, 'Rental Confirmation')
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Rental confirmation email sent', { email: rental.customer_email, rentalId: rental.rental_id });
  } catch (error) {
    logger.error('Error sending rental confirmation email:', error);
  }
};

// Send payment reminder to customer
export const sendPaymentReminder = async (rental: any, paymentRecord: any, daysUntilDue: number) => {
  if (!transporter || !rental.customer_email) {
    logger.info('Email not configured or no email provided', { 
      rentalId: rental.rental_id 
    });
    return;
  }

  const dueDate = new Date(paymentRecord.dueDate);
  const reminderType = daysUntilDue === 0 ? 'due today' : daysUntilDue === 1 ? 'due tomorrow' : `due in ${daysUntilDue} days`;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Hello <strong>${rental.customer_name}</strong>,</p>
    <p style="font-size: 16px; color: #374151; margin: 0 0 30px 0;">This is a friendly reminder that your rental payment is <strong>${reminderType}</strong>.</p>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
      <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">Payment Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;"><strong>Rental ID:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 600;">${rental.rental_id}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Month:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${formatMonth(paymentRecord.month)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Amount Due:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 600; font-size: 18px;">${formatCurrency(paymentRecord.amount)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Due Date:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${dueDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Status:</strong></td>
          <td style="padding: 8px 0;">
            <span style="background-color: #fbbf24; color: #78350f; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${paymentRecord.status}</span>
          </td>
        </tr>
      </table>
    </div>

    <div style="background-color: #f9fafb; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Rented Items:</strong></p>
      <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px;">
        ${rental.items.map((item: any) => `<li>${item.product_name} - ${formatCurrency(item.monthly_price)}/month</li>`).join('')}
      </ul>
    </div>

    <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600;">
        ⚠️ Please make the payment before the due date to avoid any late fees or service interruption.
      </p>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin: 0 0 10px 0;">If you have already made the payment, please ignore this reminder.</p>
    <p style="font-size: 14px; color: #6b7280; margin: 0;">For payment queries, please contact us at <a href="mailto:${COMPANY_INFO.email}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.email}</a> or call us at <a href="tel:${COMPANY_INFO.phone}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.phone}</a>.</p>
  `;

  const mailOptions = {
    from: config.NODEMAILER_EMAIL,
    to: rental.customer_email,
    subject: `Payment Reminder - ${formatCurrency(paymentRecord.amount)} ${reminderType} - ${rental.rental_id}`,
    html: getEmailTemplate(content, 'Payment Reminder')
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Payment reminder email sent', { 
      email: rental.customer_email, 
      rentalId: rental.rental_id,
      month: paymentRecord.month,
      daysUntilDue
    });
  } catch (error) {
    logger.error('Error sending payment reminder email:', error);
  }
};

// Send comprehensive payment reminder with all pending/overdue months
export const sendComprehensivePaymentReminder = async (
  rental: any,
  pendingPayments: any[],
  overduePayments: any[],
  paymentLink?: string // Razorpay payment link (optional, for future use)
) => {
  if (!transporter || !rental.customer_email) {
    logger.info('Email not configured or no email provided', { 
      rentalId: rental.rental_id 
    });
    return;
  }

  const totalPending = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalOverdue = overduePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalDue = totalPending + totalOverdue;

  // Format month name
  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // BrokerIn logo (using a placeholder - replace with actual logo URL)
  const logoUrl = 'https://via.placeholder.com/200x60/2563eb/ffffff?text=BrokerIn';
  // TODO: Replace with actual BrokerIn logo URL from your assets

  const pendingRows = pendingPayments.map(p => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatMonth(p.month)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(p.amount)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${new Date(p.dueDate).toLocaleDateString('en-IN')}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <span style="background-color: #fbbf24; color: #78350f; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
          Pending
        </span>
      </td>
    </tr>
  `).join('');

  const overdueRows = overduePayments.map(p => {
    const daysOverdue = Math.floor((new Date().getTime() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    return `
    <tr style="background-color: #fef2f2;">
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatMonth(p.month)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #dc2626; font-weight: 600;">${formatCurrency(p.amount)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #dc2626;">${new Date(p.dueDate).toLocaleDateString('en-IN')}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <span style="background-color: #dc2626; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
          Overdue (${daysOverdue} days)
        </span>
      </td>
    </tr>
  `;
  }).join('');

  const mailOptions = {
    from: config.NODEMAILER_EMAIL,
    to: rental.customer_email,
    subject: `Payment Reminder - ₹${totalDue.toLocaleString('en-IN')} Due - ${rental.rental_id}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center;">
              <img src="${logoUrl}" alt="BrokerIn" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Payment Reminder</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Hello <strong>${rental.customer_name}</strong>,</p>
              
              <p style="font-size: 16px; color: #374151; margin: 0 0 30px 0;">
                This is a reminder regarding your rental payments. Please find the details below:
              </p>

              <!-- Rental Information -->
              <div style="background-color: #f9fafb; border-left: 4px solid #2563eb; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Rental ID:</strong> ${rental.rental_id}</p>
                <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Monthly Rent:</strong> ${formatCurrency(rental.total_monthly_amount)}</p>
                <p style="margin: 0; color: #6b7280; font-size: 14px;"><strong>Rented Items:</strong> ${rental.items.map((item: any) => item.product_name).join(', ')}</p>
              </div>

              ${overduePayments.length > 0 ? `
              <!-- Overdue Payments Section -->
              <div style="margin-bottom: 30px;">
                <h2 style="color: #dc2626; font-size: 20px; margin: 0 0 15px 0; display: flex; align-items: center;">
                  <span style="background-color: #dc2626; color: white; width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 10px;"></span>
                  Overdue Payments (${overduePayments.length})
                </h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                  <thead>
                    <tr style="background-color: #fef2f2;">
                      <th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 2px solid #dc2626;">Month</th>
                      <th style="padding: 12px; text-align: right; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 2px solid #dc2626;">Amount</th>
                      <th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 2px solid #dc2626;">Due Date</th>
                      <th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 2px solid #dc2626;">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${overdueRows}
                    <tr style="background-color: #fee2e2;">
                      <td colspan="3" style="padding: 12px; text-align: right; font-weight: 600; color: #dc2626;">Total Overdue:</td>
                      <td style="padding: 12px; text-align: right; font-weight: 700; color: #dc2626; font-size: 16px;">${formatCurrency(totalOverdue)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              ` : ''}

              ${pendingPayments.length > 0 ? `
              <!-- Pending Payments Section -->
              <div style="margin-bottom: 30px;">
                <h2 style="color: #2563eb; font-size: 20px; margin: 0 0 15px 0; display: flex; align-items: center;">
                  <span style="background-color: #2563eb; color: white; width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 10px;"></span>
                  Pending Payments (${pendingPayments.length})
                </h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                  <thead>
                    <tr style="background-color: #eff6ff;">
                      <th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 2px solid #2563eb;">Month</th>
                      <th style="padding: 12px; text-align: right; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 2px solid #2563eb;">Amount</th>
                      <th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 2px solid #2563eb;">Due Date</th>
                      <th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 2px solid #2563eb;">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${pendingRows}
                    <tr style="background-color: #dbeafe;">
                      <td colspan="3" style="padding: 12px; text-align: right; font-weight: 600; color: #1e40af;">Total Pending:</td>
                      <td style="padding: 12px; text-align: right; font-weight: 700; color: #1e40af; font-size: 16px;">${formatCurrency(totalPending)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              ` : ''}

              <!-- Total Due Summary -->
              <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 20px; border-radius: 6px; margin-bottom: 30px; text-align: center;">
                <p style="color: #ffffff; font-size: 14px; margin: 0 0 5px 0; opacity: 0.9;">Total Amount Due</p>
                <p style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0;">${formatCurrency(totalDue)}</p>
              </div>

              ${paymentLink ? `
              <!-- Payment Button (Scalable for Razorpay) -->
              <div style="text-align: center; margin-bottom: 30px;">
                <a href="${paymentLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                  Pay Now via Razorpay
                </a>
              </div>
              ` : `
              <!-- Payment Instructions -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 30px; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>Payment Instructions:</strong> Please make the payment before the due date to avoid any late fees. 
                  ${overduePayments.length > 0 ? 'Overdue payments require immediate attention.' : ''}
                </p>
              </div>
              `}

              <!-- Footer -->
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                  If you have already made the payment, please ignore this reminder or contact us to update your payment status.
                </p>
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  For payment queries or assistance, please contact us at <a href="mailto:${COMPANY_INFO.email}" style="color: #2563eb;">${COMPANY_INFO.email}</a> or call us at <a href="tel:${COMPANY_INFO.phone}" style="color: #2563eb;">${COMPANY_INFO.phone}</a>
                </p>
              </div>

              <p style="color: #9ca3af; font-size: 12px; margin: 30px 0 0 0; text-align: center;">
                Thank you for using ${COMPANY_INFO.name}!<br>
                This is an automated email. Please do not reply to this message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `Payment Reminder - Rental ${rental.rental_id}\n\nTotal Due: ₹${totalDue.toLocaleString('en-IN')}\n\nOverdue Payments: ${overduePayments.length}\nPending Payments: ${pendingPayments.length}\n\nPlease make the payment before the due date.`
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Comprehensive payment reminder email sent', { 
      email: rental.customer_email, 
      rentalId: rental.rental_id,
      pendingCount: pendingPayments.length,
      overdueCount: overduePayments.length,
      totalDue
    });
  } catch (error) {
    logger.error('Error sending comprehensive payment reminder email:', error);
    throw error;
  }
};

// Send overdue payment reminder
export const sendOverduePaymentReminder = async (rental: any, paymentRecord: any, daysOverdue: number) => {
  if (!transporter || !rental.customer_email) {
    logger.info('Email not configured or no email provided', { 
      rentalId: rental.rental_id 
    });
    return;
  }

  const dueDate = new Date(paymentRecord.dueDate);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Hello <strong>${rental.customer_name}</strong>,</p>
    <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
      <h2 style="color: #dc2626; margin: 0 0 10px 0; font-size: 20px;">⚠️ Payment Overdue</h2>
      <p style="color: #991b1b; margin: 0; font-size: 16px; font-weight: 600;">This is an urgent reminder that your rental payment is overdue.</p>
    </div>
    
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
      <h3 style="color: #dc2626; margin: 0 0 15px 0; font-size: 18px;">Payment Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;"><strong>Rental ID:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 600;">${rental.rental_id}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Month:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${formatMonth(paymentRecord.month)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Amount Due:</strong></td>
          <td style="padding: 8px 0; color: #dc2626; font-size: 18px; font-weight: 700;">${formatCurrency(paymentRecord.amount)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Due Date:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${dueDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Days Overdue:</strong></td>
          <td style="padding: 8px 0; color: #dc2626; font-size: 14px; font-weight: 600;">${daysOverdue} day(s)</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Status:</strong></td>
          <td style="padding: 8px 0;">
            <span style="background-color: #dc2626; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${paymentRecord.status}</span>
          </td>
        </tr>
      </table>
    </div>

    <div style="background-color: #f9fafb; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Rented Items:</strong></p>
      <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px;">
        ${rental.items.map((item: any) => `<li>${item.product_name} - ${formatCurrency(item.monthly_price)}/month</li>`).join('')}
      </ul>
    </div>

    <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600;">
        ⚠️ Please make the payment immediately to avoid service interruption or additional late fees.
      </p>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin: 0 0 10px 0;">If you have already made the payment, please contact us to update your payment status.</p>
    <p style="font-size: 14px; color: #6b7280; margin: 0;">For payment assistance, please contact us urgently at <a href="mailto:${COMPANY_INFO.email}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.email}</a> or call us at <a href="tel:${COMPANY_INFO.phone}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.phone}</a>.</p>
  `;

  const mailOptions = {
    from: config.NODEMAILER_EMAIL,
    to: rental.customer_email,
    subject: `URGENT: Overdue Payment - ${formatCurrency(paymentRecord.amount)} - ${rental.rental_id}`,
    html: getEmailTemplate(content, 'Overdue Payment Reminder')
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Overdue payment reminder email sent', { 
      email: rental.customer_email, 
      rentalId: rental.rental_id,
      month: paymentRecord.month,
      daysOverdue
    });
  } catch (error) {
    logger.error('Error sending overdue payment reminder email:', error);
  }
};

// Send payment confirmation
export const sendPaymentConfirmation = async (rental: any, paymentRecord: any) => {
  if (!transporter || !rental.customer_email) {
    logger.info('Email not configured or no email provided', { 
      rentalId: rental.rental_id 
    });
    return;
  }

  const paidDate = paymentRecord.paidDate ? new Date(paymentRecord.paidDate) : new Date();
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Hello <strong>${rental.customer_name}</strong>,</p>
    <p style="font-size: 16px; color: #374151; margin: 0 0 30px 0;">Thank you! We have received your payment.</p>
    
    <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
      <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 18px;">Payment Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;"><strong>Rental ID:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 600;">${rental.rental_id}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Month:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${formatMonth(paymentRecord.month)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Amount Paid:</strong></td>
          <td style="padding: 8px 0; color: #065f46; font-size: 18px; font-weight: 700;">${formatCurrency(paymentRecord.amount)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Payment Date:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${paidDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
        ${paymentRecord.paymentMethod ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Payment Method:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${paymentRecord.paymentMethod}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Status:</strong></td>
          <td style="padding: 8px 0;">
            <span style="background-color: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${paymentRecord.status}</span>
          </td>
        </tr>
      </table>
    </div>

    <div style="background-color: #f9fafb; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Rented Items:</strong></p>
      <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px;">
        ${rental.items.map((item: any) => `<li>${item.product_name} - ${formatCurrency(item.monthly_price)}/month</li>`).join('')}
      </ul>
    </div>

    <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <p style="margin: 0; color: #065f46; font-size: 14px; font-weight: 600;">
        ✅ Your payment has been successfully recorded. We appreciate your timely payment!
      </p>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin: 0;">If you have any questions, please contact us at <a href="mailto:${COMPANY_INFO.email}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.email}</a>.</p>
  `;

  const mailOptions = {
    from: config.NODEMAILER_EMAIL,
    to: rental.customer_email,
    subject: `Payment Confirmation - ${formatCurrency(paymentRecord.amount)} - ${rental.rental_id}`,
    html: getEmailTemplate(content, 'Payment Confirmation')
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Payment confirmation email sent', { 
      email: rental.customer_email, 
      rentalId: rental.rental_id,
      month: paymentRecord.month
    });
  } catch (error) {
    logger.error('Error sending payment confirmation email:', error);
  }
};

// Send rental status update
export const sendRentalStatusUpdate = async (rental: any, oldStatus: string, newStatus: string) => {
  if (!transporter || !rental.customer_email) {
    logger.info('Email not configured or no email provided', { 
      rentalId: rental.rental_id 
    });
    return;
  }

  const statusMessages: { [key: string]: string } = {
    'Active': 'Your rental is now active.',
    'Completed': 'Your rental period has been completed. Thank you for using BrokerIn!',
    'Cancelled': 'Your rental has been cancelled.',
    'On Hold': 'Your rental is temporarily on hold.'
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Hello <strong>${rental.customer_name}</strong>,</p>
    <p style="font-size: 16px; color: #374151; margin: 0 0 30px 0;">Your rental status has been updated.</p>
    
    <div style="background-color: #f9fafb; border-left: 4px solid #2563eb; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
      <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">Status Change</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;"><strong>Previous Status:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${oldStatus}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>New Status:</strong></td>
          <td style="padding: 8px 0;">
            <span style="background-color: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${newStatus}</span>
          </td>
        </tr>
      </table>
    </div>

    <div style="background-color: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <p style="margin: 0; color: #1e40af; font-size: 14px;">${statusMessages[newStatus] || 'Your rental status has been updated.'}</p>
    </div>

    <div style="background-color: #f9fafb; border-left: 4px solid #10b981; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
      <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 18px;">Rental Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;"><strong>Rental ID:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 600;">${rental.rental_id}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Start Date:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${new Date(rental.start_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
        ${rental.end_date ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>End Date:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${new Date(rental.end_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="background-color: #f9fafb; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Rented Items:</strong></p>
      <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px;">
        ${rental.items.map((item: any) => `<li>${item.product_name} - ${formatCurrency(item.monthly_price)}/month</li>`).join('')}
      </ul>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin: 0;">If you have any questions, please contact us at <a href="mailto:${COMPANY_INFO.email}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.email}</a> or call us at <a href="tel:${COMPANY_INFO.phone}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.phone}</a>.</p>
  `;

  const mailOptions = {
    from: config.NODEMAILER_EMAIL,
    to: rental.customer_email,
    subject: `Rental Status Update - ${rental.rental_id}`,
    html: getEmailTemplate(content, 'Rental Status Update')
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Rental status update email sent', { 
      email: rental.customer_email, 
      rentalId: rental.rental_id,
      oldStatus,
      newStatus
    });
  } catch (error) {
    logger.error('Error sending rental status update email:', error);
  }
};

/**
 * Send invoice email to customer
 */
export const sendInvoiceEmail = async (
  customerEmail: string | undefined,
  invoiceData: InvoiceData,
  transactionId: string
) => {
  if (!transporter || !customerEmail) {
    logger.info('Email not configured or no email provided', { 
      transactionId,
      hasEmail: !!customerEmail
    });
    return;
  }

  const invoiceHTML = generateInvoiceHTML(invoiceData);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Hello <strong>${invoiceData.customerName}</strong>,</p>
    <p style="font-size: 16px; color: #374151; margin: 0 0 30px 0;">Thank you for your payment! We have received ${formatCurrency(invoiceData.total)}.</p>
    
    <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
      <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 18px;">Payment Information</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;"><strong>Transaction ID:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 600;">${transactionId}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Invoice Number:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 600;">${invoiceData.invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Amount Paid:</strong></td>
          <td style="padding: 8px 0; color: #065f46; font-size: 18px; font-weight: 700;">${formatCurrency(invoiceData.total)}</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #f9fafb; padding: 20px; margin-bottom: 30px; border-radius: 4px; border: 1px solid #e5e7eb;">
      <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; font-weight: 600;">Invoice Details:</p>
      ${invoiceHTML}
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin: 0;">If you have any questions about this invoice, please contact us at <a href="mailto:${COMPANY_INFO.email}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.email}</a> or call us at <a href="tel:${COMPANY_INFO.phone}" style="color: #2563eb; text-decoration: none;">${COMPANY_INFO.phone}</a>.</p>
  `;

  const mailOptions = {
    from: config.NODEMAILER_EMAIL,
    to: customerEmail,
    subject: `Invoice ${invoiceData.invoiceNumber} - Payment Received`,
    html: getEmailTemplate(content, 'Payment Received - Invoice'),
    text: `Payment Received - Invoice ${invoiceData.invoiceNumber}\n\nThank you for your payment of ${formatCurrency(invoiceData.total)}.\nTransaction ID: ${transactionId}`
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Invoice email sent successfully', { 
      email: customerEmail, 
      invoiceNumber: invoiceData.invoiceNumber,
      transactionId
    });
  } catch (error) {
    logger.error('Error sending invoice email:', error);
    throw error;
  }
}; 