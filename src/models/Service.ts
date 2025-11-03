import mongoose, { Schema, Document } from 'mongoose';

export interface IService extends Document {
  name: string;
  category: 'carpentry' | 'plumbing' | 'electrical' | 'painting' | 'cleaning' | 'ac' | 'moving' | 'interior' | 'roofing' | 'flooring' | 'appliance_repair';
  description?: string;
  pricing: {
    type: 'fixed' | 'estimate' | 'range';
    amount?: number;
    minAmount?: number;
    maxAmount?: number;
    unit?: string;
  };
  features?: string[];
  images?: string[];
  isAvailable: boolean;
  estimateRequired: boolean;
  duration?: number; // Estimated duration in hours
  availableTimeSlots?: string[]; // Available time slots
}

const ServiceSchema: Schema = new Schema({
  name: { type: String, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['carpentry', 'plumbing', 'electrical', 'painting', 'cleaning', 'ac', 'moving', 'interior', 'roofing', 'flooring', 'appliance_repair']
  },
  description: String,
  pricing: {
    type: { type: String, required: true, enum: ['fixed', 'estimate', 'range'] },
    amount: Number,
    minAmount: Number,
    maxAmount: Number,
    unit: String
  },
  features: [String],
  images: [String],
  isAvailable: { type: Boolean, default: true },
  estimateRequired: { type: Boolean, default: false },
  duration: { type: Number }, // Estimated duration in hours
  availableTimeSlots: [String] // Available time slots like ['09:00-12:00', '14:00-17:00']
}, {
  timestamps: true
});

export default mongoose.model<IService>('Service', ServiceSchema); 