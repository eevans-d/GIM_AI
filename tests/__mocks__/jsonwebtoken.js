/**
 * MOCK: jsonwebtoken
 * Mock completo para JWT generation/verification en tests de seguridad
 */

// Simulated token storage
const validTokens = new Set();
const revokedTokens = new Set();

// Mock JWT sign
const sign = jest.fn((payload, secret, options = {}) => {
  const token = `mock-jwt-token-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const mockToken = {
    token,
    payload: {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: options.expiresIn 
        ? Math.floor(Date.now() / 1000) + parseExpiry(options.expiresIn)
        : Math.floor(Date.now() / 1000) + 3600
    }
  };
  
  validTokens.add(token);
  console.log(`[MOCK JWT] Token signed:`, { 
    token: token.substring(0, 20) + '...', 
    payload: mockToken.payload 
  });
  
  return token;
});

// Mock JWT verify
const verify = jest.fn((token, secret, options = {}) => {
  console.log(`[MOCK JWT] Verifying token:`, token.substring(0, 20) + '...');
  
  // Check if token is revoked
  if (revokedTokens.has(token)) {
    const error = new Error('Token has been revoked');
    error.name = 'TokenRevokedError';
    throw error;
  }
  
  // Check if token exists in valid tokens
  if (!validTokens.has(token)) {
    const error = new Error('Invalid token');
    error.name = 'JsonWebTokenError';
    throw error;
  }
  
  // Special handling for test tokens
  if (token.includes('invalid')) {
    const error = new Error('invalid signature');
    error.name = 'JsonWebTokenError';
    throw error;
  }
  
  if (token.includes('expired')) {
    const error = new Error('jwt expired');
    error.name = 'TokenExpiredError';
    throw error;
  }
  
  if (token.includes('malformed')) {
    const error = new Error('jwt malformed');
    error.name = 'JsonWebTokenError';
    throw error;
  }
  
  // Return decoded payload
  const payload = {
    user_id: 'mock-user-id-123',
    email: 'test@example.com',
    role: 'member',
    tipo_usuario: 'member',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };
  
  console.log(`[MOCK JWT] Token verified successfully`);
  return payload;
});

// Mock JWT decode (without verification)
const decode = jest.fn((token, options = {}) => {
  console.log(`[MOCK JWT] Decoding token without verification`);
  
  // Return basic payload structure
  return {
    user_id: 'mock-user-id-123',
    email: 'test@example.com',
    role: 'member',
    tipo_usuario: 'member',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };
});

// Helper to parse expiry strings like '15m', '7d', '1h'
function parseExpiry(expiresIn) {
  if (typeof expiresIn === 'number') return expiresIn;
  
  const matches = expiresIn.match(/^(\d+)([smhd])$/);
  if (!matches) return 3600; // default 1 hour
  
  const value = parseInt(matches[1]);
  const unit = matches[2];
  
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 3600;
  }
}

// Helper functions for tests
const mockHelpers = {
  // Create a token with specific claims
  createToken: (payload, options = {}) => {
    return sign(payload, 'test-secret', options);
  },
  
  // Create an expired token
  createExpiredToken: () => {
    return 'mock-jwt-token-expired-test';
  },
  
  // Create an invalid token
  createInvalidToken: () => {
    return 'mock-jwt-token-invalid-test';
  },
  
  // Revoke a token
  revokeToken: (token) => {
    validTokens.delete(token);
    revokedTokens.add(token);
    console.log(`[MOCK JWT] Token revoked:`, token.substring(0, 20) + '...');
  },
  
  // Clear all tokens
  clearTokens: () => {
    validTokens.clear();
    revokedTokens.clear();
    console.log(`[MOCK JWT] All tokens cleared`);
  },
  
  // Check if token is valid
  isTokenValid: (token) => {
    return validTokens.has(token) && !revokedTokens.has(token);
  }
};

// JWT Errors
class JsonWebTokenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'JsonWebTokenError';
  }
}

class TokenExpiredError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

class NotBeforeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotBeforeError';
  }
}

module.exports = {
  sign,
  verify,
  decode,
  JsonWebTokenError,
  TokenExpiredError,
  NotBeforeError,
  // Export helpers for tests
  __mockHelpers: mockHelpers
};
