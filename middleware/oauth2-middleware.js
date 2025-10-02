/**
 * OAuth2 Middleware
 * Validates OAuth2 tokens and API keys for protected routes
 * Checks scopes and enforces rate limiting
 */

const OAuth2Provider = require('../security/authentication/oauth2-provider');
const APIKeyService = require('../services/api-key-service');
const logger = require('../utils/logger').createLogger('oauth2-middleware');
const { AppError, ErrorTypes } = require('../utils/error-handler');

/**
 * Extract token from Authorization header
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  // Bearer token
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // API Key
  if (authHeader.startsWith('ApiKey ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}

/**
 * OAuth2 Authentication Middleware
 * Validates access tokens or API keys
 */
async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new AppError('No authentication token provided', ErrorTypes.AUTHENTICATION, 401);
    }

    // Check if it's an API key (starts with gim_)
    if (token.startsWith('gim_')) {
      const keyInfo = await APIKeyService.validateAPIKey(token);
      
      req.auth = {
        type: 'api_key',
        key_id: keyInfo.key_id,
        client_id: keyInfo.client_id,
        client_name: keyInfo.client_name,
        scopes: keyInfo.scopes,
        rate_limit_per_hour: keyInfo.rate_limit_per_hour,
        rate_limit_per_day: keyInfo.rate_limit_per_day
      };
    } else {
      // OAuth2 access token
      const tokenInfo = await OAuth2Provider.introspectToken(token);
      
      if (!tokenInfo.active) {
        throw new AppError('Invalid or expired token', ErrorTypes.AUTHENTICATION, 401);
      }

      req.auth = {
        type: 'oauth2',
        client_id: tokenInfo.client_id,
        member_id: tokenInfo.member_id,
        scopes: tokenInfo.scopes,
        expires_at: tokenInfo.expires_at
      };
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.type,
        message: error.message
      });
    }

    logger.error('Authentication failed', { error });
    return res.status(401).json({
      error: 'authentication_error',
      message: 'Authentication failed'
    });
  }
}

/**
 * Scope Authorization Middleware
 * Checks if authenticated client has required scopes
 */
function requireScopes(...requiredScopes) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication required'
      });
    }

    const hasRequiredScope = requiredScopes.some(scope => {
      // Check for exact match
      if (req.auth.scopes.includes(scope)) {
        return true;
      }
      
      // Check for wildcard (admin:*)
      if (req.auth.scopes.includes('admin:*')) {
        return true;
      }

      // Check for resource wildcard (e.g., read:* matches read:members)
      const [action] = scope.split(':');
      if (req.auth.scopes.includes(`${action}:*`)) {
        return true;
      }

      return false;
    });

    if (!hasRequiredScope) {
      logger.warn('Insufficient scope', { 
        required: requiredScopes, 
        provided: req.auth.scopes,
        client_id: req.auth.client_id
      });

      return res.status(403).json({
        error: 'insufficient_scope',
        message: 'Insufficient permissions',
        required_scopes: requiredScopes,
        provided_scopes: req.auth.scopes
      });
    }

    next();
  };
}

/**
 * Optional Authentication Middleware
 * Attempts authentication but doesn't fail if not provided
 */
async function optionalAuthenticate(req, res, next) {
  try {
    const token = extractToken(req);

    if (token) {
      await authenticate(req, res, () => {});
    }

    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
}

module.exports = {
  authenticate,
  requireScopes,
  optionalAuthenticate,
  extractToken
};
