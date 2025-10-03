# Manual E2E Validation Guide

## Overview

This guide provides step-by-step instructions for **manually validating** critical user journeys in the production/staging environment. Use this alongside automated tests for comprehensive validation.

## 🎯 Validation Checklist

```
[ ] 1. Health & Infrastructure (5 min)
[ ] 2. Admin Dashboard (10 min)
[ ] 3. QR Check-in Flow (15 min)
[ ] 4. WhatsApp Integration (20 min)
[ ] 5. Contextual Payment Collection (90+ min)
[ ] 6. Post-Class Survey (90+ min)
[ ] 7. Instructor Replacement (15 min)
[ ] 8. Public API & Webhooks (10 min)

Total estimated time: 2-3 hours (includes waiting periods)
```

---

## 1️⃣ Health & Infrastructure (5 min)

### Prerequisites
- [ ] App deployed to Railway/Render
- [ ] Have production URL: `https://your-app.up.railway.app`

### Steps

#### 1.1 Check Health Endpoint

```bash
curl https://your-app.up.railway.app/health | jq '.'
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-03T15:30:00.000Z",
  "uptime": 3600,
  "services": {
    "database": {
      "status": "healthy",
      "latency_ms": 12
    },
    "redis": {
      "status": "healthy",
      "latency_ms": 5
    },
    "whatsapp": {
      "status": "healthy",
      "templates_approved": 23
    }
  },
  "version": "1.0.0"
}
```

**Validation:**
- ✅ Status is `"healthy"`
- ✅ All services show `"healthy"`
- ✅ Database latency < 100ms
- ✅ Redis latency < 50ms

#### 1.2 Check Database Connection

```bash
# Access Railway PostgreSQL
railway connect postgres

# Run diagnostic query
SELECT 
  COUNT(*) as total_members,
  COUNT(CASE WHEN status = 'activo' THEN 1 END) as active_members,
  COUNT(CASE WHEN deuda_actual > 0 THEN 1 END) as members_with_debt
FROM members;
```

**Expected:**
- ✅ Query returns results
- ✅ Numbers match dashboard

#### 1.3 Check Redis Connection

```bash
# Access Railway Redis
railway connect redis

# Test Redis
PING
# Expected: PONG

# Check queues
KEYS bull:*
# Expected: List of queue keys
```

**Validation:**
- ✅ PING returns PONG
- ✅ Queues exist (whatsapp, surveys, reminders)

---

## 2️⃣ Admin Dashboard (10 min)

### Prerequisites
- [ ] Admin credentials configured
- [ ] Browser with dev tools

### Steps

#### 2.1 Login

1. Open: `https://your-app.up.railway.app/admin`
2. Enter credentials:
   - Email: `admin@gimapp.com`
   - Password: `your_password`
3. Click "Iniciar Sesión"

**Validation:**
- ✅ Redirects to dashboard
- ✅ JWT token stored in localStorage
- ✅ User info displayed (name, role)

#### 2.2 Dashboard Metrics

Check the following metrics display:

**Finance Panel:**
- ✅ Ingresos del mes (current month revenue)
- ✅ Deuda pendiente (outstanding debt)
- ✅ Proyección mensual (monthly projection)
- ✅ Tasa de pago (payment rate %)

**Members Panel:**
- ✅ Total members
- ✅ Active members
- ✅ New this month
- ✅ Retention rate

**Occupation Panel:**
- ✅ Average occupation %
- ✅ Most popular classes
- ✅ Peak hours
- ✅ Capacity utilization chart

**Satisfaction Panel:**
- ✅ NPS Score
- ✅ Promoters/Passives/Detractors breakdown
- ✅ Recent comments
- ✅ Trend chart

#### 2.3 Generate Report

1. Navigate to "Reportes"
2. Select "Ingresos Mensual"
3. Choose date range: Last 30 days
4. Click "Generar"

**Validation:**
- ✅ Report generates within 5 seconds
- ✅ Data matches dashboard
- ✅ Can export to CSV
- ✅ CSV file downloads correctly

#### 2.4 Member Management

1. Navigate to "Miembros"
2. Search for test member: `+5491112345678`
3. Click on member
4. View details

**Validation:**
- ✅ Member details load
- ✅ QR code displayed
- ✅ Check-in history visible
- ✅ Payment history visible
- ✅ Can edit member details
- ✅ Can regenerate QR code

