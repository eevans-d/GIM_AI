# PROMPT 8: Post-Class Survey System ✅

**Estado:** COMPLETADO  
**Fecha implementación:** Enero 2025  
**Complejidad:** Alta - Integración Gemini AI + NPS + Bull Queue  

---

## 📋 Resumen Ejecutivo

Sistema de **encuestas post-clase automatizadas** que:
- ✅ Captura satisfacción con ratings de 1-5 estrellas (vía WhatsApp)
- ✅ Analiza sentimientos con **Google Gemini AI** (fallback a keyword-based)
- ✅ Calcula **NPS (Net Promoter Score)** por instructor con tendencias históricas
- ✅ Detecta feedback accionable (ratings ≤2) y envía seguimientos automáticos
- ✅ Dashboard materializado para análisis en tiempo real

**KPI objetivo:** ≥50% respuestas (configurado en `SURVEY_RESPONSE_RATE_TARGET`)  
**Timing:** Encuesta enviada 30min post-clase (configurable)  
**Follow-up:** Mensaje adicional 60min después para ratings bajos sin comentario  

---

## 🏗️ Arquitectura

### Flujo de Datos

```
┌──────────────┐    check-in    ┌──────────────────────┐
│   Check-in   │───────────────>│ PostgreSQL Trigger   │
│  Completado  │                 │ (auto-schedule)      │
└──────────────┘                 └──────────┬───────────┘
                                            │
                         ┌──────────────────┴────────────────┐
                         │  Insert survey row                 │
                         │  + Bull job (30min delay)          │
                         └──────────────────┬────────────────┘
                                            ▼
                                  ┌──────────────────┐
                                  │ Bull Queue       │
                                  │ (Redis-backed)   │
                                  └────────┬─────────┘
                                           │
                         ┌─────────────────┴─────────────────┐
                         │                                    │
                         ▼                                    ▼
              ┌─────────────────┐              ┌─────────────────────┐
              │ WhatsApp Sender │              │ Survey Response     │
              │ (template msg)  │              │ (webhook listener)  │
              └─────────────────┘              └──────────┬──────────┘
                                                           │
                                        ┌──────────────────┴──────────────┐
                                        │                                  │
                                        ▼                                  ▼
                             ┌───────────────────┐          ┌──────────────────────┐
                             │ Gemini AI         │          │ NPS Calculation      │
                             │ Sentiment Analysis│          │ (promoter/passive/   │
                             │ (positive/neutral/│          │  detractor)          │
                             │  negative)        │          └──────────────────────┘
                             └───────────────────┘
                                        │
                                        ▼
                             ┌──────────────────────────┐
                             │ Actionable Feedback?     │
                             │ (rating ≤2 + no comment) │
                             └───────┬──────────────────┘
                                     │
                                     ▼ YES
                          ┌──────────────────────────┐
                          │ Schedule Followup        │
                          │ (60min later via queue)  │
                          └──────────────────────────┘
```

### Componentes

| Componente | Archivo | Responsabilidad |
|------------|---------|-----------------|
| **Database** | `database/schemas/surveys_table.sql` | Tabla surveys + índices + stored functions para NPS |
| **Trigger SQL** | `database/functions/trigger_post_class_survey.sql` | Auto-schedule encuestas post-checkin |
| **Service** | `services/survey-service.js` | Lógica de negocio (Gemini AI, NPS, scheduling) |
| **API Routes** | `routes/api/surveys.js` | 8 endpoints REST para gestión de encuestas |
| **Queue Processor** | `workers/survey-queue-processor.js` | Procesa jobs de Bull queue (enviar mensaje, followup) |
| **WhatsApp Templates** | `whatsapp/templates/post_class_survey.json` | Template HSM con botones de estrellas (1-5) |
| | `whatsapp/templates/survey_low_rating_followup.json` | Seguimiento para ratings bajos |
| **Tests** | `tests/integration/surveys.spec.js` | 15+ casos de prueba end-to-end |

---

## 🗄️ Database Schema

### Tabla `surveys`

