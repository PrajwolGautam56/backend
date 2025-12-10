# 📦 Stock Management API - Admin Guide

## 📋 Overview

Complete API reference for managing furniture stock in the admin panel. Stock is automatically decremented when orders are placed, but admins can manually update stock levels.

---

## 🔧 Available Endpoints

### 1. Update Stock (Single Product)

**Endpoint:** `PUT /api/furniture/:id/stock`

**Description:** Update stock for a single furniture item

**Request:**
```http
PUT /api/furniture/:id/stock
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "stock": 10,
  "operation": "set"  // Optional: "set" (default), "add", "subtract"
}
```

**Response (200):**
```json
{
  "message": "Stock updated successfully",
  "furniture": {
    "_id": "furniture_id",
    "name": "Modern Sofa Set",
    "stock": 10,
    "availability": "Available",
    "status": "Available"
  },
  "previous_stock": 5,
  "new_stock": 10,
  "change": 5
}
```

**Query Parameters:**
- `operation` (optional): 
  - `"set"` - Set stock to exact value (default)
  - `"add"` - Add to current stock
  - `"subtract"` - Subtract from current stock

**Example - Set Stock:**
```javascript
// Set stock to 10
PUT /api/furniture/:id/stock
{ "stock": 10 }
```

**Example - Add Stock:**
```javascript
// Add 5 to current stock
PUT /api/furniture/:id/stock
{ "stock": 5, "operation": "add" }
```

**Example - Subtract Stock:**
```javascript
// Subtract 3 from current stock
PUT /api/furniture/:id/stock
{ "stock": 3, "operation": "subtract" }
```

---

### 2. Update Stock via Full Update

**Endpoint:** `PUT /api/furniture/:id`

**Description:** Update furniture including stock (part of full update)

**Request:**
```http
PUT /api/furniture/:id
Authorization: Bearer {admin_token}
Content-Type: multipart/form-data

{
  "stock": 10,
  "name": "Modern Sofa Set",
  // ... other fields
}
```

**Response (200):**
```json
{
  "_id": "furniture_id",
  "name": "Modern Sofa Set",
  "stock": 10,
  "availability": "Available",
  // ... other fields
}
```

---

### 3. Get Low Stock Items

**Endpoint:** `GET /api/furniture/low-stock?threshold=5`

**Description:** Get all furniture items with stock below threshold

**Request:**
```http
GET /api/furniture/low-stock?threshold=5
Authorization: Bearer {admin_token}
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "furniture_id",
      "name": "Modern Sofa Set",
      "stock": 2,
      "availability": "Available",
      "category": "Furniture"
    }
  ],
  "threshold": 5,
  "count": 1
}
```

**Query Parameters:**
- `threshold` (optional, default: 5) - Minimum stock level

---

### 4. Get Out of Stock Items

**Endpoint:** `GET /api/furniture/out-of-stock`

**Description:** Get all furniture items with zero stock

**Request:**
```http
GET /api/furniture/out-of-stock
Authorization: Bearer {admin_token}
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "furniture_id",
      "name": "Modern Sofa Set",
      "stock": 0,
      "availability": "Rented",
      "status": "Rented"
    }
  ],
  "count": 1
}
```

---

### 5. Bulk Stock Update

**Endpoint:** `POST /api/furniture/bulk-stock-update`

**Description:** Update stock for multiple products at once

**Request:**
```http
POST /api/furniture/bulk-stock-update
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "updates": [
    {
      "furniture_id": "furniture_id_1",
      "stock": 10,
      "operation": "set"
    },
    {
      "furniture_id": "furniture_id_2",
      "stock": 5,
      "operation": "add"
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Bulk stock update completed",
  "results": [
    {
      "furniture_id": "furniture_id_1",
      "success": true,
      "previous_stock": 5,
      "new_stock": 10,
      "change": 5
    },
    {
      "furniture_id": "furniture_id_2",
      "success": true,
      "previous_stock": 3,
      "new_stock": 8,
      "change": 5
    }
  ],
  "total_updated": 2,
  "total_failed": 0
}
```

---

### 6. Get Stock Statistics

**Endpoint:** `GET /api/furniture/stock-stats`

**Description:** Get overall stock statistics

**Request:**
```http
GET /api/furniture/stock-stats
Authorization: Bearer {admin_token}
```

