/**
 * PROMPT 19: INPUT VALIDATION & SANITIZATION
 * Validación robusta de inputs para prevenir inyecciones y ataques
 */

const Joi = require('joi');
const validator = require('validator');
const xss = require('xss');
const { AppError, ErrorTypes } = require('../utils/error-handler');
const log = require('../utils/logger').createLogger('input-validator');

/**
 * Schemas de validación Joi para diferentes entidades
 */
const schemas = {
    // Member validation
    member: Joi.object({
        nombre: Joi.string().min(2).max(50).pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).required(),
        apellido: Joi.string().min(2).max(50).pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).required(),
        telefono: Joi.string().pattern(/^\+?[1-9]\d{10,14}$/).required(),
        email: Joi.string().email().max(100).required(),
        fecha_nacimiento: Joi.date().max('now').optional(),
        codigo_qr: Joi.string().pattern(/^GIM-[A-Z0-9]{6}$/).optional()
    }),
    
    // Check-in validation
    checkin: Joi.object({
        qr_code: Joi.string().pattern(/^GIM-[A-Z0-9]{6}$/).required(),
        clase_id: Joi.string().uuid().required()
    }),
    
    // Class validation
    clase: Joi.object({
        nombre_clase: Joi.string().min(3).max(100).required(),
        horario: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
        fecha: Joi.date().iso().min('now').required(),
        capacidad_maxima: Joi.number().integer().min(1).max(100).required(),
        instructor_id: Joi.string().uuid().optional(),
        tipo_clase: Joi.string().valid('spinning', 'yoga', 'crossfit', 'pilates', 'zumba', 'funcional').required()
    }),
    
    // Payment validation
    payment: Joi.object({
        member_id: Joi.string().uuid().required(),
        monto: Joi.number().positive().precision(2).max(100000).required(),
        metodo_pago: Joi.string().valid('efectivo', 'tarjeta', 'transferencia', 'otro').required(),
        concepto: Joi.string().max(200).optional(),
        fecha_pago: Joi.date().iso().max('now').required()
    }),
    
    // Survey validation
    survey: Joi.object({
        checkin_id: Joi.string().uuid().required(),
        rating: Joi.number().integer().min(1).max(5).required(),
        nps_score: Joi.number().integer().min(0).max(10).required(),
        comment: Joi.string().max(500).optional()
    }),
    
    // Reminder validation
    reminder: Joi.object({
        member_id: Joi.string().uuid().required(),
        clase_id: Joi.string().uuid().optional(),
        reminder_type: Joi.string().valid('class_reminder', 'payment_reminder', 'general_reminder').required(),
        send_at: Joi.date().iso().min('now').required(),
        message: Joi.string().max(500).optional()
    }),
    
    // UUID validation
    uuid: Joi.string().uuid().required(),
    
    // Date range validation
    dateRange: Joi.object({
        start_date: Joi.date().iso().required(),
        end_date: Joi.date().iso().min(Joi.ref('start_date')).required()
    }),
    
    // Pagination validation
    pagination: Joi.object({
        page: Joi.number().integer().min(1).max(1000).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20)
    }),
    
    // Authentication schemas
    login: Joi.object({
        email: Joi.string().email().max(100).required(),
        password: Joi.string().min(8).max(100).required()
    }),
    
    changePassword: Joi.object({
        oldPassword: Joi.string().min(8).max(100).required(),
        newPassword: Joi.string()
            .min(8)
            .max(100)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .message('Password must contain at least one uppercase, one lowercase, one number and one special character')
            .required()
    }),
    
    createUser: Joi.object({
        email: Joi.string().email().max(100).required(),
        password: Joi.string()
            .min(8)
            .max(100)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .message('Password must contain at least one uppercase, one lowercase, one number and one special character')
            .required(),
        nombre: Joi.string().min(2).max(50).pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).required(),
        apellido: Joi.string().min(2).max(50).pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).required(),
        role: Joi.string().valid('admin', 'staff', 'instructor', 'member').required()
    })
};

/**
 * Valida un objeto contra un schema Joi
 * @param {Object} data - Datos a validar
 * @param {Object} schema - Schema Joi
 * @param {String} correlationId - ID de correlación para logging
 * @returns {Object} Datos validados
 * @throws {AppError} Si la validación falla
 */
