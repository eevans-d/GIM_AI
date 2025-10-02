/**
 * Webhook Service
 * Manages webhook subscriptions and event delivery
 * Supports HMAC signature verification and retry logic
 */

const crypto = require('crypto');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const Bull = require('bull');
const logger = require('../utils/logger').createLogger('webhook-service');
const { AppError, ErrorTypes } = require('../utils/error-handler');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const webhookQueue = new Bull('webhook-delivery', REDIS_URL);

// Supported event types
const WEBHOOK_EVENTS = {
  MEMBER_CREATED: 'member.created',
  MEMBER_UPDATED: 'member.updated',
  MEMBER_DELETED: 'member.deleted',
  CHECKIN_COMPLETED: 'checkin.completed',
  CLASS_BOOKED: 'class.booked',
  CLASS_CANCELLED: 'class.cancelled',
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_OVERDUE: 'payment.overdue',
  PAYMENT_FAILED: 'payment.failed'
};

class WebhookService {
  /**
   * Register new webhook subscription
   */
  static async registerWebhook(webhookData) {
    try {
      // Validate events
      const validEvents = webhookData.events.filter(event => 
        Object.values(WEBHOOK_EVENTS).includes(event)
      );

      if (validEvents.length === 0) {
        throw new AppError('No valid events specified', ErrorTypes.VALIDATION, 400);
      }

      // Generate webhook secret for HMAC
      const webhookSecret = crypto.randomBytes(32).toString('hex');

      const { data: webhook, error } = await supabase
        .from('webhooks')
        .insert({
          client_id: webhookData.client_id,
          webhook_url: webhookData.url,
          webhook_secret: webhookSecret,
          events: validEvents,
          retry_count: webhookData.retry_count || 3,
          timeout_seconds: webhookData.timeout_seconds || 10
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to register webhook', { error });
        throw new AppError('Webhook registration failed', ErrorTypes.INTERNAL, 500);
      }

      logger.info('Webhook registered', { 
        webhook_id: webhook.webhook_id, 
        client_id: webhookData.client_id,
        events: validEvents 
      });

      return {
        webhook_id: webhook.webhook_id,
        webhook_url: webhook.webhook_url,
        webhook_secret: webhookSecret, // Only returned once!
        events: webhook.events,
        created_at: webhook.created_at
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Webhook registration failed', { error });
      throw new AppError('Webhook registration failed', ErrorTypes.INTERNAL, 500);
    }
  }

  /**
   * Trigger webhook event
   * Queues webhook delivery for all subscribed webhooks
   */
  static async triggerEvent(eventType, payload) {
    try {
      // Find all active webhooks subscribed to this event
      const { data: webhooks, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('is_active', true)
        .contains('events', [eventType]);

      if (error) {
        logger.error('Failed to fetch webhooks', { error });
        return;
      }

      if (webhooks.length === 0) {
        logger.debug('No webhooks subscribed to event', { event_type: eventType });
        return;
      }

      logger.info(`Triggering ${webhooks.length} webhooks for event`, { 
        event_type: eventType 
      });

      // Queue delivery for each webhook
      for (const webhook of webhooks) {
        await this.queueDelivery(webhook, eventType, payload);
      }
    } catch (error) {
      logger.error('Failed to trigger webhook event', { error, event_type: eventType });
    }
  }

  /**
   * Queue webhook delivery
   */
  static async queueDelivery(webhook, eventType, payload) {
    try {
      // Create delivery record
      const { data: delivery, error } = await supabase
        .from('webhook_deliveries')
        .insert({
          webhook_id: webhook.webhook_id,
          event_type: eventType,
          payload: payload,
          max_attempts: webhook.retry_count,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create delivery record', { error });
        return;
      }

      // Add to Bull queue
      await webhookQueue.add(
        'deliver',
        {
          delivery_id: delivery.delivery_id,
          webhook_url: webhook.webhook_url,
          webhook_secret: webhook.webhook_secret,
          event_type: eventType,
          payload: payload,
          timeout_seconds: webhook.timeout_seconds
        },
        {
          attempts: webhook.retry_count,
          backoff: {
            type: 'exponential',
            delay: 5000 // Start with 5 seconds
          }
        }
      );

      logger.debug('Webhook delivery queued', { 
        delivery_id: delivery.delivery_id,
        webhook_id: webhook.webhook_id 
      });
    } catch (error) {
      logger.error('Failed to queue webhook delivery', { error });
    }
  }

  /**
   * Deliver webhook with HMAC signature
   */
  static async deliverWebhook(deliveryData) {
    const startTime = Date.now();
    
    try {
      // Generate HMAC signature
      const signature = this.generateSignature(
        deliveryData.webhook_secret,
        deliveryData.payload
      );

      // Prepare payload
      const webhookPayload = {
        event: deliveryData.event_type,
        timestamp: new Date().toISOString(),
        data: deliveryData.payload
      };

      // Send HTTP POST request
      const response = await axios.post(
        deliveryData.webhook_url,
        webhookPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': deliveryData.event_type,
            'User-Agent': 'GIM-Webhook/1.0'
          },
          timeout: deliveryData.timeout_seconds * 1000
        }
      );

      const responseTime = Date.now() - startTime;

      // Update delivery record as success
      await supabase
        .from('webhook_deliveries')
        .update({
          http_status: response.status,
          response_body: JSON.stringify(response.data).substring(0, 1000), // Limit size
          response_time: responseTime,
          status: 'success',
          signature: signature,
          delivered_at: new Date().toISOString()
        })
        .eq('delivery_id', deliveryData.delivery_id);

      logger.info('Webhook delivered successfully', { 
        delivery_id: deliveryData.delivery_id,
        response_time: responseTime,
        status: response.status
      });

      return { success: true, status: response.status };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error.response?.data || error.message;
      const httpStatus = error.response?.status || 0;

      // Update delivery record as failed
      await supabase
        .from('webhook_deliveries')
        .update({
          http_status: httpStatus,
          response_time: responseTime,
          status: 'failed',
          error_message: typeof errorMessage === 'string' 
            ? errorMessage.substring(0, 500) 
            : JSON.stringify(errorMessage).substring(0, 500)
        })
        .eq('delivery_id', deliveryData.delivery_id);

      logger.warn('Webhook delivery failed', { 
        delivery_id: deliveryData.delivery_id,
        error: errorMessage,
        http_status: httpStatus
      });

      throw error; // Re-throw for Bull retry logic
    }
  }

  /**
   * Generate HMAC-SHA256 signature
   */
  static generateSignature(secret, payload) {
    const payloadString = typeof payload === 'string' 
      ? payload 
      : JSON.stringify(payload);
    
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Verify webhook signature (for receiving webhooks)
   */
  static verifySignature(secret, payload, signature) {
    const expectedSignature = this.generateSignature(secret, payload);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * List webhooks for a client
   */
  static async listWebhooks(clientId) {
    try {
      const { data: webhooks, error } = await supabase
        .from('webhooks')
        .select('webhook_id, webhook_url, events, is_active, created_at, updated_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to list webhooks', { error });
        throw new AppError('Failed to retrieve webhooks', ErrorTypes.INTERNAL, 500);
      }

      return webhooks;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to list webhooks', { error });
      throw new AppError('Failed to retrieve webhooks', ErrorTypes.INTERNAL, 500);
    }
  }

  /**
   * Delete webhook
   */
  static async deleteWebhook(webhookId, clientId) {
    try {
      const { error } = await supabase
        .from('webhooks')
        .delete()
        .eq('webhook_id', webhookId)
        .eq('client_id', clientId);

      if (error) {
        logger.error('Failed to delete webhook', { error });
        throw new AppError('Failed to delete webhook', ErrorTypes.INTERNAL, 500);
      }

      logger.info('Webhook deleted', { webhook_id: webhookId });
      return { success: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to delete webhook', { error });
      throw new AppError('Failed to delete webhook', ErrorTypes.INTERNAL, 500);
    }
  }

  /**
   * Get webhook delivery stats
   */
  static async getWebhookStats(webhookId) {
    try {
      const { data: stats, error } = await supabase
        .rpc('get_webhook_stats', { p_webhook_id: webhookId });

      if (error) {
        logger.error('Failed to get webhook stats', { error });
        throw new AppError('Failed to retrieve webhook statistics', ErrorTypes.INTERNAL, 500);
      }

      return stats[0] || {
        total_deliveries: 0,
        successful_deliveries: 0,
        failed_deliveries: 0,
        pending_deliveries: 0,
        avg_response_time: 0,
        success_rate: 0
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to get webhook stats', { error });
      throw new AppError('Failed to retrieve webhook statistics', ErrorTypes.INTERNAL, 500);
    }
  }
}

// Export event types for use in other modules
WebhookService.EVENTS = WEBHOOK_EVENTS;

module.exports = WebhookService;
