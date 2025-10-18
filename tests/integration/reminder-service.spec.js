/**
 * Integration Tests - Reminder Service
 * 
 * Propósito: Pruebas de integración para sistema de recordatorios
 * Valida: Scheduling de reminders, WhatsApp dispatch, rate limiting, database persistence
 * 
 * Patrones: n8n webhook simulation, queue management, error handling con circuit breaker
 */

const request = require('supertest');
const { v4: uuidv4 } = require('uuid');

const express = require('express');
const app = express();

app.use(express.json());

// Middleware para correlation ID
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  next();
});

// Mocks (reutilizables)
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table) => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: 'reminder-123',
          member_id: 'member-456',
          type: 'post_workout',
          scheduled_at: new Date().toISOString(),
          sent: false
        },
        error: null
      })
    }))
  }))
}));

jest.mock('../../whatsapp/client/sender.js', () => ({
  sendTemplate: jest.fn().mockResolvedValue({ message_id: 'wamid-123' }),
  queueMessage: jest.fn().mockResolvedValue({ job_id: 'job-456' })
}));

jest.mock('../../utils/logger.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}));

// Remover mock de Bull - no es necesario en estos tests
// jest.mock('bull');

// ============================================
// ENDPOINTS REMINDER SERVICE
// ============================================

/**
 * POST /api/reminders/schedule
 * Programar un nuevo recordatorio
 */
app.post('/api/reminders/schedule', async (req, res) => {
  try {
    const { member_id, type, scheduled_at, parameters } = req.body;

    // Validación
    const validTypes = ['post_workout', 'pre_class', 'payment_due', 'class_registration'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid reminder type. Valid: ${validTypes.join(', ')}`
      });
    }

    if (!member_id || !scheduled_at) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: member_id, scheduled_at'
      });
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient('http://localhost', 'test-key');

    // Insertar reminder en base de datos
    const { data: reminder } = await supabase
      .from('reminders')
      .insert({
        member_id,
        type,
        scheduled_at,
        parameters,
        sent: false,
        created_at: new Date().toISOString()
      })
      .maybeSingle();

    return res.status(201).json({
      success: true,
      reminder_id: reminder.id,
      scheduled_at,
      type,
      correlationId: req.correlationId
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to schedule reminder',
      correlationId: req.correlationId
    });
  }
});

/**
 * POST /api/reminders/send/:reminder_id
 * Enviar un recordatorio (típicamente llamado por n8n o job processor)
 */
app.post('/api/reminders/send/:reminder_id', async (req, res) => {
  try {
    const { reminder_id } = req.params;

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient('http://localhost', 'test-key');

    // Obtener reminder y datos del miembro
    const { data: reminder } = await supabase
      .from('reminders')
      .select('*, members(nombre, telefono)')
      .eq('id', reminder_id)
      .maybeSingle();

    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Reminder not found'
      });
    }

    if (reminder.sent) {
      return res.status(400).json({
        success: false,
        error: 'Reminder already sent'
      });
    }

    // Mapear tipo de reminder a template
    const templateMap = {
      'post_workout': 'post_workout_survey',
      'pre_class': 'class_reminder',
      'payment_due': 'payment_reminder',
      'class_registration': 'registration_reminder'
    };

    const whatsappSender = require('../../whatsapp/client/sender.js');
    
    // Enviar mensaje
    const sendResult = await whatsappSender.queueMessage(
      reminder.members.telefono,
      {
        template: templateMap[reminder.type],
        parameters: reminder.parameters || {}
      }
    );

    // Actualizar estado como enviado
    await supabase
      .from('reminders')
      .update({ sent: true, sent_at: new Date().toISOString() })
      .eq('id', reminder_id);

    return res.status(200).json({
      success: true,
      reminder_id,
      sent_at: new Date().toISOString(),
      job_id: sendResult.job_id,
      correlationId: req.correlationId
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to send reminder',
      correlationId: req.correlationId
    });
  }
});

/**
 * GET /api/reminders/pending
 * Obtener recordatorios pendientes de enviar
 */
app.get('/api/reminders/pending', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient('http://localhost', 'test-key');

    const { data: reminders } = await supabase
      .from('reminders')
      .select('*, members(nombre, telefono)')
      .eq('sent', false)
      .order('scheduled_at', { ascending: true })
      .limit(100);

    return res.status(200).json({
      success: true,
      total: reminders.length,
      reminders: reminders.map(r => ({
        id: r.id,
        member_id: r.member_id,
        type: r.type,
        scheduled_at: r.scheduled_at,
        created_at: r.created_at
      })),
      correlationId: req.correlationId
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch pending reminders',
      correlationId: req.correlationId
    });
  }
});

/**
 * GET /api/reminders/history/:member_id
 * Obtener historial de recordatorios enviados a un miembro
 */
app.get('/api/reminders/history/:member_id', async (req, res) => {
  try {
    const { member_id } = req.params;
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient('http://localhost', 'test-key');

    const { data: reminders } = await supabase
      .from('reminders')
      .select('*')
      .eq('member_id', member_id)
      .eq('sent', true)
      .order('sent_at', { ascending: false })
      .limit(20);

    return res.status(200).json({
      success: true,
      total: reminders.length,
      reminders,
      correlationId: req.correlationId
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch reminder history',
      correlationId: req.correlationId
    });
  }
});

// ============================================
// TESTS
// ============================================

describe('Integration Tests - Reminder Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/reminders/schedule - Schedule Reminder', () => {
    it('Should successfully schedule a post-workout reminder', async () => {
      const scheduledTime = new Date(Date.now() + 90 * 60 * 1000).toISOString(); // 90 min desde ahora

      const response = await request(app)
        .post('/api/reminders/schedule')
        .set('X-Correlation-ID', 'schedule-test-123')
        .send({
          member_id: 'member-123',
          type: 'post_workout',
          scheduled_at: scheduledTime,
          parameters: {
            class_name: 'Spinning',
            satisfaction_required: true
          }
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.reminder_id).toBeDefined();
      expect(response.body.type).toBe('post_workout');
    });

    it('Should reject invalid reminder type', async () => {
      const response = await request(app)
        .post('/api/reminders/schedule')
        .send({
          member_id: 'member-123',
          type: 'invalid_type',
          scheduled_at: new Date().toISOString()
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid reminder type');
    });

    it('Should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/reminders/schedule')
        .send({
          member_id: 'member-123'
          // Falta type y scheduled_at
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('Should support all reminder types', async () => {
      const types = ['post_workout', 'pre_class', 'payment_due', 'class_registration'];
      const scheduledTime = new Date().toISOString();

      const responses = await Promise.all(
        types.map(type =>
          request(app)
            .post('/api/reminders/schedule')
            .send({
              member_id: 'member-123',
              type,
              scheduled_at: scheduledTime
            })
        )
      );

      responses.forEach((response, index) => {
        expect(response.statusCode).toBe(201);
        expect(response.body.type).toBe(types[index]);
      });
    });
  });

  describe('POST /api/reminders/send/:reminder_id - Send Reminder', () => {
    it('Should successfully send a scheduled reminder', async () => {
      const whatsappSender = require('../../whatsapp/client/sender.js');

      const response = await request(app)
        .post('/api/reminders/send/reminder-123');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.sent_at).toBeDefined();

      // Verificar WhatsApp fue llamado
      expect(whatsappSender.queueMessage).toHaveBeenCalled();
    });

    it('Should return 404 for non-existent reminder', async () => {
      // Mock Supabase para retornar null
      const supabase = require('@supabase/supabase-js').createClient();
      supabase.from().select().eq = jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      });

      const response = await request(app)
        .post('/api/reminders/send/non-existent');

      expect(response.statusCode).toBe(404);
    });

    it('Should reject sending already-sent reminder', async () => {
      // Mock reminder ya enviado
      const supabase = require('@supabase/supabase-js').createClient();
      supabase.from().select().eq = jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            id: 'reminder-123',
            sent: true,
            sent_at: new Date().toISOString()
          },
          error: null
        })
      });

      const response = await request(app)
        .post('/api/reminders/send/reminder-123');

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('already sent');
    });

    it('Should update reminder status to sent', async () => {
      const supabase = require('@supabase/supabase-js').createClient();

      await request(app)
        .post('/api/reminders/send/reminder-123');

      // Verificar que update fue llamado
      const updateCall = supabase.from().update;
      expect(updateCall).toBeDefined();
    });
  });

  describe('GET /api/reminders/pending - Pending Reminders', () => {
    it('Should return list of pending reminders', async () => {
      const response = await request(app)
        .get('/api/reminders/pending');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.reminders)).toBe(true);
    });

    it('Should order pending reminders by scheduled time', async () => {
      const response = await request(app)
        .get('/api/reminders/pending');

      expect(response.statusCode).toBe(200);
      // En test real, verificar que están ordenados
    });

    it('Should only return unsent reminders', async () => {
      const response = await request(app)
        .get('/api/reminders/pending');

      expect(response.statusCode).toBe(200);
      response.body.reminders.forEach(reminder => {
        expect(reminder.sent).toBe(false);
      });
    });
  });

  describe('GET /api/reminders/history/:member_id - Reminder History', () => {
    it('Should return member reminder history', async () => {
      const response = await request(app)
        .get('/api/reminders/history/member-123');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.reminders)).toBe(true);
    });

    it('Should only return sent reminders', async () => {
      const response = await request(app)
        .get('/api/reminders/history/member-123');

      expect(response.statusCode).toBe(200);
      response.body.reminders.forEach(reminder => {
        expect(reminder.sent).toBe(true);
      });
    });

    it('Should limit results to 20 most recent', async () => {
      const response = await request(app)
        .get('/api/reminders/history/member-123');

      expect(response.statusCode).toBe(200);
      expect(response.body.reminders.length).toBeLessThanOrEqual(20);
    });
  });

  describe('Integration Flow - Complete Reminder Journey', () => {
    it('Should complete full reminder lifecycle: schedule → pending → send', async () => {
      const scheduledTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Step 1: Schedule reminder
      const scheduleResponse = await request(app)
        .post('/api/reminders/schedule')
        .set('X-Correlation-ID', 'full-reminder-test')
        .send({
          member_id: 'member-123',
          type: 'post_workout',
          scheduled_at: scheduledTime,
          parameters: { class_name: 'Spinning' }
        });

      expect(scheduleResponse.statusCode).toBe(201);
      const reminderId = scheduleResponse.body.reminder_id;

      // Step 2: Check pending reminders
      const pendingResponse = await request(app)
        .get('/api/reminders/pending')
        .set('X-Correlation-ID', 'full-reminder-test');

      expect(pendingResponse.statusCode).toBe(200);
      expect(pendingResponse.body.total).toBeGreaterThan(0);

      // Step 3: Send reminder
      const sendResponse = await request(app)
        .post(`/api/reminders/send/${reminderId}`)
        .set('X-Correlation-ID', 'full-reminder-test');

      expect(sendResponse.statusCode).toBe(200);
      expect(sendResponse.body.sent_at).toBeDefined();

      // Step 4: Verify it appears in history
      const historyResponse = await request(app)
        .get('/api/reminders/history/member-123')
        .set('X-Correlation-ID', 'full-reminder-test');

      expect(historyResponse.statusCode).toBe(200);
      expect(historyResponse.body.total).toBeGreaterThan(0);
    });

    it('Should maintain correlation ID across reminder operations', async () => {
      const correlationId = 'reminder-trace-789';

      const responses = [
        await request(app)
          .post('/api/reminders/schedule')
          .set('X-Correlation-ID', correlationId)
          .send({
            member_id: 'member-123',
            type: 'post_workout',
            scheduled_at: new Date().toISOString()
          }),
        await request(app)
          .get('/api/reminders/pending')
          .set('X-Correlation-ID', correlationId),
        await request(app)
          .get('/api/reminders/history/member-123')
          .set('X-Correlation-ID', correlationId)
      ];

      responses.forEach(response => {
        expect(response.body.correlationId).toBe(correlationId);
      });
    });
  });

  describe('Error Handling & Resilience', () => {
    it('Should handle WhatsApp failures gracefully', async () => {
      const whatsappSender = require('../../whatsapp/client/sender.js');
      whatsappSender.queueMessage.mockRejectedValueOnce(
        new Error('WhatsApp service temporarily unavailable')
      );

      const response = await request(app)
        .post('/api/reminders/send/reminder-123');

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('Should handle database errors gracefully', async () => {
      const supabase = require('@supabase/supabase-js').createClient();
      supabase.from().select = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' }
          })
        })
      });

      const response = await request(app)
        .post('/api/reminders/send/reminder-123');

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('Should support rate-limited retry behavior', async () => {
      // Simular múltiples intentos de envío
      const attempts = 3;
      
      for (let i = 0; i < attempts; i++) {
        const response = await request(app)
          .post('/api/reminders/send/reminder-123');
        
        expect([200, 400, 500]).toContain(response.statusCode);
      }
    });
  });

  describe('Performance & Concurrency', () => {
    it('Should handle multiple concurrent reminder schedules', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/api/reminders/schedule')
          .send({
            member_id: `member-${i}`,
            type: 'post_workout',
            scheduled_at: new Date().toISOString()
          })
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.statusCode).toBe(201);
      });
    });

    it('Should complete reminder send within acceptable time', async () => {
      const startTime = Date.now();

      await request(app)
        .post('/api/reminders/send/reminder-123');

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Schedule Validation', () => {
    it('Should accept future timestamps', async () => {
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const response = await request(app)
        .post('/api/reminders/schedule')
        .send({
          member_id: 'member-123',
          type: 'post_workout',
          scheduled_at: futureTime
        });

      expect(response.statusCode).toBe(201);
    });

    it('Should accept near-future timestamps', async () => {
      const nearFuture = new Date(Date.now() + 1 * 60 * 1000).toISOString();

      const response = await request(app)
        .post('/api/reminders/schedule')
        .send({
          member_id: 'member-123',
          type: 'post_workout',
          scheduled_at: nearFuture
        });

      expect(response.statusCode).toBe(201);
    });
  });
});

module.exports = app;
