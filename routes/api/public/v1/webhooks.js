/**
 * Public API v1 - Webhook Routes
 * Manage webhook subscriptions and view delivery history
 */

const express = require('express');
const router = express.Router();
const WebhookService = require('../../../../services/webhook-service');
const { authenticate, requireScopes } = require('../../../../middleware/oauth2-middleware');
const logger = require('../../../../utils/logger').createLogger('public-api-webhooks');

/**
 * POST /webhooks
 * Register new webhook subscription
 */
router.post('/', authenticate, requireScopes('admin:*', 'write:webhooks'), async (req, res) => {
  try {
    const webhookData = {
      client_id: req.auth.client_id,
      url: req.body.url,
      events: req.body.events,
      retry_count: req.body.retry_count || 3,
      timeout_seconds: req.body.timeout_seconds || 10
    };

    const webhook = await WebhookService.registerWebhook(webhookData);
    logger.info('Webhook registered', { webhook_id: webhook.webhook_id });
    
    res.status(201).json(webhook);
  } catch (error) {
    logger.error('Webhook registration error', { error: error.message });
    res.status(error.statusCode || 500).json({
      error: 'registration_failed',
      message: error.message
    });
  }
});

/**
 * GET /webhooks
 * List webhooks for authenticated client
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const webhooks = await WebhookService.listWebhooks(req.auth.client_id);
    res.json({ webhooks, count: webhooks.length });
  } catch (error) {
    logger.error('Webhook listing error', { error: error.message });
    res.status(500).json({
      error: 'listing_failed',
      message: error.message
    });
  }
});

/**
 * GET /webhooks/:webhookId/stats
 * Get delivery statistics for webhook
 */
router.get('/:webhookId/stats', authenticate, async (req, res) => {
  try {
    const stats = await WebhookService.getWebhookStats(req.params.webhookId);
    res.json(stats);
  } catch (error) {
    logger.error('Webhook stats error', { error: error.message });
    res.status(500).json({
      error: 'stats_failed',
      message: error.message
    });
  }
});

/**
 * DELETE /webhooks/:webhookId
 * Delete webhook subscription
 */
router.delete('/:webhookId', authenticate, async (req, res) => {
  try {
    await WebhookService.deleteWebhook(req.params.webhookId, req.auth.client_id);
    logger.info('Webhook deleted', { webhook_id: req.params.webhookId });
    res.json({ success: true });
  } catch (error) {
    logger.error('Webhook deletion error', { error: error.message });
    res.status(500).json({
      error: 'deletion_failed',
      message: error.message
    });
  }
});

/**
 * GET /webhooks/events
 * List available webhook event types
 */
router.get('/events', (req, res) => {
  res.json({
    events: Object.values(WebhookService.EVENTS),
    count: Object.keys(WebhookService.EVENTS).length
  });
});

module.exports = router;
