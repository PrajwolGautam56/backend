import { Response } from 'express';
import { AuthRequest } from '../interfaces/Request';
import PromoCode from '../models/PromoCode';
import logger from '../utils/logger';
import mongoose from 'mongoose';

// Validate and apply promo code
export const validatePromoCode = async (req: AuthRequest, res: Response) => {
  try {
    const { code, order_amount, listing_type, categories } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Promo code is required' });
    }

    if (!order_amount || order_amount <= 0) {
      return res.status(400).json({ message: 'Valid order amount is required' });
    }

    const promoCode = await PromoCode.findOne({ code: code.toUpperCase() });

    if (!promoCode) {
      return res.status(404).json({ message: 'Invalid promo code' });
    }

    // Check if active
    if (!promoCode.active) {
      return res.status(400).json({ message: 'This promo code is no longer active' });
    }

    // Check validity period
    const now = new Date();
    if (now < promoCode.valid_from) {
      return res.status(400).json({ message: 'This promo code is not yet valid' });
    }
    if (now > promoCode.valid_until) {
      return res.status(400).json({ message: 'This promo code has expired' });
    }

    // Check usage limit
    if (promoCode.usage_limit && promoCode.used_count >= promoCode.usage_limit) {
      return res.status(400).json({ message: 'This promo code has reached its usage limit' });
    }

    // Check minimum order amount
    if (promoCode.min_order_amount && order_amount < promoCode.min_order_amount) {
      return res.status(400).json({
        message: `Minimum order amount of ₹${promoCode.min_order_amount} required for this promo code`
      });
    }

    // Check applicable listing type
    if (promoCode.applicable_to !== 'All' && listing_type) {
      if (promoCode.applicable_to !== listing_type) {
        return res.status(400).json({
          message: `This promo code is only applicable for ${promoCode.applicable_to} items`
        });
      }
    }

    // Check applicable categories
    if (promoCode.applicable_categories && promoCode.applicable_categories.length > 0 && categories) {
      const hasApplicableCategory = categories.some((cat: string) =>
        promoCode.applicable_categories?.includes(cat)
      );
      if (!hasApplicableCategory) {
        return res.status(400).json({
          message: `This promo code is not applicable to the selected categories`
        });
      }
    }

    // Calculate discount
    let discount = 0;
    if (promoCode.discount_type === 'Percentage') {
      discount = (order_amount * promoCode.discount_value) / 100;
      if (promoCode.max_discount_amount && discount > promoCode.max_discount_amount) {
        discount = promoCode.max_discount_amount;
      }
    } else {
      discount = promoCode.discount_value;
    }

    // Ensure discount doesn't exceed order amount
    discount = Math.min(discount, order_amount);

    const final_amount = order_amount - discount;

    return res.status(200).json({
      success: true,
      message: 'Promo code applied successfully',
      data: {
        code: promoCode.code,
        description: promoCode.description,
        discount_type: promoCode.discount_type,
        discount_value: promoCode.discount_value,
        discount_amount: Math.round(discount),
        original_amount: order_amount,
        final_amount: Math.round(final_amount),
        savings: Math.round(discount)
      }
    });
  } catch (error: any) {
    logger.error('Validate promo code error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error validating promo code',
      error: error.message
    });
  }
};

// Apply promo code (increment usage)
export const applyPromoCode = async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Promo code is required' });
    }

    const promoCode = await PromoCode.findOneAndUpdate(
      {
        code: code.toUpperCase(),
        active: true,
        valid_from: { $lte: new Date() },
        valid_until: { $gte: new Date() }
      },
      { $inc: { used_count: 1 } },
      { new: true }
    );

    if (!promoCode) {
      return res.status(404).json({ message: 'Invalid or expired promo code' });
    }

    logger.info('Promo code applied', {
      userId: req.userId,
      code: promoCode.code,
      used_count: promoCode.used_count
    });

    return res.status(200).json({
      success: true,
      message: 'Promo code applied successfully'
    });
  } catch (error: any) {
    logger.error('Apply promo code error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error applying promo code',
      error: error.message
    });
  }
};

// Get all active promo codes (Admin)
export const getAllPromoCodes = async (req: AuthRequest, res: Response) => {
  try {
    const { active, page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};
    if (active !== undefined) {
      query.active = active === 'true';
    }

    const total = await PromoCode.countDocuments(query);
    const promoCodes = await PromoCode.find(query)
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      data: {
        promoCodes,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error: any) {
    logger.error('Get promo codes error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error fetching promo codes',
      error: error.message
    });
  }
};

// Create promo code (Admin)
export const createPromoCode = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const {
      code,
      description,
      discount_type,
      discount_value,
      min_order_amount,
      max_discount_amount,
      valid_from,
      valid_until,
      usage_limit,
      applicable_to,
      applicable_categories,
      active
    } = req.body;

    if (!code || !description || !discount_type || !discount_value || !valid_from || !valid_until) {
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['code', 'description', 'discount_type', 'discount_value', 'valid_from', 'valid_until']
      });
    }

    // Check if code already exists
    const existing = await PromoCode.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ message: 'Promo code already exists' });
    }

    const promoCode = new PromoCode({
      code: code.toUpperCase(),
      description,
      discount_type,
      discount_value,
      min_order_amount,
      max_discount_amount,
      valid_from: new Date(valid_from),
      valid_until: new Date(valid_until),
      usage_limit,
      applicable_to: applicable_to || 'All',
      applicable_categories: applicable_categories || [],
      active: active !== undefined ? active : true,
      createdBy: req.userId
    });

    await promoCode.save();

    logger.info('Promo code created', {
      adminId: req.userId,
      code: promoCode.code
    });

    return res.status(201).json({
      success: true,
      message: 'Promo code created successfully',
      data: promoCode
    });
  } catch (error: any) {
    logger.error('Create promo code error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error creating promo code',
      error: error.message
    });
  }
};

// Update promo code (Admin)
export const updatePromoCode = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid promo code ID' });
    }

    // Don't allow changing the code
    delete updateData.code;
    delete updateData.createdBy;
    delete updateData.used_count;

    const promoCode = await PromoCode.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!promoCode) {
      return res.status(404).json({ message: 'Promo code not found' });
    }

    logger.info('Promo code updated', {
      adminId: req.userId,
      code: promoCode.code
    });

    return res.status(200).json({
      success: true,
      message: 'Promo code updated successfully',
      data: promoCode
    });
  } catch (error: any) {
    logger.error('Update promo code error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error updating promo code',
      error: error.message
    });
  }
};

// Delete promo code (Admin)
export const deletePromoCode = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid promo code ID' });
    }

    const promoCode = await PromoCode.findByIdAndDelete(id);

    if (!promoCode) {
      return res.status(404).json({ message: 'Promo code not found' });
    }

    logger.info('Promo code deleted', {
      adminId: req.userId,
      code: promoCode.code
    });

    return res.status(200).json({
      success: true,
      message: 'Promo code deleted successfully'
    });
  } catch (error: any) {
    logger.error('Delete promo code error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error deleting promo code',
      error: error.message
    });
  }
};

