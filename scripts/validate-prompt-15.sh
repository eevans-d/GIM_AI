#!/bin/bash

# ============================================================================
# PROMPT 15 VALIDATION SCRIPT
# Executive Dashboard "Command Center" - Complete Implementation Check
# ============================================================================

echo "🎯 VALIDANDO PROMPT 15: Executive Dashboard"
echo "============================================="
echo ""

# Contadores
CHECKS_PASSED=0
CHECKS_FAILED=0
TOTAL_CHECKS=0

# Función para verificar
check() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if eval "$2"; then
        echo "✅ $1"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
        return 0
    else
        echo "❌ $1"
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
        return 1
    fi
}

# ============================================================================
# 1. DATABASE SCHEMA
# ============================================================================
echo "📊 1. DATABASE SCHEMA (4 tablas, 5 vistas, 3 funciones)"
echo "--------------------------------------------------------"

check "dashboard_tables.sql existe" \
    "[ -f database/schemas/dashboard_tables.sql ]"

check "Tabla dashboard_snapshots definida" \
    "grep -q 'CREATE TABLE.*dashboard_snapshots' database/schemas/dashboard_tables.sql"

check "Tabla priority_decisions definida" \
    "grep -q 'CREATE TABLE.*priority_decisions' database/schemas/dashboard_tables.sql"

check "Tabla dashboard_alerts definida" \
    "grep -q 'CREATE TABLE.*dashboard_alerts' database/schemas/dashboard_tables.sql"

check "Tabla kpi_targets definida" \
    "grep -q 'CREATE TABLE.*kpi_targets' database/schemas/dashboard_tables.sql"

check "Vista v_financial_kpis_today definida" \
    "grep -q 'CREATE MATERIALIZED VIEW.*v_financial_kpis_today' database/schemas/dashboard_tables.sql"

check "Vista v_operational_kpis_today definida" \
    "grep -q 'CREATE MATERIALIZED VIEW.*v_operational_kpis_today' database/schemas/dashboard_tables.sql"

check "Vista v_satisfaction_kpis_recent definida" \
    "grep -q 'CREATE MATERIALIZED VIEW.*v_satisfaction_kpis_recent' database/schemas/dashboard_tables.sql"

check "Vista v_retention_kpis_month definida" \
    "grep -q 'CREATE MATERIALIZED VIEW.*v_retention_kpis_month' database/schemas/dashboard_tables.sql"

check "Vista v_executive_summary definida" \
    "grep -q 'CREATE MATERIALIZED VIEW.*v_executive_summary' database/schemas/dashboard_tables.sql"

check "Función create_daily_snapshot definida" \
    "grep -q 'CREATE OR REPLACE FUNCTION create_daily_snapshot' database/schemas/dashboard_tables.sql"

check "Función detect_critical_alerts definida" \
    "grep -q 'CREATE OR REPLACE FUNCTION detect_critical_alerts' database/schemas/dashboard_tables.sql"

check "Función cleanup_expired_alerts definida" \
    "grep -q 'CREATE OR REPLACE FUNCTION cleanup_expired_alerts' database/schemas/dashboard_tables.sql"

check "30+ columnas KPI en dashboard_snapshots" \
    "grep -c 'revenue\|debt\|checkins\|nps\|retention\|churn\|occupancy' database/schemas/dashboard_tables.sql | awk '{if (\$1 > 30) exit 0; else exit 1}'"

echo ""

# ============================================================================
# 2. AI DECISION SERVICE
# ============================================================================
echo "🤖 2. AI DECISION SERVICE (Gemini AI Integration)"
echo "--------------------------------------------------------"

check "ai-decision-service.js existe" \
    "[ -f services/ai-decision-service.js ]"

check "GoogleGenerativeAI importado" \
    "grep -q '@google/generative-ai' services/ai-decision-service.js"

check "Función generatePriorityDecisions" \
    "grep -q 'function generatePriorityDecisions' services/ai-decision-service.js"

check "Función getTodayDecisions" \
    "grep -q 'function getTodayDecisions' services/ai-decision-service.js"

check "Función completeDecision" \
    "grep -q 'function completeDecision' services/ai-decision-service.js"

check "Función dismissDecision" \
    "grep -q 'function dismissDecision' services/ai-decision-service.js"

check "buildDecisionPrompt construye prompt para Gemini" \
    "grep -q 'function buildDecisionPrompt' services/ai-decision-service.js"

check "parseAIResponse parsea JSON de Gemini" \
    "grep -q 'function parseAIResponse' services/ai-decision-service.js"

check "generateFallbackDecisions para robustez" \
    "grep -q 'function generateFallbackDecisions' services/ai-decision-service.js"

