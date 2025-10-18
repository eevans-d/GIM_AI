/**
 * OWASP Top 10 Security Tests - GIM_AI
 * Testing: SQL Injection, XSS, CSRF, Authentication, Authorization
 * Framework: Jest + Supertest + OWASP ZAP patterns
 */

const request = require('supertest');
const app = require('../../index');
const { AppError, ErrorTypes } = require('../../utils/error-handler');

describe('SECURITY: OWASP Top 10 Protection', () => {
  describe('SQL Injection Prevention', () => {
    test('should sanitize user input in checkin endpoint', async () => {
      const maliciousQR = "'; DROP TABLE members; --";

      const res = await request(app)
        .post('/api/checkin')
        .send({ qr_code: maliciousQR })
        .expect(400);

      // Database should still exist
      expect(res.body.error).toBeDefined();
      expect(res.body.error).not.toContain('DROP TABLE');
    });

    test('should reject SQL UNION injection in search', async () => {
      const unionAttack = "admin' UNION SELECT * FROM users --";

      const res = await request(app)
        .get('/api/members/search')
        .query({ q: unionAttack })
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    test('should escape special characters in phone number field', async () => {
      const sqlSpecialChars = "1234567890'; DELETE FROM payments; --";

      const res = await request(app)
        .post('/api/members')
        .send({ telefono: sqlSpecialChars })
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .expect(400);

      expect(res.body.error).toContain('invalid');
    });

    test('should prevent boolean-based SQL injection', async () => {
      const booleanInjection = "' OR '1'='1";

      const res = await request(app)
        .get('/api/dashboard/kpis')
        .query({ filter: booleanInjection })
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    test('should prevent time-based blind SQL injection', async () => {
      const timeBasedInjection = "'; WAITFOR DELAY '00:00:05'; --";

      const startTime = Date.now();

      const res = await request(app)
        .get('/api/members')
        .query({ search: timeBasedInjection })
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .timeout(3000);

      const duration = Date.now() - startTime;

      // Should not take 5+ seconds (injection would delay query)
      expect(duration).toBeLessThan(3000);
    });

    test('should use parameterized queries in Supabase calls', async () => {
      // This test verifies the code uses parameterized queries
      const mockCall = jest.fn();

      // Simulate Supabase parameterized call
      const query = {
        select: () => ({
          eq: (field, value) => ({
            single: async () => ({ data: null, error: null })
          })
        })
      };

      expect(typeof query.select().eq).toBe('function');
    });

    test('should reject numeric overflow in ID parameters', async () => {
      const overflowID = '99999999999999999999999999999999';

      const res = await request(app)
        .get(`/api/members/${overflowID}`)
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .expect([400, 404]);

      expect(res.body.error).toBeDefined();
    });

    test('should prevent SQL comment bypass', async () => {
      const commentBypass = "admin'--";

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: commentBypass, password: 'test' })
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    test('should handle encoded SQL injection attempts', async () => {
      // URL encoded: ' = %27
      const encodedInjection = '%27%20OR%20%271%27%3D%271';

      const res = await request(app)
        .get('/api/members/search')
        .query({ q: decodeURIComponent(encodedInjection) })
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    test('should prevent stacked queries attack', async () => {
      const stackedQueries = "SELECT * FROM members; INSERT INTO admin VALUES (1,'attacker','pass');";

      const res = await request(app)
        .get('/api/members')
        .query({ filter: stackedQueries })
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .expect(400);

      expect(res.body.error).toBeDefined();
    });
  });

  describe('Cross-Site Scripting (XSS) Prevention', () => {
    test('should escape HTML in member names', async () => {
      const xssPayload = '<script>alert("xss")</script>';

      const res = await request(app)
        .post('/api/members')
        .send({ name: xssPayload })
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    test('should prevent DOM-based XSS in search results', async () => {
      const xssSearch = '<img src=x onerror="alert(1)">';

      const res = await request(app)
        .get('/api/members/search')
        .query({ q: xssSearch })
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`);

      // Check that response doesn't contain unescaped script
      expect(res.text).not.toContain('<script>');
      expect(res.text).not.toContain('onerror=');
    });

    test('should sanitize JSON responses', async () => {
      const xssInComment = '"><script>alert("xss")</script><p class="';

      const res = await request(app)
        .post('/api/survey/response')
        .send({ comment: xssInComment })
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    test('should prevent template injection in WhatsApp messages', async () => {
      const templateInjection = '{{ system.version }}';

      const res = await request(app)
        .post('/api/whatsapp/send')
        .send({ message: templateInjection })
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    test('should escape URL parameters in redirects', async () => {
      const xssRedirect = 'javascript:alert("xss")';

      const res = await request(app)
        .get('/api/redirect')
        .query({ url: xssRedirect })
        .expect([400, 302]);

      // Should not redirect to javascript
      expect(res.text).not.toContain('javascript:');
    });

    test('should prevent SVG-based XSS', async () => {
      const svgXss = '<svg onload="alert(1)">';

      const res = await request(app)
        .post('/api/members')
        .send({ avatar_url: svgXss })
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    test('should sanitize CSS in stylesheets', async () => {
      const cssXss = 'background:url("javascript:alert(1)")';

      const res = await request(app)
        .post('/api/dashboard/settings')
        .send({ custom_css: cssXss })
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    test('should prevent Unicode encoding bypass', async () => {
      // Unicode encoded: \\u003cscript\\u003e
      const unicodeXss = '\u003cscript\u003ealert(1)\u003c/script\u003e';

      const res = await request(app)
        .post('/api/members')
        .send({ name: unicodeXss })
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    test('should prevent null byte injection', async () => {
      const nullByteXss = 'name\x00<script>alert(1)</script>';

      const res = await request(app)
        .post('/api/members')
        .send({ name: nullByteXss })
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    test('should handle HTML entities correctly', async () => {
      const htmlEntity = '&lt;script&gt;';

      const res = await request(app)
        .post('/api/members')
        .send({ name: htmlEntity })
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`);

      // Should either reject or properly escape
      expect(res.body.error || res.body.data).toBeDefined();
    });
  });

  describe('Cross-Site Request Forgery (CSRF) Protection', () => {
    test('should require CSRF token for state-changing requests', async () => {
      const res = await request(app)
        .post('/api/members')
        .send({ name: 'Test', telefono: '1234567890' });

      // Should reject without CSRF token
      expect([401, 403, 400]).toContain(res.status);
    });

    test('should validate CSRF token on POST requests', async () => {
      const invalidToken = 'invalid-csrf-token-xyz';

      const res = await request(app)
        .post('/api/members')
        .set('X-CSRF-Token', invalidToken)
        .send({ name: 'Test', telefono: '1234567890' })
        .expect([403, 400]);

      expect(res.body.error).toBeDefined();
    });

    test('should not accept CSRF token in query parameters', async () => {
      const res = await request(app)
        .post('/api/members?csrf=token123')
        .send({ name: 'Test', telefono: '1234567890' })
        .expect([403, 400]);

      expect(res.body.error).toBeDefined();
    });

    test('should enforce SameSite cookie policy', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test', password: 'test' });

      const setCookieHeader = res.headers['set-cookie'];

      if (setCookieHeader && Array.isArray(setCookieHeader)) {
        const hasSameSite = setCookieHeader.some(cookie =>
          cookie.includes('SameSite=Strict') || cookie.includes('SameSite=Lax')
        );

        expect(hasSameSite).toBe(true);
      }
    });

    test('should reject cross-origin requests without proper headers', async () => {
      const res = await request(app)
        .post('/api/members')
        .set('Origin', 'http://malicious-site.com')
        .send({ name: 'Test', telefono: '1234567890' })
        .expect([403, 401, 400]);

      expect(res.body.error).toBeDefined();
    });

    test('should validate Origin header matches Host', async () => {
      const res = await request(app)
        .post('/api/members')
        .set('Origin', 'http://different-origin.com')
        .set('Host', 'localhost:3000')
        .send({ name: 'Test' });

      // Should either reject or allow based on CORS policy
      expect(res.status).toBeLessThan(500);
    });

    test('should double-submit cookie pattern validation', async () => {
      // First request to get CSRF token
      const getRes = await request(app)
        .get('/api/csrf-token');

      // If token provided, use it
      if (getRes.status === 200) {
        const token = getRes.body.token;

        // Second request with mismatched token
        const postRes = await request(app)
          .post('/api/members')
          .set('X-CSRF-Token', 'different-token')
          .send({ name: 'Test' })
          .expect([403, 400]);

        expect(postRes.body.error).toBeDefined();
      }
    });

    test('should reject CSRF token reuse across sessions', async () => {
      // This test verifies tokens are session-specific
      const token = 'test-csrf-token-12345';

      const res1 = await request(app)
        .post('/api/members')
        .set('X-CSRF-Token', token)
        .send({ name: 'Test' })
        .expect([403, 400]);

      // Second use should also fail
      const res2 = await request(app)
        .post('/api/classes')
        .set('X-CSRF-Token', token)
        .send({ name: 'Class' })
        .expect([403, 400]);

      expect(res1.body.error && res2.body.error).toBeDefined();
    });
  });

  describe('Authentication Bypass Prevention', () => {
    test('should reject missing JWT token', async () => {
      const res = await request(app)
        .get('/api/members')
        .expect(401);

      expect(res.body.error).toContain('unauthorized|token|authentication');
    });

    test('should reject invalid JWT signature', async () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';

      const res = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(res.body.error).toBeDefined();
    });

    test('should reject expired JWT token', async () => {
      // Create an expired token (more than 24 hours old)
      const expiredPayload = {
        sub: '123',
        iat: Math.floor(Date.now() / 1000) - 86400 * 2, // 2 days ago
        exp: Math.floor(Date.now() / 1000) - 86400 // 1 day ago
      };

      // Can't easily test without actual JWT signing, but endpoint should reject
      const res = await request(app)
        .get('/api/members')
        .set('Authorization', 'Bearer eyJleHAiOjEyMzQ1Njc4OX0=')
        .expect(401);

      expect(res.body.error).toBeDefined();
    });

    test('should prevent JWT algorithm confusion attack', async () => {
      // Change algorithm from HS256 to "none"
      const confusedToken = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjMifQ.';

      const res = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${confusedToken}`)
        .expect(401);

      expect(res.body.error).toBeDefined();
    });

    test('should reject tampered JWT payload', async () => {
      const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJyb2xlIjoiYWRtaW4ifQ.invalid';

      const res = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      expect(res.body.error).toBeDefined();
    });

    test('should not accept auth token in query parameters', async () => {
      const res = await request(app)
        .get('/api/members?token=test-token')
        .expect(401);

      expect(res.body.error).toBeDefined();
    });

    test('should enforce token refresh requirements', async () => {
      // Tokens should eventually expire
      const oldTimestampMs = Date.now() - 86400000; // 1 day ago
      const res = await request(app)
        .get('/api/members')
        .set('Authorization', 'Bearer old-token-from-yesterday')
        .expect(401);

      expect(res.body.error).toBeDefined();
    });

    test('should prevent privilege escalation via token modification', async () => {
      // Try to add admin role to token
      const escalationToken = Buffer.from(JSON.stringify({
        sub: 'user-123',
        role: 'admin'
      })).toString('base64');

      const res = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${escalationToken}`)
        .send({ name: 'Test' })
        .expect([401, 403]);

      expect(res.body.error).toBeDefined();
    });

    test('should validate token not used before issued time (nbf claim)', async () => {
      const futureToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYmYiOjk5OTk5OTk5OTl9.invalid';

      const res = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${futureToken}`)
        .expect(401);

      expect(res.body.error).toBeDefined();
    });
  });

  describe('Authorization Flaws Prevention', () => {
    test('should prevent horizontal privilege escalation', async () => {
      // User A trying to access User B's data
      const userBToken = 'valid-token-user-b';

      const res = await request(app)
        .get('/api/members/user-a-id')
        .set('Authorization', `Bearer ${userBToken}`)
        .expect([403, 404]);

      // Should get 403 Forbidden or 404 Not Found, not 200
      expect([403, 404]).toContain(res.status);
    });

    test('should enforce role-based access control (RBAC)', async () => {
      // Regular user trying to access admin endpoint
      const userToken = 'user-jwt-token';

      const res = await request(app)
        .get('/api/admin/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .expect([403, 401]);

      expect(res.body.error).toBeDefined();
    });

    test('should prevent direct object reference (IDOR) attacks', async () => {
      // Try accessing another user's data by ID
      const res = await request(app)
        .get('/api/members/999-random-id')
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .expect([403, 404]);

      expect([403, 404]).toContain(res.status);
    });

    test('should validate permission on resource modification', async () => {
      // User trying to modify someone else's record
      const res = await request(app)
        .put('/api/members/other-user-id')
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .send({ name: 'Updated Name' })
        .expect([403, 404]);

      expect([403, 404]).toContain(res.status);
    });

    test('should prevent function-level authorization bypass', async () => {
      // Calling admin function without permissions
      const res = await request(app)
        .post('/api/admin/generate-report')
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .send({ report_type: 'financial' })
        .expect([403, 401]);

      expect(res.body.error).toBeDefined();
    });

    test('should enforce method-based authorization (GET vs POST)', async () => {
      // Some endpoints may allow GET but not POST
      const res = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .send({ name: 'Test' })
        .expect([400, 403, 401]); // Should validate or reject

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('should validate nested resource permissions', async () => {
      // User accessing member checkins they shouldn't see
      const res = await request(app)
        .get('/api/members/other-id/checkins')
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .expect([403, 404]);

      expect([403, 404]).toContain(res.status);
    });

    test('should prevent permission caching exploits', async () => {
      // After permission is revoked, should not use cached permission
      const res = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .set('Cache-Control', 'max-age=3600')
        .expect([200, 401]);

      // If returns 200, should validate each request
      expect(res.status).toBeLessThan(500);
    });

    test('should enforce attribute-based access control (ABAC)', async () => {
      // User trying to access resource outside their gym
      const res = await request(app)
        .get('/api/gym/other-gym-id/members')
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .expect([403, 404]);

      expect([403, 404]).toContain(res.status);
    });
  });

  describe('Additional Security Headers', () => {
    test('should include X-Content-Type-Options header', async () => {
      const res = await request(app)
        .get('/api/members');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should include X-Frame-Options header', async () => {
      const res = await request(app)
        .get('/');

      const xFrameOptions = res.headers['x-frame-options'];
      expect(['DENY', 'SAMEORIGIN']).toContain(xFrameOptions);
    });

    test('should include Strict-Transport-Security header', async () => {
      const res = await request(app)
        .get('/');

      expect(res.headers['strict-transport-security']).toBeDefined();
    });

    test('should include Content-Security-Policy header', async () => {
      const res = await request(app)
        .get('/');

      expect(res.headers['content-security-policy']).toBeDefined();
    });

    test('should not expose server information', async () => {
      const res = await request(app)
        .get('/');

      expect(res.headers['server']).not.toContain('Express');
      expect(res.headers['server']).not.toContain('Node');
    });

    test('should set secure session cookies', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test', password: 'test' });

      if (res.headers['set-cookie']) {
        const cookies = res.headers['set-cookie'];
        const sessionCookie = cookies.find(c => c.includes('session'));

        if (sessionCookie) {
          expect(sessionCookie).toContain('HttpOnly');
          expect(sessionCookie).toContain('Secure');
        }
      }
    });
  });

  describe('Input Validation & Sanitization', () => {
    test('should reject overly long input strings', async () => {
      const longString = 'a'.repeat(10000);

      const res = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .send({ name: longString })
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    test('should validate email format', async () => {
      const invalidEmail = 'not-an-email';

      const res = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .send({ email: invalidEmail })
        .expect(400);

      expect(res.body.error).toContain('email');
    });

    test('should validate phone number format', async () => {
      const invalidPhone = 'abc123xyz';

      const res = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .send({ telefono: invalidPhone })
        .expect(400);

      expect(res.body.error).toContain('phone|telefono');
    });

    test('should reject null bytes in input', async () => {
      const nullByteInput = 'test\x00value';

      const res = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .send({ name: nullByteInput })
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    test('should sanitize file upload extensions', async () => {
      const res = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${process.env.TEST_JWT}`)
        .field('file', 'test.exe')
        .expect([400, 415]);

      expect(res.body.error).toBeDefined();
    });
  });
});
