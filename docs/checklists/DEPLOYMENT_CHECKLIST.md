# 🚀 GIM_AI - DEPLOYMENT CHECKLIST# 🚀 GIM_AI - Deployment Checklist

**Fecha**: 4 de Octubre de 2025  

**Fecha de inicio**: 4 de Octubre de 2025  **Target**: Railway + Supabase Cloud  

**Versión**: 1.0.0  **Tiempo Estimado**: 4-5 horas

**Objetivo**: Deployment completo a producción

---

---

## ✅ Pre-Deployment Checks

## 📋 PRE-DEPLOYMENT

### 1. Código y Repositorio

- [x] ✅ Código en repositorio actualizado- [x] Código completo (24/24 prompts)

- [x] ✅ Branch: ci/jest-esm-support limpio- [x] Tests pasando (102/104 checks dashboard)

- [x] ✅ Version: 1.0.0 en package.json- [x] Documentación actualizada

- [x] ✅ Node.js: >=18.0.0 configurado- [ ] Branch principal actualizado en GitHub

- [x] ✅ 24/24 prompts completados (100%)- [ ] Sin cambios pendientes de commit

- [x] ✅ Script SQL consolidado creado (`database/DEPLOY_PRODUCTION.sql`)

- [ ] ⏳ Push de commits locales (2 pendientes)### 2. Cuentas y Credenciales

- [ ] Cuenta Railway.app creada

**Tiempo estimado**: 10 minutos  - [ ] Cuenta Supabase creada

**Status**: 🟢 COMPLETO (excepto git push)- [ ] Meta Business Manager acceso

- [ ] WhatsApp Business API aprobado

---- [ ] Google Gemini API key obtenido



## 🗄️ SUPABASE DATABASE### 3. Archivos de Configuración

- [x] package.json con scripts de producción

### Credenciales a Obtener:- [x] .env.example actualizado

```- [ ] .env.production preparado (localmente)

SUPABASE_URL=- [x] Dockerfile presente (si necesario)

SUPABASE_ANON_KEY=- [x] railway.json o railway.toml (si necesario)

SUPABASE_SERVICE_KEY=

DATABASE_URL=---

```

## 🌐 FASE 1: Supabase Cloud Setup (30 min)

### Pasos:

1. [ ] Crear proyecto en https://supabase.com/dashboard### Paso 1.1: Crear Proyecto Supabase

2. [ ] Obtener credenciales (Settings > API)- [ ] Ir a: https://supabase.com/dashboard

3. [ ] Ejecutar `database/DEPLOY_PRODUCTION.sql` en SQL Editor- [ ] Click "New Project"

4. [ ] Verificar 11 tablas creadas- [ ] Nombre: `gim-ai-prod`

- [ ] Database Password: (guardar en gestor de contraseñas)

**Status**: ⏳ ESPERANDO USUARIO- [ ] Región: `South America (São Paulo)` o más cercana

- [ ] Plan: Free tier (hasta 500MB, 2GB bandwidth)

---

### Paso 1.2: Obtener Credenciales

## 🚂 RAILWAY BACKEND- [ ] Copiar `Project URL` desde Settings > API

- [ ] Copiar `anon public` key

### Variables de Entorno Necesarias:- [ ] Copiar `service_role` key (secret)

```bash- [ ] Copiar `Database URL` desde Settings > Database

NODE_ENV=production

PORT=3000### Paso 1.3: Ejecutar Migraciones

SUPABASE_URL=[desde Supabase]```bash

SUPABASE_SERVICE_KEY=[desde Supabase]# En tu máquina local

REDIS_URL=[auto desde Railway]cd database/schemas

WHATSAPP_PHONE_NUMBER_ID=[desde Meta]psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" < all_schemas.sql

WHATSAPP_ACCESS_TOKEN=[desde Meta]```

GEMINI_API_KEY=[desde Google]

```- [ ] Ejecutar todos los schemas SQL

- [ ] Verificar tablas creadas (11 tablas)

**Status**: ⏳ PENDIENTE- [ ] Ejecutar seeds de datos iniciales (opcional)

- [ ] Configurar RLS policies (Row Level Security)

---

### Paso 1.4: Verificar Conexión

## 💬 WHATSAPP BUSINESS```bash

# Probar conexión

- Requiere Meta Business Managernode -e "