function validateSchema(data, schema, correlationId) {
    const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
    });
    
    if (error) {
        const details = error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message,
            type: d.type
        }));
        
        log.warn('Validation failed', {
            correlationId,
            errors: details,
            data: sanitizeForLogging(data)
        });
        
        throw new AppError(
            'Validation failed',
            ErrorTypes.VALIDATION_ERROR,
            400,
            { validation_errors: details }
        );
    }
    
    return value;
}

/**
 * Sanitiza un string para prevenir XSS
 * @param {String} input - Input a sanitizar
 * @returns {String} Input sanitizado
 */
function sanitizeString(input) {
    if (typeof input !== 'string') return input;
    
    // XSS cleaning
    let cleaned = xss(input, {
        whiteList: {}, // No HTML tags allowed
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script', 'style']
    });
    
    // Trim whitespace
    cleaned = cleaned.trim();
    
    // Remove null bytes
    cleaned = cleaned.replace(/\0/g, '');
    
    return cleaned;
}

/**
 * Sanitiza recursivamente un objeto
 * @param {Object} obj - Objeto a sanitizar
 * @returns {Object} Objeto sanitizado
 */
function sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
    }
    
    return sanitized;
}

/**
 * Valida y sanitiza un número de teléfono
 * @param {String} phone - Número de teléfono
 * @returns {String} Teléfono validado en formato E.164
 * @throws {AppError} Si el teléfono es inválido
 */
function validatePhone(phone) {
    if (!phone || typeof phone !== 'string') {
        throw new AppError('Invalid phone number', ErrorTypes.VALIDATION_ERROR, 400);
    }
    
    // Remove spaces and dashes
    let cleaned = phone.replace(/[\s-]/g, '');
    
    // Add + if missing
    if (!cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
    }
    
    // Validate format (E.164)
    if (!validator.isMobilePhone(cleaned, 'any', { strictMode: true })) {
        throw new AppError('Invalid phone number format', ErrorTypes.VALIDATION_ERROR, 400);
    }
    
    return cleaned;
}

/**
 * Valida un email
 * @param {String} email - Email a validar
 * @returns {String} Email validado en lowercase
 * @throws {AppError} Si el email es inválido
 */
function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        throw new AppError('Invalid email', ErrorTypes.VALIDATION_ERROR, 400);
    }
    
    const cleaned = email.trim().toLowerCase();
    
    if (!validator.isEmail(cleaned)) {
        throw new AppError('Invalid email format', ErrorTypes.VALIDATION_ERROR, 400);
    }
    
    // Check for disposable email domains
    const disposableDomains = ['tempmail.com', 'throwaway.email', '10minutemail.com'];
    const domain = cleaned.split('@')[1];
    if (disposableDomains.includes(domain)) {
        throw new AppError('Disposable email addresses are not allowed', ErrorTypes.VALIDATION_ERROR, 400);
    }
    
    return cleaned;
}

/**
 * Valida un UUID
 * @param {String} uuid - UUID a validar
 * @returns {String} UUID validado
 * @throws {AppError} Si el UUID es inválido
 */
function validateUUID(uuid) {
    if (!uuid || typeof uuid !== 'string') {
        throw new AppError('Invalid UUID', ErrorTypes.VALIDATION_ERROR, 400);
    }
    
    if (!validator.isUUID(uuid, 4)) {
        throw new AppError('Invalid UUID format', ErrorTypes.VALIDATION_ERROR, 400);
    }
    
    return uuid.toLowerCase();
}

/**
 * Valida una fecha ISO
 * @param {String} date - Fecha a validar
 * @returns {String} Fecha validada
 * @throws {AppError} Si la fecha es inválida
 */
function validateDate(date) {
    if (!date || typeof date !== 'string') {
        throw new AppError('Invalid date', ErrorTypes.VALIDATION_ERROR, 400);
    }
    
    if (!validator.isISO8601(date, { strict: true })) {
        throw new AppError('Invalid date format (expected ISO 8601)', ErrorTypes.VALIDATION_ERROR, 400);
    }
    
    return date;
}

/**
 * Valida un QR code
 * @param {String} qrCode - QR code a validar
 * @returns {String} QR code validado
 * @throws {AppError} Si el QR es inválido
 */
