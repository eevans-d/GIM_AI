/**
 * Webhook Delivery Worker
 * Processes webhook delivery queue with retry logic
 * Handles HMAC signing and delivery tracking
 */

const Bull = require('bull');
const WebhookService = require('../services/webhook-service');
const logger = require('../utils/logger').createLogger('webhook-worker');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Bull queue
const webhookQueue = new Bull('webhook-delivery', REDIS_URL, {
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500 // Keep last 500 failed jobs
  }
});

/**
 * Process webhook delivery
 */
webhookQueue.process('deliver', async (job) => {
  const { delivery_id, webhook_url, webhook_secret, event_type, payload, timeout_seconds } = job.data;

  logger.info('Processing webhook delivery', { 
    delivery_id, 
    webhook_url,
    event_type,
    attempt: job.attemptsMade + 1
  });

  try {
    await WebhookService.deliverWebhook({
      delivery_id,
      webhook_url,
      webhook_secret,
      event_type,
      payload,
      timeout_seconds
    });

    logger.info('Webhook delivered successfully', { 
      delivery_id,
      attempt: job.attemptsMade + 1
    });

    return { success: true, delivery_id };
  } catch (error) {
    logger.error('Webhook delivery failed', { 
      delivery_id,
      error: error.message,
      attempt: job.attemptsMade + 1
    });

    throw error; // Will trigger retry
  }
});

/**
 * Handle completed jobs
 */
webhookQueue.on('completed', (job, result) => {
  logger.info('Webhook job completed', { 
    job_id: job.id, 
    delivery_id: result.delivery_id 
  });
});

/**
 * Handle failed jobs (after all retries exhausted)
 */
webhookQueue.on('failed', (job, error) => {
  logger.error('Webhook job failed permanently', { 
    job_id: job.id, 
    delivery_id: job.data.delivery_id,
    error: error.message,
    attempts: job.attemptsMade
  });
});

/**
 * Handle stalled jobs
 */
webhookQueue.on('stalled', (job) => {
  logger.warn('Webhook job stalled', { 
    job_id: job.id, 
    delivery_id: job.data.delivery_id 
  });
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing webhook queue gracefully');
  await webhookQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing webhook queue gracefully');
  await webhookQueue.close();
  process.exit(0);
});

logger.info('Webhook delivery worker started');

module.exports = webhookQueue;
