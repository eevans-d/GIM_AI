/**
 * PROMPT 11: VALLEY OPTIMIZATION SERVICE
 * Servicio para detectar y optimizar clases con baja ocupación
 * 
 * Estrategia multi-nivel:
 * 1. Promoción segmentada (-20% primer mes)
 * 2. Cambio de formato (añadir valor)
 * 3. Reubicación horaria
 * 4. Pausa temporal (4 semanas)
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger').createLogger('valley-optimization-service');
const { AppError, ErrorTypes } = require('../utils/error-handler');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// ============================================================================
// CONSTANTES
// ============================================================================
const VALLEY_THRESHOLD = 50; // % ocupación para considerar "valle"
const MIN_WEEKS_ANALYSIS = 3; // Semanas mínimas de análisis
const MIN_CLASSES_REQUIRED = 9; // Clases mínimas en período
const PROMOTION_DISCOUNT = 20; // % descuento default
const ELIGIBILITY_SCORE_MIN = 50; // Score mínimo para enviar promoción

const STRATEGY_LEVELS = {
    PROMOTION: 1,
    FORMAT_CHANGE: 2,
    RESCHEDULE: 3,
    PAUSE: 4
};

const STRATEGY_NAMES = {
    1: 'Promoción Segmentada',
    2: 'Cambio de Formato',
    3: 'Reubicación Horaria',
    4: 'Pausa Temporal'
};

// ============================================================================
// DETECCIÓN DE CLASES VALLE
// ============================================================================

/**
 * Ejecuta análisis diario de ocupación y detecta clases valle
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<Array>} Array de detecciones
 */
async function runDailyValleyAnalysis(options = {}) {
    const correlationId = options.correlationId || `valley-analysis-${Date.now()}`;
    
    try {
        logger.info('Iniciando análisis diario de clases valle', { correlationId });
        
        // 1. Registrar ocupación de ayer
        await recordYesterdayOccupancy();
        
        // 2. Refrescar vista materializada
        await refreshValleyView();
        
        // 3. Detectar nuevas clases valle
        const { data: valleyClasses, error } = await supabase
            .rpc('detect_valley_classes', {
                p_weeks: MIN_WEEKS_ANALYSIS,
                p_threshold: VALLEY_THRESHOLD,
                p_min_classes: MIN_CLASSES_REQUIRED
            });
        
        if (error) throw error;
        
        logger.info(`Detectadas ${valleyClasses.length} clases con baja ocupación`, {
            correlationId,
            count: valleyClasses.length
        });
        
        // 4. Crear registros de detección para clases nuevas
        const newDetections = [];
        for (const clase of valleyClasses) {
            if (clase.is_new_detection) {
                const detection = await createValleyDetection({
                    claseId: clase.clase_id,
                    avgOccupancy: clase.avg_occupancy,
                    week1: clase.week1_occ,
                    week2: clase.week2_occ,
                    week3: clase.week3_occ,
                    totalClasses: clase.total_classes
                });
                
                newDetections.push(detection);
                
                logger.warn('Nueva clase valle detectada', {
                    correlationId,
                    claseId: clase.clase_id,
                    claseName: clase.clase_nombre,
                    avgOccupancy: clase.avg_occupancy,
                    detectionId: detection.id
                });
            }
        }
        
        return {
            totalAnalyzed: valleyClasses.length,
            newDetections: newDetections.length,
            detections: newDetections
        };
        
    } catch (error) {
        logger.error('Error en análisis de clases valle', {
            correlationId,
            error: error.message,
            stack: error.stack
        });
        throw new AppError(
            'Error al analizar clases valle',
            ErrorTypes.INTERNAL_ERROR,
            500,
            { originalError: error.message }
        );
    }
}

/**
 * Registra ocupación del día anterior para todas las clases
 */
async function recordYesterdayOccupancy() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    const { data, error } = await supabase
        .rpc('record_class_occupancy_daily', {
            p_date: dateStr
        });
    
    if (error) throw error;
    
    logger.info(`Registrada ocupación de ${data} clases para ${dateStr}`);
    return data;
}

/**
 * Refresca vista materializada de clases valle
 */
async function refreshValleyView() {
    const { error } = await supabase
        .rpc('refresh_valley_classes_view');
    
    if (error) throw error;
    
    logger.info('Vista materializada de clases valle actualizada');
}

/**
 * Crea registro de detección de clase valle
 */
