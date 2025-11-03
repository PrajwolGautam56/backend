import { Request, Response } from 'express';
import Property from '../models/Property';
import { AuthRequest } from '../interfaces/Request';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';

export const addProperty = async (req: AuthRequest, res: Response) => {
  try {
    const propertyData = req.body;
    const images = (req.files as Express.Multer.File[])?.map(file => file.filename) || [];

    const property = new Property({
      ...propertyData,
      images,
      createdBy: req.userId,
      updatedBy: req.userId
    });

    await property.save();
    logger.info('Property added successfully', { propertyId: property._id });
    res.status(201).json(property);
  } catch (error) {
    logger.error('Error adding property:', error);
    res.status(500).json({ message: 'Error adding property' });
  }
};

export const updateProperty = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const images = (req.files as Express.Multer.File[])?.map(file => file.filename);

    if (images?.length) {
      updateData.images = images;
    }

    const property = await Property.findByIdAndUpdate(
      id,
      { 
        ...updateData,
        updatedBy: req.userId 
      },
      { new: true }
    );

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    logger.info('Property updated successfully', { propertyId: id });
    return res.status(200).json(property);
  } catch (error) {
    logger.error('Update property error:', error);
    return res.status(500).json({ message: 'Error updating property' });
  }
};

export const deleteProperty = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const property = await Property.findByIdAndDelete(id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Delete property images
    if (property.photos && property.photos.length) {
      property.photos.forEach((photo: string) => {
        const imagePath = path.join(__dirname, '../../uploads/properties', photo);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });
    }

    logger.info('Property deleted successfully', { propertyId: id });
    return res.status(200).json({ message: 'Property deleted successfully' });
  } catch (error) {
    logger.error('Delete property error:', error);
    return res.status(500).json({ message: 'Error deleting property' });
  }
};

export const setDiscount = async (req: Request, res: Response) => {
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