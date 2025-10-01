/**
 * PROMPT 19: SECURITY HEADERS & CORS
 * Configuración de headers de seguridad con Helmet y CORS
 */

const helmet = require('helmet');
const cors = require('cors');
const log = require('../utils/logger').createLogger('security-headers');

/**
 * Orígenes permitidos para CORS (configurables por entorno)
 */
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .filter(Boolean)
    .concat([
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173', // Vite dev server
        'https://gim-ai.com',
        'https://www.gim-ai.com'
    ]);

/**
 * Configuración de CORS
 */
const corsOptions = {
    origin: (origin, callback) => {
        // Permitir requests sin origin (como apps móviles o Postman)
        if (!origin) {
            return callback(null, true);
        }
        
        // Verificar si el origin está en la lista permitida
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            log.warn('CORS blocked origin', { origin });
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Correlation-ID'
    ],
    exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'Retry-After'
    ],
    maxAge: 86400 // 24 horas
};

/**
 * Configuración de Helmet (headers de seguridad)
 */
const helmetConfig = {
    // Content Security Policy
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline para desarrollo, remover en producción
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.whatsapp.com", process.env.SUPABASE_URL],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    
    // HTTP Strict Transport Security
    hsts: {
        maxAge: 31536000, // 1 año
        includeSubDomains: true,
        preload: true
    },
    
    // X-Frame-Options
    frameguard: {
        action: 'deny'
    },
    
    // X-Content-Type-Options
    noSniff: true,
    
    // X-XSS-Protection (legacy, pero aún útil)
    xssFilter: true,
    
    // Referrer-Policy
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    },
    
    // Permissions-Policy (antes Feature-Policy)
    permittedCrossDomainPolicies: {
        permittedPolicies: 'none'
    }
};

/**
 * Middleware para agregar headers de seguridad personalizados
 */
function customSecurityHeaders(req, res, next) {
    // X-API-Version
    res.setHeader('X-API-Version', process.env.API_VERSION || '1.0.0');
    
    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // X-Download-Options (IE8+)
    res.setHeader('X-Download-Options', 'noopen');
    
    // X-Permitted-Cross-Domain-Policies
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    
    // Permissions-Policy (restringe APIs del navegador)
    res.setHeader('Permissions-Policy', 
        'camera=(), microphone=(), geolocation=(), payment=()');
    
    // Remove X-Powered-By header (ya lo hace Helmet, pero por si acaso)
    res.removeHeader('X-Powered-By');
    
    next();
}

/**
 * Middleware para agregar CORS preflight cache
 */
function handlePreflight(req, res, next) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Max-Age', '86400'); // 24 horas
        return res.status(204).end();
    }
    next();
}

/**
 * Aplica todos los middlewares de seguridad
 * @param {Express} app - Aplicación Express
 */
function applySecurityMiddleware(app) {
    // CORS debe ir primero
    app.use(cors(corsOptions));
    
    // Helmet headers
    app.use(helmet(helmetConfig));
    
    // Headers personalizados
    app.use(customSecurityHeaders);
    
    // Preflight handling
    app.use(handlePreflight);
    
    log.info('Security middleware applied', {
        allowedOrigins: allowedOrigins.length,
        corsEnabled: true,
        helmetEnabled: true
    });
}

/**
 * Configuración de seguridad para desarrollo vs producción
 */
function getSecurityConfig() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    return {
        isProduction,
        // En desarrollo, permitir unsafe-inline para hot reload
        contentSecurityPolicy: isProduction ? helmetConfig.contentSecurityPolicy : {
            directives: {
                ...helmetConfig.contentSecurityPolicy.directives,
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                styleSrc: ["'self'", "'unsafe-inline'"]
            }
        },
        // En desarrollo, permitir todos los orígenes
        corsOrigins: isProduction ? allowedOrigins : '*',
        // En desarrollo, no requerir HTTPS
        hsts: isProduction ? helmetConfig.hsts : false
    };
}

module.exports = {
    applySecurityMiddleware,
    corsOptions,
    helmetConfig,
    customSecurityHeaders,
    getSecurityConfig,
    allowedOrigins
};
