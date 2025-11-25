# Nodemailer Email Setup Guide

This guide explains how to configure Nodemailer for sending emails (rental reminders, payment confirmations, booking notifications, etc.).

## Environment Variables

Add these to your `.env` file (for local development) or Railway Variables (for production):

```env
NODEMAILER_EMAIL=no-reply@brokerin.in
NODEMAILER_PASSWORD=m1yXE3xhim2x
NODEMAILER_SMTP_HOST=smtp.zoho.in
NODEMAILER_SMTP_PORT=587
NODEMAILER_SMTP_SECURE=false
```

**Important Notes:**
- The app password should be **without spaces** in the `.env` file
- Never commit `.env` file to version control
- For Railway deployment, add these as environment variables in the Railway dashboard

## Setup Instructions

### Local Development

1. **Create/Edit `.env` file** in the root directory:
   ```bash
   # Add these lines
   NODEMAILER_EMAIL=no-reply@brokerin.in
   NODEMAILER_PASSWORD=m1yXE3xhim2x
   NODEMAILER_SMTP_HOST=smtp.zoho.in
   NODEMAILER_SMTP_PORT=587
   NODEMAILER_SMTP_SECURE=false
   ```

2. **Restart your development server:**
   ```bash
   npm run dev
   ```

3. **Verify email is enabled:**
   - Check server logs for: `"Email service configured"`
   - Emails will now be sent automatically for:
     - Rental confirmations
     - Payment reminders
     - Payment confirmations
     - Service booking confirmations
     - Status updates

### Railway Deployment

1. **Go to Railway Dashboard** → Your Service → Variables

2. **Add Environment Variables:**
   - `NODEMAILER_EMAIL` = `no-reply@brokerin.in`
   - `NODEMAILER_PASSWORD` = `m1yXE3xhim2x` (no spaces)
   - `NODEMAILER_SMTP_HOST` = `smtp.zoho.in`
   - `NODEMAILER_SMTP_PORT` = `587`
   - `NODEMAILER_SMTP_SECURE` = `false`

3. **Redeploy** (Railway will automatically redeploy when variables are added)

4. **Verify in logs:**
   - Check Railway logs for email-related messages
   - Test by creating a rental or updating a payment

## Email Features Enabled

Once configured, the following emails will be sent automatically:

### Rental Management
- ✅ Rental confirmation (when rental is created)
- ✅ Payment reminders (3 days, 1 day, due date)
- ✅ Overdue payment reminders
- ✅ Payment confirmation (when payment is marked as paid)
- ✅ Rental status updates

### Service Bookings
- ✅ Booking confirmation
- ✅ Booking status updates
- ✅ Time change notifications
- ✅ Admin notifications for new bookings

### Furniture Requests
- ✅ Request confirmation
- ✅ Status update notifications

## Testing Email Configuration

After adding the credentials, you can test by:

1. **Creating a rental** - Should send confirmation email
2. **Updating payment status** - Should send payment confirmation
3. **Creating a service booking** - Should send booking confirmation

## Troubleshooting

### Emails Not Sending

1. **Check if email is enabled:**
   - Look for logs: `"Email not configured or no email provided"`
   - Verify both `NODEMAILER_EMAIL` and `NODEMAILER_PASSWORD` are set

2. **Check app password:**
   - Ensure no spaces in the password
   - Verify it's a valid Zoho App Password (not regular password)

3. **Check Zoho Mail settings:**
   - Confirm IMAP/SMTP access is enabled in the Zoho Mail admin console
   - Use App Password (recommended) from Zoho Account settings

4. **Check server logs:**
   - Look for email-related errors
   - Check if transporter is created successfully

### Zoho Mail App Password Setup

1. Log in to [Zoho Mail Admin Console](https://mailadmin.zoho.com/)
2. Go to **Security & Compliance** → **App Passwords**
3. Generate a new password for the `brokerin` app (if needed)
4. Use the generated password (without spaces) for `NODEMAILER_PASSWORD`

## Security Notes

- ⚠️ **Never commit `.env` file** to version control
- ⚠️ **Never share app passwords** publicly
- ⚠️ **Use App Passwords** instead of regular mailbox password
- ⚠️ **Rotate passwords** periodically for security

## Current Configuration

- **Email Service:** Zoho Mail (via Nodemailer)
- **Email Address:** no-reply@brokerin.in
- **Status:** Ready to use (once credentials are added to environment)

## Automatic Email Schedule

- **Payment Reminders:** Daily at 9:00 AM (Asia/Kolkata timezone)
- **Rental Confirmations:** Immediately when rental is created
- **Payment Confirmations:** Immediately when payment is marked as paid
- **Status Updates:** Immediately when status changes

---

**Note:** The email service is optional. If credentials are not provided, the system will continue to work but emails will not be sent (actions will be logged instead).

