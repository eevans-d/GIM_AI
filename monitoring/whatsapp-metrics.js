// PROMPT 21: n8n & WHATSAPP OPTIMIZATION - WHATSAPP METRICS
// Detailed metrics tracking for WhatsApp messaging performance

const logger = require('../utils/logger').createLogger('whatsapp-metrics');
const { redis } = require('../services/cache-service');

// ============================================
// METRICS COLLECTOR CLASS
// ============================================

class WhatsAppMetricsCollector {
  constructor() {
    this.metrics = {
      // Message metrics
      totalMessagesSent: 0,
      successfulMessages: 0,
      failedMessages: 0,
      rateLimitedMessages: 0,
      
      // Performance metrics
      avgResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      responseTimes: [],
      
      // Template metrics
      templateUsage: {},
      templateSuccessRate: {},
      
      // Error metrics
      errors: [],
      errorTypes: {},
      
      // Rate limiting
      rateLimitHits: 0,
      circuitBreakerTrips: 0,
      
      // Business metrics
      messagesByHour: {},
      messagesByType: {},
      userEngagement: {}
    };
    
    this.startTime = Date.now();
  }
  
  // ============================================
  // RECORD METRICS
  // ============================================
  
  recordMessageSent(template, success, responseTime, error = null) {
    this.metrics.totalMessagesSent++;
    
    if (success) {
      this.metrics.successfulMessages++;
    } else {
      this.metrics.failedMessages++;
      
      if (error) {
        this.recordError(error);
      }
    }
    
    // Record response time
    if (responseTime) {
      this.metrics.responseTimes.push(responseTime);
      this.updateResponseTimeMetrics();
    }
    
    // Template tracking
    if (template) {
      this.metrics.templateUsage[template] = (this.metrics.templateUsage[template] || 0) + 1;
      
      if (!this.metrics.templateSuccessRate[template]) {
        this.metrics.templateSuccessRate[template] = { success: 0, failed: 0 };
      }
      
      if (success) {
        this.metrics.templateSuccessRate[template].success++;
      } else {
        this.metrics.templateSuccessRate[template].failed++;
      }
    }
    
    // Hour tracking
    const hour = new Date().getHours();
    this.metrics.messagesByHour[hour] = (this.metrics.messagesByHour[hour] || 0) + 1;
    
    // Persist to Redis
    this.persistMetrics();
  }
  
  recordRateLimitHit(retryAfter = null) {
    this.metrics.rateLimitedMessages++;
    this.metrics.rateLimitHits++;
    
    logger.warn('Rate limit hit', {
      totalHits: this.metrics.rateLimitHits,
      retryAfterMs: retryAfter
    });
    
    this.persistMetrics();
  }
  
  recordCircuitBreakerTrip(breakerName) {
    this.metrics.circuitBreakerTrips++;
    
    logger.error('Circuit breaker trip', {
      breaker: breakerName,
      totalTrips: this.metrics.circuitBreakerTrips
    });
    
    this.persistMetrics();
  }
  
  recordError(error) {
    const errorEntry = {
      message: error.message,
      timestamp: new Date().toISOString(),
      stack: error.stack
    };
    
    this.metrics.errors.push(errorEntry);
    
    // Keep only last 100 errors
    if (this.metrics.errors.length > 100) {
      this.metrics.errors.shift();
    }
    
    // Error type tracking
    const errorType = error.type || error.name || 'Unknown';
    this.metrics.errorTypes[errorType] = (this.metrics.errorTypes[errorType] || 0) + 1;
  }
  
  recordUserEngagement(userId, interactionType) {
    if (!this.metrics.userEngagement[userId]) {
      this.metrics.userEngagement[userId] = {
        totalInteractions: 0,
        lastInteraction: null,
        interactionTypes: {}
      };
    }
    
    this.metrics.userEngagement[userId].totalInteractions++;
    this.metrics.userEngagement[userId].lastInteraction = new Date().toISOString();
    this.metrics.userEngagement[userId].interactionTypes[interactionType] = 
      (this.metrics.userEngagement[userId].interactionTypes[interactionType] || 0) + 1;
  }
  
  // ============================================
  // RESPONSE TIME CALCULATIONS
  // ============================================
  
  updateResponseTimeMetrics() {
    const times = this.metrics.responseTimes;
    
    if (times.length === 0) return;
    
    // Calculate average
    const sum = times.reduce((a, b) => a + b, 0);
    this.metrics.avgResponseTime = Math.round(sum / times.length);
    
    // Calculate percentiles
    const sorted = [...times].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);
    