```sql
CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checkin_id UUID NOT NULL REFERENCES checkins(id),
  member_id UUID NOT NULL REFERENCES members(id),
  instructor_id UUID NOT NULL REFERENCES instructors(id),
  clase_id UUID NOT NULL REFERENCES classes(id),
  
  -- Respuesta
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  
  -- AI Sentiment Analysis
  sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_confidence NUMERIC(3,2),
  
  -- NPS Classification
  nps_category VARCHAR(20) CHECK (nps_category IN ('promoter', 'passive', 'detractor')),
  
  -- Actionable Feedback
  action_taken BOOLEAN DEFAULT FALSE,
  action_notes TEXT,
  action_date TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ NOT NULL,
  
  UNIQUE(checkin_id)
);
```

### Índices (7 en total)

```sql
CREATE INDEX idx_surveys_instructor ON surveys(instructor_id);
CREATE INDEX idx_surveys_rating ON surveys(rating) WHERE rating IS NOT NULL;
CREATE INDEX idx_surveys_nps ON surveys(nps_category);
CREATE INDEX idx_surveys_actionable ON surveys(action_taken) 
  WHERE rating <= 2 AND action_taken = FALSE;
CREATE INDEX idx_surveys_responded ON surveys(responded_at);
CREATE INDEX idx_surveys_sentiment ON surveys(sentiment);
CREATE INDEX idx_surveys_scheduled ON surveys(scheduled_for);
```

### Stored Functions

#### `calculate_instructor_nps(instructor_id, start_date, end_date)`
Calcula Net Promoter Score:
- **Promoters:** Ratings 4-5
- **Passives:** Rating 3
- **Detractors:** Ratings 1-2
- **NPS = (% promoters - % detractors) × 100**

```sql
SELECT calculate_instructor_nps(
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  '2025-01-01',
  '2025-01-31'
);
-- Returns: {nps: 42, promoters: 15, passives: 3, detractors: 2, total: 20}
```

#### `get_actionable_feedback()`
Retorna encuestas con ratings ≤2 sin acción tomada.

#### `get_instructor_rating_trend(instructor_id, days)`
Retorna tendencia de ratings diarios (últimos N días).

### Materialized View: `mv_instructor_performance`

Dashboard optimizado con refresh automático cada 15 minutos:

```sql
CREATE MATERIALIZED VIEW mv_instructor_performance AS
SELECT 
  i.id,
  i.nombre,
  COUNT(s.id) as total_surveys,
  ROUND(AVG(s.rating), 2) as avg_rating,
  SUM(CASE WHEN s.nps_category = 'promoter' THEN 1 ELSE 0 END) as promoters,
  SUM(CASE WHEN s.nps_category = 'passive' THEN 1 ELSE 0 END) as passives,
  SUM(CASE WHEN s.nps_category = 'detractor' THEN 1 ELSE 0 END) as detractors,
  (SUM(CASE WHEN s.nps_category = 'promoter' THEN 1 ELSE 0 END)::float / 
   COUNT(s.id) * 100 - 
   SUM(CASE WHEN s.nps_category = 'detractor' THEN 1 ELSE 0 END)::float / 
   COUNT(s.id) * 100)::integer as nps
FROM instructors i
LEFT JOIN surveys s ON s.instructor_id = i.id
WHERE s.responded_at IS NOT NULL
GROUP BY i.id;
```

---

## 🧠 Google Gemini AI Integration

### Sentiment Analysis Endpoint

**Service:** `survey-service.js` → `analyzeSentiment(comment)`

**Prompt Engineering:**

```javascript
const prompt = `Analiza el sentimiento del siguiente comentario sobre una clase de gimnasio.
Responde SOLO con un JSON válido con esta estructura:
{
  "sentiment": "positive" | "neutral" | "negative",
  "confidence": 0.0-1.0,
  "reasoning": "explicación breve"
}

Comentario: "${comment}"`;
```

**Configuración Gemini:**

```javascript
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

const result = await model.generateContent(prompt);
const text = result.response.text();
const analysis = JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
```

**Fallback a Keyword-Based:**

Si Gemini falla o API key no configurada:

```javascript
const positiveWords = ['excelente', 'increíble', 'motivador', 'energía', 'amor'];
const negativeWords = ['terrible', 'aburrido', 'horrible', 'malo', 'decepcionante'];

const positiveCount = positiveWords.filter(w => comment.toLowerCase().includes(w)).length;
const negativeCount = negativeWords.filter(w => comment.toLowerCase().includes(w)).length;

if (positiveCount > negativeCount) return { sentiment: 'positive', confidence: 0.7 };
if (negativeCount > positiveCount) return { sentiment: 'negative', confidence: 0.7 };
return { sentiment: 'neutral', confidence: 0.5 };
```

