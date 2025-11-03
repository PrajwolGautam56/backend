# Furniture/Appliances API Integration Guide

## 🎯 Overview
The Furniture/Appliances feature allows users to browse, rent, or buy furniture, appliances, electronics, and home items.

## 📡 Base URL
```
http://localhost:3030/api/furniture
```

---

## 📋 Available Endpoints

### 1. **Get All Furniture Items** (Public)
```javascript
GET /api/furniture
GET /api/furniture?category=Furniture&listingType=Rent&page=1&limit=10
```

#### Query Parameters:
- `category`: Furniture | Appliance | Electronic | Decoration | Kitchenware
- `listingType`: Rent | Sell | Rent & Sell
- `condition`: New | Like New | Good | Fair | Needs Repair
- `status`: Available | Rented | Sold
- `brand`: string (search by brand name)
- `city`: string (filter by city)
- `minPrice`: number
- `maxPrice`: number
- `page`: number (pagination)
- `limit`: number (items per page)

**Example:**
```javascript
// Fetch all furniture items
const response = await fetch('http://localhost:3030/api/furniture');
const data = await response.json();
console.log(data.furniture); // Array of furniture items
console.log(data.pagination); // Pagination info

// Search with filters
const filtered = await fetch(
  'http://localhost:3030/api/furniture?category=Furniture&listingType=Rent&page=1'
);
```

**Response:**
```json
{
  "furniture": [
    {
      "_id": "...",
      "furniture_id": "FURN-2024-0319-A1B2C3",
      "name": "Comfortable Sofa Set",
      "description": "3-seater sofa in excellent condition",
      "category": "Furniture",
      "item_type": "Sofa",
      "brand": "IKEA",
      "condition": "Like New",
      "listing_type": "Rent & Sell",
      "price": {
        "rent_monthly": 1500,
        "sell_price": 25000,
        "deposit": 2000
      },
      "photos": ["https://..."],
      "features": ["3-seater", "Leather", "Reclining"],
      "dimensions": {
        "length": 220,
        "width": 95,
        "height": 85,
        "unit": "cm"
      },
      "location": "Mumbai",
      "delivery_available": true,
      "delivery_charge": 500,
      "age_years": 1,
      "warranty": true,
      "warranty_months": 12,
      "added_by": {
        "_id": "...",
        "fullName": "John Doe",
        "username": "johndoe",
        "email": "john@example.com",
        "phoneNumber": "1234567890"
      },
      "zipcode": "400001",
      "address": {
        "street": "Main Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India"
      },
      "status": "Available",
      "availability": "Available",
      "createdAt": "2024-03-19T10:00:00.000Z",
      "updatedAt": "2024-03-19T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "pages": 5
  }
}
```

---

### 2. **Get Furniture by ID** (Public)
```javascript
GET /api/furniture/:id
```

