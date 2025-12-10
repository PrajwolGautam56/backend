/**
 * @swagger
 * components:
 *   schemas:
 *     Service:
 *       type: object
 *       required:
 *         - name
 *         - category
 *         - pricing.type
 *       properties:
 *         name:
 *           type: string
 *         category:
 *           type: string
 *           enum: [furniture, interior, painting, cleaning, plumbing, electrical, moving, ac]
 *         description:
 *           type: string
 *         pricing:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [fixed, estimate, range]
 *             amount:
 *               type: number
 *             minAmount:
 *               type: number
 *             maxAmount:
 *               type: number
 *             unit:
 *               type: string
 *         features:
 *           type: array
 *           items:
 *             type: string
 *         estimateRequired:
 *           type: boolean
 *
 *     ServiceBooking:
 *       type: object
 *       required:
 *         - services
 *         - scheduledDate
 *         - scheduledTimeSlot
 *         - contactDetails
 *       properties:
 *         services:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               service:
 *                 type: string
 *               quantity:
 *                 type: number
 *         property:
 *           type: string
 *         scheduledDate:
 *           type: string
 *           format: date
 *         scheduledTimeSlot:
 *           type: string
 *         notes:
 *           type: string
 *         contactDetails:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             phone:
 *               type: string
 *             email:
 *               type: string
 *             address:
 *               type: string
 */

/**
 * @swagger
 * /api/services:
 *   post:
 *     summary: Create a new service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Service'
 *   get:
 *     summary: Get all services
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *
 * /api/services/book:
 *   post:
 *     summary: Book a service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ServiceBooking'
 */ 