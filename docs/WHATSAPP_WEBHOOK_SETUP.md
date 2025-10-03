# 📱 WhatsApp Business API - Configuración de Webhook

**Fecha**: Octubre 3, 2025  
**Propósito**: Configurar webhook de WhatsApp para recibir mensajes y actualizaciones de estado

---

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Configuración en Meta Developer Console](#configuración-en-meta-developer-console)
3. [Endpoints del Webhook](#endpoints-del-webhook)
4. [Validación y Testing](#validación-y-testing)
5. [Templates de Mensajes](#templates-de-mensajes)
6. [Troubleshooting](#troubleshooting)

---

## ✅ Requisitos Previos

Antes de configurar el webhook, asegúrate de tener:

- [ ] Aplicación creada en Meta Business Manager
- [ ] Número de teléfono verificado en WhatsApp Business
- [ ] Access Token permanente generado
- [ ] Variable `WHATSAPP_WEBHOOK_VERIFY_TOKEN` en .env
- [ ] Variable `WHATSAPP_WEBHOOK_SECRET` en .env
- [ ] Aplicación desplegada y accesible públicamente (https://)

⚠️ **IMPORTANTE**: El webhook DEBE estar en HTTPS. Meta no acepta HTTP.

---

## 🔧 Configuración en Meta Developer Console

### Paso 1: Acceder a la Configuración

1. Ir a: https://developers.facebook.com/apps/
2. Seleccionar tu aplicación de GIM_AI
3. En el menú lateral: **WhatsApp > Configuration**
4. Buscar sección **Webhook**

### Paso 2: Configurar Callback URL

```
Callback URL: https://tu-dominio.railway.app/whatsapp/webhook
Verify Token: gim_ai_webhook_2025
```

**Importante**: El verify token DEBE coincidir con `WHATSAPP_WEBHOOK_VERIFY_TOKEN` en tu .env

### Paso 3: Suscribirse a Eventos

Marcar los siguientes eventos en "Webhook fields":

- ✅ **messages** - Mensajes entrantes
- ✅ **message_status** - Estados de mensajes (enviado, entregado, leído, fallido)
- ✅ **messaging_product** - Información del producto de mensajería

**NO suscribirse a**:
- ❌ account_alerts (innecesarios para este proyecto)
- ❌ phone_number_quality_update (innecesarios)

### Paso 4: Verificar Webhook

1. Click en **Verify and Save**
2. Meta hará una petición GET a tu URL:
   ```
   GET https://tu-dominio.railway.app/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=gim_ai_webhook_2025&hub.challenge=RANDOM_STRING
   ```
3. Tu servidor debe responder con el `hub.challenge` recibido
4. Si la verificación es exitosa, verás: ✅ **Webhook verified**

---

## 🔌 Endpoints del Webhook

### GET /whatsapp/webhook

**Propósito**: Verificación inicial del webhook por Meta

**Query Parameters**:
- `hub.mode`: "subscribe"
- `hub.verify_token`: Token configurado en .env
- `hub.challenge`: String aleatorio de Meta

**Response**:
- Status 200 + el valor de `hub.challenge` si el token es correcto
- Status 403 si el token es incorrecto

**Implementación** (ya existe en `whatsapp/client/webhook.js`):
```javascript
function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Webhook verification failed');
    res.sendStatus(403);
  }
}
```

### POST /whatsapp/webhook

**Propósito**: Recibir eventos de WhatsApp (mensajes, estados, etc.)

**Headers**:
- `X-Hub-Signature-256`: Firma HMAC-SHA256 del payload

**Body** (ejemplo de mensaje entrante):
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "15551234567",
          "phone_number_id": "PHONE_NUMBER_ID"
        },
        "contacts": [{
          "profile": {
            "name": "Juan Perez"
          },
          "wa_id": "5491112345678"
        }],
        "messages": [{
          "from": "5491112345678",
          "id": "wamid.HBgNNTQ5...",
          "timestamp": "1696348800",
          "text": {
            "body": "Hola, quiero reservar una clase"
          },
          "type": "text"
        }]
      },
      "field": "messages"
    }]
  }]
}
```

**Response**:
- Status 200 (siempre, incluso si hay errores internos)
- Meta espera respuesta rápida (<20s)

**Seguridad**:
1. Verificar firma `X-Hub-Signature-256`
2. Validar que el payload viene de Meta
3. Procesar de forma asíncrona (no bloquear respuesta)

---

## 🎯 Flujo de Procesamiento

```
Meta WhatsApp API
      ↓
  [Webhook POST]
      ↓
[Verificar Firma]
      ↓
[Extraer Eventos]
      ↓
   ┌─────────────────┐
   │  Message Type?  │
   └─────────────────┘
      ↓         ↓
  [Status]  [Message]
      ↓         ↓
[Update DB] [Process]
              ↓
        ┌──────────┐
        │ Action?  │
        └──────────┘
         ↓       ↓
    [Reply]  [Trigger]
              [n8n Flow]
