# 🔐 Guía de Obtención de Credenciales de Producción

**Fecha**: Octubre 3, 2025  
**Propósito**: Obtener todas las credenciales necesarias para desplegar GIM_AI en producción

---

## 📋 Checklist de Credenciales

- [ ] Supabase (Database)
- [ ] WhatsApp Business API
- [ ] Google Gemini AI
- [ ] Redis (Railway/Upstash)
- [ ] MercadoPago (Payment Gateway)
- [ ] n8n Workflows
- [ ] Sentry (Error Tracking)

---

## 1️⃣ Supabase - Base de Datos PostgreSQL

### Paso 1: Crear Proyecto
1. Ir a: https://app.supabase.com/
2. Click en "New Project"
3. Configurar:
   - **Name**: `gim-ai-production`
   - **Database Password**: Generar password seguro
   - **Region**: South America (São Paulo)
   - **Plan**: Pro ($25/mes recomendado para producción)

### Paso 2: Obtener Credenciales
1. Ir a: Settings > API
2. Copiar:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Paso 3: Actualizar .env.production
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Paso 4: Migrar Esquema
```bash
# Conectar a Supabase y ejecutar migraciones
cd database/schemas
# Ejecutar en orden:
# 1. core_tables.sql
# 2. ai_tables.sql
# 3. api_ecosystem.sql
```

---

## 2️⃣ WhatsApp Business API

### Paso 1: Crear Cuenta Business
1. Ir a: https://business.facebook.com/
2. Crear Business Manager o usar existente
3. Ir a: https://developers.facebook.com/apps/

### Paso 2: Crear App de WhatsApp
1. Click "Create App"
2. Tipo: **Business**
3. Nombre: `GIM_AI Production`
4. Agregar producto: **WhatsApp**

### Paso 3: Configurar Número
1. En dashboard de WhatsApp
2. Click "Add Phone Number"
3. Opciones:
   - **Opción A**: Usar número de prueba (temporal)
   - **Opción B**: Verificar número propio (recomendado)

### Paso 4: Obtener Credenciales
1. En WhatsApp > API Setup:
   - **Phone Number ID**: Copiar ID del número
   - **Business Account ID**: Copiar ID de la cuenta
   - **Temporary Access Token**: Copiar token (válido 24h)

### Paso 5: Generar Token Permanente
1. Ir a: Settings > Basic > Generate Access Token
2. Configurar permisos:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
3. **GUARDAR TOKEN** (no se puede ver de nuevo)

### Paso 6: Configurar Webhook
1. En WhatsApp > Configuration:
2. Click "Edit" en Webhook
3. Configurar:
   - **Callback URL**: `https://tu-app.railway.app/api/v1/webhooks/whatsapp`
   - **Verify Token**: `gim_ai_webhook_2025` (debe coincidir con .env)
4. Suscribirse a eventos:
   - `messages`
   - `message_status`

### Paso 7: Actualizar .env.production
```bash
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098765
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_WEBHOOK_VERIFY_TOKEN=gim_ai_webhook_2025
```

### Paso 8: Aprobar Templates de Mensajes
**CRÍTICO**: Todos los mensajes deben usar templates aprobados.

1. Ir a: WhatsApp > Message Templates
2. Crear/Aprobar estos 18 templates:

**Templates Requeridos**:
- `checkin_confirmation` - Confirmación de entrada
- `class_reminder_24h` - Recordatorio 24h antes
- `class_reminder_2h` - Recordatorio 2h antes
- `debt_contextual_payment` - Cobro contextual post-clase
- `debt_gentle_reminder` - Recordatorio suave de deuda
- `debt_final_notice` - Aviso final de deuda
- `survey_post_class` - Encuesta post-clase
- `class_cancellation` - Cancelación de clase
- `instructor_replacement` - Cambio de instructor
- `membership_expiring` - Membresía por vencer
- `payment_received` - Confirmación de pago
- `waitlist_spot_available` - Lugar disponible en lista de espera
- `birthday_greeting` - Felicitación de cumpleaños
- `achievement_unlocked` - Logro desbloqueado
- `coaching_insight` - Insight personalizado
- `class_recommendation` - Recomendación de clase
- `churn_risk_engagement` - Reactivación de miembro inactivo
- `welcome_new_member` - Bienvenida nuevo miembro

**Proceso de aprobación**: 24-48 horas por Meta

---

## 3️⃣ Google Gemini AI

### Paso 1: Obtener API Key
1. Ir a: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Seleccionar proyecto de Google Cloud o crear nuevo
4. Copiar API Key

### Paso 2: Actualizar .env.production
```bash
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
GEMINI_MODEL=gemini-1.5-flash
```

