# Rental Management Enhancements Guide

## 🎯 Overview

Complete guide for the enhanced rental management system with professional payment tracking, email notifications, and Razorpay integration support.

---

## ✅ What's Fixed & Enhanced

### 1. **Payment Records Generation**
- ✅ **Fixed:** Now generates payment records for **all months** (not just 3)
- ✅ Generates at least 12 months ahead
- ✅ Automatically marks overdue payments
- ✅ Prevents duplicate records for same month

### 2. **Dashboard Display**
- ✅ Shows **monthly rent** amount
- ✅ Shows **payment status** (Pending/Overdue/Paid)
- ✅ Shows **pending months** count
- ✅ Shows **overdue months** count
- ✅ Complete payment summary per rental

### 3. **Payment History**
- ✅ Shows **all months** (not just 3)
- ✅ Complete payment history for every month
- ✅ Filter by status (Pending/Overdue/Paid)
- ✅ Month-by-month breakdown

### 4. **Professional Email Templates**
- ✅ **Comprehensive email** with all pending/overdue months
- ✅ **BrokerIn logo** in header (placeholder - replace with actual logo)
- ✅ **Month-by-month breakdown** with amounts
- ✅ **Color-coded status** (Pending = Yellow, Overdue = Red)
- ✅ **Total due amount** prominently displayed
- ✅ **Scalable for Razorpay links** (payment button when link provided)

---

## 📋 API Endpoints

### 1. Get User's Rentals (Enhanced)

**Endpoint:** `GET /api/rentals/my-rentals`

**Response includes payment_summary:**
```json
{
  "success": true,
  "data": [
    {
      "rental_id": "RENT-2024-1111-ABC123",
      "customer_name": "John Doe",
      "items": [...],
      "total_monthly_amount": 2000,
      "payment_summary": {
        "monthly_rent": 2000,
        "total_pending": 4000,
        "total_overdue": 2000,
        "total_paid": 6000,
        "pending_count": 2,
        "overdue_count": 1,
        "paid_count": 3,
        "pending_months": ["2024-11", "2024-12"],
        "overdue_months": ["2024-10"]
      },
      "payment_records": [...]
    }
  ]
}
```

---

### 2. Get Pending/Overdue Payments Only

