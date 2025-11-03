# Property Request - Complete Implementation Guide

## 📍 Endpoint
```
POST http://localhost:3030/api/property-forms
```
**No Authentication Required** (Public endpoint)

---

## ✅ Request Data Structure

### Required Fields:
```javascript
{
  property_id: "PROP-2024-1028-ABC123",  // REQUIRED - The property ID
  name: "John Doe",                      // REQUIRED - Your full name
  email: "john@example.com",            // REQUIRED - Your email
  phoneNumber: "1234567890",            // REQUIRED - Your phone number
  message: "I'm interested in this property" // REQUIRED - Your message
}
```

### Optional Fields:
```javascript
{
  userId: "optional-user-id-if-logged-in" // Optional - If user is logged in
}
```

---

## 📤 How to Submit Request

### Option 1: Logged-in User (Recommended)
If the user is logged in, include the authorization header to track activity:

```javascript
const submitPropertyRequest = async (propertyId, userData) => {
  const requestData = {
    property_id: propertyId,
    name: userData.name,
    email: userData.email,
    phoneNumber: userData.phone,
    message: userData.message
  };

  const token = localStorage.getItem('token');
  
  const response = await fetch('http://localhost:3030/api/property-forms', {
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
Guests can also submit without authentication:

```javascript
const submitAsGuest = async (propertyId, contactInfo) => {
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

  return await response.json();
};
```

---

## ✅ Success Response (201)

```json
{
  "message": "Property request submitted successfully",
  "request_details": {
    "_id": "68ffbfc20710b8e29c38d385",
    "property_id": "PROP-2024-1028-ABC123",
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "1234567890",
    "message": "I'm interested in this property",
    "status": "Requested",
    "userId": null,
    "createdAt": "2024-10-27T20:00:00.000Z",
    "updatedAt": "2024-10-27T20:00:00.000Z"
  },
  "property_details": {
    "_id": "...",
    "property_id": "PROP-2024-1028-ABC123",
    "name": "Modern 2BHK Apartment",
    "bhk": 2,
    "location": "Mumbai",
    "price": {
      "rent_monthly": 25000
    },
    // ... other property fields
  }
}
```

---

## ❌ Error Responses

### Missing Required Fields (400)
```json
{
  "message": "Missing required fields",
  "missingFields": ["property_id", "name", "email"]
}
```

### Property Not Found (404)
```json
{
  "message": "Property not found"
}
```

### Server Error (500)
```json
{
  "message": "Error creating property form",
  "error": "..."
}
```

---

## 🎨 Complete React Component Example

```javascript
import { useState } from 'react';

const PropertyRequestForm = ({ propertyId }) => {
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
      property_id: propertyId, // Pass the property ID
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
      const res = await fetch('http://localhost:3030/api/property-forms', {
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
    <div className="property-request-form">
      <h2>Request Property Viewing</h2>
      
      {response && (
        <div className={`alert ${response.success ? 'success' : 'error'}`}>
          {response.success ? (
            <div>
              <p>{response.message}</p>
              <p>Booking ID: {response.data.request_details._id}</p>
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

export default PropertyRequestForm;
```

---

## 🔍 Complete Example: Fetch Property ID First

```javascript
// First, get property details
const getPropertyDetails = async (propertyId) => {
  const response = await fetch(`http://localhost:3030/api/properties/${propertyId}`);
  const property = await response.json();
  
  return property.property_id; // Use this for the request
};

// Then submit request
const PropertyViewingPage = ({ propertyId }) => {
  const [property, setProperty] = useState(null);

  useEffect(() => {
    const loadProperty = async () => {
      const prop = await getPropertyDetails(propertyId);
      setProperty(prop);
    };
    loadProperty();
  }, [propertyId]);

  return (
    <div>
      {property && (
        <>
          <h1>{property.name}</h1>
          <p>{property.property_id}</p>
          <PropertyRequestForm propertyId={property.property_id} />
        </>
      )}
    </div>
  );
};
```

---

## 📋 Data Requirements Summary

### What Frontend Needs to Send:
```javascript
POST /api/property-forms

Headers:
{
  "Content-Type": "application/json"
  // Optional: "Authorization": "Bearer <token>" if user logged in
}

Body:
{
  "property_id": "PROP-2024-1028-ABC123",  // From property.property_id
  "name": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "1234567890",
  "message": "I'd like to visit this property"
}
```

### What You'll Receive:

**Success (201):**
```json
{
  "message": "Property request submitted successfully",
  "request_details": { /* request data */ },
  "property_details": { /* property data */ }
}
```

**Error (400):**
```json
{
  "message": "Missing required fields",
  "missingFields": ["property_id"]
}
```

---

## 🎯 Key Points

✅ **Public Endpoint:** No authentication required  
✅ **Track Activity:** Include Bearer token to track logged user activity  
✅ **Property Validation:** Property must exist (returns property details if found)  
✅ **Error Messages:** Clear error messages with missing fields list  
✅ **User Activity Log:** Automatically tracked for logged-in users

