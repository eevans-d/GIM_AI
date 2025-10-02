# PROMPT 7: Sistema de Cobranza Contextual Post-Entrenamiento

## 🎯 Objetivo

Implementar un sistema inteligente de cobranza que aprovecha el contexto emocional positivo post-entrenamiento para maximizar la tasa de conversión de pagos de cuotas atrasadas.

## 📊 Métricas de Éxito

- **Target de conversión**: 68% (pago mismo día)
- **Delay óptimo**: 90 minutos post check-in
- **Monto mínimo**: $100 (configuración parametrizable)
- **Tiempo promedio de conversión**: <60 minutos desde envío

## 🏗️ Arquitectura

### Flujo de Datos

```
1. Check-in (QR/Manual)
   ↓
2. Trigger SQL automático
   ↓
3. Verificación de deuda (>$100)
   ↓
4. Programación en Bull queue (+90 min)
   ↓
5. Generación de payment link (MercadoPago)
   ↓
6. Envío de mensaje WhatsApp
   ↓
7. Webhook de confirmación de pago
   ↓
8. Actualización de BD + tracking
```

### Componentes

#### 1. Base de Datos

**Tabla `collections`**:
```sql
- id (UUID, PK)
- member_id (FK → members)
- checkin_id (FK → checkins)
- debt_amount (DECIMAL)
- scheduled_for (TIMESTAMP)
- message_sent_at (TIMESTAMP)
- payment_received_at (TIMESTAMP)
- conversion_time_minutes (INTEGER)
- payment_link (VARCHAR)
- status (VARCHAR) -- scheduled, sent, paid, ignored, failed
```

**Trigger automático**:
- `trigger_schedule_contextual_collection`: Se ejecuta AFTER INSERT en `checkins`
- Verifica deuda automáticamente
- Crea registro en `collections` si deuda >$100

**Funciones SQL**:
- `detect_member_debt(member_id)`: Detecta deuda actual
- `get_collection_conversion_stats(days)`: KPIs de conversión
- `get_pending_collections(limit)`: Obtiene collections listas para envío

#### 2. Backend Services

**`contextual-collection-service.js`**:

```javascript
// Detectar deuda de un miembro
detectMemberDebt(memberId)

// Programar mensaje post-workout
schedulePostWorkoutCollection(checkinId, delayMinutes)

// Generar link de pago MercadoPago
generatePaymentLink(memberId, amount, collectionId)

// Obtener estadísticas
getConversionStats(days)

// Marcar como pagado
markCollectionAsPaid(collectionId, paymentAmount)
```

#### 3. API Endpoints

**`/api/collection`**:

```
POST   /schedule              → Programar collection manual
GET    /stats?days=30         → Estadísticas de conversión
POST   /webhook               → Webhook MercadoPago
GET    /:id                   → Detalles de collection
POST   /test-debt/:memberId   → Test de detección (dev only)
```

#### 4. Queue Processor

**`collection-queue-processor.js`**:
- Procesa jobs de Bull queue
- Envía mensajes WhatsApp vía template
- Actualiza status en BD
- Retry automático (3 intentos)

#### 5. WhatsApp Template

**`debt_post_workout`** (HSM):
```
¡Hola {{member_name}}! 💪

¡Excelente sesión de {{class_name}} hoy! 🎉

Notamos que tienes un saldo pendiente de ${{debt_amount}}. 
Para seguir disfrutando de todas las clases sin interrupciones, 
puedes ponerte al día ahora:

{{payment_link}}

El pago es rápido y seguro. ¡Gracias por ser parte de nuestra comunidad! 🙏

[Botón: Pagar Ahora 💳]
```

## 🔧 Configuración

### Variables de Entorno

```env
# Cobranza Contextual
COLLECTION_DELAY_MINUTES=90
COLLECTION_MIN_DEBT_AMOUNT=100
COLLECTION_CONVERSION_TARGET=0.68

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxx
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxx

# Redis (para Bull queue)
REDIS_URL=redis://localhost:6379
```

### Configuración en BD

Tabla `system_config`:
```sql
INSERT INTO system_config (key, value, description) VALUES
  ('collection_delay_minutes', '90', 'Delay para mensaje post-workout'),
  ('collection_min_debt_amount', '100', 'Monto mínimo para enviar'),
  ('collection_conversion_target', '0.68', 'Target de conversión 68%');
```

## 🚀 Deployment

### 1. Migración de Base de Datos

```bash
# Aplicar migración
psql -h localhost -U gim_ai_user -d gim_ai_db -f database/migrations/007_contextual_collection.sql

# Verificar
psql -c "SELECT * FROM collections LIMIT 1;"
psql -c "SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE '%collection%';"
```

### 2. Configurar MercadoPago

