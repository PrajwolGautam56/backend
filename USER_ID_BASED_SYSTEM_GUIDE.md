# User ID-Based System Implementation Guide

## Overview
This system now uses **User ID** (`userId`) as the primary method for tracking user submissions and displaying data. All forms (Property, Furniture, Service Bookings) now store the user's ID when submitted, and dashboards fetch data based on this ID.

---

## Key Changes

### 1. **Database Models**
All submission models now have a `userId` field:

#### ServiceBooking Model
```typescript
userId: {
  type: Schema.Types.ObjectId,
  ref: 'User',
  required: false  // Optional for guests
}
```

#### PropertyForm Model
Already had `userId` field (optional)

#### FurnitureForm Model
Already had `userId` field (optional)

---

## 2. **Authentication Flow**

### For Logged-In Users
- When a user is logged in, `userId` is automatically attached to form submissions
- User activity is tracked in their `activityLog`
- Dashboard shows only their submissions

### For Guests (Not Logged In)
- Forms can still be submitted without authentication
- `userId` is `undefined` for guest submissions
- Admin can still view and manage guest submissions
- No activity tracking for guests

---

## 3. **New Optional Authentication Middleware**

Created `src/middleware/optionalAuth.ts`:

```typescript
export const optionalAuthenticate = (req, res, next) => {
  // Tries to decode token, but doesn't fail if no token
  // Attaches userId if token is valid
}
```

This middleware:
- ✅ Accepts requests with OR without authentication
- ✅ Attaches `userId` if a valid token is provided
- ✅ Continues request flow if no token or invalid token
- ✅ Used on public routes that can benefit from user tracking

---

## 4. **Updated Controllers**

### Service Booking Controller
```typescript
export const createBooking = async (req, res) => {
  const userId = req.userId || undefined; // From optional auth middleware
  
  const booking = new ServiceBooking({
    ...req.body,
    userId // Attach userId if user is logged in
  });
  
  // Track activity if logged in
  if (userId) {
    await User.findByIdAndUpdate(userId, {
      $push: { activityLog: { ... } }
    });
  }
}
```

### User Controller (Dashboard)
```typescript
// Fetch user's data by userId
const [propertyRequests, furnitureRequests, serviceBookings] = await Promise.all([
  PropertyForm.find({ userId }),      // ✅ By userId
  FurnitureForm.find({ userId }),     // ✅ By userId
  ServiceBooking.find({ userId })     // ✅ By userId (was by email)
]);
```

---

## 5. **Updated Routes**

### Service Booking Routes
```typescript
// POST /api/service-bookings - Public route with optional auth
router.post('/', optionalAuthenticate, serviceBookingController.createBooking);

// Other routes remain protected
router.get('/', authenticateToken, isAdmin, getBookings);
```

### Property/Furniture Routes
- Already support public submission
- Already track `userId` when logged in

---

## 6. **How Data is Fetched**

### User Dashboard (`/api/users/dashboard/me`)
- Fetches all data where `userId === loggedInUserId`
- Shows: Property requests, Furniture requests, Service bookings, Activity log

### Admin User Details (`/api/users/details/:id`)
- Fetches all data where `userId === targetUserId`
- Shows all submissions for a specific user
- Includes full user profile and activity log

### Admin Lists
- Admin can see all submissions (guests and logged-in users)
- Can filter by `userId` to see a specific user's submissions
- Guest submissions have `userId: null` or `undefined`

---

## 7. **Frontend Integration**

### For Public Forms (Properties, Furniture, Services)

#### If User is NOT Logged In:
```javascript
// Submit form without authentication
const response = await fetch('/api/service-bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    service_type: 'Plumbing',
    name: 'John Doe',
    email: 'john@example.com',
    phone_number: '1234567890',
    // ... other fields
  })
});
```

#### If User IS Logged In:
```javascript
// Submit form with authentication token
const response = await fetch('/api/service-bookings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`  // ✅ Include token
  },
  body: JSON.stringify({
    service_type: 'Plumbing',
    name: 'John Doe',
    email: 'john@example.com',
    phone_number: '1234567890',
    // ... other fields
    // userId is automatically added by backend
  })
});
```

### For Dashboard Data
```javascript
// GET /api/users/dashboard/me
const response = await fetch('/api/users/dashboard/me', {
  headers: {
    'Authorization': `Bearer ${token}`  // Required
  }
});

