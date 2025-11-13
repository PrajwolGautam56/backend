# Email Notifications Summary

This document lists all email notifications that are automatically sent by the system when Nodemailer is configured.

## ✅ Email Notifications Currently Active

### 1. **User Registration (OTP Verification)**
- **When**: User signs up
- **Email**: OTP sent to user's email
- **Subject**: "Your OTP for Signup"
- **Content**: 6-digit OTP code
- **Status**: ✅ Active

### 2. **Service Bookings**
- **Booking Confirmation** - When service is booked
  - Subject: "Service Booking Confirmation"
  - Sent to: Customer
  - ✅ Active

- **Booking Update** - When service date/time is changed
  - Subject: "Service Booking Update"
  - Sent to: Customer
  - Shows old and new date/time
  - ✅ Active

- **Status Update** - When booking status changes
  - Subject: "Service Booking Status Update"
  - Sent to: Customer
  - Statuses: accepted, ongoing, completed, cancelled
  - ✅ Active

- **Admin Notification** - When new booking is created
  - Subject: "New Service Booking Request"
  - Sent to: Admin email
  - ✅ Active

### 3. **Furniture Requests**
- **Request Confirmation** - When furniture request is submitted
  - Subject: "Furniture Request Confirmation"
  - Sent to: Customer
  - ✅ Active

- **Status Update** - When furniture request status changes
  - Subject: "Furniture Request Status Update"
  - Sent to: Customer
  - Statuses: Requested, Accepted, Ongoing, Completed, Cancelled
  - ✅ Active

### 4. **Property Requests**
- **Request Confirmation** - When property request is submitted
  - Subject: "Property Request Confirmation"
  - Sent to: Customer
  - ✅ Active

- **Status Update** - When property request status changes
  - Subject: "Property Request Status Update"
  - Sent to: Customer
  - Statuses: Requested, Accepted, Ongoing, Completed, Cancelled
  - ✅ Active

### 5. **Rental Management**
- **Rental Confirmation** - When rental is created
  - Subject: "Rental Confirmation - {rental_id}"
  - Sent to: Customer
  - Includes: Items, monthly amount, deposit, payment schedule
  - ✅ Active

- **Payment Reminders** - Automatic reminders for payments
  - 3 days before due date
  - 1 day before due date
  - On due date
  - Subject: "Payment Reminder - ₹{amount} {reminder_type} - {rental_id}"
  - Sent to: Customer
  - ✅ Active (Cron job: Daily at 9:00 AM)

- **Overdue Payment Reminders** - For late payments
  - Daily for first 3 days, then weekly
  - Subject: "URGENT: Overdue Payment - ₹{amount} - {rental_id}"
  - Sent to: Customer
  - ✅ Active (Cron job: Daily at 9:00 AM)

- **Payment Confirmation** - When payment is marked as paid
  - Subject: "Payment Confirmation - ₹{amount} - {rental_id}"
  - Sent to: Customer
  - Includes: Payment method, date, amount
  - ✅ Active

- **Rental Status Update** - When rental status changes
  - Subject: "Rental Status Update - {rental_id}"
  - Sent to: Customer
  - Statuses: Active, Completed, Cancelled, On Hold
  - ✅ Active

### 6. **Contact Inquiries**
- Currently no email notifications (can be added if needed)

## 📧 Email Configuration

All emails are sent using Nodemailer with Gmail. Configuration:

```env
NODEMAILER_EMAIL=brokerin.in@gmail.com
NODEMAILER_PASSWORD=weqtzipbgmbpfmit
```

## 🔄 Automatic Email Triggers

### Immediate Triggers (Event-Based)
- User signup → OTP email
- Service booking created → Confirmation + Admin notification
- Service booking updated → Update email
- Service booking status changed → Status update email
- Furniture request created → Confirmation email
- Furniture request status changed → Status update email
- Property request created → Confirmation email
- Property request status changed → Status update email
- Rental created → Confirmation email
- Payment marked as paid → Payment confirmation email
- Rental status changed → Status update email

### Scheduled Triggers (Cron Job)
- **Daily at 9:00 AM (Asia/Kolkata)**: Payment reminders check
  - Sends reminders for payments due in 3 days, 1 day, today
  - Sends overdue reminders for late payments

## 📝 Email Templates Location

All email templates are in: `src/utils/email.ts`

Functions:
- `sendOtp()` - OTP verification
- `sendBookingConfirmation()` - Service booking confirmation
- `sendBookingUpdate()` - Service booking time/date change
- `sendStatusUpdate()` - Service booking status update
- `sendAdminNotification()` - Admin notification for new bookings
- `sendFurnitureRequestConfirmation()` - Furniture request confirmation
- `sendFurnitureStatusUpdate()` - Furniture request status update
- `sendPropertyRequestConfirmation()` - Property request confirmation
- `sendPropertyStatusUpdate()` - Property request status update
- `sendRentalConfirmation()` - Rental confirmation
- `sendPaymentReminder()` - Payment reminder
- `sendOverduePaymentReminder()` - Overdue payment reminder
- `sendPaymentConfirmation()` - Payment confirmation
- `sendRentalStatusUpdate()` - Rental status update

## 🎯 Email Status

All email notifications are **ACTIVE** and will send automatically when:
1. Nodemailer credentials are configured in `.env`
2. Server is restarted after adding credentials
3. User has a valid email address

If email is not configured, the system continues to work but emails are not sent (actions are logged instead).

## 📊 Email Statistics

To track email sending:
- Check server logs for: `"email sent"` or `"Email not configured"`
- All email actions are logged with email address and type
- Failed emails are logged with error details

