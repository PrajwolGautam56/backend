# 👤 User Dashboard - Complete Implementation Guide

## 📋 Overview

Complete guide for building a user dashboard that shows:
- ✅ Furniture Requests (History & Status)
- ✅ Service Bookings (History & Status)
- ✅ Property Requests (History & Status)
- ✅ Current Rentals (Active Orders & Details)
- ✅ Payment History
- ✅ Activity Log

---

## 🔧 Backend API Endpoints

### 1. Complete Dashboard Data (All-in-One)

**Endpoint:** `GET /api/users/dashboard/me`

**Description:** Returns all user data in one call - perfect for dashboard overview

**Request:**
```http
GET /api/users/dashboard/me
Authorization: Bearer {user_token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user_id",
      "fullName": "John Doe",
      "email": "john@example.com",
      "username": "johndoe",
      "phoneNumber": "+919876543210",
      "profilePicture": "url",
      "isVerified": true
    },
    "stats": {
      "totalPropertyRequests": 5,
      "totalFurnitureRequests": 8,
      "totalServiceBookings": 3,
      "totalContactInquiries": 2,
      "totalRentals": 4,
      "activeRentals": 2,
      "totalActivities": 15,
      "totalSubmissions": 22
    },
    "recentPropertyRequests": [ /* last 5 */ ],
    "recentFurnitureRequests": [ /* last 5 */ ],
    "recentServiceBookings": [ /* last 5 */ ],
    "recentContactInquiries": [ /* last 5 */ ],
    "recentRentals": [ /* last 5 */ ],
    "activityLog": [ /* last 10 activities */ ],
    "allPropertyRequests": [ /* all requests */ ],
    "allFurnitureRequests": [ /* all requests */ ],
    "allServiceBookings": [ /* all bookings */ ],
    "allContactInquiries": [ /* all inquiries */ ],
    "allRentals": [ /* all rentals */ ]
  }
}
```

---

### 2. My Rentals (Cart Orders)

**Endpoint:** `GET /api/rentals/my-rentals`

**Description:** Get all rental orders placed by user

**Request:**
```http
GET /api/rentals/my-rentals
Authorization: Bearer {user_token}
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "rental_id",
      "rental_id": "RENT-2025-1209-F4751D",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "items": [
        {
          "product_id": "furniture_id",
          "product_name": "Modern Sofa Set",
          "quantity": 2,
          "monthly_price": 5000,
          "deposit": 10000
        }
      ],
      "total_monthly_amount": 10000,
      "total_deposit": 20000,
      "delivery_charge": 500,
      "total_amount": 30500,
      "status": "Active",
      "order_status": "Pending",
      "payment_method": "COD",
      "order_placed_at": "2024-12-09T06:08:42.159Z",
      "delivery_date": "2024-12-20T00:00:00.000Z",
      "payment_records": [ /* payment history */ ],
      "payment_summary": {
        "monthly_rent": 10000,
        "total_pending": 5000,
        "total_overdue": 2000,
        "total_paid": 3000,
        "pending_count": 2,
        "overdue_count": 1,
        "paid_count": 1
      }
    }
  ]
}
```

---

### 3. My Service Bookings

**Endpoint:** `GET /api/service-bookings/my-bookings`

**Description:** Get all service bookings by user

**Request:**
```http
GET /api/service-bookings/my-bookings
Authorization: Bearer {user_token}
```

**Response (200):**
```json
[
  {
    "_id": "booking_id",
    "service_booking_id": "SVC-2024-1209-ABC123",
    "service_type": "Cleaning",
    "name": "John Doe",
    "email": "john@example.com",
    "phone_number": "+919876543210",
    "preferred_date": "2024-12-15T00:00:00.000Z",
    "preferred_time": "10:00 AM",
    "service_address": "123 Main St, Bangalore",
    "status": "Confirmed",
    "created_at": "2024-12-09T10:00:00.000Z",
    "updated_at": "2024-12-09T10:00:00.000Z"
  }
]
```

---

### 4. Pending/Overdue Payments

