# 📘 Manual de Usuario - GIM_AI

**Versión**: 1.0.0  
**Fecha**: Octubre 3, 2025  
**Audiencia**: Administradores, Instructores, Miembros

---

## 📑 Tabla de Contenidos

1. [Manual de Administrador](#manual-de-administrador)
2. [Manual de Instructor](#manual-de-instructor)
3. [Manual de Miembro](#manual-de-miembro)
4. [FAQ General](#faq-general)

---

# 👨‍💼 Manual de Administrador

## 🎯 Introducción

Como administrador de GIM_AI, tienes acceso completo al sistema para gestionar miembros, clases, pagos, instructores y configuraciones.

---

## 🚀 Primeros Pasos

### 1. Acceso al Dashboard

**URL**: `https://app.gimapp.com/dashboard` (o tu dominio personalizado)

**Credenciales**:
- Email: `admin@tugimnasio.com`
- Contraseña: (proporcionada en setup inicial)

**Seguridad**:
- ✅ Usa contraseña fuerte (12+ caracteres, mayúsculas, números, símbolos)
- ✅ Cambia contraseña al primer login
- ✅ No compartas credenciales

### 2. Explorar el Dashboard

Al iniciar sesión verás:

```
╔════════════════════════════════════════════════════════╗
║                  GIM_AI Dashboard                      ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  📊 Métricas Hoy                                      ║
║  ├─ Check-ins: 45                                     ║
║  ├─ Clases activas: 8                                 ║
║  ├─ Ocupación: 75%                                    ║
║  └─ Ingresos del mes: $450,000                        ║
║                                                        ║
║  👥 Miembros                                          ║
║  💳 Pagos y Cobros                                    ║
║  🏋️ Clases y Horarios                                 ║
║  👨‍🏫 Instructores                                      ║
║  📊 Reportes                                          ║
║  ⚙️ Configuración                                     ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

---

## 👥 Gestión de Miembros

### Crear Nuevo Miembro

1. Dashboard → **Miembros** → **Nuevo Miembro**
2. Completar formulario:

   ```
   Datos Personales:
   - Nombre completo: Juan Pérez
   - Email: juan@example.com
   - Teléfono: +54 9 11 1234-5678
   - Fecha de nacimiento: 20/05/1990
   - Género: Masculino
   
   Plan:
   - Tipo: Mensual
   - Fecha inicio: 03/10/2025
   - Monto: $15,000
   
   Notas (opcional):
   - Lesiones previas, objetivos, etc.
   ```

3. Click **Guardar**

**Resultado**:
- ✅ Miembro creado en base de datos
- ✅ Código QR generado automáticamente
- ✅ QR enviado por WhatsApp al teléfono
- ✅ QR también disponible para descargar/imprimir

### Buscar Miembros

**Barra de búsqueda** (top derecha):
```
🔍 Buscar por nombre, email, teléfono, código QR...
```

**Filtros avanzados**:
- Estado: Activo / Inactivo / Suspendido
- Plan: Diario / Semanal / Mensual / Anual
- Con deuda / Al día
- Fecha de registro: Rango personalizado

### Editar Miembro

1. Click en miembro de la lista
2. Ver perfil completo:
   ```
   Juan Pérez                    [Editar] [Suspender] [Eliminar]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   📧 juan@example.com
   📱 +54 9 11 1234-5678
   🎂 20/05/1990 (35 años)
   📅 Miembro desde: 15/01/2025
   
   Plan Actual: Mensual ($15,000)
   Estado: ✅ Activo
   Deuda: $0 (al día)
   Último pago: 01/10/2025
   
   Check-ins:
   - Total: 45
   - Este mes: 12
   - Promedio mensual: 15
   
   Clase favorita: Spinning (18 veces)
   Instructor favorito: María García
   
   Código QR: GIM_JUAN_PEREZ_123456
   [Ver QR] [Descargar] [Reenviar por WhatsApp]
   ```

3. Click **Editar** para modificar datos
4. Click **Guardar cambios**

### Suspender Miembro

**Uso**: Cliente solicita pausa temporal (ej: viaje, lesión)

1. Perfil miembro → **Suspender**
2. Ingresar motivo y fecha de reactivación
3. Confirmar

**Efectos**:
- ❌ No puede hacer check-in
- ❌ No recibe recordatorios
- ⏸️ Pagos pausados (o configurar si continúan)
- ✅ Datos históricos conservados

**Reactivar**:
1. Perfil miembro → **Reactivar**
2. Confirmar

### Eliminar Miembro

**⚠️ Precaución**: Eliminar es **soft delete** - datos históricos se conservan pero miembro no puede acceder.

1. Perfil miembro → **Eliminar**
2. Confirmar con contraseña de admin
3. Miembro marcado como eliminado

**Recuperar** (si fue accidental):
- Contactar soporte técnico con ID del miembro

---

## 💳 Gestión de Pagos

### Ver Pagos Pendientes

Dashboard → **Pagos** → **Pendientes**

```
Pagos Pendientes (15 miembros)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nombre          | Monto    | Vencimiento | Días mora | Acción
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Juan Pérez      | $15,000  | 05/10/2025  | 0        | [Registrar pago]
María López     | $30,000  | 20/09/2025  | 13       | [Registrar pago] [Contactar]
Carlos Gómez    | $15,000  | 01/10/2025  | 2        | [Registrar pago]
```

### Registrar Pago Manual

**Uso**: Cliente paga en efectivo/transferencia en recepción

1. Pagos → Pendientes → Click miembro → **Registrar pago**
2. Completar formulario:
   ```
   Miembro: Juan Pérez
   Concepto: Cuota Mensual - Octubre 2025
   Monto: $15,000
   Fecha de pago: 03/10/2025
   Método: ☑ Efectivo ☐ Transferencia ☐ MercadoPago
   Referencia (opcional): -
   Notas: Pago recibido en recepción
   ```
3. Click **Guardar**

**Resultado**:
- ✅ Pago registrado en sistema
- ✅ Deuda del miembro actualizada a $0
- ✅ Recibo PDF generado automáticamente
- ✅ Recibo enviado por WhatsApp al cliente
- ✅ Recibo disponible para descargar

### Cobro Automatizado (MercadoPago)

**Configuración** (una sola vez):
1. Configuración → **Integraciones** → **MercadoPago**
2. Conectar cuenta MercadoPago
3. Activar cobro automático

**Funcionamiento**:
- Sistema envía link de pago por WhatsApp 3 días antes de vencimiento
- Cliente paga online con tarjeta
- Pago se registra automáticamente
- Recibo se envía por WhatsApp

### Secuencia de Cobranza Automatizada

**Sistema automático para deudores**:

```
Día 0: Vencimiento de cuota
  ↓
Día +3: Recordatorio amigable por WhatsApp
  ↓ (si no paga)
Día +7: Recordatorio con link de pago
  ↓ (si no paga)
Día +15: Alerta de suspensión
  ↓ (si no paga)
Día +30: Suspensión automática (opcional, configurable)
```

**Configurar secuencia**:
1. Configuración → **Cobranza** → **Secuencia automatizada**
2. Personalizar días y mensajes
3. Activar/desactivar suspensión automática

### Reportes de Pagos

Pagos → **Reportes**

**Reportes disponibles**:
- 💰 Ingresos mensuales (comparativa)
- 📊 Tasa de cobranza (% pagos a tiempo)
- 📉 Morosidad (monto y días promedio)
- 💳 Métodos de pago (distribución)

**Exportar**:
- CSV, Excel, PDF
- Rango de fechas personalizado

---

## 🏋️ Gestión de Clases

### Ver Calendario de Clases

Dashboard → **Clases** → **Calendario**

```
Semana del 30 Sep - 6 Oct 2025
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Lunes 30    Martes 1    Miércoles 2    Jueves 3    Viernes 4
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

06:00       06:00       06:00          06:00       06:00
Yoga        Spinning    Yoga           Spinning    Crossfit
María       Carlos      María          Carlos      Pedro
15/20       18/20       12/20          20/20 FULL  8/15

18:00       18:00       18:00          18:00       18:00
Spinning    Crossfit    Spinning       Crossfit    Spinning
Carlos      Pedro       Carlos         Pedro       María
16/20       14/15       19/20          15/15 FULL  17/20
```

**Leyenda**:
- ⚪ Disponible (< 70% ocupación)
- 🟡 Llenándose (70-90%)
- 🔴 Lleno (100%)
- ⏸️ Cancelada
- 🔄 Reemplazo de instructor

### Crear Nueva Clase

1. Clases → **Nueva Clase**
2. Completar formulario:

   ```
   Clase:
   - Nombre: Spinning Intenso
   - Tipo: ☑ Spinning ☐ Crossfit ☐ Yoga ☐ Pilates ☐ Otro
   - Instructor: María García [Seleccionar]
   - Nivel: ☐ Principiante ☑ Intermedio ☐ Avanzado
   
   Horario:
   - Fecha: 03/10/2025
   - Hora inicio: 18:00
   - Duración: 60 minutos
   - Hora fin: 19:00 (calculado)
   
   Ubicación:
   - Sala: Sala Principal [Seleccionar]
   - Capacidad máxima: 20 personas
   
   Recurrencia (opcional):
   ☑ Repetir esta clase
   - Días: ☑ Lunes ☐ Martes ☑ Miércoles ☐ Jueves ☑ Viernes
   - Hasta: 31/12/2025
   ```

3. Click **Crear**

**Resultado**:
- ✅ Clase creada en calendario
- ✅ Si es recurrente, todas las fechas se crean
- ✅ Disponible para reservas de miembros
- ✅ Instructor notificado por WhatsApp

### Cancelar Clase

**Uso**: Instructor enfermo, mantenimiento de sala, etc.

1. Calendario → Click en clase → **Cancelar**
2. Ingresar motivo:
   ```
   Motivo: Instructor enfermo
   
   ☑ Buscar instructor reemplazo automáticamente
   ☑ Notificar a miembros inscritos por WhatsApp
   
   Mensaje a miembros (personalizar):
   "Hola! Lamentablemente la clase de Spinning de hoy
   18:00 ha sido cancelada. Te avisaremos si encontramos
   reemplazo. Disculpa las molestias!"
   ```
3. Click **Confirmar cancelación**

**Si buscar reemplazo está activado**:
1. Sistema busca instructores disponibles con certificación
2. Envía oferta por WhatsApp a 3 candidatos
3. Primer instructor que acepta toma la clase
4. Miembros notificados del cambio de instructor

---

## 👨‍🏫 Gestión de Instructores

### Agregar Nuevo Instructor

1. Dashboard → **Instructores** → **Nuevo Instructor**
2. Completar formulario:

   ```
   Datos Personales:
   - Nombre: María García
   - Email: maria@example.com
   - Teléfono: +54 9 11 9876-5432
   - Fecha nacimiento: 15/03/1988
   
   Profesional:
   - Especialidades: ☑ Spinning ☑ Crossfit ☐ Yoga ☐ Pilates
   - Certificaciones:
     * Spinning Level 3 - AFAA
     * Personal Trainer - ISSA
   - Años experiencia: 8
   - Bio: (máx 500 caracteres)
     "Instructora apasionada con 8 años de experiencia..."
   
   Acceso:
   - PIN (4 dígitos): 1234
   - Permisos: ☑ Ver calendario ☑ Cancelar clases ☐ Ver pagos
   
   Foto (opcional):
   [Subir foto] - Max 2MB, JPG/PNG
   ```

3. Click **Guardar**

**Resultado**:
- ✅ Instructor creado
- ✅ Puede acceder a Instructor Panel con PIN
- ✅ Visible en perfil público (bio + foto)

### Ver Performance de Instructor

1. Instructores → Click en instructor
2. Ver dashboard:

   ```
   María García                    [Editar] [Suspender]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   Especialidades: Spinning, Crossfit
   Email: maria@example.com
   Teléfono: +54 9 11 9876-5432
   
   📊 Estadísticas Este Mes:
   - Clases dictadas: 48
   - Asistencia promedio: 17.5 / 20 (87.5%)
   - NPS Score: 85 (Excelente) ⭐
   - Cancelaciones: 1
   
   📈 Tendencia NPS:
   Ene  Feb  Mar  Abr  May  Jun  Jul  Ago  Sep
   82   84   83   86   85   87   86   84   85
   
   💬 Comentarios Recientes:
   ⭐⭐⭐⭐⭐ "Excelente motivación" - Juan P. (02/10)
   ⭐⭐⭐⭐⭐ "Muy buena clase" - María L. (01/10)
   ⭐⭐⭐⭐☆ "Podría mejorar música" - Carlos G. (30/09)
   
   📅 Próximas Clases (5):
   03/10 18:00 - Spinning Intenso (Sala Principal)
   04/10 18:00 - Spinning Intenso (Sala Principal)
   05/10 06:00 - Spinning Mañanero (Sala Principal)
   ...
   ```

### Reporte de Instructores

Instructores → **Reportes**

**Métricas**:
- 🏆 Ranking por NPS
- 📊 Ocupación promedio por instructor
- 💬 Comentarios y feedback
- 📉 Tendencias de satisfacción

**Uso**: Identificar mejores instructores, detectar problemas, bonos por performance

---

## 📊 Reportes y Analytics

### Dashboard Ejecutivo

Dashboard → **Reportes** → **Ejecutivo**

```
📊 PANEL EJECUTIVO - Octubre 2025
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 FINANZAS
├─ Ingresos este mes: $450,000 (+12% vs Sep)
├─ Ingresos proyectados: $485,000
├─ Tasa cobranza: 92% (target: 95%)
└─ Deuda pendiente: $68,000 (13 miembros)

👥 MIEMBROS
├─ Total activos: 150 (+8 vs mes anterior)
├─ Nuevos este mes: 12
├─ Bajas este mes: 4
└─ Tasa retención: 97.3%

📈 OCUPACIÓN
├─ Ocupación promedio: 75%
├─ Clases más populares: Spinning (92%), Crossfit (84%)
├─ Horarios pico: 18:00-20:00 (95%), 06:00-08:00 (78%)
└─ Salas subutilizadas: Sala 3 (45%)

😊 SATISFACCIÓN
├─ NPS Score: 72 (Bueno)
├─ Promotores: 71% | Pasivos: 22% | Detractores: 7%
├─ Instructor mejor valorado: María García (NPS 85)
└─ Clase mejor valorada: Spinning (NPS 78)
```

### Reportes Específicos

**Reportes disponibles**:

1. **Reporte de Ingresos**
   - Ingresos diarios/mensuales/anuales
   - Comparativa períodos
   - Proyecciones

2. **Reporte de Asistencia**
   - Check-ins por día/semana/mes
   - Por clase, instructor, horario
   - Tendencias de asistencia

3. **Reporte de Morosidad**
   - Miembros con deuda
   - Antigüedad de deuda
   - Efectividad de cobranza

4. **Reporte de Satisfacción**
   - NPS por instructor
   - NPS por tipo de clase
   - Evolución temporal
   - Comentarios de detractores

5. **Reporte de Ocupación**
   - Por sala, horario, día semana
   - Capacidad vs utilización
   - Oportunidades de optimización

**Exportar reportes**:
- Formatos: PDF, Excel, CSV
- Programar envío automático por email (semanal/mensual)

---

## ⚙️ Configuración del Sistema

### Configuración General

Configuración → **General**

```
Datos del Gimnasio:
- Nombre: Gimnasio Elite
- Dirección: Av. Santa Fe 1234, CABA
- Teléfono: +54 11 4567-8900
- Email contacto: info@gimnasioelit.com
- Website: www.gimnasioelite.com

Horarios de Operación:
- Lunes a Viernes: 06:00 - 22:00
- Sábados: 08:00 - 20:00
- Domingos: Cerrado

Logo:
[Subir logo] - Para emails, recibos, QR codes
```

### WhatsApp Business

Configuración → **WhatsApp**

```
Configuración de Mensajería:
☑ Confirmaciones de check-in
☑ Recordatorios de clase (2 horas antes)
☑ Recordatorios de pago (3 días antes vencimiento)
☑ Encuestas post-clase (90 min después)
☑ Secuencia de cobranza automatizada

Rate Limiting:
- Mensajes por usuario: 2 / 24 horas
- Horario permitido: 09:00 - 21:00

Templates Activos (23):
✅ checkin_confirmation
✅ class_reminder
✅ payment_reminder
✅ post_class_survey
... [Ver todos]

Estado Conexión: ✅ Conectado
Último mensaje enviado: Hace 3 minutos
```

### Planes y Precios

Configuración → **Planes**

```
Plan             | Precio   | Clases/mes | Vigencia
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Diario           | $1,500   | 1 clase    | 1 día
Semanal          | $8,000   | Ilimitado  | 7 días
Mensual          | $15,000  | Ilimitado  | 30 días
Trimestral       | $40,000  | Ilimitado  | 90 días
Anual            | $150,000 | Ilimitado  | 365 días

[Agregar nuevo plan]
```

### Usuarios del Sistema

Configuración → **Usuarios**

```
Usuario              | Rol         | Último acceso    | Acción
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
admin@gym.com        | Admin       | Hace 10 min      | [Editar]
staff@gym.com        | Staff       | Hace 2 horas     | [Editar]
reception@gym.com    | Staff       | Ayer 18:30       | [Editar]

Roles:
- Admin: Acceso total
- Staff: Sin acceso a configuración ni reportes financieros
- Instructor: Solo Instructor Panel

[Agregar usuario]
```

### Backup y Seguridad

Configuración → **Seguridad**

```
Backups Automáticos:
☑ Backup diario de base de datos (3 AM)
- Retención: 30 días
- Última backup: 03/10/2025 03:00 ✅
- [Descargar último backup]
- [Restaurar desde backup]

Seguridad:
☑ Require contraseñas fuertes
☑ 2FA para admins (autenticación 2 factores)
☑ Sesiones expiran en 24 horas
☑ Log de auditoría activado

Logs de Auditoría:
Ver quién hizo qué y cuándo:
- Creación/edición/eliminación de miembros
- Modificación de pagos
- Cambios de configuración
```

---

## 🆘 Soporte

### Ayuda en Contexto

Cada pantalla tiene botón **[?]** en esquina superior derecha con ayuda contextual.

### Contacto Soporte Técnico

- **Email**: soporte@gimapp.com
- **WhatsApp**: +54 9 11 XXXX-XXXX
- **Horario**: Lun-Vie 9-18hs

### Recursos

- **Centro de Ayuda**: help.gimapp.com
- **Videos tutoriales**: youtube.com/gimapp
- **Base de conocimientos**: docs.gimapp.com

---

**Fin del Manual de Administrador**

---

# 👨‍🏫 Manual de Instructor

## 🎯 Introducción

Como instructor de GIM_AI, tienes acceso al **Instructor Panel** para gestionar tus clases, ver asistencias, y gestionar reemplazos.

---

## 🔐 Acceso al Instructor Panel

**URL**: `https://app.gimapp.com/instructor`

**Login**:
1. Ingresar tu **PIN de 4 dígitos**
2. Click **Entrar**

**PIN olvidado**: Contactar administrador del gimnasio.

---

## 📅 Ver Mis Clases

Al ingresar verás tu calendario:

```
╔════════════════════════════════════════════════════════╗
║              Instructor Panel - María García           ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  📊 Resumen de Hoy - 03 Oct 2025                      ║
║  ├─ Clases programadas: 2                             ║
║  ├─ Inscritos total: 34                               ║
║  └─ NPS promedio (este mes): 85 ⭐                    ║
║                                                        ║
║  🕐 Próximas Clases:                                  ║
║                                                        ║
║  06:00 AM - Spinning Mañanero                         ║
║  └─ Sala Principal | 15/20 inscritos                  ║
║     [Ver lista] [Cancelar]                            ║
║                                                        ║
║  06:00 PM - Spinning Intenso                          ║
║  └─ Sala Principal | 19/20 inscritos                  ║
║     [Ver lista] [Cancelar]                            ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

---

## 👥 Ver Lista de Asistentes

1. Click **[Ver lista]** en una clase
2. Verás:

   ```
   Spinning Intenso - 03 Oct 18:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   Inscritos (19/20):
   
   ✅ Juan Pérez              [Check-in: 17:55]
   ✅ María López             [Check-in: 17:58]
   ⏳ Carlos Gómez            [Sin check-in]
   ✅ Ana Martínez            [Check-in: 17:50]
   ⏳ Pedro González          [Sin check-in]
   ...
   
   Cupos disponibles: 1
   
   [Exportar lista] [Imprimir]
   ```

**Uso**: Saber quién asistirá, preparar equipamiento suficiente.

---

## ❌ Cancelar Clase

**Situaciones**: Enfermedad, emergencia, etc.

1. Click **[Cancelar]** en clase
2. Completar formulario:

   ```
   ⚠️ Cancelar Clase
   
   Clase: Spinning Intenso - 03 Oct 18:00
   Inscritos que serán notificados: 19
   
   Motivo:
   ☑ Enfermedad
   ☐ Emergencia personal
   ☐ Otro (especificar)
   
   ☑ Buscar instructor reemplazo automáticamente
   
   El sistema buscará instructores disponibles con
   certificación en Spinning y les enviará ofertas.
   
   ☐ Notificar a administración
   ```

3. Click **Confirmar cancelación**

**Resultado**:
- ✅ Clase cancelada
- ✅ 19 miembros notificados por WhatsApp
- ✅ Sistema busca reemplazo (si marcaste la opción)
- ✅ Administración notificada

**Búsqueda de reemplazo**:
1. Sistema identifica 3 instructores con certificación disponibles
2. Envía oferta por WhatsApp a los 3
3. Primer instructor en aceptar toma la clase
4. Miembros notificados del cambio de instructor
5. Tu clase original se marca como reemplazada

---

## 🔄 Aceptar Reemplazo

Si otro instructor cancela, puedes recibir oferta:

**WhatsApp notification**:
```
🔔 Oferta de Clase Reemplazo

Clase: Spinning Intenso
Fecha: 03 Oct 2025
Hora: 18:00 - 19:00
Sala: Sala Principal
Inscritos: 19/20

Instructor original: Carlos Pérez (enfermedad)

¿Puedes tomar esta clase?

[✅ Sí, acepto] [❌ No puedo]
```

**En Instructor Panel**:
```
🔔 Nueva Oferta de Reemplazo

Spinning Intenso - 03 Oct 18:00
Instructor original: Carlos Pérez
Motivo: Enfermedad
Inscritos: 19/20

[✅ Aceptar] [❌ Rechazar]
```

**Si aceptas**:
- ✅ Clase agregada a tu calendario
- ✅ Estudiantes notificados del cambio
- ✅ Bonus de reemplazo aplicado (si configurado)

---

## 📊 Ver Mi Performance

Panel → **Mi Performance**

```
María García - Performance Octubre 2025
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Estadísticas:
├─ Clases dictadas: 48
├─ Asistencia promedio: 17.5/20 (87.5%)
├─ NPS Score: 85 ⭐ (Excelente)
├─ Cancelaciones: 1
└─ Reemplazos aceptados: 3

📈 Tendencia NPS (últimos 6 meses):
[Gráfico]
Abr: 86 | May: 85 | Jun: 87 | Jul: 86 | Ago: 84 | Sep: 85

💬 Comentarios Recientes (últimos 10):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐⭐⭐⭐⭐ "Excelente motivación, súper energía!"
           - Juan P. (02/10)

⭐⭐⭐⭐⭐ "Muy buena clase, desafiante"
           - María L. (01/10)

⭐⭐⭐⭐☆ "Buena clase, mejoraría música"
           - Carlos G. (30/09)
...

🏆 Logros:
✅ 50 clases dictadas este mes
✅ NPS > 80 por 6 meses consecutivos
✅ 0 cancelaciones last-minute (este mes)
```

**Uso**: Ver cómo te perciben los miembros, identificar áreas de mejora.

---

## 🆘 Soporte para Instructores

- **Problemas técnicos**: Contactar admin del gimnasio
- **PIN olvidado**: Solicitar reset a admin
- **Feedback**: Compartir sugerencias con admin

---

**Fin del Manual de Instructor**

---

# 👤 Manual de Miembro

## 🎯 Introducción

Como miembro de [Nombre del Gimnasio], usarás GIM_AI principalmente a través de **WhatsApp** para:
- ✅ Check-in con código QR
- 📅 Reservar clases
- 💳 Recibir recordatorios de pago
- 📊 Responder encuestas de satisfacción

---

## 🚀 Primeros Pasos

### 1. Registro

Al inscribirte en el gimnasio, el administrador creará tu perfil y recibirás:

**Por WhatsApp**:
```
¡Bienvenido a [Gimnasio]! 🎉

Tu registro ha sido completado exitosamente.

📱 Tu código QR personal:
[Imagen del QR code]

Guarda este código en tu celular. Lo necesitarás
para hacer check-in en cada clase.

Plan: Mensual
Vencimiento: 05/11/2025

¿Dudas? Responde a este mensaje.
```

### 2. Guardar tu Código QR

**Opción 1** (Recomendado):
1. Abrir WhatsApp
2. Buscar conversación con el gimnasio
3. Long-press en imagen del QR
4. "Guardar en galería"
5. También puedes tomarlo de screenshot

**Opción 2**:
1. Imprimir QR code
2. Llevarlo físicamente al gimnasio

---

## ✅ Hacer Check-in

### Paso a Paso

1. **Llegar al gimnasio** 5-10 min antes de tu clase
2. **Ir al scanner QR** (usualmente en recepción)
3. **Mostrar tu código QR** desde tu celular o impreso
4. **Scanner lee el QR** automáticamente
5. **Confirmación instantánea** en pantalla:
   ```
   ✅ CHECK-IN EXITOSO
   
   Juan Pérez
   Spinning Intenso - 18:00
   Instructor: María García
   Sala Principal
   
   ¡Disfruta tu clase! 💪
   ```

6. **Confirmación por WhatsApp** (en 10 segundos):
   ```
   ✅ Check-in confirmado
   
   Clase: Spinning Intenso
   Horario: 18:00 - 19:00
   Instructor: María García
   Sala: Sala Principal
   
   ¡Que tengas una excelente clase! 💪
   ```

### Problemas Comunes

**QR no funciona**:
- Asegúrate que la imagen es nítida
- Aumenta el brillo del celular
- Muestra el código en pantalla completa
- Si está muy borroso, solicita nuevo QR al admin

**"Clase llena"**:
- Llegaste sin reserva y la clase está al 100%
- Solución: Reserva con anticipación o consulta disponibilidad

**"Miembro suspendido"**:
- Tienes deuda pendiente
- Solución: Acércate a recepción para regularizar pago

---

## 📅 Reservar Clases (Opcional)

**Nota**: Depende de la política del gimnasio. Algunos requieren reserva obligatoria, otros permiten asistencia libre.

### Por WhatsApp (si disponible)

```
[Tú]: Reservar clase

[Bot]: ¿Qué clase quieres reservar?
1️⃣ Spinning Intenso - Hoy 18:00
2️⃣ Crossfit - Mañana 19:00
3️⃣ Yoga - Mañana 10:00

[Tú]: 1

[Bot]: ✅ Reserva confirmada
Spinning Intenso - 03 Oct 18:00
María García | Sala Principal
Cupo: 20/20 (estás confirmado)

Te recordaremos 2 horas antes.
```

### Por Web (si disponible)

1. Ir a: `app.gimnasio.com/clases`
2. Ver calendario de clases
3. Click en clase deseada
4. Click **Reservar**
5. Confirmación por WhatsApp

---

## 💳 Pagos

### Recordatorios Automáticos

**3 días antes de vencimiento**:
```
🔔 Recordatorio de Pago

Hola Juan! Tu cuota mensual vence en 3 días.

Monto: $15,000
Vencimiento: 05/10/2025

Opciones de pago:
💳 MercadoPago: [Link de pago seguro]
💰 Efectivo: En recepción del gimnasio
🏦 Transferencia: Ver datos abajo

Datos para transferencia:
Titular: [Gimnasio Elite]
CBU: XXXX XXXX XXXX XXXX XXXX XX
Alias: gimnasio.elite
Ref: TU_NOMBRE

¿Ya pagaste? Responde con foto del comprobante.
```

### Pagar Online (MercadoPago)

1. Click en **[Link de pago seguro]** del WhatsApp
2. Abrirá navegador con checkout seguro MercadoPago
3. Ingresar datos de tarjeta
4. Confirmar pago
5. Recibo enviado por WhatsApp instantáneamente

### Pagar en Gimnasio

1. Ir a recepción
2. Informar tu nombre
3. Pagar en efectivo o con tarjeta
4. Staff registra pago en sistema
5. Recibo enviado por WhatsApp

### Pagar por Transferencia

1. Hacer transferencia con datos del mensaje
2. **Importante**: Incluir tu nombre en referencia
3. Enviar comprobante por WhatsApp al gimnasio
4. Staff valida y registra pago
5. Recibo enviado por WhatsApp

---

## 📊 Encuestas de Satisfacción

### Después de Cada Clase

**90 minutos después de la clase**, recibirás:

```
📊 ¿Cómo estuvo tu clase?

Spinning Intenso - 03 Oct 18:00
Instructor: María García

¿Recomendarías esta clase a un amigo?
(0 = No la recomendaría, 10 = Definitivamente sí)

0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟
```

**Responder**:
- Click en número que mejor refleja tu experiencia
- 0-6: No satisfecho
- 7-8: Neutral
- 9-10: Muy satisfecho

**Comentario opcional**:
```
[Bot]: Gracias por tu puntuación de 9 ⭐

¿Quieres dejarnos algún comentario?
(Opcional, puedes saltear)

[Tú]: Excelente motivación de la instructora!

[Bot]: ¡Gracias por tu feedback! 🙏
Lo compartiremos con María García.
```

### ¿Por Qué Responder?

- ✅ Ayudas a mejorar las clases
- ✅ Tu feedback es anónimo (excepto si lo autorizas)
- ✅ Influye en decisiones de horarios, instructores, etc.
- ✅ Solo toma 30 segundos

---

## 🆘 Soporte y Ayuda

### Contactar al Gimnasio por WhatsApp

```
[Tú]: Necesito ayuda

[Bot]: ¿En qué podemos ayudarte?
1️⃣ Mi QR no funciona
2️⃣ Quiero suspender mi plan temporalmente
3️⃣ Consulta sobre pagos
4️⃣ Cambiar mis datos personales
5️⃣ Hablar con una persona

[Tú]: 5

[Bot]: Te contactaremos en breve 👍
Horario de atención: Lun-Vie 9-21hs
```

### Problemas Comunes

**Olvidé mi código QR**:
```
[Tú]: Necesito mi QR

[Bot]: Te reenvío tu código QR:
[Imagen del QR]

Guárdalo en tu galería para tenerlo siempre disponible.
```

**Quiero suspender mi plan** (viaje, lesión):
```
[Tú]: Suspender plan

[Bot]: Para suspender tu plan, por favor acércate
a recepción o escribe el motivo y fecha de
reactivación deseada.

Procesaremos tu solicitud en 24hs.
```

**Cambié de teléfono**:
- Acércate a recepción con identificación
- Staff actualizará tu número en el sistema
- Recibirás nuevo QR en tu nuevo número

---

## 📱 Comandos Útiles por WhatsApp

| Mensaje | Respuesta |
|---------|-----------|
| `Hola` | Menú principal |
| `QR` | Reenvía tu código QR |
| `Clases` | Ver clases disponibles |
| `Pagar` | Link de pago online |
| `Saldo` | Ver estado de cuenta |
| `Ayuda` | Menú de ayuda |

---

**Fin del Manual de Miembro**

---

# ❓ FAQ General

## Para Todos

**P: ¿GIM_AI funciona sin internet?**
R: No, requiere conexión a internet para check-in y sincronización. El gimnasio debe tener WiFi disponible.

**P: ¿Mis datos están seguros?**
R: Sí. Usamos encriptación de grado bancario y cumplimos con leyes de protección de datos. Ver política de privacidad.

**P: ¿Puedo usar GIM_AI sin WhatsApp?**
R: WhatsApp es el principal canal de comunicación, pero el check-in por QR funciona sin WhatsApp. Los admins pueden acceder al dashboard web sin WhatsApp.

## Para Miembros

**P: ¿Qué pasa si pierdo mi código QR?**
R: Contacta al gimnasio por WhatsApp y te lo reenviarán instantáneamente.

**P: ¿Puedo compartir mi código QR con otra persona?**
R: No. El QR es personal e intransferible. Su mal uso puede resultar en suspensión de la membresía.

**P: ¿Qué pasa si llego tarde a una clase?**
R: Depende de la política del gimnasio. Usualmente puedes hacer check-in hasta 15 min después del inicio.

## Para Admins

**P: ¿Puedo personalizar los mensajes de WhatsApp?**
R: Sí, en Configuración → WhatsApp puedes personalizar todos los templates (requiere re-aprobación de Meta).

**P: ¿Cómo agrego más usuarios administradores?**
R: Configuración → Usuarios → Agregar usuario. Puedes crear roles Admin o Staff con permisos limitados.

**P: ¿Puedo migrar mis datos de otro sistema?**
R: Sí. Contáctanos en soporte@gimapp.com con un export de tu sistema actual (CSV/Excel). Haremos la migración sin costo.

---

**Última actualización**: Octubre 3, 2025  
**Versión**: 1.0.0
