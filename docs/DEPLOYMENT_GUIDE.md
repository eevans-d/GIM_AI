# 🚀 GIM_AI - Guía Completa de Deployment a Producción

**Fecha**: Octubre 3, 2025  
**Versión**: 1.0.0  
**Tiempo estimado**: 2-3 horas (primera vez)

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Pre-requisitos](#pre-requisitos)
3. [Comparación de Plataformas](#comparación-de-plataformas)
4. [Deployment en Railway (Recomendado)](#deployment-en-railway)
5. [Deployment en Render (Alternativa)](#deployment-en-render)
6. [Configuración de Monitoring](#configuración-de-monitoring)
7. [Post-Deployment](#post-deployment)
8. [Rollback y Recovery](#rollback-y-recovery)
9. [Maintenance](#maintenance)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Resumen Ejecutivo

### Stack Tecnológico

```
Frontend: React (dashboard, instructor-panel, qr-checkin)
Backend: Node.js + Express
Database: PostgreSQL (Supabase)
Cache: Redis
Messaging: WhatsApp Business Cloud API
AI: Google Gemini
Workflows: n8n
Monitoring: Sentry + UptimeRobot
```

### Arquitectura de Deployment

```
GitHub Repository
    ↓ (auto-deploy on push to main)
Railway/Render Platform
    ├── Node.js App (Express API)
    ├── PostgreSQL (Supabase hosted)
    ├── Redis (Platform-provided)
    └── Public URL: https://your-app.railway.app
         ↓
External Services:
    ├── WhatsApp Business API
    ├── Supabase (PostgreSQL + Storage)
    ├── Google Gemini AI
    ├── n8n Workflows
    └── Monitoring (Sentry + UptimeRobot)
```

### Costo Mensual Estimado

| Componente | Costo | Plan |
|------------|-------|------|
| Railway | $8-18 | Hobby |
| Render | $0-7 | Free/Starter |
| Supabase | $0 | Free (500MB, 2GB transfer) |
| WhatsApp | $0 | Free (1,000 conversaciones/mes) |
| Sentry | $0 | Free (5,000 eventos/mes) |
| UptimeRobot | $0 | Free (50 monitors) |
| Gemini AI | $0 | Free tier |
| **TOTAL** | **$8-18** | **MVP completo** |

---

## ✅ Pre-requisitos

### 1. Credenciales de Servicios

Antes de comenzar, necesitas obtener credenciales de:

- [x] **Supabase**: URL, ANON_KEY, SERVICE_ROLE_KEY
- [x] **WhatsApp Business**: PHONE_NUMBER_ID, ACCESS_TOKEN, VERIFY_TOKEN
- [x] **Google Gemini**: API_KEY
- [x] **Redis**: URL (o será provisto por Railway/Render)
- [x] **n8n**: URL de instancia (si es externa)

📖 **Guía completa**: Ver `docs/GUIA_CREDENCIALES_PRODUCCION.md`

### 2. Configuración Local

```bash
# Clonar repositorio
git clone https://github.com/eevans-d/GIM_AI.git
cd GIM_AI

# Instalar dependencias
npm install

# Configurar environment variables
cp .env.example .env.production
nano .env.production  # Editar con tus credenciales

# Validar configuración
node scripts/validate-production-config.js
```

### 3. Database Migrations

```bash
# Conectar a Supabase
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-key"

# Ejecutar migrations
./scripts/migrate-production-db.sh

# Verificar tablas creadas
psql $DATABASE_URL -c "\dt"
```

### 4. WhatsApp Templates Aprobados

**CRÍTICO**: Debes crear y obtener aprobación de Meta para los 23 templates de WhatsApp.

📖 **Guía completa**: Ver `docs/WHATSAPP_TEMPLATES_SPECS.md`

**Tiempo estimado**: 1.5-2 horas + 24-48h aprobación de Meta

---

## 📊 Comparación de Plataformas

### Railway vs Render vs Vercel

| Feature | Railway | Render | Vercel |
|---------|---------|--------|--------|
| **Costo inicial** | $5/mes crédito | Free tier | Free tier |
| **Costo típico** | $8-18/mes | $0-7/mes | $0-20/mes |
| **PostgreSQL** | ✅ Add-on | ✅ Incluido | ❌ External |
| **Redis** | ✅ Add-on | ✅ Add-on | ❌ External |
| **Auto-deploy** | ✅ GitHub | ✅ GitHub | ✅ GitHub |
| **SSL/TLS** | ✅ Automático | ✅ Automático | ✅ Automático |
| **Rollback** | ✅ 1-click | ✅ Manual | ✅ 1-click |
| **Logs** | ✅ Real-time | ✅ Real-time | ✅ Real-time |
| **Custom domain** | ✅ Gratis | ✅ Gratis | ✅ Gratis |
| **Escalado** | ✅ Automático | 🟡 Manual | ✅ Automático |
| **Background jobs** | ✅ Sí | ✅ Sí | 🟡 Limitado |
| **CLI** | ✅ Excelente | ✅ Buena | ✅ Excelente |

### Decisión: ¿Cuál Elegir?

#### Elige **Railway** si:
- ✅ Quieres setup más rápido (5-10 min)
- ✅ Prefieres todo en un solo lugar (app + DB + Redis)
- ✅ Necesitas escalado automático
- ✅ Budget permite $10-15/mes

#### Elige **Render** si:
- ✅ Budget muy ajustado (free tier disponible)
- ✅ No te importa configuración manual
- ✅ Tráfico bajo (<100 requests/min)
- ✅ Puedes tolerar cold starts (free tier)

#### Elige **Vercel** si:
- ✅ Solo necesitas frontend + API routes serverless
- ✅ No necesitas long-running processes
- ✅ DB y Redis son externos (Supabase, Upstash)

**Recomendación para GIM_AI**: **Railway** por simplicidad y features completas.

---

## 🚂 Deployment en Railway

### Guía Detallada Completa

📖 **Ver guía paso a paso**: `docs/DEPLOYMENT_RAILWAY.md` (550+ líneas)

### Resumen Ejecutivo (10 pasos):

#### 1. Crear Proyecto en Railway

1. Ir a: https://railway.app
2. **New Project** → **Deploy from GitHub repo**
3. Seleccionar: `eevans-d/GIM_AI`
4. Branch: `main`

#### 2. Agregar Redis Service

1. **New** → **Database** → **Redis**
2. Railway auto-genera `REDIS_URL`

#### 3. Configurar Environment Variables

Railway Dashboard → Variables:

```bash
# Copiar de .env.production
NODE_ENV=production
PORT=${{PORT}}  # Railway auto-provisiona
APP_URL=${{RAILWAY_STATIC_URL}}

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_ACCESS_TOKEN=EAAG...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=gim_ai_webhook_2025
WHATSAPP_WEBHOOK_SECRET=tu-secret-generado

# Redis
REDIS_URL=${{Redis.REDIS_URL}}  # Referencia a Redis service
REDIS_TLS_ENABLED=true

# ... 30+ variables más (ver DEPLOYMENT_RAILWAY.md)
```

**Tip**: Usar bulk import desde `.env.production`

#### 4. Deploy

Railway auto-detecta `package.json` y ejecuta:

```bash
npm ci
npm start  # O comando configurado en package.json
```

**Tiempo de deploy**: 2-3 minutos

#### 5. Verificar

```bash
# Health check
curl https://gim-ai-production.up.railway.app/health

# Debe retornar:
{
  "status": "healthy",
  "uptime": 123,
  "timestamp": "2025-10-03T...",
  "services": {
    "database": { "status": "healthy" },
    "redis": { "status": "healthy" },
    "whatsapp": { "status": "healthy" }
  }
}
```

#### 6. Configurar WhatsApp Webhook

En Meta Business Suite:

```
Callback URL: https://gim-ai-production.up.railway.app/whatsapp/webhook
Verify Token: gim_ai_webhook_2025
```

#### 7. Custom Domain (Opcional)

Railway → Settings → Domains:

```
Add domain: app.gimapp.com
Configure DNS CNAME: Railway proporciona valor
```

#### 8. Auto-Deploy desde GitHub

Railway auto-detecta pushes a `main`:

```bash
git push origin main
# Railway auto-deploys en 2-3 minutos
```

#### 9. Monitoring

- **Logs**: Railway Dashboard → Logs tab
- **Metrics**: CPU, Memory, Network en Metrics tab
- **Alerts**: Configurar en Settings

#### 10. Rollback (si es necesario)

Railway Dashboard → Deployments → Click deployment anterior → **Redeploy**

---

## 🎨 Deployment en Render

### Guía Paso a Paso

#### 1. Crear Web Service

1. Ir a: https://render.com
2. **New** → **Web Service**
3. **Connect repository**: `eevans-d/GIM_AI`
4. **Name**: `gim-ai-production`
5. **Environment**: `Node`
6. **Build Command**: `npm ci`
7. **Start Command**: `npm start`

#### 2. Agregar Redis

1. **New** → **Redis**
2. **Name**: `gim-ai-redis`
3. **Plan**: Free (25MB) o Starter ($10/mes, 256MB)
4. Obtener `REDIS_URL` de dashboard

#### 3. Environment Variables

En Web Service → Environment:

```bash
NODE_ENV=production
# ... todas las variables de .env.production

# Redis URL de Render Redis service
REDIS_URL=redis://red-xxxx:6379
```

#### 4. Deploy

Render auto-deploya al detectar push a `main`.

#### 5. Custom Domain

Render → Settings → Custom Domain:

```
app.gimapp.com → Configure CNAME
```

### Diferencias vs Railway:

| Feature | Railway | Render |
|---------|---------|--------|
| Setup | Más rápido | Más manual |
| Free tier | $5 crédito | Sí (con cold starts) |
| Redis | Click para agregar | Service separado |
| Logs | Mejor UI | Más básico |
| CLI | Excelente | Buena |

---

## 📡 Configuración de Monitoring

### 1. Sentry - Error Tracking

📖 **Guía completa**: `docs/SENTRY_SETUP.md` (500+ líneas)

**Resumen**:

```bash
# 1. Install SDK
npm install @sentry/node @sentry/profiling-node

# 2. Configurar (ya hecho en proyecto)
# Ver: config/sentry.config.js

# 3. Agregar SENTRY_DSN a env vars
SENTRY_DSN=https://xxxxx@o123456.ingest.sentry.io/123456
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# 4. Deploy - Sentry captura errores automáticamente
```

**Dashboard**: https://sentry.io/organizations/your-org/issues/

### 2. UptimeRobot - Uptime Monitoring

📖 **Guía completa**: `docs/UPTIMEROBOT_SETUP.md` (450+ líneas)

**Resumen**:

```bash
# 1. Crear cuenta en https://uptimerobot.com
# 2. Crear monitors:
#    - Health Check: /health
#    - WhatsApp Webhook: /whatsapp/webhook
#    - API Status: /api/v1/health
#    - SSL Certificate monitoring
# 3. Configurar alertas (email, Slack, SMS)
# 4. Crear status page público
```

**Status Page**: `https://stats.uptimerobot.com/your-status-page`

### 3. Railway/Render Metrics

**Built-in metrics**:
- CPU usage (%)
- Memory usage (MB)
- Network traffic (MB/s)
- Request count
- Response times

**Acceso**: Platform Dashboard → Metrics tab

### 4. Centralized Logging

**Tools**:
- Railway/Render: Built-in logs (7-30 días retention)
- External: Logtail, Papertrail (opcional)

**Winston logs** ya configurado en proyecto con:
- Daily rotation
- Error levels
- Correlation IDs
- Sensitive data masking

---

## ✅ Post-Deployment

### Checklist de Verificación

#### 1. Health Checks

```bash
# Sistema general
curl https://your-app.railway.app/health | jq

# API endpoints
curl https://your-app.railway.app/api/v1/health | jq

# WhatsApp webhook
curl "https://your-app.railway.app/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=TEST"
```

**Todos deben retornar status 200**.

#### 2. Database Connectivity

```bash
# Test desde app
curl https://your-app.railway.app/api/v1/members?limit=1

# Debe retornar datos (o array vacío si no hay members)
```

#### 3. Redis Connectivity

```bash
# Check logs para confirmar conexión
railway logs --filter "Redis"

# Debe ver: "Redis connected successfully"
```

#### 4. WhatsApp Integration

```bash
# Test webhook delivery
node scripts/test-whatsapp-webhook.js

# Verificar en Meta Business Suite que webhook está "Verified"
```

#### 5. Monitoring Activo

- [ ] Sentry capturando errores (enviar test: `sentry-cli send-event`)
- [ ] UptimeRobot monitors en verde
- [ ] Railway metrics mostrando datos
- [ ] Logs fluyendo correctamente

#### 6. Security

```bash
# SSL/TLS válido
curl -I https://your-app.railway.app | grep -i "HTTP/2 200"

# Security headers
curl -I https://your-app.railway.app | grep -E "(X-|Strict-Transport)"

# Rate limiting funcionando
for i in {1..20}; do curl https://your-app.railway.app/health; done
# Debe eventualmente retornar 429 Too Many Requests
```

#### 7. Performance

```bash
# Response times
ab -n 100 -c 10 https://your-app.railway.app/health

# Target: p95 < 500ms
```

### Configuración de Backups

#### 1. Database Backups (Supabase)

Supabase hace backups automáticos:
- **Free tier**: Daily backups (7 días retention)
- **Pro tier**: Point-in-time recovery

**Manual backup**:

```bash
# Export desde Supabase dashboard
# O usar pg_dump:
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

#### 2. Environment Variables Backup

```bash
# Exportar env vars de Railway
railway variables > env-backup-$(date +%Y%m%d).txt

# Guardar en lugar seguro (1Password, BitWarden)
```

#### 3. Code Backups

```bash
# Git tags para releases
git tag -a v1.0.0 -m "Production release 1.0.0"
git push origin v1.0.0
```

---

## 🔄 Rollback y Recovery

### Rollback en Railway

#### Opción 1: Railway Dashboard (Recomendado)

1. Dashboard → Deployments
2. Click en deployment anterior exitoso
3. **Redeploy** → Confirmar

**Tiempo**: 2-3 minutos

#### Opción 2: Git Revert + Push

```bash
# Identificar commit problemático
git log --oneline

# Revert
git revert <commit-hash>
git push origin main

# Railway auto-deploya version revertida
```

**Tiempo**: 3-5 minutos

### Rollback en Render

1. Dashboard → Deployments
2. Click deployment anterior
3. **Manual Deploy** desde ese commit

### Recovery Procedures

#### Database Corruption

```bash
# Restaurar desde backup
psql $DATABASE_URL < backup-20251003.sql

# Verificar data integrity
node scripts/verify-database.js
```

#### Redis Cache Issues

```bash
# Flush Redis cache
redis-cli -u $REDIS_URL FLUSHALL

# App regenerará cache automáticamente
```

#### WhatsApp Webhook Issues

```bash
# Re-verificar webhook en Meta Business Suite
# Settings → WhatsApp → Configuration → Verify Token
```

---

## 🔧 Maintenance

### Updates Regulares

#### Dependencias (Mensual)

```bash
# Check vulnerabilities
npm audit

# Update dependencies
npm update

# Test localmente
npm test

# Deploy
git commit -am "chore: Update dependencies"
git push origin main
```

#### Database Migrations

```bash
# Crear nueva migration
cat > database/migrations/$(date +%Y%m%d)_add_feature.sql << EOF
-- SQL migration code
EOF

# Aplicar en producción
./scripts/migrate-production-db.sh
```

#### Certificate Renewal

**Automático**: Railway/Render renuevan SSL automáticamente.

**Monitoring**: UptimeRobot alerta 30 días antes de expiración.

### Scaling

#### Horizontal Scaling (Railway)

```bash
# Railway dashboard → Settings → Scaling
# Aumentar número de instances

# O vía CLI:
railway scale --instances 2
```

#### Vertical Scaling

```bash
# Aumentar memory/CPU limits
railway settings --memory 2048 --cpu 2
```

#### Database Scaling (Supabase)

1. Supabase Dashboard → Settings → Plan
2. Upgrade a Pro ($25/mes) para:
   - 8GB database
   - 100GB bandwidth
   - Point-in-time recovery

### Scheduled Maintenance

```bash
# Configurar maintenance window en UptimeRobot
# Monitor → Edit → Maintenance Windows
# Ejemplo: Domingos 3-4 AM

# Durante maintenance:
# - UptimeRobot no envía alertas
# - Puedes aplicar updates sin noise
```

---

## 🚨 Troubleshooting

### Error: App no inicia

**Síntoma**: Railway logs muestran crash loop

**Diagnóstico**:

```bash
# Ver logs completos
railway logs --tail 100

# Check common issues:
# 1. Missing env vars
node scripts/validate-production-config.js

# 2. Database connection
psql $DATABASE_URL -c "SELECT 1"

# 3. Port binding
# Railway usa $PORT dinámico, no hardcodear 3000
```

**Solución**: Verificar que `index.js` usa `process.env.PORT`.

### Error: Database connection timeout

**Síntoma**: `connect ETIMEDOUT`

**Solución**:

```javascript
// Aumentar timeout en database config
const supabase = createClient(url, key, {
  db: {
    pool: {
      connectionTimeoutMillis: 5000 // Aumentar si es necesario
    }
  }
});
```

### Error: Redis connection failed

**Síntoma**: `ECONNREFUSED redis://localhost:6379`

**Solución**:

```bash
# Verificar REDIS_URL en env vars
railway variables | grep REDIS

# Debe ser: redis://<host>:<port>, NO localhost
# Railway: ${{Redis.REDIS_URL}}
# Render: redis://red-xxx:6379
```

### Error: WhatsApp webhook verification failed

**Síntoma**: Meta muestra "Callback verification failed"

**Diagnóstico**:

```bash
# Test manual
curl "https://your-app.railway.app/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=TEST"

# Debe retornar: TEST (el challenge)
```

**Solución**: Verificar `WHATSAPP_WEBHOOK_VERIFY_TOKEN` coincide en:
- Env vars de Railway/Render
- Meta Business Suite configuration

### Error: 429 Too Many Requests

**Síntoma**: Clientes reciben 429 en producción

**Diagnóstico**:

```bash
# Check rate limiter config
cat security/rate-limiter.js

# Verificar Redis está funcionando (rate limiter usa Redis)
```

**Solución**:

```javascript
// Aumentar rate limit si es legítimo
const limiter = new RateLimiterRedis({
  points: 1000, // Aumentar de 100 a 1000
  duration: 60
});
```

### Error: High memory usage

**Síntoma**: Railway muestra >90% memory usage

**Diagnóstico**:

```bash
# Check logs para memory leaks
railway logs | grep -i "heap out of memory"

# Verificar cron jobs no están acumulando
```

**Solución**:

```bash
# Aumentar memory limit
railway settings --memory 1024  # De 512MB a 1GB

# O optimizar código (fix memory leaks)
```

### Error: Slow API responses

**Síntoma**: Response times >2 segundos

**Diagnóstico**:

1. **Sentry Performance**: Ver transaction details
2. **Railway Metrics**: Check CPU usage
3. **Database**: Verificar query performance

```bash
# Ver slow queries en Supabase
# Dashboard → Database → Query Performance
```

**Solución**:

```sql
-- Agregar índices a queries lentas
CREATE INDEX idx_members_telefono ON members(telefono);
CREATE INDEX idx_checkins_clase_id ON checkins(clase_id);
```

---

## 📚 Recursos Adicionales

### Documentación Técnica

- **Railway Docs**: https://docs.railway.app
- **Render Docs**: https://render.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **WhatsApp Business API**: https://developers.facebook.com/docs/whatsapp

### Guías de GIM_AI

- `docs/DEPLOYMENT_RAILWAY.md` - Guía detallada Railway
- `docs/SENTRY_SETUP.md` - Configuración Sentry
- `docs/UPTIMEROBOT_SETUP.md` - Configuración UptimeRobot
- `docs/WHATSAPP_WEBHOOK_SETUP.md` - WhatsApp integration
- `docs/WHATSAPP_TEMPLATES_SPECS.md` - 23 templates de WhatsApp
- `docs/GUIA_CREDENCIALES_PRODUCCION.md` - Obtener credenciales

### Scripts Útiles

- `scripts/validate-production-config.js` - Validar env vars
- `scripts/migrate-production-db.sh` - Migrar database
- `scripts/test-whatsapp-webhook.js` - Test WhatsApp

### Support

- **GitHub Issues**: https://github.com/eevans-d/GIM_AI/issues
- **Railway Support**: help@railway.app
- **Render Support**: support@render.com

---

## 🎯 Checklist Final de Production

### Pre-Deploy

- [ ] Credenciales de todos los servicios obtenidas
- [ ] `.env.production` configurado y validado
- [ ] Database migrations ejecutadas
- [ ] WhatsApp templates aprobados por Meta
- [ ] Tests pasando localmente (`npm test`)
- [ ] Security audit ejecutado
- [ ] Backups configurados

### Deploy

- [ ] App deployada en Railway/Render
- [ ] Redis provisionado y conectado
- [ ] Environment variables configuradas
- [ ] Custom domain configurado (si aplica)
- [ ] SSL/TLS activo y válido

### Post-Deploy

- [ ] Health checks pasando (3/3)
- [ ] Database connectivity verificada
- [ ] Redis connectivity verificada
- [ ] WhatsApp webhook verificado
- [ ] Sentry capturando eventos
- [ ] UptimeRobot monitors activos
- [ ] Status page público creado
- [ ] Alertas configuradas (email + Slack)
- [ ] Performance dentro de targets (<500ms)
- [ ] Security headers verificados
- [ ] Rate limiting funcionando

### Monitoring

- [ ] Sentry dashboard configurado
- [ ] UptimeRobot monitors en verde
- [ ] Platform metrics visibles
- [ ] Logs fluyendo correctamente
- [ ] Alertas llegando a canales correctos

### Documentation

- [ ] Deployment documented
- [ ] Runbook creado para team
- [ ] Emergency contacts listados
- [ ] Rollback procedures tested

---

**¡Deployment Exitoso!** 🎉

Tu sistema GIM_AI está ahora en producción, monitoreado 24/7, y listo para escalar.

**Última actualización**: Octubre 3, 2025  
**Próxima revisión**: Octubre 10, 2025
