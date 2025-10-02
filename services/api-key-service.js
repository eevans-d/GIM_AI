/**
 * API Key Service
 * Manages API keys for simplified authentication without OAuth flow
 * Includes rate limiting, usage tracking, and key rotation
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger').createLogger('api-key-service');
const { AppError, ErrorTypes } = require('../utils/error-handler');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class APIKeyService {
  /**
   * Generate new API key with prefix
   */
  static generateAPIKey() {
    const randomBytes = crypto.randomBytes(32).toString('base64');
    const cleaned = randomBytes.replace(/[^A-Za-z0-9]/g, '').substring(0, 48);
    return `gim_${cleaned}`;
  }

  /**
   * Create new API key
   */
  static async createAPIKey(keyData) {
    try {
      const apiKey = this.generateAPIKey();
      const keyPrefix = apiKey.substring(0, 12); // gim_ + 8 chars

      const { data: key, error } = await supabase
        .from('api_keys')
        .insert({
          api_key: apiKey,
          key_name: keyData.name,
          key_prefix: keyPrefix,
          client_id: keyData.client_id,
          scopes: keyData.scopes || ['read:members', 'read:classes'],
          rate_limit_per_hour: keyData.rate_limit_per_hour || 1000,
          rate_limit_per_day: keyData.rate_limit_per_day || 10000,
          expires_at: keyData.expires_at || null
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create API key', { error });
        throw new AppError('API key creation failed', ErrorTypes.INTERNAL, 500);
      }

      logger.info('API key created', { 
        key_id: key.key_id, 
        key_prefix: keyPrefix,
        client_id: keyData.client_id 
      });

      return {
        key_id: key.key_id,
        api_key: apiKey, // Only returned once!
        key_prefix: keyPrefix,
        key_name: key.key_name,
        scopes: key.scopes,
        rate_limit_per_hour: key.rate_limit_per_hour,
        rate_limit_per_day: key.rate_limit_per_day,
        created_at: key.created_at
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('API key creation failed', { error });
      throw new AppError('API key creation failed', ErrorTypes.INTERNAL, 500);
    }
  }

  /**
   * Validate API key and check rate limits
   */
  static async validateAPIKey(apiKey) {
    try {
      // Get key details
      const { data: key, error: keyError } = await supabase
        .from('api_keys')
        .select(`
          *,
          oauth_clients (
            client_id,
            client_name,
            is_active
          )
        `)
        .eq('api_key', apiKey)
        .eq('is_active', true)
        .single();

      if (keyError || !key) {
        throw new AppError('Invalid API key', ErrorTypes.AUTHENTICATION, 401);
      }

      // Check if client is active
      if (!key.oauth_clients.is_active) {
        throw new AppError('Client is inactive', ErrorTypes.AUTHENTICATION, 401);
      }

      // Check expiration
      if (key.expires_at && new Date(key.expires_at) < new Date()) {
        throw new AppError('API key expired', ErrorTypes.AUTHENTICATION, 401);
      }

      // Update last_used_at
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('key_id', key.key_id);

      return {
        key_id: key.key_id,
        client_id: key.client_id,
        client_name: key.oauth_clients.client_name,
        scopes: key.scopes,
        rate_limit_per_hour: key.rate_limit_per_hour,
        rate_limit_per_day: key.rate_limit_per_day
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('API key validation failed', { error });
      throw new AppError('API key validation failed', ErrorTypes.AUTHENTICATION, 401);
    }
  }

  /**
   * List API keys for a client (sensitive data masked)
   */
  static async listAPIKeys(clientId) {
    try {
      const { data: keys, error } = await supabase
        .from('api_keys')
        .select('key_id, key_name, key_prefix, scopes, rate_limit_per_hour, is_active, last_used_at, created_at, expires_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to list API keys', { error });
        throw new AppError('Failed to retrieve API keys', ErrorTypes.INTERNAL, 500);
      }

      return keys;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to list API keys', { error });
      throw new AppError('Failed to retrieve API keys', ErrorTypes.INTERNAL, 500);
    }
  }

  /**
   * Revoke API key
   */
  static async revokeAPIKey(keyId, clientId) {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('key_id', keyId)
        .eq('client_id', clientId);

      if (error) {
        logger.error('Failed to revoke API key', { error });
        throw new AppError('Failed to revoke API key', ErrorTypes.INTERNAL, 500);
      }

      logger.info('API key revoked', { key_id: keyId, client_id: clientId });
      return { success: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to revoke API key', { error });
      throw new AppError('Failed to revoke API key', ErrorTypes.INTERNAL, 500);
    }
  }

  /**
   * Rotate API key (create new, revoke old with grace period)
   */
  static async rotateAPIKey(keyId, clientId, gracePeriodDays = 7) {
    try {
      // Get old key details
      const { data: oldKey, error: getError } = await supabase
        .from('api_keys')
        .select('*')
        .eq('key_id', keyId)
        .eq('client_id', clientId)
        .single();

      if (getError || !oldKey) {
        throw new AppError('API key not found', ErrorTypes.NOT_FOUND, 404);
      }

      // Create new key with same settings
      const newKey = await this.createAPIKey({
        name: `${oldKey.key_name} (rotated)`,
        client_id: clientId,
        scopes: oldKey.scopes,
        rate_limit_per_hour: oldKey.rate_limit_per_hour,
        rate_limit_per_day: oldKey.rate_limit_per_day
      });

      // Set expiration on old key (grace period)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + gracePeriodDays);

      await supabase
        .from('api_keys')
        .update({ 
          expires_at: expiresAt.toISOString(),
          key_name: `${oldKey.key_name} (deprecated)`
        })
        .eq('key_id', keyId);

      logger.info('API key rotated', { 
        old_key_id: keyId, 
        new_key_id: newKey.key_id,
        grace_period_days: gracePeriodDays 
      });

      return {
        new_key: newKey,
        old_key_expires_at: expiresAt.toISOString(),
        grace_period_days: gracePeriodDays
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('API key rotation failed', { error });
      throw new AppError('API key rotation failed', ErrorTypes.INTERNAL, 500);
    }
  }

  /**
   * Track API key usage
   */
  static async trackUsage(keyId, endpoint, method, statusCode, responseTime) {
    try {
      await supabase
        .from('api_key_usage')
        .insert({
          key_id: keyId,
          endpoint: endpoint,
          method: method,
          status_code: statusCode,
          response_time: responseTime
        });
    } catch (error) {
      // Don't throw error for usage tracking failures
      logger.warn('Failed to track API key usage', { error, key_id: keyId });
    }
  }

  /**
   * Get API key usage statistics
   */
  static async getUsageStats(keyId, days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: usage, error } = await supabase
        .from('api_key_usage')
        .select('*')
        .eq('key_id', keyId)
        .gte('timestamp', startDate.toISOString());

      if (error) {
        logger.error('Failed to get usage stats', { error });
        throw new AppError('Failed to retrieve usage statistics', ErrorTypes.INTERNAL, 500);
      }

      // Calculate statistics
      const totalRequests = usage.length;
      const successfulRequests = usage.filter(u => u.status_code >= 200 && u.status_code < 300).length;
      const avgResponseTime = usage.reduce((sum, u) => sum + (u.response_time || 0), 0) / totalRequests || 0;

      const endpointStats = usage.reduce((acc, u) => {
        const key = `${u.method} ${u.endpoint}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      return {
        total_requests: totalRequests,
        successful_requests: successfulRequests,
        success_rate: totalRequests > 0 ? (successfulRequests / totalRequests * 100).toFixed(2) : 0,
        avg_response_time_ms: Math.round(avgResponseTime),
        endpoint_breakdown: endpointStats,
        period_days: days
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to get usage stats', { error });
      throw new AppError('Failed to retrieve usage statistics', ErrorTypes.INTERNAL, 500);
    }
  }
}

module.exports = APIKeyService;
