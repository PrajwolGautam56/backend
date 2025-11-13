# Frontend Rental Management Guide

This guide explains how to implement the rental management system in the frontend, including admin panel features and user dashboard integration.

## Overview

The rental management system allows admins to:
- Manually add rental records with customer details
- Track products/services rented by customers
- Manage monthly payments and payment history
- Set deposit amounts and monthly prices
- Link rentals to registered users automatically (by email match)

Users can view:
- Their rental history
- Ongoing rentals
- Payment records and status

## API Endpoints

### Base URL
```
/api/rentals
```

### Admin Endpoints

#### 1. Create Rental
```
POST /api/rentals
Headers: Authorization: Bearer <admin_token>
Body: {
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "+1234567890",
  "customer_address": {
    "street": "123 Main St",
    "city": "Bangalore",
    "state": "Karnataka",
    "zipcode": "560001",
    "country": "India"
  },
  "items": [
    {
      "product_id": "FURN-2024-1104-ABC123", // Optional - reference to furniture/product
      "product_name": "Sofa Set",
      "product_type": "Furniture", // Furniture | Appliance | Electronic | Other
      "quantity": 1,
      "monthly_price": 5000,
      "deposit": 10000,
      "start_date": "2024-11-01",
      "end_date": "2025-11-01" // Optional
    }
  ],
  "start_date": "2024-11-01",
  "end_date": "2025-11-01", // Optional
  "notes": "Customer prefers monthly payment on 1st"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rental created successfully",
  "data": {
    "_id": "...",
    "rental_id": "RENT-2024-1104-A1B2C3",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "+1234567890",
    "items": [...],
    "total_monthly_amount": 5000,
    "total_deposit": 10000,
    "start_date": "2024-11-01T00:00:00.000Z",
    "status": "Active",
    "payment_records": [
      {
        "_id": "...",
        "month": "2024-11",
        "amount": 5000,
        "dueDate": "2024-11-08T00:00:00.000Z",
        "status": "Pending"
      },
      // ... more payment records
    ],
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### 2. Get All Rentals (with filters)
```
GET /api/rentals?status=Active&customer_email=john@example.com&search=John&page=1&limit=10&sortBy=createdAt&sortOrder=desc
Headers: Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `status`: Filter by status (Active, Completed, Cancelled, On Hold)
- `customer_email`: Filter by customer email
- `search`: Search in name, email, phone, rental_id
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `sortBy`: Field to sort by (default: createdAt)
- `sortOrder`: asc or desc (default: desc)

#### 3. Get Single Rental
```
GET /api/rentals/:id
Headers: Authorization: Bearer <admin_token>
```

#### 4. Update Rental
```
PUT /api/rentals/:id
Headers: Authorization: Bearer <admin_token>
Body: {
  "status": "Completed",
  "items": [...], // Updated items (will recalculate totals)
  "notes": "Updated notes"
}
```

#### 5. Delete Rental
```
DELETE /api/rentals/:id
Headers: Authorization: Bearer <admin_token>
```

### Payment Management Endpoints

#### 6. Add Payment Record
```
POST /api/rentals/:id/payments
Headers: Authorization: Bearer <admin_token>
Body: {
  "month": "2024-11", // Format: YYYY-MM
  "amount": 5000,
  "dueDate": "2024-11-08",
  "paidDate": "2024-11-05", // Optional
  "status": "Paid", // Pending | Paid | Overdue | Partial
  "paymentMethod": "Bank Transfer", // Optional
  "notes": "Payment received on time" // Optional
}
```

#### 7. Update Payment Record
```
PUT /api/rentals/:id/payments/:paymentId
Headers: Authorization: Bearer <admin_token>
Body: {
  "status": "Paid",
  "paidDate": "2024-11-05",
  "paymentMethod": "Cash",
  "notes": "Updated payment info"
}
```

#### 8. Generate Payment Records (for next N months)
```
POST /api/rentals/:id/payments/generate
Headers: Authorization: Bearer <admin_token>
Body: {
  "months": 3 // Generate payment records for next 3 months
}
```

