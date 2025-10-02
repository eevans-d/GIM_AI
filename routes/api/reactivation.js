/**
 * PROMPT 12: REACTIVATION API ROUTES
 * Endpoints para gestión de campañas de reactivación
 */

const express = require('express');
const router = express.Router();
const reactivationService = require('../../services/reactivation-service');
const logger = require('../../utils/logger').createLogger('reactivation-routes');
const { AppError, ErrorTypes } = require('../../utils/error-handler');

/**
 * POST /api/reactivation/detect
 * Ejecuta detección diaria de miembros inactivos
 */
router.post('/detect', async (req, res, next) => {
    const correlationId = req.correlationId;
    
    try {
        const result = await reactivationService.runDailyInactiveDetection({ correlationId });
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/reactivation/campaigns
 * Crea campaña de reactivación manual para un miembro
 */
router.post('/campaigns', async (req, res, next) => {
    const { member_id, days_inactive, last_checkin, favorite_class } = req.body;
    
    try {
        if (!member_id) {
            throw new AppError('member_id es requerido', ErrorTypes.VALIDATION, 400);
        }
        
        const campaign = await reactivationService.createCampaign({
            memberId: member_id,
            daysInactive: days_inactive,
            lastCheckin: last_checkin,
            favoriteClass: favorite_class
        });
        
        res.status(201).json({
            success: true,
            data: campaign
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/reactivation/campaigns/:id/send
 * Envía siguiente mensaje en la secuencia
 */
router.post('/campaigns/:id/send', async (req, res, next) => {
    const { id } = req.params;
    
    try {
        const result = await reactivationService.sendNextMessage(id);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/reactivation/campaigns/:id/reactivate
 * Registra que el miembro se reactivó
 */
router.post('/campaigns/:id/reactivate', async (req, res, next) => {
    const { id } = req.params;
    const { member_id } = req.body;
    
    try {
        const result = await reactivationService.recordReactivation(member_id, id);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/reactivation/stats
 * Obtiene estadísticas de reactivación
 */
router.get('/stats', async (req, res, next) => {
    try {
        const stats = await reactivationService.getReactivationStats();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
