import { Document, Schema } from 'mongoose';

export interface IProperty extends Document {
  property_id?: string;
  name?: string;
  description?: string;
  type?: string;
  size?: number;
  furnishing?: 'Full' | 'Semi' | 'None';
  availability?: 'Immediate' | 'Within 15 Days' | 'Within 30 Days' | 'After 30 Days';
  building_type?: 'Apartment' | 'Villa' | 'Independent House' | 'Pent House' | 'Plot';
  bhk?: number;
  bathrooms?: number;
  bedrooms?: number;
  listing_type?: 'Rent' | 'Sell';
  parking?: 'Public' | 'Reserved' | 'Covered';
  property_type?: 'Residential' | 'Commercial' | 'PG Hostel';
  location?: string;
  price?: {
    rent_monthly?: number;
    sell_price?: number;
    deposit?: number;
  };
  photos?: string[];
  amenities?: string[];
  status?: 'Available' | 'Sold';
  society?: string;
  added_by?: Schema.Types.ObjectId;
  zipcode?: string;
  pets_allowed?: boolean;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  location_coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  updatedBy?: Schema.Types.ObjectId;
  createdBy?: Schema.Types.ObjectId;
}