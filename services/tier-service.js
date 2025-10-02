/**
 * PROMPT 14: TIER SYSTEM SERVICE
 * Manejo de membresías premium (Plus/Pro) con upgrades, downgrades y retention
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger').createLogger('tier-service');
const { AppError, ErrorTypes } = require('../utils/error-handler');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const TIER_PRICES = {
    standard: 1500,
    plus: 2500,
    pro: 4500
};

/**
 * Obtiene tier actual de un miembro
 */
async function getMemberCurrentTier(memberId) {
    try {
        const { data: tier, error } = await supabase
            .rpc('get_member_current_tier', { p_member_id: memberId });
        
        if (error) throw error;
        
        return tier || 'standard';
    } catch (error) {
        logger.error('Error al obtener tier del miembro', {
            memberId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Upgrade de tier con tracking
 */
async function upgradeMemberTier(memberId, newTier, options = {}) {
    try {
        logger.info('Procesando upgrade de tier', {
            memberId,
            newTier
        });
        
        const currentTier = await getMemberCurrentTier(memberId);
        
        if (currentTier === newTier) {
            throw new AppError(
                `Miembro ya tiene tier ${newTier}`,
                ErrorTypes.VALIDATION,
                400
            );
        }
        
        const price = options.promotionalPrice || TIER_PRICES[newTier];
        
        const { data: subscriptionId, error } = await supabase
            .rpc('upgrade_member_tier', {
                p_member_id: memberId,
                p_new_tier_name: newTier,
                p_monthly_price: price
            });
        
        if (error) throw error;
        
        logger.info('Upgrade completado exitosamente', {
            memberId,
            fromTier: currentTier,
            toTier: newTier,
            subscriptionId
        });
        
        return {
            subscriptionId,
            previousTier: currentTier,
            newTier,
            monthlyPrice: price
        };
    } catch (error) {
        logger.error('Error en upgrade de tier', {
            memberId,
            newTier,
            error: error.message
        });
        throw error;
    }
}

/**
 * Downgrade con retention logic
 */
async function downgradeMemberTier(memberId, reason, options = {}) {
    try {
        logger.info('Procesando downgrade de tier', {
            memberId,
            reason
        });
        
        const currentTier = await getMemberCurrentTier(memberId);
        
        if (currentTier === 'standard') {
            throw new AppError(
                'Miembro ya está en tier standard',
                ErrorTypes.VALIDATION,
                400
            );
        }
        
        // Retention offer: 20% descuento 1er mes
        const retentionOffer = {
            discountPercentage: 20,
            durationMonths: 1,
            newPrice: TIER_PRICES[currentTier] * 0.8
        };
        
        // Marcar que se envió retention offer
        await supabase
            .from('member_tier_subscriptions')
            .update({ 
                retention_offer_sent: true,
                cancellation_reason: reason
            })
            .eq('member_id', memberId)
            .eq('status', 'active');
        
        logger.info('Retention offer generada', {
            memberId,
            currentTier,
            offer: retentionOffer
        });
        
        return {
            currentTier,
            retentionOffer,
            requiresConfirmation: true
        };
    } catch (error) {
        logger.error('Error en downgrade', {
            memberId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Confirma downgrade después de retention offer
 */
async function confirmDowngrade(memberId) {
    try {
        const { error } = await supabase
            .from('member_tier_subscriptions')
            .update({
                status: 'cancelled',
                end_date: new Date().toISOString().split('T')[0]
            })
            .eq('member_id', memberId)
            .eq('status', 'active');
        
        if (error) throw error;
        
        logger.info('Downgrade confirmado', { memberId });
        
        return { success: true };
    } catch (error) {
        logger.error('Error al confirmar downgrade', {
            memberId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Identifica candidatos para upgrade
 */
async function identifyUpgradeCandidates(targetTier = 'plus') {
    try {
        const { data: candidates, error } = await supabase
            .rpc('identify_upgrade_candidates', {
                p_target_tier: targetTier
            });
        
        if (error) throw error;
        
        logger.info('Candidatos identificados', {
            targetTier,
            count: candidates.length
        });
        
        return candidates;
    } catch (error) {
        logger.error('Error al identificar candidatos', {
            targetTier,
            error: error.message
        });
        throw error;
    }
}

/**
 * Programa sesión de coaching 1:1 (Pro tier)
 */
async function scheduleCoachingSession(memberId, sessionData) {
    try {
        const currentTier = await getMemberCurrentTier(memberId);
        
        if (currentTier !== 'pro') {
            throw new AppError(
                'Sesiones de coaching solo disponibles para tier Pro',
                ErrorTypes.VALIDATION,
                403
            );
        }
        
        const { data: session, error } = await supabase
            .from('coaching_sessions')
            .insert({
                member_id: memberId,
                coach_name: sessionData.coach_name,
                session_date: sessionData.session_date,
                duration_minutes: sessionData.duration_minutes || 60,
                session_type: sessionData.session_type
            })
            .select()
            .single();
        
        if (error) throw error;
        
        logger.info('Sesión de coaching programada', {
            memberId,
            sessionId: session.id
        });
        
        return session;
    } catch (error) {
        logger.error('Error al programar coaching', {
            memberId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Genera plan de entrenamiento adaptativo (Plus/Pro tier)
 */
async function generateAdaptiveTrainingPlan(memberId, planData) {
    try {
        const currentTier = await getMemberCurrentTier(memberId);
        
        if (!['plus', 'pro'].includes(currentTier)) {
            throw new AppError(
                'Planes adaptativos solo disponibles para tiers Plus y Pro',
                ErrorTypes.VALIDATION,
                403
            );
        }
        
        // Desactivar planes anteriores
        await supabase
            .from('training_plans')
            .update({ active: false })
            .eq('member_id', memberId)
            .eq('active', true);
        
        // Crear nuevo plan
        const { data: plan, error } = await supabase
            .from('training_plans')
            .insert({
                member_id: memberId,
                plan_name: planData.plan_name,
                goal: planData.goal,
                duration_weeks: planData.duration_weeks || 12,
                sessions_per_week: planData.sessions_per_week || 4,
                plan_details: planData.plan_details,
                start_date: new Date().toISOString().split('T')[0],
                active: true
            })
            .select()
            .single();
        
        if (error) throw error;
        
        logger.info('Plan de entrenamiento generado', {
            memberId,
            planId: plan.id
        });
        
        return plan;
    } catch (error) {
        logger.error('Error al generar plan', {
            memberId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Obtiene beneficios de un tier
 */
async function getTierBenefits(tierName = null) {
    try {
        let query = supabase
            .from('tier_benefits_catalog')
            .select('*')
            .order('display_order', { ascending: true });
        
        if (tierName) {
            query = query.eq('tier_name', tierName);
        }
        
        const { data: benefits, error } = await query;
        
        if (error) throw error;
        
        return benefits;
    } catch (error) {
        logger.error('Error al obtener beneficios', {
            tierName,
            error: error.message
        });
        throw error;
    }
}

/**
 * Calcula ROI de tiers premium
 */
async function calculateTierROI() {
    try {
        const { data: roi, error } = await supabase
            .rpc('calculate_tier_roi');
        
        if (error) throw error;
        
        return roi;
    } catch (error) {
        logger.error('Error al calcular ROI de tiers', {
            error: error.message
        });
        throw error;
    }
}

/**
 * Obtiene estadísticas de conversión
 */
async function getTierStats() {
    try {
        const roi = await calculateTierROI();
        
        const stats = {
            tiers: roi,
            totalRevenue: roi.reduce((sum, t) => sum + parseFloat(t.monthly_revenue || 0), 0),
            totalPremiumMembers: roi
                .filter(t => ['plus', 'pro'].includes(t.tier_name))
                .reduce((sum, t) => sum + parseInt(t.total_subscribers || 0), 0)
        };
        
        return stats;
    } catch (error) {
        logger.error('Error al obtener stats de tiers', {
            error: error.message
        });
        throw error;
    }
}

module.exports = {
    getMemberCurrentTier,
    upgradeMemberTier,
    downgradeMemberTier,
    confirmDowngrade,
    identifyUpgradeCandidates,
    scheduleCoachingSession,
    generateAdaptiveTrainingPlan,
    getTierBenefits,
    calculateTierROI,
    getTierStats,
    TIER_PRICES
};