```

**Acciones Implementadas**:
1. **Status Update**: Actualizar estado de mensajes en DB
2. **Interactive Reply**: Responder a botones/listas interactivas
3. **Survey Response**: Procesar respuestas de encuestas
4. **Opt-out**: Procesar "STOP" para desuscripción
5. **Trigger n8n**: Iniciar workflows (ej: pago de deuda)

---

## 📝 Templates de Mensajes (18 Templates)

⚠️ **CRÍTICO**: WhatsApp requiere templates aprobados para mensajes proactivos.

### Templates Implementados

Los siguientes templates YA están definidos en `whatsapp/templates/`:

#### 1. Check-in & Confirmación
- ✅ `class_started_confirmation.json` - Confirmación de entrada a clase

#### 2. Recordatorios
- ✅ `checklist_reminder.json` - Recordatorio de clase programada
- ✅ `coaching_session_reminder.json` - Recordatorio de sesión de coaching

#### 3. Cobro Contextual (PROMPT 7)
- ✅ `debt_post_workout.json` - Cobro post-entrenamiento
- ✅ `tier_retention_offer.json` - Oferta de retención por deuda

#### 4. Encuestas (PROMPT 8)
- ✅ `post_class_survey.json` - Encuesta NPS post-clase
- ✅ `survey_low_rating_followup.json` - Seguimiento de rating bajo

#### 5. Reemplazo de Instructores (PROMPT 9)
- ✅ `replacement_offer.json` - Oferta de reemplazo a instructor
- ✅ `replacement_accepted_confirmation.json` - Confirmación de aceptación
- ✅ `replacement_original_instructor_notification.json` - Notificación al instructor original
- ✅ `replacement_student_notification.json` - Notificación a alumnos

#### 6. Alertas para Instructores (PROMPT 10)
- ✅ `late_start_alert.json` - Alerta de inicio tardío
- ✅ `low_attendance_alert.json` - Alerta de baja asistencia
- ✅ `absence_confirmation.json` - Confirmación de ausencia

#### 7. Nutrición Personalizada (PROMPT 11)
- ✅ `nutrition_post_strength.json` - Recomendaciones post-fuerza
- ✅ `nutrition_post_cardio.json` - Recomendaciones post-cardio
- ✅ `nutrition_post_flexibility.json` - Recomendaciones post-flexibilidad

#### 8. Reactivación (PROMPT 12)
- ✅ `reactivation_miss_you.json` - "Te extrañamos"
- ✅ `reactivation_social_proof.json` - Prueba social
- ✅ `reactivation_special_offer.json` - Oferta especial

#### 9. Membresías Escalonadas (PROMPT 13)
- ✅ `tier_upgrade_offer_plus.json` - Upgrade a Plus
- ✅ `tier_upgrade_offer_pro.json` - Upgrade a Pro

#### 10. Optimización Valle-Pico (PROMPT 14)
- ✅ `valley_promotion_offer.json` - Promoción horarios valle

### Proceso de Aprobación

1. **Ir a Meta Business Manager**:
   - https://business.facebook.com/
   - Seleccionar cuenta de WhatsApp Business
   - WhatsApp Manager > Message Templates

2. **Crear cada template**:
   - Click "Create Template"
   - Categoría: **UTILITY** (para operacionales) o **MARKETING** (para promociones)
   - Nombre: Mismo que el archivo JSON (sin extensión)
   - Idioma: **Spanish (es)**
   - Contenido: Copiar de los archivos JSON

3. **Variables en templates**:
   - Usar `{{1}}`, `{{2}}`, etc. para variables dinámicas
   - Ejemplo: `Hola {{1}}, tu clase de {{2}} inicia en {{3}} minutos`

4. **Botones interactivos**:
   - Hasta 3 botones por mensaje
   - Tipos: `QUICK_REPLY`, `URL`, `PHONE_NUMBER`

5. **Tiempo de aprobación**:
   - Templates UTILITY: 12-24 horas
   - Templates MARKETING: 24-48 horas
   - **IMPORTANTE**: Iniciar este proceso YA

---

## 🧪 Validación y Testing

### Prueba 1: Verificar Webhook

```bash
# Simular verificación de Meta
curl "https://tu-dominio.railway.app/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=gim_ai_webhook_2025&hub.challenge=TEST123"

# Respuesta esperada: TEST123
```

### Prueba 2: Enviar Mensaje de Test

```bash
# Simular mensaje entrante (sin firma para test local)
curl -X POST https://tu-dominio.railway.app/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "123456789",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "messages": [{
            "from": "5491112345678",
            "id": "wamid.test",
            "timestamp": "1696348800",
            "text": { "body": "Hola" },
            "type": "text"
          }]
        },
        "field": "messages"
      }]
    }]
  }'

