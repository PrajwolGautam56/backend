# 🎛️ Admin Dashboard - Complete Implementation Guide

## 📋 Overview

Complete guide for building an admin dashboard with:
- ✅ **Home Tab**: Real-time statistics and overview
- ✅ **Analytics Tab**: Detailed analytics and insights
- ✅ **Settings Tab**: System configuration and management

---

## 🏠 HOME TAB - Real Data Integration

### 1. Dashboard Overview Statistics

**Endpoint:** `GET /api/admin/dashboard/overview`

**Request:**
```http
GET /api/admin/dashboard/overview
Authorization: Bearer {admin_token}
```

**Response:**
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

## 📊 ANALYTICS TAB - Features & Endpoints

### Suggested Features:

1. **Revenue Analytics**
   - Monthly/Yearly revenue trends
   - Revenue by category (Properties, Furniture, Services)
   - Payment method breakdown
   - Revenue forecasts

2. **User Analytics**
   - User growth over time
   - User engagement metrics
   - User activity heatmap
   - User retention rates

3. **Property Analytics**
   - Property listing performance
   - Most viewed properties
   - Property conversion rates
   - Location-based analytics

4. **Furniture Analytics**
   - Best selling/renting items
   - Stock levels and turnover
   - Category-wise performance
   - Low stock alerts

5. **Service Analytics**
   - Service booking trends
   - Most requested services
   - Service completion rates
   - Average service time

6. **Rental Analytics**
   - Rental order trends
   - Payment collection rates
   - Overdue payment analysis
   - Customer lifetime value

### Analytics Endpoints:

#### 1. Revenue Analytics
```http
GET /api/admin/analytics/revenue?period=monthly&startDate=2025-01-01&endDate=2025-12-31
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 2400000,
    "period": "monthly",
    "trends": [
      {
        "month": "2025-01",
        "revenue": 180000,
        "rentalRevenue": 120000,
        "furnitureRevenue": 40000,
        "serviceRevenue": 20000
      },
      {
        "month": "2025-02",
        "revenue": 200000,
        "rentalRevenue": 140000,
        "furnitureRevenue": 45000,
        "serviceRevenue": 15000
      }
    ],
    "byCategory": {
      "rental": 1800000,
      "furniture": 500000,
      "service": 100000
    },
    "byPaymentMethod": {
      "UPI": 1200000,
      "Card": 800000,
      "COD": 400000
    },
    "growth": {
      "monthOverMonth": 18,
      "yearOverYear": 45
    }
  }
}
```

#### 2. User Analytics
```http
GET /api/admin/analytics/users?period=monthly
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1200,
    "growth": [
      {
        "month": "2025-01",
        "newUsers": 80,
        "activeUsers": 950,
        "verifiedUsers": 900
      }
    ],
    "engagement": {
      "dailyActiveUsers": 450,
      "weeklyActiveUsers": 800,
      "monthlyActiveUsers": 1100
    },
    "retention": {
      "day1": 85,
      "day7": 70,
      "day30": 60
    },
    "activity": {
      "totalLogins": 5000,
      "averageSessionTime": 15.5,
      "mostActiveHour": 14
    }
  }
}
```

#### 3. Property Analytics
```http
GET /api/admin/analytics/properties
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProperties": 245,
    "byStatus": {
      "available": 180,
      "sold": 45,
      "rented": 20
    },
    "byType": {
      "Residential": 180,
      "Commercial": 50,
      "PG Hostel": 15
    },
    "byListingType": {
      "Rent": 150,
      "Sell": 80,
      "Rent & Sell": 15
    },
    "topProperties": [
      {
        "_id": "property_id",
        "name": "Brigade Meadows",
        "views": 1250,
        "inquiries": 45,
        "status": "Available"
      }
    ],
    "conversionRate": 18.5,
    "averageDaysOnMarket": 25
  }
}
```

