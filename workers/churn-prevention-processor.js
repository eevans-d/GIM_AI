// PROMPT 23: ADVANCED AI FEATURES - CHURN PREVENTION WORKER
// Bull queue processor for daily churn analysis and automated interventions

const Bull = require('bull');
const logger = require('../utils/logger').createLogger('churn-worker');
const churnPrediction = require('../services/churn-prediction-service');
const whatsappSender = require('../whatsapp/client/sender');

// ============================================
// BULL QUEUE SETUP
// ============================================

const churnQueue = new Bull('churn-prevention', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

// ============================================
// QUEUE PROCESSOR
// ============================================

churnQueue.process('daily-analysis', async (job) => {
  logger.info('Starting daily churn analysis');

  try {
    const candidates = await churnPrediction.findHighRiskMembers(70, 100);

    logger.info('High-risk members identified', { count: candidates.length });

    let interventionsSent = 0;

    for (const candidate of candidates) {
      try {
        // Send intervention message
        await whatsappSender.sendTemplate(
          candidate.telefono,
          'churn_intervention',
          {
            member_name: candidate.nombre,
            language: 'es'
          },
          {
            force: false,  // Respect business hours
            priority: 'high'
          }
        );

        interventionsSent++;

        // Log intervention
        logger.info('Churn intervention sent', {
          memberId: candidate.id,
          churnScore: candidate.churn_score
        });

        // Delay between sends
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        logger.error('Failed to send intervention', {
          memberId: candidate.id,
          error: error.message
        });
      }
    }

    return {
      analyzed: candidates.length,
      interventions_sent: interventionsSent,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Daily churn analysis failed', { error });
    throw error;
  }
});

// ============================================
// CRON SCHEDULE
// ============================================

// Run daily at 9:00 AM
churnQueue.add('daily-analysis', {}, {
  repeat: {
    cron: '0 9 * * *',
    tz: 'America/Mexico_City'
  }
});

logger.info('Churn prevention worker initialized with daily cron at 9:00 AM');

// ============================================
// EXPORTS
// ============================================

module.exports = churnQueue;