async function createValleyDetection(params) {
    const { data, error } = await supabase
        .rpc('create_valley_detection', {
            p_clase_id: params.claseId,
            p_avg_occupancy: params.avgOccupancy,
            p_week1: params.week1,
            p_week2: params.week2,
            p_week3: params.week3,
            p_total_classes: params.totalClasses
        });
    
    if (error) throw error;
    
    // Obtener detección completa
    const { data: detection, error: fetchError } = await supabase
        .from('valley_detections')
        .select('*, clases(nombre, tipo, horario)')
        .eq('id', data)
        .single();
    
    if (fetchError) throw fetchError;
    
    return detection;
}

// ============================================================================
// GESTIÓN DE PROMOCIONES
// ============================================================================

/**
 * Crea una promoción para una clase valle
 * @param {Object} params - Parámetros de la promoción
 * @returns {Promise<Object>} Promoción creada
 */
async function createPromotion(params) {
    const {
        detectionId,
        claseId,
        promotionName,
        discountPercentage = PROMOTION_DISCOUNT,
        durationMonths = 1,
        targetSegment = 'never_attended',
        correlationId = `promo-${Date.now()}`
    } = params;
    
    try {
        logger.info('Creando promoción valle', {
            correlationId,
            detectionId,
            claseId,
            promotionName
        });
        
        // Crear promoción y destinatarios
        const { data: promotionId, error } = await supabase
            .rpc('create_valley_promotion', {
                p_detection_id: detectionId,
                p_clase_id: claseId,
                p_promotion_name: promotionName,
                p_discount_percentage: discountPercentage,
                p_duration_months: durationMonths,
                p_target_segment: targetSegment
            });
        
        if (error) throw error;
        
        // Obtener promoción completa con destinatarios
        const { data: promotion, error: fetchError } = await supabase
            .from('valley_promotions')
            .select(`
                *,
                clases(nombre, tipo, horario),
                valley_promotion_recipients(count)
            `)
            .eq('id', promotionId)
            .single();
        
        if (fetchError) throw fetchError;
        
        logger.info('Promoción valle creada exitosamente', {
            correlationId,
            promotionId,
            recipientsCount: promotion.valley_promotion_recipients[0]?.count || 0
        });
        
        return promotion;
        
    } catch (error) {
        logger.error('Error al crear promoción valle', {
            correlationId,
            error: error.message
        });
        throw new AppError(
            'Error al crear promoción valle',
            ErrorTypes.INTERNAL_ERROR,
            500,
            { originalError: error.message }
        );
    }
}

/**
 * Obtiene miembros objetivo para una promoción
 * @param {UUID} claseId - ID de la clase
 * @param {String} segment - Segmento objetivo
 * @returns {Promise<Array>} Miembros elegibles con score
 */
async function getTargetMembers(claseId, segment = 'never_attended') {
    try {
        const { data, error } = await supabase
            .rpc('get_promotion_target_members', {
                p_clase_id: claseId,
                p_segment: segment
            });
        
        if (error) throw error;
        
        // Filtrar por score mínimo
        const eligibleMembers = data.filter(m => m.eligibility_score >= ELIGIBILITY_SCORE_MIN);
        
        logger.info(`Identificados ${eligibleMembers.length} miembros elegibles`, {
            claseId,
            segment,
            totalAnalyzed: data.length
        });
        
        return eligibleMembers;
        
    } catch (error) {
        logger.error('Error al obtener miembros objetivo', {
            claseId,
            segment,
            error: error.message
        });
        throw error;
    }
}

/**
 * Activa una promoción programada
 * @param {UUID} promotionId - ID de la promoción
 * @returns {Promise<Object>} Promoción activada
 */