---

## 3️⃣ QR Check-in Flow (15 min)

### Prerequisites
- [ ] Test member created with QR code
- [ ] Test class created (starting within next 2 hours)
- [ ] Physical QR code or QR scanner app

### Steps

#### 3.1 Prepare QR Code

```bash
# Get test member QR code
curl https://your-app.up.railway.app/api/v1/members/${TEST_MEMBER_ID} \
  -H "Authorization: Bearer ${AUTH_TOKEN}" | jq -r '.codigo_qr'

# Generate QR code image
node -e "
const QRCode = require('qrcode');
QRCode.toFile('test-qr.png', 'GIM_TEST_MEMBER_001', {
  width: 300,
  margin: 2
});
console.log('QR code saved to test-qr.png');
"
```

#### 3.2 Simulate Check-in

**Method A: API Call**

```bash
curl -X POST https://your-app.up.railway.app/api/checkin \
  -H "Content-Type: application/json" \
  -d '{
    "qr_code": "GIM_TEST_MEMBER_001",
    "clase_id": "'"${TEST_CLASS_ID}"'"
  }' | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "checkin_id": "uuid-here",
  "timestamp": "2025-10-03T16:00:00.000Z",
  "member": {
    "id": "uuid",
    "nombre": "Test Member E2E",
    "telefono": "+5491112345678"
  },
  "clase": {
    "id": "uuid",
    "nombre": "Spinning Intermedio",
    "instructor": "Juan Pérez",
    "hora_inicio": "16:00:00"
  },
  "whatsapp_confirmacion": {
    "enviado": true,
    "message_id": "wamid.xxx"
  }
}
```

**Method B: QR Scanner (if available)**

1. Open check-in kiosk: `https://your-app.up.railway.app/checkin`
2. Scan QR code from `test-qr.png`
3. Observe response

#### 3.3 Validate in Database

```sql
-- Check check-in was recorded
SELECT 
  c.id,
  c.fecha_hora,
  m.nombre as member_name,
  cl.nombre as class_name
FROM checkins c
JOIN members m ON c.miembro_id = m.id
JOIN clases cl ON c.clase_id = cl.id
WHERE m.codigo_qr = 'GIM_TEST_MEMBER_001'
ORDER BY c.fecha_hora DESC
LIMIT 1;
```

**Validation:**
- ✅ Check-in recorded in database
- ✅ Timestamp is recent (< 1 minute ago)
- ✅ Member and class IDs correct

#### 3.4 Validate WhatsApp Message

**Check Logs:**

```bash
# Check Railway logs
railway logs --tail

# Look for WhatsApp message sent
# Expected: "WhatsApp confirmation sent to +5491112345678"
```

**Check Member's Phone:**

If you have access to the test member's WhatsApp:

1. Open WhatsApp on phone with number `+5491112345678`
2. Look for message from GIM_AI business number
3. Verify message content:

```
¡Hola Test Member!

✅ Check-in confirmado exitosamente

📅 Clase: Spinning Intermedio
👨‍🏫 Instructor: Juan Pérez
🕐 Hora: 16:00
📍 Gimnasio GIM_AI

¡Disfruta tu clase! 💪
```

**Validation:**
- ✅ WhatsApp message received within 30 seconds
- ✅ Message uses approved template
- ✅ All placeholders replaced with actual data
- ✅ Member name correct
- ✅ Class details correct

---

## 4️⃣ WhatsApp Integration (20 min)

### Prerequisites
- [ ] WhatsApp Business account configured
- [ ] Templates approved by Meta
- [ ] Test member phone number with WhatsApp

### Steps

#### 4.1 Verify Webhook

```bash
# Test webhook verification
curl "https://your-app.up.railway.app/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=gim_ai_webhook_2025&hub.challenge=TEST123"

# Expected: TEST123
```

**Validation:**
- ✅ Returns challenge exactly as sent
- ✅ Status code 200

#### 4.2 Send Test Template Message

```bash
# Send test message via API
curl -X POST https://your-app.up.railway.app/api/v1/whatsapp/send-template \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "to": "+5491112345678",
    "template": "checkin_confirmation",
    "language": "es",
    "components": {
      "member_name": "Test Member",
      "class_name": "Spinning",
      "instructor_name": "Juan Pérez",
      "class_time": "16:00"
    }
  }' | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "message_id": "wamid.HBgNNTU0MTE2OTExNjUzMRU...",
  "status": "queued",
  "recipient": "+5491112345678",
  "template": "checkin_confirmation"
}
```

