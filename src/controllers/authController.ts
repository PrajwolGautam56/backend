import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { config } from '../config/config';
import { OAuth2Client } from 'google-auth-library';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { IUser, UserRole } from '../interfaces/User';
import PendingSignup from '../models/PendingSignup';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

// Only initialize Google client if Google auth is enabled
let googleClient: OAuth2Client | null = null;
if (config.isGoogleAuthEnabled()) {
  googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID!);
}

// Function to send OTP
const sendOtp = async (email: string, otp: string) => {
  if (!config.isEmailEnabled()) {
    logger.warn('Email service not configured. OTP:', { otp, email });
    return;
  }

  const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.NODEMAILER_EMAIL,
        pass: config.NODEMAILER_PASSWORD,
      },
    
  });

  const mailOptions = {
    from: config.NODEMAILER_EMAIL,
    to: email,
    subject: 'Your OTP for Signup',
    html: `
      <h2>Your OTP for Signup</h2>
      <p>Hello,</p>
      <p>Your verification code is:</p>
      <h1 style="font-size: 32px; letter-spacing: 5px; color: #2563eb;">${otp}</h1>
      <p>This code will expire in 20 minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
      <p>Thank you,<br>BrokerIn Team</p>
    `,
    text: `Your OTP is: ${otp}. This code will expire in 20 minutes.`
  };

  await transporter.sendMail(mailOptions);
};

// Forgot Password: Request Reset
export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email }) as IUser | null;
    if (!user) {
      // For security: respond success even if user not found
      return res.status(200).json({ message: 'If an account exists, a reset email has been sent.' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetPasswordToken = token;
    user.resetPasswordExpires = expires;
    await user.save();

    if (config.isEmailEnabled()) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: config.NODEMAILER_EMAIL, pass: config.NODEMAILER_PASSWORD }
      });

      const resetLink = `${config.FRONTEND_BASE_URL || 'http://localhost:3000'}/reset-password?email=${encodeURIComponent(email)}&token=${token}`;
      const mailOptions = {
        from: config.NODEMAILER_EMAIL,
        to: email,
        subject: 'Password Reset Instructions',
        html: `
          <h2>Reset your password</h2>
          <p>We received a request to reset your password.</p>
          <p>Use the link below within the next 60 minutes:</p>
          <p><a href="${resetLink}" style="color:#2563eb;">Reset Password</a></p>
          <p>If you did not request this, you can ignore this email.</p>
        `,
        text: `Reset your password using this link (valid for 60 minutes): ${resetLink}`
      };
      await transporter.sendMail(mailOptions);
    }

    return res.status(200).json({ message: 'If an account exists, a reset email has been sent.' });
  } catch (error) {
    logger.error('Error in requestPasswordReset', { error });
    return res.status(500).json({ message: 'Error requesting password reset' });
  }
};

