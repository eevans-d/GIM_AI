# 📡 UptimeRobot Setup - Uptime Monitoring & Alerts

**Fecha**: Octubre 3, 2025  
**Propósito**: Configurar monitoring 24/7 y alertas de downtime

---

## 🎯 Por Qué UptimeRobot

✅ **Beneficios**:
- Monitoring cada 5 minutos (plan gratuito)
- Alertas por email, SMS, Slack, webhook
- Dashboard público de status
- 99.9% uptime tracking
- SSL certificate monitoring
- Keyword monitoring
- **Completamente gratuito** (hasta 50 monitors)

---

## 📋 Paso 1: Crear Cuenta

1. Ir a: https://uptimerobot.com/signUp
2. Crear cuenta (email)
3. Verificar email
4. Login: https://uptimerobot.com/login

**Plan**: Free (50 monitors, check cada 5 min)

---

## 🔧 Paso 2: Crear Monitors

### Monitor 1: API Health Check

1. Click **"Add New Monitor"**
2. **Monitor Type**: HTTP(s)
3. **Friendly Name**: `GIM_AI - Health Check`
4. **URL**: `https://gim-ai-production.up.railway.app/health`
5. **Monitoring Interval**: 5 minutes
6. **Monitor Timeout**: 30 seconds
7. **HTTP Method**: GET
8. **Expected Status Code**: 200
9. Click **"Create Monitor"**

---

### Monitor 2: WhatsApp Webhook

1. **Add New Monitor**
2. **Monitor Type**: HTTP(s)
3. **Friendly Name**: `GIM_AI - WhatsApp Webhook`
4. **URL**: `https://gim-ai-production.up.railway.app/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=gim_ai_webhook_2025&hub.challenge=TEST`
5. **Monitoring Interval**: 5 minutes
6. **Keyword Check**: 
   - **Type**: Keyword exists
   - **Value**: `TEST` (el challenge que debería retornar)
7. Click **"Create Monitor"**

---

### Monitor 3: API Public Endpoint

1. **Add New Monitor**
2. **Monitor Type**: HTTP(s)
3. **Friendly Name**: `GIM_AI - API Status`
4. **URL**: `https://gim-ai-production.up.railway.app/api/v1/health`
5. **Monitoring Interval**: 5 minutes
6. **Expected Status Code**: 200
7. Click **"Create Monitor"**

---

### Monitor 4: SSL Certificate

1. **Add New Monitor**
2. **Monitor Type**: HTTP(s)
3. **Friendly Name**: `GIM_AI - SSL Certificate`
4. **URL**: `https://gim-ai-production.up.railway.app`
5. **SSL Expiry Check**: Enabled
6. **Alert Days Before**: 30 days
7. Click **"Create Monitor"**

---

## 🔔 Paso 3: Configurar Alertas

### 3.1 Alert Contacts (Email)

1. Dashboard → **My Settings** → **Alert Contacts**
2. **Add Alert Contact**
3. **Type**: Email
4. **Friendly Name**: `Admin Email`
5. **Email Address**: tu-email@example.com
6. **Threshold**: 
   - Send notification when: **Down**
   - Send notification when: **Up** (recovery)
7. Click **"Create Alert Contact"**

---

### 3.2 Alert Contacts (SMS) - Opcional

1. **Add Alert Contact**
2. **Type**: SMS
3. **Friendly Name**: `Admin Phone`
4. **Phone Number**: +54 9 11 1234-5678
5. **Threshold**: Down only (para evitar costo de SMS innecesarios)
6. Click **"Create Alert Contact"**

**Nota**: SMS puede tener costos. Usar solo para alertas críticas.

---

### 3.3 Alert Contacts (Slack) - Recomendado

1. **Add Alert Contact**
2. **Type**: Slack
3. **Friendly Name**: `Slack #alerts`
4. **Webhook URL**: Obtener de Slack (ver abajo)
5. Click **"Create Alert Contact"**

#### Obtener Slack Webhook:

