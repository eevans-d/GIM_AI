/**
 * Centralized Error Handler - PROMPT 16
 * Manejo centralizado de errores con retry, circuit breaker y escalamiento
 */

const { createLogger } = require('./logger');
const logger = createLogger('error-handler');

// Tipos de errores
const ErrorTypes = {
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  BUSINESS: 'BUSINESS_ERROR',
  SYSTEM: 'SYSTEM_ERROR',
  DATABASE: 'DATABASE_ERROR',
  EXTERNAL_API: 'EXTERNAL_API_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
};

// Configuración de retry por tipo de error
const RETRY_CONFIG = {
  [ErrorTypes.NETWORK]: { maxRetries: 3, baseDelay: 1000, maxDelay: 10000 },
  [ErrorTypes.EXTERNAL_API]: { maxRetries: 3, baseDelay: 2000, maxDelay: 15000 },
  [ErrorTypes.DATABASE]: { maxRetries: 2, baseDelay: 500, maxDelay: 5000 },
  [ErrorTypes.SYSTEM]: { maxRetries: 1, baseDelay: 1000, maxDelay: 5000 },
  // Estos no deben reintentarse automáticamente
  [ErrorTypes.VALIDATION]: { maxRetries: 0, baseDelay: 0, maxDelay: 0 },
  [ErrorTypes.BUSINESS]: { maxRetries: 0, baseDelay: 0, maxDelay: 0 },
  [ErrorTypes.AUTHENTICATION]: { maxRetries: 0, baseDelay: 0, maxDelay: 0 },
  [ErrorTypes.AUTHORIZATION]: { maxRetries: 0, baseDelay: 0, maxDelay: 0 },
};

/**
 * Circuit Breaker para servicios externos
 */
class CircuitBreaker {
  constructor(service, options = {}) {
    this.service = service;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minuto
    this.monitoringPeriod = options.monitoringPeriod || 120000; // 2 minutos
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  async execute(fn, ...args) {
    if (this.state === 'OPEN') {
      // Verificar si es tiempo de intentar de nuevo (HALF_OPEN)
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
        logger.info(`Circuit breaker entering HALF_OPEN state for ${this.service}`);
      } else {
        throw new Error(`Circuit breaker OPEN for ${this.service}. Service temporarily unavailable.`);
      }
    }

    try {
      const result = await fn(...args);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      // Requiere 2 éxitos consecutivos para cerrar el circuito
      if (this.successCount >= 2) {
        this.state = 'CLOSED';
        this.successCount = 0;
        logger.info(`Circuit breaker CLOSED for ${this.service}`);
      }
    }
  }

  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.critical(`Circuit breaker OPEN for ${this.service}`, {
        failures: this.failures,
        threshold: this.failureThreshold,
      });
    }
  }

  getState() {
    return {
      service: this.service,
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Registro global de circuit breakers
const circuitBreakers = new Map();

/**
 * Obtener o crear circuit breaker para un servicio
 */
function getCircuitBreaker(service, options) {
  if (!circuitBreakers.has(service)) {
    circuitBreakers.set(service, new CircuitBreaker(service, options));
  }
  return circuitBreakers.get(service);
}

/**
 * Clase de Error Personalizada
 */
class AppError extends Error {
  constructor(message, type = ErrorTypes.SYSTEM, statusCode = 500, metadata = {}) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
    this.isOperational = true; // Error operacional vs programático

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      metadata: this.metadata,
    };
  }
}

/**
 * Calcular delay con exponential backoff
 */
function calculateBackoff(attempt, baseDelay, maxDelay) {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Añadir jitter aleatorio (±20%)
  const jitter = delay * 0.2 * (Math.random() * 2 - 1);
  return Math.floor(delay + jitter);
}

/**
 * Ejecutar operación con retry automático
 */
async function executeWithRetry(fn, errorType = ErrorTypes.SYSTEM, context = {}) {
  const config = RETRY_CONFIG[errorType] || RETRY_CONFIG[ErrorTypes.SYSTEM];
  let lastError;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Si es el primer intento, ejecutar directamente
      if (attempt === 0) {
        return await fn();
      }

      // Calcular y esperar antes de reintentar
      const delay = calculateBackoff(attempt - 1, config.baseDelay, config.maxDelay);
      
      logger.warn(`Retrying operation (attempt ${attempt}/${config.maxRetries})`, {
        delay,
        errorType,
        ...context,
      });

      await new Promise(resolve => setTimeout(resolve, delay));
      return await fn();

    } catch (error) {
      lastError = error;
      
      // Log cada intento fallido
      logger.error(`Operation failed (attempt ${attempt}/${config.maxRetries})`, {
        error: error.message,
        stack: error.stack,
        errorType,
        ...context,
      });

      // Si no quedan más reintentos, lanzar el error
      if (attempt >= config.maxRetries) {
        break;
      }
    }
  }

  // Todos los reintentos fallaron
  throw lastError;
}

/**
 * Ejecutar operación con circuit breaker
 */
async function executeWithCircuitBreaker(service, fn, options = {}) {
  const breaker = getCircuitBreaker(service, options);
  return breaker.execute(fn);
}

/**
 * Agregación de errores para evitar duplicados
 */
class ErrorAggregator {
  constructor() {
    this.errors = new Map();
    this.aggregationWindow = 60000; // 1 minuto
  }

