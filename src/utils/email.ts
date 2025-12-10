import nodemailer from 'nodemailer';
import { SendMailClient } from 'zeptomail';
import { IServiceBooking } from '../models/ServiceBooking';
import logger from './logger';
import { config } from '../config/config';
import { InvoiceData, generateInvoiceHTML } from './invoiceGenerator';

// Email providers
let transporter: nodemailer.Transporter | null = null;
let zeptoClient: SendMailClient | null = null;

const activeEmailProvider = config.emailProvider;

if (activeEmailProvider === 'zepto' && config.ZEPTO_TOKEN) {
  try {
    const zeptoUrl = config.ZEPTO_URL || 'https://api.zeptomail.in/v1.1/email';
    // Ensure token has the correct prefix (ZeptoMail expects "Zoho-enczapikey <token>")
    const fullToken = config.ZEPTO_TOKEN.startsWith('Zoho-enczapikey ') 
      ? config.ZEPTO_TOKEN 
      : `Zoho-enczapikey ${config.ZEPTO_TOKEN}`;
    
    zeptoClient = new SendMailClient({
      url: zeptoUrl,
      token: fullToken
    });
      logger.info('ZeptoMail client initialized', {
      provider: 'zepto',
      url: zeptoUrl,
      tokenHasPrefix: config.ZEPTO_TOKEN.startsWith('Zoho-enczapikey '),
      bounceEmail: config.ZEPTO_BOUNCE_EMAIL ? 'configured (optional)' : 'not set (optional)'
    });
  } catch (error: any) {
    logger.error('Failed to initialize ZeptoMail client', {
      error: error?.message || error,
      stack: error?.stack
    });
  }
} else if (config.isEmailEnabled()) {
  const smtpHost = config.NODEMAILER_SMTP_HOST || 'smtp.zoho.in';
  const smtpPort = config.NODEMAILER_SMTP_PORT ? parseInt(config.NODEMAILER_SMTP_PORT, 10) : 587;
  const smtpSecure = typeof config.NODEMAILER_SMTP_SECURE !== 'undefined'
    ? config.NODEMAILER_SMTP_SECURE === 'true'
    : smtpPort === 465;
  const connectionTimeout = config.NODEMAILER_SMTP_CONNECTION_TIMEOUT
    ? parseInt(config.NODEMAILER_SMTP_CONNECTION_TIMEOUT, 10)
    : 15000;
  const greetingTimeout = config.NODEMAILER_SMTP_GREETING_TIMEOUT
    ? parseInt(config.NODEMAILER_SMTP_GREETING_TIMEOUT, 10)
    : 10000;
  const socketTimeout = config.NODEMAILER_SMTP_SOCKET_TIMEOUT
    ? parseInt(config.NODEMAILER_SMTP_SOCKET_TIMEOUT, 10)
    : 20000;
  const enableSmtpDebug = config.NODEMAILER_SMTP_DEBUG === 'true';
  const enableSmtpLogger = enableSmtpDebug || config.NODEMAILER_SMTP_LOGGER === 'true';

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    requireTLS: !smtpSecure,
    auth: {
      user: config.NODEMAILER_EMAIL,
      pass: config.NODEMAILER_PASSWORD,
    },
    tls: {
      minVersion: 'TLSv1.2'
    },
    connectionTimeout,
    greetingTimeout,
    socketTimeout,
    logger: enableSmtpLogger,
    debug: enableSmtpDebug
  });

  transporter.verify()
    .then(() => {
      logger.info('SMTP transporter verified', {
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        connectionTimeout,
        greetingTimeout,
        socketTimeout
      });
    })
    .catch((error) => {
      logger.error('SMTP transporter verification failed', {
        error: error?.message || error,
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure
      });
    });
} else {
  logger.warn('Email provider not configured. All email sends will be skipped.');
}

// Company Information
const COMPANY_INFO = {
  name: 'BrokerIn',
  email: 'no-reply@brokerin.in',
  phone: '+91-8310652049', // Update with actual phone number
  address: 'Udayapala , Kanakapura Road, Bangalore, 560082', // Update with actual address
  website: 'https://brokerin.in', // Update with actual website
  logoUrl: 'https://www.brokerin.in/images/logo.png' // Replace with actual logo URL
};

type AddressInput = string | { address: string; name?: string } | undefined | null;

const hasEmailTransport = () => !!zeptoClient || !!transporter;

const getActiveEmailProviderLabel = () => {
  if (zeptoClient) return 'zepto';
  if (transporter) return 'smtp';
  return 'none';
};

