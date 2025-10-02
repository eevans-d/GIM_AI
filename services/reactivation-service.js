/**
 * PROMPT 12: SMART REACTIVATION SERVICE
 * Detecta y reactiva miembros inactivos (10-14 días) con secuencia de 3 mensajes
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger').createLogger('reactivation-service');
const { AppError, ErrorTypes } = require('../utils/error-handler');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const MESSAGE_SEQUENCE = {
    1: { type: 'miss_you', delay: 0 },         // Inmediato
    2: { type: 'social_proof', delay: 3 },    // 3 días después
    3: { type: 'special_offer', delay: 3 }    // 6 días después del inicio
};

/**
 * Ejecuta detección diaria de miembros inactivos
 */
async function runDailyInactiveDetection(options = {}) {
    const correlationId = options.correlationId || `reactivation-${Date.now()}`;
    
    try {
        logger.info('Iniciando detección de miembros inactivos', { correlationId });
        
        const { data: inactiveMembers, error } = await supabase
            .rpc('detect_inactive_members');
        
        if (error) throw error;
        
        logger.info(`Detectados ${inactiveMembers.length} miembros inactivos`, {
            correlationId,
            count: inactiveMembers.length
        });
        
        const campaigns = [];
        for (const member of inactiveMembers) {
            const campaign = await createCampaign({
                memberId: member.member_id,
                daysInactive: member.days_inactive,
                lastCheckin: member.last_checkin,
                favoriteClass: member.favorite_class
            });
            campaigns.push(campaign);
        }
        
        return {
            totalDetected: inactiveMembers.length,
            campaignsCreated: campaigns.length,
            campaigns
        };
    } catch (error) {
        logger.error('Error en detección de inactivos', {
            correlationId,
            error: error.message
        });
        throw new AppError(
            'Error al detectar miembros inactivos',
            ErrorTypes.INTERNAL_ERROR,
            500,
            { originalError: error.message }
        );
    }
}

/**
 * Crea campaña de reactivación para un miembro
 */
async function createCampaign(params) {
    const { memberId, daysInactive, lastCheckin, favoriteClass } = params;
    
    try {
        const { data: campaignId, error } = await supabase
            .rpc('create_reactivation_campaign', {
                p_member_id: memberId,
                p_days_inactive: daysInactive,
                p_last_checkin: lastCheckin,
                p_favorite_class: favoriteClass
            });
        
        if (error) throw error;
        
        const { data: campaign, error: fetchError } = await supabase
            .from('reactivation_campaigns')
            .select('*')
            .eq('id', campaignId)
            .single();
        
        if (fetchError) throw fetchError;
        
        logger.info('Campaña de reactivación creada', {
            campaignId,
            memberId,
            daysInactive
        });
        
        return campaign;
    } catch (error) {
        logger.error('Error al crear campaña de reactivación', {
            memberId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Envía siguiente mensaje en la secuencia
 */
async function sendNextMessage(campaignId) {
    try {
        const { data: campaign, error } = await supabase
            .from('reactivation_campaigns')
            .select('*, members(*)')
            .eq('id', campaignId)
            .single();
        
        if (error) throw error;
        
        const nextSeq = campaign.current_message_seq + 1;
        
        if (nextSeq > 3) {
            await markCampaignCompleted(campaignId);
            return { completed: true };
        }
        
        // Actualizar secuencia
        await supabase
            .from('reactivation_campaigns')
            .update({ current_message_seq: nextSeq })
            .eq('id', campaignId);
        
        // Crear registro de mensaje
        const { data: message } = await supabase
            .from('reactivation_messages')
            .insert({
                campaign_id: campaignId,
                message_seq: nextSeq,
                message_type: MESSAGE_SEQUENCE[nextSeq].type,
                sent_at: new Date().toISOString()
            })
            .select()
            .single();
        
        logger.info('Mensaje de reactivación enviado', {
            campaignId,
            messageSeq: nextSeq,
            messageType: MESSAGE_SEQUENCE[nextSeq].type
        });
        
        return { message, nextSeq };
    } catch (error) {
        logger.error('Error al enviar mensaje de reactivación', {
            campaignId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Registra reactivación exitosa
 */
async function recordReactivation(memberId, campaignId) {
    try {
        const { error } = await supabase
            .from('reactivation_campaigns')
            .update({
                status: 'reactivated',
                reactivated: true,
                reactivation_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', campaignId);
        
        if (error) throw error;
        
        logger.info('Reactivación registrada exitosamente', {
            memberId,
            campaignId
        });
        
        return { success: true };
    } catch (error) {
        logger.error('Error al registrar reactivación', {
            memberId,
            campaignId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Marca campaña como completada
 */
async function markCampaignCompleted(campaignId) {
    const { error } = await supabase
        .from('reactivation_campaigns')
        .update({ status: 'completed' })
        .eq('id', campaignId);
    
    if (error) throw error;
}

/**
 * Obtiene estadísticas de reactivación
 */
async function getReactivationStats() {
    try {
        const { data: campaigns, error } = await supabase
            .from('reactivation_campaigns')
            .select('*');
        
        if (error) throw error;
        
        const stats = {
            totalCampaigns: campaigns.length,
            active: campaigns.filter(c => c.status === 'active').length,
            reactivated: campaigns.filter(c => c.reactivated).length,
            completed: campaigns.filter(c => c.status === 'completed').length,
            reactivationRate: campaigns.length > 0 
                ? ((campaigns.filter(c => c.reactivated).length / campaigns.length) * 100).toFixed(2)
                : 0
        };
        
        return stats;
    } catch (error) {
        logger.error('Error al obtener stats de reactivación', {
            error: error.message
        });
        throw error;
    }
}

module.exports = {
    runDailyInactiveDetection,
    createCampaign,
    sendNextMessage,
    recordReactivation,
    getReactivationStats,
    MESSAGE_SEQUENCE
};
