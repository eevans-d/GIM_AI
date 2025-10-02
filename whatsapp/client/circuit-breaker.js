// PROMPT 21: n8n & WHATSAPP OPTIMIZATION - ADVANCED CIRCUIT BREAKER
// Circuit breaker pattern con estados, thresholds y auto-recovery

const logger = require('../../utils/logger').createLogger('circuit-breaker');
const { redis } = require('../../services/cache-service');

// ============================================
// CIRCUIT BREAKER STATES
// ============================================

const STATES = {
  CLOSED: 'CLOSED',     // Normal operation
  OPEN: 'OPEN',         // Blocking requests
  HALF_OPEN: 'HALF_OPEN' // Testing recovery
};

// ============================================
// CIRCUIT BREAKER CLASS
// ============================================

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    
    // Configuration with defaults
    this.config = {
      failureThreshold: options.failureThreshold || 5,      // Failures before opening
      successThreshold: options.successThreshold || 2,       // Successes to close from half-open
      timeout: options.timeout || 60000,                     // Time in OPEN state (1 min)
      halfOpenRequests: options.halfOpenRequests || 3,       // Max concurrent half-open requests
      monitoringWindow: options.monitoringWindow || 60000,   // Window for failure counting (1 min)
      errorFilter: options.errorFilter || (() => true)       // Filter which errors count
    };
    
    // State tracking
    this.state = STATES.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = Date.now();
    this.halfOpenAttempts = 0;
    
    // Metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      stateTransitions: []
    };
    
    logger.info('Circuit breaker initialized', {
      name: this.name,
      config: this.config
    });
  }
  
  // ============================================
  // MAIN EXECUTION METHOD
  // ============================================
  
  async execute(fn, ...args) {
    this.metrics.totalRequests++;
    
    // Check if circuit is open
    if (this.state === STATES.OPEN) {
      if (Date.now() < this.nextAttempt) {
        this.metrics.rejectedRequests++;
        logger.warn('Circuit breaker OPEN - request rejected', {
          name: this.name,
          nextAttempt: new Date(this.nextAttempt).toISOString()
        });
        throw new Error(`Circuit breaker OPEN for ${this.name}. Try again later.`);
      }
      
      // Transition to HALF_OPEN
      this.transitionTo(STATES.HALF_OPEN);
    }
    
    // Check half-open request limit
    if (this.state === STATES.HALF_OPEN) {
      if (this.halfOpenAttempts >= this.config.halfOpenRequests) {
        this.metrics.rejectedRequests++;
        throw new Error(`Circuit breaker HALF_OPEN - max concurrent requests reached`);
      }
      this.halfOpenAttempts++;
    }
    
    try {
      const result = await fn(...args);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    } finally {
      if (this.state === STATES.HALF_OPEN) {
        this.halfOpenAttempts--;
      }
    }
  }
  
  // ============================================
  // STATE TRANSITIONS
  // ============================================
  
  onSuccess() {
    this.metrics.successfulRequests++;
    
    if (this.state === STATES.HALF_OPEN) {
      this.successes++;
      
      if (this.successes >= this.config.successThreshold) {
        this.transitionTo(STATES.CLOSED);
      }
    } else if (this.state === STATES.CLOSED) {
      // Reset failure count on success
      this.failures = 0;
    }
    
    logger.debug('Circuit breaker - success', {
      name: this.name,
      state: this.state,
      successes: this.successes
    });
  }
  
  onFailure(error) {
    this.metrics.failedRequests++;
    
    // Check if error should count against circuit breaker
    if (!this.config.errorFilter(error)) {
      logger.debug('Circuit breaker - error filtered out', {
        name: this.name,
        error: error.message
      });
      return;
    }
    
    this.failures++;
    
    logger.warn('Circuit breaker - failure', {
      name: this.name,
      state: this.state,
      failures: this.failures,
      threshold: this.config.failureThreshold,
      error: error.message
    });
    
    if (this.state === STATES.HALF_OPEN) {
      // Any failure in half-open goes back to open
      this.transitionTo(STATES.OPEN);
    } else if (this.state === STATES.CLOSED) {
      if (this.failures >= this.config.failureThreshold) {
        this.transitionTo(STATES.OPEN);
      }
    }
  }
  
  transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;
    
    // Reset counters
    if (newState === STATES.CLOSED) {
      this.failures = 0;
      this.successes = 0;
    } else if (newState === STATES.OPEN) {
      this.nextAttempt = Date.now() + this.config.timeout;
      this.successes = 0;
    } else if (newState === STATES.HALF_OPEN) {
      this.successes = 0;
      this.halfOpenAttempts = 0;
    }
    
    // Track transition
    this.metrics.stateTransitions.push({
      from: oldState,
      to: newState,
      timestamp: new Date().toISOString()
    });
    
    logger.info('Circuit breaker state transition', {
      name: this.name,
      from: oldState,
      to: newState,
      nextAttempt: newState === STATES.OPEN ? new Date(this.nextAttempt).toISOString() : null
    });
    
    // Store state in Redis for distributed systems
    this.persistState();
  }
  
  // ============================================
  // PERSISTENCE (Redis)
  // ============================================
  
  async persistState() {
    try {
      const key = `circuit-breaker:${this.name}`;
      const state = {
        state: this.state,
        failures: this.failures,
        successes: this.successes,
        nextAttempt: this.nextAttempt,
        metrics: this.metrics,
        timestamp: Date.now()
      };
      
      await redis.setex(key, 300, JSON.stringify(state)); // 5 min TTL
    } catch (error) {
      logger.error('Failed to persist circuit breaker state', {
        name: this.name,
        error: error.message
      });
    }
  }
  
  async loadState() {
    try {
      const key = `circuit-breaker:${this.name}`;
      const data = await redis.get(key);
      
      if (data) {
        const state = JSON.parse(data);
        this.state = state.state;
        this.failures = state.failures;
        this.successes = state.successes;
        this.nextAttempt = state.nextAttempt;
        this.metrics = state.metrics;
        
        logger.info('Circuit breaker state loaded from Redis', {
          name: this.name,
          state: this.state
        });
      }
    } catch (error) {
      logger.error('Failed to load circuit breaker state', {
        name: this.name,
        error: error.message
      });
    }
  }
  
  // ============================================
  // MANUAL CONTROLS
  // ============================================
  
  forceOpen() {
    this.transitionTo(STATES.OPEN);
    logger.warn('Circuit breaker manually opened', { name: this.name });
  }
  
  forceClose() {
    this.transitionTo(STATES.CLOSED);
    logger.info('Circuit breaker manually closed', { name: this.name });
  }
  
  reset() {
    this.state = STATES.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = Date.now();
    this.halfOpenAttempts = 0;
    
    logger.info('Circuit breaker reset', { name: this.name });
  }
  
  // ============================================
  // METRICS & STATUS
  // ============================================
  
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      metrics: {
        ...this.metrics,
        successRate: this.metrics.totalRequests > 0
          ? ((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(2) + '%'
          : 'N/A',
        rejectionRate: this.metrics.totalRequests > 0
          ? ((this.metrics.rejectedRequests / this.metrics.totalRequests) * 100).toFixed(2) + '%'
          : 'N/A'
      },
      nextAttempt: this.state === STATES.OPEN ? new Date(this.nextAttempt).toISOString() : null,
      config: this.config
    };
  }
  
  isOpen() {
    return this.state === STATES.OPEN;
  }
  
  isClosed() {
    return this.state === STATES.CLOSED;
  }
  
  isHalfOpen() {
    return this.state === STATES.HALF_OPEN;
  }
}

