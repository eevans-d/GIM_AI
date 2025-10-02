/**
 * PROMPT 14: TIER CONVERSION QUEUE PROCESSOR
 * Worker para targeting de upgrades, retention y anniversary rewards
 */

const Queue = require('bull');
const tierService = require('../services/tier-service');
const whatsappSender = require('../whatsapp/client/sender');
const logger = require('../utils/logger').createLogger('tier-worker');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const tierQueue = new Queue('tier-conversion', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
    }
});

/**
 * Envía oferta de upgrade a candidatos calificados
 */
tierQueue.process('send-upgrade-offer', async (job) => {
    const { memberId, targetTier, upgradeScore } = job.data;
    
    try {
        logger.info('Enviando oferta de upgrade', { memberId, targetTier });
        
        const { data: member } = await supabase
            .from('members')
            .select('nombre, telefono')
            .eq('id', memberId)
            .single();
        
        const templateName = targetTier === 'pro' 
            ? 'tier_upgrade_offer_pro' 
            : 'tier_upgrade_offer_plus';
        
        const price = tierService.TIER_PRICES[targetTier];
        const benefits = await tierService.getTierBenefits(targetTier);
        
        await whatsappSender.sendTemplate(member.telefono, templateName, {
            member_name: member.nombre,
            tier_name: targetTier.toUpperCase(),
            monthly_price: price,
            key_benefits: benefits.slice(0, 3).map(b => b.benefit_name).join(', '),
            language: 'es'
        });
        
        logger.info('Oferta de upgrade enviada', { memberId, targetTier });
        
        return { sent: true, memberId, targetTier };
    } catch (error) {
        logger.error('Error al enviar oferta de upgrade', {
            memberId,
            error: error.message
        });
        throw error;
    }
});

/**
 * Envía retention offer cuando intenta downgrade
 */
tierQueue.process('send-retention-offer', async (job) => {
    const { memberId, currentTier, retentionOffer } = job.data;
    
    try {
        logger.info('Enviando retention offer', { memberId, currentTier });
        
        const { data: member } = await supabase
            .from('members')
            .select('nombre, telefono')
            .eq('id', memberId)
            .single();
        
        await whatsappSender.sendTemplate(member.telefono, 'tier_retention_offer', {
            member_name: member.nombre,
            current_tier: currentTier.toUpperCase(),
            discount_percentage: retentionOffer.discountPercentage,
            new_price: retentionOffer.newPrice,
            language: 'es'
        });
        
        logger.info('Retention offer enviada', { memberId });
        
        return { sent: true, memberId };
    } catch (error) {
        logger.error('Error al enviar retention offer', {
            memberId,
            error: error.message
        });
        throw error;
    }
});

/**
 * Envía recordatorio de sesión de coaching
 */
tierQueue.process('send-coaching-reminder', async (job) => {
    const { sessionId } = job.data;
    
    try {
        const { data: session } = await supabase
            .from('coaching_sessions')
            .select('*, members(nombre, telefono)')
            .eq('id', sessionId)
            .single();
        
        await whatsappSender.sendTemplate(
            session.members.telefono,
            'coaching_session_reminder',
            {
                member_name: session.members.nombre,
                coach_name: session.coach_name,
                session_date: new Date(session.session_date).toLocaleDateString('es-MX'),
                session_time: new Date(session.session_date).toLocaleTimeString('es-MX', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                }),
                session_type: session.session_type,
                language: 'es'
            }
        );
        
        logger.info('Recordatorio de coaching enviado', { sessionId });
        
        return { sent: true, sessionId };
    } catch (error) {
        logger.error('Error al enviar recordatorio de coaching', {
            sessionId,
            error: error.message
        });
        throw error;
    }
});

/**
 * Job diario: Identificar y contactar candidatos para upgrade
 */
tierQueue.process('daily-upgrade-targeting', async (job) => {
    try {
        logger.info('Ejecutando targeting diario de upgrades');
        
        // Candidatos para Plus
        const plusCandidates = await tierService.identifyUpgradeCandidates('plus');
        const topPlusCandidates = plusCandidates.filter(c => c.upgrade_score >= 70).slice(0, 10);
        
        for (const candidate of topPlusCandidates) {
            await tierQueue.add('send-upgrade-offer', {
                memberId: candidate.member_id,
                targetTier: 'plus',
                upgradeScore: candidate.upgrade_score
            }, {
                delay: Math.random() * 3600000, // Random 0-60 min
                attempts: 3
            });
        }
        
        // Candidatos para Pro
        const proCandidates = await tierService.identifyUpgradeCandidates('pro');
        const topProCandidates = proCandidates.filter(c => c.upgrade_score >= 80).slice(0, 5);
        
        for (const candidate of topProCandidates) {
            await tierQueue.add('send-upgrade-offer', {
                memberId: candidate.member_id,
                targetTier: 'pro',
                upgradeScore: candidate.upgrade_score
            }, {
                delay: Math.random() * 3600000,
                attempts: 3
            });
        }
        
        logger.info('Targeting diario completado', {
            plusCandidates: topPlusCandidates.length,
            proCandidates: topProCandidates.length
        });
        
        return {
            plusTargeted: topPlusCandidates.length,
            proTargeted: topProCandidates.length
        };
    } catch (error) {
        logger.error('Error en targeting diario', { error: error.message });
        throw error;
    }
});

// Configurar cron para targeting diario (10:00 AM)
tierQueue.add('daily-upgrade-targeting', {}, {
    repeat: {
        cron: '0 10 * * *' // 10:00 AM todos los días
    }
});

logger.info('Tier Conversion Queue Processor iniciado');

module.exports = tierQueue;
