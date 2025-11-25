import mongoose, { Schema, Document } from 'mongoose';
import { IProperty } from '../interfaces/Property';
import crypto from 'crypto';

const PropertySchema = new Schema<IProperty>({
  property_id: { 
    type: String, 
    required: false,
    unique: true 
  },
  name: { type: String, required: false },
  description: { type: String, required: false },
  type: { type: String, required: false },
  size: { type: Number, required: false },
  furnishing: { 
    type: String, 
    enum: ['Full', 'Semi', 'None'],
    required: false 
  },
  availability: {
    type: String,
    enum: ['Immediate', 'Within 15 Days', 'Within 30 Days', 'After 30 Days'],
    required: false
  },
  building_type: {
    type: String,
    enum: ['Apartment', 'Villa', 'Independent House', 'Pent House', 'Plot'],
    required: false
  },
  bhk: { type: Number, required: false },
  bathrooms: { type: Number, required: false },
  bedrooms: { type: Number, required: false },
  listing_type: { 
    type: String, 
    enum: ['Rent', 'Sell'],
    required: false 
  },
  parking: { 
    type: String, 
    enum: ['Public', 'Reserved'],
    required: false 
  },
  property_type: {
    type: String,
    enum: ['Residential', 'Commercial', 'PG Hostel'],
    required: false
  },
  location: { type: String, required: false },
  price: {
    rent_monthly: { type: Number },
    sell_price: { type: Number },
    deposit: { type: Number }
  },
  photos: [{ type: String }],
  amenities: [{ type: String }],
  status: { 
    type: String, 
    enum: ['Available', 'Sold'],
    default: 'Available' 
  },
  society: { type: String },
  added_by: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: false 
  },
  zipcode: {
    type: String,
    required: false,
    validate: {
      validator: function(v: string) {
        if (!v) return true; // Allow empty
        return /^\d{6}$/.test(v); // Validates 6-digit Indian postal code
      },
      message: 'Zipcode must be a valid 6-digit number'
    }
  },
  pets_allowed: {
    type: Boolean,
    default: false
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String
  },
  location_coordinates: {
    latitude: Number,
    longitude: Number
  }
}, {
  timestamps: true,
  strict: false, // Allow fields not in schema
  strictQuery: false // Allow queries on fields not in schema
});

// Helpful indexes for faster filtering/searching
PropertySchema.index({ property_id: 1 }, { unique: true });
PropertySchema.index({ status: 1, listing_type: 1 });
PropertySchema.index({ createdAt: -1 });
PropertySchema.index({ 'address.city': 1 });

// Pre-save middleware to generate property_id and ensure all fields are optional
PropertySchema.pre('save', function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const randomString = crypto.randomBytes(3).toString('hex').toUpperCase();
    
    // Format: PROP-2024-0319-A1B2C3
    this.property_id = `PROP-${year}-${month}${day}-${randomString}`;
  }
  
  // NO VALIDATION - Everything is optional
  // listing_type can be "Rent" or "Sell" without requiring price
  // All fields are optional - allow empty property to be saved
  
  next();
});

// Delete existing model if it exists (to clear cache)
if (mongoose.models.Property) {
  delete mongoose.models.Property;
}

export default mongoose.model<IProperty>('Property', PropertySchema); 