#### 4. Furniture Analytics
```http
GET /api/admin/analytics/furniture
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalItems": 156,
    "byCategory": {
      "Furniture": 80,
      "Appliance": 40,
      "Electronic": 25,
      "Decoration": 11
    },
    "byStatus": {
      "Available": 120,
      "Rented": 30,
      "Sold": 6
    },
    "topItems": [
      {
        "_id": "furniture_id",
        "name": "Sofa Set",
        "rentals": 45,
        "sales": 12,
        "revenue": 125000
      }
    ],
    "stockAlerts": {
      "lowStock": 8,
      "outOfStock": 2
    },
    "turnoverRate": 2.5
  }
}
```

#### 5. Service Analytics
```http
GET /api/admin/analytics/services
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalBookings": 89,
    "byStatus": {
      "requested": 25,
      "accepted": 30,
      "ongoing": 15,
      "completed": 19,
      "cancelled": 0
    },
    "byServiceType": {
      "Plumbing": 25,
      "Electrical": 20,
      "Cleaning": 18,
      "Carpentry": 15,
      "Painting": 11
    },
    "completionRate": 75.5,
    "averageCompletionTime": 2.5,
    "revenue": 100000,
    "trends": [
      {
        "month": "2025-01",
        "bookings": 15,
        "completed": 12,
        "revenue": 18000
      }
    ]
  }
}
```

#### 6. Rental Analytics
```http
GET /api/admin/analytics/rentals
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRentals": 45,
    "activeRentals": 40,
    "totalRevenue": 1800000,
    "byStatus": {
      "Active": 40,
      "Completed": 3,
      "Cancelled": 2
    },
    "paymentStats": {
      "totalPending": 120000,
      "totalOverdue": 45000,
      "totalPaid": 1635000,
      "collectionRate": 90.5
    },
    "trends": [
      {
        "month": "2025-01",
        "newRentals": 8,
        "revenue": 150000,
        "averageOrderValue": 18750
      }
    ],
    "topCustomers": [
      {
        "customer_name": "John Doe",
        "totalRentals": 5,
        "totalSpent": 125000,
        "lifetimeValue": 125000
      }
    ]
  }
}
```

---

## ⚙️ SETTINGS TAB - Features & Endpoints

### Suggested Features:

1. **System Settings**
   - Email configuration (SMTP, Resend, Zepto)
   - Payment gateway settings (Razorpay)
   - Cloudinary configuration
   - Google OAuth settings

2. **Business Settings**
   - Company information
   - Contact details
   - Business hours
   - Terms & conditions
   - Privacy policy

3. **Notification Settings**
   - Email notification preferences
   - SMS notification settings
   - Push notification settings
   - Reminder schedules

4. **User Management Settings**
   - Default user roles
   - User verification requirements
   - Password policies
   - Account deletion policies

5. **Content Management**
   - Homepage banners
   - Featured properties
   - Featured furniture
   - Promotional content

6. **Analytics & Tracking**
   - Google Analytics ID
   - Facebook Pixel ID
   - Custom tracking scripts

### Settings Endpoints:

#### 1. Get All Settings
```http
GET /api/admin/settings
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "system": {
      "emailProvider": "smtp",
      "paymentGateway": "razorpay",
      "cloudinaryEnabled": true,
      "googleAuthEnabled": true
    },
    "business": {
      "companyName": "BrokerIn",
      "contactEmail": "contact@brokerin.com",
      "contactPhone": "+919876543210",
      "address": "123 Main St, Bangalore",
      "businessHours": "9 AM - 6 PM",
      "timezone": "Asia/Kolkata"
    },
    "notifications": {
      "emailEnabled": true,
      "smsEnabled": false,
      "reminderSchedule": {
        "paymentReminders": "daily",
        "serviceReminders": "daily",
        "time": "09:00"
      }
    },
    "userManagement": {
      "requireEmailVerification": true,
      "requirePhoneVerification": false,
      "passwordMinLength": 8,
      "sessionTimeout": 24
    },
    "content": {
      "homepageBanners": [],
      "featuredProperties": [],
      "featuredFurniture": []
    },
    "analytics": {
      "googleAnalyticsId": "",
      "facebookPixelId": ""
    }
  }
}
```

