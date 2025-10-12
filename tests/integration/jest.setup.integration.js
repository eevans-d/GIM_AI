/**
 * INTEGRATION TESTS - JEST SETUP
 * Configuración específica para tests de integración usando mocks
 */

// Mock all external dependencies for integration tests
jest.mock('@supabase/supabase-js');
jest.mock('ioredis');
jest.mock('bull');
jest.mock('axios');

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

// Increase timeout for integration tests
jest.setTimeout(30000);

console.log('[INTEGRATION TEST SETUP] Using mocked external dependencies');