const data = await response.json();
// data.data.serviceBookings - All bookings for this user
// data.data.propertyRequests - All property requests
// data.data.furnitureRequests - All furniture requests
```

---

## 8. **Benefits**

### For Logged-In Users
- ✅ All submissions tracked under their user ID
- ✅ Dashboard shows complete history
- ✅ Admin can view all user activity in one place
- ✅ Activity log tracks user actions

### For Guests
- ✅ Can still submit forms without login
- ✅ No user ID stored (or null)
- ✅ Admin can still manage their requests
- ✅ Can register later to link their history

### For Admins
- ✅ See submissions by specific users (filter by userId)
- ✅ Distinguish between logged-in users and guests
- ✅ Complete user profile with all submissions
- ✅ Activity log for each user

---

## 9. **Database Queries**

### Get All Submissions for a User
```javascript
const userId = "507f1f77bcf86cd799439011";

// Property requests
const propertyRequests = await PropertyForm.find({ userId });

// Furniture requests
const furnitureRequests = await FurnitureForm.find({ userId });

// Service bookings
const serviceBookings = await ServiceBooking.find({ userId });
```

### Get All Guest Submissions (No User ID)
```javascript
// Property requests
const guestPropertyRequests = await PropertyForm.find({ userId: null });

// Furniture requests
const guestFurnitureRequests = await FurnitureForm.find({ userId: undefined });

// Service bookings
const guestServiceBookings = await ServiceBooking.find({ $or: [
  { userId: null },
  { userId: { $exists: false } }
]});
```

---

## 10. **Migration Notes**

### Existing Data
- Existing submissions before this update might have `userId: undefined`
- These are treated as guest submissions
- No data loss, just different query logic

### For Frontend
- If your frontend sends forms without authentication, `userId` will be `undefined` (expected)
- If your frontend includes the auth token, `userId` will be attached automatically
- Frontend doesn't need to send `userId` explicitly

---

## 11. **Summary**

| Feature | Before | After |
|---------|--------|-------|
| **Tracking Method** | Email/Phone | User ID |
| **Dashboard Data** | Email match | User ID match |
| **Guest Submissions** | Supported | Supported |
| **Auth Requirement** | None | Optional (recommended) |
| **Activity Tracking** | Partial | Complete for logged-in users |
| **Admin Filtering** | By name/email | By User ID |

---

## 12. **API Endpoints**

### Create Service Booking
```bash
# Without auth (guest)
POST /api/service-bookings
Content-Type: application/json
{
  "service_type": "Plumbing",
  "name": "John Doe",
  "email": "john@example.com",
  "phone_number": "1234567890",
  ...
}

# With auth (logged in)
POST /api/service-bookings
Authorization: Bearer <token>
Content-Type: application/json
{
  "service_type": "Plumbing",
  ...
}
# userId is automatically added
```

### Get User Dashboard
```bash
GET /api/users/dashboard/me
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "user": "John Doe",
    "stats": {
      "totalPropertyRequests": 5,
      "totalFurnitureRequests": 3,
      "totalServiceBookings": 10,
      "totalActivities": 18
    },
    "recentPropertyRequests": [...],
    "recentFurnitureRequests": [...],
    "recentServiceBookings": [...],
    "activityLog": [...]
  }
}
```

---

## 13. **Testing**

### Test Logged-In User Submission
```bash
# 1. Login to get token
curl -X POST http://localhost:3030/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"identifier":"user@example.com","password":"password"}'

# 2. Submit booking with token
curl -X POST http://localhost:3030/api/service-bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "service_type": "Plumbing",
    "name": "Test User",
    "email": "test@example.com",
    "phone_number": "1234567890",
    "preferred_date": "2024-12-01",
    "preferred_time": "10:00",
    "service_address": "123 Test St"
  }'
```

### Test Guest Submission
```bash
# Submit without token
curl -X POST http://localhost:3030/api/service-bookings \
  -H "Content-Type: application/json" \
  -d '{
    "service_type": "Plumbing",
    "name": "Guest User",
    "email": "guest@example.com",
    "phone_number": "0987654321",
    "preferred_date": "2024-12-01",
    "preferred_time": "14:00",
    "service_address": "456 Test St"
  }'
```

### Test Dashboard
```bash
curl http://localhost:3030/api/users/dashboard/me \
  -H "Authorization: Bearer <token>"
```

---

## Conclusion

The system now uses **User ID** as the primary identifier for tracking user submissions. This provides:
- ✅ Better data organization
- ✅ Complete user history
- ✅ Activity tracking
- ✅ Guest support maintained
- ✅ Admin can filter by user
- ✅ Dashboard shows accurate data

**All data is now fetched by `userId`, not by email or phone number.**


