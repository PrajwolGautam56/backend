import { NextFunction, Request, Response } from 'express';
// Import Property model only for update/delete operations (not for create)
import Property from '../models/Property';
import { AuthRequest } from '../interfaces/Request';
import {IProperty} from '../interfaces/Property';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';
import mongoose, { Schema } from 'mongoose'; // Ensure mongoose is imported
import cloudinary from '../utils/cloudinary';
import { config } from '../config/config';
import { geocodeAddress } from '../utils/geocoding';

// Public endpoints
export const getProperties = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const query: any = {};
    
    // Sanitize and validate query parameters
    if (req.query.propertyType && ['Residential', 'Commercial', 'PG Hostel'].includes(req.query.propertyType as string)) {
      query.property_type = req.query.propertyType;
    }
    if (req.query.listingType && ['Rent', 'Sell'].includes(req.query.listingType as string)) {
      query.listing_type = req.query.listingType;
    }
    if (req.query.city) {
      query['address.city'] = new RegExp(req.query.city as string, 'i');
    }
    
    // Additional filters
    if (req.query.bhk) {
      query.bhk = parseInt(req.query.bhk as string);
    }
    if (req.query.bedrooms) {
      query.bedrooms = parseInt(req.query.bedrooms as string);
    }
    if (req.query.bathrooms) {
      query.bathrooms = parseInt(req.query.bathrooms as string);
    }
    if (req.query.building_type && ['Apartment', 'Villa', 'Independent House', 'Pent House', 'Plot'].includes(req.query.building_type as string)) {
      query.building_type = req.query.building_type;
    }
    if (req.query.furnishing && ['Full', 'Semi', 'None'].includes(req.query.furnishing as string)) {
      query.furnishing = req.query.furnishing;
    }
    if (req.query.parking && ['Public', 'Reserved', 'Covered'].includes(req.query.parking as string)) {
      query.parking = req.query.parking;
    }
    if (req.query.status && ['Available', 'Sold'].includes(req.query.status as string)) {
      query.status = req.query.status;
    }

    // Validate price filters for both rent and sell
    const minPrice = Number(req.query.minPrice);
    const maxPrice = Number(req.query.maxPrice);
    if (!isNaN(minPrice) || !isNaN(maxPrice)) {
      query.$or = [
        { 'price.rent_monthly': { $gte: minPrice || 0, $lte: maxPrice || Number.MAX_SAFE_INTEGER } },
        { 'price.sell_price': { $gte: minPrice || 0, $lte: maxPrice || Number.MAX_SAFE_INTEGER } }
      ];
    }

    // Use native MongoDB to avoid model validation
    const db = mongoose.connection.db;
    const propertiesCollection = db.collection('properties');
    const total = await propertiesCollection.countDocuments(query);
    
    // Get sort order from query (default: newest first)
    const sortBy = req.query.sortBy as string || '-createdAt';
    
    const sortDirection = sortBy.startsWith('-') ? -1 : 1;
    const sortField = sortBy.replace(/^-/, '');
    const properties = await propertiesCollection.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ [sortField]: sortDirection })
      .toArray();
    
    // Populate added_by if needed (simplified - just return user ID for now)
    // Note: Native driver doesn't have populate, you'd need to manually join

    res.json({
      properties,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching properties:', error);
    res.status(500).json({ message: 'Error fetching properties' });
  }
};

export const getPropertyById = async (req: Request, res: Response) => {
  try {
    const db = mongoose.connection.db;
    const propertiesCollection = db.collection('properties');
    const property = await propertiesCollection.findOne({ _id: new mongoose.Types.ObjectId(req.params.id) });
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    // Clean up invalid photo URLs before returning
    if (property.photos && Array.isArray(property.photos)) {
      const originalCount = property.photos.length;
      const cleanedPhotos = cleanPhotoUrls(property.photos);
      if (cleanedPhotos.length !== originalCount) {
        // Update the property in database if photos were cleaned
        await propertiesCollection.updateOne(
          { _id: new mongoose.Types.ObjectId(req.params.id) },
          { $set: { photos: cleanedPhotos } }
        );
        property.photos = cleanedPhotos;
        logger.info('Cleaned invalid photo URLs from property:', {
          propertyId: req.params.id,
          originalCount: originalCount,
          cleanedCount: cleanedPhotos.length
        });
      }
    }
    
    res.json(property);
  } catch (error) {
    logger.error('Error fetching property:', error);
    res.status(500).json({ message: 'Error fetching property' });
  }
};

