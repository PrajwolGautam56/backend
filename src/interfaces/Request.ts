import { Request } from 'express';

export interface AuthRequest extends Request {
  userId?: string;
  isAdmin?: boolean;
}

export interface FileRequest extends Request {
  file?: Express.Multer.File;
} 