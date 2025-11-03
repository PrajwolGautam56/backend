# Frontend Property Update Guide

## 📝 Complete Guide for Updating Properties with Photo Updates

This guide shows you how to update properties from the frontend, including proper photo handling.

---

## 🔗 API Endpoint

```
PUT /api/properties/:id
```

**Authentication:** Required (Admin Bearer Token)  
**Content-Type:** `multipart/form-data` (for file uploads)

---

## 📋 Update Property - Complete Example

### Using JavaScript/Fetch API

```javascript
// Function to update property with photos
async function updateProperty(propertyId, propertyData, newPhotos = []) {
  const token = localStorage.getItem('token'); // Or your token storage method
  const apiUrl = `http://localhost:3030/api/properties/${propertyId}`;
  
  // Create FormData for multipart/form-data
  const formData = new FormData();
  
  // Add all property fields
  if (propertyData.name) formData.append('name', propertyData.name);
  if (propertyData.description) formData.append('description', propertyData.description);
  if (propertyData.property_type) formData.append('property_type', propertyData.property_type);
  if (propertyData.size) formData.append('size', propertyData.size);
  if (propertyData.furnishing) formData.append('furnishing', propertyData.furnishing);
  if (propertyData.availability) formData.append('availability', propertyData.availability);
  if (propertyData.building_type) formData.append('building_type', propertyData.building_type);
  if (propertyData.bhk) formData.append('bhk', propertyData.bhk);
  if (propertyData.bathrooms) formData.append('bathrooms', propertyData.bathrooms);
  if (propertyData.bedrooms) formData.append('bedrooms', propertyData.bedrooms);
  if (propertyData.listing_type) formData.append('listing_type', propertyData.listing_type);
  if (propertyData.parking) formData.append('parking', propertyData.parking);
  if (propertyData.location) formData.append('location', propertyData.location);
  if (propertyData.zipcode) formData.append('zipcode', propertyData.zipcode);
  if (propertyData.society) formData.append('society', propertyData.society);
  if (propertyData.status) formData.append('status', propertyData.status);
  if (propertyData.pets_allowed !== undefined) formData.append('pets_allowed', propertyData.pets_allowed);
  
  // Handle price object
  if (propertyData.price) {
    if (propertyData.price.rent_monthly) formData.append('price[rent_monthly]', propertyData.price.rent_monthly);
    if (propertyData.price.sell_price) formData.append('price[sell_price]', propertyData.price.sell_price);
    if (propertyData.price.deposit) formData.append('price[deposit]', propertyData.price.deposit);
  }
  
  // Handle address object
  if (propertyData.address) {
    if (propertyData.address.street) formData.append('address[street]', propertyData.address.street);
    if (propertyData.address.city) formData.append('address[city]', propertyData.address.city);
    if (propertyData.address.state) formData.append('address[state]', propertyData.address.state);
    if (propertyData.address.country) formData.append('address[country]', propertyData.address.country);
  }
  
  // Handle amenities array
  if (propertyData.amenities && Array.isArray(propertyData.amenities)) {
    propertyData.amenities.forEach(amenity => {
      formData.append('amenities[]', amenity);
    });
  }
  
  // Handle location coordinates
  if (propertyData.location_coordinates) {
    if (propertyData.location_coordinates.latitude) {
      formData.append('location_coordinates[latitude]', propertyData.location_coordinates.latitude);
    }
    if (propertyData.location_coordinates.longitude) {
      formData.append('location_coordinates[longitude]', propertyData.location_coordinates.longitude);
    }
  }
  
  // ⚠️ IMPORTANT: Handle new photos
  // Field name MUST be 'photos' for updates (or 'images' for creates)
  // Append each new photo file
  if (newPhotos && newPhotos.length > 0) {
    newPhotos.forEach((photoFile, index) => {
      if (photoFile instanceof File) {
        formData.append('photos', photoFile); // Use 'photos' for updates
      }
    });
  }
  
  try {
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
        // DON'T set Content-Type header - browser will set it automatically with boundary
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update property');
    }
    
    return data; // Returns the updated property
  } catch (error) {
    console.error('Error updating property:', error);
    throw error;
  }
}

// Usage example
const propertyId = '69065f36f6437ff677d71592';
const updatedData = {
  name: 'Updated Property Name',
  description: 'Updated description',
  property_type: 'Residential',
  size: 1500,
  listing_type: 'Rent',
  price: {
    rent_monthly: 30000,
    deposit: 60000
  }
};

// Array of File objects for new photos
const newPhotos = []; // Get from file input

updateProperty(propertyId, updatedData, newPhotos)
  .then(result => {
    console.log('Property updated:', result);
    console.log('New photos:', result.photos);
  })
  .catch(error => {
    console.error('Update failed:', error);
  });
```

---

## 🖼️ React Component Example

```jsx
import React, { useState } from 'react';

