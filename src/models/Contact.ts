import mongoose, { Schema, Document } from 'mongoose';

export interface IContact extends Document {
  contact_id: string;
  fullname: string;
  email: string;
  phonenumber: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'responded';
  userId?: Schema.Types.ObjectId; // Reference to User (optional for logged-in users)
  created_at: Date;
  updated_at: Date;
}

const ContactSchema: Schema = new Schema({
  contact_id: {
    type: String,
    unique: true,
    required: true,
    default: () => 'CNT' + Date.now().toString()
  },
  fullname: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  phonenumber: {
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
  subject: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['new', 'read', 'responded'],
    default: 'new'
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

export default mongoose.model<IContact>('Contact', ContactSchema); 