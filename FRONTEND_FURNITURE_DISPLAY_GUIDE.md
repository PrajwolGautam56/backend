# Frontend Furniture Display - Complete Guide

## 📍 Endpoints

### Get All Furniture
```
GET http://localhost:3030/api/furniture
```

### Get Single Furniture
```
GET http://localhost:3030/api/furniture/:id
```

---

## 🔍 Query Parameters

```javascript
{
  category: "Furniture",      // Furniture | Appliance | Electronic | Decoration | Kitchenware
  listingType: "Rent",        // Rent | Sell | Rent & Sell
  condition: "New",           // New | Like New | Good | Fair | Needs Repair
  status: "Available",        // Available | Rented | Sold
  city: "Mumbai",             // City filter
  brand: "IKEA",             // Brand filter
  minPrice: 1000,            // Minimum price
  maxPrice: 5000,            // Maximum price
  page: 1,                   // Page number
  limit: 10                  // Items per page
}
```

---

## 📋 Basic Response Structure

```typescript
interface FurnitureResponse {
  furniture: Furniture[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}
```

```typescript
interface Furniture {
  _id: string;
  furniture_id: string;
  name: string;
  description?: string;
  category: 'Furniture' | 'Appliance' | 'Electronic' | 'Decoration' | 'Kitchenware';
  item_type?: string;
  condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Needs Repair';
  listing_type: 'Rent' | 'Sell' | 'Rent & Sell';
  price: {
    rent_monthly?: number;
    sell_price?: number;
    deposit?: number;
  };
  photos: string[];
  location: string;
  zipcode: string;
  brand?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  color?: string;
  material?: string;
  status: 'Available' | 'Rented' | 'Sold';
  added_by: {
    fullName: string;
    username: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

---

## 🎨 Complete React Examples

### Example 1: List All Furniture

```typescript
import { useState, useEffect } from 'react';

interface Furniture {
  _id: string;
  furniture_id: string;
  name: string;
  description?: string;
  category: string;
  listing_type: string;
  condition: string;
  price: {
    rent_monthly?: number;
    sell_price?: number;
    deposit?: number;
  };
  photos: string[];
  location: string;
  brand?: string;
  status: string;
  added_by: {
    fullName: string;
    username: string;
    email: string;
  };
}