#### 2. Update Settings
```http
PUT /api/admin/settings
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "business": {
    "companyName": "BrokerIn Updated",
    "contactEmail": "newemail@brokerin.com"
  },
  "notifications": {
    "reminderSchedule": {
      "time": "10:00"
    }
  }
}
```

#### 3. Test Email Configuration
```http
POST /api/admin/settings/test-email
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "to": "test@example.com",
  "subject": "Test Email",
  "message": "This is a test email"
}
```

#### 4. Test Payment Gateway
```http
POST /api/admin/settings/test-payment
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "amount": 100,
  "currency": "INR"
}
```

---

## 🔧 Backend Implementation

### Create Admin Dashboard Controller

Add to `src/controllers/adminController.ts`:

```typescript
import Property from '../models/Property';
import User from '../models/User';
import ServiceBooking from '../models/ServiceBooking';
import Furniture from '../models/Furniture';
import Rental from '../models/Rental';
import FurnitureTransaction from '../models/FurnitureTransaction';
import { AuthRequest } from '../interfaces/Request';
import logger from '../utils/logger';

// Dashboard Overview
export const getDashboardOverview = async (req: AuthRequest, res: Response) => {
  try {
    // Total Properties
    const totalProperties = await Property.countDocuments();
    const propertiesLastMonth = await Property.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    const propertyChange = propertiesLastMonth > 0 
      ? Math.round((totalProperties / propertiesLastMonth - 1) * 100) 
      : 0;

    // Active Users
    const totalUsers = await User.countDocuments({ isVerified: true });
    const usersLastMonth = await User.countDocuments({
      isVerified: true,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    const userChange = usersLastMonth > 0 
      ? Math.round((totalUsers / usersLastMonth - 1) * 100) 
      : 0;

    // Service Requests
    const totalServiceRequests = await ServiceBooking.countDocuments();
    const serviceRequestsLastMonth = await ServiceBooking.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    const serviceChange = serviceRequestsLastMonth > 0 
      ? Math.round((totalServiceRequests / serviceRequestsLastMonth - 1) * 100) 
      : 0;

    // Total Revenue (from rentals and furniture transactions)
    const activeRentals = await Rental.find({ status: 'Active' });
    const rentalRevenue = activeRentals.reduce((sum, rental) => {
      const paidPayments = rental.payment_records?.filter(
        (p: any) => p.status === 'Paid'
      ) || [];
      return sum + paidPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
    }, 0);

    const furnitureTransactions = await FurnitureTransaction.find({
      payment_status: 'Paid'
    });
    const furnitureRevenue = furnitureTransactions.reduce(
      (sum, t) => sum + (t.total_paid || 0), 0
    );

    const totalRevenue = rentalRevenue + furnitureRevenue;
    // Calculate revenue change (simplified)
    const revenueChange = 18; // Calculate from previous period

    // Recent Properties
    const recentProperties = await Property.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name address status property_type listing_type photos createdAt')
      .lean();

    // Recent Activities (from activity logs)
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('fullName email createdAt activityLog')
      .lean();

    const recentActivities = [];
    
    // Add property additions
    recentProperties.slice(0, 3).forEach(prop => {
      recentActivities.push({
        type: 'property_added',
        title: prop.name,
        description: 'New property added',
        timestamp: prop.createdAt,
        user: { name: 'Admin', email: 'admin@brokerin.com' }
      });
    });

    // Add service requests
    const recentServices = await ServiceBooking.find()
      .sort({ created_at: -1 })
      .limit(3)
      .populate('userId', 'fullName email')
      .lean();
    
    recentServices.forEach(service => {
      recentActivities.push({
        type: 'service_request',
        title: `${service.service_type} Service Request`,
        description: 'New service booking',
        timestamp: service.created_at,
        status: service.status,
        customer: {
          name: service.name,
          email: service.email
        }
      });
    });

    // Add user registrations
    recentUsers.slice(0, 2).forEach(user => {
      recentActivities.push({
        type: 'user_registration',
        title: 'New User Registration',
        description: 'User signed up',
        timestamp: user.createdAt,
        user: {
          name: user.fullName,
          email: user.email
        }
      });
    });

    // Sort by timestamp
    recentActivities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    res.json({
      success: true,
      data: {
        totalProperties: {
          count: totalProperties,
          change: propertyChange,
          changeType: propertyChange >= 0 ? 'increase' : 'decrease',
          available: await Property.countDocuments({ status: 'Available' }),
          sold: await Property.countDocuments({ status: 'Sold' }),
          pending: await Property.countDocuments({ status: { $ne: 'Available' } })
        },
        activeUsers: {
          count: totalUsers,
          change: userChange,
          changeType: userChange >= 0 ? 'increase' : 'decrease',
          verified: totalUsers,
          unverified: await User.countDocuments({ isVerified: false }),
          newThisMonth: usersLastMonth
        },
        serviceRequests: {
          count: totalServiceRequests,
          change: serviceChange,
          changeType: serviceChange >= 0 ? 'increase' : 'decrease',
          pending: await ServiceBooking.countDocuments({ status: 'requested' }),
          accepted: await ServiceBooking.countDocuments({ status: 'accepted' }),
          ongoing: await ServiceBooking.countDocuments({ status: 'ongoing' }),
          completed: await ServiceBooking.countDocuments({ status: 'completed' })
        },
        totalRevenue: {
          amount: totalRevenue,
          currency: 'INR',
          change: revenueChange,
          changeType: 'increase',
          thisMonth: rentalRevenue, // Simplified
          lastMonth: rentalRevenue * 0.85, // Simplified
          rentalRevenue,
          furnitureRevenue,
          serviceRevenue: 0 // Calculate from service bookings if needed
        },
        recentProperties: recentProperties.map(p => ({
          ...p,
          address: p.address || {}
        })),
        recentActivities: recentActivities.slice(0, 10),
        quickStats: {
          totalFurnitureItems: await Furniture.countDocuments(),
          activeRentals: await Rental.countDocuments({ status: 'Active' }),
          pendingPayments: await Rental.countDocuments({
            'payment_records.status': 'Pending'
          }),
          overduePayments: await Rental.countDocuments({
            'payment_records.status': 'Overdue'
          }),
          totalBookings: totalServiceRequests,
          todayBookings: await ServiceBooking.countDocuments({
            created_at: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
          })
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching dashboard overview:', error);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
};
```

