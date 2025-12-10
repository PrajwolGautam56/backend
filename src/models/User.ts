import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole } from '../interfaces/User';

export interface IUser extends Document {
  fullName: string;
  username: string;
  email: string;
  phoneNumber: string;
  nationality: string;
  password: string;
  otp?: string;
  otpExpires?: Date;
  isVerified: boolean;
  profilePicture: string;
  role: UserRole;
  refreshToken: string | null;
  isAdmin: boolean;
  activityLog?: {
    action: string;
    timestamp: Date;
    details?: any;
  }[];
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
}

const UserSchema: Schema = new Schema({
  fullName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true },
  nationality: { type: String, required: true },
  password: { type: String, required: true },
  profilePicture: { type: String, default: 'default-profile.png' },
  role: { type: String, enum: Object.values(UserRole), default: UserRole.USER },
  isVerified: { type: Boolean, default: false },
  refreshToken: { type: String, default: null },
  isAdmin: { type: Boolean, default: false },
  otp: { type: String },
  otpExpires: { type: Date },
  activityLog: [{
    action: { type: String },
    timestamp: { type: Date, default: Date.now },
    details: { type: Schema.Types.Mixed }
  }],
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null }
}, {
  timestamps: true
});

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  // If the password already looks like a bcrypt hash, skip re-hashing.
  // This enables creating users from pre-hashed passwords (e.g., pending signup flow).
  const passwordStr = this.password as string;
  const isBcryptHash = typeof passwordStr === 'string' && passwordStr.startsWith('$2');
  if (isBcryptHash) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(passwordStr, salt);
  next();
});

UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);