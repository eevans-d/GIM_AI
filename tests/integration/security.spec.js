/**
 * PROMPT 19: SECURITY INTEGRATION TESTS
 * Tests para validación de entrada, rate limiting, JWT, y auditoría
 */

const request = require('supertest');
const express = require('express');
const {
    validateBody,
    validateQuery,
    schemas
} = require('../../../security/input-validator');
const {
    authenticateUser,
    verifyToken,
    hashPassword,
    verifyPassword,
    ROLES
} = require('../../../security/authentication/jwt-auth');
const { createClient } = require('@supabase/supabase-js');

// Mock Supabase
jest.mock('@supabase/supabase-js');
const mockSupabase = {
    from: jest.fn()
};
createClient.mockReturnValue(mockSupabase);

describe('PROMPT 19 - Security Integration Tests', () => {
    
    describe('Input Validation', () => {
        let app;
        
        beforeEach(() => {
            app = express();
            app.use(express.json());
            
            // Test endpoint con validación
            app.post('/test/member',
                validateBody('member'),
                (req, res) => {
                    res.json({ success: true, data: req.body });
                }
            );
            
            app.post('/test/login',
                validateBody('login'),
                (req, res) => {
                    res.json({ success: true });
                }
            );
        });
        
        test('should accept valid member data', async () => {
            const validMember = {
                nombre: 'Juan',
                apellido: 'Pérez',
                telefono: '+523331234567',
                email: 'juan@example.com',
                fecha_nacimiento: '1990-01-15'
            };
            
            const response = await request(app)
                .post('/test/member')
                .send(validMember);
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
        
        test('should reject invalid phone number', async () => {
            const invalidMember = {
                nombre: 'Juan',
                apellido: 'Pérez',
                telefono: '123', // Teléfono inválido
                email: 'juan@example.com'
            };
            
            const response = await request(app)
                .post('/test/member')
                .send(invalidMember);
            
            expect(response.status).toBe(400);
        });
        
        test('should reject XSS attempts', async () => {
            const xssAttempt = {
                nombre: '<script>alert("XSS")</script>',
                apellido: 'Pérez',
                telefono: '+523331234567',
                email: 'juan@example.com'
            };
            
            const response = await request(app)
                .post('/test/member')
                .send(xssAttempt);
            
            expect(response.status).toBe(400);
        });
        
        test('should reject disposable email', async () => {
            const disposableEmail = {
                nombre: 'Juan',
                apellido: 'Pérez',
                telefono: '+523331234567',
                email: 'test@tempmail.com' // Email desechable
            };
            
            const response = await request(app)
                .post('/test/member')
                .send(disposableEmail);
            
            expect(response.status).toBe(400);
        });
        
        test('should validate login credentials format', async () => {
            const validLogin = {
                email: 'admin@gim-ai.com',
                password: 'SecurePass123!'
            };
            
            const response = await request(app)
                .post('/test/login')
                .send(validLogin);
            
            expect(response.status).toBe(200);
        });
        
        test('should reject weak password', async () => {
            const weakPassword = {
                email: 'admin@gim-ai.com',
                password: '123' // Password muy corto
            };
            
            const response = await request(app)
                .post('/test/login')
                .send(weakPassword);
            
            expect(response.status).toBe(400);
        });
    });
    
    describe('JWT Authentication', () => {
        
        test('should hash password securely', async () => {
            const password = 'SecurePassword123!';
            const hash = await hashPassword(password);
            
            expect(hash).toBeDefined();
            expect(hash).not.toBe(password);
            expect(hash.length).toBeGreaterThan(50);
        });
        
        test('should verify correct password', async () => {
            const password = 'SecurePassword123!';
            const hash = await hashPassword(password);
            const isValid = await verifyPassword(password, hash);
            
            expect(isValid).toBe(true);
        });
        
        test('should reject incorrect password', async () => {
            const password = 'SecurePassword123!';
            const wrongPassword = 'WrongPassword123!';
            const hash = await hashPassword(password);
            const isValid = await verifyPassword(wrongPassword, hash);
            
            expect(isValid).toBe(false);
        });
        
        test('should authenticate user with valid credentials', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'admin@gim-ai.com',
                password_hash: await hashPassword('SecurePass123!'),
                role: ROLES.ADMIN,
                activo: true
            };
            
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: mockUser, error: null })
                    })
                }),
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({ error: null })
                })
            });
            
            const result = await authenticateUser(
                'admin@gim-ai.com',
                'SecurePass123!',
                'test-correlation-id'
            );
            
            expect(result).toBeDefined();
            expect(result.user).toBeDefined();
            expect(result.user.email).toBe('admin@gim-ai.com');
            expect(result.accessToken).toBeDefined();
            expect(result.refreshToken).toBeDefined();
        });
        
        test('should reject authentication with wrong password', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'admin@gim-ai.com',
                password_hash: await hashPassword('SecurePass123!'),
                role: ROLES.ADMIN,
                activo: true
            };
            
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: mockUser, error: null })
                    })
                })
            });
            
            await expect(authenticateUser(
                'admin@gim-ai.com',
                'WrongPassword123!',
                'test-correlation-id'
            )).rejects.toThrow();
        });
        
        test('should reject authentication for inactive user', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'admin@gim-ai.com',
                password_hash: await hashPassword('SecurePass123!'),
                role: ROLES.ADMIN,
                activo: false // Usuario inactivo
            };
            
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: mockUser, error: null })
                    })
                })
            });
            
            await expect(authenticateUser(
                'admin@gim-ai.com',
                'SecurePass123!',
                'test-correlation-id'
            )).rejects.toThrow('inactive');
        });
    });
    
    describe('SQL Injection Prevention', () => {
        const { isSQLSafe } = require('../../../security/input-validator');
        
        test('should detect OR-based injection', () => {
            const malicious = "1' OR '1'='1";
            expect(isSQLSafe(malicious)).toBe(false);
        });
        
        test('should detect UNION SELECT injection', () => {
            const malicious = "1 UNION SELECT * FROM users";
            expect(isSQLSafe(malicious)).toBe(false);
        });
        
        test('should detect DROP TABLE injection', () => {
            const malicious = "1; DROP TABLE members;";
            expect(isSQLSafe(malicious)).toBe(false);
        });
        
        test('should allow safe input', () => {
            const safe = "Juan Pérez";
            expect(isSQLSafe(safe)).toBe(true);
        });
    });
    
    describe('XSS Prevention', () => {
        const { sanitizeString } = require('../../../security/input-validator');
        
        test('should remove script tags', () => {
            const xss = '<script>alert("XSS")</script>Hello';
            const sanitized = sanitizeString(xss);
            
            expect(sanitized).not.toContain('<script>');
            expect(sanitized).not.toContain('</script>');
        });
        
        test('should remove event handlers', () => {
            const xss = '<img src="x" onerror="alert(1)">';
            const sanitized = sanitizeString(xss);
            
            expect(sanitized).not.toContain('onerror');
        });
        
        test('should preserve safe text', () => {
            const safe = 'Juan Pérez <3 Gym';
            const sanitized = sanitizeString(safe);
            
            expect(sanitized).toContain('Juan');
            expect(sanitized).toContain('Pérez');
        });
    });
    
    describe('Security Headers', () => {
        const { applySecurityMiddleware } = require('../../../security/security-middleware');
        
        let app;
        
        beforeEach(() => {
            app = express();
            applySecurityMiddleware(app);
            
            app.get('/test', (req, res) => {
                res.json({ success: true });
            });
        });
        
        test('should set X-Content-Type-Options header', async () => {
            const response = await request(app).get('/test');
            
            expect(response.headers['x-content-type-options']).toBe('nosniff');
        });
        
        test('should set X-Frame-Options header', async () => {
            const response = await request(app).get('/test');
            
            expect(response.headers['x-frame-options']).toBeDefined();
        });
        
        test('should remove X-Powered-By header', async () => {
            const response = await request(app).get('/test');
            
            expect(response.headers['x-powered-by']).toBeUndefined();
        });
    });
    
    describe('CORS Configuration', () => {
        const { corsOptions } = require('../../../security/security-middleware');
        
        test('should allow localhost origins', () => {
            const callback = jest.fn();
            corsOptions.origin('http://localhost:3000', callback);
            
            expect(callback).toHaveBeenCalledWith(null, true);
        });
        
        test('should block unknown origins', () => {
            const callback = jest.fn();
            corsOptions.origin('http://malicious-site.com', callback);
            
            expect(callback).toHaveBeenCalledWith(expect.any(Error));
        });
    });
    
    describe('Sensitive Data Masking', () => {
        const { sanitizeForLogging } = require('../../../security/input-validator');
        
        test('should mask passwords', () => {
            const data = {
                email: 'user@example.com',
                password: 'SecretPassword123!'
            };
            
            const masked = sanitizeForLogging(data);
            
            expect(masked.password).toBe('***REDACTED***');
            expect(masked.email).not.toBe('***REDACTED***');
        });
        
        test('should partially mask phone numbers', () => {
            const data = {
                telefono: '+523331234567'
            };
            
            const masked = sanitizeForLogging(data);
            
            expect(masked.telefono).toContain('***');
            expect(masked.telefono).toContain('4567'); // Últimos 4 dígitos
        });
        
        test('should partially mask emails', () => {
            const data = {
                email: 'juan@example.com'
            };
            
            const masked = sanitizeForLogging(data);
            
            expect(masked.email).toContain('ju***');
            expect(masked.email).toContain('@example.com');
        });
    });
});
