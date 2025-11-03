# Frontend Furniture Buy/Rent - Complete API Guide

## 📍 API Endpoints

```
GET http://localhost:3030/api/furniture
```

---

## 📋 Query Parameters

### For Rent Items Only:
```
?listingType=Rent&status=Available
```

### For Sell Items Only:
```
?listingType=Sell&status=Available
```

### For "Rent & Sell" Items:
```
?listingType=Rent & Sell&status=Available
```

### Combine Filters:
```
?category=Furniture&listingType=Rent&minPrice=500&maxPrice=5000&status=Available
```

---

## 🔗 Complete API Call Examples

### 1. Get All Available Rent Items
```javascript
const response = await fetch(
  'http://localhost:3030/api/furniture?listingType=Rent&status=Available&page=1&limit=12'
);
const data = await response.json();
console.log(data);
```

**Response:**
```json
{
  "furniture": [
    {
      "_id": "68ffbfc20710b8e29c38d385",
      "furniture_id": "FURN-2024-1028-ABC123",
      "name": "Modern Sofa Set",
      "description": "Comfortable 3-seater sofa",
      "category": "Furniture",
      "listing_type": "Rent",
      "condition": "Like New",
      "price": {
        "rent_monthly": 2000,
        "deposit": 5000
      },
      "photos": ["https://cloudinary.com/image1.jpg"],
      "location": "Mumbai",
      "zipcode": "400001",
      "brand": "IKEA",
      "status": "Available",
      "added_by": {
        "fullName": "John Doe",
        "username": "johndoe",
        "email": "john@example.com"
      }
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "pages": 3
  }
}
```

---

### 2. Get All Buy (Sell) Items
```javascript
const response = await fetch(
  'http://localhost:3030/api/furniture?listingType=Sell&status=Available'
);
const data = await response.json();
```

**Response:**
```json
{
  "furniture": [
    {
      "_id": "68ffbfc20710b8e29c38d386",
      "name": "Refrigerator",
      "listing_type": "Sell",
      "price": {
        "sell_price": 15000
      },
      "photos": ["https://cloudinary.com/fridge.jpg"],
      "status": "Available"
    }
  ],
  "pagination": { "total": 10, "page": 1, "pages": 1 }
}
```

---

### 3. Get Items with Price Range
```javascript
const response = await fetch(
  'http://localhost:3030/api/furniture?minPrice=1000&maxPrice=5000&listingType=Rent'
);
```

---

## 🎨 Frontend Display Examples

### Example 1: Display Rent Items with "Price on Request"
```typescript
import { useState, useEffect } from 'react';

interface Furniture {
  _id: string;
  furniture_id: string;
  name: string;
  listing_type: 'Rent' | 'Sell' | 'Rent & Sell';
  price: {
    rent_monthly?: number;
    sell_price?: number;
    deposit?: number;
  };
  photos: string[];
  location: string;
  brand?: string;
  status: 'Available' | 'Rented' | 'Sold';
}

const FurnitureGrid = () => {
  const [furniture, setFurniture] = useState<Furniture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFurniture();
  }, []);

  const fetchFurniture = async () => {
    try {
      // Get only rent items
      const response = await fetch(
        'http://localhost:3030/api/furniture?listingType=Rent&status=Available&limit=20'
      );
      const data = await response.json();
      setFurniture(data.furniture);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (item: Furniture) => {
    // Check if rent price is available
    if (item.price.rent_monthly) {
      return `₹${item.price.rent_monthly}/month`;
    }
    return 'Price on Request';
  };

  const formatListingType = (type: string) => {
    return type === 'Rent & Sell' ? 'Rent/Buy' : type;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="furniture-grid">
      {furniture.map((item) => (
        <div key={item._id} className="furniture-card">
          <img src={item.photos[0]} alt={item.name} />
          <h3>{item.name}</h3>
          
          {/* Listing Type Badge */}
          <span className="listing-badge">
            {formatListingType(item.listing_type)}
          </span>

          {/* Price Display */}
          <div className="price">
            {item.price.rent_monthly ? (
              <>
                <strong>{formatPrice(item)}</strong>
                {item.price.deposit && (
                  <span> + ₹{item.price.deposit} security</span>
                )}
              </>
            ) : (
              <strong className="price-request">Price on Request</strong>
            )}
          </div>

          <p className="location">📍 {item.location}</p>
          
          {item.brand && <p className="brand">{item.brand}</p>}

          {/* Action Buttons */}
          <div className="actions">
            {item.listing_type === 'Rent' || item.listing_type === 'Rent & Sell' ? (
              <button className="btn-rent">Rent Now</button>
            ) : null}
            
            {item.listing_type === 'Sell' || item.listing_type === 'Rent & Sell' ? (
              <button className="btn-buy">Buy Now</button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FurnitureGrid;
```

---

