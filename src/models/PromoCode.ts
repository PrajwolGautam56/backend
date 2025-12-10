import mongoose, { Schema, Document } from 'mongoose';

export interface IPromoCode extends Document {
  code: string;
  description: string;
  discount_type: 'Percentage' | 'Fixed';
  discount_value: number;
  min_order_amount?: number;
  max_discount_amount?: number;
  valid_from: Date;
  valid_until: Date;
  usage_limit?: number;
  used_count: number;
  applicable_to: 'All' | 'Rent' | 'Sell';
  applicable_categories?: string[];
  active: boolean;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PromoCodeSchema = new Schema<IPromoCode>({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  discount_type: {
    type: String,
    enum: ['Percentage', 'Fixed'],
    required: true
  },
  discount_value: {
    type: Number,
    required: true,
    min: 0
  },
  min_order_amount: {
    type: Number,
    min: 0
  },
  max_discount_amount: {
    type: Number,
    min: 0
  },
  valid_from: {
    type: Date,
    required: true
  },
  valid_until: {
    type: Date,
    required: true
  },
  usage_limit: {
    type: Number,
    min: 0
  },
  used_count: {
    type: Number,
    default: 0,
    min: 0
  },
  applicable_to: {
    type: String,
    enum: ['All', 'Rent', 'Sell'],
    default: 'All'
  },
  applicable_categories: [{ type: String }],
  active: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
PromoCodeSchema.index({ code: 1 });
PromoCodeSchema.index({ active: 1, valid_from: 1, valid_until: 1 });

// Delete existing model if it exists
if (mongoose.models.PromoCode) {
  delete mongoose.models.PromoCode;
}

export default mongoose.model<IPromoCode>('PromoCode', PromoCodeSchema);

