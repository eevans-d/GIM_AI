# Monitoring & Observability System - GIM_AI (PROMPT 19)

## Descripción General

Sistema completo de monitoreo, alertas y observabilidad para detectar problemas antes de que impacten a usuarios.

## Arquitectura

```
monitoring/
├── health/
│   └── system-health.js      # Health checks y status dashboard
├── metrics/
│   └── business-kpis.js       # Métricas de negocio (TODO)
└── alerting/
    └── alert-system.js        # Sistema de alertas multicanal (TODO)
```

## Componentes Implementados

### 1. System Health Monitoring (`health/system-health.js`)

#### Health Endpoints

```javascript
const health = require('./monitoring/health/system-health');

// Health check completo
app.get('/health', health.healthEndpoint());

// Status dashboard (HTML)
app.get('/status', health.statusDashboard());

// Readiness probe (Kubernetes)
app.get('/ready', health.readinessProbe());

// Liveness probe
app.get('/live', health.livenessProbe());
```

#### Métricas Monitoreadas

**System Metrics**:
- ✅ Uptime del proceso
- ✅ Uso de memoria (RSS, Heap, External)
- ✅ CPU usage
- ✅ Node.js version
- ✅ Platform info

**Service Health**:
- ✅ Database connectivity (Supabase)
- ⏳ Redis connectivity
- ⏳ WhatsApp API status
- ⏳ n8n workflows status
- ⏳ External APIs

**Response Times**:
- ✅ Health check duration
- ✅ Individual service response times
- ⏳ API endpoint performance
- ⏳ Database query times

### 2. Alert System (Planeado)

**Ubicación**: `alerting/alert-system.js`

#### Tipos de Alertas

```javascript
const ALERT_CHANNELS = {
  WHATSAPP: 'whatsapp',      // Para admin
  TELEGRAM: 'telegram',       // Para equipo técnico
  EMAIL: 'email',             // Para reportes
  WEBHOOK: 'webhook',         // Para integraciones
};

const ALERT_SEVERITIES = {
  CRITICAL: 'critical',       // Respuesta inmediata
  HIGH: 'high',              // Respuesta <30 min
  MEDIUM: 'medium',          // Revisión en horas
  LOW: 'low',                // Revisión diaria
};
```

#### Reglas de Alertas

**Críticas (respuesta inmediata)**:
- Sistema caído (uptime 0%)
- Error rate >1% sostenido por 5 minutos
- Fallas en procesamiento de pagos
- Indicadores de security breach
- Corrupción de datos detectada

**Altas (respuesta <30 min)**:
- Degradación de performance (response time >2s)
- Alta utilización de recursos (>80%)
- Errores de integración con servicios externos
- Umbrales de capacidad alcanzados

**Medias (respuesta <2 horas)**:
- Desviaciones de KPIs de negocio
- Errores de validación frecuentes
- Rate limiting activado múltiples veces

**Bajas (revisión diaria)**:
- Errores de negocio ocasionales
- Warnings acumulados
- Performance degradation menor

### 3. Business KPIs (Planeado)

**Ubicación**: `metrics/business-kpis.js`

#### KPIs Monitoreados

**Operaciones**:
```javascript
const KPIS = {
  checkInsPerMinute: {
    threshold: 10,
    alert: 'anomaly_detection',
  },
  whatsappDeliveryRate: {
    threshold: 99, // %
    alert: 'below_threshold',
  },
  apiResponseTime: {
    threshold: 2000, // ms
    alert: 'above_threshold',
  },
  errorRate: {
    threshold: 0.1, // %
    alert: 'above_threshold',
  },
};
```

**Negocio**:
```javascript
const BUSINESS_METRICS = {
  dailyRevenue: {
    trend: 'daily',
    alert: 'anomaly',
  },
  memberRetention: {
    trend: 'monthly',
    alert: 'below_target',
  },
  classOccupancy: {
    trend: 'daily',
    alert: 'below_50_percent',
  },
  paymentCollectionRate: {
    trend: 'weekly',
    alert: 'below_target',
  },
};
```

**Satisfacción**:
```javascript
const SATISFACTION_METRICS = {
  npsScore: {
    calculation: 'rolling_30_days',
    target: 50,
  },
  averageRating: {
    calculation: 'rolling_7_days',
    target: 4.5,
  },
  feedbackResponseRate: {
    calculation: 'daily',
    target: 80, // %
  },
};
```

## Configuración

### Environment Variables

```bash
# Monitoring
MONITORING_ENABLED=true
HEALTH_CHECK_INTERVAL=60000  # 1 minuto
METRICS_RETENTION_DAYS=30

# Alerting
ALERT_WHATSAPP_ADMIN=+1234567890
ALERT_TELEGRAM_CHAT_ID=123456789
ALERT_EMAIL_TO=admin@gym.com
ALERT_WEBHOOK_URL=https://hooks.slack.com/...

# Thresholds
ALERT_ERROR_RATE_THRESHOLD=0.01      # 1%
ALERT_RESPONSE_TIME_THRESHOLD=2000   # 2s
ALERT_MEMORY_USAGE_THRESHOLD=80      # 80%
```

### Integración con Express

```javascript
const express = require('express');
const health = require('./monitoring/health/system-health');

const app = express();

// Health endpoints
app.get('/health', health.healthEndpoint());
app.get('/status', health.statusDashboard());
app.get('/metrics', metricsEndpoint());

// Middleware para tracking de request metrics
app.use(requestMetricsMiddleware());
```

## Dashboards

### 1. System Health Dashboard

Acceder en: `http://localhost:3000/status`

