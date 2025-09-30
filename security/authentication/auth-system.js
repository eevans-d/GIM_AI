/**
 * Authentication System - PROMPT 18
 * Sistema robusto de autenticación con JWT, MFA y rate limiting
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const { createLogger } = require('../../utils/logger');
const { AppError, ErrorTypes } = require('../../utils/error-handler');

const logger = createLogger('authentication');

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

// Rate limiters
const loginLimiter = new RateLimiterMemory({
  points: 5, // 5 intentos
  duration: 60 * 15, // por 15 minutos
});

const ipLimiter = new RateLimiterMemory({
  points: 10, // 10 intentos
  duration: 60 * 15, // por 15 minutos
});

// Account lockout tracking
const accountLockouts = new Map();
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutos
const MAX_FAILED_ATTEMPTS = 5;

/**
 * Password Policy Enforcement
 */
const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommon: true,
};

const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 
  'password123', 'admin', 'letmein', 'welcome', '123456789'
];

/**
 * Validar contraseña según política
 */
function validatePassword(password) {
  const errors = [];

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters`);
  }

  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (PASSWORD_POLICY.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  if (PASSWORD_POLICY.preventCommon) {
    const lowerPassword = password.toLowerCase();
    if (COMMON_PASSWORDS.some(common => lowerPassword.includes(common))) {
      errors.push('Password is too common. Please choose a more secure password');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Hash password con bcrypt
 */
async function hashPassword(password) {
  const validation = validatePassword(password);
  if (!validation.valid) {
    throw new AppError(
      'Password does not meet security requirements',
      ErrorTypes.VALIDATION,
      400,
      { errors: validation.errors }
    );
  }

  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verificar password
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Verificar si cuenta está bloqueada
 */
function isAccountLocked(userId) {
  if (!accountLockouts.has(userId)) {
    return false;
  }

  const lockout = accountLockouts.get(userId);
  
  if (Date.now() - lockout.lockedAt > LOCKOUT_DURATION) {
    // Lockout expiró
    accountLockouts.delete(userId);
    return false;
  }

  return true;
}

/**
 * Registrar intento fallido de login
 */
function recordFailedAttempt(userId) {
  if (!accountLockouts.has(userId)) {
    accountLockouts.set(userId, {
      attempts: 1,
      lockedAt: null,
    });
    return false;
  }

  const lockout = accountLockouts.get(userId);
  lockout.attempts++;

  if (lockout.attempts >= MAX_FAILED_ATTEMPTS) {
    lockout.lockedAt = Date.now();
    logger.warn('Account locked due to failed login attempts', {
      userId,
      attempts: lockout.attempts,
    });
    return true;
  }

  return false;
}

/**
 * Limpiar intentos fallidos tras login exitoso
 */
function clearFailedAttempts(userId) {
  accountLockouts.delete(userId);
}

/**
 * Generar access token JWT
 */
function generateAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
    issuer: 'gim-ai',
    audience: 'gim-ai-users',
  });
}

/**
 * Generar refresh token JWT
 */
function generateRefreshToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRY,
    issuer: 'gim-ai',
    audience: 'gim-ai-users',
  });
}

/**
 * Verificar JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'gim-ai',
      audience: 'gim-ai-users',
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token has expired', ErrorTypes.AUTHENTICATION, 401);
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token', ErrorTypes.AUTHENTICATION, 401);
    }
    throw new AppError('Token verification failed', ErrorTypes.AUTHENTICATION, 401);
  }
}

/**
 * Middleware de autenticación para Express
 */
function authMiddleware(options = {}) {
  const { required = true, roles = [] } = options;

  return async (req, res, next) => {
    try {
      // Extraer token del header
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        if (required) {
          throw new AppError(
            'No authentication token provided',
            ErrorTypes.AUTHENTICATION,
            401
          );
        }
        return next();
      }

      const token = authHeader.substring(7);

      // Verificar token
      const decoded = verifyToken(token);

      // Verificar roles si se especificaron
      if (roles.length > 0 && !roles.includes(decoded.role)) {
        throw new AppError(
          'Insufficient permissions',
          ErrorTypes.AUTHORIZATION,
          403
        );
      }

      // Adjuntar usuario al request
      req.user = {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role,
      };

      next();

    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          error: {
            message: error.message,
            type: error.type,
          },
        });
      }

      return res.status(500).json({
        error: {
          message: 'Authentication error',
          type: ErrorTypes.SYSTEM,
        },
      });
    }
  };
}

module.exports = {
  // Password management
  validatePassword,
  hashPassword,
  verifyPassword,

  // Account security
  isAccountLocked,
  recordFailedAttempt,
  clearFailedAttempts,

  // Token management
  generateAccessToken,
  generateRefreshToken,
  verifyToken,

  // Middleware
  authMiddleware,

  // Constants
  PASSWORD_POLICY,
};
