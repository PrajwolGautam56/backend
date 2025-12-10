import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { AuthRequest } from '../interfaces/Request';
import User from '../models/User';

/**
 * Auto-refresh authentication middleware
 * Tries to refresh token automatically if access token is expired but refresh token is valid
 * Attaches userId to request if token is valid or successfully refreshed
 */
export const autoRefreshAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const refreshToken = req.headers['x-refresh-token'] as string;

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    try {
      // Try to verify access token
      const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
      req.userId = decoded.userId;
      return next();
    } catch (error: any) {
      // If token is expired and refresh token is provided, try to refresh
      if (error.name === 'TokenExpiredError' && refreshToken) {
        try {
          // Verify refresh token
          const refreshDecoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as { userId: string };
          
          // Find user and verify refresh token matches
          const user = await User.findById(refreshDecoded.userId);
          if (!user || user.refreshToken !== refreshToken) {
            return res.status(401).json({ message: 'Invalid refresh token' });
          }

          // Generate new tokens
          const newAccessToken = jwt.sign(
            { userId: user._id },
            config.JWT_SECRET,
            { expiresIn: '24h' }
          );
          
          const newRefreshToken = jwt.sign(
            { userId: user._id },
            config.JWT_REFRESH_SECRET,
            { expiresIn: '30d' }
          );

          // Update user with new refresh token
          user.refreshToken = newRefreshToken;
          await user.save();

          // Set userId and add new tokens to response headers
          req.userId = user._id.toString();
          res.setHeader('X-New-Access-Token', newAccessToken);
          res.setHeader('X-New-Refresh-Token', newRefreshToken);
          
          return next();
        } catch (refreshError) {
          return res.status(401).json({ 
            message: 'Token expired. Please refresh your token.',
            requiresRefresh: true 
          });
        }
      }
      
      // Token is invalid for other reasons
      return res.status(403).json({ message: 'Invalid token' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Authentication error' });
  }
};

