# Rental Reminder Tracking System

## Overview
This document describes the rental payment reminder tracking system that prevents sending reminders too frequently and tracks when reminders were last sent.

## Features

### 1. 24-Hour Cooldown Period
- After sending a reminder, the system prevents sending another reminder for **24 hours**
- This prevents spam and ensures customers aren't overwhelmed with reminder emails

### 2. Last Reminder Tracking
- Each rental record now tracks when the last reminder was sent (`last_reminder_sent_at`)
- This timestamp is stored in the database and returned in all rental API responses

### 3. Frontend Integration
- The frontend can check `last_reminder_sent_at` to:
  - Display when the last reminder was sent
  - Disable the "Send Reminder" button if within 24-hour cooldown
  - Show countdown timer until next reminder can be sent

## Backend Changes

### Database Schema
**File:** `src/models/Rental.ts`

Added new field to `RentalSchema`:
```typescript
last_reminder_sent_at: {
  type: Date,
  required: false
}
```

**File:** `src/interfaces/Rental.ts`

Added to `IRental` interface:
```typescript
last_reminder_sent_at?: Date;
```

### API Endpoint: Send Payment Reminders

**Endpoint:** `POST /api/rentals/:id/send-reminders`

**Request:**
```json
{
  "paymentLink": "https://razorpay.com/payment/..." // Optional
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Payment reminder email sent successfully",
  "data": {
    "rental_id": "RENT-2024-1104-A1B2C3",
    "pending_count": 2,
    "overdue_count": 1,
    "total_pending": 5000,
    "total_overdue": 2500,
    "last_reminder_sent_at": "2024-11-15T10:30:00.000Z"
  }
}
```

**Cooldown Response (429):**
```json
{
  "success": false,
  "message": "Reminder was recently sent. Please wait 12 hour(s) before sending another reminder.",
  "data": {
    "rental_id": "RENT-2024-1104-A1B2C3",
    "last_reminder_sent_at": "2024-11-15T10:30:00.000Z",
    "hours_remaining": 12,
    "minutes_remaining": 720,
    "can_send_after": "2024-11-16T10:30:00.000Z"
  }
}
```

### Rental API Responses

All rental endpoints now include `last_reminder_sent_at`:

**GET /api/rentals** - Returns array of rentals with `last_reminder_sent_at`
**GET /api/rentals/:id** - Returns single rental with `last_reminder_sent_at`
**GET /api/rentals/my-rentals** - Returns user's rentals with `last_reminder_sent_at`

Example rental object:
```json
{
  "_id": "...",
  "rental_id": "RENT-2024-1104-A1B2C3",
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "last_reminder_sent_at": "2024-11-15T10:30:00.000Z",
  "payment_records": [...],
  ...
}
```

## Frontend Implementation Guide

### 1. Display Last Reminder Time

```typescript
// In your rental list/table component
const formatLastReminder = (lastReminderSentAt: string | null) => {
  if (!lastReminderSentAt) {
    return "Never sent";
  }
  
  const date = new Date(lastReminderSentAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffHours < 24) {
    return `Sent ${diffHours} hour(s) ago`;
  }
  
  return date.toLocaleString();
};
```

### 2. Disable Send Reminder Button

```typescript
const canSendReminder = (lastReminderSentAt: string | null): boolean => {
  if (!lastReminderSentAt) {
    return true; // Never sent, can send
  }
  
  const lastSent = new Date(lastReminderSentAt);
  const now = new Date();
  const hoursSinceLastReminder = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
  
  return hoursSinceLastReminder >= 24;
};

// In your component
<button 
  disabled={!canSendReminder(rental.last_reminder_sent_at)}
  onClick={handleSendReminder}
>
  {canSendReminder(rental.last_reminder_sent_at) 
    ? "Send Reminder" 
    : "Reminder Sent Recently"}
</button>
```

### 3. Show Countdown Timer

```typescript
const getTimeUntilNextReminder = (lastReminderSentAt: string | null): string | null => {
  if (!lastReminderSentAt) {
    return null;
  }
  
  const lastSent = new Date(lastReminderSentAt);
  const canSendAfter = new Date(lastSent.getTime() + 24 * 60 * 60 * 1000);
  const now = new Date();
  
  if (now >= canSendAfter) {
    return null; // Can send now
  }
  
  const diffMs = canSendAfter.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
};

// In your component
{rental.last_reminder_sent_at && (
  <div className="reminder-info">
    <p>Last sent: {formatLastReminder(rental.last_reminder_sent_at)}</p>
    {!canSendReminder(rental.last_reminder_sent_at) && (
      <p className="countdown">
        Next reminder available in: {getTimeUntilNextReminder(rental.last_reminder_sent_at)}
      </p>
    )}
  </div>
)}
```

### 4. Handle API Responses

```typescript
const handleSendReminder = async (rentalId: string) => {
  try {
    const response = await fetch(`/api/rentals/${rentalId}/send-reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        paymentLink: razorpayPaymentLink // Optional
      })
    });
    
    const data = await response.json();
    
    if (response.status === 429) {
      // Cooldown active
      alert(data.message);
      // Update rental with new last_reminder_sent_at
      updateRentalInState(rentalId, {
        last_reminder_sent_at: data.data.last_reminder_sent_at
      });
    } else if (response.ok) {
      // Reminder sent successfully
      alert('Reminder sent successfully!');
      // Update rental with new last_reminder_sent_at
      updateRentalInState(rentalId, {
        last_reminder_sent_at: data.data.last_reminder_sent_at
      });
    } else {
      alert(data.message || 'Error sending reminder');
    }
  } catch (error) {
    console.error('Error sending reminder:', error);
    alert('Failed to send reminder');
  }
};
```

## UI/UX Recommendations

### Reminder Button States

1. **Available** (Never sent or >24 hours ago)
   - Button: Enabled, "Send Reminder"
   - Color: Primary/Blue

2. **Cooldown Active** (<24 hours ago)
   - Button: Disabled, "Reminder Sent Recently"
   - Color: Gray/Disabled
   - Show: "Last sent: X hours ago"
   - Show: "Next available in: X hours Y minutes"

3. **Loading** (Sending)
   - Button: Disabled, "Sending..."
   - Show spinner

### Display Location

Show the last reminder information near the "Send Reminder" button:

```
┌─────────────────────────────────────┐
│ [Send Reminder]                      │
│ Last sent: 2 hours ago               │
│ Next available in: 22 hours 30 min   │
└─────────────────────────────────────┘
```

Or in a tooltip/popover when hovering over the button.

## Testing

### Test Cases

1. **First Reminder**
   - `last_reminder_sent_at` is `null`
   - Should allow sending
   - After sending, `last_reminder_sent_at` should be set

2. **Within 24 Hours**
   - `last_reminder_sent_at` is 12 hours ago
   - Should return 429 error
   - Should show "12 hours remaining"

3. **After 24 Hours**
   - `last_reminder_sent_at` is 25 hours ago
   - Should allow sending
   - Should update `last_reminder_sent_at`

4. **Multiple Rentals**
   - Each rental tracks its own `last_reminder_sent_at`
   - Sending reminder for Rental A doesn't affect Rental B

## Notes

- The 24-hour cooldown is enforced server-side for security
- The cooldown period is calculated from the exact timestamp when the reminder was sent
- All timestamps are in UTC format
- The field is optional, so existing rentals without this field will have `null` and can send reminders immediately

