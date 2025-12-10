import mongoose, { Schema, Document } from 'mongoose';

export interface IWishlistItem {
  furniture_id: Schema.Types.ObjectId;
  added_at: Date;
}

export interface IWishlist extends Document {
  userId: Schema.Types.ObjectId;
  items: IWishlistItem[];
  createdAt: Date;
  updatedAt: Date;
}

const WishlistItemSchema = new Schema<IWishlistItem>({
  furniture_id: {
    type: Schema.Types.ObjectId,
    ref: 'Furniture',
    required: true
  },
  added_at: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const WishlistSchema = new Schema<IWishlist>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [WishlistItemSchema]
}, {
  timestamps: true
});

// Index for faster queries
WishlistSchema.index({ userId: 1 }, { unique: true });

// Delete existing model if it exists
if (mongoose.models.Wishlist) {
  delete mongoose.models.Wishlist;
}

export default mongoose.model<IWishlist>('Wishlist', WishlistSchema);

