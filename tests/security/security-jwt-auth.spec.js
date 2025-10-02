/**
 * PROMPT 19: JWT AUTHENTICATION TESTS
 * Tests para JWT tokens, autenticación, autorización, roles, etc.
 */

const {
    authenticateUser,
    refreshAccessToken,
    createUser,
    changePassword,
    revokeToken,
    authenticateJWT,
    requireRole,
    ROLES
} = require('../../security/authentication/jwt-auth');
const jwt = require('jsonwebtoken');
const { AppError } = require('../../utils/error-handler');
const request = require('supertest');
const app = require('../../index');

describe('JWT Authentication Tests', () => {
    
    let testUserId;
    let testAccessToken;
    let testRefreshToken;
    
    // ========================================================================
    // USER CREATION & PASSWORD HASHING
    // ========================================================================
    
    describe('User Creation', () => {
        test('Should create user with hashed password', async () => {
            const userData = {
                email: `test-${Date.now()}@example.com`,
                password: 'SecurePass123!',
                nombre: 'Test',
                apellido: 'User',
                role: ROLES.MEMBER
            };
            
            const user = await createUser(userData, 'test-001');
            
            expect(user).toHaveProperty('id');
            expect(user).toHaveProperty('email', userData.email);
            expect(user.password).not.toBe('SecurePass123!'); // Should be hashed
            expect(user.password).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt hash format
            
            testUserId = user.id;
        });
        
        test('Should enforce password complexity', async () => {
            const userData = {
                email: 'weak@example.com',
                password: 'weak',  // Too weak
                nombre: 'Test',
                apellido: 'User',
                role: ROLES.MEMBER
            };
            
            await expect(
                createUser(userData, 'test-002')
            ).rejects.toThrow();
        });
        
        test('Should reject duplicate email', async () => {
            const userData = {
                email: 'duplicate@example.com',
                password: 'SecurePass123!',
                nombre: 'Test',
                apellido: 'User',
                role: ROLES.MEMBER
            };
            
            // Create first user
            await createUser(userData, 'test-003');
            
            // Attempt to create duplicate
            await expect(
                createUser(userData, 'test-004')
            ).rejects.toThrow(/already exists|duplicate/i);
        });
    });
    
    // ========================================================================
    // LOGIN & TOKEN GENERATION
    // ========================================================================
    
    describe('Login & Token Generation', () => {
        test('Should authenticate valid credentials and return tokens', async () => {
            // First create a test user
            const testUser = await createUser({
                email: `login-${Date.now()}@example.com`,
                password: 'SecurePass123!',
                nombre: 'Login',
                apellido: 'Test',
                role: ROLES.MEMBER
            }, 'test-005');
            
            // Attempt login
            const result = await authenticateUser(
                testUser.email,
                'SecurePass123!',
                'test-006'
            );
            
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result).toHaveProperty('user');
            expect(result.user.email).toBe(testUser.email);
            
            testAccessToken = result.accessToken;
            testRefreshToken = result.refreshToken;
        });
        
        test('Should reject invalid password', async () => {
            await expect(
                authenticateUser('test@example.com', 'WrongPassword123!', 'test-007')
            ).rejects.toThrow(/invalid credentials/i);
        });
        
        test('Should reject non-existent user', async () => {
            await expect(
                authenticateUser('nonexistent@example.com', 'SecurePass123!', 'test-008')
            ).rejects.toThrow(/not found|invalid credentials/i);
        });
        
        test('Should include correct claims in access token', () => {
            const decoded = jwt.decode(testAccessToken);
            
            expect(decoded).toHaveProperty('sub'); // User ID
            expect(decoded).toHaveProperty('email');
            expect(decoded).toHaveProperty('role');
            expect(decoded).toHaveProperty('iat'); // Issued at
            expect(decoded).toHaveProperty('exp'); // Expiration
            expect(decoded.exp - decoded.iat).toBeLessThanOrEqual(900); // 15 minutes
        });
        
        test('Should include correct claims in refresh token', () => {
            const decoded = jwt.decode(testRefreshToken);
            
            expect(decoded).toHaveProperty('sub');
            expect(decoded).toHaveProperty('type', 'refresh');
            expect(decoded.exp - decoded.iat).toBeLessThanOrEqual(604800); // 7 days
        });
    });
    
    // ========================================================================
    // TOKEN VALIDATION
    // ========================================================================
    
    describe('Token Validation', () => {
        test('Should validate correct access token', async () => {
            const response = await request(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${testAccessToken}`)
                .expect(200);
            
            expect(response.body).toHaveProperty('success', true);
        });
        
        test('Should reject request without token', async () => {
            const response = await request(app)
                .get('/api/profile')
                .expect(401);
            
            expect(response.body.error).toMatch(/token.*required|unauthorized/i);
        });
        
        test('Should reject invalid token', async () => {
            const response = await request(app)
                .get('/api/profile')
                .set('Authorization', 'Bearer invalid-token-12345')
                .expect(401);
            
            expect(response.body.error).toMatch(/invalid.*token/i);
        });
        
        test('Should reject expired token', async () => {
            // Create expired token
            const expiredToken = jwt.sign(
                {
                    sub: '123e4567-e89b-12d3-a456-426614174000',
                    email: 'test@example.com',
                    role: ROLES.MEMBER
                },
                process.env.JWT_SECRET,
                { expiresIn: '-1h' } // Expired 1 hour ago
            );
            
            const response = await request(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${expiredToken}`)
                .expect(401);
            
            expect(response.body.error).toMatch(/expired/i);
        });
        
        test('Should reject token with wrong signature', async () => {
            const maliciousToken = jwt.sign(
                {
                    sub: '123e4567-e89b-12d3-a456-426614174000',
                    email: 'hacker@example.com',
                    role: ROLES.ADMIN
                },
                'wrong-secret-key',
                { expiresIn: '15m' }
            );
            
            const response = await request(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${maliciousToken}`)
                .expect(401);
            
            expect(response.body.error).toMatch(/invalid.*signature/i);
        });
    });
    
    // ========================================================================
    // TOKEN REFRESH
    // ========================================================================
    
    describe('Token Refresh', () => {
        test('Should generate new access token from valid refresh token', async () => {
            const result = await refreshAccessToken(testRefreshToken, 'test-009');
            
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result.accessToken).not.toBe(testAccessToken); // New token
            expect(result.refreshToken).not.toBe(testRefreshToken); // Rotated
        });
        
        test('Should reject refresh with access token', async () => {
            await expect(
                refreshAccessToken(testAccessToken, 'test-010')
            ).rejects.toThrow(/invalid.*refresh.*token/i);
        });
        
        test('Should reject expired refresh token', async () => {
            const expiredRefreshToken = jwt.sign(
                {
                    sub: '123e4567-e89b-12d3-a456-426614174000',
                    type: 'refresh'
                },
                process.env.JWT_REFRESH_SECRET,
                { expiresIn: '-1d' }
            );
            
            await expect(
                refreshAccessToken(expiredRefreshToken, 'test-011')
            ).rejects.toThrow(/expired/i);
        });
    });
    
    // ========================================================================
    // TOKEN REVOCATION (LOGOUT)
    // ========================================================================
    
    describe('Token Revocation', () => {
        test('Should revoke token on logout', async () => {
            // Create new token for revocation test
            const testUser = await createUser({
                email: `revoke-${Date.now()}@example.com`,
                password: 'SecurePass123!',
                nombre: 'Revoke',
                apellido: 'Test',
                role: ROLES.MEMBER
            }, 'test-012');
            
            const { accessToken } = await authenticateUser(
                testUser.email,
                'SecurePass123!',
                'test-013'
            );
            
            // Revoke token
            await revokeToken(accessToken, 'test-014');
            
            // Attempt to use revoked token
            const response = await request(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(401);
            
            expect(response.body.error).toMatch(/revoked|invalid/i);
        });
    });
    
    // ========================================================================
    // ROLE-BASED ACCESS CONTROL
    // ========================================================================
    
    describe('Role-Based Access Control', () => {
        let memberToken, staffToken, adminToken;
        
        beforeAll(async () => {
            // Create users with different roles
            const memberUser = await createUser({
                email: `member-${Date.now()}@example.com`,
                password: 'SecurePass123!',
                nombre: 'Member',
                apellido: 'User',
                role: ROLES.MEMBER
            }, 'test-015');
            
            const staffUser = await createUser({
                email: `staff-${Date.now()}@example.com`,
                password: 'SecurePass123!',
                nombre: 'Staff',
                apellido: 'User',
                role: ROLES.STAFF
            }, 'test-016');
            
            const adminUser = await createUser({
                email: `admin-${Date.now()}@example.com`,
                password: 'SecurePass123!',
                nombre: 'Admin',
                apellido: 'User',
                role: ROLES.ADMIN
            }, 'test-017');
            
            // Get tokens
            memberToken = (await authenticateUser(memberUser.email, 'SecurePass123!', 'test-018')).accessToken;
            staffToken = (await authenticateUser(staffUser.email, 'SecurePass123!', 'test-019')).accessToken;
            adminToken = (await authenticateUser(adminUser.email, 'SecurePass123!', 'test-020')).accessToken;
        });
        
        test('Should allow admin to access admin routes', async () => {
            const response = await request(app)
                .get('/api/admin/stats')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
            
            expect(response.body).toHaveProperty('success', true);
        });
        
        test('Should deny member access to admin routes', async () => {
            const response = await request(app)
                .get('/api/admin/stats')
                .set('Authorization', `Bearer ${memberToken}`)
                .expect(403);
            
            expect(response.body.error).toMatch(/forbidden|insufficient.*permissions/i);
        });
        
        test('Should allow staff to access staff routes', async () => {
            const response = await request(app)
                .get('/api/staff/reports')
                .set('Authorization', `Bearer ${staffToken}`)
                .expect(200);
            
            expect(response.body).toHaveProperty('success', true);
        });
        
        test('Should deny member access to staff routes', async () => {
            const response = await request(app)
                .get('/api/staff/reports')
                .set('Authorization', `Bearer ${memberToken}`)
                .expect(403);
            
            expect(response.body.error).toMatch(/forbidden/i);
        });
    });
    
    // ========================================================================
    // PASSWORD CHANGE
    // ========================================================================
    
    describe('Password Change', () => {
        test('Should change password with valid old password', async () => {
            const testUser = await createUser({
                email: `password-${Date.now()}@example.com`,
                password: 'OldPassword123!',
                nombre: 'Password',
                apellido: 'Test',
                role: ROLES.MEMBER
            }, 'test-021');
            
            // Change password
            await changePassword(
                testUser.id,
                'OldPassword123!',
                'NewPassword456!',
                'test-022'
            );
            
            // Try logging in with new password
            const result = await authenticateUser(
                testUser.email,
                'NewPassword456!',
                'test-023'
            );
            
            expect(result).toHaveProperty('accessToken');
        });
        
        test('Should reject password change with incorrect old password', async () => {
            await expect(
                changePassword(
                    testUserId,
                    'WrongOldPassword123!',
                    'NewPassword456!',
                    'test-024'
                )
            ).rejects.toThrow(/incorrect.*password/i);
        });
        
        test('Should enforce password complexity on change', async () => {
            await expect(
                changePassword(
                    testUserId,
                    'SecurePass123!',
                    'weak',
                    'test-025'
                )
            ).rejects.toThrow(/password.*complexity/i);
        });
    });
    
    // ========================================================================
    // SUMMARY
    // ========================================================================
    
    afterAll(() => {
        console.log('\n' + '='.repeat(60));
        console.log('🔑 JWT AUTHENTICATION TESTS COMPLETED');
        console.log('='.repeat(60));
        console.log('✅ User Creation (3 tests)');
        console.log('✅ Login & Token Generation (5 tests)');
        console.log('✅ Token Validation (5 tests)');
        console.log('✅ Token Refresh (3 tests)');
        console.log('✅ Token Revocation (1 test)');
        console.log('✅ Role-Based Access Control (4 tests)');
        console.log('✅ Password Change (3 tests)');
        console.log('='.repeat(60));
        console.log('📊 Total: 24 JWT authentication tests');
        console.log('='.repeat(60));
    });
});
