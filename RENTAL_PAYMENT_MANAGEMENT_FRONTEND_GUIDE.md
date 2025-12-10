# Rental Payment Management - Frontend Implementation Guide

This guide explains how to implement the **Delete Payment Record** and **Send Reminder for Specific Month** features in your frontend.

---

## 📋 Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Delete Payment Record](#delete-payment-record)
3. [Send Reminder for Specific Month](#send-reminder-for-specific-month)
4. [React Implementation Examples](#react-implementation-examples)
5. [Error Handling](#error-handling)
6. [UI/UX Recommendations](#uiux-recommendations)

---

## 🔌 API Endpoints

### Base URL
```
/api/rentals
```

### Authentication
All endpoints require:
- **Admin authentication token** in the `Authorization` header
- Format: `Bearer <token>`

---

## 🗑️ Delete Payment Record

### Endpoint
```
DELETE /api/rentals/:rentalId/payments/:paymentId
```

### Parameters
- `rentalId` (URL parameter): MongoDB ObjectId of the rental
- `paymentId` (URL parameter): MongoDB ObjectId of the payment record

### Request Example
```javascript
// Using fetch
const deletePaymentRecord = async (rentalId, paymentId) => {
  try {
    const response = await fetch(
      `/api/rentals/${rentalId}/payments/${paymentId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (response.ok) {
      console.log('Payment record deleted:', data);
      return data;
    } else {
      throw new Error(data.message || 'Failed to delete payment record');
    }
  } catch (error) {
    console.error('Error deleting payment record:', error);
    throw error;
  }
};
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Payment record deleted successfully",
  "data": {
    // Updated rental object with payment_records array
  }
}
```

### Error Responses
- **400**: Invalid rental ID format
- **404**: Rental or payment record not found
- **500**: Server error

---

## 📧 Send Reminder for Specific Month

### Endpoint
```
POST /api/rentals/:rentalId/payments/:paymentId/send-reminder
```

### Parameters
- `rentalId` (URL parameter): MongoDB ObjectId of the rental
- `paymentId` (URL parameter): MongoDB ObjectId of the payment record

### Request Example
```javascript
// Using fetch
const sendReminderForMonth = async (rentalId, paymentId) => {
  try {
    const response = await fetch(
      `/api/rentals/${rentalId}/payments/${paymentId}/send-reminder`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (response.ok) {
      console.log('Reminder sent:', data);
      return data;
    } else {
      throw new Error(data.message || 'Failed to send reminder');
    }
  } catch (error) {
    console.error('Error sending reminder:', error);
    throw error;
  }
};
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Reminder sent successfully",
  "data": {
    "rental_id": "RENT-2025-1205-ABC123",
    "payment_id": "507f1f77bcf86cd799439011",
    "month": "2025-12",
    "amount": 2000,
    "dueDate": "2025-12-05T00:00:00.000Z",
    "status": "Overdue",
    "daysUntilDue": -5,
    "reminderType": "overdue"
  }
}
```

### Error Responses
- **400**: 
  - Invalid rental ID format
  - Payment is already paid (cannot send reminder for paid payments)
- **404**: Rental or payment record not found
- **500**: Server error

---

## ⚛️ React Implementation Examples

### Complete Component Example

```jsx
import React, { useState } from 'react';
import axios from 'axios';

const PaymentRecordsTable = ({ rental, onUpdate }) => {
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);

  // Delete payment record
  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment record? This action cannot be undone.')) {
      return;
    }

    setLoading({ ...loading, [paymentId]: true });
    setError(null);

    try {
      const response = await axios.delete(
        `/api/rentals/${rental._id}/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        alert('Payment record deleted successfully');
        onUpdate(response.data.data); // Update parent component with new rental data
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to delete payment record';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading({ ...loading, [paymentId]: false });
    }
  };

  // Send reminder for specific month
  const handleSendReminder = async (paymentId) => {
    if (!window.confirm('Send payment reminder email to customer?')) {
      return;
    }

    setLoading({ ...loading, [`reminder-${paymentId}`]: true });
    setError(null);

    try {
      const response = await axios.post(
        `/api/rentals/${rental._id}/payments/${paymentId}/send-reminder`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        const reminderType = response.data.data.reminderType;
        const message = reminderType === 'overdue' 
          ? `Overdue reminder sent! Payment is ${Math.abs(response.data.data.daysUntilDue)} days overdue.`
          : `Reminder sent! Payment is due in ${response.data.data.daysUntilDue} days.`;
        
        alert(message);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to send reminder';
      setError(errorMessage);
      
      // Handle specific error cases
      if (err.response?.status === 400 && err.response?.data?.message?.includes('paid')) {
        alert('Cannot send reminder for a payment that is already marked as paid.');
      } else {
        alert(`Error: ${errorMessage}`);
      }
    } finally {
      setLoading({ ...loading, [`reminder-${paymentId}`]: false });
    }
  };

  // Format month display
  const formatMonth = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="payment-records-container">
      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      <table className="payment-records-table">
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
          {rental.payment_records?.map((payment) => (
            <tr key={payment._id}>
              <td>{formatMonth(payment.month)}</td>
              <td>{formatCurrency(payment.amount)}</td>
              <td>{new Date(payment.dueDate).toLocaleDateString()}</td>
              <td>
                <span className={`status-badge status-${payment.status.toLowerCase()}`}>
                  {payment.status}
                </span>
              </td>
              <td>
                <div className="action-buttons">
                  {/* Send Reminder Button */}
                  {payment.status !== 'Paid' && (
                    <button
                      onClick={() => handleSendReminder(payment._id)}
                      disabled={loading[`reminder-${payment._id}`]}
                      className="btn-reminder"
                      title="Send reminder email"
                    >
                      {loading[`reminder-${payment._id}`] ? 'Sending...' : '📧 Remind'}
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeletePayment(payment._id)}
                    disabled={loading[payment._id]}
                    className="btn-delete"
                    title="Delete payment record"
                  >
                    {loading[payment._id] ? 'Deleting...' : '🗑️ Delete'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PaymentRecordsTable;
```

### Using with Axios Service

```javascript
// services/rentalService.js
import axios from 'axios';

const API_BASE_URL = '/api/rentals';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

export const rentalService = {
  // Delete payment record
  deletePaymentRecord: async (rentalId, paymentId) => {
    const response = await axios.delete(
      `${API_BASE_URL}/${rentalId}/payments/${paymentId}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Send reminder for specific month
  sendReminderForMonth: async (rentalId, paymentId) => {
    const response = await axios.post(
      `${API_BASE_URL}/${rentalId}/payments/${paymentId}/send-reminder`,
      {},
      { headers: getAuthHeaders() }
    );
    return response.data;
  }
};
```

---

## 🎨 UI/UX Recommendations

### 1. Delete Button
- **Icon**: 🗑️ or trash icon
- **Color**: Red (#dc2626) for destructive action
- **Confirmation**: Always show confirmation dialog before deletion
- **Loading State**: Disable button and show "Deleting..." text
- **Success Feedback**: Show toast notification or alert

### 2. Send Reminder Button
- **Icon**: 📧 or envelope icon
- **Color**: Blue (#2563eb) or primary color
- **Disabled State**: 
  - Disable for "Paid" status payments
  - Show tooltip: "Cannot send reminder for paid payments"
- **Loading State**: Show "Sending..." text
- **Success Feedback**: Show success message with reminder type (overdue/pending)

### 3. Action Buttons Layout
```jsx
<div style={{ display: 'flex', gap: '8px' }}>
  <button className="btn-reminder">📧 Remind</button>
  <button className="btn-delete">🗑️ Delete</button>
</div>
```

### 4. Status Badge Colors
```css
.status-pending { background-color: #fbbf24; color: #78350f; }
.status-overdue { background-color: #dc2626; color: white; }
.status-paid { background-color: #10b981; color: white; }
```

### 5. Error Handling UI
```jsx
{error && (
  <div className="alert alert-error">
    <span>⚠️</span>
    <span>{error}</span>
  </div>
)}
```

---

## 🔍 Error Handling

### Common Errors

1. **Payment Already Paid**
   ```javascript
   if (err.response?.status === 400 && 
       err.response?.data?.message?.includes('paid')) {
     // Show user-friendly message
     alert('This payment is already marked as paid. Cannot send reminder.');
   }
   ```

2. **Payment Record Not Found**
   ```javascript
   if (err.response?.status === 404) {
     alert('Payment record not found. It may have been deleted.');
     // Refresh the rental data
   }
   ```

3. **Network Errors**
   ```javascript
   catch (err) {
     if (!err.response) {
       // Network error
       alert('Network error. Please check your internet connection.');
     } else {
       // Server error
       alert(err.response.data.message || 'An error occurred');
     }
   }
   ```

---

## 📝 Complete Integration Checklist

- [ ] Add delete button to payment records table
- [ ] Add send reminder button to payment records table
- [ ] Implement confirmation dialogs
- [ ] Add loading states for both actions
- [ ] Handle success responses
- [ ] Handle error responses
- [ ] Disable reminder button for paid payments
- [ ] Update rental data after successful deletion
- [ ] Show appropriate success/error messages
- [ ] Test with different payment statuses
- [ ] Test error scenarios (network errors, invalid IDs, etc.)

---

## 🧪 Testing Examples

### Test Delete Payment Record
```javascript
// Test successful deletion
const rentalId = '507f1f77bcf86cd799439011';
const paymentId = '507f1f77bcf86cd799439012';

await rentalService.deletePaymentRecord(rentalId, paymentId);
// Expected: Success response with updated rental data
```

### Test Send Reminder
```javascript
// Test sending reminder for overdue payment
const rentalId = '507f1f77bcf86cd799439011';
const paymentId = '507f1f77bcf86cd799439012';

const result = await rentalService.sendReminderForMonth(rentalId, paymentId);
// Expected: { success: true, data: { reminderType: 'overdue', ... } }
```

### Test Error Cases
```javascript
// Test sending reminder for paid payment (should fail)
try {
  await rentalService.sendReminderForMonth(rentalId, paidPaymentId);
} catch (err) {
  // Expected: 400 error with message about paid payment
}
```

---

## 📚 Additional Notes

1. **Payment Record ID**: Each payment record has a `_id` field (MongoDB ObjectId) that should be used as `paymentId`
2. **Rental ID**: Use the rental's `_id` field (MongoDB ObjectId) as `rentalId`
3. **Email Sending**: Reminders are sent asynchronously (non-blocking), so the API responds immediately
4. **Activity Logging**: Both actions are logged in the admin user's activity log
5. **Status Check**: The reminder endpoint automatically checks if payment is overdue or pending and sends the appropriate email type

---

## 🚀 Quick Start

1. **Add the service functions** to your API service file
2. **Import the service** in your component
3. **Add buttons** to your payment records table
4. **Handle responses** and update UI accordingly
5. **Test thoroughly** with different scenarios

---

For any issues or questions, check the backend logs for detailed error messages.

