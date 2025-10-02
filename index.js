/**
 * GIM_AI - Sistema Agéntico para Gimnasios
 * Main application entry point
 */

require('dotenv').config();
const express = require('express');
const path = require('path');

// Import centralized logger and error handler
const { createLogger } = require('./utils/logger');
const { errorMiddleware } = require('./utils/error-handler');
const { healthEndpoint } = require('./monitoring/health/system-health');
const { initializeCronJobs } = require('./services/reminder-service');

// PROMPT 19: Import security middleware
const { applySecurityMiddleware } = require('./security/security-middleware');
const { apiRateLimiter } = require('./security/rate-limiter');

const logger = createLogger('app');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// PROMPT 19: Apply security middleware (Helmet + CORS)
applySecurityMiddleware(app);

// JSON body parser with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add correlation ID middleware
app.use((req, res, next) => {
  req.correlationId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  next();
});

// PROMPT 19: Apply global API rate limiter
app.use('/api', apiRateLimiter);

// Static files
app.use('/static', express.static(path.join(__dirname, 'frontend')));
app.use('/frontend', express.static(path.join(__dirname, 'frontend')));

// Import API routes
const checkinRoutes = require('./routes/api/checkin');
const qrRoutes = require('./routes/api/qr');
const remindersRoutes = require('./routes/api/reminders');
const collectionRoutes = require('./routes/api/collection');
const surveysRoutes = require('./routes/api/surveys');
const replacementsRoutes = require('./routes/api/replacements');
const instructorPanelRoutes = require('./routes/api/instructor-panel');
const dashboardRoutes = require('./routes/api/dashboard');
// PROMPT 19: Authentication routes
const authRoutes = require('./routes/api/auth');

// Basic routes
app.get('/', (req, res) => {
  res.json({
    message: 'GIM_AI API - Sistema Agéntico para Gimnasios',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/health',
      webhooks: '/webhook',
      checkin: '/api/checkin',
      qr: '/api/qr',
      dashboard: '/api/dashboard'
    }
  });
});

// API Routes
// PROMPT 19: Auth routes (no rate limit aquí, ya tiene su propio loginRateLimiter)
app.use('/api/auth', authRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/collection', collectionRoutes);
app.use('/api/surveys', surveysRoutes);
app.use('/api/replacements', replacementsRoutes);
app.use('/api/instructor-panel', instructorPanelRoutes);
app.use('/api/dashboard', dashboardRoutes);

// PROMPT 11: Valley Optimization Routes
const valleyOptimizationRoutes = require('./routes/api/valley-optimization');
app.use('/api/valley-optimization', valleyOptimizationRoutes);

// PROMPT 12: Smart Reactivation Routes
const reactivationRoutes = require('./routes/api/reactivation');
app.use('/api/reactivation', reactivationRoutes);

// PROMPT 13: Nutrition Tips Routes
const nutritionRoutes = require('./routes/api/nutrition');
app.use('/api/nutrition', nutritionRoutes);

// Health check endpoint (enhanced)
app.get('/health', healthEndpoint());

// Minimal endpoint for E2E test redirection check (only in test env)
if (process.env.NODE_ENV === 'test') {
  app.get('/checkin', (req, res) => {
    const { qr } = req.query;
    return res.status(200).json({ success: true, qr });
  });
}

// Webhook endpoint for WhatsApp (to be implemented)
app.post('/webhook/whatsapp', async (req, res) => {
  try {
    const correlationId = await logger.startOperation('whatsapp-webhook', {
      body: req.body,
    });
    logger.info('WhatsApp webhook received', { correlationId, body: req.body });
    res.sendStatus(200);
  } catch (error) {
    logger.error('Error processing WhatsApp webhook', { error: error.message });
    res.sendStatus(500);
  }
});

// Webhook verification for WhatsApp
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    logger.warn('WhatsApp webhook verification failed', {
      mode,
      tokenMatch: token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    });
    res.sendStatus(403);
  }
});

// Error handling middleware (centralized)
app.use(errorMiddleware());

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      status: 404
    }
  });
});

// Start server only when run directly (not when required by tests)
let server;
if (require.main === module && process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
  const startupMessage = `
╔═══════════════════════════════════════════════════════════╗
║                      GIM_AI Server                        ║
║           Sistema Agéntico para Gimnasios                 ║
╚═══════════════════════════════════════════════════════════╝

🚀 Server running on port ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📅 Started at: ${new Date().toISOString()}

Available endpoints:
  → http://localhost:${PORT}/
  → http://localhost:${PORT}/health
  → http://localhost:${PORT}/webhook/whatsapp
  → http://localhost:${PORT}/api/checkin
  → http://localhost:${PORT}/api/qr
  `;
  
  console.log(startupMessage);
  logger.info('GIM_AI Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
  });
  
  // Initialize automated reminder cron jobs
  try {
    initializeCronJobs();
    logger.info('Automated reminder system initialized');
  } catch (error) {
    logger.error('Failed to initialize reminder system', { error: error.message });
  }
  
  // Initialize collection queue processor
  try {
    require('./workers/collection-queue-processor');
    logger.info('Collection queue processor initialized');
  } catch (error) {
    logger.error('Failed to initialize collection queue processor', { error: error.message });
  }
  
  // Initialize survey queue processor
  try {
    require('./workers/survey-queue-processor');
    logger.info('Survey queue processor initialized');
  } catch (error) {
    logger.error('Failed to initialize survey queue processor', { error: error.message });
  }
  
  // Initialize replacement queue processor
  try {
    require('./workers/replacement-queue-processor');
    logger.info('Replacement queue processor initialized');
  } catch (error) {
    logger.error('Failed to initialize replacement queue processor', { error: error.message });
  }

  // Initialize instructor panel alert queue processor
  try {
    require('./workers/instructor-alert-queue-processor');
    logger.info('Instructor panel alert queue processor initialized');
  } catch (error) {
    logger.error('Failed to initialize instructor alert queue processor', { error: error.message });
  }

  // Initialize dashboard cron jobs (PROMPT 15)
  try {
    const { initializeDashboardCron } = require('./workers/dashboard-cron-processor');
    initializeDashboardCron();
    logger.info('Dashboard cron jobs initialized (snapshots, alerts, view refresh)');
  } catch (error) {
    logger.error('Failed to initialize dashboard cron jobs', { error: error.message });
  }
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.warn('SIGTERM signal received: closing HTTP server');
  if (server && typeof server.close === 'function') {
    server.close(() => {
      logger.info('HTTP server closed gracefully');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.critical('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.critical('Unhandled promise rejection', {
    reason,
    promise,
  });
});

module.exports = app;
