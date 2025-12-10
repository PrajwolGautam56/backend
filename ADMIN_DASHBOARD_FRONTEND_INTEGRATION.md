# 🎨 Admin Dashboard - Frontend Integration Guide

## 🚀 Quick Start - Replace Demo Data with Real Data

### Step 1: Replace Home Tab Statistics

**Before (Demo Data):**
```typescript
const stats = {
  totalProperties: 245,
  activeUsers: 1200,
  serviceRequests: 89,
  totalRevenue: 2400000
};
```

**After (Real Data from API):**
```typescript
import { useEffect, useState } from 'react';
import api from '../services/api';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/api/admin/dashboard/overview', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  };

  if (!dashboardData) return <div>Loading...</div>;

  return (
    <div>
      <StatCard
        title="Total Properties"
        value={dashboardData.totalProperties.count}
        change={dashboardData.totalProperties.change}
        changeType={dashboardData.totalProperties.changeType}
      />
      {/* ... other cards */}
    </div>
  );
};
```

---

## 📊 API Endpoint Details

### Home Tab - Dashboard Overview

**Endpoint:** `GET /api/admin/dashboard/overview`

**Headers:**
```
Authorization: Bearer {admin_token}
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "totalProperties": {
      "count": 245,
      "change": 12,
      "changeType": "increase",
      "available": 180,
      "sold": 45,
      "pending": 20
    },
    "activeUsers": {
      "count": 1200,
      "change": 8,
      "changeType": "increase",
      "verified": 1100,
      "unverified": 100,
      "newThisMonth": 150
    },
    "serviceRequests": {
      "count": 89,
      "change": -2,
      "changeType": "decrease",
      "pending": 25,
      "accepted": 30,
      "ongoing": 15,
      "completed": 19
    },
    "totalRevenue": {
      "amount": 2400000,
      "currency": "INR",
      "change": 18,
      "changeType": "increase",
      "thisMonth": 450000,
      "lastMonth": 380000,
      "rentalRevenue": 1800000,
      "furnitureRevenue": 500000,
      "serviceRevenue": 100000
    },
    "recentProperties": [
      {
        "_id": "property_id",
        "name": "Brigade meadows",
        "address": {
          "city": "Bangalore",
          "state": "Karnataka",
          "street": "Brigade Meadows, Kaggalipura"
        },
        "status": "Available",
        "property_type": "Residential",
        "listing_type": "Rent",
        "photos": ["url1", "url2"],
        "createdAt": "2025-12-10T10:00:00Z"
      }
    ],
    "recentActivities": [
      {
        "type": "property_added",
        "title": "3 BHK Apartment in HSR Layout",
        "description": "New property added",
        "timestamp": "2025-12-10T08:00:00Z",
        "user": {
          "name": "Admin User",
          "email": "admin@brokerin.com"
        }
      },
      {
        "type": "service_request",
        "title": "Plumbing Service Request",
        "description": "New service booking",
        "timestamp": "2025-12-10T05:00:00Z",
        "status": "Pending",
        "customer": {
          "name": "John Doe",
          "email": "john@example.com"
        }
      },
      {
        "type": "user_registration",
        "title": "New User Registration",
        "description": "User signed up",
        "timestamp": "2025-12-10T03:00:00Z",
        "user": {
          "name": "Jane Smith",
          "email": "jane@example.com"
        }
      }
    ],
    "quickStats": {
      "totalFurnitureItems": 156,
      "activeRentals": 45,
      "pendingPayments": 12,
      "overduePayments": 5,
      "totalBookings": 89,
      "todayBookings": 8
    }
  }
}
```

---

## 🎯 Component Examples

### StatCard Component
```typescript
interface StatCardProps {
  title: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, changeType }) => {
  return (
    <div className="stat-card">
      <h3>{title}</h3>
      <div className="stat-value">{value}</div>
      {change !== undefined && (
        <div className={`stat-change ${changeType}`}>
          {changeType === 'increase' ? '↑' : '↓'} {change}%
        </div>
      )}
    </div>
  );
};
```

### Recent Properties Component
```typescript
const RecentProperties: React.FC<{ properties: any[] }> = ({ properties }) => {
  return (
    <div className="recent-properties">
      <h2>Recent Properties</h2>
      {properties.map(property => (
        <div key={property._id} className="property-card">
          <img src={property.photos?.[0]} alt={property.name} />
          <div>
            <h4>{property.name}</h4>
            <p>{property.address?.city}, {property.address?.state}</p>
            <span className={`status ${property.status.toLowerCase()}`}>
              {property.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
```