---

## 📱 WhatsApp Templates

### 1. `post_class_survey.json` (Encuesta Inicial)

```json
{
  "name": "post_class_survey",
  "language": "es",
  "category": "MARKETING",
  "components": [
    {
      "type": "BODY",
      "text": "Hola {{1}}! 👋\n\nGracias por asistir a la clase de *{{2}}* con {{3}}.\n\n¿Cómo calificarías tu experiencia? 🌟"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {"type": "QUICK_REPLY", "text": "⭐ 1 estrella"},
        {"type": "QUICK_REPLY", "text": "⭐⭐ 2 estrellas"},
        {"type": "QUICK_REPLY", "text": "⭐⭐⭐ 3 estrellas"},
        {"type": "QUICK_REPLY", "text": "⭐⭐⭐⭐ 4 estrellas"},
        {"type": "QUICK_REPLY", "text": "⭐⭐⭐⭐⭐ 5 estrellas"}
      ]
    }
  ]
}
```

**Variables:**
1. `member_name` - Nombre del miembro
2. `class_name` - Nombre de la clase (ej: "Spinning")
3. `instructor_name` - Nombre del instructor

### 2. `survey_low_rating_followup.json` (Seguimiento)

Para ratings ≤2 sin comentario:

```json
{
  "name": "survey_low_rating_followup",
  "language": "es",
  "category": "MARKETING",
  "components": [
    {
      "type": "BODY",
      "text": "Hola {{1}} 😊\n\nVimos que tu experiencia en *{{2}}* no fue la esperada.\n\n¿Nos ayudarías con más detalles? Queremos mejorar para ti 💪"
    }
  ]
}
```

---

## 🔌 API Reference

### Base URL: `/api/surveys`

#### 1. `POST /schedule`
Programa encuesta post-clase (llamado automáticamente por trigger SQL).

**Request:**
```json
{
  "checkin_id": "uuid"
}
```

**Response:**
```json
{
  "survey_id": "uuid",
  "scheduled_for": "2025-01-15T14:30:00Z",
  "message": "Survey scheduled successfully"
}
```

**Errores:**
- `404` - Check-in no encontrado
- `409` - Encuesta ya existe para este check-in
- `400` - Miembro sin WhatsApp opt-in

---

#### 2. `POST /response`
Registra respuesta de encuesta (llamado desde webhook WhatsApp).

**Request:**
```json
{
  "survey_id": "uuid",
  "rating": 4,
  "comment": "Excelente clase pero música muy alta"
}
```

**Response:**
```json
{
  "message": "Survey response submitted",
  "nps_category": "promoter",
  "sentiment": "positive",
  "sentiment_confidence": 0.85,
  "followup_scheduled": false
}
```

**Lógica:**
- Rating 4-5 → `promoter`
- Rating 3 → `passive`
- Rating 1-2 → `detractor` + schedule followup si no hay comment

**Errores:**
- `404` - Encuesta no encontrada
- `409` - Encuesta ya respondida
- `400` - Rating fuera de rango (1-5)

---

#### 3. `GET /instructor/:id/nps`
Calcula NPS del instructor en rango de fechas.

**Query Params:**
- `start_date` (opcional) - ISO 8601 date
- `end_date` (opcional) - ISO 8601 date

**Response:**
```json
{
  "instructor_id": "uuid",
  "nps": 42,
  "promoters": 15,
  "passives": 3,
  "detractors": 2,
  "total_responses": 20,
  "start_date": "2025-01-01",
  "end_date": "2025-01-31"
}
```

**Interpretación NPS:**
- `>50` - Excelente
- `30-50` - Bueno
- `0-30` - Mejorar
- `<0` - Crítico

---

#### 4. `GET /instructor/:id/trend`
Tendencia de NPS diaria (últimos N días).

**Query Params:**
- `days` (default: 30) - Número de días a incluir