- Templates necesitan aprobación (24-48h)const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('YOUR_URL', 'YOUR_ANON_KEY');

**Status**: ⏳ PENDIENTEsupabase.from('members').select('count').then(console.log);

"

---```



## 🎯 SIGUIENTE ACCIÓN- [ ] Conexión exitosa

- [ ] Queries funcionando

Por favor indica:

[1] Ya tengo Supabase + credenciales → Continuar---

[2] Necesito crear Supabase → Esperaré

[3] Modo simulación → Sin deploy real## 🚂 FASE 2: Railway Deployment (45 min)


### Paso 2.1: Crear Proyecto Railway
- [ ] Login en https://railway.app/
- [ ] Click "New Project"
- [ ] "Deploy from GitHub repo"
- [ ] Seleccionar: `eevans-d/GIM_AI`
- [ ] Branch: `ci/jest-esm-support` (o `main`)
- [ ] Railway detecta Node.js automáticamente

### Paso 2.2: Agregar Redis
- [ ] En proyecto Railway, click "New Service"
- [ ] Seleccionar "Database" → "Redis"
- [ ] Esperar provisionamiento (1-2 min)
- [ ] Copiar `REDIS_URL` desde Variables tab

### Paso 2.3: Configurar Variables de Entorno

**Variables Críticas** (copiar a Railway Variables):

```bash
# General
NODE_ENV=production
PORT=3000
APP_NAME=GIM_AI
APP_URL=${{RAILWAY_STATIC_URL}}
APP_BASE_URL=${{RAILWAY_STATIC_URL}}

# Supabase (desde Paso 1.2)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Redis (auto-provisto por Railway)
REDIS_URL=${{Redis.REDIS_URL}}

# JWT
JWT_SECRET=<generar con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">

# Gemini AI
GEMINI_API_KEY=<tu_clave_gemini>
GEMINI_MODEL=gemini-1.5-pro

# WhatsApp (configurar después)
WHATSAPP_ACCESS_TOKEN=<pendiente>
WHATSAPP_PHONE_NUMBER_ID=<pendiente>
WHATSAPP_BUSINESS_ACCOUNT_ID=<pendiente>
WHATSAPP_VERIFY_TOKEN=gim_ai_webhook_2025
WHATSAPP_WEBHOOK_SECRET=<generar aleatorio>

# Rate Limiting
WHATSAPP_MAX_MESSAGES_PER_DAY=2
WHATSAPP_BUSINESS_HOURS_START=9
WHATSAPP_BUSINESS_HOURS_END=21

# Opcional - Monitoreo
SENTRY_DSN=<opcional>
```

Checklist variables:
- [ ] NODE_ENV=production
- [ ] SUPABASE_URL configurado
- [ ] SUPABASE_ANON_KEY configurado
- [ ] SUPABASE_SERVICE_KEY configurado
- [ ] REDIS_URL configurado
- [ ] JWT_SECRET generado
- [ ] GEMINI_API_KEY configurado
- [ ] Todas las variables copiadas

### Paso 2.4: Deploy Inicial
- [ ] Railway ejecuta `npm install` automáticamente
- [ ] Railway ejecuta `npm start`
- [ ] Verificar logs: sin errores críticos
- [ ] Obtener URL pública: `https://gim-ai-production.up.railway.app`

### Paso 2.5: Verificar Deployment
```bash
# Probar health endpoint
curl https://gim-ai-production.up.railway.app/health

# Debe retornar:
# {"status":"ok","timestamp":"..."}
```

- [ ] Health endpoint responde
- [ ] Status 200 OK
- [ ] API endpoints accesibles

---

## 📱 FASE 3: WhatsApp Business Setup (2-3 horas)

**Nota**: Esta fase incluye tiempo de aprobación de Meta (1-2 horas típicamente)

### Paso 3.1: Crear App en Meta Business
- [ ] Ir a: https://developers.facebook.com/apps
- [ ] Click "Create App"
- [ ] Tipo: "Business"
- [ ] Nombre: "GIM AI Gym Management"
- [ ] Email de contacto
- [ ] Business Portfolio: seleccionar o crear

### Paso 3.2: Agregar WhatsApp Product
- [ ] En el dashboard de la app, click "Add Product"
- [ ] Seleccionar "WhatsApp" → "Set Up"
- [ ] Configurar WhatsApp Business Account
- [ ] Agregar número de teléfono (o usar test number)