    this.metrics.p95ResponseTime = sorted[p95Index] || sorted[sorted.length - 1];
    this.metrics.p99ResponseTime = sorted[p99Index] || sorted[sorted.length - 1];
    
    // Keep only last 1000 response times
    if (times.length > 1000) {
      this.metrics.responseTimes = times.slice(-1000);
    }
  }
  
  // ============================================
  // PERSISTENCE
  // ============================================
  
  async persistMetrics() {
    try {
      const key = 'whatsapp:metrics:current';
      const data = {
        ...this.metrics,
        // Don't persist large arrays
        responseTimes: this.metrics.responseTimes.length,
        errors: this.metrics.errors.length,
        timestamp: Date.now()
      };
      
      await redis.setex(key, 3600, JSON.stringify(data)); // 1 hour TTL
    } catch (error) {
      logger.error('Failed to persist WhatsApp metrics', {
        error: error.message
      });
    }
  }
  
  async loadMetrics() {
    try {
      const key = 'whatsapp:metrics:current';
      const data = await redis.get(key);
      
      if (data) {
        const loaded = JSON.parse(data);
        // Restore metrics but keep current arrays
        Object.assign(this.metrics, loaded, {
          responseTimes: this.metrics.responseTimes,
          errors: this.metrics.errors
        });
        
        logger.info('WhatsApp metrics loaded from Redis');
      }
    } catch (error) {
      logger.error('Failed to load WhatsApp metrics', {
        error: error.message
      });
    }
  }
  
  // ============================================
  // REPORTING
  // ============================================
  
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    
    return {
      summary: {
        totalMessages: this.metrics.totalMessagesSent,
        successRate: this.metrics.totalMessagesSent > 0
          ? ((this.metrics.successfulMessages / this.metrics.totalMessagesSent) * 100).toFixed(2) + '%'
          : 'N/A',
        failureRate: this.metrics.totalMessagesSent > 0
          ? ((this.metrics.failedMessages / this.metrics.totalMessagesSent) * 100).toFixed(2) + '%'
          : 'N/A',
        rateLimitRate: this.metrics.totalMessagesSent > 0
          ? ((this.metrics.rateLimitedMessages / this.metrics.totalMessagesSent) * 100).toFixed(2) + '%'
          : 'N/A'
      },
      
      performance: {
        avgResponseTimeMs: this.metrics.avgResponseTime,
        p95ResponseTimeMs: this.metrics.p95ResponseTime,
        p99ResponseTimeMs: this.metrics.p99ResponseTime
      },
      
      templates: this.getTemplateMetrics(),
      
      errors: {
        totalErrors: this.metrics.errors.length,
        errorTypes: this.metrics.errorTypes,
        recentErrors: this.metrics.errors.slice(-5)
      },
      
      reliability: {
        rateLimitHits: this.metrics.rateLimitHits,
        circuitBreakerTrips: this.metrics.circuitBreakerTrips
      },
      
      distribution: {
        byHour: this.metrics.messagesByHour,
        byType: this.metrics.messagesByType
      },
      
      uptime: {
        uptimeMs: uptime,
        uptimeFormatted: this.formatUptime(uptime)
      }
    };
  }
  
  getTemplateMetrics() {
    const templates = {};
    
    for (const [template, usage] of Object.entries(this.metrics.templateUsage)) {
      const successRate = this.metrics.templateSuccessRate[template];
      const total = successRate.success + successRate.failed;
      
      templates[template] = {
        usage,
        successRate: total > 0 ? ((successRate.success / total) * 100).toFixed(2) + '%' : 'N/A'
      };
    }
    
    return templates;
  }
  
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
  
  // ============================================
  // RESET
  // ============================================
  
  reset() {
    this.metrics = {
      totalMessagesSent: 0,
      successfulMessages: 0,
      failedMessages: 0,
      rateLimitedMessages: 0,
      avgResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      responseTimes: [],
      templateUsage: {},
      templateSuccessRate: {},
      errors: [],
      errorTypes: {},
      rateLimitHits: 0,
      circuitBreakerTrips: 0,
      messagesByHour: {},
      messagesByType: {},
      userEngagement: {}
    };
    
    this.startTime = Date.now();
    
    logger.info('WhatsApp metrics reset');
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

const whatsappMetrics = new WhatsAppMetricsCollector();

// ============================================
// EXPORTS
// ============================================

module.exports = {
  WhatsAppMetricsCollector,
  whatsappMetrics
};
