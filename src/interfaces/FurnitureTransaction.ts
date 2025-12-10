import { Document, Schema } from 'mongoose';

export enum TransactionType {
  RENT = 'Rent',
  SALE = 'Sale'
}

export enum DeliveryStatus {
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed',
  PREPARING = 'Preparing',
  OUT_FOR_DELIVERY = 'Out for Delivery',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled'
}

export enum PaymentStatus {
  PENDING = 'Pending',
  PARTIAL = 'Partial',
  PAID = 'Paid',
  REFUNDED = 'Refunded',
  FAILED = 'Failed'
}

export interface IFurnitureTransaction extends Document {
  transaction_id: string;
  furniture_id: Schema.Types.ObjectId;
  user_id: Schema.Types.ObjectId;
  transaction_type: TransactionType;
  
  // Pricing
  total_amount: number;
  deposit_amount?: number;
  monthly_rent?: number; // For rentals
  delivery_charge?: number;
  tax_amount?: number;
  
  // Payment tracking
  payment_status: PaymentStatus;
  payment_records: IPaymentRecord[];
  total_paid: number;
  remaining_amount: number;
  
  // Delivery tracking
  delivery_status: DeliveryStatus;
  delivery_address?: {
    street: string;
    city: string;
    state: string;
    zipcode: string;
    country: string;
  };
  delivery_date?: Date;
  delivered_date?: Date;
  delivery_tracking_number?: string;
  
  // Rental specific
  rental_start_date?: Date;
  rental_end_date?: Date;
  rental_duration_months?: number;
  
  // Invoice
  invoice_number?: string;
  invoice_generated: boolean;
  invoice_generated_at?: Date;
  
  // Status
  status: 'Active' | 'Completed' | 'Cancelled';
  cancellation_reason?: string;
  cancelled_at?: Date;
  
  // Notes
  admin_notes?: string;
  customer_notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentRecord {
  payment_id: string;
  amount: number;
  payment_date: Date;
  payment_method: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Cheque' | 'Other';
  payment_reference?: string; // Transaction ID, UPI ref, etc.
  status: 'Pending' | 'Completed' | 'Failed' | 'Refunded';
  notes?: string;
  invoice_generated: boolean;
  invoice_number?: string;
  created_at: Date;
}

