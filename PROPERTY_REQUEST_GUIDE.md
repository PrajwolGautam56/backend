# Property Request - Creating New Property

## 🚀 Endpoint: POST /api/properties

**URL:** `http://localhost:3030/api/properties`  
**Method:** `POST`  
**Content-Type:** `multipart/form-data`  
**Required:** Admin Bearer Token

---

## ✅ ONLY REQUIRED FIELD

```javascript
{
  "name": "Your Property Name"  // THAT'S IT!
}
```

---

## 🎨 Minimal Example (Name Only)

```javascript
const formData = new FormData();
formData.append('name', 'My Property');

const response = await fetch('http://localhost:3030/api/properties', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${yourAdminToken}`
  },
  body: formData
});

const result = await response.json();
console.log(result); // { message: "property added", property_details: {...} }
```

---

## 📋 All Optional Fields (Add As Needed)

### **Basic Info**
```javascript
formData.append('description', 'Beautiful apartment');
formData.append('property_type', 'Residential'); // Will auto-set "type" field
formData.append('size', '1200');
```

### **Property Details**
```javascript
formData.append('furnishing', 'Semi');        // Use: "Full", "Semi", or "None"
formData.append('availability', 'Immediate');
formData.append('building_type', 'Apartment');
formData.append('bhk', '2');
formData.append('bathrooms', '2');
formData.append('bedrooms', '2');
formData.append('society', 'Green Valley');
```

### **Listing Details**
```javascript
formData.append('listing_type', 'Rent');       // "Rent" or "Sell"
formData.append('parking', 'Public');          // "Public" or "Reserved"
formData.append('pets_allowed', 'true');
```

### **Price**
```javascript
formData.append('price[rent_monthly]', '25000');  // If rent
formData.append('price[sell_price]', '5000000');   // If sell
formData.append('price[deposit]', '50000');
```

### **Location**
```javascript
formData.append('location', 'Mumbai');
formData.append('zipcode', '400001');
formData.append('address[street]', 'Main Street');
formData.append('address[city]', 'Mumbai');
formData.append('address[state]', 'Maharashtra');
formData.append('address[country]', 'India');
```

### **Amenities & Photos**
```javascript
formData.append('amenities', JSON.stringify(['wifi', 'gym', 'parking']));
// Add photos (up to 5)
for (let photo of photoFiles) {
  formData.append('images', photo);
}
```

---

## 🎨 Complete Frontend Example (React)

```javascript
import { useState } from 'react';

const AddPropertyForm = () => {
  const [property, setProperty] = useState({
    name: '',
    description: '',
    property_type: 'Residential',
    size: '',
    furnishing: 'Semi',
    availability: 'Immediate',
    building_type: 'Apartment',
    bhk: '',
    bathrooms: '',
    bedrooms: '',
    listing_type: 'Rent',
    parking: 'Public',
    location: '',
    zipcode: ''
  });
  
  const [price, setPrice] = useState({
    rent_monthly: '',
    deposit: ''
  });
  
  const [photos, setPhotos] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    
    // REQUIRED: Only name
    formData.append('name', property.name);
    
    // OPTIONAL: Add other fields
    if (property.description) formData.append('description', property.description);
    if (property.property_type) formData.append('property_type', property.property_type);
    if (property.size) formData.append('size', property.size);
    if (property.furnishing) formData.append('furnishing', property.furnishing);
    if (property.availability) formData.append('availability', property.availability);
    if (property.building_type) formData.append('building_type', property.building_type);
    if (property.bhk) formData.append('bhk', property.bhk);
    if (property.bathrooms) formData.append('bathrooms', property.bathrooms);
    if (property.bedrooms) formData.append('bedrooms', property.bedrooms);
    if (property.listing_type) formData.append('listing_type', property.listing_type);
    if (property.parking) formData.append('parking', property.parking);
    if (property.location) formData.append('location', property.location);
    if (property.zipcode) formData.append('zipcode', property.zipcode);
    
    // Add price
    if (price.rent_monthly) formData.append('price[rent_monthly]', price.rent_monthly);
    if (price.deposit) formData.append('price[deposit]', price.deposit);
    
    // Add photos
    photos.forEach(photo => {
      formData.append('images', photo);
    });
    
    // Send request
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:3030/api/properties', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const result = await response.json();
    console.log('Property created:', result);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ONLY REQUIRED FIELD */}
      <input
        type="text"
        placeholder="Property Name *"
        value={property.name}
        onChange={(e) => setProperty({...property, name: e.target.value})}
        required
      />
      
      {/* All other fields are optional */}
      <textarea
        placeholder="Description"
        value={property.description}
        onChange={(e) => setProperty({...property, description: e.target.value})}
      />
      
      <select
        value={property.property_type}
        onChange={(e) => setProperty({...property, property_type: e.target.value})}
      >
        <option value="Residential">Residential</option>
        <option value="Commercial">Commercial</option>
        <option value="PG Hostel">PG Hostel</option>
      </select>
      
      {/* Add more fields as needed... */}
      
      <button type="submit">Create Property</button>
    </form>
  );
};

export default AddPropertyForm;
```

---

## ⚠️ Important: Use Correct Enum Values

### **furnishing**
- ✅ "Full" (NOT "Fully Furnished")
- ✅ "Semi" (NOT "Semi-Furnished")
- ✅ "None" (NOT "Unfurnished")

### **availability**
- ✅ "Immediate"
- ✅ "Within 15 Days"
- ✅ "Within 30 Days"
- ✅ "After 30 Days"

### **building_type**
- ✅ "Apartment"
- ✅ "Villa"
- ✅ "Independent House"
- ✅ "Pent House"
- ✅ "Plot"

### **listing_type**
- ✅ "Rent"
- ✅ "Sell"

### **parking**
- ✅ "Public"
- ✅ "Reserved"

### **property_type**
- ✅ "Residential"
- ✅ "Commercial"
- ✅ "PG Hostel"

---

## 📝 Response

### Success (201)
```json
{
  "message": "property added",
  "property_details": {
    "_id": "...",
    "property_id": "PROP-2024-1028-ABC123",
    "name": "Your Property Name",
    // ... other fields
  }
}
```

### Error (400)
```json
{
  "message": "Property name is required",
  "missingFields": ["name"]
}
```

---

## ✅ Quick Summary

1. **Endpoint:** `POST /api/properties`
2. **Required:** `name` field only
3. **Everything else:** Optional
4. **Auth:** Admin Bearer token
5. **Content-Type:** `multipart/form-data`
6. **Max Photos:** 5 images
7. **Use exact enum values:** See above

