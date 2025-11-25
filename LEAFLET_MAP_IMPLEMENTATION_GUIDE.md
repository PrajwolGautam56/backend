# Leaflet Map Implementation Guide

Complete guide for implementing interactive maps with location search using Leaflet in your frontend.

## 📋 Table of Contents

1. [Backend API Endpoints](#backend-api-endpoints)
2. [Frontend Setup](#frontend-setup)
3. [Admin Property Form - Map with Search](#admin-property-form---map-with-search)
4. [Property Detail Page - Display Map](#property-detail-page---display-map)
5. [Batch Geocoding Existing Properties](#batch-geocoding-existing-properties)

---

## Backend API Endpoints

### 1. Search Locations (Autocomplete)
**GET** `/api/geocoding/search?query=Brigade Medows Bangalore`

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "place_id": "ChIJ...",
      "description": "Brigade Medows, Kanakapura Road, Bangalore",
      "main_text": "Brigade Medows",
      "secondary_text": "Kanakapura Road, Bangalore",
      "latitude": 12.845678,
      "longitude": 77.512345,
      "formatted_address": "Brigade Medows, Kanakapura Road, Bangalore, Karnataka 560082"
    }
  ],
  "count": 1
}
```

### 2. Geocode Address
**POST** `/api/geocoding/geocode`

**Request:**
```json
{
  "location": "Brigade Medows, Bangalore"
  // OR
  "address": {
    "street": "123 Main St",
    "city": "Bangalore",
    "state": "Karnataka",
    "country": "India",
    "zipcode": "560001"
  }
}
```

**Response:**
```json
{
  "success": true,
  "latitude": 12.845678,
  "longitude": 77.512345,
  "formattedAddress": "Brigade Medows, Kanakapura Road, Bangalore, Karnataka 560082"
}
```

### 3. Reverse Geocode (Get Address from Coordinates)
**POST** `/api/geocoding/reverse`

**Request:**
```json
{
  "latitude": 12.845678,
  "longitude": 77.512345
}
```

**Response:**
```json
{
  "success": true,
  "address": "Brigade Medows, Kanakapura Road, Bangalore, Karnataka 560082",
  "coordinates": {
    "latitude": 12.845678,
    "longitude": 77.512345
  }
}
```

### 4. Create/Update Property with Coordinates
**POST** `/api/properties` or **PUT** `/api/properties/:id`

**Request Body:**
```json
{
  "name": "Brigade Medows 2 BHK",
  "location": "Brigade Medows, Bangalore",
  "location_coordinates": {
    "latitude": 12.845678,
    "longitude": 77.512345
  },
  // ... other property fields
}
```

---

## Frontend Setup

### 1. Install Dependencies

```bash
npm install leaflet react-leaflet
npm install @types/leaflet --save-dev  # If using TypeScript
```

### 2. Install Leaflet CSS

Add to your `index.html` or main CSS file:
```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
```

Or import in your main CSS:
```css
@import '~leaflet/dist/leaflet.css';
```

### 3. Install Geocoding Plugin (Optional - for search)

```bash
npm install leaflet-control-geocoder
```

---

## Admin Property Form - Map with Search

### Complete Component Example

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';
import Geocoder from 'leaflet-control-geocoder';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPickerProps {
  initialLocation?: {
    latitude: number;
    longitude: number;
  };
  initialAddress?: string;
  onLocationSelect: (coords: { latitude: number; longitude: number }, address: string) => void;
}

// Component to add geocoder control to map
function GeocoderControl({ onLocationSelect }: { onLocationSelect: (coords: { latitude: number; longitude: number }, address: string) => void }) {
  const map = useMap();
  
  useEffect(() => {
    // Option 1: Use Leaflet Control Geocoder (uses Nominatim - free, no API key)
    const geocoder = new Geocoder({
      position: 'topright',
      placeholder: 'Search location...',
      errorMessage: 'Nothing found.',
      geocoder: Geocoder.nominatim({
        geocodingQueryParams: {
          countrycodes: 'in', // Limit to India
          limit: 5
        }
      })
    });

    geocoder.on('markgeocode', (e: any) => {
      const { center, name } = e.geocode;
      const coords = {
        latitude: center.lat,
        longitude: center.lng
      };
      onLocationSelect(coords, name);
      
      // Move map to selected location
      map.setView(center, 15);
    });

    geocoder.addTo(map);

    return () => {
      map.removeControl(geocoder);
    };
  }, [map, onLocationSelect]);

  return null;
}

// Option 2: Custom search using backend API (if GOOGLE_MAPS_API_KEY is set)
function CustomSearchControl({ onLocationSelect }: { onLocationSelect: (coords: { latitude: number; longitude: number }, address: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const map = useMap();

  const handleSearch = async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/geocoding/search?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.success && data.results) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result: any) => {
    const coords = {
      latitude: result.latitude,
      longitude: result.longitude
    };
    onLocationSelect(coords, result.formatted_address || result.description);
    setSearchQuery(result.description);
    setSearchResults([]);
    
    // Move map to selected location
    map.setView([result.latitude, result.longitude], 15);
  };

  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: '10px', marginRight: '10px' }}>
      <div className="leaflet-control" style={{ background: 'white', padding: '5px', borderRadius: '4px', boxShadow: '0 1px 5px rgba(0,0,0,0.4)' }}>
        <input
          type="text"
          placeholder="Search location (e.g., Brigade Medows)"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            handleSearch(e.target.value);
          }}
          style={{ width: '300px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        {isSearching && <div>Searching...</div>}
        {searchResults.length > 0 && (
          <div style={{ marginTop: '5px', maxHeight: '200px', overflowY: 'auto' }}>
            {searchResults.map((result, index) => (
              <div
                key={result.place_id || index}
                onClick={() => handleSelectResult(result)}
                style={{
                  padding: '8px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #eee',
                  backgroundColor: '#f9f9f9'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9e9e9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
              >
                <div style={{ fontWeight: 'bold' }}>{result.main_text || result.description}</div>
                {result.secondary_text && (
                  <div style={{ fontSize: '12px', color: '#666' }}>{result.secondary_text}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  initialLocation,
  initialAddress,
  onLocationSelect
}) => {
  const [position, setPosition] = useState<[number, number]>(
    initialLocation 
      ? [initialLocation.latitude, initialLocation.longitude]
      : [12.9716, 77.5946] // Default: Bangalore center
  );
  const [markerPosition, setMarkerPosition] = useState<[number, number]>(position);
  const [selectedAddress, setSelectedAddress] = useState(initialAddress || '');

  const handleMapClick = async (e: L.LeafletMouseEvent) => {
    const newPosition: [number, number] = [e.latlng.lat, e.latlng.lng];
    setMarkerPosition(newPosition);
    setPosition(newPosition);

    // Reverse geocode to get address
    try {
      const response = await fetch('/api/geocoding/reverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: e.latlng.lat,
          longitude: e.latlng.lng
        })
      });
      const data = await response.json();
      if (data.success) {
        setSelectedAddress(data.address);
        onLocationSelect(
          { latitude: e.latlng.lat, longitude: e.latlng.lng },
          data.address
        );
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
    }
  };

  const handleLocationSelect = (coords: { latitude: number; longitude: number }, address: string) => {
    setPosition([coords.latitude, coords.longitude]);
    setMarkerPosition([coords.latitude, coords.longitude]);
    setSelectedAddress(address);
    onLocationSelect(coords, address);
  };

  return (
    <div>
      <div style={{ marginBottom: '10px' }}>
        <label>Selected Location:</label>
        <input
          type="text"
          value={selectedAddress}
          readOnly
          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          placeholder="Click on map or search to select location"
        />
        <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
          Coordinates: {markerPosition[0].toFixed(6)}, {markerPosition[1].toFixed(6)}
        </div>
      </div>

      <MapContainer
        center={position}
        zoom={13}
        style={{ height: '400px', width: '100%', borderRadius: '8px' }}
        onClick={handleMapClick}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Option 1: Use Leaflet Control Geocoder (free, no API key needed) */}
        <GeocoderControl onLocationSelect={handleLocationSelect} />
        
        {/* Option 2: Use backend API search (requires GOOGLE_MAPS_API_KEY) */}
        {/* <CustomSearchControl onLocationSelect={handleLocationSelect} /> */}
        
        <Marker position={markerPosition} draggable={true}>
          {/* Marker is draggable - user can drag to adjust */}
        </Marker>
      </MapContainer>

      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        💡 Tip: Click on the map or search for a location. You can also drag the marker to fine-tune the position.
      </div>
    </div>
  );
};

export default LocationPicker;
```

### Usage in Property Form

```tsx
import LocationPicker from './LocationPicker';

const PropertyForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    location_coordinates: null as { latitude: number; longitude: number } | null,
    // ... other fields
  });

  const handleLocationSelect = (coords: { latitude: number; longitude: number }, address: string) => {
    setFormData({
      ...formData,
      location: address,
      location_coordinates: coords
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      location_coordinates: formData.location_coordinates // This will be saved to database
    };

    // Submit to /api/properties
    await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Other form fields */}
      
      <div className="form-group">
        <label>Property Location</label>
        <LocationPicker
          initialLocation={formData.location_coordinates || undefined}
          initialAddress={formData.location}
          onLocationSelect={handleLocationSelect}
        />
      </div>

      <button type="submit">Save Property</button>
    </form>
  );
};
```

---

## Property Detail Page - Display Map

### Simple Map Display Component

```tsx
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface PropertyMapProps {
  property: {
    name?: string;
    location_coordinates?: {
      latitude?: number;
      longitude?: number;
    };
    location?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
    };
  };
}

const PropertyMap: React.FC<PropertyMapProps> = ({ property }) => {
  // Check if coordinates exist
  if (!property.location_coordinates?.latitude || !property.location_coordinates?.longitude) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <p>📍 Location map not available</p>
        <p style={{ fontSize: '12px', color: '#666' }}>
          {property.location || property.address?.city || 'Location information not provided'}
        </p>
      </div>
    );
  }

  const position: [number, number] = [
    property.location_coordinates.latitude,
    property.location_coordinates.longitude
  ];

  return (
    <div style={{ marginTop: '20px' }}>
      <h3>📍 Location</h3>
      <MapContainer
        center={position}
        zoom={15}
        style={{ height: '400px', width: '100%', borderRadius: '8px', marginTop: '10px' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>
            <strong>{property.name || 'Property Location'}</strong>
            <br />
            {property.location || property.address?.city}
          </Popup>
        </Marker>
      </MapContainer>
      <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
        {property.location || `${property.address?.street}, ${property.address?.city}`}
      </p>
    </div>
  );
};

export default PropertyMap;
```

### Usage in Property Detail Page

```tsx
import PropertyMap from './PropertyMap';

const PropertyDetails = ({ propertyId }) => {
  const [property, setProperty] = useState(null);

  useEffect(() => {
    fetch(`/api/properties/${propertyId}`)
      .then(res => res.json())
      .then(data => setProperty(data));
  }, [propertyId]);

  if (!property) return <div>Loading...</div>;

  return (
    <div>
      <h1>{property.name}</h1>
      {/* Other property details */}
      
      <PropertyMap property={property} />
    </div>
  );
};
```

---

## Batch Geocoding Existing Properties

### Run the Script

```bash
# Make sure GOOGLE_MAPS_API_KEY is set in .env
npm run geocode-properties
```

### What It Does

1. Finds all properties without `location_coordinates`
2. Attempts to geocode them using their `address` or `location` fields
3. Updates properties with coordinates
4. Shows summary of success/failures

### Manual Geocoding via API

If you want to geocode specific properties manually:

```bash
# Geocode a specific address
curl -X POST http://localhost:3030/api/geocoding/geocode \
  -H "Content-Type: application/json" \
  -d '{"location": "Brigade Medows, Bangalore"}'
```

---

## Environment Setup

### Backend (.env)

```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**Note:** The backend geocoding endpoints require `GOOGLE_MAPS_API_KEY`. However, the frontend can use Leaflet Control Geocoder (free, uses Nominatim) without any API key.

### Frontend

No API key needed if using Leaflet Control Geocoder (Nominatim). If you want to use the backend search endpoint, ensure `GOOGLE_MAPS_API_KEY` is set on the backend.

---

## Summary

✅ **Backend Ready:**
- `/api/geocoding/search` - Search locations
- `/api/geocoding/geocode` - Geocode address
- `/api/geocoding/reverse` - Reverse geocode coordinates
- Properties accept `location_coordinates` field

✅ **Frontend Steps:**
1. Install `leaflet` and `react-leaflet`
2. Add Leaflet CSS
3. Use `LocationPicker` component in admin form
4. Use `PropertyMap` component in property detail page
5. Coordinates are saved once and reused forever

✅ **Benefits:**
- Search for "Brigade Medows" → Select → Coordinates saved
- No manual lat/lng entry needed
- Coordinates stored in database, reused everywhere
- Fast map rendering (no geocoding on every page load)

---

## Troubleshooting

### Map not showing
- Check if Leaflet CSS is imported
- Verify coordinates exist: `property.location_coordinates?.latitude`

### Search not working
- If using backend API: Check `GOOGLE_MAPS_API_KEY` is set
- If using Leaflet Control Geocoder: No API key needed (uses Nominatim)

### Marker icon broken
- Import marker icons as shown in examples above
- Set `L.Marker.prototype.options.icon = DefaultIcon`

---

## Next Steps

1. ✅ Install Leaflet dependencies
2. ✅ Add `LocationPicker` to admin property form
3. ✅ Add `PropertyMap` to property detail page
4. ✅ Run batch geocoding script for existing properties
5. ✅ Test search and map display

Your properties will now have accurate, reusable coordinates! 🗺️

