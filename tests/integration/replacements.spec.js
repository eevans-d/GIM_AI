/**
 * PROMPT 9: Integration Tests - Instructor Replacement System
 * Tests para ausencias, matching de candidatos, ofertas y notificaciones
 */

const request = require('supertest');
const app = require('../../index');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

describe('Replacement System Integration Tests', () => {
  let testInstructor1Id;
  let testInstructor2Id;
  let testInstructor3Id;
  let testClassId;
  let testMemberId;
  let testReplacementId;
  let testOfferId;

  // Setup: Crear datos de prueba
  beforeAll(async () => {
    // Crear 3 instructores de prueba
    const { data: instructor1 } = await supabase
      .from('instructors')
      .insert({
        nombre: 'Carlos Original',
        telefono: '+5491144556677',
        especialidades: ['spinning', 'funcional'],
        activo: true
      })
      .select()
      .single();
    testInstructor1Id = instructor1.id;

    const { data: instructor2 } = await supabase
      .from('instructors')
      .insert({
        nombre: 'María Reemplazo',
        telefono: '+5491155667788',
        especialidades: ['spinning', 'yoga'],
        activo: true
      })
      .select()
      .single();
    testInstructor2Id = instructor2.id;

    const { data: instructor3 } = await supabase
      .from('instructors')
      .insert({
        nombre: 'Juan Backup',
        telefono: '+5491166778899',
        especialidades: ['funcional', 'pilates'],
        activo: true
      })
      .select()
      .single();
    testInstructor3Id = instructor3.id;

    // Crear disponibilidad para instructores 2 y 3
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayOfWeek = tomorrow.getDay();

    await supabase.from('instructor_availability').insert([
      {
        instructor_id: testInstructor2Id,
        day_of_week: dayOfWeek,
        start_time: '17:00',
        end_time: '20:00',
        availability_type: 'available',
        can_teach_classes: ['spinning', 'yoga'],
        prefers_replacements: true,
        min_notice_hours: 2
      },
      {
        instructor_id: testInstructor3Id,
        day_of_week: dayOfWeek,
        start_time: '17:00',
        end_time: '20:00',
        availability_type: 'available',
        can_teach_classes: ['funcional'],
        prefers_replacements: true,
        min_notice_hours: 4
      }
    ]);

    // Crear clase de prueba para mañana
    const { data: clase } = await supabase
      .from('classes')
      .insert({
        nombre: 'Spinning Avanzado',
        instructor_id: testInstructor1Id,
        fecha: tomorrow.toISOString().split('T')[0],
        hora: '18:00',
        capacidad_maxima: 20,
        tipo_clase_id: null // Asumiendo tipo existe
      })
      .select()
      .single();
    testClassId = clase.id;

    // Crear miembro para reservas
    const { data: member } = await supabase
      .from('members')
      .insert({
        nombre: 'Test Member',
        telefono: '+5491177889900',
        whatsapp_opted_in: true,
        estado_pago: 'al_dia'
      })
      .select()
      .single();
    testMemberId = member.id;

    // Crear reserva
    await supabase.from('reservas').insert({
      member_id: testMemberId,
      clase_id: testClassId,
      fecha_reserva: tomorrow.toISOString().split('T')[0],
      estado: 'confirmada'
    });
  });

  // Cleanup
  afterAll(async () => {
    // Orden: offers → replacements → reservas → classes → availability → instructors → members
    if (testOfferId) {
      await supabase.from('replacement_offers').delete().eq('id', testOfferId);
    }
    if (testReplacementId) {
      await supabase.from('replacements').delete().eq('id', testReplacementId);
    }
    await supabase.from('reservas').delete().eq('clase_id', testClassId);
    if (testClassId) {
      await supabase.from('classes').delete().eq('id', testClassId);
    }
    await supabase.from('instructor_availability').delete().in('instructor_id', [
      testInstructor2Id,
      testInstructor3Id
    ]);
    if (testInstructor1Id) {
      await supabase.from('instructors').delete().eq('id', testInstructor1Id);
    }
    if (testInstructor2Id) {
      await supabase.from('instructors').delete().eq('id', testInstructor2Id);
    }
    if (testInstructor3Id) {
      await supabase.from('instructors').delete().eq('id', testInstructor3Id);
    }
    if (testMemberId) {
      await supabase.from('members').delete().eq('id', testMemberId);
    }
  });

  describe('POST /api/replacements/absence', () => {
    it('should report absence with natural language parsing', async () => {
      const response = await request(app)
        .post('/api/replacements/absence')
        .send({
          instructor_id: testInstructor1Id,
          message: 'No puedo dar mi clase de mañana a las 18:00',
          reason: 'personal'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('replacement_id');
      expect(response.body.data).toHaveProperty('bonus_amount');
      expect(response.body.data.bonus_tier).toBeDefined();

      testReplacementId = response.body.data.replacement_id;
    });

    it('should reject absence without valid date/time', async () => {
      const response = await request(app)
        .post('/api/replacements/absence')
        .send({
          instructor_id: testInstructor1Id,
          message: 'No puedo dar clase', // Sin fecha/hora
          reason: 'illness'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('fecha/hora');
    });

    it('should reject absence without class scheduled', async () => {
      const response = await request(app)
        .post('/api/replacements/absence')
        .send({
          instructor_id: testInstructor1Id,
          message: 'No puedo dar clase el 25/12 a las 10:00', // Fecha sin clase
          reason: 'vacation'
        })
        .expect(400);

      expect(response.body.error).toContain('No se encontró clase');
    });
  });

  describe('GET /api/replacements/:id', () => {
    it('should retrieve replacement details', async () => {
      const response = await request(app)
        .get(`/api/replacements/${testReplacementId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testReplacementId);
      expect(response.body.data).toHaveProperty('classes');
      expect(response.body.data).toHaveProperty('original_instructor');
      expect(response.body.data).toHaveProperty('offers');
      expect(response.body.data.status).toBeDefined();
    });

    it('should return 404 for non-existent replacement', async () => {
      const response = await request(app)
        .get('/api/replacements/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/replacements/:id/find-candidates', () => {
    it('should find and rank replacement candidates', async () => {
      const response = await request(app)
        .post(`/api/replacements/${testReplacementId}/find-candidates`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.candidates_found).toBeGreaterThan(0);
      expect(response.body.data.first_offer_sent_to).toBeDefined();
      expect(response.body.data.priority_score).toBeGreaterThan(0);

      // Verificar que se creó una oferta
      const { data: offers } = await supabase
        .from('replacement_offers')
        .select('*')
        .eq('replacement_id', testReplacementId);

      expect(offers.length).toBeGreaterThan(0);
      testOfferId = offers[0].id;
    });
  });

  describe('GET /api/replacements/offers/pending', () => {
    it('should list pending offers for instructor', async () => {
      const response = await request(app)
        .get('/api/replacements/offers/pending')
        .query({ instructor_id: testInstructor2Id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verificar estructura de las ofertas
      if (response.body.count > 0) {
        const offer = response.body.data[0];
        expect(offer).toHaveProperty('id');
        expect(offer).toHaveProperty('expires_at');
        expect(offer).toHaveProperty('replacements');
        expect(offer.replacements).toHaveProperty('bonus_amount');
      }
    });

    it('should reject without instructor_id parameter', async () => {
      const response = await request(app)
        .get('/api/replacements/offers/pending')
        .expect(400);

      expect(response.body.error).toContain('instructor_id');
    });
  });

  describe('POST /api/replacements/offers/:offerId/respond', () => {
    it('should accept replacement offer', async () => {
      const response = await request(app)
        .post(`/api/replacements/offers/${testOfferId}/respond`)
        .send({
          accepted: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('accepted');
      expect(response.body.data.replacement_id).toBe(testReplacementId);
      expect(response.body.data.bonus_amount).toBeDefined();

      // Verificar que el reemplazo se actualizó
      const { data: replacement } = await supabase
        .from('replacements')
        .select('status, replacement_instructor_id, time_to_fill_minutes')
        .eq('id', testReplacementId)
        .single();

      expect(replacement.status).toBe('accepted');
      expect(replacement.replacement_instructor_id).toBe(testInstructor2Id);
      expect(replacement.time_to_fill_minutes).toBeGreaterThan(0);

      // Verificar que la clase se actualizó
      const { data: clase } = await supabase
        .from('classes')
        .select('instructor_id')
        .eq('id', testClassId)
        .single();

      expect(clase.instructor_id).toBe(testInstructor2Id);
    });

    it('should decline replacement offer and contact next candidate', async () => {
      // Crear nueva ausencia para probar rechazo
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);

      const { data: newClass } = await supabase
        .from('classes')
        .insert({
          nombre: 'Funcional Test',
          instructor_id: testInstructor1Id,
          fecha: tomorrow.toISOString().split('T')[0],
          hora: '19:00',
          capacidad_maxima: 15
        })
        .select()
        .single();

      const { data: newReplacement } = await supabase
        .from('replacements')
        .insert({
          class_id: newClass.id,
          scheduled_date: tomorrow.toISOString().split('T')[0],
          scheduled_time: '19:00',
          class_type: 'funcional',
          original_instructor_id: testInstructor1Id,
          absence_reason: 'illness'
        })
        .select()
        .single();

      // Crear oferta directamente
      const { data: newOffer } = await supabase
        .from('replacement_offers')
        .insert({
          replacement_id: newReplacement.id,
          instructor_id: testInstructor2Id,
          priority_score: 85,
          offer_sequence: 1,
          expires_at: new Date(Date.now() + 3600000).toISOString()
        })
        .select()
        .single();

      // Actualizar replacement con candidatos
      await supabase
        .from('replacements')
        .update({
          status: 'offered',
          candidate_ids: [testInstructor2Id, testInstructor3Id],
          candidates_contacted: 1
        })
        .eq('id', newReplacement.id);

      // Rechazar oferta
      const response = await request(app)
        .post(`/api/replacements/offers/${newOffer.id}/respond`)
        .send({
          accepted: false,
          decline_reason: 'schedule_conflict'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.declined).toBe(true);
      expect(response.body.data.next_candidate_contacted).toBe(true);

      // Verificar que se contactó al siguiente candidato
      const { data: replacement } = await supabase
        .from('replacements')
        .select('candidates_contacted')
        .eq('id', newReplacement.id)
        .single();

      expect(replacement.candidates_contacted).toBe(2);

      // Cleanup
      await supabase.from('replacement_offers').delete().eq('replacement_id', newReplacement.id);
      await supabase.from('replacements').delete().eq('id', newReplacement.id);
      await supabase.from('classes').delete().eq('id', newClass.id);
    });

    it('should reject expired offers', async () => {
      // Crear oferta expirada
      const { data: expiredOffer } = await supabase
        .from('replacement_offers')
        .insert({
          replacement_id: testReplacementId,
          instructor_id: testInstructor3Id,
          priority_score: 70,
          offer_sequence: 2,
          expires_at: new Date(Date.now() - 3600000).toISOString() // Expirada hace 1h
        })
        .select()
        .single();

      const response = await request(app)
        .post(`/api/replacements/offers/${expiredOffer.id}/respond`)
        .send({
          accepted: true
        })
        .expect(400);

      expect(response.body.error).toContain('expired');

      // Cleanup
      await supabase.from('replacement_offers').delete().eq('id', expiredOffer.id);
    });
  });

  describe('GET /api/replacements/active', () => {
    it('should list all active replacements', async () => {
      const response = await request(app)
        .get('/api/replacements/active')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThanOrEqual(0);

      // Verificar estructura
      if (response.body.count > 0) {
        const replacement = response.body.data[0];
        expect(replacement).toHaveProperty('id');
        expect(replacement).toHaveProperty('scheduled_date');
        expect(replacement).toHaveProperty('class_type');
        expect(replacement).toHaveProperty('bonus_amount');
        expect(replacement).toHaveProperty('status');
      }
    });
  });

  describe('GET /api/replacements/instructor/:id/stats', () => {
    it('should retrieve instructor replacement statistics', async () => {
      const response = await request(app)
        .get(`/api/replacements/instructor/${testInstructor2Id}/stats`)
        .query({ days: 90 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total_replacements');
      expect(response.body.data).toHaveProperty('accepted_offers');
      expect(response.body.data).toHaveProperty('declined_offers');
      expect(response.body.data).toHaveProperty('acceptance_rate');
      expect(response.body.data).toHaveProperty('total_bonus_earned');
      expect(response.body.data).toHaveProperty('avg_response_time_minutes');
    });
  });

  describe('POST /api/replacements/availability', () => {
    it('should set instructor availability for replacements', async () => {
      const response = await request(app)
        .post('/api/replacements/availability')
        .send({
          instructor_id: testInstructor1Id,
          day_of_week: 1, // Lunes
          start_time: '09:00',
          end_time: '12:00',
          can_teach_classes: ['spinning', 'funcional', 'yoga'],
          prefers_replacements: true,
          min_notice_hours: 3
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.can_teach_classes).toContain('spinning');

      // Cleanup
      await supabase
        .from('instructor_availability')
        .delete()
        .eq('id', response.body.data.id);
    });

    it('should reject without required fields', async () => {
      const response = await request(app)
        .post('/api/replacements/availability')
        .send({
          instructor_id: testInstructor1Id
          // Faltan day_of_week, start_time, end_time
        })
        .expect(400);

      expect(response.body.error).toContain('required');
    });
  });

  describe('GET /api/replacements/instructor/:id/availability', () => {
    it('should retrieve instructor availability', async () => {
      const response = await request(app)
        .get(`/api/replacements/instructor/${testInstructor2Id}/availability`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);

      const availability = response.body.data[0];
      expect(availability).toHaveProperty('day_of_week');
      expect(availability).toHaveProperty('start_time');
      expect(availability).toHaveProperty('end_time');
      expect(availability).toHaveProperty('can_teach_classes');
    });
  });

  describe('PUT /api/replacements/:id/cancel', () => {
    it('should cancel replacement and restore original instructor', async () => {
      // Crear nueva clase y reemplazo para probar cancelación
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 3);

      const { data: cancelClass } = await supabase
        .from('classes')
        .insert({
          nombre: 'Clase Cancelable',
          instructor_id: testInstructor2Id, // Ya reemplazada
          fecha: tomorrow.toISOString().split('T')[0],
          hora: '10:00',
          capacidad_maxima: 10
        })
        .select()
        .single();

      const { data: cancelReplacement } = await supabase
        .from('replacements')
        .insert({
          class_id: cancelClass.id,
          scheduled_date: tomorrow.toISOString().split('T')[0],
          scheduled_time: '10:00',
          class_type: 'spinning',
          original_instructor_id: testInstructor1Id,
          replacement_instructor_id: testInstructor2Id,
          status: 'accepted'
        })
        .select()
        .single();

      // Cancelar reemplazo
      const response = await request(app)
        .put(`/api/replacements/${cancelReplacement.id}/cancel`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('original instructor resumed');

      // Verificar que se restauró el instructor original
      const { data: restoredClass } = await supabase
        .from('classes')
        .select('instructor_id')
        .eq('id', cancelClass.id)
        .single();

      expect(restoredClass.instructor_id).toBe(testInstructor1Id);

      // Verificar estado del reemplazo
      const { data: cancelledReplacement } = await supabase
        .from('replacements')
        .select('status')
        .eq('id', cancelReplacement.id)
        .single();

      expect(cancelledReplacement.status).toBe('original_resumed');

      // Cleanup
      await supabase.from('replacements').delete().eq('id', cancelReplacement.id);
      await supabase.from('classes').delete().eq('id', cancelClass.id);
    });
  });

  describe('GET /api/replacements/metrics', () => {
    it('should retrieve replacement system metrics', async () => {
      const response = await request(app)
        .get('/api/replacements/metrics')
        .query({ months: 6 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verificar estructura si hay datos
      if (response.body.data.length > 0) {
        const metric = response.body.data[0];
        expect(metric).toHaveProperty('month');
        expect(metric).toHaveProperty('total_replacements');
        expect(metric).toHaveProperty('successful_replacements');
        expect(metric).toHaveProperty('avg_time_to_fill_minutes');
        expect(metric).toHaveProperty('total_bonus_paid');
      }
    });
  });
});
