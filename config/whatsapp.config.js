/**
 * WhatsApp Configuration
 * Central configuration for WhatsApp Business API
 */

module.exports = {
  api: {
    url: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  },

  webhook: {
    verifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    secret: process.env.WHATSAPP_WEBHOOK_SECRET,
  },

  rateLimits: {
    maxMessagesPerDay: parseInt(process.env.WHATSAPP_MAX_MESSAGES_PER_DAY) || 2,
    hourlyWindowStart: parseInt(process.env.WHATSAPP_HOURLY_WINDOW_START) || 9,
    hourlyWindowEnd: parseInt(process.env.WHATSAPP_HOURLY_WINDOW_END) || 21,
  },

  queue: {
    redis: process.env.REDIS_URL || 'redis://localhost:6379',
    attempts: 3,
    backoffDelay: 60000, // 1 minute
  },

  businessHours: {
    start: process.env.BUSINESS_HOURS_START || '06:00',
    end: process.env.BUSINESS_HOURS_END || '23:00',
  },
};