**Validation:**
- ✅ Returns success true
- ✅ message_id present
- ✅ Message received on phone within 30 seconds

#### 4.3 Test Rate Limiting

```bash
# Send 3 messages rapidly (rate limit is 2/day)
for i in {1..3}; do
  curl -X POST https://your-app.up.railway.app/api/v1/whatsapp/send-template \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -d '{
      "to": "+5491112345678",
      "template": "test_message",
      "language": "es"
    }'
  echo ""
  sleep 1
done
```

**Expected Behavior:**
- ✅ First 2 messages: queued/sent
- ✅ 3rd message: rate limit error

**Expected Error (3rd message):**
```json
{
  "error": "Rate limit exceeded",
  "message": "Maximum 2 messages per day to this number",
  "next_available": "2025-10-04T15:30:00.000Z"
}
```

#### 4.4 Test Business Hours Enforcement

```bash
# Try sending outside business hours (before 9am or after 9pm)
curl -X POST https://your-app.up.railway.app/api/v1/whatsapp/send-template \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "to": "+5491112345678",
    "template": "test_message",
    "language": "es",
    "force": false
  }'
```

**If outside business hours:**
```json
{
  "success": true,
  "status": "queued_for_business_hours",
  "message": "Message queued, will be sent during business hours (9-21h)",
  "scheduled_for": "2025-10-04T09:00:00.000Z"
}
```

**Validation:**
- ✅ Message queued, not sent immediately
- ✅ scheduled_for is next business day at 9am
- ✅ Message actually sends at scheduled time (check next day)

---

## 5️⃣ Contextual Payment Collection (90+ min)

### Prerequisites
- [ ] Test member with debt created
- [ ] Test check-in completed
- [ ] n8n workflow deployed

### Steps

#### 5.1 Create Test Member with Debt

```bash
# Update test member to have debt
curl -X PATCH https://your-app.up.railway.app/api/v1/members/${TEST_MEMBER_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "deuda_actual": 5000,
    "fecha_ultimo_pago": "2025-09-01"
  }'
```

#### 5.2 Complete Check-in

```bash
# Check-in to trigger contextual collection workflow
curl -X POST https://your-app.up.railway.app/api/checkin \
  -H "Content-Type: application/json" \
  -d '{
    "qr_code": "GIM_TEST_MEMBER_001",
    "clase_id": "'"${TEST_CLASS_ID}"'"
  }'
```

#### 5.3 Wait 90 Minutes

- ⏱️ Wait 90 minutes after check-in
- ☕ Take a break
- 📝 The n8n workflow is scheduled to trigger after 90 minutes

#### 5.4 Check n8n Workflow Execution

1. Open n8n: `https://n8n.your-domain.com`
2. Login with admin credentials
3. Navigate to "Executions"
4. Find execution for "Contextual Payment Collection"

**Validation:**
- ✅ Workflow executed after ~90 minutes
- ✅ All nodes show green (success)
- ✅ Member debt detected correctly
- ✅ WhatsApp message queued

#### 5.5 Validate WhatsApp Payment Reminder

**Check Member's Phone:**

Expected message:
```
Hola Test Member 👋

Vimos que terminaste tu clase de hoy. ¡Felicitaciones! 💪

📊 Tu estado de cuenta:
💰 Deuda pendiente: $5,000
📅 Último pago: 01/09/2025 (hace 32 días)

Para mantener tu acceso continuo al gimnasio, te invitamos a regularizar tu pago.

💳 Pagar ahora:
[Link to MercadoPago]

También puedes pagar en recepción o por transferencia bancaria.

¿Necesitas ayuda? Responde este mensaje.
```

**Validation:**
- ✅ Message received after ~90 minutes from check-in
- ✅ Debt amount correct
- ✅ Last payment date correct
- ✅ MercadoPago link present and clickable
- ✅ Link opens payment form with pre-filled amount

#### 5.6 Test Payment Link

1. Click MercadoPago link in WhatsApp message
2. Observe payment form

**Validation:**
- ✅ Payment form opens
- ✅ Amount pre-filled: $5,000
- ✅ Member name correct
- ✅ Description mentions GIM_AI

*Note: Don't actually complete payment in test*

---

## 6️⃣ Post-Class Survey (90+ min)