// Forgot Password: Verify Token
export const verifyPasswordResetToken = async (req: Request, res: Response) => {
  try {
    const { email, token } = req.body as { email?: string; token?: string };
    if (!email || !token) {
      return res.status(400).json({ message: 'Email and token are required' });
    }
    const user = await User.findOne({ email }) as IUser | null;
    if (!user || !user.resetPasswordToken || !user.resetPasswordExpires) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    if (user.resetPasswordToken !== token || user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    return res.status(200).json({ message: 'Token is valid' });
  } catch (error) {
    logger.error('Error in verifyPasswordResetToken', { error });
    return res.status(500).json({ message: 'Error verifying token' });
  }
};

// Forgot Password: Reset
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, token, newPassword } = req.body as { email?: string; token?: string; newPassword?: string };
    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: 'Email, token, and newPassword are required' });
    }
    const user = await User.findOne({ email }) as IUser | null;
    if (!user || !user.resetPasswordToken || !user.resetPasswordExpires) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    if (user.resetPasswordToken !== token || user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.password = newPassword; // will be hashed by pre-save hook
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    logger.error('Error in resetPassword', { error });
    return res.status(500).json({ message: 'Error resetting password' });
  }
};
// Step 1: Request OTP for signup without creating a user yet
export const requestSignupOtp = async (req: Request, res: Response) => {
  try {
    const { fullName, username, email, phoneNumber, nationality, password } = req.body;

    if (!fullName || !username || !email || !phoneNumber || !nationality || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if a real user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.email === email ? 'Email already exists' : 'Username already exists' 
      });
    }

    // Remove any previous pending signup for this email/username
    await PendingSignup.deleteMany({ $or: [{ email }, { username }] });

    // Hash the password before storing in pending doc
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 20 * 60 * 1000);

    await PendingSignup.create({
      fullName,
      username,
      email,
      phoneNumber,
      nationality,
      passwordHash,
      otp,
      otpExpires,
      createdAt: new Date()
    });

    // Send OTP email if enabled
    if (config.isEmailEnabled()) {
      await sendOtp(email, otp);
    } else {
      logger.warn('RequestSignupOtp: Email not configured; OTP logged', { email, otp });
    }

    return res.status(200).json({ message: 'OTP sent. Please verify to complete registration.' });
  } catch (error) {
    logger.error('Error in requestSignupOtp', { error });
    return res.status(500).json({ message: 'Error requesting OTP' });
  }
};

// Step 2: Verify OTP and create actual user
export const verifySignupOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const pending = await PendingSignup.findOne({ email });
    if (!pending) {
      return res.status(400).json({ message: 'No pending signup found for this email' });
    }

    if (pending.otp !== otp || !pending.otpExpires || pending.otpExpires < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Create the actual user with pre-hashed password
    const user = new User({
      fullName: pending.fullName,
      username: pending.username,
      email: pending.email,
      phoneNumber: pending.phoneNumber,
      nationality: pending.nationality,
      password: pending.passwordHash, // pre-hashed; User pre-save will skip rehash
      isVerified: true
    });
    await user.save();

    // Cleanup pending signup
    await PendingSignup.deleteOne({ _id: pending._id });

    return res.status(201).json({ message: 'Registration completed successfully. You can now sign in.' });
  } catch (error) {
    logger.error('Error in verifySignupOtp', { error });
    return res.status(500).json({ message: 'Error verifying OTP' });
  }
};
export const signup = async (req: Request, res: Response) => {
  try {
    const { fullName, username, email, phoneNumber, nationality, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.email === email ? 'Email already exists' : 'Username already exists' 
      });
    }

    // Create user with OTP and expiration time (6-digit numeric only)
    // Generate a 6-digit numeric OTP (000000 to 999999)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 20 * 60 * 1000); // OTP valid for 20 minutes

    const user = new User({
      fullName,
      username,
      email,
      phoneNumber,
      nationality,
      password, // Hash this password before saving
      otp,
      otpExpires,
      // Always require verification; OTP email will be sent if configured
      isVerified: false
    });

    // Send OTP only if email service is enabled
    if (config.isEmailEnabled()) {
      await sendOtp(email, otp);
    } else {
      logger.warn('Signup: Email not configured; user will need manual OTP delivery', { email });
    }

    await user.save();

    // Respond to the user indicating that the OTP has been sent
    return res.status(201).json({ message: 'User created. Please verify your OTP.' });
  } catch (error) {
    logger.error('Error during signup', { error });
    return res.status(500).json({ message: 'Error creating user' });
  }
};

export const signin = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;

    logger.info('Attempting signin', { identifier });

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Email/username and password are required' });
    }

    // Find user by email or username
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    }) as IUser;

    if (!user) {
      logger.warn('Signin failed - User not found', { identifier });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Require verified account before allowing login
    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email with the OTP before logging in.' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn('Signin failed - Invalid password', { identifier });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate tokens - access token valid for 24 hours, refresh token for 30 days
    const token = jwt.sign({ userId: user._id }, config.JWT_SECRET, { expiresIn: '24h' });
    const refreshToken = jwt.sign({ userId: user._id }, config.JWT_REFRESH_SECRET, { expiresIn: '30d' });

    // Update user with refresh token
    user.refreshToken = refreshToken;
    await user.save();

    logger.info('Signin successful', { identifier });

    return res.status(200).json({
      message: 'Login successful',
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture
      },
      token,
      refreshToken
    });
  } catch (error) {
    logger.error('Error in signin', { error, identifier: req.body.identifier });
    return res.status(500).json({ message: 'Error during login' });
  }
};