const PropertyUpdateForm = ({ propertyId, initialData }) => {
  const [formData, setFormData] = useState(initialData || {});
  const [newPhotos, setNewPhotos] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState(initialData?.photos || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const token = localStorage.getItem('token');
  
  // Handle file input change
  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setNewPhotos(files);
  };
  
  // Remove existing photo
  const removeExistingPhoto = (photoUrl) => {
    setExistingPhotos(existingPhotos.filter(url => url !== photoUrl));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const formDataToSend = new FormData();
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
          if (key === 'price' && typeof formData[key] === 'object') {
            // Handle price object
            Object.keys(formData[key]).forEach(priceKey => {
              if (formData[key][priceKey]) {
                formDataToSend.append(`price[${priceKey}]`, formData[key][priceKey]);
              }
            });
          } else if (key === 'address' && typeof formData[key] === 'object') {
            // Handle address object
            Object.keys(formData[key]).forEach(addressKey => {
              if (formData[key][addressKey]) {
                formDataToSend.append(`address[${addressKey}]`, formData[key][addressKey]);
              }
            });
          } else if (Array.isArray(formData[key])) {
            // Handle arrays (amenities, etc.)
            formData[key].forEach(item => {
              formDataToSend.append(`${key}[]`, item);
            });
          } else {
            formDataToSend.append(key, formData[key]);
          }
        }
      });
      
      // Add new photos
      newPhotos.forEach(photo => {
        formDataToSend.append('photos', photo);
      });
      
      const response = await fetch(`http://localhost:3030/api/properties/${propertyId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update property');
      }
      
      setSuccess(true);
      setExistingPhotos(data.photos || []);
      setNewPhotos([]);
      
      // Clear file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      
      console.log('Property updated successfully:', data);
    } catch (err) {
      setError(err.message);
      console.error('Update error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="property-update-form">
      <h2>Update Property</h2>
      
      {/* Basic Fields */}
      <div>
        <label>Property Name:</label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
        />
      </div>
      
      <div>
        <label>Description:</label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
        />
      </div>
      
      {/* Existing Photos Display */}
      {existingPhotos.length > 0 && (
        <div>
          <label>Existing Photos:</label>
          <div className="photo-grid">
            {existingPhotos.map((photoUrl, index) => (
              <div key={index} className="photo-item">
                <img src={photoUrl} alt={`Property ${index + 1}`} />
                <button 
                  type="button"
                  onClick={() => removeExistingPhoto(photoUrl)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* New Photos Upload */}
      <div>
        <label>Add New Photos (up to 5):</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoChange}
        />
        {newPhotos.length > 0 && (
          <div>
            <p>Selected {newPhotos.length} new photo(s):</p>
            <ul>
              {newPhotos.map((photo, index) => (
                <li key={index}>{photo.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Other Fields */}
      <div>
        <label>Property Type:</label>
        <select
          value={formData.property_type || ''}
          onChange={(e) => setFormData({...formData, property_type: e.target.value})}
        >
          <option value="">Select...</option>
          <option value="Residential">Residential</option>
          <option value="Commercial">Commercial</option>
          <option value="PG Hostel">PG Hostel</option>
        </select>
      </div>
      
      <div>
        <label>Listing Type:</label>
        <select
          value={formData.listing_type || ''}
          onChange={(e) => setFormData({...formData, listing_type: e.target.value})}
        >
          <option value="">Select...</option>
          <option value="Rent">Rent</option>
          <option value="Sell">Sell</option>
        </select>
      </div>
      
      <div>
        <label>Size (sq ft):</label>
        <input
          type="number"
          value={formData.size || ''}
          onChange={(e) => setFormData({...formData, size: parseInt(e.target.value)})}
        />
      </div>
      
      {/* Price Fields */}
      {formData.listing_type === 'Rent' && (
        <div>
          <label>Monthly Rent:</label>
          <input
            type="number"
            value={formData.price?.rent_monthly || ''}
            onChange={(e) => setFormData({
              ...formData,
              price: {...formData.price, rent_monthly: parseInt(e.target.value)}
            })}
          />
        </div>
      )}
      
      {formData.listing_type === 'Sell' && (
        <div>
          <label>Sell Price:</label>
          <input
            type="number"
            value={formData.price?.sell_price || ''}
            onChange={(e) => setFormData({
              ...formData,
              price: {...formData.price, sell_price: parseInt(e.target.value)}
            })}
          />
        </div>
      )}
      
      {/* Status Messages */}
      {error && <div className="error">{error}</div>}
      {success && <div className="success">Property updated successfully!</div>}
      
      {/* Submit Button */}
      <button type="submit" disabled={loading}>
        {loading ? 'Updating...' : 'Update Property'}
      </button>
    </form>
  );
};

export default PropertyUpdateForm;
```

---

## 📤 Axios Example

```javascript
import axios from 'axios';

const updatePropertyWithAxios = async (propertyId, propertyData, newPhotos = []) => {
  const token = localStorage.getItem('token');
  
  const formData = new FormData();
  
  // Add all property fields
  Object.keys(propertyData).forEach(key => {
    if (propertyData[key] !== null && propertyData[key] !== undefined) {
      if (typeof propertyData[key] === 'object' && !Array.isArray(propertyData[key]) && !(propertyData[key] instanceof File)) {
        // Handle nested objects (price, address, etc.)
        Object.keys(propertyData[key]).forEach(nestedKey => {
          formData.append(`${key}[${nestedKey}]`, propertyData[key][nestedKey]);
        });
      } else if (Array.isArray(propertyData[key])) {
        // Handle arrays
        propertyData[key].forEach(item => {
          formData.append(`${key}[]`, item);
        });
      } else {
        formData.append(key, propertyData[key]);
      }
    }
  });
  
  // Add new photos
  newPhotos.forEach(photo => {
    formData.append('photos', photo);
  });
  
  try {
    const response = await axios.put(
      `http://localhost:3030/api/properties/${propertyId}`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data' // Axios handles this automatically
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Update error:', error.response?.data || error.message);
    throw error;
  }
};
```

---

## 🔑 Key Points

### 1. **Field Names**
- **Create:** Use `images` as field name
- **Update:** Use `photos` as field name
- Multiple photos: Append each file with the same field name

### 2. **Content-Type**
- **DO NOT** manually set `Content-Type` header
- Browser/Axios will automatically set it with proper boundary
- If using fetch, just omit the Content-Type header

### 3. **File Handling**
```javascript
// ✅ Correct - File objects
const files = Array.from(fileInput.files);
files.forEach(file => formData.append('photos', file));

