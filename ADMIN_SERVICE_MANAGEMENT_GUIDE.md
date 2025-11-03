# Admin Service Management Guide

## 🎯 Overview
Admin can manage services and service bookings, including changing time slots and status updates.

---

## 📡 Admin Endpoints

### 1. **Update Booking Status**
**URL:** `PUT http://localhost:3030/api/service-bookings/:id/status`  
**Auth:** Required (Admin)

```javascript
const response = await fetch(`http://localhost:3030/api/service-bookings/${bookingId}/status`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'accepted' // requested, accepted, ongoing, completed, cancelled
  })
});
```

**Email Trigger:** Customer receives status update email (if email is configured)

---

### 2. **Update Booking Time/Date** ✨ NEW
**URL:** `PUT http://localhost:3030/api/service-bookings/:id/time`  
**Auth:** Required (Admin)

```javascript
const response = await fetch(`http://localhost:3030/api/service-bookings/${bookingId}/time`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    preferred_date: '2024-11-06',      // Optional: New date
    preferred_time: '14:00',           // Optional: New time
    alternate_date: '2024-11-07',      // Optional: Alternate date
    alternate_time: '16:00'            // Optional: Alternate time
  })
});
```

**Email Trigger:** Customer receives time change notification email

---

### 3. **Get All Bookings**
**URL:** `GET http://localhost:3030/api/service-bookings`

**Query Parameters:**
- `service_type`: carpentry, plumbing, electrical, etc.
- `status`: requested, accepted, ongoing, completed, cancelled
- `date`: Filter by date
- `phone_number`: Search by phone

```javascript
// Get all requested bookings
const response = await fetch(
  'http://localhost:3030/api/service-bookings?status=requested',
  {
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  }
);

const bookings = await response.json();
```

---

### 4. **Get Booking by ID**
**URL:** `GET http://localhost:3030/api/service-bookings/:id`

---

### 5. **Cancel Booking**
**URL:** `PUT http://localhost:3030/api/service-bookings/:id/cancel`

---

## 🎨 Admin Dashboard Example

### React Component for Admin Booking Management

```javascript
import { useState, useEffect } from 'react';

const AdminBookingManagement = () => {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const loadBookings = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:3030/api/service-bookings', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    setBookings(data);
  };

  const updateStatus = async (bookingId, newStatus) => {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `http://localhost:3030/api/service-bookings/${bookingId}/status`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      }
    );
    
    if (response.ok) {
      alert('Status updated and email sent to customer!');
      loadBookings();
    }
  };

  const updateTime = async (bookingId, timeData) => {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `http://localhost:3030/api/service-bookings/${bookingId}/time`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(timeData)
      }
    );
    
    if (response.ok) {
      alert('Time updated and customer notified via email!');
      loadBookings();
    }
  };

  return (
    <div>
      <h2>Service Bookings Management</h2>
      
      {bookings.map(booking => (
        <div key={booking._id} className="booking-card">
          <h3>{booking.service_type}</h3>
          <p>Customer: {booking.name}</p>
          <p>Phone: {booking.phone_number}</p>
          <p>Email: {booking.email}</p>
          <p>Date: {new Date(booking.preferred_date).toLocaleDateString()}</p>
          <p>Time: {booking.preferred_time}</p>
          <p>Address: {booking.service_address}</p>
          <p>Status: {booking.status}</p>
          
          {/* Update Status */}
          <div>
            <label>Change Status:</label>
            <select onChange={(e) => updateStatus(booking._id, e.target.value)}>
              <option value="requested">Requested</option>
              <option value="accepted">Accepted</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          {/* Update Time */}
          <div>
            <label>New Date:</label>
            <input
              type="date"
              onChange={(e) => {
                updateTime(booking._id, {
                  preferred_date: e.target.value
                });
              }}
            />
            
            <label>New Time:</label>
            <input
              type="time"
              onChange={(e) => {
                updateTime(booking._id, {
                  preferred_time: e.target.value
                });
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminBookingManagement;
```

---

## 📧 Email Notifications (When Nodemailer Configured)

### 1. **Booking Confirmation** (To Customer)
Sent when customer creates a booking
- Booking ID
- Service type
- Date and time
- Status
- Service address

### 2. **Time Update** (To Customer)
Sent when admin changes booking time
- Previous date and time
- New date and time
- Booking ID
- Service type

### 3. **Status Update** (To Customer)
Sent when admin changes booking status
- New status
- Booking details
- Appropriate message based on status

### 4. **Admin Notification** (To Admin)
Sent when new booking is created
- Customer details
- Service type
- Preferred date and time
- Service address
- Additional notes

---

## ⚙️ How to Enable Email

When you're ready to enable emails:

1. **Add Nodemailer credentials to `.env`:**
```env
NODEMAILER_EMAIL=your-email@gmail.com
NODEMAILER_PASSWORD=your-app-password
```

2. **Emails will automatically send for:**
   - New bookings → Customer & Admin
   - Status updates → Customer
   - Time changes → Customer

3. **Currently:** Emails are logged but not sent (email service not configured)

---

## 📋 Valid Status Values

- **requested** - New booking, awaiting admin review
- **accepted** - Admin accepted the booking
- **ongoing** - Service is currently being performed
- **completed** - Service finished
- **cancelled** - Booking cancelled

---

## ✅ Summary

**Admin Can:**
- ✅ View all service bookings
- ✅ Filter bookings by status, service type, date
- ✅ Update booking status (emails sent to customer)
- ✅ Change booking time/date (emails sent to customer)
- ✅ Cancel bookings
- ✅ Edit service categories and rates (via Services API)

**Email System:**
- ✅ Ready to send emails (when credentials added)
- ✅ Confirmation emails to customers
- ✅ Admin notifications for new bookings
- ✅ Status update emails
- ✅ Time change notifications