**Endpoint:** `GET /api/rentals/pending-overdue`

**Description:** Get all pending and overdue payment records

**Request:**
```http
GET /api/rentals/pending-overdue
Authorization: Bearer {user_token}
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "rental_id": "RENT-2025-1209-F4751D",
      "rental": { /* full rental object */ },
      "pending_payments": [
        {
          "_id": "payment_id",
          "month": "December 2024",
          "amount": 5000,
          "due_date": "2024-12-15T00:00:00.000Z",
          "status": "Pending"
        }
      ],
      "overdue_payments": [
        {
          "_id": "payment_id",
          "month": "November 2024",
          "amount": 5000,
          "due_date": "2024-11-15T00:00:00.000Z",
          "status": "Overdue"
        }
      ]
    }
  ]
}
```

---

### 5. Activity History

**Endpoint:** `GET /api/users/profile/activity`

**Description:** Get user's activity log

**Request:**
```http
GET /api/users/profile/activity
Authorization: Bearer {user_token}
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "action": "service_booking",
      "timestamp": "2024-12-09T10:00:00.000Z",
      "details": {
        "service_type": "Cleaning",
        "booking_id": "SVC-2024-1209-ABC123"
      }
    },
    {
      "action": "property_request",
      "timestamp": "2024-12-08T15:00:00.000Z",
      "details": {
        "property_id": "PROP-2024-1208-XYZ",
        "property_name": "Modern Apartment"
      }
    }
  ]
}
```

---

## 💻 Frontend Implementation

### Service: User Dashboard Service

**Create `services/userDashboardService.js`:**

```javascript
import api from './axiosConfig';

// Get complete dashboard data
export const getDashboard = async () => {
  try {
    const response = await api.get('/api/users/dashboard/me');
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    throw error;
  }
};

// Get my rentals
export const getMyRentals = async () => {
  try {
    const response = await api.get('/api/rentals/my-rentals');
    return response.data;
  } catch (error) {
    console.error('Error fetching rentals:', error);
    throw error;
  }
};

// Get my service bookings
export const getMyServiceBookings = async () => {
  try {
    const response = await api.get('/api/service-bookings/my-bookings');
    return response.data;
  } catch (error) {
    console.error('Error fetching service bookings:', error);
    throw error;
  }
};

// Get pending/overdue payments
export const getPendingOverduePayments = async () => {
  try {
    const response = await api.get('/api/rentals/pending-overdue');
    return response.data;
  } catch (error) {
    console.error('Error fetching payments:', error);
    throw error;
  }
};

// Get activity history
export const getActivityHistory = async () => {
  try {
    const response = await api.get('/api/users/profile/activity');
    return response.data;
  } catch (error) {
    console.error('Error fetching activity:', error);
    throw error;
  }
};
```

---

### Component: User Dashboard

**Create `pages/UserDashboard.jsx`:**

```jsx
import React, { useState, useEffect } from 'react';
import { getDashboard } from '../services/userDashboardService';
import { toast } from 'react-toastify';

const UserDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await getDashboard();
      setDashboard(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (!dashboard) {
    return <div>No data available</div>;
  }

  return (
    <div className="user-dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {dashboard.user.fullName}!</h1>
        <div className="user-info">
          <p>{dashboard.user.email}</p>
          <p>{dashboard.user.phoneNumber}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>{dashboard.stats.totalRentals}</h3>
          <p>Total Orders</p>
        </div>
        <div className="stat-card">
          <h3>{dashboard.stats.activeRentals}</h3>
          <p>Active Rentals</p>
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
          <h3>{dashboard.stats.totalPropertyRequests}</h3>
          <p>Property Requests</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'rentals' ? 'active' : ''}
          onClick={() => setActiveTab('rentals')}
        >
          My Orders ({dashboard.stats.totalRentals})
        </button>
        <button 
          className={activeTab === 'furniture' ? 'active' : ''}
          onClick={() => setActiveTab('furniture')}
        >
          Furniture Requests ({dashboard.stats.totalFurnitureRequests})
        </button>
        <button 
          className={activeTab === 'services' ? 'active' : ''}
          onClick={() => setActiveTab('services')}
        >
          Service Bookings ({dashboard.stats.totalServiceBookings})
        </button>
        <button 
          className={activeTab === 'properties' ? 'active' : ''}
          onClick={() => setActiveTab('properties')}
        >
          Property Requests ({dashboard.stats.totalPropertyRequests})
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
          <OverviewTab dashboard={dashboard} />
        )}
        {activeTab === 'rentals' && (
          <RentalsTab rentals={dashboard.allRentals} />
        )}
        {activeTab === 'furniture' && (
          <FurnitureRequestsTab requests={dashboard.allFurnitureRequests} />
        )}
        {activeTab === 'services' && (
          <ServiceBookingsTab bookings={dashboard.allServiceBookings} />
        )}
        {activeTab === 'properties' && (
          <PropertyRequestsTab requests={dashboard.allPropertyRequests} />
        )}
        {activeTab === 'activity' && (
          <ActivityTab activities={dashboard.activityLog} />
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
```