**Response:**
```json
{
  "instructor_id": "uuid",
  "trend": [
    {"date": "2025-01-15", "nps": 45},
    {"date": "2025-01-14", "nps": 38},
    {"date": "2025-01-13", "nps": 52}
  ]
}
```

---

#### 5. `GET /actionable`
Lista feedback accionable (ratings ≤2 sin acción tomada).

**Query Params:**
- `instructor_id` (opcional) - Filtrar por instructor

**Response:**
```json
[
  {
    "id": "uuid",
    "rating": 2,
    "comment": "Música muy alta, no podía concentrarme",
    "sentiment": "negative",
    "member_name": "Juan Pérez",
    "class_name": "Spinning",
    "instructor_name": "María García",
    "responded_at": "2025-01-15T14:35:00Z",
    "action_taken": false
  }
]
```

---

#### 6. `GET /:id`
Detalles de una encuesta específica.

**Response:**
```json
{
  "id": "uuid",
  "rating": 5,
  "comment": "Increíble clase!",
  "sentiment": "positive",
  "sentiment_confidence": 0.95,
  "nps_category": "promoter",
  "action_taken": false,
  "responded_at": "2025-01-15T14:35:00Z",
  "member": {"id": "uuid", "nombre": "Juan"},
  "instructor": {"id": "uuid", "nombre": "María"},
  "clase": {"id": "uuid", "nombre": "Spinning"}
}
```

---

#### 7. `POST /:id/action-taken`
Marca encuesta como resuelta (para feedback accionable).

**Request:**
```json
{
  "notes": "Contactado personalmente, ajustado volumen música"
}
```

**Response:**
```json
{
  "message": "Survey marked as action taken",
  "action_date": "2025-01-15T16:00:00Z"
}
```

**Errores:**
- `400` - Notas requeridas
- `404` - Encuesta no encontrada

---

#### 8. `POST /analyze-sentiment`
Endpoint de prueba para sentiment analysis (desarrollo).

**Request:**
```json
{
  "comment": "Excelente clase, muy motivador!"
}
```

**Response:**
```json
{
  "sentiment": "positive",
  "confidence": 0.92,
  "reasoning": "Palabras clave positivas: excelente, motivador"
}
```

---

## ⚙️ Configuración

### Variables de Entorno (`.env`)

```bash
# Google Gemini AI
GEMINI_API_KEY=your-api-key-here

# Timing configuration
SURVEY_DELAY_MINUTES=30
SURVEY_RESPONSE_RATE_TARGET=0.50
SURVEY_LOW_RATING_FOLLOWUP_DELAY=60
```

### System Configuration (SQL)

Parámetros almacenados en `system_config`:

```sql
INSERT INTO system_config (key, value, description) VALUES
('survey_delay_minutes', '30', 'Minutes after class to send survey'),
('survey_response_rate_target', '0.50', 'Target 50% response rate'),
('survey_low_rating_followup_delay', '60', 'Minutes to wait before followup');
```

---

## 🧪 Testing

### Ejecutar Tests

```bash
# Tests completos (con coverage)
npm test -- tests/integration/surveys.spec.js

# Tests específicos
npm test -- -t "should calculate NPS correctly"

# Watch mode
npm test -- --watch surveys.spec.js
```

### Cobertura de Tests

15+ casos de prueba incluyendo:

| Categoría | Tests |
|-----------|-------|
| **Scheduling** | Schedule survey, prevent duplicates, validate checkin |
| **Responses** | Valid ratings (1-5), with/without comments, duplicate prevention |
| **NPS Calculation** | Promoters/passives/detractors, date filtering, trends |
| **Sentiment Analysis** | Positive/neutral/negative, confidence scores, fallback |
| **Actionable Feedback** | Low ratings detection, followup scheduling, action taken |
| **API Validation** | Invalid inputs, 404s, 409 conflicts, 400 bad requests |

### Test Data Patterns

```javascript
// Setup de prueba
beforeAll(async () => {
  // Crear instructor → clase → miembro → checkin → survey
  // Pattern: dependencias en orden (no violar FK constraints)
});

afterAll(async () => {
  // Cleanup en orden inverso: surveys → checkins → members → classes → instructors
});
```

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Configurar `GEMINI_API_KEY` en producción
- [ ] Ajustar `SURVEY_DELAY_MINUTES` (30min recomendado)
- [ ] Verificar rate limits WhatsApp (2 msg/día por usuario)
- [ ] Aprobar templates HSM en Meta Business Suite:
  - [ ] `post_class_survey`
  - [ ] `survey_low_rating_followup`

