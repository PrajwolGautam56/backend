# Property Update/Edit - Frontend Implementation Guide

## 📋 Overview

This guide provides complete instructions for implementing property update/edit functionality in the frontend. The backend endpoint handles FormData with proper parsing for nested objects, arrays, and type conversions.

---

## 🔗 API Endpoint

**URL:** `PUT /api/properties/:id`

**Headers:**
```javascript
{
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  // DO NOT set Content-Type header - browser will set it automatically for FormData
}
```

**Authentication:** Admin only (requires Bearer token)

---

## 📤 Request Format

### Using FormData (Recommended)

The backend expects `multipart/form-data` format. Use `FormData` to send the request.

### ✅ Supported Field Formats

#### 1. Simple Fields (Strings)
```javascript
formData.append('name', 'Updated Property Name');
formData.append('description', 'Updated description');
formData.append('location', 'Delhi');
formData.append('society', 'New Society');
formData.append('zipcode', '110001');
```

#### 2. Enum Fields (Must match exact values)
```javascript
// Furnishing: 'Full', 'Semi', or 'None'
formData.append('furnishing', 'Full');

// Availability: 'Immediate', 'Within 15 Days', 'Within 30 Days', 'After 30 Days'
formData.append('availability', 'Immediate');

// Building Type: 'Apartment', 'Villa', 'Independent House', 'Pent House', 'Plot'
formData.append('building_type', 'Villa');

// Listing Type: 'Rent' or 'Sell'
formData.append('listing_type', 'Rent');

// Parking: 'Public', 'Reserved', or 'Covered'
formData.append('parking', 'Covered');

// Property Type: 'Residential', 'Commercial', 'PG Hostel'
formData.append('property_type', 'Residential');

// Status: 'Available' or 'Sold'
formData.append('status', 'Available');
```

#### 3. Number Fields
```javascript
formData.append('size', '1500');        // String or number - backend converts
formData.append('bhk', '3');
formData.append('bathrooms', '2');
formData.append('bedrooms', '3');
```

#### 4. Boolean Fields
```javascript
formData.append('pets_allowed', 'true');  // String 'true'/'false' or boolean
// OR
formData.append('pets_allowed', true);    // Boolean value
```

#### 5. Nested Price Object
```javascript
formData.append('price[rent_monthly]', '30000');
formData.append('price[sell_price]', '6000000');
formData.append('price[deposit]', '60000');
```

#### 6. Nested Address Object
```javascript
formData.append('address[street]', '123 Main Street');
formData.append('address[city]', 'Bangalore');
formData.append('address[state]', 'Karnataka');
formData.append('address[country]', 'India');
```

#### 7. Location Coordinates
```javascript
formData.append('location_coordinates[latitude]', '12.9716');
formData.append('location_coordinates[longitude]', '77.5946');
```

#### 8. Amenities Array
```javascript
// Option 1: Multiple append calls
formData.append('amenities[]', 'wifi');
formData.append('amenities[]', 'gym');
formData.append('amenities[]', 'pool');

// Option 2: Single JSON string (also supported)
formData.append('amenities', JSON.stringify(['wifi', 'gym', 'pool']));
```

#### 9. Existing Photos Array (for photo deletion)
```javascript
// Send array of photo URLs that should be KEPT
// Photos NOT in this array will be DELETED from Cloudinary

// Option 1: Multiple append calls (recommended)
formData.append('existingPhotos[]', 'https://res.cloudinary.com/.../photo1.jpg');
formData.append('existingPhotos[]', 'https://res.cloudinary.com/.../photo2.jpg');

// Option 2: Single JSON string (also supported)
formData.append('existingPhotos', JSON.stringify([
  'https://res.cloudinary.com/.../photo1.jpg',
  'https://res.cloudinary.com/.../photo2.jpg'
]));
```

#### 10. New Photos (File Upload)
```javascript
// Append file objects for new photos to upload
const fileInput = document.querySelector('input[type="file"]');
if (fileInput.files) {
  for (let i = 0; i < fileInput.files.length; i++) {
    formData.append('photos', fileInput.files[i]);
  }
}
```

