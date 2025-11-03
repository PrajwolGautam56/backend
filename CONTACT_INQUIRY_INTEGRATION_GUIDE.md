# Contact Inquiry Integration Guide

## Overview
Contact inquiries are now fully integrated with user tracking and appear in the user dashboard. When a logged-in user submits a contact form, it's automatically linked to their account and displayed in their dashboard.

---

## 🔑 Key Features

### 1. **Automatic User Linking**
- ✅ Contact forms submitted by logged-in users are automatically linked via `userId`
- ✅ Uses logged-in user's email (ignores form email field)
- ✅ Matches inquiries by `userId` OR `email` (case-insensitive) for dashboard display

### 2. **Activity Tracking**
- ✅ Contact submissions are tracked in user's `activityLog`
- ✅ Action type: `contact_inquiry`
- ✅ Includes `contact_id` and `subject` in details

### 3. **Dashboard Integration**
- ✅ Contact inquiries appear in user dashboard (`GET /api/users/dashboard/me`)
- ✅ Included in dashboard stats
- ✅ Recent inquiries (last 5) displayed
- ✅ Full list of all inquiries available

---

## 📋 API Changes

### Contact Form Submission

#### Endpoint
```http
POST /api/contacts
```

#### Request (Logged-in User)
```json
{
  "fullname": "John Doe", // Ignored if user is logged in (uses fullName)
  "email": "different@email.com", // Ignored if user is logged in (uses account email)
  "phonenumber": "+919876543210", // Uses user's phone if available
  "subject": "General Inquiry",
  "message": "I have a question about..."
}
```

**Authorization:** Optional (Bearer Token)
- If token provided: Uses logged-in user's details
- If no token: Uses form details (guest submission)

#### Response
```json
{
  "contact_id": "CNT1730000000",
  "fullname": "John Doe",
  "email": "john@example.com", // Logged-in user's email
  "phonenumber": "+919876543210",
  "subject": "General Inquiry",
  "message": "I have a question about...",
  "status": "new",
  "userId": "69066cd718245b394a8fa9f4", // Added if logged in
  "created_at": "2025-11-01T10:00:00.000Z",
  "updated_at": "2025-11-01T10:00:00.000Z"
}
```

---

### User Dashboard Response

#### Endpoint
```http
GET /api/users/dashboard/me
Authorization: Bearer <token>
```

#### Response Structure
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "69066cd718245b394a8fa9f4",
      "fullName": "John Doe",
      "email": "john@example.com",
      "username": "johndoe",
      "phoneNumber": "+919876543210",
      "profilePicture": "default-profile.png",
      "isVerified": true
    },
    "stats": {
      "totalPropertyRequests": 5,
      "totalFurnitureRequests": 3,
      "totalServiceBookings": 10,
      "totalContactInquiries": 7, // NEW
      "totalActivities": 25,
      "totalSubmissions": 25 // Includes contact inquiries
    },
    "recentPropertyRequests": [...],
    "recentFurnitureRequests": [...],
    "recentServiceBookings": [...],
    "recentContactInquiries": [ // NEW
      {
        "_id": "...",
        "contact_id": "CNT1730000000",
        "fullname": "John Doe",
        "email": "john@example.com",
        "phonenumber": "+919876543210",
        "subject": "General Inquiry",
        "message": "I have a question about...",
        "status": "new",
        "created_at": "2025-11-01T10:00:00.000Z",
        "updated_at": "2025-11-01T10:00:00.000Z"
      }
    ],
    "activityLog": [
      {
        "action": "contact_inquiry", // NEW
        "timestamp": "2025-11-01T10:00:00.000Z",
        "details": {
          "contact_id": "CNT1730000000",
          "subject": "General Inquiry"
        }
      }
    ],
    "allContactInquiries": [...] // NEW - Full list
  }
}
```

---

## 💻 Frontend Implementation

### Submit Contact Form (with Authentication)

```javascript
// Submit contact form
const submitContact = async (formData) => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch('/api/contacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }) // Optional auth
    },
    body: JSON.stringify({
      fullname: formData.fullname, // Will be ignored if logged in
      email: formData.email, // Will be ignored if logged in
      phonenumber: formData.phonenumber,
      subject: formData.subject,
      message: formData.message
    })
  });
  
  const data = await response.json();
  return data;
};
```

### Display Contact Inquiries in Dashboard

```javascript
// Fetch dashboard
const fetchDashboard = async () => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch('/api/users/dashboard/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  
  // Display contact inquiries
  const inquiries = data.data.allContactInquiries;
  const stats = data.data.stats;
  
  console.log(`Total Inquiries: ${stats.totalContactInquiries}`);
  
  return data;
};
```

### React Component Example

```typescript
import { useState, useEffect } from 'react';

