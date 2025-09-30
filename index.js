/**
 * GIM_AI - Sistema Agéntico para Gimnasios
 * Main application entry point
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Import centralized logger and error handler
const { createLogger } = require('./utils/logger');
const { errorMiddleware } = require('./utils/error-handler');
const { healthEndpoint } = require('./monitoring/health/system-health');
const logger = createLogger('app');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS
app.use(express.json()); // JSON body parser
app.use(express.urlencoded({ extended: true })); // URL-encoded body parser

// Static files
app.use('/static', express.static(path.join(__dirname, 'frontend')));

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
      dashboard: '/api/dashboard'
    }
  });
});

// Health check endpoint (enhanced)
app.get('/health', healthEndpoint());

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

// Start server
app.listen(PORT, () => {
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
  `;
  
  console.log(startupMessage);
  logger.info('GIM_AI Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.warn('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    logger.info('HTTP server closed gracefully');
    process.exit(0);
  });
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
