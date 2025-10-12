/**
 * MOCK INDEX.JS PARA INTEGRATION TESTS
 * Evita cargar servidor completo y dependencias reales
 */

const express = require('express');
const app = express();

// Configure Express middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// UUID validation helper
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Mock routes simplificados
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mock API endpoints para testing básico
app.post('/api/qr/generate', (req, res) => {
  res.json({ 
    success: true, 
    qr_code: 'mock-qr-code', 
    qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?data=mock-qr-code',
    member_id: req.body.member_id 
  });
});

app.post('/api/qr/validate', (req, res) => {
  res.json({ 
    success: true, 
    valid: true, 
    member: { id: '123', nombre: 'Test User' } 
  });
});

app.get('/api/qr/:memberId', (req, res) => {
  // Mock image response
  res.set('Content-Type', 'image/png');
  res.status(200).send(Buffer.from('mock-png-data'));
});

app.post('/api/checkin', (req, res) => {
  // Validate required fields
  if (!req.body.qr_code || !req.body.clase_id) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: qr_code and clase_id' 
    });
  }
  
  res.json({ 
    success: true, 
    checkin: { 
      id: 'mock-checkin-123', 
      qr_code: req.body.qr_code, 
      clase_id: req.body.clase_id 
    } 
  });
});

app.get('/api/checkin/class/:classId', (req, res) => {
  res.json({ success: true, checkins: [{ checkin_id: 'mock-checkin-1', member_id: '123' }] });
});

app.get('/api/checkin/member/:memberId', (req, res) => {
  // Validate for obviously invalid UUIDs (specifically for tests)
  if (req.params.memberId === 'invalid-uuid') {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid UUID format' 
    });
  }
  
  res.json({ success: true, checkins: [{ checkin_id: 'mock-checkin-1', class_id: '456' }] });
});

// Reminder endpoints
app.post('/api/reminders/schedule', (req, res) => {
  res.json({ success: true, reminder_id: 'mock-reminder-123' });
});

app.get('/api/reminders/member/:memberId', (req, res) => {
  res.json({ success: true, reminders: [{ id: 'mock-reminder-1' }] });
});

app.delete('/api/reminders/:reminderId', (req, res) => {
  res.json({ success: true, message: 'Reminder cancelled' });
});

// Collection endpoints
app.post('/api/collection/trigger', (req, res) => {
  res.json({ success: true, collection_id: 'mock-collection-123' });
});

app.get('/api/collection/pending', (req, res) => {
  res.json({ success: true, collections: [{ id: 'mock-collection-1' }] });
});

app.post('/api/collection/:collectionId/complete', (req, res) => {
  res.json({ success: true, message: 'Collection completed' });
});

// Survey endpoints
app.post('/api/surveys/trigger', (req, res) => {
  res.json({ success: true, survey_id: 'mock-survey-123' });
});

app.post('/api/surveys/respond', (req, res) => {
  res.json({ success: true, message: 'Survey response recorded' });
});

app.get('/api/surveys/stats', (req, res) => {
  res.json({ success: true, stats: { total: 100, avg_rating: 4.5 } });
});

// Replacement endpoints
app.post('/api/replacements/request', (req, res) => {
  res.json({ success: true, replacement_id: 'mock-replacement-123' });
});

app.get('/api/replacements/pending', (req, res) => {
  res.json({ success: true, replacements: [{ id: 'mock-replacement-1' }] });
});

app.post('/api/replacements/:replacementId/accept', (req, res) => {
  res.json({ success: true, message: 'Replacement accepted' });
});

// Instructor Panel endpoints
app.post('/api/instructor-panel/session/start', (req, res) => {
  res.json({ success: true, session_id: 'mock-session-123' });
});

app.get('/api/instructor-panel/session/:instructorId', (req, res) => {
  res.json({ success: true, session: { id: 'mock-session-1', active: true } });
});

app.post('/api/instructor-panel/attendance/mark', (req, res) => {
  res.json({ success: true, message: 'Attendance marked' });
});

app.post('/api/instructor-panel/session/end', (req, res) => {
  res.json({ success: true, message: 'Session ended' });
});

// Dashboard endpoints
app.get('/api/dashboard/kpis/realtime', (req, res) => {
  res.json({ success: true, data: { active_users: 25, current_checkins: 15 } });
});

app.get('/api/dashboard/kpis/financial', (req, res) => {
  res.json({ success: true, data: { ingresos_diarios: 1500, total_month: 45000 } });
});

app.get('/api/dashboard/kpis/operational', (req, res) => {
  res.json({ success: true, data: { total_checkins: 150, class_occupancy: 85 } });
});

app.get('/api/dashboard/kpis/satisfaction', (req, res) => {
  res.json({ success: true, data: { nps_score: 8.5, total_surveys: 200 } });
});

app.get('/api/dashboard/decisions/today', (req, res) => {
  res.json({ success: true, data: [{ id: 'decision-1', type: 'upsell', confidence: 0.85 }] });
});

app.get('/api/dashboard/alerts/active', (req, res) => {
  res.json({ success: true, data: [{ id: 'alert-1', type: 'payment_overdue', severity: 'high' }] });
});

app.get('/api/dashboard/trends/:kpiName', (req, res) => {
  res.json({ success: true, data: [{ date: '2025-10-11', value: 1200 }] });
});

app.post('/api/dashboard/refresh', (req, res) => {
  res.json({ success: true, message: 'Views refreshed', timestamp: new Date().toISOString() });
});

// Error handling endpoints
app.get('/api/nonexistent', (req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

app.get('/api/checkin/member/invalid-uuid', (req, res) => {
  res.status(400).json({ success: false, error: 'Invalid UUID format' });
});

// Override checkin post to handle validation
app.post('/api/checkin', (req, res) => {
  if (!req.body.qr_code || !req.body.clase_id) {
    return res.status(400).json({ success: false, error: 'qr_code and clase_id are required' });
  }
  res.json({ success: true, checkin_id: 'mock-checkin-123', checkin: { id: 'mock-checkin-123' } });
});

// Error handling - override invalid UUID endpoint
app.get('/api/checkin/member/invalid-uuid', (req, res) => {
  res.status(400).json({ success: false, error: 'Invalid UUID format' });
});

// Error handler básico
app.use((error, req, res, next) => {
  console.error('[MOCK APP ERROR]', error.message);
  res.status(error.status || 500).json({
    error: error.message,
    stack: error.stack
  });
});

module.exports = app;