const parseAddressString = (value: string): Array<{ address: string; name?: string }> => {
  return value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const match = part.match(/^(.*)<(.+)>$/);
      if (match) {
        return {
          name: match[1].trim().replace(/(^"|"$)/g, ''),
          address: match[2].trim()
        };
      }
      return { address: part };
    });
};

const normalizeAddressList = (
  input?: AddressInput | AddressInput[]
): Array<{ address: string; name?: string }> => {
  if (!input) return [];
  const list = Array.isArray(input) ? input : [input];

  return list
    .flatMap((entry) => {
      if (!entry) return [];
      if (typeof entry === 'string') {
        return parseAddressString(entry);
      }
      if (typeof entry === 'object' && entry.address) {
        return [{ address: entry.address, name: entry.name }];
      }
      return [];
    })
    .filter((entry) => !!entry.address);
};

const getFromAddress = (from?: AddressInput) => {
  if (config.ZEPTO_FROM_EMAIL) {
    return {
      address: config.ZEPTO_FROM_EMAIL,
      name: config.ZEPTO_FROM_NAME || COMPANY_INFO.name
    };
  }

  if (typeof from === 'string') {
    const parsed = parseAddressString(from)[0];
    if (parsed) {
      return {
        address: parsed.address,
        name: parsed.name || COMPANY_INFO.name
      };
    }
  } else if (from && typeof from === 'object' && from.address) {
    return {
      address: from.address,
      name: from.name || COMPANY_INFO.name
    };
  }

  return {
    address: config.NODEMAILER_EMAIL || COMPANY_INFO.email,
    name: COMPANY_INFO.name
  };
};