---

### Component: Overview Tab

```jsx
const OverviewTab = ({ dashboard }) => {
  return (
    <div className="overview-tab">
      <h2>Recent Activity</h2>
      
      {/* Recent Rentals */}
      <section>
        <h3>Recent Orders</h3>
        {dashboard.recentRentals.length === 0 ? (
          <p>No orders yet</p>
        ) : (
          <div className="items-list">
            {dashboard.recentRentals.map((rental) => (
              <div key={rental._id} className="item-card">
                <div className="item-header">
                  <h4>Order: {rental.rental_id}</h4>
                  <span className={`status-badge ${rental.order_status?.toLowerCase()}`}>
                    {rental.order_status}
                  </span>
                </div>
                <p>Items: {rental.items?.length || 0}</p>
                <p>Total: ₹{rental.total_amount?.toLocaleString()}</p>
                <p>Date: {new Date(rental.order_placed_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Furniture Requests */}
      <section>
        <h3>Recent Furniture Requests</h3>
        {dashboard.recentFurnitureRequests.length === 0 ? (
          <p>No furniture requests yet</p>
        ) : (
          <div className="items-list">
            {dashboard.recentFurnitureRequests.map((request) => (
              <div key={request._id} className="item-card">
                <h4>{request.furniture_name || 'Furniture Request'}</h4>
                <p>Status: {request.status}</p>
                <p>Date: {new Date(request.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Service Bookings */}
      <section>
        <h3>Recent Service Bookings</h3>
        {dashboard.recentServiceBookings.length === 0 ? (
          <p>No service bookings yet</p>
        ) : (
          <div className="items-list">
            {dashboard.recentServiceBookings.map((booking) => (
              <div key={booking._id} className="item-card">
                <h4>{booking.service_type}</h4>
                <p>Status: {booking.status}</p>
                <p>Date: {new Date(booking.preferred_date || booking.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
```

---

### Component: Rentals Tab