// ❌ Wrong - Base64 strings
formData.append('photos', base64String); // Don't do this
```

### 4. **Updating Photos**
- New photos will be **added** to existing photos
- Old photos remain unless explicitly removed by admin
- Maximum 5 photos total

### 5. **All Fields are Optional**
You can update:
- Just the name
- Just the photos
- Just the price
- Any combination of fields
- Empty object `{}` (though not very useful)

---

## 📋 Request Example

```javascript
// Example: Update only name and add 2 photos
const formData = new FormData();
formData.append('name', 'New Property Name');
formData.append('photos', file1); // File object
formData.append('photos', file2); // File object

fetch(`http://localhost:3030/api/properties/${propertyId}`, {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: formData
});
```

---

## ✅ Response Format

```json
{
  "_id": "69065f36f6437ff677d71592",
  "name": "Updated Property Name",
  "description": "Updated description",
  "property_type": "Residential",
  "photos": [
    "https://res.cloudinary.com/.../old-photo-1.jpg",
    "https://res.cloudinary.com/.../new-photo-1.jpg",
    "https://res.cloudinary.com/.../new-photo-2.jpg"
  ],
  "status": "Available",
  "updatedAt": "2025-11-01T20:00:00.000Z",
  ...
}
```

---

## ⚠️ Common Mistakes to Avoid

1. ❌ **Setting Content-Type manually** - Let browser/framework handle it
2. ❌ **Using wrong field name** - Must be `photos` for updates
3. ❌ **Sending base64 strings** - Must send File objects
4. ❌ **Not using FormData** - Required for file uploads
5. ❌ **Missing Authorization header** - Required for admin endpoints

---

## 🧪 Quick Test (curl)

```bash
# Update property with photo
curl -X PUT http://localhost:3030/api/properties/PROPERTY_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=Updated Name" \
  -F "description=Updated description" \
  -F "photos=@/path/to/image.jpg"
```

---

## 📝 Complete Field Reference

All fields are optional. Update only what you need:

- `name` - string
- `description` - string
- `property_type` - "Residential" | "Commercial" | "PG Hostel"
- `size` - number
- `furnishing` - "Full" | "Semi" | "None"
- `availability` - "Immediate" | "Within 15 Days" | "Within 30 Days" | "After 30 Days"
- `building_type` - "Apartment" | "Villa" | "Independent House" | "Pent House" | "Plot"
- `bhk` - number
- `bathrooms` - number
- `bedrooms` - number
- `listing_type` - "Rent" | "Sell"
- `parking` - "Public" | "Reserved"
- `location` - string
- `zipcode` - string (6 digits)
- `society` - string
- `status` - "Available" | "Sold"
- `pets_allowed` - boolean
- `price[rent_monthly]` - number
- `price[sell_price]` - number
- `price[deposit]` - number
- `address[street]` - string
- `address[city]` - string
- `address[state]` - string
- `address[country]` - string
- `amenities[]` - array of strings
- `location_coordinates[latitude]` - number
- `location_coordinates[longitude]` - number
- `photos` - File objects (for updates)

---

## 🎯 Summary

**To update a property with photos:**
1. ✅ Use `PUT /api/properties/:id`
2. ✅ Use `FormData` with `multipart/form-data`
3. ✅ Use field name `photos` for new images
4. ✅ Don't set Content-Type header manually
5. ✅ Include Authorization Bearer token
6. ✅ All fields are optional - send only what you want to update

