# 📚 API Documentation - Complete Reference

**Generated**: 2025-10-20T07:16:52.441Z  
**Total Endpoints**: 134  
**Status**: Auto-generated from code

---

## 📋 Table of Contents

- [ai](#ai-js)
- [auth](#auth-js)
- [checkin](#checkin-js)
- [collection](#collection-js)
- [dashboard](#dashboard-js)
- [instructor-panel](#instructor-panel-js)
- [nutrition](#nutrition-js)
- [public › v1 › auth](#public-v1-auth-js)
- [public › v1 › webhooks](#public-v1-webhooks-js)
- [qr](#qr-js)
- [reactivation](#reactivation-js)
- [reminders](#reminders-js)
- [replacements](#replacements-js)
- [surveys](#surveys-js)
- [tier](#tier-js)
- [valley-optimization](#valley-optimization-js)

---

## 📊 Summary Statistics

| Metric | Count |
|--------|-------|
| **Total Endpoints** | 134 |
| **Authenticated** | 10 |
| **Rate Limited** | 0 |
| **GET requests** | 60 |
| **POST requests** | 64 |
| **PUT requests** | 8 |
| **DELETE requests** | 2 |
| **PATCH requests** | 0 |

---

## 📖 Endpoint Reference

### ai

**File**: `routes/api/ai.js`

#### `POST` /predict-churn 🔓 

**Description**: Predict churn for individual member

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 14

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/predict-churn \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /churn-candidates 🔓 

**Description**: Get high-risk churn candidates

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 38

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/churn-candidates \\
  -H "Content-Type: application/json"
```

---

#### `POST` /recommend-classes 🔓 

**Description**: Get personalized class recommendations

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 59

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/recommend-classes \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /coaching-insights 🔓 

**Description**: Get AI coaching insights

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 84

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/coaching-insights \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /nutrition-tips 🔓 

**Description**: Get nutrition tips

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 107

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/nutrition-tips \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /analyze-conversation 🔓 

**Description**: Analyze conversation sentiment

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 129

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/analyze-conversation \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /stats 🔓 

**Description**: Get AI service statistics

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 153

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/stats \\
  -H "Content-Type: application/json"
```

---

### auth

**File**: `routes/api/auth.js`

#### `POST` /login 🔓 

**Description**: POST /api/auth/login Autenticación de usuario

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 26

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/login \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /refresh 🔓 

**Description**: POST /api/auth/refresh Refrescar access token

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 50

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/refresh \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /change-password 🔓 

**Description**: POST /api/auth/change-password Cambiar password (usuario autenticado)

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 76

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/change-password \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /create-user 🔓 

**Description**: POST /api/auth/create-user Crear nuevo usuario (solo admin)

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 100

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/create-user \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /me 🔓 

**Description**: GET /api/auth/me Obtener información del usuario autenticado

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 131

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/me \\
  -H "Content-Type: application/json"
```

---

### checkin

**File**: `routes/api/checkin.js`

#### `POST` /checkin 🔓 

**Description**: POST /api/checkin Process a check-in (QR, manual, or kiosk)

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 24

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/checkin \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /history/:memberId 🔓 

**Description**: GET /api/checkin/history/:memberId Get check-in history for a member

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 240

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/history/:memberId \\
  -H "Content-Type: application/json"
```

---

#### `POST` /manual 🔓 

**Description**: POST /api/checkin/manual Manual check-in by staff (reception or instructor)

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 286

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/manual \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

### collection

**File**: `routes/api/collection.js`

#### `POST` /schedule 🔓 

**Description**: POST /api/collection/schedule Programar cobranza contextual manualmente

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 18

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/schedule \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /stats 🔓 

**Description**: GET /api/collection/stats Obtener estadísticas de conversión

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 64

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/stats \\
  -H "Content-Type: application/json"
```

---

#### `POST` /webhook 🔓 

**Description**: POST /api/collection/webhook Webhook de MercadoPago para notificaciones de pago

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 96

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/webhook \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /:id 🔓 

**Description**: GET /api/collection/:id Obtener detalles de una collection específica

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 162

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/:id \\
  -H "Content-Type: application/json"
```

---

#### `POST` /test-debt/:memberId 🔓 

**Description**: POST /api/collection/test-debt/:memberId Endpoint de testing para verificar deuda de un miembro

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 211

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/test-debt/:memberId \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

### dashboard

**File**: `routes/api/dashboard.js`

#### `GET` /kpis/realtime 🔓 

**Description**: GET /api/dashboard/kpis/realtime Obtener todos los KPIs consolidados del día

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 22

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/kpis/realtime \\
  -H "Content-Type: application/json"
```

---

#### `GET` /kpis/financial 🔓 

**Description**: GET /api/dashboard/kpis/financial KPIs financieros del día

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 40

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/kpis/financial \\
  -H "Content-Type: application/json"
```

---

#### `GET` /kpis/operational 🔓 

**Description**: GET /api/dashboard/kpis/operational KPIs operacionales del día

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 53

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/kpis/operational \\
  -H "Content-Type: application/json"
```

---

#### `GET` /kpis/satisfaction 🔓 

**Description**: GET /api/dashboard/kpis/satisfaction KPIs de satisfacción (últimos 7 días)

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 66

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/kpis/satisfaction \\
  -H "Content-Type: application/json"
```

---

#### `GET` /kpis/retention 🔓 

**Description**: GET /api/dashboard/kpis/retention KPIs de retención (últimos 30 días)

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 79

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/kpis/retention \\
  -H "Content-Type: application/json"
```

---

#### `GET` /kpis/vs-targets 🔓 

**Description**: GET /api/dashboard/kpis/vs-targets Comparar KPIs actuales vs objetivos configurados

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 92

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/kpis/vs-targets \\
  -H "Content-Type: application/json"
```

---

#### `GET` /decisions/today 🔓 

**Description**: GET /api/dashboard/decisions/today Obtener decisiones prioritarias del día generadas por IA

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 119

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/decisions/today \\
  -H "Content-Type: application/json"
```

---

#### `POST` /decisions/:decisionId/complete 🔓 

**Description**: POST /api/dashboard/decisions/:decisionId/complete Marcar decisión como completada Body: { completion_notes: string }

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 140

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/decisions/:decisionId/complete \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /decisions/:decisionId/dismiss 🔓 

**Description**: POST /api/dashboard/decisions/:decisionId/dismiss Descartar decisión con justificación Body: { reason: string }

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 174

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/decisions/:decisionId/dismiss \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /alerts/active 🔓 

**Description**: GET /api/dashboard/alerts/active Obtener alertas activas (opcionalmente filtradas por severidad) Query params: ?severity=critical|high|medium|low

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 212

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/alerts/active \\
  -H "Content-Type: application/json"
```

---

#### `POST` /alerts/detect 🔓 

**Description**: POST /api/dashboard/alerts/detect Detectar alertas críticas manualmente

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 241

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/alerts/detect \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /alerts/:alertId/dismiss 🔓 

**Description**: POST /api/dashboard/alerts/:alertId/dismiss Descartar alerta manualmente Body: { dismissed_by: string, reason: string }

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 260

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/alerts/:alertId/dismiss \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /snapshots/create 🔓 

**Description**: POST /api/dashboard/snapshots/create Crear snapshot diario manualmente (también ejecutado por cron a las 23:59)

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 298

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/snapshots/create \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /snapshots/:date 🔓 

**Description**: GET /api/dashboard/snapshots/:date Obtener snapshot de una fecha específica (formato: YYYY-MM-DD)

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 316

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/snapshots/:date \\
  -H "Content-Type: application/json"
```

---

#### `GET` /snapshots/range 🔓 

**Description**: GET /api/dashboard/snapshots/range Obtener snapshots de un rango de fechas Query params: ?start=YYYY-MM-DD&end=YYYY-MM-DD

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 353

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/snapshots/range \\
  -H "Content-Type: application/json"
```

---

#### `GET` /trends/:kpiName 🔓 

**Description**: GET /api/dashboard/trends/:kpiName Obtener tendencia de un KPI específico Query params: ?days=7 (default: 7)

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 399

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/trends/:kpiName \\
  -H "Content-Type: application/json"
```

---

#### `GET` /drilldown/revenue/:date 🔓 

**Description**: GET /api/dashboard/drilldown/revenue/:date Obtener desglose detallado de ingresos por día

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 435

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/drilldown/revenue/:date \\
  -H "Content-Type: application/json"
```

---

#### `GET` /drilldown/debtors 🔓 

**Description**: GET /api/dashboard/drilldown/debtors Obtener lista de miembros con deuda

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 465

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/drilldown/debtors \\
  -H "Content-Type: application/json"
```

---

#### `GET` /drilldown/occupancy/:date 🔓 

**Description**: GET /api/dashboard/drilldown/occupancy/:date Obtener detalle de ocupación por clase en una fecha

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 486

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/drilldown/occupancy/:date \\
  -H "Content-Type: application/json"
```

---

#### `POST` /refresh 🔓 

**Description**: POST /api/dashboard/refresh Refrescar vistas materializadas manualmente

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 526

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/refresh \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /health 🔓 

**Description**: GET /api/dashboard/health Health check del dashboard

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 543

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/health \\
  -H "Content-Type: application/json"
```

---

### instructor-panel

**File**: `routes/api/instructor-panel.js`

#### `POST` /sessions/start 🔓 

**Description**: POST /api/instructor-panel/sessions/start Iniciar sesión de instructor para una clase

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 21

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/sessions/start \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /sessions/:sessionId 🔓 

**Description**: GET /api/instructor-panel/sessions/:sessionId Obtener detalles completos de una sesión activa

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 57

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/sessions/:sessionId \\
  -H "Content-Type: application/json"
```

---

#### `PUT` /sessions/:sessionId/end 🔓 

**Description**: PUT /api/instructor-panel/sessions/:sessionId/end Finalizar sesión de instructor

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 81

**Example Request**:
```bash
curl -X PUT \\
  http://localhost:3000/api/sessions/:sessionId/end \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /sessions/:sessionId/summary 🔓 

**Description**: GET /api/instructor-panel/sessions/:sessionId/summary Obtener resumen de sesión

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 108

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/sessions/:sessionId/summary \\
  -H "Content-Type: application/json"
```

---

#### `POST` /sessions/:sessionId/checkin 🔓 

**Description**: POST /api/instructor-panel/sessions/:sessionId/checkin Check-in rápido de estudiante con un toque

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 136

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/sessions/:sessionId/checkin \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /sessions/:sessionId/mark-absent 🔓 

**Description**: POST /api/instructor-panel/sessions/:sessionId/mark-absent Marcar estudiante como ausente

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 174

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/sessions/:sessionId/mark-absent \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /sessions/:sessionId/checklist 🔓 

**Description**: GET /api/instructor-panel/sessions/:sessionId/checklist Obtener progreso del checklist

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 214

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/sessions/:sessionId/checklist \\
  -H "Content-Type: application/json"
```

---

#### `PUT` /sessions/:sessionId/checklist/:itemId/complete 🔓 

**Description**: PUT /api/instructor-panel/sessions/:sessionId/checklist/:itemId/complete Completar item del checklist

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 238

**Example Request**:
```bash
curl -X PUT \\
  http://localhost:3000/api/sessions/:sessionId/checklist/:itemId/complete \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `PUT` /sessions/:sessionId/checklist/:itemId/skip 🔓 

**Description**: PUT /api/instructor-panel/sessions/:sessionId/checklist/:itemId/skip Saltar item del checklist

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 278

**Example Request**:
```bash
curl -X PUT \\
  http://localhost:3000/api/sessions/:sessionId/checklist/:itemId/skip \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /sessions/:sessionId/alerts 🔓 

**Description**: GET /api/instructor-panel/sessions/:sessionId/alerts Obtener alertas activas de una sesión

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 318

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/sessions/:sessionId/alerts \\
  -H "Content-Type: application/json"
```

---

#### `POST` /sessions/:sessionId/alerts 🔓 

**Description**: POST /api/instructor-panel/sessions/:sessionId/alerts Crear alerta manual

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 343

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/sessions/:sessionId/alerts \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `PUT` /alerts/:alertId/acknowledge 🔓 

**Description**: PUT /api/instructor-panel/alerts/:alertId/acknowledge Reconocer alerta

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 391

**Example Request**:
```bash
curl -X PUT \\
  http://localhost:3000/api/alerts/:alertId/acknowledge \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `PUT` /alerts/:alertId/resolve 🔓 

**Description**: PUT /api/instructor-panel/alerts/:alertId/resolve Resolver alerta

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 426

**Example Request**:
```bash
curl -X PUT \\
  http://localhost:3000/api/alerts/:alertId/resolve \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /dashboard/:instructorId 🔓 

**Description**: GET /api/instructor-panel/dashboard/:instructorId Obtener dashboard del instructor con estadísticas

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 466

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/dashboard/:instructorId \\
  -H "Content-Type: application/json"
```

---

#### `POST` /refresh-views 🔓 

**Description**: POST /api/instructor-panel/refresh-views Refrescar vistas materializadas (para updates en tiempo real)

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 490

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/refresh-views \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /health 🔓 

**Description**: GET /api/instructor-panel/health Health check del sistema de panel de instructor

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 514

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/health \\
  -H "Content-Type: application/json"
```

---

### nutrition

**File**: `routes/api/nutrition.js`

#### `POST` /schedule 🔓 

**Description**: POST /api/nutrition/schedule Programa tip nutricional manualmente

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 16

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/schedule \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /history/:member_id 🔓 

**Description**: GET /api/nutrition/history/:member_id Obtiene historial de tips del miembro

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 47

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/history/:member_id \\
  -H "Content-Type: application/json"
```

---

#### `POST` /engagement 🔓 

**Description**: POST /api/nutrition/engagement Registra interacción con tip

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 70

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/engagement \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /stats 🔓 

**Description**: GET /api/nutrition/stats Obtiene estadísticas de engagement

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 105

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/stats \\
  -H "Content-Type: application/json"
```

---

#### `GET` /tips 🔓 

**Description**: GET /api/nutrition/tips Lista todos los tips disponibles

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 122

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/tips \\
  -H "Content-Type: application/json"
```

---

#### `POST` /tips 🔓 

**Description**: POST /api/nutrition/tips Crea nuevo tip (admin)

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 142

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/tips \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

### public › v1 › auth

**File**: `routes/api/public/v1/auth.js`

#### `POST` /oauth/token 🔓 

**Description**: POST /oauth/token OAuth2 Token Endpoint Supports: client_credentials, authorization_code, refresh_token

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 18

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/oauth/token \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /oauth/revoke 🔓 

**Description**: POST /oauth/revoke Revoke access or refresh token

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 79

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/oauth/revoke \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /oauth/introspect 🔓 

**Description**: POST /oauth/introspect Check token validity and get metadata

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 107

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/oauth/introspect \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /oauth/register 🔒 

**Description**: POST /oauth/register Register new OAuth client (requires admin scope)

**Authentication**: Required

**Rate Limiting**: Not enabled

**Location**: Line 130

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/oauth/register \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /api-keys 🔒 

**Description**: POST /api-keys Create new API key (requires authentication)

**Authentication**: Required

**Rate Limiting**: Not enabled

**Location**: Line 158

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/api-keys \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /api-keys 🔒 

**Description**: GET /api-keys List API keys for authenticated client

**Authentication**: Required

**Rate Limiting**: Not enabled

**Location**: Line 186

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/api-keys \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json"
```

---

#### `DELETE` /api-keys/:keyId 🔒 

**Description**: DELETE /api-keys/:keyId Revoke API key

**Authentication**: Required

**Rate Limiting**: Not enabled

**Location**: Line 203

**Example Request**:
```bash
curl -X DELETE \\
  http://localhost:3000/api/api-keys/:keyId \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json"
```

---

#### `POST` /api-keys/:keyId/rotate 🔒 

**Description**: POST /api-keys/:keyId/rotate Rotate API key with grace period

**Authentication**: Required

**Rate Limiting**: Not enabled

**Location**: Line 221

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/api-keys/:keyId/rotate \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /api-keys/:keyId/stats 🔒 

**Description**: GET /api-keys/:keyId/stats Get usage statistics for API key

**Authentication**: Required

**Rate Limiting**: Not enabled

**Location**: Line 249

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/api-keys/:keyId/stats \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json"
```

---

### public › v1 › webhooks

**File**: `routes/api/public/v1/webhooks.js`

#### `POST` / 🔒 

**Description**: POST /webhooks Register new webhook subscription

**Authentication**: Required

**Rate Limiting**: Not enabled

**Location**: Line 16

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/ \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` / 🔒 

**Description**: GET /webhooks List webhooks for authenticated client

**Authentication**: Required

**Rate Limiting**: Not enabled

**Location**: Line 43

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/ \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json"
```

---

#### `GET` /:webhookId/stats 🔒 

**Description**: GET /webhooks/:webhookId/stats Get delivery statistics for webhook

**Authentication**: Required

**Rate Limiting**: Not enabled

**Location**: Line 60

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/:webhookId/stats \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json"
```

---

#### `DELETE` /:webhookId 🔒 

**Description**: DELETE /webhooks/:webhookId Delete webhook subscription

**Authentication**: Required

**Rate Limiting**: Not enabled

**Location**: Line 77

**Example Request**:
```bash
curl -X DELETE \\
  http://localhost:3000/api/:webhookId \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json"
```

---

#### `GET` /events 🔓 

**Description**: GET /webhooks/events List available webhook event types

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 95

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/events \\
  -H "Content-Type: application/json"
```

---

### qr

**File**: `routes/api/qr.js`

#### `GET` /member/:memberId 🔓 

**Description**: GET /api/qr/member/:memberId Generate QR code for a specific member

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 19

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/member/:memberId \\
  -H "Content-Type: application/json"
```

---

#### `GET` /generic 🔓 

**Description**: GET /api/qr/generic Generate generic kiosk QR code

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 43

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/generic \\
  -H "Content-Type: application/json"
```

---

#### `GET` /class/:classId 🔓 

**Description**: GET /api/qr/class/:classId Generate QR code for a specific class

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 65

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/class/:classId \\
  -H "Content-Type: application/json"
```

---

#### `POST` /batch 🔓 

**Description**: POST /api/qr/batch Batch generate QR codes for all active members without QR codes

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 89

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/batch \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /verify 🔓 

**Description**: POST /api/qr/verify Verify if a QR code is valid

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 113

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/verify \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

### reactivation

**File**: `routes/api/reactivation.js`

#### `POST` /detect 🔓 

**Description**: POST /api/reactivation/detect Ejecuta detección diaria de miembros inactivos

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 16

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/detect \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /campaigns 🔓 

**Description**: POST /api/reactivation/campaigns Crea campaña de reactivación manual para un miembro

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 35

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/campaigns \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /campaigns/:id/send 🔓 

**Description**: POST /api/reactivation/campaigns/:id/send Envía siguiente mensaje en la secuencia

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 63

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/campaigns/:id/send \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /campaigns/:id/reactivate 🔓 

**Description**: POST /api/reactivation/campaigns/:id/reactivate Registra que el miembro se reactivó

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 82

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/campaigns/:id/reactivate \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /stats 🔓 

**Description**: GET /api/reactivation/stats Obtiene estadísticas de reactivación

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 102

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/stats \\
  -H "Content-Type: application/json"
```

---

### reminders

**File**: `routes/api/reminders.js`

#### `POST` /class/24h 🔓 

**Description**: POST /api/reminders/class/24h Manually trigger 24h class reminders

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 18

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/class/24h \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /class/2h 🔓 

**Description**: POST /api/reminders/class/2h Manually trigger 2h class reminders

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 39

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/class/2h \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /payment/d0 🔓 

**Description**: POST /api/reminders/payment/d0 Manually trigger D0 payment reminders

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 59

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/payment/d0 \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /payment/d3 🔓 

**Description**: POST /api/reminders/payment/d3 Manually trigger D3 payment reminders

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 79

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/payment/d3 \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /payment/d7 🔓 

**Description**: POST /api/reminders/payment/d7 Manually trigger D7 payment reminders

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 99

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/payment/d7 \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /payment/critical 🔓 

**Description**: POST /api/reminders/payment/critical Manually trigger critical overdue payment check

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 119

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/payment/critical \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /status 🔓 

**Description**: GET /api/reminders/status Get reminder system status

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 139

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/status \\
  -H "Content-Type: application/json"
```

---

### replacements

**File**: `routes/api/replacements.js`

#### `POST` /absence 🔓 

**Description**: POST /api/replacements/absence Reportar ausencia de instructor (desde WhatsApp o panel)

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 18

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/absence \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /:id/find-candidates 🔓 

**Description**: POST /api/replacements/:id/find-candidates Buscar candidatos para un reemplazo específico

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 62

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/:id/find-candidates \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /offers/:offerId/respond 🔓 

**Description**: POST /api/replacements/offers/:offerId/respond Responder a una oferta de reemplazo (aceptar/rechazar)

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 96

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/offers/:offerId/respond \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /active 🔓 

**Description**: GET /api/replacements/active Listar reemplazos activos/pendientes

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 141

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/active \\
  -H "Content-Type: application/json"
```

---

#### `GET` /:id 🔓 

**Description**: GET /api/replacements/:id Obtener detalles de un reemplazo específico

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 181

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/:id \\
  -H "Content-Type: application/json"
```

---

#### `GET` /instructor/:instructorId/stats 🔓 

**Description**: GET /api/replacements/instructor/:instructorId/stats Obtener estadísticas de reemplazos de un instructor

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 240

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/instructor/:instructorId/stats \\
  -H "Content-Type: application/json"
```

---

#### `GET` /metrics 🔓 

**Description**: GET /api/replacements/metrics Obtener métricas globales del sistema de reemplazos

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 275

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/metrics \\
  -H "Content-Type: application/json"
```

---

#### `PUT` /:id/cancel 🔓 

**Description**: PUT /api/replacements/:id/cancel Cancelar búsqueda de reemplazo (instructor original retoma clase)

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 315

**Example Request**:
```bash
curl -X PUT \\
  http://localhost:3000/api/:id/cancel \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /offers/pending 🔓 

**Description**: GET /api/replacements/offers/pending Listar ofertas pendientes (para instructores)

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 392

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/offers/pending \\
  -H "Content-Type: application/json"
```

---

#### `POST` /availability 🔓 

**Description**: POST /api/replacements/availability Configurar disponibilidad de instructor para reemplazos

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 460

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/availability \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /instructor/:instructorId/availability 🔓 

**Description**: GET /api/replacements/instructor/:instructorId/availability Obtener disponibilidad configurada de un instructor

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 534

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/instructor/:instructorId/availability \\
  -H "Content-Type: application/json"
```

---

### surveys

**File**: `routes/api/surveys.js`

#### `POST` /schedule 🔓 

**Description**: POST /api/surveys/schedule Programar encuesta manualmente

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 18

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/schedule \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /response 🔓 

**Description**: POST /api/surveys/response Registrar respuesta de encuesta

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 64

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/response \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /instructor/:instructorId/nps 🔓 

**Description**: GET /api/surveys/instructor/:instructorId/nps Obtener NPS de un instructor

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 119

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/instructor/:instructorId/nps \\
  -H "Content-Type: application/json"
```

---

#### `GET` /instructor/:instructorId/trend 🔓 

**Description**: GET /api/surveys/instructor/:instructorId/trend Obtener tendencia de rating de instructor

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 153

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/instructor/:instructorId/trend \\
  -H "Content-Type: application/json"
```

---

#### `GET` /actionable 🔓 

**Description**: GET /api/surveys/actionable Obtener feedback que requiere atención

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 187

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/actionable \\
  -H "Content-Type: application/json"
```

---

#### `GET` /:id 🔓 

**Description**: GET /api/surveys/:id Obtener detalles de una encuesta específica

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 219

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/:id \\
  -H "Content-Type: application/json"
```

---

#### `POST` /:id/action-taken 🔓 

**Description**: POST /api/surveys/:id/action-taken Marcar feedback como atendido

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 268

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/:id/action-taken \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /analyze-sentiment 🔓 

**Description**: POST /api/surveys/analyze-sentiment Endpoint de testing para análisis de sentimiento

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 337

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/analyze-sentiment \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

### tier

**File**: `routes/api/tier.js`

#### `GET` /current/:member_id 🔓 

**Description**: GET /api/tier/current/:member_id Obtiene tier actual de un miembro

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 16

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/current/:member_id \\
  -H "Content-Type: application/json"
```

---

#### `POST` /upgrade 🔓 

**Description**: POST /api/tier/upgrade Upgrade a Plus o Pro

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 35

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/upgrade \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /downgrade 🔓 

**Description**: POST /api/tier/downgrade Downgrade con retention offer

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 72

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/downgrade \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /downgrade/confirm 🔓 

**Description**: POST /api/tier/downgrade/confirm Confirma downgrade después de retention offer

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 96

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/downgrade/confirm \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /benefits 🔓 

**Description**: GET /api/tier/benefits Lista beneficios por tier

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 119

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/benefits \\
  -H "Content-Type: application/json"
```

---

#### `GET` /candidates 🔓 

**Description**: GET /api/tier/candidates Identifica candidatos para upgrade

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 138

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/candidates \\
  -H "Content-Type: application/json"
```

---

#### `POST` /coaching-sessions 🔓 

**Description**: POST /api/tier/coaching-sessions Programa sesión de coaching 1:1

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 160

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/coaching-sessions \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /training-plans 🔓 

**Description**: POST /api/tier/training-plans Genera plan de entrenamiento adaptativo

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 192

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/training-plans \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /stats 🔓 

**Description**: GET /api/tier/stats Estadísticas de conversión y ROI

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 225

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/stats \\
  -H "Content-Type: application/json"
```

---

### valley-optimization

**File**: `routes/api/valley-optimization.js`

#### `POST` /analyze 🔓 

**Description**: POST /api/valley/analyze Ejecuta análisis diario de clases valle

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 20

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/analyze \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /detections 🔓 

**Description**: GET /api/valley/detections Obtiene todas las detecciones activas

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 40

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/detections \\
  -H "Content-Type: application/json"
```

---

#### `GET` /classes 🔓 

**Description**: GET /api/valley/classes Obtiene vista de todas las clases con métricas de ocupación

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 58

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/classes \\
  -H "Content-Type: application/json"
```

---

#### `POST` /promotions 🔓 

**Description**: POST /api/valley/promotions Crea una nueva promoción para una clase valle

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 80

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/promotions \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /promotions/:id 🔓 

**Description**: GET /api/valley/promotions/:id Obtiene reporte detallado de una promoción

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 125

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/promotions/:id \\
  -H "Content-Type: application/json"
```

---

#### `PUT` /promotions/:id/activate 🔓 

**Description**: PUT /api/valley/promotions/:id/activate Activa una promoción programada

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 144

**Example Request**:
```bash
curl -X PUT \\
  http://localhost:3000/api/promotions/:id/activate \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /promotions/:claseId/target-members 🔓 

**Description**: GET /api/valley/promotions/:id/target-members Obtiene miembros objetivo para una promoción

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 164

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/promotions/:claseId/target-members \\
  -H "Content-Type: application/json"
```

---

#### `PUT` /recipients/:id/response 🔓 

**Description**: PUT /api/valley/recipients/:id/response Registra respuesta de un miembro a la promoción

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 189

**Example Request**:
```bash
curl -X PUT \\
  http://localhost:3000/api/recipients/:id/response \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `POST` /conversions 🔓 

**Description**: POST /api/valley/conversions Registra conversión (primera asistencia) de un miembro

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 214

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/conversions \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /detections/:id/evaluate 🔓 

**Description**: GET /api/valley/detections/:id/evaluate Evalúa si una detección debe escalar estrategia

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 250

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/detections/:id/evaluate \\
  -H "Content-Type: application/json"
```

---

#### `POST` /detections/:id/escalate 🔓 

**Description**: POST /api/valley/detections/:id/escalate Escala estrategia al siguiente nivel

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 269

**Example Request**:
```bash
curl -X POST \\
  http://localhost:3000/api/detections/:id/escalate \\
  -H "Content-Type: application/json"
  -d '{"key": "value"}'
```

---

#### `GET` /stats 🔓 

**Description**: GET /api/valley/stats Obtiene estadísticas generales del sistema valle

**Authentication**: Not required

**Rate Limiting**: Not enabled

**Location**: Line 302

**Example Request**:
```bash
curl -X GET \\
  http://localhost:3000/api/stats \\
  -H "Content-Type: application/json"
```

---


## 🔍 Missing Documentation

The following endpoints need additional documentation:

**Total**: 0 endpoints (0.0%)

✅ All endpoints have documentation!

---

## 📝 Next Steps

1. Add JSDoc comments to endpoints without descriptions
2. Document request/response schemas using Joi or JSON Schema
3. Add error response examples
4. Document query parameters and path parameters
5. Add authentication scopes for each endpoint
6. Consider using OpenAPI/Swagger for interactive docs

---

**Generated by**: `scripts/generate-api-docs.js`  
**Last updated**: 2025-10-20T07:16:52.442Z
