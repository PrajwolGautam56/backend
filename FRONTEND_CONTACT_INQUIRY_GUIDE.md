# Frontend Contact Inquiry Implementation Guide

## 📋 Complete Guide for Contact Form & Inquiry Management

This guide shows you how to implement contact form submission and display contact inquiries in the user dashboard.

---

## 🔗 API Endpoints

### 1. Submit Contact Form
```
POST /api/contacts
```

### 2. Get User Dashboard (Includes Contact Inquiries)
```
GET /api/users/dashboard/me
```

### 3. Admin: Get All Contact Inquiries
```
GET /api/contacts
```

### 4. Admin: Update Contact Status
```
PATCH /api/contacts/:id/status
```

---

## 📝 1. Contact Form Submission

### Basic Implementation

```javascript
// Submit contact form
const submitContactForm = async (formData) => {
  try {
    const token = localStorage.getItem('accessToken'); // Optional - for logged-in users
    
    const response = await fetch('http://localhost:3030/api/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }) // Include token if user is logged in
      },
      body: JSON.stringify({
        fullname: formData.fullname,
        email: formData.email, // Will be ignored if user is logged in
        phonenumber: formData.phonenumber,
        subject: formData.subject,
        message: formData.message
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit contact form');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error submitting contact form:', error);
    throw error;
  }
};
```

### React Component Example

```jsx
import { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    phonenumber: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill form if user is logged in
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullname: user.fullName || prev.fullname,
        email: user.email || prev.email,
        phonenumber: user.phoneNumber || prev.phonenumber
      }));
    }
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch('http://localhost:3030/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setFormData({
          fullname: '',
          email: '',
          phonenumber: '',
          subject: '',
          message: ''
        });
        // Show success message
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(data.message || 'Failed to submit form');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-form">
      <h2>Contact Us</h2>
      
      {success && (
        <div className="alert alert-success">
          Thank you! Your message has been sent successfully.
        </div>
      )}
      
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Full Name *</label>
          <input
            type="text"
            name="fullname"
            value={formData.fullname}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={loading}
            // Note: This will be ignored if user is logged in
          />
        </div>

        <div className="form-group">
          <label>Phone Number *</label>
          <input
            type="tel"
            name="phonenumber"
            value={formData.phonenumber}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Subject *</label>
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Message *</label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows="5"
            required
            disabled={loading}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </div>
  );
};

export default ContactForm;
```

---

## 📊 2. Display Contact Inquiries in Dashboard

### Fetch Dashboard Data

```javascript
// Fetch user dashboard (includes contact inquiries)
const fetchDashboard = async () => {
  try {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch('http://localhost:3030/api/users/dashboard/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch dashboard');
    }

    const data = await response.json();
    return data.data; // Contains allContactInquiries, stats, etc.
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    throw error;
  }
};
```

### Display Contact Inquiries Component

```jsx
import { useState, useEffect } from 'react';

const ContactInquiriesTab = () => {
  const [inquiries, setInquiries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInquiries();
  }, []);

  const loadInquiries = async () => {
    try {
      setLoading(true);
      const dashboardData = await fetchDashboard();
      
      setInquiries(dashboardData.allContactInquiries || []);
      setStats(dashboardData.stats || {});
    } catch (err) {
      setError('Failed to load inquiries');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new':
        return 'badge-primary';
      case 'read':
        return 'badge-info';
      case 'responded':
        return 'badge-success';
      default:
        return 'badge-secondary';
    }
  };

  if (loading) {
    return <div className="loading">Loading inquiries...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="contact-inquiries">
      <div className="dashboard-header">
        <h2>My Contact Inquiries</h2>
        {stats && (
          <div className="stats-badge">
            Total: {stats.totalContactInquiries}
          </div>
        )}
      </div>

      {inquiries.length === 0 ? (
        <div className="empty-state">
          <p>You haven't submitted any contact inquiries yet.</p>
        </div>
      ) : (
        <div className="inquiries-list">
          {inquiries.map((inquiry) => (
            <div key={inquiry._id} className="inquiry-card">
              <div className="inquiry-header">
                <div>
                  <h3>{inquiry.subject}</h3>
                  <span className="contact-id">ID: {inquiry.contact_id}</span>
                </div>
                <span className={`status-badge ${getStatusColor(inquiry.status)}`}>
                  {inquiry.status.toUpperCase()}
                </span>
              </div>

              <div className="inquiry-body">
                <p className="message">{inquiry.message}</p>
                
                <div className="inquiry-meta">
                  <div className="meta-item">
                    <strong>Submitted:</strong>{' '}
                    {new Date(inquiry.created_at).toLocaleDateString()}
                  </div>
                  <div className="meta-item">
                    <strong>Contact:</strong> {inquiry.fullname} ({inquiry.email})
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContactInquiriesTab;
```

