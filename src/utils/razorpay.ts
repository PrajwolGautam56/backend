import Razorpay from 'razorpay';
import { config } from '../config/config';
import logger from './logger';

let razorpayInstance: Razorpay | null = null;

if (config.isRazorpayEnabled()) {
  razorpayInstance = new Razorpay({
    key_id: config.RAZORPAY_KEY_ID!,
    key_secret: config.RAZORPAY_KEY_SECRET!
  });
  logger.info('Razorpay initialized successfully');
} else {
  logger.warn('Razorpay not configured. Payment gateway features will be disabled.');
}

export default razorpayInstance;

/**
 * Create a Razorpay order
 */
export const createRazorpayOrder = async (
  amount: number,
  currency: string = 'INR',
  receipt?: string,
  notes?: Record<string, string>
) => {
  if (!razorpayInstance) {
    throw new Error('Razorpay is not configured');
  }

  try {
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise (smallest currency unit)
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {}
    };

    const order = await razorpayInstance.orders.create(options);
    logger.info('Razorpay order created', { orderId: order.id, amount });
    return order;
  } catch (error: any) {
    logger.error('Error creating Razorpay order', { error: error.message });
    throw error;
  }
};

/**
 * Verify Razorpay payment signature
 */
export const verifyPaymentSignature = (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean => {
  if (!config.RAZORPAY_KEY_SECRET) {
    logger.error('Razorpay secret not configured');
    return false;
  }

  const crypto = require('crypto');
  const generatedSignature = crypto
    .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  const isValid = generatedSignature === razorpaySignature;
  
  if (!isValid) {
    logger.warn('Invalid Razorpay payment signature', {
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId
    });
  }

  return isValid;
};

/**
 * Verify Razorpay webhook signature
 */
export const verifyWebhookSignature = (
  webhookBody: string,
  webhookSignature: string
): boolean => {
  if (!config.RAZORPAY_WEBHOOK_SECRET) {
    logger.error('Razorpay webhook secret not configured');
    return false;
  }

  const crypto = require('crypto');
  const generatedSignature = crypto
    .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
    .update(webhookBody)
    .digest('hex');

  const isValid = generatedSignature === webhookSignature;
  
  if (!isValid) {
    logger.warn('Invalid Razorpay webhook signature');
  }

  return isValid;
};

/**
 * Fetch payment details from Razorpay
 */
export const fetchPaymentDetails = async (paymentId: string) => {
  if (!razorpayInstance) {
    throw new Error('Razorpay is not configured');
  }

  try {
    const payment = await razorpayInstance.payments.fetch(paymentId);
    return payment;
  } catch (error: any) {
    logger.error('Error fetching payment details', { error: error.message, paymentId });
    throw error;
  }
};

