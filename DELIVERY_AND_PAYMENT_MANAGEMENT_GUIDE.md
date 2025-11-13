# Delivery & Payment Management Guide

## 🎯 Overview

Complete guide for delivery status tracking, payment management, invoice generation, and order/rental history management in the BrokerIn system.

---

## 📦 Delivery Status Management

### Delivery Status Flow

The system tracks the complete delivery lifecycle:

```
Pending → Confirmed → Preparing → Out for Delivery → Delivered
```

**Status Descriptions:**
- **Pending** - Order placed, awaiting confirmation
- **Confirmed** - Order confirmed, preparing for dispatch
- **Preparing** - Item being prepared/packed for delivery
- **Out for Delivery** - Item is on the way to customer
- **Delivered** - Successfully delivered to customer
- **Cancelled** - Delivery cancelled

---

## 🚚 Delivery Management API

### 1. Update Delivery Status (Admin Only)

**Endpoint:** `PUT /api/furniture-transactions/:id/delivery-status`

**Authentication:** Required (Admin token)

**Request Body:**
```json
{
  "delivery_status": "Out for Delivery",
  "delivery_tracking_number": "TRACK123456789",
  "delivery_date": "2024-11-12T10:00:00Z"
}
```

**Response:**
```json
{
  "message": "Delivery status updated successfully",
  "transaction": {
    "transaction_id": "FTXN-2024-1111-ABC123",
    "delivery_status": "Out for Delivery",
    "delivery_tracking_number": "TRACK123456789",
    "delivery_date": "2024-11-12T10:00:00Z",
    "delivered_date": null
  }
}
```

**Example: Mark as Delivered:**
```json
{
  "delivery_status": "Delivered"
}
```
*Note: When status is "Delivered", `delivered_date` is automatically set to current timestamp.*

---

### 2. Get Transactions by Delivery Status

**Endpoint:** `GET /api/furniture-transactions?delivery_status=Out for Delivery`

**Query Parameters:**
- `delivery_status` - Filter by status (Pending, Confirmed, Preparing, Out for Delivery, Delivered, Cancelled)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Response:**
```json
{
  "transactions": [
    {
      "transaction_id": "FTXN-2024-1111-ABC123",
      "delivery_status": "Out for Delivery",
      "delivery_tracking_number": "TRACK123456789",
      "furniture_id": {
        "name": "Modern Sofa Set",
        "photos": [...]
      },
      "user_id": {
        "fullName": "John Doe",
        "email": "john@example.com"
      },
      "delivery_address": {
        "street": "123 Main St",
        "city": "Mumbai",
        "state": "Maharashtra",
        "zipcode": "400001"
      }
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "pages": 3
  }
}
```

---

## 💳 Payment Management

### 1. Add Payment (Admin Only)

**Endpoint:** `POST /api/furniture-transactions/:id/payment`

**Authentication:** Required (Admin token)

**Request Body:**
```json
{
  "amount": 5000,
  "payment_method": "UPI",
  "payment_reference": "UPI123456789",
  "notes": "Payment received via UPI"
}
```

**Payment Methods:**
- `Cash`
- `UPI`
- `Card`
- `Bank Transfer`
- `Cheque`
- `Other`

**Response:**
```json
{
  "message": "Payment recorded successfully",
  "payment": {
    "payment_id": "PAY-1234567890-ABC123",
    "amount": 5000,
    "payment_method": "UPI",
    "payment_reference": "UPI123456789",
    "status": "Completed",
    "payment_date": "2024-11-11T10:00:00.000Z",
    "invoice_generated": true,
    "invoice_number": "INV-2024-1111-1234"
  },
  "transaction": {
    "transaction_id": "FTXN-2024-1111-ABC123",
    "total_amount": 5000,
    "total_paid": 5000,
    "remaining_amount": 0,
    "payment_status": "Paid"
  },
  "invoiceGenerated": true,
  "invoiceNumber": "INV-2024-1111-1234"
}
```

