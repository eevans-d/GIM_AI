// PROMPT 23: ADVANCED AI FEATURES - CHURN PREDICTION SERVICE
// ML-based churn prediction with interpretable scoring and automated interventions

const logger = require('../utils/logger').createLogger('churn-prediction');
const { AppError, ErrorTypes } = require('../utils/error-handler');
const { getGeminiService } = require('./gemini-service');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================
// CHURN PREDICTION SERVICE
// ============================================

class ChurnPredictionService {
  /**
   * Calculate churn score (0-100)
   * Higher score = higher risk of churn
   */
  async calculateChurnScore(memberId) {
    try {
      const memberData = await this.getMemberData(memberId);
      
      if (!memberData) {
        throw new AppError('Member not found', ErrorTypes.NOT_FOUND, 404, { memberId });
      }

      const score = {
        checkinFrequency: this.scoreCheckinFrequency(memberData.checkins),        // 30 points
        paymentPattern: this.scorePaymentPattern(memberData.payments),             // 25 points
        engagement: this.scoreEngagement(memberData.engagement),                    // 20 points
        classVariety: this.scoreClassVariety(memberData.classVariety),             // 15 points
        socialInteraction: this.scoreSocialInteraction(memberData.socialData),     // 10 points
      };

      const totalScore = Object.values(score).reduce((sum, val) => sum + val, 0);
      const riskLevel = this.getRiskLevel(totalScore);

      logger.info('Churn score calculated', {
        memberId,
        totalScore,
        riskLevel,
        breakdown: score
      });

      return {
        member_id: memberId,
        churn_score: totalScore,
        risk_level: riskLevel,
        score_breakdown: score,
        factors: this.getKeyFactors(score),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to calculate churn score', { memberId, error });
      throw error;
    }
  }

  /**
   * Score check-in frequency (0-30 points)
   * Lower frequency = higher churn risk
   */
  scoreCheckinFrequency(checkins) {
    const last30Days = checkins.filter(c => {
      const days = (Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return days <= 30;
    });

    const frequency = last30Days.length;

    if (frequency >= 12) return 0;      // 3+ times/week - excellent
    if (frequency >= 8) return 5;       // 2 times/week - good
    if (frequency >= 4) return 15;      // 1 time/week - moderate risk
    if (frequency >= 2) return 25;      // Rare visits - high risk
    return 30;                          // No visits - critical risk
  }

  /**
   * Score payment pattern (0-25 points)
   * Late payments and debt = higher risk
   */
  scorePaymentPattern(payments) {
    if (!payments || payments.length === 0) return 25;

    const lastPayment = payments[0];
    const daysSincePayment = (Date.now() - new Date(lastPayment.fecha_pago).getTime()) / (1000 * 60 * 60 * 24);
    const currentDebt = lastPayment.deuda_actual || 0;

    let score = 0;

    // Days since last payment
    if (daysSincePayment > 45) score += 15;
    else if (daysSincePayment > 35) score += 10;
    else if (daysSincePayment > 32) score += 5;

    // Current debt
    if (currentDebt > 1000) score += 10;
    else if (currentDebt > 500) score += 5;

    return Math.min(score, 25);
  }

  /**
   * Score engagement (0-20 points)
   * Low engagement = higher risk
   */
  scoreEngagement(engagement) {
    const {
      whatsapp_responses = 0,
      survey_responses = 0,
      app_logins = 0
    } = engagement;

    const totalEngagement = whatsapp_responses + survey_responses + (app_logins * 2);

    if (totalEngagement >= 15) return 0;
    if (totalEngagement >= 10) return 5;
    if (totalEngagement >= 5) return 10;
    if (totalEngagement >= 2) return 15;
    return 20;
  }

  /**
   * Score class variety (0-15 points)
   * Low variety = higher risk (boredom)
   */
  scoreClassVariety(classVariety) {
    const uniqueClasses = classVariety?.unique_classes || 0;

    if (uniqueClasses >= 5) return 0;
    if (uniqueClasses >= 3) return 5;
    if (uniqueClasses >= 2) return 10;
    return 15;
  }

  /**
   * Score social interaction (0-10 points)
   * Low social connection = higher risk
   */
  scoreSocialInteraction(socialData) {
    const {
      friends_count = 0,
      instructor_interactions = 0
    } = socialData;

    const socialScore = friends_count + (instructor_interactions * 2);

    if (socialScore >= 10) return 0;
    if (socialScore >= 5) return 3;
    if (socialScore >= 2) return 7;
    return 10;
  }

  /**
   * Get risk level from score
   */
  getRiskLevel(score) {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  /**
   * Get key contributing factors
   */
  getKeyFactors(scoreBreakdown) {
    const factors = [];

    if (scoreBreakdown.checkinFrequency >= 15) {
      factors.push({
        factor: 'low_attendance',
        severity: 'high',
        description: 'Frecuencia de asistencia muy baja'
      });
    }

    if (scoreBreakdown.paymentPattern >= 15) {
      factors.push({
        factor: 'payment_issues',
        severity: 'high',
        description: 'Problemas de pago o deuda acumulada'
      });
    }

    if (scoreBreakdown.engagement >= 15) {
      factors.push({
        factor: 'low_engagement',
        severity: 'medium',
        description: 'Bajo nivel de interacción y compromiso'
      });
    }

    if (scoreBreakdown.classVariety >= 10) {
      factors.push({
        factor: 'limited_variety',
        severity: 'medium',
        description: 'Poca variedad en clases asistidas'
      });
    }

    if (scoreBreakdown.socialInteraction >= 7) {
      factors.push({
        factor: 'weak_social_ties',
        severity: 'low',
        description: 'Conexión social débil con comunidad'
      });
    }

    return factors;
  }

  /**
   * Get AI-powered insights using Gemini
   */
  async getAIInsights(memberId, churnScore) {
    try {
      const gemini = getGeminiService();
      
      const memberData = await this.getMemberData(memberId);
      
      const aiData = {
        member_id: memberId,
        churn_score: churnScore.churn_score,
        risk_level: churnScore.risk_level,
        factors: churnScore.factors,
        recent_activity: memberData.checkins.slice(0, 10),
        payment_history: memberData.payments.slice(0, 3)
      };

      const insights = await gemini.predictChurn(aiData);

      logger.info('AI insights generated', { memberId, insights });

      return insights;
    } catch (error) {
      logger.error('Failed to get AI insights', { memberId, error });
      // Return default insights if AI fails
      return {
        churn_score: churnScore.churn_score,
        reasons: churnScore.factors.map(f => f.description),
        interventions: ['Contacto personalizado recomendado']
      };
    }
  }

  /**
   * Get member data from database
   */
  async getMemberData(memberId) {
    // Get member info
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      throw new AppError('Member not found', ErrorTypes.NOT_FOUND, 404, { memberId });
    }

    // Get check-ins (last 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: checkins } = await supabase
      .from('checkins')
      .select('id, created_at, clase_id')
      .eq('miembro_id', memberId)
      .gte('created_at', ninetyDaysAgo)
      .order('created_at', { ascending: false });

    // Get payments
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('member_id', memberId)
      .order('fecha_pago', { ascending: false })
      .limit(5);

    // Calculate engagement metrics
    const { data: whatsappMessages } = await supabase
      .from('whatsapp_messages')
      .select('id')
      .eq('member_id', memberId)
      .eq('direction', 'incoming')
      .gte('created_at', ninetyDaysAgo);

    // Get class variety
    const uniqueClasses = [...new Set(checkins?.map(c => c.clase_id) || [])];

    return {
      member,
      checkins: checkins || [],
      payments: payments || [],
      engagement: {
        whatsapp_responses: whatsappMessages?.length || 0,
        survey_responses: 0,  // TODO: Implement survey tracking
        app_logins: 0         // TODO: Implement app login tracking
      },
      classVariety: {
        unique_classes: uniqueClasses.length,
        total_checkins: checkins?.length || 0
      },
      socialData: {
        friends_count: 0,           // TODO: Implement friend system
        instructor_interactions: 0   // TODO: Track instructor interactions
      }
    };
  }

  /**
   * Find high-risk members
   */
  async findHighRiskMembers(threshold = 70, limit = 50) {
    try {
      const { data: members } = await supabase
        .from('members')
        .select('id, nombre, apellido, telefono')
        .eq('activo', true)
        .limit(limit * 2); // Get more to filter

      const predictions = [];

      for (const member of members) {
        try {
          const churnScore = await this.calculateChurnScore(member.id);
          
          if (churnScore.churn_score >= threshold) {
            predictions.push({
              ...member,
              ...churnScore
            });
          }
        } catch (error) {
          logger.error('Failed to calculate churn for member', { memberId: member.id, error });
        }
      }

      // Sort by churn score descending
      predictions.sort((a, b) => b.churn_score - a.churn_score);

      logger.info('High-risk members identified', {
        total: predictions.length,
        threshold
      });

      return predictions.slice(0, limit);
    } catch (error) {
      logger.error('Failed to find high-risk members', { error });
      throw error;
    }
  }

  /**
   * Save prediction to database
   */
  async savePrediction(prediction) {
    try {
      const { error } = await supabase
        .from('churn_predictions')
        .insert({
          member_id: prediction.member_id,
          churn_score: prediction.churn_score,
          risk_level: prediction.risk_level,
          score_breakdown: prediction.score_breakdown,
          key_factors: prediction.factors,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      logger.info('Churn prediction saved', { memberId: prediction.member_id });
    } catch (error) {
      logger.error('Failed to save prediction', { error });
    }
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = new ChurnPredictionService();
