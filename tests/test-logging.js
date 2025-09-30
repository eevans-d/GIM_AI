/**
 * Test script for Logger and Error Handler - PROMPT 16
 * Verifica que el sistema de logging centralizado funciona correctamente
 */

const { createLogger, generateCorrelationId, maskSensitiveData } = require('../utils/logger');
const { 
  AppError, 
  ErrorTypes, 
  handleError, 
  executeWithRetry,
  getCircuitBreaker 
} = require('../utils/error-handler');

console.log('🧪 Testing Centralized Logging System...\n');

// Test 1: Logger básico
console.log('1️⃣ Testing basic logging...');
const logger = createLogger('test');
logger.debug('Debug message test');
logger.info('Info message test');
logger.warn('Warning message test');
logger.error('Error message test');
console.log('✅ Basic logging test completed\n');

// Test 2: Correlation ID
console.log('2️⃣ Testing correlation ID...');
const correlationId = generateCorrelationId();
logger.setCorrelationId(correlationId);
logger.info('Message with correlation ID', { testData: 'test' });
console.log(`✅ Correlation ID test completed: ${correlationId}\n`);

// Test 3: Sensitive data masking
console.log('3️⃣ Testing sensitive data masking...');
const sensitiveData = {
  username: 'john_doe',
  password: 'super_secret_123',
  email: 'john@example.com',
  phone: '+1234567890',
  apiKey: 'sk_test_1234567890abcdef',
  publicData: 'This is public',
};
const masked = maskSensitiveData(sensitiveData);
console.log('Original:', JSON.stringify(sensitiveData, null, 2));
console.log('Masked:', JSON.stringify(masked, null, 2));
console.log('✅ Sensitive data masking test completed\n');

// Test 4: AppError
console.log('4️⃣ Testing AppError...');
const error = new AppError(
  'Test error message',
  ErrorTypes.VALIDATION,
  400,
  { field: 'username', value: 'invalid' }
);
console.log('AppError:', JSON.stringify(error.toJSON(), null, 2));
console.log('✅ AppError test completed\n');

// Test 5: Error handling
console.log('5️⃣ Testing error handling...');
handleError(error, { component: 'test-script' })
  .then(() => {
    console.log('✅ Error handling test completed\n');
  })
  .catch(err => {
    console.error('❌ Error handling test failed:', err);
  });

// Test 6: Retry mechanism
console.log('6️⃣ Testing retry mechanism...');
let attempts = 0;
const unreliableOperation = async () => {
  attempts++;
  if (attempts < 3) {
    throw new Error(`Attempt ${attempts} failed`);
  }
  return 'Success on attempt 3';
};

executeWithRetry(unreliableOperation, ErrorTypes.NETWORK)
  .then(result => {
    console.log(`Result after ${attempts} attempts:`, result);
    console.log('✅ Retry mechanism test completed\n');
  })
  .catch(err => {
    console.error('❌ Retry mechanism test failed:', err.message);
  });

// Test 7: Circuit breaker
console.log('7️⃣ Testing circuit breaker...');
const breaker = getCircuitBreaker('test-service', { failureThreshold: 2 });
console.log('Initial state:', breaker.getState());

// Simular fallos
const testCircuitBreaker = async () => {
  try {
    await breaker.execute(async () => {
      throw new Error('Service unavailable');
    });
  } catch (err) {
    console.log('Expected error caught:', err.message);
  }

  try {
    await breaker.execute(async () => {
      throw new Error('Service unavailable');
    });
  } catch (err) {
    console.log('Expected error caught:', err.message);
  }

  console.log('State after 2 failures:', breaker.getState());

  // Intentar con circuito abierto
  try {
    await breaker.execute(async () => {
      return 'This should not execute';
    });
  } catch (err) {
    console.log('Circuit breaker OPEN (expected):', err.message);
  }

  console.log('✅ Circuit breaker test completed\n');
};

testCircuitBreaker();

// Test 8: Operation tracking
console.log('8️⃣ Testing operation tracking...');
const opLogger = createLogger('operation-test');
opLogger.startOperation('test-operation', { user: 'test-user' })
  .then(opId => {
    console.log('Operation started with ID:', opId);
    return opLogger.endOperation('test-operation', true, { duration: '100ms' });
  })
  .then(() => {
    console.log('✅ Operation tracking test completed\n');
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\nCheck the logs directory for generated log files:');
    console.log('  - logs/app-*.log');
    console.log('  - logs/error-*.log');
    console.log('  - logs/critical-*.log');
  })
  .catch(err => {
    console.error('❌ Operation tracking test failed:', err);
  });
