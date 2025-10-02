// PROMPT 21: n8n & WHATSAPP OPTIMIZATION - ADVANCED RATE LIMITER
// Token bucket + sliding window rate limiting con Redis

const logger = require('../../utils/logger').createLogger('rate-limiter-advanced');
const { redis } = require('../../services/cache-service');

// ============================================
// RATE LIMIT CONFIGURATIONS
// ============================================

const RATE_LIMITS = {
  // WhatsApp Cloud API limits
  WHATSAPP_GLOBAL: {
    maxTokens: 80,           // 80 messages per minute
    refillRate: 80,          // Refill 80 tokens per minute
    refillInterval: 60000,   // 1 minute
    burstAllowance: 20       // Allow burst of 20 extra messages
  },
  
  WHATSAPP_PER_USER: {
    maxTokens: 2,            // 2 messages per user per day
    refillRate: 2,
    refillInterval: 86400000, // 24 hours
    burstAllowance: 0
  },
  
  WHATSAPP_BUSINESS_HOURS: {
    maxTokens: 60,           // Lower during business hours
    refillRate: 60,
    refillInterval: 60000,
    burstAllowance: 10
  },
  
  // n8n API limits
  N8N_WORKFLOW_TRIGGER: {
    maxTokens: 100,
    refillRate: 100,
    refillInterval: 60000,
    burstAllowance: 20
  },
  
  // Supabase limits (generous, focus on connection pooling)
  SUPABASE_QUERY: {
    maxTokens: 1000,
    refillRate: 1000,
    refillInterval: 60000,
    burstAllowance: 200
  }
};

// ============================================
// TOKEN BUCKET RATE LIMITER
// ============================================

class TokenBucketRateLimiter {
  constructor(name, config) {
    this.name = name;
    this.config = {
      maxTokens: config.maxTokens || 100,
      refillRate: config.refillRate || 100,
      refillInterval: config.refillInterval || 60000,
      burstAllowance: config.burstAllowance || 0
    };
    
    this.tokens = this.config.maxTokens;
    this.lastRefill = Date.now();
    
    logger.info('Token bucket rate limiter initialized', {
      name: this.name,
      config: this.config
    });
  }
  
  async tryAcquire(tokensNeeded = 1, userId = null) {
    const key = userId ? `rate-limit:${this.name}:${userId}` : `rate-limit:${this.name}`;
    
    try {
      // Get current state from Redis
      const state = await this.getState(key);
      
      // Refill tokens based on time elapsed
      const now = Date.now();
      const timeSinceRefill = now - state.lastRefill;
      const refillIntervals = Math.floor(timeSinceRefill / this.config.refillInterval);
      
      if (refillIntervals > 0) {
        const tokensToAdd = refillIntervals * this.config.refillRate;
        state.tokens = Math.min(
          state.tokens + tokensToAdd,
          this.config.maxTokens + this.config.burstAllowance
        );
        state.lastRefill = now;
      }
      
      // Check if enough tokens
      if (state.tokens >= tokensNeeded) {
        state.tokens -= tokensNeeded;
        await this.setState(key, state);
        
        logger.debug('Rate limit - tokens acquired', {
          name: this.name,
          userId,
          tokensNeeded,
          tokensRemaining: state.tokens
        });
        
        return {
          allowed: true,
          tokensRemaining: state.tokens,
          retryAfter: null
        };
      } else {
        // Calculate retry after
        const tokensShort = tokensNeeded - state.tokens;
        const intervalsNeeded = Math.ceil(tokensShort / this.config.refillRate);
        const retryAfter = intervalsNeeded * this.config.refillInterval;
        
        logger.warn('Rate limit exceeded', {
          name: this.name,
          userId,
          tokensNeeded,
          tokensAvailable: state.tokens,
          retryAfterMs: retryAfter
        });
        
        return {
          allowed: false,
          tokensRemaining: state.tokens,
          retryAfter: retryAfter
        };
      }
    } catch (error) {
      logger.error('Rate limiter error', {
        name: this.name,
        error: error.message
      });
      
      // Fail open - allow request if rate limiter fails
      return { allowed: true, tokensRemaining: null, retryAfter: null };
    }
  }
  
  async getState(key) {
    const data = await redis.get(key);
    
    if (data) {
      return JSON.parse(data);
    } else {
      return {
        tokens: this.config.maxTokens,
        lastRefill: Date.now()
      };
    }
  }
  
  async setState(key, state) {
    await redis.setex(key, 3600, JSON.stringify(state)); // 1 hour TTL
  }
  
  async getStatus(userId = null) {
    const key = userId ? `rate-limit:${this.name}:${userId}` : `rate-limit:${this.name}`;
    const state = await this.getState(key);
    
    return {
      name: this.name,
      userId,
      tokensAvailable: state.tokens,
      maxTokens: this.config.maxTokens,
      utilizationPct: ((this.config.maxTokens - state.tokens) / this.config.maxTokens * 100).toFixed(2) + '%',
      lastRefill: new Date(state.lastRefill).toISOString()
    };
  }
  