---

## 💻 Complete Frontend Example

### React Example

```javascript
import React, { useState } from 'react';
import axios from 'axios';

const UpdatePropertyForm = ({ propertyId, existingProperty }) => {
  const [formData, setFormData] = useState({
    name: existingProperty.name || '',
    description: existingProperty.description || '',
    size: existingProperty.size || '',
    furnishing: existingProperty.furnishing || '',
    availability: existingProperty.availability || '',
    building_type: existingProperty.building_type || '',
    bhk: existingProperty.bhk || '',
    bathrooms: existingProperty.bathrooms || '',
    bedrooms: existingProperty.bedrooms || '',
    listing_type: existingProperty.listing_type || '',
    parking: existingProperty.parking || '',
    property_type: existingProperty.property_type || '',
    location: existingProperty.location || '',
    zipcode: existingProperty.zipcode || '',
    society: existingProperty.society || '',
    pets_allowed: existingProperty.pets_allowed || false,
    rent_monthly: existingProperty.price?.rent_monthly || '',
    sell_price: existingProperty.price?.sell_price || '',
    deposit: existingProperty.price?.deposit || '',
    street: existingProperty.address?.street || '',
    city: existingProperty.address?.city || '',
    state: existingProperty.address?.state || '',
    country: existingProperty.address?.country || '',
    amenities: existingProperty.amenities || [],
    status: existingProperty.status || 'Available'
  });

  const [existingPhotos, setExistingPhotos] = useState(existingProperty.photos || []);
  const [photosToKeep, setPhotosToKeep] = useState(existingProperty.photos || []);
  const [newPhotos, setNewPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNestedInputChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  const handlePhotoRemove = (photoUrl) => {
    setPhotosToKeep(prev => prev.filter(url => url !== photoUrl));
  };

  const handleNewPhotosChange = (e) => {
    setNewPhotos(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const formDataToSend = new FormData();

      // Add simple string fields
      if (formData.name) formDataToSend.append('name', formData.name);
      if (formData.description) formDataToSend.append('description', formData.description);
      if (formData.location) formDataToSend.append('location', formData.location);
      if (formData.society) formDataToSend.append('society', formData.society);
      if (formData.zipcode) formDataToSend.append('zipcode', formData.zipcode);

      // Add enum fields
      if (formData.furnishing) formDataToSend.append('furnishing', formData.furnishing);
      if (formData.availability) formDataToSend.append('availability', formData.availability);
      if (formData.building_type) formDataToSend.append('building_type', formData.building_type);
      if (formData.listing_type) formDataToSend.append('listing_type', formData.listing_type);
      if (formData.parking) formDataToSend.append('parking', formData.parking);
      if (formData.property_type) formDataToSend.append('property_type', formData.property_type);
      if (formData.status) formDataToSend.append('status', formData.status);

      // Add number fields
      if (formData.size) formDataToSend.append('size', formData.size.toString());
      if (formData.bhk) formDataToSend.append('bhk', formData.bhk.toString());
      if (formData.bathrooms) formDataToSend.append('bathrooms', formData.bathrooms.toString());
      if (formData.bedrooms) formDataToSend.append('bedrooms', formData.bedrooms.toString());

      // Add boolean field
      formDataToSend.append('pets_allowed', formData.pets_allowed.toString());

      // Add nested price object
      if (formData.rent_monthly) {
        formDataToSend.append('price[rent_monthly]', formData.rent_monthly.toString());
      }
      if (formData.sell_price) {
        formDataToSend.append('price[sell_price]', formData.sell_price.toString());
      }
      if (formData.deposit) {
        formDataToSend.append('price[deposit]', formData.deposit.toString());
      }

      // Add nested address object
      if (formData.street) formDataToSend.append('address[street]', formData.street);
      if (formData.city) formDataToSend.append('address[city]', formData.city);
      if (formData.state) formDataToSend.append('address[state]', formData.state);
      if (formData.country) formDataToSend.append('address[country]', formData.country);

      // Add amenities array
      if (formData.amenities && formData.amenities.length > 0) {
        formData.amenities.forEach(amenity => {
          formDataToSend.append('amenities[]', amenity);
        });
      }

      // Add existing photos to keep (IMPORTANT for photo deletion)
      photosToKeep.forEach(photoUrl => {
        formDataToSend.append('existingPhotos[]', photoUrl);
      });

      // Add new photos to upload
      newPhotos.forEach(photo => {
        formDataToSend.append('photos', photo);
      });

      const token = localStorage.getItem('token'); // Or your token storage method

      const response = await axios.put(
        `/api/properties/${propertyId}`,
        formDataToSend,
        {
          headers: {
            'Authorization': `Bearer ${token}`
            // DO NOT set Content-Type - axios will set it automatically for FormData
          }
        }
      );

      setSuccess(true);
      setExistingPhotos(response.data.photos || []);
      setPhotosToKeep(response.data.photos || []);
      setNewPhotos([]);
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';

      console.log('Property updated successfully:', response.data);
    } catch (err) {
      console.error('Error updating property:', err);
      setError(err.response?.data?.message || 'Failed to update property');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <input
        type="text"
        name="name"
        value={formData.name}
        onChange={handleInputChange}
        placeholder="Property Name"
      />

      {/* ... other form fields ... */}

      {/* Existing Photos Display with Remove Option */}
      <div>
        <h3>Existing Photos</h3>
        {existingPhotos.map((photoUrl, index) => (
          <div key={index}>
            <img src={photoUrl} alt={`Photo ${index + 1}`} style={{ width: '100px' }} />
            {photosToKeep.includes(photoUrl) ? (
              <button type="button" onClick={() => handlePhotoRemove(photoUrl)}>
                Remove
              </button>
            ) : (
              <span>Will be deleted</span>
            )}
          </div>
        ))}
      </div>

      {/* New Photos Upload */}
      <div>
        <h3>Add New Photos</h3>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleNewPhotosChange}
        />
      </div>

      {error && <div style={{ color: 'red' }}>{error}</div>}
      {success && <div style={{ color: 'green' }}>Property updated successfully!</div>}

      <button type="submit" disabled={loading}>
        {loading ? 'Updating...' : 'Update Property'}
      </button>
    </form>
  );
};

export default UpdatePropertyForm;
```

