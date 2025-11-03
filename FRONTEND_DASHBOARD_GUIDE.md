# Frontend User Dashboard Guide

## 📊 Complete Guide for User Profile Dashboard

This guide shows you how to fetch and display the user dashboard with all submissions (property requests, furniture requests, and service bookings).

---

## 🔗 API Endpoint

```
GET /api/users/dashboard/me
```

**Authentication:** Required (User Bearer Token)  
**Content-Type:** `application/json`

---

## 📋 Dashboard Response Structure

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "68ffbfc20710b8e29c38d385",
      "fullName": "John Doe",
      "email": "john@example.com",
      "username": "johndoe",
      "phoneNumber": "1234567890",
      "profilePicture": "default-profile.png",
      "isVerified": true
    },
    "stats": {
      "totalPropertyRequests": 5,
      "totalFurnitureRequests": 3,
      "totalServiceBookings": 10,
      "totalActivities": 18,
      "totalSubmissions": 18
    },
    "recentPropertyRequests": [
      {
        "_id": "...",
        "property_id": "PROP-2024-1102-ABC123",
        "property_name": "Modern Apartment",
        "property_details": {
          "name": "Modern Apartment",
          "property_id": "PROP-2024-1102-ABC123",
          "location": "Mumbai",
          "photos": ["https://..."],
        },
        "status": "Requested",
        "name": "John Doe",
        "email": "john@example.com",
        "phoneNumber": "1234567890",
        "message": "Interested in viewing",
        "createdAt": "2024-11-01T10:00:00.000Z",
        "updatedAt": "2024-11-01T10:00:00.000Z"
      }
    ],
    "recentFurnitureRequests": [
      {
        "_id": "...",
        "furniture_id": "FURN-2024-1102-XYZ789",
        "furniture_name": "Sofa Set",
        "furniture_details": {
          "name": "Sofa Set",
          "furniture_id": "FURN-2024-1102-XYZ789",
          "category": "Furniture",
          "photos": ["https://..."]
        },
        "status": "Accepted",
        "listing_type": "Rent",
        "name": "John Doe",
        "email": "john@example.com",
        "phoneNumber": "1234567890",
        "message": "Want to rent",
        "createdAt": "2024-11-01T11:00:00.000Z",
        "updatedAt": "2024-11-01T11:00:00.000Z"
      }
    ],
    "recentServiceBookings": [
      {
        "_id": "...",
        "service_booking_id": "SB1234567890",
        "service_type": "plumbing",
        "name": "John Doe",
        "phone_number": "1234567890",
        "email": "john@example.com",
        "preferred_date": "2024-11-05T00:00:00.000Z",
        "preferred_time": "10:00",
        "alternate_date": null,
        "alternate_time": null,
        "service_address": "123 Main St, Mumbai",
        "additional_notes": "Urgent repair needed",
        "status": "requested",
        "created_at": "2024-11-01T12:00:00.000Z",
        "updated_at": "2024-11-01T12:00:00.000Z"
      }
    ],
    "activityLog": [
      {
        "action": "property_request",
        "timestamp": "2024-11-01T10:00:00.000Z",
        "details": {
          "property_id": "PROP-2024-1102-ABC123",
          "property_name": "Modern Apartment",
          "request_id": "..."
        }
      }
    ],
    "allPropertyRequests": [...],
    "allFurnitureRequests": [...],
    "allServiceBookings": [...]
  }
}
```

---

## 💻 JavaScript/Fetch Example

```javascript
// Function to fetch user dashboard
async function getUserDashboard() {
  const token = localStorage.getItem('token'); // Or your token storage method
  const apiUrl = 'http://localhost:3030/api/users/dashboard/me';
  
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch dashboard');
    }
    
    const data = await response.json();
    return data.data; // Returns the dashboard data object
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    throw error;
  }
}

// Usage
getUserDashboard()
  .then(dashboard => {
    console.log('User:', dashboard.user);
    console.log('Stats:', dashboard.stats);
    console.log('Recent Bookings:', dashboard.recentServiceBookings);
    console.log('All Bookings:', dashboard.allServiceBookings);
  })
  .catch(error => {
    console.error('Failed to load dashboard:', error);
  });
```

---

## ⚛️ React Component Example

```jsx
import React, { useState, useEffect } from 'react';

const UserDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const token = localStorage.getItem('token');
  
  useEffect(() => {
    fetchDashboard();
  }, []);
  
  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3030/api/users/dashboard/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard');
      }
      
      const data = await response.json();
      setDashboard(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!dashboard) return <div>No data available</div>;
  
  return (
    <div className="dashboard">
      {/* User Info */}
      <div className="user-section">
        <h2>Welcome, {dashboard.user.fullName}!</h2>
        <p>Email: {dashboard.user.email}</p>
        <p>Phone: {dashboard.user.phoneNumber}</p>
        {dashboard.user.profilePicture && (
          <img 
            src={`/uploads/profile-pictures/${dashboard.user.profilePicture}`} 
            alt="Profile" 
          />
        )}
      </div>
      
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>{dashboard.stats.totalPropertyRequests}</h3>
          <p>Property Requests</p>
        </div>
        <div className="stat-card">
          <h3>{dashboard.stats.totalFurnitureRequests}</h3>
          <p>Furniture Requests</p>
        </div>
        <div className="stat-card">
          <h3>{dashboard.stats.totalServiceBookings}</h3>
          <p>Service Bookings</p>
        </div>
        <div className="stat-card">
          <h3>{dashboard.stats.totalActivities}</h3>
          <p>Total Activities</p>
        </div>
      </div>
      
      {/* Service Bookings Section */}
      <div className="bookings-section">
        <h3>Service Bookings ({dashboard.stats.totalServiceBookings})</h3>
        {dashboard.allServiceBookings.length === 0 ? (
          <p>No service bookings yet</p>
        ) : (
          <div className="bookings-list">
            {dashboard.allServiceBookings.map(booking => (
              <div key={booking._id} className="booking-card">
                <div className="booking-header">
                  <span className="booking-id">#{booking.service_booking_id}</span>
                  <span className={`status-badge status-${booking.status}`}>
                    {booking.status.toUpperCase()}
                  </span>
                </div>
                <div className="booking-details">
                  <p><strong>Service:</strong> {booking.service_type}</p>
                  <p><strong>Date:</strong> {new Date(booking.preferred_date).toLocaleDateString()}</p>
                  <p><strong>Time:</strong> {booking.preferred_time}</p>
                  <p><strong>Address:</strong> {booking.service_address}</p>
                  {booking.additional_notes && (
                    <p><strong>Notes:</strong> {booking.additional_notes}</p>
                  )}
                </div>
                <div className="booking-footer">
                  <small>
                    Created: {new Date(booking.created_at).toLocaleString()}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Property Requests Section */}
      <div className="requests-section">
        <h3>Property Requests ({dashboard.stats.totalPropertyRequests})</h3>
        {dashboard.allPropertyRequests.length === 0 ? (
          <p>No property requests yet</p>
        ) : (
          <div className="requests-list">
            {dashboard.allPropertyRequests.map(request => (
              <div key={request._id} className="request-card">
                <div className="request-header">
                  <h4>{request.property_name}</h4>
                  <span className={`status-badge status-${request.status.toLowerCase()}`}>
                    {request.status}
                  </span>
                </div>
                {request.property_details && (
                  <div className="property-info">
                    {request.property_details.photos && request.property_details.photos.length > 0 && (
                      <img 
                        src={request.property_details.photos[0]} 
                        alt={request.property_name}
                        className="property-thumb"
                      />
                    )}
                    <p>Location: {request.property_details.location || 'N/A'}</p>
                  </div>
                )}
                <p>Message: {request.message}</p>
                <small>
                  Requested: {new Date(request.createdAt).toLocaleString()}
                </small>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Furniture Requests Section */}
      <div className="requests-section">
        <h3>Furniture Requests ({dashboard.stats.totalFurnitureRequests})</h3>
        {dashboard.allFurnitureRequests.length === 0 ? (
          <p>No furniture requests yet</p>
        ) : (
          <div className="requests-list">
            {dashboard.allFurnitureRequests.map(request => (
              <div key={request._id} className="request-card">
                <div className="request-header">
                  <h4>{request.furniture_name}</h4>
                  <span className={`status-badge status-${request.status.toLowerCase()}`}>
                    {request.status}
                  </span>
                </div>
                {request.furniture_details && (
                  <div className="furniture-info">
                    {request.furniture_details.photos && request.furniture_details.photos.length > 0 && (
                      <img 
                        src={request.furniture_details.photos[0]} 
                        alt={request.furniture_name}
                        className="furniture-thumb"
                      />
                    )}
                    <p>Category: {request.furniture_details.category || 'N/A'}</p>
                    <p>Type: {request.listing_type || 'N/A'}</p>
                  </div>
                )}
                <p>Message: {request.message}</p>
                <small>
                  Requested: {new Date(request.createdAt).toLocaleString()}
                </small>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Activity Log */}
      <div className="activity-section">
        <h3>Recent Activity ({dashboard.stats.totalActivities})</h3>
        {dashboard.activityLog.length === 0 ? (
          <p>No activities yet</p>
        ) : (
          <div className="activity-list">
            {dashboard.activityLog.map((activity, index) => (
              <div key={index} className="activity-item">
                <span className="activity-action">{activity.action}</span>
                <span className="activity-time">
                  {new Date(activity.timestamp).toLocaleString()}
                </span>
                {activity.details && (
                  <div className="activity-details">
                    {JSON.stringify(activity.details, null, 2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
```

---

## 🎨 CSS Styles Example

```css
.dashboard {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.stat-card {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

.stat-card h3 {
  font-size: 2em;
  margin: 0;
  color: #333;
}

.stat-card p {
  margin: 10px 0 0 0;
  color: #666;
}

.bookings-list, .requests-list, .activity-list {
  display: grid;
  gap: 15px;
  margin: 20px 0;
}

.booking-card, .request-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background: white;
}

.booking-header, .request-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85em;
  font-weight: bold;
}

.status-requested, .status-Requested {
  background: #fff3cd;
  color: #856404;
}

.status-accepted, .status-Accepted {
  background: #d4edda;
  color: #155724;
}

.status-ongoing, .status-Ongoing {
  background: #cce5ff;
  color: #004085;
}

.status-completed, .status-Completed {
  background: #d1ecf1;
  color: #0c5460;
}

.status-cancelled, .status-Cancelled {
  background: #f8d7da;
  color: #721c24;
}

.property-thumb, .furniture-thumb {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
  margin-right: 10px;
}

.activity-item {
  padding: 10px;
  border-left: 3px solid #007bff;
  margin: 10px 0;
  background: #f8f9fa;
}
```

---

## 📊 Service Booking Status Reference

**Status Values:**
- `requested` - Initial booking request
- `accepted` - Booking accepted by admin
- `ongoing` - Service in progress
- `completed` - Service completed
- `cancelled` - Booking cancelled

---

## 🔑 Key Points

1. **Service Bookings Matching:**
   - Matches by `userId` OR `email`
   - This means bookings created while logged in OR with your email will show

2. **Data Structure:**
   - `recentX` - Last 5 items (for quick overview)
   - `allX` - Complete list (for full history)

3. **Dates:**
   - Use `new Date(dateString).toLocaleString()` to format dates
   - `preferred_date` is a date object
   - `created_at` / `createdAt` are timestamps

4. **Property/Furniture Details:**
   - Includes full property/furniture information
   - Has photos array for displaying images
   - Shows name, location, category, etc.

---

## 🧪 Quick Test

```bash
# Get dashboard data
curl -X GET http://localhost:3030/api/users/dashboard/me \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 📝 Example: Display Service Bookings

```javascript
// Simple display function
function displayBookings(dashboard) {
  const bookings = dashboard.allServiceBookings;
  
  if (bookings.length === 0) {
    console.log('No bookings found');
    return;
  }
  
  bookings.forEach(booking => {
    console.log(`
      Booking ID: ${booking.service_booking_id}
      Service: ${booking.service_type}
      Date: ${new Date(booking.preferred_date).toLocaleDateString()}
      Time: ${booking.preferred_time}
      Status: ${booking.status}
      Address: ${booking.service_address}
    `);
  });
}
```

---

## ✅ Summary

**Dashboard Endpoint:** `GET /api/users/dashboard/me`

**Returns:**
- ✅ User information
- ✅ Statistics (totals)
- ✅ Recent items (last 5)
- ✅ All items (complete list)
- ✅ Activity log
- ✅ Property/furniture details with photos

**Service Bookings:**
- ✅ Matched by userId OR email
- ✅ Sorted by newest first
- ✅ Includes all booking details
- ✅ Shows status and timestamps

**All data is properly formatted and ready to display!**