const FurnitureList = () => {
  const [furniture, setFurniture] = useState<Furniture[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    listing_type: '',
    condition: '',
    minPrice: '',
    maxPrice: '',
    page: 1,
    limit: 12
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1
  });

  const fetchFurniture = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.listing_type) queryParams.append('listingType', filters.listing_type);
      if (filters.condition) queryParams.append('condition', filters.condition);
      if (filters.minPrice) queryParams.append('minPrice', filters.minPrice);
      if (filters.maxPrice) queryParams.append('maxPrice', filters.maxPrice);
      queryParams.append('page', filters.page.toString());
      queryParams.append('limit', filters.limit.toString());

      const response = await fetch(
        `http://localhost:3030/api/furniture?${queryParams.toString()}`
      );
      const data = await response.json();
      
      setFurniture(data.furniture);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching furniture:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFurniture();
  }, [filters]);

  return (
    <div className="furniture-list">
      {/* Filters */}
      <div className="filters">
        <select 
          value={filters.category}
          onChange={(e) => setFilters({...filters, category: e.target.value, page: 1})}
        >
          <option value="">All Categories</option>
          <option value="Furniture">Furniture</option>
          <option value="Appliance">Appliance</option>
          <option value="Electronic">Electronic</option>
          <option value="Decoration">Decoration</option>
          <option value="Kitchenware">Kitchenware</option>
        </select>

        <select 
          value={filters.listing_type}
          onChange={(e) => setFilters({...filters, listing_type: e.target.value, page: 1})}
        >
          <option value="">All Types</option>
          <option value="Rent">Rent</option>
          <option value="Sell">Sell</option>
          <option value="Rent & Sell">Rent & Sell</option>
        </select>

        <select 
          value={filters.condition}
          onChange={(e) => setFilters({...filters, condition: e.target.value, page: 1})}
        >
          <option value="">All Conditions</option>
          <option value="New">New</option>
          <option value="Like New">Like New</option>
          <option value="Good">Good</option>
          <option value="Fair">Fair</option>
          <option value="Needs Repair">Needs Repair</option>
        </select>

        <input
          type="number"
          placeholder="Min Price"
          value={filters.minPrice}
          onChange={(e) => setFilters({...filters, minPrice: e.target.value, page: 1})}
        />

        <input
          type="number"
          placeholder="Max Price"
          value={filters.maxPrice}
          onChange={(e) => setFilters({...filters, maxPrice: e.target.value, page: 1})}
        />
      </div>

      {/* Furniture Grid */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="furniture-grid">
            {furniture.map((item) => (
              <FurnitureCard key={item._id} furniture={item} />
            ))}
          </div>

          {/* Pagination */}
          <div className="pagination">
            <button 
              disabled={pagination.page === 1}
              onClick={() => setFilters({...filters, page: pagination.page - 1})}
            >
              Previous
            </button>
            <span>Page {pagination.page} of {pagination.pages}</span>
            <button 
              disabled={pagination.page === pagination.pages}
              onClick={() => setFilters({...filters, page: pagination.page + 1})}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default FurnitureList;
```

---

### Example 2: Furniture Card Component

```typescript
import { useNavigate } from 'react-router-dom';

interface FurnitureCardProps {
  furniture: Furniture;
}

const FurnitureCard: React.FC<FurnitureCardProps> = ({ furniture }) => {
  const navigate = useNavigate();

  const formatPrice = () => {
    if (furniture.listing_type === 'Rent') {
      return `₹${furniture.price.rent_monthly || 0}/month`;
    } else if (furniture.listing_type === 'Sell') {
      return `₹${furniture.price.sell_price || 0}`;
    } else {
      return `₹${furniture.price.rent_monthly || 0}/mo or ₹${furniture.price.sell_price || 0}`;
    }
  };

  return (
    <div className="furniture-card" onClick={() => navigate(`/furniture/${furniture._id}`)}>
      <img 
        src={furniture.photos[0] || '/placeholder.jpg'} 
        alt={furniture.name}
        className="card-image"
      />
      <div className="card-content">
        <div className="card-header">
          <h3>{furniture.name}</h3>
          <span className={`status-badge status-${furniture.status.toLowerCase()}`}>
            {furniture.status}
          </span>
        </div>
        
        <p className="category">{furniture.category} • {furniture.condition}</p>
        
        {furniture.brand && <p className="brand">{furniture.brand}</p>}
        
        <p className="location">📍 {furniture.location}</p>
        
        <div className="price">
          <strong>{formatPrice()}</strong>
          {furniture.price.deposit && (
            <span className="deposit">+ ₹{furniture.price.deposit} deposit</span>
          )}
        </div>

        <div className="card-footer">
          <button className="btn-view">View Details</button>
          <button className="btn-contact">Contact Seller</button>
        </div>
      </div>
    </div>
  );
};
```

---

### Example 3: Single Furniture Details

```typescript
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const FurnitureDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [furniture, setFurniture] = useState<Furniture | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFurnitureDetails = async () => {
      try {
        const response = await fetch(`http://localhost:3030/api/furniture/${id}`);
        const data = await response.json();
        setFurniture(data);
      } catch (error) {
        console.error('Error fetching furniture:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchFurnitureDetails();
    }
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!furniture) return <div>Furniture not found</div>;

  return (
    <div className="furniture-details">
      {/* Image Gallery */}
      <div className="gallery">
        {furniture.photos.map((photo, index) => (
          <img key={index} src={photo} alt={furniture.name} />
        ))}
      </div>

      {/* Main Info */}
      <div className="details">
        <h1>{furniture.name}</h1>
        
        <div className="meta">
          <span className="category">{furniture.category}</span>
          <span className="condition">{furniture.condition}</span>
          <span className="status">{furniture.status}</span>
        </div>

        {/* Pricing */}
        <div className="pricing">
          <h2>Pricing</h2>
          {furniture.listing_type === 'Rent' && furniture.price.rent_monthly && (
            <div>
              <p>Rent: ₹{furniture.price.rent_monthly}/month</p>
              {furniture.price.deposit && <p>Deposit: ₹{furniture.price.deposit}</p>}
            </div>
          )}
          {furniture.listing_type === 'Sell' && furniture.price.sell_price && (
            <p>Price: ₹{furniture.price.sell_price}</p>
          )}
          {furniture.listing_type === 'Rent & Sell' && (
            <div>
              <p>Rent: ₹{furniture.price.rent_monthly}/month</p>
              <p>Sell: ₹{furniture.price.sell_price}</p>
              {furniture.price.deposit && <p>Deposit: ₹{furniture.price.deposit}</p>}
            </div>
          )}
        </div>

        {/* Description */}
        {furniture.description && (
          <div className="description">
            <h3>Description</h3>
            <p>{furniture.description}</p>
          </div>
        )}

        {/* Specifications */}
        <div className="specifications">
          <h3>Specifications</h3>
          <ul>
            <li><strong>Brand:</strong> {furniture.brand || 'N/A'}</li>
            <li><strong>Material:</strong> {furniture.material || 'N/A'}</li>
            <li><strong>Color:</strong> {furniture.color || 'N/A'}</li>
            {furniture.dimensions && (
              <li>
                <strong>Dimensions:</strong> {furniture.dimensions.length} x {furniture.dimensions.width} x {furniture.dimensions.height} cm
              </li>
            )}
          </ul>
        </div>

        {/* Location */}
        <div className="location">
          <h3>Location</h3>
          <p>📍 {furniture.location}</p>
          <p>Zipcode: {furniture.zipcode}</p>
        </div>

        {/* Seller Info */}
        <div className="seller">
          <h3>Contact Seller</h3>
          <p><strong>Name:</strong> {furniture.added_by.fullName}</p>
          <p><strong>Username:</strong> @{furniture.added_by.username}</p>
          <button>Send Message</button>
        </div>

        {/* Request Buttons */}
        <div className="actions">
          {furniture.listing_type === 'Rent' && (
            <button className="btn-primary">Request to Rent</button>
          )}
          {furniture.listing_type === 'Sell' && (
            <button className="btn-primary">Request to Buy</button>
          )}
          {furniture.listing_type === 'Rent & Sell' && (
            <>
              <button className="btn-primary">Request to Rent</button>
              <button className="btn-primary">Request to Buy</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FurnitureDetails;
```

---

## 🎯 Quick Examples

### Fetch All Furniture
```javascript
const response = await fetch('http://localhost:3030/api/furniture');
const data = await response.json();
console.log(data.furniture); // Array of furniture
console.log(data.pagination); // Pagination info
```

### Fetch with Filters
```javascript
const response = await fetch(
  'http://localhost:3030/api/furniture?category=Furniture&listingType=Rent&minPrice=1000&maxPrice=5000&page=1&limit=12'
);
const data = await response.json();
```

### Get Single Furniture
```javascript
const response = await fetch(`http://localhost:3030/api/furniture/${furnitureId}`);
const furniture = await response.json();
```

---

## ✅ Summary

✅ **Filter by**: Category, Listing Type, Condition, Status, Price, Brand  
✅ **Pagination**: Page-based with configurable page size  
✅ **Photos**: Multiple images per furniture  
✅ **Seller Info**: Full contact details populated  
✅ **Price Display**: Handles Rent, Sell, and Rent & Sell  
✅ **Status Badges**: Available, Rented, Sold indicators

