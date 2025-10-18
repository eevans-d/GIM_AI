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
// RATE LIMITING MIDDLEWARE
// ========================================================================

// Simple in-memory rate limit store (uses Redis mock in tests)
const rateLimitStore = new Map();

// Export for test cleanup
app.clearRateLimitStore = () => {
  rateLimitStore.clear();
};

const createRateLimiter = (options = {}) => {
  const {
    windowMs = 60000, // 1 minute default
    maxRequests = 100, // max requests per window
    keyGenerator = (req) => req.ip || '127.0.0.1', // how to identify users
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    errorMessage = 'Too many requests - rate limit exceeded'
  } = options;

  return (req, res, next) => {
    // Extract client IP from various sources
    const xForwardedFor = req.headers['x-forwarded-for'];
    const xRealIp = req.headers['x-real-ip'];
    const remoteAddress = (req.connection && req.connection.remoteAddress) || 
                         (req.socket && req.socket.remoteAddress) || 
                         null;
    
    const clientIp = (
      (xForwardedFor && xForwardedFor.split(',')[0].trim()) ||
      xRealIp ||
      remoteAddress ||
      req.ip ||
      '127.0.0.1'
    );
    
    // Check whitelist
    const whitelist = (process.env.RATE_LIMIT_WHITELIST || '')
      .split(',')
      .map(ip => ip.trim())
      .filter(Boolean);
    
    if (whitelist.length > 0 && whitelist.includes(clientIp)) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();
    
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 0, resetTime: now + windowMs });
    }

    const entry = rateLimitStore.get(key);
    
    // Reset if window expired
    if (now > entry.resetTime) {
      entry.count = 0;
      entry.resetTime = now + windowMs;
    }

    entry.count += 1;
    const remaining = Math.max(0, maxRequests - entry.count);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        error: errorMessage,
        retryAfter: retryAfter
      });
    }

    next();
  };
};

// Apply general API rate limiting (100 req/min)
const apiLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 100,
  keyGenerator: (req) => `${req.ip || '127.0.0.1'}-api`,
  errorMessage: 'API rate limit exceeded'
});

// Apply stricter limits to login (5 attempts per 15 min)
const loginLimiter = createRateLimiter({
  windowMs: 900000, // 15 minutes
  maxRequests: 5,
  keyGenerator: (req) => `${req.body?.email || req.ip || '127.0.0.1'}-login`,
  errorMessage: 'Too many login attempts. Please try again later.'
});

// Apply check-in limit (10 per day per user)
const checkinLimiter = createRateLimiter({
  windowMs: 86400000, // 24 hours
  maxRequests: 10,
  keyGenerator: (req) => `${req.body?.qr_code || req.ip || '127.0.0.1'}-checkin`,
  errorMessage: 'Daily check-in limit reached'
});

// Apply QR generation limit (5 per hour per IP)
const qrLimiter = createRateLimiter({
  windowMs: 3600000, // 1 hour
  maxRequests: 5,
  keyGenerator: (req) => `${req.ip || '127.0.0.1'}-qr`,
  errorMessage: 'QR generation limit exceeded'
});

// Apply survey limit (3 per day per user)
const surveyLimiter = createRateLimiter({
  windowMs: 86400000, // 24 hours
  maxRequests: 3,
  keyGenerator: (req) => `${req.body?.survey_id || req.ip || '127.0.0.1'}-survey`,
  errorMessage: 'Survey submission limit exceeded for today'
});

// Apply dashboard limit (60 req/min)
const dashboardLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 60,
  keyGenerator: (req) => `${req.ip || '127.0.0.1'}-dashboard`,
  errorMessage: 'Dashboard rate limit exceeded'
});

// Apply instructor panel limit (30 req/min)
const instructorLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 30,
  keyGenerator: (req) => `${req.ip || '127.0.0.1'}-instructor`,
  errorMessage: 'Instructor panel rate limit exceeded'
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
    const jwt = jest.requireActual('jsonwebtoken');
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
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required' });
  }

  // For testing: hardcoded test credentials
  // In production, would query Supabase and verify hashed password
  const testCredentials = [
    { email: 'test@example.com', password: 'Test123!@#', role: 'member' },
    { email: 'admin@example.com', password: 'Admin123!@#', role: 'admin' },
    { email: 'staff@example.com', password: 'Staff123!@#', role: 'staff' }
  ];
  
  const user = testCredentials.find(u => u.email === email);
  
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  // Check password directly (in real world would be hashed)
  if (password !== user.password) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  // Generate tokens using real JWT library
  const jwt = jest.requireActual('jsonwebtoken');
  
  // Generate tokens
  const userId = `user-${email.split('@')[0]}-${Date.now()}`;
  const accessToken = jwt.sign(
    { user_id: userId, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { user_id: userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  res.json({
    success: true,
    accessToken,
    refreshToken,
    user: { id: userId, email: user.email, role: user.role }
  });
});

// Refresh token endpoint
app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({ success: false, error: 'Refresh token required' });
  }

  try {
    const jwt = jest.requireActual('jsonwebtoken');
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

  // For testing, just check if oldPassword matches expected value
  // In production, would compare with hashed password from database
  if (oldPassword !== 'OldPass123!') {
    return res.status(401).json({ success: false, error: 'Incorrect old password' });
  }

  res.json({ success: true, message: 'Password changed successfully' });
});