**Características**:
- ✅ Estado general del sistema (semáforo)
- ✅ Métricas de memoria y CPU
- ✅ Estado de servicios individuales
- ✅ Response times
- ✅ Auto-refresh cada 30 segundos

**Vista de Ejemplo**:
```
🏋️ GIM_AI System Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 Status: HEALTHY
Last updated: 2024-01-15 10:30:00
Uptime: 120 minutes

📊 System Metrics
Memory Usage: 85 MB / 512 MB
Uptime: 2 hours
Node Version: v18.0.0

🔧 Services Health
✅ Database: healthy (15ms)
✅ Redis: healthy (5ms)
✅ WhatsApp API: healthy (120ms)
⚠️ n8n: degraded (timeout)
```

### 2. Metrics Dashboard (Planeado)

**Stack Sugerido**:
- Grafana + Prometheus
- O Supabase Dashboard custom
- O Looker Studio

**Métricas a Visualizar**:
- Request rate (rpm)
- Error rate (%)
- Response time (p50, p95, p99)
- Memory usage
- CPU usage
- Active connections
- Queue depths
- Business KPIs

### 3. Alert Dashboard (Planeado)

**Funcionalidades**:
- Lista de alertas activas
- Historial de alertas
- Silenciamiento temporal
- Escalamiento manual
- Runbooks integrados

## Alertas Multicanal

### WhatsApp Alerts

Para administradores, alertas críticas:

```javascript
async function sendWhatsAppAlert(severity, message) {
  if (severity === 'CRITICAL') {
    await whatsapp.send({
      to: process.env.ALERT_WHATSAPP_ADMIN,
      template: 'system_alert',
      params: [message, new Date().toISOString()],
    });
  }
}
```

### Telegram Alerts

Para equipo técnico:

```javascript
async function sendTelegramAlert(severity, message) {
  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
  await bot.sendMessage(
    process.env.ALERT_TELEGRAM_CHAT_ID,
    `🚨 [${severity}] ${message}`
  );
}
```

### Email Alerts

Para resúmenes diarios/semanales:

```javascript
async function sendEmailAlert(subject, body) {
  // Usando servicio como SendGrid, SES, etc.
  await emailService.send({
    to: process.env.ALERT_EMAIL_TO,
    subject,
    body,
  });
}
```

## Detección de Anomalías

### Statistical Anomaly Detection

```javascript
function detectAnomaly(metric, history) {
  const mean = calculateMean(history);
  const stdDev = calculateStdDev(history);
  const threshold = mean + (3 * stdDev); // 3 sigma
  
  return metric > threshold;
}
```

### Pattern Recognition

```javascript
function detectPattern(timeSeries) {
  // Detectar spikes, drops, trends
  const patterns = {
    spike: detectSpike(timeSeries),
    drop: detectDrop(timeSeries),
    uptrend: detectTrend(timeSeries, 'up'),
    downtrend: detectTrend(timeSeries, 'down'),
  };
  
  return patterns;
}
```

## Runbooks

### Runbook: High Error Rate

```markdown
**Trigger**: Error rate >1% for 5+ minutes

**Actions**:
1. Check recent deployments
2. Review error logs for patterns
3. Check external service status
4. Roll back if necessary
5. Scale resources if needed

**Escalation**: After 15 minutes if not resolved
```

### Runbook: Database Slow

```markdown
**Trigger**: DB response time >500ms

**Actions**:
1. Check active connections
2. Identify slow queries
3. Check for locks
4. Scale database if needed
5. Add/update indexes

**Prevention**: Query optimization, caching
```

### Runbook: Memory Leak

```markdown
**Trigger**: Memory usage >80% and increasing

**Actions**:
1. Take heap snapshot
2. Identify memory leak source
3. Restart service if critical
4. Deploy fix
5. Monitor for recurrence

**Prevention**: Memory profiling in staging
```

## Testing

### Load Testing

```bash
# Simular carga
npm run loadtest

# Con Artillery
artillery run tests/performance/load-test.yml
```

### Chaos Engineering

```bash
# Simular fallas de servicios
npm run chaos:database-down
npm run chaos:high-latency
npm run chaos:memory-spike
```

## Métricas de Éxito

### Objetivos de Monitoreo

- ✅ <5 minutos tiempo de detección para problemas críticos
- ✅ <1% tasa de falsos positivos
- ✅ 100% confiabilidad en entrega de alertas
- ✅ <3 segundos carga de dashboards
- ✅ Alertas móviles funcionando

### SLOs (Service Level Objectives)

```javascript
const SLOS = {
  availability: 99.9,      // 99.9% uptime
  errorRate: 0.1,          // <0.1% error rate
  responseTime: 2000,      // <2s p95
  alertDelivery: 99.99,    // 99.99% alert delivery
};
```

## Integration con CI/CD

### GitHub Actions

```yaml
name: Health Check
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
jobs:
  health:
    runs-on: ubuntu-latest
    steps:
      - name: Check System Health
        run: |
          response=$(curl -f http://your-app.com/health || echo "FAIL")
          if [[ $response == "FAIL" ]]; then
            # Send alert
            exit 1
          fi
```

## Próximos Pasos

1. ✅ Implementar health checks básicos
2. ⏳ Añadir checks de servicios externos
3. ⏳ Implementar sistema de alertas
4. ⏳ Configurar dashboards de Grafana
5. ⏳ Implementar business KPIs tracking
6. ⏳ Añadir anomaly detection
7. ⏳ Crear runbooks automatizados
8. ⏳ Implementar chaos engineering

## Referencias

- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [SRE Book - Google](https://sre.google/books/)
- [The Four Golden Signals](https://sre.google/sre-book/monitoring-distributed-systems/)
- [OpenTelemetry](https://opentelemetry.io/)
