import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { config } from '../config/config';
import { OAuth2Client } from 'google-auth-library';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import otpGenerator from 'otp-generator';
import { IUser } from '../interfaces/User';

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
    text: `Your OTP is: ${otp}`
  };

  await transporter.sendMail(mailOptions);
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

    // Create user with OTP and expiration time
    const otp = otpGenerator.generate(6, { digits: true, specialChars: false });
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
      // In development/demo (email disabled), auto-verify so users are not purged
      isVerified: config.isEmailEnabled() ? false : true
    });

    // Send OTP only if email service is enabled
    if (config.isEmailEnabled()) {
      await sendOtp(email, otp);
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

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: config.GOOGLE_CLIENT_ID!
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.name) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    let user = await User.findOne({ 
      $or: [{ email: payload.email }, { username: payload.name }] 
    });

    if (!user) {
      user = new User({
        fullName: payload.name,
        username: payload.name,
        email: payload.email,
        phoneNumber: '',
        nationality: '',
        password: crypto.randomBytes(16).toString('hex')
      });
      await user.save();
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

    return res.status(200).json({ accessToken, refreshToken });
  } catch (error) {
    logger.error('Error in Google authentication', { error });
    return res.status(500).json({ message: 'Error during Google authentication' });
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