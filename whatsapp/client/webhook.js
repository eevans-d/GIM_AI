/**
 * WhatsApp Business API - Webhook Module
 * Handles incoming messages and status updates
 */

const crypto = require('crypto');
const logger = require('./logger');

/**
 * Verify webhook signature from Meta
 */
function verifySignature(payload, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WHATSAPP_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expectedSignature}`)
  );
}

/**
 * Verify webhook during setup
 */
function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Webhook verification failed');
    res.sendStatus(403);
  }
}

/**
 * Process incoming webhook
 */
async function processWebhook(req, res) {
  try {
    // Verify signature
    const signature = req.headers['x-hub-signature-256'];
    if (signature && !verifySignature(JSON.stringify(req.body), signature)) {
      console.log('❌ Invalid signature');
      return res.sendStatus(403);
    }

    const body = req.body;

    // WhatsApp sends empty body for some webhooks
    if (!body.object || !body.entry) {
      return res.sendStatus(200);
    }

    // Process each entry
    for (const entry of body.entry) {
      if (!entry.changes) continue;

      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;

        // Process message status updates
        if (value.statuses) {
          for (const status of value.statuses) {
            await handleStatusUpdate(status);
          }
        }

        // Process incoming messages
        if (value.messages) {
          for (const message of value.messages) {
            await handleIncomingMessage(message, value.contacts);
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.sendStatus(500);
  }
}

/**
 * Handle message status updates (sent, delivered, read, failed)
 */
async function handleStatusUpdate(status) {
  try {
    await logger.updateMessageStatus(status.id, {
      status: status.status,
      timestamp: new Date(parseInt(status.timestamp) * 1000),
      error: status.errors ? status.errors[0] : null,
    });

    logger.info('Status update processed', {
      messageId: status.id,
      status: status.status,
    });
  } catch (error) {
    logger.error('Error handling status update', { status, error: error.message });
  }
}

/**
 * Handle incoming message from user
 */
async function handleIncomingMessage(message, contacts) {
  try {
    const from = message.from;
    const messageId = message.id;
    const timestamp = new Date(parseInt(message.timestamp) * 1000);

    // Get contact info
    const contact = contacts ? contacts.find(c => c.wa_id === from) : null;
    const contactName = contact ? contact.profile.name : 'Unknown';

    // Log incoming message
    await logger.logMessage({
      direction: 'inbound',
      phone_number: from,
      message_type: message.type,
      content: extractMessageContent(message),
      whatsapp_message_id: messageId,
      status: 'received',
    });

    logger.info('Incoming message received', {
      from,
      contactName,
      type: message.type,
      messageId,
    });

    // Process based on message type
    switch (message.type) {
      case 'text':
        await handleTextMessage(from, message.text.body, contactName);
        break;
      case 'button':
        await handleButtonResponse(from, message.button, contactName);
        break;
      case 'interactive':
        await handleInteractiveResponse(from, message.interactive, contactName);
        break;
      case 'image':
      case 'video':
      case 'document':
        await handleMediaMessage(from, message, contactName);
        break;
      default:
        logger.warn('Unsupported message type', { type: message.type });
    }
  } catch (error) {
    logger.error('Error handling incoming message', { message, error: error.message });
  }
}

/**
 * Extract content from different message types
 */
function extractMessageContent(message) {
  switch (message.type) {
    case 'text':
      return message.text.body;
    case 'button':
      return message.button.text;
    case 'interactive':
      if (message.interactive.type === 'button_reply') {
        return message.interactive.button_reply.title;
      } else if (message.interactive.type === 'list_reply') {
        return message.interactive.list_reply.title;
      }
      return JSON.stringify(message.interactive);
    case 'image':
    case 'video':
    case 'document':
      return `[${message.type}] ${message[message.type].caption || ''}`;
    default:
      return `[${message.type}]`;
  }
}

/**
 * Handle text message
 */
async function handleTextMessage(from, text, contactName) {
  const textLower = text.toLowerCase().trim();

  // Handle STOP/START commands
  if (textLower === 'stop' || textLower === 'baja') {
    await handleOptOut(from);
    return;
  }

  if (textLower === 'start' || textLower === 'alta') {
    await handleOptIn(from);
    return;
  }

  // Handle AYUDA/HELP
  if (textLower === 'ayuda' || textLower === 'help') {
    await handleHelpRequest(from);
    return;
  }

  // Forward to n8n for processing
  await forwardToN8n({
    type: 'text_message',
    from,
    contactName,
    text,
    timestamp: new Date(),
  });
}

/**
 * Handle button response
 */
async function handleButtonResponse(from, button, contactName) {
  await forwardToN8n({
    type: 'button_response',
    from,
    contactName,
    buttonId: button.payload,
    buttonText: button.text,
    timestamp: new Date(),
  });
}

/**
 * Handle interactive response (list/button)
 */
async function handleInteractiveResponse(from, interactive, contactName) {
  let responseData = {};

  if (interactive.type === 'button_reply') {
    responseData = {
      buttonId: interactive.button_reply.id,
      buttonTitle: interactive.button_reply.title,
    };
  } else if (interactive.type === 'list_reply') {
    responseData = {
      listId: interactive.list_reply.id,
      listTitle: interactive.list_reply.title,
      listDescription: interactive.list_reply.description,
    };
  }

  await forwardToN8n({
    type: 'interactive_response',
    from,
    contactName,
    ...responseData,
    timestamp: new Date(),
  });
}

/**
 * Handle media message
 */
async function handleMediaMessage(from, message, contactName) {
  const mediaType = message.type;
  const media = message[mediaType];

  await forwardToN8n({
    type: 'media_message',
    from,
    contactName,
    mediaType,
    mediaId: media.id,
    mimeType: media.mime_type,
    caption: media.caption,
    timestamp: new Date(),
  });
}

/**
 * Handle opt-out (STOP)
 */
async function handleOptOut(from) {
  try {
    // Update member in database
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    await supabase
      .from('members')
      .update({ whatsapp_opted_in: false })
      .eq('phone', from);

    logger.info('User opted out', { phone: from });
  } catch (error) {
    logger.error('Error handling opt-out', { from, error: error.message });
  }
}

/**
 * Handle opt-in (START)
 */
async function handleOptIn(from) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    await supabase
      .from('members')
      .update({ whatsapp_opted_in: true })
      .eq('phone', from);

    logger.info('User opted in', { phone: from });
  } catch (error) {
    logger.error('Error handling opt-in', { from, error: error.message });
  }
}

/**
 * Handle help request
 */
async function handleHelpRequest(from) {
  await forwardToN8n({
    type: 'help_request',
    from,
    timestamp: new Date(),
  });
}

/**
 * Forward to n8n for processing
 */
async function forwardToN8n(data) {
  try {
    const axios = require('axios');
    
    await axios.post(`${process.env.N8N_WEBHOOK_URL}/whatsapp-incoming`, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    logger.info('Message forwarded to n8n', { type: data.type, from: data.from });
  } catch (error) {
    logger.error('Error forwarding to n8n', { data, error: error.message });
  }
}

module.exports = {
  verifyWebhook,
  processWebhook,
  verifySignature,
};
