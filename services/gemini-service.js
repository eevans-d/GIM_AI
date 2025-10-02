// PROMPT 23: ADVANCED AI FEATURES - GEMINI API CLIENT
// Google Generative AI integration with retry, caching, and rate limiting

const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger').createLogger('gemini-service');
const { AppError, ErrorTypes } = require('../utils/error-handler');
const geminiConfig = require('../config/gemini.config');
const redis = require('redis');

// ============================================
// REDIS CLIENT FOR CACHING
// ============================================

let redisClient = null;

async function getRedisClient() {
  if (!redisClient) {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    redisClient.on('error', (err) => logger.error('Redis error', { error: err }));
    await redisClient.connect();
  }
  
  return redisClient;
}

// ============================================
// GEMINI SERVICE CLASS
// ============================================

class GeminiService {
  constructor() {
    if (!geminiConfig.apiKey) {
      logger.warn('Gemini API key not configured');
      this.isConfigured = false;
      return;
    }
    
    this.genAI = new GoogleGenerativeAI(geminiConfig.apiKey);
    this.isConfigured = true;
    this.requestCount = 0;
    this.lastResetTime = Date.now();
    
    logger.info('Gemini service initialized', {
      primaryModel: geminiConfig.models.primary,
      fallbackModel: geminiConfig.models.fallback
    });
  }

  /**
   * Check rate limit
   */
  async checkRateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastResetTime;
    
    // Reset counter every minute
    if (elapsed >= 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    if (this.requestCount >= geminiConfig.rateLimit.requestsPerMinute) {
      throw new AppError(
        'Gemini API rate limit exceeded',
        ErrorTypes.RATE_LIMIT_EXCEEDED,
        429,
        { requestsPerMinute: geminiConfig.rateLimit.requestsPerMinute }
      );
    }
    
    this.requestCount++;
  }

  /**
   * Generate content with retry and fallback
   */
  async generateContent(prompt, options = {}) {
    if (!this.isConfigured) {
      throw new AppError(
        'Gemini API not configured',
        ErrorTypes.CONFIGURATION_ERROR,
        500
      );
    }

    await this.checkRateLimit();

    const {
      model = geminiConfig.models.primary,
      useFallback = true,
      systemInstruction = null,
      temperature = geminiConfig.generationConfig.temperature,
      maxRetries = geminiConfig.retry.maxAttempts
    } = options;

    let attempt = 0;
    let lastError = null;

    while (attempt < maxRetries) {
      try {
        const modelToUse = attempt === 0 ? model : (useFallback ? geminiConfig.models.fallback : model);
        
        const generativeModel = this.genAI.getGenerativeModel({
          model: modelToUse,
          systemInstruction,
          generationConfig: {
            ...geminiConfig.generationConfig,
            temperature
          },
          safetySettings: geminiConfig.safetySettings
        });

        logger.info('Generating content', { model: modelToUse, attempt: attempt + 1 });

        const result = await generativeModel.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        logger.info('Content generated successfully', {
          model: modelToUse,
          responseLength: text.length
        });

        return {
          text,
          model: modelToUse,
          usageMetadata: response.usageMetadata || null
        };
      } catch (error) {
        lastError = error;
        attempt++;

        logger.error('Gemini API error', {
          attempt,
          error: error.message,
          model
        });

        if (attempt < maxRetries) {
          const delay = geminiConfig.retry.baseDelay * Math.pow(geminiConfig.retry.backoffMultiplier, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, Math.min(delay, geminiConfig.retry.maxDelay)));
        }
      }
    }

