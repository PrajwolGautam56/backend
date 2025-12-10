import mongoose, { Schema } from 'mongoose';
import { IFurniture } from '../interfaces/Furniture';
import crypto from 'crypto';

const FurnitureSchema = new Schema<IFurniture>({
  furniture_id: { 
    type: String, 
    required: false,
    unique: true 
  },
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['Furniture', 'Appliance', 'Electronic', 'Decoration', 'Kitchenware'],
    required: true 
  },
  item_type: { type: String, required: true }, // e.g., "Sofa", "Refrigerator", "TV"
  brand: { type: String },
  condition: {
    type: String,
    enum: ['New', 'Like New', 'Good', 'Fair', 'Needs Repair'],
    required: true
  },
  availability: {
    type: String,
    enum: ['Available', 'Rented', 'Sold'],
    default: 'Available',
    required: true
  },
  listing_type: { 
    type: String, 
    enum: ['Rent', 'Sell', 'Rent & Sell'],
    required: true 
  },
  price: {
    rent_monthly: { type: Number },
    sell_price: { type: Number },
    deposit: { type: Number }
  },
  photos: [{ type: String }],
  features: [{ type: String }],
  dimensions: {
    length: { type: Number },
    width: { type: Number },
    height: { type: Number },
    unit: { type: String, enum: ['cm', 'inch'], default: 'cm' }
  },
  location: { type: String, required: true },
  delivery_available: { type: Boolean, default: false },
  delivery_charge: { type: Number },
  age_years: { type: Number },
  warranty: { type: Boolean, default: false },
  warranty_months: { type: Number },
  added_by: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  zipcode: {
    type: String,
    required: true,
    validate: {
      validator: function(v: string) {
        return /^\d{6}$/.test(v);
      },
      message: 'Zipcode must be a valid 6-digit number'
    }
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
  },
  status: { 
    type: String, 
    enum: ['Available', 'Rented', 'Sold'],
    default: 'Available' 
  },
  stock: {
    type: Number,
    default: 1,
    min: 0
  }
}, {
  timestamps: true
});

FurnitureSchema.index({ furniture_id: 1 }, { unique: true });
FurnitureSchema.index({ listing_type: 1, status: 1 });
FurnitureSchema.index({ category: 1 });
FurnitureSchema.index({ createdAt: -1 });

// Pre-save middleware to generate furniture_id
FurnitureSchema.pre('save', function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const randomString = crypto.randomBytes(3).toString('hex').toUpperCase();
    
    // Format: FURN-2024-0319-A1B2C3
    this.furniture_id = `FURN-${year}-${month}${day}-${randomString}`;
  }
  next();
});

export default mongoose.model<IFurniture>('Furniture', FurnitureSchema);