interface ContactInquiry {
  _id: string;
  contact_id: string;
  fullname: string;
  email: string;
  phonenumber: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'responded';
  created_at: string;
}

const ContactInquiriesTab = () => {
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/users/dashboard/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      setInquiries(data.data.allContactInquiries);
    } catch (error) {
      console.error('Error fetching inquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="contact-inquiries">
      <h2>My Contact Inquiries ({inquiries.length})</h2>
      
      {inquiries.length === 0 ? (
        <p>No inquiries submitted yet.</p>
      ) : (
        <div className="inquiries-list">
          {inquiries.map((inquiry) => (
            <div key={inquiry._id} className="inquiry-card">
              <div className="inquiry-header">
                <h3>{inquiry.subject}</h3>
                <span className={`status ${inquiry.status}`}>
                  {inquiry.status}
                </span>
              </div>
              <p className="message">{inquiry.message}</p>
              <div className="inquiry-meta">
                <span>Submitted: {new Date(inquiry.created_at).toLocaleDateString()}</span>
                <span>Contact ID: {inquiry.contact_id}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContactInquiriesTab;
```

---

## 🔍 Admin Features

### View User's Contact Inquiries (Admin)

```http
GET /api/users/details/:userId
Authorization: Bearer <admin-token>
```

**Response includes:**
```json
{
  "success": true,
  "data": {
    "user": {...},
    "submissions": {
      "propertyRequests": {...},
      "furnitureRequests": {...},
      "serviceBookings": {...},
      "contactInquiries": { // NEW
        "total": 7,
        "items": [...]
      }
    },
    "stats": {
      "totalSubmissions": 25, // Includes contact inquiries
      "totalActivities": 25
    }
  }
}
```

---

## 📊 Database Schema Changes

### Contact Model
```typescript
interface IContact {
  contact_id: string;
  fullname: string;
  email: string;
  phonenumber: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'responded';
  userId?: Schema.Types.ObjectId; // NEW - Optional reference to User
  created_at: Date;
  updated_at: Date;
}
```

---

## 🎯 Behavior Summary

### For Logged-In Users:
1. ✅ Form submission automatically uses account email
2. ✅ `userId` is attached to inquiry
3. ✅ Inquiry appears in dashboard immediately
4. ✅ Activity is logged in user profile

### For Guest Users:
1. ✅ Form email is used
2. ✅ No `userId` attached
3. ✅ Dashboard matches by email (if user signs up later with same email)
4. ✅ No activity logging

---

## ✅ Checklist for Frontend

- [ ] Contact form accepts optional authentication token
- [ ] Dashboard displays contact inquiries count
- [ ] Recent inquiries shown in dashboard
- [ ] Full inquiries list accessible
- [ ] Inquiry status displayed (new/read/responded)
- [ ] Contact form pre-fills with user data (if logged in)

---

## 📝 Notes

- Contact inquiries are matched by both `userId` AND `email` for maximum coverage
- Email matching is case-insensitive
- Guest inquiries can be linked to user accounts if email matches after signup
- All contact submissions are tracked in activity log (for logged-in users)

---

## 🔄 Migration Notes

**Existing Contact Records:**
- Existing contact records will have `userId: undefined`
- They'll still appear in dashboard if email matches logged-in user
- No migration needed - system is backward compatible