### Prerequisites
- [ ] Test member checked in to a class
- [ ] Class has ended
- [ ] n8n workflow deployed

### Steps

#### 6.1 Complete Check-in

```bash
# Use past class ID (class that ended 1 hour ago)
curl -X POST https://your-app.up.railway.app/api/checkin \
  -H "Content-Type: application/json" \
  -d '{
    "qr_code": "GIM_TEST_MEMBER_001",
    "clase_id": "'"${TEST_PAST_CLASS_ID}"'"
  }'
```

#### 6.2 Wait 90 Minutes After Class End

- ⏱️ Wait 90 minutes after class end time
- 📝 Survey workflow triggers 90 min post-class, not post-check-in

#### 6.3 Validate Survey WhatsApp Message

**Expected message:**
```
Hola Test Member 👋

¡Gracias por asistir a la clase de hoy!

Nos encantaría conocer tu opinión sobre:
📚 Clase: Funcional Intermedio
👨‍🏫 Instructor: Juan Pérez

❓ Del 0 al 10, ¿qué tan probable es que recomiendes esta clase a un amigo o familiar?

0️⃣ = Muy improbable
🔟 = Muy probable

Responde con un número del 0 al 10.
```

**Validation:**
- ✅ Message received ~90 min after class end
- ✅ Class name correct
- ✅ Instructor name correct
- ✅ NPS question clear

#### 6.4 Respond to Survey

Send WhatsApp reply: `8`

**Expected response:**
```
¡Gracias por tu respuesta! 😊

Tu opinión es muy valiosa para nosotros.

¿Hay algo que podríamos mejorar? (opcional)
Responde con tus comentarios o envía "SKIP" para omitir.
```

**Validation:**
- ✅ Bot acknowledges score
- ✅ Asks for comments
- ✅ Response within 10 seconds

#### 6.5 Provide Comments

Send WhatsApp reply: `Excelente clase, muy buen ritmo!`

**Expected response:**
```
¡Muchas gracias por tus comentarios! 🙏

Tu feedback nos ayuda a mejorar cada día.

👉 Tu NPS: 8 (Promotor)

¡Te esperamos en la próxima clase! 💪
```

#### 6.6 Validate in Database

```sql
-- Check survey was recorded
SELECT 
  s.id,
  s.nps_score,
  s.comentarios,
  s.categoria_nps,
  m.nombre as member_name,
  c.nombre as class_name,
  i.nombre as instructor_name
FROM surveys s
JOIN members m ON s.miembro_id = m.id
JOIN clases c ON s.clase_id = c.id
JOIN instructors i ON c.instructor_id = i.id
WHERE m.codigo_qr = 'GIM_TEST_MEMBER_001'
ORDER BY s.fecha_creacion DESC
LIMIT 1;
```

**Validation:**
- ✅ Survey recorded in database
- ✅ nps_score = 8
- ✅ comentarios = "Excelente clase, muy buen ritmo!"
- ✅ categoria_nps = "promotor"
- ✅ All relationships correct

#### 6.7 Check Instructor Dashboard

1. Login to Instructor Panel: `https://your-app.up.railway.app/instructor`
2. Enter instructor PIN
3. Navigate to "Performance"

**Validation:**
- ✅ New survey appears in list
- ✅ NPS score updated (recalculated average)
- ✅ Comment visible
- ✅ Trend chart updated

---

## 7️⃣ Instructor Replacement (15 min)

### Prerequisites
- [ ] Test instructor with class assigned
- [ ] At least 2 other instructors with same specialty
- [ ] n8n workflow deployed

### Steps

#### 7.1 Instructor Cancels Class

1. Login to Instructor Panel: `https://your-app.up.railway.app/instructor`
2. Enter test instructor PIN: `1234`
3. Find upcoming class
4. Click "Cancelar Clase"
5. Select option: "Buscar reemplazo automático"
6. Add reason: "Emergencia familiar"
7. Click "Confirmar"

**Expected UI:**
```
✅ Clase cancelada exitosamente

🔍 Buscando instructores disponibles...
✔️ Se encontraron 3 instructores calificados

📤 Ofertas enviadas por WhatsApp a:
  • Instructor 2 (+5491123456789)
  • Instructor 3 (+5491198765432)
  • Instructor 4 (+5491187654321)

⏱️ Esperando respuestas (60 minutos)

El primero que acepte se asignará automáticamente.
```

