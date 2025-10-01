/**
 * PROMPT 19: SECURITY AUDIT SERVICE
 * Servicio para registrar eventos de seguridad y auditoría
 */

const { createClient } = require('@supabase/supabase-js');
const log = require('../utils/logger').createLogger('security-audit');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/**
 * Tipos de eventos de auditoría
 */
const AUDIT_EVENTS = {
    // Autenticación
    LOGIN_SUCCESS: 'login_success',
    LOGIN_FAILURE: 'login_failure',
    LOGOUT: 'logout',
    TOKEN_REFRESH: 'token_refresh',
    PASSWORD_CHANGE: 'password_change',
    
    // Autorización
    UNAUTHORIZED_ACCESS: 'unauthorized_access',
    PERMISSION_DENIED: 'permission_denied',
    
    // Rate limiting
    RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
    
    // Seguridad
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',
    SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
    XSS_ATTEMPT: 'xss_attempt',
    INVALID_INPUT: 'invalid_input',
    
    // Administración
    USER_CREATED: 'user_created',
    USER_UPDATED: 'user_updated',
    USER_DELETED: 'user_deleted',
    USER_ACTIVATED: 'user_activated',
    USER_DEACTIVATED: 'user_deactivated',
    
    // Datos sensibles
    SENSITIVE_DATA_ACCESS: 'sensitive_data_access',
    DATA_EXPORT: 'data_export'
};

/**
 * Niveles de severidad
 */
const SEVERITY_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

/**
 * Registra un evento de auditoría
 * @param {Object} params - Parámetros del evento
 * @param {String} params.eventType - Tipo de evento (AUDIT_EVENTS)
 * @param {String} params.userId - ID del usuario (opcional)
 * @param {Object} params.eventData - Datos adicionales del evento
 * @param {String} params.ipAddress - Dirección IP
 * @param {String} params.userAgent - User agent
 * @param {String} params.severity - Nivel de severidad
 * @param {String} params.correlationId - ID de correlación
 * @returns {Promise<Boolean>} True si se registró exitosamente
 */
async function logSecurityEvent({
    eventType,
    userId = null,
    eventData = {},
    ipAddress = null,
    userAgent = null,
    severity = SEVERITY_LEVELS.LOW,
    correlationId
}) {
    try {
        // Agregar metadata adicional
        const enrichedData = {
            ...eventData,
            severity,
            correlationId,
            timestamp: new Date().toISOString()
        };
        
        // Insertar en base de datos
        const { error } = await supabase
            .from('security_audit_log')
            .insert({
                user_id: userId,
                event_type: eventType,
                event_data: enrichedData,
                ip_address: ipAddress,
                user_agent: userAgent
            });
        
        if (error) {
            log.error('Failed to log security event to database', {
                correlationId,
                eventType,
                error: error.message
            });
            return false;
        }
        
        // Log en archivo también
        const logMethod = severity === SEVERITY_LEVELS.CRITICAL || severity === SEVERITY_LEVELS.HIGH
            ? 'warn'
            : 'info';
        
        log[logMethod]('Security event logged', {
            correlationId,
            eventType,
            userId,
            severity,
            ipAddress
        });
        
        // Si es un evento crítico, enviar alerta
        if (severity === SEVERITY_LEVELS.CRITICAL) {
            await sendCriticalAlert(eventType, enrichedData, correlationId);
        }
        
        return true;
    } catch (error) {
        log.error('Error logging security event', {
            correlationId,
            eventType,
            error: error.message
        });
        return false;
    }
}

/**
 * Registra un intento de login
 * @param {Object} params - Parámetros del intento
 * @returns {Promise<Boolean>} True si se registró exitosamente
 */
async function logLoginAttempt({
    email,
    success,
    ipAddress,
    userAgent,
    correlationId
}) {
    try {
        const { error } = await supabase
            .from('login_attempts')
            .insert({
                email: email.toLowerCase(),
                success,
                ip_address: ipAddress,
                user_agent: userAgent
            });
        
        if (error) {
            log.error('Failed to log login attempt', {
                correlationId,
                email,
                error: error.message
            });
            return false;
        }
        
        // Si es fallido, verificar si hay demasiados intentos
        if (!success) {
            await checkSuspiciousLoginActivity(email, ipAddress, correlationId);
        }
        
        return true;
    } catch (error) {
        log.error('Error logging login attempt', {
            correlationId,
            error: error.message
        });
        return false;
    }
}