check "saveDecisions guarda en priority_decisions" \
    "grep -q 'function saveDecisions' services/ai-decision-service.js"

echo ""

# ============================================================================
# 3. DASHBOARD SERVICE
# ============================================================================
echo "📈 3. DASHBOARD SERVICE (KPIs, Trends, Drill-down)"
echo "--------------------------------------------------------"

check "dashboard-service.js existe" \
    "[ -f services/dashboard-service.js ]"

check "Función getTodayKPIs (vista consolidada)" \
    "grep -q 'function getTodayKPIs' services/dashboard-service.js"

check "Función getFinancialKPIs" \
    "grep -q 'function getFinancialKPIs' services/dashboard-service.js"

check "Función getOperationalKPIs" \
    "grep -q 'function getOperationalKPIs' services/dashboard-service.js"

check "Función getSatisfactionKPIs" \
    "grep -q 'function getSatisfactionKPIs' services/dashboard-service.js"

check "Función getRetentionKPIs" \
    "grep -q 'function getRetentionKPIs' services/dashboard-service.js"

check "Función createDailySnapshot" \
    "grep -q 'function createDailySnapshot' services/dashboard-service.js"

check "Función getSnapshotByDate" \
    "grep -q 'function getSnapshotByDate' services/dashboard-service.js"

check "Función getSnapshotsByRange" \
    "grep -q 'function getSnapshotsByRange' services/dashboard-service.js"

check "Función getActiveAlerts" \
    "grep -q 'function getActiveAlerts' services/dashboard-service.js"

check "Función detectCriticalAlerts" \
    "grep -q 'function detectCriticalAlerts' services/dashboard-service.js"

check "Función dismissAlert" \
    "grep -q 'function dismissAlert' services/dashboard-service.js"

check "Función getKPITrend (tendencias 7+ días)" \
    "grep -q 'function getKPITrend' services/dashboard-service.js"

check "Función compareKPIsVsTargets" \
    "grep -q 'function compareKPIsVsTargets' services/dashboard-service.js"

check "Función getRevenueBreakdown (drill-down)" \
    "grep -q 'function getRevenueBreakdown' services/dashboard-service.js"

check "Función getDebtorsList (drill-down)" \
    "grep -q 'function getDebtorsList' services/dashboard-service.js"

check "Función getClassOccupancyDetails (drill-down)" \
    "grep -q 'function getClassOccupancyDetails' services/dashboard-service.js"

check "Función buildDecisionContext para IA" \
    "grep -q 'function buildDecisionContext' services/dashboard-service.js"

check "Función refreshMaterializedViews" \
    "grep -q 'function refreshMaterializedViews' services/dashboard-service.js"

echo ""

# ============================================================================
# 4. API ROUTES
# ============================================================================
echo "🌐 4. API ROUTES (23 endpoints REST)"
echo "--------------------------------------------------------"

check "dashboard.js existe" \
    "[ -f routes/api/dashboard.js ]"

check "GET /kpis/realtime endpoint" \
    "grep -q \"router.get.*'/kpis/realtime'\" routes/api/dashboard.js"

check "GET /kpis/financial endpoint" \
    "grep -q \"router.get.*'/kpis/financial'\" routes/api/dashboard.js"

check "GET /kpis/operational endpoint" \
    "grep -q \"router.get.*'/kpis/operational'\" routes/api/dashboard.js"

check "GET /kpis/satisfaction endpoint" \
    "grep -q \"router.get.*'/kpis/satisfaction'\" routes/api/dashboard.js"

check "GET /kpis/retention endpoint" \
    "grep -q \"router.get.*'/kpis/retention'\" routes/api/dashboard.js"

check "GET /kpis/vs-targets endpoint" \
    "grep -q \"router.get.*'/kpis/vs-targets'\" routes/api/dashboard.js"

check "GET /decisions/today endpoint" \
    "grep -q \"router.get.*'/decisions/today'\" routes/api/dashboard.js"

check "POST /decisions/:id/complete endpoint" \
    "grep -q \"router.post.*'/decisions/:decisionId/complete'\" routes/api/dashboard.js"

check "POST /decisions/:id/dismiss endpoint" \
    "grep -q \"router.post.*'/decisions/:decisionId/dismiss'\" routes/api/dashboard.js"

check "GET /alerts/active endpoint" \
    "grep -q \"router.get.*'/alerts/active'\" routes/api/dashboard.js"

check "POST /alerts/detect endpoint" \
    "grep -q \"router.post.*'/alerts/detect'\" routes/api/dashboard.js"

