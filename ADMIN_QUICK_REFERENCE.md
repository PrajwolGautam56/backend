# Admin Quick Reference

## 🔐 Authentication
```javascript
headers: {
  'Authorization': `Bearer ${adminToken}`,
  'Content-Type': 'application/json'
}
```

---

## 🏠 Property Requests Management

### Get All Requests
```javascript
GET /api/property-forms?status=Requested&page=1&limit=10&search=john
```

### Get Single Request
```javascript
GET /api/property-forms/:id
```

### Update Status
```javascript
PATCH /api/property-forms/:id/status
Body: { "status": "Accepted" }
```

### Update Details
```javascript
PUT /api/property-forms/:id
Body: { "phoneNumber": "9876543210" }
```

### Delete
```javascript
DELETE /api/property-forms/:id
```

---

## 📊 Status Options
- `Requested` (default)
- `Accepted`
- `Ongoing`
- `Completed`
- `Cancelled`

---

## 🎯 Quick Example
```javascript
// Get pending requests
const response = await fetch(
  'http://localhost:3030/api/property-forms?status=Requested',
  { headers: { 'Authorization': `Bearer ${token}` } }
);

// Update to accepted
await fetch(`http://localhost:3030/api/property-forms/${id}/status`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ status: 'Accepted' })
});
```