/**
 * Verifica actividad sospechosa de login
 * @param {String} email - Email del intento
 * @param {String} ipAddress - IP del intento
 * @param {String} correlationId - ID de correlación
 */
async function checkSuspiciousLoginActivity(email, ipAddress, correlationId) {
    try {
        // Contar intentos fallidos en las últimas 15 minutos
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        
        const { data, error } = await supabase
            .from('login_attempts')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('success', false)
            .gte('attempted_at', fifteenMinutesAgo);
        
        if (error) {
            log.error('Error checking login attempts', {
                correlationId,
                error: error.message
            });
            return;
        }
        
        // Si hay más de 5 intentos fallidos, registrar actividad sospechosa
        if (data && data.length >= 5) {
            await logSecurityEvent({
                eventType: AUDIT_EVENTS.SUSPICIOUS_ACTIVITY,
                eventData: {
                    email,
                    failed_attempts: data.length,
                    time_window: '15 minutes',
                    reason: 'Multiple failed login attempts'
                },
                ipAddress,
                severity: SEVERITY_LEVELS.HIGH,
                correlationId
            });
        }
    } catch (error) {
        log.error('Error checking suspicious login activity', {
            correlationId,
            error: error.message
        });
    }
}

/**
 * Envía alerta crítica (email, SMS, etc.)
 * @param {String} eventType - Tipo de evento
 * @param {Object} eventData - Datos del evento
 * @param {String} correlationId - ID de correlación
 */
async function sendCriticalAlert(eventType, eventData, correlationId) {
    try {
        log.warn('CRITICAL SECURITY EVENT', {
            correlationId,
            eventType,
            eventData
        });
        
        // TODO: Integrar con sistema de alertas (email, Slack, PagerDuty, etc.)
        // Por ahora solo logueamos
        
    } catch (error) {
        log.error('Error sending critical alert', {
            correlationId,
            error: error.message
        });
    }
}

/**
 * Obtiene eventos de auditoría
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Promise<Array>} Lista de eventos
 */
async function getSecurityEvents(filters = {}) {
    try {
        let query = supabase
            .from('security_audit_log')
            .select('*')
            .order('created_at', { ascending: false });
        
        // Aplicar filtros
        if (filters.userId) {
            query = query.eq('user_id', filters.userId);
        }
        
        if (filters.eventType) {
            query = query.eq('event_type', filters.eventType);
        }
        
        if (filters.startDate) {
            query = query.gte('created_at', filters.startDate);
        }
        
        if (filters.endDate) {
            query = query.lte('created_at', filters.endDate);
        }
        
        if (filters.severity) {
            query = query.contains('event_data', { severity: filters.severity });
        }
        
        // Paginación
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const offset = (page - 1) * limit;
        
        query = query.range(offset, offset + limit - 1);
        
        const { data, error } = await query;
        
        if (error) {
            log.error('Error fetching security events', { error: error.message });
            return [];
        }
        
        return data || [];
    } catch (error) {
        log.error('Error in getSecurityEvents', { error: error.message });
        return [];
    }
}

/**
 * Middleware Express para logging automático de eventos
 */
function auditMiddleware(eventType, options = {}) {
    return async (req, res, next) => {
        try {
            const { extractData, severity = SEVERITY_LEVELS.LOW } = options;
            
            // Extraer datos relevantes
            let eventData = {};
            if (typeof extractData === 'function') {
                eventData = extractData(req);
            }
            
            await logSecurityEvent({
                eventType,
                userId: req.user?.user_id,
                eventData,
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.get('user-agent'),
                severity,
                correlationId: req.correlationId
            });
            
            next();
        } catch (error) {
            // No bloqueamos el request si falla el audit
            log.error('Audit middleware error', {
                correlationId: req.correlationId,
                error: error.message
            });
            next();
        }
    };
}

module.exports = {
    AUDIT_EVENTS,
    SEVERITY_LEVELS,
    logSecurityEvent,
    logLoginAttempt,
    checkSuspiciousLoginActivity,
    getSecurityEvents,
    auditMiddleware
};
