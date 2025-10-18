# 🚀 Performance Testing - Artillery Load Testing Suite

## Descripción

Suite completa de performance testing para validar GIM_AI bajo carga realista:
- **Rate Limiting**: Verificar límites de mensajes WhatsApp (2/día) y API
- **Response Times**: P95 < 500ms, P99 < 2000ms bajo carga sostenida
- **Error Handling**: Validar circuit breaker y manejo de errores 5xx
- **Scalability**: Simular picos de tráfico (50 req/sec) y carga sostenida (15 req/sec)

## Estructura

```
performance/
├── artillery-config.yml          # Configuración de scenarios (5 fases)
├── processor.js                  # Funciones de pre/post procesamiento
├── payload.csv                   # Datos de test (20 miembros)
├── run-performance-tests.sh      # Script para ejecutar tests
├── reports/                      # Reportes generados
│   ├── gim-ai-full-scenario-*.html
│   ├── gim-ai-full-scenario-*.json
│   └── PERFORMANCE_SUMMARY_*.md
└── README.md                     # Este archivo
```

## Instalación

```bash
# Artillery ya está instalado (npm install --save-dev artillery)
npm install --save-dev artillery
```

## Uso Rápido

### 1. Iniciar el servidor GIM_AI

```bash
# En terminal 1
npm start
# Servidor corriendo en http://localhost:3000
```

### 2. Ejecutar Performance Tests

```bash
# En terminal 2
bash performance/run-performance-tests.sh
```

El script automáticamente:
- ✅ Verifica que el servidor esté corriendo
- 🚀 Ejecuta los 5 scenarios de carga
- 📊 Genera reportes HTML y JSON
- 📋 Crea resumen con métricas clave

### 3. Ver Resultados

```bash
# Abrir reporte HTML en navegador
open performance/reports/gim-ai-full-scenario-*.html

# O ver resumen en terminal
cat performance/reports/PERFORMANCE_SUMMARY_*.md
```

## Scenarios de Carga

### Fase 1: Warm-up (1 min)
- **Tasa**: 1 req/sec
- **Objetivo**: Establecer conexiones base
- **Validación**: Sin errores

### Fase 2: Ramp-up (2 min)
- **Tasa**: 5 → 15 req/sec (escalada gradual)
- **Objetivo**: Monitorear degradación de performance
- **Validación**: P95 < 500ms

### Fase 3: Sustained (3 min)
- **Tasa**: 15 req/sec (constante)
- **Objetivo**: Simular carga de producción típica
- **Validación**: Rate limiting activo, <1% errores

### Fase 4: Spike (1 min)
- **Tasa**: 50 req/sec (pico súbito)
- **Objetivo**: Probar robustez ante tráfico inesperado
- **Validación**: Circuit breaker activo, error handling correcto

### Fase 5: Cool-down (2 min)
- **Tasa**: 15 → 1 req/sec (escalada inversa)
- **Objetivo**: Verificar degradación gradual
- **Validación**: Recuperación sin estado compartido

## Scenarios de Testing

Cada scenario simulan patrones reales de uso:

### Scenario 1: Rate Limit Validation (25% del tráfico)
```
POST /api/whatsapp/send-message
  ├─ Mensaje 1 (checkin_confirmation) → 200 OK
  ├─ Mensaje 2 (reminder_workout) → 200 OK o 429 (rate limited)
  └─ Validar: Límite de 2/día se aplica
```

### Scenario 2: Check-in QR Flow (25% del tráfico)
```
POST /api/checkin/qr
  ├─ Check-in con QR code → 200 OK o 429
  └─ Consultar status → 200 OK
Validar: Límite de 10/día se aplica
```

### Scenario 3: Survey Collection (25% del tráfico)
```
POST /api/survey/submit
  ├─ Enviar survey (rating + comments) → 200/201 OK
  └─ Ver resultados → 200 OK
Validar: Límite de 5/día se aplica
```

### Scenario 4: Authentication & JWT (25% del tráfico)
```
POST /api/auth/login → Generar token
GET /api/profile → Usar token en header
POST /api/auth/refresh → Renovar token
Validar: JWT validation bajo carga
```

## Procesamiento Personalizado

El archivo `processor.js` incluye:

### Funciones Hook
- **beforeRequest**: Agrega headers (Correlation-ID, timestamp)
- **afterResponse**: Valida respuestas y emite métricas
- **beforeScenario**: Inicializa variables dinámicas
- **afterScenario**: Reporta duración y finalización

### Generadores de Datos
- `generateCorrelationId()`: UUID único para cada request
- `generateMockJWT()`: Token JWT válido para auth tests
- `generateQRCode()`: QR codes únicos por request
- `generatePayload()`: Datos realistas de 100 miembros

## Métricas Clave

### Latencia
- **P50 (Mediana)**: Tiempo típico de respuesta
- **P95 (95º percentil)**: 95% de requests más rápidos que esto
- **P99 (99º percentil)**: 99% de requests más rápidos que esto
- **Umbral aceptado**: P95 < 500ms, P99 < 2000ms

### Tasa de Éxito
- **2xx/3xx**: Requests exitosos
- **4xx**: Errores del cliente (validación, auth)
- **5xx**: Errores del servidor
- **429**: Rate limit (esperado, no es error)
- **Umbral**: Success rate > 95%

