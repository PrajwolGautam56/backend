# Edit/Update Property Guide

## 📝 Update Property Endpoint

**URL:** `PUT http://localhost:3030/api/properties/:id`

**Required:**
- Admin authentication (Bearer token)
- Property ID in URL

---

## 🎯 Key Points for Updating Properties

### ✅ All Fields Are OPTIONAL When Updating

You can update **ANY** field or **ALL** fields. No field is required for updates.

### 📋 Updatable Fields

```javascript
{
  name: "Updated Property Name",           // Optional
  description: "Updated description",       // Optional
  size: 1500,                               // Optional
  furnishing: "Full",                       // Optional (must be: Full, Semi, or None)
  availability: "Immediate",                // Optional
  building_type: "Villa",                   // Optional
  bhk: 3,                                   // Optional
  bathrooms: 3,                             // Optional
  bedrooms: 3,                              // Optional
  listing_type: "Sell",                    // Optional (Rent or Sell)
  parking: "Reserved",                      // Optional (Public or Reserved)
  property_type: "Residential",            // Optional
  location: "Delhi",                        // Optional
  zipcode: "110001",                        // Optional
  society: "New Society",                   // Optional
  pets_allowed: true,                       // Optional
  price: {                                  // Optional
    rent_monthly: 30000,
    sell_price: 6000000,
    deposit: 60000
  },
  amenities: ["wifi", "gym", "pool"],       // Optional
  photos: [photoFile1, photoFile2]          // Optional
}
```

---

## 🎨 Frontend Implementation

### Example: Update Property Name Only

```javascript
const propertyId = "68ffbfc20710b8e29c38d385";
const formData = new FormData();
formData.append('name', 'New Property Name');

const response = await fetch(`http://localhost:3030/api/properties/${propertyId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Example: Update Multiple Fields

```javascript
const propertyId = "68ffbfc20710b8e29c38d385";
const formData = new FormData();

// Update only what you want
formData.append('name', 'Modern Villa');
formData.append('bhk', '4');
formData.append('listing_type', 'Sell');
formData.append('price[sell_price]', '8000000');
formData.append('location', 'Bangalore');
formData.append('zipcode', '560001');

const response = await fetch(`http://localhost:3030/api/properties/${propertyId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Example: Update Photos

```javascript
const propertyId = "68ffbfc20710b8e29c38d385";
const formData = new FormData();

// Add new photos (up to 5)
for (let photo of photoFiles) {
  formData.append('photos', photo);
}

const response = await fetch(`http://localhost:3030/api/properties/${propertyId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Example: Full Update with Axios

```javascript
import axios from 'axios';

const updateProperty = async (propertyId, updates) => {
  const formData = new FormData();
  
  // Add only fields you want to update
  if (updates.name) formData.append('name', updates.name);
  if (updates.description) formData.append('description', updates.description);
  if (updates.bhk) formData.append('bhk', updates.bhk);
  if (updates.listing_type) formData.append('listing_type', updates.listing_type);
  
  if (updates.price) {
    if (updates.price.rent_monthly) {
      formData.append('price[rent_monthly]', updates.price.rent_monthly);
    }
    if (updates.price.sell_price) {
      formData.append('price[sell_price]', updates.price.sell_price);
    }
  }
  
  if (updates.photos) {
    updates.photos.forEach(photo => {
      formData.append('photos', photo);
    });
  }
  
  const token = localStorage.getItem('token');
  const response = await axios.put(
    `http://localhost:3030/api/properties/${propertyId}`,
    formData,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return response.data;
};

// Usage
updateProperty('property-id', {
  name: 'Updated Name',
  bhk: 3,
  listing_type: 'Sell'
});
```

---

## ✅ Valid Enum Values (Important!)

When updating, use these EXACT values:

### **furnishing**
```javascript
"Full"   // NOT "Fully Furnished"
"Semi"   // NOT "Semi-Furnished"  
"None"   // NOT "Unfurnished"
```

### **availability**
```javascript
"Immediate"
"Within 15 Days"
"Within 30 Days"
"After 30 Days"
```

### **building_type**
```javascript
"Apartment"
"Villa"
"Independent House"
"Pent House"
"Plot"
```

### **listing_type**
```javascript
"Rent"
"Sell"
```

### **parking**
```javascript
"Public"
"Reserved"
```

### **property_type**
```javascript
"Residential"
"Commercial"
"PG Hostel"
```

---

## 🔧 Delete Property

**Endpoint:** `DELETE http://localhost:3030/api/properties/:id`

```javascript
const response = await fetch(`http://localhost:3030/api/properties/${propertyId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## 🔧 Set Discount on Property

**Endpoint:** `POST http://localhost:3030/api/properties/:id/discount`

```javascript
const response = await fetch(`http://localhost:3030/api/properties/${propertyId}/discount`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    discountedPrice: 22000
  })
});
```

---

## 📝 Summary

✅ **Update:** `PUT /api/properties/:id` - All fields optional
✅ **Delete:** `DELETE /api/properties/:id` - Requires admin
✅ **Set Discount:** `POST /api/properties/:id/discount` - Requires admin
✅ **No Required Fields:** Update only what you need
✅ **Use Exact Enum Values:** See above for valid values

