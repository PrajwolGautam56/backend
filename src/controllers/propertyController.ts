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
    if (req.query.parking && ['Public', 'Reserved'].includes(req.query.parking as string)) {
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

// Helper function to delete photo from Cloudinary
const deletePhotoFromCloudinary = async (photoUrl: string) => {
  try {
    // Extract public_id from Cloudinary URL
    // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{folder}/{public_id}.{format}
    // Or: https://res.cloudinary.com/{cloud_name}/image/upload/{folder}/{public_id}.{format}
    
    // Find the index of 'upload' in the URL
    const uploadIndex = photoUrl.indexOf('/upload/');
    if (uploadIndex === -1) {
      logger.warn('Invalid Cloudinary URL format:', photoUrl);
      return null;
    }
    
    // Get the part after /upload/
    const pathAfterUpload = photoUrl.substring(uploadIndex + '/upload/'.length);
    
    // Remove version if present (format: v1234567890/)
    const pathWithoutVersion = pathAfterUpload.replace(/^v\d+\//, '');
    
    // Remove file extension
    const publicIdWithFolder = pathWithoutVersion.replace(/\.[^/.]+$/, '');
    
    const result = await cloudinary.uploader.destroy(publicIdWithFolder);
    logger.info('Deleted photo from Cloudinary:', { photoUrl, publicId: publicIdWithFolder, result });
    return result;
  } catch (error) {
    logger.error('Error deleting photo from Cloudinary:', { photoUrl, error });
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

    // Fetch existing property first
    const existingProperty = await Property.findById(id);
    if (!existingProperty) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Handle photo updates:
    // 1. If req.body.photos is provided (array of URLs), use it as the base (allows deletion)
    // 2. Upload new photos from req.files and append them
    // 3. Delete photos from Cloudinary that were removed
    
    const existingPhotos = existingProperty.photos || [];
    let finalPhotoUrls: string[] = [];
    
    // If photos array is provided in body, use it (frontend sends list of photos to keep)
    if (req.body.photos !== undefined) {
      if (Array.isArray(req.body.photos)) {
        finalPhotoUrls = req.body.photos;
      } else if (typeof req.body.photos === 'string') {
        // Handle single photo URL as string
        finalPhotoUrls = [req.body.photos];
      }
    } else {
      // If no photos array in body, keep all existing photos
      finalPhotoUrls = [...existingPhotos];
    }
    
    // Upload new photos if provided and append to the list
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const uploadPromises = (req.files as Express.Multer.File[]).map(
        (file, index) => uploadToCloudinary(file, existingProperty.name || 'property', Date.now() + index)
      );
      const newPhotoUrls = await Promise.all(uploadPromises);
      finalPhotoUrls = [...finalPhotoUrls, ...newPhotoUrls];
      logger.info('New photos uploaded:', { newCount: newPhotoUrls.length });
    }
    
    // Find photos that were removed (in existing but not in final list)
    const photosToDelete = existingPhotos.filter(photo => !finalPhotoUrls.includes(photo));
    
    // Delete removed photos from Cloudinary
    if (photosToDelete.length > 0) {
      logger.info('Deleting photos from Cloudinary:', { count: photosToDelete.length, photos: photosToDelete });
      await Promise.all(photosToDelete.map(photo => deletePhotoFromCloudinary(photo)));
    }
    
    logger.info('Photos updated:', { 
      existingCount: existingPhotos.length, 
      finalCount: finalPhotoUrls.length,
      deletedCount: photosToDelete.length,
      newUploadedCount: req.files && Array.isArray(req.files) ? req.files.length : 0
    });

    // Build update data - exclude photos from req.body to avoid conflicts
    const { photos, ...otherBodyFields } = req.body;
    const updateData: Partial<IProperty> = {
      updatedBy: req.userId,
      updatedAt: new Date(),
      ...otherBodyFields,
      photos: finalPhotoUrls
    };

    // Handle nested address updates
    if (req.body.address) {
      updateData.address = {
        ...existingProperty.address,
        ...req.body.address
      };
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
        logger.warn('Failed to auto-geocode address on update (frontend can handle this):', error);
        // Don't fail property update if geocoding fails
      }
    }

    const property = await Property.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    logger.info('Property updated successfully', { propertyId: id });
    return res.status(200).json(property);
  } catch (error:any) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    logger.error('Update property error:', error);
    return res.status(500).json({ message: 'Error updating property' });
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