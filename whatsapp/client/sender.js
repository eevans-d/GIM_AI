/**
 * WhatsApp Business API - Sender Module
 * Handles outbound message sending with queue and rate limiting
 */

const axios = require('axios');
const Queue = require('bull');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const logger = require('./logger');
const config = require('../../config/whatsapp.config');

// Message queue with Redis
const messageQueue = new Queue('whatsapp-messages', process.env.REDIS_URL || 'redis://localhost:6379');

// Rate limiter: max 2 messages per day per user, 9-21h window
const rateLimiter = new RateLimiterRedis({
  storeClient: messageQueue.client,
  keyPrefix: 'whatsapp_rate',
  points: parseInt(process.env.WHATSAPP_MAX_MESSAGES_PER_DAY) || 2,
  duration: 24 * 60 * 60, // 24 hours
  blockDuration: 0,
});

/**
 * Check if current time is within business hours (9-21h)
 */
function isWithinBusinessHours() {
  const now = new Date();
  const hour = now.getHours();
  const startHour = parseInt(process.env.WHATSAPP_HOURLY_WINDOW_START) || 9;
  const endHour = parseInt(process.env.WHATSAPP_HOURLY_WINDOW_END) || 21;
  
  return hour >= startHour && hour < endHour;
}

/**
 * Send WhatsApp template message (HSM)
 */
async function sendTemplate(to, templateName, params = {}, options = {}) {
  try {
    // Validate phone number
    const phone = to.replace(/\D/g, '');
    if (!phone || phone.length < 10) {
      throw new Error('Invalid phone number');
    }

    // Check rate limit
    try {
      await rateLimiter.consume(phone);
    } catch (rejRes) {
      logger.warn(`Rate limit exceeded for ${phone}`, { remaining: rejRes.remainingPoints });
      throw new Error('Rate limit exceeded');
    }

    // Check business hours unless force is true
    if (!options.force && !isWithinBusinessHours()) {
      // Queue for later
      return await queueMessage('template', to, { templateName, params }, {
        delay: getDelayUntilBusinessHours(),
      });
    }

    // Build template payload
    const payload = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: params.language || 'es' },
        components: buildTemplateComponents(templateName, params),
      },
    };

    // Send via WhatsApp API
    const response = await axios.post(
      `${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Log success
    await logger.logMessage({
      direction: 'outbound',
      phone_number: phone,
      message_type: 'template',
      template_name: templateName,
      status: 'sent',
      whatsapp_message_id: response.data.messages[0].id,
    });

    return response.data;
  } catch (error) {
    logger.error('Error sending template', { to, templateName, error: error.message });
    
    // Log failure
    await logger.logMessage({
      direction: 'outbound',
      phone_number: to,
      message_type: 'template',
      template_name: templateName,
      status: 'failed',
      error_message: error.message,
    });

    throw error;
  }
}

/**
 * Send text message (only works within 24h conversation window)
 */
async function sendText(to, message, options = {}) {
  try {
    const phone = to.replace(/\D/g, '');

    const payload = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: message },
    };

    const response = await axios.post(
      `${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    await logger.logMessage({
      direction: 'outbound',
      phone_number: phone,
      message_type: 'text',
      content: message,
      status: 'sent',
      whatsapp_message_id: response.data.messages[0].id,
    });

    return response.data;
  } catch (error) {
    logger.error('Error sending text', { to, error: error.message });
    throw error;
  }
}

/**
 * Send interactive button message
 */
async function sendInteractive(to, interactiveData) {
  try {
    const phone = to.replace(/\D/g, '');

    const payload = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'interactive',
      interactive: interactiveData,
    };

    const response = await axios.post(
      `${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    await logger.logMessage({
      direction: 'outbound',
      phone_number: phone,
      message_type: 'interactive',
      content: JSON.stringify(interactiveData),
      status: 'sent',
      whatsapp_message_id: response.data.messages[0].id,
    });

    return response.data;
  } catch (error) {
    logger.error('Error sending interactive', { to, error: error.message });
    throw error;
  }
}

/**
 * Queue message for later sending
 */
async function queueMessage(type, to, data, options = {}) {
  const job = await messageQueue.add(
    { type, to, data },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000, // 1 minute
      },
      ...options,
    }
  );

  logger.info('Message queued', { jobId: job.id, type, to });
  return { queued: true, jobId: job.id };
}

/**
 * Get delay in milliseconds until next business hours window
 */
function getDelayUntilBusinessHours() {
  const now = new Date();
  const hour = now.getHours();
  const startHour = parseInt(process.env.WHATSAPP_HOURLY_WINDOW_START) || 9;

  let delayHours;
  if (hour >= 21) {
    // After 21h, wait until 9h next day
    delayHours = (24 - hour) + startHour;
  } else {
    // Before 9h, wait until 9h
    delayHours = startHour - hour;
  }

  return delayHours * 60 * 60 * 1000; // Convert to milliseconds
}

/**
 * Build template components based on template name and params
 */
function buildTemplateComponents(templateName, params) {
  const templates = {
    bienvenida_nuevo_socio: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: params.name || '' },
        ],
      },
    ],
    checkin_confirmado: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: params.name || '' },
          { type: 'text', text: params.class || 'gimnasio' },
        ],
      },
    ],
    recordatorio_clase_24h: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: params.name || '' },
          { type: 'text', text: params.class || '' },
          { type: 'text', text: params.time || '' },
        ],
      },
    ],
    recordatorio_pago_d0: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: params.name || '' },
          { type: 'text', text: params.amount || '' },
          { type: 'text', text: params.link || '' },
        ],
      },
    ],
    recordatorio_pago_d3: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: params.name || '' },
          { type: 'text', text: params.amount || '' },
        ],
      },
    ],
    cobranza_contextual: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: params.name || '' },
          { type: 'text', text: params.amount || '' },
        ],
      },
    ],
  };

  return templates[templateName] || [];
}

/**
 * Process queued messages
 */
messageQueue.process(async (job) => {
  const { type, to, data } = job.data;

  // Wait until business hours
  while (!isWithinBusinessHours()) {
    await new Promise(resolve => setTimeout(resolve, 15 * 60 * 1000)); // Wait 15 min
  }

  // Send based on type
  switch (type) {
    case 'template':
      return await sendTemplate(to, data.templateName, data.params, { force: true });
    case 'text':
      return await sendText(to, data.message);
    case 'interactive':
      return await sendInteractive(to, data.interactiveData);
    default:
      throw new Error(`Unknown message type: ${type}`);
  }
});

// Handle queue errors
messageQueue.on('failed', (job, err) => {
  logger.error('Message job failed', {
    jobId: job.id,
    data: job.data,
    error: err.message,
  });
});

messageQueue.on('completed', (job, result) => {
  logger.info('Message job completed', {
    jobId: job.id,
    result,
  });
});

module.exports = {
  sendTemplate,
  sendText,
  sendInteractive,
  queueMessage,
  isWithinBusinessHours,
};
