import { Router } from 'express';
import {
  getFurnitureReviews,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
  moderateReview,
  getUserReviews
} from '../controllers/reviewController';
import { authenticateToken } from '../middleware/auth';
import { isAdmin } from '../middleware/adminAuth';

const router = Router();

// Public routes
router.get('/furniture/:furniture_id', getFurnitureReviews); // Get reviews for a furniture item

// Authenticated routes
router.use(authenticateToken);
router.post('/', createReview); // Create a review
router.put('/:review_id', updateReview); // Update own review
router.delete('/:review_id', deleteReview); // Delete own review
router.post('/:review_id/helpful', markHelpful); // Mark review as helpful
router.get('/my-reviews', getUserReviews); // Get user's reviews

// Admin routes
router.put('/:review_id/moderate', isAdmin, moderateReview); // Approve/Reject review

export default router;

