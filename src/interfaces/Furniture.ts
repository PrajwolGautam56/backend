import { Document, Schema } from 'mongoose';

export interface IFurniture extends Document {
  furniture_id: string;
  name: string;
  description: string;
  category: 'Furniture' | 'Appliance' | 'Electronic' | 'Decoration' | 'Kitchenware';
  item_type: string; // e.g., "Sofa", "Refrigerator", "TV"
  brand?: string;
  condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Needs Repair';
  availability: 'Available' | 'Rented' | 'Sold';
  listing_type: 'Rent' | 'Sell' | 'Rent & Sell';
  price: {
    rent_monthly?: number;
    sell_price?: number;
    deposit?: number;
  };
  photos: string[];
  features: string[];
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit: 'cm' | 'inch';
  };
  location: string;
  delivery_available: boolean;
  delivery_charge?: number;
  age_years?: number;
  warranty?: boolean;
  warranty_months?: number;
  added_by: Schema.Types.ObjectId;
  zipcode: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
  };
  location_coordinates?: {
    latitude: number;
    longitude: number;
  };
  status: 'Available' | 'Rented' | 'Sold';
  stock?: number;
}

