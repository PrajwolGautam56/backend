import mongoose, { Schema, Document } from 'mongoose';

// Define the enum for status
export enum PropertyFormStatus {
  REQUESTED = 'Requested',
  ACCEPTED = 'Accepted',
  ONGOING = 'Ongoing',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled'
}

export interface IPropertyForm extends Document {
  property_id: string; // ID of the related property
  name: string;
  email: string;
  phoneNumber: string;
  message: string;
  status: PropertyFormStatus;
  userId?: Schema.Types.ObjectId; // Optional, if user is logged in
}

const PropertyFormSchema = new Schema<IPropertyForm>({
  property_id: { type: String, required: true }, // ID of the related property
  name: { type: String, required: true },
  email: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  message: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: false }, // Reference to User model
  status: { 
    type: String, 
    enum: Object.values(PropertyFormStatus), // Use the enum values
    default: PropertyFormStatus.REQUESTED // Set default value
  }
}, {
  timestamps: true // Automatically manage createdAt and updatedAt fields
});

PropertyFormSchema.index({ property_id: 1, status: 1 });
PropertyFormSchema.index({ email: 1 });
PropertyFormSchema.index({ createdAt: -1 });

// Middleware to generate a unique id before saving

const PropertyForm = mongoose.model<IPropertyForm>('PropertyForm', PropertyFormSchema);
export default PropertyForm;