**What Happens Automatically:**
1. ✅ Payment record created
2. ✅ Payment status updated (Pending → Partial → Paid)
3. ✅ Invoice auto-generated (if first payment)
4. ✅ Invoice email sent to customer
5. ✅ Remaining amount calculated

---

### 2. Get Transactions by Payment Status

**Endpoint:** `GET /api/furniture-transactions?payment_status=Pending`

**Query Parameters:**
- `payment_status` - Filter by status (Pending, Partial, Paid, Refunded, Failed)
- `page` - Page number
- `limit` - Items per page

**Response:**
```json
{
  "transactions": [
    {
      "transaction_id": "FTXN-2024-1111-ABC123",
      "payment_status": "Pending",
      "total_amount": 5000,
      "total_paid": 0,
      "remaining_amount": 5000,
      "payment_records": []
    }
  ],
  "pagination": { ... }
}
```

---

### 3. View Payment History

**Endpoint:** `GET /api/furniture-transactions/:id`

**Response includes payment_records:**
```json
{
  "transaction_id": "FTXN-2024-1111-ABC123",
  "payment_records": [
    {
      "payment_id": "PAY-1234567890-ABC123",
      "amount": 2000,
      "payment_date": "2024-11-01T10:00:00.000Z",
      "payment_method": "UPI",
      "payment_reference": "UPI123456789",
      "status": "Completed",
      "invoice_generated": true,
      "invoice_number": "INV-2024-1101-1234"
    },
    {
      "payment_id": "PAY-1234567891-DEF456",
      "amount": 3000,
      "payment_date": "2024-11-11T10:00:00.000Z",
      "payment_method": "Cash",
      "status": "Completed",
      "invoice_generated": true,
      "invoice_number": "INV-2024-1111-5678"
    }
  ],
  "total_paid": 5000,
  "remaining_amount": 0,
  "payment_status": "Paid"
}
```

---

## 📄 Invoice Management

### 1. Generate Invoice

**Endpoint:** `GET /api/furniture-transactions/:id/invoice?payment_id=PAY-123`

**Query Parameters:**
- `payment_id` (optional) - Generate invoice for specific payment

**Response:** HTML invoice (can be converted to PDF)

**Features:**
- Professional HTML invoice
- Company branding
- Customer details
- Item description
- Payment breakdown
- Payment status badge
- Payment method and reference

---

### 2. Automatic Invoice Generation

**When invoices are auto-generated:**
1. ✅ First payment received (transaction invoice)
2. ✅ Each payment can have its own invoice
3. ✅ Invoice number format: `INV-YYYY-MMDD-XXXX`
4. ✅ Email sent automatically with invoice

**Invoice Email Includes:**
- Full HTML invoice
- Payment details
- Transaction ID
- Invoice number
- Download link (if PDF available)

---

## 📊 Order & Rental History

### 1. Get User's Transaction History

**Endpoint:** `GET /api/furniture-transactions`

**Authentication:** Required (User token)

**Query Parameters:**
- `status` - Filter by status (Active, Completed, Cancelled)
- `transaction_type` - Filter by type (Rent, Sale)
- `payment_status` - Filter by payment status
- `delivery_status` - Filter by delivery status
- `page` - Page number
- `limit` - Items per page

**Response:**
```json
{
  "transactions": [
    {
      "transaction_id": "FTXN-2024-1111-ABC123",
      "transaction_type": "Sale",
      "status": "Active",
      "payment_status": "Paid",
      "delivery_status": "Out for Delivery",
      "furniture_id": {
        "name": "Modern Sofa Set",
        "photos": [...],
        "price": {
          "sell_price": 5000
        }
      },
      "total_amount": 5000,
      "total_paid": 5000,
      "remaining_amount": 0,
      "invoice_number": "INV-2024-1111-1234",
      "createdAt": "2024-11-11T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 10,
    "page": 1,
    "pages": 1
  }
}
```

---

### 2. Get Single Transaction Details

**Endpoint:** `GET /api/furniture-transactions/:id`

