# User Tracking and Service Management Guide

## Overview
This guide documents the enhanced user tracking system and service management features implemented to ensure all user actions are properly tracked and services can be managed by both users and admins.

---

## 🔑 Key Features

### 1. **Automatic User Email Tracking**
All form submissions (Property, Furniture, Service Bookings) now automatically use the **logged-in user's email** from the database, regardless of what email is entered in the form.

- ✅ **Logged-in users**: Their account email is always used
- ✅ **Guest users**: Form email is used (no user account)
- ✅ **Email matching**: Dashboard matches bookings by `userId` OR `email` (case-insensitive)

### 2. **Service Booking Management**

#### **User Endpoints:**
- `GET /api/service-bookings/my-bookings` - Get own bookings
- `PUT /api/service-bookings/:id` - Update own booking (time, date, address, notes)
- `PUT /api/service-bookings/:id/cancel` - Cancel own booking

#### **Admin Endpoints:**
- `GET /api/service-bookings` - Get all bookings (with filters)
- `GET /api/service-bookings/:id` - Get booking by ID
- `PUT /api/service-bookings/:id/status` - Update booking status
- `PUT /api/service-bookings/:id/time` - Update booking time/date
- `PUT /api/service-bookings/:id/cancel` - Cancel any booking

### 3. **Comprehensive Activity Logging**

All actions are tracked in the user's `activityLog`:

#### **User Actions:**
- `property_request` - Property request submitted
- `furniture_request` - Furniture request submitted
- `service_booking` - Service booking created
- `view_service_bookings` - Viewed own bookings
- `update_own_service_booking` - Updated own booking
- `cancel_service_booking` - Cancelled booking

#### **Admin Actions:**
- `update_property_request_status` - Updated property request status
- `update_property_request` - Updated property request details
- `delete_property_request` - Deleted property request
- `update_furniture_request_status` - Updated furniture request status
- `update_furniture_request` - Updated furniture request details
- `delete_furniture_request` - Deleted furniture request
- `update_service_booking_status` - Updated service booking status
- `update_service_booking_time` - Updated service booking time

---

## 📋 API Endpoints

### Service Bookings

#### Create Booking
```http
POST /api/service-bookings
Content-Type: application/json
Authorization: Bearer <token> (optional)

{
  "service_type": "Plumbing",
  "name": "John Doe",
  "phone_number": "+919876543210",
  "email": "john@example.com", // Ignored if user is logged in
  "preferred_date": "2025-11-15",
  "preferred_time": "10:00",
  "service_address": "123 Main St",
  "additional_notes": "Please call before arrival"
}
```

**Response:**
```json
{
  "service_booking_id": "SB1730000000",
  "service_type": "Plumbing",
  "name": "John Doe",
  "email": "logged-in-user@email.com", // Uses logged-in user's email
  "preferred_date": "2025-11-15T00:00:00.000Z",
  "preferred_time": "10:00",
  "status": "requested",
  "userId": "69066cd718245b394a8fa9f4"
}
```

#### Get Own Bookings (User)
```http
GET /api/service-bookings/my-bookings
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "service_booking_id": "SB1730000000",
    "service_type": "Plumbing",
    "preferred_date": "2025-11-15T00:00:00.000Z",
    "preferred_time": "10:00",
    "status": "requested",
    "email": "user@email.com"
  }
]
```

#### Update Own Booking (User)
```http
PUT /api/service-bookings/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "preferred_date": "2025-11-20",
  "preferred_time": "14:00",
  "service_address": "456 New St",
  "additional_notes": "Updated notes"
}
```

**Note:** Users can only update:
- `preferred_date`
- `preferred_time`
- `alternate_date`
- `alternate_time`
- `service_address`
- `additional_notes`

**Cannot update:**
- `status` (only admin can change status)
- Completed or cancelled bookings cannot be updated

#### Cancel Booking
```http
PUT /api/service-bookings/:id/cancel
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Booking cancelled successfully",
  "booking": { ... }
}
```

---

### Property Requests

#### Submit Property Request
```http
POST /api/property-forms
Content-Type: application/json
Authorization: Bearer <token> (optional)

{
  "property_id": "PROP-2025-1101-ABC123",
  "name": "John Doe", // Ignored if user is logged in (uses fullName)
  "email": "different@email.com", // Ignored if user is logged in (uses account email)
  "phoneNumber": "+919876543210",
  "message": "Interested in this property"
}
```

