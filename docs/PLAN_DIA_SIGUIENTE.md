# 📋 Plan de Trabajo - Día Siguiente
**Fecha**: Octubre 3, 2025  
**Estado Actual**: 24/24 Prompts Core Completos (100%) ✅  
**Objetivo**: Preparación para Producción y Testing

---

## 🎯 Objetivos del Día

### **Prioridad ALTA** (Must Have)
1. ✅ Testing integral de todos los sistemas
2. ✅ Configuración de variables de entorno para producción
3. ✅ Validación de integración WhatsApp Business API
4. ✅ Verificación de credenciales de Supabase y Gemini
5. ✅ Documentación de deployment

### **Prioridad MEDIA** (Should Have)
6. Configuración de monitoreo y alertas
7. Backup automático de base de datos
8. Optimización de performance
9. Documentación para usuarios finales

### **Prioridad BAJA** (Nice to Have)
10. PROMPT 25: Analytics & BI (si hay tiempo)
11. Mejoras de UI/UX
12. Internacionalización (i18n)

---

## 📝 Plan Detallado por Bloques

### **BLOQUE 1: Testing y Validación (2-3 horas)**

#### 1.1 Ejecutar Suite Completa de Tests
```bash
# Test unitarios
npm run test:unit

# Test de integración
npm run test:integration

# Test E2E críticos
npm run test:e2e

# Test de seguridad
npm run test:security

# Coverage completo
npm test -- --coverage
```

**Checklist**:
- [ ] Todos los tests pasan sin errores
- [ ] Coverage > 70% en CI
- [ ] No hay memory leaks
- [ ] Performance tests OK

#### 1.2 Validar Scripts de Validación
```bash
# Ejecutar todos los scripts de validación
./scripts/validate-prompt-07.sh
./scripts/validate-prompt-08.sh
./scripts/validate-prompt-09.sh
./scripts/validate-prompt-10.sh
./scripts/validate-prompt-15.sh
./scripts/validate-prompt-18.sh
./scripts/validate-prompt-19.sh
./scripts/validate-prompt-23.sh
./scripts/validate-prompt-24.sh
```

**Checklist**:
- [ ] 620+ validaciones pasadas
- [ ] No hay warnings críticos
- [ ] Todos los servicios responden

#### 1.3 Health Checks
```bash
# Verificar health de servicios
npm run health-check

# Test de conectividad
node scripts/test-connections.js
```

**Checklist**:
- [ ] Supabase conectado ✅
- [ ] Redis conectado ✅
- [ ] WhatsApp API conectado ✅
- [ ] Gemini API conectado ✅
- [ ] n8n accesible ✅

---

### **BLOQUE 2: Configuración de Producción (2-3 horas)**

#### 2.1 Variables de Entorno
Crear archivo `.env.production` con:

```bash
# === PRODUCCIÓN ===
NODE_ENV=production
PORT=3000

# Supabase (Producción)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=eyJ... # Obtener de Supabase Dashboard
SUPABASE_SERVICE_KEY=eyJ... # ⚠️ NUNCA COMMITEAR

# WhatsApp Business Cloud API
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
WHATSAPP_ACCESS_TOKEN=tu_token_permanente # ⚠️ NUNCA COMMITEAR
WHATSAPP_BUSINESS_ACCOUNT_ID=tu_waba_id
WHATSAPP_VERIFY_TOKEN=token_webhook_aleatorio

# Google Gemini API
GEMINI_API_KEY=AIzaSy... # ⚠️ NUNCA COMMITEAR

# Redis (Producción - Railway/Upstash)
REDIS_URL=redis://default:password@host:6379

# JWT Secret (Generar uno nuevo para producción)
JWT_SECRET=$(openssl rand -base64 32) # ⚠️ NUNCA COMMITEAR

# n8n (Producción)
N8N_WEBHOOK_URL=https://tu-n8n.railway.app

# Configuración
WHATSAPP_MAX_MESSAGES_PER_DAY=2
WHATSAPP_BUSINESS_HOURS_START=9
WHATSAPP_BUSINESS_HOURS_END=21
LOG_LEVEL=info
```

**Checklist**:
- [ ] `.env.production` creado
- [ ] Todas las variables configuradas
- [ ] Secrets almacenados en gestor seguro
- [ ] `.env.production` en `.gitignore`

#### 2.2 Validar Credenciales
```bash
# Script para validar todas las credenciales
node scripts/validate-credentials.js
```

