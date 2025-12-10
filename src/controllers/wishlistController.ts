import { Response } from 'express';
import { AuthRequest } from '../interfaces/Request';
import Wishlist from '../models/Wishlist';
import Furniture from '../models/Furniture';
import logger from '../utils/logger';
import mongoose from 'mongoose';

// Get user's wishlist
export const getWishlist = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    let wishlist = await Wishlist.findOne({ userId: req.userId })
      .populate({
        path: 'items.furniture_id',
        select: 'furniture_id name description category item_type brand condition availability listing_type price photos features location stock'
      });

    if (!wishlist) {
      wishlist = new Wishlist({
        userId: req.userId,
        items: []
      });
      await wishlist.save();
    }

    // Filter out items where furniture doesn't exist
    const validItems = wishlist.items.filter(item => item.furniture_id);

    return res.status(200).json({
      success: true,
      data: {
        items: validItems,
        count: validItems.length
      }
    });
  } catch (error: any) {
    logger.error('Get wishlist error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error fetching wishlist',
      error: error.message
    });
  }
};

// Add item to wishlist
export const addToWishlist = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { furniture_id } = req.body;

    if (!furniture_id || !mongoose.Types.ObjectId.isValid(furniture_id)) {
      return res.status(400).json({ message: 'Valid furniture_id is required' });
    }

    // Check if furniture exists
    const furniture = await Furniture.findById(furniture_id);
    if (!furniture) {
      return res.status(404).json({ message: 'Furniture not found' });
    }

    // Get or create wishlist
    let wishlist = await Wishlist.findOne({ userId: req.userId });
    if (!wishlist) {
      wishlist = new Wishlist({
        userId: req.userId,
        items: []
      });
    }

    // Check if item already in wishlist
    const existingIndex = wishlist.items.findIndex(
      item => item.furniture_id.toString() === furniture_id
    );

    if (existingIndex >= 0) {
      return res.status(400).json({
        message: 'Item already in wishlist'
      });
    }

    // Add to wishlist
    wishlist.items.push({
      furniture_id: new mongoose.Types.ObjectId(furniture_id) as any,
      added_at: new Date()
    });

    await wishlist.save();

    logger.info('Item added to wishlist', {
      userId: req.userId,
      furniture_id,
      wishlistCount: wishlist.items.length
    });

    return res.status(200).json({
      success: true,
      message: 'Item added to wishlist successfully',
      data: wishlist
    });
  } catch (error: any) {
    logger.error('Add to wishlist error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error adding item to wishlist',
      error: error.message
    });
  }
};

// Remove item from wishlist
export const removeFromWishlist = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { furniture_id } = req.params;

    if (!furniture_id || !mongoose.Types.ObjectId.isValid(furniture_id)) {
      return res.status(400).json({ message: 'Valid furniture_id is required' });
    }

    const wishlist = await Wishlist.findOne({ userId: req.userId });
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    const itemIndex = wishlist.items.findIndex(
      item => item.furniture_id.toString() === furniture_id
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in wishlist' });
    }

    wishlist.items.splice(itemIndex, 1);
    await wishlist.save();

    logger.info('Item removed from wishlist', {
      userId: req.userId,
      furniture_id
    });

    return res.status(200).json({
      success: true,
      message: 'Item removed from wishlist successfully',
      data: wishlist
    });
  } catch (error: any) {
    logger.error('Remove from wishlist error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error removing item from wishlist',
      error: error.message
    });
  }
};

// Clear wishlist
export const clearWishlist = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const wishlist = await Wishlist.findOne({ userId: req.userId });
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    wishlist.items = [];
    await wishlist.save();

    logger.info('Wishlist cleared', { userId: req.userId });

    return res.status(200).json({
      success: true,
      message: 'Wishlist cleared successfully',
      data: wishlist
    });
  } catch (error: any) {
    logger.error('Clear wishlist error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error clearing wishlist',
      error: error.message
    });
  }
};

// Move item from wishlist to cart
export const moveToCart = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { furniture_id } = req.params;
    const { quantity = 1 } = req.body;

    if (!furniture_id || !mongoose.Types.ObjectId.isValid(furniture_id)) {
      return res.status(400).json({ message: 'Valid furniture_id is required' });
    }

    // This would integrate with the cart controller
    // For now, just remove from wishlist
    const wishlist = await Wishlist.findOne({ userId: req.userId });
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    const itemIndex = wishlist.items.findIndex(
      item => item.furniture_id.toString() === furniture_id
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in wishlist' });
    }

    wishlist.items.splice(itemIndex, 1);
    await wishlist.save();

    logger.info('Item moved to cart from wishlist', {
      userId: req.userId,
      furniture_id,
      quantity
    });

    return res.status(200).json({
      success: true,
      message: 'Item moved to cart successfully. Please add to cart using cart API.',
      data: {
        furniture_id,
        quantity
      }
    });
  } catch (error: any) {
    logger.error('Move to cart error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error moving item to cart',
      error: error.message
    });
  }
};

