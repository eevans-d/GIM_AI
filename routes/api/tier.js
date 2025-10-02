/**
 * PROMPT 14: TIER SYSTEM API ROUTES
 * Endpoints para gestión de membresías premium
 */

const express = require('express');
const router = express.Router();
const tierService = require('../../services/tier-service');
const logger = require('../../utils/logger').createLogger('tier-routes');
const { AppError, ErrorTypes } = require('../../utils/error-handler');

/**
 * GET /api/tier/current/:member_id
 * Obtiene tier actual de un miembro
 */
router.get('/current/:member_id', async (req, res, next) => {
    const { member_id } = req.params;
    
    try {
        const tier = await tierService.getMemberCurrentTier(member_id);
        
        res.json({
            success: true,
            data: { tier }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/tier/upgrade
 * Upgrade a Plus o Pro
 */
router.post('/upgrade', async (req, res, next) => {
    const { member_id, new_tier, promotional_price } = req.body;
    
    try {
        if (!member_id || !new_tier) {
            throw new AppError(
                'member_id y new_tier son requeridos',
                ErrorTypes.VALIDATION,
                400
            );
        }
        
        if (!['plus', 'pro'].includes(new_tier)) {
            throw new AppError(
                'new_tier debe ser "plus" o "pro"',
                ErrorTypes.VALIDATION,
                400
            );
        }
        
        const result = await tierService.upgradeMemberTier(member_id, new_tier, {
            promotionalPrice: promotional_price
        });
        
        res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/tier/downgrade
 * Downgrade con retention offer
 */
router.post('/downgrade', async (req, res, next) => {
    const { member_id, reason } = req.body;
    
    try {
        if (!member_id) {
            throw new AppError('member_id es requerido', ErrorTypes.VALIDATION, 400);
        }
        
        const result = await tierService.downgradeMemberTier(member_id, reason);
        
        res.json({
            success: true,
            data: result,
            message: 'Retention offer generada. Requiere confirmación.'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/tier/downgrade/confirm
 * Confirma downgrade después de retention offer
 */
router.post('/downgrade/confirm', async (req, res, next) => {
    const { member_id } = req.body;
    
    try {
        if (!member_id) {
            throw new AppError('member_id es requerido', ErrorTypes.VALIDATION, 400);
        }
        
        const result = await tierService.confirmDowngrade(member_id);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/tier/benefits
 * Lista beneficios por tier
 */
router.get('/benefits', async (req, res, next) => {
    const { tier_name } = req.query;
    
    try {
        const benefits = await tierService.getTierBenefits(tier_name);
        
        res.json({
            success: true,
            data: benefits
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/tier/candidates
 * Identifica candidatos para upgrade
 */
router.get('/candidates', async (req, res, next) => {
    const { target_tier } = req.query;
    
    try {
        const candidates = await tierService.identifyUpgradeCandidates(
            target_tier || 'plus'
        );
        
        res.json({
            success: true,
            data: candidates,
            count: candidates.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/tier/coaching-sessions
 * Programa sesión de coaching 1:1
 */
router.post('/coaching-sessions', async (req, res, next) => {
    const { member_id, coach_name, session_date, session_type, duration_minutes } = req.body;
    
    try {
        if (!member_id || !coach_name || !session_date) {
            throw new AppError(
                'member_id, coach_name y session_date son requeridos',
                ErrorTypes.VALIDATION,
                400
            );
        }
        
        const session = await tierService.scheduleCoachingSession(member_id, {
            coach_name,
            session_date,
            session_type,
            duration_minutes
        });
        
        res.status(201).json({
            success: true,
            data: session
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/tier/training-plans
 * Genera plan de entrenamiento adaptativo
 */
router.post('/training-plans', async (req, res, next) => {
    const { member_id, plan_name, goal, duration_weeks, sessions_per_week, plan_details } = req.body;
    
    try {
        if (!member_id || !plan_name || !goal) {
            throw new AppError(
                'member_id, plan_name y goal son requeridos',
                ErrorTypes.VALIDATION,
                400
            );
        }
        
        const plan = await tierService.generateAdaptiveTrainingPlan(member_id, {
            plan_name,
            goal,
            duration_weeks,
            sessions_per_week,
            plan_details
        });
        
        res.status(201).json({
            success: true,
            data: plan
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/tier/stats
 * Estadísticas de conversión y ROI
 */
router.get('/stats', async (req, res, next) => {
    try {
        const stats = await tierService.getTierStats();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
