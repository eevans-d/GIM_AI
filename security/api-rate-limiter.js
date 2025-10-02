/**
 * API Rate Limiter
 * Redis-backed rate limiting for API keys and OAuth clients
 * Implements sliding window algorithm with per-key limits
 */

const Redis = require('ioredis');
const logger = require('../utils/logger').createLogger('api-rate-limiter');
const { AppError, ErrorTypes } = require('../utils/error-handler');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

class APIRateLimiter {
  /**
   * Check rate limit for API key or client
   * Returns remaining requests and reset time
   */
  static async checkLimit(identifier, limitPerHour, limitPerDay = null) {
    try {
      const now = Date.now();
      const hourWindow = Math.floor(now / (60 * 60 * 1000)); // Current hour
      const dayWindow = Math.floor(now / (24 * 60 * 60 * 1000)); // Current day

      const hourKey = `ratelimit:hour:${identifier}:${hourWindow}`;
      const dayKey = `ratelimit:day:${identifier}:${dayWindow}`;

      // Check hourly limit
      const hourCount = await redis.incr(hourKey);
      
      if (hourCount === 1) {
        // Set expiration on first request (2 hours to handle window overlap)
        await redis.expire(hourKey, 7200);
      }

      if (hourCount > limitPerHour) {
        const resetTime = (hourWindow + 1) * 60 * 60 * 1000; // Next hour
        
        logger.warn('Hourly rate limit exceeded', { 
          identifier, 
          count: hourCount, 
          limit: limitPerHour 
        });

        throw new AppError(
          'Rate limit exceeded',
          ErrorTypes.RATE_LIMIT,
          429,
          {
            limit: limitPerHour,
            remaining: 0,
            reset: new Date(resetTime).toISOString(),
            retry_after: Math.ceil((resetTime - now) / 1000)
          }
        );
      }

      // Check daily limit if specified
      let dayCount = 0;
      if (limitPerDay) {
        dayCount = await redis.incr(dayKey);
        
        if (dayCount === 1) {
          await redis.expire(dayKey, 48 * 60 * 60); // 48 hours
        }

        if (dayCount > limitPerDay) {
          const resetTime = (dayWindow + 1) * 24 * 60 * 60 * 1000; // Next day
          
          logger.warn('Daily rate limit exceeded', { 
            identifier, 
            count: dayCount, 
            limit: limitPerDay 
          });

          throw new AppError(
            'Daily rate limit exceeded',
            ErrorTypes.RATE_LIMIT,
            429,
            {
              limit: limitPerDay,
              remaining: 0,
              reset: new Date(resetTime).toISOString(),
              retry_after: Math.ceil((resetTime - now) / 1000)
            }
          );
        }
      }

      // Return rate limit info
      return {
        hourly: {
          limit: limitPerHour,
          remaining: Math.max(0, limitPerHour - hourCount),
          reset: new Date((hourWindow + 1) * 60 * 60 * 1000).toISOString()
        },
        daily: limitPerDay ? {
          limit: limitPerDay,
          remaining: Math.max(0, limitPerDay - dayCount),
          reset: new Date((dayWindow + 1) * 24 * 60 * 60 * 1000).toISOString()
        } : null
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      logger.error('Rate limit check failed', { error, identifier });
      // Don't block on rate limit errors, just log
      return {
        hourly: { limit: limitPerHour, remaining: limitPerHour, reset: null },
        daily: null
      };
    }
  }

  /**
   * Rate limiting middleware
   */
  static middleware() {
    return async (req, res, next) => {
      try {
        // Skip if no authentication
        if (!req.auth) {
          return next();
        }

        // Determine identifier and limits
        let identifier, limitPerHour, limitPerDay;

        if (req.auth.type === 'api_key') {
          identifier = req.auth.key_id;
          limitPerHour = req.auth.rate_limit_per_hour;
          limitPerDay = req.auth.rate_limit_per_day;
        } else {
          identifier = req.auth.client_id;
          limitPerHour = 1000; // Default for OAuth clients
          limitPerDay = 10000;
        }

        // Check rate limit
        const rateLimitInfo = await this.checkLimit(identifier, limitPerHour, limitPerDay);

        // Add rate limit headers
        res.set('X-RateLimit-Limit-Hour', rateLimitInfo.hourly.limit);
        res.set('X-RateLimit-Remaining-Hour', rateLimitInfo.hourly.remaining);
        res.set('X-RateLimit-Reset-Hour', rateLimitInfo.hourly.reset);

        if (rateLimitInfo.daily) {
          res.set('X-RateLimit-Limit-Day', rateLimitInfo.daily.limit);
          res.set('X-RateLimit-Remaining-Day', rateLimitInfo.daily.remaining);
          res.set('X-RateLimit-Reset-Day', rateLimitInfo.daily.reset);
        }

        next();
      } catch (error) {
        if (error instanceof AppError && error.type === ErrorTypes.RATE_LIMIT) {
          res.set('Retry-After', error.metadata.retry_after);
          res.set('X-RateLimit-Limit', error.metadata.limit);
          res.set('X-RateLimit-Remaining', error.metadata.remaining);
          res.set('X-RateLimit-Reset', error.metadata.reset);

          return res.status(429).json({
            error: 'rate_limit_exceeded',
            message: error.message,
            limit: error.metadata.limit,
            remaining: error.metadata.remaining,
            reset: error.metadata.reset,
            retry_after: error.metadata.retry_after
          });
        }

        logger.error('Rate limit middleware error', { error });
        next();
      }
    };
  }

  /**
   * Get current rate limit status without incrementing
   */
  static async getStatus(identifier, limitPerHour, limitPerDay = null) {
    try {
      const now = Date.now();
      const hourWindow = Math.floor(now / (60 * 60 * 1000));
      const dayWindow = Math.floor(now / (24 * 60 * 60 * 1000));

      const hourKey = `ratelimit:hour:${identifier}:${hourWindow}`;
      const dayKey = `ratelimit:day:${identifier}:${dayWindow}`;

      const hourCount = await redis.get(hourKey) || 0;
      const dayCount = limitPerDay ? (await redis.get(dayKey) || 0) : 0;

      return {
        hourly: {
          limit: limitPerHour,
          used: parseInt(hourCount),
          remaining: Math.max(0, limitPerHour - parseInt(hourCount)),
          reset: new Date((hourWindow + 1) * 60 * 60 * 1000).toISOString()
        },
        daily: limitPerDay ? {
          limit: limitPerDay,
          used: parseInt(dayCount),
          remaining: Math.max(0, limitPerDay - parseInt(dayCount)),
          reset: new Date((dayWindow + 1) * 24 * 60 * 60 * 1000).toISOString()
        } : null
      };
    } catch (error) {
      logger.error('Failed to get rate limit status', { error, identifier });
      throw new AppError('Failed to retrieve rate limit status', ErrorTypes.INTERNAL, 500);
    }
  }

  /**
   * Reset rate limit for identifier (admin function)
   */
  static async resetLimit(identifier) {
    try {
      const now = Date.now();
      const hourWindow = Math.floor(now / (60 * 60 * 1000));
      const dayWindow = Math.floor(now / (24 * 60 * 60 * 1000));

      const hourKey = `ratelimit:hour:${identifier}:${hourWindow}`;
      const dayKey = `ratelimit:day:${identifier}:${dayWindow}`;

      await redis.del(hourKey, dayKey);

      logger.info('Rate limit reset', { identifier });
      return { success: true };
    } catch (error) {
      logger.error('Failed to reset rate limit', { error, identifier });
      throw new AppError('Failed to reset rate limit', ErrorTypes.INTERNAL, 500);
    }
  }
}

module.exports = APIRateLimiter;
