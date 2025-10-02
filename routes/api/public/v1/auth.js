/**
 * Public API v1 - OAuth & Authentication Routes
 * Handles OAuth2 token generation, refresh, and revocation
 */

const express = require('express');
const router = express.Router();
const OAuth2Provider = require('../../../../security/authentication/oauth2-provider');
const APIKeyService = require('../../../../services/api-key-service');
const { authenticate, requireScopes } = require('../../../../middleware/oauth2-middleware');
const logger = require('../../../../utils/logger').createLogger('public-api-auth');

/**
 * POST /oauth/token
 * OAuth2 Token Endpoint
 * Supports: client_credentials, authorization_code, refresh_token
 */
router.post('/oauth/token', async (req, res) => {
  try {
    const { grant_type, client_id, client_secret, code, redirect_uri, refresh_token, scope } = req.body;

    if (!grant_type || !client_id || !client_secret) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing required parameters'
      });
    }

    let result;

    switch (grant_type) {
      case 'client_credentials':
        const scopes = scope ? scope.split(' ') : [];
        result = await OAuth2Provider.clientCredentialsGrant(client_id, client_secret, scopes);
        break;

      case 'authorization_code':
        if (!code || !redirect_uri) {
          return res.status(400).json({
            error: 'invalid_request',
            error_description: 'Missing code or redirect_uri'
          });
        }
        result = await OAuth2Provider.authorizationCodeGrant(code, client_id, client_secret, redirect_uri);
        break;

      case 'refresh_token':
        if (!refresh_token) {
          return res.status(400).json({
            error: 'invalid_request',
            error_description: 'Missing refresh_token'
          });
        }
        result = await OAuth2Provider.refreshTokenGrant(refresh_token, client_id, client_secret);
        break;

      default:
        return res.status(400).json({
          error: 'unsupported_grant_type',
          error_description: `Grant type '${grant_type}' is not supported`
        });
    }

    logger.info('Token issued', { grant_type, client_id });
    res.json(result);
  } catch (error) {
    logger.error('Token endpoint error', { error: error.message });
    res.status(error.statusCode || 400).json({
      error: 'invalid_grant',
      error_description: error.message
    });
  }
});

/**
 * POST /oauth/revoke
 * Revoke access or refresh token
 */
router.post('/oauth/revoke', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing token parameter'
      });
    }

    await OAuth2Provider.revokeToken(token);

    logger.info('Token revoked');
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Token revocation error', { error: error.message });
    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to revoke token'
    });
  }
});

/**
 * POST /oauth/introspect
 * Check token validity and get metadata
 */
router.post('/oauth/introspect', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing token parameter'
      });
    }

    const result = await OAuth2Provider.introspectToken(token);
    res.json(result);
  } catch (error) {
    logger.error('Token introspection error', { error: error.message });
    res.json({ active: false });
  }
});

/**
 * POST /oauth/register
 * Register new OAuth client (requires admin scope)
 */
router.post('/oauth/register', authenticate, requireScopes('admin:*'), async (req, res) => {
  try {
    const clientData = {
      name: req.body.name,
      type: req.body.type || 'confidential',
      redirect_uris: req.body.redirect_uris || [],
      grant_types: req.body.grant_types || ['authorization_code', 'refresh_token'],
      scopes: req.body.scopes || ['read:members', 'read:classes'],
      created_by: req.auth.member_id
    };

    const client = await OAuth2Provider.registerClient(clientData);

    logger.info('OAuth client registered', { client_id: client.client_id });
    res.status(201).json(client);
  } catch (error) {
    logger.error('Client registration error', { error: error.message });
    res.status(error.statusCode || 500).json({
      error: 'registration_failed',
      error_description: error.message
    });
  }
});

/**
 * POST /api-keys
 * Create new API key (requires authentication)
 */
router.post('/api-keys', authenticate, requireScopes('admin:*'), async (req, res) => {
  try {
    const keyData = {
      name: req.body.name,
      client_id: req.auth.client_id,
      scopes: req.body.scopes || ['read:members', 'read:classes'],
      rate_limit_per_hour: req.body.rate_limit_per_hour || 1000,
      rate_limit_per_day: req.body.rate_limit_per_day || 10000,
      expires_at: req.body.expires_at || null
    };

    const apiKey = await APIKeyService.createAPIKey(keyData);

    logger.info('API key created', { key_id: apiKey.key_id });
    res.status(201).json(apiKey);
  } catch (error) {
    logger.error('API key creation error', { error: error.message });
    res.status(error.statusCode || 500).json({
      error: 'key_creation_failed',
      message: error.message
    });
  }
});

/**
 * GET /api-keys
 * List API keys for authenticated client
 */
router.get('/api-keys', authenticate, async (req, res) => {
  try {
    const keys = await APIKeyService.listAPIKeys(req.auth.client_id);
    res.json({ keys, count: keys.length });
  } catch (error) {
    logger.error('API key listing error', { error: error.message });
    res.status(500).json({
      error: 'listing_failed',
      message: error.message
    });
  }
});

/**
 * DELETE /api-keys/:keyId
 * Revoke API key
 */
router.delete('/api-keys/:keyId', authenticate, async (req, res) => {
  try {
    await APIKeyService.revokeAPIKey(req.params.keyId, req.auth.client_id);
    logger.info('API key revoked', { key_id: req.params.keyId });
    res.json({ success: true });
  } catch (error) {
    logger.error('API key revocation error', { error: error.message });
    res.status(500).json({
      error: 'revocation_failed',
      message: error.message
    });
  }
});

/**
 * POST /api-keys/:keyId/rotate
 * Rotate API key with grace period
 */
router.post('/api-keys/:keyId/rotate', authenticate, async (req, res) => {
  try {
    const gracePeriodDays = req.body.grace_period_days || 7;
    const result = await APIKeyService.rotateAPIKey(
      req.params.keyId,
      req.auth.client_id,
      gracePeriodDays
    );

    logger.info('API key rotated', { 
      old_key_id: req.params.keyId,
      new_key_id: result.new_key.key_id
    });

    res.json(result);
  } catch (error) {
    logger.error('API key rotation error', { error: error.message });
    res.status(500).json({
      error: 'rotation_failed',
      message: error.message
    });
  }
});

/**
 * GET /api-keys/:keyId/stats
 * Get usage statistics for API key
 */
router.get('/api-keys/:keyId/stats', authenticate, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const stats = await APIKeyService.getUsageStats(req.params.keyId, days);
    res.json(stats);
  } catch (error) {
    logger.error('API key stats error', { error: error.message });
    res.status(500).json({
      error: 'stats_failed',
      message: error.message
    });
  }
});

module.exports = router;
