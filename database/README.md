# Database

Este directorio contiene todos los schemas, migraciones y datos de semilla para la base de datos GIM_AI.

## Estructura

- `schemas/` - Definiciones de tablas, índices y funciones SQL
- `migrations/` - Scripts de migración ordenados
- `seeds/` - Datos de ejemplo para desarrollo y testing

## Tablas Principales

1. **members** - Información de socios
2. **checkins** - Registros de entrada
3. **classes** - Clases programadas
4. **payments** - Gestión de pagos
5. **feedback** - Satisfacción post-clase
6. **incidents** - Incidencias operativas
7. **instructors** - Profesores y certificaciones
8. **reservations** - Reservas de clases
9. **instructor_skills** - Habilidades de profesores
10. **replacements_log** - Historial de reemplazos

## Uso

```bash
# Ejecutar migraciones
npm run migrate

# Cargar datos de prueba
psql -d gim_ai_db -f database/seeds/sample_data.sql
```
