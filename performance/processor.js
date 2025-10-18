/**
 * Artillery Performance Test Processor
 * 
 * Propósito: Funciones de procesamiento para scenarios de Artillery
 * - Antes/después de requests
 * - Validación de respuestas
 * - Generación de datos dinámicos
 * - Tracking de métricas personalizadas
 */

const crypto = require('crypto');

/**
 * Generar ID de correlación único
 * @returns {string} UUID correlationId
 */
function generateCorrelationId() {
  return `perf-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generar token JWT válido para tests
 * @param {string} userId - ID del usuario
 * @returns {string} JWT token
 */
function generateMockJWT(userId) {
  const header = Buffer.from(JSON.stringify({
    alg: 'HS256',
    typ: 'JWT'
  })).toString('base64url');

  const payload = Buffer.from(JSON.stringify({
    user_id: userId,
    email: `user-${userId}@test.gym`,
    role: 'member',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 900 // 15 minutos
  })).toString('base64url');

  // Firma dummy (en tests reales, usar un JWT válido)
  const signature = 'dummy_signature_for_performance_test';

  return `${header}.${payload}.${signature}`;
}

/**
 * Generador de QR codes para tests
 * @returns {string} QR code único
 */
function generateQRCode() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 8).toUpperCase();
  return `GIM-QR-${timestamp}-${random}`;
}

/**
 * Antes de cada request - Agregar headers personalizados
 */
function beforeRequest(requestParams, context, ee, next) {
  // Agregar correlation ID
  requestParams.headers = requestParams.headers || {};
  requestParams.headers['X-Correlation-ID'] = generateCorrelationId();
  requestParams.headers['X-Timestamp'] = new Date().toISOString();
  
  // Loggear request para debugging
  console.log(`[${context.vars.$timestamp}] ${requestParams.method} ${requestParams.url}`);
  
  return next();
}

/**
 * Después de cada request - Validar métricas y response
 */
function afterResponse(requestParams, response, context, ee, next) {
  const statusCode = response.statusCode;
  const contentLength = response.body ? response.body.length : 0;
  const responseTime = response.responseTime || 0;

  // Track métricas personalizadas
  ee.emit('customStat', {
    stat: 'response_size_bytes',
    value: contentLength
  });

  // Validar rate limiting
  if (statusCode === 429) {
    ee.emit('counter', 'rate_limit_hit', 1);
    
    // Extraer retry-after header si existe
    const retryAfter = response.headers['retry-after'];
    if (retryAfter) {
      console.warn(`[Rate Limited] Retry after: ${retryAfter}s`);
    }
  }

  // Validar tiempos de respuesta
  if (responseTime > 5000) {
    ee.emit('counter', 'slow_response', 1);
    console.warn(`[Slow Response] ${responseTime}ms - ${requestParams.url}`);
  }

  // Validar errores 5xx
  if (statusCode >= 500) {
    ee.emit('counter', 'server_error', 1);
    console.error(`[Server Error] ${statusCode} - ${requestParams.url}`);
  }

  // Validar errores 4xx (excepto 429 rate limit)
  if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
    ee.emit('counter', 'client_error', 1);
  }

  return next();
}

/**
 * Antes de scenario - Inicializar variables
 */
function beforeScenario(scenario, context, ee, next) {
  console.log(`\n🚀 Starting scenario: ${scenario.name}`);
  
  // Inicializar variables dinámicas
  context.vars.member_id = `member-${Math.random().toString(36).substr(2, 9)}`;
  context.vars.class_id = `class-${Math.random().toString(36).substr(2, 9)}`;
  context.vars.phone = `555${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
  context.vars.qr_code = generateQRCode();
  context.vars.access_token = generateMockJWT(context.vars.member_id);
  context.vars.scenario_start_time = Date.now();

  // Emitir evento de inicio
  ee.emit('counter', 'scenario_started', 1);

  return next();
}

/**
 * Después de scenario - Finalizar y reportar
 */
function afterScenario(scenario, context, ee, next) {
  const duration = Date.now() - context.vars.scenario_start_time;
  console.log(`✅ Scenario completed: ${scenario.name} (${duration}ms)\n`);

  ee.emit('counter', 'scenario_completed', 1);
  ee.emit('customStat', {
    stat: 'scenario_duration_ms',
    value: duration
  });

  return next();
}

/**
 * Función helper para generar datos de payload
 * Genera datos realistas para CSV payload
 */
function generatePayload() {
  const members = [];
  for (let i = 0; i < 100; i++) {
    members.push({
      member_id: `member-${i.toString().padStart(3, '0')}`,
      phone: `555${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
      class_id: `class-${(i % 10).toString().padStart(2, '0')}`,
      qr_code: generateQRCode()
    });
  }
  return members;
}

module.exports = {
  beforeRequest,
  afterResponse,
  beforeScenario,
  afterScenario,
  generateCorrelationId,
  generateMockJWT,
  generateQRCode,
  generatePayload
};
