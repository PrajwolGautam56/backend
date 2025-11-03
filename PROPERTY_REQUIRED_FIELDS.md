# Property API - Required Fields Guide

## ❌ Common 400 Bad Request Errors

If you're getting a 400 error when adding a property, check these required fields:

---

## ✅ Required Fields for Adding Property

### **Minimal Required - ONLY NAME**
```javascript
{
  name: "Modern Apartment"  // REQUIRED - That's it!
}
```

### **All Other Fields Are OPTIONAL**
```javascript
{
  description: "Beautiful apartment",     // OPTIONAL
  size: 1200,                             // OPTIONAL (in sq ft)
  furnishing: "Full",                     // OPTIONAL (Full | Semi | None)
  availability: "Immediate",              // OPTIONAL
  building_type: "Apartment",            // OPTIONAL (Apartment | Villa | Independent House | Pent House | Plot)
  bhk: 2,                                 // OPTIONAL
  bathrooms: 2,                           // OPTIONAL
  bedrooms: 2,                            // OPTIONAL
  listing_type: "Rent",                   // OPTIONAL (Rent | Sell)
  parking: "Public",                      // OPTIONAL (Public | Reserved)
  property_type: "Residential",           // OPTIONAL (Residential | Commercial | PG Hostel)
  location: "Mumbai",                     // OPTIONAL
  zipcode: "400001"                       // OPTIONAL (6 digits)
}
```

### **Price (Based on listing_type)**
```javascript
// If listing_type is "Rent"
price: {
  rent_monthly: 25000,    // REQUIRED
  deposit: 50000         // Optional
}

// If listing_type is "Sell"
price: {
  sell_price: 5000000    // REQUIRED
}

// If listing_type is "Rent & Sell"
price: {
  rent_monthly: 25000,
  sell_price: 5000000,
  deposit: 50000
}
```

### **Address (Required if location is provided)**
```javascript
address: {
  street: "Main Street",      // REQUIRED
  city: "Mumbai",              // REQUIRED
  state: "Maharashtra",        // REQUIRED
  country: "India"             // REQUIRED
}
```

### **Optional Fields**
```javascript
{
  society: "Green Valley",
  amenities: ["wifi", "gym", "parking"],
  pets_allowed: true,
  location_coordinates: {
    latitude: 19.0760,
    longitude: 72.8777
  }
}
```

---

## 📝 Example: Complete Form Data

```javascript
const formData = new FormData();

// ONLY REQUIRED FIELD
formData.append('name', 'Modern 2BHK Apartment');

// All other fields are OPTIONAL - add as needed
formData.append('description', 'Beautiful apartment in city center');
formData.append('property_type', 'Residential'); // Will auto-set type field
formData.append('size', '1200');
formData.append('furnishing', 'Semi');
formData.append('availability', 'Immediate');
formData.append('building_type', 'Apartment');
formData.append('bhk', '2');
formData.append('bathrooms', '2');
formData.append('bedrooms', '2');
formData.append('listing_type', 'Rent');
formData.append('parking', 'Reserved');
formData.append('location', 'Mumbai');
formData.append('zipcode', '400001');

// Price (optional)
formData.append('price[rent_monthly]', '25000');
formData.append('price[deposit]', '50000');

// Address (optional)
formData.append('address[street]', 'Main Street');
formData.append('address[city]', 'Mumbai');
formData.append('address[state]', 'Maharashtra');
formData.append('address[country]', 'India');

// Optional fields
formData.append('society', 'Green Valley');
formData.append('pets_allowed', 'true');
formData.append('amenities', JSON.stringify(['wifi', 'gym', 'parking']));

// Photos (up to 5 images)
for (let photo of photoFiles) {
  formData.append('images', photo);
}

// Send request
fetch('http://localhost:3030/api/properties', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

---

## 🎯 Common Errors & Solutions

### Error: "Missing required fields"
**Solution:** Check if all required fields are provided. The response will show which fields are missing:
```json
{
  "message": "Missing required fields",
  "missingFields": ["bhk", "bathrooms", "bedrooms"]
}
```

### Error: "Rent amount is required for rental properties"
**Solution:** Add `price[rent_monthly]` if listing_type is "Rent"
```javascript
formData.append('price[rent_monthly]', '25000');
```

### Error: "Selling price is required for sale properties"
**Solution:** Add `price[sell_price]` if listing_type is "Sell"
```javascript
formData.append('price[sell_price]', '5000000');
```

### Error: "Complete address details are required"
**Solution:** Provide all address fields:
```javascript
formData.append('address[street]', '...');
formData.append('address[city]', '...');
formData.append('address[state]', '...');
formData.append('address[country]', '...');
```

### Error: ValidationError
**Solution:** Check that enum values are correct:
- `furnishing`: "Full", "Semi", "None"
- `availability`: "Immediate", "Within 15 Days", "Within 30 Days", "After 30 Days"
- `building_type`: "Apartment", "Villa", "Independent House", "Pent House", "Plot"
- `listing_type`: "Rent", "Sell"
- `parking`: "Public", "Reserved"
- `property_type`: "Residential", "Commercial", "PG Hostel"

---

## ✅ Quick Test

```bash
curl -X POST http://localhost:3030/api/properties \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=Test Apartment" \
  -F "description=Test Description" \
  -F "type=Residential" \
  -F "size=1000" \
  -F "furnishing=Full" \
  -F "availability=Immediate" \
  -F "building_type=Apartment" \
  -F "bhk=2" \
  -F "bathrooms=2" \
  -F "bedrooms=2" \
  -F "listing_type=Rent" \
  -F "parking=Public" \
  -F "property_type=Residential" \
  -F "location=Mumbai" \
  -F "zipcode=400001" \
  -F "price[rent_monthly]=20000" \
  -F "address[street]=Test St" \
  -F "address[city]=Mumbai" \
  -F "address[state]=Maharashtra" \
  -F "address[country]=India"
```

