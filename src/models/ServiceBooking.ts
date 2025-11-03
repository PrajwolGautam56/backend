import mongoose, { Schema, Document } from 'mongoose';
import User from './User';

export interface IServiceBooking extends Document {
  service_booking_id: string;
  service_type: string;
  name: string;
  phone_number: string;
  email?: string;
  preferred_date: Date;
  preferred_time: string;
  alternate_date?: Date;
  alternate_time?: string;
  service_address: string;
  additional_notes?: string;
  status: 'requested'| 'accepted' | 'ongoing' | 'completed' | 'cancelled';
  userId?: Schema.Types.ObjectId; // Reference to User
  created_at: Date;
  updated_at: Date;
}

const ServiceBookingSchema: Schema = new Schema({
  service_booking_id: {
    type: String,
    unique: true,
    required: true,
    default: () => 'SB' + Date.now().toString()
  },
  service_type: {
    type: String,
    required: true,
  
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone_number: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^\+?[\d\s-]{10,}$/.test(v);
      },
      message: 'Please enter a valid phone number'
    }
  },
  preferred_date: {
    type: Date,
    required: true
  },
  preferred_time: {
    type: String,
    required: true,
    // Accept both HH:MM format and time slot format
    validate: {
      validator: function(v: string) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v) || 
               /^([01]?[0-9]|2[0-3]):[0-5][0-9]-[01]?[0-9]|2[0-3]:[0-5][0-9]$/.test(v);
      },
      message: 'Time must be in HH:MM format or time slot format (HH:MM-HH:MM)'
    }
  },
  alternate_date: {
    type: Date
  },
  alternate_time: {
    type: String
  },
  email: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        if (!v) return true; // Optional field
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  service_address: {
    type: String,
    required: true,
    trim: true
  },
  additional_notes: {
    type: String,
    trim: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  status: {
    type: String,
    enum: ['requested', 'accepted', 'ongoing','completed', 'cancelled'],
    default: 'requested'
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Pre-save middleware to validate preferred_date is not in the past
ServiceBookingSchema.pre('save', function(next) {
  if (this.preferred_date < new Date()) {
    next(new Error('Preferred date cannot be in the past'));
  }
  next();
});

export default mongoose.model<IServiceBooking>('ServiceBooking', ServiceBookingSchema); 