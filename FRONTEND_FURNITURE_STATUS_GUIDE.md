# Frontend Guide - Furniture Request Status System

## Quick Overview

### Status Flows

**Sell:** `Ordered` → `Confirmed` → `Out for Delivery` → `Delivered`

**Rent:** `Requested` → `Confirmed` → `Scheduled Delivery` → `Out for Delivery` → `Delivered`

## What to Do in Frontend

### 1. Display Status with Payment Info

```typescript
// Show status badge
const getStatusColor = (status: string, paymentStatus: string) => {
  if (paymentStatus === 'Pending' && (status === 'Ordered' || status === 'Requested')) {
    return 'warning'; // Show "Pay Now" button
  }
  if (status === 'Confirmed') return 'success';
  if (status === 'Out for Delivery') return 'info';
  if (status === 'Delivered') return 'success';
  return 'secondary';
};

// Component
<StatusBadge status={request.status} paymentStatus={request.payment_status}>
  {request.status}
  {request.payment_status === 'Pending' && (
    <Button onClick={handlePayNow}>Pay Now</Button>
  )}
</StatusBadge>
```

### 2. Show "Pay Now" Button

```typescript
// Only show if payment is pending and status is Ordered/Requested
{request.payment_status === 'Pending' && 
 (request.status === 'Ordered' || request.status === 'Requested') && (
  <Button variant="primary" onClick={() => handlePayment(request._id)}>
    Pay Now
  </Button>
)}
```

### 3. Update Status (Admin Panel)

```typescript
// Admin updates status
const updateStatus = async (id: string, status: string, paymentStatus?: string) => {
  await axios.put(`/api/furniture-forms/${id}/status`, {
    status,
    payment_status: paymentStatus,
    scheduled_delivery_date: status === 'Scheduled Delivery' ? deliveryDate : undefined
  });
};

// For Rent - Schedule Delivery
if (status === 'Scheduled Delivery') {
  await updateStatus(id, 'Scheduled Delivery', undefined, selectedDate);
}
```

### 4. Handle Payment Success

```typescript
// After payment success, update status
const handlePaymentSuccess = async (requestId: string) => {
  await axios.put(`/api/furniture-forms/${requestId}/status`, {
    payment_status: 'Paid'
    // Status will auto-update to 'Confirmed'
  });
};
```

### 5. Display Scheduled Delivery Date (Rent only)

```typescript
{request.status === 'Scheduled Delivery' && request.scheduled_delivery_date && (
  <div>
    <strong>Delivery Scheduled:</strong> 
    {new Date(request.scheduled_delivery_date).toLocaleDateString()}
  </div>
)}
```

## API Endpoints

- `GET /api/furniture-forms` - Get all requests (with `payment_status` field)
- `PUT /api/furniture-forms/:id/status` - Update status
  - Body: `{ status, payment_status?, scheduled_delivery_date? }`

## Status Values

- `Ordered` (Sell)
- `Requested` (Rent)
- `Confirmed` (after payment)
- `Scheduled Delivery` (Rent only, requires date)
- `Out for Delivery`
- `Delivered`
- `Cancelled`

## Payment Status Values

- `Pending` - Show "Pay Now" button
- `Paid` - Status auto-updates to "Confirmed"
- `Partial`
- `Refunded`

## Key Points

1. **Payment Integration**: When `payment_status` = `'Paid'`, status auto-changes to `'Confirmed'`
2. **Rent Delivery**: When status = `'Delivered'` for Rent, rental record is auto-created
3. **User Dashboard**: Show status + payment button if pending
4. **Admin Panel**: Use dropdowns for status updates, date picker for scheduled delivery

