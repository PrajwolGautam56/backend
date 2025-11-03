# Properties API Integration Guide

## 🎯 Overview
The Properties API allows users to browse, search, and filter residential, commercial properties, and PG hostels for rent or sale.

## 📡 Base URL
```
http://localhost:3030/api/properties
```

---

## 📋 Available Endpoints

### 1. **Get All Properties** (Public)
```javascript
GET /api/properties
GET /api/properties?propertyType=Residential&listingType=Rent&bhk=2&page=1&limit=12
```

#### Query Parameters:
- `propertyType`: Residential | Commercial | PG Hostel
- `listingType`: Rent | Sell
- `bhk`: number (1, 2, 3, 4, etc.)
- `bedrooms`: number
- `bathrooms`: number
- `building_type`: Apartment | Villa | Independent House | Pent House | Plot
- `furnishing`: Full | Semi | None
- `parking`: Public | Reserved
- `status`: Available | Sold
- `city`: string (search by city name)
- `minPrice`: number
- `maxPrice`: number
- `page`: number (pagination)
- `limit`: number (items per page)
- `sortBy`: string (sort order, e.g., '-createdAt', 'price', '-price')

**Example:**
```javascript
// Fetch residential properties for rent in Mumbai
const response = await fetch(
  'http://localhost:3030/api/properties?propertyType=Residential&listingType=Rent&city=Mumbai'
);
const data = await response.json();

console.log(data.properties); // Array of properties
console.log(data.pagination); // Pagination info
```

**Response:**
```json
{
  "properties": [
    {
      "_id": "...",
      "property_id": "PROP-2024-0319-A1B2C3",
      "name": "Modern 2BHK Apartment",
      "description": "Beautiful apartment in city center",
      "type": "Residential",
      "size": 1200,
      "furnishing": "Semi",
      "availability": "Immediate",
      "building_type": "Apartment",
      "bhk": 2,
      "bathrooms": 2,
      "bedrooms": 2,
      "listing_type": "Rent",
      "parking": "Reserved",
      "property_type": "Residential",
      "location": "Mumbai",
      "price": {
        "rent_monthly": 25000,
        "deposit": 50000
      },
      "photos": ["https://..."],
      "amenities": ["wifi", "gym", "parking", "security"],
      "status": "Available",
      "society": "Green Valley",
      "added_by": {
        "_id": "...",
        "fullName": "John Doe",
        "username": "johndoe",
        "email": "john@example.com",
        "phoneNumber": "1234567890"
      },
      "zipcode": "400001",
      "pets_allowed": true,
      "address": {
        "street": "Main Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India"
      },
      "location_coordinates": {
        "latitude": 19.0760,
        "longitude": 72.8777
      },
      "createdAt": "2024-03-19T10:00:00.000Z",
      "updatedAt": "2024-03-19T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "pages": 13
  }
}
```

---

### 2. **Get Property by ID** (Public)
```javascript
GET /api/properties/:id
```

**Example:**
```javascript
const propertyId = '68ffbfc20710b8e29c38d385';
const response = await fetch(`http://localhost:3030/api/properties/${propertyId}`);
const property = await response.json();
```

---

### 3. **Add Property** (Admin Only)
```javascript
POST /api/properties
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Fields:**
- `name`: string (required)
- `description`: string (required)
- `type`: string (required)
- `size`: number (required) - in square feet
- `furnishing`: "Full" | "Semi" | "None" (required)
- `availability`: "Immediate" | "Within 15 Days" | "Within 30 Days" | "After 30 Days" (required)
- `building_type`: "Apartment" | "Villa" | "Independent House" | "Pent House" | "Plot" (required)
- `bhk`: number (required)
- `bathrooms`: number (required)
- `bedrooms`: number (required)
- `listing_type`: "Rent" | "Sell" (required)
- `parking`: "Public" | "Reserved" (required)
- `property_type`: "Residential" | "Commercial" | "PG Hostel" (required)
- `location`: string (required)
- `society`: string
- `zipcode`: string (required, 6 digits)
- `price.rent_monthly`: number (if rent)
- `price.sell_price`: number (if sell)
- `price.deposit`: number (optional)
- `photos`: File[] (up to 5 images)
- `amenities`: string[] - ["wifi", "gym", "parking"]
- `pets_allowed`: boolean (default: false)
- `address.street`: string
- `address.city`: string
- `address.state`: string
- `address.country`: string
- `location_coordinates.latitude`: number (optional)
- `location_coordinates.longitude`: number (optional)

**Example with Axios:**
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('name', 'Modern 2BHK Apartment');
formData.append('description', 'Beautiful apartment in city center');
formData.append('type', 'Residential');
formData.append('size', '1200');
formData.append('furnishing', 'Semi');
formData.append('availability', 'Immediate');
formData.append('building_type', 'Apartment');
formData.append('bhk', '2');
formData.append('bathrooms', '2');
formData.append('bedrooms', '2');
formData.append('listing_type', 'Rent');
formData.append('parking', 'Reserved');
formData.append('property_type', 'Residential');
formData.append('location', 'Mumbai');
formData.append('society', 'Green Valley');
formData.append('zipcode', '400001');
formData.append('price[rent_monthly]', '25000');
formData.append('price[deposit]', '50000');
formData.append('amenities', JSON.stringify(['wifi', 'gym', 'parking']));
formData.append('pets_allowed', 'true');
formData.append('address[street]', 'Main Street');
formData.append('address[city]', 'Mumbai');
formData.append('address[state]', 'Maharashtra');
formData.append('address[country]', 'India');