**Validation:**
- ✅ Class marked as cancelled in database
- ✅ Cancellation reason recorded
- ✅ Replacement search triggered
- ✅ Qualified instructors identified (same specialty/certification)

#### 7.2 Check n8n Workflow Execution

1. Open n8n
2. Navigate to "Executions"
3. Find "Instructor Replacement Search"

**Validation:**
- ✅ Workflow triggered immediately after cancellation
- ✅ Node "Find Replacement Candidates" succeeded
- ✅ Node "Send WhatsApp Offers" succeeded
- ✅ 3 offers sent (or number of qualified instructors)

#### 7.3 Validate WhatsApp Offers

**Check replacement instructor's phones:**

Expected message to each candidate:
```
Hola [Instructor Name] 👋

🚨 Oportunidad de clase

El instructor [Original Instructor] canceló una clase:

📅 Fecha: 03/10/2025
🕐 Hora: 18:00 - 19:00
📚 Clase: Spinning Intermedio
👥 Inscritos: 12/20
💰 Pago: $2,000

¿Puedes cubrir esta clase?

Responde:
• SÍ - Para aceptar
• NO - Para rechazar

⏱️ Tienes 60 minutos para responder.
El primero que acepte se asigna la clase.
```

**Validation:**
- ✅ All qualified instructors received offer
- ✅ Class details correct
- ✅ Payment amount correct
- ✅ Response instructions clear

#### 7.4 Instructor Accepts Offer

**Replacement instructor sends:** `SÍ`

**Expected response to accepting instructor:**
```
¡Genial! 🎉

✅ Clase asignada exitosamente

📅 Detalles confirmados:
  Fecha: 03/10/2025
  Hora: 18:00 - 19:00
  Clase: Spinning Intermedio
  Alumnos: 12 inscriptos

📍 Ubicación: [Gym Address]

Te esperamos 15 minutos antes.

¡Gracias por tu disponibilidad! 🙏
```

**Expected response to other instructors:**
```
Esta clase ya fue cubierta por otro instructor.

¡Gracias por tu interés! La próxima vez 😊
```

**Validation:**
- ✅ First instructor to respond gets the class
- ✅ Confirmation sent to accepting instructor
- ✅ Rejection sent to other instructors
- ✅ Class updated in database with new instructor

#### 7.5 Validate Student Notifications

**Check WhatsApp of students enrolled in class:**

Expected message to all enrolled students:
```
Hola [Student Name] 👋

ℹ️ Cambio de instructor

Tu clase de mañana ha tenido un cambio:

📅 Fecha: 03/10/2025 - 18:00
📚 Clase: Spinning Intermedio

👨‍🏫 Nuevo instructor: [Replacement Instructor]

Todo lo demás permanece igual:
• Mismo horario
• Misma ubicación
• Misma duración

Nos vemos en clase! 💪
```

**Validation:**
- ✅ All enrolled students notified
- ✅ New instructor name correct
- ✅ All other details unchanged

#### 7.6 Validate in Database

```sql
-- Check class reassignment
SELECT 
  c.id,
  c.nombre as class_name,
  c.status,
  i_original.nombre as original_instructor,
  i_replacement.nombre as replacement_instructor,
  cr.motivo as cancellation_reason,
  cr.fecha_cancelacion
FROM clases c
LEFT JOIN instructors i_original ON c.instructor_id_original = i_original.id
JOIN instructors i_replacement ON c.instructor_id = i_replacement.id
LEFT JOIN class_cancellations cr ON c.id = cr.clase_id
WHERE c.id = '${TEST_CLASS_ID}';
```

**Validation:**
- ✅ instructor_id updated to replacement
- ✅ instructor_id_original preserved
- ✅ status = 'activo' (not cancelled anymore)
- ✅ Cancellation reason recorded

---

## 8️⃣ Public API & Webhooks (10 min)

### Prerequisites
- [ ] OAuth2 client credentials
- [ ] Webhook endpoint to receive events

### Steps

#### 8.1 OAuth2 Authentication

```bash
# Step 1: Get authorization code
curl "https://your-app.up.railway.app/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=http://localhost:3000/callback&response_type=code&scope=read:members,write:checkins"

# User logs in and authorizes
# Redirects to: http://localhost:3000/callback?code=AUTH_CODE_HERE

# Step 2: Exchange code for token
curl -X POST https://your-app.up.railway.app/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "AUTH_CODE_HERE",
    "client_id": "'"${CLIENT_ID}"'",
    "client_secret": "'"${CLIENT_SECRET}"'",
    "redirect_uri": "http://localhost:3000/callback"
  }' | jq '.'
```

