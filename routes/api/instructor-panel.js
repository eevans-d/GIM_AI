/**
 * PROMPT 10: INSTRUCTOR PANEL API ROUTES
 * Rutas REST para panel móvil de instructores "Mi Clase Ahora"
 * Endpoints: sesiones, check-in rápido, checklists, alertas, dashboard
 */

const express = require('express');
const router = express.Router();
const instructorPanelService = require('../services/instructor-panel-service');
const { AppError, ErrorTypes } = require('../utils/error-handler');
const logger = require('../utils/logger').createLogger('instructor-panel-routes');

// =============================================
// GESTIÓN DE SESIONES
// =============================================

/**
 * POST /api/instructor-panel/sessions/start
 * Iniciar sesión de instructor para una clase
 */
router.post('/sessions/start', async (req, res, next) => {
    try {
        const { instructor_id, clase_id, device_info } = req.body;
        const { correlationId } = req;

        // Validación
        if (!instructor_id || !clase_id) {
            throw new AppError(
                'instructor_id y clase_id son requeridos',
                ErrorTypes.VALIDATION_ERROR,
                400
            );
        }

        const session = await instructorPanelService.startInstructorSession(
            instructor_id,
            clase_id,
            device_info,
            correlationId
        );

        res.status(201).json({
            success: true,
            data: session,
            message: 'Sesión iniciada exitosamente'
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/instructor-panel/sessions/:sessionId
 * Obtener detalles completos de una sesión activa
 */
router.get('/sessions/:sessionId', async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { correlationId } = req;

        const sessionDetails = await instructorPanelService.getSessionDetails(
            sessionId,
            correlationId
        );

        res.json({
            success: true,
            data: sessionDetails
        });

    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/instructor-panel/sessions/:sessionId/end
 * Finalizar sesión de instructor
 */
router.put('/sessions/:sessionId/end', async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { session_notes } = req.body;
        const { correlationId } = req;

        const summary = await instructorPanelService.endInstructorSession(
            sessionId,
            session_notes,
            correlationId
        );

        res.json({
            success: true,
            data: summary,
            message: 'Sesión finalizada exitosamente'
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/instructor-panel/sessions/:sessionId/summary
 * Obtener resumen de sesión
 */
router.get('/sessions/:sessionId/summary', async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { correlationId } = req;

        const summary = await instructorPanelService.getSessionSummary(
            sessionId,
            correlationId
        );

        res.json({
            success: true,
            data: summary
        });

    } catch (error) {
        next(error);
    }
});

// =============================================
// CHECK-IN DE UN TOQUE
// =============================================

/**
 * POST /api/instructor-panel/sessions/:sessionId/checkin
 * Check-in rápido de estudiante con un toque
 */
router.post('/sessions/:sessionId/checkin', async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { member_id, instructor_id, notes } = req.body;
        const { correlationId } = req;

        // Validación
        if (!member_id || !instructor_id) {
            throw new AppError(
                'member_id e instructor_id son requeridos',
                ErrorTypes.VALIDATION_ERROR,
                400
            );
        }

        const attendance = await instructorPanelService.quickCheckinStudent(
            sessionId,
            member_id,
            instructor_id,
            notes,
            correlationId
        );

        res.status(201).json({
            success: true,
            data: attendance,
            message: 'Check-in registrado exitosamente'
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/instructor-panel/sessions/:sessionId/mark-absent
 * Marcar estudiante como ausente
 */
router.post('/sessions/:sessionId/mark-absent', async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { member_id, reason } = req.body;
        const { correlationId } = req;

        if (!member_id) {
            throw new AppError(
                'member_id es requerido',
                ErrorTypes.VALIDATION_ERROR,
                400
            );
        }

        const absence = await instructorPanelService.markStudentAbsent(
            sessionId,
            member_id,
            reason,
            correlationId
        );

        res.status(201).json({
            success: true,
            data: absence,
            message: 'Ausencia registrada'
        });

    } catch (error) {
        next(error);
    }
});

// =============================================
// GESTIÓN DE CHECKLIST
// =============================================

/**
 * GET /api/instructor-panel/sessions/:sessionId/checklist
 * Obtener progreso del checklist
 */
router.get('/sessions/:sessionId/checklist', async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { correlationId } = req;

        const checklist = await instructorPanelService.getChecklistProgress(
            sessionId,
            correlationId
        );

        res.json({
            success: true,
            data: checklist
        });

    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/instructor-panel/sessions/:sessionId/checklist/:itemId/complete
 * Completar item del checklist
 */
router.put('/sessions/:sessionId/checklist/:itemId/complete', async (req, res, next) => {
    try {
        const { sessionId, itemId } = req.params;
        const { instructor_id, notes, issues_found } = req.body;
        const { correlationId } = req;

        if (!instructor_id) {
            throw new AppError(
                'instructor_id es requerido',
                ErrorTypes.VALIDATION_ERROR,
                400
            );
        }

        const result = await instructorPanelService.completeChecklistItem(
            sessionId,
            itemId,
            instructor_id,
            notes,
            issues_found,
            correlationId
        );

        res.json({
            success: true,
            data: result,
            message: result.checklist_fully_completed 
                ? '¡Checklist completo! Listo para comenzar la clase' 
                : 'Item completado'
        });

    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/instructor-panel/sessions/:sessionId/checklist/:itemId/skip
 * Saltar item del checklist
 */
router.put('/sessions/:sessionId/checklist/:itemId/skip', async (req, res, next) => {
    try {
        const { sessionId, itemId } = req.params;
        const { skip_reason } = req.body;
        const { correlationId } = req;

        if (!skip_reason) {
            throw new AppError(
                'skip_reason es requerido',
                ErrorTypes.VALIDATION_ERROR,
                400
            );
        }

        const result = await instructorPanelService.skipChecklistItem(
            sessionId,
            itemId,
            skip_reason,
            correlationId
        );

        res.json({
            success: true,
            data: result,
            message: 'Item saltado'
        });

    } catch (error) {
        next(error);
    }
});

// =============================================
// GESTIÓN DE ALERTAS
// =============================================

/**
 * GET /api/instructor-panel/sessions/:sessionId/alerts
 * Obtener alertas activas de una sesión
 */
router.get('/sessions/:sessionId/alerts', async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { correlationId } = req;

        const alerts = await instructorPanelService.getActiveAlerts(
            sessionId,
            correlationId
        );

        res.json({
            success: true,
            data: alerts,
            count: alerts.length
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/instructor-panel/sessions/:sessionId/alerts
 * Crear alerta manual
 */
router.post('/sessions/:sessionId/alerts', async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { alert_type, message, details, severity } = req.body;
        const { correlationId } = req;

        // Validación
        if (!alert_type || !message) {
            throw new AppError(
                'alert_type y message son requeridos',
                ErrorTypes.VALIDATION_ERROR,
                400
            );
        }

        const validSeverities = ['low', 'medium', 'high', 'critical'];
        if (severity && !validSeverities.includes(severity)) {
            throw new AppError(
                `severity debe ser uno de: ${validSeverities.join(', ')}`,
                ErrorTypes.VALIDATION_ERROR,
                400
            );
        }

        const alert = await instructorPanelService.createAlert(
            sessionId,
            alert_type,
            message,
            details,
            severity || 'medium',
            correlationId
        );

        res.status(201).json({
            success: true,
            data: alert,
            message: 'Alerta creada exitosamente'
        });

    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/instructor-panel/alerts/:alertId/acknowledge
 * Reconocer alerta
 */
router.put('/alerts/:alertId/acknowledge', async (req, res, next) => {
    try {
        const { alertId } = req.params;
        const { instructor_id } = req.body;
        const { correlationId } = req;

        if (!instructor_id) {
            throw new AppError(
                'instructor_id es requerido',
                ErrorTypes.VALIDATION_ERROR,
                400
            );
        }

        const alert = await instructorPanelService.acknowledgeAlert(
            alertId,
            instructor_id,
            correlationId
        );

        res.json({
            success: true,
            data: alert,
            message: 'Alerta reconocida'
        });

    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/instructor-panel/alerts/:alertId/resolve
 * Resolver alerta
 */
router.put('/alerts/:alertId/resolve', async (req, res, next) => {
    try {
        const { alertId } = req.params;
        const { instructor_id, resolution_notes } = req.body;
        const { correlationId } = req;

        if (!instructor_id || !resolution_notes) {
            throw new AppError(
                'instructor_id y resolution_notes son requeridos',
                ErrorTypes.VALIDATION_ERROR,
                400
            );
        }

        const alert = await instructorPanelService.resolveAlert(
            alertId,
            instructor_id,
            resolution_notes,
            correlationId
        );

        res.json({
            success: true,
            data: alert,
            message: 'Alerta resuelta'
        });

    } catch (error) {
        next(error);
    }
});

// =============================================
// DASHBOARD Y ESTADÍSTICAS
// =============================================

/**
 * GET /api/instructor-panel/dashboard/:instructorId
 * Obtener dashboard del instructor con estadísticas
 */
router.get('/dashboard/:instructorId', async (req, res, next) => {
    try {
        const { instructorId } = req.params;
        const { correlationId } = req;

        const dashboard = await instructorPanelService.getInstructorDashboard(
            instructorId,
            correlationId
        );

        res.json({
            success: true,
            data: dashboard
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/instructor-panel/refresh-views
 * Refrescar vistas materializadas (para updates en tiempo real)
 */
router.post('/refresh-views', async (req, res, next) => {
    try {
        const { correlationId } = req;

        await instructorPanelService.refreshMaterializedViews(correlationId);

        res.json({
            success: true,
            message: 'Vistas refrescadas'
        });

    } catch (error) {
        next(error);
    }
});

// =============================================
// HEALTH CHECK
// =============================================

/**
 * GET /api/instructor-panel/health
 * Health check del sistema de panel de instructor
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'instructor-panel',
        status: 'operational',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