---

## 🎨 Frontend Integration Example

### React Component Example:

```typescript
import { useEffect, useState } from 'react';
import api from '../services/api';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/api/admin/dashboard/overview');
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!dashboardData) return <div>No data</div>;

  return (
    <div className="admin-dashboard">
      <h1>Dashboard Overview</h1>
      
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
          value={dashboardData.activeUsers.count}
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
          value={`₹${(dashboardData.totalRevenue.amount / 100000).toFixed(1)}M`}
          change={dashboardData.totalRevenue.change}
          changeType={dashboardData.totalRevenue.changeType}
        />
      </div>

      {/* Recent Properties */}
      <div className="recent-properties">
        <h2>Recent Properties</h2>
        {dashboardData.recentProperties.map(property => (
          <PropertyCard key={property._id} property={property} />
        ))}
      </div>

      {/* Recent Activities */}
      <div className="recent-activities">
        <h2>Recent Activities</h2>
        {dashboardData.recentActivities.map((activity, index) => (
          <ActivityItem key={index} activity={activity} />
        ))}
      </div>
    </div>
  );
};
```

---

## 📝 Next Steps

1. **Implement Backend Endpoints**: Add the dashboard, analytics, and settings endpoints to `adminController.ts`
2. **Add Routes**: Register routes in `adminRoutes.ts`
3. **Frontend Integration**: Replace demo data with API calls
4. **Add Charts**: Use Chart.js or Recharts for analytics visualization
5. **Add Filters**: Implement date range filters for analytics
6. **Add Export**: Allow exporting analytics data as CSV/PDF

---

## 🔗 Related Endpoints

- `GET /api/rentals/dashboard` - Rental dashboard statistics
- `GET /api/users/dashboard/me` - User dashboard (for reference)
- `GET /api/admin/users` - User management
- `GET /api/admin/properties` - Property management

---

*Last Updated: December 2024*