**Crear script** `scripts/validate-credentials.js`:
```javascript
// Valida que todas las APIs estén accesibles
// - Supabase: SELECT 1
// - WhatsApp: GET /v18.0/me
// - Gemini: Test request
// - Redis: PING
```

**Checklist**:
- [ ] Supabase: conexión OK
- [ ] WhatsApp: token válido, rate limits OK
- [ ] Gemini: API key válida, cuota disponible
- [ ] Redis: conexión OK

#### 2.3 Base de Datos - Migración
```bash
# Aplicar schemas en orden
psql $DATABASE_URL -f database/schemas/core_tables.sql
psql $DATABASE_URL -f database/schemas/ai_tables.sql
psql $DATABASE_URL -f database/schemas/api_ecosystem.sql

# Aplicar funciones
psql $DATABASE_URL -f database/functions/*.sql

# Crear índices optimizados
psql $DATABASE_URL -f database/migrations/add_optimized_indexes.sql

# Seed data (solo desarrollo)
# psql $DATABASE_URL -f database/seeds/demo_data.sql
```

**Checklist**:
- [ ] Schemas aplicados
- [ ] Funciones creadas
- [ ] Índices optimizados
- [ ] RLS policies activas
- [ ] Backup creado antes de migrar

---

### **BLOQUE 3: Integración WhatsApp (1-2 horas)**

#### 3.1 Configurar Webhook en Meta
1. Ir a: https://developers.facebook.com/apps
2. Seleccionar tu app → WhatsApp → Configuration
3. Configurar webhook:
   - **Callback URL**: `https://tu-dominio.com/api/whatsapp/webhook`
   - **Verify Token**: (valor de `WHATSAPP_VERIFY_TOKEN`)
   - **Suscripciones**: messages, message_status

**Checklist**:
- [ ] Webhook configurado
- [ ] Verificación exitosa
- [ ] Test de mensaje recibido

#### 3.2 Aprobar Templates WhatsApp
Revisar que estos 18 templates estén aprobados:
```
1. checkin_confirmation
2. class_reminder_24h
3. class_reminder_2h
4. payment_due_d0
5. payment_overdue_d3
6. payment_overdue_d7
7. payment_critical
8. contextual_collection_post_workout
9. survey_post_class
10. reactivation_message_1
11. reactivation_message_2
12. reactivation_message_3
13. instructor_replacement
14. valley_optimization
15. nutrition_tip
16. tier_upgrade_offer
17. churn_intervention
18. welcome_new_member
```

**Checklist**:
- [ ] Templates aprobados por Meta
- [ ] Tests de envío OK
- [ ] Rate limits configurados

#### 3.3 Test de Flujos Críticos
```bash
# Test envío manual
node scripts/test-whatsapp-send.js

# Test recordatorios
node scripts/test-reminders.js

# Test webhooks
curl -X POST https://tu-dominio.com/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Checklist**:
- [ ] Envío de mensajes OK
- [ ] Recepción de webhooks OK
- [ ] Rate limiting funciona
- [ ] Business hours respetadas

---

### **BLOQUE 4: Deploy y Monitoreo (2-3 horas)**

#### 4.1 Preparar para Deploy
```bash
# Build para producción
npm run build

# Verificar que no hay warnings críticos
npm audit --production

# Crear package.json optimizado
npm prune --production

# Test en modo producción local
NODE_ENV=production npm start
```

**Checklist**:
- [ ] Build exitoso
- [ ] No vulnerabilidades críticas
- [ ] Servidor inicia sin errores
- [ ] Health check responde

#### 4.2 Deploy Options

**Opción A: Railway** (Recomendado para MVP)
```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up

# Configurar variables
railway variables set SUPABASE_URL=...
railway variables set WHATSAPP_ACCESS_TOKEN=...
# ... (todas las variables de .env.production)
```

**Opción B: Render** (Free tier disponible)
```yaml
# render.yaml
services:
  - type: web
    name: gim-api
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      # ... resto de variables
```

**Opción C: Vercel** (Serverless)
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Configurar variables en dashboard
```

**Checklist**:
- [ ] Deploy exitoso
- [ ] URL de producción disponible
- [ ] Variables de entorno configuradas
- [ ] Logs accesibles

#### 4.3 Configurar Monitoreo
```javascript
// Añadir en index.js

// Sentry para error tracking
const Sentry = require('@sentry/node');
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});

// New Relic para APM (opcional)
require('newrelic');

// Prometheus metrics (opcional)
const promClient = require('prom-client');
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });
```

