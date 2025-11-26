import dotenv from 'dotenv';

dotenv.config();

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const getOptionalEnv = (key: string): string | undefined => process.env[key];

const getBooleanEnv = (key: string, defaultValue = false): boolean => {
  const value = process.env[key];
  if (typeof value === 'undefined') return defaultValue;
  return value === 'true' || value === '1';
};

const EMAIL_PROVIDER = (
  process.env.EMAIL_PROVIDER ||
  (process.env.ZEPTO_TOKEN ? 'zepto' : 'smtp')
).toLowerCase();

export const config = {
  PORT: parseInt(process.env.PORT || '3030', 10),
  MONGODB_URI: getEnv('MONGODB_URI'),
  JWT_SECRET: getEnv('JWT_SECRET'),
  JWT_REFRESH_SECRET: getEnv('JWT_REFRESH_SECRET'),
  GOOGLE_CLIENT_ID: getOptionalEnv('GOOGLE_CLIENT_ID'),
  CLOUDINARY_CLOUD_NAME: getEnv('CLOUDINARY_CLOUD_NAME'),
  CLOUDINARY_API_KEY: getEnv('CLOUDINARY_API_KEY'),
  CLOUDINARY_API_SECRET: getEnv('CLOUDINARY_API_SECRET'),
  NODEMAILER_PASSWORD: getOptionalEnv('NODEMAILER_PASSWORD'),
  NODEMAILER_EMAIL: getOptionalEnv('NODEMAILER_EMAIL'),
  NODEMAILER_SMTP_HOST: getOptionalEnv('NODEMAILER_SMTP_HOST'),
  NODEMAILER_SMTP_PORT: getOptionalEnv('NODEMAILER_SMTP_PORT'),
  NODEMAILER_SMTP_SECURE: getOptionalEnv('NODEMAILER_SMTP_SECURE'),
  NODEMAILER_SMTP_CONNECTION_TIMEOUT: getOptionalEnv('NODEMAILER_SMTP_CONNECTION_TIMEOUT'),
  NODEMAILER_SMTP_GREETING_TIMEOUT: getOptionalEnv('NODEMAILER_SMTP_GREETING_TIMEOUT'),
  NODEMAILER_SMTP_SOCKET_TIMEOUT: getOptionalEnv('NODEMAILER_SMTP_SOCKET_TIMEOUT'),
  NODEMAILER_SMTP_DEBUG: getOptionalEnv('NODEMAILER_SMTP_DEBUG'),
  NODEMAILER_SMTP_LOGGER: getOptionalEnv('NODEMAILER_SMTP_LOGGER'),
  EMAIL_PROVIDER,
  RESEND_API_KEY: getOptionalEnv('RESEND_API_KEY'),
  RESEND_FROM_EMAIL: getOptionalEnv('RESEND_FROM_EMAIL'),
  RESEND_REPLY_TO: getOptionalEnv('RESEND_REPLY_TO'),
  RESEND_BASE_URL: getOptionalEnv('RESEND_BASE_URL') || 'https://api.resend.com/emails',
  ZEPTO_TOKEN: getOptionalEnv('ZEPTO_TOKEN'),
  ZEPTO_URL: getOptionalEnv('ZEPTO_URL') || 'https://api.zeptomail.in/v1.1/email',
  ZEPTO_FROM_EMAIL: getOptionalEnv('ZEPTO_FROM_EMAIL'),
  ZEPTO_FROM_NAME: getOptionalEnv('ZEPTO_FROM_NAME'),
  ZEPTO_BOUNCE_EMAIL: getOptionalEnv('ZEPTO_BOUNCE_EMAIL'),
  GOOGLE_MAPS_API_KEY: getOptionalEnv('GOOGLE_MAPS_API_KEY'),
  FRONTEND_BASE_URL: getOptionalEnv('FRONTEND_BASE_URL') || 'http://localhost:3000',
  // Razorpay configuration
  RAZORPAY_KEY_ID: getOptionalEnv('RAZORPAY_KEY_ID'),
  RAZORPAY_KEY_SECRET: getOptionalEnv('RAZORPAY_KEY_SECRET'),
  RAZORPAY_WEBHOOK_SECRET: getOptionalEnv('RAZORPAY_WEBHOOK_SECRET'),
  isGoogleAuthEnabled: () => !!process.env.GOOGLE_CLIENT_ID,
  isEmailEnabled: () => {
    if (EMAIL_PROVIDER === 'resend') {
      return !!process.env.RESEND_API_KEY && !!(process.env.RESEND_FROM_EMAIL || process.env.NODEMAILER_EMAIL);
    }
    if (EMAIL_PROVIDER === 'zepto') {
      return !!process.env.ZEPTO_TOKEN
        && !!(process.env.ZEPTO_FROM_EMAIL || process.env.NODEMAILER_EMAIL);
    }
    return !!process.env.NODEMAILER_EMAIL && !!process.env.NODEMAILER_PASSWORD;
  },
  isHttpEmailProvider: () => EMAIL_PROVIDER === 'resend' || EMAIL_PROVIDER === 'zepto',
  emailProvider: EMAIL_PROVIDER,
  isRazorpayEnabled: () => !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET
};