import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User';
import { UserRole } from '../src/interfaces/User';

async function main() {
  const email = (process.env.SUPER_ADMIN_EMAIL || 'brokerin.in@gmail.com').trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!password || password.length < 12) throw new Error('Provide SUPER_ADMIN_PASSWORD with at least 12 characters.');
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  try {
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, username: `brokerin-owner-${new mongoose.Types.ObjectId()}`, fullName: 'Brokerin Owner', phoneNumber: 'Not provided', nationality: 'Not provided' });
    }
    user.password = password;
    user.role = UserRole.ADMIN;
    user.isAdmin = true;
    user.isSuperAdmin = true;
    user.isVerified = true;
    user.refreshToken = null;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    console.log(`Super admin configured: ${email}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message.replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[redacted database URI]') : 'Super admin setup failed');
  process.exitCode = 1;
});
