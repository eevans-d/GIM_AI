/**
 * MOCK EXPRESS APP - SECURITY TESTS
 * App minimalista para tests de seguridad con middlewares esenciales
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const app = express();

// ========================================================================
// MIDDLEWARE BÁSICO
// ========================================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================================================================
// SECURITY MIDDLEWARE
// ========================================================================

// Helmet para security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
    // In test environment, allow common test origins
    if (process.env.NODE_ENV === 'test') {
      allowedOrigins.push('http://example.com', 'https://example.com');
    }
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Don't throw error, just reject
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
  exposedHeaders: ['X-Correlation-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
};

app.use(cors(corsOptions));

// Correlation ID middleware
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  res.setHeader('X-Correlation-ID', req.correlationId);
  next();
});

// ========================================================================
// MOCK ENDPOINTS FOR SECURITY TESTING
// ========================================================================

// Helper for validation testing
const { validateInput } = require('../../security/input-validator');

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    // Sensitive data should NOT be exposed
    environment: 'test'
  });
});

// Auth middleware mock
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};

// Role-based authorization middleware
const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role) && !roles.includes(req.user.tipo_usuario)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    next();
  };
};

// Test endpoints
app.post('/api/test/sql-injection', (req, res) => {
  try {
    validateInput('member', req.body);
    res.json({ success: true, message: 'Input is safe' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/test/xss', (req, res) => {
  try {
    validateInput('member', req.body);
    res.json({ success: true, data: req.body });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/test/auth-required', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

app.get('/api/test/admin-only', authenticateToken, authorizeRole('admin'), (req, res) => {
  res.json({ success: true, message: 'Admin access granted' });
});

app.get('/api/test/staff-only', authenticateToken, authorizeRole('staff', 'admin'), (req, res) => {
  res.json({ success: true, message: 'Staff access granted' });
});

app.post('/api/test/rate-limited', (req, res) => {
  // Rate limiting is tested separately with middleware
  res.json({ success: true, message: 'Request processed' });
});

// Webhook verification endpoint
app.post('/api/webhooks/whatsapp', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const expectedSignature = 'mock-signature';
  
  if (signature === expectedSignature) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Invalid signature' });
  }
});

// Webhook without /api prefix (for tests)
app.post('/webhook/whatsapp', (req, res) => {
  // Handle large payloads
  if (req.body && JSON.stringify(req.body).length > 5000) {
    return res.status(413).json({ success: false, error: 'Payload too large' });
  }
  
  const signature = req.headers['x-hub-signature-256'];
  const expectedSignature = 'mock-signature';
  
  if (signature === expectedSignature || !signature) {
    res.json({ success: true, message: 'Webhook received' });
  } else {
    res.status(401).json({ success: false, error: 'Invalid signature' });
  }
});

// Webhook setup verification
app.get('/api/webhooks/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  const expectedToken = process.env.WEBHOOK_VERIFY_TOKEN || 'test-token';
  
  if (mode === 'subscribe' && token === expectedToken) {
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ success: false });
  }
});

// Webhook setup without /api prefix
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  const expectedToken = process.env.WEBHOOK_VERIFY_TOKEN || 'test-token';
  
  if (mode === 'subscribe' && token === expectedToken) {
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ success: false });
  }
});

// Login endpoint for auth testing
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required' });
  }

  // Mock authentication
  const bcrypt = require('bcrypt');
  const jwt = require('jsonwebtoken');
  
  // Simulate user lookup (using mock)
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: await bcrypt.hash('Test123!@#', 10),
    role: 'member'
  };

  if (email !== mockUser.email) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const passwordMatch = await bcrypt.compare(password, mockUser.password);
  if (!passwordMatch) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  // Generate tokens
  const accessToken = jwt.sign(
    { user_id: mockUser.id, email: mockUser.email, role: mockUser.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { user_id: mockUser.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  res.json({
    success: true,
    accessToken,
    refreshToken,
    user: { id: mockUser.id, email: mockUser.email, role: mockUser.role }
  });
});

// Refresh token endpoint
app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({ success: false, error: 'Refresh token required' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    if (payload.type !== 'refresh') {
      return res.status(403).json({ success: false, error: 'Invalid token type' });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { user_id: payload.user_id, email: 'test@example.com', role: 'member' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    res.json({ success: true, accessToken });
  } catch (error) {
    res.status(403).json({ success: false, error: 'Invalid or expired refresh token' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  // In production, add token to blacklist in Redis
  res.json({ success: true, message: 'Logged out successfully' });
});

// Password change endpoint
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Old and new passwords required' });
  }

  const bcrypt = require('bcrypt');
  
  // Mock stored password
  const storedPassword = await bcrypt.hash('OldPass123!', 10);
  
  const passwordMatch = await bcrypt.compare(oldPassword, storedPassword);
  if (!passwordMatch) {
    return res.status(401).json({ success: false, error: 'Incorrect old password' });
  }

  res.json({ success: true, message: 'Password changed successfully' });
});

// User registration endpoint
app.post('/api/auth/register', async (req, res) => {
  const { email, password, nombre, apellido, telefono } = req.body;
  
  try {
    validateInput('member', { nombre, apellido, telefono, email });
    
    // Password complexity check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must contain uppercase, lowercase, number and special character' 
      });
    }

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);
    
    res.status(201).json({
      success: true,
      user: { email, nombre, apellido, telefono },
      message: 'User registered successfully'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ========================================================================
// ERROR HANDLING
// ========================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[MOCK APP ERROR]', err);
  
  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
    res.status(err.status || 500).json({
      success: false,
      error: 'An error occurred',
      correlationId: req.correlationId
    });
  } else {
    res.status(err.status || 500).json({
      success: false,
      error: err.message,
      stack: err.stack,
      correlationId: req.correlationId
    });
  }
});

module.exports = app;
