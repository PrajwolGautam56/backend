# Razorpay Payment Integration Guide

## 🎯 Overview

Complete Razorpay payment gateway integration for furniture rental and purchase transactions, with automatic monthly payment reminders for rentals.

---

## ✅ Features Implemented

1. **Razorpay Payment Gateway Integration**
   - Create payment orders
   - Verify payments
   - Webhook support for automatic payment processing

2. **Automatic Monthly Payment System**
   - Daily check for rental payments due
   - Email reminders for pending monthly payments
   - API endpoint to get pending monthly payments
   - Create payment orders for monthly rent

3. **Automatic Invoice Generation**
   - Invoices generated when payment is received
   - Email notifications with invoice
   - Works with both manual and Razorpay payments

---

## 🔧 Setup Instructions

### 1. Get Razorpay Credentials

1. Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Get your **Key ID** and **Key Secret** from Settings → API Keys
3. Set up webhook URL in Razorpay Dashboard:
   - Go to Settings → Webhooks
   - Add webhook URL: `https://your-domain.com/api/payments/webhook`
   - Select events: `payment.captured`
   - Copy the **Webhook Secret**

### 2. Environment Variables

Add to your `.env` file:

```bash
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxx
FRONTEND_BASE_URL=http://localhost:3000
```

**Note:** Use test credentials for development, production credentials for live.

---

## 📋 API Endpoints

### 1. Create Payment Order

**Endpoint:** `POST /api/payments/create-order`

**Authentication:** Required (User token)

**Request Body:**
```json
{
  "transaction_id": "FTXN-2024-1111-ABC123"
}
```

**Response:**
```json
{
  "orderId": "order_xxxxxxxxxxxxx",
  "amount": 5000,
  "currency": "INR",
  "key": "rzp_test_xxxxxxxxxxxxx",
  "transaction_id": "FTXN-2024-1111-ABC123",
  "receipt": "receipt_1234567890"
}
```

**Usage:** Use this response to initialize Razorpay checkout on frontend.

---

### 2. Verify Payment

**Endpoint:** `POST /api/payments/verify`

**Authentication:** Required (User token)

**Request Body:**
```json
{
  "transaction_id": "FTXN-2024-1111-ABC123",
  "razorpay_order_id": "order_xxxxxxxxxxxxx",
  "razorpay_payment_id": "pay_xxxxxxxxxxxxx",
  "razorpay_signature": "xxxxxxxxxxxxxxxxxxxxx"
}
```

**Response:**
```json
{
  "message": "Payment verified and recorded successfully",
  "payment": {
    "payment_id": "PAY-1234567890-ABC123",
    "amount": 5000,
    "payment_method": "UPI",
    "status": "Completed"
  },
  "transaction": { ... },
  "invoiceGenerated": true,
  "invoiceNumber": "INV-2024-1111-1234"
}
```

**What happens:**
- Payment is verified using signature
- Payment record is created
- Invoice is auto-generated
- Email sent to customer with invoice

---

### 3. Get Pending Monthly Payments

**Endpoint:** `GET /api/payments/pending-monthly`

**Authentication:** Required (User token)

**Response:**
```json
{
  "pendingPayments": [
    {
      "transaction_id": "FTXN-2024-1111-ABC123",
      "furniture": {
        "name": "Modern Sofa Set",
        "photos": [...]
      },
      "monthly_rent": 2000,
      "months_paid": 2,
      "pending_months": 1,
      "amount_due": 2000,
      "next_payment_due": "2024-12-11T00:00:00.000Z",
      "rental_start_date": "2024-09-11T00:00:00.000Z",
      "payment_status": "Partial"
    }
  ],
  "totalPendingAmount": 2000
}
```

**Usage:** Call this endpoint to show users their pending monthly payments. Display payment button for each pending payment.

---

### 4. Create Monthly Payment Order

**Endpoint:** `POST /api/payments/monthly-payment-order`

**Authentication:** Required (User token)

**Request Body:**
```json
{
  "transaction_id": "FTXN-2024-1111-ABC123",
  "months": 1
}
```

**Response:**
```json
{
  "orderId": "order_xxxxxxxxxxxxx",
  "amount": 2000,
  "currency": "INR",
  "key": "rzp_test_xxxxxxxxxxxxx",
  "transaction_id": "FTXN-2024-1111-ABC123",
  "months": 1,
  "receipt": "receipt_1234567890"
}
```

**Usage:** Use this to create payment order for monthly rent. User can pay for 1 or multiple months.

---

### 5. Webhook Endpoint

**Endpoint:** `POST /api/payments/webhook`

**Authentication:** Not required (uses signature verification)

**Headers:**
```
X-Razorpay-Signature: xxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
```

**What it does:**
- Automatically processes payments when Razorpay sends webhook
- Creates payment records
- Generates invoices
- Sends email notifications

**Note:** Configure this URL in Razorpay Dashboard webhook settings.

---

## 🎨 Frontend Integration

### 1. Install Razorpay Checkout

```bash
npm install razorpay
```

### 2. Initialize Razorpay

```typescript
import { loadScript } from '@razorpay/checkout';

// Load Razorpay script
await loadScript({
  src: 'https://checkout.razorpay.com/v1/checkout.js'
});
```

### 3. Create Payment Order (Backend Call)

```typescript
const createPaymentOrder = async (transactionId: string) => {
  const response = await axios.post('/api/payments/create-order', {
    transaction_id: transactionId
  }, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};
```

