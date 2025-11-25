import mongoose, { Schema, Document } from 'mongoose';

// Define the enum for status - Simplified statuses
export enum FurnitureFormStatus {
  // Sell flow: Ordered → Confirmed → Out for Delivery → Delivered
  ORDERED = 'Ordered', // For Sell - initial status
  // Rent flow: Requested → Confirmed → Scheduled Delivery → Out for Delivery → Delivered
  REQUESTED = 'Requested', // For Rent - initial status
  // Common statuses
  CONFIRMED = 'Confirmed', // After payment
  SCHEDULED_DELIVERY = 'Scheduled Delivery', // For Rent - with delivery date
  OUT_FOR_DELIVERY = 'Out for Delivery',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled'
}

export interface IFurnitureForm extends Document {
  furniture_id: string; // ID of the related furniture
  name: string;
  email: string;
  phoneNumber: string;
  message: string;
  listing_type?: 'Rent' | 'Sell' | 'Rent & Sell';
  status: FurnitureFormStatus;
  payment_status?: 'Pending' | 'Paid' | 'Partial' | 'Refunded';
  scheduled_delivery_date?: Date; // For Rent - when delivery is scheduled
  userId?: Schema.Types.ObjectId; // Optional, if user is logged in
}

const FurnitureFormSchema = new Schema<IFurnitureForm>({
  furniture_id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  message: { type: String, required: true },
  listing_type: { 
    type: String, 
    enum: ['Rent', 'Sell', 'Rent & Sell'] 
  },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  status: { 
    type: String, 
    enum: Object.values(FurnitureFormStatus),
    default: function(this: IFurnitureForm) {
      // Default status based on listing type
      if (this.listing_type === 'Sell' || (this.listing_type === 'Rent & Sell' && this.status === undefined)) {
        return FurnitureFormStatus.ORDERED;
      }
      return FurnitureFormStatus.REQUESTED;
    }
  },
  payment_status: {
    type: String,
    enum: ['Pending', 'Paid', 'Partial', 'Refunded'],
    default: 'Pending'
  },
  scheduled_delivery_date: { type: Date }
}, {
  timestamps: true
});

FurnitureFormSchema.index({ furniture_id: 1, status: 1 });
FurnitureFormSchema.index({ email: 1 });
FurnitureFormSchema.index({ createdAt: -1 });
FurnitureFormSchema.index({ listing_type: 1, payment_status: 1 });

export default mongoose.model<IFurnitureForm>('FurnitureForm', FurnitureFormSchema);

