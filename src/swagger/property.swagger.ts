/**
 * @swagger
 * components:
 *   schemas:
 *     Property:
 *       type: object
 *       required:
 *         - title
 *         - propertyType
 *         - listingType
 *         - price.amount
 *         - contact.name
 *         - contact.phone
 *         - contact.userType
 *       properties:
 *         code:
 *           type: string
 *           description: Society/Complex code
 *         title:
 *           type: string
 *           description: Property title
 *         propertyType:
 *           type: string
 *           enum: [residential, commercial, pg]
 *         listingType:
 *           type: string
 *           enum: [sale, rent]
 *         location:
 *           type: object
 *           properties:
 *             address:
 *               type: string
 *             locality:
 *               type: string
 *             city:
 *               type: string
 *             pinCode:
 *               type: string
 *         price:
 *           type: object
 *           required:
 *             - amount
 *           properties:
 *             amount:
 *               type: number
 *             securityDeposit:
 *               type: number
 *             isNegotiable:
 *               type: boolean
 *         area:
 *           type: object
 *           properties:
 *             totalArea:
 *               type: number
 *             unitOfMeasurement:
 *               type: string
 *               enum: [sqft, sqm]
 *         details:
 *           type: object
 *           properties:
 *             bedrooms:
 *               type: number
 *             bathrooms:
 *               type: number
 *             balconies:
 *               type: number
 *             totalFloors:
 *               type: number
 *             floorNumber:
 *               type: number
 *             ageOfProperty:
 *               type: number
 *             furnishingStatus:
 *               type: string
 *               enum: [unfurnished, semifurnished, furnished]
 *         description:
 *           type: string
 *         amenities:
 *           type: array
 *           items:
 *             type: string
 *         images:
 *           type: array
 *           items:
 *             type: string
 *         floorPlan:
 *           type: string
 *         status:
 *           type: string
 *           enum: [available, underContract, sold, rented]
 *         contact:
 *           type: object
 *           required:
 *             - name
 *             - phone
 *             - userType
 *           properties:
 *             name:
 *               type: string
 *             email:
 *               type: string
 *             phone:
 *               type: string
 *             userType:
 *               type: string
 *               enum: [owner, agent]
 *         commercial:
 *           type: object
 *           properties:
 *             buildingType:
 *               type: string
 *               enum: [office, retail, warehouse, industrial]
 *             floorPlanType:
 *               type: string
 *               enum: [open, partitioned, mixed]
 *         pg:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [men, women, coLiving]
 *             roomType:
 *               type: string
 *               enum: [shared, private]
 *             availableBeds:
 *               type: number
 *             foodIncluded:
 *               type: boolean
 *             mealTypes:
 *               type: array
 *               items:
 *                 type: string
 *             rules:
 *               type: array
 *               items:
 *                 type: string
 *         expiryDate:
 *           type: string
 *           format: date-time
 *         isPremiumListing:
 *           type: boolean
 */

/**
 * @swagger
 * /api/properties:
 *   post:
 *     summary: Create a new property listing
 *     tags: [Properties]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Property'
 *     responses:
 *       201:
 *         description: Property created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Property'
 *   get:
 *     summary: Get all property listings
 *     tags: [Properties]
 *     parameters:
 *       - in: query
 *         name: propertyType
 *         schema:
 *           type: string
 *         description: Filter by property type
 *       - in: query
 *         name: listingType
 *         schema:
 *           type: string
 *         description: Filter by listing type
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price
 *     responses:
 *       200:
 *         description: List of properties
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Property'
 */ 