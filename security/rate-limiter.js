/**
 * PROMPT 19: ADVANCED RATE LIMITING
 * Sistema avanzado de rate limiting con múltiples estrategias
 */

const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');
const Redis = require('redis');
const { AppError, ErrorTypes } = require('../utils/error-handler');
const log = require('../utils/logger').createLogger('rate-limiter');

// Redis client
let redisClient;
try {
    redisClient = Redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        enableOfflineQueue: false
    });
    redisClient.connect();
} catch (error) {
    log.warn('Redis not available, using memory-based rate limiter', { error: error.message });
}

/**
 * Rate limiters por tipo
 */
const limiters = {
    // API general: 100 requests/minute
    api: null,
    
    // Login: 5 intentos/15 minutos
    login: null,
    
    // Check-in: 10 check-ins/día por usuario
    checkin: null,
    
    // WhatsApp: 2 mensajes/día por usuario (ya implementado en whatsapp/client)
    whatsapp: null,
    
    // Dashboard: 60 requests/minute
    dashboard: null,
    
    // Instructor panel: 30 requests/minute
    instructorPanel: null,
    
    // QR generation: 5 QR codes/hora por IP
    qrGeneration: null,
    
    // Survey submission: 3 surveys/día por usuario
    surveySubmission: null
};

/**
 * Inicializa los rate limiters
 */
function initializeRateLimiters() {
    const useRedis = redisClient !== null;
    
    // API general
    limiters.api = useRedis 
        ? new RateLimiterRedis({
            storeClient: redisClient,
            keyPrefix: 'rl:api',
            points: 100, // 100 requests
            duration: 60, // per 60 seconds
            blockDuration: 60 // Block for 60 seconds
        })
        : new RateLimiterMemory({
            points: 100,
            duration: 60,
            blockDuration: 60
        });
    
    // Login
    limiters.login = useRedis
        ? new RateLimiterRedis({
            storeClient: redisClient,
            keyPrefix: 'rl:login',
            points: 5, // 5 attempts
            duration: 900, // per 15 minutes
            blockDuration: 900 // Block for 15 minutes
        })
        : new RateLimiterMemory({
            points: 5,
            duration: 900,
            blockDuration: 900
        });
    
    // Check-in
    limiters.checkin = useRedis
        ? new RateLimiterRedis({
            storeClient: redisClient,
            keyPrefix: 'rl:checkin',
            points: 10, // 10 check-ins
            duration: 86400, // per day
            blockDuration: 3600 // Block for 1 hour
        })
        : new RateLimiterMemory({
            points: 10,
            duration: 86400,
            blockDuration: 3600
        });
    
    // WhatsApp
    limiters.whatsapp = useRedis
        ? new RateLimiterRedis({
            storeClient: redisClient,
            keyPrefix: 'rl:whatsapp',
            points: 2, // 2 messages
            duration: 86400, // per day
            blockDuration: 86400 // Block for 1 day
        })
        : new RateLimiterMemory({
            points: 2,
            duration: 86400,
            blockDuration: 86400
        });
    
    // Dashboard
    limiters.dashboard = useRedis
        ? new RateLimiterRedis({
            storeClient: redisClient,
            keyPrefix: 'rl:dashboard',
            points: 60, // 60 requests
            duration: 60, // per minute
            blockDuration: 60
        })
        : new RateLimiterMemory({
            points: 60,
            duration: 60,
            blockDuration: 60
        });
    
    // Instructor panel
    limiters.instructorPanel = useRedis
        ? new RateLimiterRedis({
            storeClient: redisClient,
            keyPrefix: 'rl:instructor',
            points: 30, // 30 requests
            duration: 60, // per minute
            blockDuration: 60
        })
        : new RateLimiterMemory({
            points: 30,
            duration: 60,
            blockDuration: 60
        });
    
    // QR generation
    limiters.qrGeneration = useRedis
        ? new RateLimiterRedis({
            storeClient: redisClient,
            keyPrefix: 'rl:qr',
            points: 5, // 5 QR codes
            duration: 3600, // per hour
            blockDuration: 3600
        })
        : new RateLimiterMemory({
            points: 5,
            duration: 3600,
            blockDuration: 3600
        });
    
    // Survey submission
    limiters.surveySubmission = useRedis
        ? new RateLimiterRedis({
            storeClient: redisClient,
            keyPrefix: 'rl:survey',
            points: 3, // 3 surveys
            duration: 86400, // per day
            blockDuration: 3600
        })
        : new RateLimiterMemory({
            points: 3,
            duration: 86400,
            blockDuration: 3600
        });
    
    log.info('Rate limiters initialized', { useRedis });
}

/**
 * Consume un rate limit
 * @param {String} limiterName - Nombre del limiter
 * @param {String} key - Key única para el rate limit (ej: IP, user_id)
 * @param {Number} points - Puntos a consumir (default: 1)
 * @returns {Promise<Object>} Resultado del rate limit
 */