const sendEmailViaZepto = async (mailOptions: nodemailer.SendMailOptions) => {
  if (!zeptoClient) {
    throw new Error('ZeptoMail client is not initialized');
  }

  const toList = normalizeAddressList(mailOptions.to);
  if (toList.length === 0) {
    throw new Error('No recipient address provided');
  }

  const payload: any = {
    from: getFromAddress(mailOptions.from),
    to: toList.map((recipient) => ({
      email_address: {
        address: recipient.address,
        name: recipient.name || ''
      }
    })),
    subject: mailOptions.subject,
  };

  // Bounce address is optional - only include if configured
  if (config.ZEPTO_BOUNCE_EMAIL) {
    payload.bounce_address = {
      address: config.ZEPTO_BOUNCE_EMAIL
    };
  }

  const ccList = normalizeAddressList(mailOptions.cc as any);
  if (ccList.length > 0) {
    payload.cc = ccList.map((recipient) => ({
      email_address: {
        address: recipient.address,
        name: recipient.name || ''
      }
    }));
  }

  const bccList = normalizeAddressList(mailOptions.bcc as any);
  if (bccList.length > 0) {
    payload.bcc = bccList.map((recipient) => ({
      email_address: {
        address: recipient.address,
        name: recipient.name || ''
      }
    }));
  }

  if (mailOptions.replyTo) {
    const replyTo = normalizeAddressList(mailOptions.replyTo as any)[0];
    if (replyTo) {
      payload.reply_to = {
        address: replyTo.address,
        name: replyTo.name || ''
      };
    }
  }

  // Ensure we have at least html or text body
  if (mailOptions.html) {
    payload.htmlbody = mailOptions.html;
  }

  if (mailOptions.text) {
    payload.textbody = mailOptions.text;
  }

  // ZeptoMail requires at least one body (html or text)
  if (!payload.htmlbody && !payload.textbody) {
    throw new Error('ZeptoMail requires either htmlbody or textbody');
  }

  // If only HTML is provided, create a plain text fallback
  if (payload.htmlbody && !payload.textbody) {
    // Strip HTML tags for plain text version
    payload.textbody = payload.htmlbody
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  try {
    // Log payload structure (without sensitive content) for debugging
    logger.info('ZeptoMail payload prepared', {
      from: payload.from,
      toCount: payload.to?.length || 0,
      toStructure: payload.to?.[0] ? {
        hasEmailAddress: !!payload.to[0].email_address,
        addressFormat: typeof payload.to[0].email_address?.address
      } : 'empty',
      hasHtml: !!payload.htmlbody,
      hasText: !!payload.textbody,
      htmlLength: payload.htmlbody?.length || 0,
      textLength: payload.textbody?.length || 0,
      subject: payload.subject,
      bounceAddress: payload.bounce_address?.address || 'not set (optional)',
      payloadKeys: Object.keys(payload)
    });

    // Use direct fetch instead of zeptomail package to get better error handling
    const zeptoUrl = config.ZEPTO_URL || 'https://api.zeptomail.in/v1.1/email';
    
    if (!config.ZEPTO_TOKEN) {
      throw new Error('ZEPTO_TOKEN is not configured');
    }
    
    const fullToken = config.ZEPTO_TOKEN.startsWith('Zoho-enczapikey ') 
      ? config.ZEPTO_TOKEN 
      : `Zoho-enczapikey ${config.ZEPTO_TOKEN}`;

    const response = await fetch(zeptoUrl, {
      method: 'POST',
      headers: {
        'Authorization': fullToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      } as HeadersInit,
      body: JSON.stringify(payload)
    });

    // Get response text first to handle empty or non-JSON responses
    const responseText = await response.text();
    
    logger.info('ZeptoMail API response', {
      status: response.status,
      statusText: response.statusText,
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 200),
      headers: Object.fromEntries(response.headers.entries())
    });

    // Check if response is successful
    if (!response.ok) {
      let errorMessage = `ZeptoMail API error: ${response.status} ${response.statusText}`;
      let errorDetails: any = {};
      
      try {
        const errorData = JSON.parse(responseText);
        errorDetails = errorData;
        
        // Extract specific error information
        if (errorData.error) {
          const apiError = errorData.error;
          errorMessage = `ZeptoMail API error (${apiError.code || 'UNKNOWN'}): ${apiError.message || 'Unknown error'}`;
          
          // Check for specific error codes and provide helpful messages
          if (apiError.details && Array.isArray(apiError.details)) {
            const bounceError = apiError.details.find((d: any) => d.target === 'bounce_address');
            if (bounceError) {
              errorMessage += `\n\n❌ BOUNCE ADDRESS ERROR: ${bounceError.message}`;
              errorMessage += `\n   Current bounce address: ${payload.bounce_address?.address || 'not set'}`;
              errorMessage += `\n   Solution: Remove ZEPTO_BOUNCE_EMAIL from .env (bounce address is optional)`;
              errorMessage += `\n   OR verify the bounce address in ZeptoMail dashboard → Email Configuration → Bounce Address`;
            }
            
            const authError = apiError.details.find((d: any) => d.target === 'authorization' || apiError.code === 'TM_4001');
            if (authError || apiError.code === 'TM_4001') {
              errorMessage += `\n\n⚠️ AUTHENTICATION ERROR: Check your ZEPTO_TOKEN`;
              errorMessage += `\n   Make sure the token is correct and includes "Zoho-enczapikey " prefix`;
            }
          }
        } else {
          errorMessage += ` - ${JSON.stringify(errorData)}`;
        }
      } catch {
        errorMessage += ` - Response: ${responseText.substring(0, 500)}`;
      }
      
      logger.error('ZeptoMail API error details', {
        status: response.status,
        errorDetails,
        bounceAddress: payload.bounce_address?.address,
        fromAddress: payload.from?.address
      });
      
      throw new Error(errorMessage);
    }

    // Parse JSON response if available
    let result: any = { success: true };
    if (responseText.trim().length > 0) {
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        // If response is empty or not JSON, but status is OK, consider it success
        logger.warn('ZeptoMail returned non-JSON response but status is OK', {
          responseText: responseText.substring(0, 200)
        });
        result = { success: true, message: 'Email sent (empty response)' };
      }
    }
    
    logger.info('ZeptoMail email sent successfully', {
      result: result || 'success',
      hasData: !!result?.data
    });
    
    return result;
  } catch (error: any) {
    // Enhanced error logging for ZeptoMail
    const errorDetails: any = {
      error: error?.message || error,
      errorType: error?.type,
      errorCode: error?.code,
      errorName: error?.name,
      payload: {
        from: payload.from,
        toCount: payload.to?.length || 0,
        subject: payload.subject,
        hasHtml: !!payload.htmlbody,
        hasText: !!payload.textbody,
        bounceAddress: payload.bounce_address?.address
      },
      zeptoUrl: config.ZEPTO_URL || 'https://api.zeptomail.in/v1.1/email',
      tokenConfigured: !!config.ZEPTO_TOKEN,
      tokenLength: config.ZEPTO_TOKEN?.length || 0,
      bounceAddress: config.ZEPTO_BOUNCE_EMAIL || 'not set (optional)'
    };

    // If it's a fetch/network error, add more details
    if (error?.type === 'invalid-json' || error?.message?.includes('JSON') || error?.message?.includes('fetch')) {
      errorDetails.suggestion = 'ZeptoMail API returned invalid or empty response. Check API token and endpoint configuration.';
      errorDetails.checkToken = 'Verify ZEPTO_TOKEN is correct and includes "Zoho-enczapikey " prefix';
      errorDetails.checkUrl = `Current URL: ${config.ZEPTO_URL || 'https://api.zeptomail.in/v1.1/email'}`;
      errorDetails.checkBounce = `Bounce address: ${config.ZEPTO_BOUNCE_EMAIL || 'NOT SET'}`;
    }

    logger.error('ZeptoMail send error', errorDetails);
    
    // Re-throw with more context
    throw new Error(`ZeptoMail send failed: ${error?.message || error}. Check logs for details.`);
  }
};