**Response includes:**
- Complete transaction details
- Payment history
- Delivery information
- Invoice information
- Customer details
- Furniture details

---

### 3. Get Ongoing Rentals

**Endpoint:** `GET /api/furniture-transactions?transaction_type=Rent&status=Active`

**Response:**
```json
{
  "transactions": [
    {
      "transaction_id": "FTXN-2024-1111-ABC123",
      "transaction_type": "Rent",
      "status": "Active",
      "monthly_rent": 2000,
      "rental_start_date": "2024-09-11T00:00:00.000Z",
      "rental_end_date": "2025-03-11T00:00:00.000Z",
      "rental_duration_months": 6,
      "payment_status": "Partial",
      "total_paid": 4000,
      "remaining_amount": 8000,
      "furniture_id": {
        "name": "Modern Sofa Set"
      }
    }
  ]
}
```

---

## 🔧 Admin Dashboard Features

### 1. View All Transactions

**Endpoint:** `GET /api/furniture-transactions`

**Admin Access:** Sees all transactions
**User Access:** Sees only their transactions

**Filters Available:**
- By status (Active, Completed, Cancelled)
- By transaction type (Rent, Sale)
- By payment status
- By delivery status
- Pagination support

---

### 2. Cancel Transaction (Admin Only)

**Endpoint:** `POST /api/furniture-transactions/:id/cancel`

**Request Body:**
```json
{
  "cancellation_reason": "Customer requested cancellation"
}
```

**What Happens:**
- Transaction status → Cancelled
- Furniture status → Available (if not delivered)
- Cancellation reason recorded
- Cancellation timestamp set

---

### 3. Update Transaction Notes

**Endpoint:** `PUT /api/furniture-transactions/:id`

**Request Body:**
```json
{
  "admin_notes": "Customer requested early delivery",
  "customer_notes": "Please deliver before 5 PM"
}
```

---

## 📧 Email Notifications

### 1. Invoice Email
**Triggered:** When payment is received
**Recipient:** Customer
**Includes:**
- Full HTML invoice
- Payment confirmation
- Transaction details

### 2. Delivery Status Updates
**Can be enhanced to send emails on:**
- Order confirmed
- Out for delivery
- Delivered

### 3. Payment Reminders
**Triggered:** Daily cron job (9:00 AM)
**For:** Pending payments
**Includes:**
- Amount due
- Payment deadline
- Payment link

---

## 🔄 Complete Workflow Examples

### Purchase Flow:

1. **User Creates Transaction:**
   ```
   POST /api/furniture-transactions
   {
     "furniture_id": "...",
     "transaction_type": "Sale",
     "delivery_address": { ... }
   }
   ```

2. **Admin Records Payment:**
   ```
   POST /api/furniture-transactions/:id/payment
   {
     "amount": 5000,
     "payment_method": "UPI"
   }
   ```
   - ✅ Invoice auto-generated
   - ✅ Email sent to customer

3. **Admin Updates Delivery:**
   ```
   PUT /api/furniture-transactions/:id/delivery-status
   {
     "delivery_status": "Confirmed"
   }
   ```

4. **Admin Marks Out for Delivery:**
   ```
   PUT /api/furniture-transactions/:id/delivery-status
   {
     "delivery_status": "Out for Delivery",
     "delivery_tracking_number": "TRACK123"
   }
   ```

5. **Admin Marks Delivered:**
   ```
   PUT /api/furniture-transactions/:id/delivery-status
   {
     "delivery_status": "Delivered"
   }
   ```

---

### Rental Flow:

1. **User Creates Rental:**
   ```
   POST /api/furniture-transactions
   {
     "furniture_id": "...",
     "transaction_type": "Rent",
     "rental_duration_months": 6
   }
   ```

2. **Admin Records Deposit:**
   ```
   POST /api/furniture-transactions/:id/payment
   {
     "amount": 5000,
     "payment_method": "Cash",
     "notes": "Security deposit"
   }
   ```

3. **Monthly Payments:**
   - System checks daily for payments due
   - Sends email reminders
   - User can pay via Razorpay or admin records manually

