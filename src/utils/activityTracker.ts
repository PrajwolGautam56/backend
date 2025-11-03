import User from '../models/User';
import logger from './logger';

export const trackUserActivity = async (
  userId: string,
  action: string,
  details?: any
) => {
  try {
    await User.findByIdAndUpdate(userId, {
      $push: {
        activityLog: {
          action,
          timestamp: new Date(),
          details
        }
      }
    });
    logger.info('User activity tracked', { userId, action });
  } catch (error) {
    logger.error('Error tracking user activity:', error);
  }
};

export const getUserActivities = async (userId: string) => {
  try {
    const user = await User.findById(userId).select('activityLog');
    return user?.activityLog || [];
  } catch (error) {
    logger.error('Error fetching user activities:', error);
    return [];
  }
};

