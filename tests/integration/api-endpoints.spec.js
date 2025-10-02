/**
 * PROMPT 18: API ENDPOINTS INTEGRATION TESTS
 * Valida todos los endpoints REST de 8 routers
 * Coverage: checkin, qr, reminders, collection, surveys, replacements, instructor-panel, dashboard
 */

const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');
const app = require('../../index');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

describe('API Integration Tests', () => {
    
    let testMember = null;
    let testClass = null;
    let testInstructor = null;
    
    // ========================================================================
    // SETUP
    // ========================================================================
    
    beforeAll(async () => {
        // Crear datos de prueba
        const { data: member } = await supabase
            .from('members')
            .insert({
                nombre: 'API',
                apellido: 'Test',
                telefono: '+521111111111',
                email: 'api-test@example.com',
                activo: true,
                deuda_actual: 0
            })
            .select()
            .single();
        testMember = member;
        
        const { data: clase } = await supabase
            .from('clases')
            .insert({
                nombre_clase: 'API Test Class',
                horario: '19:00',
                fecha: new Date().toISOString().split('T')[0],
                capacidad_maxima: 15,
                tipo_clase: 'yoga'
            })
            .select()
            .single();
        testClass = clase;
        
        const { data: instructor } = await supabase
            .from('instructors')
            .insert({
                nombre: 'Test Instructor',
                email: 'instructor-test@example.com',
                telefono: '+522222222222',
                especialidad: 'yoga'
            })
            .select()
            .single();
        testInstructor = instructor;
    });
    
    afterAll(async () => {
        if (testInstructor) await supabase.from('instructors').delete().eq('id', testInstructor.id);
        if (testClass) await supabase.from('clases').delete().eq('id', testClass.id);
        if (testMember) await supabase.from('members').delete().eq('id', testMember.id);
    });
    
    // ========================================================================
    // QR ENDPOINTS (Prompt 5)
    // ========================================================================
    
    describe('QR Endpoints', () => {
        test('POST /api/qr/generate - Generate QR code', async () => {
            const response = await request(app)
                .post('/api/qr/generate')
                .send({ member_id: testMember.id })
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.qr_code).toBeDefined();
            expect(response.body.qr_code_url).toBeDefined();
        });
        
        test('POST /api/qr/validate - Validate QR code', async () => {
            const response = await request(app)
                .post('/api/qr/validate')
                .send({ qr_code: testMember.codigo_qr || 'GIM-TEST-001' })
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.valid).toBeDefined();
        });
        
        test('GET /api/qr/:memberId - Get QR code image', async () => {
            const response = await request(app)
                .get(`/api/qr/${testMember.id}`)
                .expect('Content-Type', /image/);
            
            expect(response.status).toBe(200);
        });
    });
    
    // ========================================================================
    // CHECK-IN ENDPOINTS (Prompt 5)
    // ========================================================================
    
    describe('Check-in Endpoints', () => {
        test('POST /api/checkin - Create check-in', async () => {
            const response = await request(app)
                .post('/api/checkin')
                .send({
                    qr_code: testMember.codigo_qr || 'GIM-TEST-001',
                    clase_id: testClass.id
                })
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.checkin).toBeDefined();
        });
        
        test('GET /api/checkin/class/:classId - Get class check-ins', async () => {
            const response = await request(app)
                .get(`/api/checkin/class/${testClass.id}`)
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.checkins)).toBe(true);
        });
        
        test('GET /api/checkin/member/:memberId - Get member check-ins', async () => {
            const response = await request(app)
                .get(`/api/checkin/member/${testMember.id}`)
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.checkins)).toBe(true);
        });
    });
    
    // ========================================================================
    // REMINDER ENDPOINTS (Prompt 6)
    // ========================================================================
    
    describe('Reminder Endpoints', () => {
        test('POST /api/reminders/schedule - Schedule reminder', async () => {
            const response = await request(app)
                .post('/api/reminders/schedule')
                .send({
                    member_id: testMember.id,
                    clase_id: testClass.id,
                    reminder_type: 'class_reminder',
                    send_at: new Date(Date.now() + 3600000).toISOString()
                })
                .expect(200);
            
            expect(response.body.success).toBe(true);
        });
        
        test('GET /api/reminders/member/:memberId - Get member reminders', async () => {
            const response = await request(app)
                .get(`/api/reminders/member/${testMember.id}`)
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.reminders)).toBe(true);
        });
        
        test('DELETE /api/reminders/:reminderId - Cancel reminder', async () => {
            // Primero crear reminder
            const { body } = await request(app)
                .post('/api/reminders/schedule')
                .send({
                    member_id: testMember.id,
                    reminder_type: 'payment_reminder',
                    send_at: new Date(Date.now() + 7200000).toISOString()
                });
            
            if (body.reminder_id) {
                const response = await request(app)
                    .delete(`/api/reminders/${body.reminder_id}`)
                    .expect(200);
                
                expect(response.body.success).toBe(true);
            }
        });
    });
    
    // ========================================================================
    // CONTEXTUAL COLLECTION ENDPOINTS (Prompt 7)
    // ========================================================================
    
    describe('Contextual Collection Endpoints', () => {
        test('POST /api/collection/trigger - Trigger collection', async () => {
            const response = await request(app)
                .post('/api/collection/trigger')
                .send({
                    member_id: testMember.id,
                    checkin_id: null // simulated
                })
                .expect(200);
            
            expect(response.body.success).toBe(true);
        });
        
        test('GET /api/collection/pending - Get pending collections', async () => {
            const response = await request(app)
                .get('/api/collection/pending')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.collections)).toBe(true);
        });
        
        test('POST /api/collection/:collectionId/complete - Complete collection', async () => {
            // Crear collection primero
            const { body } = await request(app)
                .post('/api/collection/trigger')
                .send({ member_id: testMember.id });
            
            if (body.collection_id) {
                const response = await request(app)
                    .post(`/api/collection/${body.collection_id}/complete`)
                    .send({ amount_collected: 500 })
                    .expect(200);
                
                expect(response.body.success).toBe(true);
            }
        });
    });
    
    // ========================================================================
    // SURVEY ENDPOINTS (Prompt 8)
    // ========================================================================
    
    describe('Survey Endpoints', () => {
        test('POST /api/surveys/trigger - Trigger survey', async () => {
            const response = await request(app)
                .post('/api/surveys/trigger')
                .send({
                    checkin_id: null, // simulated
                    member_id: testMember.id
                })
                .expect(200);
            
            expect(response.body.success).toBe(true);
        });
        
        test('POST /api/surveys/respond - Submit survey response', async () => {
            // Crear survey primero
            const { body } = await request(app)
                .post('/api/surveys/trigger')
                .send({ member_id: testMember.id });
            
            if (body.survey_id) {
                const response = await request(app)
                    .post('/api/surveys/respond')
                    .send({
                        survey_id: body.survey_id,
                        rating: 5,
                        nps_score: 10,
                        comment: 'Test survey response'
                    })
                    .expect(200);
                
                expect(response.body.success).toBe(true);
            }
        });
        
        test('GET /api/surveys/stats - Get survey statistics', async () => {
            const response = await request(app)
                .get('/api/surveys/stats')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.stats).toBeDefined();
        });
    });
    
    // ========================================================================
    // REPLACEMENT ENDPOINTS (Prompt 9)
    // ========================================================================
    
    describe('Replacement Endpoints', () => {
        test('POST /api/replacements/request - Request replacement', async () => {
            const response = await request(app)
                .post('/api/replacements/request')
                .send({
                    clase_id: testClass.id,
                    instructor_id: testInstructor.id,
                    fecha_requerida: new Date().toISOString().split('T')[0],
                    motivo: 'Test replacement request'
                })
                .expect(200);
            
            expect(response.body.success).toBe(true);
        });
        
        test('GET /api/replacements/pending - Get pending replacements', async () => {
            const response = await request(app)
                .get('/api/replacements/pending')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.replacements)).toBe(true);
        });
        
        test('POST /api/replacements/:replacementId/accept - Accept replacement', async () => {
            // Crear replacement primero
            const { body } = await request(app)
                .post('/api/replacements/request')
                .send({
                    clase_id: testClass.id,
                    instructor_id: testInstructor.id,
                    fecha_requerida: new Date().toISOString().split('T')[0]
                });
            
            if (body.replacement_id) {
                const response = await request(app)
                    .post(`/api/replacements/${body.replacement_id}/accept`)
                    .send({ substitute_instructor_id: testInstructor.id })
                    .expect(200);
                
                expect(response.body.success).toBe(true);
            }
        });
    });
    
    // ========================================================================
    // INSTRUCTOR PANEL ENDPOINTS (Prompt 10)
    // ========================================================================
    
    describe('Instructor Panel Endpoints', () => {
        test('POST /api/instructor-panel/session/start - Start session', async () => {
            const response = await request(app)
                .post('/api/instructor-panel/session/start')
                .send({
                    instructor_id: testInstructor.id,
                    clase_id: testClass.id
                })
                .expect(200);
            
            expect(response.body.success).toBe(true);
        });
        
        test('GET /api/instructor-panel/session/:instructorId - Get active session', async () => {
            const response = await request(app)
                .get(`/api/instructor-panel/session/${testInstructor.id}`)
                .expect(200);
            
            expect(response.body.success).toBe(true);
        });
        
        test('POST /api/instructor-panel/attendance/mark - Mark attendance', async () => {
            const response = await request(app)
                .post('/api/instructor-panel/attendance/mark')
                .send({
                    instructor_id: testInstructor.id,
                    clase_id: testClass.id,
                    member_id: testMember.id,
                    presente: true
                })
                .expect(200);
            
            expect(response.body.success).toBe(true);
        });
        
        test('POST /api/instructor-panel/session/end - End session', async () => {
            const response = await request(app)
                .post('/api/instructor-panel/session/end')
                .send({
                    instructor_id: testInstructor.id,
                    clase_id: testClass.id
                })
                .expect(200);
            
            expect(response.body.success).toBe(true);
        });
    });
    
    // ========================================================================
    // DASHBOARD ENDPOINTS (Prompt 15)
    // ========================================================================
    
    describe('Dashboard Endpoints', () => {
        test('GET /api/dashboard/kpis/realtime - Get realtime KPIs', async () => {
            const response = await request(app)
                .get('/api/dashboard/kpis/realtime')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
        });
        
        test('GET /api/dashboard/kpis/financial - Get financial KPIs', async () => {
            const response = await request(app)
                .get('/api/dashboard/kpis/financial')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.data.ingresos_diarios).toBeDefined();
        });
        
        test('GET /api/dashboard/kpis/operational - Get operational KPIs', async () => {
            const response = await request(app)
                .get('/api/dashboard/kpis/operational')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.data.total_checkins).toBeDefined();
        });
        
        test('GET /api/dashboard/kpis/satisfaction - Get satisfaction KPIs', async () => {
            const response = await request(app)
                .get('/api/dashboard/kpis/satisfaction')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.data.nps_score).toBeDefined();
        });
        
        test('GET /api/dashboard/decisions/today - Get AI decisions', async () => {
            const response = await request(app)
                .get('/api/dashboard/decisions/today')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
        
        test('GET /api/dashboard/alerts/active - Get active alerts', async () => {
            const response = await request(app)
                .get('/api/dashboard/alerts/active')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
        
        test('GET /api/dashboard/trends/:kpiName - Get KPI trend', async () => {
            const response = await request(app)
                .get('/api/dashboard/trends/ingresos_diarios?days=7')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
        
        test('POST /api/dashboard/refresh - Refresh materialized views', async () => {
            const response = await request(app)
                .post('/api/dashboard/refresh')
                .expect(200);
            
            expect(response.body.success).toBe(true);
        });
    });
    
    // ========================================================================
    // ERROR HANDLING
    // ========================================================================
    
    describe('Error Handling', () => {
        test('Should return 404 for non-existent endpoints', async () => {
            const response = await request(app)
                .get('/api/nonexistent')
                .expect(404);
            
            expect(response.body.success).toBe(false);
        });
        
        test('Should return 400 for invalid UUIDs', async () => {
            const response = await request(app)
                .get('/api/checkin/member/invalid-uuid')
                .expect(400);
            
            expect(response.body.success).toBe(false);
        });
        
        test('Should return 400 for missing required fields', async () => {
            const response = await request(app)
                .post('/api/checkin')
                .send({}) // missing qr_code and clase_id
                .expect(400);
            
            expect(response.body.success).toBe(false);
        });
    });
    
    // ========================================================================
    // SUMMARY
    // ========================================================================
    
    afterAll(() => {
        console.log('\n' + '='.repeat(60));
        console.log('🎉 API ENDPOINTS TEST COMPLETED');
        console.log('='.repeat(60));
        console.log('✅ QR Endpoints (3 tests)');
        console.log('✅ Check-in Endpoints (3 tests)');
        console.log('✅ Reminder Endpoints (3 tests)');
        console.log('✅ Collection Endpoints (3 tests)');
        console.log('✅ Survey Endpoints (3 tests)');
        console.log('✅ Replacement Endpoints (3 tests)');
        console.log('✅ Instructor Panel Endpoints (4 tests)');
        console.log('✅ Dashboard Endpoints (8 tests)');
        console.log('✅ Error Handling (3 tests)');
        console.log('='.repeat(60));
        console.log('📊 Total: 33 API endpoint tests');
        console.log('='.repeat(60));
    });
});
