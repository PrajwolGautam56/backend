# Fix Google OAuth Origin Mismatch Error

## Error Message
```
Access blocked: Authorization Error
Error 400: origin_mismatch
You can't sign in to this app because it doesn't comply with Google's OAuth 2.0 policy.
```

## What This Means
Google is blocking the OAuth request because the **JavaScript origin** (your frontend URL) is not registered in the Google Cloud Console.

## How to Fix

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Select your project (or create one if you don't have one)

### Step 2: Navigate to OAuth Credentials
1. Go to **APIs & Services** → **Credentials**
2. Find your **OAuth 2.0 Client ID** (the one matching your `GOOGLE_CLIENT_ID`)
3. Click on it to edit

### Step 3: Add Authorized JavaScript Origins
In the **Authorized JavaScript origins** section, add your frontend URLs:

**For Development:**
```
http://localhost:3000
http://localhost:3001
http://127.0.0.1:3000
```

**For Production:**
```
https://yourdomain.com
https://www.yourdomain.com
https://brokerin.in
https://www.brokerin.in
```

**Important Notes:**
- ✅ Include the protocol (`http://` or `https://`)
- ✅ Include the port number for localhost (e.g., `:3000`)
- ✅ NO trailing slash at the end
- ❌ Don't include paths like `/login` or `/auth`

### Step 4: Add Authorized Redirect URIs (if needed)
If you're using redirect-based OAuth flow, also add redirect URIs:

**For Development:**
```
http://localhost:3000/auth/callback
http://localhost:3000/login/callback
```

**For Production:**
```
https://yourdomain.com/auth/callback
https://yourdomain.com/login/callback
```

### Step 5: Save Changes
1. Click **Save** at the bottom
2. Wait 1-2 minutes for changes to propagate

### Step 6: Test Again
Try logging in with Google again. The error should be resolved.

---

## Common Issues

### Issue 1: Still Getting Error After Adding Origins
**Solution:** 
- Clear browser cache and cookies
- Wait 2-3 minutes for Google's changes to propagate
- Make sure you're using the exact URL (including port for localhost)
- Check if you're using `http://` vs `https://` correctly

### Issue 2: Multiple Environments (Dev, Staging, Production)
**Solution:**
Add all your environments:
```
http://localhost:3000          (Local development)
https://staging.yourdomain.com (Staging)
https://yourdomain.com         (Production)
```

### Issue 3: Using Railway/Heroku/Vercel
**Solution:**
Add your deployment URLs:
```
https://your-app.railway.app
https://your-app.vercel.app
https://your-app.herokuapp.com
```

---

## Quick Checklist

- [ ] Opened Google Cloud Console
- [ ] Found OAuth 2.0 Client ID
- [ ] Added `http://localhost:3000` (or your dev URL)
- [ ] Added production URL (if deployed)
- [ ] Saved changes
- [ ] Waited 2 minutes
- [ ] Cleared browser cache
- [ ] Tested again

---

## Example Configuration

**Authorized JavaScript origins:**
```
http://localhost:3000
http://localhost:3001
https://brokerin.in
https://www.brokerin.in
```

**Authorized redirect URIs:**
```
http://localhost:3000/auth/callback
https://brokerin.in/auth/callback
```

---

## Need Help?

If you're still having issues:
1. Check the exact error message in browser console
2. Verify your `GOOGLE_CLIENT_ID` matches the Client ID in Google Console
3. Make sure your frontend is using the correct Client ID
4. Check if you're using the right OAuth flow (ID token vs access token)

---

## Security Note

⚠️ **Never commit your `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` to public repositories!**

Keep them in `.env` file (which should be in `.gitignore`).