### Rate Limiting
- **429 Hits**: Cuántas veces se activó rate limiting
- **Esperado**: Al menos algunos 429 en fase Spike
- **Validación**: Límites se aplican correctamente

### Errores Específicos
- **Rate Limit Hits**: Contador de 429 responses
- **Slow Responses**: Requests > 5 segundos
- **Server Errors**: Errores 5xx
- **Client Errors**: Errores 4xx (excluye 429)

## Análisis de Resultados

### ✅ Test Passed (Métricas Buenas)
```
P95 Latency: 250ms (✅ < 500ms)
P99 Latency: 450ms (✅ < 2000ms)
Success Rate: 97% (✅ > 95%)
5xx Errors: 0 (✅ = 0)
Rate Limit Hits: 15 (✅ Enforcement working)
```

**Acción**: Producción lista. Considerar incrementar capacidad.

### ⚠️ Test Warning (Métricas Marginal)
```
P95 Latency: 600ms (⚠️ > 500ms)
P99 Latency: 1200ms (✅ < 2000ms)
Success Rate: 93% (⚠️ < 95%)
5xx Errors: 2 (⚠️ > 0)
```

**Acción**: Investigar latencia en BD. Optimizar queries. Monitorear en producción.

### ❌ Test Failed (Métricas Críticas)
```
P95 Latency: 2500ms (❌ > 500ms)
P99 Latency: 5000ms (❌ > 2000ms)
Success Rate: 78% (❌ < 95%)
5xx Errors: 45 (❌ High)
```

**Acción**: 
1. Revisar circuit breaker configuration
2. Verificar pool de conexiones a base de datos
3. Aumentar Redis memory si es necesario
4. Considerar load balancing

## Configuración Avanzada

### Cambiar Tasa de Carga

En `artillery-config.yml`, modificar `arrivalRate`:

```yaml
phases:
  - duration: 60
    arrivalRate: 1        # 1 request/second
    
  - duration: 120
    arrivalRate: 5
    rampTo: 15            # Escalar de 5 a 15 req/sec
    
  - duration: 180
    arrivalRate: 50       # 50 requests/second en spike
```

### Agregar Nuevos Scenarios

En `artillery-config.yml`, agregar a `scenarios`:

```yaml
- name: "Mi Nuevo Scenario"
  weight: 25                    # 25% del tráfico
  flow:
    - post:
        url: "/api/mi-endpoint"
        json:
          param1: "value1"
        expect:
          - statusCode: [200, 429]
      think: 2                  # Esperar 2 segundos
    - get:
        url: "/api/resultado"
        expect:
          - statusCode: [200]
```

### Modificar Timeouts

En `artillery-config.yml`:

```yaml
settings:
  timeout: 10              # Timeout global en segundos
  http:
    timeout: 10            # Timeout HTTP específico
```

## Troubleshooting

### ❌ Error: "Server is not running on port 3000"
```bash
# Solución: Iniciar servidor
npm start
```

### ❌ Error: "artillery: command not found"
```bash
# Solución: Instalar Artillery
npm install --save-dev artillery
```

### ❌ Error: "ECONNREFUSED" en requests
**Causa**: Servidor no responde
- Verificar que `npm start` esté corriendo
- Verificar puerto 3000 está libre
- Ver logs de servidor: `npm start`

### ❌ Reportes vacíos o errores
```bash
# Verificar archivo JSON válido
cat performance/reports/gim-ai-full-scenario-*.json | jq .

# Regenerar reporte HTML
npx artillery report performance/reports/gim-ai-full-scenario-*.json \
  --output performance/reports/report-new.html
```

## Best Practices

### ✅ Hacer
- Ejecutar tests con servidor limpio (sin solicitudes actuales)
- Ejecutar tests múltiples veces para obtener promedios
- Ejecutar tests en máquina con recursos similares a producción
- Monitorear logs del servidor durante tests
- Documentar cambios de configuración en Git

### ❌ No Hacer
- Ejecutar tests contra producción sin autorización
- Modificar thresholds sin justificación
- Ignorar spike phase failures
- Ejecutar tests con otros procesos pesados
- Cambiar artillería config sin entender el impacto

## Integración CI/CD

Agregar a `package.json`:

```json
{
  "scripts": {
    "perf-test": "bash performance/run-performance-tests.sh",
    "perf-report": "open performance/reports/gim-ai-full-scenario-*.html"
  }
}
```

Ejecutar en CI pipeline:

```bash
npm run perf-test || echo "Performance tests completed - check reports"
```

## Referencias

- [Artillery Documentation](https://artillery.io/docs)
- [Load Testing Best Practices](https://artillery.io/docs/load-testing)
- [HTTP Benchmark Scenarios](https://artillery.io/docs/http-scenarios)
- [Processor Functions](https://artillery.io/docs/cli/run#processors)

## Próximos Pasos

1. ✅ **Ejecutar tests iniciales** - Obtener baseline
2. 🔄 **Optimizar basado en resultados** - Identificar cuellos de botella
3. 📊 **Crear dashboard de monitoreo** - Ver métricas en tiempo real
4. 🔁 **Tests automáticos en CI** - Ejecutar con cada release
5. 📈 **Escalamiento gradual** - Incrementar fase Spike de 50 → 100 → 200 req/sec

---

**Created**: 2025-10-18  
**Last Updated**: 2025-10-18  
**Maintenance**: Tech Team