**Endpoint:** `GET /api/rentals/pending-overdue`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "rental_id": "RENT-2024-1111-ABC123",
      "rental_items": "Modern Sofa Set, Coffee Table",
      "monthly_rent": 2000,
      "pending_payments": [
        {
          "month": "2024-11",
          "amount": 2000,
          "dueDate": "2024-11-08T00:00:00.000Z",
          "status": "Pending"
        },
        {
          "month": "2024-12",
          "amount": 2000,
          "dueDate": "2024-12-08T00:00:00.000Z",
          "status": "Pending"
        }
      ],
      "overdue_payments": [
        {
          "month": "2024-10",
          "amount": 2000,
          "dueDate": "2024-10-08T00:00:00.000Z",
          "status": "Overdue",
          "daysOverdue": 35
        }
      ],
      "total_pending": 4000,
      "total_overdue": 2000,
      "total_due": 6000
    }
  ],
  "summary": {
    "total_rentals_with_due": 1,
    "total_pending_amount": 4000,
    "total_overdue_amount": 2000,
    "total_due_amount": 6000
  }
}
```

**Usage:** Call this endpoint to show only rentals with pending/overdue payments in dashboard.

---

### 3. Send Payment Reminder Email (Enhanced)

**Endpoint:** `POST /api/rentals/:id/send-reminders`

**Request Body (Optional):**
```json
{
  "paymentLink": "https://razorpay.com/payment/order_xxxxx"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment reminder email sent successfully",
  "data": {
    "rental_id": "RENT-2024-1111-ABC123",
    "pending_count": 2,
    "overdue_count": 1,
    "total_pending": 4000,
    "total_overdue": 2000
  }
}
```

**What the email includes:**
- ✅ BrokerIn logo in header
- ✅ All pending months with amounts
- ✅ All overdue months with amounts and days overdue
- ✅ Total due amount
- ✅ Payment button (if Razorpay link provided)
- ✅ Professional formatting

---

## 📧 Email Template Features

### Professional Email Includes:

1. **Header Section:**
   - BrokerIn logo (placeholder - replace with actual logo URL)
   - Gradient blue background
   - "Payment Reminder" title

2. **Rental Information:**
   - Rental ID
   - Monthly rent amount
   - Rented items list

3. **Overdue Payments Table:**
   - Red color scheme
   - Month name (e.g., "November 2024")
   - Amount in ₹
   - Due date
   - Days overdue
   - Total overdue amount

4. **Pending Payments Table:**
   - Blue color scheme
   - Month name
   - Amount
   - Due date
   - Total pending amount

5. **Total Due Summary:**
   - Large, prominent display
   - Gradient background
   - Total amount due

6. **Payment Button (Optional):**
   - Shows when Razorpay link provided
   - "Pay Now via Razorpay" button
   - Links to payment gateway

7. **Footer:**
   - Contact information
   - Professional closing

---

## 🎨 Frontend Integration

### 1. Display Rental Dashboard

```typescript
const RentalDashboard = () => {
  const [rentals, setRentals] = useState([]);
  const [pendingOverdue, setPendingOverdue] = useState([]);

  useEffect(() => {
    // Get all rentals with payment summary
    fetch('/api/rentals/my-rentals', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setRentals(data.data));

    // Get only pending/overdue
    fetch('/api/rentals/pending-overdue', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setPendingOverdue(data.data));
  }, []);

  return (
    <div>
      <h2>My Rentals</h2>
      
      {/* Show only rentals with due payments */}
      <div>
        <h3>Payments Due</h3>
        {pendingOverdue.map(rental => (
          <div key={rental.rental_id}>
            <h4>{rental.rental_items}</h4>
            <p>Monthly Rent: ₹{rental.monthly_rent}</p>
            
            {rental.overdue_payments.length > 0 && (
              <div style={{ color: 'red' }}>
                <strong>Overdue ({rental.overdue_payments.length}):</strong>
                {rental.overdue_payments.map(p => (
                  <div key={p.month}>
                    {p.month}: ₹{p.amount} ({p.daysOverdue} days overdue)
                  </div>
                ))}
              </div>
            )}
            
            {rental.pending_payments.length > 0 && (
              <div style={{ color: 'orange' }}>
                <strong>Pending ({rental.pending_payments.length}):</strong>
                {rental.pending_payments.map(p => (
                  <div key={p.month}>
                    {p.month}: ₹{p.amount} (Due: {new Date(p.dueDate).toLocaleDateString()})
                  </div>
                ))}
              </div>
            )}
            
            <p><strong>Total Due: ₹{rental.total_due}</strong></p>
            <button onClick={() => handlePayment(rental.rental_id)}>
              Pay Now
            </button>
          </div>
        ))}
      </div>

      {/* All rentals with payment summary */}
      {rentals.map(rental => (
        <div key={rental.rental_id}>
          <h4>{rental.rental_id}</h4>
          <p>Monthly Rent: ₹{rental.payment_summary.monthly_rent}</p>
          <p>Pending: ₹{rental.payment_summary.total_pending} ({rental.payment_summary.pending_count} months)</p>
          <p>Overdue: ₹{rental.payment_summary.total_overdue} ({rental.payment_summary.overdue_count} months)</p>
          <p>Paid: ₹{rental.payment_summary.total_paid} ({rental.payment_summary.paid_count} months)</p>
        </div>
      ))}
    </div>
  );
};
```

### 2. Admin Send Reminder with Razorpay Link

```typescript
const AdminSendReminder = ({ rentalId }: { rentalId: string }) => {
  const [paymentLink, setPaymentLink] = useState('');

  const handleSendReminder = async () => {
    // First, create Razorpay order if payment link needed
    let link = paymentLink;
    
    if (!link) {
      // Create payment order and get link
      const orderResponse = await fetch('/api/payments/monthly-payment-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          transaction_id: rentalId, // Use rental_id
          months: 1
        })
      });
      const orderData = await orderResponse.json();
      // Generate Razorpay checkout link
      link = `https://checkout.razorpay.com/v1/checkout.js?key=${orderData.key}&order_id=${orderData.orderId}`;
    }

    // Send reminder with payment link
    await fetch(`/api/rentals/${rentalId}/send-reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ paymentLink: link })
    });

    alert('Payment reminder sent with payment link!');
  };

  return (
    <div>
      <button onClick={handleSendReminder}>
        Send Payment Reminder
      </button>
    </div>
  );
};
```

---

## 🔄 Payment Status Updates

### Automatic Status Updates:

1. **On Rental Creation:**
   - Payment records generated for all months
   - Status set to Pending or Overdue based on due date

2. **Daily Cron Job (10:00 AM):**
   - Checks all active rentals
   - Updates Pending → Overdue if due date passed
   - Sends email reminders

3. **Manual Status Update:**
   - Admin can update payment status
   - When marked as Paid, invoice generated

---

## 📊 Payment Record Structure

Each payment record includes:
```json
{
  "_id": "...",
  "month": "2024-11",           // Format: YYYY-MM
  "amount": 2000,               // Monthly rent amount
  "dueDate": "2024-11-08",      // Due date (7 days after month start)
  "paidDate": null,             // Set when payment received
  "status": "Pending",          // Pending | Overdue | Paid | Partial
  "paymentMethod": null,        // Set when payment received
  "notes": null                 // Optional notes
}
```

---

## 🎯 Key Improvements

### Before:
- ❌ Only 3 months of payment records
- ❌ No status distinction (all Pending)
- ❌ Basic email template
- ❌ No month breakdown

### After:
- ✅ All months generated (12+ months ahead)
- ✅ Automatic overdue detection
- ✅ Professional email with month breakdown
- ✅ Pending vs Overdue clearly shown
- ✅ Scalable for Razorpay integration
- ✅ Complete payment history

---

## 🔧 Configuration

### Update Logo in Email:

In `src/utils/email.ts`, line 500:
```typescript
// Replace placeholder with actual logo URL
const logoUrl = 'https://your-domain.com/logo.png';
// Or use base64 encoded image
const logoUrl = 'data:image/png;base64,iVBORw0KGgoAAAANS...';
```

### Logo Requirements:
- Recommended size: 200x60px
- Format: PNG or SVG
- Transparent background preferred
- Upload to your CDN or use base64

---

## 📝 Usage Examples

### 1. Admin Creates Rental:
```
POST /api/rentals
{
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "9999999999",
  "items": [
    {
      "product_name": "Modern Sofa Set",
      "monthly_price": 2000,
      "deposit": 5000
    }
  ],
  "start_date": "2024-09-01"
}
```
**Result:** Payment records generated for 12+ months

### 2. User Views Dashboard:
```
GET /api/rentals/my-rentals
```
**Shows:** All rentals with payment summary

### 3. User Views Only Due Payments:
```
GET /api/rentals/pending-overdue
```
**Shows:** Only rentals with pending/overdue payments

### 4. Admin Sends Reminder:
```
POST /api/rentals/:id/send-reminders
{
  "paymentLink": "https://razorpay.com/..."
}
```
**Sends:** Professional email with all pending/overdue months

---

## 🚀 Razorpay Integration (Future)

The email template is ready for Razorpay links:

1. **Create Payment Order:**
   ```
   POST /api/payments/monthly-payment-order
   {
     "transaction_id": "RENT-2024-1111-ABC123",
     "months": 1
   }
   ```

2. **Get Payment Link:**
   - Use Razorpay checkout URL
   - Or generate payment link from order

3. **Include in Email:**
   ```
   POST /api/rentals/:id/send-reminders
   {
     "paymentLink": "https://checkout.razorpay.com/..."
   }
   ```

4. **Email Shows:**
   - "Pay Now via Razorpay" button
   - Links directly to payment gateway

---

## 📧 Email Preview

The email includes:
- ✅ Professional header with logo
- ✅ Rental information box
- ✅ Overdue payments table (red)
- ✅ Pending payments table (blue)
- ✅ Total due summary (prominent)
- ✅ Payment button (if link provided)
- ✅ Contact information footer

---

## 🔍 Troubleshooting

### Issue: Payment records not showing all months
**Solution:** 
- Check rental start_date
- Regenerate payment records: `POST /api/rentals/:id/payments/generate` with `{ months: 12 }`

### Issue: Status not updating to Overdue
**Solution:**
- Daily cron job updates status automatically
- Or manually update: `PUT /api/rentals/:id/payments/:paymentId` with `{ status: "Overdue" }`

### Issue: Email not sending
**Solution:**
- Check NODEMAILER_EMAIL and NODEMAILER_PASSWORD in .env
- Verify email service is enabled
- Check server logs for email errors

---

## 📞 Support

For issues:
- Email: brokerin.in@gmail.com
- Check API docs at `/api-docs`
- Review server logs

---

**Last Updated:** November 2024
**Version:** 2.0.0

