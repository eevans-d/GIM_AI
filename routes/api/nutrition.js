/**
 * PROMPT 13: NUTRITION API ROUTES
 * Endpoints para tips nutricionales post-entrenamiento
 */

const express = require('express');
const router = express.Router();
const nutritionService = require('../../services/nutrition-service');
const logger = require('../../utils/logger').createLogger('nutrition-routes');
const { AppError, ErrorTypes } = require('../../utils/error-handler');

/**
 * POST /api/nutrition/schedule
 * Programa tip nutricional manualmente
 */
router.post('/schedule', async (req, res, next) => {
    const { checkin_id, member_id, class_type } = req.body;
    
    try {
        if (!checkin_id || !member_id || !class_type) {
            throw new AppError(
                'checkin_id, member_id y class_type son requeridos',
                ErrorTypes.VALIDATION,
                400
            );
        }
        
        const result = await nutritionService.schedulePostWorkoutTip(
            checkin_id,
            member_id,
            class_type
        );
        
        res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/nutrition/history/:member_id
 * Obtiene historial de tips del miembro
 */
router.get('/history/:member_id', async (req, res, next) => {
    const { member_id } = req.params;
    const { limit } = req.query;
    
    try {
        const history = await nutritionService.getMemberHistory(
            member_id,
            limit ? parseInt(limit) : 10
        );
        
        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/nutrition/engagement
 * Registra interacción con tip
 */
router.post('/engagement', async (req, res, next) => {
    const { history_id, type } = req.body;
    
    try {
        if (!history_id || !type) {
            throw new AppError(
                'history_id y type son requeridos',
                ErrorTypes.VALIDATION,
                400
            );
        }
        
        if (!['opened', 'clicked_recipe'].includes(type)) {
            throw new AppError(
                'type debe ser "opened" o "clicked_recipe"',
                ErrorTypes.VALIDATION,
                400
            );
        }
        
        const result = await nutritionService.trackEngagement(history_id, type);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/nutrition/stats
 * Obtiene estadísticas de engagement
 */
router.get('/stats', async (req, res, next) => {
    try {
        const stats = await nutritionService.getEngagementStats();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/nutrition/tips
 * Lista todos los tips disponibles
 */
router.get('/tips', async (req, res, next) => {
    const { class_type } = req.query;
    
    try {
        const tips = await nutritionService.listTips(class_type);
        
        res.json({
            success: true,
            data: tips,
            count: tips.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/nutrition/tips
 * Crea nuevo tip (admin)
 */
router.post('/tips', async (req, res, next) => {
    const tipData = req.body;
    
    try {
        const tip = await nutritionService.createTip(tipData);
        
        res.status(201).json({
            success: true,
            data: tip
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
