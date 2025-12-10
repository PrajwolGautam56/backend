import mongoose, { Schema, Document } from 'mongoose';

export interface ICartItem {
  product_id: string; // Furniture ID
  product_name: string;
  product_type: 'Furniture' | 'Appliance' | 'Electronic' | 'Other';
  category?: string;
  quantity: number;
  monthly_price: number;
  deposit: number;
  photos?: string[];
  item_type?: string; // e.g., "Sofa", "Refrigerator"
  brand?: string;
  condition?: string;
  // Calculated fields
  subtotal_monthly: number; // monthly_price * quantity
  subtotal_deposit: number; // deposit * quantity
}

export interface ICart extends Document {
  userId: Schema.Types.ObjectId; // User who owns this cart
  items: ICartItem[];
  total_monthly_amount: number; // Sum of all items' monthly prices
  total_deposit: number; // Sum of all deposits
  delivery_charge?: number;
  total_amount: number; // total_monthly_amount + total_deposit + delivery_charge
  expiresAt?: Date; // Optional: cart expiration
}

const CartItemSchema = new Schema<ICartItem>({
  product_id: { type: String, required: true },
  product_name: { type: String, required: true },
  product_type: {
    type: String,
    enum: ['Furniture', 'Appliance', 'Electronic', 'Other'],
    default: 'Other'
  },
  category: { type: String },
  quantity: { type: Number, required: true, default: 1, min: 1 },
  monthly_price: { type: Number, required: true, min: 0 },
  deposit: { type: Number, required: true, default: 0, min: 0 },
  photos: [{ type: String }],
  item_type: { type: String },
  brand: { type: String },
  condition: { type: String },
  subtotal_monthly: { type: Number, required: true, default: 0 },
  subtotal_deposit: { type: Number, required: true, default: 0 }
}, { _id: false });

const CartSchema = new Schema<ICart>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // One cart per user
  },
  items: [CartItemSchema],
  total_monthly_amount: { type: Number, required: true, default: 0 },
  total_deposit: { type: Number, required: true, default: 0 },
  delivery_charge: { type: Number, default: 0, min: 0 },
  total_amount: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date }
}, {
  timestamps: true
});

// Pre-save middleware to calculate totals
CartSchema.pre('save', function(next) {
  // Calculate subtotals for each item
  this.items.forEach(item => {
    item.subtotal_monthly = item.monthly_price * item.quantity;
    item.subtotal_deposit = item.deposit * item.quantity;
  });

  // Calculate cart totals
  this.total_monthly_amount = this.items.reduce(
    (sum, item) => sum + item.subtotal_monthly,
    0
  );
  this.total_deposit = this.items.reduce(
    (sum, item) => sum + item.subtotal_deposit,
    0
  );
  this.total_amount = this.total_monthly_amount + this.total_deposit + (this.delivery_charge || 0);

  next();
});

// Index for faster queries
CartSchema.index({ userId: 1 }, { unique: true });
CartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired carts

// Delete existing model if it exists (to clear cache)
if (mongoose.models.Cart) {
  delete mongoose.models.Cart;
}

export default mongoose.model<ICart>('Cart', CartSchema);