### Database Migration

```bash
# 1. Ejecutar schema
psql -h your-db-host -U postgres -d gim_ai \
  -f database/schemas/surveys_table.sql

# 2. Ejecutar trigger
psql -h your-db-host -U postgres -d gim_ai \
  -f database/functions/trigger_post_class_survey.sql

# 3. Verificar
psql -c "SELECT COUNT(*) FROM surveys;"
psql -c "SELECT * FROM system_config WHERE key LIKE 'survey_%';"
```

### Post-Deployment

- [ ] Verificar materialized view refresh (cada 15min):
  ```sql
  SELECT last_refresh FROM pg_stat_user_tables WHERE relname = 'mv_instructor_performance';
  ```
- [ ] Monitorear Bull queue:
  ```bash
  redis-cli KEYS survey-queue:*
  redis-cli HGETALL survey-queue:active
  ```
- [ ] Probar endpoint `/api/surveys/analyze-sentiment` con texto real
- [ ] Revisar logs de Gemini AI:
  ```bash
  grep "Gemini AI sentiment" logs/combined-*.log
  ```

---

## 📊 KPIs y Monitoreo

### Métricas Clave

| Métrica | Query | Objetivo |
|---------|-------|----------|
| **Tasa de Respuesta** | `SELECT COUNT(*) FILTER (WHERE responded_at IS NOT NULL)::float / COUNT(*) FROM surveys` | ≥50% |
| **NPS Promedio** | `SELECT AVG(nps) FROM mv_instructor_performance` | ≥30 |
| **Feedback Accionable** | `SELECT COUNT(*) FROM surveys WHERE rating <= 2 AND action_taken = FALSE` | <5 pendientes |
| **Tiempo de Respuesta** | `SELECT AVG(EXTRACT(EPOCH FROM (responded_at - scheduled_for))/60) FROM surveys` | <60 min |

### Dashboard SQL

```sql
-- Survey Performance Dashboard
SELECT 
  DATE(responded_at) as date,
  COUNT(*) as total_responses,
  ROUND(AVG(rating), 2) as avg_rating,
  SUM(CASE WHEN nps_category = 'promoter' THEN 1 ELSE 0 END) as promoters,
  SUM(CASE WHEN nps_category = 'detractor' THEN 1 ELSE 0 END) as detractors,
  (SUM(CASE WHEN nps_category = 'promoter' THEN 1 ELSE 0 END)::float / 
   COUNT(*) * 100 - 
   SUM(CASE WHEN nps_category = 'detractor' THEN 1 ELSE 0 END)::float / 
   COUNT(*) * 100)::integer as nps
FROM surveys
WHERE responded_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(responded_at)
ORDER BY date DESC;
```

---

## 🔧 Troubleshooting

### Problema: Encuestas no se envían

**Síntomas:** Bull queue jobs quedan en `waiting` eternamente.

**Causas posibles:**
1. Redis no está corriendo → `docker-compose ps`
2. Worker no inicializado → verificar logs: `grep "Survey queue processor" logs/combined-*.log`
3. WhatsApp rate limit excedido → revisar `whatsapp_message_log`

**Solución:**
```bash
# Reiniciar Redis y workers
docker-compose restart redis
pm2 restart gim-ai
```

---

### Problema: Sentiment analysis devuelve `null`

**Síntomas:** `surveys.sentiment` queda en NULL después de responder.

**Causas posibles:**
1. `GEMINI_API_KEY` no configurada
2. Quota excedida en Gemini API
3. JSON parsing falla (respuesta no válida)

**Solución:**
```bash
# 1. Verificar API key
echo $GEMINI_API_KEY

# 2. Probar endpoint directo
curl -X POST http://localhost:3000/api/surveys/analyze-sentiment \
  -H "Content-Type: application/json" \
  -d '{"comment": "Excelente clase!"}'

# 3. Revisar logs Gemini
grep "Gemini AI" logs/error-*.log
```

**Fallback:** Sistema usa keyword-based si Gemini falla.

---

