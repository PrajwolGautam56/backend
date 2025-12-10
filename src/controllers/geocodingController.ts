import { Request, Response } from 'express';
import { geocodeAddress, reverseGeocode } from '../utils/geocoding';
import logger from '../utils/logger';

/**
 * Search for locations using Google Places API (Autocomplete)
 * This endpoint helps frontend search for places like "Brigade Medows"
 */
export const searchLocations = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        message: 'Query parameter is required',
        example: '/api/geocoding/search?query=Brigade Medows Bangalore'
      });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      return res.status(503).json({
        message: 'Geocoding service not configured. Please set GOOGLE_MAPS_API_KEY.',
        suggestion: 'Frontend should use a geocoding library like Leaflet Control Geocoder or Mapbox Geocoder'
      });
    }

    // Use Google Places Autocomplete API
    const autocompleteUrl = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    autocompleteUrl.searchParams.set('input', query);
    autocompleteUrl.searchParams.set('key', apiKey);
    autocompleteUrl.searchParams.set('types', 'establishment|geocode'); // Include both places and addresses

    const response = await fetch(autocompleteUrl.toString());
    const data = await response.json();

    if (data.status === 'OK' && data.predictions) {
      // Get details for each prediction to get coordinates
      const results = await Promise.all(
        data.predictions.slice(0, 5).map(async (prediction: any) => {
          try {
            // Get place details to get coordinates
            const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
            detailsUrl.searchParams.set('place_id', prediction.place_id);
            detailsUrl.searchParams.set('fields', 'geometry,formatted_address,name');
            detailsUrl.searchParams.set('key', apiKey);

            const detailsResponse = await fetch(detailsUrl.toString());
            const detailsData = await detailsResponse.json();

            if (detailsData.status === 'OK' && detailsData.result) {
              const location = detailsData.result.geometry?.location;
              return {
                place_id: prediction.place_id,
                description: prediction.description,
                main_text: prediction.structured_formatting?.main_text || prediction.description,
                secondary_text: prediction.structured_formatting?.secondary_text || '',
                latitude: location?.lat,
                longitude: location?.lng,
                formatted_address: detailsData.result.formatted_address || prediction.description
              };
            }
          } catch (error) {
            logger.warn('Error fetching place details', { place_id: prediction.place_id, error });
          }
          return null;
        })
      );

      const validResults = results.filter((r: any) => r !== null);

      return res.status(200).json({
        success: true,
        results: validResults,
        count: validResults.length
      });
    } else {
      logger.warn('Places API error', { status: data.status, error_message: data.error_message });
      return res.status(200).json({
        success: false,
        message: data.error_message || 'No results found',
        results: []
      });
    }
  } catch (error: any) {
    logger.error('Error searching locations:', error);
    res.status(500).json({
      message: 'Error searching locations',
      error: error.message
    });
  }
};

/**
 * Geocode an address string to get coordinates
 * Useful when frontend has an address but needs coordinates
 */
export const geocodeLocation = async (req: Request, res: Response) => {
  try {
    const { address, location } = req.body;

    if (!address && !location) {
      return res.status(400).json({
        message: 'Either "address" object or "location" string is required',
        example: {
          location: 'Brigade Medows, Bangalore',
          // OR
          address: {
            street: '123 Main St',
            city: 'Bangalore',
            state: 'Karnataka',
            country: 'India',
            zipcode: '560001'
          }
        }
      });
    }

    const result = await geocodeAddress(
      address || {},
      location
    );

    if (result) {
      return res.status(200).json({
        success: true,
        ...result
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Could not geocode the provided address. Please check if GOOGLE_MAPS_API_KEY is set.'
      });
    }
  } catch (error: any) {
    logger.error('Error geocoding location:', error);
    res.status(500).json({
      message: 'Error geocoding location',
      error: error.message
    });
  }
};

/**
 * Reverse geocode coordinates to get address
 * Useful when user clicks on map and you need the address
 */
export const reverseGeocodeLocation = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({
        message: 'latitude and longitude (numbers) are required',
        example: {
          latitude: 12.9716,
          longitude: 77.5946
        }
      });
    }

    const address = await reverseGeocode(latitude, longitude);

    if (address) {
      return res.status(200).json({
        success: true,
        address,
        coordinates: {
          latitude,
          longitude
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Could not reverse geocode the provided coordinates'
      });
    }
  } catch (error: any) {
    logger.error('Error reverse geocoding:', error);
    res.status(500).json({
      message: 'Error reverse geocoding',
      error: error.message
    });
  }
};

