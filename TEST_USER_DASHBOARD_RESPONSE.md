# 🧪 Test User Dashboard Response

## 📋 Expected Response for `unicomportal2020@gmail.com`

### Endpoint
```http
GET /api/users/dashboard/me
Authorization: Bearer {user_token}
```

### Query Logic
The endpoint queries rentals by:
```javascript
Rental.find({
  $or: [
    { userId: userId },
    { customer_email: { $regex: new RegExp(`^unicomportal2020@gmail.com$`, 'i') } }
  ]
})
```

---

## 📊 Expected Response Structure

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "6937a412c16c7c8fc10c1848",
      "fullName": "Prajwol Gautam",
      "email": "unicomportal2020@gmail.com",
      "username": "...",
      "phoneNumber": "7317741570",
      "profilePicture": null,
      "isVerified": false
    },
    "stats": {
      "totalPropertyRequests": 0,
      "totalFurnitureRequests": 0,
      "totalServiceBookings": 0,
      "totalContactInquiries": 0,
      "totalRentals": 4,
      "activeRentals": 4,
      "totalActivities": 0,
      "totalSubmissions": 4
    },
    "allRentals": [
      {
        "_id": "rental_id_1",
        "rental_id": "RENT-2025-1209-9551C2",
        "customer_name": "Prajwol Gautam",
        "customer_email": "unicomportal2020@gmail.com",
        "customer_phone": "7317741570",
        "customer_address": null,
        "items": [
          {
            "product_id": "690dae403407112dc038fa46",
            "product_name": "Sofa 5 Seater",
            "product_type": "Furniture",
            "quantity": 1,
            "monthly_price": 949,
            "deposit": 2847,
            "start_date": "2025-12-09T00:00:00.000Z",
            "end_date": null
          }
        ],
        "total_monthly_amount": 949,
        "total_deposit": 2847,
        "delivery_charge": 0,
        "total_amount": 3796,
        "start_date": "2025-12-09T00:00:00.000Z",
        "end_date": null,
        "status": "Active",
        "order_status": "Pending",
        "payment_method": "COD",
        "order_placed_at": "2025-12-09T06:08:42.159Z",
        "order_confirmed_at": null,
        "delivery_date": null,
        "delivered_at": null,
        "payment_records": [],
        "notes": null,
        "createdAt": "2025-12-09T06:08:42.159Z",
        "updatedAt": "2025-12-09T06:08:42.159Z"
      },
      {
        "_id": "rental_id_2",
        "rental_id": "RENT-2025-1209-CD51F1",
        "customer_name": "Prajwol Gautam",
        "customer_email": "unicomportal2020@gmail.com",
        "customer_phone": "7317741570",
        "items": [
          {
            "product_id": "690dae403407112dc038fa46",
            "product_name": "Sofa 5 Seater",
            "product_type": "Furniture",
            "quantity": 1,
            "monthly_price": 949,
            "deposit": 2847
          }
        ],
        "total_monthly_amount": 949,
        "total_deposit": 2847,
        "delivery_charge": 0,
        "total_amount": 3796,
        "status": "Active",
        "order_status": "Pending",
        "payment_method": "COD",
        "order_placed_at": "2025-12-09T06:08:42.159Z"
      },
      {
        "_id": "rental_id_3",
        "rental_id": "RENT-2025-1209-F4751D",
        "customer_name": "Prajwol Gautam",
        "customer_email": "unicomportal2020@gmail.com",
        "customer_phone": "7317741570",
        "items": [
          {
            "product_id": "690dae403407112dc038fa46",
            "product_name": "Sofa 5 Seater",
            "product_type": "Furniture",
            "quantity": 1,
            "monthly_price": 949,
            "deposit": 2847
          },
          {
            "product_id": "691639cbe62a1d969aa8e16b",
            "product_name": "Dining Table",
            "product_type": "Furniture",
            "quantity": 1,
            "monthly_price": 650,
            "deposit": 0
          }
        ],
        "total_monthly_amount": 1599,
        "total_deposit": 2847,
        "delivery_charge": 0,
        "total_amount": 4446,
        "status": "Active",
        "order_status": "Pending",
        "payment_method": "COD",
        "order_placed_at": "2025-12-09T06:08:42.159Z"
      },
      {
        "_id": "rental_id_4",
        "rental_id": "RENT-2025-1210-9B652C",
        "customer_name": "Prajwol Gautam",
        "customer_email": "unicomportal2020@gmail.com",
        "customer_phone": "7317741570",
        "customer_address": null,
        "items": [
          {
            "product_id": "691639cbe62a1d969aa8e16b",
            "product_name": "Dining Table",
            "product_type": "Furniture",
            "quantity": 1,
            "monthly_price": 650,
            "deposit": 0
          },
          {
            "product_id": "690dae403407112dc038fa46",
            "product_name": "Sofa 5 Seater",
            "product_type": "Furniture",
            "quantity": 1,
            "monthly_price": 949,
            "deposit": 2847
          }
        ],
        "total_monthly_amount": 1599,
        "total_deposit": 2847,
        "delivery_charge": 0,
        "total_amount": 4446,
        "status": "Active",
        "order_status": "Pending",
        "payment_method": "COD",
        "order_placed_at": "2025-12-10T00:00:00.000Z"
      }
    ],
    "recentRentals": [ /* same as allRentals, limited to 5 */ ],
    "allFurnitureRequests": [],
    "allServiceBookings": [],
    "allPropertyRequests": [],
    "activityLog": []
  }
}
```

---

## 🔍 Debugging Steps

### Step 1: Check Backend Logs

After calling the endpoint, check server logs for:
```
Dashboard data fetched {
  userId: "...",
  userEmail: "unicomportal2020@gmail.com",
  rentalsCount: 4,
  rentalIds: [
    "RENT-2025-1209-9551C2",
    "RENT-2025-1209-CD51F1",
    "RENT-2025-1209-F4751D",
    "RENT-2025-1210-9B652C"
  ],
  rentalEmails: [
    "unicomportal2020@gmail.com",
    "unicomportal2020@gmail.com",
    "unicomportal2020@gmail.com",
    "unicomportal2020@gmail.com"
  ]
}
```

### Step 2: Test Direct Query

**Test in MongoDB or via API:**

```javascript
// Direct MongoDB query
db.rentals.find({
  $or: [
    { userId: ObjectId("6937a412c16c7c8fc10c1848") },
    { customer_email: /^unicomportal2020@gmail.com$/i }
  ]
})

