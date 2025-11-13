# Frontend Auth & OTP Verification Guide

This guide explains how to integrate the email/OTP verification flow in your frontend. The backend already exposes the required endpoints and sends OTP emails using Gmail via Nodemailer. Use this document when wiring up signup, OTP verification, login guards, and resend OTP logic.

---

## API Endpoints

| Action | Method & URL | Body | Notes |
|--------|--------------|------|-------|
| Create account | `POST /api/auth/signup` | `FormData` (fullName, username, email, phoneNumber, nationality, password) | Generates OTP and emails it; user is stored with `isVerified=false`. |
| Verify OTP | `POST /api/auth/verify-otp` | `{ "email": "user@example.com", "otp": "123456" }` | Marks user verified, clears OTP fields. |
| Login | `POST /api/auth/signin` | `{ "identifier": "email-or-username", "password": "secret" }` | Returns 403 until `isVerified=true`. |
| Resend OTP *(optional future)* | _(same `signup` endpoint for now)_ | | Trigger signup again or build a dedicated route later. |

Backend response codes:
- `201` on signup: `{ message: "User created. Please verify your OTP." }`
- `200` on OTP verification: `{ message: "OTP verified successfully, user is now verified." }`
- `403` on login if not verified: `{ message: "Please verify your email with the OTP before logging in." }`

---

## Frontend Flow

1. **Signup form**
   - Collect required fields (`fullName`, `username`, `email`, `phoneNumber`, `nationality`, `password`).
   - Submit as `FormData` (because backend accepts multipart; include `profilePicture` if available).
   - On success: show message “OTP sent to your email. Please verify.” and navigate to an OTP entry screen.

2. **OTP entry screen**
   - Provide fields for `email` and `otp`.
   - Call `POST /api/auth/verify-otp`.
   - On success: show success message and redirect to login.
   - On failure (400): show “Invalid or expired OTP”; allow retry.

3. **Login form**
   - Standard login to `/api/auth/signin`.
   - If backend returns 403: prompt user to verify OTP first.
   - Once login succeeds, store tokens as usual.

4. **Resending OTP (optional)**
   - You can reuse the signup endpoint to regenerate a new OTP (as long as account isn’t verified). Alternatively, add a dedicated resend route later.

---

## React Examples

### Signup with FormData
```tsx
import axios from 'axios';

const handleSignup = async (formValues: SignupFormValues) => {
  const formData = new FormData();
  Object.entries(formValues).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value as string | Blob);
    }
  });

  const response = await axios.post('/api/auth/signup', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  // Expected: "User created. Please verify your OTP."
  alert(response.data.message);
  navigate('/verify-otp', { state: { email: formValues.email } });
};
```

### OTP Verification Component
```tsx
const VerifyOtpForm = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post('/api/auth/verify-otp', { email, otp });
      alert(response.data.message);
      navigate('/login');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleVerify}>
      <h2>Verify Your Email</h2>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter the email you signed up with"
        required
      />
      <input
        type="text"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="Enter the 6-digit OTP"
        maxLength={6}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Verifying...' : 'Verify OTP'}
      </button>
    </form>
  );
};
```

### Handling Unverified Login Attempts
```tsx
const handleLogin = async ({ identifier, password }: LoginFormValues) => {
  try {
    const response = await axios.post('/api/auth/signin', { identifier, password });
    // Store tokens, redirect, etc.
  } catch (error: any) {
    if (error.response?.status === 403) {
      alert('Please verify your email with the OTP sent to you before logging in.');
      return;
    }
    alert(error.response?.data?.message || 'Login failed');
  }
};
```

---

## UX Recommendations
- **After signup** show OTP screen automatically; pre-fill email if possible.
- **Countdown timer** (“OTP expires in 20 minutes”) to urge quick verification.
- **Resend OTP button** with cooldown to prevent abuse.
- **Visual feedback** on verification success/failure.
- **Guard routes**: if user tries to access login-protected pages without verification, show reminder.

---

## Future Enhancements
- Resend OTP endpoint to avoid re-running signup.
- Two-factor authentication with email OTP at login.
- Admin override: mark user `isVerified=true` manually if needed.

---

With these components wired up, users must verify their email before logging in, matching the backend enforcement.
