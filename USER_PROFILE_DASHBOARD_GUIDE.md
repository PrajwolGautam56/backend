# User Profile & Dashboard Guide

## 📍 Overview
Complete guide for users to view their profile, activity history, and dashboard.

---

## 🔐 Authentication Required
All endpoints require:
```
Authorization: Bearer <user-token>
```

---

## 📋 User Endpoints

### 1. **Get Own Profile**
```
GET http://localhost:3030/api/users/profile/me
```

#### Example Request:
```javascript
const getProfile = async () => {
  const response = await fetch(
    'http://localhost:3030/api/users/profile/me',
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }
  );
  
  return await response.json();
};
```

#### Response (200):
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "fullName": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "phoneNumber": "1234567890",
    "nationality": "India",
    "role": "user",
    "isVerified": true,
    "isAdmin": false,
    "profilePicture": "default-profile.png",
    "createdAt": "2024-10-27T20:00:00.000Z"
  }
}
```

---

### 2. **Update Own Profile**
```
PUT http://localhost:3030/api/users/profile/me
```

#### Request Body:
```javascript
{
  "fullName": "John Doe Updated",
  "phoneNumber": "9876543210",
  "profilePicture": "new-photo.jpg"
}
```

#### Example Request:
```javascript
const updateProfile = async (updates) => {
  const response = await fetch(
    'http://localhost:3030/api/users/profile/me',
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(updates)
    }
  );
  
  return await response.json();
};

// Usage:
await updateProfile({
  fullName: 'John Doe Updated',
  phoneNumber: '9876543210'
});
```

---

### 3. **Get Own Activity History**
```
GET http://localhost:3030/api/users/profile/activity
```

#### Example Request:
```javascript
const getActivityHistory = async () => {
  const response = await fetch(
    'http://localhost:3030/api/users/profile/activity',
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }
  );
  
  return await response.json();
};
```

#### Response (200):
```json
{
  "success": true,
  "data": {
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
    ],
    "totalActivities": 2
  }
}
```

---

### 4. **Get Own Dashboard** (Complete Overview)
```
GET http://localhost:3030/api/users/dashboard/me
```

#### Example Request:
```javascript
const getDashboard = async () => {
  const response = await fetch(
    'http://localhost:3030/api/users/dashboard/me',
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }
  );
  
  return await response.json();
};
```

#### Response (200):
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
        "_id": "...",
        "property_id": "PROP-2024-1028-ABC123",
        "name": "John Doe",
        "email": "john@example.com",
        "status": "Requested",
        "createdAt": "2024-10-27T20:00:00.000Z"
      }
    ],
    "recentFurnitureRequests": [
      {
        "_id": "...",
        "furniture_id": "FURN-2024-1028-XYZ789",
        "name": "John Doe",
        "listing_type": "Rent",
        "status": "Accepted",
        "createdAt": "2024-10-27T19:00:00.000Z"
      }
    ],
    "recentServiceBookings": [
      {
        "_id": "...",
        "service_booking_id": "SVC-2024-1028-123456",
        "service_type": "plumbing",
        "name": "John Doe",
        "status": "accepted",
        "createdAt": "2024-10-27T18:00:00.000Z"
      }
    ],
    "activityLog": [
      {
        "action": "property_request",
        "timestamp": "2024-10-27T20:00:00.000Z",
        "details": { /* ... */ }
      }
    ]
  }
}
```

---

## 🎨 Complete User Dashboard Component

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

const UserDashboard = () => {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        'http://localhost:3030/api/users/dashboard/me',
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();
      setDashboard(data.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!dashboard) return <div>No data available</div>;

  return (
    <div className="user-dashboard">
      <h1>Welcome, {dashboard.user}!</h1>

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

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'property' ? 'active' : ''}
          onClick={() => setActiveTab('property')}
        >
          Property Requests
        </button>
        <button 
          className={activeTab === 'furniture' ? 'active' : ''}
          onClick={() => setActiveTab('furniture')}
        >
          Furniture Requests
        </button>
        <button 
          className={activeTab === 'services' ? 'active' : ''}
          onClick={() => setActiveTab('services')}
        >
          Service Bookings
        </button>
        <button 
          className={activeTab === 'activity' ? 'active' : ''}
          onClick={() => setActiveTab('activity')}
        >
          Activity Log
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview">
            <h2>Recent Property Requests</h2>
            <table>
              <thead>
                <tr>
                  <th>Property ID</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentPropertyRequests.map((req) => (
                  <tr key={req._id}>
                    <td>{req.property_id}</td>
                    <td>{req.status}</td>
                    <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h2>Recent Furniture Requests</h2>
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
                {dashboard.recentFurnitureRequests.map((req) => (
                  <tr key={req._id}>
                    <td>{req.furniture_id}</td>
                    <td>{req.listing_type}</td>
                    <td>{req.status}</td>
                    <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="activity-log">
            <h2>Activity History</h2>
            <ul>
              {dashboard.activityLog.map((activity, index) => (
                <li key={index}>
                  <div className="activity-item">
                    <span className="action">{activity.action}</span>
                    <span className="timestamp">
                      {new Date(activity.timestamp).toLocaleString()}
                    </span>
                    <div className="details">
                      {JSON.stringify(activity.details, null, 2)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
```

---

## ✅ Summary

✅ **Get Profile** - View own profile information  
✅ **Update Profile** - Edit own information  
✅ **Activity History** - View activity log  
✅ **Dashboard** - Complete overview with stats and recent activity  
✅ **Submissions** - View all property/furniture/service requests