### User Endpoints

#### 9. Get My Rentals
```
GET /api/rentals/my-rentals
Headers: Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "rental_id": "RENT-2024-1104-A1B2C3",
      "customer_name": "John Doe",
      "items": [
        {
          "product_name": "Sofa Set",
          "monthly_price": 5000,
          "deposit": 10000
        }
      ],
      "total_monthly_amount": 5000,
      "total_deposit": 10000,
      "status": "Active",
      "payment_records": [
        {
          "month": "2024-11",
          "amount": 5000,
          "dueDate": "2024-11-08",
          "paidDate": "2024-11-05",
          "status": "Paid"
        }
      ]
    }
  ]
}
```

## Rental Status Values

- `Active`: Rental is currently active
- `Completed`: Rental period has ended
- `Cancelled`: Rental was cancelled
- `On Hold`: Rental is temporarily on hold

## Payment Status Values

- `Pending`: Payment not yet received
- `Paid`: Payment received
- `Overdue`: Payment is past due date
- `Partial`: Partial payment received

## Frontend Implementation Examples

### React Component: Admin Rental Management

```tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Rental {
  _id: string;
  rental_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items: Array<{
    product_name: string;
    monthly_price: number;
    deposit: number;
    quantity: number;
  }>;
  total_monthly_amount: number;
  total_deposit: number;
  status: 'Active' | 'Completed' | 'Cancelled' | 'On Hold';
  payment_records: Array<{
    _id: string;
    month: string;
    amount: number;
    dueDate: string;
    paidDate?: string;
    status: 'Pending' | 'Paid' | 'Overdue' | 'Partial';
  }>;
}

const AdminRentalManagement: React.FC = () => {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchRentals();
  }, []);

  const fetchRentals = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/rentals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRentals(response.data.data);
    } catch (error) {
      console.error('Error fetching rentals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRental = async (rentalData: any) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/rentals', rentalData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRentals();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating rental:', error);
    }
  };

  const handleUpdatePayment = async (rentalId: string, paymentId: string, paymentData: any) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/rentals/${rentalId}/payments/${paymentId}`, paymentData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRentals();
    } catch (error) {
      console.error('Error updating payment:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2>Rental Management</h2>
        <button onClick={() => setShowCreateModal(true)}>Add New Rental</button>
      </div>

      {showCreateModal && (
        <CreateRentalModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateRental}
        />
      )}

      <div className="rentals-list">
        {rentals.map(rental => (
          <RentalCard
            key={rental._id}
            rental={rental}
            onUpdatePayment={handleUpdatePayment}
          />
        ))}
      </div>
    </div>
  );
};

