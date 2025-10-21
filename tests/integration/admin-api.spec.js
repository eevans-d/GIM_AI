/**
 * Admin API Endpoints Tests
 * SEMANA 2 Day 2 - Backend Implementation
 */

const request = require('supertest');
const express = require('express');
const adminRoutes = require('../../routes/api/admin');

// Mock logger
jest.mock('../../utils/logger', () => ({
    createLogger: jest.fn(() => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }))
}));

// Mock error handler
jest.mock('../../utils/error-handler', () => ({
    AppError: class AppError extends Error {
        constructor(message, errorType, statusCode, details) {
            super(message);
            this.errorType = errorType;
            this.statusCode = statusCode;
            this.details = details;
        }
    },
    ErrorTypes: {
        DATABASE_ERROR: 'DATABASE_ERROR',
        NOT_FOUND: 'NOT_FOUND',
        VALIDATION_ERROR: 'VALIDATION_ERROR'
    }
}));

// Mock admin queries
jest.mock('../../routes/api/admin/admin-queries', () => ({
    getDashboardMetrics: jest.fn().mockResolvedValue({
        activeMembers: 150,
        todayCheckins: 45,
        monthlyRevenue: 15000,
        pendingPayments: 12,
        classOccupancy: 75,
        churnRisk: 5,
        membersTrend: 8,
        checkinsTrend: 12,
        revenueTrend: 5,
        timestamp: '2025-10-21T22:00:00Z'
    }),
    getClassesList: jest.fn().mockResolvedValue([
        {
            id: 'class-1',
            nombre: 'Spinning',
            instructor_id: 'instr-1',
            horario: '09:00',
            capacidad_maxima: 20,
            estado: 'activo',
            currentOccupancy: 15,
            occupancyPercentage: 75
        },
        {
            id: 'class-2',
            nombre: 'Yoga',
            instructor_id: 'instr-2',
            horario: '18:00',
            capacidad_maxima: 15,
            estado: 'activo',
            currentOccupancy: 10,
            occupancyPercentage: 67
        }
    ]),
    pauseClass: jest.fn().mockResolvedValue({
        id: 'class-1',
        estado: 'pausado',
        updated_at: '2025-10-21T22:05:00Z'
    }),
    resumeClass: jest.fn().mockResolvedValue({
        id: 'class-1',
        estado: 'activo',
        updated_at: '2025-10-21T22:05:00Z'
    }),
    getMembersList: jest.fn().mockResolvedValue([
        {
            id: 'member-1',
            nombre: 'Juan Pérez',
            telefono: '3105551234',
            email: 'juan@example.com',
            estado: 'activo',
            fecha_registro: '2025-01-15',
            fecha_ultimo_checkin: '2025-10-21',
            deuda_actual: 0,
            statusBadge: 'active',
            debtDays: 0
        }
    ]),
    getPendingPayments: jest.fn().mockResolvedValue([
        {
            id: 'payment-1',
            member_id: 'member-1',
            monto: 50000,
            fecha_vencimiento: '2025-10-15',
            estado: 'pendiente',
            daysOverdue: 6,
            severityColor: 'danger'
        }
    ]),
    getReportsList: jest.fn().mockResolvedValue([
        {
            id: 'report-1',
            type: 'revenue',
            status: 'completed',
            created_at: '2025-10-20T10:00:00Z'
        }
    ])
}));

