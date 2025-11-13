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
import furnitureTransactionRoutes from './routes/furnitureTransactionRoutes';
import rentalRoutes from './routes/rentalRoutes';
import userRoutes from './routes/userRoutes';
import paymentRoutes from './routes/paymentRoutes';
import cron from 'node-cron';
import User from './models/User'; // Adjust the import based on your file structure
import { checkAndSendPaymentReminders } from './utils/rentalReminders';
import { checkMonthlyRentalPayments } from './utils/monthlyPaymentChecker';
import { autoGeneratePaymentRecords } from './utils/rentalReminders';

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
app.use('/api/furniture-transactions', furnitureTransactionRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);

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

// Start server immediately (Railway requirement)
// Railway sets PORT automatically - ALWAYS use process.env.PORT first (Railway requirement)
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3030;
const HOST = '0.0.0.0'; // Railway requires 0.0.0.0

logger.info(`Starting server on ${HOST}:${PORT} (PORT env: ${process.env.PORT || 'not set'})`);

const server = app.listen(PORT, HOST, () => {
  logger.info(`✅ Server is running on ${HOST}:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Connect to MongoDB (non-blocking)
mongoose.connect(config.MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
    
    // Schedule payment reminder cron job (runs daily at 9:00 AM)
    // Cron format: minute hour day month dayOfWeek
    // '0 9 * * *' = Every day at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
      logger.info('Running scheduled payment reminder check...');
      try {
        await checkAndSendPaymentReminders();
        logger.info('Scheduled payment reminder check completed');
      } catch (error) {
        logger.error('Error in scheduled payment reminder check:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata' // Adjust timezone as needed
    });
    
    logger.info('Payment reminder cron job scheduled (daily at 9:00 AM)');

    // Schedule automatic payment record generation (runs daily at 8:00 AM)
    // This ensures payment records are only created for months that are due or past
    cron.schedule('0 8 * * *', async () => {
      logger.info('Running automatic payment record generation...');
      try {
        await autoGeneratePaymentRecords();
        logger.info('Automatic payment record generation completed');
      } catch (error) {
        logger.error('Error in automatic payment record generation:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });
    
    logger.info('Automatic payment record generation cron job scheduled (daily at 8:00 AM)');

    // Schedule monthly rental payment checker (runs daily at 10:00 AM)
    cron.schedule('0 10 * * *', async () => {
      logger.info('Running scheduled monthly rental payment check...');
      try {
        await checkMonthlyRentalPayments();
        logger.info('Scheduled monthly rental payment check completed');
      } catch (error) {
        logger.error('Error in scheduled monthly rental payment check:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });
    
    logger.info('Monthly rental payment checker cron job scheduled (daily at 10:00 AM)');
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', error);
    // Server continues running even if MongoDB fails
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    mongoose.connection.close().then(() => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

export default app;