/**
 * PROMPT 11: VALLEY OPTIMIZATION - QUEUE PROCESSOR
 * Procesador Bull para envío de promociones valle
 */

const Bull = require('bull');
const valleyService = require('../services/valley-optimization-service');
const whatsappSender = require('../whatsapp/client/sender');
const logger = require('../utils/logger').createLogger('valley-queue-processor');

// Configuración de la cola
const valleyPromotionQueue = new Bull('valley-promotions', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
    }
});

// ============================================================================
// PROCESADOR DE ENVÍO DE PROMOCIONES
// ============================================================================
valleyPromotionQueue.process('send-promotion', async (job) => {
    const { promotionId, recipientId, memberData, classData } = job.data;
    
    try {
        logger.info('Procesando envío de promoción valle', {
            jobId: job.id,
            promotionId,
            recipientId,
            memberPhone: memberData.telefono
        });
        
        // Enviar mensaje de WhatsApp
        const result = await whatsappSender.sendTemplate(
            memberData.telefono,
            'valley_promotion_offer',
            {
                member_name: memberData.nombre,
                class_type: classData.tipo,
                day_of_week: classData.dia,
                time: classData.horario,
                discount_percentage: job.data.discountPercentage || '20',
                language: 'es'
            }
        );
        
        // Actualizar estado del destinatario
        if (result.success) {
            await valleyService.recordMemberResponse(recipientId, {
                status: 'sent',
                whatsappMessageId: result.messageId
            });
        }
        
        logger.info('Promoción valle enviada exitosamente', {
            jobId: job.id,
            promotionId,
            recipientId,
            messageId: result.messageId
        });
        
        return { success: true, messageId: result.messageId };
        
    } catch (error) {
        logger.error('Error al enviar promoción valle', {
            jobId: job.id,
            promotionId,
            recipientId,
            error: error.message
        });
        throw error;
    }
});

// ============================================================================
// HANDLER DE ANÁLISIS DIARIO
// ============================================================================
valleyPromotionQueue.process('daily-analysis', async (job) => {
    try {
        logger.info('Iniciando análisis diario de clases valle', {
            jobId: job.id
        });
        
        const result = await valleyService.runDailyValleyAnalysis({
            correlationId: `daily-analysis-${job.id}`
        });
        
        logger.info('Análisis diario completado', {
            jobId: job.id,
            result
        });
        
        return result;
        
    } catch (error) {
        logger.error('Error en análisis diario valle', {
            jobId: job.id,
            error: error.message
        });
        throw error;
    }
});

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

/**
 * Programa envío masivo de promoción
 * @param {UUID} promotionId - ID de la promoción
 * @param {Array} recipients - Lista de destinatarios
 * @param {Object} classData - Datos de la clase
 * @returns {Promise<Object>} Resultado del programado
 */
async function schedulePromotionSending(promotionId, recipients, classData) {
    const jobs = [];
    
    for (const recipient of recipients) {
        const job = await valleyPromotionQueue.add('send-promotion', {
            promotionId,
            recipientId: recipient.id,
            memberData: {
                telefono: recipient.member_telefono,
                nombre: recipient.member_nombre
            },
            classData,
            discountPercentage: 20
        }, {
            delay: Math.random() * 60000, // Delay aleatorio 0-60s para evitar spam
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 60000
            }
        });
        
        jobs.push(job);
    }
    
    logger.info(`Programados ${jobs.length} envíos de promoción valle`, {
        promotionId,
        recipientsCount: recipients.length
    });
    
    return {
        jobsScheduled: jobs.length,
        jobs: jobs.map(j => ({ id: j.id, status: 'queued' }))
    };
}

/**
 * Programa análisis diario (ejecutar desde cron)
 * @param {String} schedule - Hora de ejecución (ej: '06:00')
 * @returns {Promise<Object>} Job programado
 */
async function scheduleDailyAnalysis(schedule = '06:00') {
    const [hour, minute] = schedule.split(':');
    
    const job = await valleyPromotionQueue.add('daily-analysis', {}, {
        repeat: {
            cron: `${minute} ${hour} * * *` // Diariamente a la hora especificada
        }
    });
    
    logger.info('Análisis diario de valle programado', {
        schedule,
        jobId: job.id
    });
    
    return job;
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================
valleyPromotionQueue.on('completed', (job, result) => {
    logger.info('Job de valle completado', {
        jobId: job.id,
        type: job.name,
        result
    });
});

valleyPromotionQueue.on('failed', (job, error) => {
    logger.error('Job de valle falló', {
        jobId: job.id,
        type: job.name,
        error: error.message,
        attempts: job.attemptsMade
    });
});

// ============================================================================
// EXPORTS
// ============================================================================
module.exports = {
    valleyPromotionQueue,
    schedulePromotionSending,
    scheduleDailyAnalysis
};
