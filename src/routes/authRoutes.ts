import express, { Router } from 'express';
import * as authController from '../controllers/authController';
import { upload } from '../utils/fileUpload';
import { authenticateToken } from '../middleware/auth';
import { isAdmin } from '../middleware/adminAuth';

const router: Router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         fullName:
 *           type: string
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         phoneNumber:
 *           type: string
 *         nationality:
 *           type: string
 *         password:
 *           type: string
 *         profilePicture:
 *           type: string
 *     UserResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         fullName:
 *           type: string
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         phoneNumber:
 *           type: string
 *         nationality:
 *           type: string
 *         profilePicture:
 *           type: string
 *         role:
 *           type: string
 *           enum: [USER, ADMIN]
 *         isVerified:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         errors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               param:
 *                 type: string
 *               msg:
 *                 type: string
 */

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/signup', upload.single('profilePicture'), authController.signup as express.RequestHandler);

/**
 * @swagger
 * /auth/signin:
 *   post:
 *     summary: Sign in to get authentication token
 *     tags: [Authentication]
 *     security: []  # No security required for this endpoint
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "yourpassword123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token to be used for authentication
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 */
router.post('/signin', authController.signin as express.RequestHandler);

/**
 * @swagger
 * /api/auth/google-auth:
 *   post:
 *     tags: [Authentication]
 *     summary: Authenticate with Google
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Google OAuth token
 *     responses:
 *       200:
 *         description: Google authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Invalid token
 *       500:
 *         description: Server error
 */
router.post('/google-auth', authController.googleAuth as express.RequestHandler);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh JWT token
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid refresh token
 *       500:
 *         description: Server error
 */
router.post('/refresh-token', authController.refreshToken as express.RequestHandler);

/**
 * @swagger
 * /api/auth/profile-picture/{filename}:
 *   get:
 *     tags: [Authentication]
 *     summary: Get user profile picture
 *     description: Retrieve user's profile picture by filename
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Profile picture filename
 *     responses:
 *       200:
 *         description: Profile picture
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Profile picture not found
 */
router.get('/profile-picture/:filename', authController.getProfilePicture as express.RequestHandler);

// OTP verification route
router.post('/verify-otp', authController.verifyOtp);

router.get('/check-admin', authenticateToken, isAdmin, (req, res) => {
  return res.status(200).json({ isAdmin: true });
});

export default router;