# Razorpay Setup Instructions

## 📍 Where to Add Razorpay Credentials

Add your Razorpay credentials to the **`.env`** file in your project root directory.

---

## 🔑 Step-by-Step Setup

### 1. Get Razorpay Credentials

1. **Sign up/Login** to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to **Settings** → **API Keys**
3. You'll see:
   - **Key ID** (starts with `rzp_test_` for test mode or `rzp_live_` for live mode)
   - **Key Secret** (click "Reveal" to see it)

### 2. Get Webhook Secret

1. Go to **Settings** → **Webhooks**
2. Click **Add New Webhook**
3. Enter your webhook URL:
   - **Development:** `http://localhost:3030/api/payments/webhook`
   - **Production:** `https://your-domain.com/api/payments/webhook`
4. Select event: **`payment.captured`**
5. Click **Create Webhook**
6. Copy the **Webhook Secret** (shown after creation)

### 3. Add to .env File

Create or edit the `.env` file in your project root and add:

```bash
# Razorpay Payment Gateway
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxx
```

**Example:**
```bash
RAZORPAY_KEY_ID=rzp_test_ABC123XYZ456
RAZORPAY_KEY_SECRET=def789ghi012jkl345mno678pqr
RAZORPAY_WEBHOOK_SECRET=webhook_secret_abc123xyz456
```

---

## 📁 File Location

```
backend-brokerIn-main/
├── .env                    ← Add credentials here
├── .env.example           ← Template (for reference)
├── src/
├── package.json
└── ...
```

---

## 🔒 Security Notes

1. **Never commit `.env` file to Git**
   - ✅ Already in `.gitignore`
   - ✅ Contains sensitive credentials

2. **Use Test Credentials for Development**
   - Test Key ID starts with `rzp_test_`
   - Test mode doesn't charge real money

3. **Use Live Credentials for Production**
   - Live Key ID starts with `rzp_live_`
   - Switch only when ready for production

4. **Keep Credentials Secret**
   - Don't share `.env` file
   - Don't commit to version control
   - Use environment variables in production (Railway, Heroku, etc.)

---

## 🧪 Testing

### Test Mode Credentials:
- Get from Razorpay Dashboard → Settings → API Keys
- Use test mode for development
- Test cards available in Razorpay docs

### Test Cards:
- **Success:** `4111 1111 1111 1111`
- **Failure:** `4000 0000 0000 0002`
- **CVV:** Any 3 digits
- **Expiry:** Any future date

---

## 🚀 Production Setup

### For Railway/Heroku/Other Platforms:

1. **Add Environment Variables:**
   - Go to your platform's environment variables section
   - Add the three Razorpay variables
   - Use **live** credentials (not test)

2. **Update Webhook URL:**
   - Go to Razorpay Dashboard → Settings → Webhooks
   - Update webhook URL to your production domain
   - Example: `https://your-domain.com/api/payments/webhook`

3. **Verify:**
   - Check that `isRazorpayEnabled()` returns true
   - Test a payment in production

---

## ✅ Verification

After adding credentials, restart your server and check logs:

```bash
# You should see:
info: Razorpay initialized successfully
```

If you see:
```
warn: Razorpay not configured. Payment gateway features will be disabled.
```

Then check:
- ✅ `.env` file exists in project root
- ✅ Credentials are correctly formatted
- ✅ No extra spaces or quotes
- ✅ Server restarted after adding credentials

---

## 📝 Complete .env Example

```bash
# Server
PORT=3030

# Database
MONGODB_URI=mongodb://localhost:27017/brokerin

# JWT
JWT_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email
NODEMAILER_EMAIL=brokerin.in@gmail.com
NODEMAILER_PASSWORD=your_app_password

# Frontend
FRONTEND_BASE_URL=http://localhost:3000

# Razorpay (Add these)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxx
```

---

## 🔍 Troubleshooting

### Issue: "Razorpay is not configured"
**Solution:**
- Check `.env` file exists
- Verify variable names are correct (case-sensitive)
- Restart server after adding credentials

### Issue: "Invalid payment signature"
**Solution:**
- Verify `RAZORPAY_KEY_SECRET` is correct
- Check webhook secret matches Razorpay dashboard

### Issue: Webhook not working
**Solution:**
- Verify webhook URL is accessible
- Check webhook secret is correct
- Ensure webhook is enabled in Razorpay dashboard

---

## 📞 Support

- **Razorpay Support:** support@razorpay.com
- **Razorpay Docs:** https://razorpay.com/docs/
- **Your App:** brokerin.in@gmail.com

---

**Important:** Never share your `.env` file or commit it to Git!

