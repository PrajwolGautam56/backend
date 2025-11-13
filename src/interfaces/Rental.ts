import { Document, Schema } from 'mongoose';

export enum RentalStatus {
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
  ON_HOLD = 'On Hold'
}

export enum PaymentStatus {
  PENDING = 'Pending',
  PAID = 'Paid',
  OVERDUE = 'Overdue',
  PARTIAL = 'Partial'
}

export interface IPaymentRecord {
  _id?: string;
  month: string; // Format: "YYYY-MM"
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: PaymentStatus;
  paymentMethod?: string;
  notes?: string;
}

export interface IRentalItem {
  product_id?: string;
  product_name: string;
  product_type?: 'Furniture' | 'Appliance' | 'Electronic' | 'Other';
  quantity: number;
  monthly_price: number;
  deposit: number;
  start_date: Date;
  end_date?: Date;
}

export interface IRental extends Document {
  rental_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address?: {
    street?: string;
    city?: string;
    state?: string;
    zipcode?: string;
    country?: string;
  };
  userId?: Schema.Types.ObjectId;
  items: IRentalItem[];
  total_monthly_amount: number;
  total_deposit: number;
  start_date: Date;
  end_date?: Date;
  status: RentalStatus;
  payment_records: IPaymentRecord[];
  notes?: string;
  createdBy?: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