---

## 👨‍💼 3. Admin: Update Contact Status

### Update Status Function

```javascript
// Update contact inquiry status (Admin only)
const updateContactStatus = async (contactId, newStatus) => {
  try {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('Admin authentication required');
    }

    const response = await fetch(
      `http://localhost:3030/api/contacts/${contactId}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus // 'new', 'read', or 'responded'
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update status');
    }

    const data = await response.json();
    return data.data; // Updated contact object
  } catch (error) {
    console.error('Error updating contact status:', error);
    throw error;
  }
};
```

### Admin Contact Management Component

```jsx
import { useState, useEffect } from 'react';

const AdminContactManagement = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'new', 'read', 'responded'

  useEffect(() => {
    loadContacts();
  }, [filter]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const url = filter !== 'all' 
        ? `http://localhost:3030/api/contacts?status=${filter}`
        : 'http://localhost:3030/api/contacts';

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to load contacts');

      const data = await response.json();
      setContacts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (contactId, newStatus) => {
    try {
      const updatedContact = await updateContactStatus(contactId, newStatus);
      
      // Update local state
      setContacts(contacts.map(contact => 
        contact._id === updatedContact._id || contact.contact_id === updatedContact.contact_id
          ? updatedContact
          : contact
      ));
    } catch (error) {
      alert('Failed to update status: ' + error.message);
    }
  };

  const getStatusOptions = (currentStatus) => {
    const allStatuses = ['new', 'read', 'responded'];
    return allStatuses.filter(s => s !== currentStatus);
  };

  return (
    <div className="admin-contact-management">
      <div className="page-header">
        <h1>Contact Inquiries Management</h1>
        
        <div className="filters">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={filter === 'new' ? 'active' : ''}
            onClick={() => setFilter('new')}
          >
            New
          </button>
          <button
            className={filter === 'read' ? 'active' : ''}
            onClick={() => setFilter('read')}
          >
            Read
          </button>
          <button
            className={filter === 'responded' ? 'active' : ''}
            onClick={() => setFilter('responded')}
          >
            Responded
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading contacts...</div>
      ) : (
        <div className="contacts-table">
          <table>
            <thead>
              <tr>
                <th>Contact ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact._id}>
                  <td>{contact.contact_id}</td>
                  <td>{contact.fullname}</td>
                  <td>{contact.email}</td>
                  <td>{contact.subject}</td>
                  <td>
                    <span className={`status-badge status-${contact.status}`}>
                      {contact.status}
                    </span>
                  </td>
                  <td>
                    {new Date(contact.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <select
                      value={contact.status}
                      onChange={(e) => handleStatusChange(
                        contact._id || contact.contact_id,
                        e.target.value
                      )}
                      className="status-select"
                    >
                      <option value="new">New</option>
                      <option value="read">Read</option>
                      <option value="responded">Responded</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {contacts.length === 0 && (
            <div className="empty-state">
              <p>No contact inquiries found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminContactManagement;
```

---

## 🎨 4. CSS Styling Examples

```css
/* Contact Form */
.contact-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.contact-form .form-group {
  margin-bottom: 20px;
}

.contact-form label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.contact-form input,
.contact-form textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

/* Contact Inquiries */
.contact-inquiries {
  padding: 20px;
}

.inquiry-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  background: #fff;
}

.inquiry-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.inquiry-header h3 {
  margin: 0 0 5px 0;
}

.contact-id {
  font-size: 12px;
  color: #666;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.status-badge.badge-primary {
  background: #007bff;
  color: white;
}

.status-badge.badge-info {
  background: #17a2b8;
  color: white;
}

.status-badge.badge-success {
  background: #28a745;
  color: white;
}

.inquiry-meta {
  display: flex;
  gap: 20px;
  margin-top: 15px;
  font-size: 14px;
  color: #666;
}

/* Admin Table */
.admin-contact-management {
  padding: 20px;
}

.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.filters button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 4px;
}

.filters button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.contacts-table table {
  width: 100%;
  border-collapse: collapse;
}

.contacts-table th,
.contacts-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.status-select {
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #ddd;
}
```

---

## 📋 5. Complete Integration Example (Axios)

```javascript
import axios from 'axios';

// Setup axios instance
const api = axios.create({
  baseURL: 'http://localhost:3030/api',
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Contact API functions
export const contactAPI = {
  // Submit contact form
  submitContact: async (formData) => {
    const response = await api.post('/contacts', formData);
    return response.data;
  },

  // Get all contacts (Admin)
  getAllContacts: async (filters = {}) => {
    const response = await api.get('/contacts', { params: filters });
    return response.data;
  },

  // Get contact by ID (Admin)
  getContactById: async (id) => {
    const response = await api.get(`/contacts/${id}`);
    return response.data;
  },

  // Update contact status (Admin)
  updateStatus: async (id, status) => {
    const response = await api.patch(`/contacts/${id}/status`, { status });
    return response.data;
  },

  // Delete contact (Admin)
  deleteContact: async (id) => {
    const response = await api.delete(`/contacts/${id}`);
    return response.data;
  }
};

// Usage
// await contactAPI.submitContact({ fullname, email, ... });
// await contactAPI.updateStatus(contactId, 'read');
```

---

## ✅ 6. Key Points for Frontend Team

### Important Notes:

1. **Token is Optional**: Contact form can be submitted with or without authentication
   - If logged in: Uses account email (form email is ignored)
   - If not logged in: Uses form email

2. **ID Field**: Contact endpoints accept both:
   - MongoDB `_id` (recommended for updates)
   - `contact_id` (e.g., "CNT1730000000")

3. **Status Values**: Only three valid statuses:
   - `'new'` - New inquiry (default)
   - `'read'` - Admin has read it
   - `'responded'` - Admin has responded

4. **Dashboard Integration**: Contact inquiries are automatically included in:
   - `GET /api/users/dashboard/me`
   - Fields: `allContactInquiries`, `recentContactInquiries`, `stats.totalContactInquiries`

5. **Activity Tracking**: Contact submissions are automatically logged in user's activity log if logged in

---

## 🚀 Quick Start Checklist

- [ ] Implement contact form component
- [ ] Add contact inquiries tab to user dashboard
- [ ] Create admin contact management page
- [ ] Add status update functionality (admin)
- [ ] Display contact inquiry count in dashboard stats
- [ ] Handle both authenticated and guest submissions
- [ ] Style contact inquiry cards
- [ ] Add loading and error states
- [ ] Test status updates from admin panel

---

## 📞 Testing

### Test Contact Form:
```javascript
// Test submission
await contactAPI.submitContact({
  fullname: 'Test User',
  email: 'test@example.com',
  phonenumber: '+919876543210',
  subject: 'Test Inquiry',
  message: 'This is a test message'
});
```

### Test Status Update:
```javascript
// Update to 'read'
await contactAPI.updateStatus('contact_mongodb_id', 'read');
```

---

**That's it!** Your frontend team can now implement contact inquiries with these examples. All API endpoints are ready and tested! 🎉

