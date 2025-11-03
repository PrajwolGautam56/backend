import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { AuthRequest } from '../interfaces/Request';

/**
 * Optional authentication middleware
 * Attaches userId to request if token is valid, but doesn't fail if no token
 */
export const optionalAuthenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // If no token provided, continue without userId
    if (!token) {
      req.userId = undefined;
      return next();
    }

    // If token exists, try to decode it
    const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    return next();
  } catch (error) {
    // If token is invalid, continue without userId
    req.userId = undefined;
    return next();
  }
};


