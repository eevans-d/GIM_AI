/**
 * PROMPT 11: VALLEY OPTIMIZATION - API ROUTES
 * Endpoints para gestionar optimización de horarios valle
 */

const express = require('express');
const router = express.Router();
const valleyService = require('../../services/valley-optimization-service');
const logger = require('../../utils/logger').createLogger('valley-api');
const { AppError, ErrorTypes } = require('../../utils/error-handler');

// ============================================================================
// ANÁLISIS Y DETECCIÓN
// ============================================================================

/**
 * POST /api/valley/analyze
 * Ejecuta análisis diario de clases valle
 */
router.post('/analyze', async (req, res, next) => {
    const correlationId = req.correlationId;
    
    try {
        const result = await valleyService.runDailyValleyAnalysis({ correlationId });
        
        res.json({
            success: true,
            message: 'Análisis completado exitosamente',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/valley/detections
 * Obtiene todas las detecciones activas
 */
router.get('/detections', async (req, res, next) => {
    try {
        const detections = await valleyService.getActiveDetections();
        
        res.json({
            success: true,
            data: detections,
            count: detections.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/valley/classes
 * Obtiene vista de todas las clases con métricas de ocupación
 */
router.get('/classes', async (req, res, next) => {
    try {
        const classes = await valleyService.getValleyClassesView();
        
        res.json({
            success: true,
            data: classes,
            count: classes.length
        });
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// PROMOCIONES
// ============================================================================

/**
 * POST /api/valley/promotions
 * Crea una nueva promoción para una clase valle
 */
router.post('/promotions', async (req, res, next) => {
    const correlationId = req.correlationId;
    
    try {
        const {
            detectionId,
            claseId,
            promotionName,
            discountPercentage,
            durationMonths,
            targetSegment
        } = req.body;
        
        if (!detectionId || !claseId || !promotionName) {
            throw new AppError(
                'Faltan parámetros requeridos',
                ErrorTypes.VALIDATION_ERROR,
                400
            );
        }
        
        const promotion = await valleyService.createPromotion({
            detectionId,
            claseId,
            promotionName,
            discountPercentage,
            durationMonths,
            targetSegment,
            correlationId
        });
        
        res.status(201).json({
            success: true,
            message: 'Promoción creada exitosamente',
            data: promotion
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/valley/promotions/:id
 * Obtiene reporte detallado de una promoción
 */
router.get('/promotions/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const report = await valleyService.getPromotionReport(id);
        
        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/valley/promotions/:id/activate
 * Activa una promoción programada
 */
router.put('/promotions/:id/activate', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const promotion = await valleyService.activatePromotion(id);
        
        res.json({
            success: true,
            message: 'Promoción activada',
            data: promotion
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/valley/promotions/:id/target-members
 * Obtiene miembros objetivo para una promoción
 */
router.get('/promotions/:claseId/target-members', async (req, res, next) => {
    try {
        const { claseId } = req.params;
        const { segment = 'never_attended' } = req.query;
        
        const members = await valleyService.getTargetMembers(claseId, segment);
        
        res.json({
            success: true,
            data: members,
            count: members.length
        });
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// RESPUESTAS Y CONVERSIONES
// ============================================================================

/**
 * PUT /api/valley/recipients/:id/response
 * Registra respuesta de un miembro a la promoción
 */
router.put('/recipients/:id/response', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, responseText, whatsappMessageId } = req.body;
        
        const recipient = await valleyService.recordMemberResponse(id, {
            status,
            responseText,
            whatsappMessageId
        });
        
        res.json({
            success: true,
            message: 'Respuesta registrada',
            data: recipient
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/valley/conversions
 * Registra conversión (primera asistencia) de un miembro
 */
router.post('/conversions', async (req, res, next) => {
    try {
        const { memberId, promotionId, attendanceDate } = req.body;
        
        if (!memberId || !promotionId) {
            throw new AppError(
                'memberId y promotionId son requeridos',
                ErrorTypes.VALIDATION_ERROR,
                400
            );
        }
        
        const conversion = await valleyService.recordConversion(
            memberId,
            promotionId,
            attendanceDate || new Date().toISOString()
        );
        
        res.json({
            success: true,
            message: 'Conversión registrada',
            data: conversion
        });
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// ESCALAMIENTO
// ============================================================================

/**
 * GET /api/valley/detections/:id/evaluate
 * Evalúa si una detección debe escalar estrategia
 */
router.get('/detections/:id/evaluate', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const evaluation = await valleyService.evaluateEscalation(id);
        
        res.json({
            success: true,
            data: evaluation
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/valley/detections/:id/escalate
 * Escala estrategia al siguiente nivel
 */
router.post('/detections/:id/escalate', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        if (!reason) {
            throw new AppError(
                'Se requiere especificar la razón del escalamiento',
                ErrorTypes.VALIDATION_ERROR,
                400
            );
        }
        
        const detection = await valleyService.escalateStrategy(id, reason);
        
        res.json({
            success: true,
            message: `Estrategia escalada a Nivel ${detection.current_strategy_level}`,
            data: detection
        });
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// ESTADÍSTICAS
// ============================================================================

/**
 * GET /api/valley/stats
 * Obtiene estadísticas generales del sistema valle
 */
router.get('/stats', async (req, res, next) => {
    try {
        const [detections, classes] = await Promise.all([
            valleyService.getActiveDetections(),
            valleyService.getValleyClassesView()
        ]);
        
        const stats = {
            activeDetections: detections.length,
            totalValleyClasses: classes.filter(c => c.occupancy_category === 'valley' || c.occupancy_category === 'critical_valley').length,
            criticalValleyClasses: classes.filter(c => c.occupancy_category === 'critical_valley').length,
            avgOccupancyValley: classes.length > 0
                ? (classes.reduce((sum, c) => sum + parseFloat(c.avg_occupancy_3w || 0), 0) / classes.length).toFixed(2)
                : 0,
            strategyLevels: {
                level1: detections.filter(d => d.current_strategy_level === 1).length,
                level2: detections.filter(d => d.current_strategy_level === 2).length,
                level3: detections.filter(d => d.current_strategy_level === 3).length,
                level4: detections.filter(d => d.current_strategy_level === 4).length
            }
        };
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
