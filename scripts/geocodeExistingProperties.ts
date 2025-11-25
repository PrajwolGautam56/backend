/**
 * Batch geocoding script for existing properties
 * 
 * This script will:
 * 1. Find all properties without location_coordinates
 * 2. Attempt to geocode them using their address/location fields
 * 3. Update the properties with coordinates
 * 
 * Usage:
 *   npm run geocode-properties
 *   OR
 *   ts-node scripts/geocodeExistingProperties.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { geocodeAddress } from '../src/utils/geocoding';
import Property from '../src/models/Property';
import logger from '../src/utils/logger';

dotenv.config();

const geocodeExistingProperties = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not set in environment variables');
    }

    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // Check if Google Maps API key is set
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      logger.warn('GOOGLE_MAPS_API_KEY not set. Geocoding will be skipped.');
      logger.info('Please set GOOGLE_MAPS_API_KEY in your .env file to enable geocoding.');
      process.exit(0);
    }

    // Find all properties without coordinates
    const propertiesWithoutCoords = await Property.find({
      $or: [
        { location_coordinates: { $exists: false } },
        { location_coordinates: null },
        { 'location_coordinates.latitude': { $exists: false } },
        { 'location_coordinates.longitude': { $exists: false } }
      ]
    });

    logger.info(`Found ${propertiesWithoutCoords.length} properties without coordinates`);

    if (propertiesWithoutCoords.length === 0) {
      logger.info('All properties already have coordinates. Exiting.');
      await mongoose.disconnect();
      process.exit(0);
    }

    let successCount = 0;
    let failCount = 0;
    const failedProperties: string[] = [];

    // Process each property
    for (const property of propertiesWithoutCoords) {
      try {
        // Build address string
        const addressParts: string[] = [];
        if (property.address?.street) addressParts.push(property.address.street);
        if (property.address?.city) addressParts.push(property.address.city);
        if (property.address?.state) addressParts.push(property.address.state);
        if (property.address?.zipcode) addressParts.push(property.address.zipcode);
        if (property.address?.country) addressParts.push(property.address.country);

        const addressString = property.location || addressParts.join(', ');

        if (!addressString || addressString.trim().length === 0) {
          logger.warn(`Skipping property ${property.property_id || property._id}: No address or location`);
          failCount++;
          failedProperties.push(property.property_id || property._id.toString());
          continue;
        }

        logger.info(`Geocoding: ${addressString} (Property: ${property.property_id || property._id})`);

        // Geocode the address
        const geocodeResult = await geocodeAddress(
          property.address || {},
          property.location || addressString
        );

        if (geocodeResult) {
          // Update property with coordinates
          property.location_coordinates = {
            latitude: geocodeResult.latitude,
            longitude: geocodeResult.longitude
          };
          await property.save();

          logger.info(`✅ Geocoded: ${property.property_id || property._id} -> ${geocodeResult.latitude}, ${geocodeResult.longitude}`);
          successCount++;

          // Rate limiting: wait 100ms between requests to avoid hitting API limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          logger.warn(`❌ Failed to geocode: ${property.property_id || property._id} - ${addressString}`);
          failCount++;
          failedProperties.push(property.property_id || property._id.toString());
        }
      } catch (error: any) {
        logger.error(`Error processing property ${property.property_id || property._id}:`, error);
        failCount++;
        failedProperties.push(property.property_id || property._id.toString());
      }
    }

    // Summary
    logger.info('\n=== Geocoding Summary ===');
    logger.info(`Total properties processed: ${propertiesWithoutCoords.length}`);
    logger.info(`Successfully geocoded: ${successCount}`);
    logger.info(`Failed: ${failCount}`);

    if (failedProperties.length > 0) {
      logger.warn('\nFailed properties (you may need to geocode these manually):');
      failedProperties.forEach(id => logger.warn(`  - ${id}`));
    }

    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
    process.exit(0);
  } catch (error: any) {
    logger.error('Fatal error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run the script
geocodeExistingProperties();

