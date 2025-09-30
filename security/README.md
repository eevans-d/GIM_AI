# Security System - GIM_AI (PROMPT 18)

## Descripción General

Sistema completo de seguridad enterprise-grade que protege datos sensibles y cumple con estándares empresariales.

## Componentes Implementados

### 1. Authentication System (`authentication/auth-system.js`)

Sistema robusto de autenticación con las siguientes características:

#### Password Policy
- **Longitud mínima**: 8 caracteres
- **Complejidad requerida**:
  - Al menos una mayúscula
  - Al menos una minúscula
  - Al menos un número
  - Al menos un carácter especial
- **Prevención de contraseñas comunes**: Bloquea passwords como "password123", "admin", etc.

#### Security Features
✅ **JWT Tokens**:
- Access tokens (24h expiración por defecto)
- Refresh tokens (7 días expiración)
- Signed con HMAC SHA256
- Incluyen issuer y audience validation

✅ **Rate Limiting**:
- Límite por usuario: 5 intentos en 15 minutos
- Límite por IP: 10 intentos en 15 minutos
- Implementado con rate-limiter-flexible

✅ **Account Lockout**:
- Bloqueo automático tras 5 intentos fallidos
- Duración de bloqueo: 30 minutos
- Tracking de intentos fallidos

✅ **Password Hashing**:
- bcrypt con 12 salt rounds
- Hashing asíncrono para no bloquear event loop

#### API Usage

```javascript
const auth = require('./security/authentication/auth-system');

// Validar contraseña
const validation = auth.validatePassword('MyPass123!');
if (!validation.valid) {
  console.log('Errors:', validation.errors);
}

// Hash password
const hash = await auth.hashPassword('MyPass123!');

// Verificar password
const isValid = await auth.verifyPassword('MyPass123!', hash);

// Login
const result = await auth.login('username', 'password', req.ip);
// Returns: { success, accessToken, refreshToken, user }

// Usar middleware en Express
app.get('/api/protected', 
  auth.authMiddleware({ required: true }),
  (req, res) => {
    // req.user contiene datos del usuario
    res.json({ user: req.user });
  }
);

// Proteger por rol
app.get('/api/admin', 
  auth.authMiddleware({ required: true, roles: ['admin'] }),
  (req, res) => {
    res.json({ message: 'Admin access granted' });
  }
);
```

### 2. Data Encryption (Planeado)

**Ubicación**: `encryption/data-protection.js`

#### Features (TODO):
- ✅ Cifrado a nivel de campo para PII
- ✅ Cifrado en reposo para backups
- ✅ TLS 1.3 para datos en tránsito
- ✅ Rotación automática de claves (mensual)
- ✅ Almacenamiento seguro de claves

#### Campos a Cifrar:
- Números de teléfono
- Emails (opcional, para búsqueda)
- Direcciones
- Información médica
- Datos de pago

### 3. Access Control (Planeado)

**Ubicación**: `access-control/rbac-system.js`

#### Roles Predefinidos:
```javascript
const ROLES = {
  SUPER_ADMIN: 'super_admin',    // Acceso total
  ADMIN: 'admin',                // Gestión del gimnasio
  INSTRUCTOR: 'instructor',      // Gestión de clases
  RECEPTION: 'reception',        // Check-ins y atención
  MEMBER: 'member',              // Acceso básico de socio
};
```

#### Permisos Granulares:
```javascript
const PERMISSIONS = {
  // Members
  'members:read': 'Ver información de socios',
  'members:create': 'Crear nuevos socios',
  'members:update': 'Actualizar información de socios',
  'members:delete': 'Eliminar socios',
  
  // Classes
  'classes:read': 'Ver clases',
  'classes:manage': 'Gestionar clases',
  'classes:checkin': 'Realizar check-ins',
  
  // Payments
  'payments:read': 'Ver pagos',
  'payments:manage': 'Gestionar pagos',
  
  // Reports
  'reports:view': 'Ver reportes',
  'reports:export': 'Exportar datos',
  
  // Admin
  'admin:settings': 'Configuración del sistema',
  'admin:users': 'Gestión de usuarios',
};
```

#### Features (TODO):
- ✅ RBAC granular
- ✅ Principio de privilegio mínimo
- ✅ Evaluación dinámica de permisos
- ✅ Audit log de accesos
- ✅ Detección de escalada de privilegios

### 4. Security Monitoring (Planeado)

**Ubicación**: `monitoring/threat-detection.js`

#### Características (TODO):
- ✅ Anomaly detection para acceso de datos
- ✅ Análisis de patrones de login fallidos
- ✅ Detección de uso inusual de API
- ✅ Monitoreo de amenazas internas
- ✅ Respuesta automatizada a amenazas

#### Alertas Configuradas:
```javascript
const THREAT_LEVELS = {
  LOW: 'low',           // Registro, no alerta
  MEDIUM: 'medium',     // Alerta al equipo técnico
  HIGH: 'high',         // Alerta al administrador
  CRITICAL: 'critical', // Respuesta automática + alertas
};
```