### Example 2: Separate Rent and Buy Sections
```typescript
const FurnitureSection = () => {
  const [rentItems, setRentItems] = useState<Furniture[]>([]);
  const [buyItems, setBuyItems] = useState<Furniture[]>([]);

  const fetchRentItems = async () => {
    const response = await fetch(
      'http://localhost:3030/api/furniture?listingType=Rent&status=Available&limit=8'
    );
    const data = await response.json();
    setRentItems(data.furniture);
  };

  const fetchBuyItems = async () => {
    const response = await fetch(
      'http://localhost:3030/api/furniture?listingType=Sell&status=Available&limit=8'
    );
    const data = await response.json();
    setBuyItems(data.furniture);
  };

  useEffect(() => {
    fetchRentItems();
    fetchBuyItems();
  }, []);

  return (
    <div className="furniture-page">
      {/* Rent Section */}
      <section className="rent-section">
        <h2>Furniture on Rent</h2>
        <div className="grid">
          {rentItems.map((item) => (
            <div key={item._id} className="card">
              <img src={item.photos[0]} alt={item.name} />
              <h3>{item.name}</h3>
              <p className="price">
                {item.price.rent_monthly 
                  ? `₹${item.price.rent_monthly}/month`
                  : 'Price on Request'
                }
              </p>
              <p>📍 {item.location}</p>
              <button onClick={() => handleRent(item._id)}>Rent This</button>
            </div>
          ))}
        </div>
      </section>

      {/* Buy Section */}
      <section className="buy-section">
        <h2>Buy Furniture</h2>
        <div className="grid">
          {buyItems.map((item) => (
            <div key={item._id} className="card">
              <img src={item.photos[0]} alt={item.name} />
              <h3>{item.name}</h3>
              <p className="price">
                {item.price.sell_price 
                  ? `₹${item.price.sell_price}`
                  : 'Price on Request'
                }
              </p>
              <p>📍 {item.location}</p>
              <button onClick={() => handleBuy(item._id)}>Buy Now</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const handleRent = (id: string) => {
    // Navigate to furniture request form
    window.location.href = `/furniture/${id}/rent`;
  };

  const handleBuy = (id: string) => {
    // Navigate to furniture request form
    window.location.href = `/furniture/${id}/buy`;
  };
};
```

---

### Example 3: Filter by Listing Type with Tabs
```typescript
const FurnitureWithTabs = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'rent' | 'buy'>('all');
  const [furniture, setFurniture] = useState<Furniture[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async (tab: string) => {
    setLoading(true);
    try {
      let url = 'http://localhost:3030/api/furniture?status=Available';
      
      if (tab === 'rent') {
        url += '&listingType=Rent';
      } else if (tab === 'buy') {
        url += '&listingType=Sell';
      }

      const response = await fetch(url);
      const data = await response.json();
      setFurniture(data.furniture);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  return (
    <div>
      {/* Tabs */}
      <div className="tabs">
        <button 
          className={activeTab === 'all' ? 'active' : ''}
          onClick={() => setActiveTab('all')}
        >
          All Items
        </button>
        <button 
          className={activeTab === 'rent' ? 'active' : ''}
          onClick={() => setActiveTab('rent')}
        >
          Rent
        </button>
        <button 
          className={activeTab === 'buy' ? 'active' : ''}
          onClick={() => setActiveTab('buy')}
        >
          Buy
        </button>
      </div>

      {/* Furniture Grid */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid">
          {furniture.map((item) => (
            <FurnitureCard key={item._id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

const FurnitureCard = ({ item }: { item: Furniture }) => {
  const getPriceText = () => {
    if (item.listing_type === 'Rent') {
      return item.price.rent_monthly 
        ? `₹${item.price.rent_monthly}/month`
        : 'Price on Request';
    } else if (item.listing_type === 'Sell') {
      return item.price.sell_price
        ? `₹${item.price.sell_price}`
        : 'Price on Request';
    } else {
      // Rent & Sell
      const rent = item.price.rent_monthly ? `₹${item.price.rent_monthly}/mo` : 'Rent on Request';
      const sell = item.price.sell_price ? `₹${item.price.sell_price}` : 'Buy on Request';
      return `${rent} or ${sell}`;
    }
  };

  return (
    <div className="card">
      <img src={item.photos[0] || '/placeholder.jpg'} alt={item.name} />
      <div className="badge">{item.listing_type}</div>
      <h3>{item.name}</h3>
      <p className="price">{getPriceText()}</p>
      <p>📍 {item.location}</p>
      
      {item.brand && <p className="brand">{item.brand}</p>}
      
      <div className="actions">
        {item.price.rent_monthly && (
          <button className="btn-rent">Rent</button>
        )}
        {item.price.sell_price && (
          <button className="btn-buy">Buy</button>
        )}
        {!item.price.rent_monthly && !item.price.sell_price && (
          <button className="btn-contact">Contact Seller</button>
        )}
      </div>
    </div>
  );
};
```

---

## 📤 API Response Examples

### Response 1: Rent Item
```json
{
  "_id": "...",
  "name": "Sofa Set",
  "listing_type": "Rent",
  "price": {
    "rent_monthly": 2500,
    "deposit": 5000
  }
}
```

### Response 2: Buy Item
```json
{
  "_id": "...",
  "name": "Washing Machine",
  "listing_type": "Sell",
  "price": {
    "sell_price": 15000
  }
}
```

### Response 3: Rent & Buy
```json
{
  "_id": "...",
  "name": "Air Conditioner",
  "listing_type": "Rent & Sell",
  "price": {
    "rent_monthly": 1500,
    "sell_price": 30000
  }
}
```

### Response 4: Price on Request
```json
{
  "_id": "...",
  "name": "Luxury Sofa",
  "listing_type": "Sell",
  "price": {
    "sell_price": null
  }
}
```

---

## ✅ Quick Reference

### To Get Only Rent Items:
```javascript
GET /api/furniture?listingType=Rent&status=Available
```

### To Get Only Buy Items:
```javascript
GET /api/furniture?listingType=Sell&status=Available
```

### To Get Both (Rent & Sell items):
```javascript
GET /api/furniture?status=Available
```

### Check Price Availability:
```javascript
const hasPrice = item.price.rent_monthly || item.price.sell_price;
const displayPrice = hasPrice ? `₹${price}` : 'Price on Request';
```

---

## 🎯 Key Points

✅ Use `listingType` parameter to filter Rent/Sell items  
✅ Check `price.rent_monthly` and `price.sell_price` for availability  
✅ Show "Price on Request" if price is null/undefined  
✅ Filter by `status=Available` to show only available items  
✅ Handle "Rent & Sell" type (shows both rent and buy buttons)

