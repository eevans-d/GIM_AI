/**
 * PROMPT 19: JWT AUTHENTICATION
 * Sistema de autenticación con JWT para staff y administradores
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const { AppError, ErrorTypes } = require('../utils/error-handler');
const log = require('../utils/logger').createLogger('jwt-auth');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Roles del sistema
 */
const ROLES = {
    ADMIN: 'admin',
    STAFF: 'staff',
    INSTRUCTOR: 'instructor',
    MEMBER: 'member'
};

/**
 * Permisos por rol
 */
const PERMISSIONS = {
    [ROLES.ADMIN]: [
        'read:all',
        'write:all',
        'delete:all',
        'manage:users',
        'manage:classes',
        'manage:payments',
        'view:dashboard',
        'manage:settings'
    ],
    [ROLES.STAFF]: [
        'read:members',
        'read:classes',
        'read:checkins',
        'write:checkins',
        'read:payments',
        'write:payments',
        'view:dashboard'
    ],
    [ROLES.INSTRUCTOR]: [
        'read:classes',
        'read:checkins',
        'write:checkins',
        'manage:sessions',
        'view:instructor-panel'
    ],
    [ROLES.MEMBER]: [
        'read:own-profile',
        'read:classes',
        'write:checkins',
        'read:own-payments'
    ]
};

/**
 * Genera un token JWT
 * @param {Object} payload - Datos del usuario
 * @param {String} expiresIn - Tiempo de expiración
 * @returns {String} JWT token
 */
function generateToken(payload, expiresIn = JWT_EXPIRES_IN) {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn,
        issuer: 'gim-ai',
        audience: 'gim-ai-client'
    });
}

/**
 * Verifica un token JWT
 * @param {String} token - Token a verificar
 * @returns {Object} Payload decodificado
 * @throws {AppError} Si el token es inválido
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET, {
            issuer: 'gim-ai',
            audience: 'gim-ai-client'
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new AppError('Token expired', ErrorTypes.AUTHENTICATION_ERROR, 401);
        }
        if (error.name === 'JsonWebTokenError') {
            throw new AppError('Invalid token', ErrorTypes.AUTHENTICATION_ERROR, 401);
        }
        throw new AppError('Token verification failed', ErrorTypes.AUTHENTICATION_ERROR, 401);
    }
}

/**
 * Hash de password con bcrypt
 * @param {String} password - Password en texto plano
 * @returns {Promise<String>} Password hasheado
 */
async function hashPassword(password) {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
}

/**
 * Verifica un password contra su hash
 * @param {String} password - Password en texto plano
 * @param {String} hash - Hash almacenado
 * @returns {Promise<Boolean>} True si coincide
 */
async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}

/**
 * Autentica un usuario por email y password
 * @param {String} email - Email del usuario
 * @param {String} password - Password del usuario
 * @param {String} correlationId - ID de correlación
 * @returns {Promise<Object>} Usuario autenticado con tokens
 * @throws {AppError} Si las credenciales son inválidas
 */
async function authenticateUser(email, password, correlationId) {
    log.info('Authentication attempt', { correlationId, email });
    
    // Buscar usuario en base de datos
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
    
    if (error || !user) {
        log.warn('User not found', { correlationId, email });
        throw new AppError('Invalid credentials', ErrorTypes.AUTHENTICATION_ERROR, 401);
    }
    
    // Verificar que el usuario esté activo
    if (!user.activo) {
        log.warn('Inactive user attempted login', { correlationId, email, user_id: user.id });
        throw new AppError('Account is inactive', ErrorTypes.AUTHENTICATION_ERROR, 403);
    }
    
    // Verificar password
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
        log.warn('Invalid password', { correlationId, email, user_id: user.id });
        throw new AppError('Invalid credentials', ErrorTypes.AUTHENTICATION_ERROR, 401);
    }
    
    // Generar tokens
    const payload = {
        user_id: user.id,
        email: user.email,
        role: user.role,
        permissions: PERMISSIONS[user.role] || []
    };
    
    const accessToken = generateToken(payload, JWT_EXPIRES_IN);
    const refreshToken = generateToken({ user_id: user.id }, JWT_REFRESH_EXPIRES_IN);
    
    // Actualizar último login
    await supabase
        .from('users')
        .update({ ultimo_login: new Date().toISOString() })
        .eq('id', user.id);
    
    log.info('User authenticated successfully', {
        correlationId,
        user_id: user.id,
        email: user.email,
        role: user.role
    });
    
    return {
        user: {
            id: user.id,
            email: user.email,
            nombre: user.nombre,
            role: user.role,
            permissions: payload.permissions
        },
        accessToken,
        refreshToken,
        expiresIn: JWT_EXPIRES_IN
    };
}

/**
 * Refresca un access token usando un refresh token
 * @param {String} refreshToken - Refresh token
 * @returns {Promise<Object>} Nuevo access token
 * @throws {AppError} Si el refresh token es inválido
 */
async function refreshAccessToken(refreshToken) {
    // Verificar refresh token
    const decoded = verifyToken(refreshToken);
    
    // Buscar usuario
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.user_id)
        .single();
    
    if (error || !user) {
        throw new AppError('User not found', ErrorTypes.AUTHENTICATION_ERROR, 401);
    }
    
    if (!user.activo) {
        throw new AppError('Account is inactive', ErrorTypes.AUTHENTICATION_ERROR, 403);
    }
    
    // Generar nuevo access token
    const payload = {
        user_id: user.id,
        email: user.email,
        role: user.role,
        permissions: PERMISSIONS[user.role] || []
    };
    
    const accessToken = generateToken(payload, JWT_EXPIRES_IN);
    
    return {
        accessToken,
        expiresIn: JWT_EXPIRES_IN
    };
}