// Helper function to upload to Cloudinary
const uploadToCloudinary = async (file: Express.Multer.File, propertyName: string, index: number) => {
  try {
    // Convert buffer to base64
    const b64 = Buffer.from(file.buffer).toString('base64');
    const dataURI = `data:${file.mimetype};base64,${b64}`;
    
    // Generate filename based on property name
    const sanitizedName = propertyName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const filename = `${sanitizedName}-${index + 1}`;
    
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'properties',
      public_id: filename,
      resource_type: 'auto'
    });
    
    return result.secure_url;
  } catch (error) {
    logger.error('Error uploading to Cloudinary:', error);
    throw new Error('Failed to upload image');
  }
};

// Helper function to validate photo URL
const isValidPhotoUrl = (url: any): boolean => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return false;
  // Check if it's a valid URL (http/https)
  try {
    const urlObj = new URL(trimmed);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

// Helper function to filter and clean photo URLs array
const cleanPhotoUrls = (urls: any[]): string[] => {
  if (!Array.isArray(urls)) return [];
  return urls
    .filter(url => isValidPhotoUrl(url))
    .map(url => url.trim())
    .filter((url, index, self) => self.indexOf(url) === index); // Remove duplicates
};

// Helper function to delete photo from Cloudinary
const deletePhotoFromCloudinary = async (photoUrl: string) => {
  try {
    if (!photoUrl || typeof photoUrl !== 'string') {
      logger.warn('Invalid photo URL provided for deletion:', photoUrl);
      return null;
    }

    // Normalize URL (remove query parameters, handle http/https)
    const normalizedUrl = photoUrl.split('?')[0].trim();
    
    // Extract public_id from Cloudinary URL
    // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{folder}/{public_id}.{format}
    // Or: https://res.cloudinary.com/{cloud_name}/image/upload/{folder}/{public_id}.{format}
    
    // Find the index of 'upload' in the URL
    const uploadIndex = normalizedUrl.indexOf('/upload/');
    if (uploadIndex === -1) {
      logger.warn('Invalid Cloudinary URL format (no /upload/ found):', normalizedUrl);
      return null;
    }
    
    // Get the part after /upload/
    const pathAfterUpload = normalizedUrl.substring(uploadIndex + '/upload/'.length);
    
    // Remove version if present (format: v1234567890/)
    const pathWithoutVersion = pathAfterUpload.replace(/^v\d+\//, '');
    
    // Remove file extension
    const publicIdWithFolder = pathWithoutVersion.replace(/\.[^/.]+$/, '');
    
    if (!publicIdWithFolder) {
      logger.warn('Could not extract public_id from URL:', normalizedUrl);
      return null;
    }
    
    logger.info('Attempting to delete from Cloudinary:', { 
      photoUrl: normalizedUrl, 
      publicId: publicIdWithFolder 
    });
    
    const result = await cloudinary.uploader.destroy(publicIdWithFolder);
    
    // Check if deletion was successful
    if (result.result === 'ok' || result.result === 'not found') {
      logger.info('Successfully deleted photo from Cloudinary:', { 
        photoUrl: normalizedUrl, 
        publicId: publicIdWithFolder, 
        result: result.result 
      });
    } else {
      logger.warn('Cloudinary deletion returned unexpected result:', { 
        photoUrl: normalizedUrl, 
        publicId: publicIdWithFolder, 
        result 
      });
    }
    
    return result;
  } catch (error: any) {
    logger.error('Error deleting photo from Cloudinary:', { 
      photoUrl, 
      error: error?.message || error,
      stack: error?.stack 
    });
    // Don't throw - continue even if deletion fails
    return null;
  }
};

// Admin endpoints
export const addProperty = async (req: AuthRequest, res: Response) => {
  try {
    logger.info('addProperty called with body:', req.body);
    
    // NO VALIDATION - Everything is optional, just POST what you have

    // Upload photos to Cloudinary
    const photoUrls = [];
    logger.info('Checking for files:', { 
      hasFiles: !!req.files, 
      filesType: req.files ? typeof req.files : 'none',
      isArray: Array.isArray(req.files),
      fileCount: req.files ? (Array.isArray(req.files) ? req.files.length : Object.keys(req.files).length) : 0
    });
    
    if (req.files) {
      const filesArray = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
      if (filesArray.length > 0) {
        const propertyName = req.body.name || 'property'; // Use 'property' as default if name not provided
        logger.info(`Uploading ${filesArray.length} files to Cloudinary`);
        const uploadPromises = (filesArray as Express.Multer.File[]).map(
          (file, index) => uploadToCloudinary(file, propertyName, index)
        );
        const uploadedUrls = await Promise.all(uploadPromises);
        photoUrls.push(...uploadedUrls);
        logger.info(`Successfully uploaded ${uploadedUrls.length} images to Cloudinary:`, uploadedUrls);
      }
    }

    // Build property object - only include fields that are provided
    const propertyData: any = {};
    
    if (req.body.name) propertyData.name = req.body.name;
    if (req.body.description) propertyData.description = req.body.description;
    if (req.body.property_type) propertyData.type = req.body.property_type;
    if (req.body.size) propertyData.size = req.body.size;
    if (req.body.furnishing) propertyData.furnishing = req.body.furnishing;
    if (req.body.availability) propertyData.availability = req.body.availability;
    if (req.body.building_type) propertyData.building_type = req.body.building_type;
    if (req.body.bhk) propertyData.bhk = req.body.bhk;
    if (req.body.bathrooms) propertyData.bathrooms = req.body.bathrooms;
    if (req.body.bedrooms) propertyData.bedrooms = req.body.bedrooms;
    if (req.body.listing_type) propertyData.listing_type = req.body.listing_type;
    if (req.body.parking) propertyData.parking = req.body.parking;
    if (req.body.property_type) propertyData.property_type = req.body.property_type;
    if (req.body.location) propertyData.location = req.body.location;
    if (req.body.price) propertyData.price = req.body.price;
    if (req.body.amenities) propertyData.amenities = req.body.amenities;
    if (req.body.status) propertyData.status = req.body.status;
    if (req.body.society) propertyData.society = req.body.society;
    if (req.body.zipcode) propertyData.zipcode = req.body.zipcode;
    if (req.body.pets_allowed !== undefined) propertyData.pets_allowed = req.body.pets_allowed;
    if (req.body.location_coordinates) propertyData.location_coordinates = req.body.location_coordinates;
    if (req.body.address) propertyData.address = req.body.address;
    
    // Auto-geocode address if coordinates are not provided but address is available
    if (!propertyData.location_coordinates && (propertyData.address || propertyData.location)) {
      try {
        const geocodeResult = await geocodeAddress(
          propertyData.address || {},
          propertyData.location
        );
        if (geocodeResult) {
          propertyData.location_coordinates = {
            latitude: geocodeResult.latitude,
            longitude: geocodeResult.longitude
          };
          logger.info('Auto-geocoded address:', geocodeResult);
        }
      } catch (error) {
        logger.warn('Failed to auto-geocode address (frontend can handle this):', error);
        // Don't fail property creation if geocoding fails
      }
    }
    
    // Always include photos if uploaded
    if (photoUrls.length > 0) {
      propertyData.photos = photoUrls;
      logger.info('Photos added to propertyData:', photoUrls);
    }
    if (req.userId) {
      propertyData.added_by = req.userId;
      propertyData.createdBy = req.userId;
      propertyData.updatedBy = req.userId;
    }

    // Generate property_id if not provided
    if (!propertyData.property_id) {
      const date = new Date();
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const crypto = require('crypto');
      const randomString = crypto.randomBytes(3).toString('hex').toUpperCase();
      propertyData.property_id = `PROP-${year}-${month}${day}-${randomString}`;
    }

    // Use native MongoDB driver to completely bypass Mongoose validation
    const db = mongoose.connection.db;
    const propertiesCollection = db.collection('properties');
    
    const insertData = {
      ...propertyData,
      status: propertyData.status || 'Available',
      pets_allowed: propertyData.pets_allowed !== undefined ? propertyData.pets_allowed : false,
      photos: photoUrls.length > 0 ? photoUrls : propertyData.photos || [], // Ensure photos array is included
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    logger.info('Inserting property data:', { 
      hasPhotos: !!insertData.photos, 
      photoCount: insertData.photos?.length || 0,
      photoUrls: insertData.photos 
    });
    
    const result = await propertiesCollection.insertOne(insertData);
    
    // Return the inserted document
    const property = await propertiesCollection.findOne({ _id: result.insertedId });
    logger.info('Property retrieved from DB:', { 
      hasPhotos: !!property?.photos, 
      photoCount: property?.photos?.length || 0 
    });
    
    logger.info('Property added successfully (bypassed validation)', { propertyId: property?._id });
    res.status(201).json({
      message: "property added", 
      property_details: property
    });
  } catch (error:any) {
    // Log full error details for debugging
    logger.error('Error adding property:', { 
      error: error.message, 
      stack: error.stack,
      name: error.name,
      errors: error.errors,
      body: req.body 
    });
    
    // Return error message with details for debugging
    return res.status(500).json({ 
      message: 'Error adding property',
      error: error.message,
      details: error.errors || error.stack
    });
  }
};

export const updateProperty = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    logger.info('Update property request received:', {
      propertyId: id,
      bodyKeys: Object.keys(req.body),
      bodySample: Object.keys(req.body).reduce((acc: any, key) => {
        const value = req.body[key];
        if (Array.isArray(value)) {
          acc[key] = `[Array(${value.length})]`;
        } else if (typeof value === 'string' && value.length > 100) {
          acc[key] = value.substring(0, 100) + '...';
        } else {
          acc[key] = value;
        }
        return acc;
      }, {}),
      hasFiles: !!req.files,
      fileCount: req.files && Array.isArray(req.files) ? req.files.length : 0,
      filesType: req.files ? (Array.isArray(req.files) ? 'array' : typeof req.files) : 'none'
    });

    // Fetch existing property first
    const existingProperty = await Property.findById(id);
    if (!existingProperty) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Helper function to parse FormData values
    const parseValue = (value: any, fieldName: string): any => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }
      
      // Handle arrays (amenities, existingPhotos, etc.)
      if (Array.isArray(value)) {
        return value.filter(v => v !== '' && v !== null && v !== undefined);
      }
      
      // Handle string arrays from FormData (existingPhotos[] format)
      if (typeof value === 'string' && fieldName.includes('[]')) {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed.filter(v => v !== '' && v !== null && v !== undefined) : [parsed];
        } catch {
          return [value].filter(v => v !== '' && v !== null && v !== undefined);
        }
      }
      
      // Handle numbers
      const numberFields = ['size', 'bhk', 'bathrooms', 'bedrooms'];
      if (numberFields.includes(fieldName)) {
        const num = Number(value);
        return isNaN(num) ? undefined : num;
      }
      
      // Handle booleans
      if (fieldName === 'pets_allowed') {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1';
        }
        return Boolean(value);
      }
      
      // Handle nested price object
      if (fieldName.startsWith('price[')) {
        const num = Number(value);
        return isNaN(num) ? undefined : num;
      }
      
      return value;
    };

    // Parse FormData body - handle nested objects and arrays
    const parsedBody: any = {};
    
    // Handle existingPhotos array (can come as existingPhotos[] or existingPhotos)
    // Multer/express may parse arrays differently, so check all possible formats
    let existingPhotosArray: string[] = [];
    
    // Check for existingPhotos[] (array format from FormData)
    if (req.body['existingPhotos[]']) {
      const arr = Array.isArray(req.body['existingPhotos[]']) 
        ? req.body['existingPhotos[]'] 
        : [req.body['existingPhotos[]']];
      existingPhotosArray = cleanPhotoUrls(arr);
      logger.info('Found existingPhotos[]:', { count: existingPhotosArray.length });
    }
    
    // Check for existingPhotos (single value or array)
    if (req.body.existingPhotos) {
      if (Array.isArray(req.body.existingPhotos)) {
        const arr = cleanPhotoUrls(req.body.existingPhotos);
        if (arr.length > 0) {
          existingPhotosArray = arr;
          logger.info('Found existingPhotos (array):', { count: existingPhotosArray.length });
        }
      } else if (typeof req.body.existingPhotos === 'string') {
        try {
          const parsed = JSON.parse(req.body.existingPhotos);
          if (Array.isArray(parsed)) {
            existingPhotosArray = cleanPhotoUrls(parsed);
            logger.info('Found existingPhotos (JSON array):', { count: existingPhotosArray.length });
          } else {
            const cleaned = cleanPhotoUrls([req.body.existingPhotos]);
            if (cleaned.length > 0) {
              existingPhotosArray = cleaned;
              logger.info('Found existingPhotos (single string):', { count: 1 });
            }
          }
        } catch {
          const cleaned = cleanPhotoUrls([req.body.existingPhotos]);
          if (cleaned.length > 0) {
            existingPhotosArray = cleaned;
            logger.info('Found existingPhotos (single string, not JSON):', { count: 1 });
          }
        }
      }
    }
    
    // Check all body keys for array patterns (multer might parse differently)
    const arrayKeys = Object.keys(req.body).filter(key => 
      key.includes('existingPhotos') || key.includes('existing_photos')
    );
    if (arrayKeys.length > 0 && existingPhotosArray.length === 0) {
      logger.info('Found potential existingPhotos keys:', arrayKeys);
      // Try to collect from all matching keys
      const allPhotos: any[] = [];
      arrayKeys.forEach(key => {
        const value = req.body[key];
        if (Array.isArray(value)) {
          allPhotos.push(...value);
        } else if (typeof value === 'string' && value.trim()) {
          allPhotos.push(value);
        }
      });
      if (allPhotos.length > 0) {
        existingPhotosArray = cleanPhotoUrls(allPhotos);
        logger.info('Collected existingPhotos from all keys:', { count: existingPhotosArray.length });
      }
    }
    
    logger.info('Final existingPhotosArray:', { 
      count: existingPhotosArray.length,
      photos: existingPhotosArray.slice(0, 3) // Log first 3 for debugging
    });

    // Handle price object
    const price: any = {};
    if (req.body['price[rent_monthly]']) {
      const val = parseValue(req.body['price[rent_monthly]'], 'price[rent_monthly]');
      if (val !== undefined) price.rent_monthly = val;
    }
    if (req.body['price[sell_price]']) {
      const val = parseValue(req.body['price[sell_price]'], 'price[sell_price]');
      if (val !== undefined) price.sell_price = val;
    }
    if (req.body['price[deposit]']) {
      const val = parseValue(req.body['price[deposit]'], 'price[deposit]');
      if (val !== undefined) price.deposit = val;
    }
    
    // Handle address object
    const address: any = {};
    if (req.body['address[street]']) address.street = req.body['address[street]'];
    if (req.body['address[city]']) address.city = req.body['address[city]'];
    if (req.body['address[state]']) address.state = req.body['address[state]'];
    if (req.body['address[country]']) address.country = req.body['address[country]'];
    
    // Handle amenities array
    let amenities: string[] = [];
    if (req.body.amenities) {
      if (Array.isArray(req.body.amenities)) {
        amenities = req.body.amenities.filter((a: any) => a && a.trim() !== '');
      } else if (typeof req.body.amenities === 'string') {
        try {
          const parsed = JSON.parse(req.body.amenities);
          amenities = Array.isArray(parsed) ? parsed.filter((a: any) => a && a.trim() !== '') : [parsed];
        } catch {
          amenities = req.body.amenities.trim() ? [req.body.amenities] : [];
        }
      }
    }
    if (req.body['amenities[]']) {
      const arr = Array.isArray(req.body['amenities[]']) ? req.body['amenities[]'] : [req.body['amenities[]']];
      amenities = arr.filter((a: any) => a && a.trim() !== '');
    }

    // Handle location_coordinates
    const location_coordinates: any = {};
    if (req.body['location_coordinates[latitude]']) {
      const lat = Number(req.body['location_coordinates[latitude]']);
      if (!isNaN(lat)) location_coordinates.latitude = lat;
    }
    if (req.body['location_coordinates[longitude]']) {
      const lng = Number(req.body['location_coordinates[longitude]']);
      if (!isNaN(lng)) location_coordinates.longitude = lng;
    }

    // Build update data with proper type conversions
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (req.userId) {
      updateData.updatedBy = req.userId;
    }

    // Add simple fields with type conversion
    const simpleFields = ['name', 'description', 'type', 'location', 'society', 'zipcode', 
                          'furnishing', 'availability', 'building_type', 'listing_type', 
                          'parking', 'property_type', 'status'];
    
    for (const field of simpleFields) {
      if (req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== '') {
        updateData[field] = req.body[field];
      }
    }

    // Add number fields
    const numberFields = ['size', 'bhk', 'bathrooms', 'bedrooms'];
    for (const field of numberFields) {
      if (req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== '') {
        const num = Number(req.body[field]);
        if (!isNaN(num)) updateData[field] = num;
      }
    }

    // Add boolean fields
    if (req.body.pets_allowed !== undefined && req.body.pets_allowed !== null && req.body.pets_allowed !== '') {
      updateData.pets_allowed = parseValue(req.body.pets_allowed, 'pets_allowed');
    }

    // Add nested objects if they have values
    if (Object.keys(price).length > 0) {
      updateData.price = {
        ...existingProperty.price,
        ...price
      };
    }
    
    if (Object.keys(address).length > 0) {
      updateData.address = {
        ...existingProperty.address,
        ...address
      };
    }
    
    if (Object.keys(location_coordinates).length > 0) {
      updateData.location_coordinates = {
        ...existingProperty.location_coordinates,
        ...location_coordinates
      };
    }
    
    if (amenities.length > 0) {
      updateData.amenities = amenities;
    }

    // Handle photo updates
    // First, clean existing photos in database (remove any invalid/empty URLs)
    const existingPhotos = cleanPhotoUrls(existingProperty.photos || []);
    const hasNewPhotos = req.files && Array.isArray(req.files) && req.files.length > 0;
    const hasExistingPhotosParam = existingPhotosArray.length > 0;
    
    // Only process photos if:
    // 1. existingPhotos[] is explicitly sent (user wants to manage photos)
    // 2. OR new photos are being uploaded
    // Otherwise, don't touch photos at all
    if (hasExistingPhotosParam || hasNewPhotos) {
      let finalPhotoUrls: string[] = [];
      
      // Use existingPhotos array if provided, otherwise keep all existing (cleaned)
      if (hasExistingPhotosParam) {
        finalPhotoUrls = existingPhotosArray; // Already cleaned
      } else {
        finalPhotoUrls = [...existingPhotos]; // Already cleaned
      }
      
      logger.info('Photo update processing:', {
        existingPhotosCount: existingPhotos.length,
        photosToKeepCount: finalPhotoUrls.length,
        hasExistingPhotos: hasExistingPhotosParam,
        newFilesCount: hasNewPhotos ? (req.files as Express.Multer.File[]).length : 0
      });
      
      // Upload new photos if provided and append to the list
      if (hasNewPhotos) {
        const uploadPromises = (req.files as Express.Multer.File[]).map(
          (file, index) => uploadToCloudinary(file, existingProperty.name || 'property', Date.now() + index)
        );
        const newPhotoUrls = await Promise.all(uploadPromises);
        // Filter out any failed uploads (null/undefined URLs)
        const validNewUrls = newPhotoUrls.filter((url: string) => isValidPhotoUrl(url));
        finalPhotoUrls = [...finalPhotoUrls, ...validNewUrls];
        logger.info('New photos uploaded:', { 
          newCount: validNewUrls.length,
          failedCount: newPhotoUrls.length - validNewUrls.length
        });
      }
      
      // Helper function to normalize URLs for comparison
      const normalizeUrl = (url: string) => {
        if (!url) return '';
        return url.split('?')[0].trim().replace(/^http:/, 'https:');
      };
      
      // Find photos that were removed (only if existingPhotos was sent)
      if (hasExistingPhotosParam) {
        const normalizedFinalUrls = finalPhotoUrls.map(normalizeUrl);
        const photosToDelete = existingPhotos.filter(photo => {
          if (!isValidPhotoUrl(photo)) return false; // Skip invalid photos
          const normalizedPhoto = normalizeUrl(photo);
          return !normalizedFinalUrls.includes(normalizedPhoto);
        });
        
        // Delete removed photos from Cloudinary
        if (photosToDelete.length > 0) {
          logger.info('Deleting photos from Cloudinary:', { count: photosToDelete.length, photos: photosToDelete });
          const deletionResults = [];
          for (const photo of photosToDelete) {
            const result = await deletePhotoFromCloudinary(photo);
            deletionResults.push({ photo, result });
          }
          logger.info('Photo deletion completed:', { 
            total: photosToDelete.length,
            results: deletionResults.map(r => ({ 
              photo: r.photo, 
              success: r.result?.result === 'ok' || r.result?.result === 'not found' 
            }))
          });
        }
      }
      
      // Final cleanup: remove any invalid URLs and duplicates
      finalPhotoUrls = cleanPhotoUrls(finalPhotoUrls);
      
      // Update photos array (only if we have valid photos)
      if (finalPhotoUrls.length > 0) {
        updateData.photos = finalPhotoUrls;
      } else {
        // If no valid photos, set empty array
        updateData.photos = [];
        logger.info('No valid photos after cleanup - setting empty array');
      }
    } else {
      logger.info('No photo updates - keeping existing photos unchanged');
      // Don't add photos to updateData - MongoDB won't update them
    }

    // Auto-geocode address if coordinates are not provided but address is updated
    if (!updateData.location_coordinates && (updateData.address || req.body.location)) {
      try {
        const geocodeResult = await geocodeAddress(
          updateData.address || existingProperty.address || {},
          req.body.location || existingProperty.location
        );
        if (geocodeResult) {
          updateData.location_coordinates = {
            latitude: geocodeResult.latitude,
            longitude: geocodeResult.longitude
          };
          logger.info('Auto-geocoded address on update:', geocodeResult);
        }
      } catch (error) {
        logger.warn('Failed to auto-geocode address on update:', error);
      }
    }

    // Log what will be updated
    logger.info('Update data prepared:', {
      updateKeys: Object.keys(updateData),
      updateDataSample: Object.keys(updateData).reduce((acc: any, key) => {
        const value = updateData[key];
        if (Array.isArray(value)) {
          acc[key] = `[Array(${value.length})]`;
        } else if (typeof value === 'object' && value !== null) {
          acc[key] = `{${Object.keys(value).join(', ')}}`;
        } else if (typeof value === 'string' && value.length > 50) {
          acc[key] = value.substring(0, 50) + '...';
        } else {
          acc[key] = value;
        }
        return acc;
      }, {})
    });

    // Use native MongoDB update to bypass Mongoose validation issues
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }
    
    const propertiesCollection = db.collection('properties');
    
    // Convert id to ObjectId
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(id);
    } catch (error) {
      logger.error('Invalid property ID format:', { id, error });
      return res.status(400).json({ message: 'Invalid property ID format' });
    }
    
    logger.info('Attempting MongoDB update:', {
      propertyId: id,
      objectId: objectId.toString(),
      updateDataKeys: Object.keys(updateData)
    });
    
    const result = await propertiesCollection.findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result || !result.value) {
      logger.warn('Property not found after update attempt:', { propertyId: id });
      return res.status(404).json({ message: 'Property not found' });
    }

    const updatedProperty = result.value as any;

    logger.info('Property updated successfully', { 
      propertyId: id,
      updatedFields: Object.keys(updateData),
      resultHasPhotos: !!updatedProperty.photos,
      resultPhotoCount: updatedProperty.photos?.length || 0
    });
    
    return res.status(200).json(updatedProperty);
  } catch (error: any) {
    logger.error('Update property error:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      body: req.body
    });
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        error: error.message,
        details: error.errors 
      });
    }
    
    return res.status(500).json({ 
      message: 'Error updating property',
      error: error.message 
    });
  }
};

