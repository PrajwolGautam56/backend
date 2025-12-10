import logger from './logger';

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipcode?: string;
    country?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  tax?: number;
  taxRate?: number;
  deliveryCharge?: number;
  discount?: number;
  total: number;
  paymentStatus: 'Paid' | 'Partial' | 'Pending';
  paymentMethod?: string;
  paymentReference?: string;
  transactionType: 'Rent' | 'Sale' | 'Service';
  transactionId: string;
  notes?: string;
}

export interface InvoiceItem {
  description: string;
  quantity?: number;
  unitPrice: number;
  total: number;
}

/**
 * Generate invoice number in format: INV-YYYY-MMDD-XXXX
 */
export function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  
  return `INV-${year}-${month}${day}-${random}`;
}

/**
 * Generate HTML invoice
 */
export function generateInvoiceHTML(data: InvoiceData): string {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const addressHtml = data.customerAddress ? `
    <p>${data.customerAddress.street || ''}</p>
    <p>${data.customerAddress.city || ''}, ${data.customerAddress.state || ''} ${data.customerAddress.zipcode || ''}</p>
    <p>${data.customerAddress.country || 'India'}</p>
  ` : '';

  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.description}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity || 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.unitPrice)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.total)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      color: #333;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #2563eb;
    }
    .company-info h1 {
      margin: 0;
      color: #2563eb;
      font-size: 28px;
    }
    .invoice-info {
      text-align: right;
    }
    .invoice-info h2 {
      margin: 0;
      color: #2563eb;
      font-size: 24px;
    }
    .customer-info {
      margin-bottom: 30px;
    }
    .customer-info h3 {
      margin-top: 0;
      color: #333;
      border-bottom: 1px solid #ddd;
      padding-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background-color: #2563eb;
      color: white;
      padding: 12px;
      text-align: left;
    }
    td {
      padding: 8px;
    }
    .totals {
      margin-top: 20px;
      text-align: right;
    }
    .totals table {
      width: 300px;
      margin-left: auto;
    }
    .totals td {
      padding: 8px;
      border-bottom: 1px solid #ddd;
    }
    .totals .total-row {
      font-weight: bold;
      font-size: 18px;
      background-color: #f0f9ff;
      border-top: 2px solid #2563eb;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    .status-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 14px;
    }
    .status-paid {
      background-color: #10b981;
      color: white;
    }
    .status-partial {
      background-color: #f59e0b;
      color: white;
    }
    .status-pending {
      background-color: #ef4444;
      color: white;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="company-info">
        <h1>BrokerIn</h1>
        <p>Furniture & Services</p>
        <p>Email: brokerin.in@gmail.com</p>
      </div>
      <div class="invoice-info">
        <h2>INVOICE</h2>
        <p><strong>Invoice #:</strong> ${data.invoiceNumber}</p>
        <p><strong>Date:</strong> ${formatDate(data.invoiceDate)}</p>
        <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
      </div>
    </div>

    <div class="customer-info">
      <h3>Bill To:</h3>
      <p><strong>${data.customerName}</strong></p>
      ${data.customerEmail ? `<p>Email: ${data.customerEmail}</p>` : ''}
      ${data.customerPhone ? `<p>Phone: ${data.customerPhone}</p>` : ''}
      ${addressHtml}
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="totals">
      <table>
        <tr>
          <td>Subtotal:</td>
          <td style="text-align: right;">${formatCurrency(data.subtotal)}</td>
        </tr>
        ${data.discount ? `
        <tr>
          <td>Discount:</td>
          <td style="text-align: right;">-${formatCurrency(data.discount)}</td>
        </tr>
        ` : ''}
        ${data.deliveryCharge ? `
        <tr>
          <td>Delivery Charge:</td>
          <td style="text-align: right;">${formatCurrency(data.deliveryCharge)}</td>
        </tr>
        ` : ''}
        ${data.tax ? `
        <tr>
          <td>Tax (${data.taxRate || 0}%):</td>
          <td style="text-align: right;">${formatCurrency(data.tax)}</td>
        </tr>
        ` : ''}
        <tr class="total-row">
          <td>Total:</td>
          <td style="text-align: right;">${formatCurrency(data.total)}</td>
        </tr>
      </table>
    </div>

    <div style="margin-top: 30px;">
      <p><strong>Payment Status:</strong> 
        <span class="status-badge status-${data.paymentStatus.toLowerCase()}">
          ${data.paymentStatus}
        </span>
      </p>
      ${data.paymentMethod ? `<p><strong>Payment Method:</strong> ${data.paymentMethod}</p>` : ''}
      ${data.paymentReference ? `<p><strong>Payment Reference:</strong> ${data.paymentReference}</p>` : ''}
      ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
    </div>

    <div class="footer">
      <p>Thank you for your business!</p>
      <p>This is a computer-generated invoice. No signature required.</p>
      <p>For queries, contact: brokerin.in@gmail.com</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate PDF-ready invoice (returns HTML that can be converted to PDF)
 */
export function generateInvoicePDF(data: InvoiceData): string {
  // For now, return HTML. Can be enhanced with PDF generation library like puppeteer
  return generateInvoiceHTML(data);
}

