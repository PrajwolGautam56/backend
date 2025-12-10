import { Response } from 'express';
import { AuthRequest } from '../interfaces/Request';
import Review from '../models/Review';
import Furniture from '../models/Furniture';
import Rental from '../models/Rental';
import logger from '../utils/logger';
import mongoose from 'mongoose';

// Get reviews for a furniture item
export const getFurnitureReviews = async (req: AuthRequest, res: Response) => {
  try {
    const { furniture_id } = req.params;
    const { status = 'Approved', page = '1', limit = '10' } = req.query;

    if (!furniture_id || !mongoose.Types.ObjectId.isValid(furniture_id)) {
      return res.status(400).json({ message: 'Valid furniture_id is required' });
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const query: any = { furniture_id: new mongoose.Types.ObjectId(furniture_id) };
    
    // Only show approved reviews to non-admin users
    if (!req.userId || status) {
      query.status = status;
    }

    const total = await Review.countDocuments(query);
    
    const reviews = await Review.find(query)
      .populate('user_id', 'fullName profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Calculate average rating
    const allReviews = await Review.find({
      furniture_id: new mongoose.Types.ObjectId(furniture_id),
      status: 'Approved'
    });
    
    const avgRating = allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0;

    const ratingDistribution = {
      5: allReviews.filter(r => r.rating === 5).length,
      4: allReviews.filter(r => r.rating === 4).length,
      3: allReviews.filter(r => r.rating === 3).length,
      2: allReviews.filter(r => r.rating === 2).length,
      1: allReviews.filter(r => r.rating === 1).length
    };

    return res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        },
        statistics: {
          average_rating: parseFloat(avgRating.toFixed(1)),
          total_reviews: allReviews.length,
          rating_distribution: ratingDistribution
        }
      }
    });
  } catch (error: any) {
    logger.error('Get furniture reviews error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error fetching reviews',
      error: error.message
    });
  }
};

// Create a review
export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { furniture_id, rating, title, comment, images } = req.body;

    if (!furniture_id || !mongoose.Types.ObjectId.isValid(furniture_id)) {
      return res.status(400).json({ message: 'Valid furniture_id is required' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    if (!title || !comment) {
      return res.status(400).json({ message: 'Title and comment are required' });
    }

    // Check if furniture exists
    const furniture = await Furniture.findById(furniture_id);
    if (!furniture) {
      return res.status(404).json({ message: 'Furniture not found' });
    }

    // Check if user already reviewed this furniture
    const existingReview = await Review.findOne({
      furniture_id: new mongoose.Types.ObjectId(furniture_id),
      user_id: req.userId
    });

    if (existingReview) {
      return res.status(400).json({
        message: 'You have already reviewed this item. You can update your existing review.'
      });
    }

    // Check if user has rented/bought this furniture (verified purchase)
    const rental = await Rental.findOne({
      userId: req.userId,
      'items.product_id': furniture_id
    });

    const review = new Review({
      furniture_id: new mongoose.Types.ObjectId(furniture_id),
      user_id: req.userId,
      rating,
      title,
      comment,
      images: images || [],
      verified_purchase: !!rental,
      status: 'Pending' // Requires admin approval
    });

    await review.save();

    logger.info('Review created', {
      userId: req.userId,
      furniture_id,
      rating,
      verified_purchase: !!rental
    });

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully. It will be visible after admin approval.',
      data: review
    });
  } catch (error: any) {
    logger.error('Create review error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error creating review',
      error: error.message
    });
  }
};

// Update a review
export const updateReview = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { review_id } = req.params;
    const { rating, title, comment, images } = req.body;

    if (!review_id || !mongoose.Types.ObjectId.isValid(review_id)) {
      return res.status(400).json({ message: 'Valid review_id is required' });
    }

    const review = await Review.findById(review_id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Only the review author can update
    if (review.user_id.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'You can only update your own reviews' });
    }

    if (rating) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }
      review.rating = rating;
    }

    if (title) review.title = title;
    if (comment) review.comment = comment;
    if (images) review.images = images;

    // Reset status to pending after update
    review.status = 'Pending';

    await review.save();

    logger.info('Review updated', {
      userId: req.userId,
      review_id
    });

    return res.status(200).json({
      success: true,
      message: 'Review updated successfully. It will be reviewed again by admin.',
      data: review
    });
  } catch (error: any) {
    logger.error('Update review error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error updating review',
      error: error.message
    });
  }
};

// Delete a review
export const deleteReview = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { review_id } = req.params;

    if (!review_id || !mongoose.Types.ObjectId.isValid(review_id)) {
      return res.status(400).json({ message: 'Valid review_id is required' });
    }

    const review = await Review.findById(review_id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Only the review author can delete
    if (review.user_id.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'You can only delete your own reviews' });
    }

    await Review.findByIdAndDelete(review_id);

    logger.info('Review deleted', {
      userId: req.userId,
      review_id
    });

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error: any) {
    logger.error('Delete review error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error deleting review',
      error: error.message
    });
  }
};

// Mark review as helpful
export const markHelpful = async (req: AuthRequest, res: Response) => {
  try {
    const { review_id } = req.params;

    if (!review_id || !mongoose.Types.ObjectId.isValid(review_id)) {
      return res.status(400).json({ message: 'Valid review_id is required' });
    }

    const review = await Review.findByIdAndUpdate(
      review_id,
      { $inc: { helpful_count: 1 } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Marked as helpful',
      data: { helpful_count: review.helpful_count }
    });
  } catch (error: any) {
    logger.error('Mark helpful error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error marking review as helpful',
      error: error.message
    });
  }
};

// Admin: Approve/Reject review
export const moderateReview = async (req: AuthRequest, res: Response) => {
  try {
    const { review_id } = req.params;
    const { status, admin_response } = req.body;

    if (!review_id || !mongoose.Types.ObjectId.isValid(review_id)) {
      return res.status(400).json({ message: 'Valid review_id is required' });
    }

    if (!status || !['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be Approved or Rejected' });
    }

    const review = await Review.findByIdAndUpdate(
      review_id,
      {
        status,
        admin_response: admin_response || undefined
      },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    logger.info('Review moderated', {
      adminId: req.userId,
      review_id,
      status
    });

    return res.status(200).json({
      success: true,
      message: `Review ${status.toLowerCase()} successfully`,
      data: review
    });
  } catch (error: any) {
    logger.error('Moderate review error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error moderating review',
      error: error.message
    });
  }
};

// Get user's reviews
export const getUserReviews = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const reviews = await Review.find({ user_id: req.userId })
      .populate('furniture_id', 'name photos item_type')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        reviews,
        count: reviews.length
      }
    });
  } catch (error: any) {
    logger.error('Get user reviews error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Error fetching user reviews',
      error: error.message
    });
  }
};

