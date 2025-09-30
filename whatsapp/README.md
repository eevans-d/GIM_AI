# WhatsApp Client

Cliente completo para WhatsApp Business Cloud API.

## Estructura

- `client/` - Módulos del cliente (sender, webhook, templates, etc.)
- `templates/` - Plantillas HSM aprobadas
- `webhooks/` - Handlers para webhooks de WhatsApp

## Módulos

### client/sender.js
Envío de mensajes con rate limiting y queue.

### client/webhook.js
Recepción y procesamiento de mensajes entrantes.

### client/templates.js
Gestión de plantillas HSM (Header, Style, Message).

### client/rate-limiter.js
Control de límites: máx 2 mensajes/día, ventana 9-21h.

### client/logger.js
Logging completo a Supabase.

## Templates Disponibles

- `bienvenida_nuevo_socio` - Mensaje de bienvenida
- `checkin_confirmado` - Confirmación de check-in
- `recordatorio_clase_24h` - Recordatorio 24h antes
- `recordatorio_pago_d0` - Vencimiento hoy
- `recordatorio_pago_d3` - 3 días vencido
- `recordatorio_pago_d7` - 7 días vencido
- `cobranza_contextual` - Post-entrenamiento
- `cupo_liberado` - Notificación lista espera
- `encuesta_satisfaccion` - Feedback post-clase
- `reactivacion_d10` - Inactivo 10 días
- `reactivacion_d14` - Inactivo 14 días

## Uso

```javascript
const WhatsAppClient = require('./whatsapp/client/sender');

// Enviar template
await WhatsAppClient.sendTemplate(
  '+5491112345678',
  'checkin_confirmado',
  { name: 'Juan', class: 'Spinning 19:00' }
);
```