**Example:**
```javascript
const furnitureId = '68ffbfc20710b8e29c38d385';
const response = await fetch(`http://localhost:3030/api/furniture/${furnitureId}`);
const furniture = await response.json();
```

---

### 3. **Add Furniture Item** (Admin Only)
```javascript
POST /api/furniture
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Fields:**
- `name`: string (required)
- `description`: string (required)
- `category`: "Furniture" | "Appliance" | "Electronic" | "Decoration" | "Kitchenware" (required)
- `item_type`: string (required) - e.g., "Sofa", "Refrigerator", "TV"
- `brand`: string (optional)
- `condition`: "New" | "Like New" | "Good" | "Fair" | "Needs Repair" (required)
- `listing_type`: "Rent" | "Sell" | "Rent & Sell" (required)
- `price.rent_monthly`: number (if rent)
- `price.sell_price`: number (if sell)
- `price.deposit`: number (optional)
- `photos`: File[] (up to 10 images)
- `features`: string[] - ["feature1", "feature2"]
- `dimensions.length`: number (optional)
- `dimensions.width`: number (optional)
- `dimensions.height`: number (optional)
- `dimensions.unit`: "cm" | "inch" (default: "cm")
- `location`: string (required)
- `delivery_available`: boolean (default: false)
- `delivery_charge`: number (optional)
- `age_years`: number (optional)
- `warranty`: boolean (default: false)
- `warranty_months`: number (optional)
- `zipcode`: string (required, 6 digits)
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
formData.append('name', 'Sofa Set');
formData.append('description', '3-seater comfortable sofa');
formData.append('category', 'Furniture');
formData.append('item_type', 'Sofa');
formData.append('brand', 'IKEA');
formData.append('condition', 'Like New');
formData.append('listing_type', 'Rent & Sell');
formData.append('price[rent_monthly]', '1500');
formData.append('price[sell_price]', '25000');
formData.append('price[deposit]', '2000');
formData.append('features', JSON.stringify(['3-seater', 'Leather']));
formData.append('location', 'Mumbai');
formData.append('delivery_available', 'true');
formData.append('delivery_charge', '500');
formData.append('zipcode', '400001');
formData.append('address[street]', 'Main Street');
formData.append('address[city]', 'Mumbai');
formData.append('address[state]', 'Maharashtra');
formData.append('address[country]', 'India');

// Add photos
const photos = document.querySelector('input[type="file"]').files;
for (let i = 0; i < photos.length; i++) {
  formData.append('photos', photos[i]);
}

const response = await axios.post('http://localhost:3030/api/furniture', formData, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'multipart/form-data'
  }
});
```

---

### 4. **Update Furniture Item** (Admin Only)
```javascript
PUT /api/furniture/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Similar to POST, but updates existing item.

---

### 5. **Delete Furniture Item** (Admin Only)
```javascript
DELETE /api/furniture/:id
Authorization: Bearer <token>
```

**Example:**
```javascript
const response = await fetch(`http://localhost:3030/api/furniture/${furnitureId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
```

---

### 6. **Update Furniture Status** (Admin Only)
```javascript
PATCH /api/furniture/:id/status
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "status": "Available" | "Rented" | "Sold",
  "availability": "Available" | "Rented" | "Sold"
}
```

**Example:**
```javascript
const response = await fetch(`http://localhost:3030/api/furniture/${furnitureId}/status`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'Rented',
    availability: 'Rented'
  })
});
```

---

## 🎨 Frontend Integration Example (React)

### 1. **Service/API Setup**
```javascript
// services/furnitureService.js
import axios from 'axios';

const API_URL = 'http://localhost:3030/api/furniture';

