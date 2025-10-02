/**
 * OAuth2 Provider Service
 * Implements OAuth2 authentication flows for public API access
 * Supports: authorization_code, client_credentials, refresh_token grants
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../../utils/logger').createLogger('oauth2-provider');
const { AppError, ErrorTypes } = require('../../utils/error-handler');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ACCESS_TOKEN_EXPIRES = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRES = '30d'; // 30 days

class OAuth2Provider {
  /**
   * Generate access token (JWT)
   */
  static generateAccessToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRES,
      issuer: 'gim-api',
      audience: 'gim-api-users'
    });
  }

  /**
   * Generate refresh token (random string)
   */
  static generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Verify JWT token
   */
  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET, {
        issuer: 'gim-api',
        audience: 'gim-api-users'
      });
    } catch (error) {
      logger.warn('Invalid access token', { error: error.message });
      throw new AppError('Invalid or expired access token', ErrorTypes.AUTHENTICATION, 401);
    }
  }

  /**
   * Client Credentials Grant
   * Used for server-to-server authentication
   */
  static async clientCredentialsGrant(clientId, clientSecret, scopes = []) {
    try {
      // Validate client credentials
      const { data: client, error: clientError } = await supabase
        .from('oauth_clients')
        .select('*')
        .eq('client_id', clientId)
        .eq('client_secret', clientSecret)
        .eq('is_active', true)
        .single();

      if (clientError || !client) {
        throw new AppError('Invalid client credentials', ErrorTypes.AUTHENTICATION, 401);
      }

      // Validate requested scopes
      const validScopes = scopes.filter(scope => client.scopes.includes(scope));
      if (validScopes.length === 0) {
        validScopes.push(...client.scopes.slice(0, 3)); // Default to first 3 scopes
      }

      // Generate tokens
      const accessTokenPayload = {
        client_id: clientId,
        client_name: client.client_name,
        scopes: validScopes,
        type: 'client_credentials'
      };

      const accessToken = this.generateAccessToken(accessTokenPayload);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store token in database
      const { data: tokenRecord, error: tokenError } = await supabase
        .from('oauth_tokens')
        .insert({
          client_id: clientId,
          access_token: accessToken,
          token_type: 'Bearer',
          scopes: validScopes,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (tokenError) {
        logger.error('Failed to store access token', { error: tokenError });
        throw new AppError('Token generation failed', ErrorTypes.INTERNAL, 500);
      }

      logger.info('Client credentials grant successful', { 
        client_id: clientId, 
        client_name: client.client_name 
      });

      return {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 900, // 15 minutes in seconds
        scopes: validScopes
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Client credentials grant failed', { error });
      throw new AppError('Authentication failed', ErrorTypes.INTERNAL, 500);
    }
  }

  /**
   * Authorization Code Grant
   * Used for user-delegated access (3-legged OAuth)
   */
  static async authorizationCodeGrant(code, clientId, clientSecret, redirectUri) {
    try {
      // In production, validate authorization code from temporary storage
      // For now, we'll implement a simplified version

      const { data: client, error: clientError } = await supabase
        .from('oauth_clients')
        .select('*')
        .eq('client_id', clientId)
        .eq('client_secret', clientSecret)
        .eq('is_active', true)
        .single();

      if (clientError || !client) {
        throw new AppError('Invalid client credentials', ErrorTypes.AUTHENTICATION, 401);
      }

      // Validate redirect URI
      if (!client.redirect_uris.includes(redirectUri)) {
        throw new AppError('Invalid redirect URI', ErrorTypes.VALIDATION, 400);
      }

      // Parse authorization code (simplified: code contains member_id)
      // In production, store codes in Redis with expiration
      const memberId = code; // Simplified

      // Generate tokens
      const accessTokenPayload = {
        client_id: clientId,
        member_id: memberId,
        scopes: client.scopes,
        type: 'authorization_code'
      };

      const accessToken = this.generateAccessToken(accessTokenPayload);
      const refreshToken = this.generateRefreshToken();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // Store tokens
      const { error: tokenError } = await supabase
        .from('oauth_tokens')
        .insert({
          client_id: clientId,
          member_id: memberId,
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          scopes: client.scopes,
          expires_at: expiresAt.toISOString(),
          refresh_expires_at: refreshExpiresAt.toISOString()
        });

      if (tokenError) {
        logger.error('Failed to store tokens', { error: tokenError });
        throw new AppError('Token generation failed', ErrorTypes.INTERNAL, 500);
      }

      logger.info('Authorization code grant successful', { 
        client_id: clientId, 
        member_id: memberId 
      });

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: 900, // 15 minutes
        scopes: client.scopes
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Authorization code grant failed', { error });
      throw new AppError('Authentication failed', ErrorTypes.INTERNAL, 500);
    }
  }

  /**
   * Refresh Token Grant
   * Exchange refresh token for new access token
   */
  static async refreshTokenGrant(refreshToken, clientId, clientSecret) {
    try {
      // Validate client
      const { data: client, error: clientError } = await supabase
        .from('oauth_clients')
        .select('*')
        .eq('client_id', clientId)
        .eq('client_secret', clientSecret)
        .eq('is_active', true)
        .single();

      if (clientError || !client) {
        throw new AppError('Invalid client credentials', ErrorTypes.AUTHENTICATION, 401);
      }

      // Find refresh token
      const { data: tokenRecord, error: tokenError } = await supabase
        .from('oauth_tokens')
        .select('*')
        .eq('refresh_token', refreshToken)
        .eq('client_id', clientId)
        .eq('is_revoked', false)
        .single();

      if (tokenError || !tokenRecord) {
        throw new AppError('Invalid refresh token', ErrorTypes.AUTHENTICATION, 401);
      }

      // Check if refresh token is expired
      if (new Date(tokenRecord.refresh_expires_at) < new Date()) {
        throw new AppError('Refresh token expired', ErrorTypes.AUTHENTICATION, 401);
      }

      // Generate new access token
      const accessTokenPayload = {
        client_id: clientId,
        member_id: tokenRecord.member_id,
        scopes: tokenRecord.scopes,
        type: 'refresh_token'
      };

      const newAccessToken = this.generateAccessToken(accessTokenPayload);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      // Update token record
      const { error: updateError } = await supabase
        .from('oauth_tokens')
        .update({
          access_token: newAccessToken,
          expires_at: expiresAt.toISOString()
        })
        .eq('token_id', tokenRecord.token_id);

      if (updateError) {
        logger.error('Failed to update access token', { error: updateError });
        throw new AppError('Token refresh failed', ErrorTypes.INTERNAL, 500);
      }

      logger.info('Refresh token grant successful', { 
        client_id: clientId, 
        member_id: tokenRecord.member_id 
      });

      return {
        access_token: newAccessToken,
        token_type: 'Bearer',
        expires_in: 900,
        scopes: tokenRecord.scopes
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Refresh token grant failed', { error });
      throw new AppError('Token refresh failed', ErrorTypes.INTERNAL, 500);
    }
  }

  /**
   * Revoke token (logout)
   */
  static async revokeToken(token) {
    try {
      const { error } = await supabase
        .from('oauth_tokens')
        .update({ is_revoked: true })
        .or(`access_token.eq.${token},refresh_token.eq.${token}`);

      if (error) {
        logger.error('Failed to revoke token', { error });
        throw new AppError('Token revocation failed', ErrorTypes.INTERNAL, 500);
      }

      logger.info('Token revoked successfully');
      return { success: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Token revocation failed', { error });
      throw new AppError('Token revocation failed', ErrorTypes.INTERNAL, 500);
    }
  }

  /**
   * Introspect token (check validity and get info)
   */
  static async introspectToken(token) {
    try {
      // Try to verify JWT first
      let payload;
      try {
        payload = this.verifyAccessToken(token);
      } catch {
        return { active: false };
      }

      // Check if token is revoked in database
      const { data: tokenRecord, error } = await supabase
        .from('oauth_tokens')
        .select('*')
        .eq('access_token', token)
        .eq('is_revoked', false)
        .single();

      if (error || !tokenRecord) {
        return { active: false };
      }

      // Check expiration
      if (new Date(tokenRecord.expires_at) < new Date()) {
        return { active: false };
      }

      return {
        active: true,
        client_id: tokenRecord.client_id,
        member_id: tokenRecord.member_id,
        scopes: tokenRecord.scopes,
        expires_at: tokenRecord.expires_at,
        token_type: 'Bearer'
      };
    } catch (error) {
      logger.error('Token introspection failed', { error });
      return { active: false };
    }
  }

  /**
   * Register new OAuth client
   */
  static async registerClient(clientData) {
    try {
      const clientSecret = crypto.randomBytes(32).toString('hex');

      const { data: client, error } = await supabase
        .from('oauth_clients')
        .insert({
          client_name: clientData.name,
          client_secret: clientSecret,
          client_type: clientData.type || 'confidential',
          redirect_uris: clientData.redirect_uris || [],
          grant_types: clientData.grant_types || ['authorization_code', 'refresh_token'],
          scopes: clientData.scopes || ['read:members', 'read:classes'],
          created_by: clientData.created_by
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to register client', { error });
        throw new AppError('Client registration failed', ErrorTypes.INTERNAL, 500);
      }

      logger.info('OAuth client registered', { 
        client_id: client.client_id, 
        client_name: client.client_name 
      });

      return {
        client_id: client.client_id,
        client_secret: clientSecret, // Only returned once!
        client_name: client.client_name,
        scopes: client.scopes,
        grant_types: client.grant_types
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Client registration failed', { error });
      throw new AppError('Client registration failed', ErrorTypes.INTERNAL, 500);
    }
  }
}

module.exports = OAuth2Provider;