**Response (200):**
```json
{
  "success": true,
  "stats": {
    "total_items": 100,
    "total_stock": 500,
    "available_items": 85,
    "low_stock_items": 10,
    "out_of_stock_items": 5,
    "average_stock": 5.0,
    "low_stock_threshold": 5
  },
  "by_category": {
    "Furniture": {
      "total": 50,
      "total_stock": 250,
      "low_stock": 5,
      "out_of_stock": 2
    },
    "Appliance": {
      "total": 30,
      "total_stock": 150,
      "low_stock": 3,
      "out_of_stock": 2
    }
  }
}
```

---

## 💻 Frontend Implementation

### Service Functions

**Create `services/stockService.js`:**

```javascript
import api from './axiosConfig';

// Update single product stock
export const updateStock = async (furnitureId, stock, operation = 'set') => {
  try {
    const response = await api.put(`/api/furniture/${furnitureId}/stock`, {
      stock,
      operation
    });
    return response.data;
  } catch (error) {
    console.error('Error updating stock:', error);
    throw error;
  }
};

// Get low stock items
export const getLowStockItems = async (threshold = 5) => {
  try {
    const response = await api.get(`/api/furniture/low-stock?threshold=${threshold}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    throw error;
  }
};

// Get out of stock items
export const getOutOfStockItems = async () => {
  try {
    const response = await api.get('/api/furniture/out-of-stock');
    return response.data;
  } catch (error) {
    console.error('Error fetching out of stock items:', error);
    throw error;
  }
};

// Bulk stock update
export const bulkUpdateStock = async (updates) => {
  try {
    const response = await api.post('/api/furniture/bulk-stock-update', {
      updates
    });
    return response.data;
  } catch (error) {
    console.error('Error bulk updating stock:', error);
    throw error;
  }
};

// Get stock statistics
export const getStockStats = async () => {
  try {
    const response = await api.get('/api/furniture/stock-stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching stock stats:', error);
    throw error;
  }
};
```

---

### React Component: Stock Management

**Create `components/admin/StockManagement.jsx`:**

```jsx
import React, { useState, useEffect } from 'react';
import { updateStock, getLowStockItems, getStockStats } from '../../services/stockService';
import { toast } from 'react-toastify';