### Paso 3.3: Obtener Credenciales
- [ ] Ir a WhatsApp > API Setup
- [ ] Copiar:
  - `Temporary access token` (válido 24h)
  - `Phone Number ID`
  - `WhatsApp Business Account ID`
- [ ] Guardar credenciales

### Paso 3.4: Generar Token Permanente
**Importante**: El token temporal expira en 24h.

- [ ] Ir a WhatsApp > Configuration
- [ ] Generate Permanent Token
- [ ] Permisos necesarios:
  - `whatsapp_business_messaging`
  - `whatsapp_business_management`
- [ ] Copiar token permanente
- [ ] Actualizar en Railway variables

### Paso 3.5: Configurar Webhook
- [ ] Ir a WhatsApp > Configuration
- [ ] Webhook > Configure
- [ ] Callback URL: `https://gim-ai-production.up.railway.app/api/v1/webhooks/whatsapp`
- [ ] Verify Token: `gim_ai_webhook_2025`
- [ ] Click "Verify and Save"
- [ ] Subscribe to fields:
  - `messages`
  - `message_status`

### Paso 3.6: Probar Envío de Mensaje
```bash
# Desde tu máquina local
curl -X POST "https://gim-ai-production.up.railway.app/api/v1/whatsapp/send" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+5491112345678",
    "template": "welcome_member",
    "params": {
      "member_name": "Test User",
      "gym_name": "GIM AI"
    }
  }'
```

- [ ] Mensaje enviado exitosamente
- [ ] Mensaje recibido en WhatsApp
- [ ] Webhook recibe confirmación

### Paso 3.7: Solicitar Revisión de Producción
**Solo si usarás número real (no test number)**

- [ ] Ir a WhatsApp > API Setup
- [ ] Request Production Access
- [ ] Completar formulario:
  - Descripción del use case
  - Ejemplos de templates
  - Políticas de privacidad
- [ ] Esperar aprobación (1-3 días hábiles)

---

## 📊 FASE 4: n8n Workflow Setup (30 min)

### Opción A: n8n Cloud (Recomendado para MVP)
- [ ] Crear cuenta en https://n8n.io/
- [ ] Plan: Starter ($20/mes) o Free trial
- [ ] Crear workspace: "GIM_AI_Production"

### Opción B: Self-Hosted en Railway
- [ ] Crear nuevo servicio en Railway
- [ ] Deploy n8n desde template
- [ ] Configurar variables:
  - `N8N_BASIC_AUTH_ACTIVE=true`
  - `N8N_BASIC_AUTH_USER=admin`
  - `N8N_BASIC_AUTH_PASSWORD=<generar>`

### Importar Workflows
- [ ] Login en n8n dashboard
- [ ] Import workflows desde `n8n-workflows/`:
  - `contextual-collection.json`
  - `reminder-system.json`
  - `instructor-replacement.json`
  - `debt-collection-sequence.json`
- [ ] Configurar credenciales en cada workflow:
  - Supabase credentials
  - WhatsApp credentials
  - HTTP endpoints
- [ ] Activar workflows
- [ ] Probar ejecución manual

---

## 🔒 FASE 5: Seguridad y Monitoreo (30 min)

### Paso 5.1: Configurar Sentry (Opcional)
- [ ] Crear cuenta en https://sentry.io/
- [ ] Crear proyecto: "gim-ai-production"
- [ ] Copiar DSN
- [ ] Agregar `SENTRY_DSN` a Railway variables
- [ ] Probar error tracking

### Paso 5.2: Configurar UptimeRobot
- [ ] Crear cuenta en https://uptimerobot.com/
- [ ] Add New Monitor:
  - Type: HTTP(s)
  - URL: `https://gim-ai-production.up.railway.app/health`
  - Interval: 5 minutes
- [ ] Configurar alertas (email)
- [ ] Verificar monitor activo

### Paso 5.3: SSL/TLS
- [ ] Verificar Railway provee SSL automáticamente
- [ ] Probar `https://` (no `http://`)
- [ ] Verificar certificado válido

### Paso 5.4: Rate Limiting
- [ ] Verificar Redis funcionando
- [ ] Probar límites de WhatsApp (2 msg/día)
- [ ] Verificar horarios de negocio (9-21h)

---

## ✅ FASE 6: Post-Deployment Validation (30 min)

