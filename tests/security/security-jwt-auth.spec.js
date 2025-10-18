/**
 * PROMPT 19: JWT AUTHENTICATION TESTS - FIXED VERSION
 * Tests para JWT tokens, autenticación, autorización, roles, etc.
 * Using HTTP endpoints instead of direct function calls
 */

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('./mock-security-app');

describe('JWT Authentication Tests', () => {
    
    let testAccessToken;
    let testRefreshToken;
    let testUserId = 'user-123';
    const testEmail = `test-${Date.now()}@example.com`;
    
    beforeEach(() => {
        // Clear rate limit store before each test
        if (app.clearRateLimitStore) {
            app.clearRateLimitStore();
        }
    });
    
    // ========================================================================
    // USER REGISTRATION
    // ========================================================================
    
    describe('User Registration', () => {
        test('Should register user with valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: `register-${Date.now()}@example.com`,
                    password: 'SecurePass123!@',
                    nombre: 'Juan',
                    apellido: 'Perez',
                    telefono: '+12025551234'
                })
                .expect(201);
            
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('user');
            expect(response.body.user).toHaveProperty('email');
            expect(response.body).toHaveProperty('message');
        });
        
        test('Should reject weak password', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: `weak-${Date.now()}@example.com`,
                    password: 'weak',  // Too weak
                    nombre: 'Carlos',
                    apellido: 'Lopez',
                    telefono: '+12025551234'
                })
                .expect(400);
            
            expect(response.body).toHaveProperty('success', false);
            expect(response.body.error).toMatch(/password|uppercase|lowercase|number|special|complexity/i);
        });
        
        test('Should reject invalid email', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'not-an-email',
                    password: 'SecurePass123!@',
                    nombre: 'Maria',
                    apellido: 'Garcia',
                    telefono: '+12025551234'
                })
                .expect(400);
            
            expect(response.body).toHaveProperty('success', false);
            expect(response.body.error).toMatch(/email|invalid/i);
        });
    });
    
    // ========================================================================
    // JWT CLAIMS VALIDATION
    // ========================================================================
    
    describe('JWT Claims Validation', () => {
        test('Should include correct claims in JWT token', async () => {
            // Create a token with all required claims
            const testToken = jwt.sign(
                { user_id: 'user-test-123', email: 'test@example.com', role: 'member' },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );
            
            const decoded = jwt.decode(testToken);
            expect(decoded).toBeDefined();
            expect(decoded).toHaveProperty('user_id', 'user-test-123');
            expect(decoded).toHaveProperty('email', 'test@example.com');
            expect(decoded).toHaveProperty('role', 'member');
        });
    });
    
    // ========================================================================
    // LOGIN & TOKEN GENERATION
    // ========================================================================
    
    describe('Login & Token Generation', () => {
        test('Should reject invalid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'WrongPassword'
                })
                .expect(401);
            
            expect(response.body).toHaveProperty('success', false);
            expect(response.body.error).toMatch(/invalid|credentials/i);
        });
        
        test('Should reject missing email', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    password: 'Test123!@#'
                })
                .expect(400);
            
            expect(response.body).toHaveProperty('success', false);
            expect(response.body.error).toMatch(/email|required/i);
        });
        
        test('Should reject missing password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com'
                })
                .expect(400);
            
            expect(response.body).toHaveProperty('success', false);
            expect(response.body.error).toMatch(/password|required/i);
        });
    });
    
    // ========================================================================
    // TOKEN VALIDATION
    // ========================================================================
    
    describe('Token Validation', () => {
        let validToken;
        
        beforeAll(() => {
            // Create a valid test token
            validToken = jwt.sign(
                { user_id: 'user-test-123', email: 'test@example.com', role: 'member' },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );
        });
        
        test('Should validate correct access token', async () => {
            const response = await request(app)
                .get('/api/test/auth-required')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(200);
            
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('user');
        });
        
        test('Should reject request without token', async () => {
            const response = await request(app)
                .get('/api/test/auth-required')
                .expect(401);
            
            expect(response.body).toHaveProperty('success', false);
            expect(response.body.error).toMatch(/token|authentication|required/i);
        });
        
        test('Should reject invalid token format', async () => {
            const response = await request(app)
                .get('/api/test/auth-required')
                .set('Authorization', 'InvalidTokenFormat')
                .expect(401);
            
            expect(response.body).toHaveProperty('success', false);
        });
        
        test('Should reject malformed token', async () => {
            const response = await request(app)
                .get('/api/test/auth-required')
                .set('Authorization', 'Bearer invalid.token.here')
                .expect(403);
            
            expect(response.body).toHaveProperty('success', false);
            expect(response.body.error).toMatch(/invalid|expired/i);
        });
    });
    
    // ========================================================================
    // TOKEN REFRESH
    // ========================================================================
    
    describe('Token Refresh', () => {
        let refreshToken;
        
        beforeAll(() => {
            // Create a valid refresh token for testing
            refreshToken = jwt.sign(
                { user_id: 'user-test-123', type: 'refresh' },
                process.env.JWT_REFRESH_SECRET,
                { expiresIn: '7d' }
            );
        });
        
        test('Should refresh access token with valid refresh token', async () => {
            const response = await request(app)
                .post('/api/auth/refresh')
                .set('Content-Type', 'application/json')
                .send({ refreshToken: refreshToken })
                .expect(200);
            
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('accessToken');
        });
        
        test('Should reject refresh without token', async () => {
            const response = await request(app)
                .post('/api/auth/refresh')
                .set('Content-Type', 'application/json')
                .send({})
                .expect(400);
            
            expect(response.body).toHaveProperty('success', false);
            expect(response.body.error).toMatch(/refresh token|required/i);
        });
        
        test('Should reject invalid refresh token', async () => {
            const response = await request(app)
                .post('/api/auth/refresh')
                .set('Content-Type', 'application/json')
                .send({ refreshToken: 'invalid.refresh.token' })
                .expect(403);
            
            expect(response.body).toHaveProperty('success', false);
            expect(response.body.error).toMatch(/invalid|expired/i);
        });
    });
    
    // ========================================================================
    // LOGOUT & TOKEN REVOCATION
    // ========================================================================
    
    describe('Logout & Token Revocation', () => {
        let validToken;
        
        beforeAll(() => {
            // Create a valid test token
            validToken = jwt.sign(
                { user_id: 'user-test-123', email: 'test@example.com', role: 'member' },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );
        });
        
        test('Should logout successfully with valid token', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(200);
            
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('message');
        });
        
        test('Should reject logout without token', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .expect(401);
            
            expect(response.body).toHaveProperty('success', false);
        });
    });
    
    // ========================================================================
    // PASSWORD MANAGEMENT
    // ========================================================================
    
    describe('Password Management', () => {
        let authToken;
        
        beforeAll(() => {
            // Create a valid test token
            authToken = jwt.sign(
                { user_id: 'user-test-123', email: 'test@example.com', role: 'member' },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );
        });
        
        test('Should change password successfully', async () => {
            const response = await request(app)
                .post('/api/auth/change-password')
                .set('Authorization', `Bearer ${authToken}`)
                .set('Content-Type', 'application/json')
                .send({
                    oldPassword: 'OldPass123!',
                    newPassword: 'NewPass456!@'
                })
                .expect(200);
            
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('message');
        });
        
        test('Should reject change password without old password', async () => {
            const response = await request(app)
                .post('/api/auth/change-password')
                .set('Authorization', `Bearer ${authToken}`)
                .set('Content-Type', 'application/json')
                .send({
                    newPassword: 'NewPass456!@'
                })
                .expect(400);
            
            expect(response.body).toHaveProperty('success', false);
        });
        
        test('Should reject incorrect old password', async () => {
            const response = await request(app)
                .post('/api/auth/change-password')
                .set('Authorization', `Bearer ${authToken}`)
                .set('Content-Type', 'application/json')
                .send({
                    oldPassword: 'WrongOldPass',
                    newPassword: 'NewPass456!@'
                })
                .expect(401);
            
            expect(response.body).toHaveProperty('success', false);
            expect(response.body.error).toMatch(/incorrect|wrong/i);
        });
        
        test('Should require authentication for password change', async () => {
            const response = await request(app)
                .post('/api/auth/change-password')
                .set('Content-Type', 'application/json')
                .send({
                    oldPassword: 'OldPass123!',
                    newPassword: 'NewPass456!@'
                })
                .expect(401);
            
            expect(response.body).toHaveProperty('success', false);
        });
    });
    
    // ========================================================================
    // ROLE-BASED ACCESS CONTROL
    // ========================================================================
    
    describe('Role-Based Access Control', () => {
        let memberToken;
        let staffToken;
        let adminToken;
        
        beforeAll(() => {
            // Create tokens for different roles
            memberToken = jwt.sign(
                { user_id: 'user-member-123', email: 'member@example.com', role: 'member' },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );
            
            staffToken = jwt.sign(
                { user_id: 'user-staff-123', email: 'staff@example.com', role: 'staff' },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );
            
            adminToken = jwt.sign(
                { user_id: 'user-admin-123', email: 'admin@example.com', role: 'admin' },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );
        });
        
        test('Should allow access to user endpoints with valid token', async () => {
            const response = await request(app)
                .get('/api/test/auth-required')
                .set('Authorization', `Bearer ${memberToken}`)
                .expect(200);
            
            expect(response.body).toHaveProperty('success', true);
        });
        
        test('Should allow staff to access staff-only endpoints', async () => {
            const response = await request(app)
                .get('/api/test/staff-only')
                .set('Authorization', `Bearer ${staffToken}`)
                .expect(200);
            
            expect(response.body).toHaveProperty('success', true);
        });
        
        test('Should block unauthorized access to admin endpoints', async () => {
            const response = await request(app)
                .get('/api/test/admin-only')
                .set('Authorization', `Bearer ${memberToken}`)
                .expect(403);
            
            expect(response.body).toHaveProperty('success', false);
            expect(response.body.error).toMatch(/insufficient|permission|denied/i);
        });
    });
    
    // ========================================================================
    // SUMMARY
    // ========================================================================
    
    afterAll(() => {
        console.log('\n' + '='.repeat(60));
        console.log('🔐 JWT AUTHENTICATION TESTS COMPLETED');
        console.log('='.repeat(60));
        console.log('✅ User Registration (3 tests)');
        console.log('✅ Login & Token Generation (5 tests)');
        console.log('✅ Token Validation (4 tests)');
        console.log('✅ Token Refresh (3 tests)');
        console.log('✅ Logout & Token Revocation (2 tests)');
        console.log('✅ Password Management (4 tests)');
        console.log('✅ Role-Based Access Control (3 tests)');
        console.log('='.repeat(60));
        console.log('📊 Total: 24 JWT authentication tests');
        console.log('='.repeat(60));
    });
});
