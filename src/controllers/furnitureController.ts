import { NextFunction, Request, Response } from 'express';
import Furniture from '../models/Furniture';
import { AuthRequest } from '../interfaces/Request';
import { IFurniture } from '../interfaces/Furniture';
import logger from '../utils/logger';
import mongoose from 'mongoose';
import cloudinary from '../utils/cloudinary';

// Public endpoints
export const getFurniture = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const query: any = {};
    
    // Sanitize and validate query parameters
    if (req.query.category && ['Furniture', 'Appliance', 'Electronic', 'Decoration', 'Kitchenware'].includes(req.query.category as string)) {
      query.category = req.query.category;
    }
    if (req.query.listingType && ['Rent', 'Sell', 'Rent & Sell'].includes(req.query.listingType as string)) {
      const listingType = req.query.listingType as string;
      // If filtering for "Rent", include both "Rent" and "Rent & Sell" items
      if (listingType === 'Rent') {
        query.listing_type = { $in: ['Rent', 'Rent & Sell'] };
      }
      // If filtering for "Sell", include both "Sell" and "Rent & Sell" items
      else if (listingType === 'Sell') {
        query.listing_type = { $in: ['Sell', 'Rent & Sell'] };
      }
      // If filtering for "Rent & Sell", exact match
      else {
        query.listing_type = listingType;
      }
    }
    if (req.query.condition && ['New', 'Like New', 'Good', 'Fair', 'Needs Repair'].includes(req.query.condition as string)) {
      query.condition = req.query.condition;
    }
    if (req.query.status && ['Available', 'Rented', 'Sold'].includes(req.query.status as string)) {
      query.status = req.query.status;
    }
    if (req.query.city) {
      query['address.city'] = new RegExp(req.query.city as string, 'i');
    }
    if (req.query.brand) {
      query.brand = new RegExp(req.query.brand as string, 'i');
    }
    
    // Validate numeric filters
    const minPrice = Number(req.query.minPrice);
    const maxPrice = Number(req.query.maxPrice);
    if (!isNaN(minPrice) || !isNaN(maxPrice)) {
      query.$or = [
        { 'price.rent_monthly': { $gte: minPrice, $lte: maxPrice } },
        { 'price.sell_price': { $gte: minPrice, $lte: maxPrice } }
      ];
    }

    const total = await Furniture.countDocuments(query);
    const furniture = await Furniture.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-__v')
      .populate('added_by', 'fullName username email phoneNumber')
      .lean();

    res.json({
      furniture,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching furniture:', error);
    res.status(500).json({ message: 'Error fetching furniture' });
  }
};

export const getFurnitureById = async (req: Request, res: Response) => {
  try {
    const furniture = await Furniture.findById(req.params.id)
      .populate('added_by', 'fullName username email phoneNumber');
    if (!furniture) {
      return res.status(404).json({ message: 'Furniture item not found' });
    }
    res.json(furniture);
  } catch (error) {
    logger.error('Error fetching furniture:', error);
    res.status(500).json({ message: 'Error fetching furniture' });
  }
};

// Helper function to parse features field (handles string, array, or JSON string)
const parseFeatures = (features: any): string[] => {
  if (!features) return [];
  
  // If already an array, return it (clean it up)
  if (Array.isArray(features)) {
    return features
      .map(f => {
        // If element is a string, use it; if it's an array, extract strings from it
        if (typeof f === 'string') return f.trim();
        if (Array.isArray(f)) return f.filter(item => typeof item === 'string').map(item => item.trim()).join(', ');
        return String(f).trim();
      })
      .filter(f => f.length > 0);
  }
  
  // If it's a string, try to parse it
  if (typeof features === 'string') {
    // Try parsing as JSON (may be double-encoded)
    let parsed: any = features;
    let maxAttempts = 5; // Prevent infinite loops
    while (maxAttempts > 0 && typeof parsed === 'string') {
      try {
        const attempt = JSON.parse(parsed);
        if (Array.isArray(attempt)) {
          parsed = attempt;
          break;
        } else if (typeof attempt === 'string') {
          parsed = attempt;
          maxAttempts--;
        } else {
          break;
        }
      } catch (e) {
        // Not JSON, treat as comma-separated string
        break;
      }
    }
    
    // If we ended up with an array, process it
    if (Array.isArray(parsed)) {
      return parsed
        .map(f => {
          if (typeof f === 'string') return f.trim();
          if (Array.isArray(f)) return f.filter(item => typeof item === 'string').map(item => item.trim()).join(', ');
          return String(f).trim();
        })
        .filter(f => f.length > 0);
    }
    
    // If still a string, treat as comma-separated
    if (typeof parsed === 'string') {
      return parsed.split(',').map(f => f.trim()).filter(f => f.length > 0);
    }
  }
  
  return [];
};

