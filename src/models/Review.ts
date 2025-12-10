import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  furniture_id: Schema.Types.ObjectId;
  user_id: Schema.Types.ObjectId;
  rating: number; // 1-5
  title: string;
  comment: string;
  verified_purchase: boolean;
  helpful_count: number;
  images?: string[];
  status: 'Pending' | 'Approved' | 'Rejected';
  admin_response?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>({
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
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  comment: {
    type: String,
    required: true,
    maxlength: 1000
  },
  verified_purchase: {
    type: Boolean,
    default: false
  },
  helpful_count: {
    type: Number,
    default: 0
  },
  images: [{ type: String }],
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  admin_response: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Indexes
ReviewSchema.index({ furniture_id: 1, user_id: 1 });
ReviewSchema.index({ furniture_id: 1, status: 1 });
ReviewSchema.index({ user_id: 1 });

// Delete existing model if it exists
if (mongoose.models.Review) {
  delete mongoose.models.Review;
}

export default mongoose.model<IReview>('Review', ReviewSchema);

