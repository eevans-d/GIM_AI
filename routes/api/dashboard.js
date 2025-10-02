/**
 * PROMPT 15: DASHBOARD API ROUTES
 * Rutas REST para Executive Dashboard
 * Endpoints para KPIs, decisiones, alertas, snapshots, trends, drill-down
 */

const express = require('express');
const router = express.Router();
const dashboardService = require('../../services/dashboard-service');
const aiDecisionService = require('../../services/ai-decision-service');
const { AppError, ErrorTypes } = require('../../utils/error-handler');
const logger = require('../../utils/logger').createLogger('dashboard-api');

// ============================================================================
// KPIs EN TIEMPO REAL
// ============================================================================

/**
 * GET /api/dashboard/kpis/realtime
 * Obtener todos los KPIs consolidados del día
 */
router.get('/kpis/realtime', async (req, res, next) => {
    try {
        const kpis = await dashboardService.getTodayKPIs(req.correlationId);
        
        res.json({
            success: true,
            data: kpis,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/dashboard/kpis/financial
 * KPIs financieros del día
 */
router.get('/kpis/financial', async (req, res, next) => {
    try {
        const kpis = await dashboardService.getFinancialKPIs(req.correlationId);
        res.json({ success: true, data: kpis });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/dashboard/kpis/operational
 * KPIs operacionales del día
 */
router.get('/kpis/operational', async (req, res, next) => {
    try {
        const kpis = await dashboardService.getOperationalKPIs(req.correlationId);
        res.json({ success: true, data: kpis });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/dashboard/kpis/satisfaction
 * KPIs de satisfacción (últimos 7 días)
 */
router.get('/kpis/satisfaction', async (req, res, next) => {
    try {
        const kpis = await dashboardService.getSatisfactionKPIs(req.correlationId);
        res.json({ success: true, data: kpis });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/dashboard/kpis/retention
 * KPIs de retención (últimos 30 días)
 */
router.get('/kpis/retention', async (req, res, next) => {
    try {
        const kpis = await dashboardService.getRetentionKPIs(req.correlationId);
        res.json({ success: true, data: kpis });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/dashboard/kpis/vs-targets
 * Comparar KPIs actuales vs objetivos configurados
 */
router.get('/kpis/vs-targets', async (req, res, next) => {
    try {
        const comparison = await dashboardService.compareKPIsVsTargets(req.correlationId);
        
        res.json({
            success: true,
            data: comparison,
            summary: {
                total: comparison.length,
                ok: comparison.filter(k => k.status === 'ok').length,
                warning: comparison.filter(k => k.status === 'warning').length,
                critical: comparison.filter(k => k.status === 'critical').length
            }
        });
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// DECISIONES PRIORITARIAS (IA)
// ============================================================================

/**
 * GET /api/dashboard/decisions/today
 * Obtener decisiones prioritarias del día generadas por IA
 */
router.get('/decisions/today', async (req, res, next) => {
    try {
        const decisions = await aiDecisionService.getTodayDecisions(req.correlationId);
        
        res.json({
            success: true,
            data: decisions,
            count: decisions.length,
            pending: decisions.filter(d => d.status === 'pending').length,
            completed: decisions.filter(d => d.status === 'completed').length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/dashboard/decisions/:decisionId/complete
 * Marcar decisión como completada
 * Body: { completion_notes: string }
 */
router.post('/decisions/:decisionId/complete', async (req, res, next) => {
    try {
        const { decisionId } = req.params;
        const { completion_notes } = req.body;

        if (!completion_notes) {
            throw new AppError(
                'completion_notes es requerido',
                ErrorTypes.VALIDATION_ERROR,
                400
            );
        }

        const updated = await aiDecisionService.completeDecision(
            decisionId,
            completion_notes,
            req.correlationId
        );

        res.json({
            success: true,
            message: 'Decisión completada exitosamente',
            data: updated
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/dashboard/decisions/:decisionId/dismiss
 * Descartar decisión con justificación
 * Body: { reason: string }
 */
router.post('/decisions/:decisionId/dismiss', async (req, res, next) => {
    try {
        const { decisionId } = req.params;
        const { reason } = req.body;

        if (!reason) {
            throw new AppError(
                'reason es requerido',
                ErrorTypes.VALIDATION_ERROR,
                400
            );
        }

        const updated = await aiDecisionService.dismissDecision(
            decisionId,
            reason,
            req.correlationId
        );

        res.json({
            success: true,
            message: 'Decisión descartada',
            data: updated
        });
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// ALERTAS
// ============================================================================

/**
 * GET /api/dashboard/alerts/active
 * Obtener alertas activas (opcionalmente filtradas por severidad)
 * Query params: ?severity=critical|high|medium|low
 */
router.get('/alerts/active', async (req, res, next) => {
    try {
        const { severity } = req.query;
        
        const alerts = await dashboardService.getActiveAlerts(
            severity || null,
            req.correlationId
        );

        res.json({
            success: true,
            data: alerts,
            count: alerts.length,
            bySeverity: {
                critical: alerts.filter(a => a.severity === 'critical').length,
                high: alerts.filter(a => a.severity === 'high').length,
                medium: alerts.filter(a => a.severity === 'medium').length,
                low: alerts.filter(a => a.severity === 'low').length
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/dashboard/alerts/detect
 * Detectar alertas críticas manualmente
 */
router.post('/alerts/detect', async (req, res, next) => {
    try {
        const newAlertsCount = await dashboardService.detectCriticalAlerts(req.correlationId);
        
        res.json({
            success: true,
            message: 'Detección de alertas ejecutada',
            newAlertsCount
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/dashboard/alerts/:alertId/dismiss
 * Descartar alerta manualmente
 * Body: { dismissed_by: string, reason: string }
 */
router.post('/alerts/:alertId/dismiss', async (req, res, next) => {
    try {
        const { alertId } = req.params;
        const { dismissed_by, reason } = req.body;

        if (!dismissed_by || !reason) {
            throw new AppError(
                'dismissed_by y reason son requeridos',
                ErrorTypes.VALIDATION_ERROR,
                400
            );
        }

        const updated = await dashboardService.dismissAlert(
            alertId,
            dismissed_by,
            reason,
            req.correlationId
        );

        res.json({
            success: true,
            message: 'Alerta descartada',
            data: updated
        });
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// SNAPSHOTS
// ============================================================================

/**
 * POST /api/dashboard/snapshots/create
 * Crear snapshot diario manualmente (también ejecutado por cron a las 23:59)
 */
router.post('/snapshots/create', async (req, res, next) => {
    try {
        const snapshot = await dashboardService.createDailySnapshot(req.correlationId);
        
        res.json({
            success: true,
            message: 'Snapshot diario creado exitosamente',
            data: snapshot
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/dashboard/snapshots/:date
 * Obtener snapshot de una fecha específica (formato: YYYY-MM-DD)
 */
router.get('/snapshots/:date', async (req, res, next) => {
    try {
        const { date } = req.params;
        
        // Validar formato de fecha
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            throw new AppError(
                'Formato de fecha inválido. Use YYYY-MM-DD',
                ErrorTypes.VALIDATION_ERROR,
                400
            );
        }

        const snapshot = await dashboardService.getSnapshotByDate(date, req.correlationId);
        
        if (!snapshot) {
            throw new AppError(
                'No existe snapshot para la fecha especificada',
                ErrorTypes.NOT_FOUND,
                404
            );
        }

        res.json({
            success: true,
            data: snapshot
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/dashboard/snapshots/range
 * Obtener snapshots de un rango de fechas
 * Query params: ?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
router.get('/snapshots/range', async (req, res, next) => {
    try {
        const { start, end } = req.query;

        if (!start || !end) {
            throw new AppError(
                'start y end son requeridos',
                ErrorTypes.VALIDATION_ERROR,
                400
            );
        }

        // Validar formato
        if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
            throw new AppError(
                'Formato de fecha inválido. Use YYYY-MM-DD',
                ErrorTypes.VALIDATION_ERROR,
                400
            );
        }

        const snapshots = await dashboardService.getSnapshotsByRange(
            start,
            end,
            req.correlationId
        );

        res.json({
            success: true,
            data: snapshots,
            count: snapshots.length
        });
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// TENDENCIAS
// ============================================================================

/**
 * GET /api/dashboard/trends/:kpiName
 * Obtener tendencia de un KPI específico
 * Query params: ?days=7 (default: 7)
 */
router.get('/trends/:kpiName', async (req, res, next) => {
    try {
        const { kpiName } = req.params;
        const days = parseInt(req.query.days) || 7;

        if (days < 1 || days > 90) {
            throw new AppError(
                'days debe estar entre 1 y 90',
                ErrorTypes.VALIDATION_ERROR,
                400
            );
        }

        const trend = await dashboardService.getKPITrend(
            kpiName,
            days,
            req.correlationId
        );

        res.json({
            success: true,
            data: trend
        });
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// DRILL-DOWN Y DETALLE
// ============================================================================

/**
 * GET /api/dashboard/drilldown/revenue/:date
 * Obtener desglose detallado de ingresos por día
 */
router.get('/drilldown/revenue/:date', async (req, res, next) => {
    try {
        const { date } = req.params;

        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            throw new AppError(
                'Formato de fecha inválido. Use YYYY-MM-DD',
                ErrorTypes.VALIDATION_ERROR,
                400
            );
        }

        const breakdown = await dashboardService.getRevenueBreakdown(
            date,
            req.correlationId
        );

        res.json({
            success: true,
            data: breakdown
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/dashboard/drilldown/debtors
 * Obtener lista de miembros con deuda
 */
router.get('/drilldown/debtors', async (req, res, next) => {
    try {
        const debtors = await dashboardService.getDebtorsList(req.correlationId);

        const totalDebt = debtors.reduce((sum, d) => sum + d.deuda_actual, 0);

        res.json({
            success: true,
            data: debtors,
            count: debtors.length,
            totalDebt: Math.round(totalDebt * 100) / 100
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/dashboard/drilldown/occupancy/:date
 * Obtener detalle de ocupación por clase en una fecha
 */
router.get('/drilldown/occupancy/:date', async (req, res, next) => {
    try {
        const { date } = req.params;

        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            throw new AppError(
                'Formato de fecha inválido. Use YYYY-MM-DD',
                ErrorTypes.VALIDATION_ERROR,
                400
            );
        }

        const classes = await dashboardService.getClassOccupancyDetails(
            date,
            req.correlationId
        );

        const avgOccupancy = classes.length > 0
            ? classes.reduce((sum, c) => sum + c.occupancyPercent, 0) / classes.length
            : 0;

        res.json({
            success: true,
            data: classes,
            count: classes.length,
            avgOccupancy: Math.round(avgOccupancy * 100) / 100
        });
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * POST /api/dashboard/refresh
 * Refrescar vistas materializadas manualmente
 */
router.post('/refresh', async (req, res, next) => {
    try {
        await dashboardService.refreshMaterializedViews(req.correlationId);
        
        res.json({
            success: true,
            message: 'Vistas materializadas refrescadas exitosamente'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/dashboard/health
 * Health check del dashboard
 */
router.get('/health', async (req, res) => {
    try {
        const kpis = await dashboardService.getTodayKPIs(req.correlationId);
        const alerts = await dashboardService.getActiveAlerts(null, req.correlationId);

        res.json({
            success: true,
            status: 'healthy',
            kpisAvailable: Object.keys(kpis).length > 0,
            activeAlerts: alerts.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            error: error.message
        });
    }
});

module.exports = router;
