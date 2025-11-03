import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger';  
import { config } from './config/config';
import authRoutes from './routes/authRoutes';
import serviceRoutes from './routes/serviceRoutes';
import logger from './utils/logger';
import adminRoutes from './routes/adminRoutes';
import propertyRoutes from './routes/propertyRoutes';
import propertyFormRoutes from './routes/propertyFormRoutes';
import serviceBookingRoutes from './routes/serviceBookingRoutes';
import contactRoutes from './routes/contactRoutes';
import furnitureRoutes from './routes/furnitureRoutes';
import furnitureFormRoutes from './routes/furnitureFormRoutes';
import userRoutes from './routes/userRoutes';
import cron from 'node-cron';
import User from './models/User'; // Adjust the import based on your file structure

const app = express();

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  methods: '*',
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours
}));

// Middleware
app.use(express.json());

// Logging middleware (move before routes)
app.use((_req, _res, next) => {
  logger.info(`${_req.method} ${_req.url}`, {
    ip: _req.ip,
    userAgent: _req.get('user-agent')
  });
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/service-bookings', serviceBookingRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/property-forms', propertyFormRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/furniture', furnitureRoutes);
app.use('/api/furniture-forms', furnitureFormRoutes);
app.use('/api/users', userRoutes);

// Swagger Documentation with custom options
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "BrokerIn API Documentation",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true
  }
}));

// Home route
app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to BrokerIn API',
    status: 'API is running successfully',
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    endpoints: {
      docs: '/api-docs',
      auth: '/api/auth',
      admin: '/api/admin',
      services: '/api/services',
      properties: '/api/properties',
      furniture: '/api/furniture',
      furnitureForms: '/api/furniture-forms',
      users: '/api/users'
    }
  });
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled Error:', {
    error: err.message,
    stack: err.stack
  });
  res.status(500).json({ message: 'Internal server error' });
});

// Connect to MongoDB
mongoose.connect(config.MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
    const PORT = config.PORT || 3030;
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });

    // Cron job to delete unverified users is DISABLED
    // If you want to enable it in production, uncomment the code below and set ENABLE_USER_CLEANUP=true
    // This cleans up users who signed up but never verified their email
    // 
    // To enable, uncomment this block:
    // if (config.isEmailEnabled() && process.env.NODE_ENV === 'production' && process.env.ENABLE_USER_CLEANUP === 'true') {
    //   cron.schedule('0,20,40 * * * *', async () => {
    //     try {
    //       const now = new Date();
    //       const deleted = await User.deleteMany({ isVerified: false, otpExpires: { $lt: now } });
    //       if (deleted.deletedCount > 0) {
    //         logger.info(`Deleted ${deleted.deletedCount} unverified users who did not verify within 20 minutes.`);
    //       }
    //     } catch (error) {
    //       logger.error('Error deleting unverified users', error);
    //     }
    //   });
    // }
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', error);
  });

export default app;