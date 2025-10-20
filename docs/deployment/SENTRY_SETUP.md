# 🐛 Sentry Setup - Error Tracking & Performance Monitoring

**Fecha**: Octubre 3, 2025  
**Propósito**: Configurar Sentry para tracking de errores y performance en producción

---

## 🎯 Por Qué Sentry

✅ **Beneficios**:
- Error tracking en tiempo real
- Stack traces completos
- Performance monitoring (APM)
- Release tracking
- Source maps para debug
- Alertas configurables
- Integración con Slack/Email
- Dashboard con métricas
- **Plan gratuito**: 5,000 eventos/mes

---

## 📋 Paso 1: Crear Cuenta y Proyecto

### 1.1 Sign Up en Sentry

1. Ir a: https://sentry.io/signup/
2. Crear cuenta (email o GitHub)
3. Plan: **Developer** (gratis, 5k eventos/mes)

### 1.2 Crear Proyecto

1. Click **"Create Project"**
2. **Platform**: Node.js (Express)
3. **Alert Frequency**: Default
4. **Project Name**: `gim-ai-production`
5. **Team**: Default
6. Click **"Create Project"**

### 1.3 Obtener DSN

Sentry mostrará tu **DSN** (Data Source Name):

```
https://1234567890abcdef1234567890abcdef@o123456.ingest.sentry.io/7654321
```

**Guardar** este DSN, lo necesitarás para configuración.

---

## 📦 Paso 2: Instalar Sentry SDK

### 2.1 Instalar Dependencias

```bash
npm install @sentry/node @sentry/profiling-node --save
```

### 2.2 Verificar package.json

```json
{
  "dependencies": {
    "@sentry/node": "^7.100.0",
    "@sentry/profiling-node": "^1.3.0"
  }
}
```

---

## ⚙️ Paso 3: Configurar Sentry en la Aplicación

### 3.1 Crear Archivo de Configuración

Crear `config/sentry.config.js`:

```javascript
/**
 * Sentry Configuration for Error Tracking
 */

const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

/**
 * Initialize Sentry
 */
function initSentry(app) {
  if (!process.env.SENTRY_DSN) {
    console.warn('⚠️  SENTRY_DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',
    
    // Release tracking
    release: process.env.RAILWAY_GIT_COMMIT_SHA || 'development',
    
    // Performance Monitoring
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
    
    // Integrations
    integrations: [
      // HTTP integration
      new Sentry.Integrations.Http({ tracing: true }),
      
      // Express integration
      new Sentry.Integrations.Express({ app }),
      
      // Profiling
      new ProfilingIntegration(),
    ],
    
    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }
      
      // Remove sensitive query params
      if (event.request?.query_string) {
        event.request.query_string = event.request.query_string
          .replace(/token=[^&]+/gi, 'token=REDACTED')
          .replace(/key=[^&]+/gi, 'key=REDACTED');
      }
      
      return event;
    },
    
    // Ignore specific errors
    ignoreErrors: [
      // Browser-specific errors
      'Non-Error promise rejection captured',
      // Network errors
      'NetworkError',
      'Network request failed',
      // Expected validation errors
      'ValidationError',
    ],
  });

  console.log('✅ Sentry initialized:', {
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1',
  });
}

/**
 * Capture exception manually
 */
function captureException(error, context = {}) {
  Sentry.captureException(error, {
    tags: context.tags,
    extra: context.extra,
    user: context.user,
    level: context.level || 'error',
  });
}

/**
 * Capture message manually
 */
function captureMessage(message, level = 'info', context = {}) {
  Sentry.captureMessage(message, {
    level,
    tags: context.tags,
    extra: context.extra,
  });
}

/**
 * Set user context
 */
function setUser(user) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

/**
 * Add breadcrumb
 */
function addBreadcrumb(breadcrumb) {
  Sentry.addBreadcrumb(breadcrumb);
}

module.exports = {
  Sentry,
  initSentry,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
};
```

### 3.2 Integrar en index.js

Modificar `index.js` para incluir Sentry **al inicio**:

```javascript
/**
 * GIM_AI - Main Application Entry Point
 */

require('dotenv').config();
const express = require('express');
const { initSentry, Sentry } = require('./config/sentry.config');

const app = express();

// ⚠️ Sentry DEBE ser inicializado ANTES de cualquier middleware
initSentry(app);

// Sentry request handler (PRIMERO)
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// ... resto de middlewares
app.use(express.json());
// ... tus rutas

// Sentry error handler (ÚLTIMO middleware, antes de error handler general)
app.use(Sentry.Handlers.errorHandler());

// Tu error handler general
app.use((err, req, res, next) => {
  // Sentry ya capturó el error arriba
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
```

---

## 🔐 Paso 4: Configurar Variables de Entorno

### En Railway/Render:

```bash
SENTRY_DSN=https://1234567890abcdef1234567890abcdef@o123456.ingest.sentry.io/7654321
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

### Explicación:

- **SENTRY_DSN**: URL de tu proyecto (obtenido en Paso 1.3)
- **SENTRY_ENVIRONMENT**: `production`, `staging`, `development`
- **SENTRY_TRACES_SAMPLE_RATE**: % de requests a monitorear (0.1 = 10%)
- **SENTRY_PROFILES_SAMPLE_RATE**: % de profiles a capturar (0.1 = 10%)

**Nota**: 10% es suficiente para producción. 100% puede ser costoso en plan gratis.

---

## 📊 Paso 5: Usar Sentry en el Código

### 5.1 Capturar Errores Manualmente

```javascript
const { captureException } = require('./config/sentry.config');

try {
  await riskyOperation();
} catch (error) {
  captureException(error, {
    tags: { operation: 'payment', user_id: member.id },
    extra: { amount: payment.amount, currency: 'ARS' },
    level: 'error',
  });
  
  throw error; // Re-throw si es necesario
}
```

### 5.2 Capturar Mensajes

```javascript
const { captureMessage } = require('./config/sentry.config');

// Evento importante pero no error
captureMessage('High debt payment received', 'info', {
  tags: { feature: 'contextual-collection' },
  extra: { member_id: member.id, amount: 5000 },
});
```

### 5.3 Agregar Breadcrumbs

```javascript
const { addBreadcrumb } = require('./config/sentry.config');

// Dejar rastro de eventos antes de un error
addBreadcrumb({
  category: 'whatsapp',
  message: 'Sending template message',
  level: 'info',
  data: {
    template: 'debt_post_workout',
    recipient: '+5491112345678',
  },
});
```

### 5.4 Set User Context

```javascript
const { setUser } = require('./config/sentry.config');

// En middleware de autenticación
app.use((req, res, next) => {
  if (req.user) {
    setUser({
      id: req.user.id,
      email: req.user.email,
      username: req.user.username,
    });
  }
  next();
});
```

---

## 🎨 Paso 6: Configurar Alertas

### 6.1 Email Alerts

1. Sentry → **Settings** → **Alerts**
2. Click **"Create Alert Rule"**
3. **Conditions**:
   - Error is first seen (nueva tipo de error)
   - Error count > 10 in 1 hour
   - Users affected > 5 in 1 day
4. **Actions**: Send email to team
5. **Save Rule**

### 6.2 Slack Integration (Opcional)

1. Sentry → **Settings** → **Integrations**
2. Buscar **Slack**
3. Click **"Install"**
4. Autorizar workspace de Slack
5. Configurar:
   - Canal: `#gim-ai-alerts`
   - Eventos: Errors, Releases, Deploys

### 6.3 Alert Rules Recomendadas

**Rule 1: Critical Errors**
```
Condition: error.level = "fatal" OR error.level = "critical"
Action: Email + Slack immediately
```

**Rule 2: High Error Rate**
```
Condition: error_count > 50 in 1 hour
Action: Email team
```

**Rule 3: New Error Type**
```
Condition: error is first seen
Action: Slack notification
```

---

## 📈 Paso 7: Dashboard y Métricas

### 7.1 Sentry Dashboard

Ir a: https://sentry.io/organizations/{org}/projects/{project}/

