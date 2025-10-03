# 🚀 Deployment Guide - Railway (Recomendado)

**Fecha**: Octubre 3, 2025  
**Plataforma**: Railway.app  
**Propósito**: Desplegar GIM_AI en producción con Railway

---

## 🎯 Por Qué Railway

✅ **Ventajas**:
- Setup en 5-10 minutos
- Deploy automático desde GitHub
- PostgreSQL + Redis incluidos
- $5/mes de crédito gratis
- Escala automáticamente
- SSL/TLS automático
- Variables de entorno seguras
- Logs en tiempo real
- Rollback fácil

❌ **Desventajas**:
- Sin tier completamente gratuito (después de créditos)
- Pricing basado en uso (~$10-20/mes típico)

---

## 📋 Prerequisitos

Antes de comenzar:

- [ ] Cuenta en Railway.app: https://railway.app/
- [ ] Código en GitHub (repositorio `eevans-d/GIM_AI`)
- [ ] Variables de entorno preparadas (`.env.production`)
- [ ] Credenciales de APIs obtenidas (Supabase, WhatsApp, Gemini)

---

## 🚀 Proceso de Deployment

### Paso 1: Crear Proyecto en Railway

1. **Login en Railway**:
   ```
   https://railway.app/login
   ```

2. **New Project**:
   - Click "New Project"
   - Seleccionar "Deploy from GitHub repo"
   - Autorizar Railway a acceder a GitHub
   - Seleccionar repositorio: `eevans-d/GIM_AI`
   - Branch: `ci/jest-esm-support` (o `main`)

3. **Railway detectará automáticamente**:
   - Node.js app (por `package.json`)
   - Puerto 3000 (por `index.js`)
   - Scripts de build y start

---

### Paso 2: Configurar Servicios Adicionales

#### 2.1 Agregar PostgreSQL (Opcional - si no usas Supabase)

Si decides usar PostgreSQL de Railway en lugar de Supabase:

1. En tu proyecto, click "New Service"
2. Seleccionar "Database" → "PostgreSQL"
3. Railway proveerá automáticamente `DATABASE_URL`

**Para este proyecto usamos Supabase**, así que **skip este paso**.

#### 2.2 Agregar Redis (Recomendado)

1. En tu proyecto, click "New Service"
2. Seleccionar "Database" → "Redis"
3. Railway proveerá automáticamente:
   - `REDIS_URL`
   - `REDIS_PRIVATE_URL` (para comunicación interna)

4. **Copiar** las variables que aparecen en "Variables" tab

---

### Paso 3: Configurar Variables de Entorno

1. **Ir a tu servicio** (el de Node.js)
2. Click en **"Variables"** tab
3. Click **"Add Variable"**

#### Variables Críticas (copiar de `.env.production`):

```bash
# General
NODE_ENV=production
PORT=3000
APP_NAME=GIM_AI
APP_URL=${{RAILWAY_STATIC_URL}}  # Railway auto-provee esto
APP_BASE_URL=${{RAILWAY_STATIC_URL}}

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# WhatsApp Business API
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098765
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_WEBHOOK_VERIFY_TOKEN=gim_ai_webhook_2025
WHATSAPP_WEBHOOK_SECRET=e619ba7d5569ff896e33748bb3da380ae9a7ae6d4e4c8c1e7f5f73e559036a29
WHATSAPP_MAX_MESSAGES_PER_DAY=2
WHATSAPP_HOURLY_WINDOW_START=9
WHATSAPP_HOURLY_WINDOW_END=21

# Redis (auto-provisto por Railway si agregaste el servicio)
REDIS_URL=${{Redis.REDIS_URL}}  # Variable de Railway
REDIS_TLS=true

# Google Gemini AI
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
GEMINI_MODEL=gemini-1.5-flash
GEMINI_MAX_TOKENS=1000
GEMINI_TEMPERATURE=0.7

# Security
JWT_SECRET=GyBs+WtkqGdTUcNXQeeNfEcIV4+2JaujVwK7bL0aEAaE=
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# MercadoPago (opcional)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxx
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxxxxxxxxxx

# n8n Workflows (opcional)
N8N_WEBHOOK_BASE_URL=https://your-n8n-instance.app
N8N_WEBHOOK_COLLECTION=https://your-n8n-instance.app/webhook/collection-sequence
N8N_WEBHOOK_REMINDER=https://your-n8n-instance.app/webhook/class-reminder
N8N_WEBHOOK_SURVEY=https://your-n8n-instance.app/webhook/post-class-survey

# Sentry (opcional pero recomendado)
SENTRY_DSN=https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# Logging
LOG_LEVEL=info
LOG_FILE_ENABLED=true

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Feature Flags
ENABLE_WEBHOOKS=true
ENABLE_OAUTH2=true
ENABLE_API_MONETIZATION=true
ENABLE_AI_FEATURES=true
ENABLE_CHURN_PREDICTION=true
ENABLE_SMART_RECOMMENDATIONS=true
```

