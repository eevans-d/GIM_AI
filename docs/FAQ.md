# 🆘 FAQ y Troubleshooting - GIM_AI

**Versión**: 1.0.0  
**Fecha**: Octubre 3, 2025

---

## 📑 Tabla de Contenidos

1. [FAQ General](#faq-general)
2. [FAQ Técnico](#faq-técnico)
3. [Troubleshooting Common Issues](#troubleshooting-common-issues)
4. [Error Messages](#error-messages)
5. [Performance Issues](#performance-issues)
6. [Security & Privacy](#security--privacy)
7. [Contact Support](#contact-support)

---

## ❓ FAQ General

### Sistema y Funcionamiento

**P: ¿Qué es GIM_AI?**
R: GIM_AI es un sistema integral de gestión de gimnasios que automatiza check-ins con QR, mensajería WhatsApp, pagos, y gestión de clases.

**P: ¿Necesito descargar una app?**
R: No. Los miembros usan WhatsApp (que ya tienen instalado). Los admins acceden vía navegador web. Los instructores tienen panel web con acceso PIN.

**P: ¿Funciona en cualquier dispositivo?**
R: Sí. Dashboard web responsive funciona en PC, Mac, tablets, smartphones. Compatible con Chrome, Firefox, Safari, Edge.

**P: ¿Requiere internet?**
R: Sí. Requiere conexión estable para sincronización en tiempo real. WiFi recomendado en el gimnasio.

**P: ¿Qué pasa si se cae internet?**
R: El sistema queda temporalmente inaccesible. Los check-ins QR requieren internet. Cuando se restaura, todo se sincroniza automáticamente.

**P: ¿Cuánto cuesta?**
R: Contactar para cotización personalizada. Generalmente entre $8-18/mes USD en infraestructura + licencia GIM_AI.

### Miembros y Check-in

**P: ¿Cómo obtienen los miembros su código QR?**
R: Al registrarse, el sistema genera QR automáticamente y lo envía por WhatsApp. También pueden descargarlo/imprimirlo desde su perfil.

**P: ¿El QR expira?**
R: No. El QR es permanente mientras el miembro esté activo. Solo cambia si el admin lo regenera manualmente.

**P: ¿Puedo hacer check-in sin QR?**
R: Por defecto no, pero el admin puede habilitar check-in manual en recepción buscando por nombre/teléfono.

**P: ¿Cuántas veces puedo hacer check-in por día?**
R: Depende de tu plan. Planes ilimitados permiten múltiples clases por día. Planes limitados tienen cuota.

### WhatsApp y Mensajes

**P: ¿Por qué uso WhatsApp y no otra app?**
R: WhatsApp tiene 98% penetración en Argentina y Latam. Los usuarios ya lo tienen y no necesitan instalar nada nuevo.

**P: ¿Los mensajes de WhatsApp son gratis?**
R: Para el miembro sí (solo usa su plan de datos). El gimnasio paga ~$0.005-0.01 USD por conversación (primeras 1,000/mes gratis).

**P: ¿Puedo desactivar mensajes de WhatsApp?**
R: Miembros pueden responder "STOP" para no recibir mensajes promocionales, pero confirmaciones de check-in y recordatorios críticos sí se envían.

**P: ¿Cuántos mensajes recibo por día?**
R: Máximo 2 por día (configurable). Ejemplo: confirmación de check-in + encuesta post-clase.

**P: ¿En qué horario envían mensajes?**
R: Solo de 9 AM a 9 PM (configurable). Fuera de ese horario, los mensajes se encolan para el siguiente día hábil.

### Pagos

**P: ¿Qué métodos de pago aceptan?**
R: Efectivo, transferencia bancaria, MercadoPago (tarjetas de crédito/débito). Configurable por gimnasio.

**P: ¿El pago online es seguro?**
R: Sí. Usamos MercadoPago (certificado PCI-DSS). GIM_AI nunca almacena datos de tarjetas.

**P: ¿Qué pasa si no pago a tiempo?**
R: Recibes recordatorios automáticos (días +3, +7, +15). Suspensión configurable por el admin (típicamente día +30).

**P: ¿Puedo pagar cuotas por adelantado?**
R: Sí. El admin puede registrar pagos anticipados y el sistema ajusta vencimientos automáticamente.

### Clases y Reservas

**P: ¿Debo reservar clases?**
R: Depende de la política del gimnasio. Algunos requieren reserva obligatoria, otros permiten asistencia libre por orden de llegada.

**P: ¿Puedo cancelar una reserva?**
R: Sí, hasta 2 horas antes de la clase (configurable). Después requiere aprobación de admin.

**P: ¿Qué pasa si una clase se cancela?**
R: Recibes notificación por WhatsApp inmediatamente. El sistema busca instructor reemplazo automáticamente.

---

## 🔧 FAQ Técnico

### Arquitectura y Stack

**P: ¿Qué tecnologías usa GIM_AI?**
R: Node.js/Express backend, PostgreSQL (Supabase), Redis, WhatsApp Business Cloud API, n8n workflows, React frontend.

**P: ¿Dónde se hostea?**
R: Railway (recomendado) o Render. Ambos con servidores en USA con latencia <100ms para Argentina.

**P: ¿Los datos están en Argentina?**
R: La base de datos está en Supabase (servidores USA). Cumple con leyes de protección de datos. Opción de deployment local disponible.

**P: ¿Cuánto tarda en deployar?**
R: Deploy inicial: 2-3 horas (primera vez). Deployments subsiguientes: 2-3 minutos (auto-deploy desde GitHub).

**P: ¿Puedo self-hostear GIM_AI?**
R: Sí, pero requiere infraestructura propia (servidor Linux, PostgreSQL, Redis, SSL). Recomendamos Railway/Render por simplicidad.

### Integraciones

**P: ¿Se integra con mi sistema de cobros actual?**
R: Sí, vía API REST. Soportamos webhooks bidireccionales. Documentación en `docs/API_DOCUMENTATION.md`.

**P: ¿Puedo integrar con mi CRM?**
R: Sí, vía API. Endpoints disponibles para crear/actualizar miembros, obtener métricas, etc.

**P: ¿Soporta múltiples sucursales?**
R: Actualmente una instancia por gimnasio. Multi-tenancy en roadmap para Q1 2026.

**P: ¿Puedo exportar mis datos?**
R: Sí. Reportes exportables en CSV/Excel/PDF. Export completo de base de datos disponible para admins.

### Seguridad

**P: ¿Cómo se protegen los datos?**
R: Encriptación TLS 1.3 en tránsito, bcrypt para contraseñas, JWT tokens con expiración, Supabase RLS policies, backups diarios encriptados.

**P: ¿Quién puede acceder a los datos?**
R: Solo admins autorizados del gimnasio. Staff puede tener permisos limitados. Instructores solo ven sus clases. GIM_AI staff técnico NO accede a datos excepto por soporte autorizado.

**P: ¿Hacen backups?**
R: Sí. Supabase hace backups diarios automáticos (7 días retention en free tier). Backups manuales disponibles en dashboard.

**P: ¿Qué pasa si hay un breach de seguridad?**
R: Notificación inmediata a admins, investigación completa, parche de vulnerabilidad, reporte detallado. Nunca ha ocurrido.

### Performance

**P: ¿Cuántos usuarios soporta?**
R: Configuración típica: 500-1,000 miembros activos. Escalable a 10,000+ con plan enterprise.

**P: ¿Cuál es el uptime?**
R: Target 99.5% (43 minutos downtime/mes máximo). Monitoreado 24/7 con Sentry + UptimeRobot.

**P: ¿Qué tan rápido es?**
R: API response time p95: <500ms. Health check: <200ms. Check-in QR: <2 segundos end-to-end.

---

## 🛠️ Troubleshooting Common Issues

### 1. Código QR No Funciona

**Síntomas**:
- Scanner no lee el QR
- Error "Código QR inválido"
- Pantalla del scanner no responde

**Diagnóstico**:

```bash
# Test 1: Verificar QR es válido
curl -X POST https://your-app.railway.app/api/checkin \
  -H "Content-Type: application/json" \
  -d '{"qr_code": "GIM_JUAN_PEREZ_123456"}'

# Respuesta esperada: 200 OK con datos del miembro
# Respuesta error: 404 "QR code not found"
```

**Soluciones**:

1. **QR borroso/dañado**:
   - Aumentar brillo del celular al 100%
   - Limpiar cámara del scanner
   - Mostrar QR en pantalla completa
   - Regenerar QR desde dashboard (Admin → Miembro → Regenerar QR)

2. **Miembro no encontrado**:
   - Verificar miembro está activo (no suspendido/eliminado)
   - Verificar QR corresponde al gimnasio correcto
   - Regenerar QR desde dashboard

3. **Scanner offline**:
   - Verificar conexión WiFi del dispositivo
   - Restart app del scanner
   - Verificar backend está up: `curl https://your-app/health`

4. **QR expirado** (si configurado):
   - Regenerar QR automáticamente al escanear
   - O solicitar nuevo QR al admin

---

### 2. WhatsApp Messages Not Sending

**Síntomas**:
- Confirmaciones de check-in no llegan
- Recordatorios no se envían
- Status en dashboard: "Message failed"

**Diagnóstico**:

```bash
# Test 1: Verificar conexión WhatsApp API
curl https://your-app.railway.app/api/v1/whatsapp/status

# Test 2: Ver logs de WhatsApp queue
railway logs --filter "whatsapp"

# Test 3: Verificar rate limits
# Dashboard → WhatsApp → Message Queue
```

**Causas Comunes**:

1. **Rate limit excedido**:
   - WhatsApp permite 2 mensajes/usuario/24h por defecto
   - Check dashboard: ¿usuario ya recibió 2 mensajes hoy?
   - Solución: Esperar 24h o aumentar límite en config

2. **Número no válido**:
   - WhatsApp requiere número con código país: +54 9 11 1234-5678
   - Verificar formato en perfil de miembro
   - Solución: Admin edita número con formato correcto

3. **Template no aprobado**:
   - Meta debe aprobar templates antes de usar
   - Check Meta Business Suite: ¿template está "Approved"?
   - Solución: Re-submitir template o usar template aprobado

4. **Access token expirado**:
   - WhatsApp access tokens duran 60 días
   - Check `.env`: `WHATSAPP_ACCESS_TOKEN`
   - Solución: Generar nuevo token en Meta Business Suite

5. **Horario fuera de rango**:
   - Por defecto, mensajes solo se envían 9 AM - 9 PM
   - Check hora actual vs `WHATSAPP_BUSINESS_HOURS`
   - Solución: Mensaje se encola para siguiente horario hábil

**Soluciones**:

```javascript
// Verificar config WhatsApp
// config/whatsapp.config.js

module.exports = {
  PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
  ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN, // ¿Actualizado?
  BUSINESS_HOURS: {
    start: 9, // 9 AM
    end: 21   // 9 PM
  },
  RATE_LIMIT: {
    maxMessagesPerDay: 2, // ¿Aumentar a 3-4?
    windowHours: 24
  }
};
```

**Test manual de envío**:

```bash
# Enviar mensaje de test
node scripts/test-whatsapp-send.js +5491112345678 "Test message"

# Si falla, ver error específico en logs
```

---

### 3. Dashboard Login Issues

**Síntomas**:
- "Invalid credentials" con contraseña correcta
- "Session expired" inmediatamente después de login
- 401 Unauthorized en API calls

**Diagnóstico**:

```bash
# Test 1: Verificar backend está up
curl https://your-app.railway.app/health

# Test 2: Test login endpoint
curl -X POST https://your-app.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gym.com","password":"yourpassword"}'

# Respuesta esperada: {"token": "eyJhbGc...", "user": {...}}
```

**Causas y Soluciones**:

1. **Contraseña incorrecta**:
   - Verificar Caps Lock, teclado, espacios
   - Resetear contraseña: Dashboard → "Forgot password"

2. **JWT_SECRET incorrecto**:
   - Tokens generados con un secret, validados con otro
   - Check `.env.production`: `JWT_SECRET` match entre deployments
   - Solución: Regenerar secret y re-deploy (invalida sesiones actuales)

3. **Token expirado**:
   - Tokens duran 24h por defecto
   - Browser cachea tokens viejos
   - Solución: Hard refresh (Ctrl+Shift+R) o clear browser cache

4. **CORS issues**:
   - Frontend en `app.gym.com`, backend en `api.gym.com`
   - Check `index.js`: CORS configurado para tu domain
   - Solución: Agregar domain a whitelist

```javascript
// index.js - Verificar CORS
const cors = require('cors');
app.use(cors({
  origin: [
    'https://app.gimapp.com',
    'https://your-custom-domain.com' // ¿Agregado?
  ],
  credentials: true
}));
```

5. **Cookie issues** (si se usan):
   - SameSite=Strict puede bloquear cookies cross-domain
   - Solución: Cambiar a SameSite=Lax o None con Secure

---

### 4. Slow API Responses

**Síntomas**:
- Dashboard tarda >5 segundos en cargar
- API responses >2 segundos
- Timeouts en requests

**Diagnóstico**:

```bash
# Test 1: Measure response times
time curl https://your-app.railway.app/health

# Test 2: Check Railway metrics
railway metrics --service gim-ai-production

# Test 3: Sentry Performance
# Ver transaction traces en Sentry dashboard
```

**Causas y Soluciones**:

1. **Database slow queries**:
   - Queries sin índices
   - Join de muchas tablas
   - Full table scans

   **Diagnóstico**:
   ```sql
   -- Ver queries lentas en Supabase
   -- Dashboard → Database → Query Performance
   SELECT * FROM pg_stat_statements 
   ORDER BY mean_exec_time DESC 
   LIMIT 10;
   ```

   **Solución**:
   ```sql
   -- Agregar índices
   CREATE INDEX idx_members_telefono ON members(telefono);
   CREATE INDEX idx_checkins_member_id ON checkins(member_id);
   CREATE INDEX idx_checkins_clase_id ON checkins(clase_id);
   CREATE INDEX idx_payments_member_id ON payments(member_id);
   ```

2. **No caching**:
   - Mismas queries se ejecutan repetidamente
   - Redis no está funcionando

   **Diagnóstico**:
   ```bash
   # Verificar Redis conectado
   railway logs --filter "Redis connected"
   ```

   **Solución**:
   ```javascript
   // Implementar caching para queries frecuentes
   const redis = require('./config/redis');
   
   async function getMembers() {
     const cacheKey = 'members:active';
     
     // Try cache first
     const cached = await redis.get(cacheKey);
     if (cached) return JSON.parse(cached);
     
     // Query DB
     const members = await supabase
       .from('members')
       .select('*')
       .eq('status', 'activo');
     
     // Cache for 5 minutes
     await redis.setex(cacheKey, 300, JSON.stringify(members));
     
     return members;
   }
   ```

3. **External API timeouts**:
   - WhatsApp API lento
   - Gemini AI lento
   - Supabase lento

   **Solución**:
   - Aumentar timeouts
   - Implementar circuit breaker (ya existe en `utils/error-handler.js`)
   - Async processing para operaciones no críticas

4. **Too many open connections**:
   - Connection pool exhausted
   - Memory leaks

   **Diagnóstico**:
   ```bash
   # Ver memory usage
   railway metrics --metric memory
   
   # Ver logs de connection errors
   railway logs --filter "ECONNREFUSED"
   ```

   **Solución**:
   ```javascript
   // Aumentar pool size en Supabase client
   const supabase = createClient(url, key, {
     db: {
       pool: {
         min: 2,
         max: 10 // Aumentar de 5 a 10
       }
     }
   });
   ```

---

### 5. Database Connection Errors

**Síntomas**:
- "connect ETIMEDOUT"
- "ECONNREFUSED"
- "Too many connections"

**Diagnóstico**:

```bash
# Test 1: Ping database
pg_isready -h your-db.supabase.co -p 5432

# Test 2: Test connection
psql "postgresql://postgres:password@your-db.supabase.co:5432/postgres" -c "SELECT 1"

# Test 3: Ver logs
railway logs --filter "database"
```

**Causas y Soluciones**:

1. **Wrong connection string**:
   - Check `.env`: `SUPABASE_URL` y `SUPABASE_SERVICE_KEY`
   - Verificar no tiene espacios al inicio/fin
   - Verificar formato: `https://xxxx.supabase.co`

2. **Firewall/IP blocking**:
   - Supabase bloquea IPs no autorizadas en free tier
   - Solución: Supabase Dashboard → Settings → Database → Allow all IPs

3. **Connection pool exhausted**:
   - Free tier limita a 5 conexiones simultáneas
   - Solución: Upgrade a Pro ($25/mes) o implementar connection pooling

4. **Database asleep** (Render free tier):
   - Render free tier duerme DB después de 15 min inactividad
   - Solución: Upgrade a paid tier o implementar keep-alive ping

---

### 6. Redis Connection Errors

**Síntomas**:
- "Redis connection refused"
- Rate limiter no funciona
- Message queue stuck

**Diagnóstico**:

```bash
# Test 1: Ping Redis
redis-cli -u $REDIS_URL ping
# Respuesta esperada: PONG

# Test 2: Ver logs
railway logs --filter "redis"
```

**Soluciones**:

1. **Wrong REDIS_URL**:
   - Check `.env`: `REDIS_URL=redis://host:port`
   - Railway: `REDIS_URL=${{Redis.REDIS_URL}}`
   - Render: URL del Redis service

2. **TLS not enabled**:
   - Railway/Render requieren TLS
   - Check `.env`: `REDIS_TLS_ENABLED=true`

3. **Redis service down**:
   - Railway Dashboard → Redis service → Status
   - Restart si es necesario

4. **Memory limit exceeded** (free tier):
   - Free tier: 25MB
   - Check usage: `redis-cli -u $REDIS_URL INFO memory`
   - Solución: `FLUSHALL` o upgrade

---

## 🚨 Error Messages

### Common Error Codes

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| `GIM_ERR_001` | QR code not found | QR inválido o miembro eliminado | Regenerar QR |
| `GIM_ERR_002` | Member suspended | Miembro con deuda >30 días | Regularizar pago |
| `GIM_ERR_003` | Class full | Clase al 100% capacidad | Reservar otra clase |
| `GIM_ERR_004` | Invalid credentials | Email/password incorrectos | Verificar o resetear |
| `GIM_ERR_005` | Rate limit exceeded | >100 req/15 min | Esperar o contactar admin |
| `GIM_ERR_006` | WhatsApp send failed | Token inválido o template no aprobado | Regenerar token |
| `GIM_ERR_007` | Database timeout | Query >5 segundos | Optimizar query o aumentar timeout |
| `GIM_ERR_008` | Payment processing failed | MercadoPago error | Reintentar o método alternativo |

### Error Response Format

Todos los errores siguen este formato:

```json
{
  "error": {
    "type": "VALIDATION_ERROR",
    "code": "GIM_ERR_001",
    "message": "QR code not found",
    "details": {
      "qr_code": "GIM_INVALID_123"
    },
    "correlationId": "req-uuid-12345",
    "timestamp": "2025-10-03T12:00:00.000Z"
  }
}
```

**Para reportar error a soporte**:
- Copiar `correlationId`
- Copiar `timestamp`
- Describir qué estabas haciendo
- Enviar a: soporte@gimapp.com

---

## ⚡ Performance Issues

### Dashboard Slow Loading

**Target**: <2 segundos para load inicial

**Diagnóstico**:
1. Abrir Dev Tools (F12) → Network tab
2. Reload página
3. Ver qué requests tardan >1 segundo

**Soluciones**:

1. **API lento**: Ver "Slow API Responses" arriba
2. **Imágenes pesadas**: Optimizar imágenes (max 500KB)
3. **Muchas requests**: Implementar pagination
4. **No caching**: Habilitar browser caching

```javascript
// index.js - Agregar cache headers
app.use((req, res, next) => {
  if (req.path.match(/\.(jpg|jpeg|png|gif|ico|css|js)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 día
  }
  next();
});
```

### High Memory Usage

**Target**: <512MB en Railway/Render

**Diagnóstico**:

```bash
# Ver memory usage
railway metrics --metric memory

# Ver logs de memory warnings
railway logs --filter "heap"
```

**Causas**:

1. **Memory leaks**: Event listeners no removed
2. **Large objects in memory**: Caching gigabytes de datos
3. **No garbage collection**: Node.js no libera memoria

**Soluciones**:

```bash
# Aumentar memory limit en Railway
railway settings --memory 1024  # 512MB → 1GB

# O optimizar código para usar menos memoria
# Implementar streaming para large datasets
# Usar pagination
# Clear cache periódicamente
```

### High CPU Usage

**Target**: <50% en Railway/Render

**Diagnóstico**:

```bash
railway metrics --metric cpu
```

**Causas**:

1. **Infinite loops**: Bug en código
2. **Heavy computations**: Procesamiento de imagen, AI
3. **Too many cron jobs**: 100 jobs corriendo simultáneamente

**Soluciones**:

- Profile código con Node.js profiler
- Mover computaciones pesadas a workers (Bull queue)
- Optimizar cron jobs (no todos a la vez)

---

## 🔐 Security & Privacy

### Data Privacy

**P: ¿Qué datos personales almacenan?**
R: Nombre, email, teléfono, fecha nacimiento, género, historial de check-ins, pagos. NO almacenamos datos de tarjetas (eso lo hace MercadoPago).

**P: ¿Puedo solicitar mis datos (GDPR)?**
R: Sí. Contactar admin del gimnasio o soporte@gimapp.com. Respuesta en 30 días.

**P: ¿Puedo solicitar eliminación de datos?**
R: Sí. Contactar admin. Datos se eliminan excepto lo requerido por ley (registros contables 5 años).

### Security Best Practices

**Para Admins**:
- ✅ Usar contraseñas fuertes (12+ chars)
- ✅ Habilitar 2FA (two-factor authentication)
- ✅ No compartir credenciales
- ✅ Cerrar sesión en computadoras públicas
- ✅ Revisar logs de auditoría semanalmente

**Para Miembros**:
- ✅ No compartir código QR
- ✅ Reportar QR perdido inmediatamente
- ✅ No responder a mensajes sospechosos (phishing)

### Suspected Security Breach

**Si sospechas un breach**:

1. **Cambiar todas las contraseñas** inmediatamente
2. **Contactar soporte**: soporte@gimapp.com con "SECURITY" en subject
3. **Revisar logs** de auditoría (Dashboard → Configuración → Logs)
4. **Notificar a usuarios afectados** (si aplica)

**GIM_AI investiga**:
- Análisis de logs
- Identificación de vector de ataque
- Patch de vulnerabilidad
- Reporte completo

---

## 📞 Contact Support

### Soporte Técnico

**Email**: soporte@gimapp.com  
**Horario**: Lun-Vie 9-18hs ART  
**Respuesta**: <24 horas (hábiles)

**Incluir en tu mensaje**:
- Descripción del problema
- Steps para reproducir
- Screenshots/videos si es posible
- `correlationId` si hay error
- Timestamp del error
- Navegador/dispositivo usado

### Soporte de Emergencia

**Para outages críticos** (sistema completamente down):

**WhatsApp**: +54 9 11 XXXX-XXXX  
**Disponibilidad**: 24/7  
**Respuesta**: <2 horas

**Considerar emergencia**:
- Sistema completamente inaccesible >30 min
- Data loss
- Security breach

### Community Support

**Foro**: community.gimapp.com  
**Stack Overflow**: Tag `gim-ai`  
**GitHub Issues**: github.com/eevans-d/GIM_AI/issues

### Recursos Adicionales

- **Documentación completa**: docs.gimapp.com
- **Video tutorials**: youtube.com/gimapp
- **Changelog**: changelog.gimapp.com
- **Status page**: status.gimapp.com (uptime)

---

## 🔄 Reporting Bugs

### Bug Report Template

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment**
 - OS: [e.g. Windows 10, macOS, iOS]
 - Browser [e.g. chrome, safari]
 - Version [e.g. 22]
 - GIM_AI Version [e.g. 1.0.0]

**Additional context**
- Correlation ID (if available): req-uuid-12345
- Timestamp: 2025-10-03T12:00:00Z
- User role: Admin/Instructor/Member
```

**Enviar a**: bugs@gimapp.com o GitHub Issues

---

## 📝 Feature Requests

**Para solicitar nuevas features**:

1. Buscar si ya existe en roadmap: roadmap.gimapp.com
2. Si no existe, crear request en: features.gimapp.com
3. Describir:
   - Problema que resuelve
   - Solución propuesta
   - Beneficio esperado
   - Casos de uso

**Evaluación**: Monthly review de feature requests. Top voted se priorizan.

---

**Última actualización**: Octubre 3, 2025  
**Próxima revisión**: Noviembre 3, 2025

---

**¿No encontraste tu pregunta?** Contacta soporte@gimapp.com