const RentalCard: React.FC<{ rental: Rental; onUpdatePayment: Function }> = ({ rental, onUpdatePayment }) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const handleMarkAsPaid = (payment: any) => {
    setSelectedPayment(payment);
    setShowPaymentModal(true);
  };

  const submitPayment = async (paymentData: any) => {
    await onUpdatePayment(rental._id, selectedPayment._id, {
      ...paymentData,
      status: 'Paid',
      paidDate: new Date().toISOString()
    });
    setShowPaymentModal(false);
  };

  return (
    <div className="rental-card" style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '15px' }}>
      <h3>{rental.customer_name} - {rental.rental_id}</h3>
      <p>Email: {rental.customer_email}</p>
      <p>Phone: {rental.customer_phone}</p>
      <p>Status: <span className={`status-${rental.status.toLowerCase()}`}>{rental.status}</span></p>
      
      <div>
        <h4>Items:</h4>
        {rental.items.map((item, index) => (
          <div key={index}>
            {item.product_name} - ₹{item.monthly_price}/month (Deposit: ₹{item.deposit})
          </div>
        ))}
      </div>

      <div>
        <p>Total Monthly: ₹{rental.total_monthly_amount}</p>
        <p>Total Deposit: ₹{rental.total_deposit}</p>
      </div>

      <div>
        <h4>Payment Records:</h4>
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rental.payment_records.map(payment => (
              <tr key={payment._id}>
                <td>{payment.month}</td>
                <td>₹{payment.amount}</td>
                <td>{new Date(payment.dueDate).toLocaleDateString()}</td>
                <td className={`status-${payment.status.toLowerCase()}`}>{payment.status}</td>
                <td>
                  {payment.status === 'Pending' && (
                    <button onClick={() => handleMarkAsPaid(payment)}>Mark as Paid</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPaymentModal && (
        <PaymentModal
          payment={selectedPayment}
          onClose={() => setShowPaymentModal(false)}
          onSubmit={submitPayment}
        />
      )}
    </div>
  );
};

export default AdminRentalManagement;
```

### React Component: User Rental Dashboard

```tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserRentals: React.FC = () => {
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyRentals();
  }, []);

  const fetchMyRentals = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/rentals/my-rentals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRentals(response.data.data);
    } catch (error) {
      console.error('Error fetching rentals:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  const activeRentals = rentals.filter(r => r.status === 'Active');
  const completedRentals = rentals.filter(r => r.status === 'Completed');

  return (
    <div>
      <h2>My Rentals</h2>
      
      <div>
        <h3>Active Rentals ({activeRentals.length})</h3>
        {activeRentals.map(rental => (
          <div key={rental._id} className="rental-item">
            <h4>{rental.rental_id}</h4>
            <p>Items: {rental.items.map((i: any) => i.product_name).join(', ')}</p>
            <p>Monthly Payment: ₹{rental.total_monthly_amount}</p>
            <p>Deposit: ₹{rental.total_deposit}</p>
            
            <div>
              <h5>Payment History:</h5>
              {rental.payment_records.map((payment: any) => (
                <div key={payment._id}>
                  {payment.month}: ₹{payment.amount} - {payment.status}
                  {payment.paidDate && (
                    <span> (Paid on {new Date(payment.paidDate).toLocaleDateString()})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3>Completed Rentals ({completedRentals.length})</h3>
        {completedRentals.map(rental => (
          <div key={rental._id} className="rental-item">
            <h4>{rental.rental_id}</h4>
            <p>Items: {rental.items.map((i: any) => i.product_name).join(', ')}</p>
            <p>End Date: {new Date(rental.end_date).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserRentals;
```

### Integration with User Dashboard

The user dashboard already includes rentals. When you fetch the dashboard:

```tsx
const fetchDashboard = async () => {
  const response = await axios.get('/api/users/dashboard', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  // Dashboard includes:
  // - stats.totalRentals
  // - stats.activeRentals
  // - recentRentals (last 5)
  // - allRentals (all rentals)
  
  return response.data.data;
};
```

## Key Features

1. **Automatic User Linking**: If a rental is created with an email that matches a registered user, it's automatically linked to that user's account.

2. **Payment Tracking**: 
   - Automatic generation of payment records for the first 3 months
   - Manual addition of payment records
   - Update payment status (Pending → Paid)
   - Track payment method and notes

3. **Monthly Payment Management**:
   - View all payment records by month
   - Filter by payment status
   - Generate payment records for future months
   - Track overdue payments

4. **Rental Status Management**:
   - Update rental status (Active, Completed, Cancelled, On Hold)
   - Track rental start and end dates
   - Manage multiple items per rental

5. **User Dashboard Integration**:
   - Users see their rentals automatically if email matches
   - View payment history
   - See ongoing and completed rentals

## Best Practices

1. **Email Matching**: Always use the exact email format when creating rentals to ensure proper user linking.

2. **Payment Records**: Generate payment records in advance (e.g., 3-6 months) to help track upcoming payments.

3. **Status Updates**: Update payment status promptly when payments are received to maintain accurate records.

4. **Error Handling**: Handle cases where rentals might not be linked to users (guest rentals).

5. **Data Validation**: Validate all input fields, especially amounts and dates, before submitting.

## Email Reminders

The backend automatically sends email reminders to customers:

### Automatic Reminders (Cron Job)
- **3 days before due date**: Friendly reminder
- **1 day before due date**: Reminder
- **Due date**: Reminder
- **Overdue (1-3 days)**: Daily urgent reminder
- **Overdue (4+ days)**: Weekly reminder

### Manual Reminder Trigger
Admins can manually send reminders for a specific rental:

```typescript
// Send payment reminders for a rental
POST /api/rentals/:id/send-reminders
Headers: Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Payment reminders sent (2 reminder(s))",
  "data": {
    "remindersSent": 2
  }
}
```

### Email Types Sent Automatically

1. **Rental Confirmation** - When rental is created
2. **Payment Reminders** - Before due dates
3. **Overdue Reminders** - For late payments
4. **Payment Confirmation** - When payment is marked as paid
5. **Status Updates** - When rental status changes

### Frontend: Manual Reminder Button

```tsx
const RentalCard: React.FC<{ rental: Rental }> = ({ rental }) => {
  const [sending, setSending] = useState(false);

  const handleSendReminders = async () => {
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/rentals/${rental._id}/send-reminders`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert(`Reminders sent: ${response.data.data.remindersSent} reminder(s)`);
    } catch (error) {
      console.error('Error sending reminders:', error);
      alert('Failed to send reminders');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rental-card">
      {/* ... rental details ... */}
      
      <button 
        onClick={handleSendReminders}
        disabled={sending}
        className="btn-send-reminder"
      >
        {sending ? 'Sending...' : 'Send Payment Reminders'}
      </button>
    </div>
  );
};
```

## Payment Status Management

### Update Payment Status

When admin marks a payment as paid, a confirmation email is automatically sent:

```tsx
const handleMarkPaymentAsPaid = async (rentalId: string, paymentId: string) => {
  try {
    const token = localStorage.getItem('token');
    await axios.put(
      `/api/rentals/${rentalId}/payments/${paymentId}`,
      {
        status: 'Paid',
        paidDate: new Date().toISOString(),
        paymentMethod: 'Bank Transfer' // or 'Cash', 'UPI', etc.
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    // Email confirmation is sent automatically by backend
    alert('Payment marked as paid. Confirmation email sent to customer.');
  } catch (error) {
    console.error('Error updating payment:', error);
  }
};
```

## Complete Admin Rental Management Component

```tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Rental {
  _id: string;
  rental_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items: Array<{
    product_name: string;
    monthly_price: number;
    deposit: number;
    quantity: number;
  }>;
  total_monthly_amount: number;
  total_deposit: number;
  status: 'Active' | 'Completed' | 'Cancelled' | 'On Hold';
  payment_records: Array<{
    _id: string;
    month: string;
    amount: number;
    dueDate: string;
    paidDate?: string;
    status: 'Pending' | 'Paid' | 'Overdue' | 'Partial';
  }>;
  start_date: string;
  end_date?: string;
}

const AdminRentalManagement: React.FC = () => {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });

  useEffect(() => {
    fetchRentals();
  }, [filters]);

  const fetchRentals = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      
      const response = await axios.get(`/api/rentals?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRentals(response.data.data);
    } catch (error) {
      console.error('Error fetching rentals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRental = async (rentalData: any) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/rentals', rentalData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRentals();
      setShowCreateModal(false);
      alert('Rental created successfully! Confirmation email sent to customer.');
    } catch (error: any) {
      console.error('Error creating rental:', error);
      alert(error.response?.data?.message || 'Error creating rental');
    }
  };

  const handleUpdatePayment = async (
    rentalId: string, 
    paymentId: string, 
    paymentData: any
  ) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `/api/rentals/${rentalId}/payments/${paymentId}`,
        paymentData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchRentals();
      alert('Payment updated. Confirmation email sent to customer.');
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('Failed to update payment');
    }
  };

  const handleSendReminders = async (rentalId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/rentals/${rentalId}/send-reminders`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Reminders sent: ${response.data.data.remindersSent} reminder(s)`);
    } catch (error) {
      console.error('Error sending reminders:', error);
      alert('Failed to send reminders');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="rental-management">
      <div className="header">
        <h2>Rental Management</h2>
        <button onClick={() => setShowCreateModal(true)}>
          Add New Rental
        </button>
      </div>

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search by name, email, phone, or rental ID"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
          <option value="On Hold">On Hold</option>
        </select>
      </div>

      {/* Rentals List */}
      <div className="rentals-list">
        {rentals.map(rental => (
          <RentalCard
            key={rental._id}
            rental={rental}
            onUpdatePayment={handleUpdatePayment}
            onSendReminders={handleSendReminders}
          />
        ))}
      </div>

      {showCreateModal && (
        <CreateRentalModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateRental}
        />
      )}
    </div>
  );
};

const RentalCard: React.FC<{
  rental: Rental;
  onUpdatePayment: Function;
  onSendReminders: Function;
}> = ({ rental, onUpdatePayment, onSendReminders }) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const handleMarkAsPaid = (payment: any) => {
    setSelectedPayment(payment);
    setShowPaymentModal(true);
  };

  const submitPayment = async (paymentData: any) => {
    await onUpdatePayment(rental._id, selectedPayment._id, {
      ...paymentData,
      status: 'Paid',
      paidDate: new Date().toISOString()
    });
    setShowPaymentModal(false);
  };

  const pendingPayments = rental.payment_records.filter(
    p => p.status === 'Pending' || p.status === 'Overdue'
  );

  return (
    <div className="rental-card">
      <div className="rental-header">
        <h3>{rental.customer_name} - {rental.rental_id}</h3>
        <span className={`status-badge status-${rental.status.toLowerCase()}`}>
          {rental.status}
        </span>
      </div>

      <div className="rental-info">
        <p><strong>Email:</strong> {rental.customer_email}</p>
        <p><strong>Phone:</strong> {rental.customer_phone}</p>
        <p><strong>Total Monthly:</strong> ₹{rental.total_monthly_amount}</p>
        <p><strong>Total Deposit:</strong> ₹{rental.total_deposit}</p>
      </div>

      <div className="rental-items">
        <h4>Items:</h4>
        {rental.items.map((item, index) => (
          <div key={index} className="item">
            {item.product_name} (x{item.quantity}) - 
            ₹{item.monthly_price}/month, Deposit: ₹{item.deposit}
          </div>
        ))}
      </div>

      <div className="payment-section">
        <div className="payment-header">
          <h4>Payment Records</h4>
          {pendingPayments.length > 0 && (
            <button
              onClick={() => onSendReminders(rental._id)}
              className="btn-send-reminder"
            >
              Send Reminders ({pendingPayments.length})
            </button>
          )}
        </div>

        <table className="payment-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rental.payment_records.map(payment => (
              <tr
                key={payment._id}
                className={payment.status === 'Overdue' ? 'overdue' : ''}
              >
                <td>{payment.month}</td>
                <td>₹{payment.amount}</td>
                <td>{new Date(payment.dueDate).toLocaleDateString()}</td>
                <td>
                  <span className={`status-${payment.status.toLowerCase()}`}>
                    {payment.status}
                  </span>
                </td>
                <td>
                  {payment.status === 'Pending' && (
                    <button onClick={() => handleMarkAsPaid(payment)}>
                      Mark as Paid
                    </button>
                  )}
                  {payment.status === 'Overdue' && (
                    <button onClick={() => handleMarkAsPaid(payment)}>
                      Mark as Paid
                    </button>
                  )}
                  {payment.status === 'Paid' && payment.paidDate && (
                    <span className="paid-date">
                      Paid: {new Date(payment.paidDate).toLocaleDateString()}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPaymentModal && (
        <PaymentModal
          payment={selectedPayment}
          onClose={() => setShowPaymentModal(false)}
          onSubmit={submitPayment}
        />
      )}
    </div>
  );
};

const PaymentModal: React.FC<{
  payment: any;
  onClose: () => void;
  onSubmit: (data: any) => void;
}> = ({ payment, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    paymentMethod: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Mark Payment as Paid</h3>
        <p><strong>Month:</strong> {payment.month}</p>
        <p><strong>Amount:</strong> ₹{payment.amount}</p>
        
        <form onSubmit={handleSubmit}>
          <div>
            <label>Payment Method:</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              required
            >
              <option value="">Select method</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="Cheque">Cheque</option>
              <option value="Card">Card</option>
            </select>
          </div>
          
          <div>
            <label>Notes (optional):</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this payment"
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">Mark as Paid</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminRentalManagement;
```

## Summary

The rental management system provides comprehensive tracking of customer rentals, payments, and product management. It seamlessly integrates with the user dashboard, allowing customers to view their rental history and payment status automatically when their email matches a registered account.

### Key Features:
- ✅ Manual rental creation with customer details
- ✅ Automatic payment record generation
- ✅ Monthly payment tracking
- ✅ Automatic email reminders (3 days, 1 day, due date, overdue)
- ✅ Manual reminder trigger for admins
- ✅ Payment status management
- ✅ User dashboard integration
- ✅ Email notifications for all rental events

## Email Notification Status Indicators

### Show Email Status in UI

You can add visual indicators to show when emails have been sent:

```tsx
const PaymentRecordRow: React.FC<{ payment: any; rental: Rental }> = ({ payment, rental }) => {
  const [emailStatus, setEmailStatus] = useState<'sent' | 'pending' | null>(null);

  // Check if reminder should have been sent
  useEffect(() => {
    const dueDate = new Date(payment.dueDate);
    const today = new Date();
    const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue <= 3 && payment.status === 'Pending') {
      setEmailStatus('sent'); // Reminder should have been sent
    }
  }, [payment]);

  return (
    <tr>
      <td>{payment.month}</td>
      <td>₹{payment.amount}</td>
      <td>
        {new Date(payment.dueDate).toLocaleDateString()}
        {emailStatus === 'sent' && (
          <span className="email-indicator" title="Reminder email sent">
            📧
          </span>
        )}
      </td>
      <td>
        <span className={`status-${payment.status.toLowerCase()}`}>
          {payment.status}
        </span>
      </td>
      <td>
        {payment.status === 'Pending' && (
          <button onClick={() => handleMarkAsPaid(payment)}>
            Mark as Paid
          </button>
        )}
        {payment.status === 'Paid' && payment.paidDate && (
          <span className="paid-badge">
            ✅ Paid: {new Date(payment.paidDate).toLocaleDateString()}
            <span className="email-sent" title="Confirmation email sent">📧</span>
          </span>
        )}
      </td>
    </tr>
  );
};
```

### Email Notification Badge Component

```tsx
const EmailNotificationBadge: React.FC<{ 
  type: 'reminder' | 'confirmation' | 'status-update';
  sent: boolean;
}> = ({ type, sent }) => {
  if (!sent) return null;

  const icons = {
    reminder: '📧',
    confirmation: '✅📧',
    'status-update': '📬'
  };

  const tooltips = {
    reminder: 'Payment reminder email sent',
    confirmation: 'Payment confirmation email sent',
    'status-update': 'Status update email sent'
  };

  return (
    <span 
      className="email-badge" 
      title={tooltips[type]}
      style={{ marginLeft: '8px', fontSize: '14px' }}
    >
      {icons[type]}
    </span>
  );
};
```

## User Dashboard: Email Notifications

Users can see email notifications in their rental dashboard:

```tsx
const UserRentalCard: React.FC<{ rental: Rental }> = ({ rental }) => {
  return (
    <div className="user-rental-card">
      <h4>{rental.rental_id}</h4>
      <p>Items: {rental.items.map(i => i.product_name).join(', ')}</p>
      
      <div className="payment-section">
        <h5>Payment Schedule</h5>
        {rental.payment_records.map(payment => (
          <div key={payment._id} className="payment-item">
            <div className="payment-header">
              <span>{payment.month}</span>
              <span>₹{payment.amount}</span>
              <span className={`status-${payment.status.toLowerCase()}`}>
                {payment.status}
              </span>
            </div>
            
            {payment.status === 'Paid' && payment.paidDate && (
              <div className="payment-details">
                <small>
                  Paid on: {new Date(payment.paidDate).toLocaleDateString()}
                  <EmailNotificationBadge type="confirmation" sent={true} />
                </small>
              </div>
            )}
            
            {payment.status === 'Pending' && (
              <div className="payment-details">
                <small>
                  Due: {new Date(payment.dueDate).toLocaleDateString()}
                  <EmailNotificationBadge type="reminder" sent={true} />
                </small>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Email Configuration Status (Admin)

Show admins whether email is configured:

```tsx
const EmailStatusIndicator: React.FC = () => {
  const [emailEnabled, setEmailEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if email is enabled (you might want to add an API endpoint for this)
    // For now, assume it's enabled if rental creation sends emails
    setEmailEnabled(true); // This would come from an API call
  }, []);

  return (
    <div className="email-status">
      {emailEnabled ? (
        <span className="status-enabled">
          ✅ Email notifications enabled
        </span>
      ) : (
        <span className="status-disabled">
          ⚠️ Email notifications not configured
        </span>
      )}
    </div>
  );
};

// Use in admin dashboard
const AdminDashboard: React.FC = () => {
  return (
    <div>
      <EmailStatusIndicator />
      {/* ... rest of dashboard */}
    </div>
  );
};
```

## Email Notification Preferences (Future Enhancement)

For future implementation, you might want to add user email preferences:

```tsx
interface EmailPreferences {
  rentalReminders: boolean;
  paymentConfirmations: boolean;
  statusUpdates: boolean;
}

const EmailPreferencesComponent: React.FC = () => {
  const [preferences, setPreferences] = useState<EmailPreferences>({
    rentalReminders: true,
    paymentConfirmations: true,
    statusUpdates: true
  });

  const handleUpdatePreferences = async (prefs: EmailPreferences) => {
    // API call to update user preferences
    // POST /api/users/email-preferences
    await axios.put('/api/users/email-preferences', prefs);
    setPreferences(prefs);
  };

  return (
    <div className="email-preferences">
      <h3>Email Notification Preferences</h3>
      <label>
        <input
          type="checkbox"
          checked={preferences.rentalReminders}
          onChange={(e) => handleUpdatePreferences({
            ...preferences,
            rentalReminders: e.target.checked
          })}
        />
        Payment Reminders
      </label>
      <label>
        <input
          type="checkbox"
          checked={preferences.paymentConfirmations}
          onChange={(e) => handleUpdatePreferences({
            ...preferences,
            paymentConfirmations: e.target.checked
          })}
        />
        Payment Confirmations
      </label>
      <label>
        <input
          type="checkbox"
          checked={preferences.statusUpdates}
          onChange={(e) => handleUpdatePreferences({
            ...preferences,
            statusUpdates: e.target.checked
          })}
        />
        Status Updates
      </label>
    </div>
  );
};
```

## Summary of Frontend Email Features

### What Frontend Should Display:

1. **Email Status Indicators:**
   - Show when reminder emails have been sent
   - Show when confirmation emails are sent
   - Visual badges/icons for email notifications

2. **Payment Reminders:**
   - Display pending payments with reminder status
   - Show count of pending reminders
   - Manual "Send Reminder" button for admins

3. **Email Configuration Status:**
   - Admin dashboard should show if email is enabled
   - User dashboard can show email notification preferences

4. **User Experience:**
   - Clear feedback when emails are sent
   - Show email sent confirmations
   - Display email preferences (future feature)

### Email Notification Flow:

```
Rental Created → Email Sent → Show ✅ in UI
Payment Due → Reminder Sent → Show 📧 in UI  
Payment Paid → Confirmation Sent → Show ✅📧 in UI
Status Changed → Update Email Sent → Show 📬 in UI
```

All email sending happens automatically on the backend. The frontend just needs to display appropriate indicators and provide manual trigger buttons for admins.

