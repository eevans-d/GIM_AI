/**
 * Centralized Logging System - PROMPT 16
 * Sistema de logging estructurado con niveles, correlación y enmascaramiento de datos sensibles
 */

const winston = require('winston');
require('winston-daily-rotate-file');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Supabase client para system_logs
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Niveles de log personalizados
const customLevels = {
  levels: {
    critical: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
  },
  colors: {
    critical: 'red',
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
  },
};

winston.addColors(customLevels.colors);

// Campos sensibles a enmascarar
const SENSITIVE_FIELDS = [
  'password', 'token', 'apiKey', 'api_key', 'secret', 'pin',
  'credit_card', 'ssn', 'phone', 'email', 'address',
];

// Rate limiting para evitar spam de logs
const logRateLimiter = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const RATE_LIMIT_MAX = 100; // máximo 100 logs del mismo tipo por minuto

/**
 * Enmascarar datos sensibles en objetos
 */
function maskSensitiveData(data) {
  if (!data || typeof data !== 'object') return data;

  const masked = Array.isArray(data) ? [...data] : { ...data };

  for (const key in masked) {
    const lowerKey = key.toLowerCase();
    
    // Enmascarar campos sensibles
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      const value = String(masked[key]);
      if (value.length > 4) {
        masked[key] = '***' + value.slice(-4);
      } else {
        masked[key] = '****';
      }
    }
    // Recursión para objetos anidados
    else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }

  return masked;
}

/**
 * Verificar rate limiting
 */
function checkRateLimit(logKey) {
  const now = Date.now();
  
  if (!logRateLimiter.has(logKey)) {
    logRateLimiter.set(logKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  const limit = logRateLimiter.get(logKey);
  
  if (now > limit.resetAt) {
    logRateLimiter.set(logKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (limit.count >= RATE_LIMIT_MAX) {
    return false; // Rate limit excedido
  }

  limit.count++;
  return true;
}

/**
 * Generar correlation ID para rastreo end-to-end
 */
function generateCorrelationId() {
  return uuidv4();
}

// Winston logger configurado
const fileLogger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'gim-ai' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      ),
    }),
    // Logs generales rotatorios
    new winston.transports.DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'info',
    }),
    // Logs de error separados
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '90d', // Errores se guardan 90 días
    }),
    // Logs críticos separados
    new winston.transports.DailyRotateFile({
      filename: 'logs/critical-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'critical',
      maxSize: '20m',
      maxFiles: '365d', // Críticos se guardan 1 año
    }),
  ],
});

/**
 * Clase principal del Logger
 */
class Logger {
  constructor(context = 'app') {
    this.context = context;
    this.correlationId = null;
  }

  /**
   * Establecer correlation ID para una sesión
   */
  setCorrelationId(correlationId) {
    this.correlationId = correlationId || generateCorrelationId();
    return this.correlationId;
  }

  /**
   * Log estructurado
   */
  async log(level, message, metadata = {}) {
    try {
      // Preparar metadata
      const logKey = `${level}:${message}`;
      
      // Rate limiting check
      if (!checkRateLimit(logKey)) {
        return; // Silenciosamente ignorar si excede rate limit
      }

      const logData = {
        level,
        message,
        context: this.context,
        correlationId: this.correlationId || generateCorrelationId(),
        timestamp: new Date().toISOString(),
        ...maskSensitiveData(metadata),
      };

      // Log a archivo via Winston
      fileLogger.log(level, message, logData);

      // Log a Supabase para logs críticos y errores
      if ((level === 'error' || level === 'critical') && supabase) {
        try {
          await supabase.from('system_logs').insert({
            level,
            message,
            context: this.context,
            correlation_id: logData.correlationId,
            metadata: logData,
            user_id: metadata.userId || null,
            action: metadata.action || null,
            created_at: new Date().toISOString(),
          });
        } catch (dbError) {
          // Si falla el guardado en DB, solo registrar en archivo
          fileLogger.error('Failed to save log to database', { error: dbError.message });
        }
      }

      return logData.correlationId;
    } catch (error) {
      // Último recurso: console directo
      console.error('Logger error:', error);
    }
  }

  /**
   * Log de nivel DEBUG
   */
  debug(message, metadata = {}) {
    return this.log('debug', message, metadata);
  }

  /**
   * Log de nivel INFO
   */
  info(message, metadata = {}) {
    return this.log('info', message, metadata);
  }

  /**
   * Log de nivel WARN
   */
  warn(message, metadata = {}) {
    return this.log('warn', message, metadata);
  }

  /**
   * Log de nivel ERROR
   */
  error(message, metadata = {}) {
    return this.log('error', message, metadata);
  }

  /**
   * Log de nivel CRITICAL
   */
  critical(message, metadata = {}) {
    return this.log('critical', message, metadata);
  }

  /**
   * Log de inicio de operación
   */
  async startOperation(operation, metadata = {}) {
    const correlationId = generateCorrelationId();
    this.setCorrelationId(correlationId);
    
    await this.info(`Operation started: ${operation}`, {
      operation,
      ...metadata,
    });

    return correlationId;
  }

  /**
   * Log de fin de operación
   */
  async endOperation(operation, success = true, metadata = {}) {
    const level = success ? 'info' : 'error';
    
    await this.log(level, `Operation ${success ? 'completed' : 'failed'}: ${operation}`, {
      operation,
      success,
      ...metadata,
    });
  }
}

/**
 * Factory para crear loggers con contexto
 */
function createLogger(context) {
  return new Logger(context);
}

// Logger por defecto
const defaultLogger = new Logger('default');

module.exports = {
  Logger,
  createLogger,
  generateCorrelationId,
  maskSensitiveData,
  // Export métodos del logger por defecto para compatibilidad
  debug: (msg, meta) => defaultLogger.debug(msg, meta),
  info: (msg, meta) => defaultLogger.info(msg, meta),
  warn: (msg, meta) => defaultLogger.warn(msg, meta),
  error: (msg, meta) => defaultLogger.error(msg, meta),
  critical: (msg, meta) => defaultLogger.critical(msg, meta),
  startOperation: (op, meta) => defaultLogger.startOperation(op, meta),
  endOperation: (op, success, meta) => defaultLogger.endOperation(op, success, meta),
};
