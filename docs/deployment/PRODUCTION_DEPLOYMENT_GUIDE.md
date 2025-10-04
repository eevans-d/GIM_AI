# 🚀 GIM_AI - Guía Completa de Deployment a Producción

**Versión**: 1.0.0  
**Última actualización**: 4 de Octubre de 2025  
**Tiempo estimado**: 1.5 - 2 horas (primera vez)  
**Costo mensual estimado**: $8-20 USD

---

## 📋 Tabla de Contenidos

1. [Pre-requisitos](#pre-requisitos)
2. [Fase 1: Supabase Database](#fase-1-supabase-database)
3. [Fase 2: Railway Backend](#fase-2-railway-backend)
4. [Fase 3: WhatsApp Business API](#fase-3-whatsapp-business-api)
5. [Fase 4: n8n Workflows](#fase-4-n8n-workflows)
6. [Fase 5: Validación y Testing](#fase-5-validación-y-testing)
7. [Troubleshooting](#troubleshooting)

---

## Pre-requisitos

### Cuentas Necesarias

- [ ] **GitHub** (ya tienes - repositorio GIM_AI)
- [ ] **Supabase** → https://supabase.com (Database)
- [ ] **Railway** → https://railway.app (Backend hosting)
- [ ] **Meta Business Manager** → https://business.facebook.com (WhatsApp)
- [ ] **Google AI Studio** → https://makersuite.google.com (Gemini AI)

### Información a Tener Lista

- [ ] Número de teléfono para WhatsApp Business
- [ ] Tarjeta de crédito/débito para verificación (no se cobra inmediatamente)
- [ ] Dominio personalizado (opcional)

### Archivos Preparados

- [x] `database/DEPLOY_PRODUCTION.sql` - Schema SQL completo
- [x] `.env.production.example` - Template de variables de entorno
- [x] `scripts/deployment/validate-env.js` - Script de validación

---

## Fase 1: Supabase Database

**Tiempo**: 15 minutos  
**Costo**: $0 (Free tier: 500MB DB)

### 1.1 Crear Proyecto

1. Ve a https://supabase.com/dashboard
2. Click en **"New Project"**
3. Completa el formulario:
   ```
   Organization: [Tu organización o crea una nueva]
   Name: gim-ai-production
   Database Password: [Genera uno fuerte - GUÁRDALO]
   Region: South America (São Paulo) ← Más cerca de México
   Pricing Plan: Free
   ```
4. Click **"Create new project"**
5. **Espera 2-3 minutos** mientras se provisiona el proyecto

### 1.2 Obtener Credenciales

Una vez creado el proyecto:

1. En el sidebar izquierdo, ve a **Settings** (⚙️) > **API**

2. Copia estos valores (¡los necesitarás!):
   ```
   Project URL:     https://xxxxxxxxxxxxx.supabase.co
   anon public:     eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   service_role:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. Ve a **Settings** > **Database** > **Connection string**

4. Selecciona la pestaña **URI** y copia:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

### 1.3 Ejecutar Schema SQL

1. En el sidebar, ve a **SQL Editor**

2. Click en **"New query"**

3. Abre el archivo `database/DEPLOY_PRODUCTION.sql` de tu proyecto

4. **Copia TODO el contenido** (Ctrl+A, Ctrl+C)

5. **Pega** en el SQL Editor de Supabase

6. Click en **"Run"** (o Ctrl+Enter)

7. Deberías ver:
   ```
   Success. Rows received: 0
   ```

8. Verifica las tablas creadas:
   - Ve a **Table Editor** en el sidebar
   - Deberías ver 11 tablas:
     * members
     * instructors
     * classes
     * checkins
     * payments
     * reminders
     * surveys
     * contextual_collection
     * dashboard_snapshots
     * priority_decisions
     * replacement_offers

✅ **Fase 1 Completada**

---

## Fase 2: Railway Backend

**Tiempo**: 20 minutos  
**Costo**: $5-20/mes (primeros $5 gratis)

### 2.1 Crear Cuenta y Proyecto

1. Ve a https://railway.app

2. Click en **"Login"** > **"Login with GitHub"**

3. Autoriza Railway a acceder a tu cuenta GitHub

4. Una vez logueado, click en **"New Project"**

5. Selecciona **"Deploy from GitHub repo"**

6. Busca y selecciona tu repositorio **`GIM_AI`**

7. Selecciona el branch **`ci/jest-esm-support`** (o `main` si ya mergeaste)

8. Railway detectará automáticamente que es Node.js

### 2.2 Agregar Redis

1. En tu proyecto de Railway, click en **"+ New"**

2. Selecciona **"Database"** > **"Add Redis"**

3. Railway creará un servicio Redis y automáticamente agregará `REDIS_URL` a las variables

### 2.3 Configurar Variables de Entorno

1. Click en tu servicio **GIM_AI** (el que tiene tu código)

2. Ve a la pestaña **"Variables"**

3. Click en **"RAW Editor"**

4. Copia y pega las siguientes variables (reemplazando con tus valores reales):

```bash
# Core
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Supabase (desde Fase 1)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_KEY=eyJhbGciOi...

# Redis (automático desde Railway)
REDIS_URL=${{Redis.REDIS_URL}}

# WhatsApp (completar en Fase 3)
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=tu_token_random_seguro_123

# Gemini AI
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXX
GEMINI_MODEL=gemini-1.5-flash

# JWT
JWT_SECRET=genera_uno_random_32_caracteres_minimo

# Configuración
ENABLE_CRON_JOBS=true
TZ=America/Mexico_City
```

5. **Obtener Gemini API Key**:
   - Ve a https://makersuite.google.com/app/apikey
   - Click "Create API key"
   - Copia la key (empieza con `AIzaSy`)

6. **Generar JWT_SECRET**:
   ```bash
   openssl rand -base64 32
   ```

7. Click **"Save"**

### 2.4 Deploy

1. Railway comenzará el deploy automáticamente

2. Verás logs en tiempo real:
   ```
   Building...
   npm install
   npm run build (si existe)
   Starting...
   ```

3. **Espera 3-5 minutos** para el primer deploy

4. Una vez completado, verás: ✅ **Deployed**

### 2.5 Obtener URL Pública

1. En la vista de tu servicio, ve a **"Settings"**

2. Sección **"Networking"** > **"Public Networking"**

3. Click **"Generate Domain"**

4. Railway te dará una URL como:
   ```
   https://gim-ai-production.up.railway.app
   ```

5. **Guarda esta URL** - la necesitarás para WhatsApp y n8n

### 2.6 Verificar Health Check

1. Abre tu navegador y ve a:
   ```
   https://[tu-url].up.railway.app/health
   ```

2. Deberías ver:
   ```json
   {
     "status": "healthy",
     "timestamp": "2025-10-04T...",
     "services": {
       "database": "connected",
       "redis": "connected"
     },
     "version": "1.0.0"
   }
   ```

✅ **Fase 2 Completada**

---

## Fase 3: WhatsApp Business API

**Tiempo**: 30-45 minutos  
**Costo**: $0 (primeras 1000 conversaciones/mes gratis)  
**⚠️ Nota**: Aprobación de templates puede tomar 24-48h

### 3.1 Meta Business Manager

1. Ve a https://business.facebook.com

2. Si no tienes, crea un **Business Manager**:
   - Click "Create Account"
   - Nombre del negocio: "GIM AI" (o nombre de tu gym)
   - Tu nombre completo
   - Email de trabajo

3. **Verificar negocio** (requerido para WhatsApp):
   - Ve a **Business Settings** > **Security Center**
   - Click **"Start Verification"**
   - Sube documentos (identificación oficial + comprobante de domicilio)
   - ⏳ Puede tomar 1-3 días hábiles

### 3.2 Crear App de WhatsApp

1. Ve a https://developers.facebook.com

2. Click **"My Apps"** > **"Create App"**

3. Selecciona tipo: **"Business"**

4. Completa:
   ```
   Display name: GIM AI WhatsApp
   App contact email: tu@email.com
   Business Account: [Selecciona tu Business Manager]
   ```

5. Click **"Create App"**

### 3.3 Agregar Producto WhatsApp

1. En tu app, busca **"WhatsApp"** en la lista de productos

2. Click **"Set up"**

3. Selecciona el **Business Portfolio** correcto

4. Click **"Get Started"**

### 3.4 Configurar Número de Teléfono

1. En WhatsApp > **API Setup**:

2. **Opción A: Usar número de prueba** (para testing inmediato):
   - Meta te da un número de prueba gratis
   - Puedes enviar mensajes a máximo 5 números verificados
   - Ideal para desarrollo

3. **Opción B: Agregar tu propio número** (para producción real):
   - Click **"Add phone number"**
   - Ingresa número de teléfono del gym
   - Verificar por SMS
   - ⚠️ Este número ya NO podrá usarse en WhatsApp normal

### 3.5 Obtener Credenciales

En la página de **API Setup**:

1. **Phone Number ID**:
   ```
   Se muestra arriba del número
   Formato: 123456789012345
   ```

2. **WhatsApp Business Account ID**:
   ```
   En la parte superior de la página
   ```

3. **Temporary Access Token**:
   - Click **"Copy"** junto al token mostrado
   - ⚠️ Este token expira en 24h

4. **Generar Access Token Permanente**:
   - Ve a **Business Settings** > **System Users**
   - Click **"Add"**
   - Nombre: "GIM AI Production"
   - Role: Admin
   - Click **"Create System User"**
   - Click **"Add Assets"** > **Apps** > Selecciona tu app
   - Click **"Generate New Token"**
   - Selecciona permisos:
     * `whatsapp_business_management`
     * `whatsapp_business_messaging`
   - Expiration: **Never** (sin expiración)
   - Click **"Generate Token"**
   - **⚠️ COPIA EL TOKEN AHORA - No lo verás de nuevo**

### 3.6 Agregar Credenciales a Railway

1. Vuelve a Railway > Tu proyecto > Variables

2. Edita y agrega:
   ```bash
   WHATSAPP_PHONE_NUMBER_ID=123456789012345
   WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
   WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. Click **"Save"**

4. Railway hará **redeploy automático** (2-3 min)

### 3.7 Configurar Webhook

1. En WhatsApp > **Configuration** > **Webhook**

2. Click **"Edit"**

3. Completa:
   ```
   Callback URL: https://[tu-railway-url].up.railway.app/api/webhook/whatsapp
   Verify token: [el que pusiste en WHATSAPP_WEBHOOK_VERIFY_TOKEN]
   ```

4. Click **"Verify and save"**

5. Si sale ✅ **"Webhook verified successfully"** → ¡Perfecto!

6. Si falla, revisa:
   - URL correcta (sin espacios)
   - Token coincide exactamente
   - Backend está deployed y funcionando

7. **Subscribir a eventos**:
   - Check ✅ **messages**
   - Check ✅ **message_status**
   - Check ✅ **messaging_optins**

8. Click **"Subscribe"**

### 3.8 Crear Message Templates

⚠️ **Importante**: Los templates necesitan aprobación de Meta (24-48h)

1. Ve a WhatsApp > **Message Templates**

2. Click **"Create Template"**

3. **Template 1: Check-in Confirmation**
   ```
   Name: checkin_confirmation
   Category: TRANSACTIONAL
   Language: Spanish (es)
   
   Header: None
   
   Body:
   ¡Hola {{1}}! ✅
   
   Confirmamos tu asistencia a {{2}} el día de hoy.
   
   ¡Excelente trabajo! 💪
   
   Footer:
   GIM AI - Tu gimnasio inteligente
   
   Buttons: None
   ```

4. **Template 2: Payment Reminder**
   ```
   Name: payment_reminder
   Category: MARKETING
   Language: Spanish (es)
   
   Body:
   Hola {{1}} 👋
   
   Te recordamos que tienes un saldo pendiente de ${{2}} MXN.
   
   ¿Podrías realizar tu pago esta semana? 
   
   Gracias por tu comprensión.
   ```

5. **Template 3: Class Reminder**
   ```
   Name: class_reminder
   Category: UTILITY
   Language: Spanish (es)
   
   Body:
   ¡Hola {{1}}! 🔔
   
   Recordatorio: Tu clase de {{2}} comienza en {{3}} horas.
   
   ¿Nos vemos ahí? 😊
   ```

6. Click **"Submit"** en cada template

7. **Esperar aprobación** (1-2 días hábiles)

8. Mientras esperas, puedes continuar con las siguientes fases

✅ **Fase 3 Completada** (excepto aprobación de templates)

---

## Fase 4: n8n Workflows

**Tiempo**: 20 minutos  
**Costo**: $0 (self-hosted) o $20/mes (cloud)

### Opción A: n8n Self-Hosted en Railway

1. En Railway, click **"+ New"** > **"Template"**

2. Busca **"n8n"** y selecciona el template oficial

3. Click **"Deploy"**

4. Configurar variables:
   ```bash
   N8N_BASIC_AUTH_ACTIVE=true
   N8N_BASIC_AUTH_USER=admin
   N8N_BASIC_AUTH_PASSWORD=tu_password_seguro
   WEBHOOK_URL=https://[n8n-url].up.railway.app
   ```

5. Railway generará una URL para n8n

### Opción B: n8n Cloud

1. Ve a https://n8n.io/cloud

2. Sign up y selecciona plan (Free o Starter $20/mes)

3. Te dan un subdomain: `https://tu-org.app.n8n.cloud`

### 4.1 Importar Workflows

1. Accede a tu n8n dashboard

2. Click **"Workflows"** > **"Import from File"**

3. Importa cada workflow desde `n8n-workflows/`:
   - `core/01-checkin-flow.json`
   - `core/02-payment-reminder.json`
   - `messaging/01-contextual-collection.json`
   - `messaging/02-post-class-survey.json`

### 4.2 Configurar Credenciales

Para cada workflow importado:

1. **Supabase Credential**:
   - Type: Supabase
   - URL: [tu Supabase URL]
   - Service Key: [tu service key]

2. **WhatsApp Credential**:
   - Type: HTTP Request
   - Base URL: `https://graph.facebook.com/v18.0`
   - Authentication: Header Auth
   - Name: `Authorization`
   - Value: `Bearer [tu access token]`

3. **GIM AI Backend**:
   - Type: HTTP Request
   - Base URL: `https://[tu-railway-url].up.railway.app`

### 4.3 Activar Workflows

1. Para cada workflow, click en el **toggle** superior derecho

2. Debe cambiar de gris a **verde (Active)**

3. Verifica que los webhooks estén escuchando

### 4.4 Agregar n8n URL a Railway

1. Vuelve a Railway > Variables

2. Agrega:
   ```bash
   N8N_WEBHOOK_URL=https://[tu-n8n-url].up.railway.app
   N8N_API_KEY=[genera uno en n8n Settings > API]
   ```

3. Save y redeploy

✅ **Fase 4 Completada**

---

## Fase 5: Validación y Testing

**Tiempo**: 15 minutos

### 5.1 Validar Variables de Entorno

Localmente (antes de deploy):

```bash
# Crear .env.production con tus valores reales
cp .env.production.example .env.production
nano .env.production

# Validar
node scripts/deployment/validate-env.js
```

### 5.2 Health Checks

```bash
# Backend health
curl https://[tu-url].railway.app/health

# Debe retornar:
# {"status":"healthy","timestamp":"...","services":{"database":"connected","redis":"connected"}}
```

### 5.3 Test API Endpoints

```bash
# Test dashboard KPIs
curl https://[tu-url].railway.app/api/dashboard/kpis/realtime

# Test checkin endpoint (requiere QR válido)
curl -X POST https://[tu-url].railway.app/api/checkin/qr \
  -H "Content-Type: application/json" \
  -d '{"qr_code":"QR001"}'
```

### 5.4 Test WhatsApp Integration

1. Envía un mensaje de prueba desde el número test de Meta:
   ```
   Hola
   ```

2. Verifica en Railway Logs que el webhook recibió el mensaje:
   ```
   [INFO] Webhook received: message from +52...
   ```

3. Deberías recibir respuesta automática

### 5.5 Test n8n Workflows

1. En Supabase, inserta un checkin manual:
   ```sql
   INSERT INTO checkins (member_id, class_id, fecha_hora)
   VALUES (
     (SELECT id FROM members LIMIT 1),
     (SELECT id FROM classes LIMIT 1),
     NOW()
   );
   ```

2. Ve a n8n > Executions

3. Deberías ver una ejecución nueva del workflow `checkin-flow`

4. Si está en verde ✅ → ¡Funciona!

✅ **Fase 5 Completada**

---

## Monitoreo y Observabilidad

### Sentry (Error Tracking)

```bash
# 1. Crear cuenta en sentry.io
# 2. Crear proyecto "gim-ai-production"
# 3. Obtener DSN

# 4. Agregar a Railway:
SENTRY_DSN=https://xxx@oxx.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=production
```

### UptimeRobot (Uptime Monitoring)

1. Crear cuenta en https://uptimerobot.com
2. Add Monitor > HTTP(S)
3. URL: `https://[tu-url].railway.app/health`
4. Interval: 5 minutes
5. Alert via: Email/SMS

---

## Troubleshooting

### Backend no inicia

```bash
# Ver logs en Railway
railway logs

# Errores comunes:
# - Variable de entorno faltante
# - Error de conexión a Supabase
# - Puerto incorrecto
```

### Webhook no funciona

```bash
# 1. Verificar URL correcta
echo $WHATSAPP_WEBHOOK_URL

# 2. Verificar token coincide
# 3. Ver logs de Railway cuando Meta hace verify
# 4. Debe responder con el challenge token
```

### n8n workflows no se activan

- Verificar credenciales configuradas
- Verificar webhooks activos (verde)
- Ver execution logs en n8n

---

## 🎉 ¡Deployment Completado!

Tu sistema GIM_AI está ahora en producción:

- ✅ Backend: `https://[tu-url].railway.app`
- ✅ Database: Supabase
- ✅ WhatsApp: Configurado
- ✅ n8n: Workflows activos
- ✅ Monitoring: Sentry + UptimeRobot

### Próximos Pasos

1. **Agregar dominio personalizado** (opcional)
2. **Configurar backup automático** de Supabase
3. **Agregar más templates** de WhatsApp
4. **Monitorear costos** semanalmente
5. **Escalar** según demanda

---

**Documentado por**: GitHub Copilot AI Agent  
**Versión**: 1.0.0  
**Fecha**: 4 de Octubre de 2025
