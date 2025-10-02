// PROMPT 21: n8n & WHATSAPP OPTIMIZATION - ADVANCED RETRY STRATEGY
// Exponential backoff with jitter, circuit breaker integration, and intelligent retry logic

const logger = require('../../utils/logger').createLogger('retry-strategy');
const { whatsappBreaker, n8nBreaker, supabaseBreaker } = require('./circuit-breaker');

// ============================================
// RETRY CONFIGURATIONS
// ============================================

const RETRY_CONFIGS = {
  WHATSAPP_API: {
    maxRetries: 3,
    baseDelay: 1000,        // 1 second
    maxDelay: 30000,        // 30 seconds
    backoffMultiplier: 2,
    jitterFactor: 0.3,      // 30% jitter
    retryableStatuses: [408, 429, 500, 502, 503, 504],
    timeout: 10000          // 10 seconds per attempt
  },
  
  N8N_WORKFLOW: {
    maxRetries: 2,
    baseDelay: 2000,
    maxDelay: 20000,
    backoffMultiplier: 2,
    jitterFactor: 0.2,
    retryableStatuses: [500, 502, 503, 504],
    timeout: 15000
  },
  
  SUPABASE_QUERY: {
    maxRetries: 3,
    baseDelay: 500,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitterFactor: 0.25,
    retryableStatuses: [500, 502, 503, 504],
    timeout: 5000
  },
  
  CRITICAL_OPERATION: {
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 60000,
    backoffMultiplier: 2,
    jitterFactor: 0.3,
    retryableStatuses: [408, 429, 500, 502, 503, 504],
    timeout: 20000
  }
};

// ============================================
// RETRY STRATEGY CLASS
// ============================================

class RetryStrategy {
  constructor(name, config, circuitBreaker = null) {
    this.name = name;
    this.config = { ...RETRY_CONFIGS.WHATSAPP_API, ...config };
    this.circuitBreaker = circuitBreaker;
    
    logger.info('Retry strategy initialized', {
      name: this.name,
      config: this.config
    });
  }
  
  // ============================================
  // MAIN EXECUTE WITH RETRY
  // ============================================
  
  async execute(fn, context = {}) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        logger.debug('Retry attempt', {
          name: this.name,
          attempt: attempt + 1,
          maxRetries: this.config.maxRetries + 1,
          context
        });
        
        // Execute with circuit breaker if provided
        if (this.circuitBreaker) {
          return await this.circuitBreaker.execute(fn);
        } else {
          return await this.executeWithTimeout(fn);
        }
        
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (!this.isRetryable(error)) {
          logger.warn('Non-retryable error - aborting', {
            name: this.name,
            attempt: attempt + 1,
            error: error.message
          });
          throw error;
        }
        
        // Check if we have retries left
        if (attempt >= this.config.maxRetries) {
          logger.error('Max retries exceeded', {
            name: this.name,
            attempts: attempt + 1,
            error: error.message
          });
          throw new Error(`Max retries (${this.config.maxRetries}) exceeded for ${this.name}: ${error.message}`);
        }
        
        // Calculate delay with exponential backoff + jitter
        const delay = this.calculateDelay(attempt);
        
        logger.warn('Retrying after delay', {
          name: this.name,
          attempt: attempt + 1,
          delayMs: delay,
          error: error.message,
          context
        });
        
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }
  
  // ============================================
  // TIMEOUT WRAPPER
  // ============================================
  
  async executeWithTimeout(fn) {
    return Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), this.config.timeout)
      )
    ]);
  }
  
  // ============================================
  // RETRY LOGIC
  // ============================================
  
  isRetryable(error) {
    // Network errors are always retryable
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return true;
    }
    
    // Check HTTP status codes
    if (error.response && error.response.status) {
      return this.config.retryableStatuses.includes(error.response.status);
    }
    
    // Timeout errors are retryable
    if (error.message && error.message.includes('timeout')) {
      return true;
    }
    
    // Circuit breaker open errors are NOT retryable
    if (error.message && error.message.includes('Circuit breaker OPEN')) {
      return false;
    }
    
    // Default: retry
    return true;
  }
  
  calculateDelay(attempt) {
    // Exponential backoff: baseDelay * (multiplier ^ attempt)
    let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt);
    
    // Cap at maxDelay
    delay = Math.min(delay, this.config.maxDelay);
    
    // Add jitter to avoid thundering herd
    const jitter = delay * this.config.jitterFactor * (Math.random() - 0.5) * 2;
    delay += jitter;
    
    return Math.max(0, Math.floor(delay));
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // ============================================
  // METRICS
  // ============================================
  
  getConfig() {
    return {
      name: this.name,
      config: this.config,
      hasCircuitBreaker: !!this.circuitBreaker
    };
  }
}

// ============================================
// BULK RETRY WITH CONCURRENCY CONTROL
// ============================================

class BulkRetryExecutor {
  constructor(concurrency = 5) {
    this.concurrency = concurrency;
    this.queue = [];
    this.active = 0;
    this.results = [];
  }
  
  async executeAll(tasks, retryStrategy) {
    return new Promise((resolve, reject) => {
      this.queue = tasks.map((task, index) => ({ task, index }));
      this.results = new Array(tasks.length);
      this.active = 0;
      
      const processNext = async () => {
        if (this.queue.length === 0 && this.active === 0) {
          resolve(this.results);
          return;
        }
        
        while (this.active < this.concurrency && this.queue.length > 0) {
          const { task, index } = this.queue.shift();
          this.active++;
          
          retryStrategy.execute(task)
            .then(result => {
              this.results[index] = { success: true, result };
            })
            .catch(error => {
              this.results[index] = { success: false, error: error.message };
            })
            .finally(() => {
              this.active--;
              processNext();
            });
        }
      };
      
      processNext();
    });
  }
}

// ============================================
// PREDEFINED RETRY STRATEGIES
// ============================================

const whatsappRetryStrategy = new RetryStrategy('whatsapp-api', RETRY_CONFIGS.WHATSAPP_API, whatsappBreaker);
const n8nRetryStrategy = new RetryStrategy('n8n-workflow', RETRY_CONFIGS.N8N_WORKFLOW, n8nBreaker);
const supabaseRetryStrategy = new RetryStrategy('supabase-query', RETRY_CONFIGS.SUPABASE_QUERY, supabaseBreaker);
const criticalRetryStrategy = new RetryStrategy('critical-operation', RETRY_CONFIGS.CRITICAL_OPERATION);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff(fn, options = {}) {
  const strategy = new RetryStrategy('custom', {
    maxRetries: options.maxRetries || 3,
    baseDelay: options.baseDelay || 1000,
    maxDelay: options.maxDelay || 30000,
    backoffMultiplier: options.backoffMultiplier || 2,
    jitterFactor: options.jitterFactor || 0.3,
    timeout: options.timeout || 10000
  });
  
  return strategy.execute(fn, options.context);
}

/**
 * Retry with specific circuit breaker
 */
async function retryWithCircuitBreaker(fn, circuitBreaker, options = {}) {
  const strategy = new RetryStrategy('with-breaker', {
    maxRetries: options.maxRetries || 3,
    baseDelay: options.baseDelay || 1000
  }, circuitBreaker);
  
  return strategy.execute(fn, options.context);
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  RetryStrategy,
  BulkRetryExecutor,
  RETRY_CONFIGS,
  
  // Predefined strategies
  whatsappRetryStrategy,
  n8nRetryStrategy,
  supabaseRetryStrategy,
  criticalRetryStrategy,
  
  // Helper functions
  retryWithBackoff,
  retryWithCircuitBreaker
};