4. **Admin Records Monthly Payment:**
   ```
   POST /api/furniture-transactions/:id/payment
   {
     "amount": 2000,
     "payment_method": "UPI",
     "notes": "Monthly rent - November"
   }
   ```

---

## 📱 Frontend Integration Examples

### 1. Display Delivery Status

```typescript
const DeliveryStatusBadge = ({ status }: { status: string }) => {
  const statusColors = {
    'Pending': 'gray',
    'Confirmed': 'blue',
    'Preparing': 'yellow',
    'Out for Delivery': 'orange',
    'Delivered': 'green',
    'Cancelled': 'red'
  };

  return (
    <span style={{ color: statusColors[status] }}>
      {status}
    </span>
  );
};
```

### 2. Show Payment Status

```typescript
const PaymentStatus = ({ transaction }: { transaction: any }) => {
  const { payment_status, total_amount, total_paid, remaining_amount } = transaction;
  
  return (
    <div>
      <h3>Payment Status: {payment_status}</h3>
      <p>Total Amount: ₹{total_amount}</p>
      <p>Paid: ₹{total_paid}</p>
      <p>Remaining: ₹{remaining_amount}</p>
      {payment_status === 'Paid' && (
        <p>Invoice: {transaction.invoice_number}</p>
      )}
    </div>
  );
};
```

### 3. Display Transaction History

```typescript
const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  
  useEffect(() => {
    fetch('/api/furniture-transactions')
      .then(res => res.json())
      .then(data => setTransactions(data.transactions));
  }, []);
  
  return (
    <div>
      <h2>My Orders</h2>
      {transactions.map(txn => (
        <div key={txn.transaction_id}>
          <h3>{txn.furniture_id.name}</h3>
          <p>Status: {txn.status}</p>
          <p>Payment: {txn.payment_status}</p>
          <p>Delivery: {txn.delivery_status}</p>
          {txn.delivery_tracking_number && (
            <p>Tracking: {txn.delivery_tracking_number}</p>
          )}
        </div>
      ))}
    </div>
  );
};
```

### 4. Admin Payment Form