export const deleteProperty = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const property = await Property.findById({ _id:id });
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Delete images from Cloudinary
    if (property.photos && property.photos.length > 0) {
      for (const photoUrl of property.photos) {
        const publicId = photoUrl.split('/').slice(-1)[0].split('.')[0];
        await cloudinary.uploader.destroy(`properties/${publicId}`);
      }
    }

    // Delete the property
    await Property.deleteOne({ _id:id });

    await session.commitTransaction();
    logger.info('Property deleted successfully', { propertyId: property.property_id });
    return res.status(200).json({ message: 'Property deleted successfully' });
  } catch (error) {
    await session.abortTransaction();
    logger.error('Delete property error:', error);
    return res.status(500).json({ message: 'Error deleting property' });
  } finally {
    session.endSession();
  }
};

export const setDiscount = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { discountedPrice } = req.body;

    const property = await Property.findByIdAndUpdate(
      id,
      { 
        discountedPrice,
        isDiscounted: !!discountedPrice
      },
      { new: true }
    );

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    logger.info('Property discount updated', { propertyId: id });
    return res.status(200).json({ message: 'Discount set successfully' });
  } catch (error) {
    logger.error('Set discount error:', error);
    return res.status(500).json({ message: 'Error setting discount' });
  }
}; 


export const checkPropertyExists = async (req: Request, res: Response, next: NextFunction) => {
  const { property_id } = req.body; // Assuming property_id is sent in the request body

  try {
    const property = await Property.findOne({"property_id": property_id });
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }// Optional: attach the property to the request object
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error('Error checking property existence:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};