function validateQRCode(qrCode) {
    if (!qrCode || typeof qrCode !== 'string') {
        throw new AppError('Invalid QR code', ErrorTypes.VALIDATION_ERROR, 400);
    }
    
    const pattern = /^GIM-[A-Z0-9]{6}$/;
    if (!pattern.test(qrCode)) {
        throw new AppError('Invalid QR code format (expected GIM-XXXXXX)', ErrorTypes.VALIDATION_ERROR, 400);
    }
    
    return qrCode.toUpperCase();
}

/**
 * Previene SQL injection verificando caracteres peligrosos
 * @param {String} input - Input a verificar
 * @returns {Boolean} True si el input es seguro
 */
function isSQLSafe(input) {
    if (typeof input !== 'string') return true;
    
    // Patrones peligrosos para SQL injection
    const dangerousPatterns = [
        /(\bOR\b|\bAND\b).*?=.*?/i,
        /UNION.*?SELECT/i,
        /INSERT.*?INTO/i,
        /UPDATE.*?SET/i,
        /DELETE.*?FROM/i,
        /DROP.*?TABLE/i,
        /CREATE.*?TABLE/i,
        /--/,
        /\/\*/,
        /;\s*$/,
        /exec\s*\(/i,
        /execute\s*\(/i
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(input));
}

/**
 * Sanitiza datos para logging (oculta información sensible)
 * @param {Object} data - Datos a sanitizar
 * @returns {Object} Datos sanitizados para logging
 */
function sanitizeForLogging(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sensitiveFields = ['password', 'token', 'api_key', 'secret', 'credit_card', 'ssn'];
    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '***REDACTED***';
        }
    }
    
    // Partial mask for phone and email
    if (sanitized.telefono) {
        sanitized.telefono = sanitized.telefono.replace(/\d(?=\d{4})/g, '*');
    }
    if (sanitized.email) {
        const [user, domain] = sanitized.email.split('@');
        sanitized.email = `${user.slice(0, 2)}***@${domain}`;
    }
    
    return sanitized;
}

/**
 * Middleware Express para validar body con schema
 * @param {String} schemaName - Nombre del schema a usar
 * @returns {Function} Middleware Express
 */
function validateBody(schemaName) {
    return (req, res, next) => {
        try {
            const schema = schemas[schemaName];
            if (!schema) {
                throw new AppError(`Schema ${schemaName} not found`, ErrorTypes.INTERNAL_ERROR, 500);
            }
            
            // Sanitizar antes de validar
            req.body = sanitizeObject(req.body);
            
            // Validar
            req.body = validateSchema(req.body, schema, req.correlationId);
            
            // Verificar SQL safety
            for (const [key, value] of Object.entries(req.body)) {
                if (typeof value === 'string' && !isSQLSafe(value)) {
                    throw new AppError(
                        `Potentially unsafe input detected in field: ${key}`,
                        ErrorTypes.VALIDATION_ERROR,
                        400
                    );
                }
            }
            
            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Middleware Express para validar query params
 * @param {String} schemaName - Nombre del schema a usar
 * @returns {Function} Middleware Express
 */
function validateQuery(schemaName) {
    return (req, res, next) => {
        try {
            const schema = schemas[schemaName];
            if (!schema) {
                throw new AppError(`Schema ${schemaName} not found`, ErrorTypes.INTERNAL_ERROR, 500);
            }
            
            req.query = sanitizeObject(req.query);
            req.query = validateSchema(req.query, schema, req.correlationId);
            
            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Middleware Express para validar params (UUID)
 * @returns {Function} Middleware Express
 */
function validateParams() {
    return (req, res, next) => {
        try {
            for (const [key, value] of Object.entries(req.params)) {
                // Si el param parece un UUID, validarlo
                if (value.includes('-')) {
                    req.params[key] = validateUUID(value);
                }
            }
            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = {
    schemas,
    validateSchema,
    sanitizeString,
    sanitizeObject,
    validatePhone,
    validateEmail,
    validateUUID,
    validateDate,
    validateQRCode,
    isSQLSafe,
    sanitizeForLogging,
    validateBody,
    validateQuery,
    validateParams
};