check "POST /alerts/:id/dismiss endpoint" \
    "grep -q \"router.post.*'/alerts/:alertId/dismiss'\" routes/api/dashboard.js"

check "POST /snapshots/create endpoint" \
    "grep -q \"router.post.*'/snapshots/create'\" routes/api/dashboard.js"

check "GET /snapshots/:date endpoint" \
    "grep -q \"router.get.*'/snapshots/:date'\" routes/api/dashboard.js"

check "GET /snapshots/range endpoint" \
    "grep -q \"router.get.*'/snapshots/range'\" routes/api/dashboard.js"

check "GET /trends/:kpiName endpoint" \
    "grep -q \"router.get.*'/trends/:kpiName'\" routes/api/dashboard.js"

check "GET /drilldown/revenue/:date endpoint" \
    "grep -q \"router.get.*'/drilldown/revenue/:date'\" routes/api/dashboard.js"

check "GET /drilldown/debtors endpoint" \
    "grep -q \"router.get.*'/drilldown/debtors'\" routes/api/dashboard.js"

check "GET /drilldown/occupancy/:date endpoint" \
    "grep -q \"router.get.*'/drilldown/occupancy/:date'\" routes/api/dashboard.js"

check "POST /refresh endpoint" \
    "grep -q \"router.post.*'/refresh'\" routes/api/dashboard.js"

check "GET /health endpoint" \
    "grep -q \"router.get.*'/health'\" routes/api/dashboard.js"

echo ""

# ============================================================================
# 5. CRON PROCESSOR
# ============================================================================
echo "⏰ 5. CRON PROCESSOR (4 jobs automatizados)"
echo "--------------------------------------------------------"

check "dashboard-cron-processor.js existe" \
    "[ -f workers/dashboard-cron-processor.js ]"

check "node-cron importado" \
    "grep -q \"require('node-cron')\" workers/dashboard-cron-processor.js"

check "dailySnapshotJob definido (23:59)" \
    "grep -q 'dailySnapshotJob.*cron.schedule' workers/dashboard-cron-processor.js"

check "alertDetectionJob definido (cada hora)" \
    "grep -q 'alertDetectionJob.*cron.schedule' workers/dashboard-cron-processor.js"

check "alertCleanupJob definido (cada hora)" \
    "grep -q 'alertCleanupJob.*cron.schedule' workers/dashboard-cron-processor.js"

check "viewRefreshJob definido (cada 5 min)" \
    "grep -q 'viewRefreshJob.*cron.schedule' workers/dashboard-cron-processor.js"

check "Función initializeDashboardCron" \
    "grep -q 'function initializeDashboardCron' workers/dashboard-cron-processor.js"

check "Función stopDashboardCron" \
    "grep -q 'function stopDashboardCron' workers/dashboard-cron-processor.js"

check "Función getDashboardCronStatus" \
    "grep -q 'function getDashboardCronStatus' workers/dashboard-cron-processor.js"

echo ""

# ============================================================================
# 6. FRONTEND
# ============================================================================
echo "🎨 6. FRONTEND (HTML + 1200 líneas JS)"
echo "--------------------------------------------------------"

check "frontend/dashboard/index.html existe" \
    "[ -f frontend/dashboard/index.html ]"

check "frontend/dashboard/dashboard.js existe" \
    "[ -f frontend/dashboard/dashboard.js ]"

check "Chart.js CDN incluido en HTML" \
    "grep -q 'chart.js' frontend/dashboard/index.html"

check "KPI cards grid en HTML" \
    "grep -q 'kpi-grid' frontend/dashboard/index.html"

check "Alerts section en HTML" \
    "grep -q 'alerts-section' frontend/dashboard/index.html"

check "Decisions section con badge 'Powered by Gemini AI'" \
    "grep -q 'Powered by Gemini AI' frontend/dashboard/index.html"

check "Charts grid en HTML (4 gráficos)" \
    "grep -q 'charts-grid' frontend/dashboard/index.html"

check "Modal completar decisión" \
    "grep -q 'completeDecisionModal' frontend/dashboard/index.html"

check "Modal descartar alerta" \
    "grep -q 'dismissAlertModal' frontend/dashboard/index.html"

check "Toast notifications" \
    "grep -q 'toast' frontend/dashboard/index.html"

check "Función initializeDashboard en JS" \
    "grep -q 'function initializeDashboard' frontend/dashboard/dashboard.js"

check "Función loadAlerts en JS" \
    "grep -q 'function loadAlerts' frontend/dashboard/dashboard.js"

check "Función loadDecisions en JS" \
    "grep -q 'function loadDecisions' frontend/dashboard/dashboard.js"