**Note:** If user is logged in:
- Email is replaced with logged-in user's email
- Name is replaced with user's `fullName` (if available)
- Phone is replaced with user's `phoneNumber` (if available)

---

### Furniture Requests

#### Submit Furniture Request
```http
POST /api/furniture-forms
Content-Type: application/json
Authorization: Bearer <token> (optional)

{
  "furniture_id": "FURN-2025-1101-XYZ789",
  "listing_type": "Rent",
  "name": "John Doe", // Ignored if user is logged in
  "email": "different@email.com", // Ignored if user is logged in
  "phoneNumber": "+919876543210",
  "message": "Interested in renting this furniture"
}
```

**Note:** Same behavior as property requests - uses logged-in user's details if available.

---

## 📧 Email Notifications (Ready for Deployment)

All email notifications are ready and will automatically send when Nodemailer credentials are provided in `.env`:

### Service Bookings:
- ✅ Booking confirmation to customer
- ✅ Booking update notifications (time/date changes)
- ✅ Status update notifications
- ✅ Admin notifications for new bookings

### Property/Furniture Requests:
- ✅ Request confirmation emails
- ✅ Status update emails

**Email Configuration:**
Add to `.env`:
```env
NODEMAILER_EMAIL=your-email@gmail.com
NODEMAILER_PASSWORD=your-app-password
```

**Note:** Emails will only send if:
1. Nodemailer credentials are configured
2. User has provided an email address
3. Email service is enabled (`config.isEmailEnabled()`)

---

## 🎯 Activity Logging

### Viewing Activity Log

#### User's Own Activity
```http
GET /api/users/activity-history/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "action": "service_booking",
      "timestamp": "2025-11-01T10:00:00.000Z",
      "details": {
        "service_type": "Plumbing",
        "booking_id": "SB1730000000",
        "preferred_date": "2025-11-15",
        "preferred_time": "10:00"
      }
    }
  ]
}
```

#### Admin Viewing User Activity
```http
GET /api/users/details/:userId
Authorization: Bearer <admin-token>
```

Includes full activity log in the response.

---

## 🔒 Security & Permissions

### User Permissions:
- ✅ Can view own bookings
- ✅ Can update own bookings (limited fields)
- ✅ Can cancel own bookings
- ❌ Cannot change booking status
- ❌ Cannot update completed/cancelled bookings

### Admin Permissions:
- ✅ Can view all bookings
- ✅ Can update any booking
- ✅ Can change booking status
- ✅ Can cancel any booking
- ✅ Can update booking time/date

---

## 📊 Dashboard Integration

The user dashboard (`GET /api/users/dashboard/me`) now includes:
- All property requests (matched by userId OR email)
- All furniture requests (matched by userId OR email)
- All service bookings (matched by userId OR email)
- Complete activity log
- Statistics for all submissions

---

## 🚀 Deployment Checklist

Before deploying:

1. ✅ **Configure Email (Optional):**
   ```env
   NODEMAILER_EMAIL=your-email@gmail.com
   NODEMAILER_PASSWORD=your-app-password
   ```

2. ✅ **Verify Routes:**
   - Property/Furniture form routes use `optionalAuthenticate`
   - Service booking routes have proper authentication

3. ✅ **Test User Tracking:**
   - Submit forms while logged in
   - Verify dashboard shows all submissions
   - Check activity logs are populated

4. ✅ **Test Service Management:**
   - Users can update own bookings
   - Admins can manage all bookings
   - Email notifications work (if configured)

---

## 🔍 Troubleshooting

### Issue: Dashboard not showing bookings
**Solution:** Ensure requests are matched by both `userId` and `email` (case-insensitive)

### Issue: Email not sending
**Check:**
1. Nodemailer credentials in `.env`
2. Email service enabled: `config.isEmailEnabled()`
3. User has email address in booking/request

### Issue: Cannot update booking
**Check:**
1. User owns the booking (`userId` or `email` matches)
2. Booking status is not `completed` or `cancelled`
3. User is authenticated (token valid)

---

## 📝 Notes

- All form submissions automatically track logged-in users
- Email matching is case-insensitive
- Activity logs are stored in user profile
- Email notifications are ready but optional (won't fail if not configured)
- Admin actions are fully tracked for audit purposes