**Expected Response:**
```json
{
  "access_token": "gim_at_xxxxxxxxxxxxx",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "gim_rt_xxxxxxxxxxxxx",
  "scope": "read:members write:checkins"
}
```

**Validation:**
- ✅ Authorization code received
- ✅ Access token obtained
- ✅ Refresh token present
- ✅ Scopes match requested

#### 8.2 Use Access Token

```bash
# Get members using OAuth token
curl https://your-app.up.railway.app/api/v1/members \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq '.'
```

**Validation:**
- ✅ Request succeeds
- ✅ Returns member list
- ✅ Only allowed scopes work (try unauthorized scope, should fail)

#### 8.3 Generate API Key

```bash
# Create API key
curl -X POST https://your-app.up.railway.app/api/v1/api-keys \
  -H "Authorization: Bearer ${ADMIN_AUTH_TOKEN}" \
  -d '{
    "name": "Test Integration",
    "scopes": ["read:members", "read:classes", "write:webhooks"],
    "expires_at": "2026-12-31"
  }' | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "api_key": "gim_sk_live_xxxxxxxxxxxxx",
  "name": "Test Integration",
  "scopes": ["read:members", "read:classes", "write:webhooks"],
  "expires_at": "2026-12-31T23:59:59.000Z"
}
```

**⚠️ IMPORTANT**: Save this API key, it's only shown once!

#### 8.4 Use API Key

```bash
# Get classes using API key
curl https://your-app.up.railway.app/api/v1/classes \
  -H "X-API-Key: ${API_KEY}" | jq '.'
```

**Validation:**
- ✅ Request succeeds with API key
- ✅ Returns class list
- ✅ Respects rate limits

#### 8.5 Register Webhook

```bash
# Register webhook endpoint
curl -X POST https://your-app.up.railway.app/api/v1/webhooks \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "url": "https://your-webhook-endpoint.com/gim-events",
    "events": ["checkin.created", "payment.received", "class.cancelled"],
    "secret": "your_webhook_secret_key"
  }' | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "webhook_id": "wh_xxxxxxxxxxxxx",
  "url": "https://your-webhook-endpoint.com/gim-events",
  "events": ["checkin.created", "payment.received", "class.cancelled"],
  "status": "active"
}
```

#### 8.6 Test Webhook Delivery

```bash
# Trigger event (create check-in)
curl -X POST https://your-app.up.railway.app/api/checkin \
  -H "Content-Type: application/json" \
  -d '{
    "qr_code": "GIM_TEST_MEMBER_001",
    "clase_id": "'"${TEST_CLASS_ID}"'"
  }'

# Check your webhook endpoint received event
# Expected payload:
```

**Expected Webhook Payload:**
```json
{
  "event": "checkin.created",
  "timestamp": "2025-10-03T18:00:00.000Z",
  "data": {
    "checkin_id": "uuid",
    "member_id": "uuid",
    "class_id": "uuid",
    "timestamp": "2025-10-03T18:00:00.000Z"
  },
  "signature": "sha256=xxxxxxxxxxxxx"
}
```

#### 8.7 Verify Webhook Signature

```javascript
// In your webhook endpoint
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Verify
const isValid = verifyWebhookSignature(
  req.body,
  req.headers['x-gim-signature'],
  'your_webhook_secret_key'
);

console.log('Webhook signature valid:', isValid);
```

**Validation:**
- ✅ Webhook endpoint received event
- ✅ Payload structure correct
- ✅ Signature verification succeeds
- ✅ Event type matches filter
- ✅ Delivery within 30 seconds

---

## 📊 Final Validation Summary

After completing all scenarios, verify:

### ✅ Infrastructure
- [ ] All services healthy
- [ ] Database responsive (< 100ms)
- [ ] Redis responsive (< 50ms)
- [ ] Logs show no errors

### ✅ Authentication & Authorization
- [ ] Admin can login
- [ ] JWT tokens work
- [ ] API keys work
- [ ] OAuth2 flow complete
- [ ] Permissions enforced

