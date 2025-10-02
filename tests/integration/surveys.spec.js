/**
 * PROMPT 8: Integration Tests - Post-Class Survey System
 * Tests para encuestas, sentiment analysis, NPS, y procesamiento de respuestas
 */

const request = require('supertest');
const app = require('../../index');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

describe('Survey System Integration Tests', () => {
  let testMemberId;
  let testCheckinId;
  let testInstructorId;
  let testClassId;
  let testSurveyId;

  // Setup: Crear datos de prueba
  beforeAll(async () => {
    // Crear instructor de prueba
    const { data: instructor } = await supabase
      .from('instructors')
      .insert({
        nombre: 'Test Instructor',
        telefono: '+5491144556677'
      })
      .select()
      .single();
    testInstructorId = instructor.id;

    // Crear clase de prueba
    const { data: clase } = await supabase
      .from('classes')
      .insert({
        nombre: 'Spinning Test',
        instructor_id: testInstructorId,
        capacidad_maxima: 20
      })
      .select()
      .single();
    testClassId = clase.id;

    // Crear miembro de prueba
    const { data: member } = await supabase
      .from('members')
      .insert({
        nombre: 'Test Member',
        telefono: '+5491155443322',
        whatsapp_opted_in: true,
        estado_pago: 'al_dia',
        deuda_actual: 0
      })
      .select()
      .single();
    testMemberId = member.id;

    // Crear checkin de prueba
    const { data: checkin } = await supabase
      .from('checkins')
      .insert({
        member_id: testMemberId,
        clase_id: testClassId,
        estado: 'completado'
      })
      .select()
      .single();
    testCheckinId = checkin.id;
  });

  // Cleanup: Eliminar datos de prueba
  afterAll(async () => {
    // Orden: surveys → checkins → members → classes → instructors
    if (testSurveyId) {
      await supabase.from('surveys').delete().eq('id', testSurveyId);
    }
    if (testCheckinId) {
      await supabase.from('checkins').delete().eq('id', testCheckinId);
    }
    if (testMemberId) {
      await supabase.from('members').delete().eq('id', testMemberId);
    }
    if (testClassId) {
      await supabase.from('classes').delete().eq('id', testClassId);
    }
    if (testInstructorId) {
      await supabase.from('instructors').delete().eq('id', testInstructorId);
    }
  });

  describe('POST /api/surveys/schedule', () => {
    it('should schedule a post-class survey', async () => {
      const response = await request(app)
        .post('/api/surveys/schedule')
        .send({
          checkin_id: testCheckinId
        })
        .expect(200);

      expect(response.body).toHaveProperty('survey_id');
      expect(response.body).toHaveProperty('scheduled_for');
      expect(response.body.message).toContain('scheduled');

      testSurveyId = response.body.survey_id;
    });

    it('should reject scheduling for non-existent checkin', async () => {
      const response = await request(app)
        .post('/api/surveys/schedule')
        .send({
          checkin_id: '00000000-0000-0000-0000-000000000000'
        })
        .expect(404);

      expect(response.body.error).toContain('Check-in not found');
    });

    it('should prevent duplicate survey scheduling', async () => {
      const response = await request(app)
        .post('/api/surveys/schedule')
        .send({
          checkin_id: testCheckinId
        })
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/surveys/response', () => {
    it('should accept valid rating (5 stars)', async () => {
      // Crear nueva encuesta para este test
      const { data: survey } = await supabase
        .from('surveys')
        .insert({
          checkin_id: testCheckinId,
          member_id: testMemberId,
          instructor_id: testInstructorId,
          clase_id: testClassId
        })
        .select()
        .single();

      const response = await request(app)
        .post('/api/surveys/response')
        .send({
          survey_id: survey.id,
          rating: 5
        })
        .expect(200);

      expect(response.body.message).toContain('submitted');
      expect(response.body.nps_category).toBe('promoter');

      // Cleanup
      await supabase.from('surveys').delete().eq('id', survey.id);
    });

    it('should accept rating with comment', async () => {
      const { data: survey } = await supabase
        .from('surveys')
        .insert({
          checkin_id: testCheckinId,
          member_id: testMemberId,
          instructor_id: testInstructorId,
          clase_id: testClassId
        })
        .select()
        .single();

      const response = await request(app)
        .post('/api/surveys/response')
        .send({
          survey_id: survey.id,
          rating: 4,
          comment: 'Excelente clase, solo mejoraría el aire acondicionado'
        })
        .expect(200);

      expect(response.body.sentiment).toBeDefined();
      expect(['positive', 'neutral', 'negative']).toContain(response.body.sentiment);

      // Cleanup
      await supabase.from('surveys').delete().eq('id', survey.id);
    });

    it('should trigger low-rating followup for ratings ≤ 2', async () => {
      const { data: survey } = await supabase
        .from('surveys')
        .insert({
          checkin_id: testCheckinId,
          member_id: testMemberId,
          instructor_id: testInstructorId,
          clase_id: testClassId
        })
        .select()
        .single();

      const response = await request(app)
        .post('/api/surveys/response')
        .send({
          survey_id: survey.id,
          rating: 2
        })
        .expect(200);

      expect(response.body.nps_category).toBe('detractor');
      expect(response.body.followup_scheduled).toBe(true);

      // Cleanup
      await supabase.from('surveys').delete().eq('id', survey.id);
    });

    it('should reject invalid ratings (out of range)', async () => {
      const response = await request(app)
        .post('/api/surveys/response')
        .send({
          survey_id: testSurveyId,
          rating: 6
        })
        .expect(400);

      expect(response.body.error).toContain('between 1 and 5');
    });

    it('should prevent duplicate responses', async () => {
      // Primero enviar rating
      await request(app)
        .post('/api/surveys/response')
        .send({
          survey_id: testSurveyId,
          rating: 4
        })
        .expect(200);

      // Intentar enviar de nuevo
      const response = await request(app)
        .post('/api/surveys/response')
        .send({
          survey_id: testSurveyId,
          rating: 5
        })
        .expect(409);

      expect(response.body.error).toContain('already responded');
    });
  });

  describe('GET /api/surveys/instructor/:id/nps', () => {
    beforeAll(async () => {
      // Crear 10 encuestas para el instructor de prueba
      const surveys = [
        { rating: 5, comment: 'Excelente' }, // Promoter
        { rating: 5, comment: 'Increíble' }, // Promoter
        { rating: 4, comment: 'Muy bueno' }, // Promoter
        { rating: 4, comment: 'Me gustó' }, // Promoter
        { rating: 3, comment: 'Normal' }, // Passive
        { rating: 3, comment: 'Ok' }, // Passive
        { rating: 2, comment: 'Regular' }, // Detractor
        { rating: 2, comment: 'No me gustó' }, // Detractor
        { rating: 1, comment: 'Terrible' }, // Detractor
        { rating: 1, comment: 'Muy malo' } // Detractor
      ];

      for (const survey of surveys) {
        const { data: checkin } = await supabase
          .from('checkins')
          .insert({
            member_id: testMemberId,
            clase_id: testClassId,
            estado: 'completado'
          })
          .select()
          .single();

        await supabase.from('surveys').insert({
          checkin_id: checkin.id,
          member_id: testMemberId,
          instructor_id: testInstructorId,
          clase_id: testClassId,
          rating: survey.rating,
          comment: survey.comment,
          sentiment: survey.rating >= 4 ? 'positive' : survey.rating === 3 ? 'neutral' : 'negative'
        });
      }
    });

    it('should calculate NPS correctly', async () => {
      const response = await request(app)
        .get(`/api/surveys/instructor/${testInstructorId}/nps`)
        .expect(200);

      expect(response.body).toHaveProperty('nps');
      expect(response.body).toHaveProperty('promoters');
      expect(response.body).toHaveProperty('passives');
      expect(response.body).toHaveProperty('detractors');

      // 4 promoters, 2 passives, 4 detractors = (40% - 40%) = 0
      expect(response.body.nps).toBe(0);
      expect(response.body.promoters).toBe(4);
      expect(response.body.passives).toBe(2);
      expect(response.body.detractors).toBe(4);
    });

    it('should filter NPS by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .get(`/api/surveys/instructor/${testInstructorId}/nps`)
        .query({
          start_date: yesterday.toISOString().split('T')[0],
          end_date: tomorrow.toISOString().split('T')[0]
        })
        .expect(200);

      expect(response.body.total_responses).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent instructor', async () => {
      const response = await request(app)
        .get('/api/surveys/instructor/00000000-0000-0000-0000-000000000000/nps')
        .expect(404);

      expect(response.body.error).toContain('No NPS data found');
    });
  });

  describe('GET /api/surveys/instructor/:id/trend', () => {
    it('should return 7-day NPS trend', async () => {
      const response = await request(app)
        .get(`/api/surveys/instructor/${testInstructorId}/trend`)
        .query({ days: 7 })
        .expect(200);

      expect(response.body).toHaveProperty('trend');
      expect(Array.isArray(response.body.trend)).toBe(true);
      expect(response.body.trend.length).toBeLessThanOrEqual(7);

      // Cada punto debe tener fecha y NPS
      response.body.trend.forEach(point => {
        expect(point).toHaveProperty('date');
        expect(point).toHaveProperty('nps');
      });
    });

    it('should support custom time ranges', async () => {
      const response = await request(app)
        .get(`/api/surveys/instructor/${testInstructorId}/trend`)
        .query({ days: 30 })
        .expect(200);

      expect(response.body.trend.length).toBeLessThanOrEqual(30);
    });
  });

  describe('GET /api/surveys/actionable', () => {
    it('should return low-rated surveys without actions', async () => {
      const response = await request(app)
        .get('/api/surveys/actionable')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Verificar estructura de cada survey
      response.body.forEach(survey => {
        expect(survey).toHaveProperty('id');
        expect(survey).toHaveProperty('rating');
        expect(survey.rating).toBeLessThanOrEqual(2);
        expect(survey).toHaveProperty('comment');
        expect(survey).toHaveProperty('sentiment');
        expect(survey.action_taken).toBe(false);
      });
    });

    it('should filter by instructor', async () => {
      const response = await request(app)
        .get('/api/surveys/actionable')
        .query({ instructor_id: testInstructorId })
        .expect(200);

      // Todas las encuestas deben ser del instructor especificado
      response.body.forEach(survey => {
        expect(survey.instructor_id).toBe(testInstructorId);
      });
    });
  });

  describe('POST /api/surveys/:id/action-taken', () => {
    let actionableSurveyId;

    beforeAll(async () => {
      // Crear encuesta con rating bajo
      const { data: checkin } = await supabase
        .from('checkins')
        .insert({
          member_id: testMemberId,
          clase_id: testClassId,
          estado: 'completado'
        })
        .select()
        .single();

      const { data: survey } = await supabase
        .from('surveys')
        .insert({
          checkin_id: checkin.id,
          member_id: testMemberId,
          instructor_id: testInstructorId,
          clase_id: testClassId,
          rating: 1,
          comment: 'Clase muy mala',
          sentiment: 'negative'
        })
        .select()
        .single();

      actionableSurveyId = survey.id;
    });

    it('should mark survey as action taken', async () => {
      const response = await request(app)
        .post(`/api/surveys/${actionableSurveyId}/action-taken`)
        .send({
          notes: 'Contactado personalmente, ofrecido clase gratis'
        })
        .expect(200);

      expect(response.body.message).toContain('marked as action taken');

      // Verificar en DB
      const { data: survey } = await supabase
        .from('surveys')
        .select('action_taken, action_notes')
        .eq('id', actionableSurveyId)
        .single();

      expect(survey.action_taken).toBe(true);
      expect(survey.action_notes).toContain('Contactado');
    });

    it('should reject missing notes', async () => {
      const response = await request(app)
        .post(`/api/surveys/${actionableSurveyId}/action-taken`)
        .send({})
        .expect(400);

      expect(response.body.error).toContain('notes are required');
    });
  });

  describe('POST /api/surveys/analyze-sentiment', () => {
    it('should analyze positive sentiment', async () => {
      const response = await request(app)
        .post('/api/surveys/analyze-sentiment')
        .send({
          comment: 'Excelente clase, el instructor fue muy motivador y la música increíble'
        })
        .expect(200);

      expect(response.body).toHaveProperty('sentiment');
      expect(response.body.sentiment).toBe('positive');
      expect(response.body).toHaveProperty('confidence');
    });

    it('should analyze negative sentiment', async () => {
      const response = await request(app)
        .post('/api/surveys/analyze-sentiment')
        .send({
          comment: 'Terrible clase, música horrible y el instructor gritaba mucho'
        })
        .expect(200);

      expect(response.body.sentiment).toBe('negative');
    });

    it('should analyze neutral sentiment', async () => {
      const response = await request(app)
        .post('/api/surveys/analyze-sentiment')
        .send({
          comment: 'La clase estuvo normal, nada especial'
        })
        .expect(200);

      expect(response.body.sentiment).toBe('neutral');
    });

    it('should reject empty comments', async () => {
      const response = await request(app)
        .post('/api/surveys/analyze-sentiment')
        .send({
          comment: ''
        })
        .expect(400);

      expect(response.body.error).toContain('Comment is required');
    });
  });
});
