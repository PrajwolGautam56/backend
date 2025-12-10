import { Request, Response } from 'express';
import Contact from '../models/Contact';
import logger from '../utils/logger';
import { AuthRequest } from '../interfaces/Request';
import User from '../models/User';
import mongoose from 'mongoose';

export const contactController = {
  // Create a new contact form submission
  async createContact(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.userId || undefined;

      // If user is logged in, use their email from database (ignore form email)
      let userEmail = req.body.email;
      let userName = req.body.fullname;
      let userPhone = req.body.phonenumber;
      
      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          userEmail = user.email; // Always use logged-in user's email
          userName = user.fullName || userName; // Use user's name if available
          userPhone = user.phoneNumber || userPhone; // Use user's phone if available
        }
      }

      const contactData = {
        fullname: userName,
        email: userEmail, // Use logged-in user's email if available
        phonenumber: userPhone,
        subject: req.body.subject,
        message: req.body.message,
        userId: userId // Include userId if logged in
      };

      const contact = new Contact(contactData);
      await contact.save();

      // Track activity if user is logged in
      if (userId) {
        await User.findByIdAndUpdate(userId, {
          $push: {
            activityLog: {
              action: 'contact_inquiry',
              timestamp: new Date(),
              details: {
                contact_id: contact.contact_id,
                subject: req.body.subject
              }
            }
          }
        });
        logger.info('User activity tracked', { userId, action: 'contact_inquiry' });
      }

      logger.info('Contact form submitted', { 
        contactId: contact.contact_id,
        userId: userId || 'guest'
      });
      res.status(201).json(contact);
    } catch (error) {
      logger.error('Error submitting contact form:', error);
      res.status(500).json({ message: 'Error submitting contact form', error });
    }
  },

  // Get all contact submissions with filters
  async getContacts(req: Request, res: Response) {
    try {
      const { 
        status, 
        email,
        date 
      } = req.query;

      const query: any = {};

      if (status) query.status = status;
      if (email) query.email = email;
      if (date) {
        const searchDate = new Date(date as string);
        query.created_at = {
          $gte: searchDate,
          $lt: new Date(searchDate.getTime() + 24 * 60 * 60 * 1000)
        };
      }

      const contacts = await Contact.find(query)
        .sort({ created_at: -1 });

      res.json(contacts);
    } catch (error) {
      logger.error('Error fetching contacts:', error);
      res.status(500).json({ message: 'Error fetching contacts', error });
    }
  },

  // Get contact by ID
  async getContactById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Try to find by MongoDB _id first, then by contact_id
      let contact = await Contact.findById(id);
      
      // If not found by _id, try by contact_id
      if (!contact) {
        contact = await Contact.findOne({ contact_id: id });
      }

      if (!contact) {
        return res.status(404).json({ 
          message: 'Contact not found',
          contactId: id
        });
      }

      res.json(contact);
    } catch (error) {
      logger.error('Error fetching contact:', error);
      res.status(500).json({ 
        message: 'Error fetching contact',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Update contact status
  async updateContactStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }

      if (!['new', 'read', 'responded'].includes(status)) {
        return res.status(400).json({ 
          message: 'Invalid status',
          validStatuses: ['new', 'read', 'responded']
        });
      }

      // Try to find contact by MongoDB _id first, then by contact_id
      let oldContact = await Contact.findById(id);
      
      // If not found by _id, try by contact_id
      if (!oldContact) {
        oldContact = await Contact.findOne({ contact_id: id });
      }

      if (!oldContact) {
        return res.status(404).json({ 
          message: 'Contact not found',
          contactId: id
        });
      }

      // Update contact status
      const contact = await Contact.findByIdAndUpdate(
        oldContact._id,
        { status },
        { new: true }
      );

      if (!contact) {
        return res.status(404).json({ message: 'Contact not found after update' });
      }

      // Track admin activity
      const authReq = req as AuthRequest;
      if (authReq.userId) {
        await User.findByIdAndUpdate(authReq.userId, {
          $push: {
            activityLog: {
              action: 'update_contact_status',
              timestamp: new Date(),
              details: {
                contact_id: contact.contact_id,
                old_status: oldContact.status,
                new_status: status
              }
            }
          }
        });
      }

      logger.info('Contact status updated', { 
        contactId: contact.contact_id,
        oldStatus: oldContact.status,
        newStatus: status,
        admin: authReq.userId
      });

      res.status(200).json({ 
        success: true,
        message: 'Contact status updated successfully',
        data: contact
      });
    } catch (error) {
      logger.error('Error updating contact status:', error);
      res.status(500).json({ 
        message: 'Error updating contact status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Delete contact
  async deleteContact(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Try to find by MongoDB _id first, then by contact_id
      let contact = await Contact.findById(id);
      
      // If not found by _id, try by contact_id
      if (!contact) {
        contact = await Contact.findOne({ contact_id: id });
      }

      if (!contact) {
        return res.status(404).json({ 
          message: 'Contact not found',
          contactId: id
        });
      }

      // Track admin activity before deletion
      const authReq = req as AuthRequest;
      if (authReq.userId) {
        await User.findByIdAndUpdate(authReq.userId, {
          $push: {
            activityLog: {
              action: 'delete_contact',
              timestamp: new Date(),
              details: {
                contact_id: contact.contact_id,
                subject: contact.subject
              }
            }
          }
        });
      }

      // Delete using _id
      await Contact.findByIdAndDelete(contact._id);

      logger.info('Contact deleted', { 
        contactId: contact.contact_id,
        admin: authReq.userId
      });
      
      res.status(200).json({ 
        success: true,
        message: 'Contact deleted successfully' 
      });
    } catch (error) {
      logger.error('Error deleting contact:', error);
      res.status(500).json({ 
        message: 'Error deleting contact',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}; 