describe('Admin API Endpoints', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use((req, res, next) => {
            req.correlationId = 'test-correlation-id';
            next();
        });
        app.use(adminRoutes);
    });

    // ========================================================================
    // METRICS ENDPOINTS
    // ========================================================================

    describe('GET /metrics/dashboard', () => {
        it('should return dashboard metrics successfully', async () => {
            const response = await request(app)
                .get('/metrics/dashboard')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('activeMembers');
            expect(response.body.data).toHaveProperty('todayCheckins');
            expect(response.body.data).toHaveProperty('monthlyRevenue');
            expect(response.body.data).toHaveProperty('timestamp');
            expect(response.body.data.activeMembers).toBe(150);
            expect(response.body.data.todayCheckins).toBe(45);
        });

        it('should include all required KPI fields', async () => {
            const response = await request(app)
                .get('/metrics/dashboard')
                .expect(200);

            const { data } = response.body;
            expect(data).toHaveProperty('activeMembers');
            expect(data).toHaveProperty('todayCheckins');
            expect(data).toHaveProperty('monthlyRevenue');
            expect(data).toHaveProperty('pendingPayments');
            expect(data).toHaveProperty('classOccupancy');
            expect(data).toHaveProperty('churnRisk');
        });
    });

    // ========================================================================
    // CLASSES ENDPOINTS
    // ========================================================================

    describe('GET /classes/list', () => {
        it('should return list of classes', async () => {
            const response = await request(app)
                .get('/classes/list')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.count).toBe(2);
            expect(response.body.data[0]).toHaveProperty('nombre');
            expect(response.body.data[0]).toHaveProperty('occupancyPercentage');
        });

        it('should include class occupancy info', async () => {
            const response = await request(app)
                .get('/classes/list')
                .expect(200);

            const clase = response.body.data[0];
            expect(clase.currentOccupancy).toBe(15);
            expect(clase.occupancyPercentage).toBe(75);
        });
    });

    describe('POST /classes/:id/pause', () => {
        it('should pause a class successfully', async () => {
            const classId = '550e8400-e29b-41d4-a716-446655440000';
            
            const response = await request(app)
                .post(`/classes/${classId}/pause`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.estado).toBe('pausado');
            expect(response.body.message).toBe('Class paused successfully');
        });

        it('should reject invalid class ID', async () => {
            const response = await request(app)
                .post('/classes/invalid-id/pause')
                .expect(400);

            expect(response.body.error).toBe('Validation failed');
        });
    });

    describe('POST /classes/:id/resume', () => {
        it('should resume a class successfully', async () => {
            const classId = '550e8400-e29b-41d4-a716-446655440000';
            
            const response = await request(app)
                .post(`/classes/${classId}/resume`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.estado).toBe('activo');
            expect(response.body.message).toBe('Class resumed successfully');
        });
    });

    // ========================================================================
    // MEMBERS ENDPOINTS
    // ========================================================================

    describe('GET /members/list', () => {
        it('should return list of all members', async () => {
            const response = await request(app)
                .get('/members/list?filter=all')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.filter).toBe('all');
            expect(response.body.data[0]).toHaveProperty('nombre');
            expect(response.body.data[0]).toHaveProperty('estado');
        });

        it('should support active filter', async () => {
            const response = await request(app)
                .get('/members/list?filter=active')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.filter).toBe('active');
        });

        it('should support debt filter', async () => {
            const response = await request(app)
                .get('/members/list?filter=debt')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.filter).toBe('debt');
        });

        it('should reject invalid filter', async () => {
            const response = await request(app)
                .get('/members/list?filter=invalid')
                .expect(400);

            expect(response.body.error).toBe('Validation failed');
        });
    });

    // ========================================================================
    // PAYMENTS ENDPOINTS
    // ========================================================================

    describe('GET /payments/pending', () => {
        it('should return pending payments', async () => {
            const response = await request(app)
                .get('/payments/pending')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data[0]).toHaveProperty('monto');
            expect(response.body.data[0]).toHaveProperty('daysOverdue');
            expect(response.body.totalAmount).toBeGreaterThan(0);
        });

        it('should calculate days overdue correctly', async () => {
            const response = await request(app)
                .get('/payments/pending')
                .expect(200);

            expect(response.body.data[0].daysOverdue).toBeGreaterThanOrEqual(0);
        });
    });

    describe('POST /reminders/send-batch', () => {
        it('should queue batch reminders', async () => {
            const response = await request(app)
                .post('/reminders/send-batch')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.message).toContain('queued');
        });
    });

    // ========================================================================
    // REPORTS ENDPOINTS
    // ========================================================================

    describe('GET /reports/list', () => {
        it('should return list of reports', async () => {
            const response = await request(app)
                .get('/reports/list')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    describe('POST /reports/generate', () => {
        it('should queue report generation for revenue', async () => {
            const response = await request(app)
                .post('/reports/generate')
                .send({ type: 'revenue' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.type).toBe('revenue');
            expect(response.body.data.status).toBe('queued');
        });

        it('should accept all valid report types', async () => {
            const types = ['revenue', 'engagement', 'payments', 'classes'];
            
            for (const type of types) {
                const response = await request(app)
                    .post('/reports/generate')
                    .send({ type })
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data.type).toBe(type);
            }
        });

        it('should reject invalid report type', async () => {
            const response = await request(app)
                .post('/reports/generate')
                .send({ type: 'invalid' })
                .expect(400);

            expect(response.body.error).toBe('Validation failed');
        });

        it('should require type field', async () => {
            const response = await request(app)
                .post('/reports/generate')
                .send({})
                .expect(400);

            expect(response.body.error).toBe('Validation failed');
        });
    });

    // ========================================================================
    // QUICK ACTIONS ENDPOINTS
    // ========================================================================

    describe('POST /classes/pause-all', () => {
        it('should queue pause all classes action', async () => {
            const response = await request(app)
                .post('/classes/pause-all')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.message).toContain('queued');
        });
    });

    describe('POST /backup', () => {
        it('should queue backup task', async () => {
            const response = await request(app)
                .post('/backup')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('queued');
        });
    });

    // ========================================================================
    // RESPONSE FORMAT TESTS
    // ========================================================================

    describe('Response Format', () => {
        it('should always include timestamp', async () => {
            const response = await request(app)
                .get('/metrics/dashboard')
                .expect(200);

            expect(response.body.timestamp).toBeDefined();
            expect(typeof response.body.timestamp).toBe('string');
        });

        it('should always include success field', async () => {
            const response = await request(app)
                .get('/metrics/dashboard')
                .expect(200);

            expect(response.body.success).toBeDefined();
            expect(typeof response.body.success).toBe('boolean');
        });

        it('should include data field for successful responses', async () => {
            const response = await request(app)
                .get('/metrics/dashboard')
                .expect(200);

            expect(response.body.data).toBeDefined();
        });
    });
});