### Paso 3: Configurar Quotas
1. Ir a Google Cloud Console
2. APIs & Services > Gemini API
3. Aumentar quotas si es necesario (default: 60 req/min)

---

## 4️⃣ Redis - Queue System

### Opción A: Railway (Recomendado)

1. Ir a: https://railway.app/
2. Click "New Project"
3. Seleccionar "Provision Redis"
4. Copiar **Connection URL**:
   ```
   redis://default:password@redis.railway.internal:6379
   ```

### Opción B: Upstash (Serverless Redis)

1. Ir a: https://console.upstash.com/
2. Click "Create Database"
3. Configurar:
   - **Name**: `gim-ai-production`
   - **Region**: AWS South America (São Paulo)
   - **Type**: Regional (mejor latencia)
4. Copiar **Redis URL** con TLS

### Actualizar .env.production
```bash
REDIS_URL=redis://default:xxxxx@redis.railway.internal:6379
REDIS_TLS=true
```

---

## 5️⃣ MercadoPago - Payment Gateway

### Paso 1: Crear Cuenta
1. Ir a: https://www.mercadopago.com.ar/developers/
2. Crear cuenta o login
3. Ir a "Tus aplicaciones"

### Paso 2: Crear Aplicación
1. Click "Crear aplicación"
2. Nombre: `GIM_AI Production`
3. Seleccionar: **Pagos online y marketplace**

### Paso 3: Obtener Credenciales de Producción
1. Ir a la aplicación
2. Tab "Credenciales"
3. Activar **Modo Producción**
4. Copiar:
   - **Access Token**: `APP_USR-xxxx`
   - **Public Key**: `APP_USR-xxxx`

### Paso 4: Configurar Webhooks
1. En la aplicación > Webhooks
2. URL: `https://tu-app.railway.app/api/v1/webhooks/mercadopago`
3. Eventos:
   - `payment.created`
   - `payment.updated`

### Actualizar .env.production
```bash
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxx
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxxxxxxxxxx
```

---

## 6️⃣ n8n Workflows

### Opción A: n8n Cloud (Recomendado)

1. Ir a: https://n8n.io/
2. Crear cuenta
3. Plan: Starter ($20/mes)
4. Importar workflows desde `n8n-workflows/`

### Opción B: Self-hosted en Railway

1. Railway > New Project > Deploy n8n
2. Configurar variables de entorno
3. Acceder a instancia

### Obtener Webhook URLs

Cada workflow genera una URL única:

```
https://your-instance.app.n8n.cloud/webhook/collection-sequence
https://your-instance.app.n8n.cloud/webhook/class-reminder
https://your-instance.app.n8n.cloud/webhook/post-class-survey
```

### Actualizar .env.production
```bash
N8N_WEBHOOK_BASE_URL=https://your-instance.app.n8n.cloud
N8N_WEBHOOK_COLLECTION=https://your-instance.app.n8n.cloud/webhook/collection-sequence
N8N_WEBHOOK_REMINDER=https://your-instance.app.n8n.cloud/webhook/class-reminder
N8N_WEBHOOK_SURVEY=https://your-instance.app.n8n.cloud/webhook/post-class-survey
```

---

## 7️⃣ Sentry - Error Tracking

### Paso 1: Crear Cuenta
1. Ir a: https://sentry.io/
2. Sign up (plan Developer gratis hasta 5k eventos/mes)

### Paso 2: Crear Proyecto
1. Click "Create Project"
2. Plataforma: **Node.js**
3. Nombre: `gim-ai-production`

### Paso 3: Obtener DSN
1. En el proyecto > Settings > Client Keys (DSN)
2. Copiar **DSN URL**:
   ```
   https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx
   ```

### Actualizar .env.production
```bash
SENTRY_DSN=https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx
SENTRY_ENVIRONMENT=production
```

---

## ✅ Validación de Credenciales

Una vez completadas todas las credenciales:

```bash
# 1. Copiar archivo de producción
cp .env.production .env

# 2. Ejecutar validación
node scripts/validate-production-config.js

# 3. Verificar resultado
# ✅ Todas las validaciones deben pasar
```

---

## 🚀 Próximos Pasos

Después de obtener credenciales:

1. ✅ Validar configuración
2. 🔄 Migrar base de datos
3. 📱 Aprobar templates de WhatsApp (24-48h)
4. 🚀 Deploy a Railway/Render
5. 📊 Configurar monitoreo
6. 🧪 Testing E2E en producción

---

## 📞 Soporte

Si encuentras problemas:

- **Supabase**: https://supabase.com/docs
- **WhatsApp API**: https://developers.facebook.com/docs/whatsapp
- **Gemini**: https://ai.google.dev/docs
- **Railway**: https://docs.railway.app/
- **Sentry**: https://docs.sentry.io/

---

**Última actualización**: Octubre 3, 2025
