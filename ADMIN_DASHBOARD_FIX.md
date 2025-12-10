# 🔧 Admin Dashboard 404 Fix

## Issue
Getting 404 error when accessing `/api/admin/dashboard/overview`

## Solutions

### 1. Check Server Port
The backend runs on **port 3030** by default, not 3000.

**Correct URL:**
```
http://localhost:3030/api/admin/dashboard/overview
```

**Not:**
```
http://localhost:3000/api/admin/dashboard/overview  ❌
```

### 2. Verify Server is Running
Make sure the server is running:
```bash
npm start
# or
npm run dev
```

### 3. Check Authentication
The endpoint requires:
- **Authentication token** in headers
- **Admin role** (user must be admin)

**Request Headers:**
```
Authorization: Bearer {your_admin_token}
```

### 4. Test the Endpoint

**Using curl:**
```bash
curl -X GET http://localhost:3030/api/admin/dashboard/overview \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Using Postman/Thunder Client:**
- Method: GET
- URL: `http://localhost:3030/api/admin/dashboard/overview`
- Headers:
  - `Authorization: Bearer YOUR_ADMIN_TOKEN`

**Using Frontend (React/Axios):**
```typescript
import axios from 'axios';

const fetchDashboard = async () => {
  try {
    const response = await axios.get(
      'http://localhost:3030/api/admin/dashboard/overview',
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    console.log(response.data);
  } catch (error) {
    console.error('Error:', error.response?.data);
  }
};
```

### 5. Common Issues

#### Issue: 401 Unauthorized
**Cause:** Missing or invalid token
**Fix:** Make sure you're logged in as an admin user

#### Issue: 403 Forbidden
**Cause:** User is not an admin
**Fix:** Check user role in database:
```javascript
// In MongoDB or via API
User.findOne({ email: 'your@email.com' })
// Should have: isAdmin: true OR role: 'admin'
```

#### Issue: 404 Not Found
**Causes:**
1. Wrong port (using 3000 instead of 3030)
2. Server not running
3. Route not registered (should be fixed after rebuild)

**Fix:**
1. Use port 3030
2. Restart server: `npm start`
3. Rebuild if needed: `npm run build`

### 6. Verify Route Registration

The route should be registered in:
- `src/routes/adminRoutes.ts` - Line 13: `router.get('/dashboard/overview', ...)`
- `src/app.ts` - Line 62: `app.use('/api/admin', adminRoutes)`

**Full route path:** `/api/admin/dashboard/overview`

### 7. Check Server Logs

When you start the server, you should see:
```
✅ Server is running on 0.0.0.0:3030
Connected to MongoDB
```

When you make a request, you should see logs like:
```
GET /api/admin/dashboard/overview
```

### 8. Quick Test Script

Create a test file `test-dashboard.js`:
```javascript
const axios = require('axios');

async function testDashboard() {
  try {
    const response = await axios.get(
      'http://localhost:3030/api/admin/dashboard/overview',
      {
        headers: {
          'Authorization': 'Bearer YOUR_ADMIN_TOKEN_HERE'
        }
      }
    );
    console.log('✅ Success:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testDashboard();
```

Run: `node test-dashboard.js`

---

## ✅ Checklist

- [ ] Server is running on port 3030
- [ ] Using correct URL: `http://localhost:3030/api/admin/dashboard/overview`
- [ ] Authentication token is included in headers
- [ ] User has admin role (`isAdmin: true` or `role: 'admin'`)
- [ ] Server has been rebuilt (`npm run build`)
- [ ] Server has been restarted after rebuild

---

## 📝 Expected Response

If everything is working, you should get:

```json
{
  "success": true,
  "data": {
    "totalProperties": {
      "count": 245,
      "change": 12,
      "changeType": "increase",
      ...
    },
    "activeUsers": {
      "count": 1200,
      "change": 8,
      "changeType": "increase",
      ...
    },
    "serviceRequests": {
      "count": 89,
      "change": -2,
      "changeType": "decrease",
      ...
    },
    "totalRevenue": {
      "amount": 2400000,
      "currency": "INR",
      "change": 18,
      "changeType": "increase",
      ...
    },
    "recentProperties": [...],
    "recentActivities": [...],
    "quickStats": {...}
  }
}
```

---

*Last Updated: December 2024*

