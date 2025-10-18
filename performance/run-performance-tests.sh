#!/bin/bash

###############################################################################
# Performance Testing Script with Artillery
# 
# Propósito: Ejecutar load tests y generar reportes de performance
# Valida: Rate limiting, tiempos de respuesta, errores bajo carga
# Genera: Reportes HTML y JSON con métricas detalladas
###############################################################################

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PERFORMANCE_DIR="$PROJECT_ROOT/performance"
REPORTS_DIR="$PERFORMANCE_DIR/reports"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Crear directorio de reportes
mkdir -p "$REPORTS_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  🚀 GIM_AI Performance Testing Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Función para verificar si el servidor está corriendo
check_server() {
  echo -e "${YELLOW}📡 Checking if server is running on http://localhost:3000...${NC}"
  
  if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running!${NC}"
    return 0
  else
    echo -e "${RED}❌ Server is not running on port 3000${NC}"
    echo -e "${YELLOW}Please start the server with: npm start${NC}"
    return 1
  fi
}

# Función para ejecutar Artillery con análisis
run_artillery_test() {
  local config=$1
  local report_name=$2
  local html_report="$REPORTS_DIR/${report_name}-${TIMESTAMP}.html"
  local json_report="$REPORTS_DIR/${report_name}-${TIMESTAMP}.json"
  
  echo ""
  echo -e "${BLUE}Running: $report_name${NC}"
  echo -e "${YELLOW}Config: $config${NC}"
  echo -e "${YELLOW}Report: $html_report${NC}"
  echo ""

  # Ejecutar Artillery
  cd "$PROJECT_ROOT"
  npx artillery run "$config" \
    --output "$json_report" \
    --target http://localhost:3000 \
    || true

  # Generar reporte HTML si el JSON existe
  if [ -f "$json_report" ]; then
    npx artillery report "$json_report" \
      --output "$html_report" \
      || true
    
    echo -e "${GREEN}✅ Report saved: $html_report${NC}"
  fi

  echo ""
}

# Función para analizar resultados
analyze_results() {
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}  📊 Analysis & Key Metrics${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""

  if [ -f "$REPORTS_DIR/${1}-${TIMESTAMP}.json" ]; then
    local report_file="$REPORTS_DIR/${1}-${TIMESTAMP}.json"
    
    # Extraer métricas clave
    echo -e "${YELLOW}Key Metrics:${NC}"
    
    # Total requests
    local total_requests=$(jq '.aggregate.requestsCompleted' "$report_file" 2>/dev/null || echo "N/A")
    echo -e "  Total Requests: ${GREEN}$total_requests${NC}"
    
    # Response times
    local p95=$(jq '.aggregate.latency.p95' "$report_file" 2>/dev/null || echo "N/A")
    local p99=$(jq '.aggregate.latency.p99' "$report_file" 2>/dev/null || echo "N/A")
    echo -e "  P95 Latency: ${GREEN}${p95}ms${NC}"
    echo -e "  P99 Latency: ${GREEN}${p99}ms${NC}"
    
    # Errors
    local errors=$(jq '.aggregate.codes."5xx" // 0' "$report_file" 2>/dev/null || echo "0")
    if [ "$errors" -gt 0 ]; then
      echo -e "  5xx Errors: ${RED}$errors${NC}"
    else
      echo -e "  5xx Errors: ${GREEN}0${NC}"
    fi
    
    # Rate limit hits
    local rate_limits=$(jq '.aggregate.codes."429" // 0' "$report_file" 2>/dev/null || echo "0")
    echo -e "  Rate Limit (429): ${YELLOW}$rate_limits${NC}"
    
    # Success rate
    local success_rate=$(jq '.aggregate.codes."2xx" + .aggregate.codes."3xx" // 0' "$report_file" 2>/dev/null || echo "0")
    echo -e "  Success (2xx/3xx): ${GREEN}$success_rate${NC}"
  fi

  echo ""
}

# Función para crear resumen general
create_summary() {
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}  📋 Test Execution Summary${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
  
  local summary_file="$REPORTS_DIR/PERFORMANCE_SUMMARY_${TIMESTAMP}.md"
  
  cat > "$summary_file" << 'EOF'
# Performance Testing Summary

## Test Objectives

✅ **Rate Limiting Validation**: Verify 2 msg/day WhatsApp limit and API rate limits
✅ **Check-in QR Flow**: Test 10/day check-in limit under sustained load
✅ **Survey Collection**: Validate 5/day survey response limit
✅ **Authentication**: Test JWT token validation and refresh under load

## Test Scenarios

### 1. Warm-up Phase (1 min, 1 req/sec)
- Establish baseline connections
- Calibrate request flow

### 2. Ramp-up Phase (2 min, 5→15 req/sec)
- Gradually increase load
- Monitor response time degradation

### 3. Sustained Phase (3 min, 15 req/sec)
- Constant production-like load
- Verify rate limiting enforcement

### 4. Spike Phase (1 min, 50 req/sec)
- Sudden traffic spike
- Test error handling and circuit breaker

### 5. Cool-down Phase (2 min, 15→1 req/sec)
- Gradual load reduction
- Verify graceful degradation

## Performance Thresholds

| Metric | Threshold | Status |
|--------|-----------|--------|
| P95 Latency | < 500ms | ⏳ Checking |
| P99 Latency | < 2000ms | ⏳ Checking |
| Error Rate (5xx) | < 1% | ⏳ Checking |
| Success Rate (2xx/3xx) | > 95% | ⏳ Checking |
| Rate Limit Enforcement | > 0 hits | ⏳ Checking |

## Key Findings

*To be populated after test execution*

## Recommendations

1. If P95 > 500ms: Review database query performance
2. If error rate > 1%: Check circuit breaker and timeout configurations
3. If rate limits not enforced: Verify Redis queue connectivity
4. If sustained phase fails: Consider horizontal scaling

EOF

  echo -e "${GREEN}✅ Summary created: $summary_file${NC}"
}

# Main execution
main() {
  # Verificar servidor
  if ! check_server; then
    exit 1
  fi

  # Ejecutar tests
  echo ""
  echo -e "${BLUE}Starting Artillery Load Tests...${NC}"
  
  run_artillery_test \
    "$PERFORMANCE_DIR/artillery-config.yml" \
    "gim-ai-full-scenario"

  # Análisis
  analyze_results "gim-ai-full-scenario"

  # Crear resumen
  create_summary

  echo ""
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}  ✅ Performance Testing Complete!${NC}"
  echo -e "${GREEN}========================================${NC}"
  echo ""
  echo -e "${YELLOW}📁 Reports location: $REPORTS_DIR${NC}"
  echo -e "${YELLOW}📊 Open HTML report in browser to view detailed metrics${NC}"
  echo ""
}

# Ejecutar main
main "$@"
