# 👤 User Dashboard - Quick API Reference

## 🎯 Main Dashboard Endpoint (All-in-One)

```http
GET /api/users/dashboard/me
Authorization: Bearer {user_token}
```

**Returns:** Complete dashboard with all data (rentals, furniture requests, service bookings, property requests, stats, activity log)

---

## 📋 Individual Endpoints

### 1. My Orders (Rentals)
```http
GET /api/rentals/my-rentals
Authorization: Bearer {user_token}
```

**Returns:** All rental orders with payment summaries

---

### 2. My Service Bookings
```http
GET /api/service-bookings/my-bookings
Authorization: Bearer {user_token}
```

**Returns:** All service bookings with status

---

### 3. Pending/Overdue Payments
```http
GET /api/rentals/pending-overdue
Authorization: Bearer {user_token}
```

**Returns:** All pending and overdue payment records

---

### 4. Activity History
```http
GET /api/users/profile/activity
Authorization: Bearer {user_token}
```

**Returns:** User's activity log

---

## 📊 Dashboard Response Structure

```json
{
  "success": true,
  "data": {
    "user": { /* user info */ },
    "stats": {
      "totalRentals": 4,
      "activeRentals": 2,
      "totalFurnitureRequests": 8,
      "totalServiceBookings": 3,
      "totalPropertyRequests": 5
    },
    "recentRentals": [ /* last 5 */ ],
    "recentFurnitureRequests": [ /* last 5 */ ],
    "recentServiceBookings": [ /* last 5 */ ],
    "recentPropertyRequests": [ /* last 5 */ ],
    "allRentals": [ /* all orders with order_status, delivery_date, etc */ ],
    "allFurnitureRequests": [ /* all requests */ ],
    "allServiceBookings": [ /* all bookings */ ],
    "allPropertyRequests": [ /* all requests */ ],
    "activityLog": [ /* activity history */ ]
  }
}
```

---

## 🎨 Frontend Service Example

```javascript
import api from './axiosConfig';

// Get complete dashboard
export const getDashboard = async () => {
  const response = await api.get('/api/users/dashboard/me');
  return response.data;
};

// Get my rentals
export const getMyRentals = async () => {
  const response = await api.get('/api/rentals/my-rentals');
  return response.data;
};

// Get my service bookings
export const getMyServiceBookings = async () => {
  const response = await api.get('/api/service-bookings/my-bookings');
  return response.data;
};
```

---

## ✅ What's Included

### Rentals (Orders)
- ✅ Order ID, Status, Payment Method
- ✅ Items, Quantities, Prices
- ✅ Delivery Date, Delivery Status
- ✅ Payment Records & Summary
- ✅ Total Amounts

### Furniture Requests
- ✅ Request ID, Status
- ✅ Furniture Details
- ✅ Listing Type, Payment Status
- ✅ Delivery Date (if scheduled)

### Service Bookings
- ✅ Booking ID, Service Type
- ✅ Date, Time, Address
- ✅ Status, Notes

### Property Requests
- ✅ Request ID, Status
- ✅ Property Details
- ✅ Message, Date

### Activity Log
- ✅ All user actions
- ✅ Timestamps
- ✅ Details

---

## 🚀 Quick Start

1. **Call dashboard endpoint:**
   ```javascript
   const dashboard = await getDashboard();
   ```

2. **Display data:**
   ```jsx
   <Dashboard 
     rentals={dashboard.data.allRentals}
     furnitureRequests={dashboard.data.allFurnitureRequests}
     serviceBookings={dashboard.data.allServiceBookings}
     propertyRequests={dashboard.data.allPropertyRequests}
   />
   ```

3. **Show stats:**
   ```jsx
   <Stats stats={dashboard.data.stats} />
   ```

---

**All endpoints are ready! See `USER_DASHBOARD_COMPLETE_GUIDE.md` for full implementation.** 🎉