const sendEmail = async (mailOptions: nodemailer.SendMailOptions) => {
  if (zeptoClient) {
    return sendEmailViaZepto(mailOptions);
  }
  if (transporter) {
    return transporter.sendMail(mailOptions);
  }
  throw new Error('Email transporter is not configured');
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
  // Detailed logging for debugging
  logger.info('sendOtp called', { 
    email, 
    purpose,
    hasTransporter: hasEmailTransport(),
    hasEmail: !!email,
    transporterType: getActiveEmailProviderLabel()
  });
  
  if (!hasEmailTransport()) {
    logger.error('OTP email FAILED: Email provider is not configured', { 
      email, 
      purpose,
      isEmailEnabled: config.isEmailEnabled()
    });
    throw new Error('Email transporter is not configured');
  }
  
  if (!email) {
    logger.error('OTP email FAILED: No email provided', { purpose });
    throw new Error('Email address is required');
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
    logger.info('Sending OTP email via provider', { 
      email, 
      purpose,
      from: mailOptions.from || getFromAddress().address,
      subject: mailOptions.subject
    });
    
    const result = await sendEmail(mailOptions);
    
    logger.info('OTP email sent successfully', { 
      email, 
      purpose,
      provider: getActiveEmailProviderLabel(),
      result
    });
    
    return result;
  } catch (error: any) {
    // Detailed error logging
    logger.error('ERROR sending OTP email:', { 
      error: error.message || error,
      errorCode: error.code,
      errorCommand: error.command,
      errorResponse: error.response,
      errorResponseCode: error.responseCode,
      stack: error.stack,
      email,
      purpose,
      otp, // Log OTP for debugging if email fails
      from: mailOptions.from,
      to: mailOptions.to
    });
    throw error; // Re-throw so caller can handle
  }
};

