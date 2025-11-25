import { Router } from 'express';
import {
  searchLocations,
  geocodeLocation,
  reverseGeocodeLocation
} from '../controllers/geocodingController';
import { authenticateToken } from '../middleware/auth';
import { isAdmin } from '../middleware/adminAuth';

const router = Router();

/**
 * @swagger
 * /api/geocoding/search:
 *   get:
 *     summary: Search for locations (e.g., "Brigade Medows")
 *     tags: [Geocoding]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query (e.g., "Brigade Medows Bangalore")
 *     responses:
 *       200:
 *         description: List of matching locations with coordinates
 *       400:
 *         description: Missing query parameter
 *       503:
 *         description: Geocoding service not configured
 */
router.get('/search', searchLocations);

/**
 * @swagger
 * /api/geocoding/geocode:
 *   post:
 *     summary: Geocode an address to get coordinates
 *     tags: [Geocoding]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               address:
 *                 type: object
 *               location:
 *                 type: string
 *     responses:
 *       200:
 *         description: Coordinates for the address
 */
router.post('/geocode', geocodeLocation);

/**
 * @swagger
 * /api/geocoding/reverse:
 *   post:
 *     summary: Reverse geocode coordinates to get address
 *     tags: [Geocoding]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       200:
 *         description: Address for the coordinates
 */
router.post('/reverse', reverseGeocodeLocation);

export default router;

