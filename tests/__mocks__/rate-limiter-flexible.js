/**
 * Mock for rate-limiter-flexible
 * Provides RateLimiterRedis for testing without actual Redis
 */

class RateLimiterRedis {
  constructor() {
    this.points = 2;
    this.duration = 86400;
  }

  async consume(key, points = 1) {
    return {
      remainingPoints: Math.max(0, this.points - points),
      msBeforeNext: 0,
      consumedPoints: points,
      isFirstInDuration: false
    };
  }

  async penalty(key, points = 1) {
    return {
      remainingPoints: Math.max(0, this.points - points),
      msBeforeNext: 0
    };
  }

  async get(key) {
    return {
      remainingPoints: this.points,
      msBeforeNext: 0
    };
  }

  async reset(key) {
    return {
      remainingPoints: this.points,
      msBeforeNext: 0
    };
  }
}

module.exports = {
  RateLimiterRedis
};