**Servicios gratuitos recomendados**:
- [ ] Sentry (error tracking) - https://sentry.io
- [ ] UptimeRobot (uptime monitoring) - https://uptimerobot.com
- [ ] LogRocket (session replay) - https://logrocket.com

---

### **BLOQUE 5: Documentación (1-2 horas)**

#### 5.1 Deployment Guide
Crear `docs/DEPLOYMENT.md`:
```markdown
# Deployment Guide

## Pre-requisitos
- Node.js 18+
- PostgreSQL 15+ (Supabase)
- Redis 7+
- Cuenta WhatsApp Business

## Paso 1: Clonar repositorio
...

## Paso 2: Configurar variables
...

## Paso 3: Migrar base de datos
...

## Paso 4: Deploy
...

## Paso 5: Verificar
...
```

#### 5.2 API Documentation
Crear documentación OpenAPI (Swagger):
```bash
# Instalar swagger
npm install swagger-jsdoc swagger-ui-express

# Generar docs automáticamente
node scripts/generate-api-docs.js
```

Accesible en: `https://tu-dominio.com/api-docs`

#### 5.3 User Manual
Crear `docs/USER_MANUAL.md`:
- Guía para administradores
- Guía para instructores
- Guía para miembros
- FAQ

**Checklist**:
- [ ] Deployment guide completo
- [ ] API docs generados
- [ ] User manual creado
- [ ] FAQ documentado

---

### **BLOQUE 6: Testing End-to-End en Producción (1 hora)**

#### 6.1 Smoke Tests
```bash
# Test básico de endpoints
curl https://tu-dominio.com/health

# Test autenticación
curl -X POST https://tu-dominio.com/oauth/token \
  -d "grant_type=client_credentials" \
  -d "client_id=..." \
  -d "client_secret=..."

# Test QR check-in
curl -X POST https://tu-dominio.com/api/checkin \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"qr_code": "test-qr-123"}'
```

#### 6.2 Flujo Completo
1. [ ] Check-in con QR → WhatsApp confirmación
2. [ ] 90 min después → Recordatorio contextual de pago
3. [ ] Post-clase → Encuesta NPS
4. [ ] Administrador → Dashboard con métricas
5. [ ] API pública → OAuth2 + webhook delivery

**Checklist**:
- [ ] Check-in flow OK
- [ ] WhatsApp messages OK
- [ ] Dashboard loading OK
- [ ] API public OK
- [ ] Webhooks delivering OK

---

## 🚨 Troubleshooting Común

### Problema: WhatsApp no envía mensajes
**Solución**:
1. Verificar que el template esté aprobado
2. Verificar business hours (9-21h)
3. Verificar rate limit (2 msg/día)
4. Revisar logs: `docker logs gim-api | grep whatsapp`

### Problema: Base de datos lenta
**Solución**:
1. Revisar índices: `EXPLAIN ANALYZE SELECT ...`
2. Activar materialized views: `REFRESH MATERIALIZED VIEW mv_dashboard_kpis`
3. Revisar conexiones: `SELECT count(*) FROM pg_stat_activity`

### Problema: Gemini API rate limit
**Solución**:
1. Verificar cuota: https://aistudio.google.com/app/apikey
2. Activar cache Redis para reducir requests
3. Usar gemini-1.5-flash para requests menos críticos

---

## 📊 Métricas de Éxito del Día

Al final del día, deberías tener:

✅ **Technical**:
- [ ] 100% tests passing
- [ ] Sistema deployed en producción
- [ ] Monitoreo activo
- [ ] Backup configurado

✅ **Business**:
- [ ] WhatsApp enviando mensajes reales
- [ ] Check-ins funcionando
- [ ] Dashboard mostrando métricas reales
- [ ] API pública accesible

✅ **Documentation**:
- [ ] Deployment guide completo
- [ ] API docs publicados
- [ ] User manual creado

---

## 🎯 Siguiente Paso: Launch Beta

**Semana 1-2**: Beta con 10-20 miembros
- Monitoreo intensivo
- Feedback diario
- Fixes rápidos

**Semana 3-4**: Expansión a 50-100 miembros
- Optimizaciones basadas en feedback
- Training para staff

**Mes 2**: Full rollout
- Todos los 500 miembros
- Marketing campaign
- Success metrics tracking

---

## 📞 Soporte

**En caso de emergencia**:
1. Revisar logs: `npm run logs`
2. Health check: `curl /health`
3. Rollback: `git revert HEAD && git push`
4. Soporte Supabase: https://supabase.com/dashboard/support
5. Soporte WhatsApp: https://business.facebook.com/support

---

**¡Éxito en el deployment! 🚀**