# Respuesta esperada: 200 OK
```

### Prueba 3: Verificar Logs

```bash
# Ver logs de webhook en tiempo real
tail -f logs/whatsapp-webhook-*.log

# Buscar errores de verificación
grep "verification failed" logs/whatsapp-*.log
```

### Prueba 4: Test de Firma (Producción)

```javascript
// Script de test de firma (scripts/test-webhook-signature.js)
const crypto = require('crypto');

const payload = JSON.stringify({
  object: "whatsapp_business_account",
  entry: []
});

const signature = crypto
  .createHmac('sha256', process.env.WHATSAPP_WEBHOOK_SECRET)
  .update(payload)
  .digest('hex');

console.log('Signature:', `sha256=${signature}`);
```

---

## 🔍 Troubleshooting

### Error: "Webhook verification failed"

**Causa**: Token de verificación no coincide

**Solución**:
1. Verificar `.env`: `WHATSAPP_WEBHOOK_VERIFY_TOKEN=gim_ai_webhook_2025`
2. Verificar en Meta: Token configurado en webhook settings
3. Verificar que la app esté usando el .env correcto (producción vs desarrollo)

### Error: "Invalid signature"

**Causa**: Secret de webhook no coincide o está mal configurado

**Solución**:
1. Verificar `.env`: `WHATSAPP_WEBHOOK_SECRET` configurado
2. Regenerar secret: `openssl rand -hex 32`
3. Actualizar en .env y reiniciar servidor
4. No hay que configurar este secret en Meta (es solo para validar)

### Error: "Webhook URL not accessible"

**Causa**: URL no es pública o no es HTTPS

**Solución**:
1. Verificar que la app esté desplegada (Railway/Render)
2. URL debe ser HTTPS (no HTTP)
3. Probar acceso: `curl https://tu-dominio.railway.app/whatsapp/webhook`
4. Verificar firewall/rate limiting no bloquee IPs de Meta

### Error: "Template not found"

**Causa**: Template usado pero no aprobado en Meta

**Solución**:
1. Ir a WhatsApp Manager > Message Templates
2. Verificar estado del template (Pending/Approved/Rejected)
3. Si está Pending, esperar aprobación (24-48h)
4. Si está Rejected, corregir y reenviar

### Error: "Message not sent - Template error"

**Causa**: Variables del template no coinciden

**Solución**:
1. Verificar número de variables en template
2. Verificar orden de variables en llamada
3. Ejemplo:
   ```javascript
   // Template: "Hola {{1}}, tu clase {{2}} inicia en {{3}} minutos"
   // Correcto:
   sendTemplate('template_name', ['Juan', 'Spinning', '15']);
   // Incorrecto (falta variable):
   sendTemplate('template_name', ['Juan', 'Spinning']); // ❌
   ```

---

## 📊 Monitoreo del Webhook

### Métricas a Rastrear

1. **Latencia de respuesta**: <1s ideal, <5s máximo
2. **Tasa de error**: <1% ideal
3. **Volumen de mensajes**: Picos esperados post-clase
4. **Tasa de entrega**: >95% ideal

### Logs Críticos

```javascript
// Ya implementado en whatsapp/client/webhook.js
logger.info('Webhook verified', { success: true });
logger.info('Message received', { from, type, message_id });
logger.error('Signature validation failed', { headers });
logger.warn('Unknown message type', { type });
```

### Alertas Recomendadas

- 🚨 5+ errores de firma en 1 minuto
- ⚠️ Latencia >5s por más de 3 mensajes
- ⚠️ Template no encontrado
- 🚨 Webhook URL no accesible (Meta deshabilitará después de 1h)

---

## 🔗 URLs de Referencia

- **Meta Webhooks**: https://developers.facebook.com/docs/graph-api/webhooks
- **WhatsApp Webhooks**: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
- **Message Templates**: https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates
- **Interactive Messages**: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages#interactive-messages

---

## ✅ Checklist Final

Antes de considerar el webhook completamente configurado:

- [ ] URL del webhook configurada en Meta Developer Console
- [ ] Verify token configurado y coincidente
- [ ] Webhook verificado exitosamente (✅ en Meta)
- [ ] Eventos `messages` y `message_status` suscritos
- [ ] Prueba de mensaje entrante exitosa
- [ ] Prueba de estado de mensaje exitosa
- [ ] Logs de webhook funcionando
- [ ] Firma de webhook validando correctamente
- [ ] 18 templates creados en Meta Business Manager
- [ ] Al menos 5 templates críticos aprobados:
  - [ ] `class_started_confirmation`
  - [ ] `debt_post_workout`
  - [ ] `post_class_survey`
  - [ ] `replacement_offer`
  - [ ] `late_start_alert`
- [ ] Monitoreo configurado (Sentry/logs)
- [ ] Documentación actualizada

---

**Última actualización**: Octubre 3, 2025  
**Responsable**: DevOps/Backend Team  
**Próxima revisión**: Después del deployment
