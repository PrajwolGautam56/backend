# Valid Property Enum Values for Frontend

## 🎯 Use these EXACT values in your frontend

### **furnishing** (NOT Semi-Furnished!)
```javascript
✅ Valid values:
   "Full"     ❌ NOT "Fully Furnished"
   "Semi"     ❌ NOT "Semi-Furnished"
   "None"     ❌ NOT "Unfurnished"
```

---

### **availability**
```javascript
✅ Valid values:
   "Immediate"
   "Within 15 Days"
   "Within 30 Days"
   "After 30 Days"
```

---

### **building_type**
```javascript
✅ Valid values:
   "Apartment"
   "Villa"
   "Independent House"
   "Pent House"
   "Plot"
```

---

### **listing_type**
```javascript
✅ Valid values:
   "Rent"
   "Sell"
```

---

### **parking**
```javascript
✅ Valid values:
   "Public"
   "Reserved"
```

---

### **property_type**
```javascript
✅ Valid values:
   "Residential"
   "Commercial"
   "PG Hostel"
```

---

### **status**
```javascript
✅ Valid values:
   "Available"
   "Sold"
```

---

## 📝 Complete Enum Mapping for Frontend

```javascript
const PROPERTY_ENUMS = {
  furnishing: ["Full", "Semi", "None"],
  availability: ["Immediate", "Within 15 Days", "Within 30 Days", "After 30 Days"],
  building_type: ["Apartment", "Villa", "Independent House", "Pent House", "Plot"],
  listing_type: ["Rent", "Sell"],
  parking: ["Public", "Reserved"],
  property_type: ["Residential", "Commercial", "PG Hostel"],
  status: ["Available", "Sold"]
};

// Usage in React component
const [property, setProperty] = useState({
  furnishing: '',      // Must be: "Full" | "Semi" | "None"
  availability: '',     // Must be one of the 4 options above
  building_type: '',    // Must be: "Apartment" | "Villa" | etc.
  listing_type: '',     // Must be: "Rent" | "Sell"
  parking: '',          // Must be: "Public" | "Reserved"
  property_type: '',    // Must be: "Residential" | "Commercial" | "PG Hostel"
  status: 'Available'  // Default: "Available" | "Sold"
});
```

---

## ⚠️ Common Mistakes

| ❌ Wrong | ✅ Correct |
|---------|----------|
| `"Semi-Furnished"` | `"Semi"` |
| `"Fully Furnished"` | `"Full"` |
| `"Unfurnished"` | `"None"` |
| `"Reserved Parking"` | `"Reserved"` |
| `"Public Parking"` | `"Public"` |
| `"For Rent"` | `"Rent"` |
| `"For Sale"` | `"Sell"` |
| `"Immediately"` | `"Immediate"` |

---

## 🎨 Frontend Validation Example

```javascript
// Validation function
const validatePropertyData = (data) => {
  const errors = [];
  
  // Check furnishing
  if (data.furnishing && !['Full', 'Semi', 'None'].includes(data.furnishing)) {
    errors.push(`Invalid furnishing: "${data.furnishing}". Use: Full, Semi, or None`);
  }
  
  // Check availability
  if (data.availability && !['Immediate', 'Within 15 Days', 'Within 30 Days', 'After 30 Days'].includes(data.availability)) {
    errors.push(`Invalid availability`);
  }
  
  // Check building_type
  if (data.building_type && !['Apartment', 'Villa', 'Independent House', 'Pent House', 'Plot'].includes(data.building_type)) {
    errors.push(`Invalid building_type`);
  }
  
  // Check listing_type
  if (data.listing_type && !['Rent', 'Sell'].includes(data.listing_type)) {
    errors.push(`Invalid listing_type`);
  }
  
  // Check parking
  if (data.parking && !['Public', 'Reserved'].includes(data.parking)) {
    errors.push(`Invalid parking`);
  }
  
  // Check property_type
  if (data.property_type && !['Residential', 'Commercial', 'PG Hostel'].includes(data.property_type)) {
    errors.push(`Invalid property_type`);
  }
  
  return errors;
};

// Usage
const formData = {
  furnishing: "Semi",  // ✅ CORRECT
  availability: "Immediate",
  building_type: "Apartment",
  listing_type: "Rent",
  parking: "Reserved",
  property_type: "Residential"
};

const validationErrors = validatePropertyData(formData);
if (validationErrors.length > 0) {
  console.error('Validation errors:', validationErrors);
  return;
}
```

---

## 📋 Quick Reference Card

```javascript
// Copy-paste these into your frontend
const FURNISHING_OPTIONS = [
  { value: 'Full', label: 'Full Furnished' },
  { value: 'Semi', label: 'Semi Furnished' },
  { value: 'None', label: 'Unfurnished' }
];

const AVAILABILITY_OPTIONS = [
  { value: 'Immediate', label: 'Immediate' },
  { value: 'Within 15 Days', label: 'Within 15 Days' },
  { value: 'Within 30 Days', label: 'Within 30 Days' },
  { value: 'After 30 Days', label: 'After 30 Days' }
];

const BUILDING_TYPE_OPTIONS = [
  { value: 'Apartment', label: 'Apartment' },
  { value: 'Villa', label: 'Villa' },
  { value: 'Independent House', label: 'Independent House' },
  { value: 'Pent House', label: 'Pent House' },
  { value: 'Plot', label: 'Plot' }
];

const LISTING_TYPE_OPTIONS = [
  { value: 'Rent', label: 'For Rent' },
  { value: 'Sell', label: 'For Sale' }
];

const PARKING_OPTIONS = [
  { value: 'Public', label: 'Public Parking' },
  { value: 'Reserved', label: 'Reserved Parking' }
];

const PROPERTY_TYPE_OPTIONS = [
  { value: 'Residential', label: 'Residential' },
  { value: 'Commercial', label: 'Commercial' },
  { value: 'PG Hostel', label: 'PG Hostel' }
];
```

---

## ✅ Summary

**Most Important:** 
- `furnishing: "Semi"` ✅ (NOT "Semi-Furnished" ❌)
- `furnishing: "Full"` ✅ (NOT "Fully Furnished" ❌)
- `furnishing: "None"` ✅ (NOT "Unfurnished" ❌)

Use these EXACT values in your form selects/dropdowns!

