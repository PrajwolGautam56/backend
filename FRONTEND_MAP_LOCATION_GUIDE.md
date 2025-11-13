# Frontend Map Location Guide

This guide explains how to display property locations on a map using the address information stored in properties, without requiring users to manually enter latitude/longitude.

## Overview

Properties have the following location-related fields:
- `address`: Object with `street`, `city`, `state`, `country`, `zipcode`
- `location`: String (general location description)
- `location_coordinates`: Object with `latitude` and `longitude` (auto-populated by backend if `GOOGLE_MAPS_API_KEY` is set)

## Backend Auto-Geocoding

The backend automatically geocodes addresses when:
1. A property is created/updated with address information
2. `GOOGLE_MAPS_API_KEY` environment variable is set
3. `location_coordinates` are not already provided

If `GOOGLE_MAPS_API_KEY` is not set, the backend skips geocoding and the frontend should handle it.

## Frontend Implementation

### Option 1: Using Google Maps JavaScript API (Recommended)

#### 1. Install Dependencies

```bash
npm install @react-google-maps/api
# or
yarn add @react-google-maps/api
```

#### 2. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select existing
3. Enable "Maps JavaScript API" and "Geocoding API"
4. Create credentials (API Key)
5. Restrict the API key to your domain (optional but recommended)

#### 3. React Component Example

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

interface Property {
  _id: string;
  name?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipcode?: string;
  };
  location?: string;
  location_coordinates?: {
    latitude?: number;
    longitude?: number;
  };
}

interface PropertyMapProps {
  property: Property;
  height?: string;
}

const PropertyMap: React.FC<PropertyMapProps> = ({ property, height = '400px' }) => {
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 12.9716, // Default: Bangalore
    lng: 77.5946
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);

  // Build address string
  const buildAddressString = useCallback(() => {
    const parts: string[] = [];
    if (property.address?.street) parts.push(property.address.street);
    if (property.address?.city) parts.push(property.address.city);
    if (property.address?.state) parts.push(property.address.state);
    if (property.address?.zipcode) parts.push(property.address.zipcode);
    if (property.address?.country) parts.push(property.address.country);
    
    return property.location || parts.join(', ') || '';
  }, [property]);

  // Geocode address if coordinates not available
  useEffect(() => {
    const geocodeAddress = async () => {
      // If coordinates already exist, use them
      if (property.location_coordinates?.latitude && property.location_coordinates?.longitude) {
        setMapCenter({
          lat: property.location_coordinates.latitude,
          lng: property.location_coordinates.longitude
        });
        setIsLoaded(true);
        return;
      }

      // Otherwise, geocode the address
      const addressString = buildAddressString();
      if (!addressString) {
        setGeocodingError('No address information available');
        setIsLoaded(true);
        return;
      }

      try {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: addressString }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location;
            setMapCenter({
              lat: location.lat(),
              lng: location.lng()
            });
            setIsLoaded(true);
            
            // Optionally update backend with coordinates
            updatePropertyCoordinates(location.lat(), location.lng());
          } else {
            setGeocodingError(`Geocoding failed: ${status}`);
            setIsLoaded(true);
          }
        });
      } catch (error) {
        console.error('Geocoding error:', error);
        setGeocodingError('Failed to geocode address');
        setIsLoaded(true);
      }
    };

    geocodeAddress();
  }, [property, buildAddressString]);

  // Update property coordinates in backend (optional)
  const updatePropertyCoordinates = async (lat: number, lng: number) => {
    try {
      await fetch(`${API_BASE_URL}/api/properties/${property._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          location_coordinates: { latitude: lat, longitude: lng }
        })
      });
    } catch (error) {
      console.error('Failed to update coordinates:', error);
    }
  };

  const mapContainerStyle = {
    width: '100%',
    height: height
  };

  const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Google Maps API key not configured</p>
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={isLoaded ? 15 : 10}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        {isLoaded && (
          <Marker
            position={mapCenter}
            title={property.name || 'Property Location'}
          />
        )}
      </GoogleMap>
      {geocodingError && (
        <div style={{ padding: '10px', background: '#ffebee', color: '#c62828' }}>
          {geocodingError}
        </div>
      )}
    </LoadScript>
  );
};

export default PropertyMap;
```

#### 4. Usage in Property Detail Page

```tsx
import PropertyMap from './components/PropertyMap';

const PropertyDetailPage: React.FC<{ propertyId: string }> = ({ propertyId }) => {
  const [property, setProperty] = useState<Property | null>(null);

  useEffect(() => {
    fetchProperty(propertyId).then(setProperty);
  }, [propertyId]);

  if (!property) return <div>Loading...</div>;

  return (
    <div>
      <h1>{property.name}</h1>
      {/* Other property details */}
      
      {/* Map Section */}
      <div style={{ marginTop: '30px' }}>
        <h2>Location</h2>
        <PropertyMap property={property} height="500px" />
      </div>
    </div>
  );
};
```

### Option 2: Using Leaflet (Open Source Alternative)

#### 1. Install Dependencies

```bash
npm install react-leaflet leaflet
npm install --save-dev @types/leaflet
```

#### 2. React Component Example

```tsx
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Property {
  _id: string;
  name?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  location?: string;
  location_coordinates?: {
    latitude?: number;
    longitude?: number;
  };
}

const PropertyMap: React.FC<{ property: Property }> = ({ property }) => {
  const [position, setPosition] = useState<[number, number]>([12.9716, 77.5946]); // Default: Bangalore
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const geocodeAddress = async () => {
      // Use existing coordinates if available
      if (property.location_coordinates?.latitude && property.location_coordinates?.longitude) {
        setPosition([
          property.location_coordinates.latitude,
          property.location_coordinates.longitude
        ]);
        setLoading(false);
        return;
      }

      // Geocode using Nominatim (OpenStreetMap) - free, no API key needed
      const addressParts: string[] = [];
      if (property.address?.street) addressParts.push(property.address.street);
      if (property.address?.city) addressParts.push(property.address.city);
      if (property.address?.state) addressParts.push(property.address.state);
      if (property.address?.country) addressParts.push(property.address.country);
      
      const addressString = property.location || addressParts.join(', ');
      
      if (!addressString) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressString)}&limit=1`
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
          setPosition([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        }
      } catch (error) {
        console.error('Geocoding error:', error);
      } finally {
        setLoading(false);
      }
    };

    geocodeAddress();
  }, [property]);

  if (loading) {
    return <div>Loading map...</div>;
  }

  return (
    <MapContainer
      center={position}
      zoom={15}
      style={{ height: '400px', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position}>
        <Popup>
          {property.name || 'Property Location'}
          <br />
          {property.address?.street && `${property.address.street}, `}
          {property.address?.city && `${property.address.city}, `}
          {property.address?.state && property.address.state}
        </Popup>
      </Marker>
    </MapContainer>
  );
};