/**
 * Middleware Express para verificar JWT
 * @returns {Function} Middleware Express
 */
function authenticateJWT() {
    return async (req, res, next) => {
        try {
            // Extraer token del header Authorization
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                throw new AppError('No token provided', ErrorTypes.AUTHENTICATION_ERROR, 401);
            }
            
            const [bearer, token] = authHeader.split(' ');
            if (bearer !== 'Bearer' || !token) {
                throw new AppError('Invalid token format', ErrorTypes.AUTHENTICATION_ERROR, 401);
            }
            
            // Verificar token
            const decoded = verifyToken(token);
            
            // Agregar usuario al request
            req.user = decoded;
            
            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Middleware Express para verificar rol
 * @param {String|Array<String>} allowedRoles - Rol o roles permitidos
 * @returns {Function} Middleware Express
 */
function requireRole(allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new AppError('Authentication required', ErrorTypes.AUTHENTICATION_ERROR, 401);
            }
            
            if (!roles.includes(req.user.role)) {
                log.warn('Insufficient permissions', {
                    correlationId: req.correlationId,
                    user_id: req.user.user_id,
                    required_roles: roles,
                    user_role: req.user.role
                });
                
                throw new AppError(
                    'Insufficient permissions',
                    ErrorTypes.AUTHORIZATION_ERROR,
                    403,
                    { required_roles: roles, user_role: req.user.role }
                );
            }
            
            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Middleware Express para verificar permisos específicos
 * @param {String|Array<String>} requiredPermissions - Permiso o permisos requeridos
 * @returns {Function} Middleware Express
 */
function requirePermission(requiredPermissions) {
    const permissions = Array.isArray(requiredPermissions) 
        ? requiredPermissions 
        : [requiredPermissions];
    
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new AppError('Authentication required', ErrorTypes.AUTHENTICATION_ERROR, 401);
            }
            
            const userPermissions = req.user.permissions || [];
            const hasPermission = permissions.some(perm => 
                userPermissions.includes(perm) || userPermissions.includes('*')
            );
            
            if (!hasPermission) {
                log.warn('Missing required permissions', {
                    correlationId: req.correlationId,
                    user_id: req.user.user_id,
                    required_permissions: permissions,
                    user_permissions: userPermissions
                });
                
                throw new AppError(
                    'Missing required permissions',
                    ErrorTypes.AUTHORIZATION_ERROR,
                    403,
                    { required_permissions: permissions }
                );
            }
            
            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Crea un nuevo usuario (solo admin)
 * @param {Object} userData - Datos del usuario
 * @param {String} correlationId - ID de correlación
 * @returns {Promise<Object>} Usuario creado
 */
async function createUser(userData, correlationId) {
    const { email, password, nombre, apellido, role } = userData;
    
    // Verificar que el rol sea válido
    if (!Object.values(ROLES).includes(role)) {
        throw new AppError('Invalid role', ErrorTypes.VALIDATION_ERROR, 400);
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Crear usuario
    const { data: user, error } = await supabase
        .from('users')
        .insert({
            email: email.toLowerCase(),
            password_hash: passwordHash,
            nombre,
            apellido,
            role,
            activo: true
        })
        .select()
        .single();
    
    if (error) {
        log.error('Error creating user', { correlationId, error: error.message, email });
        throw new AppError('Failed to create user', ErrorTypes.DATABASE_ERROR, 500);
    }
    
    log.info('User created successfully', {
        correlationId,
        user_id: user.id,
        email: user.email,
        role: user.role
    });
    
    return {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        role: user.role,
        activo: user.activo
    };
}

/**
 * Cambia el password de un usuario
 * @param {String} userId - ID del usuario
 * @param {String} oldPassword - Password actual
 * @param {String} newPassword - Nuevo password
 * @param {String} correlationId - ID de correlación
 * @returns {Promise<Boolean>} True si el cambio fue exitoso
 */
async function changePassword(userId, oldPassword, newPassword, correlationId) {
    // Buscar usuario
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (error || !user) {
        throw new AppError('User not found', ErrorTypes.NOT_FOUND, 404);
    }
    
    // Verificar password actual
    const isPasswordValid = await verifyPassword(oldPassword, user.password_hash);
    if (!isPasswordValid) {
        throw new AppError('Invalid current password', ErrorTypes.AUTHENTICATION_ERROR, 401);
    }
    
    // Hash nuevo password
    const newPasswordHash = await hashPassword(newPassword);
    
    // Actualizar password
    const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: newPasswordHash })
        .eq('id', userId);
    
    if (updateError) {
        log.error('Error changing password', {
            correlationId,
            user_id: userId,
            error: updateError.message
        });
        throw new AppError('Failed to change password', ErrorTypes.DATABASE_ERROR, 500);
    }
    
    log.info('Password changed successfully', { correlationId, user_id: userId });
    
    return true;
}

module.exports = {
    ROLES,
    PERMISSIONS,
    generateToken,
    verifyToken,
    hashPassword,
    verifyPassword,
    authenticateUser,
    refreshAccessToken,
    authenticateJWT,
    requireRole,
    requirePermission,
    createUser,
    changePassword
};
