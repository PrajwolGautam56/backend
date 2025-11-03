/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - fullName
 *         - username
 *         - email
 *         - phoneNumber
 *         - nationality
 *         - password
 *       properties:
 *         fullName:
 *           type: string
 *           description: User's full name
 *           example: John Doe
 *         username:
 *           type: string
 *           description: Unique username for the user
 *           example: johndoe123
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address (must be unique)
 *           example: john.doe@example.com
 *         phoneNumber:
 *           type: string
 *           description: User's contact number
 *           example: +1234567890
 *         nationality:
 *           type: string
 *           description: User's nationality
 *           example: American
 *         password:
 *           type: string
 *           format: password
 *           description: User's password (min 8 characters)
 *           example: StrongP@ssw0rd
 *         profilePicture:
 *           type: string
 *           format: binary
 *           description: User's profile picture (max 5MB, image files only)
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           description: User's role in the system
 *           default: user
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and management endpoints
 */

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account with email verification. Profile picture is optional.
 *     tags: [Authentication]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: User created successfully. Verification email sent.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 profilePicture:
 *                   type: string
 *       400:
 *         description: Invalid input or user already exists
 *       500:
 *         description: Server error
 * 
 * /api/auth/signin:
 *   post:
 *     summary: Authenticate user
 *     description: Login using email/username and password. Returns JWT tokens for authentication.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email or username
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: JWT access token (15 minutes validity)
 *                 refreshToken:
 *                   type: string
 *                   description: JWT refresh token (7 days validity)
 *       401:
 *         description: Invalid credentials or email not verified
 * 
 * /api/auth/verify-email/{token}:
 *   get:
 *     summary: Verify email address
 *     description: Verifies user's email address using the token sent via email
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Email verification token
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired verification token
 * 
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Sends a password reset OTP to user's registered email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset OTP sent successfully
 *       404:
 *         description: User not found
 * 
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using OTP
 *     description: Resets user's password using the OTP sent to email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP received via email
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired OTP
 * 
 * /api/auth/google-auth:
 *   post:
 *     summary: Google OAuth authentication
 *     description: Authenticate user using Google OAuth token
 *     tags: [Authentication]
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
 *                 description: Google OAuth ID token
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: Invalid Google token
 */ 