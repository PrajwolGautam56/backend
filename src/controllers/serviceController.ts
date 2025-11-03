import { Request, Response } from 'express';
import Service from '../models/Service';
import logger from '../utils/logger';

export const serviceController = {
  // Create a new service
  async createService(req: Request, res: Response) {
    try {
      const serviceData = {
        name: req.body.name,
        category: req.body.category,
        description: req.body.description,
        pricing: {
          type: req.body.pricing.type,
          amount: req.body.pricing.amount,
          minAmount: req.body.pricing.minAmount,
          maxAmount: req.body.pricing.maxAmount,
          unit: req.body.pricing.unit
        },
        features: req.body.features,
        images: req.body.images,
        estimateRequired: req.body.estimateRequired
      };

      const service = new Service(serviceData);
      await service.save();

      logger.info('Service created successfully', { serviceId: service._id });
      res.status(201).json(service);
    } catch (error) {
      logger.error('Error creating service:', error);
      res.status(500).json({ message: 'Error creating service', error });
    }
  },

  // Get all services with filters
  async getServices(req: Request, res: Response) {
    try {
      const { 
        category, 
        isAvailable, 
        estimateRequired,
        pricingType 
      } = req.query;

      const query: any = {};

      if (category) {
        query.category = category;
      }
      if (isAvailable !== undefined) {
        query.isAvailable = isAvailable === 'true';
      }
      if (estimateRequired !== undefined) {
        query.estimateRequired = estimateRequired === 'true';
      }
      if (pricingType) {
        query['pricing.type'] = pricingType;
      }

      const services = await Service.find(query)
        .sort({ createdAt: -1 });

      res.json(services);
    } catch (error) {
      logger.error('Error fetching services:', error);
      res.status(500).json({ message: 'Error fetching services', error });
    }
  },

  // Get service by ID
  async getServiceById(req: Request, res: Response) {
    try {
      const service = await Service.findById(req.params.id);
      
      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }

      res.json(service);
    } catch (error) {
      logger.error('Error fetching service:', error);
      res.status(500).json({ message: 'Error fetching service', error });
    }
  },

  // Update service
  async updateService(req: Request, res: Response) {
    try {
      const updateData = {
        name: req.body.name,
        category: req.body.category,
        description: req.body.description,
        pricing: req.body.pricing,
        features: req.body.features,
        images: req.body.images,
        isAvailable: req.body.isAvailable,
        estimateRequired: req.body.estimateRequired
      };

      const service = await Service.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }

      logger.info('Service updated successfully', { serviceId: service._id });
      res.json(service);
    } catch (error) {
      logger.error('Error updating service:', error);
      res.status(500).json({ message: 'Error updating service', error });
    }
  },

  // Delete service
  async deleteService(req: Request, res: Response) {
    try {
      const service = await Service.findByIdAndDelete(req.params.id);

      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }

      logger.info('Service deleted successfully', { serviceId: req.params.id });
      res.json({ message: 'Service deleted successfully' });
    } catch (error) {
      logger.error('Error deleting service:', error);
      res.status(500).json({ message: 'Error deleting service', error });
    }
  },

  // Toggle service availability
  async toggleAvailability(req: Request, res: Response) {
    try {
      const service = await Service.findById(req.params.id);

      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }

      service.isAvailable = !service.isAvailable;
      await service.save();

      logger.info('Service availability toggled', { 
        serviceId: service._id, 
        isAvailable: service.isAvailable 
      });
      res.json(service);
    } catch (error) {
      logger.error('Error toggling service availability:', error);
      res.status(500).json({ message: 'Error toggling service availability', error });
    }
  }
}; 