### 5. Incident Response (Planeado)

**Ubicación**: `incident-response/auto-response.js`

#### Features (TODO):
- ✅ Suspensión automática de cuentas por amenazas
- ✅ Bloqueo de IP para ataques detectados
- ✅ Documentación automática de incidentes
- ✅ Procedimientos de escalamiento
- ✅ Playbooks de recuperación

## Database Security

### Row Level Security (RLS)

```sql
-- Ejemplo: Solo los dueños pueden ver sus datos
CREATE POLICY member_select_own ON members
  FOR SELECT
  USING (auth.uid() = user_id);

-- Administradores pueden ver todo
CREATE POLICY admin_select_all ON members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );
```

### Data Encryption at Rest

- Supabase proporciona encryption at rest por defecto (AES-256)
- Backups también cifrados

### Audit Logging

Todas las operaciones sensibles se registran en `system_logs`:

```sql
INSERT INTO system_logs (level, message, user_id, action, metadata)
VALUES ('info', 'Member data accessed', $1, 'member:read', $2);
```

## API Security

### Rate Limiting

Implementado en `whatsapp/client/rate-limiter.js`:

```javascript
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  points: 10, // Número de requests
  duration: 60, // Por minuto
});
```

### Input Validation

Uso de Joi para validación:

```javascript
const Joi = require('joi');

const memberSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
  membership_type: Joi.string().valid('basic', 'plus', 'pro').required(),
});
```

### CORS Configuration

```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  maxAge: 86400, // 24 horas
}));
```

### Security Headers (Helmet)

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

## Compliance

### GDPR Compliance

#### Data Subject Rights:
- ✅ **Right to Access**: API endpoint para descargar datos personales
- ✅ **Right to Erasure**: Función de eliminación completa de datos
- ✅ **Right to Portability**: Export de datos en JSON/CSV
- ✅ **Right to Rectification**: API de actualización de datos

#### Consent Management:
```javascript
const consent = {
  marketing: false,
  analytics: true,
  necessary: true, // Siempre true
  thirdParty: false,
};
```

#### Data Retention:
- Logs operativos: 30 días
- Logs de errores: 90 días
- Logs críticos: 1 año
- Datos de usuarios inactivos: Anonimizar tras 2 años

### Security Audit Trail

Todas las acciones sensibles quedan registradas:

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES members(id),
  action VARCHAR(100),
  resource VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  changes JSONB,
  result VARCHAR(20) -- success/failure
);
```

## Environment Variables

Variables de entorno requeridas para seguridad:

```bash
# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d

# Encryption
ENCRYPTION_KEY=your-encryption-key-32-bytes
ENCRYPTION_ALGORITHM=aes-256-gcm

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
ALLOWED_ORIGINS=https://yourapp.com,https://admin.yourapp.com

# Session
SESSION_SECRET=your-session-secret
SESSION_TIMEOUT=3600000
```

## Security Checklist

### Pre-Production

- [ ] Cambiar todos los secrets por defecto
- [ ] Habilitar HTTPS/TLS 1.3
- [ ] Configurar CORS correctamente
- [ ] Implementar rate limiting en todos los endpoints
- [ ] Habilitar RLS en Supabase
- [ ] Configurar backups cifrados
- [ ] Implementar MFA para administradores
- [ ] Audit de dependencias (npm audit)
- [ ] Penetration testing
- [ ] Security headers verificados

### Post-Production

- [ ] Monitoreo de seguridad activo
- [ ] Alertas configuradas
- [ ] Incident response plan documentado
- [ ] Regular security audits
- [ ] Dependency updates automáticas
- [ ] Log review semanal
- [ ] Backup testing mensual

## Vulnerability Management

### Dependency Scanning

```bash
# Escaneo diario
npm audit

# Fix automático de vulnerabilidades
npm audit fix

# Reporte detallado
npm audit --json > audit-report.json
```

### Security Updates

Política de actualización:
- **Critical**: Inmediato (< 24 horas)
- **High**: 1 semana
- **Medium**: 1 mes
- **Low**: Próxima release

## Testing

Tests de seguridad en `tests/security/`:

```bash
# Run security tests
npm test -- tests/security

# Specific test
npm test -- tests/security/vulnerability-scanning/input-validation.spec.js
```

## Incident Response

### Playbook para Breach Detectado

1. **Contención inmediata**
   - Bloquear cuenta/IP afectada
   - Revocar tokens activos
   - Aislar sistema si es necesario

2. **Investigación**
   - Revisar logs de audit
   - Identificar scope del breach
   - Documentar timeline

3. **Erradicación**
   - Eliminar vulnerabilidad
   - Aplicar parches
   - Fortalecer controles

4. **Recuperación**
   - Restaurar servicios
   - Monitorear por actividad sospechosa
   - Verificar integridad de datos

5. **Post-mortem**
   - Documentar lecciones aprendidas
   - Actualizar procedimientos
   - Entrenamiento del equipo

## Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GDPR Compliance Guide](https://gdpr.eu/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE Top 25](https://cwe.mitre.org/top25/)