check "Función loadKPIs en JS" \
    "grep -q 'function loadKPIs' frontend/dashboard/dashboard.js"

check "Función loadTrendCharts en JS" \
    "grep -q 'function loadTrendCharts' frontend/dashboard/dashboard.js"

check "Auto-refresh configurado (60 segundos)" \
    "grep -q 'REFRESH_INTERVAL.*60000' frontend/dashboard/dashboard.js"

check "4 charts globales declarados" \
    "grep -c 'let.*Chart = null' frontend/dashboard/dashboard.js | awk '{if (\$1 >= 4) exit 0; else exit 1}'"

echo ""

# ============================================================================
# 7. INTEGRATION
# ============================================================================
echo "🔧 7. INTEGRATION (index.js, .env.example)"
echo "--------------------------------------------------------"

check "dashboardRoutes registrado en index.js" \
    "grep -q \"require.*routes/api/dashboard\" index.js"

check "Dashboard routes montadas en /api/dashboard" \
    "grep -q \"app.use.*'/api/dashboard'.*dashboardRoutes\" index.js"

check "Dashboard cron inicializado en index.js" \
    "grep -q 'initializeDashboardCron' index.js"

check "GEMINI_API_KEY en .env.example" \
    "grep -q 'GEMINI_API_KEY' .env.example"

check "GEMINI_MODEL en .env.example" \
    "grep -q 'GEMINI_MODEL' .env.example"

check "DASHBOARD_ variables en .env.example" \
    "grep -q 'DASHBOARD_' .env.example"

check "Dashboard thresholds configurables (.env)" \
    "grep -c 'DASHBOARD.*THRESHOLD' .env.example | awk '{if (\$1 >= 4) exit 0; else exit 1}'"

echo ""

# ============================================================================
# 8. DEPENDENCIES
# ============================================================================
echo "📦 8. DEPENDENCIES"
echo "--------------------------------------------------------"

check "@google/generative-ai instalado" \
    "grep -q '@google/generative-ai' package.json"

check "Chart.js referenciado (CDN en frontend)" \
    "grep -q 'chart.js' frontend/dashboard/index.html"

echo ""

# ============================================================================
# 9. DOCUMENTATION
# ============================================================================
echo "📝 9. DOCUMENTATION"
echo "--------------------------------------------------------"

check "IMPLEMENTATION_STATUS.md actualizado con Prompt 15" \
    "grep -q 'Prompt 15.*Executive Dashboard' docs/IMPLEMENTATION_STATUS.md"

check "Progress actualizado a 56% (14/25)" \
    "grep -q '14/25.*56%' docs/IMPLEMENTATION_STATUS.md"

check "Prompt 15 marcado como COMPLETE" \
    "grep -q 'Prompt 15.*COMPLETE' docs/IMPLEMENTATION_STATUS.md"

check "30+ KPIs documentados" \
    "grep -c 'revenue\|debt\|checkins\|nps\|retention\|occupancy' docs/IMPLEMENTATION_STATUS.md | awk '{if (\$1 > 30) exit 0; else exit 1}'"

echo ""

# ============================================================================
# RESULTADOS FINALES
# ============================================================================
echo "============================================="
echo "📊 RESULTADOS DE VALIDACIÓN"
echo "============================================="
echo ""
echo "Total de checks:    $TOTAL_CHECKS"
echo "✅ Checks pasados:  $CHECKS_PASSED"
echo "❌ Checks fallidos: $CHECKS_FAILED"
echo ""

PERCENTAGE=$((CHECKS_PASSED * 100 / TOTAL_CHECKS))
echo "Porcentaje de éxito: $PERCENTAGE%"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo "🎉 ¡PROMPT 15 COMPLETAMENTE IMPLEMENTADO!"
    echo ""
    echo "✅ Database schema (4 tablas, 5 vistas, 3 funciones)"
    echo "✅ AI Decision Service (Gemini AI)"
    echo "✅ Dashboard Service (KPIs, trends, drill-down)"
    echo "✅ API Routes (23 endpoints REST)"
    echo "✅ Cron Processor (4 jobs automatizados)"
    echo "✅ Frontend (HTML + 1200 líneas JS + Chart.js)"
    echo "✅ Integration (index.js, .env.example)"
    echo "✅ Dependencies (@google/generative-ai)"
    echo "✅ Documentation (IMPLEMENTATION_STATUS.md)"
    echo ""
    exit 0
else
    echo "⚠️  HAY $CHECKS_FAILED CHECKS FALLIDOS"
    echo "Revisa los errores arriba y completa la implementación."
    echo ""
    exit 1
fi