**Métricas Disponibles**:
- **Errors**: Total de errores capturados
- **Users Affected**: Cuántos usuarios experimentaron errores
- **Transactions**: Performance de requests
- **Releases**: Comparar errores entre releases
- **Performance**: p50, p75, p95, p99 latencies

### 7.2 Custom Dashboards

Crear dashboard personalizado:

1. Sentry → **Dashboards** → **Create Dashboard**
2. Agregar widgets:
   - **Error Rate** (line chart)
   - **Top Errors** (table)
   - **Users Affected** (bar chart)
   - **Performance by Endpoint** (table)

### 7.3 Releases & Deploy Tracking

Configurar en Railway:

```bash
# En Railway, agregar variable:
RAILWAY_GIT_COMMIT_SHA=${{RAILWAY_GIT_COMMIT_SHA}}
```

Sentry usará esto automáticamente para tracking de releases.

---

## 🧪 Paso 8: Testing de Sentry

### 8.1 Test Manual

```javascript
// En cualquier endpoint de test
app.get('/sentry-test', (req, res) => {
  throw new Error('Test error from Sentry');
});
```

Visitar: `https://tu-app.railway.app/sentry-test`

Verificar en Sentry que el error aparece.

### 8.2 Test con Script

```bash
node -e "const Sentry = require('@sentry/node'); Sentry.init({ dsn: process.env.SENTRY_DSN }); Sentry.captureMessage('Test from CLI'); setTimeout(() => console.log('Sent!'), 2000);"
```

---

## 📊 Métricas y Limits del Plan Gratuito

**Developer Plan** (gratuito):
- ✅ 5,000 errors/mes
- ✅ 10,000 performance units/mes
- ✅ 1 proyecto
- ✅ 1 miembro del equipo
- ✅ 30 días de retención
- ✅ Email alerts
- ❌ Slack (requiere Team plan)

**Si excedes 5,000 errores/mes**:
- Sentry continuará funcionando
- Pero dejará de capturar nuevos errores hasta el próximo mes
- O upgrade a plan Team ($26/mes)

**Optimización**:
- Usar `ignoreErrors` para filtrar ruido
- Ajustar `tracesSampleRate` (default 0.1 = 10%)
- Filtrar errores de desarrollo/test

---

## 🔧 Troubleshooting

### Error: "Sentry is not capturing errors"

**Solución**:
1. Verificar `SENTRY_DSN` configurado
2. Verificar Sentry se inicializa ANTES de routes
3. Verificar error handler está al final
4. Test manual: `throw new Error('Test')`

### Error: "Too many events sent"

**Solución**:
1. Reducir `tracesSampleRate` a 0.05 (5%)
2. Agregar más errores a `ignoreErrors`
3. Filtrar environments de desarrollo

### Warning: "Source maps not found"

**Solución** (si usas TypeScript o build):
```javascript
// En sentry.config.js
Sentry.init({
  // ...
  integrations: [
    new Sentry.Integrations.RewriteFrames({
      root: global.__dirname,
    }),
  ],
});
```

---

## ✅ Checklist de Configuración

- [ ] Cuenta Sentry creada
- [ ] Proyecto creado
- [ ] DSN obtenido
- [ ] `@sentry/node` instalado
- [ ] `config/sentry.config.js` creado
- [ ] Sentry integrado en `index.js`
- [ ] Variables de entorno configuradas en Railway
- [ ] Test de error exitoso
- [ ] Error aparece en Sentry dashboard
- [ ] Alerts configuradas
- [ ] Slack integrado (opcional)
- [ ] Release tracking funcionando

---

## 📚 Recursos

- **Docs**: https://docs.sentry.io/platforms/node/
- **Express Guide**: https://docs.sentry.io/platforms/node/guides/express/
- **Performance**: https://docs.sentry.io/platforms/node/performance/
- **Releases**: https://docs.sentry.io/product/releases/
- **Alerts**: https://docs.sentry.io/product/alerts/

---

**Última actualización**: Octubre 3, 2025  
**Tiempo de setup**: 15-20 minutos  
**Costo**: Gratis (hasta 5k errores/mes)