### ✅ Core Features
- [ ] QR check-in works
- [ ] WhatsApp messages send
- [ ] Rate limiting enforced
- [ ] Business hours respected
- [ ] Dashboard displays data
- [ ] Reports generate

### ✅ Advanced Workflows
- [ ] Contextual payment collection (90 min delay)
- [ ] Post-class surveys (90 min delay)
- [ ] Instructor replacement (real-time)
- [ ] Webhook delivery (< 30 sec)

### ✅ Data Integrity
- [ ] All check-ins recorded
- [ ] Surveys saved correctly
- [ ] Payments tracked
- [ ] Relationships maintained

### ✅ User Experience
- [ ] Messages in correct language
- [ ] Templates properly formatted
- [ ] Placeholders replaced
- [ ] No typos or errors

---

## 🐛 Common Issues

### Check-in fails with "Class not found"

**Solution**: Verify class exists and is scheduled for today:
```sql
SELECT * FROM clases WHERE fecha = CURRENT_DATE;
```

### WhatsApp message not received

**Checklist**:
1. Templates approved in Meta Business Manager
2. Phone number format correct (+54911...)
3. Not rate limited (max 2/day)
4. Within business hours (9-21h) or `force: true`
5. WhatsApp Business API credentials correct

### n8n workflow not triggering

**Checklist**:
1. n8n deployed and running
2. Webhook URL correct in environment
3. Workflow activated (not paused)
4. Trigger time correct (90 minutes)
5. Check n8n execution logs

### OAuth2 fails with "Invalid redirect_uri"

**Solution**: Register redirect URI in database:
```sql
INSERT INTO oauth_clients (client_id, redirect_uris)
VALUES ('your_client_id', ARRAY['http://localhost:3000/callback']);
```

---

## 📝 Test Report Template

After completing validation, fill out this report:

```markdown
# GIM_AI E2E Validation Report

**Date**: 2025-10-03  
**Environment**: Production  
**Tester**: Your Name  
**Duration**: 2h 30min

## Results Summary

- ✅ Passed: 45/48 tests
- ⚠️ With issues: 3/48 tests
- ✗ Failed: 0/48 tests

## Detailed Results

### 1. Health & Infrastructure ✅
- All services healthy
- Response times acceptable

### 2. Admin Dashboard ✅
- Login successful
- All metrics display correctly
- Reports generate

### 3. QR Check-in ✅
- Check-in recorded
- WhatsApp confirmation sent

### 4. WhatsApp Integration ⚠️
- **Issue**: Rate limit triggered after 2 messages (expected)
- Templates deliver correctly

### 5. Contextual Payment Collection ⚠️
- **Issue**: 95 min delay instead of 90 (within tolerance)
- Payment link works
- Debt amount correct

### 6. Post-Class Survey ✅
- Survey sent after 90 minutes
- Responses recorded
- NPS calculated correctly

### 7. Instructor Replacement ⚠️
- **Issue**: Only 2 candidates found (expected 3)
- Replacement process works
- Students notified

### 8. Public API & Webhooks ✅
- OAuth2 flow complete
- API keys work
- Webhooks deliver events

## Issues Found

1. **Rate Limiting** (Expected behavior)
   - Third message blocked as designed
   - No action needed

2. **Workflow Delay** (Minor variance)
   - 95 minutes instead of 90
   - Acceptable tolerance (±10 min)
   - Consider investigation if persistent

3. **Fewer Candidates** (Expected)
   - Only 2 instructors with matching specialty
   - System worked correctly
   - May need more instructors with same certification

## Recommendations

1. ✅ System ready for production
2. Monitor workflow timings first week
3. Add more instructors with diverse specialties
4. Consider webhook retry mechanism for failed deliveries

## Sign-off

Validated by: _________________  
Date: _________________  
Approved for production: ☐ Yes ☐ No
```

---

**Congratulations! 🎉**

If all validations passed, your GIM_AI system is production-ready!

**Next Steps**:
1. Run automated tests regularly (daily/weekly)
2. Monitor Sentry for errors
3. Check UptimeRobot for downtime
4. Review WhatsApp message delivery rates
5. Collect user feedback

**Support**:
- Technical issues: support@gimapp.com
- Emergency: WhatsApp +54911XXXXXXX (24/7)
- Documentation: docs/FAQ.md

---

**Last Updated**: October 3, 2025  
**Version**: 1.0.0  
**Author**: GIM_AI Team
