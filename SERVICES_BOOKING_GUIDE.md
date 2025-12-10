# Services & Service Booking Complete Guide

## 🛠️ Service Categories (Updated)

### Available Service Types:
- **carpentry** - Woodwork, furniture repair
- **plumbing** - Pipe repairs, installations
- **electrical** - Wiring, electrical work
- **painting** - Interior/exterior painting
- **cleaning** - Deep cleaning services
- **ac** - AC installation and repair
- **moving** - Moving and relocation
- **interior** - Interior design
- **roofing** - Roof repair and installation
- **flooring** - Floor installation
- **appliance_repair** - Appliance repairs

---

## 📡 Services API

### **Base URL:** `http://localhost:3030/api/services`

---

### 1. Get All Services
```javascript
GET /api/services
GET /api/services?category=plumbing&isAvailable=true
```

**Query Parameters:**
- `category`: carpentry, plumbing, electrical, painting, cleaning, ac, moving, interior, roofing, flooring, appliance_repair
- `isAvailable`: true | false
- `pricingType`: fixed | estimate | range

**Example:**
```javascript
const response = await fetch('http://localhost:3030/api/services?category=plumbing');
const services = await response.json();
```

---

### 2. Get Service by ID
```javascript
GET /api/services/:id
```

---

### 3. Create Service (Admin Only)
```javascript
POST /api/services
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```javascript
{
  "name": "Carpentry Services",
  "category": "carpentry",
  "description": "Professional carpentry work",
  "pricing": {
    "type": "estimate",
    "minAmount": 500,
    "maxAmount": 2000,
    "unit": "per hour"
  },
  "features": ["Woodwork", "Furniture repair", "Custom designs"],
  "duration": 4,
  "availableTimeSlots": ["09:00-12:00", "14:00-17:00"],
  "isAvailable": true,
  "estimateRequired": true
}
```

---

## 📅 Service Booking API

### **Base URL:** `http://localhost:3030/api/service-bookings`

---

### 1. Create Service Booking (PUBLIC - No Auth Required)

**URL:** `POST http://localhost:3030/api/service-bookings`

**Required Fields:**
```javascript
{
  service_type: "plumbing",              // REQUIRED
  name: "John Doe",                      // REQUIRED
  phone_number: "1234567890",           // REQUIRED
  preferred_date: "2024-11-05",         // REQUIRED (YYYY-MM-DD)
  preferred_time: "10:00",              // REQUIRED (HH:MM)
  service_address: "123 Main St"         // REQUIRED
}
```

**Optional Fields:**
```javascript
{
  email: "john@example.com",             // Optional
  alternate_date: "2024-11-06",         // Optional backup date
  alternate_time: "14:00",              // Optional backup time
  additional_notes: "Please call before arrival" // Optional
}
```

**Time Format Options:**
- Single time: `"10:00"`
- Time slot: `"10:00-12:00"`

---

### 2. Get All Bookings (Admin Only)

**URL:** `GET http://localhost:3030/api/service-bookings`

**Query Parameters:**
- `service_type`: plumbing, carpentry, etc.
- `status`: requested, accepted, ongoing, completed, cancelled
- `date`: Filter by date
- `phone_number`: Search by phone

**Example:**
```javascript
const response = await fetch('http://localhost:3030/api/service-bookings?status=requested', {
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});
const bookings = await response.json();
```

---

### 3. Get Booking by ID
```javascript
GET /api/service-bookings/:id
```

---

### 4. Update Booking Status (Admin Only)
```javascript
PUT /api/service-bookings/:id/status
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "status": "accepted"
}
```

**Valid Status Values:**
- `requested` - New booking
- `accepted` - Admin accepted
- `ongoing` - Service in progress
- `completed` - Service finished
- `cancelled` - Booking cancelled

---

### 5. Cancel Booking (Admin Only)
```javascript
DELETE /api/service-bookings/:id
Authorization: Bearer <token>
```

---

## 🎨 Frontend Implementation

### Example: Book a Service

```javascript
const bookService = async (bookingData) => {
  const response = await fetch('http://localhost:3030/api/service-bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      service_type: bookingData.service_type,
      name: bookingData.name,
      phone_number: bookingData.phone_number,
      email: bookingData.email, // Optional
      preferred_date: bookingData.preferred_date, // Format: YYYY-MM-DD
      preferred_time: bookingData.preferred_time, // Format: HH:MM or HH:MM-HH:MM
      alternate_date: bookingData.alternate_date, // Optional
      alternate_time: bookingData.alternate_time, // Optional
      service_address: bookingData.service_address,
      additional_notes: bookingData.additional_notes // Optional
    })
  });

  return await response.json();
};

// Usage
const booking = await bookService({
  service_type: 'plumbing',
  name: 'John Doe',
  phone_number: '1234567890',
  email: 'john@example.com',
  preferred_date: '2024-11-05',
  preferred_time: '10:00',
  service_address: '123 Main St, Mumbai',
  additional_notes: 'Need urgent pipe repair'
});
```

