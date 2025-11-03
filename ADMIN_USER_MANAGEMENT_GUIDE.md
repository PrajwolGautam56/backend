# Admin User Management Guide

## 📍 Overview
Complete guide for managing users in the admin panel.

---

## 🔐 Admin Authentication
All admin endpoints require:
```
Authorization: Bearer <admin-token>
```

---

## 📋 Admin Endpoints

### 1. **Get All Users** (with Filters & Pagination)
```
GET http://localhost:3030/api/users
```

#### Query Parameters:
```javascript
{
  search: "john",         // Search by name, email, username, phone
  role: "user",          // Filter by role
  isVerified: "true",    // Filter by verification status
  page: "1",             // Page number
  limit: "10",           // Items per page
  sortBy: "createdAt",   // Sort field
  sortOrder: "desc"      // asc/desc
}
```

#### Example Request:
```javascript
const getUsers = async (filters) => {
  const queryParams = new URLSearchParams(filters).toString();
  
  const response = await fetch(
    `http://localhost:3030/api/users?${queryParams}`,
    {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    }
  );
  
  return await response.json();
};

// Usage:
const allUsers = await getUsers({ page: 1, limit: 20 });
const searchResults = await getUsers({ search: 'john' });
const verifiedUsers = await getUsers({ isVerified: 'true' });
```

#### Response (200):
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "fullName": "John Doe",
      "username": "johndoe",
      "email": "john@example.com",
      "phoneNumber": "1234567890",
      "nationality": "India",
      "role": "user",
      "isVerified": true,
      "isAdmin": false,
      "profilePicture": "default-profile.png",
      "createdAt": "2024-10-27T20:00:00.000Z",
      "updatedAt": "2024-10-27T20:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

### 2. **Get Single User**
```
GET http://localhost:3030/api/users/:id
```

#### Response (200):
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "fullName": "John Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "phoneNumber": "1234567890",
    "nationality": "India",
    "role": "user",
    "isVerified": true,
    "isAdmin": false,
    "createdAt": "2024-10-27T20:00:00.000Z"
  }
}
```

---

### 3. **Get User Details** (with All Submissions)
```
GET http://localhost:3030/api/users/details/:id
```

#### Response (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "fullName": "John Doe",
      "email": "john@example.com",
      "username": "johndoe",
      "phoneNumber": "1234567890",
      "role": "user",
      "isVerified": true,
      "isAdmin": false,
      "createdAt": "2024-10-27T20:00:00.000Z",
      "activityLog": [
        {
          "action": "property_request",
          "timestamp": "2024-10-27T20:00:00.000Z",
          "details": {
            "property_id": "PROP-2024-1028-ABC123",
            "property_name": "Modern Apartment"
          }
        }
      ]
    },
    "submissions": {
      "propertyRequests": {
        "total": 5,
        "items": [ /* array of property requests */ ]
      },
      "furnitureRequests": {
        "total": 3,
        "items": [ /* array of furniture requests */ ]
      },
      "serviceBookings": {
        "total": 8,
        "items": [ /* array of service bookings */ ]
      }
    },
    "stats": {
      "totalSubmissions": 16,
      "totalActivities": 10
    }
  }
}
```

---

### 4. **Update User Information**
```
PUT http://localhost:3030/api/users/:id
```

#### Request Body:
```javascript
{
  "fullName": "John Doe Updated",
  "phoneNumber": "9876543210",
  "isVerified": true,
  "isAdmin": false,
  "role": "user"
}
```

#### Example Request:
```javascript
const updateUser = async (userId, updates) => {
  const response = await fetch(
    `http://localhost:3030/api/users/${userId}`,
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
await updateUser('userId123', {
  fullName: 'John Doe Updated',
  isVerified: true
});
```

#### Response (200):
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    // Updated user data
  }
}
```

---

### 5. **Delete User**
```
DELETE http://localhost:3030/api/users/:id
```

#### Example Request:
```javascript
const deleteUser = async (userId) => {
  const response = await fetch(
    `http://localhost:3030/api/users/${userId}`,
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
  "success": true,
  "message": "User deleted successfully"
}
```

---

## 🎨 Complete Admin Dashboard Example

```javascript
import { useState, useEffect } from 'react';

const UserManagementDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    isVerified: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({});

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const response = await fetch(
        `http://localhost:3030/api/users?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          }
        }
      );
      const data = await response.json();
      setUsers(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const viewUserDetails = async (userId) => {
    const response = await fetch(
      `http://localhost:3030/api/users/details/${userId}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      }
    );
    const data = await response.json();
    setSelectedUser(data.data);
  };

  const updateUserStatus = async (userId, isVerified) => {
    await fetch(
      `http://localhost:3030/api/users/${userId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ isVerified })
      }
    );
    fetchUsers(); // Refresh
  };

  return (
    <div className="user-management">
      <h1>User Management</h1>

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search users..."
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value, page: 1})}
        />
        <select 
          value={filters.role}
          onChange={(e) => setFilters({...filters, role: e.target.value, page: 1})}
        >
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select 
          value={filters.isVerified}
          onChange={(e) => setFilters({...filters, isVerified: e.target.value, page: 1})}
        >
          <option value="">All</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
      </div>

      {/* User Table */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Verified</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td>{user.fullName}</td>
                  <td>{user.email}</td>
                  <td>{user.phoneNumber}</td>
                  <td>{user.role}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={user.isVerified}
                      onChange={(e) => updateUserStatus(user._id, e.target.checked)}
                    />
                  </td>
                  <td>
                    <button onClick={() => viewUserDetails(user._id)}>
                      View Details
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

      {/* User Details Modal */}
      {selectedUser && (
        <div className="modal">
          <h2>User Details</h2>
          <div>
            <h3>Information</h3>
            <p>Name: {selectedUser.user.fullName}</p>
            <p>Email: {selectedUser.user.email}</p>
            <p>Phone: {selectedUser.user.phoneNumber}</p>
          </div>
          
          <div>
            <h3>Activity</h3>
            <p>Total Activities: {selectedUser.stats.totalActivities}</p>
            <p>Total Submissions: {selectedUser.stats.totalSubmissions}</p>
          </div>

          <div>
            <h3>Submissions</h3>
            <p>Property Requests: {selectedUser.submissions.propertyRequests.total}</p>
            <p>Furniture Requests: {selectedUser.submissions.furnitureRequests.total}</p>
            <p>Service Bookings: {selectedUser.submissions.serviceBookings.total}</p>
          </div>

          <button onClick={() => setSelectedUser(null)}>Close</button>
        </div>
      )}
    </div>
  );
};

export default UserManagementDashboard;
```

---

## ✅ Summary

✅ **List Users** - With search, filter, pagination  
✅ **User Details** - Full profile + all submissions  
✅ **Update User** - Edit user information  
✅ **Delete User** - Remove user account  
✅ **Activity History** - View user activity log  
✅ **User Submissions** - View all property/furniture/service requests