async function activatePromotion(promotionId) {
    try {
        const { data, error } = await supabase
            .from('valley_promotions')
            .update({
                status: 'active',
                sent_at: new Date().toISOString()
            })
            .eq('id', promotionId)
            .select()
            .single();
        
        if (error) throw error;
        
        logger.info('Promoción valle activada', { promotionId });
        
        return data;
        
    } catch (error) {
        logger.error('Error al activar promoción', {
            promotionId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Registra respuesta de un miembro a la promoción
 * @param {UUID} recipientId - ID del destinatario
 * @param {Object} response - Datos de respuesta
 * @returns {Promise<Object>} Destinatario actualizado
 */
async function recordMemberResponse(recipientId, response) {
    const {
        status = 'interested',
        responseText = null,
        whatsappMessageId = null
    } = response;
    
    try {
        const { data, error } = await supabase
            .from('valley_promotion_recipients')
            .update({
                status,
                response_received: true,
                response_text: responseText,
                response_at: new Date().toISOString(),
                whatsapp_message_id: whatsappMessageId
            })
            .eq('id', recipientId)
            .select()
            .single();
        
        if (error) throw error;
        
        // Actualizar contador en promoción
        await updatePromotionStats(data.promotion_id);
        
        return data;
        
    } catch (error) {
        logger.error('Error al registrar respuesta de miembro', {
            recipientId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Registra conversión (primera asistencia) de un miembro
 * @param {UUID} memberId - ID del miembro
 * @param {UUID} promotionId - ID de la promoción
 * @param {Date} attendanceDate - Fecha de asistencia
 * @returns {Promise<Object>} Destinatario actualizado
 */
async function recordConversion(memberId, promotionId, attendanceDate) {
    try {
        const { data, error } = await supabase
            .from('valley_promotion_recipients')
            .update({
                first_attendance_date: attendanceDate,
                total_attendances: 1,
                is_converted: true,
                converted_at: new Date().toISOString(),
                status: 'converted'
            })
            .eq('promotion_id', promotionId)
            .eq('member_id', memberId)
            .select()
            .single();
        
        if (error) throw error;
        
        // Actualizar stats de promoción
        await updatePromotionStats(promotionId);
        
        logger.info('Conversión de promoción valle registrada', {
            memberId,
            promotionId,
            attendanceDate
        });
        
        return data;
        
    } catch (error) {
        logger.error('Error al registrar conversión', {
            memberId,
            promotionId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Actualiza estadísticas de una promoción
 */
async function updatePromotionStats(promotionId) {
    try {
        // Obtener stats de destinatarios
        const { data: stats, error: statsError } = await supabase
            .from('valley_promotion_recipients')
            .select('status, is_converted')
            .eq('promotion_id', promotionId);
        
        if (statsError) throw statsError;
        
        const interested = stats.filter(s => s.status === 'interested').length;
        const converted = stats.filter(s => s.is_converted).length;
        
        // Actualizar promoción
        const { error } = await supabase
            .from('valley_promotions')
            .update({
                members_interested: interested,
                members_converted: converted
            })
            .eq('id', promotionId);
        
        if (error) throw error;
        
    } catch (error) {
        logger.error('Error al actualizar stats de promoción', {
            promotionId,
            error: error.message
        });
        throw error;
    }
}

// ============================================================================
// ESCALAMIENTO DE ESTRATEGIAS
// ============================================================================

/**
 * Evalúa si una promoción debe escalar a siguiente nivel
 * @param {UUID} detectionId - ID de la detección
 * @returns {Promise<Object>} Resultado de evaluación
 */
async function evaluateEscalation(detectionId) {
    try {
        // Obtener detección actual
        const { data: detection, error } = await supabase
            .from('valley_detections')
            .select('*, clases(*)')
            .eq('id', detectionId)
            .single();
        
        if (error) throw error;
        
        // Obtener ocupación actual (última semana)
        const { data: recentOccupancy, error: occError } = await supabase
            .from('class_occupancy_history')
            .select('occupancy_rate')
            .eq('clase_id', detection.clase_id)
            .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .order('date', { ascending: false });
        
        if (occError) throw occError;
        
        const currentOccupancy = recentOccupancy.length > 0
            ? recentOccupancy.reduce((sum, r) => sum + parseFloat(r.occupancy_rate), 0) / recentOccupancy.length
            : detection.avg_occupancy_rate;
        
        // Criterios de escalamiento
        const weeksElapsed = Math.floor(
            (Date.now() - new Date(detection.strategy_applied_at || detection.created_at).getTime()) 
            / (7 * 24 * 60 * 60 * 1000)
        );
        
        const shouldEscalate = (
            weeksElapsed >= 2 && // Al menos 2 semanas desde última acción
            currentOccupancy < VALLEY_THRESHOLD && // Aún en valle
            detection.current_strategy_level < STRATEGY_LEVELS.PAUSE // No ha llegado a pausa
        );
        
        const improvement = currentOccupancy - detection.avg_occupancy_rate;
        
        return {
            shouldEscalate,
            currentLevel: detection.current_strategy_level,
            nextLevel: detection.current_strategy_level + 1,
            currentOccupancy,
            improvement,
            weeksElapsed,
            reason: shouldEscalate 
                ? `Sin mejora significativa después de ${weeksElapsed} semanas. Ocupación actual: ${currentOccupancy.toFixed(1)}%`
                : `Mejora detectada: +${improvement.toFixed(1)}pp en ocupación`
        };
        
    } catch (error) {
        logger.error('Error al evaluar escalamiento', {
            detectionId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Escala estrategia al siguiente nivel
 * @param {UUID} detectionId - ID de la detección
 * @param {String} reason - Razón del escalamiento
 * @returns {Promise<Object>} Resultado del escalamiento
 */
async function escalateStrategy(detectionId, reason) {
    try {
        const { data, error } = await supabase
            .rpc('escalate_valley_strategy', {
                p_detection_id: detectionId,
                p_reason: reason
            });
        
        if (error) throw error;
        
        if (!data) {
            throw new Error('No se pudo escalar estrategia (nivel máximo alcanzado)');
        }
        
        // Obtener detección actualizada
        const { data: detection, error: fetchError } = await supabase
            .from('valley_detections')
            .select('*, clases(*)')
            .eq('id', detectionId)
            .single();
        
        if (fetchError) throw fetchError;
        
        logger.warn('Estrategia valle escalada', {
            detectionId,
            newLevel: detection.current_strategy_level,
            strategyName: STRATEGY_NAMES[detection.current_strategy_level],
            reason
        });
        
        return detection;
        
    } catch (error) {
        logger.error('Error al escalar estrategia', {
            detectionId,
            error: error.message
        });
        throw error;
    }
}

// ============================================================================
// CONSULTAS Y REPORTES
// ============================================================================

/**
 * Obtiene todas las detecciones activas
 * @returns {Promise<Array>} Detecciones activas
 */
async function getActiveDetections() {
    try {
        const { data, error } = await supabase
            .from('valley_detections')
            .select(`
                *,
                clases(id, nombre, tipo, horario, capacidad_maxima),
                valley_promotions(
                    id,
                    status,
                    conversion_rate,
                    occupancy_improvement
                )
            `)
            .in('status', ['detected', 'promotion_sent', 'format_changed', 'rescheduled'])
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return data;
        
    } catch (error) {
        logger.error('Error al obtener detecciones activas', {
            error: error.message
        });
        throw error;
    }
}

/**
 * Obtiene reporte de promoción con métricas
 * @param {UUID} promotionId - ID de la promoción
 * @returns {Promise<Object>} Reporte completo
 */
async function getPromotionReport(promotionId) {
    try {
        // Obtener promoción
        const { data: promotion, error } = await supabase
            .from('valley_promotions')
            .select(`
                *,
                clases(nombre, tipo, horario),
                valley_detections(avg_occupancy_rate, detection_date)
            `)
            .eq('id', promotionId)
            .single();
        
        if (error) throw error;
        
        // Obtener ROI
        const { data: roi, error: roiError } = await supabase
            .rpc('calculate_valley_roi', {
                p_promotion_id: promotionId
            });
        
        if (roiError) throw roiError;
        
        // Obtener destinatarios por estado
        const { data: recipients, error: recipError } = await supabase
            .from('valley_promotion_recipients')
            .select('status, is_converted, response_received')
            .eq('promotion_id', promotionId);
        
        if (recipError) throw recipError;
        
        const statusBreakdown = recipients.reduce((acc, r) => {
            acc[r.status] = (acc[r.status] || 0) + 1;
            return acc;
        }, {});
        
        return {
            promotion,
            roi: roi[0] || null,
            statusBreakdown,
            totalRecipients: recipients.length,
            responseRate: (recipients.filter(r => r.response_received).length / recipients.length * 100).toFixed(2),
            conversionRate: promotion.conversion_rate
        };
        
    } catch (error) {
        logger.error('Error al obtener reporte de promoción', {
            promotionId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Obtiene vista consolidada de todas las clases valle
 * @returns {Promise<Array>} Vista de clases valle
 */
async function getValleyClassesView() {
    try {
        const { data, error } = await supabase
            .from('v_valley_classes_current')
            .select('*')
            .order('avg_occupancy_3w', { ascending: true });
        
        if (error) throw error;
        
        return data;
        
    } catch (error) {
        logger.error('Error al obtener vista de clases valle', {
            error: error.message
        });
        throw error;
    }
}

// ============================================================================
// EXPORTS
// ============================================================================
module.exports = {
    // Detección
    runDailyValleyAnalysis,
    recordYesterdayOccupancy,
    createValleyDetection,
    
    // Promociones
    createPromotion,
    getTargetMembers,
    activatePromotion,
    recordMemberResponse,
    recordConversion,
    
    // Escalamiento
    evaluateEscalation,
    escalateStrategy,
    
    // Consultas
    getActiveDetections,
    getPromotionReport,
    getValleyClassesView,
    
    // Constantes
    VALLEY_THRESHOLD,
    STRATEGY_LEVELS,
    STRATEGY_NAMES
};
