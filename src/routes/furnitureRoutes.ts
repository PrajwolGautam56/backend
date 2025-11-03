import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getFurniture, getFurnitureById, addFurniture, updateFurniture, deleteFurniture, updateFurnitureStatus } from '../controllers/furnitureController';
import propertyUpload from '../middleware/propertyUpload';
import { isAdmin } from '../middleware/adminAuth';

const router = Router();

/**
 * @swagger
 * /api/furniture:
 *   get:
 *     summary: Get all furniture items
 *     tags: [Furniture]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [Furniture, Appliance, Electronic, Decoration, Kitchenware]
 *       - in: query
 *         name: listingType
 *         schema:
 *           type: string
 *           enum: [Rent, Sell, Rent & Sell]
 *       - in: query
 *         name: condition
 *         schema:
 *           type: string
 *           enum: [New, Like New, Good, Fair, Needs Repair]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Available, Rented, Sold]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of furniture items
 */
router.get('/', getFurniture);

/**
 * @swagger
 * /api/furniture/{id}:
 *   get:
 *     summary: Get furniture by ID
 *     tags: [Furniture]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Furniture details
 */
router.get('/:id', getFurnitureById);

/**
 * @swagger
 * /api/furniture:
 *   post:
 *     summary: Create a new furniture item (Admin only)
 *     tags: [Furniture]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [Furniture, Appliance, Electronic, Decoration, Kitchenware]
 *               item_type:
 *                 type: string
 *               brand:
 *                 type: string
 *               condition:
 *                 type: string
 *                 enum: [New, Like New, Good, Fair, Needs Repair]
 *               listing_type:
 *                 type: string
 *                 enum: [Rent, Sell, Rent & Sell]
 *               price:
 *                 type: object
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Furniture created
 */
router.post('/', authenticateToken, isAdmin, propertyUpload.array('photos', 10), addFurniture);

/**
 * @swagger
 * /api/furniture/{id}:
 *   put:
 *     summary: Update furniture (Admin only)
 *     tags: [Furniture]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Furniture updated
 */
router.put('/:id', authenticateToken, isAdmin, propertyUpload.array('photos', 10), updateFurniture);

/**
 * @swagger
 * /api/furniture/{id}:
 *   delete:
 *     summary: Delete furniture (Admin only)
 *     tags: [Furniture]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Furniture deleted
 */
router.delete('/:id', authenticateToken, isAdmin, deleteFurniture);

/**
 * @swagger
 * /api/furniture/{id}/status:
 *   patch:
 *     summary: Update furniture status (Admin only)
 *     tags: [Furniture]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Available, Rented, Sold]
 *               availability:
 *                 type: string
 *                 enum: [Available, Rented, Sold]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', authenticateToken, isAdmin, updateFurnitureStatus);

export default router;

