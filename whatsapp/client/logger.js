/**
 * WhatsApp Business API - Logger Module
 * Logs all WhatsApp messages to Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const winston = require('winston');
require('winston-daily-rotate-file');

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Winston logger for file logging
const fileLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // Write all logs to rotating file
    new winston.transports.DailyRotateFile({
      filename: 'logs/whatsapp-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
    // Write errors to separate file
    new winston.transports.DailyRotateFile({
      filename: 'logs/whatsapp-error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
});

/**
 * Log message to database
 */
async function logMessage(messageData) {
  try {
    // Get member_id from phone if available
    let memberId = null;
    if (messageData.phone_number) {
      const { data: member } = await supabase
        .from('members')
        .select('id')
        .eq('phone', messageData.phone_number)
        .single();
      
      memberId = member ? member.id : null;
    }

    // Calculate daily count for outbound messages
    let dailyCount = 1;
    if (messageData.direction === 'outbound') {
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('whatsapp_messages')
        .select('id', { count: 'exact', head: true })
        .eq('phone_number', messageData.phone_number)
        .eq('direction', 'outbound')
        .gte('created_at', today);
      
      dailyCount = (count || 0) + 1;
    }

    // Insert into database
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .insert({
        member_id: memberId,
        direction: messageData.direction,
        phone_number: messageData.phone_number,
        message_type: messageData.message_type,
        template_name: messageData.template_name,
        content: messageData.content,
        status: messageData.status || 'sent',
        whatsapp_message_id: messageData.whatsapp_message_id,
        daily_count: dailyCount,
        error_message: messageData.error_message,
        sent_at: messageData.direction === 'outbound' ? new Date() : null,
      })
      .select()
      .single();

    if (error) {
      fileLogger.error('Error logging to database', { error });
      return null;
    }

    fileLogger.info('Message logged', {
      id: data.id,
      direction: messageData.direction,
      phone: messageData.phone_number,
      type: messageData.message_type,
    });

    return data;
  } catch (error) {
    fileLogger.error('Error in logMessage', { error: error.message, messageData });
    return null;
  }
}

/**
 * Update message status
 */
async function updateMessageStatus(whatsappMessageId, statusData) {
  try {
    const updates = {
      status: statusData.status,
    };

    // Set appropriate timestamp based on status
    switch (statusData.status) {
      case 'delivered':
        updates.delivered_at = statusData.timestamp;
        break;
      case 'read':
        updates.read_at = statusData.timestamp;
        break;
      case 'failed':
        updates.failed_at = statusData.timestamp;
        updates.error_message = statusData.error ? statusData.error.message : 'Unknown error';
        break;
    }

    const { data, error } = await supabase
      .from('whatsapp_messages')
      .update(updates)
      .eq('whatsapp_message_id', whatsappMessageId)
      .select()
      .single();

    if (error) {
      fileLogger.error('Error updating message status', { error, whatsappMessageId });
      return null;
    }

    fileLogger.info('Message status updated', {
      id: data.id,
      status: statusData.status,
    });

    return data;
  } catch (error) {
    fileLogger.error('Error in updateMessageStatus', {
      error: error.message,
      whatsappMessageId,
    });
    return null;
  }
}

/**
 * Get message history for a phone number
 */
async function getMessageHistory(phoneNumber, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      fileLogger.error('Error getting message history', { error, phoneNumber });
      return [];
    }

    return data;
  } catch (error) {
    fileLogger.error('Error in getMessageHistory', {
      error: error.message,
      phoneNumber,
    });
    return [];
  }
}

/**
 * Get daily message count for a phone number
 */
async function getDailyMessageCount(phoneNumber) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { count, error } = await supabase
      .from('whatsapp_messages')
      .select('id', { count: 'exact', head: true })
      .eq('phone_number', phoneNumber)
      .eq('direction', 'outbound')
      .gte('created_at', today);

    if (error) {
      fileLogger.error('Error getting daily count', { error, phoneNumber });
      return 0;
    }

    return count || 0;
  } catch (error) {
    fileLogger.error('Error in getDailyMessageCount', {
      error: error.message,
      phoneNumber,
    });
    return 0;
  }
}

/**
 * Get failed messages for retry
 */
async function getFailedMessages(limit = 100) {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('status', 'failed')
      .eq('direction', 'outbound')
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      fileLogger.error('Error getting failed messages', { error });
      return [];
    }

    return data;
  } catch (error) {
    fileLogger.error('Error in getFailedMessages', { error: error.message });
    return [];
  }
}

/**
 * Get delivery statistics
 */
async function getDeliveryStats(startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('status')
      .eq('direction', 'outbound')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) {
      fileLogger.error('Error getting delivery stats', { error });
      return null;
    }

    const stats = {
      total: data.length,
      sent: data.filter(m => m.status === 'sent').length,
      delivered: data.filter(m => m.status === 'delivered').length,
      read: data.filter(m => m.status === 'read').length,
      failed: data.filter(m => m.status === 'failed').length,
    };

    stats.delivery_rate = stats.total > 0 
      ? ((stats.delivered / stats.total) * 100).toFixed(2) 
      : 0;
    stats.read_rate = stats.delivered > 0 
      ? ((stats.read / stats.delivered) * 100).toFixed(2) 
      : 0;

    return stats;
  } catch (error) {
    fileLogger.error('Error in getDeliveryStats', { error: error.message });
    return null;
  }
}

// Expose winston logger methods
const info = (message, meta) => fileLogger.info(message, meta);
const warn = (message, meta) => fileLogger.warn(message, meta);
const error = (message, meta) => fileLogger.error(message, meta);
const debug = (message, meta) => fileLogger.debug(message, meta);

module.exports = {
  logMessage,
  updateMessageStatus,
  getMessageHistory,
  getDailyMessageCount,
  getFailedMessages,
  getDeliveryStats,
  info,
  warn,
  error,
  debug,
};