### Recent Activities Component
```typescript
const RecentActivities: React.FC<{ activities: any[] }> = ({ activities }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'property_added': return '🏠';
      case 'service_request': return '🔧';
      case 'user_registration': return '👤';
      default: return '📋';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${Math.floor(hours / 24)} day${Math.floor(hours / 24) > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="recent-activities">
      <h2>Recent Activities</h2>
      {activities.map((activity, index) => (
        <div key={index} className="activity-item">
          <span className="activity-icon">{getActivityIcon(activity.type)}</span>
          <div className="activity-content">
            <h4>{activity.title}</h4>
            <p>{activity.description}</p>
            <span className="activity-time">{formatTime(activity.timestamp)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

## 📈 Analytics Tab - Features to Implement

### 1. Revenue Analytics
- **Endpoint:** `GET /api/admin/analytics/revenue?period=monthly`
- **Features:**
  - Line chart showing revenue trends
  - Pie chart for revenue by category
  - Bar chart for payment methods
  - Revenue forecast

### 2. User Analytics
- **Endpoint:** `GET /api/admin/analytics/users?period=monthly`
- **Features:**
  - User growth chart
  - Engagement metrics
  - User retention funnel
  - Activity heatmap

### 3. Property Analytics
- **Endpoint:** `GET /api/admin/analytics/properties`
- **Features:**
  - Property listing performance
  - Most viewed properties table
  - Conversion rate metrics
  - Location-based map

### 4. Furniture Analytics
- **Endpoint:** `GET /api/admin/analytics/furniture`
- **Features:**
  - Best selling items chart
  - Stock level indicators
  - Category performance
  - Low stock alerts

### 5. Service Analytics
- **Endpoint:** `GET /api/admin/analytics/services`
- **Features:**
  - Booking trends chart
  - Service type breakdown
  - Completion rate metrics
  - Average service time

### 6. Rental Analytics
- **Endpoint:** `GET /api/admin/analytics/rentals`
- **Features:**
  - Rental order trends
  - Payment collection rates
  - Overdue payment analysis
  - Customer lifetime value

**Note:** Analytics endpoints need to be implemented in the backend. Use the guide in `ADMIN_DASHBOARD_COMPLETE_GUIDE.md` for implementation details.

---

## ⚙️ Settings Tab - Features to Implement

### 1. System Settings
- Email configuration (SMTP, Resend, Zepto)
- Payment gateway settings (Razorpay)
- Cloudinary configuration
- Google OAuth settings

### 2. Business Settings
- Company information
- Contact details
- Business hours
- Terms & conditions
- Privacy policy

### 3. Notification Settings
- Email notification preferences
- SMS notification settings
- Reminder schedules

### 4. User Management Settings
- Default user roles
- User verification requirements
- Password policies

### 5. Content Management
- Homepage banners
- Featured properties
- Featured furniture

**Note:** Settings endpoints need to be implemented in the backend. Use the guide in `ADMIN_DASHBOARD_COMPLETE_GUIDE.md` for implementation details.

---

## 🔄 Data Refresh Strategy

### Option 1: Auto-refresh every 30 seconds
```typescript
useEffect(() => {
  fetchDashboardData();
  const interval = setInterval(fetchDashboardData, 30000); // 30 seconds
  return () => clearInterval(interval);
}, []);
```

### Option 2: Manual refresh button
```typescript
const [refreshing, setRefreshing] = useState(false);

const handleRefresh = async () => {
  setRefreshing(true);
  await fetchDashboardData();
  setRefreshing(false);
};
```

### Option 3: Refresh on tab focus
```typescript
useEffect(() => {
  const handleFocus = () => {
    fetchDashboardData();
  };
  window.addEventListener('focus', handleFocus);
  return () => window.removeEventListener('focus', handleFocus);
}, []);
```

---

## 🎨 UI/UX Recommendations

1. **Loading States**: Show skeleton loaders while data is fetching
2. **Error Handling**: Display user-friendly error messages
3. **Empty States**: Show helpful messages when no data is available
4. **Real-time Updates**: Use WebSockets or polling for live updates
5. **Responsive Design**: Ensure dashboard works on all screen sizes
6. **Accessibility**: Add proper ARIA labels and keyboard navigation

---

## 📝 Example Complete Dashboard Component

```typescript
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import StatCard from '../components/StatCard';
import RecentProperties from '../components/RecentProperties';
import RecentActivities from '../components/RecentActivities';

const AdminDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const response = await api.get('/api/admin/dashboard/overview', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="skeleton-loader">
          {/* Skeleton UI */}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
        <button onClick={fetchDashboardData}>Retry</button>
      </div>
    );
  }

  if (!dashboardData) {
    return <div>No data available</div>;
  }

  return (
    <div className="admin-dashboard">
      <h1>Dashboard Overview</h1>
      <p>Welcome back! Here's what's happening with your properties today.</p>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <StatCard
          title="Total Properties"
          value={dashboardData.totalProperties.count}
          change={dashboardData.totalProperties.change}
          changeType={dashboardData.totalProperties.changeType}
        />
        <StatCard
          title="Active Users"
          value={dashboardData.activeUsers.count.toLocaleString()}
          change={dashboardData.activeUsers.change}
          changeType={dashboardData.activeUsers.changeType}
        />
        <StatCard
          title="Service Requests"
          value={dashboardData.serviceRequests.count}
          change={dashboardData.serviceRequests.change}
          changeType={dashboardData.serviceRequests.changeType}
        />
        <StatCard
          title="Total Revenue"
          value={`₹${(dashboardData.totalRevenue.amount / 1000000).toFixed(1)}M`}
          change={dashboardData.totalRevenue.change}
          changeType={dashboardData.totalRevenue.changeType}
        />
      </div>

      {/* Recent Properties */}
      <div className="dashboard-section">
        <h2>Recent Properties</h2>
        <RecentProperties properties={dashboardData.recentProperties} />
      </div>

      {/* Recent Activities */}
      <div className="dashboard-section">
        <h2>Recent Activities</h2>
        <RecentActivities activities={dashboardData.recentActivities} />
      </div>
    </div>
  );
};

export default AdminDashboard;
```

---

## ✅ Checklist for Frontend Team

- [ ] Replace all demo data with API calls
- [ ] Implement loading states
- [ ] Add error handling
- [ ] Format currency values (₹)
- [ ] Format dates and timestamps
- [ ] Add percentage change indicators
- [ ] Implement auto-refresh
- [ ] Add manual refresh button
- [ ] Style stat cards with change indicators
- [ ] Display recent properties with images
- [ ] Show recent activities with icons
- [ ] Add empty states
- [ ] Make responsive
- [ ] Test with real data
- [ ] Handle edge cases (no data, errors, etc.)

---

*Last Updated: December 2024*

