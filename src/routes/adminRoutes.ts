import express from 'express';
import * as adminController from '../controllers/adminController';
import { authenticateToken } from '../middleware/auth';
import { isAdmin } from '../middleware/adminAuth';
import { upload } from '../utils/fileUpload';
import User from '../models/User'; 
import { UserRole } from '../interfaces/User';

const router = express.Router();

router.use(authenticateToken, isAdmin);

// Dashboard
router.get('/dashboard/overview', adminController.getDashboardOverview);

// Invoices
router.get('/invoices/next-number', adminController.getNextInvoiceNumber);
router.get('/invoices', adminController.getInvoices);
router.post('/invoices', adminController.createInvoice);

// Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);
router.post('/settings/test-email', adminController.testEmail);
router.post('/settings/test-payment', adminController.testPayment);

// Analytics
router.get('/analytics/revenue', adminController.getRevenueAnalytics);
router.get('/analytics/users', adminController.getUserAnalytics);
router.get('/analytics/properties', adminController.getPropertyAnalytics);
router.get('/analytics/furniture', adminController.getFurnitureAnalytics);
router.get('/analytics/services', adminController.getServiceAnalytics);
router.get('/analytics/rentals', adminController.getRentalAnalytics);

// Properties
router.post('/properties', upload.array('images', 10), adminController.addProperty);
router.put('/properties/:id', upload.array('images', 10), adminController.updateProperty);
router.delete('/properties/:id', adminController.deleteProperty);
router.post('/properties/:id/discount', adminController.setDiscount);

// Route to update user role
router.patch('/update-role/:id', async (req, res) => {
  const { role } = req.body;

  if (!Object.values(UserRole).includes(role)) {
    return res.status(400).json({ message: 'Invalid role value' });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    await user.save();

    return res.status(200).json({
      message: 'User role updated successfully',
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating user role' });
  }
});

export default router; 
