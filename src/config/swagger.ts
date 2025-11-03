// src/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BrokerIn API Documentation',
      version: '1.0.0',
      description: `
        # Authentication Guide
        1. First, use the /auth/signin endpoint to get your token
        2. Click the "Authorize" button at the top
        3. Enter your token in the format: Bearer <your_token>
        4. All subsequent requests will automatically include your token
      `
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://your-production-url.com/api' 
          : 'http://localhost:3030/api',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Local server'
      }
    ],
    components: {
      schemas: {
        Property: {
          type: 'object',
          required: [
            'name',
            'description',
            'type',
            'size',
            'furnishing',
            'availability',
            'building_type',
            'bhk',
            'bathrooms',
            'bedrooms',
            'listing_type',
            'parking',
            'property_type',
            'location',
            'society',
            'added_by',
            'zipcode'
          ],
          properties: {
            property_id: {
              type: 'string',
              description: 'Auto-generated unique property ID',
              example: 'PROP-2024-001'
            },
            name: {
              type: 'string',
              description: 'Name of the property',
              example: 'Modern Apartment'
            },
            description: {
              type: 'string',
              description: 'Detailed description of the property',
              example: 'Beautiful modern apartment in city center'
            },
            type: {
              type: 'string',
              description: 'Type of property',
              example: 'Residential'
            },
            size: {
              type: 'number',
              description: 'Size in square feet',
              example: 1800
            },
            furnishing: {
              type: 'string',
              enum: ['Full', 'Semi', 'None'],
              example: 'Semi'
            },
            availability: {
              type: 'string',
              enum: ['Immediate', 'Within 15 Days', 'Within 30 Days', 'After 30 Days'],
              example: 'Immediate'
            },
            building_type: {
              type: 'string',
              enum: ['Apartment', 'Villa', 'Independent House', 'Pent House', 'Plot'],
              example: 'Apartment'
            },
            bhk: {
              type: 'number',
              description: 'Number of BHK',
              example: 2
            },
            bathrooms: {
              type: 'number',
              example: 2
            },
            bedrooms: {
              type: 'number',
              example: 2
            },
            listing_type: {
              type: 'string',
              enum: ['Rent', 'Sell'],
              example: 'Rent'
            },
            parking: {
              type: 'string',
              enum: ['Public', 'Reserved'],
              example: 'Public'
            },
            property_type: {
              type: 'string',
              enum: ['Residential', 'Commercial', 'PG Hostel'],
              example: 'Residential'
            },
            location: {
              type: 'string',
              example: 'Bengaluru'
            },
            price: {
              type: 'object',
              properties: {
                rent_monthly: {
                  type: 'number',
                  example: 25000
                },
                sell_price: {
                  type: 'number',
                  example: 5000000
                },
                deposit: {
                  type: 'number',
                  example: 50000
                }
              }
            },
            zipcode: {
              type: 'string',
              pattern: '^\d{6}$',
              example: '560034'
            },
            pets_allowed: {
              type: 'boolean',
              default: false,
              example: false
            },
            amenities: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['wifi', 'gym', 'parking', 'security']
            },
            status: {
              type: 'string',
              enum: ['Available', 'Sold'],
              default: 'Available',
              example: 'Available'
            }
          }
        }
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./src/routes/*.ts'], // Path to the API routes
};

export const specs = swaggerJsdoc(options);

/**
 * @swagger
 * components:
 *   schemas:
 *     Property:
 *       type: object
 *       required:
 *         - name
 *         - society
 *         - location
 *         - property_type
 *         - listing_type
 *         - bhk
 *         - building_type
 *         - availability
 *         - furnishing
 *         - size
 *         - type
 *         - zipcode
 *       properties:
 *         property_id:
 *           type: string
 *           description: Auto-generated unique property ID
 *           example: PROP-2024-001
 *         name:
 *           type: string
 *           description: Name of the property
 *           example: Modern Apartment
 *         zipcode:
 *           type: string
 *           description: 6-digit Indian postal code
 *           example: "560001"
 *         pets_allowed:
 *           type: boolean
 *           description: Whether pets are allowed in the property
 *           example: false
 *         // ... other existing properties ...
 * 
 * /api/properties:
 *   post:
 *     tags: [Properties]
 *     summary: Create a new property
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
 *               zipcode:
 *                 type: string
 *                 pattern: '^\d{6}$'
 *                 description: 6-digit Indian postal code
 *               pets_allowed:
 *                 type: boolean
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               // ... other properties ...
 *     responses:
 *       201:
 *         description: Property created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Property'
 */