---

## 🎯 Key Points for Frontend

### ✅ DO's

1. **Use FormData** - Always use `FormData` for property updates
2. **Send existingPhotos[]** - Always send the array of photo URLs you want to KEEP
3. **Use correct field names** - Match exact field names (e.g., `building_type`, not `buildingType`)
4. **Use enum values exactly** - Parking must be 'Public', 'Reserved', or 'Covered' (case-sensitive)
5. **Handle nested objects** - Use bracket notation: `price[rent_monthly]`, `address[city]`
6. **Send arrays properly** - Use `amenities[]` or `existingPhotos[]` format
7. **Don't set Content-Type** - Let the browser/axios set it automatically for FormData

### ❌ DON'Ts

1. **Don't send JSON** - Don't use `Content-Type: application/json` with FormData
2. **Don't skip existingPhotos** - If you don't send `existingPhotos[]`, all photos will be kept
3. **Don't use wrong enum values** - 'Covered' is valid, but 'covered' (lowercase) is not
4. **Don't send empty strings** - Backend treats empty strings as undefined (optional)
5. **Don't send null** - Backend ignores null/undefined values

---

## 🔍 Photo Management Logic

### How Photo Deletion Works

1. **Frontend sends `existingPhotos[]`** - Array of photo URLs to KEEP
2. **Backend compares** - Compares with existing photos in database
3. **Backend deletes** - Photos NOT in `existingPhotos[]` are deleted from Cloudinary
4. **Backend uploads** - New photos from `photos` field are uploaded
5. **Backend combines** - Final array = `existingPhotos[]` + newly uploaded photos

### Example Flow