const StockManagement = () => {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingStock, setEditingStock] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [lowStock, stockStats] = await Promise.all([
        getLowStockItems(5),
        getStockStats()
      ]);
      setLowStockItems(lowStock.data || []);
      setStats(stockStats.stats);
    } catch (error) {
      toast.error('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdate = async (furnitureId, newStock, operation = 'set') => {
    try {
      await updateStock(furnitureId, newStock, operation);
      toast.success('Stock updated successfully');
      fetchData(); // Refresh
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update stock');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="stock-management">
      <h1>Stock Management</h1>

      {/* Statistics */}
      {stats && (
        <div className="stock-stats">
          <div className="stat-card">
            <h3>{stats.total_stock}</h3>
            <p>Total Stock</p>
          </div>
          <div className="stat-card warning">
            <h3>{stats.low_stock_items}</h3>
            <p>Low Stock Items</p>
          </div>
          <div className="stat-card danger">
            <h3>{stats.out_of_stock_items}</h3>
            <p>Out of Stock</p>
          </div>
        </div>
      )}

      {/* Low Stock Items */}
      <div className="low-stock-section">
        <h2>Low Stock Items (Below 5)</h2>
        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Category</th>
              <th>Current Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {lowStockItems.map((item) => (
              <tr key={item._id}>
                <td>{item.name}</td>
                <td>{item.category}</td>
                <td>
                  <input
                    type="number"
                    value={editingStock[item._id] ?? item.stock}
                    onChange={(e) => setEditingStock({
                      ...editingStock,
                      [item._id]: parseInt(e.target.value) || 0
                    })}
                    min="0"
                  />
                </td>
                <td>
                  <button
                    onClick={() => handleStockUpdate(
                      item._id,
                      editingStock[item._id] || item.stock
                    )}
                  >
                    Update
                  </button>
                  <button
                    onClick={() => handleStockUpdate(
                      item._id,
                      5,
                      'add'
                    )}
                  >
                    +5
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockManagement;
```

---

### Quick Stock Update in Furniture Table

**Add to your furniture table:**

```jsx
// In your furniture table row
<td>
  <div className="stock-controls">
    <input
      type="number"
      value={item.stock || 0}
      onChange={async (e) => {
        const newStock = parseInt(e.target.value) || 0;
        try {
          await updateStock(item._id, newStock, 'set');
          toast.success('Stock updated');
          fetchFurniture(); // Refresh
        } catch (error) {
          toast.error('Failed to update stock');
        }
      }}
      min="0"
      style={{ width: '60px' }}
    />
    <button
      onClick={async () => {
        try {
          await updateStock(item._id, 1, 'add');
          toast.success('Stock increased');
          fetchFurniture();
        } catch (error) {
          toast.error('Failed to update');
        }
      }}
    >
      +1
    </button>
    <button
      onClick={async () => {
        try {
          await updateStock(item._id, 1, 'subtract');
          toast.success('Stock decreased');
          fetchFurniture();
        } catch (error) {
          toast.error('Failed to update');
        }
      }}
    >
      -1
    </button>
  </div>
</td>
```

---

## 🔧 Backend Implementation

### Add Stock Management Endpoints

**Add to `src/controllers/furnitureController.ts`:**

```typescript
// Update stock for a single furniture item
export const updateFurnitureStock = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { stock, operation = 'set' } = req.body;

    if (stock === undefined || stock < 0) {
      return res.status(400).json({ 
        message: 'Stock must be a non-negative number' 
      });
    }

    const furniture = await Furniture.findById(id);
    if (!furniture) {
      return res.status(404).json({ message: 'Furniture item not found' });
    }

    const previousStock = furniture.stock || 0;
    let newStock: number;

    switch (operation) {
      case 'add':
        newStock = previousStock + stock;
        break;
      case 'subtract':
        newStock = Math.max(0, previousStock - stock);
        break;
      case 'set':
      default:
        newStock = stock;
        break;
    }

    const update: any = {
      stock: newStock
    };

    // Auto-update availability based on stock
    if (newStock <= 0) {
      update.availability = 'Rented';
      update.status = 'Rented';
    } else if (furniture.availability === 'Rented' && newStock > 0) {
      update.availability = 'Available';
      update.status = 'Available';
    }

    const updatedFurniture = await Furniture.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    );

    logger.info('Stock updated', {
      furnitureId: id,
      previousStock,
      newStock,
      operation
    });

    return res.status(200).json({
      message: 'Stock updated successfully',
      furniture: updatedFurniture,
      previous_stock: previousStock,
      new_stock: newStock,
      change: newStock - previousStock
    });
  } catch (error: any) {
    logger.error('Update stock error:', error);
    return res.status(500).json({ 
      message: 'Error updating stock',
      error: error.message 
    });
  }
};

// Get low stock items
export const getLowStockItems = async (req: AuthRequest, res: Response) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 5;
    
    const items = await Furniture.find({
      stock: { $lt: threshold, $gte: 0 }
    }).select('name category stock availability status');

    return res.status(200).json({
      success: true,
      data: items,
      threshold,
      count: items.length
    });
  } catch (error: any) {
    logger.error('Get low stock error:', error);
    return res.status(500).json({ 
      message: 'Error fetching low stock items',
      error: error.message 
    });
  }
};

// Get out of stock items
export const getOutOfStockItems = async (req: AuthRequest, res: Response) => {
  try {
    const items = await Furniture.find({
      $or: [
        { stock: 0 },
        { stock: { $exists: false } }
      ]
    }).select('name category stock availability status');

    return res.status(200).json({
      success: true,
      data: items,
      count: items.length
    });
  } catch (error: any) {
    logger.error('Get out of stock error:', error);
    return res.status(500).json({ 
      message: 'Error fetching out of stock items',
      error: error.message 
    });
  }
};

// Bulk stock update
export const bulkUpdateStock = async (req: AuthRequest, res: Response) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ 
        message: 'Updates array is required' 
      });
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const update of updates) {
      try {
        const { furniture_id, stock, operation = 'set' } = update;
        
        const furniture = await Furniture.findById(furniture_id);
        if (!furniture) {
          results.push({
            furniture_id,
            success: false,
            error: 'Furniture not found'
          });
          failCount++;
          continue;
        }

        const previousStock = furniture.stock || 0;
        let newStock: number;

        switch (operation) {
          case 'add':
            newStock = previousStock + stock;
            break;
          case 'subtract':
            newStock = Math.max(0, previousStock - stock);
            break;
          case 'set':
          default:
            newStock = stock;
            break;
        }

        const updateData: any = { stock: newStock };
        
        if (newStock <= 0) {
          updateData.availability = 'Rented';
          updateData.status = 'Rented';
        } else if (furniture.availability === 'Rented' && newStock > 0) {
          updateData.availability = 'Available';
          updateData.status = 'Available';
        }

        await Furniture.findByIdAndUpdate(furniture_id, { $set: updateData });

        results.push({
          furniture_id,
          success: true,
          previous_stock: previousStock,
          new_stock: newStock,
          change: newStock - previousStock
        });
        successCount++;
      } catch (error: any) {
        results.push({
          furniture_id: update.furniture_id,
          success: false,
          error: error.message
        });
        failCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Bulk stock update completed',
      results,
      total_updated: successCount,
      total_failed: failCount
    });
  } catch (error: any) {
    logger.error('Bulk stock update error:', error);
    return res.status(500).json({ 
      message: 'Error bulk updating stock',
      error: error.message 
    });
  }
};