1. Ir a: https://api.slack.com/apps
2. **Create New App** → From scratch
3. **App Name**: `UptimeRobot Alerts`
4. **Workspace**: Tu workspace
5. **Incoming Webhooks** → Activate
6. **Add New Webhook to Workspace**
7. **Select Channel**: `#gim-ai-alerts`
8. **Copy Webhook URL**: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`
9. Pegar en UptimeRobot

---

### 3.4 Configurar Alertas en Monitors

Para cada monitor:

1. Click en monitor → **Edit**
2. Scroll down a **Alert Contacts To Notify**
3. Seleccionar:
   - ✅ Email (siempre)
   - ✅ Slack (si configurado)
   - ☐ SMS (solo para críticos)
4. **Save Changes**

---

## 📊 Paso 4: Crear Status Page Pública

### 4.1 Crear Status Page

1. Dashboard → **Status Pages**
2. Click **"Add Status Page"**
3. **Friendly Name**: `GIM_AI Status`
4. **Custom URL**: `gim-ai-status` (será: uptimerobot.com/gim-ai-status)
5. **Monitors to Show**:
   - ✅ GIM_AI - Health Check
   - ✅ GIM_AI - WhatsApp Webhook
   - ✅ GIM_AI - API Status
6. **Custom Domain** (opcional): `status.gimapp.com`
7. **Password Protection**: No (público)
8. Click **"Create Status Page"**

### 4.2 Compartir Status Page

URL pública:
```
https://stats.uptimerobot.com/gim-ai-status
```

Compartir con:
- Clientes (transparencia)
- Equipo (visibilidad)
- Stakeholders

---

## 🎨 Paso 5: Personalizar Alertas

### 5.1 Notification Settings

1. **My Settings** → **Alert Contact Notification Settings**
2. **Send down alerts after**: 3 checks (evita false positives)
3. **Send up alerts after**: 1 check (recuperación inmediata)
4. **Maintenance windows**: Configurar si haces deploys programados

### 5.2 Maintenance Windows

Si haces deploy los domingos a las 3 AM:

1. Monitor → **Edit** → **Maintenance Windows**
2. **Add Maintenance Window**
3. **Type**: Weekly
4. **Day**: Sunday
5. **Time**: 03:00 AM - 04:00 AM
6. **Timezone**: America/Argentina/Buenos_Aires
7. **Save**

Durante maintenance, no se enviarán alertas.

---

## 📈 Paso 6: Dashboard y Métricas

### 6.1 UptimeRobot Dashboard

Métricas disponibles:

- **Uptime %**: Últimos 30/60/90 días
- **Response Times**: Average, min, max
- **Downtime Events**: Listado de outages
- **Status Timeline**: Visual de uptime/downtime

### 6.2 Ver Logs de Monitor

1. Click en monitor
2. Tab **"Logs"**
3. Ver:
   - Timestamp de checks
   - Status codes
   - Response times
   - Downtime reasons

### 6.3 Exportar Datos

1. Monitor → **Stats**
2. **Export**: CSV, JSON
3. Útil para reportes mensuales

---

## 🔧 Paso 7: Monitoreo Avanzado

### 7.1 Keyword Monitoring

Monitorear que una palabra clave esté presente en la respuesta:

Ejemplo: Verificar que `/health` retorna `"healthy"`:

1. Monitor → **Edit**
2. **Keyword**:
   - **Type**: Keyword exists
   - **Value**: `"status":"healthy"`
3. **Save**

Si el keyword NO aparece, se considera DOWN.

---

### 7.2 Response Time Alerts

Alertar si la respuesta es muy lenta:

1. Monitor → **Edit**
2. **Advanced Settings**
3. **Response Time**: 
   - Alert if > 5000ms (5 segundos)
4. **Save**

---

### 7.3 Custom HTTP Headers

Si tu API requiere headers:

1. Monitor → **Edit**
2. **Custom HTTP Headers**:
   ```
   User-Agent: UptimeRobot/2.0
   X-API-Key: YOUR_API_KEY
   ```
3. **Save**

---

## 📱 Paso 8: Mobile App (Opcional)

### 8.1 Descargar App

- **iOS**: https://apps.apple.com/app/uptimerobot/id1104878581
- **Android**: https://play.google.com/store/apps/details?id=com.uptimerobot

### 8.2 Login

Usar mismas credenciales de web dashboard.

### 8.3 Push Notifications

Configurar en app para recibir push notifications de downtime.

---

## 🔗 Paso 9: Webhook Integration (Opcional)

### 9.1 Webhook para Custom Alerts

Crear webhook personalizado para integrar con otros sistemas:

1. **Alert Contacts** → **Add Alert Contact**
2. **Type**: Webhook
3. **Friendly Name**: `Custom Webhook`
4. **URL to Notify**: `https://tu-sistema.com/webhooks/uptime`
5. **POST Value**:
   ```
   {
     "monitor": "*monitorFriendlyName*",
     "url": "*monitorURL*",
     "status": "*alertTypeFriendlyName*",
     "datetime": "*alertDateTime*"
   }
   ```
6. **Save**

### 9.2 Integrar con n8n (Opcional)