### Problema: NPS no se calcula correctamente

**Síntomas:** `calculate_instructor_nps()` devuelve NULL o 0 siempre.

**Causas posibles:**
1. Encuestas sin responder (`rating = NULL`)
2. Date range incorrecto (no incluye encuestas)

**Debug SQL:**
```sql
-- Verificar distribución de ratings
SELECT 
  instructor_id,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE rating IS NOT NULL) as responded,
  COUNT(*) FILTER (WHERE nps_category = 'promoter') as promoters,
  COUNT(*) FILTER (WHERE nps_category = 'detractor') as detractors
FROM surveys
GROUP BY instructor_id;
```

---

## 📚 Referencias

### Documentación Externa

- [Google Gemini API Docs](https://ai.google.dev/docs)
- [WhatsApp Cloud API - Message Templates](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates)
- [Net Promoter Score (NPS) Calculator](https://www.netpromotersystem.com/about/measuring-your-net-promoter-score/)
- [Bull Queue Documentation](https://github.com/OptimalBits/bull)

### Código Relacionado

- `PROMPT 6`: Sistema de recordatorios (base para Bull queue patterns)
- `PROMPT 7`: Contextual collection (patrón de delayed jobs similares)
- `PROMPT 16`: Error handling centralizado (`utils/error-handler.js`)
- `PROMPT 17`: Testing patterns (mocks de servicios externos)

---

## ✅ Validación de Implementación

### Checklist de Completitud

- [x] **Database:**
  - [x] Tabla `surveys` creada con 10 columnas
  - [x] 7 índices optimizados (instructor, rating, NPS, actionable, etc.)
  - [x] 3 stored functions (NPS calculation, actionable feedback, trends)
  - [x] Materialized view `mv_instructor_performance` con auto-refresh
  
- [x] **Triggers:**
  - [x] `schedule_post_class_survey()` trigger en `checkins`
  - [x] `detect_actionable_feedback()` trigger en `surveys`
  
- [x] **Backend:**
  - [x] `survey-service.js` con 7 funciones públicas
  - [x] Gemini AI integration con fallback
  - [x] NPS calculation logic
  - [x] Bull queue integration
  
- [x] **API:**
  - [x] 8 endpoints REST implementados
  - [x] Validación Joi en todos los POST
  - [x] Error handling con `AppError`
  - [x] Correlation IDs en logs
  
- [x] **Queue:**
  - [x] Worker `survey-queue-processor.js`
  - [x] 2 job types: `send-survey-message`, `send-low-rating-followup`
  - [x] Event handlers (completed/failed/stalled)
  
- [x] **WhatsApp:**
  - [x] Template `post_class_survey` con 5 botones
  - [x] Template `survey_low_rating_followup`
  - [x] Rate limiting respetado (via `whatsapp-sender.js`)
  
- [x] **Tests:**
  - [x] 15+ casos de prueba en `surveys.spec.js`
  - [x] Cobertura de scheduling, responses, NPS, sentiment, actionable
  - [x] Mocks de Gemini AI y WhatsApp
  
- [x] **Documentation:**
  - [x] Este README completo
  - [x] API reference con ejemplos
  - [x] Troubleshooting guide
  - [x] Deployment checklist
  
- [x] **Configuration:**
  - [x] Variables en `.env.example`
  - [x] System config inserts en SQL
  - [x] Integration en `index.js`

### Comando de Validación

```bash
# Ejecutar desde WSL
bash scripts/validate-prompt-08.sh
```

Verifica:
1. ✅ Archivos existen (10 componentes)
2. ✅ Database functions existen en SQL
3. ✅ Routes registradas en `index.js`
4. ✅ Queue processor inicializado
5. ✅ Tests pasan (15+ aserciones)
6. ✅ Environment variables documentadas

---

## 🎯 Próximos Pasos

**PROMPT 9 (Days 6-10):** Automatic Instructor Replacement System
- WhatsApp absence reporting ("No puedo dar clase el [fecha]")
- Smart candidate matching (disponibilidad + especialidad)
- Automated notifications to candidates
- Bonus system for <24h coverage
- Transaction logging for accountability

---

**Implementado por:** GIM_AI Dev Team  
**Fecha:** Enero 2025  
**Versión:** 1.0.0  