export const googleAuth = async (req: Request, res: Response) => {
  try {
    if (!googleClient || !config.isGoogleAuthEnabled()) {
      return res.status(501).json({ message: 'Google authentication is not configured' });
    }

    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: config.GOOGLE_CLIENT_ID!
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      logger.error('Invalid Google token payload', { hasPayload: !!payload, hasEmail: !!payload?.email });
      return res.status(400).json({ message: 'Invalid token: missing email' });
    }

    // Use email as fallback if name is missing
    const fullName = payload.name || payload.email.split('@')[0];
    const username = payload.name || `user_${payload.email.split('@')[0]}_${Date.now()}`;

    let user = await User.findOne({ email: payload.email });

    if (!user) {
      // Check if username is already taken, generate unique one if needed
      let uniqueUsername = username;
      let usernameExists = await User.findOne({ username: uniqueUsername });
      let counter = 1;
      while (usernameExists) {
        uniqueUsername = `${username}_${counter}`;
        usernameExists = await User.findOne({ username: uniqueUsername });
        counter++;
      }

      user = new User({
        fullName,
        username: uniqueUsername,
        email: payload.email,
        phoneNumber: 'Not provided',
        nationality: 'Not provided',
        password: crypto.randomBytes(16).toString('hex'),
        isVerified: true,
        isAdmin: false,
        role: UserRole.USER
      });
      await user.save();
      logger.info('New Google user created', { email: payload.email, username: uniqueUsername });
    } else {
      // Ensure Google-authenticated user is marked verified
      if (!user.isVerified) {
        user.isVerified = true;
        await user.save();
        logger.info('Google user marked as verified', { email: payload.email });
      }
    }

    const accessToken = jwt.sign(
      { userId: user._id },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      config.JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    user.refreshToken = refreshToken;
    await user.save();

    logger.info('Google authentication successful', { email: payload.email });

    return res.status(200).json({ 
      accessToken, 
      refreshToken,
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture
      }
    });
  } catch (error: any) {
    logger.error('Error in Google authentication', { 
      error: error.message, 
      stack: error.stack,
      hasToken: !!req.body?.token 
    });
    return res.status(500).json({ 
      message: 'Error during Google authentication',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    // Verify refresh token
    let decoded: { userId: string };
    try {
      decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as { userId: string };
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    // Find user and verify refresh token matches
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Generate new tokens (token rotation for security)
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

    logger.info('Token refreshed successfully', { userId: user._id });

    return res.status(200).json({ 
      token: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: '24h'
    });
  } catch (error) {
    logger.error('Error in token refresh', { error });
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
};

export const getProfilePicture = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(__dirname, '../../uploads/profile-pictures', filename);
    
    if (fs.existsSync(filepath)) {
      res.sendFile(filepath);
    } else {
      res.sendFile(path.join(__dirname, '../../uploads/profile-pictures/default-profile.png'));
    }
  } catch (error) {
    logger.error('Error serving profile picture', { error });
    res.status(500).json({ message: 'Error serving profile picture' });
  }
};

// OTP verification function
export const verifyOtp = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email }) as IUser;

    // Check if user exists and OTP is valid
    if (!user || user.otp !== otp || !user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Mark user as verified
    user.isVerified = true;
    user.otp = undefined; // Clear OTP after verification
    user.otpExpires = undefined; // Clear expiration time
    await user.save();

    return res.status(200).json({ message: 'OTP verified successfully, user is now verified.' });
  } catch (error) {
    logger.error('Error verifying OTP', { error });
    return res.status(500).json({ message: 'Error verifying OTP' });
  }
}; 