```javascript
// Initial state: Property has 3 photos
existingPhotos = [
  'https://cloudinary.com/photo1.jpg',
  'https://cloudinary.com/photo2.jpg',
  'https://cloudinary.com/photo3.jpg'
];

// User removes photo2, adds 2 new photos
photosToKeep = [
  'https://cloudinary.com/photo1.jpg',
  'https://cloudinary.com/photo3.jpg'
];

// Frontend sends:
formData.append('existingPhotos[]', 'https://cloudinary.com/photo1.jpg');
formData.append('existingPhotos[]', 'https://cloudinary.com/photo3.jpg');
formData.append('photos', newFile1);
formData.append('photos', newFile2);

// Backend result: 4 photos total
// - photo1.jpg (kept)
// - photo3.jpg (kept)
// - newFile1.jpg (uploaded)
// - newFile2.jpg (uploaded)
// - photo2.jpg (deleted from Cloudinary)
```

---

## 🐛 Common Errors & Solutions

### Error: "Validation failed: parking: `Covered` is not a valid enum value"
**Solution:** Make sure you're sending exactly `'Covered'` (capital C), not `'covered'` or `'COVERED'`

### Error: "Property not found"
**Solution:** Check that the property ID in the URL is correct

### Error: "Unauthorized"
**Solution:** Make sure you're sending a valid Bearer token in the Authorization header

### Photos not deleting
**Solution:** Make sure you're sending `existingPhotos[]` array with the URLs you want to KEEP

### Nested fields not updating
**Solution:** Use bracket notation: `price[rent_monthly]`, not `price.rent_monthly` or `price.rentMonthly`

---

## 📝 Field Reference

### All Updatable Fields

| Field | Type | Format | Example |
|-------|------|--------|---------|
| `name` | string | Simple | `"Brigade Meadows 2BHK"` |
| `description` | string | Simple | `"Beautiful apartment..."` |
| `size` | number | Simple | `1500` |
| `furnishing` | enum | Simple | `"Full"` |
| `availability` | enum | Simple | `"Immediate"` |
| `building_type` | enum | Simple | `"Villa"` |
| `bhk` | number | Simple | `3` |
| `bathrooms` | number | Simple | `2` |
| `bedrooms` | number | Simple | `3` |
| `listing_type` | enum | Simple | `"Rent"` |
| `parking` | enum | Simple | `"Covered"` |
| `property_type` | enum | Simple | `"Residential"` |
| `location` | string | Simple | `"Bangalore"` |
| `zipcode` | string | Simple | `"560001"` |
| `society` | string | Simple | `"ABC Society"` |
| `pets_allowed` | boolean | Simple | `true` |
| `status` | enum | Simple | `"Available"` |
| `price.rent_monthly` | number | Nested | `price[rent_monthly]` |
| `price.sell_price` | number | Nested | `price[sell_price]` |
| `price.deposit` | number | Nested | `price[deposit]` |
| `address.street` | string | Nested | `address[street]` |
| `address.city` | string | Nested | `address[city]` |
| `address.state` | string | Nested | `address[state]` |
| `address.country` | string | Nested | `address[country]` |
| `location_coordinates.latitude` | number | Nested | `location_coordinates[latitude]` |
| `location_coordinates.longitude` | number | Nested | `location_coordinates[longitude]` |
| `amenities` | array | Array | `amenities[]` |
| `existingPhotos` | array | Array | `existingPhotos[]` |
| `photos` | files | Files | `photos` (file objects) |

---

## ✅ Testing Checklist

- [ ] Can update simple string fields
- [ ] Can update number fields
- [ ] Can update enum fields (with correct values)
- [ ] Can update boolean fields
- [ ] Can update nested price object
- [ ] Can update nested address object
- [ ] Can update location coordinates
- [ ] Can update amenities array
- [ ] Can remove existing photos
- [ ] Can add new photos
- [ ] Can do both: remove and add photos simultaneously
- [ ] Empty fields are ignored (not overwritten)
- [ ] Validation errors show helpful messages
- [ ] Success response includes updated property

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check network tab for request/response
3. Check backend logs for detailed error messages
4. Verify all enum values match exactly (case-sensitive)
5. Verify FormData is being sent correctly