const furnitureService = {
  // Get all furniture with filters
  getAllFurniture: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await axios.get(`${API_URL}?${params}`);
    return response.data;
  },

  // Get furniture by ID
  getFurnitureById: async (id) => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  },

  // Add furniture (Admin)
  addFurniture: async (formData) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(API_URL, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Update furniture (Admin)
  updateFurniture: async (id, formData) => {
    const token = localStorage.getItem('token');
    const response = await axios.put(`${API_URL}/${id}`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Delete furniture (Admin)
  deleteFurniture: async (id) => {
    const token = localStorage.getItem('token');
    const response = await axios.delete(`${API_URL}/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Update status (Admin)
  updateStatus: async (id, status, availability) => {
    const token = localStorage.getItem('token');
    const response = await axios.patch(`${API_URL}/${id}/status`, {
      status,
      availability
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  }
};

export default furnitureService;
```

---

### 2. **React Component Example**
```javascript
// components/FurnitureList.jsx
import { useState, useEffect } from 'react';
import furnitureService from '../services/furnitureService';

const FurnitureList = () => {
  const [furniture, setFurniture] = useState([]);
  const [filters, setFilters] = useState({
    category: '',
    listingType: '',
    condition: '',
    page: 1,
    limit: 12
  });

  useEffect(() => {
    loadFurniture();
  }, [filters]);

  const loadFurniture = async () => {
    try {
      const data = await furnitureService.getAllFurniture(filters);
      setFurniture(data.furniture);
    } catch (error) {
      console.error('Error loading furniture:', error);
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="filters">
        <select onChange={(e) => setFilters({...filters, category: e.target.value})}>
          <option value="">All Categories</option>
          <option value="Furniture">Furniture</option>
          <option value="Appliance">Appliance</option>
          <option value="Electronic">Electronic</option>
        </select>
        
        <select onChange={(e) => setFilters({...filters, listingType: e.target.value})}>
          <option value="">All Types</option>
          <option value="Rent">Rent</option>
          <option value="Sell">Sell</option>
          <option value="Rent & Sell">Rent & Sell</option>
        </select>
      </div>

      {/* Furniture Grid */}
      <div className="furniture-grid">
        {furniture.map((item) => (
          <div key={item._id} className="furniture-card">
            <img src={item.photos[0]} alt={item.name} />
            <h3>{item.name}</h3>
            <p>{item.category} - {item.item_type}</p>
            <p>Condition: {item.condition}</p>
            {item.listing_type === 'Rent' && (
              <p>₹{item.price.rent_monthly}/month</p>
            )}
            {item.listing_type === 'Sell' && (
              <p>₹{item.price.sell_price}</p>
            )}
            {item.listing_type === 'Rent & Sell' && (
              <div>
                <p>Rent: ₹{item.price.rent_monthly}/month</p>
                <p>Buy: ₹{item.price.sell_price}</p>
              </div>
            )}
            <button onClick={() => viewDetails(item._id)}>View Details</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FurnitureList;
```

---

### 3. **Admin Add Furniture Form**
```javascript
// components/AddFurniture.jsx
import { useState } from 'react';
import furnitureService from '../services/furnitureService';

const AddFurniture = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Furniture',
    item_type: '',
    brand: '',
    condition: 'Like New',
    listing_type: 'Rent',
    location: '',
    zipcode: '',
    delivery_available: false,
    photos: []
  });

  const [priceData, setPriceData] = useState({
    rent_monthly: '',
    sell_price: '',
    deposit: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const data = new FormData();
    
    // Append all form fields
    Object.keys(formData).forEach(key => {
      if (key !== 'photos') {
        data.append(key, formData[key]);
      }
    });
    
    // Append price object
    if (formData.listing_type === 'Rent' && priceData.rent_monthly) {
      data.append('price[rent_monthly]', priceData.rent_monthly);
    }
    if (formData.listing_type === 'Sell' && priceData.sell_price) {
      data.append('price[sell_price]', priceData.sell_price);
    }
    if (priceData.deposit) {
      data.append('price[deposit]', priceData.deposit);
    }
    
    // Append photos
    formData.photos.forEach(photo => {
      data.append('photos', photo);
    });
    
    try {
      const response = await furnitureService.addFurniture(data);
      alert('Furniture added successfully!');
      // Reset form or redirect
    } catch (error) {
      alert('Error adding furniture');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text" 
        placeholder="Name" 
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
      />
      {/* Add more fields... */}
      <input 
        type="file" 
        multiple 
        accept="image/*"
        onChange={(e) => setFormData({...formData, photos: Array.from(e.target.files)})}
      />
      <button type="submit">Add Furniture</button>
    </form>
  );
};

export default AddFurniture;
```

---

## 🎯 Category Examples

### Furniture:
- Sofa, Bed, Table, Chair, Cabinet, Wardrobe

### Appliance:
- Refrigerator, Washing Machine, Microwave, Oven, AC

### Electronic:
- TV, Laptop, Computer, Printer, Speaker

### Decoration:
- Vase, Painting, Sculpture, Lamp, Curtain

### Kitchenware:
- Cooker, Mixer, Blender, Dinner Set, Crockery

---

## 📝 Notes
- All prices in INR (Indian Rupees)
- Photos are uploaded to Cloudinary
- Admin routes require authentication token
- Address is optional but recommended
- Delivery charges are additional to rental/sale price

