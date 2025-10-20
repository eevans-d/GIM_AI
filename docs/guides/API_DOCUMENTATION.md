# 📖 GIM_AI API Documentation

**Versión**: 1.0.0  
**Base URL**: `https://gim-ai-production.up.railway.app`  
**Fecha**: Octubre 3, 2025

---

## 🎯 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Autenticación](#autenticación)
3. [Rate Limiting](#rate-limiting)
4. [Endpoints](#endpoints)
   - [Health & Status](#health--status)
   - [Members](#members)
   - [Classes](#classes)
   - [Check-ins](#check-ins)
   - [Payments](#payments)
   - [Surveys](#surveys)
   - [Instructors](#instructors)
5. [Webhooks](#webhooks)
6. [Error Handling](#error-handling)
7. [Code Examples](#code-examples)

---

## 📚 Introducción

### Resumen

GIM_AI API es una RESTful API para gestión de gimnasios con integración de WhatsApp para automatización de check-ins, recordatorios, y pagos.

### Features Principales

- ✅ QR check-in automático
- ✅ Mensajes WhatsApp contextuales
- ✅ Gestión de clases y reservas
- ✅ Sistema de pagos y deudas
- ✅ Encuestas post-clase (NPS)
- ✅ Reemplazos de instructores
- ✅ Dashboard ejecutivo

### Base URL

```
Production: https://gim-ai-production.up.railway.app
Staging: https://gim-ai-staging.up.railway.app (si existe)
Local: http://localhost:3000
```

### API Versioning

```
Current: v1
Endpoint prefix: /api/v1/
```

---

## 🔐 Autenticación

### Tipos de Autenticación

GIM_AI usa diferentes métodos según el tipo de usuario:

#### 1. JWT Token (Admin/Staff)

**Headers**:
```http
Authorization: Bearer <jwt_token>
```

**Obtener token**:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@gimapp.com",
  "password": "your-password"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@gimapp.com",
    "role": "admin"
  },
  "expiresIn": "24h"
}
```

#### 2. API Key (Integraciones)

**Headers**:
```http
X-API-Key: your-api-key-here
```

**Obtener API Key**:
1. Login como admin
2. Dashboard → Settings → API Keys
3. Generate New Key

#### 3. PIN Hash (Instructores)

**Headers**:
```http
X-Instructor-Pin: hashed-pin
```

**Uso**: Instructor panel para cancelar clases, marcar ausencias, etc.

#### 4. Webhook Signature (WhatsApp)

**Headers**:
```http
X-Hub-Signature-256: sha256=<signature>
```

**Validación**:
```javascript
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', process.env.WHATSAPP_WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');
```

---

## 🚦 Rate Limiting

### Límites por Endpoint

| Endpoint Type | Rate Limit | Window |
|---------------|------------|--------|
| Public endpoints | 100 req | 15 min |
| Authenticated | 1000 req | 15 min |
| Webhooks | No limit | - |
| Health checks | No limit | - |

### Headers de Rate Limit

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1696348800
```

### Error Response (429)

```json
{
  "error": {
    "type": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 900
  }
}
```

---

## 🏥 Health & Status

### GET /health

**Descripción**: Health check general del sistema

**Auth**: None

**Response**:

```json
{
  "status": "healthy",
  "uptime": 123456,
  "timestamp": "2025-10-03T12:00:00.000Z",
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": 45
    },
    "redis": {
      "status": "healthy",
      "responseTime": 12
    },
    "whatsapp": {
      "status": "healthy",
      "responseTime": 234
    }
  },
  "version": "1.0.0"
}
```

**Status Codes**:
- `200`: Sistema healthy
- `503`: Sistema degraded o unhealthy

---

### GET /api/v1/health

**Descripción**: API-specific health check

**Auth**: None

**Response**:

```json
{
  "status": "operational",
  "timestamp": "2025-10-03T12:00:00.000Z",
  "endpoints": {
    "members": "operational",
    "classes": "operational",
    "checkins": "operational",
    "payments": "operational"
  }
}
```

---

## 👥 Members

### GET /api/v1/members

**Descripción**: Listar todos los miembros

**Auth**: JWT (Admin/Staff)

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Página (default: 1) |
| `limit` | integer | No | Items por página (default: 20, max: 100) |
| `status` | string | No | Filtrar por status: `activo`, `inactivo`, `suspendido` |
| `search` | string | No | Buscar por nombre, email, teléfono |

**Request**:

```http
GET /api/v1/members?page=1&limit=20&status=activo
Authorization: Bearer <jwt_token>
```

**Response**:

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nombre": "Juan Pérez",
      "email": "juan@example.com",
      "telefono": "+54 9 11 1234-5678",
      "codigo_qr": "GIM_JUAN_PEREZ_123456",
      "fecha_registro": "2025-01-15T10:00:00.000Z",
      "status": "activo",
      "plan": "mensual",
      "deuda_actual": 0,
      "ultimo_checkin": "2025-10-02T18:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

### GET /api/v1/members/:id

**Descripción**: Obtener detalles de un miembro

**Auth**: JWT (Admin/Staff)

**Path Parameters**:
- `id`: UUID del miembro

**Response**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "telefono": "+54 9 11 1234-5678",
  "codigo_qr": "GIM_JUAN_PEREZ_123456",
  "fecha_registro": "2025-01-15T10:00:00.000Z",
  "fecha_nacimiento": "1990-05-20",
  "genero": "masculino",
  "status": "activo",
  "plan": "mensual",
  "deuda_actual": 0,
  "fecha_ultimo_pago": "2025-10-01T00:00:00.000Z",
  "checkins": {
    "total": 45,
    "este_mes": 12
  },
  "clase_favorita": "Spinning",
  "instructor_favorito": "María García"
}
```

---

### POST /api/v1/members

**Descripción**: Crear nuevo miembro

**Auth**: JWT (Admin/Staff)

**Request Body**:

```json
{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "telefono": "+54 9 11 1234-5678",
  "fecha_nacimiento": "1990-05-20",
  "genero": "masculino",
  "plan": "mensual",
  "fecha_inicio_plan": "2025-10-03"
}
```

**Response** (201):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "codigo_qr": "GIM_JUAN_PEREZ_987654",
  "qr_image_url": "https://storage.supabase.co/v1/object/public/qr-codes/juan_perez_qr.png",
  "mensaje": "Miembro creado exitosamente. Código QR generado."
}
```

**Validations**:
- `nombre`: Requerido, 3-100 caracteres
- `email`: Requerido, formato email válido, único
- `telefono`: Requerido, formato argentino, único
- `plan`: Enum: `diario`, `semanal`, `mensual`, `trimestral`, `anual`

---

### PATCH /api/v1/members/:id

**Descripción**: Actualizar datos de miembro

**Auth**: JWT (Admin/Staff)

**Request Body** (partial update):

```json
{
  "status": "suspendido",
  "deuda_actual": 5000,
  "notas": "Cliente solicitó suspensión temporal"
}
```

**Response**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "mensaje": "Miembro actualizado exitosamente"
}
```

---

### DELETE /api/v1/members/:id

**Descripción**: Eliminar miembro (soft delete)

**Auth**: JWT (Admin only)

**Response**:

```json
{
  "mensaje": "Miembro eliminado exitosamente",
  "deleted_at": "2025-10-03T12:00:00.000Z"
}
```

**Nota**: Soft delete mantiene datos históricos (check-ins, pagos) pero marca el miembro como `deleted`.

---

## 🏋️ Classes

### GET /api/v1/classes

**Descripción**: Listar todas las clases

**Auth**: None (público) o JWT

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fecha` | date | No | Filtrar por fecha (YYYY-MM-DD) |
| `instructor_id` | uuid | No | Filtrar por instructor |
| `tipo` | string | No | Tipo de clase: `spinning`, `crossfit`, `yoga`, etc. |
| `disponible` | boolean | No | Solo clases con cupos disponibles |

**Request**:

```http
GET /api/v1/classes?fecha=2025-10-03&disponible=true
```

**Response**:

```json
{
  "data": [
    {
      "id": "clase-uuid-1",
      "nombre": "Spinning Intenso",
      "tipo": "spinning",
      "instructor": {
        "id": "instructor-uuid",
        "nombre": "María García"
      },
      "fecha": "2025-10-03",
      "hora_inicio": "18:00",
      "hora_fin": "19:00",
      "duracion_minutos": 60,
      "capacidad_maxima": 20,
      "inscritos": 15,
      "disponible": true,
      "sala": "Sala Principal"
    }
  ],
  "total": 8
}
```

---

### GET /api/v1/classes/:id

**Descripción**: Detalles de una clase específica

**Auth**: None

**Response**:

```json
{
  "id": "clase-uuid-1",
  "nombre": "Spinning Intenso",
  "tipo": "spinning",
  "descripcion": "Clase de alta intensidad cardiovascular",
  "instructor": {
    "id": "instructor-uuid",
    "nombre": "María García",
    "certificaciones": ["Spinning Level 3", "Personal Trainer"]
  },
  "fecha": "2025-10-03",
  "hora_inicio": "18:00",
  "hora_fin": "19:00",
  "duracion_minutos": 60,
  "capacidad_maxima": 20,
  "inscritos": 15,
  "disponible": true,
  "sala": "Sala Principal",
  "nivel": "intermedio-avanzado",
  "equipamiento_necesario": ["Bicicleta spinning", "Toalla"],
  "reservas": [
    {
      "member_id": "member-uuid",
      "nombre": "Juan Pérez",
      "confirmado": true
    }
  ]
}
```

---

### POST /api/v1/classes

**Descripción**: Crear nueva clase

**Auth**: JWT (Admin/Instructor)

**Request Body**:

```json
{
  "nombre": "Spinning Intenso",
  "tipo": "spinning",
  "instructor_id": "instructor-uuid",
  "fecha": "2025-10-03",
  "hora_inicio": "18:00",
  "duracion_minutos": 60,
  "capacidad_maxima": 20,
  "sala": "Sala Principal",
  "nivel": "intermedio-avanzado",
  "recurrente": false
}
```

**Response** (201):

```json
{
  "id": "clase-uuid-1",
  "mensaje": "Clase creada exitosamente"
}
```

**Recurrente** (opcional):

```json
{
  "recurrente": true,
  "dias_semana": [1, 3, 5],  // Lunes, Miércoles, Viernes
  "fecha_fin_recurrencia": "2025-12-31"
}
```

---

### POST /api/v1/classes/:id/reservar

**Descripción**: Reservar cupo en clase

**Auth**: JWT (Member) o API Key

**Request Body**:

```json
{
  "member_id": "member-uuid"
}
```

**Response**:

```json
{
  "reserva_id": "reserva-uuid",
  "clase": {
    "nombre": "Spinning Intenso",
    "fecha": "2025-10-03",
    "hora_inicio": "18:00"
  },
  "confirmado": true,
  "mensaje": "Reserva confirmada. Recordatorio será enviado 2 horas antes."
}
```

**Errors**:
- `400`: Clase llena
- `409`: Ya tiene reserva en esta clase
- `400`: Miembro con deuda (si configurado para bloquear)

---

### DELETE /api/v1/classes/:id/reservar/:reserva_id

**Descripción**: Cancelar reserva

**Auth**: JWT (Member/Admin)

**Response**:

```json
{
  "mensaje": "Reserva cancelada exitosamente",
  "cupo_liberado": true
}
```

**Nota**: Cancela hasta 2 horas antes de la clase. Después requiere aprobación de admin.

---

## ✅ Check-ins

### POST /api/checkin

**Descripción**: Registrar check-in por QR

**Auth**: None (usa código QR como identificación)

**Request Body**:

```json
{
  "qr_code": "GIM_JUAN_PEREZ_123456",
  "clase_id": "clase-uuid-1"
}
```

**Response**:

```json
{
  "checkin_id": "checkin-uuid",
  "member": {
    "nombre": "Juan Pérez",
    "telefono": "+54 9 11 1234-5678"
  },
  "clase": {
    "nombre": "Spinning Intenso",
    "instructor": "María García",
    "hora_inicio": "18:00"
  },
  "timestamp": "2025-10-03T17:55:00.000Z",
  "whatsapp_confirmacion": {
    "enviado": true,
    "mensaje_id": "wamid.abc123"
  },
  "mensaje": "Check-in registrado. Confirmación enviada por WhatsApp."
}
```

**Business Logic**:
1. Valida código QR existe
2. Verifica si tiene reserva (si es obligatorio)
3. Verifica cupo disponible
4. Registra check-in en DB
5. Envía confirmación por WhatsApp
6. Programa recolección contextual (90 min después)

**Errors**:
- `404`: Código QR no encontrado
- `400`: Clase llena (sin reserva)
- `409`: Ya hizo check-in en esta clase
- `403`: Miembro suspendido

---

### GET /api/v1/checkins

**Descripción**: Historial de check-ins

**Auth**: JWT (Admin/Staff)

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `member_id` | uuid | Filtrar por miembro |
| `clase_id` | uuid | Filtrar por clase |
| `fecha_desde` | date | Desde fecha (YYYY-MM-DD) |
| `fecha_hasta` | date | Hasta fecha |

**Response**:

```json
{
  "data": [
    {
      "id": "checkin-uuid",
      "member": {
        "id": "member-uuid",
        "nombre": "Juan Pérez"
      },
      "clase": {
        "id": "clase-uuid",
        "nombre": "Spinning Intenso",
        "instructor": "María García"
      },
      "timestamp": "2025-10-03T17:55:00.000Z",
      "asistio": true
    }
  ],
  "total": 450,
  "pagination": {
    "page": 1,
    "limit": 50
  }
}
```

---

## 💳 Payments

### GET /api/v1/payments

**Descripción**: Historial de pagos

**Auth**: JWT (Admin/Staff)

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `member_id` | uuid | Filtrar por miembro |
| `estado` | string | `pendiente`, `pagado`, `vencido` |
| `fecha_desde` | date | Desde fecha |
| `fecha_hasta` | date | Hasta fecha |

**Response**:

```json
{
  "data": [
    {
      "id": "pago-uuid",
      "member": {
        "id": "member-uuid",
        "nombre": "Juan Pérez"
      },
      "concepto": "Cuota Mensual - Octubre 2025",
      "monto": 15000,
      "fecha_vencimiento": "2025-10-05",
      "fecha_pago": "2025-10-03",
      "estado": "pagado",
      "metodo_pago": "mercadopago",
      "referencia_externa": "mp-123456789"
    }
  ],
  "total": 120,
  "resumen": {
    "total_cobrado": 1800000,
    "total_pendiente": 45000,
    "miembros_al_dia": 110,
    "miembros_con_deuda": 10
  }
}
```

---

### POST /api/v1/payments

**Descripción**: Registrar pago manual

**Auth**: JWT (Admin/Staff)

**Request Body**:

```json
{
  "member_id": "member-uuid",
  "concepto": "Cuota Mensual - Octubre 2025",
  "monto": 15000,
  "fecha_pago": "2025-10-03",
  "metodo_pago": "efectivo",
  "notas": "Pago recibido en recepción"
}
```

**Response** (201):

```json
{
  "id": "pago-uuid",
  "recibo_url": "https://storage.supabase.co/v1/object/public/receipts/recibo_123.pdf",
  "mensaje": "Pago registrado exitosamente",
  "whatsapp_notificacion": {
    "enviado": true,
    "mensaje": "Recibo enviado por WhatsApp"
  }
}
```

---

### GET /api/v1/payments/deudores

**Descripción**: Miembros con deuda

**Auth**: JWT (Admin/Staff)

**Response**:

```json
{
  "data": [
    {
      "member_id": "member-uuid",
      "nombre": "Juan Pérez",
      "telefono": "+54 9 11 1234-5678",
      "deuda_actual": 30000,
      "dias_mora": 15,
      "ultimo_pago": "2025-08-15",
      "cuotas_vencidas": 2,
      "estado_coleccion": "recordatorio_enviado",
      "ultimo_contacto": "2025-10-01"
    }
  ],
  "resumen": {
    "total_deudores": 10,
    "deuda_total": 450000,
    "promedio_dias_mora": 22
  }
}
```

---

## 📊 Surveys

### POST /api/v1/surveys/respuesta

**Descripción**: Registrar respuesta de encuesta (llamado por n8n/WhatsApp)

**Auth**: Webhook signature

**Request Body**:

```json
{
  "member_id": "member-uuid",
  "clase_id": "clase-uuid",
  "nps_score": 9,
  "comentario": "Excelente clase, muy motivadora",
  "timestamp": "2025-10-03T20:00:00.000Z"
}
```

**Response**:

```json
{
  "id": "survey-uuid",
  "nps_categoria": "promotor",
  "seguimiento_requerido": false,
  "mensaje": "Respuesta registrada exitosamente"
}
```

**NPS Categorías**:
- 0-6: Detractor (seguimiento automático)
- 7-8: Pasivo
- 9-10: Promotor

---

### GET /api/v1/surveys/stats

**Descripción**: Estadísticas de encuestas

**Auth**: JWT (Admin)

**Query Parameters**:
- `fecha_desde`, `fecha_hasta`: Rango de fechas
- `instructor_id`: Filtrar por instructor
- `tipo_clase`: Filtrar por tipo de clase

**Response**:

```json
{
  "nps_score": 72,
  "total_respuestas": 450,
  "distribucion": {
    "promotores": 320,
    "pasivos": 100,
    "detractores": 30
  },
  "por_instructor": [
    {
      "instructor_id": "uuid",
      "nombre": "María García",
      "nps_score": 85,
      "total_respuestas": 150
    }
  ],
  "por_tipo_clase": [
    {
      "tipo": "spinning",
      "nps_score": 78,
      "total_respuestas": 200
    }
  ],
  "comentarios_recientes": [
    {
      "member": "Juan P.",
      "nps_score": 9,
      "comentario": "Excelente clase",
      "fecha": "2025-10-03"
    }
  ]
}
```

---

## 👨‍🏫 Instructors

### GET /api/v1/instructors

**Descripción**: Listar instructores

**Auth**: None (público)

**Response**:

```json
{
  "data": [
    {
      "id": "instructor-uuid",
      "nombre": "María García",
      "especialidades": ["spinning", "crossfit"],
      "certificaciones": ["Spinning Level 3", "Personal Trainer"],
      "bio": "Instructora con 8 años de experiencia",
      "foto_url": "https://storage.supabase.co/...",
      "nps_promedio": 85,
      "clases_totales": 450,
      "disponible": true
    }
  ]
}
```

---

### POST /api/v1/instructors/:id/cancelar-clase

**Descripción**: Cancelar clase (instructor)

**Auth**: X-Instructor-Pin

**Request Body**:

```json
{
  "clase_id": "clase-uuid",
  "motivo": "Enfermedad",
  "buscar_reemplazo": true
}
```

**Response**:

```json
{
  "clase_cancelada": true,
  "estudiantes_notificados": 15,
  "busqueda_reemplazo": {
    "iniciada": true,
    "candidatos": 3,
    "notificaciones_enviadas": 3
  }
}
```

**Business Logic**:
1. Cancela la clase
2. Notifica a estudiantes inscritos
3. Si `buscar_reemplazo=true`, ejecuta workflow n8n
4. Envía ofertas a instructores candidatos
5. Primer instructor que acepta toma la clase

---

## 🪝 Webhooks

### POST /whatsapp/webhook

**Descripción**: Webhook de WhatsApp Business

**Auth**: X-Hub-Signature-256

**Events Recibidos**:

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "123456789",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "messages": [
              {
                "from": "5491112345678",
                "id": "wamid.abc123",
                "timestamp": "1696348800",
                "type": "text",
                "text": {
                  "body": "Hola"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Tipos de Eventos**:
- `messages`: Mensajes entrantes
- `message_status`: Estado de mensajes enviados (sent, delivered, read, failed)
- `message_reactions`: Reacciones a mensajes

**Processing**:
1. Valida signature
2. Parsea evento
3. Actualiza estado en DB
4. Trigger workflows n8n si es necesario

**Verification** (GET):

```http
GET /whatsapp/webhook?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=CHALLENGE
```

**Response**: Echo del `hub.challenge`

---

### POST /webhooks/n8n/:workflow_id

**Descripción**: Webhook para recibir eventos de n8n

**Auth**: X-N8N-Signature (opcional)

**Request Body**: Variable según workflow

**Response**:

```json
{
  "received": true,
  "workflow_id": "workflow-uuid",
  "processed_at": "2025-10-03T12:00:00.000Z"
}
```

---

## ❌ Error Handling

### Error Response Format

Todos los errores siguen el mismo formato:

```json
{
  "error": {
    "type": "ERROR_TYPE",
    "message": "Human-readable error message",
    "code": "GIM_ERR_001",
    "details": {
      "field": "email",
      "reason": "Already exists"
    },
    "correlationId": "req-uuid-12345"
  }
}
```

### Error Types

| Type | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `AUTHENTICATION_ERROR` | 401 | Missing or invalid auth |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | External service down |

### Validation Errors

```json
{
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "errors": [
        {
          "field": "email",
          "message": "Invalid email format",
          "value": "invalid-email"
        },
        {
          "field": "telefono",
          "message": "Phone number already exists"
        }
      ]
    }
  }
}
```

### Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| `200` | Success | GET request successful |
| `201` | Created | Resource created successfully |
| `204` | No Content | DELETE successful |
| `400` | Bad Request | Invalid input data |
| `401` | Unauthorized | Missing authentication |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Duplicate resource |
| `422` | Unprocessable | Semantic error |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Error | Server error |
| `503` | Service Unavailable | External service down |

---

## 💻 Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const BASE_URL = 'https://gim-ai-production.up.railway.app';
const API_KEY = 'your-api-key';

// Login y obtener token
async function login(email, password) {
  const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
    email,
    password
  });
  return response.data.token;
}

// Listar miembros
async function getMembers(token) {
  const response = await axios.get(`${BASE_URL}/api/v1/members`, {
    headers: {
      'Authorization': `Bearer ${token}`
    },
    params: {
      page: 1,
      limit: 20,
      status: 'activo'
    }
  });
  return response.data;
}

// Crear miembro
async function createMember(token, memberData) {
  const response = await axios.post(
    `${BASE_URL}/api/v1/members`,
    memberData,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
}

// Check-in por QR
async function checkin(qrCode, claseId) {
  const response = await axios.post(`${BASE_URL}/api/checkin`, {
    qr_code: qrCode,
    clase_id: claseId
  });
  return response.data;
}

// Uso
(async () => {
  const token = await login('admin@gimapp.com', 'password');
  const members = await getMembers(token);
  console.log(`Total members: ${members.pagination.total}`);
})();
```

---

### Python

```python
import requests

BASE_URL = 'https://gim-ai-production.up.railway.app'

class GIMClient:
    def __init__(self, api_key=None):
        self.base_url = BASE_URL
        self.token = None
        self.api_key = api_key
    
    def login(self, email, password):
        response = requests.post(
            f'{self.base_url}/api/v1/auth/login',
            json={'email': email, 'password': password}
        )
        response.raise_for_status()
        self.token = response.json()['token']
        return self.token
    
    def get_members(self, page=1, limit=20, status='activo'):
        headers = {'Authorization': f'Bearer {self.token}'}
        params = {'page': page, 'limit': limit, 'status': status}
        
        response = requests.get(
            f'{self.base_url}/api/v1/members',
            headers=headers,
            params=params
        )
        response.raise_for_status()
        return response.json()
    
    def create_member(self, member_data):
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            f'{self.base_url}/api/v1/members',
            headers=headers,
            json=member_data
        )
        response.raise_for_status()
        return response.json()
    
    def checkin(self, qr_code, clase_id):
        response = requests.post(
            f'{self.base_url}/api/checkin',
            json={'qr_code': qr_code, 'clase_id': clase_id}
        )
        response.raise_for_status()
        return response.json()

# Uso
client = GIMClient()
client.login('admin@gimapp.com', 'password')
members = client.get_members(page=1, limit=20)
print(f"Total members: {members['pagination']['total']}")
```

---

### cURL

```bash
# Login
curl -X POST https://gim-ai-production.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gimapp.com",
    "password": "password"
  }'

# Listar miembros
TOKEN="your-jwt-token"
curl -X GET "https://gim-ai-production.up.railway.app/api/v1/members?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"

# Crear miembro
curl -X POST https://gim-ai-production.up.railway.app/api/v1/members \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "telefono": "+54 9 11 1234-5678",
    "plan": "mensual"
  }'

# Check-in
curl -X POST https://gim-ai-production.up.railway.app/api/checkin \
  -H "Content-Type: application/json" \
  -d '{
    "qr_code": "GIM_JUAN_PEREZ_123456",
    "clase_id": "clase-uuid-1"
  }'

# Health check
curl https://gim-ai-production.up.railway.app/health
```

---

## 🔗 Additional Resources

- **Postman Collection**: [Download](./GIM_AI.postman_collection.json)
- **OpenAPI Spec**: [Download](./openapi.yaml)
- **Deployment Guide**: [docs/DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **WhatsApp Integration**: [docs/WHATSAPP_WEBHOOK_SETUP.md](./WHATSAPP_WEBHOOK_SETUP.md)

---

## 📞 Support

- **Email**: support@gimapp.com
- **GitHub Issues**: https://github.com/eevans-d/GIM_AI/issues
- **Documentation**: https://docs.gimapp.com

---

**Última actualización**: Octubre 3, 2025  
**Versión API**: 1.0.0