### Test 1: Health Check
```bash
curl https://gim-ai-production.up.railway.app/health
# Esperado: {"status":"ok","timestamp":"..."}
```
- [ ] ✅ Pasa

### Test 2: Database Connection
```bash
curl https://gim-ai-production.up.railway.app/api/v1/members
# Esperado: {"success":true,"data":[...]}
```
- [ ] ✅ Pasa

### Test 3: WhatsApp Webhook
```bash
curl "https://gim-ai-production.up.railway.app/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=gim_ai_webhook_2025&hub.challenge=TEST123"
# Esperado: TEST123
```
- [ ] ✅ Pasa

### Test 4: QR Check-in
- [ ] Generar QR para miembro test
- [ ] Escanear QR
- [ ] Verificar check-in registrado en DB
- [ ] Verificar mensaje WhatsApp enviado
- [ ] ✅ Pasa

### Test 5: Dashboard Access
```bash
# Abrir en navegador
https://gim-ai-production.up.railway.app/dashboard
```
- [ ] Dashboard carga correctamente
- [ ] KPIs se visualizan
- [ ] Charts renderizan
- [ ] ✅ Pasa

### Test 6: Gemini AI Decisions
- [ ] Acceder a dashboard
- [ ] Verificar sección "Decisiones Prioritarias"
- [ ] Ver 3 decisiones generadas por IA
- [ ] ✅ Pasa

### Test 7: Cron Jobs
- [ ] Verificar logs de Railway
- [ ] Buscar evidencia de cron execution
- [ ] View refresh cada 5 min
- [ ] ✅ Funcionando

---

## 📝 Configuración Final

### Actualizar Variables en Código
Si tienes URLs hardcodeadas, actualizar:
- [ ] Frontend: API base URL
- [ ] n8n workflows: webhook URLs
- [ ] WhatsApp templates: links

### Documentar URLs de Producción
```
API Base: https://gim-ai-production.up.railway.app
Dashboard: https://gim-ai-production.up.railway.app/dashboard
Webhooks: https://gim-ai-production.up.railway.app/api/v1/webhooks
QR Checkin: https://gim-ai-production.up.railway.app/qr-checkin
```

### Backup Inicial
- [ ] Exportar snapshot de Supabase
- [ ] Guardar en lugar seguro
- [ ] Documentar procedimiento de restore

---

## 🎉 Deployment Completo

### Checklist Final
- [ ] Todos los endpoints funcionando
- [ ] WhatsApp enviando/recibiendo mensajes
- [ ] Dashboard accesible y funcional
- [ ] Gemini AI generando decisiones
- [ ] Cron jobs ejecutándose
- [ ] Monitoreo activo (UptimeRobot)
- [ ] Logs accesibles en Railway
- [ ] Documentación actualizada

### Próximos Pasos
- [ ] Onboarding de primer usuario real
- [ ] Monitoreo de primeras 24 horas
- [ ] Ajustes basados en feedback
- [ ] Planificar features de Prompt 25 (Analytics & BI)

---

## 💰 Costos Mensuales Estimados

| Servicio | Costo | Plan |
|----------|-------|------|
| Railway (App + Redis) | $8-18 | Hobby/Pro |
| Supabase | $0 | Free (hasta 500MB) |
| n8n Cloud | $0-20 | Free/Starter |
| Gemini AI | $0-10 | Pay per use |
| WhatsApp Business | $0 | Free tier (1000 conversaciones/mes) |
| **TOTAL** | **$8-48/mes** | Depende de tráfico |

---

## 🆘 Troubleshooting

### Problema: App no inicia en Railway
- Verificar logs en Railway dashboard
- Confirmar todas las variables de entorno
- Verificar `PORT=3000` o usar `${{PORT}}`

### Problema: No conecta a Supabase
- Verificar SUPABASE_URL y keys
- Confirmar IPs permitidas en Supabase (all allowed por defecto)
- Probar conexión manual con psql

### Problema: WhatsApp webhook no recibe mensajes
- Verificar callback URL configurada en Meta
- Confirmar verify token correcto
- Revisar logs de Railway para errores

### Problema: Redis no funciona
- Verificar REDIS_URL en variables
- Confirmar servicio Redis activo en Railway
- Probar conexión con redis-cli

---

**Última actualización**: 4 de Octubre de 2025  
**Próxima revisión**: Post-deployment (después de 24h en producción)
