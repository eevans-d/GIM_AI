/**
 * PROMPT 13: NUTRITION TIP QUEUE PROCESSOR
 * Worker para enviar tips nutricionales 60-90 min post-entrenamiento
 */

const Queue = require('bull');
const nutritionService = require('../services/nutrition-service');
const whatsappSender = require('../whatsapp/client/sender');
const logger = require('../utils/logger').createLogger('nutrition-worker');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const nutritionQueue = new Queue('nutrition-tips', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
    }
});

/**
 * Mapeo de tipos de clase a templates WhatsApp
 */
const CLASS_TYPE_TO_TEMPLATE = {
    'cardio': 'nutrition_post_cardio',
    'spinning': 'nutrition_post_cardio',
    'strength': 'nutrition_post_strength',
    'pesas': 'nutrition_post_strength',
    'crossfit': 'nutrition_post_strength',
    'flexibility': 'nutrition_post_flexibility',
    'yoga': 'nutrition_post_flexibility',
    'pilates': 'nutrition_post_flexibility',
    'mixed': 'nutrition_post_strength' // Default
};

/**
 * Procesa envío de tip nutricional
 */
nutritionQueue.process('send-tip', async (job) => {
    const { historyId, tipId, memberId, classType } = job.data;
    
    try {
        logger.info('Procesando envío de tip nutricional', {
            historyId,
            tipId,
            memberId,
            classType
        });
        
        // Obtener datos completos del tip
        const tip = await nutritionService.getTipById(tipId);
        
        if (!tip) {
            throw new Error(`Tip ${tipId} no encontrado`);
        }
        
        // Obtener datos del miembro
        const { data: member, error: memberError } = await supabase
            .from('members')
            .select('nombre, telefono')
            .eq('id', memberId)
            .single();
        
        if (memberError) throw memberError;
        
        // Seleccionar template según tipo de clase
        const templateName = CLASS_TYPE_TO_TEMPLATE[classType.toLowerCase()] 
            || 'nutrition_post_strength';
        
        // Preparar parámetros del template
        const templateParams = {
            member_name: member.nombre,
            tip_title: tip.tip_title,
            tip_description: tip.tip_description,
            macro_focus: tip.macro_focus || 'nutrientes',
            recipe_name: tip.recipe_name || 'batido energético',
            timing: tip.timing_recommendation || 'Dentro de 30-60 min',
            language: 'es'
        };
        
        // Enviar por WhatsApp
        await whatsappSender.sendTemplate(
            member.telefono,
            templateName,
            templateParams
        );
        
        logger.info('Tip nutricional enviado exitosamente', {
            historyId,
            tipId,
            memberId,
            templateName
        });
        
        return {
            historyId,
            tipId,
            sent: true,
            templateUsed: templateName
        };
    } catch (error) {
        logger.error('Error al enviar tip nutricional', {
            historyId,
            tipId,
            memberId,
            error: error.message
        });
        throw error;
    }
});

/**
 * Helper: Programa tip desde check-in
 */
async function scheduleTipFromCheckin(checkinId, memberId, classType) {
    try {
        const result = await nutritionService.schedulePostWorkoutTip(
            checkinId,
            memberId,
            classType
        );
        
        if (!result) {
            logger.warn('No se pudo programar tip (sin tips disponibles)', {
                checkinId,
                classType
            });
            return null;
        }
        
        // Añadir job a la cola con delay
        await nutritionQueue.add('send-tip', {
            historyId: result.historyId,
            tipId: result.tipId,
            memberId,
            classType
        }, {
            delay: result.delayMinutes * 60 * 1000, // Convertir minutos a ms
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 60000 // 1 min
            }
        });
        
        logger.info('Tip nutricional programado en cola', {
            checkinId,
            memberId,
            historyId: result.historyId,
            delayMinutes: result.delayMinutes
        });
        
        return result;
    } catch (error) {
        logger.error('Error al programar tip desde check-in', {
            checkinId,
            memberId,
            error: error.message
        });
        throw error;
    }
}

logger.info('Nutrition Tip Queue Processor iniciado');

module.exports = {
    nutritionQueue,
    scheduleTipFromCheckin
};