async function consumeRateLimit(limiterName, key, points = 1) {
    const limiter = limiters[limiterName];
    if (!limiter) {
        log.error('Rate limiter not found', { limiterName });
        return { allowed: true }; // Fail open
    }
    
    try {
        const result = await limiter.consume(key, points);
        
        return {
            allowed: true,
            remainingPoints: result.remainingPoints,
            msBeforeNext: result.msBeforeNext,
            consumedPoints: result.consumedPoints,
            isFirstInDuration: result.isFirstInDuration
        };
    } catch (error) {
        if (error instanceof Error && error.name === 'RateLimiterRes') {
            // Rate limit exceeded
            log.warn('Rate limit exceeded', {
                limiterName,
                key,
                remainingPoints: error.remainingPoints,
                msBeforeNext: error.msBeforeNext
            });
            
            return {
                allowed: false,
                remainingPoints: error.remainingPoints,
                msBeforeNext: error.msBeforeNext,
                retryAfter: Math.ceil(error.msBeforeNext / 1000)
            };
        }
        
        // Error no relacionado con rate limit
        log.error('Rate limiter error', { error: error.message, limiterName, key });
        return { allowed: true }; // Fail open en caso de error
    }
}

/**
 * Middleware Express para rate limiting
 * @param {String} limiterName - Nombre del limiter a usar
 * @param {Function} keyExtractor - Función para extraer la key del request (default: IP)
 * @returns {Function} Middleware Express
 */
function rateLimitMiddleware(limiterName, keyExtractor = null) {
    return async (req, res, next) => {
        try {
            // Extraer key
            const key = keyExtractor 
                ? keyExtractor(req) 
                : req.ip || req.connection.remoteAddress;
            
            // Consumir rate limit
            const result = await consumeRateLimit(limiterName, key);
            
            // Agregar headers de rate limit
            res.set({
                'X-RateLimit-Limit': limiters[limiterName]?.points || 'N/A',
                'X-RateLimit-Remaining': result.remainingPoints || 0,
                'X-RateLimit-Reset': result.msBeforeNext 
                    ? new Date(Date.now() + result.msBeforeNext).toISOString()
                    : 'N/A'
            });
            
            if (!result.allowed) {
                res.set('Retry-After', result.retryAfter);
                
                throw new AppError(
                    'Rate limit exceeded',
                    ErrorTypes.RATE_LIMIT_ERROR,
                    429,
                    {
                        retry_after: result.retryAfter,
                        limiter: limiterName
                    }
                );
            }
            
            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Rate limiter específico para API general
 */
const apiRateLimiter = rateLimitMiddleware('api');

/**
 * Rate limiter para login
 */
const loginRateLimiter = rateLimitMiddleware('login', (req) => {
    // Use email/phone + IP for login attempts
    const identifier = req.body.email || req.body.telefono || 'unknown';
    return `${identifier}:${req.ip}`;
});

/**
 * Rate limiter para check-in
 */
const checkinRateLimiter = rateLimitMiddleware('checkin', (req) => {
    // Use member_id from body or QR code
    return req.body.member_id || req.body.qr_code || req.ip;
});

/**
 * Rate limiter para WhatsApp
 */
const whatsappRateLimiter = rateLimitMiddleware('whatsapp', (req) => {
    // Use phone number
    return req.body.phone || req.body.telefono || req.ip;
});

/**
 * Rate limiter para dashboard
 */
const dashboardRateLimiter = rateLimitMiddleware('dashboard');

/**
 * Rate limiter para instructor panel
 */
const instructorPanelRateLimiter = rateLimitMiddleware('instructorPanel', (req) => {
    // Use instructor_id if available
    return req.body.instructor_id || req.user?.instructor_id || req.ip;
});

/**
 * Rate limiter para QR generation
 */
const qrGenerationRateLimiter = rateLimitMiddleware('qrGeneration');

/**
 * Rate limiter para survey submission
 */
const surveySubmissionRateLimiter = rateLimitMiddleware('surveySubmission', (req) => {
    // Use member_id
    return req.body.member_id || req.ip;
});

/**
 * Reset rate limit para un key específico
 * @param {String} limiterName - Nombre del limiter
 * @param {String} key - Key a resetear
 */
async function resetRateLimit(limiterName, key) {
    const limiter = limiters[limiterName];
    if (!limiter) {
        log.error('Rate limiter not found for reset', { limiterName });
        return;
    }
    
    try {
        await limiter.delete(key);
        log.info('Rate limit reset', { limiterName, key });
    } catch (error) {
        log.error('Error resetting rate limit', { error: error.message, limiterName, key });
    }
}

/**
 * Obtiene el estado actual de un rate limit
 * @param {String} limiterName - Nombre del limiter
 * @param {String} key - Key a consultar
 * @returns {Promise<Object>} Estado del rate limit
 */
async function getRateLimitStatus(limiterName, key) {
    const limiter = limiters[limiterName];
    if (!limiter) {
        return { error: 'Limiter not found' };
    }
    
    try {
        const res = await limiter.get(key);
        if (res === null) {
            return { consumed: 0, remaining: limiter.points };
        }
        
        return {
            consumed: res.consumedPoints,
            remaining: res.remainingPoints,
            msBeforeNext: res.msBeforeNext
        };
    } catch (error) {
        log.error('Error getting rate limit status', { error: error.message, limiterName, key });
        return { error: error.message };
    }
}

// Inicializar rate limiters al cargar el módulo
initializeRateLimiters();

module.exports = {
    limiters,
    initializeRateLimiters,
    consumeRateLimit,
    rateLimitMiddleware,
    apiRateLimiter,
    loginRateLimiter,
    checkinRateLimiter,
    whatsappRateLimiter,
    dashboardRateLimiter,
    instructorPanelRateLimiter,
    qrGenerationRateLimiter,
    surveySubmissionRateLimiter,
    resetRateLimit,
    getRateLimitStatus
};
