import logger from './logger';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
}

/**
 * Geocode an address to get latitude and longitude
 * Uses Google Maps Geocoding API if GOOGLE_MAPS_API_KEY is set
 * Otherwise returns null (frontend should handle geocoding)
 */
export const geocodeAddress = async (
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipcode?: string;
  },
  location?: string
): Promise<GeocodeResult | null> => {
  try {
    // Build address string from components
    const addressParts: string[] = [];
    
    if (address.street) addressParts.push(address.street);
    if (address.city) addressParts.push(address.city);
    if (address.state) addressParts.push(address.state);
    if (address.zipcode) addressParts.push(address.zipcode);
    if (address.country) addressParts.push(address.country);
    
    // If location field exists, use it (might be more complete)
    const fullAddress = location || addressParts.join(', ');
    
    if (!fullAddress || fullAddress.trim().length === 0) {
      logger.warn('No address provided for geocoding');
      return null;
    }

    // Check if Google Maps API key is configured
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      logger.info('GOOGLE_MAPS_API_KEY not set - skipping backend geocoding. Frontend should handle geocoding.');
      return null;
    }

    // Use Google Maps Geocoding API with fetch
    const geocodeUrl = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    geocodeUrl.searchParams.set('address', fullAddress);
    geocodeUrl.searchParams.set('key', apiKey);

    const response = await fetch(geocodeUrl.toString());
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;
      
      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: result.formatted_address
      };
    } else {
      logger.warn('Geocoding failed:', data.status, fullAddress);
      return null;
    }
  } catch (error) {
    logger.error('Error geocoding address:', error);
    return null;
  }
};

/**
 * Reverse geocode coordinates to get address
 */
export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<string | null> => {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      return null;
    }

    const geocodeUrl = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    geocodeUrl.searchParams.set('latlng', `${latitude},${longitude}`);
    geocodeUrl.searchParams.set('key', apiKey);

    const response = await fetch(geocodeUrl.toString());
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
    
    return null;
  } catch (error) {
    logger.error('Error reverse geocoding:', error);
    return null;
  }
};

