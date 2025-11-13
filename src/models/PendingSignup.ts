import mongoose, { Schema, Document } from 'mongoose';

export interface IPendingSignup extends Document {
  fullName: string;
  username: string;
  email: string;
  phoneNumber: string;
  nationality: string;
  passwordHash: string;
  otp: string;
  otpExpires: Date;
  createdAt: Date;
}

const PendingSignupSchema: Schema = new Schema({
  fullName: { type: String, required: true },
  username: { type: String, required: true, index: true },
  email: { type: String, required: true, index: true },
  phoneNumber: { type: String, required: true },
  nationality: { type: String, required: true },
  passwordHash: { type: String, required: true },
  otp: { type: String, required: true },
  otpExpires: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
}, {
  timestamps: false
});

// Ensure we don't keep stale pending signups forever: optional TTL of 1 day
// Note: This requires MongoDB TTL monitor; it will delete docs ~60s after they expire.
PendingSignupSchema.index({ otpExpires: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export default mongoose.model<IPendingSignup>('PendingSignup', PendingSignupSchema);


