import mongoose, { Schema, Document } from 'mongoose';

export enum OrderStatus {
  PENDING = 'Pending', // Order placed, awaiting processing
  PROCESSING = 'Processing', // Order is being processed
  CONFIRMED = 'Confirmed', // Order confirmed, ready for delivery
  OUT_FOR_DELIVERY = 'Out for Delivery', // Items are being delivered
  DELIVERED = 'Delivered', // Items delivered
  CANCELLED = 'Cancelled', // Order cancelled
  REFUNDED = 'Refunded' // Order refunded
}

export enum PaymentMethod {
  COD = 'COD', // Cash on Delivery
  ONLINE = 'Online', // Online payment
  BANK_TRANSFER = 'Bank Transfer',
  UPI = 'UPI',
  CARD = 'Card'
}

export interface IOrderItem {
  product_id?: string; // Reference to furniture/product
  product_name: string;
  product_type?: 'Furniture' | 'Appliance' | 'Electronic' | 'Other';
  quantity: number;
  monthly_price: number;
  deposit: number;
  photos?: string[];
}

export interface IOrder extends Document {
  order_id: string; // Auto-generated unique ID (e.g., ORDER-2024-1104-A1B2C3)
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
  userId?: Schema.Types.ObjectId; // Link to User
  items: IOrderItem[];
  total_monthly_amount: number; // Sum of all items' monthly prices
  total_deposit: number; // Sum of all deposits
  delivery_charge?: number; // Delivery charge
  order_status: OrderStatus; // Order processing status
  payment_method?: PaymentMethod; // Payment method used
  notes?: string;
  order_placed_at?: Date; // When order was placed
  order_confirmed_at?: Date; // When order was confirmed
  delivery_date?: Date; // Scheduled delivery date
  delivered_at?: Date; // Actual delivery date
}

const OrderItemSchema = new Schema<IOrderItem>({
  product_id: { type: String },
  product_name: { type: String, required: true },
  product_type: {
    type: String,
    enum: ['Furniture', 'Appliance', 'Electronic', 'Other']
  },
  quantity: { type: Number, required: true, default: 1 },
  monthly_price: { type: Number, required: true },
  deposit: { type: Number, required: true, default: 0 },
  photos: [{ type: String }]
}, { _id: false });

const OrderSchema = new Schema<IOrder>({
  order_id: {
    type: String,
    required: false, // Will be auto-generated in pre-save hook
    unique: true,
    default: undefined
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
  items: [OrderItemSchema],
  total_monthly_amount: { type: Number, required: true },
  total_deposit: { type: Number, required: true, default: 0 },
  delivery_charge: { type: Number, default: 0 },
  order_status: {
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING
  },
  payment_method: {
    type: String,
    enum: Object.values(PaymentMethod)
  },
  notes: { type: String },
  order_placed_at: {
    type: Date,
    default: Date.now
  },
  order_confirmed_at: {
    type: Date
  },
  delivery_date: {
    type: Date
  },
  delivered_at: {
    type: Date
  }
}, {
  timestamps: true,
  validateBeforeSave: true
});

// Pre-save middleware to generate order_id (only if not provided)
OrderSchema.pre('save', async function(next) {
  // Generate order_id if not provided
  if (!this.order_id) {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const crypto = require('crypto');
    const randomString = crypto.randomBytes(3).toString('hex').toUpperCase();
    
    // Format: ORDER-2024-1104-A1B2C3
    this.order_id = `ORDER-${year}-${month}${day}-${randomString}`;
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
OrderSchema.index({ customer_email: 1 });
OrderSchema.index({ userId: 1 });
OrderSchema.index({ order_status: 1 });
OrderSchema.index({ order_id: 1 });
OrderSchema.index({ order_placed_at: -1 });

// Delete existing model if it exists (to clear cache)
if (mongoose.models.Order) {
  delete mongoose.models.Order;
}

export default mongoose.model<IOrder>('Order', OrderSchema);

