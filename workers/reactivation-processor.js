/**
 * PROMPT 12: REACTIVATION QUEUE PROCESSOR
 * Worker para procesar mensajes de reactivación con secuenciamiento
 */

const Queue = require('bull');
const reactivationService = require('../services/reactivation-service');
const whatsappSender = require('../whatsapp/client/sender');
const logger = require('../utils/logger').createLogger('reactivation-worker');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const reactivationQueue = new Queue('reactivation', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
    }
});

/**
 * Procesa envío de mensaje de reactivación
 */
reactivationQueue.process('send-message', async (job) => {
    const { campaignId } = job.data;
    
    try {
        logger.info('Procesando mensaje de reactivación', { campaignId });
        
        // Enviar siguiente mensaje
        const result = await reactivationService.sendNextMessage(campaignId);
        
        if (result.completed) {
            logger.info('Campaña completada', { campaignId });
            return { completed: true };
        }
        
        // Obtener datos de campaña para WhatsApp
        const { data: campaign, error } = await supabase
            .from('reactivation_campaigns')
            .select('*, members(*)')
            .eq('id', campaignId)
            .single();
        
        if (error) throw error;
        
        const messageType = reactivationService.MESSAGE_SEQUENCE[result.nextSeq].type;
        const templateName = `reactivation_${messageType}`;
        
        // Preparar parámetros personalizados
        const templateParams = {
            member_name: campaign.members.nombre,
            days_inactive: campaign.days_inactive,
            favorite_class: campaign.favorite_class_type || 'spinning',
            language: 'es'
        };
        
        // Enviar por WhatsApp
        await whatsappSender.sendTemplate(
            campaign.members.telefono,
            templateName,
            templateParams
        );
        
        // Programar siguiente mensaje si no es el último
        if (result.nextSeq < 3) {
            const nextDelay = reactivationService.MESSAGE_SEQUENCE[result.nextSeq + 1].delay;
            await reactivationQueue.add('send-message', 
                { campaignId },
                { delay: nextDelay * 24 * 60 * 60 * 1000 } // Días a milisegundos
            );
        }
        
        logger.info('Mensaje de reactivación enviado', {
            campaignId,
            messageSeq: result.nextSeq,
            messageType
        });
        
        return result;
    } catch (error) {
        logger.error('Error al procesar mensaje de reactivación', {
            campaignId,
            error: error.message
        });
        throw error;
    }
});

/**
 * Job diario de detección (cron: 08:00 AM)
 */
reactivationQueue.process('daily-detection', async (job) => {
    try {
        logger.info('Ejecutando detección diaria de inactivos');
        
        const result = await reactivationService.runDailyInactiveDetection({
            correlationId: job.id
        });
        
        // Programar primer mensaje para cada campaña creada
        for (const campaign of result.campaigns) {
            await reactivationQueue.add('send-message', 
                { campaignId: campaign.id },
                { delay: 5000 } // 5 segundos de delay para evitar saturación
            );
        }
        
        logger.info('Detección diaria completada', {
            totalDetected: result.totalDetected,
            campaignsCreated: result.campaignsCreated
        });
        
        return result;
    } catch (error) {
        logger.error('Error en detección diaria', {
            error: error.message
        });
        throw error;
    }
});

// Configurar cron para detección diaria (08:00 AM)
reactivationQueue.add('daily-detection', {}, {
    repeat: {
        cron: '0 8 * * *' // 08:00 AM todos los días
    }
});

logger.info('Reactivation Queue Processor iniciado');

module.exports = reactivationQueue;