```typescript
const AdminPaymentForm = ({ transactionId }: { transactionId: string }) => {
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'Cash',
    payment_reference: '',
    notes: ''
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch(`/api/furniture-transactions/${transactionId}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    if (data.invoiceGenerated) {
      alert(`Payment recorded! Invoice ${data.invoiceNumber} sent to customer.`);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="number"
        placeholder="Amount"
        value={formData.amount}
        onChange={(e) => setFormData({...formData, amount: e.target.value})}
        required
      />
      <select
        value={formData.payment_method}
        onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
      >
        <option value="Cash">Cash</option>
        <option value="UPI">UPI</option>
        <option value="Card">Card</option>
        <option value="Bank Transfer">Bank Transfer</option>
        <option value="Cheque">Cheque</option>
      </select>
      <input
        type="text"
        placeholder="Payment Reference (optional)"
        value={formData.payment_reference}
        onChange={(e) => setFormData({...formData, payment_reference: e.target.value})}
      />
      <textarea
        placeholder="Notes (optional)"
        value={formData.notes}
        onChange={(e) => setFormData({...formData, notes: e.target.value})}
      />
      <button type="submit">Record Payment</button>
    </form>
  );
};
```

### 5. Admin Delivery Status Update

```typescript
const DeliveryStatusUpdate = ({ transactionId }: { transactionId: string }) => {
  const [status, setStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  
  const handleUpdate = async () => {
    await fetch(`/api/furniture-transactions/${transactionId}/delivery-status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        delivery_status: status,
        delivery_tracking_number: trackingNumber || undefined
      })
    });
    
    alert('Delivery status updated!');
  };
  
  return (
    <div>
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">Select Status</option>
        <option value="Pending">Pending</option>
        <option value="Confirmed">Confirmed</option>
        <option value="Preparing">Preparing</option>
        <option value="Out for Delivery">Out for Delivery</option>
        <option value="Delivered">Delivered</option>
      </select>
      {status === 'Out for Delivery' && (
        <input
          type="text"
          placeholder="Tracking Number"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
        />
      )}
      <button onClick={handleUpdate}>Update Status</button>
    </div>
  );
};
```

---

## 🔍 Status Tracking Dashboard

### Admin Dashboard View:

```typescript
const AdminDashboard = () => {
  const [stats, setStats] = useState({
    pendingPayments: 0,
    outForDelivery: 0,
    pendingDeliveries: 0,
    totalRevenue: 0
  });
  
  useEffect(() => {
    // Fetch statistics
    Promise.all([
      fetch('/api/furniture-transactions?payment_status=Pending').then(r => r.json()),
      fetch('/api/furniture-transactions?delivery_status=Out for Delivery').then(r => r.json()),
      fetch('/api/furniture-transactions?delivery_status=Pending').then(r => r.json())
    ]).then(([pending, outForDelivery, pendingDel]) => {
      setStats({
        pendingPayments: pending.pagination.total,
        outForDelivery: outForDelivery.pagination.total,
        pendingDeliveries: pendingDel.pagination.total,
        totalRevenue: 0 // Calculate from transactions
      });
    });
  }, []);
  
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <div className="stats">
        <div>
          <h3>Pending Payments</h3>
          <p>{stats.pendingPayments}</p>
        </div>
        <div>
          <h3>Out for Delivery</h3>
          <p>{stats.outForDelivery}</p>
        </div>
        <div>
          <h3>Pending Deliveries</h3>
          <p>{stats.pendingDeliveries}</p>
        </div>
      </div>
    </div>
  );
};
```

---

## 📊 Reporting & Analytics

### Get Payment Summary

```typescript
const getPaymentSummary = async () => {
  const response = await fetch('/api/furniture-transactions?payment_status=Paid');
  const data = await response.json();
  
  const totalRevenue = data.transactions.reduce(
    (sum: number, txn: any) => sum + txn.total_paid, 
    0
  );
  
  return {
    totalTransactions: data.pagination.total,
    totalRevenue,
    averageTransaction: totalRevenue / data.pagination.total
  };
};
```

---

## 🔐 Security & Access Control

### Access Levels:

1. **Admin:**
   - ✅ View all transactions
   - ✅ Record payments
   - ✅ Update delivery status
   - ✅ Cancel transactions
   - ✅ Generate invoices

2. **User:**
   - ✅ View own transactions
   - ✅ View own invoices
   - ✅ View delivery status
   - ❌ Cannot modify transactions

---

## 📝 Best Practices

1. **Payment Recording:**
   - Always record payment reference for traceability
   - Add notes for important payments
   - Verify amount before recording

2. **Delivery Updates:**
   - Update status promptly
   - Add tracking number when available
   - Mark delivered immediately after delivery

3. **Invoice Management:**
   - Invoices auto-generate on first payment
   - Each payment can have separate invoice
   - Keep invoice numbers for records

4. **Status Updates:**
   - Update delivery status in real-time
   - Notify customers of status changes
   - Track all status transitions

---

## 🚀 Quick Reference

### Common Admin Tasks:

1. **Record Payment:**
   ```
   POST /api/furniture-transactions/:id/payment
   ```

2. **Update Delivery:**
   ```
   PUT /api/furniture-transactions/:id/delivery-status
   ```

3. **View Pending Payments:**
   ```
   GET /api/furniture-transactions?payment_status=Pending
   ```

4. **View Out for Delivery:**
   ```
   GET /api/furniture-transactions?delivery_status=Out for Delivery
   ```

5. **Generate Invoice:**
   ```
   GET /api/furniture-transactions/:id/invoice
   ```

---

## 📞 Support

For issues or questions:
- Email: brokerin.in@gmail.com
- Check API documentation at `/api-docs`
- Review transaction logs for debugging

---

**Last Updated:** November 2024
**Version:** 2.0.0

