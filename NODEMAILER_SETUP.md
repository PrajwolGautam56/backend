# Nodemailer Email Setup Guide

This guide explains how to configure Nodemailer for sending emails (rental reminders, payment confirmations, booking notifications, etc.).

## Environment Variables

Add these to your `.env` file (for local development) or Railway Variables (for production):

```env
# Primary HTTP email provider (ZeptoMail)
EMAIL_PROVIDER=zepto
ZEPTO_TOKEN=Zoho-enczapikey YOUR_TOKEN_HERE
ZEPTO_FROM_EMAIL=no-reply@brokerin.in
ZEPTO_FROM_NAME=BrokerIn
# ZEPTO_BOUNCE_EMAIL is optional - only include if you have a verified bounce address
# ZEPTO_BOUNCE_EMAIL=bounce@brokerin.in

# Optional SMTP fallback (only needed if you want to keep SMTP as backup)
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
   EMAIL_PROVIDER=zepto
   ZEPTO_TOKEN=Zoho-enczapikey YOUR_TOKEN_HERE
   ZEPTO_FROM_EMAIL=no-reply@brokerin.in
   ZEPTO_FROM_NAME=BrokerIn
   # ZEPTO_BOUNCE_EMAIL is optional - only include if you have a verified bounce address
   # ZEPTO_BOUNCE_EMAIL=bounce@brokerin.in
   NODEMAILER_EMAIL=no-reply@brokerin.in          # optional fallback
   NODEMAILER_PASSWORD=m1yXE3xhim2x               # optional fallback
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
   - `EMAIL_PROVIDER` = `zepto`
   - `ZEPTO_TOKEN` = *(ZeptoMail send mail token)*
   - `ZEPTO_FROM_EMAIL` = `no-reply@brokerin.in` *(or your verified sender email)*
   - `ZEPTO_FROM_NAME` = `BrokerIn`
   - `ZEPTO_BOUNCE_EMAIL` = *(optional - only if you have a verified bounce address)*
   - (Optional fallback) `NODEMAILER_EMAIL`, `NODEMAILER_PASSWORD`, `NODEMAILER_SMTP_HOST`, `NODEMAILER_SMTP_PORT`, `NODEMAILER_SMTP_SECURE`

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

### Bounce Address Error (SM_113: Invalid email address)

**Error:** `Invalid email address` for `bounce_address`

**Solution:**
1. **Remove `ZEPTO_BOUNCE_EMAIL` from your `.env` file** - Bounce address is optional and can be omitted
2. Restart your server

**OR if you want to use a bounce address:**
1. Log in to [ZeptoMail Dashboard](https://www.zeptomail.com/)
2. Navigate to **Email Configuration** → **Bounce Address**
3. Verify that your bounce address is:
   - Added to the bounce address list
   - Verified (check verification status)
   - Active (not disabled)
4. Update `ZEPTO_BOUNCE_EMAIL` in your `.env` file to match the verified bounce address
5. Restart your server

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

### ZeptoMail API Token Setup

1. Log in to [ZeptoMail](https://zeptomail.zoho.com/)
2. Go to **Mail Agents** → select your agent (`brokerin.in`)
3. Under **Bounce Address**, add/verify an email (e.g., `bounce@brokerin.in`)
4. Under **Send Mail Tokens**, generate a new token (keep it secure)
5. Use the copied token value for `ZEPTO_TOKEN`

## Security Notes

- ⚠️ **Never commit `.env` file** to version control
- ⚠️ **Never share app passwords** publicly
- ⚠️ **Treat Zepto tokens like passwords** – rotate periodically
- ⚠️ **Rotate passwords** periodically for security

## Current Configuration

- **Email Service:** ZeptoMail HTTP API (primary) with optional SMTP fallback
- **Email Address:** no-reply@brokerin.in
- **Status:** Ready to use (once credentials are added to environment)

## Automatic Email Schedule

- **Payment Reminders:** Daily at 9:00 AM (Asia/Kolkata timezone)
- **Rental Confirmations:** Immediately when rental is created
- **Payment Confirmations:** Immediately when payment is marked as paid
- **Status Updates:** Immediately when status changes

---

**Note:** The email service is optional. If credentials are not provided, the system will continue to work but emails will not be sent (actions will be logged instead).