1. Crear cuenta en MercadoPago Developers
2. Obtener Access Token y Public Key
3. Configurar webhook URL: `https://tu-dominio.com/api/collection/webhook`
4. Agregar IPs autorizadas en panel de MercadoPago

### 3. Aprobar Template WhatsApp

1. Subir `debt_post_workout.json` a Meta Business Manager
2. Esperar aprobación (24-48h)
3. Verificar en WhatsApp Manager

### 4. Iniciar Worker

```bash
# El queue processor se inicia automáticamente con el servidor
npm start

# O en modo desarrollo
npm run dev
```

## 📊 Monitoreo

### KPIs Principales

```javascript
// Obtener stats de últimos 30 días
GET /api/collection/stats?days=30

Response:
{
  total_sent: 150,
  total_paid: 102,
  conversion_rate: 68.00,
  avg_conversion_time_minutes: 45,
  total_collected: 255000.00
}
```

### Logs

```bash
# Ver logs de collection
tail -f logs/contextual-collection-*.log | grep 'INFO'

# Ver errores
tail -f logs/error-*.log | grep 'collection'
```

### Bull Dashboard (opcional)

```bash
npm install -g bull-board
bull-board
# Abrir http://localhost:3000
```

## 🧪 Testing

### Tests Unitarios

```bash
npm run test:unit -- contextual-collection
```

### Tests de Integración

```bash
npm run test:integration -- contextual-collection.spec.js
```

### Test Manual

```bash
# 1. Crear member con deuda
curl -X POST http://localhost:3000/api/members \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+5491112345678",
    "first_name": "Test",
    "last_name": "User",
    "membership_status": "active"
  }'

# 2. Crear payment record con deuda
curl -X POST http://localhost:3000/api/payments \
  -d '{"member_id": "...", "deuda_actual": 2500}'

# 3. Hacer check-in
curl -X POST http://localhost:3000/api/checkin/checkin \
  -d '{"member_id": "...", "source": "qr_cliente"}'

# 4. Verificar collection programada
curl http://localhost:3000/api/collection/stats

# 5. Esperar 90 min o forzar envío inmediato (dev)
# En Redis CLI:
redis-cli
> KEYS collection_*
> DEL <job-key>  # Para cancelar
```

## 🐛 Troubleshooting

### Collection no se programa

**Síntomas**: Check-in exitoso pero no aparece en `collections`

**Verificar**:
```sql
-- 1. Trigger existe?
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'trigger_schedule_contextual_collection';

-- 2. Member tiene deuda?
SELECT * FROM detect_member_debt('member-id-here');

-- 3. Logs del trigger
SELECT * FROM system_logs 
WHERE component = 'contextual-collection-trigger'
ORDER BY created_at DESC LIMIT 10;
```

### Mensaje no se envía

**Verificar**:
```bash
# 1. Job en queue?
redis-cli KEYS "bull:contextual-collections:*"

# 2. Worker corriendo?
ps aux | grep node

# 3. Logs
tail -f logs/collection-queue-processor-*.log
```

### Webhook no funciona

**Verificar**:
```bash
# 1. URL accesible desde internet?
curl https://tu-dominio.com/api/collection/webhook

# 2. Logs de webhook
tail -f logs/collection-api-*.log | grep webhook

# 3. Test webhook de MercadoPago
# En panel de MercadoPago → Webhooks → Test
```

## 📈 Optimizaciones Futuras

### Fase 2 (Prompt 20)
- [ ] Caché de payment links en Redis
- [ ] Batch processing de collections
- [ ] Índices compuestos adicionales

### A/B Testing
- [ ] Variantes de copy del mensaje
- [ ] Delays alternativos (60min, 90min, 120min)
- [ ] Emojis vs sin emojis
- [ ] Link directo vs botón

### ML/AI (Prompt 23)
- [ ] Predicción de probabilidad de pago
- [ ] Personalización de mensaje según perfil
- [ ] Momento óptimo de envío por miembro

## 📚 Referencias

- [MercadoPago API Docs](https://www.mercadopago.com.ar/developers)
- [Bull Queue Docs](https://github.com/OptimalBits/bull)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)

## ✅ Checklist de Implementación

- [x] Tabla `collections` creada
- [x] Trigger SQL implementado
- [x] Funciones SQL de detección y stats
- [x] Service `contextual-collection-service.js`
- [x] API routes `/api/collection`
- [x] Queue processor
- [x] Template WhatsApp
- [x] Integración con index.js
- [x] Tests de integración
- [ ] Documentación completa
- [ ] Template aprobado en Meta
- [ ] MercadoPago configurado
- [ ] Tests E2E en staging
- [ ] Deploy a producción

---

**Status**: ✅ IMPLEMENTADO (Día 1 completado)  
**Próximo paso**: Día 2 - Testing exhaustivo y refinamiento  
**Fecha**: 1 de octubre de 2025