// User registration endpoint
app.post('/api/auth/register', async (req, res) => {
  const { email, password, nombre, apellido, telefono } = req.body;
  
  try {
    // Basic validation (lenient for tests)
    if (!email || !password || !nombre || !apellido || !telefono) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, password, nombre, apellido, and telefono are required' 
      });
    }
    
    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }
    
    // Password complexity check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must contain uppercase, lowercase, number and special character' 
      });
    }
    
    // For testing, just return success without actually hashing
    // In production, would hash password with bcrypt and store in Supabase
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
// RATE-LIMITED ENDPOINTS FOR TESTING
// ========================================================================

// Classes endpoint (general API rate limit)
app.get('/api/classes', apiLimiter, (req, res) => {
  res.json({
    success: true,
    classes: [
      { id: '1', name: 'Spinning', instructor: 'John', time: '10:00' },
      { id: '2', name: 'Yoga', instructor: 'Jane', time: '11:00' }
    ]
  });
});

// Check-in endpoint (strict rate limit: 10/day)
app.post('/api/checkin', checkinLimiter, (req, res) => {
  const { qr_code, clase_id } = req.body;
  
  if (!qr_code || !clase_id) {
    return res.status(400).json({ success: false, error: 'QR code and class ID required' });
  }

  res.json({
    success: true,
    message: 'Check-in successful',
    checkin: {
      qr_code,
      clase_id,
      timestamp: new Date().toISOString()
    }
  });
});

// QR generation endpoint (strict rate limit: 5/hour)
app.post('/api/qr/generate', qrLimiter, (req, res) => {
  const { member_id } = req.body;
  
  if (!member_id) {
    return res.status(400).json({ success: false, error: 'Member ID required' });
  }

  res.json({
    success: true,
    qr_code: `GIM-${member_id}`,
    expiry: new Date(Date.now() + 3600000).toISOString()
  });
});

// Survey endpoint (3 per day)
app.post('/api/surveys/respond', surveyLimiter, (req, res) => {
  const { survey_id, rating, nps_score } = req.body;
  
  if (!survey_id || rating === undefined || nps_score === undefined) {
    return res.status(400).json({ success: false, error: 'Survey ID, rating, and NPS score required' });
  }

  res.json({
    success: true,
    message: 'Survey response recorded',
    response_id: `survey-${Date.now()}`
  });
});

// Dashboard KPIs endpoint (60 req/min)
app.get('/api/dashboard/kpis/realtime', dashboardLimiter, (req, res) => {
  res.json({
    success: true,
    kpis: {
      active_members: 150,
      daily_checkins: 45,
      revenue_today: 5000,
      occupancy_rate: 78
    }
  });
});

// Instructor panel endpoint (30 req/min)
app.get('/api/instructor-panel/sessions', instructorLimiter, (req, res) => {
  res.json({
    success: true,
    sessions: [
      { id: '1', name: 'Morning Spinning', time: '08:00', enrolled: 25 },
      { id: '2', name: 'Evening Yoga', time: '18:00', enrolled: 18 }
    ]
  });
});

// ========================================================================
// ADDITIONAL ENDPOINTS FOR JWT TESTING
// ========================================================================

// User profile endpoint (requires authentication)
app.get('/api/profile', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: {
      user_id: req.user.user_id,
      email: req.user.email,
      role: req.user.role,
      profile: {
        nombre: 'Test User',
        apellido: 'Member',
        telefono: '+12025551234',
        created_at: new Date().toISOString()
      }
    }
  });
});

// Admin stats endpoint (admin only)
app.get('/api/admin/stats', authenticateToken, authorizeRole('admin'), (req, res) => {
  res.json({
    success: true,
    stats: {
      total_members: 350,
      total_classes: 45,
      total_revenue: 125000,
      active_subscriptions: 280
    }
  });
});

// Staff reports endpoint (staff + admin)
app.get('/api/staff/reports', authenticateToken, authorizeRole('staff', 'admin'), (req, res) => {
  res.json({
    success: true,
    reports: {
      daily_checkins: 145,
      member_satisfaction: 4.2,
      class_occupancy: 82,
      revenue_today: 5600
    }
  });
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