```jsx
const RentalsTab = ({ rentals }) => {
  return (
    <div className="rentals-tab">
      <h2>My Orders</h2>
      
      {rentals.length === 0 ? (
        <div className="empty-state">
          <p>No orders yet</p>
          <button onClick={() => navigate('/furniture')}>Browse Furniture</button>
        </div>
      ) : (
        <div className="rentals-list">
          {rentals.map((rental) => (
            <div key={rental._id} className="rental-card">
              <div className="rental-header">
                <div>
                  <h3>Order #{rental.rental_id}</h3>
                  <p>Placed on {new Date(rental.order_placed_at).toLocaleDateString()}</p>
                </div>
                <div className="status-section">
                  <span className={`status-badge ${rental.order_status?.toLowerCase()}`}>
                    {rental.order_status}
                  </span>
                  <span className={`status-badge ${rental.status?.toLowerCase()}`}>
                    {rental.status}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="rental-items">
                <h4>Items ({rental.items?.length || 0})</h4>
                {rental.items?.map((item, index) => (
                  <div key={index} className="rental-item">
                    <p>{item.product_name} x {item.quantity}</p>
                    <p>₹{item.monthly_price}/month</p>
                  </div>
                ))}
              </div>

              {/* Payment Summary */}
              {rental.payment_summary && (
                <div className="payment-summary">
                  <h4>Payment Summary</h4>
                  <div className="summary-row">
                    <span>Monthly Rent:</span>
                    <span>₹{rental.payment_summary.monthly_rent?.toLocaleString()}</span>
                  </div>
                  <div className="summary-row">
                    <span>Pending:</span>
                    <span className="text-warning">₹{rental.payment_summary.total_pending?.toLocaleString()}</span>
                  </div>
                  <div className="summary-row">
                    <span>Overdue:</span>
                    <span className="text-danger">₹{rental.payment_summary.total_overdue?.toLocaleString()}</span>
                  </div>
                  <div className="summary-row">
                    <span>Paid:</span>
                    <span className="text-success">₹{rental.payment_summary.total_paid?.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Delivery Info */}
              {rental.delivery_date && (
                <div className="delivery-info">
                  <p><strong>Expected Delivery:</strong> {new Date(rental.delivery_date).toLocaleDateString()}</p>
                </div>
              )}

              {/* Actions */}
              <div className="rental-actions">
                <button onClick={() => navigate(`/orders/${rental.rental_id}`)}>
                  View Details
                </button>
                {rental.order_status === 'Delivered' && (
                  <button onClick={() => navigate(`/orders/${rental.rental_id}/review`)}>
                    Write Review
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

### Component: Furniture Requests Tab

```jsx
const FurnitureRequestsTab = ({ requests }) => {
  return (
    <div className="furniture-requests-tab">
      <h2>Furniture Requests</h2>
      
      {requests.length === 0 ? (
        <div className="empty-state">
          <p>No furniture requests yet</p>
          <button onClick={() => navigate('/furniture')}>Browse Furniture</button>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map((request) => (
            <div key={request._id} className="request-card">
              <div className="request-header">
                <h3>{request.furniture_name || 'Furniture Request'}</h3>
                <span className={`status-badge ${request.status?.toLowerCase()}`}>
                  {request.status}
                </span>
              </div>
              
              <div className="request-details">
                <p><strong>Type:</strong> {request.listing_type}</p>
                <p><strong>Message:</strong> {request.message || 'No message'}</p>
                <p><strong>Date:</strong> {new Date(request.createdAt).toLocaleDateString()}</p>
                {request.payment_status && (
                  <p><strong>Payment:</strong> {request.payment_status}</p>
                )}
                {request.scheduled_delivery_date && (
                  <p><strong>Delivery:</strong> {new Date(request.scheduled_delivery_date).toLocaleDateString()}</p>
                )}
              </div>

              <div className="request-actions">
                <button onClick={() => navigate(`/furniture/${request.furniture_id}`)}>
                  View Furniture
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

### Component: Service Bookings Tab

```jsx
const ServiceBookingsTab = ({ bookings }) => {
  return (
    <div className="service-bookings-tab">
      <h2>Service Bookings</h2>
      
      {bookings.length === 0 ? (
        <div className="empty-state">
          <p>No service bookings yet</p>
          <button onClick={() => navigate('/services')}>Book a Service</button>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings.map((booking) => (
            <div key={booking._id} className="booking-card">
              <div className="booking-header">
                <h3>{booking.service_type}</h3>
                <span className={`status-badge ${booking.status?.toLowerCase()}`}>
                  {booking.status}
                </span>
              </div>
              
              <div className="booking-details">
                <p><strong>Booking ID:</strong> {booking.service_booking_id}</p>
                <p><strong>Date:</strong> {new Date(booking.preferred_date || booking.created_at).toLocaleDateString()}</p>
                <p><strong>Time:</strong> {booking.preferred_time}</p>
                <p><strong>Address:</strong> {booking.service_address}</p>
                {booking.additional_notes && (
                  <p><strong>Notes:</strong> {booking.additional_notes}</p>
                )}
              </div>

              <div className="booking-actions">
                <button onClick={() => navigate(`/bookings/${booking._id}`)}>
                  View Details
                </button>
                {booking.status === 'Pending' && (
                  <button onClick={() => handleCancelBooking(booking._id)}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

### Component: Property Requests Tab

```jsx
const PropertyRequestsTab = ({ requests }) => {
  return (
    <div className="property-requests-tab">
      <h2>Property Requests</h2>
      
      {requests.length === 0 ? (
        <div className="empty-state">
          <p>No property requests yet</p>
          <button onClick={() => navigate('/properties')}>Browse Properties</button>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map((request) => (
            <div key={request._id} className="request-card">
              <div className="request-header">
                <h3>{request.property_name || 'Property Request'}</h3>
                <span className={`status-badge ${request.status?.toLowerCase()}`}>
                  {request.status}
                </span>
              </div>
              
              <div className="request-details">
                <p><strong>Message:</strong> {request.message || 'No message'}</p>
                <p><strong>Date:</strong> {new Date(request.createdAt).toLocaleDateString()}</p>
              </div>

              <div className="request-actions">
                <button onClick={() => navigate(`/properties/${request.property_id}`)}>
                  View Property
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

### Component: Activity Tab

```jsx
const ActivityTab = ({ activities }) => {
  return (
    <div className="activity-tab">
      <h2>Activity Log</h2>
      
      {activities.length === 0 ? (
        <p>No activity yet</p>
      ) : (
        <div className="activity-timeline">
          {activities.map((activity, index) => (
            <div key={index} className="activity-item">
              <div className="activity-icon">
                {getActivityIcon(activity.action)}
              </div>
              <div className="activity-content">
                <h4>{formatActivityAction(activity.action)}</h4>
                <p>{formatActivityDetails(activity.details)}</p>
                <p className="activity-time">
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const getActivityIcon = (action) => {
  const icons = {
    'service_booking': '📅',
    'property_request': '🏠',
    'furniture_request': '🪑',
    'rental_order': '🛒',
    'payment': '💳',
    'view_service_bookings': '👁️'
  };
  return icons[action] || '📝';
};

const formatActivityAction = (action) => {
  return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const formatActivityDetails = (details) => {
  if (!details) return '';
  return Object.entries(details).map(([key, value]) => `${key}: ${value}`).join(', ');
};
```

---

## 🎨 CSS Styling

```css
.user-dashboard {
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
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
}

.stat-card h3 {
  font-size: 2em;
  margin: 0;
  color: #333;
}

.dashboard-tabs {
  display: flex;
  gap: 10px;
  margin: 20px 0;
  border-bottom: 2px solid #eee;
}

.dashboard-tabs button {
  padding: 10px 20px;
  border: none;
  background: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

.dashboard-tabs button.active {
  border-bottom-color: #007bff;
  color: #007bff;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.status-badge.pending { background: #fff3cd; color: #856404; }
.status-badge.confirmed { background: #d4edda; color: #155724; }
.status-badge.delivered { background: #d1ecf1; color: #0c5460; }
.status-badge.cancelled { background: #f8d7da; color: #721c24; }

.rental-card, .request-card, .booking-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}
```

---

## ✅ Summary

**Available Endpoints:**
1. ✅ `GET /api/users/dashboard/me` - Complete dashboard (all data)
2. ✅ `GET /api/rentals/my-rentals` - User's orders
3. ✅ `GET /api/service-bookings/my-bookings` - Service bookings
4. ✅ `GET /api/rentals/pending-overdue` - Pending payments
5. ✅ `GET /api/users/profile/activity` - Activity log

**Features:**
- ✅ Complete dashboard overview
- ✅ All rentals/orders with status
- ✅ Furniture requests history
- ✅ Service bookings history
- ✅ Property requests history
- ✅ Payment tracking
- ✅ Activity log

**Ready to implement!** 🚀

