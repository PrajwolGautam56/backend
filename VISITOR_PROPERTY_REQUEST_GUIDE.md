# Visitor Property Request/Booking Guide

## 🎯 Overview
Visitors can submit property booking requests without being logged in. These requests go to admin for approval.

**Endpoint:** `POST /api/property-forms`

---

## 📝 Create Property Request (PUBLIC - No Auth Required)

**URL:** `http://localhost:3030/api/property-forms`  
**Method:** `POST`  
**Content-Type:** `application/json`  
**Auth:** NOT Required (Public endpoint)

---

## ✅ Required Fields

```javascript
{
  property_id: "PROP-2024-1028-ABC123",  // REQUIRED - Property you're interested in
  name: "John Doe",                       // REQUIRED - Your name
  email: "john@example.com",             // REQUIRED - Your email
  phoneNumber: "1234567890",             // REQUIRED - Your phone
  message: "I'd like to visit this property" // REQUIRED - Your message
}
```

---

## 🎨 Frontend Implementation

### Example: Submit Property Request

```javascript
const submitPropertyRequest = async (propertyId, contactInfo) => {
  const requestData = {
    property_id: propertyId,
    name: contactInfo.name,
    email: contactInfo.email,
    phoneNumber: contactInfo.phone,
    message: contactInfo.message
  };

  const response = await fetch('http://localhost:3030/api/property-forms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  });

  const result = await response.json();
  return result;
};

// Usage
const result = await submitPropertyRequest('PROP-2024-1028-ABC123', {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '1234567890',
  message: 'I would like to schedule a viewing for this property.'
});
```

### React Component Example

```javascript
import { useState } from 'react';

const PropertyRequestForm = ({ propertyId }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    message: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const requestData = {
      property_id: propertyId,
      ...formData
    };

    try {
      const response = await fetch('http://localhost:3030/api/property-forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();
      
      if (response.ok) {
        alert('Request submitted successfully!');
        // Reset form
        setFormData({ name: '', email: '', phoneNumber: '', message: '' });
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Failed to submit request');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Your Name *"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        required
      />
      
      <input
        type="email"
        placeholder="Your Email *"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        required
      />
      
      <input
        type="tel"
        placeholder="Your Phone *"
        value={formData.phoneNumber}
        onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
        required
      />
      
      <textarea
        placeholder="Your Message *"
        value={formData.message}
        onChange={(e) => setFormData({...formData, message: e.target.value})}
        required
      />
      
      <button type="submit">Submit Request</button>
    </form>
  );
};

export default PropertyRequestForm;
```

---

## 📋 Request Status Values

After submitting, the request will have these status values:

```javascript
"Requested"   // Default - New request
"Accepted"    // Admin accepted
"Ongoing"     // In process
"Completed"   // Finished
"Cancelled"   // Cancelled
```

---

## ✅ Success Response (201)

```json
{
  "message": "Property form created",
  "property_details": {
    "_id": "68ffbfc20710b8e29c38d385",
    "property_id": "PROP-2024-1028-ABC123",
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "1234567890",
    "message": "I would like to visit this property",
    "status": "Requested",
    "userId": null,
    "createdAt": "2024-10-27T19:00:00.000Z",
    "updatedAt": "2024-10-27T19:00:00.000Z"
  }
}
```

---

## ❌ Error Response (400)

If required fields are missing:

```json
{
  "message": "Missing required fields",
  "missingFields": ["property_id", "name"]
}
```

---

## 🔍 Other Available Endpoints

### Get All Property Requests (Admin Only)
**URL:** `GET http://localhost:3030/api/property-forms`  
**Auth:** Required (Admin)

### Update Property Request Status (Admin Only)
**URL:** `PUT http://localhost:3030/api/property-forms/:id`  
**Auth:** Required (Admin)

**Example:**
```javascript
const updateStatus = async (requestId, status) => {
  const response = await fetch(`http://localhost:3030/api/property-forms/${requestId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: 'Accepted' })
  });
  
  return await response.json();
};
```

### Delete Property Request (Admin Only)
**URL:** `DELETE http://localhost:3030/api/property-forms/:id`  
**Auth:** Required (Admin)

---

## 💡 Complete Flow Example

```javascript
// 1. Visitor submits a property request
const submitRequest = async () => {
  const response = await fetch('http://localhost:3030/api/property-forms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      property_id: 'PROP-2024-1028-ABC123',
      name: 'John Doe',
      email: 'john@example.com',
      phoneNumber: '1234567890',
      message: 'I want to visit this property'
    })
  });
  
  const result = await response.json();
  console.log('Request submitted:', result);
};

// 2. Admin can view all requests
const viewAllRequests = async (adminToken) => {
  const response = await fetch('http://localhost:3030/api/property-forms', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  const requests = await response.json();
  console.log('All requests:', requests);
};

// 3. Admin updates status
const approveRequest = async (requestId, adminToken) => {
  const response = await fetch(`http://localhost:3030/api/property-forms/${requestId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: 'Accepted' })
  });
  
  const result = await response.json();
  console.log('Status updated:', result);
};
```

---

## 📝 Summary

✅ **Submit Request:** `POST /api/property-forms` (Public - No auth)  
✅ **Required Fields:** property_id, name, email, phoneNumber, message  
✅ **View Requests:** `GET /api/property-forms` (Admin only)  
✅ **Update Status:** `PUT /api/property-forms/:id` (Admin only)  
✅ **Delete Request:** `DELETE /api/property-forms/:id` (Admin only)

---

## 🎯 Use Case Flow

1. **Visitor:** Sees a property listing
2. **Visitor:** Clicks "Book Viewing" or "Interested"
3. **Visitor:** Fills form with contact info and message
4. **System:** Creates property form entry with status "Requested"
5. **Admin:** Views all requests and can update status
6. **Admin:** Changes status to "Accepted", "Ongoing", or "Completed"

