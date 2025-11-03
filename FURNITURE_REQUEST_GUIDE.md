# Furniture Request - User Guide

## 📍 Endpoint
```
POST http://localhost:3030/api/furniture-forms
```
**No Authentication Required** (Public endpoint)

---

## ✅ Request Data Structure

### Required Fields:
```javascript
{
  furniture_id: "FURN-2024-1028-ABC123",  // REQUIRED - The furniture ID
  name: "John Doe",                       // REQUIRED - Your full name
  email: "john@example.com",             // REQUIRED - Your email
  phoneNumber: "1234567890",             // REQUIRED - Your phone number
  message: "I'm interested in this item"  // REQUIRED - Your message
}
```

### Optional Fields:
```javascript
{
  listing_type: "Rent",  // Optional: "Rent" | "Sell" | "Rent & Sell"
  userId: "optional-user-id-if-logged-in"
}
```

---

## 📤 How to Submit Request

### Option 1: Logged-in User (Recommended)
```javascript
const submitFurnitureRequest = async (furnitureId, userData) => {
  const requestData = {
    furniture_id: furnitureId,
    name: userData.name,
    email: userData.email,
    phoneNumber: userData.phone,
    message: userData.message,
    listing_type: userData.type  // "Rent", "Sell", or "Rent & Sell"
  };

  const token = localStorage.getItem('token');
  
  const response = await fetch('http://localhost:3030/api/furniture-forms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    body: JSON.stringify(requestData)
  });

  return await response.json();
};
```

### Option 2: Guest User (No Login)
```javascript
const submitAsGuest = async (furnitureId, contactInfo) => {
  const requestData = {
    furniture_id: furnitureId,
    name: contactInfo.name,
    email: contactInfo.email,
    phoneNumber: contactInfo.phone,
    message: contactInfo.message,
    listing_type: contactInfo.type
  };

  const response = await fetch('http://localhost:3030/api/furniture-forms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  });

  return await response.json();
};
```

---

## ✅ Success Response (201)

```json
{
  "message": "Furniture request submitted successfully",
  "request_details": {
    "_id": "68ffbfc20710b8e29c38d385",
    "furniture_id": "FURN-2024-1028-ABC123",
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "1234567890",
    "message": "I want to rent this sofa",
    "listing_type": "Rent,
    "status": "Requested",
    "createdAt": "2024-10-27T20:00:00.000Z"
  },
  "furniture_details": {
    "furniture_id": "FURN-2024-1028-ABC123",
    "name": "Modern Sofa Set",
    "category": "Furniture",
    "listing_type": "Rent",
    "price": {
      "rent_monthly": 2000
    },
    // ... other furniture fields
  }
}
```

---

## ❌ Error Responses

### Missing Required Fields (400)
```json
{
  "message": "Missing required fields",
  "missingFields": ["furniture_id", "name", "email"]
}
```

### Furniture Not Found (404)
```json
{
  "message": "Furniture item not found"
}
```

---

## 🎨 Complete React Component Example

```javascript
import { useState } from 'react';

const FurnitureRequestForm = ({ furnitureId, listingType }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    message: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const requestData = {
      furniture_id: furnitureId,
      listing_type: listingType,
      ...formData
    };

    // Include token if user is logged in
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch('http://localhost:3030/api/furniture-forms', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestData)
      });

      const data = await res.json();
      
      if (res.ok) {
        setResponse({
          success: true,
          message: 'Request submitted successfully!',
          data: data
        });
        // Reset form
        setFormData({ name: '', email: '', phoneNumber: '', message: '' });
      } else {
        setResponse({
          success: false,
          message: data.message,
          missingFields: data.missingFields
        });
      }
    } catch (error) {
      setResponse({
        success: false,
        message: 'Failed to submit request'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="furniture-request-form">
      <h2>Request Furniture</h2>
      
      {response && (
        <div className={`alert ${response.success ? 'success' : 'error'}`}>
          {response.success ? (
            <div>
              <p>{response.message}</p>
              <p>You will receive an email confirmation shortly.</p>
            </div>
          ) : (
            <div>
              <p>{response.message}</p>
              {response.missingFields && (
                <p>Missing: {response.missingFields.join(', ')}</p>
              )}
            </div>
          )}
        </div>
      )}

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
          placeholder="Phone Number *"
          value={formData.phoneNumber}
          onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
          required
        />
        
        <textarea
          placeholder="Your Message *"
          value={formData.message}
          onChange={(e) => setFormData({...formData, message: e.target.value})}
          required
          rows={4}
        />
        
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
};

export default FurnitureRequestForm;
```

---

## 📋 Data Requirements Summary

### What Frontend Needs to Send:
```javascript
POST /api/furniture-forms

Headers:
{
  "Content-Type": "application/json"
  // Optional: "Authorization": "Bearer <token>" if user logged in
}

Body:
{
  "furniture_id": "FURN-2024-1028-ABC123",  // From furniture.furniture_id
  "name": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "1234567890",
  "message": "I'd like to rent this item",
  "listing_type": "Rent"  // Optional
}
```

### What You'll Receive:

**Success (201):**
```json
{
  "message": "Furniture request submitted successfully",
  "request_details": { /* request data */ },
  "furniture_details": { /* furniture data */ }
}
```

**Error (400):**
```json
{
  "message": "Missing required fields",
  "missingFields": ["furniture_id"]
}
```

---

## 🎯 Key Points

✅ **Public Endpoint:** No authentication required  
✅ **Track Activity:** Include Bearer token to track logged user activity  
✅ **Furniture Validation:** Furniture must exist  
✅ **Email Notification:** Customer receives confirmation email  
✅ **Status Tracking:** Request starts as "Requested"  
✅ **Listing Types:** Support Rent, Sell, or Rent & Sell