// ============================================
// CIRCUIT BREAKER MANAGER
// ============================================

class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
  }
  
  get(name, options) {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name);
  }
  
  getAllStatus() {
    const status = {};
    for (const [name, breaker] of this.breakers) {
      status[name] = breaker.getStatus();
    }
    return status;
  }
  
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    logger.info('All circuit breakers reset');
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

const circuitBreakerManager = new CircuitBreakerManager();

// ============================================
// PREDEFINED CIRCUIT BREAKERS
// ============================================

// WhatsApp API circuit breaker
const whatsappBreaker = circuitBreakerManager.get('whatsapp-api', {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 120000, // 2 minutes
  halfOpenRequests: 2,
  errorFilter: (error) => {
    // Only count 500+ errors, not 4xx validation errors
    return !error.response || error.response.status >= 500;
  }
});

// n8n API circuit breaker
const n8nBreaker = circuitBreakerManager.get('n8n-api', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 90000, // 1.5 minutes
  halfOpenRequests: 2
});

// Supabase circuit breaker
const supabaseBreaker = circuitBreakerManager.get('supabase-api', {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 60000, // 1 minute
  halfOpenRequests: 3
});

// ============================================
// EXPORTS
// ============================================

module.exports = {
  CircuitBreaker,
  CircuitBreakerManager,
  circuitBreakerManager,
  STATES,
  
  // Predefined breakers
  whatsappBreaker,
  n8nBreaker,
  supabaseBreaker
};
