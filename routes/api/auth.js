/**
 * PROMPT 19: AUTHENTICATION ROUTES
 * Rutas para autenticación y autorización
 */

const express = require('express');
const router = express.Router();
const {
    authenticateUser,
    refreshAccessToken,
    createUser,
    changePassword,
    authenticateJWT,
    requireRole,
    ROLES
} = require('../../security/authentication/jwt-auth');
const { validateBody } = require('../../security/input-validator');
const { loginRateLimiter } = require('../../security/rate-limiter');
const { AppError, ErrorTypes } = require('../../utils/error-handler');
const log = require('../../utils/logger').createLogger('auth-routes');

/**
 * POST /api/auth/login
 * Autenticación de usuario
 */
router.post('/login',
    loginRateLimiter,
    validateBody('login'),
    async (req, res, next) => {
        try {
            const { email, password } = req.body;
            
            const result = await authenticateUser(email, password, req.correlationId);
            
            res.json({
                success: true,
                data: result,
                message: 'Login successful'
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/auth/refresh
 * Refrescar access token
 */
router.post('/refresh',
    async (req, res, next) => {
        try {
            const { refreshToken } = req.body;
            
            if (!refreshToken) {
                throw new AppError('Refresh token required', ErrorTypes.VALIDATION_ERROR, 400);
            }
            
            const result = await refreshAccessToken(refreshToken);
            
            res.json({
                success: true,
                data: result,
                message: 'Token refreshed successfully'
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/auth/change-password
 * Cambiar password (usuario autenticado)
 */
router.post('/change-password',
    authenticateJWT(),
    validateBody('changePassword'),
    async (req, res, next) => {
        try {
            const { oldPassword, newPassword } = req.body;
            const userId = req.user.user_id;
            
            await changePassword(userId, oldPassword, newPassword, req.correlationId);
            
            res.json({
                success: true,
                message: 'Password changed successfully'
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/auth/create-user
 * Crear nuevo usuario (solo admin)
 */
router.post('/create-user',
    authenticateJWT(),
    requireRole(ROLES.ADMIN),
    validateBody('createUser'),
    async (req, res, next) => {
        try {
            const userData = req.body;
            
            const user = await createUser(userData, req.correlationId);
            
            log.info('User created by admin', {
                correlationId: req.correlationId,
                admin_id: req.user.user_id,
                created_user_id: user.id
            });
            
            res.status(201).json({
                success: true,
                data: user,
                message: 'User created successfully'
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/auth/me
 * Obtener información del usuario autenticado
 */
router.get('/me',
    authenticateJWT(),
    async (req, res, next) => {
        try {
            res.json({
                success: true,
                data: {
                    user_id: req.user.user_id,
                    email: req.user.email,
                    role: req.user.role,
                    permissions: req.user.permissions
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
