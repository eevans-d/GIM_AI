/**
 * GIM_AI - Sistema Agéntico para Gimnasios
 * Main application entry point
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Webhook endpoint for WhatsApp (to be implemented)
app.post('/webhook/whatsapp', (req, res) => {
  console.log('WhatsApp webhook received:', req.body);
  res.sendStatus(200);
});

// Webhook verification for WhatsApp
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
});

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
  console.log(`
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
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
