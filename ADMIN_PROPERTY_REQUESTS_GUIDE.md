# Admin Property Requests Management Guide

## 📍 Overview
Complete guide for managing property viewing requests in the admin console.

---

## 🔐 Admin Authentication
All admin endpoints require:
```
Authorization: Bearer <admin-token>
```

---

## 📋 Admin Endpoints

### 1. **Get All Property Requests** (with Filters & Pagination)
```
GET http://localhost:3030/api/property-forms
```

#### Query Parameters:
```javascript
{
  status: "Requested",        // Optional: Filter by status
  property_id: "PROP-2024-...", // Optional: Filter by property
  search: "john",            // Optional: Search name/email/phone
  page: "1",                 // Optional: Page number (default: 1)
  limit: "10",              // Optional: Items per page (default: 10)
  sortBy: "createdAt",      // Optional: Sort field (default: createdAt)
  sortOrder: "desc"         // Optional: asc/desc (default: desc)
}
```

#### Example Request:
```javascript
const getRequests = async (filters) => {
  const queryParams = new URLSearchParams(filters).toString();
  
  const response = await fetch(
    `http://localhost:3030/api/property-forms?${queryParams}`,
    {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    }
  );
  
  return await response.json();
};

// Usage:
const allRequests = await getRequests({ page: 1, limit: 20 });
const pendingRequests = await getRequests({ status: 'Requested' });
const searchResults = await getRequests({ search: 'john@example.com' });
```

#### Response (200):
```json
{
  "success": true,
  "data": [
    {
      "_id": "68ffbfc20710b8e29c38d385",
      "property_id": "PROP-2024-1028-ABC123",
      "name": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "1234567890",
      "message": "I'm interested in this property",
      "status": "Requested",
      "userId": {
        "_id": "68ffbfc20710b8e29c38d384",
        "fullName": "John Doe",
        "email": "john@example.com",
        "username": "johndoe"
      },
      "createdAt": "2024-10-27T20:00:00.000Z",
      "updatedAt": "2024-10-27T20:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

---

### 2. **Get Single Property Request**
```
GET http://localhost:3030/api/property-forms/:id
```

#### Example Request:
```javascript
const getRequest = async (requestId) => {
  const response = await fetch(
    `http://localhost:3030/api/property-forms/${requestId}`,
    {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    }
  );
  
  return await response.json();
};
```

#### Response (200):
```json
{
  "success": true,
  "data": {
    "_id": "68ffbfc20710b8e29c38d385",
    "property_id": "PROP-2024-1028-ABC123",
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "1234567890",
    "message": "I'm interested in visiting this property",
    "status": "Requested",
    "userId": {
      "_id": "68ffbfc20710b8e29c38d384",
      "fullName": "John Doe",
      "email": "john@example.com",
      "username": "johndoe",
      "phoneNumber": "1234567890"
    },
    "createdAt": "2024-10-27T20:00:00.000Z",
    "updatedAt": "2024-10-27T20:00:00.000Z"
  }
}
```

---

### 3. **Update Request Status**
```
PATCH http://localhost:3030/api/property-forms/:id/status
```

#### Request Body:
```javascript
{
  "status": "Accepted" // Requested | Accepted | Ongoing | Completed | Cancelled
}
```

#### Valid Statuses:
- `Requested` - Initial request
- `Accepted` - Admin accepted the request
- `Ongoing` - Viewing in progress
- `Completed` - Viewing completed
- `Cancelled` - Request cancelled

#### Example Request:
```javascript
const updateStatus = async (requestId, newStatus) => {
  const response = await fetch(
    `http://localhost:3030/api/property-forms/${requestId}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: newStatus })
    }
  );
  
  return await response.json();
};

// Usage:
await updateStatus('68ffbfc20710b8e29c38d385', 'Accepted');
await updateStatus('68ffbfc20710b8e29c38d385', 'Completed');
```

#### Response (200):
```json
{
  "success": true,
  "message": "Property request status updated successfully",
  "data": {
    "_id": "68ffbfc20710b8e29c38d385",
    "status": "Accepted",
    // ... rest of the request data
  }
}
```

#### Error (400):
```json
{
  "message": "Invalid status",
  "validStatuses": ["Requested", "Accepted", "Ongoing", "Completed", "Cancelled"]
}
```

---

### 4. **Update Request Details**
```
PUT http://localhost:3030/api/property-forms/:id
```

#### Request Body:
```javascript
{
  "name": "John Doe",              // Optional
  "email": "newemail@example.com",  // Optional
  "phoneNumber": "9876543210",     // Optional
  "message": "Updated message"     // Optional
}
```

#### Example Request:
```javascript
const updateRequest = async (requestId, updates) => {
  const response = await fetch(
    `http://localhost:3030/api/property-forms/${requestId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(updates)
    }
  );
  
  return await response.json();
};