    throw new AppError(
      'Failed to generate content after retries',
      ErrorTypes.EXTERNAL_API_ERROR,
      500,
      { originalError: lastError?.message, attempts: attempt }
    );
  }

  /**
   * Generate content with cache
   */
  async generateContentWithCache(cacheKey, prompt, options = {}) {
    if (!geminiConfig.cache.enabled) {
      return this.generateContent(prompt, options);
    }

    try {
      const client = await getRedisClient();
      const cached = await client.get(cacheKey);

      if (cached) {
        logger.info('Cache hit', { cacheKey });
        return JSON.parse(cached);
      }

      const result = await this.generateContent(prompt, options);

      // Cache result
      const ttl = options.cacheTTL || geminiConfig.cache.ttl.default || 3600;
      await client.setEx(cacheKey, ttl, JSON.stringify(result));

      logger.info('Cache stored', { cacheKey, ttl });

      return result;
    } catch (error) {
      logger.error('Cache error, proceeding without cache', { error });
      return this.generateContent(prompt, options);
    }
  }

  /**
   * Parse JSON response from Gemini
   */
  parseJSONResponse(text) {
    try {
      // Remove markdown code blocks if present
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      logger.error('Failed to parse JSON response', { text, error });
      throw new AppError(
        'Invalid JSON response from Gemini',
        ErrorTypes.VALIDATION_ERROR,
        500,
        { originalText: text }
      );
    }
  }

  /**
   * Predict churn risk
   */
  async predictChurn(memberData) {
    const prompt = geminiConfig.prompts.churnPrediction.replace(
      '{member_data}',
      JSON.stringify(memberData, null, 2)
    );

    const cacheKey = `gemini:churn:${memberData.member_id}`;

    const result = await this.generateContentWithCache(cacheKey, prompt, {
      cacheTTL: geminiConfig.cache.ttl.churnPrediction,
      temperature: 0.3  // Lower temperature for more consistent predictions
    });

    return this.parseJSONResponse(result.text);
  }

  /**
   * Recommend classes
   */
  async recommendClasses(attendanceHistory, availableClasses) {
    const prompt = geminiConfig.prompts.classRecommendation
      .replace('{attendance_history}', JSON.stringify(attendanceHistory, null, 2))
      .replace('{available_classes}', JSON.stringify(availableClasses, null, 2));

    const memberId = attendanceHistory.member_id || 'unknown';
    const cacheKey = `gemini:recommendations:${memberId}`;

    const result = await this.generateContentWithCache(cacheKey, prompt, {
      cacheTTL: geminiConfig.cache.ttl.recommendations,
      temperature: 0.7
    });

    return this.parseJSONResponse(result.text);
  }

  /**
   * Generate coaching insights
   */
  async generateCoachingInsights(progressData) {
    const prompt = geminiConfig.prompts.coachingInsights.replace(
      '{progress_data}',
      JSON.stringify(progressData, null, 2)
    );

    const memberId = progressData.member_id || 'unknown';
    const cacheKey = `gemini:coaching:${memberId}`;

    const result = await this.generateContentWithCache(cacheKey, prompt, {
      cacheTTL: geminiConfig.cache.ttl.coachingInsights,
      temperature: 0.8  // Higher temperature for more creative coaching advice
    });

    return this.parseJSONResponse(result.text);
  }

  /**
   * Analyze conversation sentiment
   */
  async analyzeSentiment(message, context = {}) {
    const prompt = geminiConfig.prompts.sentimentAnalysis.replace('{message}', message);

    const result = await this.generateContent(prompt, {
      temperature: 0.2,  // Very low temperature for consistent sentiment analysis
      useFallback: true  // Use faster model for real-time analysis
    });

    return this.parseJSONResponse(result.text);
  }

  /**
   * Generate nutrition tips
   */
  async generateNutritionTips(workoutType, goals) {
    const prompt = geminiConfig.prompts.nutritionTips
      .replace('{workout_type}', workoutType)
      .replace('{goals}', goals);

    const cacheKey = `gemini:nutrition:${workoutType}:${goals}`;

    const result = await this.generateContentWithCache(cacheKey, prompt, {
      cacheTTL: geminiConfig.cache.ttl.nutritionTips,
      temperature: 0.7
    });

    return this.parseJSONResponse(result.text);
  }

  /**
   * Get usage statistics
   */
  getStats() {
    return {
      isConfigured: this.isConfigured,
      requestCount: this.requestCount,
      rateLimit: geminiConfig.rateLimit.requestsPerMinute,
      remainingRequests: Math.max(0, geminiConfig.rateLimit.requestsPerMinute - this.requestCount),
      resetTime: new Date(this.lastResetTime + 60000).toISOString()
    };
  }

  /**
   * Clear cache for specific key pattern
   */
  async clearCache(pattern = 'gemini:*') {
    try {
      const client = await getRedisClient();
      const keys = await client.keys(pattern);
      
      if (keys.length > 0) {
        await client.del(keys);
        logger.info('Cache cleared', { pattern, count: keys.length });
      }
      
      return keys.length;
    } catch (error) {
      logger.error('Failed to clear cache', { pattern, error });
      throw error;
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let geminiServiceInstance = null;

function getGeminiService() {
  if (!geminiServiceInstance) {
    geminiServiceInstance = new GeminiService();
  }
  return geminiServiceInstance;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  GeminiService,
  getGeminiService,
  geminiConfig
};