  async reset(userId = null) {
    const key = userId ? `rate-limit:${this.name}:${userId}` : `rate-limit:${this.name}`;
    await redis.del(key);
    logger.info('Rate limit reset', { name: this.name, userId });
  }
}

// ============================================
// SLIDING WINDOW RATE LIMITER
// ============================================

class SlidingWindowRateLimiter {
  constructor(name, config) {
    this.name = name;
    this.config = {
      maxRequests: config.maxRequests || 100,
      windowSize: config.windowSize || 60000 // 1 minute
    };
    
    logger.info('Sliding window rate limiter initialized', {
      name: this.name,
      config: this.config
    });
  }
  
  async tryAcquire(userId = null) {
    const key = userId ? `rate-limit-window:${this.name}:${userId}` : `rate-limit-window:${this.name}`;
    
    try {
      const now = Date.now();
      const windowStart = now - this.config.windowSize;
      
      // Remove old entries
      await redis.zremrangebyscore(key, '-inf', windowStart);
      
      // Count requests in window
      const count = await redis.zcard(key);
      
      if (count < this.config.maxRequests) {
        // Add new request
        await redis.zadd(key, now, `${now}-${Math.random()}`);
        await redis.expire(key, Math.ceil(this.config.windowSize / 1000));
        
        logger.debug('Sliding window - request allowed', {
          name: this.name,
          userId,
          count: count + 1,
          maxRequests: this.config.maxRequests
        });
        
        return {
          allowed: true,
          requestsInWindow: count + 1,
          maxRequests: this.config.maxRequests,
          retryAfter: null
        };
      } else {
        // Get oldest request in window
        const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
        const oldestTimestamp = oldest.length > 1 ? parseInt(oldest[1]) : now;
        const retryAfter = oldestTimestamp + this.config.windowSize - now;
        
        logger.warn('Sliding window - rate limit exceeded', {
          name: this.name,
          userId,
          count,
          maxRequests: this.config.maxRequests,
          retryAfterMs: retryAfter
        });
        
        return {
          allowed: false,
          requestsInWindow: count,
          maxRequests: this.config.maxRequests,
          retryAfter: retryAfter
        };
      }
    } catch (error) {
      logger.error('Sliding window rate limiter error', {
        name: this.name,
        error: error.message
      });
      
      // Fail open
      return { allowed: true, requestsInWindow: null, maxRequests: null, retryAfter: null };
    }
  }
  
  async getStatus(userId = null) {
    const key = userId ? `rate-limit-window:${this.name}:${userId}` : `rate-limit-window:${this.name}`;
    
    try {
      const now = Date.now();
      const windowStart = now - this.config.windowSize;
      
      await redis.zremrangebyscore(key, '-inf', windowStart);
      const count = await redis.zcard(key);
      
      return {
        name: this.name,
        userId,
        requestsInWindow: count,
        maxRequests: this.config.maxRequests,
        utilizationPct: ((count / this.config.maxRequests) * 100).toFixed(2) + '%',
        windowSizeMs: this.config.windowSize
      };
    } catch (error) {
      logger.error('Failed to get sliding window status', {
        name: this.name,
        error: error.message
      });
      return null;
    }
  }
}

// ============================================
// RATE LIMITER MANAGER
// ============================================

class RateLimiterManager {
  constructor() {
    this.limiters = new Map();
  }
  
  getTokenBucket(name, config) {
    if (!this.limiters.has(name)) {
      this.limiters.set(name, new TokenBucketRateLimiter(name, config));
    }
    return this.limiters.get(name);
  }
  
  getSlidingWindow(name, config) {
    const key = `${name}-sliding`;
    if (!this.limiters.has(key)) {
      this.limiters.set(key, new SlidingWindowRateLimiter(name, config));
    }
    return this.limiters.get(key);
  }
  
  async getAllStatus() {
    const status = {};
    for (const [name, limiter] of this.limiters) {
      if (limiter instanceof TokenBucketRateLimiter) {
        status[name] = await limiter.getStatus();
      } else if (limiter instanceof SlidingWindowRateLimiter) {
        status[name] = await limiter.getStatus();
      }
    }
    return status;
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

const rateLimiterManager = new RateLimiterManager();

// ============================================
// PREDEFINED RATE LIMITERS
// ============================================

const whatsappGlobalLimiter = rateLimiterManager.getTokenBucket('whatsapp-global', RATE_LIMITS.WHATSAPP_GLOBAL);
const whatsappPerUserLimiter = rateLimiterManager.getTokenBucket('whatsapp-per-user', RATE_LIMITS.WHATSAPP_PER_USER);
const n8nWorkflowLimiter = rateLimiterManager.getTokenBucket('n8n-workflow', RATE_LIMITS.N8N_WORKFLOW_TRIGGER);

// ============================================
// EXPORTS
// ============================================

module.exports = {
  TokenBucketRateLimiter,
  SlidingWindowRateLimiter,
  RateLimiterManager,
  rateLimiterManager,
  RATE_LIMITS,
  
  // Predefined limiters
  whatsappGlobalLimiter,
  whatsappPerUserLimiter,
  n8nWorkflowLimiter
};
