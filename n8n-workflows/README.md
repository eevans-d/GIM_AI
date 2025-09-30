# n8n Workflows

Flujos de automatización para GIM_AI usando n8n.

## Estructura

- `core/` - Flujos fundamentales (check-in, reservas, reemplazos)
- `messaging/` - Flujos de comunicación (cobranza, recordatorios, promociones)
- `analytics/` - Análisis y métricas (feedback, ocupación, KPIs)

## Flujos Principales

### Core
- **checkin-flow.json** - Proceso de check-in QR/manual
- **reservation-system.json** - Gestión de reservas y lista de espera
- **replacement-system.json** - Reemplazos automáticos de profesores

### Messaging
- **collection-flow.json** - Cobranza diaria automatizada
- **contextual-collection.json** - Cobranza post-entrenamiento
- **reminders.json** - Recordatorios de clases
- **waitlist-manager.json** - Gestión de lista de espera
- **valley-promotions.json** - Promociones para horas valle

### Analytics
- **feedback-processor.json** - Análisis de encuestas
- **incident-manager.json** - Gestión de incidencias
- **occupancy-analyzer.json** - Análisis de ocupación
- **daily-metrics.json** - Métricas en tiempo real

## Importar Flujos

1. Abrir n8n (http://localhost:5678)
2. Click en "Workflows" → "Import from File"
3. Seleccionar el archivo JSON del flujo
4. Configurar credenciales necesarias
5. Activar el flujo
