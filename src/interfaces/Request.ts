import { Request } from 'express';

export interface AuthRequest extends Request {
  userId?: string;
}

export interface FileRequest extends Request {
  file?: Express.Multer.File;
} 