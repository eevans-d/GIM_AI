/**
 * PROMPT 13: POST-WORKOUT NUTRITION SERVICE
 * Context-aware nutrition tips sent 60-90 min after check-in
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger').createLogger('nutrition-service');
const { AppError, ErrorTypes } = require('../utils/error-handler');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Timing window: 60-90 min after check-in
const MIN_DELAY_MINUTES = 60;
const MAX_DELAY_MINUTES = 90;

/**
 * Programa envío de tip nutricional después de check-in
 */
async function schedulePostWorkoutTip(checkinId, memberId, classType) {
    try {
        logger.info('Programando tip nutricional post-entrenamiento', {
            checkinId,
            memberId,
            classType
        });
        
        // Seleccionar tip apropiado
        const { data: tipId, error: tipError } = await supabase
            .rpc('select_nutrition_tip_by_class', {
                p_class_type: classType,
                p_member_id: memberId
            });
        
        if (tipError) throw tipError;
        
        if (!tipId) {
            logger.warn('No hay tips disponibles para tipo de clase', { classType });
            return null;
        }
        
        // Registrar que se enviará el tip
        const { data: historyId, error: historyError } = await supabase
            .rpc('record_nutrition_tip_sent', {
                p_member_id: memberId,
                p_checkin_id: checkinId,
                p_tip_id: tipId,
                p_class_type: classType
            });
        
        if (historyError) throw historyError;
        
        // Calcular delay aleatorio entre 60-90 min
        const delayMinutes = Math.floor(
            Math.random() * (MAX_DELAY_MINUTES - MIN_DELAY_MINUTES + 1) + MIN_DELAY_MINUTES
        );
        
        logger.info('Tip nutricional programado', {
            checkinId,
            memberId,
            tipId,
            historyId,
            delayMinutes
        });
        
        return {
            historyId,
            tipId,
            delayMinutes,
            scheduledFor: new Date(Date.now() + delayMinutes * 60 * 1000).toISOString()
        };
    } catch (error) {
        logger.error('Error al programar tip nutricional', {
            checkinId,
            memberId,
            error: error.message
        });
        throw new AppError(
            'Error al programar tip nutricional',
            ErrorTypes.INTERNAL_ERROR,
            500,
            { originalError: error.message }
        );
    }
}

/**
 * Obtiene tip por ID
 */
async function getTipById(tipId) {
    try {
        const { data: tip, error } = await supabase
            .from('nutrition_tips')
            .select('*')
            .eq('id', tipId)
            .single();
        
        if (error) throw error;
        
        return tip;
    } catch (error) {
        logger.error('Error al obtener tip', { tipId, error: error.message });
        throw error;
    }
}

/**
 * Obtiene historial de tips de un miembro
 */
async function getMemberHistory(memberId, limit = 10) {
    try {
        const { data: history, error } = await supabase
            .from('member_nutrition_history')
            .select('*, nutrition_tips(*)')
            .eq('member_id', memberId)
            .order('sent_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        
        return history;
    } catch (error) {
        logger.error('Error al obtener historial de nutrición', {
            memberId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Registra interacción con tip (apertura o click)
 */
async function trackEngagement(historyId, engagementType) {
    try {
        const updateData = {};
        
        if (engagementType === 'opened') {
            updateData.opened = true;
        } else if (engagementType === 'clicked_recipe') {
            updateData.clicked_recipe = true;
        }
        
        const { error } = await supabase
            .from('member_nutrition_history')
            .update(updateData)
            .eq('id', historyId);
        
        if (error) throw error;
        
        logger.info('Engagement registrado', { historyId, engagementType });
        
        return { success: true };
    } catch (error) {
        logger.error('Error al registrar engagement', {
            historyId,
            engagementType,
            error: error.message
        });
        throw error;
    }
}

/**
 * Obtiene estadísticas de engagement
 */
async function getEngagementStats() {
    try {
        const { data: stats, error } = await supabase
            .rpc('get_nutrition_engagement_stats');
        
        if (error) throw error;
        
        return stats[0] || {
            total_sent: 0,
            total_opened: 0,
            total_clicked: 0,
            open_rate: 0,
            click_rate: 0
        };
    } catch (error) {
        logger.error('Error al obtener stats de nutrición', {
            error: error.message
        });
        throw error;
    }
}

/**
 * Lista todos los tips disponibles
 */
async function listTips(classType = null) {
    try {
        let query = supabase
            .from('nutrition_tips')
            .select('*')
            .eq('active', true)
            .order('class_type', { ascending: true });
        
        if (classType) {
            query = query.eq('class_type', classType);
        }
        
        const { data: tips, error } = await query;
        
        if (error) throw error;
        
        return tips;
    } catch (error) {
        logger.error('Error al listar tips', {
            classType,
            error: error.message
        });
        throw error;
    }
}

/**
 * Crea nuevo tip (admin)
 */
async function createTip(tipData) {
    try {
        const { data: tip, error } = await supabase
            .from('nutrition_tips')
            .insert(tipData)
            .select()
            .single();
        
        if (error) throw error;
        
        logger.info('Tip de nutrición creado', { tipId: tip.id });
        
        return tip;
    } catch (error) {
        logger.error('Error al crear tip', {
            error: error.message
        });
        throw error;
    }
}

module.exports = {
    schedulePostWorkoutTip,
    getTipById,
    getMemberHistory,
    trackEngagement,
    getEngagementStats,
    listTips,
    createTip,
    MIN_DELAY_MINUTES,
    MAX_DELAY_MINUTES
};
