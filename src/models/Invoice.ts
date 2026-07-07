import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceItem {
  description: string;
  rate: number;
  quantity: number;
  amount: number;
}

export interface IInvoice extends Document {
  invoice_number: string;
  invoice_year: number;
  sequence: number;
  invoice_date: Date;
  client_name: string;
  client_address: string;
  property_name: string;
  items: IInvoiceItem[];
  subtotal: number;
  tax_percent: number;
  tax_amount: number;
  other_fees_label?: string;
  other_fees_amount: number;
  grand_total: number;
  notes?: string;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>({
  description: { type: String, required: true, trim: true },
  rate: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  amount: { type: Number, required: true, min: 0 }
}, { _id: false });

const InvoiceSchema = new Schema<IInvoice>({
  invoice_number: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  invoice_year: {
    type: Number,
    required: true,
    index: true
  },
  sequence: {
    type: Number,
    required: true,
    min: 101
  },
  invoice_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  client_name: {
    type: String,
    required: true,
    trim: true
  },
  client_address: {
    type: String,
    required: true,
    trim: true
  },
  property_name: {
    type: String,
    required: true,
    trim: true
  },
  items: {
    type: [InvoiceItemSchema],
    validate: {
      validator: (items: IInvoiceItem[]) => items.length > 0,
      message: 'At least one invoice item is required'
    }
  },
  subtotal: { type: Number, required: true, min: 0 },
  tax_percent: { type: Number, required: true, min: 0, default: 18 },
  tax_amount: { type: Number, required: true, min: 0 },
  other_fees_label: { type: String, trim: true },
  other_fees_amount: { type: Number, required: true, min: 0, default: 0 },
  grand_total: { type: Number, required: true, min: 0 },
  notes: { type: String, trim: true },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

InvoiceSchema.index({ invoice_year: 1, sequence: 1 }, { unique: true });
InvoiceSchema.index({ createdAt: -1 });

if (mongoose.models.Invoice) {
  delete mongoose.models.Invoice;
}

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);