**Tip**: Railway permite **bulk import** de variables. Click en "Raw Editor" y pega todo el bloque.

---

### Paso 4: Configurar Build & Deploy

#### 4.1 Verificar Scripts en package.json

Railway ejecutará automáticamente:

```json
{
  "scripts": {
    "start": "node index.js",
    "build": "echo 'No build required'"
  }
}
```

Si necesitas instalar dependencias o compilar:

```json
{
  "scripts": {
    "build": "npm install --production",
    "start": "node index.js"
  }
}
```

#### 4.2 Configurar Puerto

Railway asigna un puerto dinámico. Nuestro `index.js` ya lo maneja:

```javascript
const PORT = process.env.PORT || 3000;
```

✅ **No se requiere cambio**.

#### 4.3 Configurar Healthcheck (Opcional)

En Railway dashboard, "Settings" → "Health Check":

- **Health Check Path**: `/health`
- **Health Check Timeout**: 30 seconds
- **Health Check Interval**: 60 seconds

Esto reiniciará automáticamente el servicio si falla el health check.

---

### Paso 5: Deploy Inicial

1. **Railway detecta cambios automáticamente** cuando haces push a GitHub
2. Click **"Deploy"** si no se inició automáticamente
3. Ver logs en tiempo real: Tab "Deployments" → Click en el deployment activo

#### Logs a Observar:

```bash
✅ Installing dependencies... 
✅ Running build script...
✅ Starting application...
✅ Server listening on port 3000
✅ Database connected
✅ Redis connected
✅ WhatsApp client initialized
```

#### Si hay errores:

```bash
❌ Error: SUPABASE_URL is not defined
```

→ Revisar variables de entorno en tab "Variables"

---

### Paso 6: Verificar Deployment

#### 6.1 Obtener URL Pública

Railway provee automáticamente una URL:

```
https://gim-ai-production.up.railway.app
```

Encontrarla en: **Settings** → **Domains** → **Generate Domain**

#### 6.2 Test de Health Check

```bash
curl https://gim-ai-production.up.railway.app/health

# Response esperado:
{
  "status": "healthy",
  "timestamp": "2025-10-03T15:30:00.000Z",
  "uptime": 123456,
  "checks": {
    "database": { "status": "healthy", "responseTime": 45 },
    "redis": { "status": "healthy", "responseTime": 12 },
    "whatsapp": { "status": "healthy", "responseTime": 230 }
  }
}
```

#### 6.3 Test de API Endpoints

```bash
# Test de API público
curl https://gim-ai-production.up.railway.app/api/v1/health

# Test de webhook WhatsApp (verificación)
curl "https://gim-ai-production.up.railway.app/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=gim_ai_webhook_2025&hub.challenge=TEST123"

# Response esperado: TEST123
```

---

### Paso 7: Configurar Webhook de WhatsApp

Ahora que tienes URL pública:

1. **Ir a Meta Developer Console**:
   ```
   https://developers.facebook.com/apps/
   ```

2. **Seleccionar tu app** → WhatsApp → Configuration

3. **Configurar Webhook**:
   - **Callback URL**: `https://gim-ai-production.up.railway.app/whatsapp/webhook`
   - **Verify Token**: `gim_ai_webhook_2025`

4. **Click "Verify and Save"**

5. **Suscribirse a eventos**:
   - ✅ messages
   - ✅ message_status

6. **Verificar**:
   - Si ves ✅ verde, webhook configurado correctamente
   - Si ves ❌ rojo, revisar logs de Railway

---

### Paso 8: Custom Domain (Opcional)

Si tienes un dominio propio (ej: `api.gimapp.com`):

1. En Railway → **Settings** → **Domains**
2. Click **"Custom Domain"**
3. Ingresar: `api.gimapp.com`
4. Railway proveerá **CNAME record**
5. En tu proveedor de DNS (Cloudflare, GoDaddy, etc.):
   - Agregar CNAME: `api` → `gim-ai-production.up.railway.app`
6. Esperar propagación DNS (5-30 min)

**SSL/TLS**: Railway provee automáticamente certificados Let's Encrypt.

---

### Paso 9: Configurar Deploys Automáticos

Railway ya configura CI/CD automático desde GitHub:

- **Push a branch** → Deploy automático
- **Pull Request** → Preview deployment (ambiente temporal)
- **Merge a main** → Deploy a producción

#### Configurar Branch de Producción:

1. Railway → **Settings** → **Service**
2. **Source** → Seleccionar branch: `main` o `ci/jest-esm-support`
3. **Auto Deploy**: Activado ✅

---

## 🔄 Rollback Strategy

Si algo sale mal:

