import mongoose, { Schema } from 'mongoose';
import { IFurnitureTransaction, IPaymentRecord, TransactionType, DeliveryStatus, PaymentStatus } from '../interfaces/FurnitureTransaction';
import crypto from 'crypto';

const PaymentRecordSchema = new Schema<IPaymentRecord>({
  payment_id: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  payment_date: { type: Date, required: true, default: Date.now },
  payment_method: {
    type: String,
    enum: ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Other'],
    required: true
  },
  payment_reference: { type: String },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
    default: 'Completed'
  },
  notes: { type: String },
  invoice_generated: { type: Boolean, default: false },
  invoice_number: { type: String },
  created_at: { type: Date, default: Date.now }
}, { _id: false });

const FurnitureTransactionSchema = new Schema<IFurnitureTransaction>({
  transaction_id: {
    type: String,
    required: true,
    unique: true
  },
  furniture_id: {
    type: Schema.Types.ObjectId,
    ref: 'Furniture',
    required: true
  },
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  transaction_type: {
    type: String,
    enum: Object.values(TransactionType),
    required: true
  },
  
  // Pricing
  total_amount: { type: Number, required: true },
  deposit_amount: { type: Number },
  monthly_rent: { type: Number },
  delivery_charge: { type: Number },
  tax_amount: { type: Number },
  
  // Payment tracking
  payment_status: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING
  },
  payment_records: [PaymentRecordSchema],
  total_paid: { type: Number, default: 0 },
  remaining_amount: { type: Number, required: true },
  
  // Delivery tracking
  delivery_status: {
    type: String,
    enum: Object.values(DeliveryStatus),
    default: DeliveryStatus.PENDING
  },
  delivery_address: {
    street: String,
    city: String,
    state: String,
    zipcode: String,
    country: String
  },
  delivery_date: { type: Date },
  delivered_date: { type: Date },
  delivery_tracking_number: { type: String },
  
  // Rental specific
  rental_start_date: { type: Date },
  rental_end_date: { type: Date },
  rental_duration_months: { type: Number },
  
  // Invoice
  invoice_number: { type: String, unique: true, sparse: true },
  invoice_generated: { type: Boolean, default: false },
  invoice_generated_at: { type: Date },
  
  // Status
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Cancelled'],
    default: 'Active'
  },
  cancellation_reason: { type: String },
  cancelled_at: { type: Date },
  
  // Notes
  admin_notes: { type: String },
  customer_notes: { type: String }
}, {
  timestamps: true
});

// Pre-save middleware to generate transaction_id
FurnitureTransactionSchema.pre('save', function(next) {
  if (this.isNew && !this.transaction_id) {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const randomString = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // Format: FTXN-2024-0319-A1B2C3D4
    this.transaction_id = `FTXN-${year}-${month}${day}-${randomString}`;
  }
  next();
});

// Index for faster queries
FurnitureTransactionSchema.index({ user_id: 1, status: 1 });
FurnitureTransactionSchema.index({ furniture_id: 1 });
FurnitureTransactionSchema.index({ transaction_id: 1 });
FurnitureTransactionSchema.index({ payment_status: 1 });
FurnitureTransactionSchema.index({ delivery_status: 1 });

export default mongoose.model<IFurnitureTransaction>('FurnitureTransaction', FurnitureTransactionSchema);