// Add photos
for (let i = 0; i < photoFiles.length; i++) {
  formData.append('images', photoFiles[i]);
}

const response = await axios.post('http://localhost:3030/api/properties', formData, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'multipart/form-data'
  }
});
```

---

### 4. **Update Property** (Admin Only)
```javascript
PUT /api/properties/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Similar to POST, but updates existing property.

---

### 5. **Delete Property** (Admin Only)
```javascript
DELETE /api/properties/:id
Authorization: Bearer <token>
```

**Example:**
```javascript
const response = await fetch(`http://localhost:3030/api/properties/${propertyId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
```

---

### 6. **Set Discount** (Admin Only)
```javascript
POST /api/properties/:id/discount
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "discountedPrice": 22000
}
```

**Example:**
```javascript
const response = await fetch(`http://localhost:3030/api/properties/${propertyId}/discount`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    discountedPrice: 22000
  })
});
```

---

## 🎨 Frontend Integration Example (React)

### 1. **Service/API Setup**
```javascript
// services/propertyService.js
import axios from 'axios';

const API_URL = 'http://localhost:3030/api/properties';

const propertyService = {
  // Get all properties with filters
  getAllProperties: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await axios.get(`${API_URL}?${params}`);
    return response.data;
  },

  // Get property by ID
  getPropertyById: async (id) => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  },

  // Add property (Admin)
  addProperty: async (formData) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(API_URL, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Update property (Admin)
  updateProperty: async (id, formData) => {
    const token = localStorage.getItem('token');
    const response = await axios.put(`${API_URL}/${id}`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Delete property (Admin)
  deleteProperty: async (id) => {
    const token = localStorage.getItem('token');
    const response = await axios.delete(`${API_URL}/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Set discount (Admin)
  setDiscount: async (id, discountedPrice) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_URL}/${id}/discount`, {
      discountedPrice
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  }
};

export default propertyService;
```

---

### 2. **React Component Example**
```javascript
// components/PropertyList.jsx
import { useState, useEffect } from 'react';
import propertyService from '../services/propertyService';

const PropertyList = () => {
  const [properties, setProperties] = useState([]);
  const [filters, setFilters] = useState({
    propertyType: '',
    listingType: '',
    bhk: '',
    city: '',
    minPrice: '',
    maxPrice: '',
    page: 1,
    limit: 12
  });

  useEffect(() => {
    loadProperties();
  }, [filters]);

  const loadProperties = async () => {
    try {
      const data = await propertyService.getAllProperties(filters);
      setProperties(data.properties);
    } catch (error) {
      console.error('Error loading properties:', error);
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="filters">
        <select onChange={(e) => setFilters({...filters, propertyType: e.target.value})}>
          <option value="">All Types</option>
          <option value="Residential">Residential</option>
          <option value="Commercial">Commercial</option>
          <option value="PG Hostel">PG Hostel</option>
        </select>
        
        <select onChange={(e) => setFilters({...filters, listingType: e.target.value})}>
          <option value="">All Listings</option>
          <option value="Rent">Rent</option>
          <option value="Sell">Sell</option>
        </select>

        <select onChange={(e) => setFilters({...filters, bhk: e.target.value})}>
          <option value="">All BHK</option>
          <option value="1">1 BHK</option>
          <option value="2">2 BHK</option>
          <option value="3">3 BHK</option>
          <option value="4">4 BHK</option>
        </select>

        <input 
          type="text" 
          placeholder="City"
          value={filters.city}
          onChange={(e) => setFilters({...filters, city: e.target.value})}
        />

        <input 
          type="number" 
          placeholder="Min Price"
          value={filters.minPrice}
          onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
        />

        <input 
          type="number" 
          placeholder="Max Price"
          value={filters.maxPrice}
          onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
        />
      </div>

      {/* Property Grid */}
      <div className="property-grid">
        {properties.map((property) => (
          <div key={property._id} className="property-card">
            <img src={property.photos[0]} alt={property.name} />
            <h3>{property.name}</h3>
            <p>{property.bhk} BHK - {property.building_type}</p>
            <p>{property.location}</p>
            {property.listing_type === 'Rent' && (
              <p>₹{property.price?.rent_monthly}/month</p>
            )}
            {property.listing_type === 'Sell' && (
              <p>₹{property.price?.sell_price}</p>
            )}
            <button onClick={() => viewDetails(property._id)}>View Details</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropertyList;
```

---

## 🎯 Property Types

### Residential:
- Apartments, Villas, Independent Houses, Pent Houses, Plots

### Commercial:
- Office Spaces, Shops, Warehouses, Showrooms

### PG Hostel:
- Boys PG, Girls PG, Mixed PG

---

## 📝 Notes
- All prices in INR (Indian Rupees)
- Photos are uploaded to Cloudinary (max 5 images)
- Admin routes require authentication token
- Address details are required for property creation
- Property ID is auto-generated with format: `PROP-YYYY-MMDD-RANDOM`
- Use `$or` for price filtering (handles both rent and sell prices)
- Added user info (name, email, phone) is populated in responses