// Helper function to upload to Cloudinary
const uploadToCloudinary = async (file: Express.Multer.File, itemName: string, index: number) => {
  try {
    const b64 = Buffer.from(file.buffer).toString('base64');
    const dataURI = `data:${file.mimetype};base64,${b64}`;
    
    const sanitizedName = itemName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const filename = `${sanitizedName}-${index + 1}`;
    
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'furniture',
      public_id: filename,
      resource_type: 'auto'
    });
    
    return result.secure_url;
  } catch (error) {
    logger.error('Error uploading to Cloudinary:', error);
    throw new Error('Failed to upload image');
  }
};

// Admin endpoints
export const addFurniture = async (req: AuthRequest, res: Response) => {
  try {
    // Validate price structure based on listing_type
    if (req.body.listing_type === 'Rent' && !req.body.price?.rent_monthly) {
      return res.status(400).json({ message: 'Rent amount is required for rental items' });
    }
    if (req.body.listing_type === 'Sell' && !req.body.price?.sell_price) {
      return res.status(400).json({ message: 'Selling price is required for sale items' });
    }

    // Upload photos to Cloudinary
    const photoUrls = [];
    if (req.files && Array.isArray(req.files)) {
      const uploadPromises = (req.files as Express.Multer.File[]).map(
        (file, index) => uploadToCloudinary(file, req.body.name, index)
      );
      photoUrls.push(...await Promise.all(uploadPromises));
    }

    const furniture = new Furniture({
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      item_type: req.body.item_type,
      brand: req.body.brand,
      condition: req.body.condition,
      listing_type: req.body.listing_type,
      price: req.body.price,
      photos: photoUrls,
      features: parseFeatures(req.body.features),
      dimensions: req.body.dimensions,
      location: req.body.location,
      delivery_available: req.body.delivery_available || false,
      delivery_charge: req.body.delivery_charge,
      age_years: req.body.age_years,
      warranty: req.body.warranty || false,
      warranty_months: req.body.warranty_months,
      added_by: req.userId,
      zipcode: req.body.zipcode,
      address: {
        street: req.body.address?.street,
        city: req.body.address?.city,
        state: req.body.address?.state,
        country: req.body.address?.country
      },
      location_coordinates: {
        latitude: req.body.location_coordinates?.latitude,
        longitude: req.body.location_coordinates?.longitude,
      },
      status: req.body.status || 'Available',
      availability: 'Available'
    });

    await furniture.save();
    logger.info('Furniture added successfully', { furnitureId: furniture._id });
    res.status(201).json({ message: "Furniture added successfully", furniture_details: furniture });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    logger.error('Error adding furniture:', error);
    res.status(500).json({ message: 'Error adding furniture' });
  }
};

export const updateFurniture = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingFurniture = await Furniture.findById(id);
    if (!existingFurniture) {
      return res.status(404).json({ message: 'Furniture item not found' });
    }

    // Upload new photos if provided
    let photoUrls = existingFurniture.photos;
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const uploadPromises = (req.files as Express.Multer.File[]).map(
        (file, index) => uploadToCloudinary(file, existingFurniture.name, index)
      );
      photoUrls = await Promise.all(uploadPromises);
    }

    const updateData: Partial<IFurniture> = {
      ...req.body,
      photos: photoUrls
    };

    // Parse features if provided
    if (req.body.features !== undefined) {
      updateData.features = parseFeatures(req.body.features);
    }

    if (req.body.address) {
      updateData.address = {
        ...existingFurniture.address,
        ...req.body.address
      };
    }

    const furniture = await Furniture.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    logger.info('Furniture updated successfully', { furnitureId: id });
    return res.status(200).json(furniture);
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    logger.error('Update furniture error:', error);
    return res.status(500).json({ message: 'Error updating furniture' });
  }
};

