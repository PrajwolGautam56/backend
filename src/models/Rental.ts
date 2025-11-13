import mongoose, { Schema, Document } from 'mongoose';

export enum RentalStatus {
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
  ON_HOLD = 'On Hold'
}

export enum PaymentStatus {
  PENDING = 'Pending',
  PAID = 'Paid',
  OVERDUE = 'Overdue',
  PARTIAL = 'Partial'
}

export interface IPaymentRecord extends Document {
  month: string; // Format: "YYYY-MM" (e.g., "2024-11")
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: PaymentStatus;
  paymentMethod?: string;
  notes?: string;
}

export interface IRentalItem {
  product_id?: string; // Reference to furniture/product
  product_name: string;
  product_type?: 'Furniture' | 'Appliance' | 'Electronic' | 'Other';
  quantity: number;
  monthly_price: number;
  deposit: number;
  start_date: Date;
  end_date?: Date;
}

export interface IRental extends Document {
  rental_id: string; // Auto-generated unique ID
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address?: {
    street?: string;
    city?: string;
    state?: string;
    zipcode?: string;
    country?: string;
  };
  userId?: Schema.Types.ObjectId; // Link to User if email matches
  items: IRentalItem[];
  total_monthly_amount: number; // Sum of all items' monthly prices
  total_deposit: number; // Sum of all deposits
  start_date: Date;
  end_date?: Date;
  status: RentalStatus;
  payment_records: IPaymentRecord[];
  notes?: string;
  createdBy?: Schema.Types.ObjectId; // Admin who created this
  updatedBy?: Schema.Types.ObjectId; // Admin who last updated
}

const PaymentRecordSchema = new Schema<IPaymentRecord>({
  month: { type: String, required: true },
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  paidDate: { type: Date },
  status: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING
  },
  paymentMethod: { type: String },
  notes: { type: String }
}, { _id: true });

const RentalItemSchema = new Schema<IRentalItem>({
  product_id: { type: String },
  product_name: { type: String, required: true },
  product_type: {
    type: String,
    enum: ['Furniture', 'Appliance', 'Electronic', 'Other']
  },
  quantity: { type: Number, required: true, default: 1 },
  monthly_price: { type: Number, required: true },
  deposit: { type: Number, required: true, default: 0 },
  start_date: { type: Date, required: true },
  end_date: { type: Date }
}, { _id: false });

const RentalSchema = new Schema<IRental>({
  rental_id: {
    type: String,
    required: false, // Will be auto-generated in pre-save hook
    unique: true,
    default: undefined // Explicitly set default to undefined
  },
  customer_name: { type: String, required: true },
  customer_email: { type: String, required: true },
  customer_phone: { type: String, required: true },
  customer_address: {
    street: String,
    city: String,
    state: String,
    zipcode: String,
    country: String
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  items: [RentalItemSchema],
  total_monthly_amount: { type: Number, required: true },
  total_deposit: { type: Number, required: true, default: 0 },
  start_date: { type: Date, required: true },
  end_date: { type: Date },
  status: {
    type: String,
    enum: Object.values(RentalStatus),
    default: RentalStatus.ACTIVE
  },
  payment_records: [PaymentRecordSchema],
  notes: { type: String },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true,
  validateBeforeSave: true // Keep validation, but rental_id will be set before save
});

// Pre-save middleware to generate rental_id (only if not provided)
RentalSchema.pre('save', async function(next) {
  // Generate rental_id if not provided
  if (!this.rental_id) {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const crypto = require('crypto');
    const randomString = crypto.randomBytes(3).toString('hex').toUpperCase();
    
    // Format: RENT-2024-1104-A1B2C3
    this.rental_id = `RENT-${year}-${month}${day}-${randomString}`;
  }
  
  // Auto-link to user if email matches
  if (this.isNew && this.customer_email && !this.userId) {
    try {
      const User = mongoose.model('User');
      const user = await User.findOne({ 
        email: { $regex: new RegExp(`^${this.customer_email}$`, 'i') }
      });
      if (user) {
        this.userId = user._id;
      }
    } catch (error) {
      // User model might not be available, continue without linking
    }
  }
  
  next();
});

// Index for faster queries
RentalSchema.index({ customer_email: 1 });
RentalSchema.index({ userId: 1 });
RentalSchema.index({ status: 1 });
RentalSchema.index({ rental_id: 1 });

// Delete existing model if it exists (to clear cache)
if (mongoose.models.Rental) {
  delete mongoose.models.Rental;
}

export default mongoose.model<IRental>('Rental', RentalSchema);

