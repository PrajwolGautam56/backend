import { Router } from 'express';
import { authenticateToken, authenticate as authMiddleware } from '../middleware/auth';
import { getProperties, getPropertyById, addProperty, updateProperty, deleteProperty, setDiscount } from '../controllers/propertyController';
import multer from 'multer';
import path from 'path';
import propertyUpload from '../middleware/propertyUpload';
import { isAdmin } from '../middleware/adminAuth';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/properties'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

const router = Router();

/**
 * @swagger
 * /api/properties:
 *   get:
 *     summary: Get all properties
 *     tags: [Properties]
 *     responses:
 *       200:
 *         description: List of properties
 */
router.get('/', getProperties);

/**
 * @swagger
 * /api/properties/{id}:
 *   get:
 *     summary: Get property by ID
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Property details
 */
router.get('/:id', getPropertyById);

/**
 * @swagger
 * /api/properties:
 *   post:
 *     summary: Create a new property
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - type
 *               - size
 *               - furnishing
 *               - availability
 *               - building_type
 *               - bhk
 *               - bathrooms
 *               - bedrooms
 *               - listing_type
 *               - parking
 *               - property_type
 *               - location
 *               - society
 *               - added_by
 *               - zipcode
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *               size:
 *                 type: number
 *               furnishing:
 *                 type: string
 *                 enum: [Full, Semi, None]
 *               availability:
 *                 type: string
 *                 enum: [Immediate, Within 15 Days, Within 30 Days, After 30 Days]
 *               building_type:
 *                 type: string
 *                 enum: [Apartment, Villa, Independent House, Pent House, Plot]
 *               bhk:
 *                 type: number
 *               bathrooms:
 *                 type: number
 *               bedrooms:
 *                 type: number
 *               listing_type:
 *                 type: string
 *                 enum: [Rent, Sell]
 *               parking:
 *                 type: string
 *                 enum: [Public, Reserved, Covered]
 *               property_type:
 *                 type: string
 *                 enum: [Residential, Commercial, PG Hostel]
 *               location:
 *                 type: string
 *               society:
 *                 type: string
 *               added_by:
 *                 type: string
 *               zipcode:
 *                 type: string
 *                 pattern: ^\d{6}$
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Property created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Property'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', authenticateToken,isAdmin, propertyUpload.array('images', 5), addProperty);

/**
 * @swagger
 * /api/properties/{id}:
 *   put:
 *     summary: Update property (Admin only)
 *     tags: [Properties]
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
 *         description: Property updated
 */
router.put('/:id', authenticateToken,isAdmin, propertyUpload.array('photos', 5), updateProperty);

/**
 * @swagger
 * /api/properties/{id}:
 *   delete:
 *     summary: Delete property (Admin only)
 *     tags: [Properties]
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
 *         description: Property deleted
 */
router.delete('/:id', authenticateToken,isAdmin, deleteProperty);


router.post('/:id/discount', authenticateToken,isAdmin, setDiscount);

export default router; 