export const deleteFurniture = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const furniture = await Furniture.findById(id);
    
    if (!furniture) {
      return res.status(404).json({ message: 'Furniture item not found' });
    }

    // Delete images from Cloudinary
    for (const photoUrl of furniture.photos) {
      const publicId = photoUrl.split('/').slice(-1)[0].split('.')[0];
      await cloudinary.uploader.destroy(`furniture/${publicId}`);
    }

    await Furniture.deleteOne({ _id: id });

    await session.commitTransaction();
    logger.info('Furniture deleted successfully', { furnitureId: furniture.furniture_id });
    return res.status(200).json({ message: 'Furniture deleted successfully' });
  } catch (error) {
    await session.abortTransaction();
    logger.error('Delete furniture error:', error);
    return res.status(500).json({ message: 'Error deleting furniture' });
  } finally {
    session.endSession();
  }
};

export const updateFurnitureStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, availability } = req.body;

    const furniture = await Furniture.findByIdAndUpdate(
      id,
      { 
        status: status || undefined,
        availability: availability || undefined
      },
      { new: true }
    );

    if (!furniture) {
      return res.status(404).json({ message: 'Furniture item not found' });
    }

    logger.info('Furniture status updated', { furnitureId: id });
    return res.status(200).json({ message: 'Status updated successfully', furniture });
  } catch (error) {
    logger.error('Update status error:', error);
    return res.status(500).json({ message: 'Error updating status' });
  }
};

// Update stock for a single furniture item
export const updateFurnitureStock = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { stock, operation = 'set' } = req.body;

    if (stock === undefined || stock < 0) {
      return res.status(400).json({ 
        message: 'Stock must be a non-negative number' 
      });
    }

    const furniture = await Furniture.findById(id);
    if (!furniture) {
      return res.status(404).json({ message: 'Furniture item not found' });
    }

    const previousStock = furniture.stock || 0;
    let newStock: number;

    switch (operation) {
      case 'add':
        newStock = previousStock + stock;
        break;
      case 'subtract':
        newStock = Math.max(0, previousStock - stock);
        break;
      case 'set':
      default:
        newStock = stock;
        break;
    }

    const update: any = {
      stock: newStock
    };

    // Auto-update availability based on stock
    if (newStock <= 0) {
      update.availability = 'Rented';
      update.status = 'Rented';
    } else if (furniture.availability === 'Rented' && newStock > 0) {
      update.availability = 'Available';
      update.status = 'Available';
    }

    const updatedFurniture = await Furniture.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    );

    logger.info('Stock updated', {
      furnitureId: id,
      previousStock,
      newStock,
      operation
    });

    return res.status(200).json({
      message: 'Stock updated successfully',
      furniture: updatedFurniture,
      previous_stock: previousStock,
      new_stock: newStock,
      change: newStock - previousStock
    });
  } catch (error: any) {
    logger.error('Update stock error:', error);
    return res.status(500).json({ 
      message: 'Error updating stock',
      error: error.message 
    });
  }
};

// Get low stock items
export const getLowStockItems = async (req: AuthRequest, res: Response) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 5;
    
    const items = await Furniture.find({
      stock: { $lt: threshold, $gte: 0 }
    }).select('name category stock availability status').lean();

    return res.status(200).json({
      success: true,
      data: items,
      threshold,
      count: items.length
    });
  } catch (error: any) {
    logger.error('Get low stock error:', error);
    return res.status(500).json({ 
      message: 'Error fetching low stock items',
      error: error.message 
    });
  }
};