// Usage:
await updateRequest('68ffbfc20710b8e29c38d385', {
  phoneNumber: '9876543210',
  message: 'Updated contact info'
});
```

#### Response (200):
```json
{
  "success": true,
  "message": "Property request updated successfully",
  "data": {
    // Updated request data
  }
}
```

---

### 5. **Delete Request**
```
DELETE http://localhost:3030/api/property-forms/:id
```

#### Example Request:
```javascript
const deleteRequest = async (requestId) => {
  const response = await fetch(
    `http://localhost:3030/api/property-forms/${requestId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    }
  );
  
  return await response.json();
};
```

#### Response (200):
```json
{
  "message": "Property form deleted successfully"
}
```

---

## 🎨 Complete Admin Dashboard Example

```javascript
import { useState, useEffect } from 'react';

const PropertyRequestsDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({});

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const response = await fetch(
        `http://localhost:3030/api/property-forms?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();
      setRequests(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filters]);

  const updateStatus = async (id, newStatus) => {
    try {
      const response = await fetch(
        `http://localhost:3030/api/property-forms/${id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ status: newStatus })
        }
      );
      
      if (response.ok) {
        fetchRequests(); // Refresh list
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const deleteRequest = async (id) => {
    if (!confirm('Are you sure you want to delete this request?')) return;
    
    try {
      const response = await fetch(
        `http://localhost:3030/api/property-forms/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.ok) {
        fetchRequests();
      }
    } catch (error) {
      console.error('Error deleting request:', error);
    }
  };

  return (
    <div className="dashboard">
      <h1>Property Requests</h1>

      {/* Filters */}
      <div className="filters">
        <select 
          value={filters.status} 
          onChange={(e) => setFilters({...filters, status: e.target.value})}
        >
          <option value="">All Statuses</option>
          <option value="Requested">Requested</option>
          <option value="Accepted">Accepted</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value, page: 1})}
        />
      </div>

      {/* Table */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Property ID</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request._id}>
                  <td>{request.name}</td>
                  <td>
                    <div>{request.email}</div>
                    <div>{request.phoneNumber}</div>
                  </td>
                  <td>{request.property_id}</td>
                  <td>
                    <select 
                      value={request.status}
                      onChange={(e) => updateStatus(request._id, e.target.value)}
                    >
                      <option value="Requested">Requested</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Ongoing">Ongoing</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => deleteRequest(request._id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="pagination">
            <button 
              disabled={pagination.page === 1}
              onClick={() => setFilters({...filters, page: pagination.page - 1})}
            >
              Previous
            </button>
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <button 
              disabled={pagination.page === pagination.totalPages}
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

export default PropertyRequestsDashboard;
```

---

## 📊 Status Workflow

```
Requested → Accepted → Ongoing → Completed
    ↓         ↓           ↓          ↓
 Cancelled → Cancelled → Cancelled → Archived
```

---

## 🔍 Request Statistics Example

```javascript
const getRequestStats = async () => {
  const [requested, accepted, completed] = await Promise.all([
    fetchRequests({ status: 'Requested', limit: 1000 }),
    fetchRequests({ status: 'Accepted', limit: 1000 }),
    fetchRequests({ status: 'Completed', limit: 1000 })
  ]);

  return {
    requested: requested.pagination.total,
    accepted: accepted.pagination.total,
    completed: completed.pagination.total,
    total: requested.pagination.total + 
           accepted.pagination.total + 
           completed.pagination.total
  };
};
```

---

## ✅ Key Features

✅ **Advanced Filtering** - By status, property, search text  
✅ **Pagination** - Efficient data loading  
✅ **Status Management** - Easy status updates  
✅ **User Information** - Populated user details  
✅ **Search Functionality** - Name, email, phone search  
✅ **Sorting** - Sort by any field  
✅ **Activity Tracking** - All changes are logged