---

### React Booking Form Component

```javascript
import { useState } from 'react';

const ServiceBookingForm = () => {
  const [formData, setFormData] = useState({
    service_type: 'plumbing',
    name: '',
    phone_number: '',
    email: '',
    preferred_date: '',
    preferred_time: '',
    service_address: '',
    additional_notes: ''
  });

  const serviceTypes = [
    { value: 'carpentry', label: 'Carpentry' },
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'painting', label: 'Painting' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'ac', label: 'AC Services' },
    { value: 'moving', label: 'Moving' },
    { value: 'interior', label: 'Interior Design' },
    { value: 'roofing', label: 'Roofing' },
    { value: 'flooring', label: 'Flooring' },
    { value: 'appliance_repair', label: 'Appliance Repair' }
  ];

  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00',
    '14:00', '15:00', '16:00', '17:00'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:3030/api/service-bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      
      if (response.ok) {
        alert('Service booking submitted successfully!');
        // Reset form
        setFormData({
          service_type: 'plumbing',
          name: '',
          phone_number: '',
          email: '',
          preferred_date: '',
          preferred_time: '',
          service_address: '',
          additional_notes: ''
        });
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to submit booking');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Book a Service</h2>
      
      {/* Service Type */}
      <select
        value={formData.service_type}
        onChange={(e) => setFormData({...formData, service_type: e.target.value})}
        required
      >
        <option value="">Select Service Type</option>
        {serviceTypes.map(service => (
          <option key={service.value} value={service.value}>
            {service.label}
          </option>
        ))}
      </select>

      {/* Name */}
      <input
        type="text"
        placeholder="Your Name *"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        required
      />

      {/* Phone */}
      <input
        type="tel"
        placeholder="Phone Number *"
        value={formData.phone_number}
        onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
        required
      />

      {/* Email (Optional) */}
      <input
        type="email"
        placeholder="Email (Optional)"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
      />

      {/* Preferred Date */}
      <input
        type="date"
        value={formData.preferred_date}
        onChange={(e) => setFormData({...formData, preferred_date: e.target.value})}
        required
        min={new Date().toISOString().split('T')[0]}
      />

      {/* Preferred Time */}
      <select
        value={formData.preferred_time}
        onChange={(e) => setFormData({...formData, preferred_time: e.target.value})}
        required
      >
        <option value="">Select Time</option>
        {timeSlots.map(time => (
          <option key={time} value={time}>{time}</option>
        ))}
      </select>

      {/* Service Address */}
      <textarea
        placeholder="Service Address *"
        value={formData.service_address}
        onChange={(e) => setFormData({...formData, service_address: e.target.value})}
        required
      />

      {/* Additional Notes */}
      <textarea
        placeholder="Additional Notes (Optional)"
        value={formData.additional_notes}
        onChange={(e) => setFormData({...formData, additional_notes: e.target.value})}
      />

      <button type="submit">Book Service</button>
    </form>
  );
};

export default ServiceBookingForm;
```

---

## 📋 Service Categories with Examples

### **Carpentry**
- Woodwork, furniture making, custom designs, repairs

### **Plumbing**
- Pipe repair, installation, leak fixing, drainage

### **Electrical**
- Wiring, switch repair, panel installation, electrical testing

### **Painting**
- Interior painting, exterior painting, wall finishing

### **Cleaning**
- Deep cleaning, carpet cleaning, office cleaning

### **AC Services**
- Installation, repair, maintenance, gas filling

### **Moving**
- Relocation, shifting, packing, transporting

### **Interior Design**
- Design consultation, remodeling, decoration

### **Roofing**
- Roof repair, installation, waterproofing

### **Flooring**
- Tile laying, wood flooring, marble work

### **Appliance Repair**
- Washing machine, refrigerator, microwave repair

---

## ✅ Quick Reference

### **Book Service (Public)**
```javascript
POST /api/service-bookings
Body: {
  service_type: "plumbing",
  name: "John Doe",
  phone_number: "1234567890",
  preferred_date: "2024-11-05",
  preferred_time: "10:00",
  service_address: "123 Main St"
}
```

### **View Bookings (Admin)**
```javascript
GET /api/service-bookings?status=requested
Headers: Authorization: Bearer <token>
```

### **Update Status (Admin)**
```javascript
PUT /api/service-bookings/:id/status
Body: { status: "accepted" }
```

---

## 📝 Summary

✅ **11 Service Categories:** Including carpentry, plumbing, electrical, etc.  
✅ **Public Booking:** No authentication required  
✅ **Time Slots:** Single time or time range  
✅ **Status Management:** requested, accepted, ongoing, completed, cancelled  
✅ **Admin Management:** View, update, and manage all bookings