### 4. Open Razorpay Checkout

```typescript
const handlePayment = async (transactionId: string) => {
  try {
    // Get order details from backend
    const orderData = await createPaymentOrder(transactionId);
    
    const options = {
      key: orderData.key,
      amount: orderData.amount * 100, // Convert to paise
      currency: orderData.currency,
      name: 'BrokerIn',
      description: 'Furniture Payment',
      order_id: orderData.orderId,
      handler: async function (response: any) {
        // Verify payment on backend
        await verifyPayment({
          transaction_id: transactionId,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        });
        
        // Show success message
        alert('Payment successful! Invoice sent to your email.');
      },
      prefill: {
        name: user.fullName,
        email: user.email,
        contact: user.phoneNumber
      },
      theme: {
        color: '#2563eb'
      }
    };
    
    const razorpay = new (window as any).Razorpay(options);
    razorpay.open();
  } catch (error) {
    console.error('Payment error:', error);
  }
};
```

### 5. Verify Payment (Backend Call)

```typescript
const verifyPayment = async (paymentData: any) => {
  const response = await axios.post('/api/payments/verify', paymentData, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};
```

### 6. Show Pending Monthly Payments

```typescript
const getPendingPayments = async () => {
  const response = await axios.get('/api/payments/pending-monthly', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};

// Display pending payments
const PendingPaymentsComponent = () => {
  const [payments, setPayments] = useState([]);
  
  useEffect(() => {
    getPendingPayments().then(data => {
      setPayments(data.pendingPayments);
    });
  }, []);
  
  return (
    <div>
      <h2>Pending Monthly Payments</h2>
      {payments.map(payment => (
        <div key={payment.transaction_id}>
          <h3>{payment.furniture.name}</h3>
          <p>Amount Due: ₹{payment.amount_due}</p>
          <p>Pending Months: {payment.pending_months}</p>
          <button onClick={() => handleMonthlyPayment(payment.transaction_id, 1)}>
            Pay Now
          </button>
        </div>
      ))}
    </div>
  );
};
```

---

## 🔄 Monthly Payment Flow

### Automatic Process:

1. **Daily Check (10:00 AM):**
   - System checks all active rentals
   - Identifies rentals with payments due (30+ days since last payment)
   - Sends email reminders to customers

2. **User Action:**
   - User sees pending payments in dashboard
   - Clicks "Pay Now" button
   - Creates payment order via API
   - Completes payment via Razorpay

3. **Payment Processing:**
   - Payment verified on backend
   - Payment record created
   - Invoice generated and emailed
   - Transaction status updated

### Manual Check:

Users can call `GET /api/payments/pending-monthly` anytime to see:
- Which rentals have pending payments
- How many months are due
- Total amount due
- Next payment due date

---

## 📧 Email Notifications

### Payment Reminder Email
- Sent automatically when monthly payment is due
- Includes:
  - Rental details
  - Amount due
  - Payment due date
  - Link to payment page

### Invoice Email
- Sent automatically when payment is received
- Includes:
  - Professional HTML invoice
  - Payment details
  - Transaction ID
  - Invoice number

---

## 🔐 Security Features

1. **Signature Verification:**
   - All payments verified using Razorpay signature
   - Webhook requests verified using webhook secret
   - Prevents payment fraud

2. **User Authentication:**
   - All payment endpoints require user authentication
   - Users can only access their own transactions

3. **Webhook Security:**
   - Webhook signature verification
   - Only processes verified payments

---

## 🧪 Testing

### Test Mode:
1. Use Razorpay test credentials
2. Use test cards from Razorpay documentation
3. Test webhook using Razorpay webhook testing tool

### Test Cards:
- Success: `4111 1111 1111 1111`
- Failure: `4000 0000 0000 0002`
- CVV: Any 3 digits
- Expiry: Any future date

---

## 📊 Payment Status Tracking

### Payment Statuses:
- `Pending` - No payment received
- `Partial` - Partial payment received
- `Paid` - Fully paid
- `Refunded` - Payment refunded
- `Failed` - Payment failed

### Transaction Statuses:
- `Active` - Transaction is active
- `Completed` - Transaction completed
- `Cancelled` - Transaction cancelled

---

## 📝 Notes

1. **Amount Conversion:**
   - Razorpay uses paise (smallest currency unit)
   - Backend converts: rupees → paise for orders, paise → rupees for responses

2. **Monthly Payment Calculation:**
   - System calculates months since rental start
   - Subtracts deposit from total paid
   - Calculates months paid vs months due

3. **Invoice Generation:**
   - Automatic on first payment
   - Includes all payment details
   - Sent via email

4. **Webhook Processing:**
   - Processes payments even if user closes browser
   - Ensures payment is recorded
   - Sends invoice automatically

---

## 🚀 Production Checklist

- [ ] Switch to Razorpay production credentials
- [ ] Configure production webhook URL
- [ ] Test webhook in production
- [ ] Verify email notifications work
- [ ] Test monthly payment reminders
- [ ] Monitor payment logs
- [ ] Set up error alerts

---

## 📞 Support

For Razorpay issues:
- Razorpay Support: support@razorpay.com
- Documentation: https://razorpay.com/docs/

For application issues:
- Email: brokerin.in@gmail.com
- Check logs for payment errors

---

**Last Updated:** November 2024
**Version:** 1.0.0

