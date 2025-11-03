# Furniture API - Quick Reference for Frontend

## ✅ Admin Endpoints for Adding Furniture

### 📍 Endpoint
```javascript
POST http://localhost:3030/api/furniture
```

### 🔐 Authentication Required
```javascript
Headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'multipart/form-data'
}
```

### 📝 Required Fields
```javascript
const formData = new FormData();

// Required fields
formData.append('name', 'Comfortable Sofa');
formData.append('description', '3-seater sofa in excellent condition');
formData.append('category', 'Furniture'); // Furniture | Appliance | Electronic | Decoration | Kitchenware
formData.append('item_type', 'Sofa');
formData.append('condition', 'Like New'); // New | Like New | Good | Fair | Needs Repair
formData.append('listing_type', 'Rent & Sell'); // Rent | Sell | Rent & Sell
formData.append('location', 'Mumbai');
formData.append('zipcode', '400001');

// Optional fields
formData.append('brand', 'IKEA');
formData.append('price[rent_monthly]', '1500'); // If rent or rent & sell
formData.append('price[sell_price]', '25000'); // If sell or rent & sell
formData.append('price[deposit]', '2000'); // Optional
formData.append('delivery_available', 'true');
formData.append('delivery_charge', '500');
formData.append('age_years', '1');
formData.append('warranty', 'true');
formData.append('warranty_months', '12');

// Dimensions (optional)
formData.append('dimensions[length]', '220');
formData.append('dimensions[width]', '95');
formData.append('dimensions[height]', '85');
formData.append('dimensions[unit]', 'cm');

// Address (recommended)
formData.append('address[street]', 'Main Street');
formData.append('address[city]', 'Mumbai');
formData.append('address[state]', 'Maharashtra');
formData.append('address[country]', 'India');

// Features (array)
formData.append('features', JSON.stringify(['3-seater', 'Leather', 'Reclining']));

// Photos (up to 10 images)
for (let i = 0; i < photoFiles.length; i++) {
  formData.append('photos', photoFiles[i]);
}
```

### 🚀 Complete Frontend Example (React)

```javascript
import axios from 'axios';

const addFurniture = async (formData, token) => {
  try {
    const response = await axios.post(
      'http://localhost:3030/api/furniture',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error adding furniture:', error.response?.data);
    throw error;
  }
};

// Usage in React Component
const AddFurnitureForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Furniture',
    item_type: '',
    condition: 'Like New',
    listing_type: 'Rent',
    location: '',
    zipcode: ''
  });
  
  const [photos, setPhotos] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const data = new FormData();
    
    // Append all form fields
    Object.keys(formData).forEach(key => {
      data.append(key, formData[key]);
    });
    
    // Append photos
    photos.forEach(photo => {
      data.append('photos', photo);
    });
    
    const token = localStorage.getItem('token');
    const result = await addFurniture(data, token);
    console.log('Furniture added:', result);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text" 
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        placeholder="Name"
        required
      />
      <textarea
        value={formData.description}
        onChange={(e) => setFormData({...formData, description: e.target.value})}
        placeholder="Description"
        required
      />
      <select 
        value={formData.category}
        onChange={(e) => setFormData({...formData, category: e.target.value})}
      >
        <option value="Furniture">Furniture</option>
        <option value="Appliance">Appliance</option>
        <option value="Electronic">Electronic</option>
        <option value="Decoration">Decoration</option>
        <option value="Kitchenware">Kitchenware</option>
      </select>
      <input 
        type="file" 
        multiple 
        accept="image/*"
        onChange={(e) => setPhotos(Array.from(e.target.files))}
      />
      <button type="submit">Add Furniture</button>
    </form>
  );
};
```

---

## 📌 Categories

- **Furniture**: Sofa, Bed, Table, Chair, Cabinet, Wardrobe
- **Appliance**: Refrigerator, Washing Machine, Microwave, Oven, AC
- **Electronic**: TV, Laptop, Computer, Printer, Speaker
- **Decoration**: Vase, Painting, Sculpture, Lamp, Curtain
- **Kitchenware**: Cooker, Mixer, Blender, Dinner Set, Crockery

---

## ✅ Test the Endpoint

```bash
# First, login as admin to get token
curl -X POST http://localhost:3030/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"admin123"}'

# Use the token to add furniture
curl -X POST http://localhost:3030/api/furniture \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "name=Test Sofa" \
  -F "description=Test" \
  -F "category=Furniture" \
  -F "item_type=Sofa" \
  -F "condition=New" \
  -F "listing_type=Rent" \
  -F "price[rent_monthly]=1000" \
  -F "location=Mumbai" \
  -F "zipcode=400001" \
  -F "photos=@image1.jpg"
```

---

## 🎯 Summary

✅ Admin can add furniture via: `POST /api/furniture`
✅ Requires authentication token + admin role
✅ Supports multiple photos (up to 10)
✅ Uploads photos to Cloudinary automatically
✅ Returns furniture details with auto-generated `furniture_id`