export default PropertyMap;
```

### Option 3: Static Map Image (Simple Fallback)

If you don't want to use interactive maps, you can display a static map image:

```tsx
const StaticPropertyMap: React.FC<{ property: Property }> = ({ property }) => {
  const [mapUrl, setMapUrl] = useState<string>('');

  useEffect(() => {
    const buildMapUrl = () => {
      // Use coordinates if available
      if (property.location_coordinates?.latitude && property.location_coordinates?.longitude) {
        const { latitude, longitude } = property.location_coordinates;
        // Using Google Static Maps API (requires API key)
        const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
        if (apiKey) {
          return `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=600x400&markers=${latitude},${longitude}&key=${apiKey}`;
        }
      }
      
      // Or use address string
      const addressString = property.location || 
        [property.address?.street, property.address?.city, property.address?.state]
          .filter(Boolean).join(', ');
      
      if (addressString) {
        const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
        if (apiKey) {
          return `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(addressString)}&zoom=15&size=600x400&markers=${encodeURIComponent(addressString)}&key=${apiKey}`;
        }
      }
      
      return '';
    };

    setMapUrl(buildMapUrl());
  }, [property]);

  if (!mapUrl) {
    return <div>Map not available</div>;
  }

  return (
    <img 
      src={mapUrl} 
      alt="Property Location" 
      style={{ width: '100%', height: '400px', objectFit: 'cover' }}
    />
  );
};
```

## Best Practices

1. **Always check for existing coordinates first** - If `location_coordinates` exist, use them directly
2. **Cache geocoding results** - Store coordinates in the backend to avoid repeated API calls
3. **Handle errors gracefully** - Show a message if geocoding fails
4. **Update backend coordinates** - After geocoding on frontend, optionally update the property with coordinates
5. **Rate limiting** - Be aware of API rate limits (Google Maps: 50 requests/second, Nominatim: 1 request/second)

## Environment Variables

Add to your `.env` file:

```env
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

## API Endpoints

The backend automatically geocodes addresses when creating/updating properties if `GOOGLE_MAPS_API_KEY` is set. You can also manually update coordinates:

```typescript
// Update property with coordinates
PUT /api/properties/:id
{
  "location_coordinates": {
    "latitude": 12.9716,
    "longitude": 77.5946
  }
}
```

## Summary

- **Backend**: Auto-geocodes addresses if `GOOGLE_MAPS_API_KEY` is set
- **Frontend**: Should geocode addresses if coordinates are missing
- **Display**: Use Google Maps, Leaflet, or static map images
- **Fallback**: Show address text if map cannot be displayed

