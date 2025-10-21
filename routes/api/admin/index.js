/**
 * ADMIN ROUTES
 * Central hub for all admin dashboard endpoints
 * SEMANA 2 - UX Improvement #1: Admin Command Center Backend
 */

const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { AppError, ErrorTypes } = require('../../../utils/error-handler');
const logger = require('../../../utils/logger').createLogger('admin-routes');

const adminQueries = require('./admin-queries');

const router = express.Router();

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Validate admin routes (check authorization, etc.)
 * TODO: Add JWT verification for admin role
 */
router.use((req, res, next) => {
    // For now, allow all - TODO: Add admin authentication check
    req.adminContext = {
        correlationId: req.correlationId,
        timestamp: new Date().toISOString()
    };
    next();
});

/**
 * Error handling middleware for admin routes
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn('Validation error', {
            correlationId: req.correlationId,
            errors: errors.array()
        });
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};

// ============================================================================
// METRICS ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/metrics/dashboard
 * Get comprehensive dashboard metrics
 */
router.get('/metrics/dashboard', async (req, res, next) => {
    try {
        logger.info('Metrics dashboard requested', { 
            correlationId: req.correlationId 
        });

        const metrics = await adminQueries.getDashboardMetrics(req.correlationId);

        res.json({
            success: true,
            data: metrics,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        next(error);
    }
});

// ============================================================================
// CLASSES ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/classes/list
 * Get all classes with occupancy info
 */
router.get('/classes/list', async (req, res, next) => {
    try {
        logger.info('Classes list requested', { correlationId: req.correlationId });

        const classes = await adminQueries.getClassesList(req.correlationId);

        res.json({
            success: true,
            data: classes,
            count: classes.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/classes/:id/pause
 * Pause a specific class
 */
router.post(
    '/classes/:id/pause',
    param('id').isUUID().withMessage('Invalid class ID'),
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const classId = req.params.id;
            logger.info('Class pause requested', { correlationId: req.correlationId, classId });

            const updatedClass = await adminQueries.pauseClass(classId, req.correlationId);

            res.json({
                success: true,
                data: updatedClass,
                message: 'Class paused successfully',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/admin/classes/:id/resume
 * Resume a specific class
 */
router.post(
    '/classes/:id/resume',
    param('id').isUUID().withMessage('Invalid class ID'),
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const classId = req.params.id;
            logger.info('Class resume requested', { correlationId: req.correlationId, classId });

            const updatedClass = await adminQueries.resumeClass(classId, req.correlationId);

            res.json({
                success: true,
                data: updatedClass,
                message: 'Class resumed successfully',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            next(error);
        }
    }
);

// ============================================================================
// MEMBERS ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/members/list
 * Get members with optional filtering
 * Query params: filter=all|active|inactive|debt
 */
router.get(
    '/members/list',
    query('filter')
        .optional()
        .isIn(['all', 'active', 'inactive', 'debt'])
        .withMessage('Invalid filter value'),
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const filter = req.query.filter || 'all';
            logger.info('Members list requested', { 
                correlationId: req.correlationId, 
                filter 
            });

            const members = await adminQueries.getMembersList(filter, req.correlationId);

            res.json({
                success: true,
                data: members,
                count: members.length,
                filter,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            next(error);
        }
    }
);

// ============================================================================
// PAYMENTS ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/payments/pending
 * Get pending payments
 */
router.get('/payments/pending', async (req, res, next) => {
    try {
        logger.info('Pending payments requested', { correlationId: req.correlationId });

        const payments = await adminQueries.getPendingPayments(req.correlationId);

        // Calculate totals
        const totalAmount = payments.reduce((sum, p) => sum + (p.monto || 0), 0);

        res.json({
            success: true,
            data: payments,
            count: payments.length,
            totalAmount: Math.round(totalAmount),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/reminders/send-batch
 * Send batch reminders to members with pending payments
 */
router.post('/reminders/send-batch', async (req, res, next) => {
    try {
        logger.info('Batch reminders requested', { correlationId: req.correlationId });

        // TODO: Integrate with WhatsApp sender queue
        // This is a placeholder for now
        const mockResult = {
            success: true,
            sent: 0,
            failed: 0,
            message: 'Batch reminder task queued for processing'
        };

        res.json({
            success: true,
            data: mockResult,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        next(error);
    }
});

// ============================================================================
// REPORTS ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/reports/list
 * Get list of previously generated reports
 */
router.get('/reports/list', async (req, res, next) => {
    try {
        logger.info('Reports list requested', { correlationId: req.correlationId });

        const reports = await adminQueries.getReportsList(req.correlationId);

        res.json({
            success: true,
            data: reports,
            count: reports.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/reports/generate
 * Generate new report
 */
router.post(
    '/reports/generate',
    body('type')
        .notEmpty()
        .isIn(['revenue', 'engagement', 'payments', 'classes'])
        .withMessage('Invalid report type'),
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const { type } = req.body;
            logger.info('Report generation requested', { 
                correlationId: req.correlationId, 
                type 
            });

            // TODO: Queue report generation job
            const mockReport = {
                id: `report_${Date.now()}`,
                type,
                status: 'queued',
                createdAt: new Date().toISOString(),
                message: 'Report generation queued for processing'
            };

            res.json({
                success: true,
                data: mockReport,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            next(error);
        }
    }
);

// ============================================================================
// QUICK ACTIONS ENDPOINTS
// ============================================================================

/**
 * POST /api/admin/classes/pause-all
 * Emergency: Pause all classes
 */
router.post('/classes/pause-all', async (req, res, next) => {
    try {
        logger.warn('Pause all classes requested - EMERGENCY ACTION', { 
            correlationId: req.correlationId 
        });

        // TODO: Implement pause all logic
        const mockResult = {
            success: true,
            paused: 0,
            message: 'Pause all classes queued for processing'
        };

        res.json({
            success: true,
            data: mockResult,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/backup
 * Trigger data backup
 */
router.post('/backup', async (req, res, next) => {
    try {
        logger.info('Backup requested', { correlationId: req.correlationId });

        // TODO: Queue backup job
        const mockBackup = {
            success: true,
            status: 'queued',
            message: 'Backup task queued for processing'
        };

        res.json({
            success: true,
            data: mockBackup,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        next(error);
    }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

router.use((error, req, res, next) => {
    logger.error('Admin route error', {
        correlationId: req.correlationId,
        error: error.message,
        stack: error.stack
    });

    // Handle AppError instances
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            success: false,
            error: error.message,
            type: error.errorType,
            details: error.details
        });
    }

    // Generic error handler
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

module.exports = router;
