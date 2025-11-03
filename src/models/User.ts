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
  }]
}, {
  timestamps: true
});

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password as string, salt);
  next();
});

UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);