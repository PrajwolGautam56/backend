# Dashboard API - Request & Response Examples

## 📍 Endpoint
```
GET http://localhost:3030/api/users/dashboard/me
```

**Requires Authentication:**
```
Authorization: Bearer <user-token>
```

---

## 📤 Complete Request Example

```javascript
// Get Dashboard Data
const getDashboard = async () => {
  const token = localStorage.getItem('token'); // Get token from storage
  
  const response = await fetch(
    'http://localhost:3030/api/users/dashboard/me',
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    console.error('Error:', response.status, response.statusText);
    return null;
  }

  const data = await response.json();
  return data;
};

// Usage
const dashboardData = await getDashboard();
console.log(dashboardData);
```

---

## 📥 Complete Response Example

```json
{
  "success": true,
  "data": {
    "user": "John Doe",
    "stats": {
      "totalPropertyRequests": 5,
      "totalFurnitureRequests": 3,
      "totalServiceBookings": 8,
      "totalActivities": 16
    },
    "recentPropertyRequests": [
      {
        "_id": "68ffd8d71693c6b46cf59b7d",
        "property_id": "PROP-2024-1028-ABC123",
        "name": "John Doe",
        "email": "john@example.com",
        "phoneNumber": "1234567890",
        "message": "I want to visit this property",
        "status": "Requested",
        "createdAt": "2024-10-27T20:00:00.000Z",
        "updatedAt": "2024-10-27T20:00:00.000Z"
      }
    ],
    "recentFurnitureRequests": [
      {
        "_id": "68ffd8d71693c6b46cf59b8d",
        "furniture_id": "FURN-2024-1028-XYZ789",
        "name": "John Doe",
        "email": "john@example.com",
        "phoneNumber": "1234567890",
        "message": "I want to rent this sofa",
        "listing_type": "Rent",
        "status": "Accepted",
        "createdAt": "2024-10-27T19:00:00.000Z",
        "updatedAt": "2024-10-27T20:30:00.000Z"
      }
    ],
    "recentServiceBookings": [
      {
        "_id": "68ffd8d71693c6b46cf59b9d",
        "service_booking_id": "SVC-2024-1028-123456",
        "service_type": "plumbing",
        "name": "John Doe",
        "phone_number": "1234567890",
        "email": "john@example.com",
        "preferred_date": "2024-10-28T00:00:00.000Z",
        "preferred_time": "10:00",
        "service_address": "123 Main St",
        "status": "accepted",
        "createdAt": "2024-10-27T18:00:00.000Z",
        "updatedAt": "2024-10-27T18:30:00.000Z"
      }
    ],
    "activityLog": [
      {
        "action": "property_request",
        "timestamp": "2024-10-27T20:00:00.000Z",
        "details": {
          "property_id": "PROP-2024-1028-ABC123",
          "property_name": "Modern Apartment"
        }
      },
      {
        "action": "furniture_request",
        "timestamp": "2024-10-27T19:00:00.000Z",
        "details": {
          "furniture_id": "FURN-2024-1028-XYZ789",
          "furniture_name": "Sofa Set",
          "listing_type": "Rent"
        }
      }
    ]
  }
}
```

---

## 🎨 Complete Dashboard Component Example

```typescript
import { useState, useEffect } from 'react';

interface DashboardData {
  user: string;
  stats: {
    totalPropertyRequests: number;
    totalFurnitureRequests: number;
    totalServiceBookings: number;
    totalActivities: number;
  };
  recentPropertyRequests: any[];
  recentFurnitureRequests: any[];
  recentServiceBookings: any[];
  activityLog: any[];
}

const Dashboard = () => {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Please login to view dashboard');
        setLoading(false);
        return;
      }

      const response = await fetch(
        'http://localhost:3030/api/users/dashboard/me',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setDashboard(result.data);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!dashboard) {
    return <div>No data available</div>;
  }

  return (
    <div className="dashboard">
      <h1>Welcome, {dashboard.user}!</h1>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{dashboard.stats.totalPropertyRequests}</div>
          <div className="stat-label">Property Requests</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{dashboard.stats.totalFurnitureRequests}</div>
          <div className="stat-label">Furniture Requests</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{dashboard.stats.totalServiceBookings}</div>
          <div className="stat-label">Service Bookings</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{dashboard.stats.totalActivities}</div>
          <div className="stat-label">Activities</div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="section">
        <h2>Recent Property Requests</h2>
        {dashboard.recentPropertyRequests.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Property ID</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recentPropertyRequests.map((request) => (
                <tr key={request._id}>
                  <td>{request.property_id}</td>
                  <td><span className={`status-${request.status.toLowerCase()}`}>{request.status}</span></td>
                  <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No property requests yet</p>
        )}
      </div>

      {/* Recent Furniture Requests */}
      <div className="section">
        <h2>Recent Furniture Requests</h2>
        {dashboard.recentFurnitureRequests.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Furniture ID</th>
                <th>Type</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recentFurnitureRequests.map((request) => (
                <tr key={request._id}>
                  <td>{request.furniture_id}</td>
                  <td>{request.listing_type}</td>
                  <td><span className={`status-${request.status.toLowerCase()}`}>{request.status}</span></td>
                  <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No furniture requests yet</p>
        )}
      </div>

      {/* Recent Service Bookings */}
      <div className="section">
        <h2>Recent Service Bookings</h2>
        {dashboard.recentServiceBookings.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Service Type</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recentServiceBookings.map((booking) => (
                <tr key={booking._id}>
                  <td>{booking.service_type}</td>
                  <td>{new Date(booking.preferred_date).toLocaleDateString()}</td>
                  <td><span className={`status-${booking.status.toLowerCase()}`}>{booking.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No service bookings yet</p>
        )}
      </div>

      {/* Activity Log */}
      <div className="section">
        <h2>Activity Log</h2>
        {dashboard.activityLog.length > 0 ? (
          <div className="activity-list">
            {dashboard.activityLog.map((activity, index) => (
              <div key={index} className="activity-item">
                <span className="activity-action">{activity.action}</span>
                <span className="activity-time">
                  {new Date(activity.timestamp).toLocaleString()}
                </span>
                <div className="activity-details">
                  {JSON.stringify(activity.details)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No activities recorded</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
```

---

## 🔍 Test the API Directly

### Using cURL:
```bash
curl -X GET http://localhost:3030/api/users/dashboard/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### Using Postman:
1. Method: `GET`
2. URL: `http://localhost:3030/api/users/dashboard/me`
3. Headers:
   - `Authorization: Bearer YOUR_TOKEN`
   - `Content-Type: application/json`

---

## ❌ Common Error Responses

### Unauthorized (401):
```json
{
  "message": "Unauthorized"
}
```

### Not Found (404):
```json
{
  "message": "User not found"
}
```

### Server Error (500):
```json
{
  "message": "Error fetching dashboard",
  "error": "..."
}
```

---

## ✅ Quick Test Checklist

1. ✅ User is logged in
2. ✅ Token is valid and not expired
3. ✅ Backend is running on port 3030
4. ✅ MongoDB is connected
5. ✅ User has submitted requests (to see data in dashboard)

---

## 🐛 Debugging

If dashboard is empty:
```javascript
// Check if user is logged in
console.log('Token:', localStorage.getItem('token'));

// Check API response
const response = await fetch('http://localhost:3030/api/users/dashboard/me', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
});
const data = await response.json();
console.log('Dashboard Data:', data);
```

