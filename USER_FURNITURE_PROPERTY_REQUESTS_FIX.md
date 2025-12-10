# ✅ User Furniture & Property Requests Fix

## 🐛 Problem
Frontend was calling admin-only endpoints (`/api/furniture-forms` and `/api/property-forms`), resulting in **403 Forbidden** errors:
```
Error fetching furniture requests: {message: 'Admin access required'}
```

---

## ✅ Solution
Added **user-specific endpoints** that allow users to fetch their own requests:

### New Endpoints

#### 1. **Get User's Own Furniture Requests**
```http
GET /api/furniture-forms/me
Authorization: Bearer {user_token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "form_id",
      "furniture_id": "FURN-2025-1209-ABC123",
      "furniture_name": "Sofa 5 Seater",
      "furniture_details": {
        "name": "Sofa 5 Seater",
        "furniture_id": "FURN-2025-1209-ABC123",
        "category": "Sofas",
        "photos": ["url1", "url2"]
      },
      "status": "Pending",
      "listing_type": "Rent",
      "name": "Prajwol Gautam",
      "email": "unicomportal2020@gmail.com",
      "phoneNumber": "7317741570",
      "message": "Interested in renting",
      "createdAt": "2025-12-09T06:08:42.159Z",
      "updatedAt": "2025-12-09T06:08:42.159Z"
    }
  ],
  "count": 1
}
```

#### 2. **Get User's Own Property Requests**
```http
GET /api/property-forms/me
Authorization: Bearer {user_token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "form_id",
      "property_id": "PROP-2025-1209-XYZ789",
      "property_name": "Brigade Medows 2 Bhk",
      "property_details": {
        "name": "Brigade Medows 2 Bhk",
        "property_id": "PROP-2025-1209-XYZ789",
        "location": "Bangalore",
        "photos": ["url1", "url2"]
      },
      "status": "Pending",
      "name": "Prajwol Gautam",
      "email": "unicomportal2020@gmail.com",
      "phoneNumber": "7317741570",
      "message": "Interested in viewing",
      "createdAt": "2025-12-09T06:08:42.159Z",
      "updatedAt": "2025-12-09T06:08:42.159Z"
    }
  ],
  "count": 1
}
```

---

## 🔧 Frontend Changes Required

### Update `furnitureService.js`

**Before (❌ Wrong - Admin Only):**
```javascript
// ❌ This requires admin access
export const getAllFurnitureRequests = async () => {
  const response = await axios.get('/api/furniture-forms');
  return response.data;
};
```

**After (✅ Correct - User Endpoint):**
```javascript
// ✅ Get user's own furniture requests
export const getMyFurnitureRequests = async () => {
  try {
    const response = await axios.get('/api/furniture-forms/me');
    return {
      success: true,
      data: response.data.data || [],
      count: response.data.count || 0
    };
  } catch (error) {
    console.error('Error fetching furniture requests:', error);
    throw error;
  }
};

// For admin dashboard (keep separate)
export const getAllFurnitureRequests = async (filters = {}) => {
  // This should only be called from admin dashboard
  const response = await axios.get('/api/furniture-forms', { params: filters });
  return response.data;
};
```

### Update `propertyService.js`

**Before (❌ Wrong - Admin Only):**
```javascript
// ❌ This requires admin access
export const getAllPropertyRequests = async () => {
  const response = await axios.get('/api/property-forms');
  return response.data;
};
```

**After (✅ Correct - User Endpoint):**
```javascript
// ✅ Get user's own property requests
export const getMyPropertyRequests = async () => {
  try {
    const response = await axios.get('/api/property-forms/me');
    return {
      success: true,
      data: response.data.data || [],
      count: response.data.count || 0
    };
  } catch (error) {
    console.error('Error fetching property requests:', error);
    throw error;
  }
};

// For admin dashboard (keep separate)
export const getAllPropertyRequests = async (filters = {}) => {
  // This should only be called from admin dashboard
  const response = await axios.get('/api/property-forms', { params: filters });
  return response.data;
};
```

### Update `UserDashboard.jsx`

**Before:**
```javascript
const fetchFurnitureRequests = async () => {
  try {
    const data = await furnitureService.getAllFurnitureRequests();
    setFurnitureRequests(data.data || []);
  } catch (error) {
    console.error('Error fetching furniture requests:', error);
  }
};
```

**After:**
```javascript
const fetchFurnitureRequests = async () => {
  try {
    const data = await furnitureService.getMyFurnitureRequests();
    setFurnitureRequests(data.data || []);
  } catch (error) {
    console.error('Error fetching furniture requests:', error);
    // Handle error (show message to user)
  }
};

const fetchPropertyRequests = async () => {
  try {
    const data = await propertyService.getMyPropertyRequests();
    setPropertyRequests(data.data || []);
  } catch (error) {
    console.error('Error fetching property requests:', error);
    // Handle error (show message to user)
  }
};
```

---

## 📊 Alternative: Use Unified Dashboard Endpoint

**Instead of separate calls, you can use the unified dashboard endpoint:**

```javascript
// Get all user data in one call
const fetchUserDashboard = async () => {
  try {
    const response = await axios.get('/api/users/dashboard/me');
    const { data } = response.data;
    
    setFurnitureRequests(data.allFurnitureRequests || []);
    setPropertyRequests(data.allPropertyRequests || []);
    setRentals(data.allRentals || []);
    setServiceBookings(data.allServiceBookings || []);
    setContactInquiries(data.allContactInquiries || []);
    
    // Stats
    setStats(data.stats);
  } catch (error) {
    console.error('Error fetching dashboard:', error);
  }
};
```

**This endpoint returns:**
- `allFurnitureRequests` - All user's furniture requests
- `allPropertyRequests` - All user's property requests
- `allRentals` - All user's rentals
- `allServiceBookings` - All user's service bookings
- `allContactInquiries` - All user's contact inquiries
- `stats` - Summary statistics

---

## 🎯 Summary

### ✅ What Changed
1. **Added `/api/furniture-forms/me`** - User's own furniture requests
2. **Added `/api/property-forms/me`** - User's own property requests
3. Both endpoints query by `userId` OR `email` (case-insensitive)
4. Both endpoints return formatted data with furniture/property details

### ✅ Frontend Action Required
1. **Update `furnitureService.js`** - Use `getMyFurnitureRequests()` instead of `getAllFurnitureRequests()`
2. **Update `propertyService.js`** - Use `getMyPropertyRequests()` instead of `getAllPropertyRequests()`
3. **Update `UserDashboard.jsx`** - Call the new user-specific functions

### ✅ Or Use Unified Endpoint
- Use `GET /api/users/dashboard/me` to get all user data in one call

---

## 🧪 Testing

**Test the new endpoints:**

```bash
# Get user's furniture requests
curl -X GET http://localhost:3030/api/furniture-forms/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get user's property requests
curl -X GET http://localhost:3030/api/property-forms/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:**
- ✅ Returns 200 OK
- ✅ Returns user's own requests only
- ✅ Includes furniture/property details
- ✅ No 403 errors

---

## 📝 Notes

- **Admin endpoints** (`/api/furniture-forms`, `/api/property-forms`) remain unchanged
- **User endpoints** (`/api/furniture-forms/me`, `/api/property-forms/me`) are new
- Both user endpoints require authentication (`authenticateToken`)
- Queries match by `userId` OR `email` (case-insensitive) to ensure all user-linked requests are returned

---

**The 403 error should now be resolved!** 🎉

