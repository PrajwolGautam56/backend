import mongoose, { Schema, Document } from 'mongoose';

// Define the enum for status
export enum FurnitureFormStatus {
  REQUESTED = 'Requested',
  ACCEPTED = 'Accepted',
  ONGOING = 'Ongoing',
  COMPLETED = 'Completed',
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
    default: FurnitureFormStatus.REQUESTED
  }
}, {
  timestamps: true
});

export default mongoose.model<IFurnitureForm>('FurnitureForm', FurnitureFormSchema);

