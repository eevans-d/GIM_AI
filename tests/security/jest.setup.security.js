/**
 * SECURITY TESTS - JEST SETUP
 * Configuración específica para tests de seguridad usando mocks
 */

// Mock all external dependencies for security tests
jest.mock('@supabase/supabase-js');
jest.mock('ioredis');
jest.mock('bull');
jest.mock('axios');
// DO NOT MOCK jsonwebtoken and bcrypt - we need real operations for auth tests
// jest.mock('jsonwebtoken');
// jest.mock('bcrypt');

// Setup environment variables for testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.SUPABASE_URL = 'http://mock-supabase.test';
process.env.SUPABASE_SERVICE_KEY = 'mock-service-key';
process.env.SUPABASE_ANON_KEY = 'mock-anon-key';
process.env.REDIS_URL = 'redis://mock-redis:6379';
process.env.WHATSAPP_ACCESS_TOKEN = 'mock-whatsapp-token';
process.env.WHATSAPP_PHONE_NUMBER_ID = 'mock-phone-id';
process.env.WHATSAPP_API_URL = 'https://mock-whatsapp.api';
process.env.GEMINI_API_KEY = 'mock-gemini-key';

// JWT Secret for testing
process.env.JWT_SECRET = 'test-jwt-secret-key-for-security-tests';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

// Rate limiting configuration for tests
process.env.RATE_LIMIT_WINDOW_MS = '60000'; // 1 minute
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
process.env.RATE_LIMIT_ENABLED = 'true';

// Security configuration
process.env.BCRYPT_ROUNDS = '4'; // Lower for faster tests
process.env.CORS_ORIGIN = 'http://localhost:3000,http://localhost:5173';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:5173';

// Increase timeout for security tests (crypto operations can be slow)
jest.setTimeout(30000);

console.log('[SECURITY TEST SETUP] Using mocked external dependencies with security config');