// Get out of stock items
export const getOutOfStockItems = async (req: AuthRequest, res: Response) => {
  try {
    const items = await Furniture.find({
      $or: [
        { stock: 0 },
        { stock: { $exists: false } }
      ]
    }).select('name category stock availability status').lean();

    return res.status(200).json({
      success: true,
      data: items,
      count: items.length
    });
  } catch (error: any) {
    logger.error('Get out of stock error:', error);
    return res.status(500).json({ 
      message: 'Error fetching out of stock items',
      error: error.message 
    });
  }
};

// Bulk stock update
export const bulkUpdateStock = async (req: AuthRequest, res: Response) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ 
        message: 'Updates array is required' 
      });
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const update of updates) {
      try {
        const { furniture_id, stock, operation = 'set' } = update;
        
        const furniture = await Furniture.findById(furniture_id);
        if (!furniture) {
          results.push({
            furniture_id,
            success: false,
            error: 'Furniture not found'
          });
          failCount++;
          continue;
        }

        const previousStock = furniture.stock || 0;
        let newStock: number;

        switch (operation) {
          case 'add':
            newStock = previousStock + stock;
            break;
          case 'subtract':
            newStock = Math.max(0, previousStock - stock);
            break;
          case 'set':
          default:
            newStock = stock;
            break;
        }

        const updateData: any = { stock: newStock };
        
        if (newStock <= 0) {
          updateData.availability = 'Rented';
          updateData.status = 'Rented';
        } else if (furniture.availability === 'Rented' && newStock > 0) {
          updateData.availability = 'Available';
          updateData.status = 'Available';
        }

        await Furniture.findByIdAndUpdate(furniture_id, { $set: updateData });

        results.push({
          furniture_id,
          success: true,
          previous_stock: previousStock,
          new_stock: newStock,
          change: newStock - previousStock
        });
        successCount++;
      } catch (error: any) {
        results.push({
          furniture_id: update.furniture_id,
          success: false,
          error: error.message
        });
        failCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Bulk stock update completed',
      results,
      total_updated: successCount,
      total_failed: failCount
    });
  } catch (error: any) {
    logger.error('Bulk stock update error:', error);
    return res.status(500).json({ 
      message: 'Error bulk updating stock',
      error: error.message 
    });
  }
};

// Get stock statistics
export const getStockStats = async (req: AuthRequest, res: Response) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 5;
    
    const allFurniture = await Furniture.find({}).lean();
    
    const stats = {
      total_items: allFurniture.length,
      total_stock: allFurniture.reduce((sum: number, item: any) => sum + (item.stock || 0), 0),
      available_items: allFurniture.filter((item: any) => item.availability === 'Available').length,
      low_stock_items: allFurniture.filter((item: any) => (item.stock || 0) < threshold && (item.stock || 0) > 0).length,
      out_of_stock_items: allFurniture.filter((item: any) => (item.stock || 0) === 0).length,
      average_stock: allFurniture.length > 0 
        ? allFurniture.reduce((sum: number, item: any) => sum + (item.stock || 0), 0) / allFurniture.length 
        : 0,
      low_stock_threshold: threshold
    };

    // Group by category
    const byCategory: any = {};
    allFurniture.forEach((item: any) => {
      const category = item.category || 'Other';
      if (!byCategory[category]) {
        byCategory[category] = {
          total: 0,
          total_stock: 0,
          low_stock: 0,
          out_of_stock: 0
        };
      }
      byCategory[category].total++;
      byCategory[category].total_stock += item.stock || 0;
      if ((item.stock || 0) < threshold && (item.stock || 0) > 0) {
        byCategory[category].low_stock++;
      }
      if ((item.stock || 0) === 0) {
        byCategory[category].out_of_stock++;
      }
    });

    return res.status(200).json({
      success: true,
      stats,
      by_category: byCategory
    });
  } catch (error: any) {
    logger.error('Get stock stats error:', error);
    return res.status(500).json({ 
      message: 'Error fetching stock statistics',
      error: error.message 
    });
  }
};