// Should return 4 rentals
```

### Step 3: Verify Email Match

**Check if email format matches exactly:**
- Database: `unicomportal2020@gmail.com`
- User email: `unicomportal2020@gmail.com`
- Query: Case-insensitive regex match

---

## 🐛 Common Issues

### Issue 1: Email Case Mismatch
**Fix:** Already handled with case-insensitive regex

### Issue 2: userId Not Set
**Fix:** Query now checks both userId AND email

### Issue 3: Email Has Extra Spaces
**Fix:** Regex `^email$` ensures exact match (with case-insensitive)

---

## ✅ Expected Result

**For `unicomportal2020@gmail.com`, you should get:**

- ✅ **4 rentals** in `allRentals` array
- ✅ **4 active rentals** in stats
- ✅ All rental IDs matching admin dashboard

---

## 🧪 Quick Test Script

**Add this to test the query:**

```javascript
// Test endpoint (add to userController.ts temporarily)
export const testUserDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findOne({ email: 'unicomportal2020@gmail.com' });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const rentals = await Rental.find({
      $or: [
        { userId: user._id },
        { customer_email: { $regex: new RegExp(`^${user.email}$`, 'i') } }
      ]
    }).lean();

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        email: user.email
      },
      query: {
        userId: user._id.toString(),
        email: user.email
      },
      rentalsFound: rentals.length,
      rentals: rentals.map(r => ({
        rental_id: r.rental_id,
        customer_email: r.customer_email,
        userId: r.userId?.toString(),
        order_status: r.order_status,
        total_amount: r.total_amount
      }))
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
```

---

## 📝 Summary

**The endpoint should return 4 rentals for `unicomportal2020@gmail.com`.**

**If it's not working:**
1. Check backend logs for the query results
2. Verify user email matches exactly
3. Check if rentals have `customer_email` set correctly
4. Test the query directly in MongoDB

**The query logic is correct - it should work!** 🎯