  /**
   * Agregar error y verificar si debe reportarse
   */
  shouldReport(error) {
    const errorKey = `${error.type}:${error.message}`;
    const now = Date.now();

    if (!this.errors.has(errorKey)) {
      this.errors.set(errorKey, {
        count: 1,
        firstSeen: now,
        lastSeen: now,
        reported: false,
      });
      return true; // Primera ocurrencia, reportar
    }

    const errorData = this.errors.get(errorKey);
    errorData.count++;
    errorData.lastSeen = now;

    // Si ha pasado la ventana de agregación, reportar de nuevo
    if (now - errorData.firstSeen >= this.aggregationWindow) {
      const count = errorData.count;
      // Resetear para nueva ventana
      this.errors.set(errorKey, {
        count: 1,
        firstSeen: now,
        lastSeen: now,
        reported: true,
      });
      
      // Reportar con el conteo agregado
      error.metadata = error.metadata || {};
      error.metadata.aggregatedCount = count;
      return true;
    }

    return false; // Dentro de la ventana, no reportar duplicado
  }

  /**
   * Limpiar errores antiguos
   */
  cleanup() {
    const now = Date.now();
    for (const [key, data] of this.errors.entries()) {
      if (now - data.lastSeen > this.aggregationWindow * 2) {
        this.errors.delete(key);
      }
    }
  }
}

const errorAggregator = new ErrorAggregator();

// Limpiar agregador cada 5 minutos (no mantener vivos los tests)
const _aggregatorCleanup = setInterval(() => errorAggregator.cleanup(), 300000);
if (_aggregatorCleanup && typeof _aggregatorCleanup.unref === 'function') {
  _aggregatorCleanup.unref();
}

/**
 * Determinar severidad de escalamiento
 */
function getEscalationLevel(error) {
  // Crítico: errores de sistema, autenticación fallida múltiple, pérdida de datos
  if (error.type === ErrorTypes.SYSTEM || 
      (error.metadata && error.metadata.aggregatedCount > 10)) {
    return 'CRITICAL';
  }

  // Alto: errores de base de datos, APIs externas caídas
  if (error.type === ErrorTypes.DATABASE || 
      error.type === ErrorTypes.EXTERNAL_API) {
    return 'HIGH';
  }

  // Medio: errores de red, validación múltiple
  if (error.type === ErrorTypes.NETWORK || 
      error.type === ErrorTypes.VALIDATION) {
    return 'MEDIUM';
  }

  // Bajo: errores de negocio
  return 'LOW';
}

/**
 * Manejar error de forma centralizada
 */
async function handleError(error, context = {}) {
  // Convertir a AppError si no lo es
  let appError;
  if (error instanceof AppError) {
    appError = error;
  } else {
    appError = new AppError(
      error.message || 'Unknown error',
      ErrorTypes.SYSTEM,
      500,
      { originalError: error.name, stack: error.stack }
    );
  }

  // Agregar contexto
  appError.metadata = { ...appError.metadata, ...context };

  // Verificar si debe reportarse (deduplicación)
  const shouldReport = errorAggregator.shouldReport(appError);

  if (shouldReport) {
    // Determinar nivel de escalamiento
    const escalationLevel = getEscalationLevel(appError);

    // Log según severidad
    if (escalationLevel === 'CRITICAL') {
      await logger.critical(appError.message, {
        error: appError.toJSON(),
        escalationLevel,
      });
    } else {
      await logger.error(appError.message, {
        error: appError.toJSON(),
        escalationLevel,
      });
    }

    // TODO: Integrar con sistema de alertas (WhatsApp, Telegram, Email)
    // await sendAlert(escalationLevel, appError);
  }

  return appError;
}

/**
 * Middleware de Express para manejo de errores
 */
function errorMiddleware() {
  return async (err, req, res, _next) => {
    // Detectar errores de parseo de JSON (body-parser / express.json)
    // y convertirlos en errores de validación 400 en lugar de 500
    let normalizedError = err;
    try {
      const isJsonRequest = typeof req?.headers?.['content-type'] === 'string' &&
        req.headers['content-type'].toLowerCase().includes('application/json');
      const isParseError = err && (
        err.type === 'entity.parse.failed' ||
        (err instanceof SyntaxError && /json|unexpected token/i.test(err.message || ''))
      );

      if (isJsonRequest && isParseError) {
        normalizedError = new AppError(
          'Invalid JSON payload',
          ErrorTypes.VALIDATION,
          400,
          { originalError: err.message }
        );
      }
    } catch (_e) {
      // En caso de cualquier fallo en la normalización, continuar con el error original
    }

    const appError = await handleError(normalizedError, {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id,
    });

    // No exponer detalles internos en producción
    const response = {
      error: {
        message: appError.message,
        type: appError.type,
      },
    };

    if (process.env.NODE_ENV !== 'production') {
      response.error.stack = appError.stack;
      response.error.metadata = appError.metadata;
    }

    res.status(appError.statusCode).json(response);
  };
}

/**
 * Obtener estado de todos los circuit breakers
 */
function getCircuitBreakersStatus() {
  const status = [];
  for (const breaker of circuitBreakers.values()) {
    status.push(breaker.getState());
  }
  return status;
}

module.exports = {
  // Clases
  AppError,
  CircuitBreaker,
  ErrorAggregator,
  
  // Tipos de errores
  ErrorTypes,
  
  // Funciones principales
  handleError,
  executeWithRetry,
  executeWithCircuitBreaker,
  getCircuitBreaker,
  
  // Middleware
  errorMiddleware,
  
  // Utilidades
  getCircuitBreakersStatus,
  calculateBackoff,
  getEscalationLevel,
};