// Get stock statistics
export const getStockStats = async (req: AuthRequest, res: Response) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 5;
    
    const allFurniture = await Furniture.find({});
    
    const stats = {
      total_items: allFurniture.length,
      total_stock: allFurniture.reduce((sum, item) => sum + (item.stock || 0), 0),
      available_items: allFurniture.filter(item => item.availability === 'Available').length,
      low_stock_items: allFurniture.filter(item => (item.stock || 0) < threshold && (item.stock || 0) > 0).length,
      out_of_stock_items: allFurniture.filter(item => (item.stock || 0) === 0).length,
      average_stock: allFurniture.length > 0 
        ? allFurniture.reduce((sum, item) => sum + (item.stock || 0), 0) / allFurniture.length 
        : 0,
      low_stock_threshold: threshold
    };

    // Group by category
    const byCategory: any = {};
    allFurniture.forEach(item => {
      const category = item.category || 'Other';
      if (!byCategory[category]) {
        byCategory[category] = {
          total: 0,
          total_stock: 0,
          low_stock: 0,
          out_of_stock: 0
        };
      }
      byCategory[category].total++;
      byCategory[category].total_stock += item.stock || 0;
      if ((item.stock || 0) < threshold && (item.stock || 0) > 0) {
        byCategory[category].low_stock++;
      }
      if ((item.stock || 0) === 0) {
        byCategory[category].out_of_stock++;
      }
    });

    return res.status(200).json({
      success: true,
      stats,
      by_category: byCategory
    });
  } catch (error: any) {
    logger.error('Get stock stats error:', error);
    return res.status(500).json({ 
      message: 'Error fetching stock statistics',
      error: error.message 
    });
  }
};
```

**Add routes to `src/routes/furnitureRoutes.ts`:**

```typescript
import {
  // ... existing imports
  updateFurnitureStock,
  getLowStockItems,
  getOutOfStockItems,
  bulkUpdateStock,
  getStockStats
} from '../controllers/furnitureController';

// Add these routes (before the generic /:id route)
router.put('/:id/stock', authenticateToken, isAdmin, updateFurnitureStock);
router.get('/low-stock', authenticateToken, isAdmin, getLowStockItems);
router.get('/out-of-stock', authenticateToken, isAdmin, getOutOfStockItems);
router.post('/bulk-stock-update', authenticateToken, isAdmin, bulkUpdateStock);
router.get('/stock-stats', authenticateToken, isAdmin, getStockStats);
```

---

## ✅ Summary

**Available Endpoints:**
1. ✅ `PUT /api/furniture/:id/stock` - Update single product stock
2. ✅ `GET /api/furniture/low-stock` - Get low stock items
3. ✅ `GET /api/furniture/out-of-stock` - Get out of stock items
4. ✅ `POST /api/furniture/bulk-stock-update` - Bulk update stock
5. ✅ `GET /api/furniture/stock-stats` - Get stock statistics

**Features:**
- ✅ Set, add, or subtract stock
- ✅ Auto-update availability based on stock
- ✅ Low stock alerts
- ✅ Bulk operations
- ✅ Statistics dashboard

**Next Steps:**
1. Add backend endpoints (if not already added)
2. Create frontend service functions
3. Add stock management UI to admin panel
4. Test stock updates

---

**All APIs are ready to use!** 🚀

