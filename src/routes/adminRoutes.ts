import express from 'express';
import * as adminController from '../controllers/adminController';
import { authenticateToken } from '../middleware/auth';
import { isAdmin } from '../middleware/adminAuth';
import { upload } from '../utils/fileUpload';
import User from '../models/User'; 

const router = express.Router();

router.use(authenticateToken, isAdmin);

router.post('/properties', upload.array('images', 10), adminController.addProperty);
router.put('/properties/:id', upload.array('images', 10), adminController.updateProperty);
router.delete('/properties/:id', adminController.deleteProperty);
router.post('/properties/:id/discount', adminController.setDiscount);

// Route to check if the user is an admin


// Route to update user role
router.patch('/update-role/:id', authenticateToken, async (req, res) => {
  const { role } = req.body;

  // Check if the user is an admin
  if (req.user && req.user.role === 'admin') {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update user role
      user.role = role;
      await user.save();

      return res.status(200).json({ message: 'User role updated successfully', user });
    } catch (error) {
      return res.status(500).json({ message: 'Error updating user role', error });
    }
  } else {
    return res.status(403).json({ message: 'Access denied' });
  }
});

export default router; 