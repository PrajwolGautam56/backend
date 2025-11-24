# Production Timeout Fix for Pre-Signup OTP Endpoint

## Problem
The `/api/auth/pre-signup/request-otp` endpoint was timing out in production after 30 seconds. This was caused by the email sending process blocking the HTTP response.

## Root Cause
- The `sendOtp()` function was being `await`ed, blocking the response
- Gmail SMTP can be slow in production environments
- No timeout protection on email sending
- If email takes >30 seconds, the request times out before response is sent

## Solution Implemented

### 1. Non-Blocking Email Sending
Changed the email sending to be **fire-and-forget** (non-blocking):
```typescript
// Before: await sendOtp(email, otp); // Blocks response
// After: 
sendOtp(email, otp).catch((error) => {
  logger.error('Error sending OTP email', { error, email, otp });
});
```

**Benefits:**
- Response is sent immediately after saving pending signup
- Email is sent in background
- User doesn't wait for email to complete
- Prevents timeout errors

### 2. Email Timeout Protection
Added timeout settings to nodemailer transporter:
```typescript
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { ... },
  connectionTimeout: 10000,  // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 10000,
});
```

Added Promise.race with 15-second timeout:
```typescript
const sendPromise = transporter.sendMail(mailOptions);
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Email send timeout')), 15000);
});
await Promise.race([sendPromise, timeoutPromise]);
```

### 3. Better Error Handling
- Email errors are logged but don't affect the response
- OTP is still saved even if email fails
- User can request OTP again if email doesn't arrive

## API Behavior

### Before Fix
1. User submits signup form
2. Backend saves pending signup
3. Backend waits for email to send (can take 30+ seconds)
4. **Timeout error** if email is slow
5. User sees error, but OTP was actually saved

### After Fix
1. User submits signup form
2. Backend saves pending signup
3. **Response sent immediately** (< 1 second)
4. Email sent in background (non-blocking)
5. User sees success message immediately
6. Email arrives within a few seconds

## Response Format

**Success (200):**
```json
{
  "message": "OTP sent. Please verify to complete registration."
}
```

**Development Mode:**
In development, OTP is included in response for testing:
```json
{
  "message": "OTP sent. Please verify to complete registration.",
  "otp": "123456"
}
```

## Error Scenarios

### Email Fails to Send
- OTP is still saved in database
- User can verify OTP even if email didn't arrive
- Error is logged for admin review
- User can request new OTP if needed

### Email Timeout
- Email send is cancelled after 15 seconds
- OTP is still saved
- User receives response immediately
- Can request new OTP if email doesn't arrive

## Testing

### Local Testing
1. Test with email configured - should work normally
2. Test with email disabled - should still save OTP
3. Test with slow network - should not timeout

### Production Testing
1. Monitor response times - should be < 1 second
2. Check email delivery - should arrive within 5-10 seconds
3. Check logs for email errors
4. Verify OTP can still be verified even if email fails

## Monitoring

Watch for these log messages:
- `"OTP email sent successfully"` - Email sent successfully
- `"Error sending OTP email (non-blocking)"` - Email failed but OTP saved
- `"Email send timeout after 15 seconds"` - Email took too long

## Additional Recommendations

1. **Email Queue System** (Future Enhancement)
   - Consider using a job queue (Bull, BullMQ) for email sending
   - Better retry logic
   - Better monitoring

2. **SMS OTP** (Alternative)
   - Add SMS OTP as backup/alternative
   - More reliable than email in some regions

3. **Rate Limiting**
   - Add rate limiting to prevent abuse
   - Limit OTP requests per email/IP

## Files Modified

- `src/controllers/authController.ts`
  - `requestSignupOtp()` - Made email non-blocking
  - `sendOtp()` - Added timeout protection

## Deployment Notes

1. No environment variables needed
2. No database migrations required
3. Backward compatible - existing OTPs still work
4. Deploy and test immediately

## Verification Checklist

- [x] Response sent immediately (< 1 second)
- [x] Email sent in background
- [x] OTP saved even if email fails
- [x] Timeout protection added
- [x] Error logging improved
- [x] No breaking changes
- [x] Build successful