// Send booking confirmation to customer
export const sendBookingConfirmation = async (booking: IServiceBooking) => {
  if (!hasEmailTransport() || !(booking as any).email) {
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
    await sendEmail(mailOptions);
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
  if (!hasEmailTransport() || !(booking as any).email) {
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
    await sendEmail(mailOptions);
    logger.info('Booking update email sent', { email: (booking as any).email });
  } catch (error) {
    logger.error('Error sending update email:', error);
  }
};

// Send booking status update to customer
export const sendStatusUpdate = async (booking: IServiceBooking, newStatus: string) => {
  if (!hasEmailTransport() || !(booking as any).email) {
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
    await sendEmail(mailOptions);
    logger.info('Status update email sent', { email: (booking as any).email, status: newStatus });
  } catch (error) {
    logger.error('Error sending status update email:', error);
  }
};

// Send new booking notification to admin
export const sendAdminNotification = async (booking: IServiceBooking) => {
  if (!hasEmailTransport()) {
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
    await sendEmail(mailOptions);
    logger.info('Admin notification email sent', { bookingId: booking.service_booking_id });
  } catch (error) {
    logger.error('Error sending admin notification email:', error);
  }
};

export const sendServiceBookingEmail = sendAdminNotification;

// ===== FURNITURE REQUEST EMAILS =====

// Send furniture request confirmation to customer
export const sendFurnitureRequestConfirmation = async (furnitureForm: any, furniture: any) => {
  if (!hasEmailTransport() || !furnitureForm.email) {
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
    await sendEmail(mailOptions);
    logger.info('Furniture request confirmation email sent', { email: furnitureForm.email });
  } catch (error) {
    logger.error('Error sending furniture request confirmation email:', error);
  }
};

// Send furniture status update to customer
export const sendFurnitureStatusUpdate = async (furnitureForm: any, newStatus: string, furniture?: any) => {
  if (!hasEmailTransport() || !furnitureForm.email) {
    logger.info('Email not configured or no email provided', { 
      furnitureFormId: furnitureForm._id 
    });
    return;
  }

  // Fetch furniture details if not provided
  let furnitureDetails = furniture;
  if (!furnitureDetails && furnitureForm.furniture_id) {
    try {
      const Furniture = require('../models/Furniture').default;
      furnitureDetails = await Furniture.findOne({ furniture_id: furnitureForm.furniture_id });
    } catch (error) {
      logger.warn('Could not fetch furniture details for email', { furniture_id: furnitureForm.furniture_id });
    }
  }

  const furnitureName = furnitureDetails?.name || furnitureForm.furniture_id;
  const furnitureCategory = furnitureDetails?.category || 'N/A';

  const statusMessages: { [key: string]: string } = {
    'Requested': 'Your furniture request has been received.',
    'Accepted': 'Your furniture request has been accepted! We will contact you shortly.',
    'Ongoing': 'Your furniture is being prepared.',
    'Completed': 'Your furniture request has been completed. We hope you enjoy your new furniture!',
    'Cancelled': 'Your furniture request has been cancelled.',
    'Ordered': 'Your furniture order has been placed.',
    'Confirmed': 'Your furniture order has been confirmed!',
    'Scheduled Delivery': 'Your furniture delivery has been scheduled.',
    'Out for Delivery': 'Your furniture is out for delivery!',
    'Delivered': 'Your furniture has been delivered. We hope you enjoy it!'
  };

  const content = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Hello <strong>${furnitureForm.name}</strong>,</p>
    <p style="font-size: 16px; color: #374151; margin: 0 0 30px 0;">${statusMessages[newStatus] || 'Your furniture request status has been updated.'}</p>
    
    <div style="background-color: #f9fafb; border-left: 4px solid #2563eb; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
      <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">Request Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;"><strong>Furniture:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 600;">${furnitureName}</td>
        </tr>
        ${furnitureDetails?.category ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Category:</strong></td>
          <td style="padding: 8px 0; color: #374151; font-size: 14px;">${furnitureCategory}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Item ID:</strong></td>
          <td style="padding: 8px 0; color: #6b7280; font-size: 12px;">${furnitureForm.furniture_id}</td>
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
    subject: `Furniture Request Status Update - ${furnitureName}`,
    html: getEmailTemplate(content, 'Furniture Request Status Update')
  };

  try {
    await sendEmail(mailOptions);
    logger.info('Furniture status update email sent', { email: furnitureForm.email, status: newStatus, furnitureName });
  } catch (error) {
    logger.error('Error sending furniture status update email:', error);
  }
};

// ===== PROPERTY REQUEST EMAILS =====

// Send property request confirmation to customer
export const sendPropertyRequestConfirmation = async (propertyForm: any, property: any) => {
  if (!hasEmailTransport() || !propertyForm.email) {
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
    await sendEmail(mailOptions);
    logger.info('Property request confirmation email sent', { email: propertyForm.email });
  } catch (error) {
    logger.error('Error sending property request confirmation email:', error);
  }
};

// Send property request status update to customer
export const sendPropertyStatusUpdate = async (propertyForm: any, newStatus: string) => {
  if (!hasEmailTransport() || !propertyForm.email) {
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
    await sendEmail(mailOptions);
    logger.info('Property status update email sent', { email: propertyForm.email, status: newStatus });
  } catch (error) {
    logger.error('Error sending property status update email:', error);
  }
};

// ===== RENTAL EMAILS =====

// Send rental confirmation to customer
export const sendRentalConfirmation = async (rental: any) => {
  if (!hasEmailTransport() || !rental.customer_email) {
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
    await sendEmail(mailOptions);
    logger.info('Rental confirmation email sent', { email: rental.customer_email, rentalId: rental.rental_id });
  } catch (error) {
    logger.error('Error sending rental confirmation email:', error);
  }
};

// Send payment reminder to customer
export const sendPaymentReminder = async (rental: any, paymentRecord: any, daysUntilDue: number) => {
  if (!hasEmailTransport() || !rental.customer_email) {
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
    await sendEmail(mailOptions);
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
  if (!hasEmailTransport() || !rental.customer_email) {
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
    await sendEmail(mailOptions);
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
  if (!hasEmailTransport() || !rental.customer_email) {
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
    await sendEmail(mailOptions);
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
  if (!hasEmailTransport() || !rental.customer_email) {
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
    await sendEmail(mailOptions);
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
  if (!hasEmailTransport() || !rental.customer_email) {
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
    await sendEmail(mailOptions);
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
  if (!hasEmailTransport() || !customerEmail) {
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
    await sendEmail(mailOptions);
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