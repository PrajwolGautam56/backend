/**
 * @swagger
 * components:
 *   schemas:
 *     Property:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - price
 *         - location
 *         - type
 *         - area
 *         - bedrooms
 *         - bathrooms
 *       properties:
 *         title:
 *           type: string
 *           description: Property title/name
 *           example: Luxury Apartment in Downtown
 *         description:
 *           type: string
 *           description: Detailed property description
 *         price:
 *           type: number
 *           description: Property price in USD
 *           example: 250000
 *         discountedPrice:
 *           type: number
 *           description: Discounted price (if applicable)
 *         location:
 *           type: object
 *           properties:
 *             address:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             country:
 *               type: string
 *             coordinates:
 *               type: object
 *               properties:
 *                 latitude:
 *                   type: number
 *                 longitude:
 *                   type: number
 *         features:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of property features
 *         type:
 *           type: string
 *           enum: [apartment, house, villa, commercial]
 *         status:
 *           type: string
 *           enum: [available, sold, rented]
 *           default: available
 *         images:
 *           type: array
 *           items:
 *             type: string
 *             format: binary
 *           description: Property images (max 10)
 *         area:
 *           type: number
 *           description: Property area in square feet
 *         bedrooms:
 *           type: number
 *         bathrooms:
 *           type: number
 *         isDiscounted:
 *           type: boolean
 *           default: false
 */

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only endpoints for property management
 */

/**
 * @swagger
 * /api/admin/properties:
 *   post:
 *     summary: Add new property
 *     description: Creates a new property listing (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/Property'
 *     responses:
 *       201:
 *         description: Property created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 * 
 * /api/admin/properties/{id}:
 *   put:
 *     summary: Update property
 *     description: Updates an existing property (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/Property'
 *     responses:
 *       200:
 *         description: Property updated successfully
 *       404:
 *         description: Property not found
 *   delete:
 *     summary: Delete property
 *     description: Deletes a property and its images (Admin only)
 *     tags: [Admin]
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
 *         description: Property deleted successfully
 *       404:
 *         description: Property not found
 * 
 * /api/admin/properties/{id}/discount:
 *   post:
 *     summary: Set property discount
 *     description: Sets a discounted price for a property (Admin only)
 *     tags: [Admin]
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
 *             required:
 *               - discountedPrice
 *             properties:
 *               discountedPrice:
 *                 type: number
 *                 description: New discounted price
 *     responses:
 *       200:
 *         description: Discount set successfully
 *       404:
 *         description: Property not found
 */ 