Si usas n8n workflows:

1. Crear workflow en n8n con webhook trigger
2. Obtener webhook URL de n8n
3. Configurar como Webhook en UptimeRobot
4. Procesar alertas (ej: enviar a Slack, crear ticket, etc.)

---

## 💰 Costos y Limits

### Plan Gratuito:

- ✅ 50 monitors
- ✅ Check interval: 5 minutes
- ✅ 2 month log retention
- ✅ Email + SMS alerts
- ✅ Slack/Webhook integrations
- ✅ Public status pages

**Costo**: **$0/mes** 🎉

### Plan Pro ($7/mes):

- ✅ 50 monitors (same)
- ✅ Check interval: **1 minute** (faster)
- ✅ **2 year** log retention
- ✅ Advanced notifications
- ✅ Custom domains for status pages

**Para GIM_AI**: Plan gratuito es suficiente al inicio.

---

## 📊 Monitoreo Recomendado

### Configuración Óptima:

| Monitor | Interval | Alert | Crítico |
|---------|----------|-------|---------|
| Health Check | 5 min | Email + Slack | ✅ Sí |
| WhatsApp Webhook | 5 min | Email + Slack | ✅ Sí |
| API Status | 5 min | Email | 🟡 Media |
| SSL Certificate | 1 día | Email | 🟢 Baja |

### Thresholds Recomendados:

- **Down alert after**: 3 checks (15 min de downtime)
- **Up alert after**: 1 check (recuperación inmediata)
- **Response time alert**: > 5 segundos
- **SSL alert**: 30 días antes de expirar

---

## 🧪 Testing de UptimeRobot

### Test 1: Simular Downtime

```bash
# Detener app en Railway temporalmente
railway down

# Esperar 5-10 minutos
# Verificar que llega alerta de UptimeRobot

# Reactivar app
railway up
```

### Test 2: Test Manual de Monitor

1. Dashboard → Click en monitor
2. Click **"Test Now"**
3. Ver resultado inmediato
4. Verificar status code y response time

---

## 🔧 Troubleshooting

### Error: "Monitor shows down but app is up"

**Causas posibles**:
1. Firewall bloqueando IPs de UptimeRobot
2. Rate limiting bloqueando requests
3. Timeout muy corto (aumentar a 30s)

**Solución**:
```javascript
// Whitelist IPs de UptimeRobot en rate limiter
const UPTIMEROBOT_IPS = [
  '46.137.190.132',
  '144.217.254.216',
  // ... ver lista completa en UptimeRobot docs
];

app.use((req, res, next) => {
  if (UPTIMEROBOT_IPS.includes(req.ip)) {
    return next(); // Skip rate limit
  }
  // ... aplicar rate limit
});
```

### Error: "Keyword not found"

**Causa**: Response no contiene keyword esperado

**Solución**:
1. Test manual: `curl https://tu-app.railway.app/health`
2. Verificar response contiene keyword
3. Ajustar keyword en monitor

### Error: "SSL alert but certificate is valid"

**Causa**: UptimeRobot cachea SSL info

**Solución**:
1. Esperar 24 horas (auto-refresh)
2. O contactar support para force refresh

---

## ✅ Checklist de Configuración

- [ ] Cuenta UptimeRobot creada
- [ ] 4 monitors configurados:
  - [ ] Health Check
  - [ ] WhatsApp Webhook
  - [ ] API Status
  - [ ] SSL Certificate
- [ ] Alert contacts configurados:
  - [ ] Email
  - [ ] Slack (recomendado)
  - [ ] SMS (opcional)
- [ ] Status page pública creada
- [ ] Test de cada monitor exitoso
- [ ] Alertas llegando correctamente
- [ ] Maintenance windows configurados (si aplica)
- [ ] Mobile app instalada (opcional)

---

## 📚 Recursos

- **Dashboard**: https://uptimerobot.com/dashboard
- **Docs**: https://uptimerobot.com/help/
- **API Docs**: https://uptimerobot.com/api/
- **Status**: https://status.uptimerobot.com/
- **Support**: support@uptimerobot.com

---

## 🎯 Métricas de Éxito

Después de configurar:

- **Uptime objetivo**: > 99.5% (43.2 min downtime/mes máximo)
- **Response time objetivo**: < 2 segundos (p95)
- **Recovery time objetivo**: < 5 minutos
- **Alert response time**: < 5 minutos de detección

---

**Última actualización**: Octubre 3, 2025  
**Tiempo de setup**: 10-15 minutos  
**Costo**: Gratis (plan Free)