### Opción 1: Rollback desde Railway Dashboard

1. **Deployments** tab
2. Buscar deployment anterior (working)
3. Click **"⋯"** → **"Redeploy"**
4. Confirmación → Instant rollback

### Opción 2: Rollback desde Git

```bash
# Ver últimos commits
git log --oneline -10

# Revertir a commit anterior
git revert HEAD

# Push
git push origin ci/jest-esm-support
```

Railway detectará el cambio y deployará automáticamente.

---

## 📊 Monitoring en Railway

### Logs en Tiempo Real

1. **Deployments** tab → Click en deployment activo
2. Ver logs en tiempo real:
   ```
   2025-10-03 15:30:45 | INFO | Server started on port 3000
   2025-10-03 15:30:46 | INFO | Database connected
   2025-10-03 15:31:12 | INFO | Message sent to +5491112345678
   ```

### Métricas Disponibles

Railway Dashboard muestra:
- **CPU Usage**
- **Memory Usage**
- **Network Traffic**
- **Request Count**
- **Response Times**

### Alertas (Opcional - Railway Pro)

Configurar alertas para:
- CPU > 80%
- Memory > 90%
- Deployment failures
- Health check failures

---

## 💰 Costos Estimados

Railway pricing basado en uso:

### Recursos Típicos para GIM_AI:

- **Compute (Node.js app)**: $5-10/mes
- **Redis**: $2-5/mes
- **Network (egress)**: $1-3/mes
- **Total**: **~$8-18/mes**

### Crédito Gratuito:

Railway provee **$5/mes gratis** para el plan Hobby.

**Costo real estimado**: **$3-13/mes**

### Escalar según Crecimiento:

| Miembros | Requests/día | Costo/mes |
|----------|--------------|-----------|
| 50       | ~500         | $8-12     |
| 200      | ~2,000       | $15-25    |
| 500      | ~5,000       | $30-50    |

---

## 🔧 Troubleshooting

### Error: "Application failed to start"

**Causa**: Puerto incorrecto o falta variable de entorno

**Solución**:
```javascript
// Verificar en index.js:
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
```

### Error: "Cannot connect to database"

**Causa**: SUPABASE_URL o SERVICE_ROLE_KEY incorrectos

**Solución**:
1. Verificar variables en Railway
2. Test de conexión:
   ```bash
   node -e "const {createClient} = require('@supabase/supabase-js'); console.log(createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY))"
   ```

### Error: "Webhook verification failed"

**Causa**: WHATSAPP_WEBHOOK_VERIFY_TOKEN no coincide

**Solución**:
1. Verificar variable en Railway
2. Verificar token en Meta Developer Console
3. Deben ser idénticos

### Error: "Out of memory"

**Causa**: App consume mucha RAM

**Solución**:
1. Railway → Settings → Resources
2. Aumentar memoria (plan Pro permite hasta 8GB)
3. O optimizar código (reducir carga en memoria)

---

## ✅ Checklist Post-Deployment

Después del primer deploy:

- [ ] Health check respondiendo (200 OK)
- [ ] Logs sin errores críticos
- [ ] Conexión a Supabase funcionando
- [ ] Conexión a Redis funcionando
- [ ] WhatsApp webhook verificado en Meta
- [ ] Test de envío de mensaje (template)
- [ ] API endpoints respondiendo
- [ ] Sentry recibiendo eventos (si configurado)
- [ ] Custom domain funcionando (si configurado)
- [ ] Rate limiting activo
- [ ] Logs de seguridad ok (no errores de autenticación)

---

## 🔗 Enlaces Útiles

- **Railway Dashboard**: https://railway.app/dashboard
- **Railway Docs**: https://docs.railway.app/
- **Railway Status**: https://status.railway.app/
- **Railway Discord**: https://discord.gg/railway
- **Pricing**: https://railway.app/pricing

---

## 📝 Comandos Útiles

```bash
# Ver logs en tiempo real (desde CLI si instalas Railway CLI)
railway logs --follow

# SSH al container (útil para debugging)
railway shell

# Ver variables de entorno
railway variables

# Ejecutar comando en producción
railway run node scripts/validate-production-config.js
```

---

## 🚀 Próximos Pasos

Después del deployment exitoso:

1. ✅ Configurar Sentry (error tracking) - Ver `docs/SENTRY_SETUP.md`
2. ✅ Configurar UptimeRobot (monitoring) - Ver `docs/UPTIMEROBOT_SETUP.md`
3. ✅ Ejecutar tests E2E en producción - BLOQUE 6
4. ✅ Configurar backups automáticos
5. ✅ Documentar proceso para equipo

---

**Última actualización**: Octubre 3, 2025  
**Tiempo estimado de deployment**: 30-45 minutos  
**Dificultad**: 🟢 Fácil (con esta guía)
