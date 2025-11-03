import dotenv from 'dotenv';

dotenv.config();

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const getOptionalEnv = (key: string): string | undefined => {
  return process.env[key];
};

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
  isGoogleAuthEnabled: () => !!process.env.GOOGLE_CLIENT_ID,
  isEmailEnabled: () => !!process.env.NODEMAILER_EMAIL && !!process.env.NODEMAILER_PASSWORD
};